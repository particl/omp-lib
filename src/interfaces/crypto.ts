/**
 * An Output from a cryptocurrency.
 */
export interface Output {
    txid: string,
    vout: number,
    _satoshis?: number,
    _scriptPubKey?: string,
    _address?: string,
    _signature?: ISignature
}

export interface BlindOutput extends Output {  // TODO: FV
    blindFactor?: string,
    _commitment: string
}

/**
 * A "new" Output, that does not exist yet.
 */
export interface ToBeOutput {
    script: string,
    satoshis: number,
    _redeemScript?: string,
}

/**
 * A "new" Blind Output, that does not exist yet.
 */
export interface ToBeBlindOutput {  // TODO: FV
    // Stealth address
    address: CryptoAddress,
    // CT
    blindFactor: string,
    commitment: string,
    // Private details
    _satoshis: number,
    _redeemScript?: string
}

/**
 * A signature for a prevout.
 */
export interface ISignature {
    signature: string,
    pubKey: string
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
 * An address from a cryptocurrency.
 */
export interface CryptoAddress {
    type: CryptoAddressType,
    address: string,
    ephem?: string // if stealth, might provide ephem.
}

/**
 * An address from a cryptocurrency.
 */
export interface CryptoAmount {
    type: CryptoType,
    basePrice: number
}