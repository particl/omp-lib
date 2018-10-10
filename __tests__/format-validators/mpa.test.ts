import * from 'jest';
import { FV_MPM} from "../../src/format-validators/mpm";

const validate = FV_MPM.validate;
const success = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_LISTING_ADD"
        }
    }`);


test('validate a complete action', () => {
    let fail: boolean;
    try {
        fail = !validate(success)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(false);
});



const missing_type = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            
        }
    }`);

test('validate missing type', () => {
    let fail: boolean;
    try {
        fail = !validate(missing_type)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});



const empty_version = JSON.parse(
    `{
        "version": "",
        "action": {
            "type": "MPA_LISTING_ADD"
        }
    }`);

test('validate empty version', () => {
    let fail: boolean;
    try {
        fail = !validate(empty_version)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});

const missing_version = JSON.parse(
    `{
        "action": {
            "type": "MPA_LISTING_ADD"
        }
    }`);

test('validate missing version', () => {
    let fail: boolean;
    try {
        fail = !validate(missing_version)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});



const unknown_action = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_GAWGD_WFTF"
        }
    }`);

test('validate unknown action', () => {
    let fail: boolean;
    try {
        fail = !validate(unknown_action)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});