/**
 * A Output from a cryptocurrency.
 */
export interface Output {
    txid: string,
    vout: Number,
    amount: Number
}

/**
 * An address from a cryptocurrency.
 */
export interface CryptoAddress {
    type: string, // NORMAL | 
    address: string
  }