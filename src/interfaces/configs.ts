import { Cryptocurrency } from './crypto';
import { EscrowType, HashableBidField, HashableItemField } from './omp-enums';
import { KVS } from './common';
import { ShippingAddress } from './omp';

export interface BidConfiguration {
    cryptocurrency: Cryptocurrency;
    escrow: EscrowType;
    shippingAddress: ShippingAddress;
    objects?: KVS[];
}

export interface HashableConfig {
    fields: HashableFieldConfig[];
}

export type HashableFieldTypes = HashableItemField | HashableBidField;

export interface HashableFieldConfig {
    from: string;
    to: HashableFieldTypes;
}
