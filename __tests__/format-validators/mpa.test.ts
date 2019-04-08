import * from 'jest';
import { FV_MPM } from '../../src/format-validators/mpm';

describe('format-validator: MPA', () => {

    const validate = FV_MPM.validate;

    beforeAll(async () => {
        //
    });

    test('validate a complete action', () => {
        const success = JSON.parse(
            `{
            "version": "0.1.0.0",
            "action": {
                "type": "MPA_LISTING_ADD"
            }
        }`);

        let fail: boolean;
        try {
            fail = !validate(success);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(false);
    });

    test('validate missing type', () => {
        const missing_type = JSON.parse(
            `{
            "version": "0.1.0.0",
            "action": {
            }
        }`);
        let fail: boolean;
        try {
            fail = !validate(missing_type);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });

    test('validate empty version', () => {
        const empty_version = JSON.parse(
            `{
            "version": "",
            "action": {
                "type": "MPA_LISTING_ADD"
            }
        }`);
        let fail: boolean;
        try {
            fail = !validate(empty_version);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });

    test('validate missing version', () => {
        const missing_version = JSON.parse(
            `{
            "action": {
                "type": "MPA_LISTING_ADD"
            }
        }`);
        let fail: boolean;
        try {
            fail = !validate(missing_version);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });

    test('validate unknown action', () => {
        const unknown_action = JSON.parse(
            `{
            "version": "0.1.0.0",
            "action": {
                "type": "MPA_GAWGD_WFTF"
            }
        }`);
        let fail: boolean;
        try {
            fail = !validate(unknown_action);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });
});
