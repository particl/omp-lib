import { injectable, inject, named } from "inversify";

import { TYPES } from "../types";
import * as bitcore  from 'particl-bitcore-lib';

import { Rpc, ILibrary } from "../abstract/rpc";

import { Output, ToBeOutput, ISignature, BlindOutput } from "../interfaces/crypto";

import { TransactionBuilder, publicKeyToAddress } from "./transaction"
import { deepSortObject } from "../hasher/hash";
import { CryptoAddress } from "../interfaces/crypto";
import { clone, fromSatoshis } from "../util";


export class MadTransactionBuilder extends TransactionBuilder {
 
    constructor(rawtx?: string) {
        super(rawtx);
    }

    /**
     * Adds a blind input.
     */
    public addBlindInput(input: BlindOutput): BlindOutput {
        let i = clone(input);
        i.valueCommitment = input._commitment;
        i.scriptPubKey = input._scriptPubKey;

        this.tx.from(i);

        return input;
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
            throw new Error('MadTransactionBuilder, multisignature vout not found')
        }

        return utxo;
    }

    /**
     * Creates a bid redeem script from public keys, a hashed secret and a seconds to lock.
     * @param publicKeys the participating public keys.
     */
    public buildBidTxScript(publicKeys: string[], hashedSecret: string, secondsToLock: number): any {
        // commitment: string, ephem: string, 
        const sec = this.getExpectedSequence(secondsToLock).toString(16); // hex value

        // create a multisig redeemScript
        let redeemScript = bitcore.Script('OP_IF OP_SIZE 0x01 0x20 OP_EQUALVERIFY OP_SHA256')
        .add(new Buffer(hashedSecret, 'hex'))
        .add('OP_EQUALVERIFY OP_ELSE')
        .add('0x20') // TODO: use seconds instead of hardcoded blocks
        .add(178) // OP_CHECKSEQUENCEVERIFY
        .add('OP_DROP OP_DUP OP_HASH160')
        .add(new Buffer(publicKeys[0], 'hex'))
        .add('OP_EQUALVERIFY OP_CHECKSIG_VERIFY OP_ENDIF OP_DUP OP_HASH160')
        .add(new Buffer(publicKeys[1], 'hex'))
        .add('OP_EQUALVERIFY OP_CHECKSIG')

        // console.log('--- mad mpa_accept redeemscript ----');
        // console.log(redeemScript.toHex());

        // transform into p2sh script
        return {
            p2sh: redeemScript.toScriptHashOut(),
            redeemScript: redeemScript.toHex()
        }
    }

    private getExpectedSequence(seconds: number) {
        const SEQUENCE_LOCK_TIME = 2;
        const SEQUENCE_LOCKTIME_GRANULARITY = 9; // 1024 seconds
        const SEQUENCE_LOCKTIME_TYPE_FLAG = (1 << 22);
        const secondsLocked = Math.trunc(seconds / (SEQUENCE_LOCK_TIME << SEQUENCE_LOCKTIME_GRANULARITY));
        const r =  (secondsLocked | SEQUENCE_LOCKTIME_TYPE_FLAG);
        console.log('getExpectedSequence(): r = ', r)
        return r;
    }


}