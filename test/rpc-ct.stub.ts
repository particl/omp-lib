import { injectable } from 'inversify';
import 'reflect-metadata';
import * as WebRequest from 'web-request';
import * as _ from 'lodash';
import { CtRpc } from '../src/abstract/rpc';
import { Prevout, BlindPrevout, CryptoAddressType, CryptoAddress, OutputType } from '../src/interfaces/crypto';
import { fromSatoshis } from '../src/util';
import {
    RpcAddressInfo,
    RpcRawTx,
    RpcUnspentOutput,
    RpcWallet,
    RpcWalletDir,
    RpcBlindSendToOutput,
    RpcMnemonic,
    RpcExtKeyGenesisImport, RpcWalletInfo, BlockchainInfo
} from '../src/interfaces/rpc';


@injectable()
export class CtCoreRpcService extends CtRpc {

    private RPC_REQUEST_ID = 1;
    private DEBUG = true;

    private _host = '';
    private _port = 0;
    private _user = '';
    private _password = '';

    constructor() {
        super();
    }

    public setup(host: string, port: number, user: string, password: string): void {
        this._host = host;
        this._port = port;
        this._user = user;
        this._password = password;
    }

    public async getNewAddress(wallet: string): Promise<string> {
        return await this.call('getnewaddress', [], wallet);
    }

    public async getAddressInfo(wallet: string, address: string): Promise<RpcAddressInfo> {
        return await this.call('getaddressinfo', [address], wallet);
    }

    public async importAddress(wallet: string, address: string, label: string, rescan: boolean, p2sh: boolean): Promise<void> {
        await this.call('importaddress', [address, label, rescan, p2sh], wallet);
    }

    public async sendToAddress(wallet: string, address: string, amount: number, comment: string): Promise<string> {
        return await this.call('sendtoaddress', [address, amount, comment], wallet);
    }

    public async sendTypeTo(wallet: string, typeIn: OutputType, typeOut: OutputType, outputs: RpcBlindSendToOutput[]): Promise<string> {
        const txid = await this.call('sendtypeto', [typeIn.toString().toLowerCase(), typeOut.toString().toLowerCase(), outputs], wallet);
        console.log('sendTypeTo, txid: ' + txid);
        return txid;
    }

    // TODO: Prevout doesn't look correct, based on the help command output
    public async createSignatureWithWallet(wallet: string, hex: string, prevtx: Prevout, address: string): Promise<string> {
        return await this.call('createsignaturewithwallet', [hex, prevtx, address], wallet);
    }

    /**
     * Send a raw transaction to the network, returns txid.
     * @param wallet
     * @param hex the raw transaction in hex format.
     */
    public async sendRawTransaction(hex: string): Promise<string> {
        return (await this.call('sendrawtransaction', [hex]));
    }

    /**
     * Get a raw transaction, always in verbose mode
     * @param txid
     * @param verbose
     */
    public async getRawTransaction(txid: string, verbose: boolean = true): Promise<RpcRawTx> {
        return await this.call('getrawtransaction', [txid, verbose]);
    }

    /**
     * Verify inputs for raw transaction (serialized, hex-encoded).
     * @param params
     */
    public async verifyRawTransaction(params: any[] = []): Promise<any> {
        return await this.call('verifyrawtransaction', params);
    }

    public async listUnspent(wallet: string, type: OutputType, minconf: number): Promise<RpcUnspentOutput[]> {
        switch (type) {
            case OutputType.ANON:
                return await this.call('listunspentanon', [minconf], wallet);
            case OutputType.BLIND:
                return await this.call('listunspentblind', [minconf], wallet);
            case OutputType.PART:
                return await this.call('listunspent', [minconf], wallet);
            default:
                throw Error('Invalid Output type.');
        }
    }

    // public async listUnspentBlind(minconf: number): Promise<RpcUnspentOutput[]> {
    //    return await this.call('listunspentblind', [minconf]);
    // }

    /**
     * Permanently locks outputs until unlocked or spent.
     * @param wallet
     * @param unlock
     * @param prevouts
     * @param permanent
     */
    public async lockUnspent(wallet: string, unlock: boolean, prevouts: Prevout[], permanent: boolean): Promise<boolean> {
        return await this.call('lockunspent', [unlock, prevouts, permanent], wallet);
    }

    // CtRpc required implmentations below...

    public async getNewStealthAddress(wallet: string, params: any[] = []): Promise<CryptoAddress> {
        if (wallet === undefined) {
            throw new Error('Missing wallet. (getNewStealthAddress)');
        }

        const sx = await this.call('getnewstealthaddress', params, wallet);
        return {
            type: CryptoAddressType.STEALTH,
            address: sx
        } as CryptoAddress;
    }

    // public async getBlindPrevouts(type: string, satoshis: number, blind?: string): Promise<BlindPrevout[]> {
    //    return [await this.createBlindPrevoutFrom(type, satoshis, blind)];
    // }

    public async getPrevouts(wallet: string, typeIn: OutputType, typeOut: OutputType, satoshis: number, blind?: string): Promise<BlindPrevout[]> {
        return [await this.createPrevoutFrom(wallet, typeIn, typeOut, satoshis, blind)];
    }

    /**
     * Verify value commitment.
     * note that the amount is satoshis, which differs from the rpc api
     *
     * @param wallet
     * @param commitment
     * @param blind
     * @param satoshis
     */
    public async verifyCommitment(wallet: string, commitment: string, blind: string, satoshis: number): Promise<boolean> {
        return (await this.call('verifycommitment', [commitment, blind, fromSatoshis(satoshis)], wallet)).result;
    }

    public async createRawTransaction(wallet: string, inputs: BlindPrevout[], outputs: any[]): Promise<any> {
        return await this.call('createrawtransaction', [inputs, outputs], wallet);
    }

    /**
     * Returns a list of wallets in the wallet directory.
     *
     * @returns {Promise<RpcWalletDir>}
     */
    public async listLoadedWallets(): Promise<string[]> {
        return await this.call('listwallets');
    }

    /**
     * Returns a list of wallets in the wallet directory.
     *
     * @returns {Promise<RpcWalletDir>}
     */
    public async listWalletDir(): Promise<RpcWalletDir> {
        return await this.call('listwalletdir');
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    public async walletLoaded(name: string): Promise<boolean> {
        return await this.listLoadedWallets()
            .then(result => {
                const found = _.find(result, wallet => {
                    return wallet === name;
                });
                const loaded = found ? true : false;
                return loaded;
            });
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    public async walletExists(name: string): Promise<boolean> {
        return await this.listWalletDir()
            .then(result => {
                const found = _.find(result.wallets, wallet => {
                    return wallet.name === name;
                });
                const exists = found ? true : false;
                return exists;
            });
    }

    /**
     * Creates and loads a new wallet.
     *
     * @returns {Promise<RpcWallet>}
     */
    public async createWallet(name: string, disablePrivateKeys: boolean = false, blank: boolean = false): Promise<RpcWallet> {
        return await this.call('createwallet', [name, disablePrivateKeys, blank]);
    }

    public async setupWallet(wallet: string): Promise<RpcWalletInfo> {
        const mnemonic: RpcMnemonic = await this.mnemonic(['new']);
        const extkey: RpcExtKeyGenesisImport = await this.extKeyGenesisImport(wallet, [mnemonic.mnemonic]);
        const walletInfo: RpcWalletInfo = await this.getWalletInfo(wallet);
        return walletInfo;
    }

    /**
     * Loads a wallet from a wallet file or directory.
     *
     * @returns {Promise<RpcWallet>}
     */
    public async loadWallet(name: string): Promise<RpcWallet> {
        return await this.call('loadwallet', [name]);
    }

    public async unloadWallet(name: string): Promise<RpcWallet> {
        return await this.call('unloadwallet', [name]);
    }

    /**
     * Returns an object containing various state info regarding blockchain processing.
     *
     * @returns {Promise<BlockchainInfo>}
     */
    public async getBlockchainInfo(): Promise<BlockchainInfo> {
        return await this.call('getblockchaininfo', []);
    }

    /**
     * Set secure messaging to use the specified wallet.
     * SMSG can only be enabled on one wallet.
     * Call with no parameters to unset the active wallet.
     *
     * @returns {Promise<RpcWallet>}
     */
    public async smsgSetWallet(name?: string): Promise<RpcWallet> {
        return await this.call('smsgsetwallet', [name]);
    }

    /**
     * mnemonic new|decode|addchecksum|dumpwords|listlanguages
     *          new ( "password" language nBytesEntropy bip44 )
     *              Generate a new extended key and mnemonic
     *          decode "password" "mnemonic" ( bip44 )
     *              Decode mnemonic
     *          addchecksum "mnemonic"
     *              Add checksum words to mnemonic
     *          mnemonic dumpwords ( "language" )
     *              Print list of words
     *          mnemonic listlanguages
     *              Print list of supported languages
     * @param params
     */
    public async mnemonic(params: any[] = []): Promise<RpcMnemonic> {
        return await this.call('mnemonic', params);
    }

    /**
     * extkeygenesisimport "mnemonic/key" ( "passphrase" save_bip44_root "master_label" "account_label" scan_chain_from )
     *
     * Import master key from bip44 mnemonic root key and derive default account.
     * Derives an extra chain from path 444444 to receive imported coin.
     *
     * Arguments:
     * 1. mnemonic/key       (string, required) The mnemonic or root extended key.
     * 2. passphrase         (string, optional, default=) Passphrase when importing mnemonic.
     * 3. save_bip44_root    (boolean, optional, default=false) Save bip44 root key to wallet.
     * 4. master_label       (string, optional, default=Master Key) Label for master key.
     * 5. account_label      (string, optional, default=Default Account) Label for account.
     * 6. scan_chain_from    (numeric, optional, default=0) Scan for transactions in blocks after timestamp, negative number to skip.
     *
     * @param wallet
     * @param params
     */
    public async extKeyGenesisImport(wallet: string, params: any[] = []): Promise<RpcExtKeyGenesisImport> {
        return await this.call('extkeygenesisimport', params, wallet);
    }

    /**
     * Returns an object containing various wallet state info.
     */
    public async getWalletInfo(wallet: string): Promise<RpcWalletInfo> {
        return await this.call('getwalletinfo', [], wallet);
    }

    public async call(method: string, params: any[] = [], wallet?: string): Promise<any> {
        const id = this.RPC_REQUEST_ID++;
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id
        });

        const url = this.getUrl(wallet);
        const options = this.getOptions();

        return await WebRequest.post(url, options, postData)
            .then(response => {

                const jsonRpcResponse = JSON.parse(response.content);
                if (response.statusCode !== 200) {
                    const message = response.content
                        ? response.statusCode + ': ' + response.content // JSON.parse(response.content)
                        : response.statusCode + ': ' + response.statusMessage;
                    if (this.DEBUG) {
                        console.error('method:', method);
                        console.error('params:', params);
                        console.error(JSON.stringify(message, null, 2));
                    }
                    throw message['error'];
                }

                return jsonRpcResponse.result;
            });
    }

    private getOptions(): any {

        const auth = {
            user: this._user,
            pass: this._password,
            sendImmediately: false
        };

        const headers = {
            'User-Agent': 'OMP regtest',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const rpcOpts = {
            auth,
            headers
        };

        return rpcOpts;
    }

    private getUrl(wallet: string | undefined): string {
        const url = 'http://' + this._host + ':' + this._port;
        if (wallet === undefined) {
            return url;
        } else {
            return url + '/wallet/' + wallet;
        }
    }
}

// export const node0 = new CtCoreRpcService('localhost', 19792, 'rpcuser0', 'rpcpass0');
// export const node1 = new CtCoreRpcService('localhost', 19793, 'rpcuser1', 'rpcpass1');
// export const node2 = new CtCoreRpcService('localhost', 19794, 'rpcuser2', 'rpcpass2');
// export { CtCoreRpcService };
