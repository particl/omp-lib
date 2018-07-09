import { MPA } from "../interfaces/omp"
import { MPAction } from "../interfaces/omp-enums";
import { FV_MPA } from "./mpa";
import { FV_MPA_LISTING } from "./mpa_listing_add";
import { FV_MPA_BID } from "./mpa_bid";

export class Validator {

    constructor() {
    }

    public validate(msg: any): boolean {
        // validate base class
        FV_MPA.validate(msg);

        switch (msg.action.type) {
            case MPAction.MPA_LISTING_ADD:
                FV_MPA_LISTING.validate(msg);
                break;
            case MPAction.MPA_BID:
                FV_MPA_BID.validate(msg);
                break;
        }
        return true;
    }

}