import { BidConfiguration } from '../interfaces/configs';
import { MPM } from '../interfaces/omp';

// This interface does do sanity checks first.
export interface OMP {
    bid(config: BidConfiguration, listing: MPM): Promise<MPM>;
    accept(listing: MPM, bid: MPM): Promise<MPM>;
    lock(listing: MPM, bid: MPM, lock: MPM): Promise<MPM>;
    // complete() is only used in MADCT because the destroy tx needs to be finalized
    // and shared between all parties before the bid transaction is finalized.
    complete(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string>;
    release(listing: MPM, bid: MPM, accept: MPM): Promise<string>; // TODO: add release signatures for seller in accept.
    refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string>; // TODO: add refund signatures for seller in lock.
}
