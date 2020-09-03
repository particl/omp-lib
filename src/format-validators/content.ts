import { isObject, isNumber, isString, isTxid, isSHA256Hash, isArrayAndContains } from '../util';
import { ContentReference, DSN, ProtocolDSN } from '../interfaces/dsn';

export class FV_CONTENT {

    public static validate(content: ContentReference): boolean {

        if (!isObject(content)) {
            throw new Error('content: missing or not an object!');
        }

        if (!isSHA256Hash(content.hash)) {
            throw new Error('content.hash: not a SHA256 hash!');
        }

        if (!isArrayAndContains(content.data)) {
            throw new Error('content.data: not an array!');
        }

        content.data.forEach((elem) => {
            this.validateDSN(elem);
        });

        return true;
    }

    public static validateDSN(dsn: DSN): boolean {
        if (!isObject(dsn)) {
            throw new Error('dsn: missing or not an object!');
        }

        if (!(dsn.protocol in ProtocolDSN)) {
            throw new Error('dsn: unknown protocol');
        }

        if (dsn.dataId && !isString(dsn.dataId)) {
            throw new Error('dsn.dataId: not a string!');
        }

        if (dsn.protocol === ProtocolDSN.FILE) {
            if (dsn.encoding && !isString(dsn.encoding)) {
                throw new Error('dsn.encoding: not a string!');
            }

            if (dsn.data && !isString(dsn.data)) {
                throw new Error('dsn.data: not a string!');
            }
        }

        return true;
    }

    constructor() {
        //
    }

}
