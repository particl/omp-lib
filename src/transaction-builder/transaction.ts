import 'reflect-metadata';
import * as bitcore from 'particl-bitcore-lib';
import { Prevout, ToBeOutput, ToBeNormalOutput, ISignature } from '../interfaces/crypto';
import { CryptoAddress } from '../interfaces/crypto';
import { clone } from '../util';

export class TransactionBuilder {
    // TODO: dynamic currency support
    // @inject(TYPES.Rpc) @named("PART") private rpc: Rpc;

    protected tx: bitcore.Transaction;

    constructor(rawtx?: string) {
        this.tx = new bitcore.Transaction(rawtx);
    }

    /**
     * Add the inputs and sort them by txid (privacy).
     * https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki
     * (Taken care of by bitcore-lib in this implementation)
     * @param input input to use in the transaction.
     */
    public addInput(input: Prevout): TransactionBuilder {
        const i = clone(input);
        i.satoshis = input._satoshis;
        i.scriptPubKey = input._scriptPubKey;
        this.tx.from(i);
        return this;
    }

    /**
     * Add the 'to be prevouts' and sort them by amount (privacy).
     * https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki
     * (Taken care of by bitcore-lib in this implementation)
     * @param prevout prevout created by the transaction.
     */
    public addOutput(prevout: ToBeOutput): TransactionBuilder { // ToBeOutput | ToBeBlindPrevout
        this.tx.addOutput(bitcore.Transaction.Output(prevout));
        return this;
    }

    /**
     *
     * @param utxo
     * @param signature
     */
    public addSignature(utxo: Prevout, signature: ISignature): TransactionBuilder {

        // find the relevant output index.
        const inputIndex = this.tx.inputs.findIndex((input, i) => {
            const txid = input.prevTxId.toString('hex');
            const vout = input.outputIndex;
            return utxo.txid === txid && utxo.vout === vout;
        });

        if (this.tx.inputs[inputIndex] && signature) {
            const sigBuffer = new Buffer(signature.signature, 'hex');
            const s = {
                signature: bitcore.crypto.Signature.fromTxFormat(sigBuffer),
                publicKey: new bitcore.PublicKey(signature.pubKey),
                inputIndex,
                sigtype: bitcore.crypto.Signature.SIGHASH_ALL
            };

            this.tx.applySignature(s);
        } else {
            console.error('Failed to add signature!');
            // todo: throw?
        }
        return this;
    }

    /**
     * Creates a multisignature redeem script, combined with the amount it forms
     * and prevout and it adds it to this.prevouts array.
     * @param satoshis the amount of satoshis this prevout should consume.
     * @param publicKeys the participating public keys.
     */
    public addMultisigInput(input: Prevout, publicKeys: string[]): TransactionBuilder {
        const i = {
            txid: input.txid,
            vout: input.vout,
            scriptPubKey: input._scriptPubKey,
            satoshis: input._satoshis
        };

        publicKeys.sort();
        publicKeys = publicKeys.map(pk => new bitcore.PublicKey(pk));
        /*const multisigInput = new bitcore.Transaction.Input.MultiSigScriptHash(input,
            publicKeys,
            2);*/

        this.tx.from(i, publicKeys, 2);
        return this;
    }

    /**
     *
     */
    public build(): string {
        return this.tx.toString();
    }

    // Functions below are not Builder methods

    /**
     * Creates a multisignature redeem script, combined with the amount it forms
     * an output and it adds it to this.output array.
     * @param satoshis the amount of satoshis this prevout should consume.
     * @param publicKeys the participating public keys.
     */
    public newMultisigOutput(sathosis: number, publicKeys: string[]): ToBeNormalOutput {

        publicKeys.sort();
        publicKeys = publicKeys.map(pk => new bitcore.PublicKey(pk));

        // create a multisig redeemScript
        const redeemScript = bitcore.Script.buildMultisigOut(publicKeys, publicKeys.length);
        // transform into p2sh script
        const p2shScript = redeemScript.toScriptHashOut();

        /*
        console.log('newMultisigOutput()');
        console.log(redeemScript.toString());
        console.log(redeemScript.toHex());
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

    /**
     * TODO: should this be renamed to addNewChangeOutputFor and return this?
     *
     * @param requiredSatoshis
     * @param changeAddress
     * @param inputsOfSingleParty
     */
    public newChangeOutputFor(requiredSatoshis: number, changeAddress: CryptoAddress, inputsOfSingleParty: Prevout[]): (ToBeNormalOutput | undefined) {
        let input = 0;

        for (const utxo of inputsOfSingleParty) {
            if (utxo._satoshis) {
                // Use trusted field
                input += utxo._satoshis;
            } else {
                throw new Error('No trusted field for the amount was found.');
            }
        }

        const change = input - requiredSatoshis;

        // no change at all, don't add inputs
        if (change === 0) {
            return undefined;
        }

        return this.newNormalOutput(changeAddress, change);
    }

    /**
     *
     * @param addr
     * @param satoshis
     */
    public newNormalOutput(addr: CryptoAddress, satoshis: number): ToBeNormalOutput {
        // TODO: proper type checking (stealth addresses..)
        const address = bitcore.Address.fromString(addr.address);
        // TODO: use P2SH?
        const script = bitcore.Script.buildPublicKeyHashOut(address);
        const utxo = {
            script: script.toHex(),
            satoshis
        } as ToBeNormalOutput;

        this.addOutput(utxo);

        return utxo;
    }

    /**
     * Return the utxo for the multisig prevout
     * @param publicKeyToSignFor
     */
    public getMultisigUtxo(publicKeyToSignFor: string, network: string): Prevout {
        const utxo = {
            txid: this.txid
        } as Prevout;

        const prevout = this.tx.outputs.find((out, i) => {

            // TODO: find using the exact p2sh script
            if (out.script.isScriptHashOut()) {
                utxo.vout = i;
                utxo._satoshis = out.satoshis;
                // required for signing
                utxo._scriptPubKey = out.script.toHex();
                // TODO: technically this should be the address of the multisig
                // but for signing purposes we're putting in the address to sign for.
                // should refactor this!
                utxo._address = publicKeyToAddress(publicKeyToSignFor, network);
                return true;
            }
            return false;
        });

        if (!prevout) {
            throw new Error('TransactionBuilder, multisignature vout not found');
        }

        return utxo;
    }

    get txid(): string {
        return this.tx._getHash().toString('hex').match(/../g).reverse().join('');
    }

    public print(): void {
        let log = '------- Transaction -------\n'
                + '+++++++++++++++++++++++++++\n';

        this.tx.inputs.forEach(input => log += (input.prevTxId.toString('hex').match(/../g).reverse().join('') + ' ' + input.prevoutIndex + '\n'));
        log += '++++++++++++++++++++++++++++\n';
        this.tx.outputs.forEach(output => log += (output.inspect() + '\n'));
        log += ('++++++++++++++++++++++++++++\n');

        console.log(log);
    }

}

export function getTxidFrom(hex: string): string {
    /**
     * The buffer returned by _getHash() is encoded in little endian
     * We want a big endian result, so we swap the order of the bytes per 2.
     * wrong: cc11fecbaa8f55a570572ef8f9d0fc62bc2f71eda2a073ecd9e1a1d7f920*0d*_a3_ <- inversion
     * correct: _a3_*0d*20f9d7a1e1d9ec73a0a2ed712fbc62fcd0f9f82e5770a5558faacbfe11cc
     * without the _ and *
     */
    const txid = new bitcore.Transaction(hex)._getHash().toString('hex').match(/../g).reverse().join('');
    return txid;
}

// TODO: testnet flag to mainnet
export function publicKeyToAddress(publicKey: string, network: string): string {
    const pk = bitcore.PublicKey.fromString(publicKey);
    return bitcore.Address(pk, network).toString();
}

export function getSerializedInteger(n: number): Buffer {
    if (n === undefined) {
        throw new Error('Number to serialize is undefined.');
    }

    const hex = n.toString(16)
        .match(/../g)!
        .reverse()
        .join('');

    let length = (hex.length / 2).toString(16);
    if (length.length === 1) {
        length = '0' + length;
    } // length + '' +
    const b = new Buffer(hex, 'hex');
    return b;
}
