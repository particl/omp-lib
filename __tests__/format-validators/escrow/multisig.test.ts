
import { FV_MPA_BID } from "../../../src/format-validators/mpa_bid";
import { hash } from "../../../src/hasher/hash";

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





const unknown_escrow = JSON.parse(JSON.stringify(ok));
unknown_escrow.action.buyer.payment.escrow = "UNKWONSDFS"
test('validate unknown escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(unknown_escrow)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("expecting escrow type, unknown value"));
});

const missing_escrow = JSON.parse(JSON.stringify(ok));
delete missing_escrow.action.buyer.payment.escrow;
test('validate missing escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(missing_escrow)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("expecting escrow type, unknown value"));
});

const missing_pubkey = JSON.parse(JSON.stringify(ok));
delete missing_pubkey.action.buyer.payment.pubKey;
test('validate missing escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(missing_pubkey)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("pubKey: missing or not a string"));
});

const missing_changeAddress = JSON.parse(JSON.stringify(ok));
delete missing_changeAddress.action.buyer.payment.changeAddress;
test('validate missing escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(missing_changeAddress)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("CryptoAddress: missing or not an object"));
});

const missing_outputs = JSON.parse(JSON.stringify(ok));
delete missing_outputs.action.buyer.payment.outputs;
test('validate missing escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(missing_outputs)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("payment.outputs: not an array"));
});