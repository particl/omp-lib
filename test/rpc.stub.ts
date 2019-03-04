import { injectable } from 'inversify';
import 'reflect-metadata';
import * as WebRequest from 'web-request';

import { Rpc } from '../src/abstract/rpc';
import { Output } from '../src/interfaces/crypto';
import { RpcAddressInfo, RpcOutput, RpcRawTx, RpcUnspentOutput } from '../src/interfaces/rpc';

// tslint:disable cognitive-complexity
@injectable()
export class CoreRpcService extends Rpc {

    private RPC_REQUEST_ID = 1;

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

                if (response.statusCode !== 200) {
                    const message = response.content ? JSON.parse(response.content) : response.statusMessage;
                    throw new Error(response.content);
                }

                const jsonRpcResponse = JSON.parse(response.content);

                return jsonRpcResponse.result;
            })
            .catch(error => {
                /*console.error('--- error ----');*/
                console.error('method:', method);
                console.error('params:', params);
                console.error(JSON.stringify(error, null, 4));
                throw error;

            });

    }

    public async getNewAddress(): Promise<string> {
        return await this.call('getnewaddress');
    }

    public async sendRawTransaction(hex: string): Promise<any> {
        return (await this.call('sendrawtransaction', [hex]));

    }

    public async createSignatureWithWallet(hex: string, prevtx: Output, address: string): Promise<string> {
        return await this.call('createsignaturewithwallet', [hex, prevtx, address]);
    }

    public async getAddressInfo(address: string): Promise<RpcAddressInfo> {
        return await this.call('getaddressinfo', [address]);
    }

    public async getRawTransaction(txid: string, verbose?: boolean): Promise<RpcRawTx> {
        return await this.call('getrawtransaction', [txid, true]);
    }

    public async importAddress(address: string, label: string, rescan: boolean, p2sh: boolean): Promise<void> {
        await this.call('importaddress', [address, label, rescan, p2sh]);
    }

    public async listUnspent(minconf: number): Promise<RpcUnspentOutput[]> {
        return await this.call('listunspent', [minconf]);
    }

    public async lockUnspent(unlock: boolean, outputs: RpcOutput[], permanent: boolean): Promise<boolean> {
        return await this.call('lockunspent', [unlock, outputs, permanent]);
    }

    public async sendToAddress(address: string, amount: number, comment: string): Promise<string> {
        return await this.call('sendtoaddress', [address, amount, comment]);
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
