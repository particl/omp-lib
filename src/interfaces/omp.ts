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
  version: String
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


/**
 * This is the extended listing.
 * It can also include additional fields.
 */
export interface MPA_EXT_LISTING extends MPA_LISTING {
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
      images: [
        {
            hash: String,
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
    messaging: [
      {
        protocol: String,
        public_key: String
      }
    ],
    //// rm !implementation !spec
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
  version: String,
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
  //// rm !spec
  // "mpaction": {
  //   "action": "MPA_BID", 
  //   "item": "f08f3d6e",
  //   "objects":[
  //     {
  //       "id": "colour",
  //       "value": "black"
  //     }
  //   ]
  // }
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
  version: String,
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
  //// rm !spec
  // "mpaction": {
  //   "action": "MPA_ACCEPT", 
  //   "item": "f08f3d6e"
  // }
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
  // rm !spec
  // "mpaction": [
  //   {
  //     "action": "MPA_LOCK",
  //     "listing": "listings_hash" 
  //     "nonce": "randomness",
  //     "info": {
  //       "address": "20 seventeen street, march city, 2017",
  //       "memo": "Please deliver by 17 March 2017"
  //     },
  //     "escrow": {
  //       "rawtx": "...."
  //     }
  //   }
  // ]
}

// matches MPA_LOCK, mostly
export interface MPA_RELEASE  extends MPA{
  version: String,
  action: 'MPA_RELEASE',
  item: String, // item hash
  escrow: {
    type: "release",
    //// rm !implementation
    // rawtx: String
    //// add !implementation
    signature: String
  }
  // add !implementation [might already be in there, TODO: check]
  "nonce": String
  // add !implementation
  "info": {
    "address": String,
    "memo": String
  },
  // rm !spec
  // "mpaction": {
  //   "action": "MPA_RELEASE", 
  //   "item": "f08f3d6e",
  //   "memo": "Release the funds, greetings buyer",
  //   "escrow": {
  //     "type": "release",
  //     "rawtx": "The buyer sends the half signed rawtx which releases the escrow and paymeny. The vendor then recreates the whole transaction (check ouputs, inputs, scriptsigs and the fee), verifying that buyer's rawtx is indeed legitimate. The vendor then signs the rawtx and broadcasts it."
  //   }
  // }
}

//// rm !spec
// {
//  "version":"0.0.1.0",
//  "mpaction": [
//     {
//       "action": "MPA_LOCK",
//       "listing": "listings_hash" 
//       "nonce": "randomness",
//       "info": {
//         "memo": "Will deliver by then, setting lockup lower, no more negotiations..."
//       },
//       "escrow": {
//         "rawtx": "...."
//       }
//     }
//   ]
// }

export interface MPA_RELEASE_REQ extends MPA { // !implementation !protocol
    bid_nonce: string; // !implementation !protocol
    label: string;
}

export interface MPA_RELEASE_OK extends MPA { // !implementation !protocol
    bid_nonce: string;
    label: string;
}

// TODO: Check what this is in marketplace
export interface MPA_REJECT extends MPA {
  "version":"0.0.1.0",
  action: 'MPA_REJECT',
  item: String // item hash
  //// rm !spec
  // "mpaction": {
  //   "action": 'MPA_REJECT',
  //   "item": String
  // }
}

// TODO: Check what this is in marketplace, add those fields
export interface MPA_CANCEL extends MPA {
  "version":"0.0.1.0",
  action: 'MPA_CANCEL',
  item: String // item hash
  //// rm !spec
  // "mpaction": {
  //   "action": 'MPA_CANCEL',
  //   "item": String
  // }
}

// TODO: Check what this is in marketplace, add those fields
export interface MPA_REQUEST_REFUND extends MPA {
  version: String,
  // rm !spec
  // mpaction: {
  //   nAction: 'MPA_REQUEST_REFUND', 
  //   item: String, // item hash
  //   memo: String,
  //   escrow: {
  //     type: 'refund',
  //     rawtx: String
  //   }
  // }
}

// TODO: Check what this is in marketplace, add those fields
export interface MPA_REFUND extends MPA {
  version: String,
  // mpaction: {
  //   action: 'MPA_REFUND',
  //   item: String,
  //   accepted: boolean,
  //   memo: String,
  //   escrow: {
  //     type: 'refund',
  //     rawtx: String
  //   }
  // }
}
