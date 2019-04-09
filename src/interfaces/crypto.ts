/**
 * An Prevout from a cryptocurrency.
 */
export interface Prevout {
    txid: string;
    vout: number;
    _satoshis?: number;
    _address?: string;
    _signature?: ISignature;
    _redeemScript?: string;
    _scriptPubKey?: string;
    _sequence?: number;
}

export interface BlindPrevout extends Prevout {  // TODO: FV
    blindFactor: string;
    _commitment: string;
}

/**
 * Base class
 */
export interface ToBeOutput {}

/**
 * A "new" Prevout, that does not exist yet.
 */
export interface ToBeNormalOutput extends ToBeOutput {
    script: string;
    satoshis: number;
    _redeemScript?: string;
}

/**
 * A "new" Blind output, that does not exist yet.
 */
export interface ToBeBlindOutput extends ToBeOutput {  // TODO: FV
    // Stealth address
    address: CryptoAddress;
    // CT
    _type: string;
    blindFactor: string;
    // Destroy txn
    _nonce?: string;
    _data?: string;
    // Private details
    _satoshis: number;
    _redeemScript?: string;
    _address?: string; // _redeemScript to address
}

/**
 * A signature for a prevout.
 */
export interface ISignature {
    signature: string;
    pubKey: string;
}

export enum Cryptocurrency {
    BTC = 'BTC',
    PART = 'PART',
    ZCASH = 'ZEC'
}

export enum Fiatcurrency {
    EUR = 'EUR',
    USD = 'USD'
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
    pubKey?: string;
    ephem?: EphemeralKey; // if stealth, might provide ephem.
}

/**
 * An ephemeral key.
 */
export interface EphemeralKey {
    private?: string;
    public: string;
}

/**
 * An amount of cryptocurrency.
 */
export interface CryptoAmount {
    type: Cryptocurrency;
    basePrice: number;
}
