import { injectable, inject, named } from 'inversify';

import { TYPES } from '../types';
import * as bitcore from 'particl-bitcore-lib';

import { Rpc, ILibrary } from '../abstract/rpc';

import { Prevout, ToBeNormalOutput, ISignature, BlindPrevout } from '../interfaces/crypto';

import { TransactionBuilder, publicKeyToAddress, getSerializedInteger } from './transaction';
import { deepSortObject } from '../hasher/hash';
import { CryptoAddress } from '../interfaces/crypto';
import { clone, fromSatoshis, log } from '../util';


export class ConfidentialTransactionBuilder extends TransactionBuilder {

    constructor(rawtx?: string) {
        super(rawtx);
    }

    /**
     * Return the utxo for the multisig prevout
     */
    public setWitness(input: Prevout, sig: ISignature): boolean {
        const prevout = this.tx.inputs.find((out, i) => {
            return input.txid === out.prevTxId.toString('hex');
        });

        prevout.setWitness([
            new Buffer(sig.signature, 'hex'),
            new Buffer(sig.pubKey, 'hex')
            // new Buffer(input._scriptPubKey, 'hex')
        ]);

        return true;
    }

    /**
     * Puzzle together the destroy witness for a bid transaction prevout.
     * @param bidPrevouts The previous outputs from the bid transaction.
     * @param seller The signatures of the seller
     * @param buyer The signatures of the buyer
     */
    public puzzleDestroyWitness(bidPrevouts: BlindPrevout[], seller: ISignature[], buyer: ISignature[]): boolean {
        this.tx.inputs.forEach((input, i) => {
            if (i === 0) { // Sellers output
                const redeemScript = bidPrevouts[0]._redeemScript;
                if (!redeemScript) { // kinda ugly, but redeemScript is optional
                    throw new Error('Missing redeemScript,');
                }
                input.setWitness([
                    new Buffer(seller[0].signature, 'hex'),
                    new Buffer(seller[0].pubKey, 'hex'),
                    new Buffer(buyer[0].signature, 'hex'),
                    new Buffer(buyer[0].pubKey, 'hex'),
                    new Buffer('00', 'hex'),
                    new Buffer(redeemScript, 'hex')
                ]);
            } else if (i === 1) {
                const redeemScript = bidPrevouts[1]._redeemScript;
                if (!redeemScript) {
                    throw new Error('Missing redeemScript,');
                }
                input.setWitness([
                    new Buffer(buyer[1].signature, 'hex'),
                    new Buffer(buyer[1].pubKey, 'hex'),
                    new Buffer(seller[1].signature, 'hex'),
                    new Buffer(seller[1].pubKey, 'hex'),
                    new Buffer('00', 'hex'),
                    new Buffer(redeemScript, 'hex')
                ]);
            }
        });

        return true;
    }

    /**
     * Puzzle together the release witness for a party from their output.
     * @param bidPrevout The previous output from the bid transaction (buyer or seller)
     * @param party The signatures of the buyer or seller
     * @param secret The secret revealed by the buyer
     */
    public puzzleReleaseWitness(bidPrevout: BlindPrevout, party: ISignature, secret: string): boolean {
        const input = this.tx.inputs.find((tmpInput) => (tmpInput.outputIndex === bidPrevout.vout));
        // console.log('secret byte length =', new Buffer(secret, 'hex').byteLength);
        if (!bidPrevout._redeemScript) {
            throw new Error('Missing redeemScript,');
        }
        input.setWitness([
            new Buffer(party.signature, 'hex'),
            new Buffer(party.pubKey, 'hex'),
            new Buffer(secret, 'hex'),
            new Buffer('01', 'hex'),
            new Buffer(bidPrevout._redeemScript, 'hex')
        ]);

        return true;
    }

    public getCommitmentForVout(vout: number): string {
        return this.tx.outputs[vout].valueCommitment.toString('hex');
    }

    public getPubKeyScriptForVout(vout: number): string {
        return this.tx.outputs[vout].script.toHex();
    }

}

/**
 * Creates a bid redeem script from public keys, a hashed secret and a seconds to lock.
 *
 * @param addressFrom
 * @param addressTo
 * @param hashedSecret
 * @param secondsToLock
 */
export function buildBidTxScript(addressFrom: CryptoAddress, addressTo: CryptoAddress, hashedSecret: string, secondsToLock: number): any {
    // commitment: string, ephem: EphemeralKey,
    const publicKeyHashFrom =  bitcore.PublicKey.fromString(addressFrom.pubKey).toAddress().hashBuffer;
    const publicKeyHashTo = bitcore.PublicKey.fromString(addressTo.pubKey).toAddress().hashBuffer;

    // create a multisig redeemScript 
    const redeemScript = bitcore.Script('OP_IF OP_SIZE 0x01 0x20 OP_EQUALVERIFY OP_SHA256')
        .add(new Buffer(hashedSecret, 'hex'))
        .add(bitcore.Script('OP_EQUALVERIFY OP_ELSE'))
        .add(getSerializedInteger(getExpectedSequence(secondsToLock))) // Sequence
        .add(178) // OP_CHECKSEQUENCEVERIFY
        .add(bitcore.Script('OP_DROP OP_DUP OP_HASH160'))
        .add(publicKeyHashFrom)
        .add(bitcore.Script('OP_EQUALVERIFY OP_CHECKSIGVERIFY OP_ENDIF OP_DUP OP_HASH160'))
        .add(publicKeyHashTo)
        .add(bitcore.Script('OP_EQUALVERIFY OP_CHECKSIG'));

    // transform into p2sh script
    // console.log('p2sh bid=', redeemScript.toScriptHashOut().toHex())
    // console.log('address bid=', bitcore.Address.payingTo(redeemScript, 'testnet').toString())
    // console.log('redeem=', redeemScript.toHex())
    return {
        address: bitcore.Address.payingTo(redeemScript, 'testnet').toString(),
        p2sh: redeemScript.toScriptHashOut().toHex(),
        redeemScript: redeemScript.toHex()
    };
}

/**
 * Gets the expected sequence value.
 * @param seconds seconds to lock for
 * Must be x * 1024 seconds, will be rounded down else.
 *
 * Note: for the value 30 seconds
 * JS returns 4194306
 * Python returns 4194305
 */
export function getExpectedSequence(seconds: number): Buffer {
    const SEQUENCE_LOCK_TIME = 2;
    const SEQUENCE_LOCKTIME_GRANULARITY = 9; // 1024 seconds
    const SEQUENCE_LOCKTIME_TYPE_FLAG = (1 << 22);
    const secondsLocked = Math.trunc(seconds / (SEQUENCE_LOCK_TIME << SEQUENCE_LOCKTIME_GRANULARITY));
    const r = (secondsLocked | SEQUENCE_LOCKTIME_TYPE_FLAG);
    // console.log('getExpectedSequence(): r = ', r)
    return <any> r;
}


/**
 * Creates a destroy script for the bid txn.
 */
export function buildDestroyTxScript(): any {
    // create a multisig redeemScript
    const redeemScript = bitcore.Script('OP_RETURN');

    // transform into p2sh script
    return {
        address: bitcore.Address.payingTo(redeemScript, 'testnet').toString(),
        p2sh: redeemScript.toScriptHashOut().toHex(),
        redeemScript: redeemScript.toHex()
    };
}

export function buildReleaseTxScript(addr: CryptoAddress): any {
    // create a multisig redeemScript
    const redeemScript = bitcore.Script.buildPublicKeyHashOut(bitcore.PublicKey.fromString(addr.pubKey).toAddress());

    // transform into p2sh script
    return {
        address: bitcore.Address.payingTo(redeemScript, 'testnet').toString(),
        p2sh: redeemScript.toScriptHashOut().toHex(),
        redeemScript: redeemScript.toHex()
    };
}
