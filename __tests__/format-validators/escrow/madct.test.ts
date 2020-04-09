/* tslint:disable:max-line-length */
import * from 'jest';
import { FV_MPA_BID } from '../../../src/format-validators/mpa_bid';
import { hash } from '../../../src/hasher/hash';
import { FV_MPA_ACCEPT } from '../../../src/format-validators/mpa_accept';
import { FV_MPA_LOCK } from '../../../src/format-validators/mpa_lock';
import { clone } from '../../../src/util';
import { MPAction } from '../../../src/interfaces/omp-enums';

const validate = FV_MPA_BID.validate;
const ok_bid = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "${MPAction.MPA_BID}",
            "generated": ${+new Date().getTime()},
            "item": "${hash('listing')}",
            "buyer": {
              "payment": {
                "cryptocurrency": "PART",
                "escrow": "MAD_CT",
                "prevouts": [
                    {
                        "txid": "${hash('txid')}",
                        "vout": 0,
                        "blindFactor": "${hash('blindFactor')}"
                    }
                ],
                "outputs": [
                    {
                        "blindFactor": "7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490",
                        "address": {
                            "type": "STEALTH",
                            "address": "Tetd4E9KxDFpxPc3SrtAazWvfabfbsno42UgsaSJznX99bb9uvWt1hx1j9P295pcDbT3hihADHaB1Uf67rLyj9AUsa3Uy3ngCo1TpU",
                            "pubKey": "028329acf1ec8379a810e836b4278e54b92030fb353a8603a96759f979ce581a8b",
                            "ephem": {
                                "public": "03bfbd06452c79962425dc9fd80ca02edab3af9f970170dfd82f7f109ee7e00fee",
                                "private": "ca5bd908a72061a3d5a68b0c1a16eb725bc9e9eb40b848b0aaad288ddcd5f7b1"
                            }
                        }
                    }
                ],
                "release": {
                    "ephem": {
                        "public": "03cf8a85e0e320e9f9218e67c97a5b70e614f7e8a30b55227b12151d025765ce53",
                        "private": "9909832afd1cbd1ce7a863760228ec8fe264d7f17791e16a1a527ef845d37225"
                    },
                    "blindFactor": "7a1b51eebcf7bbb6474c91dc4107aa42814069cc2dbd6ef83baf0b648e66e490"
                }
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
bid_unknown_escrow.action.buyer.payment.escrow = 'UNKWONSDFS';
test('MPA_BID: validate unknown escrow type', () => {
    let error = '';
    try {
        validate(bid_unknown_escrow);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value'));
});

const bid_missing_escrow = clone(ok_bid);
delete bid_missing_escrow.action.buyer.payment.escrow;
test('MPA_BID: validate missing escrow type', () => {
    let error = '';
    try {
        validate(bid_missing_escrow);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value'));
});

const bid_missing_outputs = clone(ok_bid);
delete bid_missing_outputs.action.buyer.payment.outputs;
test('MPA_BID: validate missing outputs', () => {
    let error = '';
    try {
        validate(bid_missing_outputs);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('outputs: not an array'));
});

const bid_missing_prevouts = clone(ok_bid);
bid_missing_prevouts.action.buyer.payment.prevouts = [];
test('MPA_BID: validate empty prevouts', () => {
    let error = '';
    try {
        validate(bid_missing_prevouts);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('payment: prevouts: not an array'));
});

delete bid_missing_prevouts.action.buyer.payment.prevouts;
test('MPA_BID: validate missing prevouts', () => {
    let error = '';
    try {
        validate(bid_missing_prevouts);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('payment: prevouts: not an array'));
});

const bid_missing_release = clone(ok_bid);
delete bid_missing_release.action.buyer.payment.release;
test('MPA_BID: validate missing release', () => {
    let error = '';
    try {
        validate(bid_missing_release);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('release: missing or not an object'));
});

const validateAccept = FV_MPA_ACCEPT.validate;
const ok_accept = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "${MPAction.MPA_ACCEPT}",
            "generated": ${+new Date().getTime()},
            "bid": "${hash('bid')}",
            "seller": {
              "payment": {
                "escrow": "MAD_CT",
                "fee": 50000,
                "prevouts": [
                    {
                        "txid": "${hash('txid')}",
                        "vout": 0,
                        "blindFactor": "${hash('blindFactor')}"
                    }
                ],
                "release": {
                    "signatures": [
                        {
                            "signature": "signature1",
                            "pubKey": "pubkey1"
                        },
                        {
                            "signature": "signature1",
                            "pubKey": "pubkey1"
                        }
                    ],
                    "ephem": {
                        "public": "03b8df13e9a8997e0f2c144878cffb2daf47ce59daf8127ba85d4d44bebe350411",
                        "private": "88b9b6add1af63f2ea55a670a1e1a193f019abdcc87cf03eb911ef01ac84f141"
                    }
                },
                "outputs": [
                    {
                        "blindFactor": "bc9c0d0dec3de2e84f25cd27950c433f685780a433e8c6b4eef3efd08c74312f",
                        "address": {
                            "type": "STEALTH",
                            "address": "TetYukJdYnSQq4Pxj9kKZ2H6vk6owd5SsLyMeGeJkLxqNSXtGLCG3kBMBWbA3XfWusSno8M8iUjKPa5z3LyNvaSPy7BZdXMHihti6Q",
                            "pubKey": "0286b6a11c6f96ad7ec2a5dfe93f1f29c40b25a85b7197a0d99ccf03e9363baeac",
                            "ephem": {
                                "public": "038db4391388a079ef6ee12393bf25750e72abedd828c56fa02f81eef8cda45e4c",
                                "private": "bf7f06dc1b40b4ff979adfbba30923e189e871ae9075bcaeafc0925f2d86c43c"
                            }
                        }
                    }
                ],
                "destroy": {
                    "signatures": [
                        {
                            "signature": "30440220730b0857edbf52271216da640e06a5edf8c9708894b4f7250a25bab5e58d3f99022043e90aeb0faa40b43798b007198831ca031e53d77e94d3757ee6ff3f70f2596a01",
                            "pubKey": "031e10927bfa9a14ab74bc6f220686e0a24fb6a58acc3518d373728c90b3b7e797"
                        },
                        {
                            "signature": "3044022059cbc5dba0ccf12f21b789b18cbae6111a6dd54091c37b9d78acad2c7fbea68b02205adac64c0c583702806ec480df32471dbb6a2ecc764c673f10c4d72b251a45de01",
                            "pubKey": "031e10927bfa9a14ab74bc6f220686e0a24fb6a58acc3518d373728c90b3b7e797"
                        }
                    ]
                }
              }
            }
        }
    }`);

const accept_unknown_escrow = clone(ok_accept);
accept_unknown_escrow.action.seller.payment.escrow = 'UNKWONSDFS';
test('MPA_ACCEPT: validate unknown escrow type', () => {
    let error = '';
    try {
        validateAccept(accept_unknown_escrow);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value'));
});

const accept_missing_escrow = clone(ok_accept);
delete accept_missing_escrow.action.seller.payment.escrow;
test('MPA_ACCEPT: validate missing escrow type', () => {
    let error = '';
    try {
        validateAccept(accept_missing_escrow);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('expecting escrow type, unknown value'));
});

const accept_missing_prevouts = clone(ok_accept);
accept_missing_prevouts.action.seller.payment.prevouts = [];
test('MPA_ACCEPT: validate empty prevouts', () => {
    let error = '';
    try {
        validateAccept(accept_missing_prevouts);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('payment: prevouts: not an array'));
});

delete accept_missing_prevouts.action.seller.payment.prevouts;
test('MPA_ACCEPT: validate missing prevouts', () => {
    let error = '';
    try {
        validateAccept(accept_missing_prevouts);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('payment: prevouts: not an array'));
});

const accept_missing_signatures = clone(ok_accept);
accept_missing_signatures.action.seller.payment.release.signatures = [];
test('MPA_ACCEPT: validate empty release signatures', () => {
    let error = '';
    try {
        validateAccept(accept_missing_signatures);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('signatures: missing or not an array'));
});

delete accept_missing_signatures.action.seller.payment.release.signatures;
test('MPA_ACCEPT: validate missing release signatures', () => {
    let error = '';
    try {
        validateAccept(accept_missing_signatures);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('signatures: missing or not an array'));
});

const accept_too_many_signatures = clone(ok_accept);
accept_too_many_signatures.action.seller.payment.release.signatures.push({
    signature: 'signature1',
    pubKey: 'pubKey1'
});
test('MPA_ACCEPT: validate too many release signatures', () => {
    let error = '';
    try {
        validateAccept(accept_too_many_signatures);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('release: signatures: amount of signatures does not equal 2'));
});

const accept_too_many_prevouts = clone(ok_accept);
accept_too_many_prevouts.action.seller.payment.prevouts.push({
    txid: hash('txid2'),
    vout: 1,
    blindFactor: hash('txid2')
});
test('MPA_ACCEPT: too many prevouts', () => {
    let error = '';
    try {
        validateAccept(accept_too_many_prevouts);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('prevouts: expecting 1 prevout, not '));
});


const release_missing_signatures = clone(ok_accept);
delete release_missing_signatures.action.seller.payment.release.signatures;
test('MPA_ACCEPT: validate missing release signatures', () => {
    let error = '';
    try {
        validateAccept(release_missing_signatures);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('release: signatures: missing or not an array'));
});

const release_missing_ephem = clone(ok_accept);
delete release_missing_ephem.action.seller.payment.release.ephem;
test('MPA_ACCEPT: validate empty release ephem', () => {
    let error = '';
    try {
        validateAccept(release_missing_ephem);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('release: ephem: missing or not an object'));
});

const release_empty_ephem = clone(ok_accept);
release_empty_ephem.action.seller.payment.release.ephem = {};
test('MPA_ACCEPT: validate empty release ephem', () => {
    let error = '';
    try {
        validateAccept(release_empty_ephem);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('release: ephem.public: missing or not a public key'));
});

const validateLock = FV_MPA_LOCK.validate;
const ok_lock = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "${MPAction.MPA_LOCK}",
            "generated": ${+new Date().getTime()},
            "bid": "${hash('bid')}",
            "buyer": {
              "payment": {
                "escrow": "MAD_CT",
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

const lock_missing_signatures = clone(ok_lock);
delete lock_missing_signatures.action.buyer.payment.signatures;
test('MPA_LOCK: validate missing signatures', () => {
    let error = '';
    try {
        validateLock(lock_missing_signatures);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('signatures: missing or not an array'));
});

const refund_missing_signatures = clone(ok_lock);
delete refund_missing_signatures.action.buyer.payment.refund.signatures;
test('MPA_LOCK: validate missing refund signatures', () => {
    let error = '';
    try {
        validateLock(refund_missing_signatures);
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining('refund: signatures: missing or not an array'));
});
