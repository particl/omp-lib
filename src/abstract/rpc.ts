import { Output, CryptoType } from "../interfaces/crypto";

/**
 * The abstract class for the Rpc class.
 */
export interface Rpc {
    call(method: string, params: any[]): Promise<any>;

    getNewPubkey(): Promise<string>;
    getNewAddress(): Promise<string>;

    getNormalOutputs(satoshis: number): Promise<Output[]>;
    calculateChangeSatoshis(requiredSatoshis: number, chosenOutputs: Output[]): Promise<number>;
    getSatoshisForUtxo(utxo: Output): Promise<number>;

}

export type ILibrary = (parent: CryptoType) => Rpc;