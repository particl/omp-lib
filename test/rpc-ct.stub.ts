import { injectable } from "inversify";
import "reflect-metadata";

import { Rpc, CtRpc } from "../src/abstract/rpc";

import * as WebRequest from 'web-request';
import { Prevout, ISignature, BlindPrevout, CryptoAddressType, CryptoAddress, ToBeBlindOutput } from "../src/interfaces/crypto";
import { toSatoshis, fromSatoshis, asyncMap, asyncForEach, clone, log } from "../src/util";
import { TransactionBuilder } from '../src/transaction-builder/transaction';
import { ConfidentialTransactionBuilder } from '../src/transaction-builder/confidential-transaction';
import { CoreRpcService } from './rpc.stub';

@injectable()
class CtRpcService extends CoreRpcService implements CtRpc {

    constructor(
        _host: string,
        _port: number,
        _user: string,
        _password: string) {
        super(_host, _port, _user, _password)
    }

    public async getNewStealthAddress(): Promise<CryptoAddress> {
        const sx = await this.call('getnewstealthaddress');
        return {
            type: CryptoAddressType.STEALTH,
            address: sx
        } as CryptoAddress
    }

    public async getNewStealthAddressWithEphem(sx?: CryptoAddress): Promise<CryptoAddress> {
        if(!sx)
            sx = await this.getNewStealthAddress();
        else 
            sx = clone(sx)

        const info = (await this.call('derivefromstealthaddress', [sx.address]))
        sx.pubKey = info.pubkey;
        sx.ephem = {
            public: info.ephemeral_pubkey,
            private: info.ephemeral_privatekey
        }
        return sx;
    }

    public async getPubkeyForStealthWithEphem(sx: CryptoAddress): Promise<CryptoAddress> {
        const info = (await this.call('derivefromstealthaddress', [sx.address, sx.ephem.private]))
        sx.pubKey = info.pubkey;
        return sx;
    }

    // TODO: interface
    public async createBlindPrevoutFromAnon(satoshis: number, blind?: string): Promise<BlindPrevout> {
        let prevout: BlindPrevout;
        const sx = await this.getNewStealthAddress();
        const amount = fromSatoshis(satoshis);

        if (!blind) {
            // TODO(security): random!
            blind = "7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490"
        }

        const txid = await this.call('sendtypeto', ['anon', 'blind', [{ address: sx.address, amount: amount, blindingfactor: blind }]]);
        const unspent: any = await this.call('listunspentblind', [0]);
        const found = unspent.find(vout => (vout.txid === txid && vout.amount === fromSatoshis(satoshis)));

        if (!found) {
            throw new Error('Not enough blind inputs!');
        }

        // Retrieve the commitment from the transaction
        // TODO: use bitcorelib for this
        const commitment = (await this.call('getrawtransaction', [txid, true])).vout.find(i => i.n === found.vout).valueCommitment;

        prevout = {
            txid: found.txid,
            vout: found.vout,
            _commitment: commitment,
            _satoshis: toSatoshis(found.amount),
            _scriptPubKey: found.scriptPubKey,
            _address: found.address,
            blindFactor: blind
        }
        
        // Permanently lock the unspent output
        await this.lockUnspent([prevout]);

        return prevout;
    };

    public async getBlindPrevouts(satoshis, blind?: string): Promise<BlindPrevout[]> {
        return [await this.createBlindPrevoutFromAnon(satoshis, blind)];
    }

    public async loadTrustedFieldsForBlindUtxo(utxo: BlindPrevout): Promise<BlindPrevout> {
        const tx = (await this.call('getrawtransaction', [utxo.txid, true]));
        const found = tx.vout.find(i => i.n === utxo.vout);
        const commitment = found.valueCommitment;
        const scriptPubKey = found.scriptPubKey.hex;
        const address = found.scriptPubKey.addresses[0];

        const ok = (await this.verifyCommitment(commitment, utxo.blindFactor, utxo._satoshis));
        if (!ok) {
            throw new Error('Commitment is not matching amount or blindfactor.');
        }

        utxo._commitment = commitment;
        utxo._scriptPubKey = scriptPubKey;
        utxo._address = address;
        return utxo;
    }

    public async verifyCommitment(commitment: string, blind: string, satoshis: number) {
        return (await this.call('verifycommitment', [commitment, blind, fromSatoshis(satoshis)])).result
    }

    public async generateRawConfidentialTx(inputs: any[], outputs: ToBeBlindOutput[], feeSatoshis: number): Promise<string> {

        // Already a cloned object, rename fields to fit createrawparttransaction
        //inputs.forEach((prevout: any) => { prevout.amount_commitment = prevout._commitment; prevout.blindingfactor = prevout.blindFactor; });

        // Sort the outputs so buyer and seller
        // have a randomize order
        //outs.sort(); // TODO(security): sort using pubkey

        let inps: any[] = inputs.map((prevout: BlindPrevout) => {
            const i = {
                txid: prevout.txid,
                vout: prevout.vout,
                type: 'blind',
                scriptPubKey: prevout._scriptPubKey,
                amount_commitment: prevout._commitment,// fromSatoshis(prevout._satoshis),
                blindingfactor: prevout.blindFactor
            }

            if (prevout._redeemScript){
                (<any>i).redeemScript = prevout._redeemScript;
            }

            if(prevout._sequence) {
                (<any>i).sequence = prevout._sequence;
            }

            return i;
        });

        let outs: any[] = outputs.map((out: ToBeBlindOutput) => {
            const o = {
                type: out._type || 'blind',
                rangeproof_params: {
                    ct_exponent: 2,
                    ct_bits: 32,
                    min_value: 0,
                },
                amount: fromSatoshis(out._satoshis)
            }

            // Stealth address with pubkey and ephemeral chosen upfront (bidtxn)
            if (out.address) {
                if(out.address.pubKey && out.address.ephem.private) {
                    // Only used for rangeproof, blinding, etc.
                    // Is not used to build an output script!
                    (<any>o).pubkey = out.address.pubKey;
                    (<any>o).ephemeral_key = out.address.ephem.private
                }
            } 
            
            if(out._address) {
                (<any>o).address = out._address;
            } else if (out._redeemScript){
                (<any>o).script = out._redeemScript;
            } else if (out.address) {
                // Actually use the (stealth address) as output script
                (<any>o).address = out.address.address;
            } else {
                throw new Error('generateRawConfidentialTx(): output must contain atleast an address or a script, out = ' + out);
            }

            if (out.blindFactor) {
                (<any>o).blindingfactor = out.blindFactor;
            }

            if (out._nonce) {
                (<any>o).nonce = out._nonce;
            }

            if(out._data) {
                (<any>o).data = out._data;
            }

            return o;
        });

        // Add the CT fee output
        outs = [
            {
                // DATA prevout!
                type: "data",
                data_ct_fee: fromSatoshis(feeSatoshis),
                amount: 0
            }
        ].concat(outs);

        const tx = (await this.call('createrawparttransaction', [inps, outs]));
        let rawtx = tx.hex;

        return rawtx;
    }

    public async getLastMatchingBlindFactor(inputs: (BlindPrevout[] | ToBeBlindOutput[]), outputs: ToBeBlindOutput[]): Promise<string> {
        let inp = inputs.map(i => i.blindFactor);
        let out = outputs.map(i => i.blindFactor);

        if (!out) {
            out = [];
        }
        // If no other outputs, then push a fake input and output
        // they will be added and substracted and not affect anything.
        if (out.length === 0) {
            out.push('7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490');
            inp.push('7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490');
        }
        const b = (await this.call('generatematchingblindfactor', [inp, out])).blind;
        //console.log('generated b =', b);
        return b;
    }

    async signRawTransactionForBlindInputs(tx: ConfidentialTransactionBuilder, inputs: BlindPrevout[], sx?: CryptoAddress): Promise<ISignature[]> {
        let r: ISignature[] = [];

        // needs to synchronize, because the order needs to match
        // the inputs order.
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            let sig;

            // If not a stealth address, sign with key in wallet.
            if (!sx) {
                const params = [
                    await tx.build(),
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
                const derived = (await this.call('derivefromstealthaddress', [sx.address, sx.ephem.public]))
                const params = [
                    await tx.build(),
                    {
                        txid: input.txid,
                        vout: input.vout,
                        scriptPubKey: input._scriptPubKey,
                        amount_commitment: input._commitment,
                        redeemScript: input._redeemScript
                    },
                    derived.privatekey
                ]

                sig = {
                    signature: (await this.call('createsignaturewithkey', params)),
                    pubKey: derived.pubkey
                };
            }

            r.push(sig);
            console.log('signRawTransactionForBlindInputs(): txid= ', tx.txid)
            //console.log('signRawTransactionForBlindInputs(): signing for ', input)
            //console.log('signRawTransactionForBlindInputs(): sig ', sig)

            // If a stealth address is provided, we assume that were signing/spending
            // from a bid txn with a more complicated witness stack (cfr puzzleWitness())
            if(!sx) {
                tx.setWitness(input, sig);
            }

        };

        return r;
    }

}

export const node0 = new CtRpcService('localhost', 19792, 'rpcuser0', 'rpcpass0');
export const node1 = new CtRpcService('localhost', 19793, 'rpcuser1', 'rpcpass1');
export const node2 = new CtRpcService('localhost', 19794, 'rpcuser2', 'rpcpass2');

export { CtRpcService };