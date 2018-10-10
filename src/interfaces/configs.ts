import { CryptoType } from './crypto';
import { EscrowType } from './omp-enums';
import { KVS } from './common';

export interface BidConfiguration {
    cryptocurrency: CryptoType;
    escrow: EscrowType;
    shippingAddress: {
        firstName: string,
        lastName: string,
        addressLine1: string,
        addressLine2?: string, // optional
        city: string,
        state: string,
        zipCode: string,
        country: string,
    };
    objects?: KVS[];
}
