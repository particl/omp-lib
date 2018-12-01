import { node0, node1, node2 } from '../../test/rpc-ct.stub';
import { OpenMarketProtocol } from "../../src/omp";
import { CryptoType } from "../../src/interfaces/crypto";
import { BidConfiguration } from "../../src/interfaces/configs";
import { EscrowType } from "../../src/interfaces/omp-enums";
import { toSatoshis, strip, log } from "../../src/util";
import { Rpc } from '../../src/abstract/rpc';
import { resolve } from 'path';

const delay = ms => {
    return new Promise(resolve => {
        return setTimeout(resolve, ms)
    });
};

const buyer = new OpenMarketProtocol();
buyer.inject(CryptoType.PART, node0, true);

const seller = new OpenMarketProtocol();
seller.inject(CryptoType.PART, node1, true);

expect.extend({
    async toBeCompletedTransaction(rawtx) {
      const completed = (await node0.call('verifyrawtransaction', [rawtx]))['complete'];
      if (completed) {
        return {
          message: () =>
            `expected ${rawtx} to be completed.`,
          pass: true,
        };
      } else {
        return {
          message: () =>
            `expected ${rawtx} to be completed but got ${completed} instead`,
          pass: false,
        };
      }
    },
  });

  expect.extend({
    async toBeUtxoWithAmount(txid, node, amount) {
      const found = (await node.call('listunspentanon', [0])).find(utxo => (utxo.txid === txid && utxo.amount === amount));
      if (found) {
        return {
          message: () =>
            `expected ${txid} to be found on the node with amount ${amount}.`,
          pass: true,
        };
      } else {
        return {
          message: () =>
            `expected ${txid} to be found on the node but didn't find it.`,
          pass: false,
        };
      }
    },
  });

const timeTravel = (expectedUnixTime: number,node:Rpc) => {
    return node.call('setmocktime', [ expectedUnixTime, true]);
}

const waitTillJumped = async (expectedUnixTime: number,node:Rpc) => {
    return new Promise(async resolve => {
        let wait = true;

        while(wait) {
            const currentTime = (await node.call('getblockchaininfo', []))['mediantime'];
            wait = (currentTime <= expectedUnixTime);
            //console.log(wait ? 'waiting..' : ('finished! ' + currentTime + ' > ' + expectedUnixTime ));
            await delay(1000);
        }
    
        resolve();
    })

}

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
                    "address": {
                        "type": "STEALTH",
                        "address": "replaced in test"
                    },
                    "currency": "PART",
                    "basePrice": ${toSatoshis(2)}
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

it('buyflow', async () => {
    console.log('buyflow')
    jest.setTimeout(40000);
    let end = false;

    try {

        ok.action.item.payment.cryptocurrency.address = await node0.getNewStealthAddress();
        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        const bid_stripped = strip(bid);

        await delay(7000);
        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);

        // Destroy tx should not be minable due to missing inputs (bid not submitted yet).
        expect(accept['_rawdesttx']).not.toBeCompletedTransaction();
        
        // Step 3: buyer locks and submits
        await delay(7000);
        const lock = await buyer.lock(ok, bid_stripped, accept_stripped);

        // Bid tx should not be fully signed.
        expect(lock['_rawbidtx']).not.toBeCompletedTransaction();

        const lock_stripped = strip(lock);
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        expect(complete).toBeCompletedTransaction();

        // Submit the bid
        const completeTxid = await node0.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();

        // Now the destruction tx should complete fine..
        expect(lock['_rawdesttx']).toBeCompletedTransaction();

        end = true;
    } catch (e) {
        log(e)
    }
    expect(end).toEqual(true);
});

it.only('buyflow release', async () => {
    console.log('buyflow release')
    jest.setTimeout(400000);
    let end = false;

    try {

        ok.action.item.payment.cryptocurrency.address = await node0.getNewStealthAddress();
        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        log(bid);
        const bid_stripped = strip(bid);

        await delay(7000);
        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);
        log(accept_stripped)

        expect(accept['_rawdesttx']).not.toBeCompletedTransaction();

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        await delay(7000);
        const lock = await buyer.lock(ok, bid, accept_stripped);
        const lock_stripped = strip(lock);
        log(lock_stripped);

        expect(lock['_rawdesttx']).not.toBeCompletedTransaction();

        expect(lock['_rawreleasetxunsigned']).toEqual(accept['_rawreleasetxunsigned']);

        // Step 4: seller signs bid txn (full) and submits
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        expect(complete).toBeCompletedTransaction();
        
        const completeTxid = await node0.sendRawTransaction(complete);
        await node1.sendRawTransaction(complete)
        expect(completeTxid).toBeDefined();

        const d = await node1.call('decoderawtransaction', [lock['_rawreleasetxunsigned']]);
        log(d)

        console.log('RELEASE')
        await delay(10000)
        const release = await buyer.release(ok, bid, accept);
        const decoded = await node1.call('decoderawtransaction', [release]);
        log(decoded)
        const verify = await node1.call('verifyrawtransaction', [release]);
        log(verify)
        expect(release).toBeCompletedTransaction();

        const releaseTxid = await node0.sendRawTransaction(release);
        await node1.sendRawTransaction(release)
        expect(releaseTxid).toBeDefined();

        await delay(10000)
        expect(releaseTxid).toBeUtxoWithAmount(node0, 2);
        expect(releaseTxid).toBeUtxoWithAmount(node1, 3.99995000);


        end = true;
    } catch (e) {
        console.log(e)
    }
    expect(end).toEqual(true);
});

it('destroy prevent early mining', async () => {
    jest.setTimeout(400000);
    let end = false;

    try {

        ok.action.item.payment.cryptocurrency.address = await node0.getNewStealthAddress();
        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        const bid_stripped = strip(bid);

        await delay(10000);
        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);

        expect(accept['_rawdesttx']).not.toBeCompletedTransaction();
        
        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        await delay(10000);
        const lock = await buyer.lock(ok, bid_stripped, accept_stripped);
        const lock_stripped = strip(lock);

        expect(lock['_rawdesttx']).not.toBeCompletedTransaction();

        // Step 4: seller signs bid txn (full) and submits
        await delay(7000);
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        expect(complete).toBeCompletedTransaction();
        
        const completeTxid = await node0.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();

        // Can not destroy the funds before the timer has been reached
        let shouldFailToDestroy: boolean = false;
        try {
            const destroytxid = await node0.sendRawTransaction(lock['_rawdesttx']);
        } catch (e) {
            shouldFailToDestroy = (e['message'] === 'non-BIP68-final (code 64)');
        }
        expect(shouldFailToDestroy).toEqual(true);

        // Use daemon as a source of truth for what the current time is.
        let now = (await node0.call('getblockchaininfo', []))['mediantime'];
        const feasibleFrom = (now + 2880);

        // Travelling through time, 3000s in the future!
        await Promise.all([
            timeTravel(feasibleFrom, node0),
            timeTravel(feasibleFrom, node1),
            timeTravel(feasibleFrom, node2)
        ]);

        // Let a few blocks mine
        await waitTillJumped(feasibleFrom, node0)
        // await delay(6000);

        // Should be able to destroy them now
        let destroytxid: string;
        try {
            destroytxid = await node0.sendRawTransaction(lock['_rawdesttx']);
        } catch (e) {
 
        }
        expect(destroytxid).toBeDefined();

        end = true;
    } catch (e) {
        console.log(e)
    }
    expect(end).toEqual(true);
});