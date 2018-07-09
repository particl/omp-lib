import { MPA } from "../interfaces/omp"
import { MPAction } from "../interfaces/omp-enums";


export class FV_MPA {

    constructor() {
    }

    static validate(msg: MPA): boolean {
        if (!msg.version) {
            throw new Error('version: missing');
        }

        if (!msg.action) {
            throw new Error('action: missing');
        }

        if (!msg.action.type) {
            throw new Error('action.type: missing');
        }

        if (!(msg.action.type in MPAction)) {
            throw new Error('action.type: unrecognized value');
        }

        return true;
    }

}