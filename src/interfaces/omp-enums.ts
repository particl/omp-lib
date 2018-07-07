/*
    An enum for all the marketplace actions.
*/
export enum MPAction {
    MPA_LISTING_ADD = 'MPA_LISTING_ADD',

    MPA_BID = 'MPA_BID',
    MPA_ACCEPT = 'MPA_BID',
    MPA_REJECT = 'MPA_REJECT',
    MPA_CANCEL = 'MPA_CANCEL',

    MPA_LOCK = 'MPA_LOCK',
    MPA_RELEASE = 'MPA_RELEASE',
    MPA_REFUND = 'MPA_REFUND'
}

export enum PaymentType {
    FREE = "FREE",
    SALE = "SALE",
    RENT = "RENT"
}

export enum EscrowType {
    NOP = "NOP",
    MAD = "MAD",
    MADCT = "MADCT",
}
