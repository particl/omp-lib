/**
 * All the interfaces of OMP.
 *
 * TODO: MPA_LISTING_UPDATE, MPA_LISTING_REMOVE
 */

import { Output, CryptoAddress, Cryptocurrency, ISignature, Fiatcurrency } from './crypto';
import { DSN, ContentReference } from './dsn';
import { MPAction, SaleType, EscrowType } from './omp-enums';
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
 * This is the marketplace listing.
 */
export interface MPA_LISTING_ADD extends MPA {
    type: MPAction.MPA_LISTING_ADD;
    item: Item;
}


/**
 * This is the extended listing.
 * It can also include additional fields.
 */
/*
 Commented out for now, as I dont think we really need this?
 the extended vars are just set optional on the MPA_LISTING_ADD and I dont really see the reason why we should have
 a specific extended type where they're not optional.
*/
// export interface MPA_EXT_LISTING_ADD extends MPA_LISTING_ADD {
//    type: MPAction.MPA_LISTING_ADD;
//    item: Item;
// }

/**
 * Information about the Item being sold
 */
export interface Item {
    // created: number, // timestamp // add?
    // hash: string, // remove!
    information: ItemInfo;
    payment: PaymentInfo;
    messaging: MessagingInfo;
    objects?: KVS[];
}

/**
 * Information related to the item
 */
export interface ItemInfo {
    title: string;
    shortDescription: string;
    longDescription: string;
    category: string[];
    location?: Location;                // optional
    shippingDestinations?: string[];    // optional
    images?: ContentReference[];        // optional
}

/**
 * Location for the item
 */
export interface Location {
    country: string;
    address: string;
    description: string; // extra information, could be used for some additional information // !protocol
    gps: LocationMarker;
}

/**
 * LocationMarker with the exact gps coordinates for the item
 */
export interface LocationMarker {
    lng: number;
    lat: number;
    title: string;
    description: string;
}

/**
 * Information describing the different messaging options
 */
export interface MessagingInfo {
    options: MessagingOption[];
}

/**
 * Information describing to how the item is going to be paid and sold
 * TODO: should the sale information be separately configured from the payment information?
 */
export interface PaymentInfo {
    type: SaleType;
    escrow?: EscrowConfig;       // SaleType.FREE does not require escrow
    pegging?: PricePegging;     // pegging is optional
    options?: PaymentOption[];  // SaleType.FREE might not require this
}

/**
 * Configuration for the Escrow
 */
export interface EscrowConfig {
    type: EscrowType;
    ratio: EscrowRatio;
}

/**
 * Ratio for the selected EscrowType
 */
export interface EscrowRatio {
    buyer: number;
    seller: number;
}

/**
 * Price pegging configuration for the item // !protocol
 * this would be used to override the basePrice and shippingPrice for selected PaymentOption
 */
export interface PricePegging {
    currency: Fiatcurrency | Cryptocurrency;
    basePrice: number;
    shippingPrice: ShippingPrice;
    // +other configuration data is definitely needed for this
}

/**
 * PaymentOption describes the how the item can be paid for and what it costs
 * todo: in case of an order containing multiple different items from the same seller, we might override the ShippingPrice defined here
 */
export interface PaymentOption {
    currency: Cryptocurrency;
    basePrice: number;
    shippingPrice?: ShippingPrice;  // some SaleTypes might not require this
    address?: CryptoAddress;        // some SaleTypes might not require this
}

/**
 * ShippingPrice for the item
 */
export interface ShippingPrice {
    domestic: number;
    international: number;
}

/**
 * Represents Options that can be used for messageing between buyer and seller
 *
 * todo: we might consider adding type since we might want to use some options just for certain types of messaging?
 *
 */
export interface MessagingOption {
    protocol: string;
    publicKey: string;
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
