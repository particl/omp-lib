/**
 * A Output from a cryptocurrency.
 */
export interface Output {
    txid: string,
    vout: Number
}

export enum Crypto {
    BTC = 'BTC',
    PART = 'PART'
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