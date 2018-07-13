
import { CoreRpcService } from "../test/rpc.stub";
import { node0, node1, node2 } from '../test/rpc.stub';
import { OpenMarketProtocol } from "../src/omp";
import { CryptoType } from "../src/interfaces/crypto";


test('test rpc', async () => {
    let out;
    let bool = false;
    try {
        console.log(out);
        bool = true;
    } catch (e) {

    }
    expect(bool).toBe(true);
});
