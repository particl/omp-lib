
import { FV_MPA_BID } from "../../../src/format-validators/mpa_bid";
import { hash } from "../../../src/hasher/hash";
import { FV_MPA_ACCEPT } from "../../../src/format-validators/mpa_accept";
import { FV_MPA_RELEASE } from "../../../src/format-validators/mpa_release";
import { FV_MPA_LOCK } from "../../../src/format-validators/mpa_lock";
import { FV_MPA_REFUND } from "../../../src/format-validators/mpa_refund";
import { clone } from "../../../src/util";

const validate = FV_MPA_BID.validate;
const ok_bid = JSON.parse(
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
                "prevouts": [
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



const bid_unknown_escrow = clone(ok_bid);
bid_unknown_escrow.action.buyer.payment.escrow = "UNKWONSDFS"
test('validate unknown escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(bid_unknown_escrow)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("expecting escrow type, unknown value"));
});

const bid_missing_escrow = clone(ok_bid);
delete bid_missing_escrow.action.buyer.payment.escrow;
test('validate missing escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(bid_missing_escrow)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("expecting escrow type, unknown value"));
});

const bid_missing_pubkey = clone(ok_bid);
delete bid_missing_pubkey.action.buyer.payment.pubKey;
test('validate missing escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(bid_missing_pubkey)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("pubKey: missing or not a string"));
});

const bid_missing_changeAddress = clone(ok_bid);
delete bid_missing_changeAddress.action.buyer.payment.changeAddress;
test('validate missing escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(bid_missing_changeAddress)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("CryptoAddress: missing or not an object"));
});

const bid_missing_prevouts = clone(ok_bid);
delete bid_missing_prevouts.action.buyer.payment.prevouts;
test('validate missing escrow type MPA_BID', () => {
    let error: string = "";
    try {
        validate(bid_missing_prevouts)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("payment.prevouts: not an array"));
});



const validateAccept = FV_MPA_ACCEPT.validate;
const ok_accept = JSON.parse(
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
                "prevouts": [
                    {
                        "txid": "${hash('txid')}",
                        "vout": 0
                    }
                ],
                "signatures": [
                    {
                        "signature": "signature1",
                        "pubKey": "pubkey1"
                    }
                ]
              }
            }
        }
    }`);

const accept_unknown_escrow = clone(ok_accept);
accept_unknown_escrow.action.seller.payment.escrow = "UNKWONSDFS"
test('validate unknown escrow type MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validateAccept(accept_unknown_escrow)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("expecting escrow type, unknown value"));
});

const accept_missing_escrow = clone(ok_accept);
delete accept_missing_escrow.action.seller.payment.escrow;
test('validate missing escrow type MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validateAccept(accept_missing_escrow)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("expecting escrow type, unknown value"));
});

const accept_missing_pubkey = clone(ok_accept);
delete accept_missing_pubkey.action.seller.payment.pubKey;
test('validate missing pubKey MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validateAccept(accept_missing_pubkey)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("pubKey: missing or not a string"));
});

const accept_missing_changeAddress = clone(ok_accept);
delete accept_missing_changeAddress.action.seller.payment.changeAddress;
test('validate missing changeAddress MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validateAccept(accept_missing_changeAddress)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("CryptoAddress: missing or not an object"));
});

const accept_missing_prevouts = clone(ok_accept);
delete accept_missing_prevouts.action.seller.payment.prevouts;
test('validate missing prevouts MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validateAccept(accept_missing_prevouts)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("payment.prevouts: not an array"));
});

const accept_missing_signatures = clone(ok_accept);
delete accept_missing_signatures.action.seller.payment.signatures;
test('validate missing signatures MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validateAccept(accept_missing_signatures)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("signatures: missing or not an array"));
});

const accept_not_enough_signatures = clone(ok_accept);
accept_not_enough_signatures.action.seller.payment.prevouts.push({
    txid: hash('txid2'),
    vout: 1
});
test('validate missing signatures MPA_ACCEPT', () => {
    let error: string = "";
    try {
        validateAccept(accept_not_enough_signatures)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("signatures: amount of signatures does not match amount of prevouts"));
});





const validateLock = FV_MPA_LOCK.validate;
const ok_lock = JSON.parse(
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

const lock_missing_signatures = clone(ok_lock);
delete lock_missing_signatures.action.buyer.payment.signatures;
test('validate missing signatures MPA_LOCK', () => {
    let error: string = "";
    try {
        validateLock(lock_missing_signatures)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("signatures: missing or not an array"));
});







const validateRelease = FV_MPA_RELEASE.validate;
const ok_release = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_RELEASE",
            "bid": "${hash('bid')}",
            "seller": { 
              "payment": {
                "escrow": "MULTISIG",
                "signatures": [
                    "signature1"
                ]
              }
            }
        }
    }`);

const release_missing_signatures = clone(ok_release);
delete release_missing_signatures.action.seller.payment.signatures;
test('validate missing signatures MPA_RELEASE', () => {
    let error: string = "";
    try {
        validateRelease(release_missing_signatures)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("signatures: missing or not an array"));
});







const validateRefund = FV_MPA_REFUND.validate;
const ok_refund = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_REFUND",
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

const refund_missing_signatures = clone(ok_refund);
delete refund_missing_signatures.action.buyer.payment.signatures;
test('validate missing signatures MPA_REFUND', () => {
    let error: string = "";
    try {
        validateRefund(refund_missing_signatures)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("signatures: missing or not an array"));
});