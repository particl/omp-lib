/**
 * An enum for all the marketplace actions.
 */
export enum MPAction {
    MPA_LISTING_ADD = 'MPA_LISTING_ADD_03',

    MPA_BID = 'MPA_BID_03',
    MPA_ACCEPT = 'MPA_ACCEPT_03',
    MPA_REJECT = 'MPA_REJECT_03',
    MPA_CANCEL = 'MPA_CANCEL_03',

    MPA_LOCK = 'MPA_LOCK_03',

    UNKNOWN = 'UNKNOWN'         // used in case we receive an unknown message type and want to log it
}

/**
 * Represents the types of sales that are possible
 */
export enum SaleType {
    FREE = 'FREE',              // not implemented, yet
    SALE = 'SALE',
    AUCTION = 'AUCTION',        // not implemented, yet
    WANTED = 'WANTED',          // not implemented, yet
    RENT = 'RENT',              // not implemented, yet
    NEGOTIATE = 'NEGOTIATE'     // not implemented, yet
}

/**
 * Different supported escrow types
 */
export enum EscrowType {
    FE = 'FE',                  // Finalize early
    MULTISIG = 'MULTISIG',      // Normal 2-on-2 multisig
    MAD = 'MAD',                // Mutual assured destruction
    MAD_CT = 'MAD_CT'           // Mutual assured destruction with Confidential Tx
}

export enum EscrowReleaseType {
    // these need to be lowercase, particld seems to be case-sensitive
    BLIND = 'blind',
    ANON = 'anon'
}

/**
 * Protocols supported by the protocol.
 */
export enum MessagingProtocol {
    SMSG = 'SMSG'
}

/**
 * ListingItem fields used for hashing
 */
export enum HashableItemField {
    TITLE = 'title',
    // SELLER = 'seller',
    SHORT_DESC = 'shortDescription',
    LONG_DESC = 'longDescription',
    SALE_TYPE = 'saleType',
    ESCROW_TYPE = 'escrowType',
    ESCROW_RATIO_BUYER = 'escrowRatioBuyer',
    ESCROW_RATIO_SELLER = 'escrowRatioSeller',
    PAYMENT_CURRENCY = 'paymentCurrency',
    PAYMENT_BASE_PRICE = 'paymentBasePrice',
    PAYMENT_ADDRESS_TYPE = 'paymentAddressType',
    PAYMENT_ADDRESS_ADDRESS = 'paymentAddressAddress',
    PAYMENT_SHIPPING_PRICE_DOMESTIC = 'paymentShippingDomestic',
    PAYMENT_SHIPPING_PRICE_INTL = 'paymentShippingInternational'
}

export enum HashableBidField {
    ITEM_HASH = 'item',
    BUYER_SHIPPING_FIRSTNAME = 'shippingFirstName',
    BUYER_SHIPPING_LASTNAME = 'shippingLastName',
    BUYER_SHIPPING_ADDRESS = 'shippingAddress',
    BUYER_SHIPPING_CITY = 'shippingCity',
    BUYER_SHIPPING_ZIP = 'shippingZip',
    BUYER_SHIPPING_COUNTRY = 'shippingCountry',
    PAYMENT_ESCROW_TYPE = 'paymentEscrowType',
    PAYMENT_CRYPTO = 'paymentCrypto'
}

export enum HashableCommonField {
    GENERATED = 'generated',
    VERSION = 'version'
}
