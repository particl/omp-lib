import { injectable, inject } from "inversify";
import "reflect-metadata";

import { Rpc } from "../src/abstract/rpc";

import * as WebRequest from 'web-request';
import { Output } from "../src/interfaces/crypto";
import { isNonNegativeNaturalNumber, isValidPrice, toSathoshis } from "../src/util";


@injectable()
class CoreRpcService implements Rpc {

    private RPC_REQUEST_ID = 1;

    constructor(
        private _host: string,
        private _port: number,
        private _user: string,
        private _password: string) {
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
                    throw new Error(response.statusCode + " " + message);
                }

                const jsonRpcResponse = JSON.parse(response.content);

                return jsonRpcResponse.result;
            })
            .catch(error => {
                /*console.error('--- error ----');
                console.error('method:', method);
                console.error('params:', params);*/
                console.error('ERROR: ' + JSON.stringify(error));
                throw error;

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

    public async getNewAddress(): Promise<string> {
        return await this.call('getnewaddress');
    }

    public async getNewPubkey(): Promise<string> {
        const address = await this.getNewAddress();
        return (await this.call('validateaddress', [address])).pubkey;
    }

    public async getNormalOutputs(reqSatoshis: number): Promise<Output[]> {
        const chosen: Array<Output> = [];
        let chosenSatoshis: number = 0;

        const unspent: Array<Output> = await this.call('listunspent', [0]);

        unspent.filter((output: any) => output.spendable && output.safe)
            .find((utxo: any) => {
                chosenSatoshis += toSathoshis(utxo.amount);
                chosen.push({
                    txid: utxo.txid,
                    vout: utxo.vout,
                    _satoshis: toSathoshis(utxo.amount)
                });

                if (chosenSatoshis >= reqSatoshis) {
                    return true;
                }
                return false;
            });

        if (chosenSatoshis < reqSatoshis) {
            throw new Error('Not enough available output to cover the required amount.')
        }

        return chosen;
    }

    public async calculateChangeSatoshis(requiredSatoshis: number, chosenOutputs: Output[]): Promise<number> {
        let input: number = 0;

        for (let utxo of chosenOutputs) {
            if (utxo._satoshis) {
                // Use trusted field
                input += utxo._satoshis;
            } else {
                // No trusted field available,
                // do RPC call to get the amount.
                input += await this.getSatoshisForUtxo(utxo);
            }
        }

        const change = requiredSatoshis - input;
        return change;
    }

    public async getSatoshisForUtxo(utxo: Output): Promise<number> {
        const vout = (await this.call('getrawtransaction', [utxo.txid, true]))
            .vout.find((vout: any) => vout.n === utxo.vout);
        return toSathoshis(vout.value);
    }
}

export const node0 = new CoreRpcService('localhost', 19792, 'rpcuser0', 'rpcpass0');
export const node1 = new CoreRpcService('localhost', 19793, 'rpcuser1', 'rpcpass1');
export const node2 = new CoreRpcService('localhost', 19794, 'rpcuser2', 'rpcpass2');

export { CoreRpcService };