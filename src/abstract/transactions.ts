import { MPA } from '../interfaces/omp';

export interface IMultiSigBuilder {
    bid(wallet: string, listing: MPA, bid: MPA): Promise<MPA>;
    accept(wallet: string, listing: MPA, bid: MPA, accept: MPA): Promise<MPA>;
    lock(wallet: string, listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<MPA>;
    release(wallet: string, listing: MPA, bid: MPA, accept: MPA): Promise<string>;
    refund(wallet: string, listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<string>;
}

export interface IMadCTBuilder {
    bid(wallet: string, listing: MPA, bid: MPA): Promise<MPA>;
    accept(wallet: string, listing: MPA, bid: MPA, accept: MPA): Promise<MPA>;
    lock(wallet: string, listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<MPA>;
    complete(wallet: string, listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<string>; // rawtx
    release(wallet: string, listing: MPA, bid: MPA, accept: MPA): Promise<string>;
    refund(wallet: string, listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<string>;
}

