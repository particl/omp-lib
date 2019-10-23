import { BidConfiguration } from '../interfaces/configs';
import { MPM } from '../interfaces/omp';

// This interface does do sanity checks first.
export interface OMP {
    bid(wallet: string, config: BidConfiguration, listing: MPM): Promise<MPM>;
    accept(wallet: string, listing: MPM, bid: MPM): Promise<MPM>;
    lock(wallet: string, listing: MPM, bid: MPM, lock: MPM): Promise<MPM>;
    // complete() is only used in MADCT because the destroy tx needs to be finalized
    // and shared between all parties before the bid transaction is finalized.
    complete(wallet: string, listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string>;
    release(wallet: string, listing: MPM, bid: MPM, accept: MPM): Promise<string>; // TODO: add release signatures for seller in accept.
    refund(wallet: string, listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string>; // TODO: add refund signatures for seller in lock.
}
