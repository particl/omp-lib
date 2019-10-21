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


export interface RpcBlindInput extends RpcOutput {
    type: string;
    scriptPubKey: string;
    amount_commitment: string;
    blindingfactor: string;
    redeemScript?: string;
    sequence?: number;
}

export interface RpcBlindOrFeeBase {

}

export interface RpcBlindOutput extends RpcBlindOrFeeBase {
    rangeproof_params: any;
    pubkey?: string;
    ephemeral_key?: string;
    script?: string;
    nonce?: string;
    data?: any;
    address?: string;
    amount?: number;
    data_ct_fee?: number;
}

export interface RpcCtFeeOutput extends RpcBlindOrFeeBase {
    type: string;
    amount: number;
    data_ct_fee: number;
}

export interface RpcBlindSendToOutput {
    address: string;
    amount: number;
    blindingfactor: string;
}

export interface BlockchainInfo {
    chain: string;                      // current network name as defined in BIP70 (main, test, regtest)
    blocks: number;                     // the current number of blocks processed in the server
    headers: number;                    // the current number of headers we have validated
    bestblockhash: string;              // the hash of the currently best block
    moneysupply: number;                // the total amount of coin in the network
    blockindexsize: number;             // the total number of block headers indexed
    delayedblocks: number;              // the number of delayed blocks
    difficulty: number;                 // the current difficulty
    mediantime: number;                 // median time for the current best block
    verificationprogress: number;       // estimate of verification progress [0..1]
    initialblockdownload: boolean;      // estimate of whether this node is in Initial Block Download mode.
    chainwork: string;                  // total amount of work in active chain, in hexadecimal
    size_on_disk: number;               // the estimated size of the block and undo files on disk
    pruned: boolean;                    // if the blocks are subject to pruning
    // todo: add pruning and softfork related data when needed
}

export interface RpcWalletInfo {
    walletname: string;                 // the wallet name
    walletversion: number;              // the wallet version
    total_balance: number;              // the total balance of the wallet in PART
    balance: number;                    // the total confirmed balance of the wallet in PART
    blind_balance: number;              // the total confirmed blinded balance of the wallet in PART
    anon_balance: number;               // the total confirmed anon balance of the wallet in PART
    staked_balance: number;             // the total staked balance of the wallet in PART (non-spendable until maturity)
    unconfirmed_balance: number;        // the total unconfirmed balance of the wallet in PART
    immature_balance: number;           // the total immature balance of the wallet in PART
    immature_anon_balance: number;      // the total immature anon balance of the wallet in PART
    reserve: number;                    // the reserve balance of the wallet in PART
    txcount: number;                    // the total number of transactions in the wallet
    keypoololdest: number;              // the timestamp (seconds since Unix epoch) of the oldest pre-generated key in the key pool
    keypoolsize: number;                // how many new keys are pre-generated (only counts external keys)
    keypoolsize_hd_internal: number;    // how many new keys are pre-generated for internal use (used for change outputs, only appears if the wallet is
                                        // using this feature, otherwise external keys are used)
    encryptionstatus: string;           // unencrypted/locked/unlocked
    unlocked_until: number;             // the timestamp in seconds since epoch (midnight Jan 1 1970 GMT) that the wallet is unlocked for transfers,
                                        // or 0 if the wallet is locked
    paytxfee: number;                   // the transaction fee configuration, set in PART/kB
    hdseedid?: string;                  // the Hash160 of the HD account pubkey (only present when HD is enabled)
    private_keys_enabled: boolean;      // false if privatekeys are disabled for this wallet (enforced watch-only wallet)
}

export interface RpcMnemonic {
    mnemonic: string;
    master: string;
}

export interface RpcExtKeyGenesisImport {
    result: string;
    master_id: string;
    master_label: string;
    account_id: string;
    account_label: string;
    note: string;
}

export interface RpcAddressBalance {
    balance: string;    // current balance in satoshis
    received: string;   // total number of satoshis received (including change)
}
