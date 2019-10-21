import * from 'jest';
import { CtCoreRpcService } from '../../test/rpc-ct.stub';
import { OpenMarketProtocol } from '../../src/omp';
import { Cryptocurrency, OutputType } from '../../src/interfaces/crypto';
import { BidConfiguration } from '../../src/interfaces/configs';
import { EscrowType } from '../../src/interfaces/omp-enums';
import { toSatoshis, strip, log } from '../../src/util';
import { Rpc } from '../../src/abstract/rpc';
import { RpcUnspentOutput } from '../../src/interfaces/rpc';
import delay from 'delay';

describe('Buyflow: mad ct', () => {

    const WALLET = '';                      // use the default wallet
    const SECOND_WALLET = 'test-wallet';    // second wallet for the purpose of testing multiwallet

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

        if (!(await buyerNode0.walletExists(SECOND_WALLET))) {
            await buyerNode0.createWallet(SECOND_WALLET, false, true);
            await buyerNode0.setupWallet(SECOND_WALLET);
        }
        if (!(await sellerNode1.walletExists(SECOND_WALLET))) {
            await sellerNode1.createWallet(SECOND_WALLET, false, true);
            await sellerNode1.setupWallet(SECOND_WALLET);
        }

        if (!(await buyerNode0.walletLoaded(SECOND_WALLET))) {
            await buyerNode0.loadWallet(SECOND_WALLET);
        }
        if (!(await sellerNode1.walletLoaded(SECOND_WALLET))) {
            await sellerNode1.loadWallet(SECOND_WALLET);
        }

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

        // Step 1: Buyer does bid
        log(' >>>>> Step 1: Buyer does bid');
        const bid = await buyer.bid(WALLET, config, ok);
        const bid_stripped = strip(bid);

        const time = Date.now();
        await delay(10000);

        // Step 2: seller accepts
        log(' >>>>> Step 2: seller accepts');
        const accept = await seller.accept(WALLET, ok, bid_stripped);
        const accept_stripped = strip(accept);
        await expectCompletedTransaction(accept.action['_rawdesttx'], false);

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        log(' >>>>> Step 3: buyer signs destroy txn (done), signs bid txn (half)');
        await delay(10000);
        const lock = await buyer.lock(WALLET, ok, bid, accept_stripped);
        const lock_stripped = strip(lock);

        await expectCompletedTransaction(lock.action['_rawdesttx'], false);
        expect(lock.action['_rawreleasetxunsigned']).toEqual(accept.action['_rawreleasetxunsigned']);

        // Step 4: seller signs bid txn (full) and submits
        log(' >>>>> Step 4: seller signs bid txn (full) and submits');
        const complete = await seller.complete(WALLET, ok, bid_stripped, accept_stripped, lock_stripped);
        await expectCompletedTransaction(complete);

        const completeTxid = await buyerNode0.sendRawTransaction(complete);
        await sellerNode1.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();

        // Step 5: buyer signs release
        log(' >>>>> Step 5: buyer signs release');
        await delay(15000);
        const release = await buyer.release(WALLET, ok, bid, accept);
        await expectCompletedTransaction(release);

        const releaseTxid = await buyerNode0.sendRawTransaction(release);
        await sellerNode1.sendRawTransaction(release);
        expect(releaseTxid).toBeDefined();
        log('releaseTxid: ' + releaseTxid);

        await delay(20000); // 10000 doesnt seem to be enough
        await expectUtxoWithAmount(releaseTxid, buyerNode0, 2);
        await expectUtxoWithAmount(releaseTxid, sellerNode1, 3.99995000);

        log('!!! buyflow release success!');

        // await expect(releaseTxid).toBeUtxoWithAmount(buyerNode0, 2);
        // await expect(releaseTxid).toBeUtxoWithAmount(sellerNode1, 3.99995000);
        // await delay(2000);

    }, 600000);

    it('buyflow refund', async () => {
        jest.setTimeout(400000);

        // Step1: Buyer does bid
        log(' >>>>> Step 1: Buyer does bid');
        const bid = await buyer.bid(WALLET, config, ok);
        const bid_stripped = strip(bid);
        await delay(7000);

        // Step 2: seller accepts
        log(' >>>>> Step 2: seller accepts');
        const accept = await seller.accept(WALLET, ok, bid_stripped);
        const accept_stripped = strip(accept);
        await expectCompletedTransaction(accept.action['_rawdesttx'], false);
        await delay(7000);

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        log(' >>>>> Step 3: buyer signs destroy txn (done), signs bid txn (half)');
        const lock = await buyer.lock(WALLET, ok, bid, accept_stripped);
        const lock_stripped = strip(lock);
        await expectCompletedTransaction(lock.action['_rawdesttx'], false);
        expect(lock.action['_rawreleasetxunsigned']).toEqual(accept.action['_rawreleasetxunsigned']);

        // Step 4: seller signs bid txn (full) and submits
        log(' >>>>> Step 4: seller signs bid txn (full) and submits');
        const complete = await seller.complete(WALLET, ok, bid_stripped, accept_stripped, lock_stripped);
        await expectCompletedTransaction(complete, true);

        const completeTxid = await buyerNode0.sendRawTransaction(complete);
        await sellerNode1.sendRawTransaction(complete);
        expect(completeTxid).toBeDefined();
        await delay(15000);

        // Step 5: seller signs refund
        log(' >>>>> Step 5: seller signs refund');
        const refund = await seller.refund(WALLET, ok, bid, accept, lock);
        await expectCompletedTransaction(refund, true);

        const refundTxid = await buyerNode0.sendRawTransaction(refund);
        await sellerNode1.sendRawTransaction(refund);
        expect(refundTxid).toBeDefined();

        log('refundTxid: ' + refundTxid);
        await delay(20000);
        // await expect(refundTxid).toBeUtxoWithAmount(buyerNode0, 4);
        // await expect(refundTxid).toBeUtxoWithAmount(sellerNode1, 1.99995000);
        await expectUtxoWithAmount(refundTxid, buyerNode0, 4);
        await expectUtxoWithAmount(refundTxid, sellerNode1, 1.99995000);
        // await delay(2000);

        log('!!! buyflow refund success!');

    }, 600000);

    it('buyflow destroy (& prevent early mining)', async () => {
        jest.setTimeout(400000);

        // Step 1: Buyer does bid
        log(' >>>>> Step 1: Buyer does bid');
        const bid = await buyer.bid(WALLET, config, ok);
        const bid_stripped = strip(bid);
        await delay(10000);

        // Step 2: seller accepts
        log(' >>>>> Step 2: seller accepts');
        const accept = await seller.accept(WALLET, ok, bid_stripped);
        const accept_stripped = strip(accept);

        await expectCompletedTransaction(accept.action['_rawdesttx'], false);
        await delay(10000);

        // Step 3: buyer signs destroy txn (done), signs bid txn (half)
        log(' >>>>> Step 3: buyer signs destroy txn (done), signs bid txn (half)');
        const lock = await buyer.lock(WALLET, ok, bid_stripped, accept_stripped);
        const lock_stripped = strip(lock);

        await expectCompletedTransaction(lock.action['_rawdesttx'], false);
        await delay(7000);

        // Step 4: seller signs bid txn (full) and submits
        log(' >>>>> Step 4: seller signs bid txn (full) and submits');
        const complete = await seller.complete(WALLET, ok, bid_stripped, accept_stripped, lock_stripped);
        await expectCompletedTransaction(complete, true);

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
        const now = await buyerNode0.getBlockchainInfo().then(value => value.mediantime);
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

        log('!!! buyflow destroy success!');

    }, 600000);

    // tslint:disable:no-duplicated-branches
    const expectCompletedTransaction = async (rawtx: any, complete = true) => {
        const verify = await buyerNode0.verifyRawTransaction([rawtx]);
        const completed = verify['complete'];

        if (complete && !completed) {
            throw new Error('expected ' + rawtx + ' to be '
                + (complete ? 'completed' : 'incomplete')
                + ', but received ' + completed + ' instead.');
        } else if (!complete && completed) {
            throw new Error('expected ' + rawtx + ' to be '
                + (complete ? 'completed' : 'incomplete')
                + ', but received ' + completed + ' instead.');
        }
    };

    const expectUtxoWithAmount = async (txid: string, node: Rpc, amount: number) => {
        const outputs: RpcUnspentOutput[] = await node.listUnspent(WALLET, OutputType.ANON, 0);

        // log(outputs);

        const found = outputs.find(utxo => {
            log('find: ' + utxo.txid + ' === ' + txid + ', ' + utxo.amount + ' === ' + amount);
            return (utxo.txid === txid && utxo.amount === amount);
        });
        if (!found) {
            throw new Error(`expected ${txid} to be found on the node, but didn't find it.`);
        }
    };


    expect.extend({
        async toBeCompletedTransaction(rawtx: any): Promise<any> {
            const verify = await buyerNode0.verifyRawTransaction([rawtx]);
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
            const outputs: RpcUnspentOutput[] = await node.listUnspent(WALLET, OutputType.ANON, 0);

            // log(outputs);

            const found = outputs.find(utxo => {
                log('find: ' + utxo.txid + ' === ' + txid + ', ' + utxo.amount + ' === ' + amount);
                return (utxo.txid === txid && utxo.amount === amount);
            });
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
        return node.call('setmocktime', [expectedUnixTime, true], WALLET);
    };

    const waitTillJumped = async (expectedUnixTime: number, node: Rpc) => {
        return new Promise(async resolve => {
            let wait = true;

            while (wait) {

                const currentTime = await node.getBlockchainInfo().then(value => value.mediantime);
                wait = (currentTime <= expectedUnixTime);
                log(wait ? 'waiting..' : ('finished! ' + currentTime + ' > ' + expectedUnixTime ));
                await delay(1000);
            }

            resolve();
        });

    };

});
