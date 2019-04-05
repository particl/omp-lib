/**
 * An enum for all the marketplace actions.
 */
export enum MPAction {
    MPA_LISTING_ADD = 'MPA_LISTING_ADD',

    MPA_BID = 'MPA_BID',
    MPA_ACCEPT = 'MPA_ACCEPT',
    MPA_REJECT = 'MPA_REJECT',
    MPA_CANCEL = 'MPA_CANCEL',

    MPA_LOCK = 'MPA_LOCK',
    MPA_RELEASE = 'MPA_RELEASE',
    MPA_REFUND = 'MPA_REFUND',

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

/**
 * Protocols supported by the protocol.
 */
export enum MessagingProtocol {
    SMSG = 'SMSG'
}
