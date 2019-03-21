import * from 'jest';
import { node0, node1, node2 } from '../src/rpc.stub';
import { OpenMarketProtocol } from '../src/omp';
import { Cryptocurrency } from '../src/interfaces/crypto';
import { BidConfiguration } from '../src/interfaces/configs';
import { EscrowType } from '../src/interfaces/omp-enums';

const omp0 = new OpenMarketProtocol();
omp0.inject(Cryptocurrency.PART, node0);

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
                "cryptocurrency": [
                  {
                    "currency": "PART",
                    "basePrice": 100000000000
                  }
                ]
              },
              "messaging": [
                {
                  "protocol": "TODO",
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

test('perform multisig bid', () => {
    const bool = false;
    try {
        // console.log(JSON.stringify(bid, null, 4))
        // TODO: missing impl

    } catch (e) {
        console.log(e);
    }
});
