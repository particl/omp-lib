/**
 * The abstract class for the Core class.
 * It should contain all _SHARED_ manipulations required for building an escrow transactions.
 * (In short: put the rpc calls here, and extend this class for each type of escrow)
 */
export interface Core {
    createRawTransaction(txinputs: any, txoutputs: any): string; // returns rawtx
    signRawTransaction(rawtx: string): string; // returns signed rawtx
    getRawTransaction(txid: string): any; // returns rawtx
    decodeRawTransaction(rawtx: string): any; // decodes rawtx to object
    addMultiSigAddress(signers: number, pubkeys: any, label: string): any;
}
