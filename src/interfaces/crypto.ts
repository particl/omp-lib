/**
 * An Output from a cryptocurrency.
 */
export interface Output {
    txid: string,
    vout: Number,
    signature?: string
}

/**
 * A "new" Output, that does not exist yet.
 */
export interface ToBeOutput {
    script: string,
    amount: Number
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
    address: string
}

/**
 * An address from a cryptocurrency.
 */
export interface CryptoAmount {
    type: Crypto,
    basePrice: number
}