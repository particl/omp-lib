import { MPA_BID, MPM, MPA_ACCEPT, MPA_LOCK, MPA_LISTING_ADD } from './interfaces/omp';
import { MPAction, EscrowType } from './interfaces/omp-enums';
import { hash } from './hasher/hash';
import { BidConfiguration } from './interfaces/configs';

import { inject, injectable } from 'inversify';
import { IMadCTBuilder, IMultiSigBuilder } from './abstract/transactions';
import { TYPES } from './types';
import { OMPVERSION } from './util';

// tslint:disable:no-small-switch

@injectable()
export class Bid {

    private _msb: IMultiSigBuilder;
    private _madct: IMadCTBuilder;

    constructor(
        @inject(TYPES.MultiSigBuilder) msb: IMultiSigBuilder,
        @inject(TYPES.MadCTBuilder) madct: IMadCTBuilder
    ) {
        this._msb = msb;
        this._madct = madct;
    }

    /**
     * Construct the 'bid' instance for the reply.
     * Add payment data to reply based on configured cryptocurrency & escrow.
     * Add shipping details to reply
     *
     * @param config a bid configuration
     * @param listing the listing for which to produce a bid
     */
    public async bid(config: BidConfiguration, listing: MPM): Promise<MPM> {
        const mpa_listing = <MPA_LISTING_ADD> listing.action;
        config.escrow = mpa_listing.item.payment.escrow!.type;

        const bid = <MPA_BID> {
            type: MPAction.MPA_BID,
            hash: '',
            generated: +new Date(), // timestamp
            item: hash(listing), // item hash
            buyer: {
                payment: {
                    cryptocurrency: config.cryptocurrency,
                    escrow: config.escrow,
                    /*pubKey: '',
                    changeAddress: {
                        type: CryptoAddressType.NORMAL,
                        address: ''
                    },*/
                    prevouts: []
                },
                shippingAddress: config.shippingAddress
            },
            objects: config.objects
        };

        // Pick correct route for configuration
        // add the data to the bid object.
        switch (config.escrow) {
            case EscrowType.MULTISIG:
                await this._msb.bid(listing.action, bid);
                break;
            case EscrowType.MAD_CT:
            /*
                delete bid.buyer.payment.pubKey;
                delete bid.buyer.payment.changeAddress; */
                await this._madct.bid(listing.action, bid);
                break;
            default:
                throw new Error('payment.escrow type=' + config.escrow + ' does not have a valid escrow handling function for accept');
        }

        const msg: MPM = {
            version: OMPVERSION,
            action: bid
        };

        return msg;
    }

    /**
     * Seller accepts a bid.
     * Add payment data to reply based on configured cryptocurrency & escrow (bid tx).
     * Adds signatures for destruction transaction.
     *
     * @param listing the listing.
     * @param bid the bid for which to produce an accept message.
     */
    public async accept(listing: MPM, bid: MPM): Promise<MPM> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        const accept = <MPA_ACCEPT> {
            type: MPAction.MPA_ACCEPT,
            hash: '',
            generated: +new Date(), // timestamp
            bid: hash(bid), // item hash
            seller: {
                payment: {
                    escrow: payment.escrow,
                    // TODO: refactor to be gone, only used in multisig
                    /*
                    pubKey: '',
                    changeAddress: {
                        type: CryptoAddressType.NORMAL,
                        address: ''
                    },*/
                    fee: 0,
                    prevouts: [],
                    signatures: [],
                    release: {
                        signatures: []
                    }
                }
            }
        };


        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                await this._msb.accept(listing.action, bid.action, accept);
                break;
            case EscrowType.MAD_CT:
            /*
                delete accept.seller.payment.pubKey;
                delete accept.seller.payment.changeAddress;
                delete accept.seller.payment.signatures; */
                await this._madct.accept(listing.action, bid.action, accept);
                break;
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a valid escrow handling function for accept');
        }

        const msg: MPM = {
            version: OMPVERSION,
            action: accept
        };

        return msg;
    }

    /**
     * Buyer locks a bid.
     *
     *
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message for which to produce an lock message.
     */
    public async lock(listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        const lock = <MPA_LOCK> {
            type: MPAction.MPA_LOCK,
            hash: '',
            generated: +new Date(), // timestamp
            bid: hash(bid), // item hash
            buyer: {
                payment: {
                    escrow: payment.escrow,
                    signatures: [],
                    refund: {
                        signatures: []
                    }
                }
            },
            info: {
                memo: ''
            }
        };


        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                await this._msb.lock(listing.action, bid.action, accept.action, lock);
                break;
            case EscrowType.MAD_CT:
                /**
                 * MAD CT
                 * Add signatures of buyer for destroy tx and bid tx.
                 * Destroy txn: fully signed
                 * Bid txn: only signed by buyer.
                 */
                lock.buyer.payment.destroy = {
                    signatures: []
                };
                await this._madct.lock(listing.action, bid.action, accept.action, lock);
                break;
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a valid escrow handling function for lock');

        }

        const msg: MPM = {
            version: OMPVERSION,
            action: lock
        };

        return msg;
    }

    /**
     * Seller completes a bid.
     * Add signatures of buyer.
     *
     * MAD CT
     * Destroy txn: fully signed
     * Bid txn: fully signed (no real message produced).
     *
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message for which to produce an lock message.
     */
    public async complete(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> {

        const mpa_bid = <MPA_BID> bid.action;
        const payment = mpa_bid.buyer.payment;

        switch (payment.escrow) {
            case EscrowType.MAD_CT:
                return this._madct.complete(listing.action, bid.action, accept.action, lock.action);
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a complete stage.');

        }
    }

    /**
     * Release funds
     * Add signatures of seller.
     *
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message.
     */
    public async release(listing: MPM, bid: MPM, accept: MPM): Promise<string> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                return this._msb.release(listing.action, bid.action, accept.action);
            case EscrowType.MAD_CT:
                return this._madct.release(listing.action, bid.action, accept.action);
            case EscrowType.MAD:
            case EscrowType.FE:
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a valid escrow handling function for release');
        }

    }

    /**
     * Release funds
     * Add signatures of seller.
     *
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message for which to produce an lock message.
     */
    public async refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                return this._msb.refund(listing.action, bid.action, accept.action, lock.action);
            case EscrowType.MAD_CT:
                return this._madct.refund(listing.action, bid.action, accept.action, lock.action);
            case EscrowType.MAD:
            case EscrowType.FE:
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a valid escrow handling function for refund');
        }

    }
}
