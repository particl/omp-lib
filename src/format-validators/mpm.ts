import { MPM } from '../interfaces/omp';
import { MPAction } from '../interfaces/omp-enums';
import { isStringAndEnumValue } from '../util';


export class FV_MPM {

    public static validate(msg: MPM): boolean {
        if (!msg.version) {
            throw new Error('version: missing');
        }

        if (!msg.action) {
            throw new Error('action: missing');
        }

        if (!msg.action.type) {
            throw new Error('action.type: missing');
        }

        if (!isStringAndEnumValue(msg.action.type, MPAction)) {
            throw new Error('action.type: unrecognized value');
        }

        return true;
    }

    constructor() {
        //
    }

}
