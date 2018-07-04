/**
 * All the interfaces of OMP.
 * 
 * TODO: MPA_LISTING_UPDATE, MPA_LISTING_REMOVE
 */

import { Output, CryptoAddress } from "./crypto";
import { DSN } from "./dsn";

/**
 * Key-Value Store.
 */
export interface KVS {
  id: string,
  value: string
}

/**
 * All the interfaces of OMP.
 */
export interface MPA {
  version: string,
  action: {
    type: string
  }
}



/**
 * This is the most basic listing.
 * It should only contain the necessary fields
 * as documented in protocol.
 */
export interface MPA_LISTING_ADD extends MPA {
  action: {
    type: 'MPA_LISTING_ADD',
    item: {
      hash: string, //item hash // Missing from spec
      information: {
        title: string,
        short_description: string,
        long_description: string,
        category: string[],
      },
      payment: {
        type: string, // SALE | FREE
        escrow: {
          type: string,
          ratio: { // Missing from spec
            buyer: Number,
            seller: Number
          }
        },
        cryptocurrency: [
          {
            currency: string, // PARTICL | BITCOIN
            base_price: Number,
          }
        ]
      },
      messaging: [
        {
          protocol: string,
          public_key: string
        }
      ],
      //// rm !implementation
      // objects: any[]
    }
  }
}


/**
 * This is the extended listing.
 * It can also include additional fields.
 */
export interface MPA_EXT_LISTING extends MPA_LISTING_ADD {
  action: {
    type: 'MPA_LISTING_ADD',
    item: {
      hash: string, //item hash // Missing from spec
      information: {
        title: string,
        short_description: string,
        long_description: string,
        category: string[],
        location: {
          country: string,
          address: string,
          gps: {
            lng: Number,
            lat: Number,
            marker_title: string,
            marker_text: string
          }
        },
        shipping_destinations: string[],
        images: DSN[]
      },
      payment: {
        type: string, // SALE | FREE
        escrow: {
          type: string,
          ratio: {
            buyer: Number,
            seller: Number
          }
        },
        cryptocurrency: [
          {
            currency: string, // PARTICL | BITCOIN
            base_price: Number,
            shipping_price: {
              domestic: Number,
              international: Number
            },
            address: CryptoAddress
          }
        ]
      },
      messaging: [
        {
          protocol: string,
          public_key: string
        }
      ],
      objects: KVS[]
    }
  }
}

/**
 *  MPA_BID (buyer -> sender)
 *  It includes their payment details and links to the listing.
 */
export interface MPA_BID extends MPA { // completely refactored, !implementation !protocol
  action: {
    type: 'MPA_BID',
    created: Number, // timestamp
    item: string, // item hash
    buyer: { 
      payment: {
        pubKey: string,
        outputs: Output[],
        changeAddress: string
      },
      shippingAddress: {
        firstName: string,
        lastName: string,
        addressLine1: string,
        addressLine2: string,
        city: string,
        state: string,
        zipCode: Number,
        country: string,
      }
    },
    objects: KVS[]
  }
}

export interface MPA_REJECT extends MPA {
  action: {
    type: 'MPA_REJECT',
    bid: string // item hash
  }
}

/**
 *  MPA_ACCEPT (seller -> buyer)
 *  Seller added his payment data.
 */
export interface MPA_ACCEPT extends MPA {
  action: {
    type: 'MPA_ACCEPT',
    bid: string, // hash of MPA_BID
    seller: {
      pubKey: string,
      outputs: Output[],
      signatures: string[]
    }
  }
}

export interface MPA_CANCEL extends MPA { // !implementation !protocol
  action: {
    type: 'MPA_CANCEL',
    bid: string, // hash of MPA_BID
  }
}

/**
 *  MPA_LOCK (buyer -> seller)
 *  Buyer signed the tx too.
 */
export interface MPA_LOCK extends MPA {
  action: {
    type: 'MPA_LOCK',
    bid: string, // hash of MPA_BID
    buyer: {
      signatures: string[]
    },
    info: {
      memo: string // is  this useful?
    }
  }
}

/**
 *  MPA_RELEASE (seller -> buyer)
 *  Seller automatically requests the release of the escrow.
 */
export interface MPA_RELEASE extends MPA { // !implementation !protocol
  action: {
    type: 'MPA_RELEASE',
    bid: string, // hash of MPA_BID
    seller: {
      signatures: string[]
    }
  }
}

export interface MPA_REFUND extends MPA {
  action: {
    type: 'MPA_REFUND',
    bid: string, // hash of MPA_BID
    buyer: {
      signatures: string[]
    }
  }
}