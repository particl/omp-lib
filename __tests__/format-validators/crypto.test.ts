import * from 'jest';
import { FV_CRYPTO } from '../../src/format-validators/crypto';
import { hash } from '../../src/hasher/hash';

describe('format-validator: Crypto', () => {

    beforeAll(async () => {
        //
    });

    test('validate a normal output', () => {
        const success = JSON.parse(
            `{
            "txid": "${hash('txid')}",
            "vout": 0
        }`);
        let fail: boolean;
        try {
            fail = !FV_CRYPTO.validateOutput(success);
        } catch (e) {
            console.log(e);
            fail = true;
        }
        expect(fail).toBe(false);
    });

    test('output not an object', () => {
        const horrible_fail = JSON.parse(`"not even an object"`);
        let fail: boolean;
        try {
            fail = !FV_CRYPTO.validateOutput(horrible_fail);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });

    test('try negative vout', () => {
        const negative_vout = JSON.parse(
            `{
            "txid": "somelongtxid",
            "vout": -1
        }`);
        let fail: boolean;
        try {
            fail = !FV_CRYPTO.validateOutput(negative_vout);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });

    test('validate an address', () => {
        // CryptoAddress tests
        const cryptoaddress_success = JSON.parse(
            `{
            "type": "NORMAL",
            "address": "someaddress"
        }`);
        let fail: boolean;
        try {
            fail = !FV_CRYPTO.validateCryptoAddress(cryptoaddress_success);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(false);
    });

    test('address not an object', () => {
        const horrible_fail_address = JSON.parse(`"not even an object"`);
        let fail: boolean;
        try {
            fail = !FV_CRYPTO.validateCryptoAddress(horrible_fail_address);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });

    test('validate an address with wrong type', () => {
        const cryptoaddress_fail_number = JSON.parse(
            `{
            "type": "NORMAL",
            "address": 1
        }`);
        let fail: boolean;
        try {
            fail = !FV_CRYPTO.validateCryptoAddress(cryptoaddress_fail_number);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });

    test('validate an address with wrong type', () => {
        const cryptoaddress_fail_type = JSON.parse(
            `{
            "type": "bad type",
            "address": "good address"
        }`);
        let fail: boolean;
        try {
            fail = !FV_CRYPTO.validateCryptoAddress(cryptoaddress_fail_type);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });
});
