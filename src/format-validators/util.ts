export function isObject(v: any): boolean {
    return v && typeof v === 'object';
}

export function isString(v: any): boolean {
    return v && typeof v === 'string';
}

export function isArray(v: any): boolean {
    return v && Array.isArray(v) && v.length > 0;
}

export function isNumber(v: any): boolean {
    return typeof v === 'number' && (v <= Number.MAX_SAFE_INTEGER);
}

/**
 * Checks whether a value is a natural number
 * @param v the value to check
 */
export function isNaturalNumber(v: any): boolean {
    return isNumber(v) && (v.toString().indexOf('.') === -1);
}

/**
 * Non negative natural number means:
 * 0, 1, 2, ...
 * @param t value to test
 */
export function isNonNegativeNaturalNumber(t: any): boolean {
    return isNaturalNumber(t) && t >= 0;
}

// TODO: better checking (is it on the curve?)
export function isPublicKey(pk: string): boolean {
    return isString(pk);
}

export function isPrivateKey(pk: string): boolean {
    return isString(pk);
}
