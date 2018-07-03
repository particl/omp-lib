/**
 * All the interfaces of OMP.
 */

import { Output, CryptoAddress } from "./crypto";
import { DSN } from "./dsn";

/**
 * Key-Value Store.
 */
export interface KVS {
  id: String,
  value: String
}

/**
 * All the interfaces of OMP.
 */
export interface MPA {
  version: String,
  action: {
    type: String
  }
}



/**
 * This is the most basic listing.
 * It should only contain the necessary fields
 * as documented in protocol.
 */
export interface MPA_LISTING extends MPA {
  action: {
    type: 'MPA_LISTING',
    item: {
      hash: String, //item hash // Missing from spec
      information: {
        title: String,
        short_description: String,
        long_description: String,
        category: String[],
      },
      payment: {
        type: String, // SALE | FREE
        escrow: {
          type: String,
          ratio: { // Missing from spec
            buyer: Number,
            seller: Number
          }
        },
        cryptocurrency: [
          {
            currency: String, // PARTICL | BITCOIN
            base_price: Number,
          }
        ]
      },
      messaging: [
        {
          protocol: String,
          public_key: String
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
export interface MPA_EXT_LISTING extends MPA_LISTING {
  action: {
    type: 'MPA_LISTING',
    item: {
      hash: String, //item hash // Missing from spec
      information: {
        title: String,
        short_description: String,
        long_description: String,
        category: String[],
        location: {
          country: String,
          address: String,
          gps: {
            lng: Number,
            lat: Number,
            marker_title: String,
            marker_text: String
          }
        },
        shipping_destinations: String[],
        images: DSN[]
      },
      payment: {
        type: String, // SALE | FREE
        escrow: {
          type: String,
          ratio: {
            buyer: Number,
            seller: Number
          }
        },
        cryptocurrency: [
          {
            currency: String, // PARTICL | BITCOIN
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
          protocol: String,
          public_key: String
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
    item: String, // item hash
    buyer: { 
      payment: {
        pubKey: String,
        outputs: Output[],
        changeAddress: String
      },
      shippingAddress: {
        firstName: String,
        lastName: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        zipCode: Number,
        country: String,
      }
    },
    objects: KVS[]
  }
}

export interface MPA_REJECT extends MPA {
  action: {
    type: 'MPA_REJECT',
    bid: String // item hash
  }
}

/**
 *  MPA_ACCEPT (seller -> buyer)
 *  Seller added his payment data.
 */
export interface MPA_ACCEPT extends MPA {
  action: {
    type: 'MPA_ACCEPT',
    bid: String, // hash of MPA_BID
    seller: {
      pubKey: String,
      outputs: Output[],
      signatures: String[]
    }
  }
}

export interface MPA_CANCEL extends MPA { // !implementation !protocol
  action: {
    type: 'MPA_CANCEL',
    bid: String, // hash of MPA_BID
  }
}

/**
 *  MPA_LOCK (buyer -> seller)
 *  Buyer signed the tx too.
 */
export interface MPA_LOCK extends MPA {
  action: {
    type: 'MPA_LOCK',
    bid: String, // hash of MPA_BID
    buyer: {
      signatures: String[]
    },
    info: {
      memo: String // is  this useful?
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
    bid: String, // hash of MPA_BID
    seller: {
      signatures: String[]
    }
  }
}

export interface MPA_REFUND extends MPA {
  action: {
    type: 'MPA_REFUND',
    bid: String, // hash of MPA_BID
    buyer: {
      signatures: String[]
    }
  }
}