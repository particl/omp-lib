import { Output, CryptoType, ToBeOutput, CryptoAddress, ISignature } from '../interfaces/crypto';
import { TransactionBuilder } from '../transaction-builder/transaction';
import { toSatoshis, fromSatoshis } from '../util';

/**
 * The abstract class for the Rpc class.
 */
export abstract class Rpc {

    public abstract async isConnected(): Promise<boolean>;
    public abstract async getVersion(): Promise<number>;
    public abstract async call(method: string, params: any[]): Promise<any>;

    public abstract async getNewAddress(): Promise<string>;
    public abstract async getAddressInfo(address: string): Promise<any>;
    public abstract async sendRawTransaction(rawtx: string): Promise<any>;
    public abstract async getRawTransaction(txid: string, verbose?: boolean, blockhash?: string): Promise<any>;
    public abstract async listUnspent(minconf?: number, maxconf?: number, addresses?: string[], includeUnsafe?: boolean,
                                      queryOptions?: any): Promise<any>;
    public abstract async lockUnspent(unlock: boolean, outputs: Output[], permanent?: boolean): Promise<any>;
    public abstract async importAddress(address: string, label?: string, rescan?: boolean, p2sh?: boolean): Promise<boolean>;
    public abstract async createSignatureWithWallet(hex: string, prevtx: Output, address: string, sighashtype?: string): Promise<string>;

    public async getNewPubkey(): Promise<string> {
        const address = await this.getNewAddress();
        return (await this.getAddressInfo(address)).pubkey;
    }

    public async getNormalOutputs(satoshis: number): Promise<Output[]> {
        const chosen: Output[] = [];
        let chosenSatoshis = 0;

        const unspent: Output[] = await this.listUnspent(0);

        const result = unspent
            .filter((output: any) => output.spendable && output.safe)
            .find((utxo: any) => {
                    if (utxo.scriptPubKey.substring(0, 2) !== '76') {
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

                    return chosenSatoshis >= satoshis;
                }
            );

        if (chosenSatoshis < satoshis) {
            throw new Error('Not enough available output to cover the required amount.');
        }

        await this.lockUnspent(false, chosen, true);
        return chosen;
    }

    public async getSatoshisForUtxo(utxo: Output): Promise<Output> {
        const vout = (await this.getRawTransaction(utxo.txid, true))
            .vout.find((tmpVout: any) => tmpVout.n === utxo.vout);
        const utxoOmp: Output = vout;
        utxoOmp._satoshis = vout.valueSat;
        return utxoOmp;
    }

    public async importRedeemScript(script: any): Promise<boolean> {
        return await this.importAddress(script, '', false, true);
    }

    public async signRawTransactionForInputs(tx: TransactionBuilder, inputs: Output[]): Promise<ISignature[]> {
        const r: ISignature[] = [];

        // needs to synchronize, because the order needs to match
        // the inputs order.
        for (const input of inputs) {

            const hex: string = tx.build();
            let amount;
            if (input._satoshis) {
                amount = fromSatoshis(input._satoshis);
            } else {
                throw new Error('Output missing _satoshis.');
            }
            if (!input._address) {
                throw new Error('Output missing _address.');
            }

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
