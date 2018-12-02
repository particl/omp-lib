import * from 'jest';
import { node0, node1, node2 } from '../test/rpc.stub';
import { OpenMarketProtocol } from '../src/omp';
import { CryptoType } from '../src/interfaces/crypto';

const omp0 = new OpenMarketProtocol();
omp0.inject(CryptoType.PART, node0);


const omp1 = new OpenMarketProtocol();
omp1.inject(CryptoType.PART, node1);

const omp2 = new OpenMarketProtocol();
omp2.inject(CryptoType.PART, node2);


test('test seperate rpcs', async () => {
    expect(omp0.rpc(CryptoType.PART)).toBe(node0);
    expect(omp1.rpc(CryptoType.PART)).toEqual(node1);
    expect(omp2.rpc(CryptoType.PART)).toBe(node2);
});
