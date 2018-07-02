/**
 * All the interfaces of OMP.
 */
export interface MPA {

}

/**
 * This is the most basic listing.
 * It should only contain the necessary fields
 * as documented in protocol.
 */
export interface MPA_LISTING extends MPA {
    label: string;
}

/**
 * This is the extended listing.
 * It can also include additional fields.
 */
export interface MPA_LISTING_EXT extends MPA_LISTING {
    somefield: string;
}

/**
 *  MPA_BID (buyer -> sender)
 *  It includes their payment details and links to the listing.
 */
export interface MPA_BID extends MPA {
    bid_nonce: string; // !implementation
    buyer_outputs: string[];
    buyer_pubkey: string[];
}

/**
 *  MPA_ACCEPT (sender -> buyer)
 *  It is the seller payment details.
 */
export interface MPA_ACCEPT extends MPA {
    bid_nonce: string; // !implementation !protocol
    label: string;
}

/**
 *  MPA_BID (buyer -> sender)
 *  It includes their payment details and links to the listing.
 */
export interface MPA_LOCK extends MPA {
    bid_nonce: string; // !implementation !protocol
    signature: string;
}

export interface MPA_RELEASE_REQ  extends MPA { // !implementation !protocol
    bid_nonce: string; // !implementation !protocol
    label: string;
}

export interface MPA_RELEASE_OK  extends MPA { // !implementation !protocol
    bid_nonce: string;
    label: string;
}