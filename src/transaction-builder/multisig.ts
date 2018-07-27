import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import * as bitcore  from 'particl-bitcore-lib';

import { CryptoAddressType } from "../interfaces/crypto";
import { BidConfiguration } from "../interfaces/configs";
import { Rpc, ILibrary } from "../abstract/rpc";
import { IMultiSigBuilder } from "../abstract/transactions";

import { TransactionBuilder } from "./transaction";
import { MPM, MPA_BID, MPA_EXT_LISTING_ADD, MPA_ACCEPT } from "../interfaces/omp";

@injectable()
export class MultiSigBuilder extends TransactionBuilder implements IMultiSigBuilder {

    private _libs: ILibrary;

    constructor(
        @inject(TYPES.Library) libs: ILibrary
    ) {
        super();
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

        const requiredSats: number = this.calculateRequiredAmount(mpa_listing, mpa_bid);

       // TODO: escrow!

        mpa_bid.buyer.payment.outputs = await lib.getNormalOutputs(requiredSats);

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

        const payment = mpa_listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === mpa_bid.buyer.payment.cryptocurrency);
        const requiredSats: number = payment.basePrice;

        // TODO: escrow!

        mpa_accept.seller.payment.outputs = await lib.getNormalOutputs(requiredSats);

        // add all inputs
        mpa_bid.buyer.payment.outputs.forEach((input) => this.addInput(input));
        mpa_accept.seller.payment.outputs.forEach((input) => this.addInput(input));

        // create a p2sh multisig output
        let publicKeys = [
            mpa_bid.buyer.payment.pubKey,
            mpa_accept.seller.payment.pubKey
          ].sort().map(pk => new bitcore.PublicKey(pk));

        const redeemScript = bitcore.Script.buildMultisigOut(publicKeys, 2);
        const script = redeemScript.toScriptHashOut();

        console.log('--- mpa_accept script ----');
        console.log(script.toString());

        return accept;
    }

    calculateRequiredAmount(listing: MPA_EXT_LISTING_ADD, bid: MPA_BID): number {
        let satoshis: number = 0;
        const crypto = listing.item.payment.cryptocurrency.find((crypto) => crypto.currency === bid.buyer.payment.cryptocurrency);
        satoshis += crypto.basePrice;

        if(listing.item.information.location && crypto.shippingPrice) {
            if(bid.buyer.shippingAddress.country === listing.item.information.location.country) {
                satoshis += crypto.shippingPrice.domestic;
            } else {
                satoshis += crypto.shippingPrice.international;
            }
        }

        // TODO: insurance deposits
        // can be tricky with the 3% * 5 = 5 / 33,333 ...
        return satoshis;
    }
}
