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
        messaging: [],
        objects: []
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
    messaging: [],
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
    action: MPA_BID,
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
export interface MPA_BID extends MPA { // Extended
  mpaction: {
    action: MPA_BID,
    item: string, // item hash
    objects: [
      {
        id: buyerPubkey,
        value: String
      },
      {
        id: buyerChangeAddress,
        value: String
      },
      {
        id: buyerChange,
        value: Number
      },
      {
        id: buyerAddress,
        value: String
      },
      {
        id: ship.firstName,
        value: String
      },
      {
        id: ship.lastName,
        value: String
      },
      {
        id: ship.addressLine1,
        value: String
      },
      {
        id: ship.addressLine2,
        value: String
      },
      {
        id: ship.city,
        value: String
      },
      {
        id: ship.state,
        value: String
      },
      {
        id: ship.zipCode,
        value: String
      },
      {
        id: ship.country,
        value: String
      }
    ]
  }
}

/**
 *  MPA_ACCEPT (sender -> buyer)
 *  It is the seller payment details.
 */
// matches MPA_BID
export interface MPA_ACCEPT extends MPA {
  mpaction: {
    action: MPA_ACCEPT,
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
  mpaction: {
    action: MPA_ACCEPT,
    item: 647dd1841eb669b9e923d521c6d5e66981bcf6ec07cd62a27574425691179eb8,
    objects: [
      {
        id: sellerOutputs,
        value: [
          {
            txid: String,
            vout: Number,
            amount: Number
          }
        ]
      },
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
      {
        id: sellerPubkey,
        value: String
      },
      //// rm !implementation
      // {
      //   id: buyerPubkey,
      //   value: String
      // },
      {
        id: rawtx,
        value: String
      },
      {
        id: orderHash,
        value: String
      }
    ]
  }
}

// matches MPA_RELEASE, mostly
export interface MPA_LOCK extends MPA {
  mpaction: {
    action: MPA_LOCK,
    item: String, // item hash
    info: {},
    escrow: {
      type: "lock",
      rawtx: String
    }
}

// matches MPA_LOCK, mostly
export interface MPA_RELEASE  extends MPA{
  mpaction: {
    action: MPA_RELEASE,
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

