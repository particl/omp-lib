import { MPA_EXT_LISTING_ADD, MPA_BID, MPM } from "./interfaces/omp";
import { CryptoType, CryptoAddressType } from "./interfaces/crypto";
import { MPAction, EscrowType } from "./interfaces/omp-enums";
import { hash } from "./hasher/hash";
import { MultiSigBuilder } from "./transaction-builder/multisig";
import { BidConfiguration } from './interfaces/configs';

import { injectable, inject } from "inversify";
import { IMultiSigBuilder } from "./abstract/transactions";
import { TYPES } from "./types";

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
    const mpa_listing = <MPA_EXT_LISTING_ADD>listing.action;
    config.escrow = mpa_listing.item.payment.escrow.type;

    const bid = {
      version: "0.1.0.0",
      action: {
        type: MPAction.MPA_BID,
        created: + new Date(), // timestamp
        item: hash(listing), // item hash
        buyer: {
          payment: {
            cryptocurrency: config.cryptocurrency,
            escrow: config.escrow,
            pubKey: "",
            changeAddress: {
              type: CryptoAddressType.NORMAL,
              address: ""
            },
            outputs: []
          },
          shippingAddress: config.shippingAddress
        },
          objects: config.objects
          // objects: KVS[]
      }
    }

    // Pick correct route for configuration
    // add the data to the bid object.
    switch (config.escrow) {
      case EscrowType.MULTISIG:
        await this._msb.bid(listing, bid);
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
    const mpa_listing = <MPA_EXT_LISTING_ADD>listing.action;
    const mpa_bid = <MPA_BID>bid.action;

    const payment = mpa_bid.buyer.payment;

    const accept = {
      version: "0.1.0.0",
      action: {
        type: MPAction.MPA_ACCEPT,
        bid: hash(bid), // item hash
        seller: {
          payment: {
            escrow: payment.escrow,
            pubKey: "",
            changeAddress: {
              type: CryptoAddressType.NORMAL,
              address: ""
            },
            outputs: [],
            signatures: []
          }
        },
        // objects: KVS[]
      }
    }


    switch (payment.escrow) {
      case EscrowType.MULTISIG:
        await this._msb.accept(listing, bid, accept);
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
    const mpa_listing = <MPA_EXT_LISTING_ADD>listing.action;
    const mpa_bid = <MPA_BID>bid.action;

    const payment = mpa_bid.buyer.payment;

    const lock = {
      version: "0.1.0.0",
      action: {
        type: MPAction.MPA_LOCK,
        bid: hash(bid), // item hash
        buyer: {
          payment: {
            escrow: payment.escrow,
            signatures: []
          }
        },
        // objects: KVS[]
      }
    }


    switch (payment.escrow) {
      case EscrowType.MULTISIG:
        await this._msb.lock(listing, bid, accept, lock);
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
  */
  public async release(listing: MPM, bid: MPM, accept: MPM, release?: MPM): Promise<MPM> {
    const mpa_listing = <MPA_EXT_LISTING_ADD>listing.action;
    const mpa_bid = <MPA_BID>bid.action;

    const payment = mpa_bid.buyer.payment;

    if(!release) {
      release = <MPM>{
        version: "0.1.0.0",
        action: {
          type: MPAction.MPA_RELEASE,
          bid: hash(bid), // item hash
          seller: {
            payment: {
              escrow: payment.escrow,
              signatures: []
            }
          },
          // objects: KVS[]
        }
      }
    }

    switch (payment.escrow) {
      case EscrowType.MULTISIG:
        await this._msb.release(listing, bid, accept, release);
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
  */
  public async refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund?: MPM): Promise<MPM> {
    const mpa_listing = <MPA_EXT_LISTING_ADD>listing.action;
    const mpa_bid = <MPA_BID>bid.action;

    const payment = mpa_bid.buyer.payment;

    if(!refund) {
      refund = <MPM>{
        version: "0.1.0.0",
        action: {
          type: MPAction.MPA_REFUND,
          bid: hash(bid), // item hash
          buyer: {
            payment: {
              escrow: payment.escrow,
              signatures: []
            }
          },
          // objects: KVS[]
        }
      }
    }

    switch (payment.escrow) {
      case EscrowType.MULTISIG:
        await this._msb.refund(listing, bid, accept, lock, refund);
        break;
    }

    return refund;
  }
}