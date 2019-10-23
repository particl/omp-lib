import * as bitcore from 'particl-bitcore-lib';
import { Prevout, ISignature, BlindPrevout } from '../interfaces/crypto';
import { TransactionBuilder } from './transaction';
import { CryptoAddress } from '../interfaces/crypto';


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
            Buffer.from(sig.signature, 'hex'),
            Buffer.from(sig.pubKey, 'hex')
            // Buffer.from(input._scriptPubKey, 'hex')
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
        bidPrevouts.forEach((prevout, i) => {
            this.puzzleReleaseWitness(prevout, seller[i], buyer[i]);
        });

        return true;
    }

    /**
     * Puzzle together the release witness for a party from their output.
     * @param bidPrevout The previous output from the bid transaction (buyer or seller)
     * @param party The signatures of the buyer or seller
     * @param secret The secret revealed by the buyer
     */
    public puzzleReleaseWitness(bidPrevout: BlindPrevout, seller: ISignature, buyer: ISignature): boolean {
        const input = this.tx.inputs.find((tmpInput) => (tmpInput.outputIndex === bidPrevout.vout));

        if (!bidPrevout._redeemScript) {
            throw new Error('Missing redeemScript,');
        }
        input.setWitness([
            new Buffer('', 'hex'),
            new Buffer(buyer.signature, 'hex'),
            new Buffer(seller.signature, 'hex'),
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
 * @param secondsToLock
 * @param network
 */
export function buildBidTxScript(addressFrom: CryptoAddress, addressTo: CryptoAddress, secondsToLock: number, network: string): any {
    // commitment: string, ephem: EphemeralKey,
    const publicKeyFrom =  bitcore.PublicKey.fromString(addressFrom.pubKey).toDER();
    const publicKeyTo = bitcore.PublicKey.fromString(addressTo.pubKey).toDER();

    // create a multisig redeemScript
    const redeemScript = bitcore.Script('OP_2')
        .add(publicKeyTo)
        .add(publicKeyFrom)
        .add('OP_2')
        .add(bitcore.Script('OP_CHECKMULTISIG'));

    // transform into p2sh script
    // console.log('p2sh bid=', redeemScript.toScriptHashOut().toHex())
    // console.log('address bid=', bitcore.Address.payingTo(redeemScript, network).toString())
    // console.log('redeem=', redeemScript.toHex())
    return {
        address: bitcore.Address.payingTo(redeemScript, network).toString(),
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
export function getExpectedSequence(seconds: number): number {
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
export function buildDestroyTxScript(network: string): any {
    // create a multisig redeemScript
    const redeemScript = bitcore.Script('OP_RETURN');

    // transform into p2sh script
    return {
        address: bitcore.Address.payingTo(redeemScript, network).toString(),
        p2sh: redeemScript.toScriptHashOut().toHex(),
        redeemScript: redeemScript.toHex()
    };
}

export function buildReleaseTxScript(addr: CryptoAddress, network: string): any {
    // create a multisig redeemScript
    const redeemScript = bitcore.Script.buildPublicKeyHashOut(bitcore.PublicKey.fromString(addr.pubKey).toAddress());

    // transform into p2sh script
    return {
        address: bitcore.Address.payingTo(redeemScript, network).toString(),
        p2sh: redeemScript.toScriptHashOut().toHex(),
        redeemScript: redeemScript.toHex()
    };
}
