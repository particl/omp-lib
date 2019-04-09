import {
    MPA_LISTING_ADD,
    MPA_BID,
    MPM,
    MPA_ACCEPT,
    MPA_LOCK,
    LockInfo,
    BuyerData,
    PaymentDataSign,
    MPA_RELEASE,
    SellerData,
    MPA_REFUND, PaymentData
} from './interfaces/omp';
import { Cryptocurrency, CryptoAddressType } from './interfaces/crypto';
import { MPAction, EscrowType } from './interfaces/omp-enums';
import { hash } from './hasher/hash';
import { MultiSigBuilder } from './transaction-builder/multisig';
import { BidConfiguration } from './interfaces/configs';

import { injectable, inject } from 'inversify';
import { IMultiSigBuilder } from './abstract/transactions';
import { TYPES } from './types';
import { ompVersion } from './omp';

/**
 * todo: should we sequence verify before bidding and accepting
 * as a failsafe against a faulty implementation?
 */
@injectable()
export class Bid {

    private _msb: IMultiSigBuilder;

    constructor(
        @inject(TYPES.MultiSigBuilder) msb: IMultiSigBuilder
    ) {
        this._msb = msb;
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

        if (mpa_listing.item.payment.escrow) {
            config.escrow = mpa_listing.item.payment.escrow.type;
        } else {
            throw new Error('escrow: missing');
        }

        // todo: use factory to generate this
        let bid = {
            version: ompVersion(),
            action: {
                type: MPAction.MPA_BID,
                generated: +new Date().getTime(), // timestamp
                item: hash(listing), // item hash
                buyer: { // buyer payment details will be added by the multisigbuilder
                    payment: {
                        cryptocurrency: config.cryptocurrency,
                        escrow: config.escrow,
                        pubKey: '',
                        changeAddress: {
                            type: CryptoAddressType.NORMAL,
                            address: ''
                        },
                        outputs: []
                    },
                    shippingAddress: config.shippingAddress
                },
                objects: config.objects,
                hash: ''
            } as MPA_BID
        } as MPM;

        // Pick correct route for configuration
        // add the data to the bid object.
        switch (config.escrow) {
            case EscrowType.MULTISIG:
                bid = await this._msb.bid(listing, bid);
                break;
            case EscrowType.FE:
            case EscrowType.MAD:
            case EscrowType.MAD_CT:
            default:
                break;
        }

        return bid;
    }

    /**
     * Accept a bid.
     * Add payment data to reply based on configured cryptocurrency & escrow.
     *
     * @param listing the listing.
     * @param bid the bid for which to produce an accept message.
     */
    public async accept(listing: MPM, bid: MPM): Promise<MPM> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        let accept = {
            version: ompVersion(),
            action: {
                type: MPAction.MPA_ACCEPT,
                bid: hash(bid), // item hash
                seller: {
                    payment: {
                        escrow: payment.escrow,
                        pubKey: '',
                        changeAddress: {
                            type: CryptoAddressType.NORMAL,
                            address: ''
                        },
                        outputs: [],
                        signatures: []
                    }
                },
                // objects: KVS[]
                generated: +new Date().getTime(), // timestamp
                hash: ''
            } as MPA_ACCEPT
        } as MPM;


        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                accept = await this._msb.accept(listing, bid, accept);
                break;
            case EscrowType.FE:
            case EscrowType.MAD:
            case EscrowType.MAD_CT:
            default:
                break;
        }

        return accept;
    }

    /**
     * Lock a bid.
     * Add signatures of buyer.
     *
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message for which to produce an lock message.
     */
    public async lock(listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {
        const mpa_listing = <MPA_LISTING_ADD> listing.action;
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        let lock = {
            version: ompVersion(),
            action: {
                type: MPAction.MPA_LOCK,
                bid: hash(bid), // item hash
                buyer: {
                    payment: {
                        escrow: payment.escrow,
                        signatures: []
                    } as PaymentDataSign
                } as BuyerData,
                info: {
                    memo: 'memo'
                } as LockInfo,
                // objects: KVS[]
                generated: +new Date().getTime(), // timestamp
                hash: ''
            } as MPA_LOCK
        } as MPM;

        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                lock = await this._msb.lock(listing, bid, accept, lock);
                break;
            case EscrowType.FE:
            case EscrowType.MAD:
            case EscrowType.MAD_CT:
            default:
                break;
        }

        return lock;
    }

    /**
     * Release funds
     * Add signatures of seller.
     *
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message.
     * @param release
     */
    public async release(listing: MPM, bid: MPM, accept: MPM, release?: MPM): Promise<MPM> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        if (!release) {
            release = {
                version: ompVersion(),
                action: {
                    type: MPAction.MPA_RELEASE,
                    bid: hash(bid), // item hash
                    seller: {
                        payment: {
                            escrow: payment.escrow,
                            signatures: []
                        }
                    } as SellerData
                    // objects: KVS[]
                } as MPA_RELEASE
            } as MPM;
        }

        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                release = await this._msb.release(listing, bid, accept, release);
                break;
            case EscrowType.FE:
            case EscrowType.MAD:
            case EscrowType.MAD_CT:
            default:
                break;
        }

        return release;
    }

    /**
     * Release funds
     * Add signatures of seller.
     *
     * @param listing the listing message.
     * @param bid the bid message.
     * @param accept the accept message for which to produce an lock message.
     * @param refund
     */
    public async refund(listing: MPM, bid: MPM, accept: MPM, refund?: MPM): Promise<MPM> {
        const mpa_bid = <MPA_BID> bid.action;

        const payment = mpa_bid.buyer.payment;

        if (!refund) {
            refund = {
                version: ompVersion(),
                action: {
                    type: MPAction.MPA_REFUND,
                    bid: hash(bid), // item hash
                    buyer: {
                        payment: {
                            escrow: payment.escrow
                        } as PaymentData
                    } as BuyerData
                } as MPA_REFUND
            } as MPM;
        }

        switch (payment.escrow) {
            case EscrowType.MULTISIG:
                await this._msb.refund(listing, bid, accept, refund);
                break;
            case EscrowType.FE:
            case EscrowType.MAD:
            case EscrowType.MAD_CT:
            default:
                break;
        }

        return refund;
    }
}
