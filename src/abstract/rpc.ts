import { Output, CryptoType, ToBeOutput, CryptoAddress, ISignature } from '../interfaces/crypto';
import { TransactionBuilder } from '../transaction-builder/transaction';

/**
 * The abstract class for the Rpc class.
 */
export abstract class Rpc {

    public abstract async isConnected(): Promise<boolean>;
    public abstract async getVersion(): Promise<number>;
    public abstract async call(method: string, params: any[]): Promise<any>;

    public abstract getNewAddress(): Promise<string>;
    public abstract sendRawTransaction(rawtx: string): Promise<any>;

    public getNewPubkey(): Promise<string> {
        throw new Error('Not Implemented.');
    }

    public getNormalOutputs(satoshis: number): Promise<Output[]> {
        throw new Error('Not Implemented.');
    }

    public getSatoshisForUtxo(utxo: Output): Promise<Output> {
        throw new Error('Not Implemented.');
    }

    public importRedeemScript(script: any): Promise<boolean> {
        throw new Error('Not Implemented.');
    }

    public signRawTransactionForInputs(tx: TransactionBuilder, inputs: Output[]): Promise<ISignature[]> {
        throw new Error('Not Implemented.');
    }

}

export type ILibrary = (parent: CryptoType) => Rpc;
