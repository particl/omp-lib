import * from 'jest';
import { FV_MPA_BID } from '../../src/format-validators/mpa_bid';
import { hash } from '../../src/hasher/hash';
import { clone } from '../../src/util';

const validate = FV_MPA_BID.validate;
const ok = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_BID",
            "created": ${+ new Date()},
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

test('validate ok MPA_BID', () => {
    let fail: boolean;
    try {
        fail = !validate(ok)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(false);
});

const missing_buyer = clone(ok);
missing_buyer.action.buyer = "UNKWONSDFS"
test('validate missing buyer MPA_BID', () => {
    let error: string = "";
    try {
        validate(missing_buyer)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("buyer: missing or not an object"));
});

const missing_payment = clone(ok);
missing_payment.action.buyer.payment = "UNKWONSDFS"
test('validate unknown escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(missing_payment)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("payment: not an object"));
});

const missing_payment_cryptocurrency = clone(ok);
delete missing_payment_cryptocurrency.action.buyer.payment.cryptocurrency;
test('validate unknown escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(missing_payment_cryptocurrency)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("payment.cryptocurrency: expecting cryptocurrency type, unknown value"));
});

const missing_shippingAddress = clone(ok);
missing_shippingAddress.action.buyer.shippingAddress = "UNKWONSDFS"
test('validate unknown escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(missing_shippingAddress)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("shippingAddress: missing or not an object"));
});