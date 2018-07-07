/**
 * A Output from a cryptocurrency.
 */
export interface Output {
    txid: string,
    vout: Number,
    amount: Number
}

export enum Crypto {
    BTC = 'BTC',
    PART = 'PART'
}

/**
 * An address from a cryptocurrency.
 */
export interface CryptoAddress {
    type: string, // NORMAL | 
    address: string
}

/**
 * An address from a cryptocurrency.
 */
export interface CryptoAmount {
    type: Crypto, // NORMAL | 
    base_price: number
}