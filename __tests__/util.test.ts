import * from 'jest';
import * as semver from 'semver';
import { ompVersion } from '../src/omp';

describe('Util', () => {

    beforeAll(async () => {
        // setup RpcServices
    });

    test('should get version', async () => {
        expect(semver.gt(ompVersion(), '0.1.0')).toBe(true);
    });
});
