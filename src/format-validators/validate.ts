import { MPA } from '../interfaces/omp';
import { MPAction } from '../interfaces/omp-enums';
import { FV_MPM } from './mpm';
import { FV_MPA_LISTING } from './mpa_listing_add';
import { FV_MPA_BID } from './mpa_bid';
import { FV_MPA_LOCK } from './mpa_lock';
import { FV_MPA_ACCEPT } from './mpa_accept';
import { FV_MPA_RELEASE } from './mpa_release';
import { FV_MPA_REJECT } from './mpa_reject';
import { FV_MPA_CANCEL } from './mpa_cancel';
import { FV_MPA_REFUND } from './mpa_refund';

export class Format {

    public static validate(msg: any): boolean {
        // validate base class
        FV_MPM.validate(msg);

        switch (msg.action.type) {
            case MPAction.MPA_LISTING_ADD:
                FV_MPA_LISTING.validate(msg);
                break;
            case MPAction.MPA_BID:
                FV_MPA_BID.validate(msg);
                break;
            case MPAction.MPA_ACCEPT:
                FV_MPA_ACCEPT.validate(msg);
                break;
            case MPAction.MPA_REJECT:
                FV_MPA_REJECT.validate(msg);
                break;
            case MPAction.MPA_CANCEL:
                FV_MPA_CANCEL.validate(msg);
                break;
            case MPAction.MPA_LOCK:
                FV_MPA_LOCK.validate(msg);
                break;
            case MPAction.MPA_RELEASE:
                FV_MPA_RELEASE.validate(msg);
                break;
            case MPAction.MPA_REFUND:
                FV_MPA_REFUND.validate(msg);
                break;
        }
        return true;
    }

    constructor() {
        //
    }

}
