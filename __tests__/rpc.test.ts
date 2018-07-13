
import "reflect-metadata";
import { CoreRpcService } from "../test/rpc.stub";
import { node0, node1, node2 } from '../test/rpc.stub';
import { OpenMarketProtocol } from "../src/omp";
import { CryptoType } from "../src/interfaces/crypto";

const omp0 = new OpenMarketProtocol();
omp0.inject(CryptoType.PART, node0);


const omp1 = new OpenMarketProtocol();
omp1.inject(CryptoType.PART, node1);


test('test rpc', async () => {
    let out;
    let bool = false;
    try {
        console.log('running test')
        console.log(await omp0.test());
        console.log(await omp1.test());
        bool = true;
    } catch (e) {
        console.log(e)
    }
    expect(bool).toBe(true);
});
