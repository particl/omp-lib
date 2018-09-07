import { injectable, inject, named } from "inversify";
import "reflect-metadata";
import { TYPES } from "../types";
import * as bitcore  from 'particl-bitcore-lib';

import { Rpc, ILibrary } from "../abstract/rpc";

import { Output, ToBeOutput, ISignature, ToBeBlindOutput } from "../interfaces/crypto";
import { deepSortObject } from "../hasher/hash";
import { CryptoAddress } from "../interfaces/crypto";
import { clone, fromSatoshis } from "../util";


export class TransactionBuilder {
    // TODO: dynamic currency support
    // @inject(TYPES.Rpc) @named("PART") private rpc: Rpc;
    
    public tx;

    constructor(rawtx?: string) {
        this.tx = new bitcore.Transaction(rawtx)
    }
    /**
     * Add the inputs and sort them by txid (privacy).
     * https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki
     * (Taken care of by bitcore-lib in this implementation)
     * @param input input to use in the transaction.
     */
    addInput(input: Output) {
        let i = clone(input);
        i.satoshis = input._satoshis;
        i.scriptPubKey = input._scriptPubKey;

        this.tx.from(i);
    }

    /**
     * Add the 'to be outputs' and sort them by amount (privacy).
     * https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki
     * (Taken care of by bitcore-lib in this implementation)
     * @param output output created by the transaction.
     */
    addOutput(output: any) { // ToBeOutput | ToBeBlindOutput
        this.tx.addOutput(bitcore.Transaction.Output(output))
    }

    addSignature(utxo: Output, signature: ISignature) {
        let index;
        // find the relevant output and the index.
        let input = this.tx.inputs.find((input, i) => {
            const txid = input.prevTxId.toString('hex');
            const vout = input.outputIndex;
            if (utxo.txid === txid && utxo.vout === vout) {
                index = i;
                return true;
            }
        });

        if(input && signature) {
            const sigBuffer = new Buffer(signature.signature, 'hex');
            const s = {
                signature:  bitcore.crypto.Signature.fromTxFormat(sigBuffer),
                publicKey:  new bitcore.PublicKey(signature.pubKey),
                inputIndex: index,
                sigtype:    bitcore.crypto.Signature.SIGHASH_ALL
            };

            this.tx.applySignature(s);
        } else {
            console.error('Failed to add signature!');
        }
    }

    build(): string {

        return this.tx.toString();
    }

    /**
     * Creates a multisignature redeem script, combined with the amount it forms
     * and output and it adds it to this.outputs array.
     * @param satoshis the amount of satoshis this output should consume.
     * @param publicKeys the participating public keys.
     */
    public addMultisigInput(input: Output, publicKeys: string[]): Output {
        const i = {
            txid: input.txid,
            vout: input.vout,
            scriptPubKey: input._scriptPubKey,
            satoshis: input._satoshis
        };
        
        publicKeys = publicKeys.sort().map(pk => new bitcore.PublicKey(pk));
        /*const multisigInput = new bitcore.Transaction.Input.MultiSigScriptHash(input,
            publicKeys,
            2);*/

        this.tx.from(i, publicKeys, 2);

        return input;
    }

    /**
     * Creates a multisignature redeem script, combined with the amount it forms
     * and output and it adds it to this.outputs array.
     * @param satoshis the amount of satoshis this output should consume.
     * @param publicKeys the participating public keys.
     */
    public newMultisigOutput(sathosis: number, publicKeys: string[]): ToBeOutput {

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

    public newChangeOutputFor(requiredSatoshis: number, changeAddress: CryptoAddress, inputsOfSingleParty: Output[]): ToBeOutput {
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

        const utxo = this.newNormalOutput(changeAddress, change);

        return utxo;
    }

    newNormalOutput(addr: CryptoAddress, satoshis): ToBeOutput {
        // TODO: proper type checking (stealth addresses..)
        const address = bitcore.Address.fromString(addr.address);
        // TODO: use P2SH?
        const script = bitcore.Script.buildPublicKeyHashOut(address);
        const utxo = {
            script: script.toHex(),
            satoshis: satoshis
        } as ToBeOutput;

        this.addOutput(utxo);

        return utxo;
    }

    /**
     * Return the utxo for the multisig output
     */
    getMultisigUtxo(publicKeyToSignFor: string): Output {
        let utxo: Output = {
            txid: this.txid,
            vout: undefined
        }
        const prevout = this.tx.outputs.find((out, i) =>{
            // TODO: find using the exact p2sh script
            if(out.script.isScriptHashOut()) {
                utxo.vout = i,
                utxo._satoshis = out.satoshis;
                // required for signing
                utxo._scriptPubKey = out.script.toHex();
                utxo._address = publicKeyToAddress(publicKeyToSignFor)
                return true;
            }
        });

        if(!prevout){
            throw new Error('TransactionBuilder, multisignature vout not found')
        }

        return utxo;
    }

    get txid() {
        return this.tx._getHash().toString('hex').match(/../g).reverse().join("");
    }

    print() {
        let log = '------- Transaction -------\n'
                + '+++++++++++++++++++++++++++\n'

        this.tx.inputs.forEach(input => log += (input.prevTxId.toString('hex').match(/../g).reverse().join("") + ' ' + input.outputIndex + '\n'));
        log += '++++++++++++++++++++++++++++\n'
        this.tx.outputs.forEach(output => log += (output.inspect() + '\n'));
        log += ('++++++++++++++++++++++++++++\n')

        console.log(log);
        
    }

}

export function getTxidFrom(hex: string) {
    /**
     * The buffer returned by _getHash() is encoded in little endian
     * We want a big endian result, so we swap the order of the bytes per 2.
     * wrong: cc11fecbaa8f55a570572ef8f9d0fc62bc2f71eda2a073ecd9e1a1d7f920*0d*_a3_ <- inversion
     * correct: _a3_*0d*20f9d7a1e1d9ec73a0a2ed712fbc62fcd0f9f82e5770a5558faacbfe11cc
     * without the _ and *
     */
    const txid = new bitcore.Transaction(hex)._getHash().toString('hex').match(/../g).reverse().join("");
    return txid;
}

// TODO: testnet flag to mainnet
export function publicKeyToAddress(publicKey: string) {
    const pk = bitcore.PublicKey.fromString(publicKey);
    return bitcore.Address(pk, 'testnet').toString();
}