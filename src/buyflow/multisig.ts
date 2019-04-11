import { inject, injectable } from 'inversify';
import { TYPES } from '../types';

import { CryptoAddressType } from '../interfaces/crypto';
import { Rpc, ILibrary } from '../abstract/rpc';
import { IMultiSigBuilder } from '../abstract/transactions';

import { TransactionBuilder } from '../transaction-builder/transaction';
import {
    MPM,
    MPA,
    MPA_BID,
    MPA_LISTING_ADD,
    MPA_ACCEPT,
    MPA_LOCK,
    PaymentDataBidMultisig, PaymentDataAcceptMultisig, PaymentDataLockMultisig
} from '../interfaces/omp';
import { asyncMap, clone, isArray, isObject } from '../util';

@injectable()
export class MultiSigBuilder implements IMultiSigBuilder {

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
    public async bid(listing: MPA_LISTING_ADD, bid: MPA_BID): Promise<MPA_BID> {

        const bidPaymentData = bid.buyer.payment as PaymentDataBidMultisig;

        // Get the right transaction library for the right currency.
        const lib = this._libs(bidPaymentData.cryptocurrency);

        bidPaymentData.pubKey = await lib.getNewPubkey();
        bidPaymentData.changeAddress = {
            type: CryptoAddressType.NORMAL,
            address: await lib.getNewAddress()
        };

        const requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, false);
        bidPaymentData.prevouts = await lib.getNormalPrevouts(requiredSatoshis);

        return bid;
    }

    /**
     * Add the payment information for the MPA_ACCEPT.
     * The cryptocurrency to be used is extracted from the bid.
     * The right library for that currency is then retrieved and used.
     *
     * Adds:
     *  pubKey, changeAddress & inputs.
     *
     * @param listing the marketplace listig action, used to retrieve the payment amounts.
     * @param bid the marketplace bid action that contains the lock, release and destroy signatures.
     * @param accept the marketplace accept action to add the transaction details to
     */
    public async accept(listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT): Promise<MPA_ACCEPT> {

        const bidPaymentData = bid.buyer.payment as PaymentDataBidMultisig;
        const acceptPaymentData = accept.seller.payment as PaymentDataAcceptMultisig;

        // Get the right transaction library for the right currency.
        const lib = this._libs(bidPaymentData.cryptocurrency);

        if (!acceptPaymentData.pubKey || !acceptPaymentData.changeAddress) {
            acceptPaymentData.pubKey = await lib.getNewPubkey();
            acceptPaymentData.changeAddress = {
                type: CryptoAddressType.NORMAL,
                address: await lib.getNewAddress()
            };
        }


        const buyer_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, false);
        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, true);

        // Hardcoded fee
        const seller_fee = 500;
        if (!acceptPaymentData.fee) { // fee can never be 0 anyways
            acceptPaymentData.fee = seller_fee;
        }

        if (!isArray(acceptPaymentData.prevouts)) {
            // add chosen prevouts to cover amount (MPA_ACCEPT)
            acceptPaymentData.prevouts = await lib.getNormalPrevouts(seller_requiredSatoshis + seller_fee);
        }

        // prefetch amounts for inputs
        // makes sure the values are trusted.
        const buyer_inputs = await asyncMap(bidPaymentData.prevouts, async i => await lib.loadTrustedFieldsForUtxos(i));
        const seller_inputs = await asyncMap(acceptPaymentData.prevouts, async i => await lib.loadTrustedFieldsForUtxos(i));

        // add all inputs (TransactionBuilder)
        const bidtx: TransactionBuilder = new TransactionBuilder();
        bidPaymentData.prevouts.forEach((input) => bidtx.addInput(input));
        acceptPaymentData.prevouts.forEach((input) => bidtx.addInput(input));

        // calculate changes (TransactionBuilder)
        const buyer_change = bidtx.newChangeOutputFor(buyer_requiredSatoshis, bidPaymentData.changeAddress!, bidPaymentData.prevouts);
        const seller_change = bidtx.newChangeOutputFor(seller_requiredSatoshis + seller_fee, acceptPaymentData.changeAddress,
            acceptPaymentData.prevouts);

        // build the multisig output
        const multisig_requiredSatoshis = buyer_requiredSatoshis + seller_requiredSatoshis;
        // TODO(security): is safe number?

        const multisigOutput = bidtx.newMultisigOutput(
            multisig_requiredSatoshis,
            [
                bidPaymentData.pubKey!,
                acceptPaymentData.pubKey
            ]);

        // import the redeem script so the wallet is aware to watch on it
        // losing the pubkey makes the redeem script unrecoverable.
        // (always import the redeem script, doesn't matter)
        if (multisigOutput._redeemScript) {
            await lib.importRedeemScript(multisigOutput._redeemScript);
        }


        if (isArray(acceptPaymentData.signatures)) {
            // add signatures to inputs
            const signature = acceptPaymentData.signatures;
            acceptPaymentData.prevouts.forEach((out, i) => bidtx.addSignature(out, signature[i]));

        } else {
            acceptPaymentData.signatures = await lib.signRawTransactionForInputs(bidtx, seller_inputs);
        }

        accept['_bidtx'] = bidtx;
        accept['_rawbidtx'] = bidtx.build();


        // Release: build the release signatures for the seller!
        {
            const releaseTx = new TransactionBuilder();
            const multisigUtxo = bidtx.getMultisigUtxo(acceptPaymentData.pubKey);

            releaseTx.addMultisigInput(multisigUtxo, [
                bidPaymentData.pubKey!,
                acceptPaymentData.pubKey
            ]);

            // Add the prevout for the buyer
            const buyer_address = bidPaymentData.changeAddress!;
            const buyer_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, false);
            releaseTx.newNormalOutput(buyer_address, buyer_releaseSatoshis);

            const seller_address = acceptPaymentData.changeAddress;
            const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, true);
            releaseTx.newNormalOutput(seller_address, seller_releaseSatoshis - seller_fee);

            // Sign the transaction if required (seller), and add the sellers signatures
            if (!isObject(acceptPaymentData.release) || !isArray(acceptPaymentData.release.signatures)) {
                acceptPaymentData.release = {
                    signatures: []
                };

                acceptPaymentData.release.signatures = await lib.signRawTransactionForInputs(releaseTx, [multisigUtxo]);
            } else {
                releaseTx.addSignature(multisigUtxo, acceptPaymentData.release.signatures[0]);
            }

            accept['_releasetx'] = releaseTx;
        }

        return accept;
    }

    /**
     * Add the payment information for the MPA_ACCEPT.
     * The cryptocurrency to be used is extracted from the bid.
     * The right library for that currency is then retrieved and used.
     *
     * Adds:
     *  pubKey, changeAddress & inputs.
     *
     * @param listing the marketplace mostong message, used to retrieve the payment amounts.
     * @param bid the marketplace bid message to add the transaction details to.
     */
    public async lock(listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT, lock: MPA_LOCK): Promise<MPA_LOCK> {

        // TODO(security): safe numbers?
        const bidPaymentData = bid.buyer.payment as PaymentDataBidMultisig;
        const acceptPaymentData = accept.seller.payment as PaymentDataAcceptMultisig;
        const lockPaymentData = lock.buyer.payment as PaymentDataLockMultisig;

        // Get the right transaction library for the right currency.
        const lib = this._libs(bidPaymentData.cryptocurrency);

        // rebuild from accept message
        const bidtx: TransactionBuilder = (await this.accept(listing, bid, clone(accept)))['_bidtx'];

        if (isArray(lockPaymentData.signatures)) {
            // add signatures to inputs
            const signature = lockPaymentData.signatures;
            bidPaymentData.prevouts.forEach((out, i) => bidtx.addSignature(out, signature[i]));
        } else {
            lockPaymentData.signatures = await lib.signRawTransactionForInputs(bidtx, bidPaymentData.prevouts);
        }

        lock['_bidtx'] = bidtx;
        lock['_rawbidtx'] = bidtx.build();


        // Refund: build the release signatures for the buyer!
        {
            const refundTx = new TransactionBuilder();
            const multisigUtxo = bidtx.getMultisigUtxo(bidPaymentData.pubKey!);

            refundTx.addMultisigInput(multisigUtxo, [
                bidPaymentData.pubKey!,
                accept.seller.payment.pubKey!
            ]);

            // Add the prevout for the buyer
            const buyer_address = bidPaymentData.changeAddress!;
            const buyer_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, false, true);
            refundTx.newNormalOutput(buyer_address, buyer_releaseSatoshis);

            const seller_address = accept.seller.payment.changeAddress!;
            const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, true, true);
            const seller_fee = accept.seller.payment.fee;
            refundTx.newNormalOutput(seller_address, seller_releaseSatoshis - seller_fee);

            // Sign the transaction if required (seller), and add the sellers signatures
            if (!isObject(lockPaymentData.refund) || !isArray(lockPaymentData.refund.signatures)) {
                lockPaymentData.refund = {
                    signatures: []
                };

                lockPaymentData.refund.signatures = await lib.signRawTransactionForInputs(refundTx, [multisigUtxo]);
            } else {
                refundTx.addSignature(multisigUtxo, lockPaymentData.refund.signatures[0]);
            }

            lock['_refundtx'] = refundTx;
        }

        return lock;
    }

    public bid_calculateRequiredSatoshis(listing: MPA_LISTING_ADD, bid: MPA_BID, seller: boolean): number {
        const basePrice = this.bid_valueToTransferSatoshis(listing, bid);
        const percentageRatio = seller ? listing.item.payment.escrow!.ratio.seller : listing.item.payment.escrow!.ratio.buyer;
        const ratio = percentageRatio / 100;
        let required = seller ? 0 : basePrice;
        required += Math.trunc(ratio * basePrice);
        return required;
    }

    /**
     * The value to transfer from the buyer to the seller (basePrice + shippingPrice + additional prices)
     * @param listing
     * @param bid
     */
    public bid_valueToTransferSatoshis(listing: MPA_LISTING_ADD, bid: MPA_BID): number {
        const payment = listing.item.payment.options!.find((crypto) => crypto.currency === bid.buyer.payment.cryptocurrency);

        if (payment) {
            let satoshis = payment.basePrice;

            if (listing.item.information.location && payment.shippingPrice) {
                if (bid.buyer.shippingAddress!.country === listing.item.information.location.country) {
                    satoshis += payment.shippingPrice.domestic;
                } else {
                    satoshis += payment.shippingPrice.international;
                }
            }
            return satoshis;
        } else {
            throw new Error('Requested payment cryptocurrency not found.');
        }
    }

    /**
     * Creates a fully signed release transaction when called by the buyer.
     * Returns the rawtx in hex.
     * @param listing the listing action for which a bid was created
     * @param bid the bid action for which we're refunding
     * @param accept the accept action for that bid message
     */
    public async release(listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT): Promise<string> {

        const bidPaymentData = bid.buyer.payment as PaymentDataBidMultisig;

        // Get the right transaction library for the right currency.
        const lib = this._libs(bidPaymentData.cryptocurrency);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.accept(listing, bid, clone(accept)));
        const bidTx: TransactionBuilder = rebuilt['_bidtx'];
        const releaseTx: TransactionBuilder = rebuilt['_releasetx'];

        // sign for buyer
        const multisigUtxo = bidTx.getMultisigUtxo(bidPaymentData.pubKey!);
        await lib.signRawTransactionForInputs(releaseTx, [multisigUtxo]);

        return releaseTx.build();
    }

    public release_calculateRequiredSatoshis(listing: MPA_LISTING_ADD, bid: MPA_BID, seller: boolean, refund: boolean = false): number {

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
     * Creates a fully signed refund transaction when called by the seller.
     * Returns the rawtx in hex.
     * @param listing the listing action for which a bid was created
     * @param bid the bid action for which we're refunding
     * @param accept the accept action for the bid action
     */
    public async refund(listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT, lock: MPA_LOCK): Promise<string> {

        const bidPaymentData = bid.buyer.payment as PaymentDataBidMultisig;

        // Get the right transaction library for the right currency.
        const lib = this._libs(bidPaymentData.cryptocurrency);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.lock(listing, bid, accept, clone(lock)));
        const bidTx: TransactionBuilder = rebuilt['_bidtx'];
        const refundTx: TransactionBuilder = rebuilt['_refundtx'];

        // sign for seller
        const multisigUtxo = bidTx.getMultisigUtxo(accept.seller.payment.pubKey!);
        await lib.signRawTransactionForInputs(refundTx, [multisigUtxo]);

        return refundTx.build();
    }
}
