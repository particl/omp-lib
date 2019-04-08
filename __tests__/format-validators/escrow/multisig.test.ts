import * from 'jest';
import { FV_MPA_BID } from '../../../src/format-validators/mpa_bid';
import { hash } from '../../../src/hasher/hash';
import { FV_MPA_ACCEPT } from '../../../src/format-validators/mpa_accept';
import { FV_MPA_LOCK } from '../../../src/format-validators/mpa_lock';
import { clone } from '../../../src/util';

describe('Multisig', () => {

    const validateBid = FV_MPA_BID.validate;
    const validateAccept = FV_MPA_ACCEPT.validate;
    const validateLock = FV_MPA_LOCK.validate;

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
                        "fee": 50000,
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
                        ],
                        "release": {
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

    test('MPA_BID: validate unknown escrow type', () => {
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

    test('MPA_BID: validate missing escrow type', () => {
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


    test('MPA_BID: validate missing public key', () => {
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

    test('MPA_BID: validate missing change address', () => {
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

    test('MPA_BID: validate empty prevouts', () => {
        const bid_missing_prevouts = clone(ok_bid);
        bid_missing_prevouts.action.buyer.payment.prevouts = [];
        let error = '';
        try {
            validateBid(bid_missing_prevouts);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment.prevouts: not an array'));
    });


    test('MPA_BID: validate missing prevouts', () => {
        const bid_missing_prevouts = clone(ok_bid);
        delete bid_missing_prevouts.action.buyer.payment.prevouts;
        let error = '';
        try {
            validateBid(bid_missing_prevouts);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment.prevouts: not an array'));
    });

    test('MPA_ACCEPT: validate unknown escrow type', () => {
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

    test('MPA_ACCEPT: validate missing escrow type', () => {
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

    test('MPA_ACCEPT: validate missing pubKey', () => {
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

    test('MPA_ACCEPT: validate missing changeAddress', () => {
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

    test('MPA_ACCEPT: validate empty prevouts', () => {
        const accept_missing_prevouts = clone(ok_accept);
        accept_missing_prevouts.action.seller.payment.prevouts = [];
        let error = '';
        try {
            validateAccept(accept_missing_prevouts);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment.prevouts: not an array'));
    });

    test('MPA_ACCEPT: validate missing prevouts', () => {
        const accept_missing_prevouts = clone(ok_accept);
        delete accept_missing_prevouts.action.seller.payment.prevouts;
        let error = '';
        try {
            validateAccept(accept_missing_prevouts);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('payment.prevouts: not an array'));
    });

    test('MPA_ACCEPT: validate empty signatures', () => {
        const accept_missing_signatures = clone(ok_accept);
        accept_missing_signatures.action.seller.payment.signatures = [];
        let error = '';
        try {
            validateAccept(accept_missing_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('signatures: missing or not an array'));
    });

    test('MPA_ACCEPT: validate missing signatures', () => {
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

    test('MPA_ACCEPT: validate not enough signatures', () => {
        const accept_not_enough_signatures = clone(ok_accept);
        accept_not_enough_signatures.action.seller.payment.prevouts.push({
            txid: hash('txid2'),
            vout: 1
        });

        let error = '';
        try {
            validateAccept(accept_not_enough_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('signatures: amount of signatures does not match amount of prevouts'));
    });


    test('MPA_ACCEPT: validate missing release signatures', () => {
        const release_missing_signatures = clone(ok_accept);
        delete release_missing_signatures.action.seller.payment.release.signatures;
        let error = '';
        try {
            validateAccept(release_missing_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('release.signatures: missing or not an array'));
    });

    test('MPA_LOCK: validate missing signatures', () => {
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

    test('MPA_LOCK: validate missing refund signatures', () => {
        const refund_missing_signatures = clone(ok_lock);
        delete refund_missing_signatures.action.buyer.payment.refund.signatures;
        let error = '';
        try {
            validateLock(refund_missing_signatures);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('refund.signatures: missing or not an array'));
    });
});