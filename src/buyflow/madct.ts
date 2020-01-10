import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { BlindPrevout, CryptoAddress, EphemeralKey, OutputType, Prevout, ToBeBlindOutput } from '../interfaces/crypto';
import { CtRpc, ILibrary } from '../abstract/rpc';
import { IMadCTBuilder } from '../abstract/transactions';
import { Config } from '../abstract/config';
import { buildBidTxScript, buildDestroyTxScript, ConfidentialTransactionBuilder, getExpectedSequence } from '../transaction-builder/confidential-transaction';
import { MPA_ACCEPT, MPA_BID, MPA_LISTING_ADD, MPA_LOCK, PaymentDataAcceptCT, PaymentDataBidCT, PaymentDataLockCT } from '../interfaces/omp';
import { asyncMap, clone, isArrayAndContains, isObject } from '../util';
import { hash } from '../hasher/hash';

@injectable()
export class MadCTBuilder implements IMadCTBuilder {

    private _libs: ILibrary;
    private network = 'testnet';

    constructor(
        @inject(TYPES.Library) libs: ILibrary,
        @inject(TYPES.Config) config: Config
    ) {
        this._libs = libs;
        this.network = config.network;
    }

    /**
     * Add the payment information for the MPA_BID.
     * The cryptocurrency to be used is extracted from the bid.
     * The right library for that currency is then retrieved and used.
     *
     * Adds:
     *  pubKey, changeAddress & inputs.
     *
     * @param wallet
     * @param listing the marketplace listing message, used to retrieve the payment amounts.
     * @param bid the marketplace bid message to add the transaction details to.
     */
    public async bid(wallet: string, listing: MPA_LISTING_ADD, bid: MPA_BID): Promise<MPA_BID> {
        // Get the right transaction library for the right currency.
        const paymentData = bid.buyer.payment as PaymentDataBidCT;
        const lib = <CtRpc> this._libs(paymentData.cryptocurrency, true);

        const requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, false);

        console.log('OMP_LIB: bid() paymentData: ', JSON.stringify(paymentData, null, 2));
        console.log('OMP_LIB: bid() requiredSatoshis: ', requiredSatoshis);

        // for now, we are forcing anon
        // const type = (this.network === 'testnet') ? 'anon' : 'blind';
        // paymentData.prevouts = await lib.getBlindPrevouts(type, requiredSatoshis);
        paymentData.prevouts = await lib.getPrevouts(wallet, OutputType.ANON, OutputType.BLIND, requiredSatoshis);

        if (!paymentData.outputs) {
            paymentData.outputs = [];
            paymentData.outputs.push({} as ToBeBlindOutput);
        }

        const buyer_prevout = paymentData.prevouts[0];
        const buyer_output = paymentData.outputs[0];

        buyer_output.blindFactor = lib.getRandomBlindFactor();
        buyer_output.address = await lib.getNewStealthAddressWithEphem(wallet);


        const address: CryptoAddress = await lib.getNewStealthAddressWithEphem(wallet, buyer_output.address);
        // TODO (security): randomize value and PRESENCE. Can be undefined! -> randomizes index too
        const blindFactor = lib.getRandomBlindFactor();
        // const blindFactor = undefined;

        paymentData.release = {
            ephem: address.ephem,
            blindFactor
        } as any;

        return bid;
    }

    /**
     * Adds the payment information for the MPA_ACCEPT for the seller.
     * Create and includes signatures for the destruction txn (half signed).
     *
     * Rebuilds the unsigned bid txn, half signed destruction txn, (fully signed release tx).
     *
     * Note: this function is also called by the buyer.
     *
     * @param wallet
     * @param listing the marketplace listing message, used to retrieve the payment amounts.
     * @param bid the marketplace bid message to add the transaction details to.
     * @param accept the accept to fill in or rebuild the transaction from.
     */
// TODO: cognitive-complexity 28, should be less than 20
// tslint:disable:cognitive-complexity
    public async accept(wallet: string, listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT): Promise<MPA_ACCEPT> {

        // TODO(security): safe numbers?
        const bidPaymentData = bid.buyer.payment as PaymentDataBidCT;
        const acceptPaymentData = accept.seller.payment as PaymentDataAcceptCT;

        // If seller is accepting, initialize the array
        if (!acceptPaymentData.outputs || acceptPaymentData.outputs.length === 0) {
            acceptPaymentData.outputs = [];
            acceptPaymentData.outputs.push({} as ToBeBlindOutput);
        }

        if (!bidPaymentData.outputs || bidPaymentData.outputs.length === 0) {
            throw new Error('Missing buyer outputs.');
        }

        let seller_output = acceptPaymentData.outputs[0];
        let buyer_output = bidPaymentData.outputs[0];

        // Get the right transaction library for the right currency.
        const lib = <CtRpc> this._libs(bidPaymentData.cryptocurrency, true);




        /**
         * Bid transaction.
         */
        const buyer_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, false);
        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, true);

        // Hardcoded fee
        const seller_fee = acceptPaymentData.fee = acceptPaymentData.fee | 5000;

        // Buyer must supply one input
        if (bidPaymentData.prevouts.length !== 1) {
            throw new Error('Currently only supports one input from the buyer.');
        }

        if (!isArrayAndContains(acceptPaymentData.prevouts)) {

            const cryptocurrency = listing.item.payment.options!.find((crypto) => crypto.currency === bidPaymentData.cryptocurrency);
            if (!cryptocurrency) {
                throw new Error('Missing buyer outputs.');
            }

            // Buyer pregenerates the transaction blinding factor for the seller so he can sign earlier.
            // Currently not implemented because we're not checking ownership of the outputs.
            // TODO(security): fix
            const blind = hash(buyer_output.blindFactor + cryptocurrency.address.address);

            // Generate a new CT output of the _exact_ amount.
            acceptPaymentData.prevouts = await lib.getPrevouts(wallet, OutputType.ANON, OutputType.BLIND, seller_requiredSatoshis + seller_fee, blind);

        }

        const seller_prevout = acceptPaymentData.prevouts[0];
        const buyer_prevout = bidPaymentData.prevouts[0];

        if (acceptPaymentData.prevouts.length !== 1) {
            throw new Error('Currently only supports one input from the seller.');
        } else {
            seller_prevout._satoshis = seller_requiredSatoshis + seller_fee;
            buyer_prevout._satoshis = buyer_requiredSatoshis;
        }

        if (!seller_output.blindFactor) {
            seller_output.blindFactor = await lib.getLastMatchingBlindFactor(wallet, [seller_prevout, buyer_prevout], [buyer_output]);
        }

        if (!seller_output.address) {
            seller_output.address = await lib.getNewStealthAddressWithEphem(wallet);
        }

         // Load all trusted values for prevouts from blockchain.
         //     commitment, scriptPubKey, ...
        await asyncMap(bidPaymentData.prevouts, async i => await lib.loadTrustedFieldsForBlindUtxo(wallet, i));
        await asyncMap(acceptPaymentData.prevouts, async i => await lib.loadTrustedFieldsForBlindUtxo(wallet, i));

        seller_output = this.getBidOutput(seller_output, buyer_output, 2880, seller_requiredSatoshis, true);
        buyer_output = this.getBidOutput(seller_output, buyer_output, 2880, buyer_requiredSatoshis);

        const all_inputs = clone(bidPaymentData.prevouts).concat(acceptPaymentData.prevouts);
        const all_outputs = [seller_output, buyer_output];

        const rawbidtx = await lib.generateRawConfidentialTx(wallet, all_inputs, all_outputs, seller_fee);
        const bidtx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawbidtx);


        if (!seller_output._redeemScript) {
            throw new Error('Missing seller outputs redeem script.');
        }
        // import the redeem script so the wallet is aware to watch on it
        // losing the pubkey makes the redeem script unrecoverable.
        // (always import the redeem script, doesn't matter)
        await lib.importRedeemScript(wallet, seller_output._redeemScript);

        accept['_bidtx'] = bidtx;
        accept['_rawbidtx'] = bidtx.build();


        const bid_utxos = this.getUtxosFromBidTx(bidtx, seller_output, buyer_output, 2880);

        /**
         * Destroy transaction from bid transaction.
         */
        const destroy_blind_out = await lib.getLastMatchingBlindFactor(wallet, [buyer_output, seller_output], []);
        const destroy_output = this.getDestroyOutput(bidtx, seller_requiredSatoshis + buyer_requiredSatoshis - seller_fee, destroy_blind_out);

        const rawdesttx = await lib.generateRawConfidentialTx(wallet, bid_utxos, destroy_output, acceptPaymentData.fee);
        const desttx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawdesttx);

        if (!acceptPaymentData.destroy || !isArrayAndContains(acceptPaymentData.destroy.signatures)) {
            acceptPaymentData.destroy = {
                signatures: []
            };

            acceptPaymentData.destroy.signatures = await lib.signRawTransactionForBlindInputs(wallet, desttx, bid_utxos, seller_output.address);
        }
        accept['_desttx'] = desttx;
        accept['_rawdesttx'] = desttx.build();

        /**
         * Release transaction from bid transaction.
         * Also generates the raw refund transaction (unsigned).
         */

        if (!acceptPaymentData.release) {
            acceptPaymentData.release = {
                signatures: []
            };
        }

        // If not rebuilding, generate new ephem key and insert in msg
        if (acceptPaymentData.release && !acceptPaymentData.release.ephem) {
            const sx = await lib.getNewStealthAddressWithEphem(wallet, seller_output.address);
            if (sx.ephem) {
                acceptPaymentData.release.ephem = sx.ephem;
            }
        }

        if (!bidPaymentData.release || !isObject(bidPaymentData.release)) {
            // Technically not required, format validators catch this.
            // But the linter warns that it might be undefined.
            throw new Error('bid.buyer.payment.release: missing or not an object');
        }

        // Fetch a new ephemeral key for release/refund
        // It is re-used for both release or refund but only one transaction is accepted,
        // so this shouldn't result in any trouble.
        // Refund is basically a release with the amount swapped around.
        const buyer_release_address: CryptoAddress = await this.getReleaseAddress(lib, wallet, buyer_output.address, bidPaymentData.release.ephem);
        const seller_release_address: CryptoAddress = await this.getReleaseAddress(lib, wallet, seller_output.address, acceptPaymentData.release.ephem!);

        // Decide where the sellers output is going to be located.
        const isSellerLastOutput = (bidPaymentData.release.blindFactor !== undefined);
        let lastBlindFactor: string;

        // Now that we have the addresses to release to
        // Let's turn them into outputs with the right amounts.
        // For the pedersen commitment scheme to work properly (sum inputs === sum outputs)
        // We must derive a very specific blind factor to make the sum match for one output.
        // We usually use the "derived" blind factor for the last output. (not mandatory)
        // If the buyer didnt provide a blind factor then it will be last.
        if (isSellerLastOutput) {
            lastBlindFactor = await lib.getLastMatchingBlindFactor(wallet, bid_utxos,
                [{blindFactor: bidPaymentData.release.blindFactor} as ToBeBlindOutput]);
        } else {
            // TODO(security): random
            acceptPaymentData.release.blindFactor = acceptPaymentData.release.blindFactor || lib.getRandomBlindFactor();
            lastBlindFactor = await lib.getLastMatchingBlindFactor(wallet, bid_utxos,
                [{blindFactor: acceptPaymentData.release.blindFactor} as ToBeBlindOutput]);
        }

        const buyer_blindFactor_release = isSellerLastOutput ? bidPaymentData.release.blindFactor : lastBlindFactor;
        const seller_blindFactor_release = isSellerLastOutput ?  lastBlindFactor : acceptPaymentData.release.blindFactor!;

        // Randomize the positioning for increased privacy.
        // based on whether the buyer provided a blind factor or not.
        const buyer_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, false);
        const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, true);
        const release_outputs: ToBeBlindOutput[] = [
            this.getReleaseOutput(buyer_release_address, buyer_releaseSatoshis, buyer_blindFactor_release), // buyer_release_output
            this.getReleaseOutput(seller_release_address, seller_releaseSatoshis - seller_fee, seller_blindFactor_release) // seller_release_output
        ];

        const buyer_refundSatoshis = this.release_calculateRequiredSatoshis(listing, bid, false, true);
        const seller_refundSatoshis = this.release_calculateRequiredSatoshis(listing, bid, true, true);
        const refund_outputs: ToBeBlindOutput[] = [
            this.getReleaseOutput(buyer_release_address, buyer_refundSatoshis, buyer_blindFactor_release), // buyer_refund_output
            this.getReleaseOutput(seller_release_address, seller_refundSatoshis - seller_fee, seller_blindFactor_release) // seller_refund_output
        ];

        // If seller is not the last output, swap them.
        if (!isSellerLastOutput) {
            release_outputs.reverse();
            refund_outputs.reverse();
        }

        // This is a bit annoying but we must delete
        // the _sequence before generating the rawtx of release/refund
        // the sequence would otherwise lock the transaction (like a destroy tx)
        delete bid_utxos[0]['_sequence'];
        delete bid_utxos[1]['_sequence'];

        // Build the raw release transaction
        const rawreleasetx = await lib.generateRawConfidentialTx(wallet, bid_utxos, release_outputs, seller_fee);
        accept['_rawreleasetxunsigned'] = rawreleasetx;
        const releasetx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawreleasetx);

        // Build the raw refund transaction (unsigned!)
        // TODO(security): seller_fee risk to buyer?
        const rawrefundtx = await lib.generateRawConfidentialTx(wallet, bid_utxos, refund_outputs, seller_fee);
        accept['_rawrefundtxunsigned'] = rawrefundtx;

        // Not rebuilding, seller signs release tx
        if (!isArrayAndContains(acceptPaymentData.release.signatures)) {
            // const seller_release_input = bid_utxos[0];
            // [seller_release_input]
            acceptPaymentData.release.signatures = await lib.signRawTransactionForBlindInputs(wallet, releasetx, bid_utxos, seller_output.address);
        }

        // complete the release tx but don't reveal to seller.
        if (accept['_buyerbuildrelease']) {
            const seller_release_input = bid_utxos[0];
            const buyer_release_input = bid_utxos[1];

            const buyer_signatures = await lib.signRawTransactionForBlindInputs(wallet, releasetx, bid_utxos, buyer_output.address);
            const seller_signatures = acceptPaymentData.release.signatures;

            releasetx.puzzleReleaseWitness(seller_release_input, seller_signatures[0], buyer_signatures[0]);
            releasetx.puzzleReleaseWitness(buyer_release_input, seller_signatures[1], buyer_signatures[1]);
        }


        accept['_rawreleasetx'] = releasetx.build();

        return accept;
    }

    /**
     * Adds the payment information for the MPA_LOCK for the buyer.
     * Create and includes signatures for
     * - the destruction txn (fully signed)
     * - the refund txn (half signed)
     * - the bid txn (half signed)
     *
     * Rebuilds the half signed bid txn, fully signed destruction txn.
     *
     * Note: this function is also called by the seller for rebuilding.
     *
     * @param wallet
     * @param listing the marketplace listing message.
     * @param bid the marketplace bid message.
     * @param accept the marketplace accept message.
     * @param lock the lock to fill in or rebuild the transaction from.
     */
    public async lock(wallet: string, listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT, lock: MPA_LOCK): Promise<MPA_LOCK> {

        // TODO(security): safe numbers?

        const bidPaymentData = bid.buyer.payment as PaymentDataBidCT;
        const acceptPaymentData = accept.seller.payment as PaymentDataAcceptCT;
        const lockPaymentData = lock.buyer.payment as PaymentDataLockCT;

        // Get the right transaction library for the right currency.
        const lib = <CtRpc> this._libs(bidPaymentData.cryptocurrency, true);

        const rebuilt = (await this.accept(wallet, listing, bid, clone(accept)));
        const bidtx: ConfidentialTransactionBuilder = rebuilt['_bidtx'];

        if (!acceptPaymentData.outputs || acceptPaymentData.outputs.length === 0) {
            throw new Error('Missing seller outputs.');
        }

        if (isArrayAndContains(lockPaymentData.signatures)) {
            // add signatures to inputs
            const signature = lockPaymentData.signatures;

            // bidPaymentData.prevouts.forEach((out, i) => bidtx.setWitness(out, signature[i]));
            for (const [index, blindPrevout] of bidPaymentData.prevouts.entries()) {
                bidtx.setWitness(blindPrevout, signature[index]);
            }

        } else {
            lockPaymentData.signatures = await lib.signRawTransactionForBlindInputs(wallet, bidtx, bidPaymentData.prevouts);
        }

        lock['_bidtx'] = bidtx;
        lock['_rawbidtx'] = bidtx.build();

        /**
         * Bid transaction as prevouts
         */

        if (!acceptPaymentData.outputs || acceptPaymentData.outputs.length === 0) {
            throw new Error('Missing seller outputs.');
        } else if (!bidPaymentData.outputs || bidPaymentData.outputs.length === 0) {
            throw new Error('Missing buyer outputs.');
        }
        const seller_output = acceptPaymentData.outputs[0];
        let buyer_output = bidPaymentData.outputs[0];
        const bid_utxos = this.getUtxosFromBidTx(bidtx, seller_output, buyer_output, 2880);

        /**
         * Destroy transaction from bid transaction.
         */
        const desttx: ConfidentialTransactionBuilder = rebuilt['_desttx'];

        // Buyer signs the destroy txn
        if (!lockPaymentData.destroy || !isArrayAndContains(lockPaymentData.destroy.signatures)) {
            lockPaymentData.destroy = {
                signatures: []
            };
            lockPaymentData.destroy.signatures = await lib.signRawTransactionForBlindInputs(wallet, desttx, bid_utxos, buyer_output.address);
        }

        if (!acceptPaymentData.destroy || acceptPaymentData.destroy.signatures.length === 0) {
            throw new Error('Missing seller destroy signatures.');
        } else if (!lockPaymentData.destroy || !lockPaymentData.destroy.signatures || lockPaymentData.destroy.signatures.length === 0) {
            throw new Error('Missing buyer destroy signatures.');
        }
        await desttx.puzzleDestroyWitness(bid_utxos, acceptPaymentData.destroy.signatures, lockPaymentData.destroy.signatures);

        lock['_rawdesttx'] = desttx.build();

        /**
         * Refund transaction from bid transaction.
         */
        const refundtx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rebuilt['_rawrefundtxunsigned']);
        const buyer_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, false);
        buyer_output = this.getBidOutput(seller_output, buyer_output, 2880, buyer_requiredSatoshis);

        // Buyer signs the refund txn
        if (!lockPaymentData.refund || !isArrayAndContains(lockPaymentData.refund.signatures)) {
            lockPaymentData.refund = {
                signatures: []
            };
            lockPaymentData.refund.signatures = await lib.signRawTransactionForBlindInputs(wallet, refundtx, bid_utxos, buyer_output.address);
        }

        lock['_refundtx'] = refundtx;
        lock['_rawrefundtx'] = refundtx.build();
        lock['_rawreleasetx'] = rebuilt['_rawreleasetx'];
        lock['_rawreleasetxunsigned'] = rebuilt['_rawreleasetxunsigned'];


        return lock;
    }

    /**
     * Generate the fully signed bid txn in response to a
     * lock message. (seller only)
     *
     * @param wallet
     * @param listing the marketplace listing message.
     * @param bid the marketplace bid message.
     * @param accept the marketplace accept message.
     * @param lock the lock to fill in or rebuild the transaction from.
     */
    public async complete(wallet: string, listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT, lock: MPA_LOCK): Promise<string> {

        const bidPaymentData = bid.buyer.payment as PaymentDataBidCT;
        const acceptPaymentData = accept.seller.payment as PaymentDataAcceptCT;
        const lockPaymentData = lock.buyer.payment as PaymentDataLockCT;

        // Get the right transaction library for the right currency.
        const lib = <CtRpc> this._libs(bidPaymentData.cryptocurrency, true);

        // Don't trigger the signing of releasetx for buyer when rebuilding
        const cloned_accept = clone(accept);

        const rebuiltLockMessage = (await this.lock(wallet, listing, bid, cloned_accept, clone(lock)));
        // console.log('OMP_LIB: rebuiltLockMessage: ', JSON.stringify(rebuiltLockMessage, null, 2));

        // rebuild from accept message
        const bidTxBuilder: ConfidentialTransactionBuilder = rebuiltLockMessage['_bidtx'];

        const seller_inputs: BlindPrevout[] = clone(acceptPaymentData.prevouts);

        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, true);
        const seller_fee = acceptPaymentData.fee;
        seller_inputs[0]._satoshis = seller_requiredSatoshis + seller_fee;

        console.log('OMP_LIB: seller_requiredSatoshis: ', seller_requiredSatoshis);
        console.log('OMP_LIB: seller_fee: ', seller_fee);
        console.log('OMP_LIB: seller_inputs: ', seller_inputs);
/*
        was:
        await asyncMap(seller_inputs, async utxo => await lib.loadTrustedFieldsForBlindUtxo(wallet, utxo));
        const seller_signatures = await lib.signRawTransactionForBlindInputs(wallet, bidTxBuilder, seller_inputs);
        seller_inputs.forEach((out, i) => bidTxBuilder.setWitness(out, seller_signatures[i]));
*/
        for (const sellerInput of seller_inputs) {
            await lib.loadTrustedFieldsForBlindUtxo(wallet, sellerInput);
            const sellerSignature = await lib.signRawTransactionForBlindInput(wallet, bidTxBuilder, sellerInput);
            // TODO: why is this called twice? first in signRawTransactionForBlindInput, then here again?
            bidTxBuilder.setWitness(sellerInput, sellerSignature);
        }

        return bidTxBuilder.build();
    }

    /**
     * Produces a fully signed release transaction when called by the buyer.
     * Performs two steps: both for buyer and seller.
     *
     * @param wallet
     * @param listing the marketplace listing message.
     * @param bid the marketplace bid message.
     * @param accept the marketplace accept message.
     */
    public async release(wallet: string, listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT): Promise<string> {
        // TODO(security): safe numbers?

        const bidPaymentData = bid.buyer.payment as PaymentDataBidCT;
        const acceptPaymentData = accept.seller.payment as PaymentDataAcceptCT;

        // Get the right transaction library for the right currency.
        const lib = this._libs(bidPaymentData.cryptocurrency, true);

        const cloned_accept = clone(accept);
        cloned_accept['_buyerbuildrelease'] = true;
        // regenerate the transaction (from the messages)
        const rebuilt = (await this.accept(wallet, listing, bid, cloned_accept));

        return rebuilt['_rawreleasetx'];
    }

    /**
     * Produces a fully signed release transaction when called by the buyer.
     * Performs two steps: both for buyer and seller.
     *
     * @param wallet
     * @param listing the marketplace listing message.
     * @param bid the marketplace bid message.
     * @param accept the marketplace accept message.
     * @param lock
     */
    public async refund(wallet: string, listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT, lock: MPA_LOCK): Promise<string> {

        const bidPaymentData = bid.buyer.payment as PaymentDataBidCT;
        const acceptPaymentData = accept.seller.payment as PaymentDataAcceptCT;
        const lockPaymentData = lock.buyer.payment as PaymentDataLockCT;

        // Get the right transaction library for the right currency.
        const lib = <CtRpc> this._libs(bidPaymentData.cryptocurrency, true);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.lock(wallet, listing, bid, clone(accept), clone(lock)));
        const bidtx: ConfidentialTransactionBuilder = rebuilt['_bidtx'];
        const refundtx: ConfidentialTransactionBuilder = rebuilt['_refundtx'];

        const buyer_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, false);
        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, true);


        if (!acceptPaymentData.outputs || acceptPaymentData.outputs.length === 0) {
            throw new Error('Missing seller outputs.');
        } else if (!bidPaymentData.outputs || bidPaymentData.outputs.length === 0) {
            throw new Error('Missing buyer outputs.');
        }
        let seller_output = acceptPaymentData.outputs[0];
        let buyer_output = bidPaymentData.outputs[0];

        const bid_utxos = this.getUtxosFromBidTx(bidtx, seller_output, buyer_output, 2880);

        seller_output = this.getBidOutput(seller_output, buyer_output, 2880, seller_requiredSatoshis, true);
        buyer_output = this.getBidOutput(seller_output, buyer_output, 2880, buyer_requiredSatoshis);


        const seller_release_input = bid_utxos[0];
        const buyer_release_input = bid_utxos[1];

        if (!lockPaymentData.refund || !lockPaymentData.refund.signatures || lockPaymentData.refund.signatures.length === 0) {
            throw new Error('Missing seller destroy signatures.');
        }
        const buyer_signatures = lockPaymentData.refund.signatures;
        const seller_signatures = await lib.signRawTransactionForBlindInputs(wallet, refundtx, bid_utxos, seller_output.address);

        refundtx.puzzleReleaseWitness(seller_release_input, seller_signatures[0], buyer_signatures[0]);
        refundtx.puzzleReleaseWitness(buyer_release_input, seller_signatures[1], buyer_signatures[1]);

        return refundtx.build();
    }

    /**
     * Deterministically retrieve the UTXOs generated by the bid tx to be used as inputs for destroy, release, etc..
     * @param bidtx the bid transaction to get the utxos from
     * @param seller_output the seller output
     * @param buyer_output the buyer output
     * @param secondsToLock the amount of seconds the transaction was locked for
     */
    private getUtxosFromBidTx(bidtx: ConfidentialTransactionBuilder, seller_output: ToBeBlindOutput, buyer_output: ToBeBlindOutput,
                              secondsToLock: number): BlindPrevout[] {
        return [
            {
                txid: bidtx.txid,
                vout: 1,
                _satoshis: seller_output._satoshis,
                _scriptPubKey: bidtx.getPubKeyScriptForVout(1),
                _commitment: bidtx.getCommitmentForVout(1),
                blindFactor: seller_output.blindFactor,
                _redeemScript: buildBidTxScript(seller_output.address, buyer_output.address, 2880, this.network).redeemScript,
                _sequence: getExpectedSequence(secondsToLock)
            },
            {
                txid: bidtx.txid,
                vout: 2,
                _satoshis: buyer_output._satoshis,
                _scriptPubKey: bidtx.getPubKeyScriptForVout(2),
                _commitment: bidtx.getCommitmentForVout(2),
                blindFactor: buyer_output.blindFactor,
                _redeemScript: buildBidTxScript(seller_output.address, buyer_output.address, 288, this.network).redeemScript,
                _sequence: getExpectedSequence(secondsToLock)
            }
        ];
    }

    private async getReleaseAddress(lib: CtRpc, wallet: string, sx: CryptoAddress, ephem: EphemeralKey): Promise<CryptoAddress> {
        const address = clone(sx);
        delete address.pubKey;
        address.ephem = ephem;
        await lib.getPubkeyForStealthWithEphem(wallet, address);
        return address;
    }

    private getBidOutput(seller_output: any, buyer_output: any, secondsToLock: number, satoshis: number, seller: boolean = false): any {
        const output = clone(seller ? seller_output : buyer_output);
        const s = buildBidTxScript(seller_output.address, buyer_output.address, secondsToLock, this.network);
        output._redeemScript = s.redeemScript;
        output._address = s.address;
        output._satoshis = satoshis;
        return output;
    }

    // TODO: add proper return type
    private getDestroyOutput(bidtx: ConfidentialTransactionBuilder, satoshis: number, blind: string): any[] {
        const destroy_redeemScript = buildDestroyTxScript(this.network).redeemScript;
        return [{
            _redeemScript: 'OP_RETURN', // TODO: fix particl-core, ASM only?
            _type: 'blind',
            _nonce: bidtx.txid, // TODO(security): random 32byte value
            _satoshis: satoshis,
            blindFactor: blind, // hash("random"), // TODO(security): unspendable anyways...
            _data: '0a' + hash('random') // TODO(security): make fake ephem 33
        }];
    }

    private getReleaseOutput(address: CryptoAddress, satoshis: number, blind: string): ToBeBlindOutput {
        return {
            address,
            _type: 'anon',
            _satoshis: satoshis,
            blindFactor: blind
        };
    }

    private bid_calculateRequiredSatoshis(listing: MPA_LISTING_ADD, bid: MPA_BID, seller: boolean): number {
        // A refund is the same as the amount you've put in, so we can reuse the code for refunds.
        return this.release_calculateRequiredSatoshis(listing, bid, seller, true);
    }

    private release_calculateRequiredSatoshis(listing: MPA_LISTING_ADD, bid: MPA_BID, seller: boolean, refund: boolean = false): number {

        if (!listing.item.payment.escrow) {
            throw new Error('No escrow configuration provided!');
        }

        const basePrice = this.bid_valueToTransferSatoshis(listing, bid);
        const percentageRatio = seller ? listing.item.payment.escrow.ratio.seller : listing.item.payment.escrow.ratio.buyer;
        const ratio = percentageRatio / 100;
        let required = 0;
        if (refund) { // only difference with the bid version of it.
            required = (seller) ? 0 : basePrice;
        } else {
            required = (seller) ? basePrice : 0;
        }
        required += Math.trunc(ratio * basePrice);
        return required;
    }

    /**
     * The value to transfer from the buyer to the seller (basePrice + shippingPrice + additional prices)
     * @param listing
     * @param bid
     */
    private bid_valueToTransferSatoshis(listing: MPA_LISTING_ADD, bid: MPA_BID): number {

        const bidPaymentData = bid.buyer.payment as PaymentDataBidCT;

        let satoshis = 0;
        const payment = listing.item.payment.options!.find((crypto) => crypto.currency === bidPaymentData.cryptocurrency);

        if (!payment) {
            throw new Error('Missing payment.');
        }

        satoshis = payment.basePrice;

        if (listing.item.information.location && payment.shippingPrice) {
            if (bid.buyer.shippingAddress.country === listing.item.information.location.country) {
                satoshis += payment.shippingPrice.domestic;
            } else {
                satoshis += payment.shippingPrice.international;
            }
        }

        return satoshis;
    }
}
