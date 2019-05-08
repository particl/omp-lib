import { OpenMarketProtocol } from "../src/omp";
import { Cryptocurrency } from "../src/interfaces/crypto";
import { clone } from '../src/util';
import { CtCoreRpcService } from "../test/rpc-ct.stub";


describe('CtRpc', () => {

    let omp0: OpenMarketProtocol;
    let omp1: OpenMarketProtocol;
    let omp2: OpenMarketProtocol;

    let rpc0: CtCoreRpcService;
    let rpc1: CtCoreRpcService;
    let rpc2: CtCoreRpcService;

    beforeAll(async () => {

        // setup RpcServices
        rpc0 = new CtCoreRpcService();
        rpc0.setup('localhost', 19792, 'rpcuser0', 'rpcpass0');
        rpc1 = new CtCoreRpcService();
        rpc1.setup('localhost', 19793, 'rpcuser1', 'rpcpass1');
        rpc2 = new CtCoreRpcService();
        rpc2.setup('localhost', 19794, 'rpcuser2', 'rpcpass2');

        // setup OMP's
        omp0 = new OpenMarketProtocol({ network: 'testnet'});
        omp0.inject(Cryptocurrency.PART, rpc0);

        omp1 = new OpenMarketProtocol({ network: 'testnet'});
        omp1.inject(Cryptocurrency.PART, rpc1);

        omp2 = new OpenMarketProtocol({ network: 'testnet'});
        omp2.inject(Cryptocurrency.PART, rpc2);

    });

    test('stealth addresses', async () => {
        const sx = await rpc0.getNewStealthAddressWithEphem();
    
        const stripped = clone(sx);
        delete stripped['pubKey'];
    
        const sx2 = await rpc1.getPubkeyForStealthWithEphem(stripped);
        expect(sx).toEqual(sx2);
    });
});

