
import { CoreRpcService } from "../test/rpc.stub";
import { node0, node1, node2 } from '../test/rpc.stub';
import { OpenMarketProtocol } from "../src/omp";
import { CryptoType } from "../src/interfaces/crypto";
import { BidConfiguration } from "../src/interfaces/configs";
import { EscrowType } from "../src/interfaces/omp-enums";
import { toSatoshis } from "../src/util";

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
                    "basePrice": ${toSatoshis(20)}
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

test('determinstic transaction generation', async () => {
    let bool = false;
    let accept;
    let lock;
    try {
        const bid = await buyer.bid(config, ok);
        accept = await seller.accept(ok, bid);
        lock = await buyer.lock(ok, bid, accept, true);
        const lockSigned = await buyer.lock(ok, bid, accept);
        console.log(await node0.sendRawTransaction(lockSigned['_rawtx']));
        bool = true;
    } catch (e) {
        console.log(e)
    }
    expect(bool).toBe(true);
    expect(lock).toBeDefined();
    expect(accept).toBeDefined();
    expect(lock['_rawtx']).toEqual(accept['_rawtx']);
});
