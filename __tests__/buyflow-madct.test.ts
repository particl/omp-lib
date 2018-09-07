import { node0, node1 } from '../test/rpc.stub';
import { OpenMarketProtocol } from "../src/omp";
import { CryptoType } from "../src/interfaces/crypto";
import { BidConfiguration } from "../src/interfaces/configs";
import { EscrowType } from "../src/interfaces/omp-enums";
import { toSatoshis } from "../src/util";

const delay = ms => {
    return new Promise(resolve => {
        return setTimeout(resolve, ms)
    });
};

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
                  "type": "MAD_CT",
                  "ratio": {
                    "buyer": 100,
                    "seller": 100
                  }
                },
                "cryptocurrency": [
                  {
                    "currency": "PART",
                    "basePrice": ${toSatoshis(1)}
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
        escrow: EscrowType.MAD_CT,
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

it('create blind output from anon', async () => {
    let bool = false;

    try {
        jest.setTimeout(30000);

        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);

        await delay(5000);
        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid);
        console.log(JSON.stringify(accept, null, 4))

    } catch (e) {
        console.log(e)
    }
});