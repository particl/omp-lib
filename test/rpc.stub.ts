import { injectable, inject } from "inversify";
import "reflect-metadata";

import { Rpc } from "../src/abstract/rpc";

import * as WebRequest from 'web-request';
import { Output, ToBeOutput, CryptoAddress, ISignature } from "../src/interfaces/crypto";
import { isNonNegativeNaturalNumber, isValidPrice, toSatoshis, fromSatoshis } from "../src/util";
import { TransactionBuilder } from "./transaction";


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
        return (await this.call('getaddressinfo', [address])).pubkey;
    }

    public async getNormalOutputs(reqSatoshis: number): Promise<Output[]> {
        const chosen: Array<Output> = [];
        let chosenSatoshis: number = 0;

        const unspent: Array<Output> = await this.call('listunspent', [0]);

        unspent.filter((output: any) => output.spendable && output.safe)
            .find((utxo: any) => {

                if(utxo.scriptPubKey.substring(0,2) !== '76') {
                    // only take normal outputs into account
                    return false;
                }

                chosenSatoshis += toSatoshis(utxo.amount);
                chosen.push({
                    txid: utxo.txid,
                    vout: utxo.vout,
                    _satoshis: toSatoshis(utxo.amount),
                    _scriptPubKey: utxo.scriptPubKey,
                    _address: utxo.address
                });

                if (chosenSatoshis >= reqSatoshis) {
                    return true;
                }
                return false;
            });

        if (chosenSatoshis < reqSatoshis) {
            throw new Error('Not enough available output to cover the required amount.')
        }

        await this.call('lockunspent', [false, chosen, true]);
        return chosen;
    }

    public async getSatoshisForUtxo(utxo: Output): Promise<Output> {
        const vout = (await this.call('getrawtransaction', [utxo.txid, true]))
            .vout.find((vout: any) => vout.n === utxo.vout);
        utxo._satoshis = vout.valueSat;
        return utxo;
    }
    
    public async importRedeemScript(script: any): Promise<boolean> {
       await this.call('importaddress', [script, '', false, true])
       return true;
    }

    async signRawTransactionForInputs(tx: TransactionBuilder, inputs: Output[]): Promise<ISignature[]> {
        let r: ISignature[] = [];

        // needs to synchronize, because the order needs to match
        // the inputs order.
        for(let i = 0; i < inputs.length; i++){
            const input = inputs[i];
            // console.log('signing for ', input)
            const params = [
                await tx.build(),
                {
                    txid: input.txid,
                    vout: input.vout,
                    scriptPubKey: input._scriptPubKey,
                    amount: fromSatoshis(input._satoshis)
                },
                input._address
            ];

            const sig = {
                signature: (await this.call('createsignaturewithwallet', params)),
                pubKey: (await this.call('getaddressinfo', [input._address])).pubkey
            };
            r.push(sig);
            tx.addSignature(input, sig);
            
        };

        return r;
    }

    public async sendRawTransaction(hex: string): Promise<any> {
        return (await this.call('sendrawtransaction', [hex]));

    }

}

export const node0 = new CoreRpcService('localhost', 19792, 'rpcuser0', 'rpcpass0');
export const node1 = new CoreRpcService('localhost', 19793, 'rpcuser1', 'rpcpass1');
export const node2 = new CoreRpcService('localhost', 19794, 'rpcuser2', 'rpcpass2');

export { CoreRpcService };