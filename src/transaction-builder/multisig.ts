import { inject, injectable } from "inversify";
import { TYPES } from "../types";

import { CryptoAddressType } from "../interfaces/crypto";
import { BidConfiguration } from "../interfaces/configs";
import { Rpc, ILibrary } from "../abstract/rpc";
import { IMultiSigBuilder } from "../abstract/transactions";

import { TransactionBuilder } from "../../test/transaction";
import { MPM, MPA_BID, MPA_EXT_LISTING_ADD, MPA_ACCEPT, MPA_LOCK } from "../interfaces/omp";
import { asyncForEach, asyncMap } from "../util";

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
    async bid(listing: MPM, bid: MPM): Promise<MPM> {
        const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);

        // Get the right transaction library for the right currency.
        const cryptocurrency = mpa_bid.buyer.payment.cryptocurrency;
        const lib = this._libs(cryptocurrency);
        
        mpa_bid.buyer.payment.pubKey = await lib.getNewPubkey();
        mpa_bid.buyer.payment.changeAddress = {
            type: CryptoAddressType.NORMAL,
            address: await lib.getNewAddress()
        };

        const requiredSatoshis: number = this.buyer_bid_calculateRequiredAmount(mpa_listing, mpa_bid);

       // TODO: escrow!

        mpa_bid.buyer.payment.outputs = await lib.getNormalOutputs(requiredSatoshis);

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
    async accept(listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(fee): substract fee from seller
        // TODO(security): safe numbers?

        const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);
        const mpa_accept = (<MPA_ACCEPT>accept.action);

        // Get the right transaction library for the right currency.
        const cryptocurrency = mpa_bid.buyer.payment.cryptocurrency;
        const lib = this._libs(cryptocurrency);
        
        mpa_accept.seller.payment.pubKey = await lib.getNewPubkey();
        mpa_accept.seller.payment.changeAddress = {
            type: CryptoAddressType.NORMAL,
            address: await lib.getNewAddress()
        };

        // TODO: escrow!
        // calculate required amounts
        const buyer_requiredSatoshis: number = this.buyer_bid_calculateRequiredAmount(mpa_listing, mpa_bid);
        const seller_requiredSatoshis: number = this.seller_bid_calculateRequiredAmount(mpa_listing, mpa_bid);

        // Hardcoded fee
        const seller_fee = 365;
        mpa_accept.seller.payment.fee = seller_fee;

        // add chosen outputs to cover amount (MPA_ACCEPT)
        mpa_accept.seller.payment.outputs = await lib.getNormalOutputs(seller_requiredSatoshis + seller_fee);

        // prefetch amounts for inputs
        // makes sure the values are trusted.
        const buyer_inputs = await asyncMap(mpa_bid.buyer.payment.outputs, async i => await lib.getSatoshisForUtxo(i));
        const seller_inputs = await asyncMap(mpa_accept.seller.payment.outputs, async i => await lib.getSatoshisForUtxo(i));

        // add all inputs (TransactionBuilder)
        const tx: TransactionBuilder = new TransactionBuilder();
        mpa_bid.buyer.payment.outputs.forEach((input) => tx.addInput(input));
        mpa_accept.seller.payment.outputs.forEach((input) => tx.addInput(input));

        // calculate changes (TransactionBuilder)
        const buyer_change = await tx.newChangeOutputFor(buyer_requiredSatoshis, mpa_bid.buyer.payment.changeAddress ,mpa_bid.buyer.payment.outputs);
        const seller_change = await tx.newChangeOutputFor(seller_requiredSatoshis + seller_fee, mpa_accept.seller.payment.changeAddress ,mpa_accept.seller.payment.outputs);
 
        // build the multisig output
        const multisig_requiredSatoshis = buyer_requiredSatoshis + seller_requiredSatoshis;
        // TODO(security): is safe number?

        const multisig_output = await tx.newMultisigOutput(
            multisig_requiredSatoshis,
            [
                mpa_bid.buyer.payment.pubKey,
                mpa_accept.seller.payment.pubKey
            ]);
        
        // import the redeem script so the wallet is aware to watch on it
        // losing the pubkey makes the redeem script unrecoverable.
        await lib.importRedeemScript(multisig_output._redeemScript);


        // build transaction, estimate fee
        //console.log(await tx.build());
        // reduce change output with fee

        mpa_accept.seller.payment.signatures = await lib.signRawTransactionForInputs(tx, seller_inputs);

        accept['_rawtx'] = await tx.build();

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
    async lock(listing: MPM, bid: MPM, accept: MPM, lock: MPM, doNotSign?: boolean): Promise<MPM> {
        // TODO(security): strip the bid, to make sure buyer hasn't add _satoshis.
        // TODO(fee): substract fee from seller
        // TODO(security): safe numbers?

        const mpa_listing = (<MPA_EXT_LISTING_ADD>listing.action);
        const mpa_bid = (<MPA_BID>bid.action);
        const mpa_accept = (<MPA_ACCEPT>accept.action);
        const mpa_lock = (<MPA_LOCK>lock.action);


        // Get the right transaction library for the right currency.
        const cryptocurrency = mpa_bid.buyer.payment.cryptocurrency;
        const lib = this._libs(cryptocurrency);
        
        // TODO: escrow!
        // calculate required amounts
        const buyer_requiredSatoshis: number = this.buyer_bid_calculateRequiredAmount(mpa_listing, mpa_bid);
        const seller_requiredSatoshis: number = this.seller_bid_calculateRequiredAmount(mpa_listing, mpa_bid);

        const seller_fee = mpa_accept.seller.payment.fee;

        // prefetch amounts for inputs
        // makes sure the values are trusted.
        const buyer_inputs = await asyncMap(mpa_bid.buyer.payment.outputs, async i => await lib.getSatoshisForUtxo(i));
        const seller_inputs = await asyncMap(mpa_accept.seller.payment.outputs, async i => await lib.getSatoshisForUtxo(i));

        // add signatures to inputs
        mpa_accept.seller.payment.signatures.forEach((v, i) => seller_inputs[i]._signature = v);

        // add all inputs (TransactionBuilder)
        const tx: TransactionBuilder = new TransactionBuilder();
        mpa_bid.buyer.payment.outputs.forEach((input) => tx.addInput(input));
        mpa_accept.seller.payment.outputs.forEach((input) => tx.addInput(input));

        // calculate changes (TransactionBuilder)
        const buyer_change = await tx.newChangeOutputFor(buyer_requiredSatoshis, mpa_bid.buyer.payment.changeAddress ,mpa_bid.buyer.payment.outputs);
        const seller_change = await tx.newChangeOutputFor(seller_requiredSatoshis + seller_fee, mpa_accept.seller.payment.changeAddress ,mpa_accept.seller.payment.outputs);

        // build the multisig output
        const multisig_requiredSatoshis = buyer_requiredSatoshis + seller_requiredSatoshis;
        // TODO(security): is safe number?

        const multisig_output = await tx.newMultisigOutput(
            multisig_requiredSatoshis,
            [
                mpa_bid.buyer.payment.pubKey,
                mpa_accept.seller.payment.pubKey
            ]);
        
        // import the redeem script so the wallet is aware to watch on it
        // losing the pubkey makes the redeem script unrecoverable.
        await lib.importRedeemScript(multisig_output._redeemScript);

        if(!doNotSign) {
            mpa_lock.buyer.payment.signatures = await lib.signRawTransactionForInputs(tx, buyer_inputs);
        }

        lock['_rawtx'] = await tx.build();

        return lock;
    }

    buyer_bid_calculateRequiredAmount(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID): number {
        let satoshis: number = 0;
        const crypto = mpa_listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === mpa_bid.buyer.payment.cryptocurrency);
        satoshis += crypto.basePrice;

        if(mpa_listing.item.information.location && crypto.shippingPrice) {
            if(mpa_bid.buyer.shippingAddress.country === mpa_listing.item.information.location.country) {
                satoshis += crypto.shippingPrice.domestic;
            } else {
                satoshis += crypto.shippingPrice.international;
            }
        }

        // TODO: insurance deposits
        // can be tricky with the 3% * 5 = 5 / 33,333 ...
        return satoshis;
    }

    seller_bid_calculateRequiredAmount(mpa_listing: MPA_EXT_LISTING_ADD, mpa_bid: MPA_BID): number {

        let satoshis: number = 0;
        const payment = mpa_listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === mpa_bid.buyer.payment.cryptocurrency);
        satoshis = payment.basePrice;

        // TODO: insurance deposits
        return satoshis;
    }
}
