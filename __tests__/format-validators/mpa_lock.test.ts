import { FV_MPA_LOCK } from "../../src/format-validators/mpa_lock";
import { hash } from "../../src/hasher/hash";
import { clone } from "../../src/util";

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
                    "signature1"
                ]
              }
            }
        }
    }`);

test('validate ok MPA_LOCK', () => {
    let fail: boolean;
    try {
        fail = !validate(ok)
    } catch (e) {
        console.log(e)
        fail = true;
    }
    expect(fail).toBe(false);
});

const missing_bid_hash = clone(ok);
delete missing_bid_hash.action.bid;
test('validate missing bid hash MPA_LOCK', () => {
    let error: string = "";
    try {
        validate(missing_bid_hash)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("bid: missing or not a valid hash"));
});

const missing_buyer = clone(ok);
delete missing_buyer.action.buyer;
test('validate missing buyer object MPA_LOCK', () => {
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
test('validate unknown escrow type MPA_LOCK', () => {
    let error: string = "";
    try {
        validate(missing_payment)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("payment: missing or not an object"));
});

