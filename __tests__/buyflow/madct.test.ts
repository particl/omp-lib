import * from 'jest';
import { CtCoreRpcService } from '../../test/rpc-ct.stub';
import { OpenMarketProtocol } from '../../src/omp';
import { Cryptocurrency } from '../../src/interfaces/crypto';
import { BidConfiguration } from '../../src/interfaces/configs';
import { EscrowType } from '../../src/interfaces/omp-enums';
import { toSatoshis, strip, log } from '../../src/util';
import { Rpc } from '../../src/abstract/rpc';

describe('Buyflow: mad ct', () => {

    const delay = ms => {
        return new Promise(resolve => {
            return setTimeout(resolve, ms);
        });
    };

    let buyer: OpenMarketProtocol;
    let seller: OpenMarketProtocol;

    let node0: CtCoreRpcService;
    let node1: CtCoreRpcService;
    let node2: CtCoreRpcService;

    beforeAll(async () => {
        node0 = new CtCoreRpcService();
        node0.setup('localhost', 19792, 'rpcuser0', 'rpcpass0');

        node1 = new CtCoreRpcService();
        node1.setup('localhost', 19793, 'rpcuser1', 'rpcpass1');

        node2 = new CtCoreRpcService();
        node2.setup('localhost', 19794, 'rpcuser2', 'rpcpass2');

        buyer = new OpenMarketProtocol();
        buyer.inject(Cryptocurrency.PART, node0);

        seller = new OpenMarketProtocol();
        seller.inject(Cryptocurrency.PART, node1);
    });

    const extendedExpect: any = Object.assign(expect);

    extendedExpect.extend({
        async toBeCompletedTransaction(rawtx: string): Promise<any> {
            const verify = await node0.call('verifyrawtransaction', [rawtx]);
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

    extendedExpect.extend({
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
        let end = false;

        // try {

        ok.action.item.payment.options[0].address = await node0.getNewStealthAddress();
        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        const bid_stripped = strip(bid);

        await delay(7000);
        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);
        extendedExpect(accept.action['_rawdesttx']).not.toBeCompletedTransaction();

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        await delay(7000);
        const lock = await buyer.lock(ok, bid, accept_stripped);
        const lock_stripped = strip(lock);

        extendedExpect(lock.action['_rawdesttx']).not.toBeCompletedTransaction();

        expect(lock.action['_rawreleasetxunsigned']).toEqual(accept.action['_rawreleasetxunsigned']);

        // Step 4: seller signs bid txn (full) and submits
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        extendedExpect(complete).toBeCompletedTransaction();

        const completeTxid = await node0.sendRawTransaction(complete);
        await node1.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();

        // Step 5: buyer signs release
        await delay(10000);
        const release = await buyer.release(ok, bid, accept);
        extendedExpect(release).toBeCompletedTransaction();

        const releaseTxid = await node0.sendRawTransaction(release);
        await node1.sendRawTransaction(release);
        expect(releaseTxid).toBeDefined();

        await delay(10000);
        extendedExpect(releaseTxid).toBeUtxoWithAmount(node0, 2);
        extendedExpect(releaseTxid).toBeUtxoWithAmount(node1, 3.99995000);


        end = true;
        // } catch (e) {
        //    console.log(e);
        // }
        expect(end).toEqual(true);
    });

    it('buyflow refund', async () => {
        jest.setTimeout(400000);
        let end = false;

        // try {
        ok.action.item.payment.options[0].address = await node0.getNewStealthAddress();
        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        const bid_stripped = strip(bid);

        await delay(7000);
        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);

        extendedExpect(accept.action['_rawdesttx']).not.toBeCompletedTransaction();

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        await delay(7000);
        const lock = await buyer.lock(ok, bid, accept_stripped);
        const lock_stripped = strip(lock);

        extendedExpect(lock.action['_rawdesttx']).not.toBeCompletedTransaction();

        expect(lock.action['_rawreleasetxunsigned']).toEqual(accept.action['_rawreleasetxunsigned']);

        // Step 4: seller signs bid txn (full) and submits
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        extendedExpect(complete).toBeCompletedTransaction();

        const completeTxid = await node0.sendRawTransaction(complete);
        await node1.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();

        // Step 5: seller signs refund
        await delay(10000);
        const refund = await seller.refund(ok, bid, accept, lock);
        extendedExpect(refund).toBeCompletedTransaction();

        const refundTxid = await node0.sendRawTransaction(refund);
        await node1.sendRawTransaction(refund);
        expect(refundTxid).toBeDefined();

        await delay(10000);
        extendedExpect(refundTxid).toBeUtxoWithAmount(node0, 4);
        extendedExpect(refundTxid).toBeUtxoWithAmount(node1, 1.99995000);


        end = true;
        // } catch (e) {
        //    console.log(e);
        // }
        expect(end).toEqual(true);
    });

    it('buyflow destroy (& prevent early mining)', async () => {
        jest.setTimeout(400000);
        let end = false;

        // try {

        ok.action.item.payment.options[0].address = await node0.getNewStealthAddress();
        // Step1: Buyer does bid
        const bid = await buyer.bid(config, ok);
        const bid_stripped = strip(bid);

        await delay(10000);
        // Step 2: seller accepts
        const accept = await seller.accept(ok, bid_stripped);
        const accept_stripped = strip(accept);

        extendedExpect(accept.action['_rawdesttx']).not.toBeCompletedTransaction();

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        await delay(10000);
        const lock = await buyer.lock(ok, bid_stripped, accept_stripped);
        const lock_stripped = strip(lock);

        extendedExpect(lock.action['_rawdesttx']).not.toBeCompletedTransaction();

        // Step 4: seller signs bid txn (full) and submits
        await delay(7000);
        const complete = await seller.complete(ok, bid_stripped, accept_stripped, lock_stripped);
        extendedExpect(complete).toBeCompletedTransaction();

        const completeTxid = await node0.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();

        // Can not destroy the funds before the timer has been reached
        let shouldFailToDestroy = false;
        try {
            await node0.sendRawTransaction(lock.action['_rawdesttx']);
        } catch (e) {
            shouldFailToDestroy = (e['message'] === 'non-BIP68-final (code 64)');
        }
        expect(shouldFailToDestroy).toEqual(true);

        // Use daemon as a source of truth for what the current time is.
        const now = (await node0.call('getblockchaininfo', []))['mediantime'];
        const feasibleFrom = (now + 2880);

        // Travelling through time, 3000s in the future!
        await Promise.all([
            timeTravel(feasibleFrom, node0),
            timeTravel(feasibleFrom, node1),
            timeTravel(feasibleFrom, node2)
        ]);

        // Let a few blocks mine
        await waitTillJumped(feasibleFrom, node0);

        // Should be able to destroy them now
        let destroytxid: string;
        try {
            destroytxid = await node0.sendRawTransaction(lock.action['_rawdesttx']);
        } catch (e) {
            console.log('ERROR: ' + e);
        }
        expect(destroytxid).toBeDefined();

        end = true;
        // } catch (e) {
        //    console.log('ERROR: ' + e);
        // }
        expect(end).toEqual(true);
    });
});
