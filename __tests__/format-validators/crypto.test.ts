import * from 'jest';
import { FV_CRYPTO } from '../../src/format-validators/crypto';
import { hash } from '../../src/hasher/hash';

const success = JSON.parse(
    `{
        "txid": "${hash('txid')}",
        "vout": 0
    }`);

test('validate a normal prevout', () => {
    let fail: boolean;
    try {
        fail = !FV_CRYPTO.validatePrevout(success)
    } catch (e) {
        console.log(e);
        fail = true;
    }
    expect(fail).toBe(false);
});

const horrible_fail = JSON.parse(`"not even an object"`);

test('prevout not an object', () => {
    let fail: boolean;
    try {
        fail = !FV_CRYPTO.validatePrevout(horrible_fail);
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});


const negative_vout = JSON.parse(
    `{
        "txid": "somelongtxid",
        "vout": -1
    }`);

test('try negative vout', () => {
    let fail: boolean;
    try {
        fail = !FV_CRYPTO.validatePrevout(negative_vout);
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});


// CryptoAddress tests
const cryptoaddress_success = JSON.parse(
    `{
        "type": "NORMAL",
        "address": "someaddress"
    }`);

test('validate an address', () => {
    let fail: boolean;
    try {
        fail = !FV_CRYPTO.validateCryptoAddress(cryptoaddress_success);
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(false);
});

const horrible_fail_address = JSON.parse(`"not even an object"`);

test('address not an object', () => {
    let fail: boolean;
    try {
        fail = !FV_CRYPTO.validateCryptoAddress(horrible_fail_address);
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});

const cryptoaddress_fail_number = JSON.parse(
    `{
        "type": "NORMAL",
        "address": 1
    }`);

test('validate an address with wrong type', () => {
    let fail: boolean;
    try {
        fail = !FV_CRYPTO.validateCryptoAddress(cryptoaddress_fail_number);
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});


const cryptoaddress_fail_type = JSON.parse(
    `{
        "type": "bad type",
        "address": "good address"
    }`);

test('validate an address with wrong type', () => {
    let fail: boolean;
    try {
        fail = !FV_CRYPTO.validateCryptoAddress(cryptoaddress_fail_type);
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});
