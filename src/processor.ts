import {
    MPA_BID,
    MPM,
    MPA_ACCEPT,
    MPA_LOCK,
    MPA_LISTING_ADD,
    BuyerData,
    PaymentDataLock,
    PaymentDataBid, PaymentDataLockCT
} from './interfaces/omp';
import { MPAction, EscrowType } from './interfaces/omp-enums';
import { ConfigurableHasher } from './hasher/hash';
import { BidConfiguration } from './interfaces/configs';
import { inject, injectable } from 'inversify';
import { IMadCTBuilder, IMultiSigBuilder } from './abstract/transactions';
import { TYPES } from './types';
import { ompVersion } from './omp';
import { HashableListingMessageConfig } from './hasher/config/listingitemadd';
import { HashableBidMessageConfig } from './hasher/config/bid';

// tslint:disable:no-small-switch

@injectable()
export class Processor {

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
     * @param wallet
     * @param config a bid configuration
     * @param listing the listing for which to produce a bid
     */
    public async bid(wallet: string, config: BidConfiguration, listing: MPM): Promise<MPM> {
        const mpa_listing = <MPA_LISTING_ADD> listing.action;
        config.escrow = mpa_listing.item.payment.escrow!.type;

        const hashedItem = ConfigurableHasher.hash(listing.action, new HashableListingMessageConfig());

        const bid = <MPA_BID> {
            type: MPAction.MPA_BID,
            hash: '',
            generated: +new Date(), // timestamp
            item: hashedItem, // hash(listing), // item hash
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

        bid.hash = ConfigurableHasher.hash(bid, new HashableBidMessageConfig());

        // Pick correct route for configuration
        // add the data to the bid object.
        switch (config.escrow) {
            case EscrowType.MULTISIG:
                await this._msb.bid(wallet, listing.action, bid);
                break;
            case EscrowType.MAD_CT:
            /*
                delete bid.buyer.payment.pubKey;
                delete bid.buyer.payment.changeAddress; */
                await this._madct.bid(wallet, listing.action, bid);
                break;
            default:
                throw new Error('payment.escrow type=' + config.escrow + ' does not have a valid escrow handling function for accept');
        }

        const msg: MPM = {
            version: ompVersion(),
            action: bid
        };

        return msg;
    }

    /**
     * Seller accepts a bid.
     * Add payment data to reply based on configured cryptocurrency & escrow (bid tx).
     * Adds signatures for destruction transaction.
     *
     * @param wallet
     * @param listing the listing.
     * @param bid the bid for which to produce an accept message.
     */
    public async accept(wallet: string, listing: MPM, bid: MPM): Promise<MPM> {
        const mpa_bid = <MPA_BID> bid.action;
        const payment = mpa_bid.buyer.payment;

        const hashedBid = ConfigurableHasher.hash(bid.action, new HashableBidMessageConfig());

        const accept = <MPA_ACCEPT> {
            type: MPAction.MPA_ACCEPT,
            hash: '',
            generated: +new Date(), // timestamp
            bid: hashedBid, // hash(bid), // bid hash
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
                await this._msb.accept(wallet, listing.action, bid.action, accept);
                break;
            case EscrowType.MAD_CT:
            /*
                delete accept.seller.payment.pubKey;
                delete accept.seller.payment.changeAddress;
                delete accept.seller.payment.signatures; */
                await this._madct.accept(wallet, listing.action, bid.action, accept);
                break;
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a valid escrow handling function for accept');
        }

        const msg: MPM = {
            version: ompVersion(),
            action: accept
        };

        return msg;
    }

    /**
     * Buyer locks a bid.
     *
     *
     * @param wallet
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message for which to produce an lock message.
     */
    public async lock(wallet: string, listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {

        const mpa_bid = bid.action as MPA_BID;
        const payment = mpa_bid.buyer.payment as PaymentDataBid;

        const hashedBid = ConfigurableHasher.hash(bid.action, new HashableBidMessageConfig());

        const lock: MPA_LOCK = {
            type: MPAction.MPA_LOCK,
            hash: '',
            generated: +new Date(), // timestamp
            bid: hashedBid, // hash(bid), // bid hash
            buyer: {
                payment: {
                    escrow: payment.escrow,
                    signatures: [],
                    refund: {
                        signatures: []
                    }
                } as PaymentDataLock
            } as BuyerData,
            info: {
                memo: ''
            }
        };


        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                await this._msb.lock(wallet, listing.action, bid.action, accept.action, lock);
                break;
            case EscrowType.MAD_CT:
                /**
                 * MAD CT
                 * Add signatures of buyer for destroy tx and bid tx.
                 * Destroy txn: fully signed
                 * Bid txn: only signed by buyer.
                 */
                (lock.buyer.payment as PaymentDataLockCT).destroy = {
                    signatures: []
                };
                await this._madct.lock(wallet, listing.action, bid.action, accept.action, lock);
                break;
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a valid escrow handling function for lock');

        }

        const msg: MPM = {
            version: ompVersion(),
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
     * @param wallet
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message for which to produce an lock message.
     * @param lock
     */
    public async complete(wallet: string, listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> {

        const mpa_bid = <MPA_BID> bid.action;
        const payment = mpa_bid.buyer.payment;

        switch (payment.escrow) {
            case EscrowType.MAD_CT:
                return this._madct.complete(wallet, listing.action, bid.action, accept.action, lock.action);
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a complete stage.');

        }
    }

    /**
     * Release funds
     * Add signatures of seller.
     *
     * @param wallet
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message.
     */
    public async release(wallet: string, listing: MPM, bid: MPM, accept: MPM): Promise<string> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                return this._msb.release(wallet, listing.action, bid.action, accept.action);
            case EscrowType.MAD_CT:
                return this._madct.release(wallet, listing.action, bid.action, accept.action);
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
     * @param wallet
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message for which to produce an lock message.
     * @param lock
     */
    public async refund(wallet: string, listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                return this._msb.refund(wallet, listing.action, bid.action, accept.action, lock.action);
            case EscrowType.MAD_CT:
                return this._madct.refund(wallet, listing.action, bid.action, accept.action, lock.action);
            case EscrowType.MAD:
            case EscrowType.FE:
            default:
                throw new Error('payment.escrow type=' + payment.escrow + ' does not have a valid escrow handling function for refund');
        }

    }
}
