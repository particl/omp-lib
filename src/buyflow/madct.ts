import { inject, injectable } from 'inversify';
import { TYPES } from '../types';

import { CryptoAddressType, BlindPrevout, ToBeBlindOutput, Prevout, CryptoAddress } from '../interfaces/crypto';
import { BidConfiguration } from '../interfaces/configs';
import { Rpc, ILibrary, CtRpc } from '../abstract/rpc';
import { IMadCTBuilder } from '../abstract/transactions';

import { TransactionBuilder, getTxidFrom } from '../transaction-builder/transaction';
import { ConfidentialTransactionBuilder, buildBidTxScript, buildDestroyTxScript, getExpectedSequence } from '../transaction-builder/confidential-transaction';

import { MPM, MPA_BID, MPA_EXT_LISTING_ADD, MPA_ACCEPT, MPA_LOCK, MPA_RELEASE, MPA_REFUND } from '../interfaces/omp';
import { asyncForEach, asyncMap, clone, isArray, fromSatoshis, log } from '../util';
import { hash } from '../hasher/hash';
import { Tx } from '../transaction-builder/build';

@injectable()
export class MadCTBuilder implements IMadCTBuilder {

    private _libs: ILibrary;

    constructor(
        @inject(TYPES.Library) libs: ILibrary
    ) {
        this._libs = libs;
    }

    /**
     * Add the payment information for the MPA_BID.
     * The cryptocurrency to be used is extracted from the bid.
     * The right library for that currency is then retrieved and used.
     *
     * Adds:
     *  pubKey, changeAddress & inputs.
     *
     * @param config a configuration, storing the shipping details, cryptocurrency to be used etc.
     * @param listing the marketplace mostong message, used to retrieve the payment amounts.
     * @param bid the marketplace bid message to add the transaction details to.
     */
    public async bid(listing: MPM, bid: MPM): Promise<MPM> {
        const mpa_listing: MPA_EXT_LISTING_ADD = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid: MPA_BID = (<MPA_BID> bid.action);

        // Get the right transaction library for the right currency.
        const lib = <CtRpc> this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        const requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);

        mpa_bid.buyer.payment.prevouts = await lib.getBlindPrevouts(requiredSatoshis);

        if (!mpa_bid.buyer.payment.outputs) {
            mpa_bid.buyer.payment.outputs = [];
            mpa_bid.buyer.payment.outputs.push({});
        }

        const buyer_prevout = (<BlindPrevout> mpa_bid.buyer.payment.prevouts[0]);
        const buyer_output = (<ToBeBlindOutput> mpa_bid.buyer.payment.outputs[0]);

        buyer_output._secret = '76d02c17ce9999108a568fa9c192eee9580674e73a47c1e85c1bd335aa57082e';
        buyer_output.hashedSecret = hash(new Buffer(buyer_output._secret, 'hex'));
        buyer_output.blindFactor = '7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490';
        buyer_output.address = await lib.getNewStealthAddressWithEphem();


        const address: CryptoAddress = await lib.getNewStealthAddressWithEphem(buyer_output.address);
        // TODO (security): randomize value and PRESENCE. Can be undefined! -> randomizes index too
        const blindFactor = '7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490';
        // const blindFactor = undefined;

        mpa_bid.buyer.payment.release = {
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
     * If the "_secret" field is specified, it will build the release transaction.
     *
     * @param listing the marketplace listing message, used to retrieve the payment amounts.
     * @param bid the marketplace bid message to add the transaction details to.
     * @param accept the accept to fill in or rebuild the transaction from.
     */
// TODO: cognitive-complexity 28, should be less than 20
// tslint:disable:cognitive-complexity
    public async accept(listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        const mpa_listing = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        const mpa_accept = (<MPA_ACCEPT> accept.action);

        if (!mpa_accept.seller.payment.outputs || mpa_accept.seller.payment.outputs.length === 0) {
            mpa_accept.seller.payment.outputs = [];
            mpa_accept.seller.payment.outputs.push({});
        }

        if (!mpa_bid.buyer.payment.outputs || mpa_bid.buyer.payment.outputs.length === 0) {
            throw new Error('Missing buyer outputs.');
        }

        let seller_output = (<ToBeBlindOutput> mpa_accept.seller.payment.outputs[0]);
        let buyer_output = (<ToBeBlindOutput> mpa_bid.buyer.payment.outputs[0]);

        // Get the right transaction library for the right currency.
        const lib = <CtRpc> this._libs(mpa_bid.buyer.payment.cryptocurrency, true);




        /**
         * Bid transaction.
         */
        const buyer_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);
        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, true);

        // Hardcoded fee
        let seller_fee = mpa_accept.seller.payment.fee = mpa_accept.seller.payment.fee | 5000;

        // Buyer must supply one input
        if (mpa_bid.buyer.payment.prevouts.length !== 1) {
            throw new Error('Currently only supports one input from the buyer.');
        }

        if (!isArray(mpa_accept.seller.payment.prevouts)) {
            const cryptocurrency = mpa_listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === mpa_bid.buyer.payment.cryptocurrency);
            if (!cryptocurrency) {
                throw new Error('Missing buyer outputs.');
            }

            // Buyer pregenerates the transaction blinding factor for the seller so he can sign earlier.
            // Currently not implemented because we're not checking ownership of the outputs.
            // TODO(security): fix
            const blind = hash(buyer_output.blindFactor + cryptocurrency.address.address);
            // Generate a new CT output of the _exact_ amount.
            mpa_accept.seller.payment.prevouts = await lib.getBlindPrevouts(seller_requiredSatoshis + seller_fee, blind);
        }

        const seller_prevout = (<BlindPrevout> mpa_accept.seller.payment.prevouts[0]);
        const buyer_prevout = (<BlindPrevout> mpa_bid.buyer.payment.prevouts[0]);
        if (mpa_accept.seller.payment.prevouts.length !== 1) {
            throw new Error('Currently only supports one input from the seller.');
        } else {
            seller_prevout._satoshis = seller_requiredSatoshis + seller_fee;
            buyer_prevout._satoshis = buyer_requiredSatoshis;
        }

        if (!seller_output.blindFactor) {
            seller_output.blindFactor = await lib.getLastMatchingBlindFactor([seller_prevout, buyer_prevout], [buyer_output]);
        }

        if (!seller_output.address) {
            seller_output.address = await lib.getNewStealthAddressWithEphem();
        }

        if (!buyer_output.hashedSecret) {
            throw new Error('Missing buyer outputs hashed secret.');
        }

         // Load all trusted values for prevouts from blockchain.
         //     commitment, scriptPubKey, ...
        await asyncMap(mpa_bid.buyer.payment.prevouts, async i => await lib.loadTrustedFieldsForBlindUtxo(i));
        await asyncMap(mpa_accept.seller.payment.prevouts, async i => await lib.loadTrustedFieldsForBlindUtxo(i));

        seller_output = this.getBidOutput(buyer_output, seller_output, buyer_output.hashedSecret, 2880, seller_requiredSatoshis);
        buyer_output = this.getBidOutput(seller_output, buyer_output, buyer_output.hashedSecret, 2880, buyer_requiredSatoshis);

        const all_inputs = clone(<BlindPrevout[]> mpa_bid.buyer.payment.prevouts).concat(mpa_accept.seller.payment.prevouts);
        const all_outputs = [seller_output, buyer_output];

        const rawbidtx = await lib.generateRawConfidentialTx(all_inputs, all_outputs, seller_fee);
        const bidtx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawbidtx);


        if (!seller_output._redeemScript) {
            throw new Error('Missing seller outputs redeem script.');
        }
        // import the redeem script so the wallet is aware to watch on it
        // losing the pubkey makes the redeem script unrecoverable.
        // (always import the redeem script, doesn't matter)
        await lib.importRedeemScript(seller_output._redeemScript);

        accept['_bidtx'] = bidtx;
        accept['_rawbidtx'] = bidtx.build();


        const bid_utxos = this.getUtxosFromBidTx(bidtx, seller_output, buyer_output, 2880);

        /**
         * Destroy transaction from bid transaction.
         */
        const destroy_blind_out = await lib.getLastMatchingBlindFactor([buyer_output, seller_output], []);
        const destroy_output = this.getDestroyOutput(bidtx, seller_requiredSatoshis + buyer_requiredSatoshis - seller_fee, destroy_blind_out);

        const rawdesttx = await lib.generateRawConfidentialTx(bid_utxos, destroy_output, mpa_accept.seller.payment.fee);
        const desttx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawdesttx);

        if (!mpa_accept.seller.payment.destroy) {
            throw new Error('Missing mpa_accept.seller.payment.destroy');
        }

        if (!isArray(mpa_accept.seller.payment.destroy.signatures)) {
            mpa_accept.seller.payment.destroy.signatures = await lib.signRawTransactionForBlindInputs(desttx, bid_utxos, seller_output.address);
        }
        accept['_desttx'] = desttx;
        accept['_rawdesttx'] = desttx.build();

        /**
         * Release transaction from bid transaction.
         * Also generates the raw refund transaction (unsigned).
         */

        if (!mpa_accept.seller.payment.release) {
            mpa_accept.seller.payment.release = <any> {};
        }
        // If not rebuilding, generate new ephem key and insert in msg
        if (!mpa_accept.seller.payment.release.ephem) {
            const sx = await lib.getNewStealthAddressWithEphem(seller_output.address);
            mpa_accept.seller.payment.release.ephem = sx.ephem;
        }


        // Fetch a new ephemeral key for release/refund
        // It is re-used for both release or refund but only one transaction is accepted, 
        // so this shouldn't result in any trouble.
        // Refund is basically a release with the amount swapped around.
        const buyer_release_address: CryptoAddress = clone(buyer_output.address);
        delete buyer_release_address['pubKey'];
        buyer_release_address.ephem = mpa_bid.buyer.payment.release.ephem;
        await lib.getPubkeyForStealthWithEphem(buyer_release_address);

        const seller_release_address: CryptoAddress = clone(seller_output.address);
        delete seller_release_address['pubKey'];
        seller_release_address.ephem = mpa_accept.seller.payment.release.ephem;
        await lib.getPubkeyForStealthWithEphem(seller_release_address);

        // Decide where the sellers output is going to be located.
        let isSellerLastOutput = (mpa_bid.buyer.payment.release.blindFactor !== undefined);
        let lastBlindFactor: string;

        // Now that we have the addresses to release to
        // Let's turn them into outputs with the right amounts.
        // For the pedersen commitment scheme to work properly (sum inputs === sum outputs)
        // We must derive a very specific blind factor to make the sum match for one output.
        // We usually use the "derived" blind factor for the last output. (not mandatory)
        // If the buyer didnt provide a blind factor then it will be last.
        if (isSellerLastOutput) {
            lastBlindFactor = await lib.getLastMatchingBlindFactor(bid_utxos,
                [{blindFactor: mpa_bid.buyer.payment.release.blindFactor} as ToBeBlindOutput]);
        } else {
            // TODO(security): random
            mpa_accept.seller.payment.release.blindFactor = '7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490';
            lastBlindFactor = await lib.getLastMatchingBlindFactor(
                bid_utxos,
                [{blindFactor: mpa_accept.seller.payment.release.blindFactor} as ToBeBlindOutput]);
        }

        const buyer_blindFactor_release = isSellerLastOutput ? mpa_bid.buyer.payment.release.blindFactor : lastBlindFactor;
        const seller_blindFactor_release = isSellerLastOutput ?  lastBlindFactor : mpa_accept.seller.payment.release.blindFactor;

        // Randomize the positioning for increased privacy.
        // based on whether the buyer provided a blind factor or not.
        const buyer_releaseSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);
        const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, true);
        let release_outputs: ToBeBlindOutput[] = [
            this.getReleaseOutput(buyer_release_address, buyer_releaseSatoshis, buyer_blindFactor_release), // buyer_release_output
            this.getReleaseOutput(seller_release_address, seller_releaseSatoshis - seller_fee, seller_blindFactor_release) // seller_release_output
        ];

        const buyer_refundSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, false, true);
        const seller_refundSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, true, true);
        let refund_outputs: ToBeBlindOutput[] = [
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
        delete bid_utxos[0]['_sequence'];
        delete bid_utxos[1]['_sequence'];

        // Build the raw release transaction
        const rawreleasetx = await lib.generateRawConfidentialTx(bid_utxos, release_outputs, seller_fee);
        accept['_rawreleasetxunsigned'] = rawreleasetx;
        const releasetx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawreleasetx);

        // Build the raw refund transaction (unsigned!)
        // TODO(security): seller_fee risk to buyer?
        const rawrefundtx = await lib.generateRawConfidentialTx(bid_utxos, refund_outputs, seller_fee);
        accept['_rawrefundtxunsigned'] = rawrefundtx;

        // Not rebuilding, seller signs release tx
        if (!mpa_accept.seller.payment.release.signatures) {
            const seller_release_input = bid_utxos[0];
            mpa_accept.seller.payment.release.signatures = await lib.signRawTransactionForBlindInputs(releasetx, [seller_release_input], seller_output.address);
        }

        // Buyer secret available in the passed message
        // so this is the buyer rebuilding the txs.
        // complete the release tx but don't reveal to seller.
        // WARNING(security): these functions expect all untrusted messages to be stripped (_secret must be removed)
        // WARNING(security): if an attacker specifies buyer_output._secret, then the seller will attempt to sign for buyers input
        // might actually be plausable to pull off if the buyer pretends to own the address of the seller (require proof of ownership?)
        // It is a useless attack on the releasetx though, as a malicious buyer can pull it off, and it acts in favor of the seller.
        // This is much more of an issue on the bix txn generation.
        if (buyer_output._secret) {
            const buyer_release_input = bid_utxos[1];
            const buyer_signatures = await lib.signRawTransactionForBlindInputs(releasetx, [buyer_release_input], buyer_output.address);
            releasetx.puzzleReleaseWitness(buyer_release_input, buyer_signatures[0], buyer_output._secret);

            const seller_release_input = bid_utxos[0];
            const seller_signatures =  mpa_accept.seller.payment.release.signatures;
            releasetx.puzzleReleaseWitness(seller_release_input, seller_signatures[0], buyer_output._secret);
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
     * @param listing the marketplace listing message.
     * @param bid the marketplace bid message.
     * @param accept the marketplace accept message.
     * @param lock the lock to fill in or rebuild the transaction from.
     */
    public async lock(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        // const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        const mpa_accept = (<MPA_ACCEPT> accept.action);
        const mpa_lock = (<MPA_LOCK> lock.action);

        // Get the right transaction library for the right currency.
        const lib = <CtRpc> this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        const rebuilt = (await this.accept(listing, bid, clone(accept)));
        const bidtx: ConfidentialTransactionBuilder = rebuilt['_bidtx'];

        if (!mpa_accept.seller.payment.outputs || mpa_accept.seller.payment.outputs.length === 0) {
            throw new Error('Missing seller outputs.');
        }

        if (isArray(mpa_lock.buyer.payment.signatures)) {
            // add signatures to inputs
            const signature = mpa_lock.buyer.payment.signatures;
            mpa_bid.buyer.payment.prevouts.forEach((out, i) => bidtx.setWitness(out, signature[i]));
        } else {
            mpa_lock.buyer.payment.signatures = await lib.signRawTransactionForBlindInputs(bidtx, <BlindPrevout[]> mpa_bid.buyer.payment.prevouts);
        }

        lock['_bidtx'] = bidtx;
        lock['_rawbidtx'] = bidtx.build();

        /**
         * Bid transaction as prevouts
         */
        const seller_output = (<ToBeBlindOutput> mpa_accept.seller.payment.outputs[0]);
        const buyer_output = (<ToBeBlindOutput> mpa_bid.buyer.payment.outputs[0]);
        const bid_utxos = this.getUtxosFromBidTx(bidtx, seller_output, buyer_output, 2880);
        
        /**
         * Destroy transaction from bid transaction.
         */
        const desttx: ConfidentialTransactionBuilder = rebuilt['_desttx'];

        // Buyer signs the destroy txn
        if (!mpa_lock.buyer.payment.destroy || !isArray(mpa_lock.buyer.payment.destroy.signatures)) {
            mpa_lock.buyer.payment.destroy = {};
            mpa_lock.buyer.payment.destroy.signatures = await lib.signRawTransactionForBlindInputs(desttx, bid_utxos, buyer_output.address);
        }

        await desttx.puzzleDestroyWitness(bid_utxos, mpa_accept.seller.payment.destroy.signatures, mpa_lock.buyer.payment.destroy.signatures);

        lock['_rawdesttx'] = desttx.build();

        /**
         * Refund transaction from bid transaction.
         */
        const refundtx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rebuilt['_rawrefundtxunsigned']);
        // Buyer signs the destroy txn
        if (!mpa_lock.buyer.payment.refund || !isArray(mpa_lock.buyer.payment.refund.signatures)) {
            mpa_lock.buyer.payment.refund = {};
            mpa_lock.buyer.payment.refund.signatures = await lib.signRawTransactionForBlindInputs(refundtx, bid_utxos, buyer_output.address);
        }

        lock['_refundtx'] = refundtx;
        lock['_rawrefundtx'] = refundtx.build();

        if (rebuilt['_rawreleasetx']) {
            lock['_rawreleasetx'] = rebuilt['_rawreleasetx'];
        }

        if (rebuilt['_rawreleasetxunsigned']) {
            lock['_rawreleasetxunsigned'] = rebuilt['_rawreleasetxunsigned'];
        }

        return lock;
    }

    /**
     * Generate the fully signed bid txn in response to a
     * lock message. (seller only)
     *
     * @param listing the marketplace listing message.
     * @param bid the marketplace bid message.
     * @param accept the marketplace accept message.
     * @param lock the lock to fill in or rebuild the transaction from.
     */
    public async complete(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> {

        const mpa_listing = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        const mpa_accept = (<MPA_ACCEPT> accept.action);
        const mpa_lock = (<MPA_LOCK> lock.action);

        // Get the right transaction library for the right currency.
        const lib = <CtRpc> this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        const rebuilt = (await this.lock(listing, bid, clone(accept), clone(lock)));

        // rebuild from accept message
        const bidtx: ConfidentialTransactionBuilder = rebuilt['_bidtx'];

        const seller_inputs = clone(mpa_accept.seller.payment.prevouts);

        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, true);
        const seller_fee = mpa_accept.seller.payment.fee;
        seller_inputs[0]._satoshis = seller_requiredSatoshis + seller_fee;

        await asyncMap(seller_inputs, async i => await lib.loadTrustedFieldsForBlindUtxo(i));

        const seller_signatures = await lib.signRawTransactionForBlindInputs(bidtx, seller_inputs);
        seller_inputs.forEach((out, i) => bidtx.setWitness(out, seller_signatures[i]));

        return bidtx.build();
    }

    /**
     * Add the payment information for the MPA_RELEASE.
     * Performs two steps: both for buyer and seller.
     *
     * Adds:
     *  signature of seller.
     *
     *  if seller.signatures is present, it will complete the transaction
     *  and return a fully signed under _rawtx
     */
    public async release(listing: MPM, bid: MPM, accept: MPM): Promise<string> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        const mpa_listing = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        const mpa_accept = (<MPA_ACCEPT> accept.action);

        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.accept(listing, bid, clone(accept)));

        return rebuilt['_rawreleasetx'];
    }

    public async refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund: MPM): Promise<MPM> {

        const mpa_listing = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        const mpa_accept = (<MPA_ACCEPT> accept.action);
        const mpa_lock = (<MPA_LOCK> lock.action);
        const mpa_refund = (<MPA_REFUND> refund.action);

        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.lock(listing, bid, clone(accept), clone(lock)));
        const refundtx: ConfidentialTransactionBuilder = rebuilt['_refundtx'];


        refund['_rawrefundtx'] = refundtx.build();

        return refund;
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
                _redeemScript: buildBidTxScript(buyer_output.address, seller_output.address, buyer_output.hashedSecret, 2880).redeemScript, 
                _sequence: getExpectedSequence(secondsToLock)
            },
            {
                txid: bidtx.txid,
                vout: 2,
                _satoshis: buyer_output._satoshis,
                _scriptPubKey: bidtx.getPubKeyScriptForVout(2),
                _commitment: bidtx.getCommitmentForVout(2),
                blindFactor: buyer_output.blindFactor,
                _redeemScript: buildBidTxScript(seller_output.address, buyer_output.address, buyer_output.hashedSecret, 2880).redeemScript,
                _sequence: getExpectedSequence(secondsToLock)
            }
        ];
    }

    private getBidOutput(output_one: any, output_two: any, hashedSecret: string, secondsToLock: number, satoshis: number) {
        output_two = clone(output_two);
        const s = buildBidTxScript(output_one.address, output_two.address, hashedSecret, secondsToLock)
        output_two._redeemScript = s.redeemScript;
        output_two._address = s.address;
        output_two._satoshis = satoshis;
        return output_two;
    }

    // TODO: add proper return type
    private getDestroyOutput(bidtx: ConfidentialTransactionBuilder, satoshis: number, blind: string): any[] {
        const destroy_redeemScript = buildDestroyTxScript().redeemScript;
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

    private bid_calculateRequiredSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID, seller: boolean): number {
        // A refund is the same as the amount you've put in, so we can reuse the code for refunds.
        return this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, seller, true)
    }

    private release_calculateRequiredSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID, seller: boolean, refund: boolean = false): number {
        const basePrice = this.bid_valueToTransferSatoshis(mpa_listing, mpa_bid);
        const percentageRatio = seller ? mpa_listing.item.payment.escrow.ratio.seller : mpa_listing.item.payment.escrow.ratio.buyer;
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
     * @param mpa_listing
     * @param mpa_bid
     */
    private bid_valueToTransferSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID): number {
        let satoshis = 0;
        const payment = mpa_listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === mpa_bid.buyer.payment.cryptocurrency);

        if (!payment) {
            throw new Error('Missing payment.');
        }

        satoshis = payment.basePrice;

        if (mpa_listing.item.information.location && payment.shippingPrice) {
            if (mpa_bid.buyer.shippingAddress.country === mpa_listing.item.information.location.country) {
                satoshis += payment.shippingPrice.domestic;
            } else {
                satoshis += payment.shippingPrice.international;
            }
        }

        return satoshis;
    }
}
