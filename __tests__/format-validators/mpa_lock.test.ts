import * from 'jest';
import { FV_MPA_LOCK } from '../../src/format-validators/mpa_lock';
import { hash } from '../../src/hasher/hash';
import { clone } from '../../src/util';

describe('format-validator: MPA_LOCK', () => {

    const validate = FV_MPA_LOCK.validate;
    const ok = JSON.parse(
        `{
            "version": "0.1.0.0",
            "action": {
                "type": "MPA_LOCK",
                "bid": "${hash('bid')}",
                "buyer": {
                  "payment": {
                    "escrow": "MULTISIG",
                    "signatures": [
                        {
                            "signature": "signature1",
                            "pubKey": "pubkey1"
                        }
                    ],
                    "refund": {
                        "signatures": [
                            {
                                "signature": "signature1",
                                "pubKey": "pubkey1"
                            }
                        ]
                    }
                  }
                }
            }
        }`);

    beforeAll(async () => {
        //
    });

    test('validate ok', () => {
        let fail: boolean;
        try {
            fail = !validate(ok);
        } catch (e) {
            console.log(e);
            fail = true;
        }
        expect(fail).toBe(false);
    });

    test('validate missing bid hash', () => {
        const missing_bid_hash = clone(ok);
        delete missing_bid_hash.action.bid;
        let error = '';
        try {
            validate(missing_bid_hash);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('bid: missing or not a valid hash'));
    });

    test('validate missing buyer object', () => {
        const missing_buyer = clone(ok);
        delete missing_buyer.action.buyer;
        let error = '';
        try {
            validate(missing_buyer);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('buyer: missing or not an object'));
    });

    test('validate unknown escrow type', () => {
        const missing_payment = clone(ok);
        missing_payment.action.buyer.payment = 'UNKWONSDFS';
        let error = '';
        try {
            validate(missing_payment);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment: missing or not an object'));
    });
});
