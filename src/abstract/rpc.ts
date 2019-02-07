import { Output, CryptoType, ISignature } from '../interfaces/crypto';
import { TransactionBuilder } from '../transaction-builder/transaction';
import { toSatoshis, fromSatoshis } from '../util';

/*
 * Interfaces which the Rpc class needs to implement
 */
export interface RpcAddressInfo {
    pubkey: string;
}

export interface RpcRawTx {
    txid: string;
    vout: RpcVout[];
}

export interface RpcVout {
    valueSat: number;
    n: number;
    scriptPubKey: RpcScriptPubKey;
}

export interface RpcScriptPubKey {
    hex: string;
}

export interface RpcOutput {
    txid: string;
    vout: number;
}

export interface RpcUnspentOutput extends RpcOutput {
    spendable: boolean;
    safe: boolean;
    scriptPubKey: string;
    amount: number;
}

/**
 * The abstract class for the Rpc class.
 */
export abstract class Rpc {

    protected _host: string;
    protected _port: number;
    protected _user: string;
    protected _password: string;

    protected constructor(host: string, port: number, user: string, password: string) {
        this._host = host;
        this._port = port;
        this._user = user;
        this._password = password;
    }

    public abstract async call(method: string, params: any[]): Promise<any>;

    public abstract async getNewAddress(): Promise<string>;
    public abstract async getAddressInfo(address: string): Promise<RpcAddressInfo>;
    public abstract async sendToAddress(address: string, amount: number, comment: string): Promise<string>;
    public abstract async getRawTransaction(txid: string): Promise<RpcRawTx>;
    public abstract async sendRawTransaction(rawtx: string): Promise<string>;
    public abstract async listUnspent(minconf: number): Promise<RpcUnspentOutput[]>;
    public abstract async lockUnspent(unlock: boolean, outputs: RpcOutput[], permanent: boolean): Promise<boolean>;
    public abstract async importAddress(address: string, label: string, rescan: boolean, p2sh: boolean): Promise<void>;
    public abstract async createSignatureWithWallet(hex: string, prevtx: Output, address: string): Promise<string>;

    public async getNewPubkey(): Promise<string> {
        const address = await this.getNewAddress();
        return (await this.getAddressInfo(address)).pubkey;
    }

    // TODO: refactor this, cognitive-complexity 39
    // tslint:disable:cognitive-complexity
    public async getNormalOutputs(reqSatoshis: number): Promise<Output[]> {
        const chosen: Output[] = [];
        const utxoLessThanReq: number[] = [];
        let exactMatchIdx = -1;
        let maxOutputIdx = -1;
        let chosenSatoshis = 0;
        const defaultIdxs: number[] = [];

        const unspent: RpcUnspentOutput[] = await this.listUnspent(0);

        const filtered = unspent.filter(
            (output: RpcUnspentOutput, outIdx: number) => {
                if (output.spendable && output.safe && (output.scriptPubKey.substring(0, 2) === '76')) {
                    if ((exactMatchIdx === -1) && ((toSatoshis(output.amount) - reqSatoshis) === 0)) {
                        // Found a utxo with amount that is an exact match for the requested value.
                        exactMatchIdx = outIdx;
                    } else if (toSatoshis(output.amount) < reqSatoshis) {
                        // utxo is less than the amount requested, so may be summable with others to get to the exact value (or within a close threshold).
                        utxoLessThanReq.push(outIdx);
                    }

                    // Get the max utxo amount in case an output needs to be split
                    if (maxOutputIdx === -1) {
                        maxOutputIdx = outIdx;
                    } else if (unspent[maxOutputIdx].amount < output.amount) {
                        maxOutputIdx = outIdx;
                    }

                    // Sum up output amounts for the default case
                    if (chosenSatoshis < reqSatoshis) {
                        chosenSatoshis += toSatoshis(output.amount);
                        defaultIdxs.push(outIdx);
                    }

                    return true;
                }
                return false;
            }
        );

        let utxoIdxs: number[] = [];
        // Step 1: Check whether an exact match was found.
        if (exactMatchIdx === -1) {
            // No exact match found, so...
            //  ... Step 2: Sum utxos to find a summed group that matches exactly or is greater than the requried amount by no more than 1%.
            for (let ii = 0; ii < Math.pow(2, utxoLessThanReq.length); ii++) {
                const selectedIdxs: number[] = utxoLessThanReq.filter((_: number, index: number) => {
                    return ii & (1 << index);
                });
                const summed: number = toSatoshis(selectedIdxs.reduce((acc: number, idx: number) => acc + unspent[idx].amount, 0));

                if ((summed >= reqSatoshis) && ((summed - reqSatoshis) < (reqSatoshis / 100))) {
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

            // ... Step 3: If no summed values found, attempt to split a large enough output.
            if (utxoIdxs.length === 0 && maxOutputIdx !== -1 && toSatoshis(unspent[maxOutputIdx].amount) > reqSatoshis) {
                const newAddr = await this.getNewAddress();
                const txid: string = await this.sendToAddress(newAddr, fromSatoshis(reqSatoshis), 'Split output');
                const txData: RpcRawTx = await this.getRawTransaction(txid);
                const outData: RpcVout | undefined = txData.vout.find(outObj => outObj.valueSat === reqSatoshis);
                if (outData) {
                    chosen.push({
                        txid: txData.txid,
                        vout: outData.n,
                        _satoshis: outData.valueSat,
                        _scriptPubKey: outData.scriptPubKey.hex,
                        _address: newAddr
                    } as Output);
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
                throw new Error('Not enough available output to cover the required amount.');
            }
        }

        // TODO: dont use array.push inside array.forEach
        // tslint:disable:no-for-each-push
        utxoIdxs.forEach(utxoIdx => {
            const utxo: any = unspent[utxoIdx];
            chosen.push({
                txid: utxo.txid,
                vout: utxo.vout,
                _satoshis: toSatoshis(utxo.amount),
                _scriptPubKey: utxo.scriptPubKey,
                _address: utxo.address
            });
        });
        // tslint:enable:no-for-each-push

        const success: boolean = await this.lockUnspent(false, chosen, true);
        if (!success) {
            throw new Error('Locking of unspent Outputs failed.');
        }
        return chosen;
    }

    /**
     * Fetch the rawtx and set the utxo._satoshis to the tx's matching vout's valueSat
     *
     * @param utxo
     */
    public async getSatoshisForUtxo(utxo: Output): Promise<Output> {
        const vout: RpcVout | undefined = (await this.getRawTransaction(utxo.txid))
            .vout.find((value: RpcVout) => value.n === utxo.vout);
        if (!vout) {
            throw new Error('Transaction does not contain matching Output.');
        }
        utxo._satoshis = vout.valueSat;
        return utxo;
    }

    public async importRedeemScript(script: string): Promise<void> {
        await this.importAddress(script, '', false, true);
    }

    public async signRawTransactionForInputs(tx: TransactionBuilder, inputs: Output[]): Promise<ISignature[]> {
        const r: ISignature[] = [];

        // needs to synchronize, because the order needs to match the inputs order.
        for (const input of inputs) {

            if (!input._satoshis) {
                throw new Error('Output missing _satoshis.');
            }
            if (!input._address) {
                throw new Error('Output missing _address.');
            }

            const hex: string = tx.build();
            const amount: number = fromSatoshis(input._satoshis);
            const prevtx = {
                txid: input.txid,
                vout: input.vout,
                scriptPubKey: input._scriptPubKey,
                amount
            };

            const signature: string = await this.createSignatureWithWallet(hex, prevtx, input._address);
            const pubKey: string = (await this.getAddressInfo(input._address)).pubkey;
            const sig = {
                signature,
                pubKey
            };
            r.push(sig);
            tx.addSignature(input, sig);
        }
        return r;
    }

}

export type ILibrary = (parent: CryptoType) => Rpc;
