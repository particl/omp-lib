import { node0, node1, node2 } from '../test/rpc-ct.stub';
import { OpenMarketProtocol } from "../src/omp";
import { CryptoType } from "../src/interfaces/crypto";
import { clone } from '../src/util';


test('stealth addresses', async () => {
    const sx = await node0.getNewStealthAddressWithEphem();

    const stripped = clone(sx);
    delete stripped['pubKey'];

    const sx2 = await node1.getPubkeyForStealthWithEphem(stripped);
    expect(sx).toEqual(sx2);
});
