import { Output, CryptoType, ToBeOutput, CryptoAddress, ISignature, BlindOutput, ToBeBlindOutput } from "../interfaces/crypto";
import { TransactionBuilder } from "../transaction-builder/transaction";

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
    getNewStealthAddressWithEphem(): Promise<CryptoAddress>;

    // Retrieving information of outputs
    getNormalOutputs(satoshis: number): Promise<Output[]>;
    getBlindOutputs(satoshis: number): Promise<BlindOutput[]>;

    getSatoshisForUtxo(utxo: Output): Promise<Output>;
    getCommitmentForBlindUtxo(utxo: BlindOutput): Promise<BlindOutput>;
    generateCommitment(blind: string, satoshis: number): Promise<string>;

    buildBidTxScript(publicKeys: string[], hashedSecret: string, secondsToLock: number): any;

    // Importing and signing
    importRedeemScript(script: any): Promise<boolean>;
    signRawTransactionForInputs(tx: TransactionBuilder, inputs: Output[]): Promise<ISignature[]>

    // Networking
    sendRawTransaction(rawtx: string);
}

export type ILibrary = (parent: CryptoType) => Rpc;