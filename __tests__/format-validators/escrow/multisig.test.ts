import * from 'jest';
import { FV_MPA_BID } from '../../../src/format-validators/mpa_bid';
import { hash } from '../../../src/hasher/hash';
import { FV_MPA_ACCEPT } from '../../../src/format-validators/mpa_accept';
import { FV_MPA_RELEASE } from '../../../src/format-validators/mpa_release';
import { FV_MPA_LOCK } from '../../../src/format-validators/mpa_lock';
import { FV_MPA_REFUND } from '../../../src/format-validators/mpa_refund';
import { clone } from '../../../src/util';

describe('Multisig', () => {

    const validateBid = FV_MPA_BID.validate;
    const validateAccept = FV_MPA_ACCEPT.validate;
    const validateLock = FV_MPA_LOCK.validate;
    const validateRelease = FV_MPA_RELEASE.validate;
    const validateRefund = FV_MPA_REFUND.validate;

    const ok_bid = JSON.parse(
        `{
            "version": "0.1.0.0",
            "action": {
                "type": "MPA_BID",
                "generated": ${+new Date().getTime()},
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
                    "outputs": [
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

    beforeAll(async () => {
        //
    });

    test('validate unknown escrow type MPA_BID', () => {

        const bid_unknown_escrow = clone(ok_bid);
        bid_unknown_escrow.action.buyer.payment.escrow = 'UNKWONSDFS';
        let error = '';
        try {
            validateBid(bid_unknown_escrow);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value'));
    });

    test('validate missing escrow type MPA_BID', () => {
        const bid_missing_escrow = clone(ok_bid);
        delete bid_missing_escrow.action.buyer.payment.escrow;

        let error = '';
        try {
            validateBid(bid_missing_escrow);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value'));
    });

    test('validate missing escrow type MPA_BID', () => {
        const bid_missing_pubkey = clone(ok_bid);
        delete bid_missing_pubkey.action.buyer.payment.pubKey;

        let error = '';
        try {
            validateBid(bid_missing_pubkey);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('pubKey: missing or not a string'));
    });

    test('validate missing escrow type MPA_BID', () => {
        const bid_missing_changeAddress = clone(ok_bid);
        delete bid_missing_changeAddress.action.buyer.payment.changeAddress;
        let error = '';
        try {
            validateBid(bid_missing_changeAddress);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('CryptoAddress: missing or not an object'));
    });

    test('validate missing escrow type MPA_BID', () => {
        const bid_missing_outputs = clone(ok_bid);
        delete bid_missing_outputs.action.buyer.payment.outputs;
        let error = '';
        try {
            validateBid(bid_missing_outputs);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment.outputs: not an array'));
    });

    test('validate unknown escrow type MPA_ACCEPT', () => {
        const accept_unknown_escrow = clone(ok_accept);
        accept_unknown_escrow.action.seller.payment.escrow = 'UNKWONSDFS';
        let error = '';
        try {
            validateAccept(accept_unknown_escrow);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value'));
    });

    test('validate missing escrow type MPA_ACCEPT', () => {
        const accept_missing_escrow = clone(ok_accept);
        delete accept_missing_escrow.action.seller.payment.escrow;
        let error = '';
        try {
            validateAccept(accept_missing_escrow);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value'));
    });

    test('validate missing pubKey MPA_ACCEPT', () => {
        const accept_missing_pubkey = clone(ok_accept);
        delete accept_missing_pubkey.action.seller.payment.pubKey;
        let error = '';
        try {
            validateAccept(accept_missing_pubkey);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('pubKey: missing or not a string'));
    });

    test('validate missing changeAddress MPA_ACCEPT', () => {
        const accept_missing_changeAddress = clone(ok_accept);
        delete accept_missing_changeAddress.action.seller.payment.changeAddress;
        let error = '';
        try {
            validateAccept(accept_missing_changeAddress);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('CryptoAddress: missing or not an object'));
    });

    test('validate missing outputs MPA_ACCEPT', () => {
        const accept_missing_outputs = clone(ok_accept);
        delete accept_missing_outputs.action.seller.payment.outputs;
        let error = '';
        try {
            validateAccept(accept_missing_outputs);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment.outputs: not an array'));
    });

    test('validate missing signatures MPA_ACCEPT', () => {
        const accept_missing_signatures = clone(ok_accept);
        delete accept_missing_signatures.action.seller.payment.signatures;
        let error = '';
        try {
            validateAccept(accept_missing_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('signatures: missing or not an array'));
    });

    test('validate missing signatures MPA_ACCEPT', () => {
        const accept_not_enough_signatures = clone(ok_accept);
        accept_not_enough_signatures.action.seller.payment.outputs.push({
            txid: hash('txid2'),
            vout: 1
        });
        let error = '';
        try {
            validateAccept(accept_not_enough_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('signatures: amount of signatures does not match amount of outputs'));
    });

    test('validate missing signatures MPA_LOCK', () => {
        const lock_missing_signatures = clone(ok_lock);
        delete lock_missing_signatures.action.buyer.payment.signatures;
        let error = '';
        try {
            validateLock(lock_missing_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('signatures: missing or not an array'));
    });

    test('validate missing signatures MPA_RELEASE', () => {
        const release_missing_signatures = clone(ok_release);
        delete release_missing_signatures.action.seller.payment.signatures;
        let error = '';
        try {
            validateRelease(release_missing_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('signatures: missing or not an array'));
    });

    test('validate missing signatures MPA_REFUND', () => {
        const refund_missing_signatures = clone(ok_refund);
        delete refund_missing_signatures.action.buyer.payment.signatures;
        let error = '';
        try {
            validateRefund(refund_missing_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('signatures: missing or not an array'));
    });
});
