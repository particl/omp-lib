import { BidConfiguration } from "../interfaces/configs";
import { MPM } from "../interfaces/omp";

export interface IMultiSigBuilder {
    bid(listing: MPM, bid: MPM): Promise<MPM>
    accept(listing: MPM, bid: MPM, accept: MPM): Promise<MPM>
    lock(listing: MPM, bid: MPM, accept: MPM, lock: MPM, doNotSign?: boolean): Promise<MPM>
}

export interface ITransactionBuilder {

}