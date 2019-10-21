import { injectable } from 'inversify';
import 'reflect-metadata';
import * as WebRequest from 'web-request';
import * as _ from 'lodash';
import { Rpc } from '../src/abstract/rpc';
import { BlockchainInfo, RpcAddressInfo, RpcOutput, RpcRawTx, RpcUnspentOutput, RpcWallet, RpcWalletDir } from '../src/interfaces/rpc';
import { OutputType } from '../src/interfaces/crypto';

@injectable()
export class CoreRpcService extends Rpc {

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

    public async createSignatureWithWallet(wallet: string, hex: string, prevtx: RpcUnspentOutput, address: string): Promise<string> {
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
     * @param wallet
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
        return await this.call('listunspent', [minconf], wallet);
    }

    /**
     * Permanently locks outputs until unlocked or spent.
     * @param unlock
     * @param prevouts
     * @param permanent
     */
    public async lockUnspent(wallet: string, unlock: boolean = false, prevouts: RpcOutput[], permanent: boolean = true): Promise<boolean> {
        return await this.call('lockunspent', [unlock, prevouts, permanent], wallet);
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

                    const message = response.content ? JSON.parse(response.content) : response.statusMessage;
                    if (this.DEBUG) {
                        console.error('method:', method);
                        console.error('params:', params);
                        console.error(message);
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
