import { MPA } from "../interfaces/omp"


export class Validator {

    constructor() {
    }

    public validate(msg: MPA): boolean {
        if (!msg.version) {
            throw new Error('version: missing');
        }

        if (!msg.action) {
            throw new Error('action: missing');
        }

        if (!msg.action.type) {
            throw new Error('action.type: missing');
        }

        switch (msg.action.type) {
            case 'MPA_ACCEPT':
                this.validate_MPA_ACCEPT(msg);
                break;
        }
        return true;
    }



    private validate_MPA_ACCEPT(msg: MPA): boolean {

        return true;
    }
}