import { BidConfiguration } from "../interfaces/configs";
import { MPM } from "../interfaces/omp";

export interface IMultiSigBuilder {
    bid(listing: MPM, bid: MPM): Promise<MPM>
    accept(listing: MPM, bid: MPM, accept: MPM): Promise<MPM>
    release(listing: MPM, bid: MPM, accept: MPM, release: MPM): Promise<MPM>
    lock(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<MPM>
    refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund: MPM): Promise<MPM>
}

export interface IMadCTBuilder {
    bid(listing: MPM, bid: MPM): Promise<MPM>
    accept(listing: MPM, bid: MPM, accept: MPM): Promise<MPM>
    lock(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<MPM>
    complete(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> // rawtx
    release(listing: MPM, bid: MPM, accept: MPM): Promise<string>
    /*
    refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund: MPM): Promise<MPM>
    */
}

export interface ITransactionBuilder {

}