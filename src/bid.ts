import { MPA_EXT_LISTING_ADD, MPA_BID } from "./interfaces/omp";
import { CryptoType, CryptoAddressType } from "./interfaces/crypto";
import { MPAction } from "./interfaces/omp-enums";
import { hash } from "./hasher/hash";

export interface BidConfiguration {
    cryptocurrency: CryptoType,
    shippingAddress: {
        firstName: string,
        lastName: string,
        addressLine1: string,
        addressLine2: string, // optional
        city: string,
        state: string,
        zipCode: string,
        country: string,
      }
}
export function bid(config: BidConfiguration, listing: MPA_EXT_LISTING_ADD): MPA_BID {
    const bid =  {
        version: "",
        action: {
          type: MPAction.MPA_BID,
          created: + new Date(), // timestamp
          item: hash(listing), // item hash
          buyer: { 
            payment: {
              cryptocurrency: config.cryptocurrency,
              escrow: listing.action.item.payment.escrow.type,
              pubKey: "",
              changeAddress: {
                type: CryptoAddressType.NORMAL,
                address: ""
              },
              outputs: []
            },
            shippingAddress: config.shippingAddress
          },
          // objects: KVS[]
        }
      }
    return bid;
}