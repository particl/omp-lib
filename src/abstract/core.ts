/**
 * The abstract class for the Core class.
 * It should contain all _SHARED_ manipulations required for building an escrow transactions.
 * (In short: put the rpc calls here, and extend this class for each type of escrow)
 */
abstract class Core {
    abstract createRawTransaction(txinputs: any, txoutputs: any): string; // returns rawtx
    abstract signRawTransaction(rawtx: string): string; // returns signed rawtx
    abstract getRawTransaction(txid: string): any; // returns rawtx
    abstract decodeRawTransaction(rawtx: string): any; // decodes rawtx to object

    abstract addMultiSigAddress(signers: number, pubkeys: any, label: string): any;
}