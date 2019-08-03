import * from 'jest';
import { getSerializedInteger } from '../src/transaction-builder/transaction';

test('serialize a number', () => {

    const i = 4194313;
    const serialized = getSerializedInteger(i);
    expect(serialized).toBeDefined();
    expect(serialized).toEqual(new Buffer('090040', 'hex'));
});
