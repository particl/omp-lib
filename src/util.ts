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

/**
 * Non negative natural number means:
 * 0, 1, 2, ...
 * @param t value to test
 */
export function isNonNegativeNaturalNumber(t: any) {
    return isNaturalNumber(t) && t >= 0
}

export function isValidPrice(v: any) {
    return isNaturalNumber(v) && v > 0 // perhaps more checks.
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

export function isTimestamp(t: any) {
    return isNonNegativeNaturalNumber(t)
}

export function isCountry(c: any) {
    return isString(c); // TODO: check the list of country code
}

export function clone(original: any) {
    return JSON.parse(JSON.stringify(original));
}

export function toSatoshis(n: number) {
    return Math.trunc(n  * Math.pow(10, 8));
}

export function fromSatoshis(n: number) {
    return Math.trunc(n) / Math.pow(10, 8);
}

export async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
}

export async function asyncMap(array, callback) {
    await this.asyncForEach(array, callback);
    return array;
}

function _strip(obj: any): any {
    if(isArray(obj)) {
        obj.forEach((e, i) => {
            if(isString(e) && e.startsWith('_')) {
                obj.splice(i, 1);
            }
            _strip(e)
        });
    }else {
        for (var property in obj) {
            if (obj.hasOwnProperty(property)) {
                if (typeof obj[property] == "object") {
                    _strip(obj[property]);
                }
                if (property.startsWith('_')) {
                    delete obj[property];
                }
            }
        }
    }
    
    return obj;
}

export function strip(obj: any) {
    let o = clone(obj);
    return _strip(o);
}

export function log(obj: any) {
    console.log(JSON.stringify(obj, null, 4))
}