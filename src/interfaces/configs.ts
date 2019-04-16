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

export type HashableFieldTypes = HashableItemField | HashableBidField;

export interface HashableFieldConfig {
    from: string;
    to: HashableFieldTypes;
}

export interface HashableFieldValueConfig {
    value: string;
    to: HashableFieldTypes;
}
