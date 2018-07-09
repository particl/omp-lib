import { MPA_RELEASE } from "../interfaces/omp"
import { MPAction, EscrowType } from "../interfaces/omp-enums";
import { isObject, isArray, isString, isSHA256Hash } from "./util";

import { FV_CRYPTO } from "./crypto";
import { FV_MPA } from "./mpa";
import { FV_MPA_RELEASE_ESCROW_MULTISIG } from "./escrow/multisig";

export class FV_MPA_RELEASE {

    constructor() {
    }

    static validate(msg: MPA_RELEASE): boolean {
        // validate base class
        FV_MPA.validate(msg);

        const action = msg.action;
        const seller = action.seller;

        if (!isString(action.type)) {
            throw new Error('action.type: missing');
        }

        if (action.type !== MPAction.MPA_RELEASE) {
            throw new Error('action.type: expecting MPA_RELEASE got ' + action.type);
        }

        if (!isSHA256Hash(action.bid)) {
            throw new Error('action.bid: missing or not a valid hash');
        }

        if (!isObject(seller)) {
            throw new Error('action.seller: missing or not an object');
        }

        if (isObject(seller.payment)) {
            const payment = seller.payment;
            // TODO: implement all validators
            switch (payment.escrow) {
                case EscrowType.MULTISIG:
                    FV_MPA_RELEASE_ESCROW_MULTISIG.validate(payment);
                    break;
                default:
                    throw new Error('action.seller.payment.escrow: unknown validation format, unknown value, got ' + payment.escrow);
            }

        } else {
            throw new Error('action.seller.payment: missing or not an object');
        }

        return true;
    }

}
