import * from 'jest';
import { CtCoreRpcService } from '../../test/rpc-ct.stub';
import { OpenMarketProtocol } from '../../src/omp';
import { Cryptocurrency } from '../../src/interfaces/crypto';
import { BidConfiguration } from '../../src/interfaces/configs';
import { EscrowType } from '../../src/interfaces/omp-enums';
import { toSatoshis, strip, log } from '../../src/util';
import { Rpc } from '../../src/abstract/rpc';

describe('Buyflow: mad ct', () => {

    let buyer: OpenMarketProtocol;
    let seller: OpenMarketProtocol;

    let buyerNode0: CtCoreRpcService;
    let sellerNode1: CtCoreRpcService;

    beforeAll(async () => {
        buyerNode0 = new CtCoreRpcService();
        buyerNode0.setup('localhost', 19792, 'rpcuser0', 'rpcpass0');

        sellerNode1 = new CtCoreRpcService();
        sellerNode1.setup('localhost', 19793, 'rpcuser1', 'rpcpass1');

        buyer = new OpenMarketProtocol({ network: 'testnet'});
        buyer.inject(Cryptocurrency.PART, buyerNode0);

        seller = new OpenMarketProtocol({ network: 'testnet'});
        seller.inject(Cryptocurrency.PART, sellerNode1);
    });

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
                "options": [
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
              "messaging": {
                "options": [
                    {
                      "protocol": "TODO",
                      "publicKey": "TODO"
                    }
                  ]
              }
            }
        }
    }`);

    const config: BidConfiguration = {
        cryptocurrency: Cryptocurrency.PART,
        escrow: EscrowType.MAD_CT,
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

    it('buyflow release', async () => {
        jest.setTimeout(400000);

        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        const bid_stripped = strip(bid);
        await delay(7000);

        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);
        expect(accept.action['_rawdesttx']).not.toBeCompletedTransaction();

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        await delay(7000);
        const lock = await buyer.lock(ok, bid, accept_stripped);
        const lock_stripped = strip(lock);

        expect(lock.action['_rawdesttx']).not.toBeCompletedTransaction();
        expect(lock.action['_rawreleasetxunsigned']).toEqual(accept.action['_rawreleasetxunsigned']);

        // Step 4: seller signs bid txn (full) and submits
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        expect(complete).toBeCompletedTransaction();

        const completeTxid = await buyerNode0.sendRawTransaction(complete);
        await sellerNode1.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();

        // Step 5: buyer signs release
        await delay(10000);
        const release = await buyer.release(ok, bid, accept);
        expect(release).toBeCompletedTransaction();

        const releaseTxid = await buyerNode0.sendRawTransaction(release);
        await sellerNode1.sendRawTransaction(release);
        expect(releaseTxid).toBeDefined();

        await delay(10000);
        expect(releaseTxid).toBeUtxoWithAmount(buyerNode0, 2);
        expect(releaseTxid).toBeUtxoWithAmount(sellerNode1, 3.99995000);

    }, 600000);

    it('buyflow refund', async () => {
        jest.setTimeout(400000);

        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        const bid_stripped = strip(bid);
        await delay(7000);

        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);
        expect(accept.action['_rawdesttx']).not.toBeCompletedTransaction();
        await delay(7000);

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        const lock = await buyer.lock(ok, bid, accept_stripped);
        const lock_stripped = strip(lock);
        expect(lock.action['_rawdesttx']).not.toBeCompletedTransaction();
        expect(lock.action['_rawreleasetxunsigned']).toEqual(accept.action['_rawreleasetxunsigned']);

        // Step 4: seller signs bid txn (full) and submits
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        expect(complete).toBeCompletedTransaction();

        const completeTxid = await buyerNode0.sendRawTransaction(complete);
        await sellerNode1.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();
        await delay(10000);

        // Step 5: seller signs refund
        const refund = await seller.refund(ok, bid, accept, lock);
        expect(refund).toBeCompletedTransaction();

        const refundTxid = await buyerNode0.sendRawTransaction(refund);
        await sellerNode1.sendRawTransaction(refund);
        expect(refundTxid).toBeDefined();

        await delay(10000);
        expect(refundTxid).toBeUtxoWithAmount(buyerNode0, 4);
        expect(refundTxid).toBeUtxoWithAmount(sellerNode1, 1.99995000);

    }, 600000);

    it('buyflow destroy (& prevent early mining)', async () => {
        jest.setTimeout(400000);

        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        const bid_stripped = strip(bid);
        await delay(10000);

        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);

        expect(accept.action['_rawdesttx']).not.toBeCompletedTransaction();
        await delay(10000);

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        const lock = await buyer.lock(ok, bid_stripped, accept_stripped);
        const lock_stripped = strip(lock);

        expect(lock.action['_rawdesttx']).not.toBeCompletedTransaction();
        await delay(7000);

        // Step 4: seller signs bid txn (full) and submits
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        expect(complete).toBeCompletedTransaction();

        const completeTxid = await buyerNode0.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();

        // Can not destroy the funds before the timer has been reached
        let shouldFailToDestroy = false;
        await buyerNode0.sendRawTransaction(lock.action['_rawdesttx'])
            .catch(reason => {
                shouldFailToDestroy = true;
            });
        expect(shouldFailToDestroy).toEqual(true);

        // Use daemon as a source of truth for what the current time is.
        const now = (await buyerNode0.call('getblockchaininfo', []))['mediantime'];
        const feasibleFrom = (now + 2880);

        // Travelling through time, 3000s in the future!
        await Promise.all([
            timeTravel(feasibleFrom, buyerNode0),
            timeTravel(feasibleFrom, sellerNode1)
        ]);

        // Let a few blocks mine
        await waitTillJumped(feasibleFrom, buyerNode0);

        // Should be able to destroy them now
        const destroytxid = await buyerNode0.sendRawTransaction(lock.action['_rawdesttx']);
        expect(destroytxid).toBeDefined();

    }, 600000);


    const delay = ms => {
        return new Promise(resolve => {
            return setTimeout(resolve, ms);
        });
    };

    // const expect2: any = Object.assign(expect);

    expect.extend({
        async toBeCompletedTransaction(rawtx: any): Promise<any> {
            const verify = await buyerNode0.call('verifyrawtransaction', [rawtx]);
            const completed = verify['complete'];
            if (completed) {
                return {
                    message: () =>
                        `expected ${rawtx} to be completed.`,
                    pass: true
                };
            } else {
                return {
                    message: () =>
                        `expected ${rawtx} to be completed but received ${completed} instead`,
                    pass: false
                };
            }
        }
    });

    expect.extend({
        async toBeUtxoWithAmount(txid: string, node: Rpc, amount: number): Promise<any> {
            const found = (await node.call('listunspentanon', [0])).find(utxo => (utxo.txid === txid && utxo.amount === amount));
            if (found) {
                return {
                    message: () =>
                        `expected ${txid} to be found on the node with amount ${amount}.`,
                    pass: true
                };
            } else {
                return {
                    message: () =>
                        `expected ${txid} to be found on the node but didn't find it.`,
                    pass: false
                };
            }
        }
    });

    const timeTravel = (expectedUnixTime: number, node: Rpc) => {
        return node.call('setmocktime', [expectedUnixTime, true]);
    };

    const waitTillJumped = async (expectedUnixTime: number, node: Rpc) => {
        return new Promise(async resolve => {
            let wait = true;

            while (wait) {
                const currentTime = (await node.call('getblockchaininfo', []))['mediantime'];
                wait = (currentTime <= expectedUnixTime);
                // console.log(wait ? 'waiting..' : ('finished! ' + currentTime + ' > ' + expectedUnixTime ));
                await delay(1000);
            }

            resolve();
        });

    };
});
