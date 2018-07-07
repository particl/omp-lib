export function isObject(v: any) {
    return v && typeof v === 'object'
}

export function isString(v: any) {
    return v && typeof v === 'string'
}

export function isNumber(v: any) {
    return typeof v === 'number'
}

export function isArray(v: any) {
    return v && Array.isArray(v);
}