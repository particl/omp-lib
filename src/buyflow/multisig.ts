import { inject, injectable } from 'inversify';
import { TYPES } from '../types';

import { CryptoAddressType } from '../interfaces/crypto';
import { Rpc, ILibrary } from '../abstract/rpc';
import { IMultiSigBuilder } from '../abstract/transactions';

import { TransactionBuilder, getTxidFrom } from '../transaction-builder/transaction';
import { MPM, MPA_BID, MPA_EXT_LISTING_ADD, MPA_ACCEPT, MPA_LOCK, MPA_RELEASE, MPA_REFUND } from '../interfaces/omp';
import { asyncForEach, asyncMap, clone, isArray } from '../util';

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
    public async bid(listing: MPM, bid: MPM): Promise<MPM> {
        const mpa_listing = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid = (<MPA_BID> bid.action);

        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency);

        mpa_bid.buyer.payment.pubKey = await lib.getNewPubkey();
        mpa_bid.buyer.payment.changeAddress = {
            type: CryptoAddressType.NORMAL,
            address: await lib.getNewAddress()
        };

        const requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);

        // TODO: escrow!

        mpa_bid.buyer.payment.prevouts = await lib.getNormalPrevouts(requiredSatoshis);

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
     * @param listing the marketplace mostong message, used to retrieve the payment amounts.
     * @param bid the marketplace bid message to add the transaction details to.
     */
    public async accept(listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        const mpa_listing = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        const mpa_accept = (<MPA_ACCEPT> accept.action);

        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency);

        if (!mpa_accept.seller.payment.pubKey || !mpa_accept.seller.payment.changeAddress) {
            mpa_accept.seller.payment.pubKey = await lib.getNewPubkey();
            mpa_accept.seller.payment.changeAddress = {
                type: CryptoAddressType.NORMAL,
                address: await lib.getNewAddress()
            };
        }


        const buyer_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);
        const seller_requiredSatoshis: number = this.bid_calculateRequiredSatoshis(mpa_listing, mpa_bid, true);

        // Hardcoded fee
        const seller_fee = 500;
        if (!mpa_accept.seller.payment.fee) { // fee can never be 0 anyways
            mpa_accept.seller.payment.fee = seller_fee;
        }

        if (!isArray(mpa_accept.seller.payment.prevouts)) {
            // add chosen prevouts to cover amount (MPA_ACCEPT)
            mpa_accept.seller.payment.prevouts = await lib.getNormalPrevouts(seller_requiredSatoshis + seller_fee);
        }

        // prefetch amounts for inputs
        // makes sure the values are trusted.
        const buyer_inputs = await asyncMap(mpa_bid.buyer.payment.prevouts, async i => await lib.getSatoshisForUtxo(i));
        const seller_inputs = await asyncMap(mpa_accept.seller.payment.prevouts, async i => await lib.getSatoshisForUtxo(i));

        // add all inputs (TransactionBuilder)
        const tx: TransactionBuilder = new TransactionBuilder();
        mpa_bid.buyer.payment.prevouts.forEach((input) => tx.addInput(input));
        mpa_accept.seller.payment.prevouts.forEach((input) => tx.addInput(input));

        // calculate changes (TransactionBuilder)
        const buyer_change = tx.newChangeOutputFor(buyer_requiredSatoshis, mpa_bid.buyer.payment.changeAddress, mpa_bid.buyer.payment.prevouts);
        const seller_change = tx.newChangeOutputFor(seller_requiredSatoshis + seller_fee, mpa_accept.seller.payment.changeAddress,
            mpa_accept.seller.payment.prevouts);

        // build the multisig prevout
        const multisig_requiredSatoshis = buyer_requiredSatoshis + seller_requiredSatoshis;
        // TODO(security): is safe number?

        const multisig_prevout = tx.newMultisigPrevout(
            multisig_requiredSatoshis,
            [
                mpa_bid.buyer.payment.pubKey,
                mpa_accept.seller.payment.pubKey
            ]);

        // import the redeem script so the wallet is aware to watch on it
        // losing the pubkey makes the redeem script unrecoverable.
        // (always import the redeem script, doesn't matter)
        await lib.importRedeemScript(multisig_prevout._redeemScript);

        if (isArray(mpa_accept.seller.payment.signatures)) {
            // add signatures to inputs
            const signature = mpa_accept.seller.payment.signatures;
            mpa_accept.seller.payment.prevouts.forEach((out, i) => tx.addSignature(out, signature[i]));

        } else {
            mpa_accept.seller.payment.signatures = await lib.signRawTransactionForInputs(tx, seller_inputs);
        }

        accept['_tx'] = tx;
        accept['_rawtx'] = tx.build();

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
    public async lock(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        // const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        // const mpa_accept = (<MPA_ACCEPT>accept.action);
        const mpa_lock = (<MPA_LOCK> lock.action);


        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency);

        // rebuild from accept message
        const bidtx: TransactionBuilder = (await this.accept(listing, bid, clone(accept)))['_bidtx'];

        if (isArray(mpa_lock.buyer.payment.signatures)) {
            // add signatures to inputs
            const signature = mpa_lock.buyer.payment.signatures;
            mpa_bid.buyer.payment.prevouts.forEach((out, i) => bidtx.addSignature(out, signature[i]));
        } else {
            mpa_lock.buyer.payment.signatures = await lib.signRawTransactionForInputs(bidtx, mpa_bid.buyer.payment.prevouts);
        }

        lock['_rawbidtx'] = bidtx.build();

        return lock;
    }

    public bid_calculateRequiredSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID, seller: boolean): number {
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
    public bid_valueToTransferSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID): number {
        const payment = mpa_listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === mpa_bid.buyer.payment.cryptocurrency);

        if (payment) {
            let satoshis = payment.basePrice;

            if (mpa_listing.item.information.location && payment.shippingPrice) {
                if (mpa_bid.buyer.shippingAddress.country === mpa_listing.item.information.location.country) {
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
     * Add the payment information for the MPA_RELEASE.
     * Performs two steps: both for buyer and seller.
     *
     * Adds:
     *  signature of seller.
     *
     *  if seller.signatures is present, it will complete the transaction
     *  and return a fully signed under _rawtx
     */
    public async release(listing: MPM, bid: MPM, accept: MPM, release: MPM): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(security): safe numbers?

        const mpa_listing = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        const mpa_accept = (<MPA_ACCEPT> accept.action);
        const mpa_release = (<MPA_RELEASE> release.action);

        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency);

        // regenerate the transaction (from the messages)
        const rebuilt = (await this.accept(listing, bid, clone(accept)));
        const acceptRawTx = rebuilt['_rawtx'];
        const acceptTx = rebuilt['_tx'];

        release['_rawtx_accept'] = acceptRawTx;

        // retrieve multisig prevout from lock tx.
        const lockTx: TransactionBuilder = acceptTx;
        console.log('(release) rebuilt accept txid', lockTx.txid);

        let publicKeyToSignFor: string;
        if (isArray(mpa_release.seller.payment.signatures)) {
            publicKeyToSignFor = mpa_bid.buyer.payment.pubKey;
        } else {
            publicKeyToSignFor = mpa_accept.seller.payment.pubKey;
        }
        const multisigUtxo = lockTx.getMultisigUtxo(publicKeyToSignFor);

        const releaseTx = new TransactionBuilder();
        releaseTx.addMultisigInput(multisigUtxo, [
            mpa_bid.buyer.payment.pubKey,
            mpa_accept.seller.payment.pubKey
        ]);

        // Add the prevout for the buyer
        const buyer_address = mpa_bid.buyer.payment.changeAddress;
        const buyer_releaseSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, false);
        releaseTx.newNormalOutput(buyer_address, buyer_releaseSatoshis);

        const seller_address = mpa_accept.seller.payment.changeAddress;
        const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, true);
        const seller_fee = mpa_accept.seller.payment.fee;
        releaseTx.newNormalOutput(seller_address, seller_releaseSatoshis - seller_fee);

        if (isArray(mpa_release.seller.payment.signatures)) {
            // add signature of seller
            releaseTx.addSignature(multisigUtxo, mpa_release.seller.payment.signatures[0]);

            // sign for buyer
            await lib.signRawTransactionForInputs(releaseTx, [multisigUtxo]);
        } else {
            // sign for seller
            mpa_release.seller.payment.signatures = await lib.signRawTransactionForInputs(releaseTx, [multisigUtxo]);
        }

        release['_rawtx'] = releaseTx.build();
        return release;
    }

    public release_calculateRequiredSatoshis(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID, seller: boolean, refund: boolean = false): number {
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

    public async refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund: MPM): Promise<MPM> {

        const mpa_listing = (<MPA_EXT_LISTING_ADD> listing.action);
        const mpa_bid = (<MPA_BID> bid.action);
        const mpa_accept = (<MPA_ACCEPT> accept.action);
        const mpa_lock = (<MPA_LOCK> lock.action);
        const mpa_refund = (<MPA_REFUND> refund.action);

        // Get the right transaction library for the right currency.
        const lib = this._libs(mpa_bid.buyer.payment.cryptocurrency);

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
        refundTx.newNormalPrevout(buyer_address, buyer_releaseSatoshis);

        const seller_address = mpa_accept.seller.payment.changeAddress;
        const seller_releaseSatoshis = this.release_calculateRequiredSatoshis(mpa_listing, mpa_bid, true, true);
        const seller_fee = mpa_accept.seller.payment.fee;
        refundTx.newNormalPrevout(seller_address, seller_releaseSatoshis - seller_fee);

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
