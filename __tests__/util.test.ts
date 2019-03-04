import * from 'jest';
import * as semver from 'semver';
import { getVersion } from '../src/util';

describe('Util', () => {

    beforeAll(async () => {
        // setup RpcServices
    });

    test('should get version', async () => {
        expect(semver.gt(getVersion(), '0.1.0')).toBe(true);
    });
});
