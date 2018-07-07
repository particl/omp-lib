import { Validator } from "../../src/validators/validate";

const v = new Validator();
const success = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_LISTING_ADD"
        }
    }`);


test('validate a complete action', () => {
    let fail: boolean = false;
    try {
        fail = !v.validate(success)
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
    let fail: boolean = false;
    try {
        fail = !v.validate(missing_type)
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
    let fail: boolean = false;
    try {
        fail = !v.validate(empty_version)
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
    let fail: boolean = false;
    try {
        fail = !v.validate(missing_version)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});