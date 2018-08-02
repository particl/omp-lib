import { BidConfiguration } from "../interfaces/configs";
import { MPM } from "../interfaces/omp";

export interface IBid {
    bid(config: BidConfiguration, listing: MPM): Promise<MPM>;
    accept(listing: MPM, bid: MPM): Promise<MPM>;
    release(listing: MPM, bid: MPM, accept: MPM, release?: MPM): Promise<MPM>
    lock(listing: MPM, bid: MPM, lock: MPM): Promise<MPM>;
    refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund?: MPM): Promise<MPM>
}