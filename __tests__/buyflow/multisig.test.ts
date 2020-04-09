import * from 'jest';
import { MPM, OpenMarketProtocol } from '../../src/omp';
import { Cryptocurrency } from '../../src/interfaces/crypto';
import { BidConfiguration } from '../../src/interfaces/configs';
import { EscrowType, MPAction } from '../../src/interfaces/omp-enums';
import { toSatoshis, strip } from '../../src/util';
import { FV_MPA_BID } from '../../src/format-validators/mpa_bid';
import { FV_MPA_ACCEPT } from '../../src/format-validators/mpa_accept';
import { FV_MPA_LOCK } from '../../src/format-validators/mpa_lock';
import { CoreRpcService } from '../../test/rpc.stub';


describe('Buyflow: multisig', () => {

    const WALLET = '';  // use the default wallet

    const delay = ms => {
        return new Promise(resolve => {
            return setTimeout(resolve, ms);
        });
    };

    const ok = JSON.parse(
        `{
            "version": "0.1.0.0",
            "action": {
                "type": "${MPAction.MPA_LISTING_ADD}",
                "item": {
                  "information": {
                    "title": "a 6 month old dog",
                    "shortDescription": "very cute",
                    "longDescription": "not for eating",
                    "category": [
                        "Animals"
                    ]
                  },
                  "payment": {
                    "type": "SALE",
                    "escrow": {
                      "type": "MULTISIG",
                      "ratio": {
                        "buyer": 100,
                        "seller": 100
                      }
                    },
                    "options": [{
                        "currency": "PART",
                        "basePrice": ${toSatoshis(20)}
                    }]
                  },
                  "messaging": {
                    "options": [{
                      "protocol": "SMSG",
                      "publicKey": "TODO"
                    }]
                  }
                }
            }
        }`);

    const config: BidConfiguration = {
        cryptocurrency: Cryptocurrency.PART,
        escrow: EscrowType.MULTISIG,
        shippingAddress: {
            firstName: 'string',
            lastName: 'string',
            addressLine1: 'string',
            city: 'string',
            state: 'string',
            zipCode: 'string',
            country: 'string'
        }
    };

    let buyer: OpenMarketProtocol;
    let seller: OpenMarketProtocol;

    let node0: CoreRpcService;
    let node1: CoreRpcService;

    beforeAll(async () => {
        node0 = new CoreRpcService();
        node0.setup('localhost', 19792, 'rpcuser0', 'rpcpass0');

        node1 = new CoreRpcService();
        node1.setup('localhost', 19793, 'rpcuser1', 'rpcpass1');

        buyer = new OpenMarketProtocol({ network: 'testnet'});
        buyer.inject(Cryptocurrency.PART, node0);

        seller = new OpenMarketProtocol({ network: 'testnet'});
        seller.inject(Cryptocurrency.PART, node1);
    });

    it('buyflow release', async () => {
        let bid: MPM;
        let accept: MPM;
        let lock: MPM;
        let release: string;

        jest.setTimeout(40000);
        // Step 1: Buyer does bid
        bid = strip(await buyer.bid(WALLET, config, ok));
        FV_MPA_BID.validate(bid);

        await delay(10000);
        // Step 2: seller accepts AND signs release tx
        // the seller always wants his money back
        accept = strip(await seller.accept(WALLET, ok, bid));
        FV_MPA_ACCEPT.validate(accept);

        // Step 3: buyer locks and submits
        await delay(5000);
        lock = await buyer.lock(WALLET, ok, bid, accept);
        const bidtx = lock.action['_rawbidtx'];
        lock = strip(lock);
        FV_MPA_LOCK.validate(lock);
        await node0.sendRawTransaction(bidtx);

        // Step 4: buyer optionally releases
        release = await buyer.release(WALLET, ok, bid, accept);
        await node0.sendRawTransaction(release);

        expect(bid).toBeDefined();
        expect(accept).toBeDefined();
        expect(lock).toBeDefined();
        expect(release).toBeDefined();

    });

    it('buyflow refund', async () => {
        let accept: MPM;
        let lock: MPM;
        let complete: string;

        jest.setTimeout(40000);
        const bid = await buyer.bid(WALLET, config, ok);
        FV_MPA_BID.validate(bid);

        await delay(7000);
        accept = await seller.accept(WALLET, ok, bid);
        FV_MPA_ACCEPT.validate(accept);

        await delay(5000);
        lock = await buyer.lock(WALLET, ok, bid, accept);
        const bidtx = lock.action['_rawbidtx'];
        lock = strip(lock);
        FV_MPA_LOCK.validate(lock);
        await node0.sendRawTransaction(bidtx);

        complete = await seller.refund(WALLET, ok, bid, accept, lock);
        await delay(5000);
        await node0.sendRawTransaction(complete);

        expect(lock).toBeDefined();
        expect(accept).toBeDefined();
        expect(complete).toBeDefined();

    });

});
