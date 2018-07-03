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
// app1_1       | 2018-07-03T11:46:19.500Z - debug: [api/services/SmsgService] smsgSend, from: pkiYihS3no9xdyDG11Hj3Ww3rQJ9eCFpZU, to: pqneJdwrqMXV8g3p4uzfJ8FGkyE6PGLQ9C, value: {
// app1_1       |   "version": "0.0.1.0",
// app1_1       |   "mpaction": {
// app1_1       |     "action": "MPA_RELEASE",
// app1_1       |     "item": "58db8b7020e166cc6cc4dd3a648b8013aaf65fec069b23de46a907cc9e9f76a5",
// app1_1       |     "memo": "memo",
// app1_1       |     "escrow": {
// app1_1       |       "type": "release",
// app1_1       |       "rawtx": "a0000000000001ec6a05b037501a5d516da977c18526ea80c088f77de2eeccd61b8f017a1e08180000000000ffffffff0201f569d717000000001976a914d8cecf0740e547b50a52436b7c34db9963f054c888ac01fbb4eb0b000000001976a9144be67c745e02fe6b0157dff28aaa764c9532ca4d88ac0300483045022100dfba02dcf855bb52b284d81320ce33a38cd58283b5a4bb98d4e1993f968adb6e02204349bbeed81e98df31d39c09b6b2d50d2b2b55825c5644c76990e24bb0eb53050147522103d5f04ac1a51fa91916b0a5fd8d882a4ec926b0305ea7bd87c6b8cddb84a99bfd2103faa0a225a3e971378309422b781b3098a3f078f0b7ab780ded7ded988213db8152ae"
// app1_1       |     }
// app1_1       |   }
// app1_1       | } 

// app2_1       | 2018-07-03T11:48:00.885Z - debug: [api/services/SmsgService] smsgSend, from: pqneJdwrqMXV8g3p4uzfJ8FGkyE6PGLQ9C, to: pkiYihS3no9xdyDG11Hj3Ww3rQJ9eCFpZU, value: {
// app2_1       |   "version": "0.0.1.0",
// app2_1       |   "mpaction": {
// app2_1       |     "action": "MPA_RELEASE",
// app2_1       |     "item": "58db8b7020e166cc6cc4dd3a648b8013aaf65fec069b23de46a907cc9e9f76a5",
// app2_1       |     "escrow": {
// app2_1       |       "type": "release",
// app2_1       |       "rawtx": "88e249a3cb52d37bdedc88023d018fbb112a8c405cda6eee04e168f48e31492f"
// app2_1       |     }
// app2_1       |   }
// app2_1       | }

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
// app1_1       | 2018-07-03T11:34:54.277Z - debug: [api/services/SmsgService] smsgSend, from: pkiYihS3no9xdyDG11Hj3Ww3rQJ9eCFpZU, to: pqneJdwrqMXV8g3p4uzfJ8FGkyE6PGLQ9C, value: {
// app1_1       |   "version": "0.0.1.0",
// app1_1       |   "mpaction": {
// app1_1       |     "action": "MPA_REJECT",
// app1_1       |     "item": "4cea37e4182738f6b37316ea79f4c9e6a2dc9fdf001fa3ce0c073f3ac9549839"
// app1_1       |   }
// app1_1       | }

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
// app2_1       | 2018-07-03T11:29:39.805Z - debug: [api/services/SmsgService] smsgSend, from: pqneJdwrqMXV8g3p4uzfJ8FGkyE6PGLQ9C, to: pkiYihS3no9xdyDG11Hj3Ww3rQJ9eCFpZU, value: {
// app2_1       |   "version": "0.0.1.0",
// app2_1       |   "mpaction": {
// app2_1       |     "action": "MPA_CANCEL",
// app2_1       |     "item": "3a59564f2a0179c74937544e6687d3d3506a5f67fa34a5a8ef0a1ea05b2708fe"
// app2_1       |   }
// app2_1       | }

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
