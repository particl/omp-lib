import { BidConfiguration } from "../interfaces/configs";
import { MPM } from "../interfaces/omp";

export interface IBid {
    bid(config: BidConfiguration, listing: MPM): Promise<MPM>;
    accept(listing: MPM, bid: MPM): Promise<MPM>;
}