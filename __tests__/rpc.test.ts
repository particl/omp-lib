import * from 'jest';
import { node0, node1, node2 } from '../src/rpc.stub';
import { OpenMarketProtocol } from '../src/omp';
import { Cryptocurrency } from '../src/interfaces/crypto';

const omp0 = new OpenMarketProtocol();
omp0.inject(Cryptocurrency.PART, node0);


const omp1 = new OpenMarketProtocol();
omp1.inject(Cryptocurrency.PART, node1);

const omp2 = new OpenMarketProtocol();
omp2.inject(Cryptocurrency.PART, node2);


test('test seperate rpcs', async () => {
    expect(omp0.rpc(Cryptocurrency.PART)).toBe(node0);
    expect(omp1.rpc(Cryptocurrency.PART)).toEqual(node1);
    expect(omp2.rpc(Cryptocurrency.PART)).toBe(node2);
});
