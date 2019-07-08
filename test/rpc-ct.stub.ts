import { injectable } from 'inversify';
import 'reflect-metadata';
import * as WebRequest from 'web-request';
import * as _ from 'lodash';
import { CtRpc, RpcBlindSendToOutput } from '../src/abstract/rpc';
import { Prevout, BlindPrevout, CryptoAddressType, CryptoAddress, OutputType } from '../src/interfaces/crypto';
import { fromSatoshis } from '../src/util';
import { RpcAddressInfo, RpcRawTx, RpcUnspentOutput, RpcWallet, RpcWalletDir } from '../src/interfaces/rpc';


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

    public async getNewAddress(): Promise<string> {
        return await this.call('getnewaddress');
    }

    public async getAddressInfo(address: string): Promise<RpcAddressInfo> {
        return await this.call('getaddressinfo', [address]);
    }

    public async importAddress(address: string, label: string, rescan: boolean, p2sh: boolean): Promise<void> {
        await this.call('importaddress', [address, label, rescan, p2sh]);
    }

    public async sendToAddress(address: string, amount: number, comment: string): Promise<string> {
        return await this.call('sendtoaddress', [address, amount, comment]);
    }

    public async sendTypeTo(typeIn: OutputType, typeOut: OutputType, outputs: RpcBlindSendToOutput[]): Promise<string> {
        return await this.call('sendtypeto', [typeIn.toString().toLowerCase(), typeOut.toString().toLowerCase(), outputs]);
    }

    // TODO: Prevout doesn't look correct, based on the help command output
    public async createSignatureWithWallet(hex: string, prevtx: Prevout, address: string): Promise<string> {
        return await this.call('createsignaturewithwallet', [hex, prevtx, address]);
    }

    /**
     * Send a raw transaction to the network, returns txid.
     * @param hex the raw transaction in hex format.
     */
    public async sendRawTransaction(hex: string): Promise<string> {
        return (await this.call('sendrawtransaction', [hex]));
    }

    /**
     * Get a raw transaction, always in verbose mode
     * @param txid
     */
    public async getRawTransaction(txid: string): Promise<RpcRawTx> {
        return await this.call('getrawtransaction', [txid, true]);
    }

    public async listUnspent(type: OutputType, minconf: number): Promise<RpcUnspentOutput[]> {
        switch (type) {
            case OutputType.BLIND:
                return await this.call('listunspentblind', [minconf]);
            case OutputType.ANON:
                return await this.call('listunspentanon', [minconf]);
            case OutputType.PART:
                return await this.call('listunspent', [minconf]);
            default:
                throw Error('Invalid Output type.');
        }
    }

    // public async listUnspentBlind(minconf: number): Promise<RpcUnspentOutput[]> {
    //    return await this.call('listunspentblind', [minconf]);
    // }

    /**
     * Permanently locks outputs until unlocked or spent.
     * @param unlock
     * @param prevouts
     * @param permanent
     */
    public async lockUnspent(unlock: boolean, prevouts: Prevout[], permanent: boolean): Promise<boolean> {
        return await this.call('lockunspent', [unlock, prevouts, permanent]);
    }

    // CtRpc required implmentations below...

    public async getNewStealthAddress(): Promise<CryptoAddress> {
        const sx = await this.call('getnewstealthaddress');
        return {
            type: CryptoAddressType.STEALTH,
            address: sx
        } as CryptoAddress;
    }

    // public async getBlindPrevouts(type: string, satoshis: number, blind?: string): Promise<BlindPrevout[]> {
    //    return [await this.createBlindPrevoutFrom(type, satoshis, blind)];
    // }

    public async getPrevouts(typeIn: OutputType, typeOut: OutputType, satoshis: number, blind?: string): Promise<BlindPrevout[]> {
        return [await this.createPrevoutFrom(typeIn, typeOut, satoshis, blind)];
    }

    /**
     * Verify value commitment.
     * note that the amount is satoshis, which differs from the rpc api
     *
     * @param commitment
     * @param blind
     * @param satoshis
     */
    public async verifyCommitment(commitment: string, blind: string, satoshis: number): Promise<boolean> {
        return (await this.call('verifycommitment', [commitment, blind, fromSatoshis(satoshis)])).result;
    }

    public async createRawTransaction(inputs: BlindPrevout[], outputs: any[]): Promise<any> {
        return await this.call('createrawtransaction', [inputs, outputs]);
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

    // for clarity
    public async createAndLoadWallet(name: string, disablePrivateKeys: boolean = false, blank: boolean = false): Promise<RpcWallet> {
        return await this.createWallet(name, disablePrivateKeys, blank);
    }

    /**
     * Loads a wallet from a wallet file or directory.
     *
     * @returns {Promise<RpcWallet>}
     */
    public async loadWallet(name: string): Promise<RpcWallet> {
        return await this.call('loadwallet', [name]);
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

    public async call(method: string, params: any[] = []): Promise<any> {
        const id = this.RPC_REQUEST_ID++;
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id
        });

        const url = 'http://' + this._host + ':' + this._port;
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

}

// export const node0 = new CtCoreRpcService('localhost', 19792, 'rpcuser0', 'rpcpass0');
// export const node1 = new CtCoreRpcService('localhost', 19793, 'rpcuser1', 'rpcpass1');
// export const node2 = new CtCoreRpcService('localhost', 19794, 'rpcuser2', 'rpcpass2');
// export { CtCoreRpcService };
