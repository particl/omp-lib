/**
 * All the interfaces of OMP.
 *
 * TODO: MPA_LISTING_UPDATE, MPA_LISTING_REMOVE
 */

import { Prevout, CryptoAddress, Cryptocurrency, ISignature, ToBeOutput, EphemeralKey, Fiatcurrency, ToBeBlindOutput, BlindPrevout } from './crypto';
import { DSN, ContentReference } from './dsn';
import { MPAction, SaleType, EscrowType, MessagingProtocol } from './omp-enums';
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

    // other SaleTypes might require generated field in other messages, so we might need to move this to MPA later.
    // adding generated+hash to all messages so they'll all have has if needed
    // created renamed to generated, as the naming would conflict with the db default fields.
    // generated is needed for bid differentiation, so we can have multiple bids. and we can't use the db.created !implementation !protocol
    generated: number;          // timestamp, when the bidder generated this bid !implementation !protocol
    hash: string;               // accept hash, used to verify on the receiving end

    // at least two messages need this, so we might as well add an optional extra objects field here,
    // so we can easily expand the messages when needed without modifying the omp interfaces right away, !implementation !protocol
    objects?: KVS[];
}


/**
 * This is the marketplace listing.
 */
export interface MPA_LISTING_ADD extends MPA {
    // type: MPAction.MPA_LISTING_ADD;
    item: Item;
    // hash: string;               // item hash, used to verify on the receiving end
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
    // type: MPAction.MPA_BID;
    // hash: string;                // bid hash, used to verify on the receiving end
    item: string;                   // item hash
    buyer: BuyerData;               // buyer payment and other purchase details like shipping address
    // {
    //     payment: PaymentDataBid;             // MPA_BID, MPA_ACCEPT, MPA_LOCK
    //     shippingAddress?: ShippingAddress;   // MPA_BID
    // };
}

/**
 *  MPA_REJECT (seller -> buyer)
 *  Seller rejected the buyers bid.
 */
export interface MPA_REJECT extends MPA {
    // type: MPAction.MPA_REJECT;
    bid: string;                // hash of MPA_BID
}

/**
 *  MPA_ACCEPT (seller -> buyer)
 *  Seller added his payment data.
 */
export interface MPA_ACCEPT extends MPA {
    // type: MPAction.MPA_ACCEPT;
    bid: string;                // hash of MPA_BID
    seller: SellerData;
    // {
    //    payment: PaymentDataAccept;
    // };
}

/**
 *  MPA_CANCEL (buyer -> seller)
 *  Buyer cancelled his bid.
 */
export interface MPA_CANCEL extends MPA { // !implementation !protocol
    // type: MPAction.MPA_CANCEL;
    bid: string;                // hash of MPA_BID
}

/**
 *  MPA_LOCK (buyer -> seller)
 *  Buyer signed the tx too.
 */
export interface MPA_LOCK extends MPA {
    // type: MPAction.MPA_LOCK;
    bid: string;                // hash of MPA_BID
    buyer: BuyerData;
    // {
    //    payment: PaymentDataLock;
    // };
    info: LockInfo;
}

// =============================================================================================



/**
 * This is propably useless?
 */
export interface LockInfo {
    memo: string;       // is this useful?
}

export interface BlindData {
    blindFactor: string;               // CT (only used BID)
    ephem: EphemeralKey;               // CT (only used BID)
}

export interface SignatureData {
    blindFactor?: string;               // CT
    ephem?: EphemeralKey;               // CT
    signatures: ISignature[];           // MULTISIG & CT
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
export type PaymentData = PaymentDataBid | PaymentDataAccept | PaymentDataLock;

export interface PaymentDataBid {
    prevouts: Prevout[];                // MULTISIG & CT
    escrow: EscrowType;
    cryptocurrency: Cryptocurrency;

}

export interface PaymentDataBidMultisig extends PaymentDataBid {
    pubKey: string;                     // MULTISIG
    address: CryptoAddress;             // MULTISIG (?) (Because there is no outputs object, might want to move to unify!)
    changeAddress: CryptoAddress;       // MULTISIG
}

export interface PaymentDataBidCT extends PaymentDataBid {
    prevouts: BlindPrevout[];                // MULTISIG & CT
    outputs: ToBeBlindOutput[];              // CT
    // todo: optional or not?
    release?: BlindData;                // CT (no signatures!)
}

export interface PaymentDataAccept {
    escrow: EscrowType;
    fee: number;
    prevouts: Prevout[];                // MULTISIG & CT
    release: SignatureData;             // MULTISIG & CT (only signatures)
}

export interface PaymentDataAcceptMultisig extends PaymentDataAccept {
    pubKey?: string;                    // MULTISIG
    changeAddress?: CryptoAddress;      // MULTISIG
    signatures: ISignature[];           // MULTISIG
}

export interface PaymentDataAcceptCT extends PaymentDataAccept {
    prevouts: BlindPrevout[];                // MULTISIG & CT
    outputs: ToBeBlindOutput[];              // CT
    destroy: SignatureData;             // CT  (only signatures)
}

export interface PaymentDataLock {
    escrow: EscrowType;
    signatures: ISignature[];           // MULTISIG & CT
    refund: SignatureData;              // MULTISIG & CT
}

export interface PaymentDataLockMultisig extends PaymentDataLock {
}

export interface PaymentDataLockCT extends PaymentDataLock {
    destroy: SignatureData;             // CT
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
    objects?: ItemObject[];
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

// TODO: needs refactoring
export interface ItemObject {
    type: string;           // create separate enum
    description: string;
    table?: KVS[];          // is this really needed? if it is, split this interface in two
    order?: number;
    forceInput?: boolean;
    objectId?: string;
    options?: KVS[];
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
    secondsToLock: number;
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
    protocol: MessagingProtocol;
    publicKey: string;
}

