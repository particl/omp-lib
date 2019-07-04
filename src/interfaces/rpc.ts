/*
 * Interfaces which the Rpc class needs to implement
 */
export interface RpcWalletDir {
    wallets: RpcWallet[];
}

export interface RpcWallet {
    name: string;
    warning: string;
}

export interface RpcAddressInfo {
    address: string;
    scriptPubKey: string;
    from_ext_address_id: string;
    path: string;
    ismine: boolean;
    solvable: boolean;
    desc: string;
    iswatchonly: boolean;
    isscript: boolean;
    iswitness: boolean;
    pubkey: string;
    iscompressed: boolean;
    ischange: boolean;
}

export interface RpcRawTx {
    txid: string;
    vout: RpcVout[];
}

export interface RpcVout {
    valueSat: number;
    n: number;
    scriptPubKey: RpcScriptPubKey;
    valueCommitment?: string; // TODO: move to RpcBlindVout?
}

export interface RpcScriptPubKey {
    hex: string;
    addresses: string[];
}

export interface RpcOutput {
    txid: string;
    vout: number;
}

export interface RpcUnspentOutput extends RpcOutput {
    txid: string;                   // (string) the transaction id
    vout: number;                   // (numeric) the vout value
    address: string;                // (string) the particl address
    coldstaking_address: string;    // (string) the particl address this output must stake on
    label: string;                  // (string) The associated label, or "" for the default label
    scriptPubKey: string;           // (string) the script key
    amount: number;                 // (numeric) the transaction output amount in PART
    confirmations: number;          // (numeric) The number of confirmations
    redeemScript: string;           // (string) The redeemScript if scriptPubKey is P2SH
    spendable: boolean;             // (bool) Whether we have the private keys to spend this output
    solvable: boolean;              // (bool) Whether we know how to spend this output, ignoring the lack of keys
    safe: boolean;                  // (bool) Whether this output is considered safe to spend. Unconfirmed transactions
                                    // from outside keys and unconfirmed replacement transactions are considered unsafe
                                    // and are not eligible for spending by fundrawtransaction and sendtoaddress.
    stakeable: boolean;             // (bool) Whether we have the private keys to stake this output

}
