export function isObject(v: any) {
    return v && typeof v === 'object'
}

export function isString(v: any) {
    return v && typeof v === 'string'
}

export function isArray(v: any) {
    return v && Array.isArray(v) && v.length > 0;
}

export function isNumber(v: any) {
    return typeof v === 'number' && (v <= Number.MAX_SAFE_INTEGER)
}

/**
 * Checks whether a value is a natural number
 * @param v the value to check
 */
export function isNaturalNumber(v: any): boolean {
    return isNumber(v) && (v.toString().indexOf('.') === -1);
}

export function isValidPrice(v: any) {
    return isNaturalNumber(v) && v >= 0 // perhaps more checks.
}

export function isValidPercentage(v: any) {
    return isNaturalNumber(v) && (v >= 0 && v <= 100)
}

export function isSHA256Hash(h: any): boolean {
    return typeof h === 'string' && (h.length === 64);
}

export function isTxid(txid: any) {
    return isSHA256Hash(txid);
}