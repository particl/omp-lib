import { inject, injectable } from 'inversify';
import { TYPES } from '../types';

import { CryptoAddressType } from '../interfaces/crypto';
import { Rpc, ILibrary } from '../abstract/rpc';
import { IMultiSigBuilder } from '../abstract/transactions';

import { TransactionBuilder } from '../transaction-builder/transaction';
import { MPM, MPA, MPA_BID, MPA_LISTING_ADD, MPA_ACCEPT, MPA_LOCK, PaymentDataBid, PaymentDataAccept } from '../interfaces/omp';
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

        // Get the right transaction library for the right currency.
        const lib = this._libs(bid.buyer.payment.cryptocurrency);

        bid.buyer.payment.pubKey = await lib.getNewPubkey();
        bid.buyer.payment.changeAddress = {
            type: CryptoAddressType.NORMAL,
            address: await lib.getNewAddress()
        };

        const requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, false);
        bid.buyer.payment.prevouts = await lib.getNormalPrevouts(requiredSatoshis);

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

        // Get the right transaction library for the right currency.
        const lib = this._libs(bid.buyer.payment.cryptocurrency);

        if (!accept.seller.payment.pubKey || !accept.seller.payment.changeAddress) {
            accept.seller.payment.pubKey = await lib.getNewPubkey();
            accept.seller.payment.changeAddress = {
                type: CryptoAddressType.NORMAL,
                address: await lib.getNewAddress()
            };
        }


        const buyer_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, false);
        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(listing, bid, true);

        // Hardcoded fee
        const seller_fee = 500;
        if (!accept.seller.payment.fee) { // fee can never be 0 anyways
            accept.seller.payment.fee = seller_fee;
        }

        if (!isArray(accept.seller.payment.prevouts)) {
            // add chosen prevouts to cover amount (MPA_ACCEPT)
            accept.seller.payment.prevouts = await lib.getNormalPrevouts(seller_requiredSatoshis + seller_fee);
        }

        // prefetch amounts for inputs
        // makes sure the values are trusted.
        const buyer_inputs = await asyncMap(bid.buyer.payment.prevouts, async i => await lib.loadTrustedFieldsForUtxos(i));
        const seller_inputs = await asyncMap(accept.seller.payment.prevouts, async i => await lib.loadTrustedFieldsForUtxos(i));

        // add all inputs (TransactionBuilder)
        const bidtx: TransactionBuilder = new TransactionBuilder();
        bid.buyer.payment.prevouts.forEach((input) => bidtx.addInput(input));
        accept.seller.payment.prevouts.forEach((input) => bidtx.addInput(input));

        // calculate changes (TransactionBuilder)
        const buyer_change = bidtx.newChangeOutputFor(buyer_requiredSatoshis, bid.buyer.payment.changeAddress!, bid.buyer.payment.prevouts);
        const seller_change = bidtx.newChangeOutputFor(seller_requiredSatoshis + seller_fee, accept.seller.payment.changeAddress,
            accept.seller.payment.prevouts);

        // build the multisig output
        const multisig_requiredSatoshis = buyer_requiredSatoshis + seller_requiredSatoshis;
        // TODO(security): is safe number?

        const multisigOutput = bidtx.newMultisigOutput(
            multisig_requiredSatoshis,
            [
                bid.buyer.payment.pubKey!,
                accept.seller.payment.pubKey
            ]);

        // import the redeem script so the wallet is aware to watch on it
        // losing the pubkey makes the redeem script unrecoverable.
        // (always import the redeem script, doesn't matter)
        if (multisigOutput._redeemScript) {
            await lib.importRedeemScript(multisigOutput._redeemScript);
        }


        if (isArray(accept.seller.payment.signatures)) {
            // add signatures to inputs
            const signature = accept.seller.payment.signatures;
            accept.seller.payment.prevouts.forEach((out, i) => bidtx.addSignature(out, signature[i]));

        } else {
            accept.seller.payment.signatures = await lib.signRawTransactionForInputs(bidtx, seller_inputs);
        }

        accept['_bidtx'] = bidtx;
        accept['_rawbidtx'] = bidtx.build();


        // Release: build the release signatures for the seller!
        {
            const releaseTx = new TransactionBuilder();
            const multisigUtxo = bidtx.getMultisigUtxo(accept.seller.payment.pubKey);

            releaseTx.addMultisigInput(multisigUtxo, [
                bid.buyer.payment.pubKey!,
                accept.seller.payment.pubKey
            ]);

            // Add the prevout for the buyer
            const buyer_address = bid.buyer.payment.changeAddress!;
            const buyer_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, false);
            releaseTx.newNormalOutput(buyer_address, buyer_releaseSatoshis);

            const seller_address = accept.seller.payment.changeAddress;
            const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, true);
            releaseTx.newNormalOutput(seller_address, seller_releaseSatoshis - seller_fee);

            // Sign the transaction if required (seller), and add the sellers signatures
            if (!isObject(accept.seller.payment.release) || !isArray(accept.seller.payment.release.signatures)) {
                accept.seller.payment.release = {
                    signatures: []
                };

                accept.seller.payment.release.signatures = await lib.signRawTransactionForInputs(releaseTx, [multisigUtxo]);
            } else {
                releaseTx.addSignature(multisigUtxo, accept.seller.payment.release.signatures[0]);
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

        // Get the right transaction library for the right currency.
        const lib = this._libs(bid.buyer.payment.cryptocurrency);

        // rebuild from accept message
        const bidtx: TransactionBuilder = (await this.accept(listing, bid, clone(accept)))['_bidtx'];

        if (isArray(lock.buyer.payment.signatures)) {
            // add signatures to inputs
            const signature = lock.buyer.payment.signatures;
            bid.buyer.payment.prevouts.forEach((out, i) => bidtx.addSignature(out, signature[i]));
        } else {
            lock.buyer.payment.signatures = await lib.signRawTransactionForInputs(bidtx, bid.buyer.payment.prevouts);
        }

        lock['_bidtx'] = bidtx;
        lock['_rawbidtx'] = bidtx.build();


        // Refund: build the release signatures for the buyer!
        {
            const refundTx = new TransactionBuilder();
            const multisigUtxo = bidtx.getMultisigUtxo(bid.buyer.payment.pubKey!);

            refundTx.addMultisigInput(multisigUtxo, [
                bid.buyer.payment.pubKey!,
                accept.seller.payment.pubKey!
            ]);

            // Add the prevout for the buyer
            const buyer_address = bid.buyer.payment.changeAddress!;
            const buyer_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, false, true);
            refundTx.newNormalOutput(buyer_address, buyer_releaseSatoshis);

            const seller_address = accept.seller.payment.changeAddress!;
            const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(listing, bid, true, true);
            const seller_fee = accept.seller.payment.fee;
            refundTx.newNormalOutput(seller_address, seller_releaseSatoshis - seller_fee);

            // Sign the transaction if required (seller), and add the sellers signatures
            if (!isObject(lock.buyer.payment.refund) || !isArray(lock.buyer.payment.refund.signatures)) {
                lock.buyer.payment.refund = {
                    signatures: []
                };

                lock.buyer.payment.refund.signatures = await lib.signRawTransactionForInputs(refundTx, [multisigUtxo]);
            } else {
                refundTx.addSignature(multisigUtxo, lock.buyer.payment.refund.signatures[0]);
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

        // Get the right transaction library for the right currency.
        const lib = this._libs(bid.buyer.payment.cryptocurrency);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.accept(listing, bid, clone(accept)));
        const bidTx: TransactionBuilder = rebuilt['_bidtx'];
        const releaseTx: TransactionBuilder = rebuilt['_releasetx'];

        // sign for buyer
        const multisigUtxo = bidTx.getMultisigUtxo(bid.buyer.payment.pubKey!);
        await lib.signRawTransactionForInputs(releaseTx, [multisigUtxo]);

        return releaseTx.build();
    }

    public release_calculateRequiredSatoshis(listing: MPA_LISTING_ADD, bid: MPA_BID, seller: boolean, refund: boolean = false): number {

        if (!listing.item.payment.escrow) {
            throw new Error('No escrow configuration provided!')
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
        // Get the right transaction library for the right currency.
        const lib = this._libs(bid.buyer.payment.cryptocurrency);

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
