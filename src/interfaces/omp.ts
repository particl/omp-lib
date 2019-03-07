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
    hash: string;               // item hash, used to verify on the receiving end
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
 *  MPA_BID (buyer -> sender)
 *  Buyer bids for a listing.
 *  It includes their payment details and links to the listing.
 */
export interface MPA_BID extends MPA {
    // completely refactored, !implementation !protocol
    // created renamed to generated, as the naming would conflict with the db default fields
    // generated is needed for bid differentiation, so we can have multiple bids. and we can't use the db.created !implementation !protocol
    type: MPAction.MPA_BID;
    generated: number;          // timestamp, when the bidder generated this bid !implementation !protocol
    hash: string;               // bid hash, used to verify on the receiving end
    item: string;               // item hash
    buyer: BuyerData;           // buyer payment and other purchase details like shipping address
    objects?: KVS[];
}

/**
 *  MPA_REJECT (seller -> buyer)
 *  Seller rejected the buyers bid.
 */
export interface MPA_REJECT extends MPA {
    type: MPAction.MPA_REJECT;
    bid: string;                // hash of MPA_BID
}

/**
 *  MPA_ACCEPT (seller -> buyer)
 *  Seller added his payment data.
 */
export interface MPA_ACCEPT extends MPA {
    type: MPAction.MPA_ACCEPT;
    bid: string;                // hash of MPA_BID
    seller: SellerData;
}

/**
 *  MPA_CANCEL (buyer -> seller)
 *  Buyer cancelled his bid.
 */
export interface MPA_CANCEL extends MPA { // !implementation !protocol
    type: MPAction.MPA_CANCEL;
    bid: string;                // hash of MPA_BID
}

/**
 *  MPA_LOCK (buyer -> seller)
 *  Buyer signed the tx too.
 */
export interface MPA_LOCK extends MPA {
    type: MPAction.MPA_LOCK;
    bid: string;                // hash of MPA_BID
    buyer: BuyerData;
    info: LockInfo;
}

/**
 *  MPA_RELEASE (seller -> buyer)
 *  Seller automatically requests the release of the escrow.
 */
export interface MPA_RELEASE extends MPA { // !implementation !protocol
    type: MPAction.MPA_RELEASE;
    bid: string;                // hash of MPA_BID
    seller: SellerData;
}

export interface MPA_REFUND extends MPA {
    type: MPAction.MPA_REFUND;
    bid: string;                // hash of MPA_BID
    buyer: BuyerData;
}

// =============================================================================================



/**
 * This is propably useless?
 */
export interface LockInfo {
    memo: string;       // is this useful?
}

/**
 * SellerData holds the seller related information
 *
 * MPA_ACCEPT
 */
export interface SellerData extends ParticipantData {
}

/**
 * BuyerData holds the buyer related information
 *
 * MPA_BID
 */
export interface BuyerData extends ParticipantData {
    shippingAddress: ShippingAddress;   // MPA_BID
}

export interface ParticipantData {
    payment: PaymentData;               // MPA_BID, MPA_ACCEPT, MPA_LOCK, MPA_RELEASE, MPA_REFUND
}

/**
 * PaymentData holds the information related to payment and the payment negotiation flow between buyer and seller
 */
export type PaymentData = PaymentDataBid | PaymentDataAccept | PaymentDataSign;

/*
export interface PaymentData {
    escrow: EscrowType;                 // MPA_BID, MPA_ACCEPT, MPA_LOCK, MPA_RELEASE, MPA_REFUND
    cryptocurrency?: Cryptocurrency;    // MPA_BID
    pubKey?: string;                    // MPA_BID, MPA_ACCEPT
    changeAddress?: CryptoAddress;      // MPA_BID, MPA_ACCEPT
    outputs?: Output[];                 // MPA_BID, MPA_ACCEPT
    fee?: number;                       // MPA_ACCEPT
    signatures?: ISignature[];          // MPA_ACCEPT, MPA_LOCK, MPA_RELEASE, MPA_REFUND
}
*/

export interface PaymentDataBid {
    escrow: EscrowType;
    cryptocurrency: Cryptocurrency;
    pubKey: string;
    changeAddress: CryptoAddress;
    outputs: Output[];
}

export interface PaymentDataAccept {
    escrow: EscrowType;
    pubKey: string;
    changeAddress: CryptoAddress;
    outputs: Output[];
    fee: number;
    signatures: ISignature[];
}

export interface PaymentDataSign {
    escrow: EscrowType;
    signatures: ISignature[];
}

/**
 * ShippingAddress
 *
 * MPA_BID
 */
export interface ShippingAddress {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string; // optional
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

/**
 * Information about the Item being sold
 *
 * MPA_LISTING_ADD
 */
export interface Item {
    information: ItemInfo;
    payment: PaymentInfo;
    messaging: MessagingInfo;
    objects?: KVS[];
}

/**
 * Information related to the item
 *
 * MPA_LISTING_ADD
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
 *
 * MPA_LISTING_ADD
 */
export interface Location {
    country: string;
    address: string;
    description: string; // extra information, could be used for some additional information // !protocol
    gps: LocationMarker;
}

/**
 * LocationMarker with the exact gps coordinates for the item
 *
 * MPA_LISTING_ADD
 */
export interface LocationMarker {
    lng: number;
    lat: number;
    title: string;
    description: string;
}

/**
 * Information describing the different messaging options
 *
 * MPA_LISTING_ADD
 */
export interface MessagingInfo {
    options: MessagingOption[];
}

/**
 * Information describing to how the item is going to be paid and sold
 * TODO: should the sale information be separately configured from the payment information?
 *
 * MPA_LISTING_ADD
 */
export type PaymentInfo = PaymentInfoEscrow | PaymentInfoFree;

export interface PaymentInfoEscrow {
    type: SaleType;
    escrow: EscrowConfig;
    pegging?: PricePegging;
    options: PaymentOption[];
}

export interface PaymentInfoFree {
    type: SaleType;
    escrow?: EscrowConfig;      // SaleType.FREE does not require escrow
    pegging?: PricePegging;     // pegging is optional
    options?: PaymentOption[];  // SaleType.FREE might not require this
}

/**
 * Configuration for the Escrow
 *
 * MPA_LISTING_ADD
 */
export interface EscrowConfig {
    type: EscrowType;
    ratio: EscrowRatio;
}

/**
 * Ratio for the selected EscrowType
 *
 * MPA_LISTING_ADD
 */
export interface EscrowRatio {
    buyer: number;
    seller: number;
}

/**
 * Price pegging configuration for the item // !protocol
 * this would be used to override the basePrice and shippingPrice for selected PaymentOption
 *
 * MPA_LISTING_ADD
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
 *
 * MPA_LISTING_ADD
 */
export interface PaymentOption {
    currency: Cryptocurrency;
    basePrice: number;
    shippingPrice?: ShippingPrice;  // some SaleTypes might not require this
    address?: CryptoAddress;        // some SaleTypes might not require this
}

/**
 * ShippingPrice for the item
 *
 * MPA_LISTING_ADD
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
 * MPA_LISTING_ADD
 */
export interface MessagingOption {
    protocol: string;
    publicKey: string;
}

