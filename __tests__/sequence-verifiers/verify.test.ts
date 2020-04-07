import * from 'jest';
import { ConfigurableHasher, hash } from '../../src/hasher/hash';
import { Sequence } from '../../src/sequence-verifier/verify';
import { clone } from '../../src/util';
import { HashableListingMessageConfig } from '../../src/hasher/config/listingitemadd';
import { HashableBidMessageConfig } from '../../src/hasher/config/bid';
import { MPAction } from '../../src/interfaces/omp-enums';

describe('SequenceValidator', () => {

    const validate = Sequence.validate;
    const listing_ok = JSON.parse(
        `{
        "version": "0.1.0.0",
        "action": {
            "type": "${MPAction.MPA_LISTING_ADD}",
            "item": {
              "information": {
                "title": "a 6 month old dog",
                "shortDescription": "very cute",
                "longDescription": "not for eating",
                "category": [
                    "Animals"
                ]
              },
              "payment": {
                "type": "SALE",
                "escrow": {
                  "type": "MULTISIG",
                  "ratio": {
                    "buyer": 100,
                    "seller": 100
                  }
                },
                "options": [
                  {
                    "currency": "PART",
                    "basePrice": 10
                  }
                ]
              },
              "messaging": {
                  "options": [
                    {
                        "protocol": "TODO",
                        "publicKey": "TODO"
                    }
                  ]
              }
            }
        }
    }`);

    const hashedListing = ConfigurableHasher.hash(listing_ok.action, new HashableListingMessageConfig());

    const bid_ok = JSON.parse(
        `{
            "version": "0.1.0.0",
            "action": {
                "type": "${MPAction.MPA_BID}",
                "generated": ${+new Date().getTime()},
                "item": "${hashedListing}",
                "buyer": {
                  "payment": {
                    "cryptocurrency": "PART",
                    "escrow": "MULTISIG",
                    "fee": 2000,
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

    const hashedBid = ConfigurableHasher.hash(bid_ok.action, new HashableBidMessageConfig());

    const accept_ok = JSON.parse(
        `{
        "version": "0.1.0.0",
        "action": {
            "type": "${MPAction.MPA_ACCEPT}",
                "bid": "${hashedBid}",
                "seller": {
                    "payment": {
                    "escrow": "MULTISIG",
                    "fee": 2000,
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


    const lock_ok = JSON.parse(
        `{
            "version": "0.1.0.0",
            "action": {
                "type": "${MPAction.MPA_LOCK}",
                "bid": "${hashedBid}",
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

    test('seqver complete good cycle', () => {
        let fail = false;
        try {

            fail = !validate([listing_ok, bid_ok, accept_ok, lock_ok]);
        } catch (e) {
            console.log(e);
            fail = true;
        }
        expect(fail).toBe(false);
    });

    test('seqver listing, bid & bid (fail)', () => {
        let error = '';
        try {
            validate([listing_ok, bid_ok, bid_ok]);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('third action in the sequence must be a MPA_ACCEPT, MPA_REJECT, MPA_CANCEL.'));
    });

    const accept_fail = clone(accept_ok);
    accept_fail.action.bid = hash('UNKWONSDFS');

    test('seqver listing, bid & accept_fail', () => {
        let error = '';
        try {
            validate([listing_ok, bid_ok, accept_fail]);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('did not match.'));
    });

    const wrong_escrow_bid = clone(bid_ok);
    wrong_escrow_bid.action.buyer.payment.escrow = 'MAD';

    test('seqver listing, bid with wrong escrow type & accept', () => {
        let error = '';
        try {
            validate([listing_ok, wrong_escrow_bid, accept_ok]);
        } catch (e) {
            error = e.toString();
        }
        // TODO: should fail once MAD validation format is added. Fix it
        expect(error).toEqual(expect.stringContaining('unknown validation format, unknown value, received=MAD'));
    });

    const wrong_escrow_accept = clone(accept_ok);
    wrong_escrow_accept.action.seller.payment.escrow = 'MAD';

    test('seqver listing, bid & accept with wrong escrow type', () => {
        let error = '';
        try {
            validate([listing_ok, bid_ok, wrong_escrow_accept]);
        } catch (e) {
            error = e.toString();
        }
        // TODO: should fail once MAD validation format is added. Fix it
        expect(error).toEqual(expect.stringContaining('unknown validation format, unknown value, received=MAD'));
    });

    const wrong_escrow_lock = clone(bid_ok);
    wrong_escrow_lock.action.buyer.payment.escrow = 'MAD';

    test('seqver listing, bid & accept with wrong escrow type', () => {
        let error = '';
        try {
            validate([listing_ok, bid_ok, wrong_escrow_lock]);
        } catch (e) {
            error = e.toString();
        }
        // TODO: should fail once MAD validation format is added. Fix it
        expect(error).toEqual(expect.stringContaining('unknown validation format, unknown value, received=MAD'));
    });

    const wrong_currency_bid = clone(bid_ok);
    wrong_currency_bid.action.buyer.payment.cryptocurrency = 'BTC';

    test('seqver listing, bid with wrong currency type', () => {
        let error = '';
        try {
            validate([listing_ok, wrong_currency_bid]);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('currency provided by MPA_BID not accepted by the listing'));
    });
});
