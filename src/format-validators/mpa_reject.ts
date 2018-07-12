import { FV_MPM} from "./mpm";
import { MPA_REJECT, MPM } from "../interfaces/omp"
import { MPAction } from "../interfaces/omp-enums";
import { isString, isSHA256Hash } from "../util";

export class FV_MPA_REJECT {

    constructor() {
    }

    static validate(msg: MPM): boolean {
        // validate base class
        FV_MPM.validate(msg);

        const action = <MPA_REJECT>msg.action;

        if (!isString(action.type)) {
            throw new Error('action.type: missing');
        }

        if (action.type !== MPAction.MPA_REJECT) {
            throw new Error('action.type: expecting MPA_REJECT got ' + action.type);
        }

        if (!isSHA256Hash(action.bid)) {
            throw new Error('action.bid: missing or not a valid hash');
        }

        return true;
    }

}
