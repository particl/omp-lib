import { injectable, inject, named } from "inversify";
import "reflect-metadata";
import { TYPES } from "../src/types";
import * as bitcore  from 'particl-bitcore-lib';

import { Rpc, ILibrary } from "../src/abstract/rpc";

import { Output, ToBeOutput } from "../src/interfaces/crypto";
import { deepSortObject } from "../src/hasher/hash";
import { CryptoAddress } from "../src/interfaces/crypto";




export class TransactionBuilder {
    // TODO: dynamic currency support
    // @inject(TYPES.Rpc) @named("PART") private rpc: Rpc;
    private inputs: Output[] = [];
    private outputs: ToBeOutput[] = [];

    /**
     * Add the inputs and sort them by txid (privacy).
     * https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki
     * @param input input to use in the transaction.
     */
    addInput(input: Output) {
        this.inputs.push(input);
        this.inputs.sort(this.sortInputsByTxid);
    }
    private sortInputsByTxid(a: Output, b: Output) {
        if (a.txid > b.txid) {
            return 1
        } else if (b.txid > a.txid) {
            return -1
        }
        return 0;
    }

    /**
     * Add the 'to be outputs' and sort them by amount (privacy).
     * https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki
     * TODO: equal amounts, sort by lexo & pubkey
     * @param output output created by the transaction.
     */
    addOutput(output: ToBeOutput) {
        this.outputs.push(output);
        this.outputs.sort(this.sortOutputsByAmount);
    }
    private sortOutputsByAmount(a: ToBeOutput, b: ToBeOutput) {
        if (a.satoshis > b.satoshis) {
            return 1
        } else if (b.satoshis > a.satoshis) {
            return -1
        }
        return 0;
    }

    async build(): Promise<string> {
        const inputs = this.inputs.map((i: any) => {
            i.satoshis = i._satoshis;
            i.scriptPubKey = i._scriptPubKey;
            return i;
        });


        // add inputs
        const tx = new bitcore.Transaction()
            .from(inputs)
            //.fee(this.fee());

        // add outputs
        this.outputs.forEach(out => tx.addOutput(bitcore.Transaction.Output(out)));

        // for each input
        tx.inputs.forEach((publicKeyHashInput, i) => {
            const txid = publicKeyHashInput.prevTxId.toString('hex');
            const vout = publicKeyHashInput.outputIndex;

            const input = this.inputs.find((i) => (i.txid === txid && i.vout === vout));

            if(!input) {
                // no input found, return
                return;
            } else if(input._signature) {
                const signature = {
                    signature:  bitcore.crypto.Signature.fromString(input._signature.signature),
                    publicKey:  new bitcore.PublicKey(input._signature.pubKey),
                    inputIndex: i,
                    sigtype:    bitcore.crypto.Signature.SIGHASH_ALL
                };
                tx.applySignature(signature);
            }
        });

        return tx.toString();
    }

    /**
     * Creates a multisignature redeem script, combined with the amount it forms
     * and output and it adds it to this.outputs array.
     * @param satoshis the amount of satoshis this output should consume.
     * @param publicKeys the participating public keys.
     */
    public async newMultisigOutput(sathosis: number, publicKeys: string[]): Promise<ToBeOutput> {

        publicKeys = publicKeys.sort().map(pk => new bitcore.PublicKey(pk));
 
        // create a multisig redeemScript
        const redeemScript = bitcore.Script.buildMultisigOut(publicKeys, publicKeys.length);
        // transform into p2sh script
        const p2shScript = redeemScript.toScriptHashOut();

        /*
        console.log('--- mpa_accept redeemscript ----');
        console.log(redeemScript.toString());
        console.log(redeemScript.toHex());

        console.log('--- mpa_accept p2sh of redeemscript ----');
        console.log(script.toString());
        */

        const multisigOutput = {
            script: p2shScript.toHex(),
            _redeemScript: redeemScript.toHex(),
            satoshis: sathosis
        };

        this.addOutput(multisigOutput);

        return multisigOutput;
    }

    public async newChangeOutputFor(requiredSatoshis: number, changeAddress: CryptoAddress, inputsOfSingleParty: Output[]): Promise<ToBeOutput> {
        let input: number = 0;

        for (let utxo of inputsOfSingleParty) {
            if (utxo._satoshis) {
                // Use trusted field
                input += utxo._satoshis;
            } else {
                throw new Error('No trusted field for the amount was found.')
            }
        }

        const change =  input - requiredSatoshis;

        // no change at all, don't add inputs
        if(change === 0) {
            return undefined;
        }

        // TODO: proper type checking (stealth addresses..)
        const address = bitcore.Address.fromString(changeAddress.address);
        const script = bitcore.Script.buildPublicKeyHashOut(address);
        const utxo = {
            script: script.toHex(),
            satoshis: change
        } as ToBeOutput;

        this.addOutput(utxo);

        return utxo;
    }

    fee(): number {
        const sumInputs = this.inputs.reduce((accumulator, currentValue) => accumulator + currentValue._satoshis, 0);
        const sumOutputs = this.outputs.reduce((accumulator, currentValue) => accumulator + currentValue.satoshis, 0);
        const fee = sumInputs - sumOutputs;

        // TODO(security): throw an error if the fee is negative.
        return fee;
    }

    print() {
        let log = '------- Transaction -------\n'
                + '+++++++++++++++++++++++++++\n'

        this.inputs.forEach(input => log += (input.txid + ' ' + input.vout + '      ' + input._satoshis + '\n'));
        log += '++++++++++++++++++++++++++++\n'
        this.outputs.forEach(output => log += (output.script.substring(0, 64) +  '...      ' + output.satoshis + '\n'));
        log += ('++++++++++++++++++++++++++++\n')
        log += ('fee = ' + this.fee()  + '\n');

        console.log(log);
        
    }

}
