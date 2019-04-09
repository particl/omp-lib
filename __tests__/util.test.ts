import * from 'jest';
import * as semver from 'semver';
import { OMPVERSION } from '../src/util';

describe('Util', () => {

    beforeAll(async () => {
        // setup RpcServices
    });

    test('should get version', async () => {
        expect(semver.gte(OMPVERSION, '0.1.0')).toBe(true);
    });
});
