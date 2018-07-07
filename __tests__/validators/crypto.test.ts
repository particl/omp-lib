import { Crypto } from "../../src/validators/crypto";

const success = JSON.parse(
    `{
        "txid": "somelongtxid",
        "vout": 0
    }`);

test('validate a normal output', () => {
    let fail: boolean;
    try {
        fail = !Crypto.validateOutput(success)
    } catch (e) {
        console.log(e);
        fail = true;
    }
    expect(fail).toBe(false);
});



const negative_vout = JSON.parse(
    `{
        "txid": "somelongtxid",
        "vout": -1
    }`);

test('try negative vout', () => {
    let fail: boolean;
    try {
        fail = !Crypto.validateOutput(negative_vout)
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
        fail = !Crypto.validateCryptoAddress(cryptoaddress_success)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(false);
});

const cryptoaddress_fail_number = JSON.parse(
    `{
        "type": "NORMAL",
        "address": 1
    }`);

test('validate an address with wrong type', () => {
    let fail: boolean;
    try {
        fail = !Crypto.validateCryptoAddress(cryptoaddress_fail_number)
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
        fail = !Crypto.validateCryptoAddress(cryptoaddress_fail_type)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});