import { MPA_EXT_LISTING_ADD, MPA_BID, MPM } from "./interfaces/omp";
import { CryptoType, CryptoAddressType } from "./interfaces/crypto";
import { MPAction, EscrowType } from "./interfaces/omp-enums";
import { hash } from "./hasher/hash";
import { MultiSigBuilder } from "./transaction-builder/multisig";

export interface BidConfiguration {
    cryptocurrency: CryptoType,
    escrow: EscrowType,
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
export async function bid(config: BidConfiguration, listing: MPM): Promise<MPM> {
    const mpa_listing = <MPA_EXT_LISTING_ADD>listing.action;
    config.escrow = mpa_listing.item.payment.escrow.type;

    const bid =  {
        version: "0.1.0.0",
        action: {
          type: MPAction.MPA_BID,
          created: + new Date(), // timestamp
          item: hash(listing), // item hash
          buyer: { 
            payment: {
              cryptocurrency: config.cryptocurrency,
              escrow: config.escrow,
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
    

    switch(config.escrow) {
      case EscrowType.MULTISIG:
        const msb = new MultiSigBuilder();
        await msb.initiate(bid);
    }
    
    return bid;
}