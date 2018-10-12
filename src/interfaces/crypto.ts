/**
 * An Output from a cryptocurrency.
 */
export interface Output {
    txid: string;
    vout: number;
    _satoshis?: number;
    _scriptPubKey?: string;
    _address?: string;
    _signature?: ISignature;
}

/**
 * A "new" Output, that does not exist yet.
 */
export interface ToBeOutput {
    script: string;
    satoshis: number;
    _redeemScript?: string;
}

/**
 * A signature for a prevout.
 */
export interface ISignature {
    signature: string;
    pubKey: string;
}

export enum CryptoType {
    BTC = 'BTC',
    PART = 'PART',
    ZCASH = 'ZEC'
}

export enum CryptoAddressType {
    NORMAL = 'NORMAL',
    STEALTH = 'STEALTH'
}

/**
 * An address for a cryptocurrency.
 */
export interface CryptoAddress {
    type: CryptoAddressType;
    address: string;
}

/**
 * An amount for a cryptocurrency.
 */
export interface CryptoAmount {
    type: CryptoType;
    basePrice: number;
}
