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