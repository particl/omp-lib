// tslint:disable:no-for-each-push
import * as _ from 'lodash';
import { sha256 } from 'js-sha256';
import { isObject, isArray } from '../format-validators/util';
import { MPA_LISTING_ADD, MPM } from '../interfaces/omp';
import { ContentReference, ProtocolDSN } from '../interfaces/dsn';
import { HashableConfig } from '../interfaces/configs';

export class Hasher {
    private static hash(objectToHash: any, config: HashableConfig): string {
        // TODO: validate that the result contains all the fields defined in config
        return hash(toHashable(objectToHash, config));
    }
}

export interface HashableObject {
}

/**
 * creates a HashableObject based on HashableConfig
 * @param objectToHash
 * @param config
 */
export function toHashable(objectToHash: any, config: HashableConfig): HashableObject {
    const hashable: HashableObject = {};
    for (const configField of config.fields) {
        const value = _.get(objectToHash, configField.from);
        _.set(hashable, configField.to, value);
    }
    return hashable;
}

export function hash(v: HashableObject): string {
    if (typeof v === 'undefined') {
        throw new Error('hash(): value is undefined');
    }

    if (v instanceof Buffer) {
        return sha256(v);
    } else if (isObject(v)) {
        return hashObject(v);
    } else {
        throw new Error('o_O');
        // return sha256(v);
    }
}

function hashObject(unordered: object): string {
    const sorted = deepSortObject(unordered);
    const toHash = JSON.stringify(sorted);
    return sha256(toHash);
}

export function hashListing(l: MPM): string {

    // remove the local image data from the hashing
    // the ContentReference hash already provides us
    // with authentication for the data
    const listing: MPA_LISTING_ADD = <MPA_LISTING_ADD> (l.action);
    if (listing.item.information.images) {
        listing.item.information.images.forEach((img: ContentReference) => {
            img.data.forEach((dsn) => {
                if (dsn.protocol === ProtocolDSN.LOCAL) {
                    delete dsn.data;
                }
            });
        });
    }

    // console.log(JSON.stringify(l, null, 4));

    return hash(l);
}

export function deepSortObject(unordered: any): any {
    // order the keys alphabetically!
    const result = {};
    let ordered;
    if (isArray(unordered)) {
        ordered = unordered.sort();
    } else if (isObject(unordered)) {
        ordered = Object.keys(unordered).sort();
    } else {
        return unordered;
    }

    ordered.forEach(key => {
        // if value is object, recursively sort it
        if (isArray(unordered[key])) {
            result[key] = [];
            unordered[key].forEach((elem) => {
                result[key].push(deepSortObject(elem));
            });

            result[key] = result[key].sort(deepCompare);
        } else if (isObject(unordered[key])) {
            result[key] = deepSortObject(unordered[key]);
        } else {
            result[key] = unordered[key];
        }
    });

    return result;
}

/**
 * Compares a string, number, and objects.
 * If it's an object, grab the first key.
 * Make sure to use _sorted_ objects for deterministic
 * behavior.
 * @param a object, string, number
 * @param b object, string, number
 */
function deepCompare(a: object | string | number, b: object | string | number): number {

    if (isObject(a)) {
        a = Object.keys(a)[0];
    }

    if (isObject(b)) {
        b = Object.keys(b)[0];
    }

    if (a > b) {
        return 1;
    }

    if (b > a) {
        return -1;
    }

    return 0;
}
