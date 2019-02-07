import { MPA } from '../interfaces/omp';

export interface IMultiSigBuilder {
    bid(listing: MPA, bid: MPA): Promise<MPA>;
    accept(listing: MPA, bid: MPA, accept: MPA): Promise<MPA>;
    release(listing: MPA, bid: MPA, accept: MPA, release: MPA): Promise<MPA>;
    lock(listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<MPA>;
    refund(listing: MPA, bid: MPA, accept: MPA, lock: MPA, refund: MPA): Promise<MPA>;
}

export interface IMadCTBuilder {
    bid(listing: MPA, bid: MPA): Promise<MPA>;
    accept(listing: MPA, bid: MPA, accept: MPA): Promise<MPA>;
    lock(listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<MPA>;
    complete(listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<string>; // rawtx
    release(listing: MPA, bid: MPA, accept: MPA): Promise<string>;
    refund(listing: MPA, bid: MPA, accept: MPA, lock: MPA): Promise<string>
    
}

export interface ITransactionBuilder {

}
