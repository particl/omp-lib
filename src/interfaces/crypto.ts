/**
 * A Output from a cryptocurrency.
 */
export interface Output {
    txid: String,
    vout: Number,
    amount: Number
}

/**
 * An address from a cryptocurrency.
 */
export interface CryptoAddress {
    type: String, // NORMAL | 
    address: String
  }