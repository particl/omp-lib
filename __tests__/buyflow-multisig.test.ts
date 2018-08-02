
import { CoreRpcService } from "../test/rpc.stub";
import { node0, node1, node2 } from '../test/rpc.stub';
import { OpenMarketProtocol } from "../src/omp";
import { CryptoType } from "../src/interfaces/crypto";
import { BidConfiguration } from "../src/interfaces/configs";
import { EscrowType } from "../src/interfaces/omp-enums";
import { toSatoshis } from "../src/util";
import { FV_MPA_BID } from "../src/format-validators/mpa_bid";
import { FV_MPA_ACCEPT } from "../src/format-validators/mpa_accept";
import { FV_MPA_LOCK } from "../src/format-validators/mpa_lock";
import { FV_MPA_RELEASE } from "../src/format-validators/mpa_release";
import { FV_MPA_REFUND } from "../src/format-validators/mpa_refund";

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

it('determinstic transaction generation', async () => {
    let bool = false;
    let accept;
    let lock;
    let release;
    let complete;
    try {
        const bid = await buyer.bid(config, ok);
        FV_MPA_BID.validate(bid);

        accept = await seller.accept(ok, bid);
        FV_MPA_ACCEPT.validate(accept);

        lock = await buyer.lock(ok, bid, accept);
        FV_MPA_LOCK.validate(lock);
        console.log('lock tx', await node0.sendRawTransaction(lock['_rawtx']));

        release = await seller.release(ok, bid, accept, lock);
        FV_MPA_RELEASE.validate(release);
        complete = await buyer.release(ok, bid, accept, lock, release);
        console.log('release tx', await node0.sendRawTransaction(complete['_rawtx']));

        bool = true;
    } catch (e) {
        console.log(e)
    }
    expect(bool).toBe(true);
    expect(lock).toBeDefined();
    expect(accept).toBeDefined();

    expect(accept['_rawtx']).toEqual(release['_rawtx_accept']);
});

it('determinstic transaction generation refund', async () => {
  let bool = false;
  let accept;
  let lock;
  let refund;
  let complete;
  try {
      const bid = await buyer.bid(config, ok);
      FV_MPA_BID.validate(bid);

      accept = await seller.accept(ok, bid);
      FV_MPA_ACCEPT.validate(accept);

      lock = await buyer.lock(ok, bid, accept);
      FV_MPA_LOCK.validate(lock);
      console.log('lock tx', await node0.sendRawTransaction(lock['_rawtx']));

      refund = await buyer.refund(ok, bid, accept, lock);
      FV_MPA_REFUND.validate(refund);
      complete = await seller.refund(ok, bid, accept, lock, refund);
      console.log('refund tx', await node0.sendRawTransaction(complete['_rawtx']));

      bool = true;
  } catch (e) {
      console.log(e)
  }
  expect(bool).toBe(true);
  expect(lock).toBeDefined();
  expect(accept).toBeDefined();
});