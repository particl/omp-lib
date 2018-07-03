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
  item: {
    hash: String, //item hash
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
      images: [
        {
          hash: String, // item hash
          data: [
            {
              protocol: String, // LOCAL |
              encoding: String, // BASE64 | 
              data: String,
              id: Number
            }
          ]
        }
      ]
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
          address: {
            type: String, // NORMAL | 
            address: String
          }
        }
      ]
    },
    messaging: any[],
    //// rm !implementation
    // objects: any[]
  }
}


/**
 * This is the extended listing.
 * It can also include additional fields.
 */
export interface MPA_EXT_LISTING extends MPA_LISTING {
  item: {
    hash: String, //item hash
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
      images: [
        {
            hash: String, // item hash
            data: [
                {
                   protocol: String, // LOCAL |
                   encoding: String, // BASE64 | 
                   data: String,
                   id: Number
                }
            ]
        }
      ]
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
          address: {
            type: String, // NORMAL | 
            address: String
          }
        }
      ]
    },
    messaging: any[],
    //// rm !implementation
    // objects: []
  }
}

/**
 *  MPA_BID (buyer -> sender)
 *  It includes their payment details and links to the listing.
 */
// matches MPA_ACCEPT
export interface MPA_BID extends MPA {
    action: 'MPA_BID',
    item: String, //item hash
    //// rm !implementation
    // objects: [
    //    {
    //        id: String
    //        value: any
    //     }
    // ]
}

/**
 *  MPA_BID (buyer -> sender)
 *  It includes their payment details and links to the listing.
 */
export interface MPA_BID extends MPA {
  action: 'MPA_BID',
  item: String,
  Buyer: {
    pubKey: String,
    changeAddress: String,
    change: Number,
    address: String,
    firstName: String,
    lastName: String,
    ShippingAddress: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      zipCode: Number,
      country: String,
    }
  }
}


/**
 *  MPA_ACCEPT (sender -> buyer)
 *  It is the seller payment details.
 */
// matches MPA_BID
export interface MPA_ACCEPT extends MPA {
  action: 'MPA_ACCEPT',
  item: String, //item hash
  //// rm !implementation
  // objects: [
  //   id: String
  //   value: any
  //     ]
  // }
}

/**
 *  MPA_ACCEPT (sender -> buyer)
 *  It is the seller payment details.
 */
export interface MPA_ACCEPT extends MPA { // Extended
  action: 'MPA_ACCEPT',
  item: String,
  rawtx: String
  orderHash: String,
  sellerDetails: {
    sellerPubKey: String,
    sellerOutputs: [{
      txid: String,
      vout: Number,
      amount: Number
    }]
  }
  //// rm !implementation
  // objects: [
  // {
  //   id: sellerOutputs,
  //   value: [
  //     {
  //       txid: String,
  //       vout: Number,
  //       amount: Number
  //     }
  //   ]
  // },
  //// rm !implementation
  // {
  //    id: buyerOutputs,
  //    value: [
  //     {
  //       txid: String,
  //       vout: Number,
  //       amount: Number
  //     }
  //   ]
  // },
  // {
  //   id: sellerPubkey,
  //   value: String
  // },
  //// rm !implementation
  // {
  //   id: buyerPubkey,
  //   value: String
  // },
  // {
  //   id: rawtx,
  //   value: String
  // },
  // {
  //   id: orderHash,
  //   value: String
  // }
  // ]
}


// matches MPA_RELEASE, mostly
export interface MPA_LOCK extends MPA {
  action: 'MPA_LOCK',
  item: String, // item hash
  info: {},
  escrow: {
    type: "lock",
    rawtx: String
  }
}

// matches MPA_LOCK, mostly
export interface MPA_RELEASE  extends MPA{
  action: 'MPA_RELEASE',
  item: String, // item hash
  escrow: {
    type: "release",
    //// rm !implementation
    // rawtx: String
    //// add !implementation
    signature: String
  }
}

export interface MPA_RELEASE_REQ extends MPA { // !implementation !protocol
    bid_nonce: string; // !implementation !protocol
    label: string;
}

export interface MPA_RELEASE_OK extends MPA { // !implementation !protocol
    bid_nonce: string;
    label: string;
}

