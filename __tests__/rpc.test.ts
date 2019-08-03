import * from 'jest';
import { CoreRpcService } from '../test/rpc.stub';
import { OpenMarketProtocol } from '../src/omp';
import { Cryptocurrency } from '../src/interfaces/crypto';
import { log } from '../src/util';

describe('Rpc', () => {

    let omp0: OpenMarketProtocol;
    let omp1: OpenMarketProtocol;
    let omp2: OpenMarketProtocol;

    let rpc0: CoreRpcService;
    let rpc1: CoreRpcService;
    let rpc2: CoreRpcService;

    beforeAll(async () => {

        // setup RpcServices
        rpc0 = new CoreRpcService();
        rpc0.setup('localhost', 19792, 'rpcuser0', 'rpcpass0');
        rpc1 = new CoreRpcService();
        rpc1.setup('localhost', 19793, 'rpcuser1', 'rpcpass1');
        rpc2 = new CoreRpcService();
        rpc2.setup('localhost', 19794, 'rpcuser2', 'rpcpass2');

        // setup OMP's
        omp0 = new OpenMarketProtocol({ network: 'testnet'});
        omp0.inject(Cryptocurrency.PART, rpc0);

        omp1 = new OpenMarketProtocol({ network: 'testnet'});
        omp1.inject(Cryptocurrency.PART, rpc1);

        omp2 = new OpenMarketProtocol({ network: 'testnet'});
        omp2.inject(Cryptocurrency.PART, rpc2);

    });

    test('test seperate rpcs', async () => {
        expect(omp0.rpc(Cryptocurrency.PART)).toEqual(rpc0);
        expect(omp1.rpc(Cryptocurrency.PART)).toEqual(rpc1);
        expect(omp2.rpc(Cryptocurrency.PART)).toEqual(rpc2);
    });
/*
    test('listwalletdir', async () => {
        const data = await rpc0.listWalletDir();
        expect(data.wallets[0].name).toBe('');
    });

    test('walletexists', async () => {
        const exists = await rpc0.walletExists('');
        expect(exists).toEqual(true);
    });
*/

});
