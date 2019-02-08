/**
 * All the interfaces of OMP.
 *
 * TODO: MPA_LISTING_UPDATE, MPA_LISTING_REMOVE
 */

import { Output, CryptoAddress, Cryptocurrency, ISignature } from './crypto';
import { DSN, ContentReference } from './dsn';
import { MPAction, PaymentType, EscrowType } from './omp-enums';
import { KVS } from './common';


/**
 * All the interfaces of OMP.
 */
export interface MPM {
    version: string;
    action: MPA;
    _rawtx?: string;
}

export interface MPA {
    type: MPAction;
}


/**
 * This is the most basic listing.
 * It should only contain the necessary fields
 * as documented in protocol.
 */
export interface MPA_LISTING_ADD extends MPA {
    type: MPAction.MPA_LISTING_ADD;
    item: {
        // created: number, // timestamp // add?
        // item doesn't need created or any other timestamps, those come from the smsgmessage
        // hash: string, //item hash // TODO: remove
        information: {
            title: string,
            shortDescription: string,
            longDescription: string,
            category: string[]
        },
        payment: {
            type: PaymentType,
            escrow: {
                type: EscrowType,
                ratio: { // Missing from spec
                    buyer: number,
                    seller: number
                }
            },
            cryptocurrency: [{
                currency: Cryptocurrency,
                basePrice: number
            }]
        },
        messaging: [{
            protocol: string,
            publicKey: string
        }],
        objects?: any[]
    };
}


/**
 * This is the extended listing.
 * It can also include additional fields.
 */
export interface MPA_EXT_LISTING_ADD extends MPA_LISTING_ADD {
    type: MPAction.MPA_LISTING_ADD;
    item: {
        // created: number, // timestamp // add?
        // hash: string, // remove!
        information: {
            title: string,
            shortDescription: string,
            longDescription: string,
            category: string[],
            location: {
                country: string,
                address: string,
                gps: {
                    lng: number,
                    lat: number,
                    markerTitle: string,
                    markerText: string
                }
            },
            shippingDestinations: string[],
            images: ContentReference[]
        },
        payment: {
            type: PaymentType,
            escrow: {
                type: EscrowType,
                ratio: {
                    buyer: number,
                    seller: number
                }
            },
            cryptocurrency: [
                {
                    currency: Cryptocurrency,
                    basePrice: number,
                    shippingPrice: {
                        domestic: number,
                        international: number
                    },
                    address: CryptoAddress
                }
                ]
        },
        messaging: [
            {
                protocol: string,
                publicKey: string
            }
            ],
        objects?: KVS[]
    };
}

/**
 *  MPA_BID (buyer -> sender)
 *  It includes their payment details and links to the listing.
 */
export interface MPA_BID extends MPA { // completely refactored, !implementation !protocol
    type: MPAction;
    created: number; // timestamp
    item: string; // item hash
    buyer: {
        payment: {
            cryptocurrency: Cryptocurrency,
            escrow: EscrowType,
            pubKey: string,
            changeAddress: CryptoAddress,
            outputs: Output[]
        },
        shippingAddress: {
            firstName: string,
            lastName: string,
            addressLine1: string,
            addressLine2: string, // optional
            city: string,
            state: string,
            zipCode: string,
            country: string
        }
    };
    objects?: KVS[];
}

export interface MPA_REJECT extends MPA {
    type: MPAction.MPA_REJECT;
    bid: string; // item hash

}

/**
 *  MPA_ACCEPT (seller -> buyer)
 *  Seller added his payment data.
 */
export interface MPA_ACCEPT extends MPA {

    type: MPAction.MPA_ACCEPT;
    bid: string; // hash of MPA_BID
    seller: {
        payment: {
            escrow: EscrowType,
            pubKey: string,
            changeAddress: CryptoAddress,
            fee: number,
            outputs: Output[],
            signatures: ISignature[]
        }
    };
}

export interface MPA_CANCEL extends MPA { // !implementation !protocol

    type: MPAction.MPA_CANCEL;
    bid: string; // hash of MPA_BID

}

/**
 *  MPA_LOCK (buyer -> seller)
 *  Buyer signed the tx too.
 */
export interface MPA_LOCK extends MPA {
    type: MPAction.MPA_LOCK;
    bid: string; // hash of MPA_BID
    buyer: {
        payment: {
            escrow: EscrowType,
            signatures: ISignature[]
        }
    };
    info: {
        memo: string // is  this useful?
    };
}

/**
 *  MPA_RELEASE (seller -> buyer)
 *  Seller automatically requests the release of the escrow.
 */
export interface MPA_RELEASE extends MPA { // !implementation !protocol

    type: MPAction.MPA_RELEASE;
    bid: string; // hash of MPA_BID
    seller: {
        payment: {
            escrow: EscrowType,
            signatures: ISignature[]
        }
    };

}

export interface MPA_REFUND extends MPA {
    type: MPAction.MPA_REFUND;
    bid: string; // hash of MPA_BID
    buyer: {
        payment: {
            escrow: EscrowType,
            signatures: ISignature[]
        }
    };
}
