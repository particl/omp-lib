import { Cryptocurrency } from './crypto';
import { EscrowType, HashableBidField, HashableCommonField, HashableItemField } from './omp-enums';
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
    values: HashableFieldValueConfig[];
}

export abstract class BaseHashableConfig {
    public abstract fields: HashableFieldConfig[];
    public values: HashableFieldValueConfig[] = [];

    constructor(values?: HashableFieldValueConfig[]) {
        if (values) {
            this.values = values;
        }
    }
}

// export type HashableFieldTypes = HashableCommonField | HashableItemField | HashableBidField;
// todo: find a working way to extend this on the mp side
export interface HashableFieldConfig {
    from: string;
    to: string; // HashableFieldTypes;
}

export interface HashableFieldValueConfig {
    value: string;
    to: string; // HashableFieldTypes;
}
