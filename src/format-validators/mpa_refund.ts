import { MPA_REFUND } from "../interfaces/omp"
import { MPAction, EscrowType } from "../interfaces/omp-enums";
import { isObject, isArray, isString, isSHA256Hash } from "../util";

import { FV_CRYPTO } from "./crypto";
import { FV_MPA } from "./mpa";
import { FV_MPA_REFUND_ESCROW_MULTISIG } from "./escrow/multisig";

export class FV_MPA_REFUND {

    constructor() {
    }

    static validate(msg: MPA_REFUND): boolean {
        // validate base class
        FV_MPA.validate(msg);

        const action = msg.action;
        const buyer = action.buyer;

        if (!isString(action.type)) {
            throw new Error('action.type: missing');
        }

        if (action.type !== MPAction.MPA_REFUND) {
            throw new Error('action.type: expecting MPA_REFUND got ' + action.type);
        }

        if (!isSHA256Hash(action.bid)) {
            throw new Error('action.bid: missing or not a valid hash');
        }

        if (!isObject(buyer)) {
            throw new Error('action.buyer: missing or not an object');
        }

        if (isObject(buyer.payment)) {
            const payment = buyer.payment;
            // TODO: implement all validators
            switch (payment.escrow) {
                case EscrowType.MULTISIG:
                    FV_MPA_REFUND_ESCROW_MULTISIG.validate(payment);
                    break;
                default:
                    throw new Error('action.buyer.payment.escrow: unknown validation format, unknown value, got ' + payment.escrow);
            }

        } else {
            throw new Error('action.buyer.payment: missing or not an object');
        }

        return true;
    }


}
