import { injectable } from "inversify";
import "reflect-metadata";

import { Rpc } from "../src/abstract/rpc";

import * as WebRequest from 'web-request';
import { Prevout, ISignature } from "../src/interfaces/crypto";
import { toSatoshis, fromSatoshis, asyncMap, asyncForEach, clone } from "../src/util";
import { TransactionBuilder } from '../src/transaction-builder/transaction';

@injectable()
class CoreRpcService implements Rpc {

    private RPC_REQUEST_ID = 1;
    private DEBUG = true;

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

    public async getNewAddress(): Promise<string> {
        return await this.call('getnewaddress');
    }

    public async getNewPubkey(): Promise<string> {
        const address = await this.getNewAddress();
        return (await this.call('getaddressinfo', [address])).pubkey;
    }

    public async getNormalPrevouts(reqSatoshis: number): Promise<Prevout[]> {
        const chosen: Array<Prevout> = [];
        let utxoLessThanReq: Array<number> = [];
        let exactMatchIdx: number = -1;
        let maxPrevoutIdx: number = -1;
        let chosenSatoshis: number = 0;
        const defaultIdxs: Array<number> = [];

        const unspent: Array<Prevout> = await this.call('listunspent', [0]);

        unspent.filter(
            (prevout: any, outIdx: number) => {
                if (prevout.spendable && prevout.safe && (prevout.scriptPubKey.substring(0, 2) === '76') ) {
                    if ( (exactMatchIdx === -1) && ((toSatoshis(prevout.amount) - reqSatoshis) === 0)) {
                        // Found a utxo with amount that is an exact match for the requested value.
                        exactMatchIdx = outIdx;
                    } else if (toSatoshis(prevout.amount) < reqSatoshis) {
                        // utxo is less than the amount requested, so may be summable with others to get to the exact value (or within a close threshold).
                        utxoLessThanReq.push(outIdx);
                    }

                    // Get the max utxo amount in case an prevout needs to be split
                    if (maxPrevoutIdx === -1) {
                        maxPrevoutIdx = outIdx;
                    } else if (unspent[maxPrevoutIdx].amount < prevout.amount){
                        maxPrevoutIdx = outIdx;
                    }

                    // Sum up prevout amounts for the default case
                    if (chosenSatoshis < reqSatoshis) {
                        chosenSatoshis += toSatoshis(prevout.amount);
                        defaultIdxs.push(outIdx);
                    }

                    return true;
                }
                return false;
            }
        );

        let utxoIdxs: Array<number> = [];
        // Step 1: Check whether an exact match was found.
        if (exactMatchIdx === -1) {
            // No exact match found, so...
            //  ... Step 2: Sum utxos to find a summed group that matches exactly or is greater than the requried amount by no more than 1%.
            for (let ii: number = 0; ii < Math.pow(2, utxoLessThanReq.length); ii++) {
                const selectedIdxs: Array<number> = utxoLessThanReq.filter((_: number, index: number) => { return ii & (1 << index); });
                const summed: number = toSatoshis(selectedIdxs.reduce((acc: number, idx: number) => acc + unspent[idx].amount, 0));

                if ((summed >= reqSatoshis) && ((summed - reqSatoshis) < (reqSatoshis / 100)) ) {
                    // Sum of utxos is within a 1 percent upper margin of the requested amount.
                    if (summed === reqSatoshis) {
                        // Found the exact required amount.
                        utxoIdxs = selectedIdxs;
                        break;
                    } else if (!utxoIdxs.length) {
                        utxoIdxs.length = 0;
                        utxoIdxs = selectedIdxs;
                    }
                }
            }

            // ... Step 3: If no summed values found, attempt to split a large enough prevout.
            if (utxoIdxs.length === 0 && maxPrevoutIdx !== -1 && toSatoshis(unspent[maxPrevoutIdx].amount) > reqSatoshis) {
                const newAddr = await this.call('getnewaddress', []);
                const txid: string = await this.call('sendtoaddress', [newAddr, fromSatoshis(reqSatoshis), 'Split prevout']);
                const txData: any = await this.call('getrawtransaction', [txid, true]);
                const outData: any = txData.vout.find( outObj => outObj.valueSat === reqSatoshis );
                if (outData) {
                    chosen.push({
                        txid: txData.txid,
                        vout: outData.n,
                        _satoshis: outData.valueSat,
                        _scriptPubKey: outData.scriptPubKey.hex,
                        _address: newAddr
                    });
                }
            }
        } else {
            // Push the exact match.
            utxoIdxs.push(exactMatchIdx);
        }

        // Step 4: Default to the summed utxos if no other method was successful
        if (!chosen.length && !utxoIdxs.length) {
            if (chosenSatoshis >= reqSatoshis) {
                utxoIdxs = defaultIdxs;
            } else {
                throw new Error('Not enough available prevout to cover the required amount.');
            }
        }

        utxoIdxs.forEach( utxoIdx => {
            const utxo: any = unspent[utxoIdx];
            chosen.push({
                txid: utxo.txid,
                vout: utxo.vout,
                _satoshis: toSatoshis(utxo.amount),
                _scriptPubKey: utxo.scriptPubKey,
                _address: utxo.address
            });
        });

        await this.call('lockunspent', [false, chosen, true]);
        return chosen;
    }

    public async getSatoshisForUtxo(utxo: Prevout): Promise<Prevout> {
        const vout = (await this.call('getrawtransaction', [utxo.txid, true]))
            .vout.find((vout: any) => vout.n === utxo.vout);
        utxo._satoshis = vout.valueSat;
        return utxo;
    }

    public async importRedeemScript(script: any): Promise<boolean> {
       await this.call('importaddress', [script, '', false, true])
       return true;
    }

    /**
     * Sign a transaction and returns the signatures for an array of normal inputs.
     * @param tx the transaction to build and sign for.
     * @param inputs the _normal_ inputs to sign for.
     */
    async signRawTransactionForInputs(tx: TransactionBuilder, inputs: Prevout[]): Promise<ISignature[]> {
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

    /**
     * Permanently locks outputs until unlocked or spent.
     * @param prevout an array of outputs to lock
     */
    public async lockUnspent(prevout: Prevout[]): Promise<boolean> {
        return this.call('lockunspent', [false, prevout, true]);
    }

    /**
    * Send a raw transaction to the network, returns txid.
    * @param hex the raw transaction in hex format. 
    */
    public async sendRawTransaction(hex: string): Promise<string> {
        return (await this.call('sendrawtransaction', [hex]));

    }

}

export const node0 = new CoreRpcService('localhost', 19792, 'rpcuser0', 'rpcpass0');
export const node1 = new CoreRpcService('localhost', 19793, 'rpcuser1', 'rpcpass1');
export const node2 = new CoreRpcService('localhost', 19794, 'rpcuser2', 'rpcpass2');

export { CoreRpcService };