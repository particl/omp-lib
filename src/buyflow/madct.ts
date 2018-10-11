import { inject, injectable } from "inversify";
import { TYPES } from "../types";

import { CryptoAddressType, BlindPrevout, ToBeBlindOutput, Prevout, CryptoAddress } from "../interfaces/crypto";
import { BidConfiguration } from "../interfaces/configs";
import { Rpc, ILibrary, CtRpc } from "../abstract/rpc";
import { IMadCTBuilder } from "../abstract/transactions";

import { TransactionBuilder, getTxidFrom } from "../transaction-builder/transaction";
import { ConfidentialTransactionBuilder, buildBidTxScript, buildDestroyTxScript, getExpectedSequence } from "../transaction-builder/confidential-transaction";

import { MPM, MPA_BID, MPA_EXT_LISTING_ADD, MPA_ACCEPT, MPA_LOCK, MPA_RELEASE, MPA_REFUND } from "../interfaces/omp";
import { asyncForEach, asyncMap, clone, isArray, fromSatoshis, log } from "../util";
import { hash } from "../hasher/hash";
import { Tx } from "../transaction-builder/build";

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
    async bid(listing: MPM, bid: MPM): Promise<MPM> {
        const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);

        // Get the right transaction library for the right currency.
        const lib = <CtRpc>this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        const requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);

        mpa_bid.buyer.payment.prevouts = await lib.getBlindPrevouts(requiredSatoshis);

        if(!mpa_bid.buyer.payment.outputs) {
            mpa_bid.buyer.payment.outputs = [];
            mpa_bid.buyer.payment.outputs.push({});
        }

        const buyer_prevout = (<BlindPrevout>mpa_bid.buyer.payment.prevouts[0]);
        const buyer_output = (<ToBeBlindOutput>mpa_bid.buyer.payment.outputs[0]);

        buyer_output._secret = "76d02c17ce9999108a568fa9c192eee9580674e73a47c1e85c1bd335aa57082e";
        buyer_output.hashedSecret = hash(new Buffer(buyer_output._secret, "hex"));
        buyer_output.blindFactor = "7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490";
        buyer_output.address = await lib.getNewStealthAddressWithEphem();

        mpa_bid.buyer.payment.release = <any>{};
        // TODO(security): randomize
        if(false) {
            // The buyer specifies the blind factor
            mpa_bid.buyer.payment.release.blindFactor = "7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490"; // TODO(security): random
        }
        mpa_bid.buyer.payment.release.ephem = (await lib.getNewStealthAddressWithEphem(buyer_output.address)).ephem;

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
    async accept(listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);
        const mpa_accept = (<MPA_ACCEPT>accept.action);

        if(!mpa_accept.seller.payment.outputs || mpa_accept.seller.payment.outputs.length === 0) {
            mpa_accept.seller.payment.outputs = [];
            mpa_accept.seller.payment.outputs.push({});
        }

        let seller_output = (<ToBeBlindOutput>mpa_accept.seller.payment.outputs[0]);

        const buyer_prevout = (<BlindPrevout>mpa_bid.buyer.payment.prevouts[0]);
        const buyer_output = (<ToBeBlindOutput>mpa_bid.buyer.payment.outputs[0]);

        // Get the right transaction library for the right currency.
        const lib = <CtRpc>this._libs(mpa_bid.buyer.payment.cryptocurrency, true);


        /**
         * Bid transaction.
         */
        const buyer_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);
        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, true);

        // Hardcoded fee
        let seller_fee = 5000;
        if (!mpa_accept.seller.payment.fee) { // fee can never be 0 anyways
            mpa_accept.seller.payment.fee = seller_fee;
        }

        // Buyer must supply one input
        if(mpa_bid.buyer.payment.prevouts.length !== 1) {
            throw new Error('Currently only supports one input from the buyer.');
        } else {
            buyer_prevout._satoshis = buyer_requiredSatoshis;
        }

        if (!isArray(mpa_accept.seller.payment.prevouts)) {
            const cryptocurrency = mpa_listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === mpa_bid.buyer.payment.cryptocurrency);
            // Buyer pregenerates the transaction blinding factor for the seller so he can sign earlier.
            // Currently not implemented because we're not checking ownership of the outputs.
            // TODO(security): fix
            const blind = hash(buyer_output.blindFactor + cryptocurrency.address.address);
            // Generate a new CT output of the _exact_ amount.
            mpa_accept.seller.payment.prevouts = await lib.getBlindPrevouts(seller_requiredSatoshis + seller_fee, blind);
        }

        const seller_prevout = (<BlindPrevout>mpa_accept.seller.payment.prevouts[0]);
        if(mpa_accept.seller.payment.prevouts.length !== 1) {
            throw new Error('Currently only supports one input from the seller.');
        } else {
            seller_prevout._satoshis = seller_requiredSatoshis + seller_fee;
        }

        if (!seller_output.blindFactor) {
            seller_output.blindFactor = await lib.getLastMatchingBlindFactor([seller_prevout, buyer_prevout], [buyer_output]);
        }

        if(!seller_output.address) {
            seller_output.address = await lib.getNewStealthAddressWithEphem();
        }

         // Load all trusted values for prevouts from blockchain.
         //     commitment, scriptPubKey, ...
        await asyncMap(mpa_bid.buyer.payment.prevouts, async i => await lib.loadTrustedFieldsForBlindUtxo(i));
        await asyncMap(mpa_accept.seller.payment.prevouts, async i => await lib.loadTrustedFieldsForBlindUtxo(i));

        const s = buildBidTxScript(buyer_output.address, seller_output.address, buyer_output.hashedSecret, 2880);
        seller_output._redeemScript = s.redeemScript;
        seller_output._address = s.address;
        seller_output._satoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, true);

        const b = buildBidTxScript(seller_output.address, buyer_output.address, buyer_output.hashedSecret, 2880);
        buyer_output._redeemScript = b.redeemScript; 
        buyer_output._address = b.address;
        buyer_output._satoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);

        const all_inputs = clone(<BlindPrevout[]>mpa_bid.buyer.payment.prevouts).concat(mpa_accept.seller.payment.prevouts);
        const all_outputs = [seller_output, buyer_output];

        const rawbidtx = await lib.generateRawConfidentialTx(all_inputs, all_outputs, mpa_accept.seller.payment.fee);
        const bidtx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawbidtx);


        // import the redeem script so the wallet is aware to watch on it
        // losing the pubkey makes the redeem script unrecoverable.
        // (always import the redeem script, doesn't matter)
        await lib.importRedeemScript(seller_output._redeemScript);

        accept['_bidtx'] = bidtx;
        accept['_rawbidtx'] = bidtx.build();
 


        /**
         * Destroy transaction from bid transaction.
         */
        const destroy_inputs = this.getTxPrevoutsFromBidTx(bidtx, seller_output, buyer_output, 2880);
 
        const destroy_blind_out = await lib.getLastMatchingBlindFactor([buyer_output, seller_output], []);
        const destroy_output = this.getDestroyOutput(bidtx, seller_requiredSatoshis + buyer_requiredSatoshis - seller_fee, destroy_blind_out);

        const rawdesttx = await lib.generateRawConfidentialTx(destroy_inputs, destroy_output, mpa_accept.seller.payment.fee);
        const desttx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawdesttx)


        if (!isArray(mpa_accept.seller.payment.destroy.signatures)) {
            mpa_accept.seller.payment.destroy.signatures = await lib.signRawTransactionForBlindInputs(desttx, destroy_inputs, seller_output.address);
        }
        accept['_desttx'] = desttx;
        accept['_rawdesttx'] = desttx.build();

        /**
         * Release transaction from bid transaction.
         */

        if(!mpa_accept.seller.payment.release){
            mpa_accept.seller.payment.release = <any>{};
        }
        // If not rebuilding, generate new ephem key and insert in msg
        if(!mpa_accept.seller.payment.release.ephem) {
            let sx = await lib.getNewStealthAddressWithEphem(seller_output.address);
            mpa_accept.seller.payment.release.ephem = sx.ephem;
        }

        const release_inputs = this.getTxPrevoutsFromBidTx(bidtx, seller_output, buyer_output, 2880);
        delete release_inputs[0]['_sequence'];
        delete release_inputs[1]['_sequence'];

        // Decide where the sellers output is going to be located.
        let isFirst: boolean;
        let lastBlindFactor: string;
        if(!mpa_bid.buyer.payment.release.blindFactor) {
            // The buyer did not specify  blind key, so we will
            // the buyers release output will be the last output
            // and it will have its blind factor generated for it.
            mpa_accept.seller.payment.release.blindFactor = "7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490"; // TODO(security): random
            lastBlindFactor = await lib.getLastMatchingBlindFactor(release_inputs, [<ToBeBlindOutput>{blindFactor:  mpa_accept.seller.payment.release.blindFactor}])
            isFirst = true;
        } else {
            lastBlindFactor = await lib.getLastMatchingBlindFactor(release_inputs, [<ToBeBlindOutput>{blindFactor:  mpa_bid.buyer.payment.release.blindFactor}]) 
        }

        // Re-use sx address with new ephemeral keys
        let buyer_release_address: CryptoAddress = clone(buyer_output.address);
        delete buyer_release_address['pubKey'];
        buyer_release_address.ephem = mpa_bid.buyer.payment.release.ephem;
        await lib.getPubkeyForStealthWithEphem(buyer_release_address);

        const seller_release_address: CryptoAddress = clone(seller_output.address);
        delete seller_release_address['pubKey'];
        seller_release_address.ephem = mpa_accept.seller.payment.release.ephem;
        await lib.getPubkeyForStealthWithEphem(seller_release_address);

        // If seller is first output, then buyer didnt provide a blind factor
        const buyer_blindFactor_release = isFirst ? lastBlindFactor : mpa_bid.buyer.payment.release.blindFactor;
        const buyer_release_output = this.getReleaseOutput(buyer_release_address, buyer_output._satoshis, buyer_blindFactor_release);

        const seller_blindFactor_release = isFirst ? mpa_accept.seller.payment.release.blindFactor : lastBlindFactor;
        const seller_release_output = this.getReleaseOutput(seller_release_address, seller_output._satoshis - seller_fee, seller_blindFactor_release);

        let release_outputs: ToBeBlindOutput[];
        if(isFirst) {
            release_outputs = [
                seller_release_output,
                buyer_release_output
            ]
        } else {
            release_outputs = [
                buyer_release_output,
                seller_release_output
            ]
        }

        const rawreleasetx = await lib.generateRawConfidentialTx(release_inputs, release_outputs, seller_fee);
        accept['_rawreleasetxunsigned'] = rawreleasetx;
        const releasetx: ConfidentialTransactionBuilder = new ConfidentialTransactionBuilder(rawreleasetx);

        if(!mpa_accept.seller.payment.release.signatures) {
            const seller_release_input = release_inputs[0];
            mpa_accept.seller.payment.release.signatures = await lib.signRawTransactionForBlindInputs(releasetx, [seller_release_input], seller_output.address);
        }

        // Buyer secret available in the passed message
        // so this is the buyer rebuilding the txs.
        // complete the release tx but don't reveal to seller.
        if (buyer_output._secret) {
            const buyer_release_input = release_inputs[1];
            const buyer_signatures = await lib.signRawTransactionForBlindInputs(releasetx, [buyer_release_input], buyer_output.address);
            releasetx.puzzleReleaseWitness(buyer_release_input, buyer_signatures[0], buyer_output._secret);

            const seller_release_input = release_inputs[0];
            const seller_signatures =  mpa_accept.seller.payment.release.signatures;
            releasetx.puzzleReleaseWitness(seller_release_input, seller_signatures[0], buyer_output._secret);
        }

        accept['_rawreleasetx'] = releasetx.build();

        return accept;
    }


    // TODO: move to confidential-tx ?
    getTxPrevoutsFromBidTx(bidtx: ConfidentialTransactionBuilder, seller_output: ToBeBlindOutput, buyer_output: ToBeBlindOutput, secondsToLock: number): BlindPrevout[] {
        return [
            {
                txid: bidtx.txid,
                vout: 1,
                _satoshis: seller_output._satoshis,
                _scriptPubKey: bidtx.getPubKeyScriptForVout(1),
                _commitment: bidtx.getCommitmentForVout(1),
                blindFactor: seller_output.blindFactor,
                _redeemScript: seller_output._redeemScript,
                _sequence: getExpectedSequence(secondsToLock)
            },
            {
                txid: bidtx.txid,
                vout: 2,
                _satoshis: buyer_output._satoshis,
                _scriptPubKey: bidtx.getPubKeyScriptForVout(2),
                _commitment: bidtx.getCommitmentForVout(2),
                blindFactor: buyer_output.blindFactor,
                _redeemScript: buyer_output._redeemScript,
                _sequence: getExpectedSequence(secondsToLock)
             }
        ];
    }

    getDestroyOutput(bidtx: ConfidentialTransactionBuilder, satoshis: number, blind: string) {
        const destroy_redeemScript = buildDestroyTxScript().redeemScript;
        return [
            {
                _redeemScript: 'OP_RETURN', // TODO: fix particl-core, ASM only?
                _type: 'blind',
                _nonce: bidtx.txid, // TODO(security): random 32byte value
                _satoshis: satoshis,
                blindFactor: blind, //hash("random"), // TODO(security): unspendable anyways...
                _data: '0a'+hash("random") // TODO(security): make fake ephem 33
            }
        ]
    }

    getReleaseOutput(address: CryptoAddress, satoshis: number, blind: string): ToBeBlindOutput {
        return {
            address: address,
            _type: 'anon',
            _satoshis: satoshis,
            blindFactor: blind
        }
        
    }

    /**
     * Adds the payment information for the MPA_LOCK for the buyer.
     * Create and includes signatures for 
     * - the destruction txn (fully signed)
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
    async lock(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        // const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);
        const mpa_accept = (<MPA_ACCEPT>accept.action);
        const mpa_lock = (<MPA_LOCK>lock.action);

        // Get the right transaction library for the right currency.
        const lib = <CtRpc>this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        const rebuilt = (await this.accept(listing, bid, clone(accept)));
        // rebuild from accept message
        const bidtx: ConfidentialTransactionBuilder = rebuilt['_bidtx'];

        if (isArray(mpa_lock.buyer.payment.signatures)) {
            // add signatures to inputs
            const signature = mpa_lock.buyer.payment.signatures;
            mpa_bid.buyer.payment.prevouts.forEach((out, i) => bidtx.setWitness(out, signature[i]));
        } else {
            mpa_lock.buyer.payment.signatures = await lib.signRawTransactionForBlindInputs(bidtx, <BlindPrevout[]>mpa_bid.buyer.payment.prevouts);
        }

        lock['_bidtx'] = bidtx;
        lock['_rawbidtx'] = bidtx.build();


        /**
         * Destroy transaction from bid transaction.
         */
        const desttx: ConfidentialTransactionBuilder = rebuilt['_desttx'];

        let seller_output = (<ToBeBlindOutput>mpa_accept.seller.payment.outputs[0]);
        let buyer_output = (<ToBeBlindOutput>mpa_bid.buyer.payment.outputs[0]);
        seller_output._redeemScript = buildBidTxScript(buyer_output.address, seller_output.address, buyer_output.hashedSecret, 2880).redeemScript; // TODO: real param
        buyer_output._redeemScript = buildBidTxScript(seller_output.address, buyer_output.address, buyer_output.hashedSecret, 2880).redeemScript; // TODO: real param

        const destroy_inputs = this.getTxPrevoutsFromBidTx(bidtx, seller_output, buyer_output, 2880);
        if (!isArray(mpa_lock.buyer.payment.destroy.signatures)) {
            mpa_lock.buyer.payment.destroy.signatures = await lib.signRawTransactionForBlindInputs(desttx, destroy_inputs, buyer_output.address);
        }

        await desttx.puzzleDestroyWitness(destroy_inputs, mpa_accept.seller.payment.destroy.signatures, mpa_lock.buyer.payment.destroy.signatures);

        lock['_rawdesttx'] = desttx.build();


        if(rebuilt['_rawreleasetx']) {
            lock['_rawreleasetx'] = rebuilt['_rawreleasetx'];
        }

        if(rebuilt['_rawreleasetxunsigned']) {
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
    async complete(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> {

        const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);
        const mpa_accept = (<MPA_ACCEPT>accept.action);
        const mpa_lock = (<MPA_LOCK>lock.action);

        // Get the right transaction library for the right currency.
        const lib = <CtRpc>this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

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

    bid_calculateRequiredSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID, seller: boolean): number {
        const basePrice = this.bid_valueToTransferSatoshis(mpa_listing, mpa_bid);
        const percentageRatio = seller ? mpa_listing.item.payment.escrow.ratio.seller : mpa_listing.item.payment.escrow.ratio.buyer;
        const ratio = percentageRatio / 100;
        let required = seller ? 0 : basePrice;
        required += Math.trunc(ratio * basePrice);
        return required;
    }

    /**
     * The value to transfer from the buyer to the seller (basePrice + shippingPrice + additional prices)
     * @param mpa_listing 
     * @param mpa_bid 
     */
    bid_valueToTransferSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID): number {
        let satoshis: number = 0;
        const payment = mpa_listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === mpa_bid.buyer.payment.cryptocurrency);
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
    async release(listing: MPM, bid: MPM, accept: MPM): Promise<string> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);
        const mpa_accept = (<MPA_ACCEPT>accept.action);

        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.accept(listing, bid, clone(accept)));

        return rebuilt['_rawreleasetx'];
    }

    release_calculateRequiredSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID, seller: boolean, refund: boolean = false): number {
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

    async refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund: MPM): Promise<MPM> {

        const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);
        const mpa_accept = (<MPA_ACCEPT>accept.action);
        const mpa_lock = (<MPA_LOCK>lock.action);
        const mpa_refund = (<MPA_REFUND>refund.action);

        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency, true);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.accept(listing, bid, clone(accept)));
        const acceptTx = rebuilt['_tx'];
        // retrieve multisig prevout from lock tx.
        const lockTx: TransactionBuilder = acceptTx;
        console.log('(refund) rebuilt accept txid', lockTx.txid);

        let publicKeyToSignFor: string;
        if (isArray(mpa_refund.buyer.payment.signatures)) {
            publicKeyToSignFor = mpa_accept.seller.payment.pubKey;
        } else {
            publicKeyToSignFor = mpa_bid.buyer.payment.pubKey;
        }
        const multisigUtxo = lockTx.getMultisigUtxo(publicKeyToSignFor);

        const refundTx = new TransactionBuilder();
        refundTx.addMultisigInput(multisigUtxo, [
            mpa_bid.buyer.payment.pubKey,
            mpa_accept.seller.payment.pubKey
        ]);

        // Add the prevout for the buyer
        const buyer_address = mpa_bid.buyer.payment.changeAddress;
        const buyer_releaseSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, false, true);
        refundTx.newNormalPrevout(buyer_address, buyer_releaseSatoshis)

        const seller_address = mpa_accept.seller.payment.changeAddress;
        const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, true, true);
        const seller_fee = mpa_accept.seller.payment.fee;
        refundTx.newNormalPrevout(seller_address, seller_releaseSatoshis - seller_fee)

        if (isArray(mpa_refund.buyer.payment.signatures)) {
            // add signature of buyer
            refundTx.addSignature(multisigUtxo, mpa_refund.buyer.payment.signatures[0]);

            // sign for seller
            await lib.signRawTransactionForInputs(refundTx, [multisigUtxo]);
        } else {
            // sign for buyer
            mpa_refund.buyer.payment.signatures = await lib.signRawTransactionForInputs(refundTx, [multisigUtxo]);
        }

        refund['_rawtx'] = refundTx.build();

        return refund;
    }
}
