import * from 'jest';
import { FV_MPA_BID } from '../../src/format-validators/mpa_bid';
import { hash } from '../../src/hasher/hash';
import { clone } from '../../src/util';

describe('format-validator: MPA_BID', () => {

    const validate = FV_MPA_BID.validate;
    const ok = JSON.parse(
        `{
            "version": "0.1.0.0",
            "action": {
                "type": "MPA_BID",
                "generated": ${+ new Date().getTime()},
                "item": "${hash('listing')}",
                "buyer": {
                  "payment": {
                    "cryptocurrency": "PART",
                    "escrow": "MULTISIG",
                    "pubKey": "somepublickey",
                    "changeAddress": {
                        "type": "NORMAL",
                        "address": "someaddress"
                    },
                    "outputs": [
                        {
                            "txid": "${hash('txid')}",
                            "vout": 0
                        }
                    ]
                  },
                  "shippingAddress": {
                    "firstName": "string",
                    "lastName": "string",
                    "addressLine1": "string",
                    "addressLine2": "string",
                    "city": "string",
                    "state": "string",
                    "zipCode": "zipCodeString",
                    "country": "string"
                  }
                }
            }
        }`);

    beforeAll(async () => {
        //
    });

    test('should validate ok MPA_BID', () => {
        let fail: boolean;
        try {
            fail = !validate(ok);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(false);
    });

    test('should fail to validate because missing buyer MPA_BID', () => {
        const missing_buyer = clone(ok);
        missing_buyer.action.buyer = 'UNKWONSDFS';
        let error = '';
        try {
            validate(missing_buyer);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('buyer: missing or not an object'));
    });

    test('should fail to validate because payment not an object MPA_BID', () => {
        const invalid_payment = clone(ok);
        invalid_payment.action.buyer.payment = 'not-an-object';
        let error = '';
        try {
            validate(invalid_payment);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment: not an object'));
    });

    test('should fail to validate because invalid escrow type MPA_BID', () => {
        const invalid_escrow = clone(ok);
        invalid_escrow.action.buyer.payment.escrow = 'INVALID';
        let error = '';
        try {
            validate(invalid_escrow);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value, got INVALID'));
    });

    test('should fail to validate because missing payment cryptocurrency MPA_BID', () => {
        const missing_payment_cryptocurrency = clone(ok);
        delete missing_payment_cryptocurrency.action.buyer.payment.cryptocurrency;
        let error = '';
        try {
            validate(missing_payment_cryptocurrency);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment.cryptocurrency: missing cryptocurrency type'));
    });

    test('should fail to validate because missing shipping address MPA_BID', () => {
        const missing_shippingAddress = clone(ok);
        missing_shippingAddress.action.buyer.shippingAddress = 'MISSING';
        let error = '';
        try {
            validate(missing_shippingAddress);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('shippingAddress: missing or not an object'));
    });
});
