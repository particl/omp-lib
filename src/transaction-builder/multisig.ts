import { TransactionBuilder } from "./transaction";
import { OpenMarketProtocol } from "../omp";
import { MPM, MPA_BID } from "../interfaces/omp";


export class MultiSigBuilder extends TransactionBuilder {

    constructor() {
        super();
    }

    /**
     * Add the payment information for the MPA_BID.
     * The cryptocurrency to be used is extracted from the bid.
     * The right library for that currency is then loaded and used.
     * 
     * Adds:
     *  pubKey, changeAddress & inputs.
     * 
     * @param bid the marketplace bid message to add the transaction details to.
     */
    async initiate(bid: MPM): Promise<MPM> {
        const cryptocurrency = (<MPA_BID>bid.action).buyer.payment.cryptocurrency;

        const lib = OpenMarketProtocol.TxLibs[cryptocurrency];
        lib.call('');

        return bid;
    }
}
