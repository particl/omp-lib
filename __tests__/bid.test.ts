
import { CoreRpcService } from "../src/rpc.stub";
import { node0, node1, node2 } from '../src/rpc.stub';
import { OpenMarketProtocol } from "../src/omp";
import { CryptoType } from "../src/interfaces/crypto";

const omp0 = new OpenMarketProtocol();
omp0.addTxLib(CryptoType.PART, node0);

test('test rpc', async () => {
    let out;
    let bool = false;
    try {
        out = await node0.call('getblockchaininfo')
        console.log(out);
        bool = true;
    } catch (e) {

    }
    expect(bool).toBe(true);
});
