import { FV_MPA_ACCEPT } from "../../src/format-validators/mpa_accept";
import { hash } from "../../src/hasher/hash";

const validate = FV_MPA_ACCEPT.validate;
const ok = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_ACCEPT",
            "bid": "${hash('bid')}",
            "seller": { 
              "payment": {
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
              }
            }
        }
    }`);

test('validate ok MPA_ACCEPT', () => {
    let fail: boolean;
    try {
        fail = !validate(ok)
    } catch (e) {
        console.log(e)
        fail = true;
    }
    expect(fail).toBe(false);
});

const missing_bid_hash = JSON.parse(JSON.stringify(ok));
delete missing_bid_hash.action.bid;
test('validate missing bid hash MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validate(missing_bid_hash)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("bid: missing or not a valid hash"));
});

const missing_payment = JSON.parse(JSON.stringify(ok));
missing_payment.action.seller.payment = "UNKWONSDFS"
test('validate unknown escrow type MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validate(missing_payment)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("payment: missing or not an object"));
});

