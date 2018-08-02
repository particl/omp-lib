import { Output, CryptoType, ToBeOutput, CryptoAddress, ISignature } from "../interfaces/crypto";
import { TransactionBuilder } from "../../test/transaction";

/**
 * The abstract class for the Rpc class.
 */
export interface Rpc {
    call(method: string, params: any[]): Promise<any>;

    /*
        WALLET - generating keys, addresses.
    */
    getNewPubkey(): Promise<string>;
    getNewAddress(): Promise<string>;
    // Retrieving information of outputs
    getNormalOutputs(satoshis: number): Promise<Output[]>;
    getSatoshisForUtxo(utxo: Output): Promise<Output>;

    // Importing and signing
    importRedeemScript(script: any): Promise<boolean>;
    signRawTransactionForInputs(tx: TransactionBuilder, inputs: Output[]): Promise<ISignature[]> 

    // Networking
    sendRawTransaction(rawtx: string);
}

export type ILibrary = (parent: CryptoType) => Rpc;