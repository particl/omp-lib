
import { CoreRpcService } from "../test/rpc.stub";
import { node0, node1, node2 } from '../test/rpc.stub';
import { OpenMarketProtocol } from "../src/omp";
import { CryptoType } from "../src/interfaces/crypto";
import { BidConfiguration } from "../src/interfaces/configs";
import { EscrowType } from "../src/interfaces/omp-enums";

const buyer = new OpenMarketProtocol();
buyer.inject(CryptoType.PART, node0);

const seller = new OpenMarketProtocol();
seller.inject(CryptoType.PART, node1);

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
                    "basePrice": 1000000000
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
    cryptocurrency: CryptoType.PART,
    escrow: EscrowType.MULTISIG,
    shippingAddress: {
        firstName: "string",
        lastName: "string",
        addressLine1: "string",
        city: "string",
        state: "string",
        zipCode: "string",
        country: "string",
    }
};

test('perform multisig bid', async () => {
    let out;
    let bool = false;
    try {
        const bid = await buyer.bid(config, ok);
        const accept = await seller.accept(ok, bid);
        //console.log(JSON.stringify(bid, null, 4))
        bool = true;
    } catch (e) {
        console.log(e)
    }
    expect(bool).toBe(true);
});
