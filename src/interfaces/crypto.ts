/**
 * An Output from a cryptocurrency.
 */
export interface Output {
    txid: string,
    vout: number,
    _satoshis?: number,
    signature?: string
}

/**
 * A "new" Output, that does not exist yet.
 */
export interface ToBeOutput {
    script: string,
    amount: number
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
    type: CryptoType,
    basePrice: number
}