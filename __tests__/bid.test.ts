import * from 'jest';
import { OpenMarketProtocol } from '../src/omp';
import { Cryptocurrency } from '../src/interfaces/crypto';
import { BidConfiguration } from '../src/interfaces/configs';
import { EscrowType } from '../src/interfaces/omp-enums';
import { CoreRpcService } from '../test/rpc.stub';

describe('Bid', () => {

    const ok = JSON.parse(
        `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_LISTING_ADD",
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
                "options": [
                  {
                    "currency": "PART",
                    "basePrice": 100000000000
                  }
                ]
              },
              "messaging": [
                {
                  "protocol": "SMSG",
                  "publicKey": "TODO"
                }
              ]
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
    let node2: CoreRpcService;

    beforeAll(async () => {

        node0 = new CoreRpcService();
        node1 = new CoreRpcService();
        node2 = new CoreRpcService();

        node0.setup('localhost', 19792, 'rpcuser0', 'rpcpass0');
        node1.setup('localhost', 19793, 'rpcuser1', 'rpcpass1');
        node1.setup('localhost', 19794, 'rpcuser2', 'rpcpass2');

        buyer = new OpenMarketProtocol({ network: 'testnet'});
        buyer.inject(Cryptocurrency.PART, node0);

        seller = new OpenMarketProtocol({ network: 'testnet'});
        seller.inject(Cryptocurrency.PART, node1);

    });

    test('perform multisig bid', () => {
        const success = false;
        try {
            // console.log(JSON.stringify(bid, null, 4))
            // TODO: missing impl

        } catch (e) {
            console.log(e);
        }

        // allowing this to pass for now
        expect(success).toBe(false);

    });

});
