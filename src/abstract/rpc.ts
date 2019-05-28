import { Cryptocurrency, ISignature, Prevout, BlindPrevout, ToBeBlindOutput, CryptoAddress, EphemeralKey } from '../interfaces/crypto';
import { TransactionBuilder } from '../transaction-builder/transaction';
import { toSatoshis, fromSatoshis, clone } from '../util';
import { RpcAddressInfo, RpcOutput, RpcRawTx, RpcUnspentOutput, RpcVout } from '../interfaces/rpc';
import { ConfidentialTransactionBuilder } from '../transaction-builder/confidential-transaction';
import { randomBytes } from 'crypto';

// tslint:disable max-classes-per-file bool-param-default

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

/**
 * The abstract class for the Rpc class.
 */
export abstract class Rpc {

    public abstract async call(method: string, params: any[]): Promise<any>;
    public abstract async getNewAddress(): Promise<string>; // returns address
    public abstract async getAddressInfo(address: string): Promise<RpcAddressInfo>;
    public abstract async sendToAddress(address: string, amount: number, comment: string): Promise<string>; // returns txid
    public abstract async listUnspent(minconf: number): Promise<RpcUnspentOutput[]>;
    public abstract async lockUnspent(unlock: boolean, outputs: RpcOutput[], permanent: boolean): Promise<boolean>; // successful
    public abstract async importAddress(address: string, label: string, rescan: boolean, p2sh: boolean): Promise<void>; // returns nothing
    public abstract async createSignatureWithWallet(hex: string, prevtx: RpcOutput, address: string): Promise<string>; // signature
    public abstract async getRawTransaction(txid: string, verbose?: boolean): Promise<RpcRawTx>;
    public abstract async sendRawTransaction(rawtx: string): Promise<string>; // returns txid

    public async getNewPubkey(): Promise<string> {
        const address = await this.getNewAddress();
        return (await this.getAddressInfo(address)).pubkey;
    }

    // TODO: refactor this, cognitive-complexity 39
    // tslint:disable:cognitive-complexity
    public async getNormalPrevouts(reqSatoshis: number): Promise<Prevout[]> {
        const chosen: Prevout[] = [];
        // const utxoLessThanReq: number[] = [];
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
                    // } else if (toSatoshis(output.amount) < reqSatoshis) {
                    //     // utxo is less than the amount requested, so may be summable with others to get to the exact value (or within a close threshold).
                    //     utxoLessThanReq.push(outIdx);
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
            // for (let ii = 0; ii < Math.pow(2, utxoLessThanReq.length); ii++) {
            //     const selectedIdxs: number[] = utxoLessThanReq.filter((_: number, index: number) => {
            //         return ii & (1 << index);
            //     });
            //     const summed: number = toSatoshis(selectedIdxs.reduce((acc: number, idx: number) => acc + unspent[idx].amount, 0));

            //     if ((summed >= reqSatoshis) && ((summed - reqSatoshis) < (reqSatoshis / 100))) {
            //         // Sum of utxos is within a 1 percent upper margin of the requested amount.
            //         if (summed === reqSatoshis) {
            //             // Found the exact required amount.
            //             utxoIdxs = selectedIdxs;
            //             break;
            //         } else if (!utxoIdxs.length) {
            //             utxoIdxs.length = 0;
            //             utxoIdxs = selectedIdxs;
            //         }
            //     }
            // }

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
                    } as Prevout);
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
                throw new Error('Not enough available prevouts to cover the required amount.');
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
            } as Prevout);
        });
        // tslint:enable:no-for-each-push

        const success: boolean = await this.lockUnspent(false, chosen, true);
        if (!success) {
            throw new Error('Locking of unspent Outputs failed.');
        }
        return chosen;
    }

    /**
     * Fetch the rawtx and set the utxo._satoshis and utxo._scriptPubKey to the tx's matching vout's valueSat
     *
     * @param utxo
     */
    public async loadTrustedFieldsForUtxos(utxo: Prevout): Promise<Prevout> {
        const vout: RpcVout | undefined = (await this.getRawTransaction(utxo.txid))
            .vout.find((value: RpcVout) => value.n === utxo.vout);
        if (!vout
            || !vout.valueSat
            || !vout.scriptPubKey
            || !vout.scriptPubKey.hex
            || !vout.scriptPubKey.addresses || vout.scriptPubKey.addresses.length !== 1) {
            throw new Error('Transaction does not contain matching Output.');
        }
        utxo._satoshis = vout.valueSat;
        utxo._scriptPubKey = vout.scriptPubKey.hex;
        utxo._address = vout.scriptPubKey.addresses[0];
        return utxo;
    }

    public async importRedeemScript(script: string): Promise<void> {
        await this.importAddress(script, '', false, true);
    }

    /**
     * Sign a transaction and returns the signatures for an array of normal inputs.
     * @param tx the transaction to build and sign for.
     * @param inputs the _normal_ inputs to sign for.
     */
    public async signRawTransactionForInputs(tx: TransactionBuilder, inputs: Prevout[]): Promise<ISignature[]> {
        const r: ISignature[] = [];

        // needs to synchronize, because the order needs to match the inputs order.
        for (const input of inputs) {

            if (!input._satoshis) {
                throw new Error('Output missing _satoshis.');
            }
            if (!input._address) {
                throw new Error('Output missing _address.');
            }
            if (!input._scriptPubKey) {
                throw new Error('Output missing _scriptPubKey.');
            }

            const hex: string = tx.build();
            const amount: number = fromSatoshis(input._satoshis);
            const prevtx = {
                txid: input.txid,
                vout: input.vout,
                scriptPubKey: input._scriptPubKey,
                amount,
                spendable: true, // ts lint
                safe: true      // ts lint
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

/**
 * The abstract class for the Confidential Transactions Rpc.
 */
export abstract class CtRpc extends Rpc {

    // to add support for another coin, the abstract methods below need to be implemented
    // example implementations in test/rpc.stub.ts and rpc-ct.stub.ts

    // WALLET - generating keys, addresses.
    public abstract async getNewStealthAddress(): Promise<CryptoAddress>;
    // todo: enum for typeIn/typeOut
    public abstract async sendTypeTo(typeIn: string, typeOut: string, outputs: RpcBlindSendToOutput[]): Promise<string>;

    // Retrieving information of prevouts
    public abstract async listUnspentBlind(minconf: number): Promise<RpcUnspentOutput[]>;

    public abstract async getBlindPrevouts(type: string, satoshis: number, blind?: string): Promise<BlindPrevout[]>;
    // public abstract async getLastMatchingBlindFactor(prevouts: Prevout[] | ToBeBlindOutput[], outputs: ToBeBlindOutput[]): Promise<string>;

    // Importing and signing
    // public abstract async signRawTransactionForBlindInputs(tx: TransactionBuilder, inputs: BlindPrevout[], sx?: CryptoAddress): Promise<ISignature[]>;
    public abstract async verifyCommitment(commitment: string, blindFactor: string, amount: number): Promise<boolean>;

    public abstract async createRawTransaction(inputs: BlindPrevout[], outputs: any[]): Promise<any>;


    public async createBlindPrevoutFrom(type: string, satoshis: number, blind?: string): Promise<BlindPrevout> {
        let prevout: BlindPrevout;
        const sx = await this.getNewStealthAddress();
        const amount = fromSatoshis(satoshis);

        if (!blind) {
            // TODO(security): random!
            blind = this.getRandomBlindFactor();
        }

        const txid = await this.sendTypeTo(type, 'blind', [{ address: sx.address, amount, blindingfactor: blind}]);
        const unspent: RpcUnspentOutput[] = await this.listUnspentBlind(0);

        console.log('OMP_LIB: looking for txid: ' + txid + ', amount: ' + fromSatoshis(satoshis));
        const found = unspent.find(tmpVout => {
            console.log('OMP_LIB: tmpVout.txid: ' + tmpVout.txid + ', tmpVout.amount: ' + tmpVout.amount);
            return (tmpVout.txid === txid && tmpVout.amount === fromSatoshis(satoshis));
        });

        if (!found) {
            throw new Error('Not enough blind inputs!');
        }

        // Retrieve the commitment from the transaction
        // TODO: use bitcorelib for this
        const tx: RpcRawTx = await this.getRawTransaction(txid);
        const vout: RpcVout | undefined = tx.vout.find(i => i.n === found.vout);

        if (!vout) {
            throw new Error('Could not find matching vout from transaction.');
        }

        prevout = {
            txid: found.txid,
            vout: found.vout,
            _commitment: vout.valueCommitment,
            _satoshis: toSatoshis(found.amount),
            _scriptPubKey: found.scriptPubKey,
            _address: found.address,
            blindFactor: blind
        } as BlindPrevout;

        // Permanently lock the unspent output
        await this.lockUnspent(false, [prevout], true);

        return prevout;
    }

    /**
     * Load a set of trusted fields for a blind (u)txo.
     * also validates the satoshis entered in the utxo against the commitment!
     * @param utxo the output to load the fields for.
     */
    public async loadTrustedFieldsForBlindUtxo(utxo: BlindPrevout): Promise<BlindPrevout> {
        console.log('OMP_LIB: loadTrustedFieldsForBlindUtxo, utxo: ', JSON.stringify(utxo, null, 2));

        const tx: RpcRawTx = await this.getRawTransaction(utxo.txid);
        const found: RpcVout | undefined = tx.vout.find(i => i.n === utxo.vout);

        if (!found) {
            console.error('Could not find matching vout from transaction.');
            throw new Error('Could not find matching vout from transaction.');
        }
        if (!found.valueCommitment) {
            console.error('Missing vout valueCommitment.');
            throw new Error('Missing vout valueCommitment.');
        }
        if (!utxo.blindFactor) {
            console.error('Could not find matching vout from transaction.');
            throw new Error('Could not find matching vout from transaction.');
        }
        if (!utxo._satoshis) {
            console.error('Could not find matching vout from transaction.');
            throw new Error('Could not find matching vout from transaction.');
        }

        const commitment = found.valueCommitment;
        const scriptPubKey = found.scriptPubKey.hex;
        const address = found.scriptPubKey.addresses[0];

        const ok = await this.verifyCommitment(commitment, utxo.blindFactor, utxo._satoshis);
        if (!ok) {
            console.error('Commitment is not matching amount or blindfactor.');
            throw new Error('Commitment is not matching amount or blindfactor.');
        }

        utxo._commitment = commitment;
        utxo._scriptPubKey = scriptPubKey;
        utxo._address = address;
        return utxo;
    }

    public async generateRawConfidentialTx(inputs: any[], outputs: ToBeBlindOutput[], feeSatoshis: number): Promise<string> {

        // Already a cloned object, rename fields to fit createrawparttransaction
        // inputs.forEach((prevout: any) => { prevout.amount_commitment = prevout._commitment; prevout.blindingfactor = prevout.blindFactor; });

        // Sort the outputs so buyer and seller
        // have a randomize order
        // outs.sort(); // TODO(security): sort using pubkey

        const inps: RpcBlindInput[] = inputs.map((prevout: BlindPrevout) => {

            if (!prevout._scriptPubKey || !prevout.blindFactor) {
                throw new Error();
            }
            const i = {
                txid: prevout.txid,
                vout: prevout.vout,
                type: 'blind',
                scriptPubKey: prevout._scriptPubKey,
                amount_commitment: prevout._commitment, // fromSatoshis(prevout._satoshis),
                blindingfactor: prevout.blindFactor
            };

            if (prevout._redeemScript) {
                (<any> i).redeemScript = prevout._redeemScript;
            }

            if (prevout._sequence) {
                (<any> i).sequence = prevout._sequence;
            }

            return i;
        });

        let outs: RpcBlindOrFeeBase[] = outputs.map((out: ToBeBlindOutput) => {

            const o = {
                type: out._type || 'blind',
                amount: fromSatoshis(out._satoshis),
                rangeproof_params: {
                    ct_exponent: 2,
                    ct_bits: 32,
                    min_value: 0
                }
            };

            // Stealth address with pubkey and ephemeral chosen upfront (bidtxn)
            if (out.address && out.address.pubKey && out.address.ephem && out.address.ephem.private) {
                // Only used for rangeproof, blinding, etc.
                // Is not used to build an output script!
                (<any> o).pubkey = out.address.pubKey;
                (<any> o).ephemeral_key = out.address.ephem.private;
            }

            if (out._address) {
                (<any> o).address = out._address;
            } else if (out._redeemScript) {
                (<any> o).script = out._redeemScript;
            } else if (out.address) {
                // Actually use the (stealth address) as output script
                (<any> o).address = out.address.address;
            } else {
                throw new Error('generateRawConfidentialTx(): output must contain atleast an address or a script, out = ' + out);
            }

            if (out.blindFactor) {
                (<any> o).blindingfactor = out.blindFactor;
            }

            if (out._nonce) {
                (<any> o).nonce = out._nonce;
            }

            if (out._data) {
                (<any> o).data = out._data;
            }

            return o;
        });

        // Add the CT fee output
        outs = [{
            // DATA prevout!
            type: 'data',
            data_ct_fee: fromSatoshis(feeSatoshis),
            amount: 0
        } as RpcBlindOrFeeBase].concat(outs);

        const tx = (await this.call('createrawparttransaction', [inps, outs]));
        const rawtx = tx.hex;

        return rawtx;
    }

    public async getNewStealthAddressWithEphem(sx?: CryptoAddress): Promise<CryptoAddress> {
        if (!sx) {
            sx = await this.getNewStealthAddress();
        } else {
            sx = clone(sx) as CryptoAddress;
        }

        const info = await this.call('derivefromstealthaddress', [sx.address]);
        sx.pubKey = info.pubkey;
        sx.ephem = {
            public: info.ephemeral_pubkey,
            private: info.ephemeral_privatekey
        } as EphemeralKey;
        return sx;
    }

    public async getPubkeyForStealthWithEphem(sx: CryptoAddress): Promise<CryptoAddress> {
        if (!sx.ephem) {
            throw new Error('Missing EphemeralKey.');
        }

        const info = await this.call('derivefromstealthaddress', [sx.address, sx.ephem.private]);
        sx.pubKey = info.pubkey;
        return sx;
    }

    public getRandomBlindFactor(): string {
        return randomBytes(32).toString('hex');
    }

    public async getLastMatchingBlindFactor(inputs: (Array<{ blindFactor: string; }>), outputs: ToBeBlindOutput[]): Promise<string> {
        const inp = inputs.map(i => i.blindFactor);
        let out = outputs.map(i => i.blindFactor);

        if (!out) {
            out = [];
        }
        // If no other outputs, then push a fake input and output
        // they will be added and substracted and not affect anything.
        if (out.length === 0) {
            const blindFactor = this.getRandomBlindFactor();
            out.push(blindFactor);
            inp.push(blindFactor);
        }
        const b = (await this.call('generatematchingblindfactor', [inp, out])).blind;
        // console.log('generated b =', b);
        return b;
    }

    public async signRawTransactionForBlindInputs(tx: ConfidentialTransactionBuilder, inputs: BlindPrevout[], sx?: CryptoAddress): Promise<ISignature[]> {
        const r: ISignature[] = [];

        // log("signing for rawtx with blind innputs" + tx.txid)
        // needs to synchronize, because the order needs to match
        // the inputs order.
        for (const input of inputs) {
            let sig;

            // If not a stealth address, sign with key in wallet.
            if (!sx) {
                const params = [
                    tx.build(),
                    {
                        txid: input.txid,
                        vout: input.vout,
                        scriptPubKey: input._scriptPubKey,
                        amount_commitment: input._commitment
                    },
                    input._address
                ];

                sig = {
                    signature: (await this.call('createsignaturewithwallet', params)),
                    pubKey: (await this.call('getaddressinfo', [input._address])).pubkey
                };
            } else {
                // If it's a stealth address, derive the key and sign for it.
                // TODO: verify sx type
                if (!sx.ephem || !sx.ephem.public) {
                    throw new Error('Missing ephemeral (public key) for stealth address.');
                }
                const derived = (await this.call('derivefromstealthaddress', [sx.address, sx.ephem.public]));
                const params = [
                    tx.build(),
                    {
                        txid: input.txid,
                        vout: input.vout,
                        scriptPubKey: input._scriptPubKey,
                        amount_commitment: input._commitment,
                        redeemScript: input._redeemScript
                    },
                    derived.privatekey
                ];

                sig = {
                    signature: (await this.call('createsignaturewithkey', params)),
                    pubKey: derived.pubkey
                };
            }

            r.push(sig);
            // console.log('signRawTransactionForBlindInputs(): txid= ', tx.txid);
            // console.log('signRawTransactionForBlindInputs(): signing for ', input)
            // console.log('signRawTransactionForBlindInputs(): sig ', sig)

            // If a stealth address is provided, we assume that were signing/spending
            // from a bid txn with a more complicated witness stack (cfr puzzleWitness())
            if (!sx) {
                tx.setWitness(input, sig);
            }
        }

        return r;
    }

}

export type ILibrary = (parent: Cryptocurrency, isCt?: boolean) => (Rpc | CtRpc);


