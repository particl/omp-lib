import { Prevout, CryptoType, ToBeNormalOutput, CryptoAddress, ISignature, BlindPrevout, ToBeBlindOutput } from "../interfaces/crypto";
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
    lockUnspent(prevout: Prevout[]): Promise<boolean>;

    // Retrieving information of prevouts
    getNormalPrevouts(satoshis: number): Promise<Prevout[]>;

    getSatoshisForUtxo(utxo: Prevout): Promise<Prevout>;

    // Importing and signing
    importRedeemScript(script: any): Promise<boolean>;
    signRawTransactionForInputs(tx: TransactionBuilder, inputs: Prevout[]): Promise<ISignature[]>

    // Networking
    sendRawTransaction(rawtx: string);
}

/**
 * The abstract class for the Confidential Transactions Rpc.
 */
export interface CtRpc extends Rpc {
    call(method: string, params: any[]): Promise<any>;

    /*
        WALLET - generating keys, addresses.
    */
    getNewStealthAddressWithEphem(sx?: CryptoAddress): Promise<CryptoAddress>;
    getPubkeyForStealthWithEphem(sx: CryptoAddress): Promise<CryptoAddress>;

    // Retrieving information of prevouts
    getBlindPrevouts(satoshis: number, blind?: string): Promise<BlindPrevout[]>;

    loadTrustedFieldsForBlindUtxo(utxo: BlindPrevout): Promise<BlindPrevout>;
    getLastMatchingBlindFactor(prevouts: Prevout[] | ToBeBlindOutput[], outputs: ToBeBlindOutput[]): Promise<string>;

    generateRawConfidentialTx(prevouts: any[], outputs: any[], feeSatoshis: number): Promise<string>;

    // Importing and signing
    signRawTransactionForBlindInputs(tx: TransactionBuilder, inputs: BlindPrevout[], sx?: CryptoAddress): Promise<ISignature[]>
}

export type ILibrary = (parent: CryptoType, isCt?: boolean) => (Rpc | CtRpc);