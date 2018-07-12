import { MPA_ACCEPT, MPM } from "../interfaces/omp"
import { MPAction, EscrowType } from "../interfaces/omp-enums";
import { isNumber, isObject, isArray, isString, isSHA256Hash, isValidPrice, clone } from "../util";

import { FV_MPM} from "./mpm";
import { FV_CRYPTO } from "./crypto";
import { FV_OBJECTS } from "./objects";
import { FV_MPA_ACCEPT_ESCROW_MULTISIG } from "./escrow/multisig";

export class FV_MPA_ACCEPT {

    constructor() {
    }

    static validate(msg: MPM): boolean {
        // validate base class
        FV_MPM.validate(msg);

        const action = <MPA_ACCEPT>msg.action;
        const seller = action.seller;

        if (!isString(action.type)) {
            throw new Error('action.type: missing');
        }

        if (action.type !== MPAction.MPA_ACCEPT) {
            throw new Error('action.type: expecting MPA_ACCEPT got ' + action.type);
        }

        if (!isSHA256Hash(action.bid)) {
            throw new Error('action.bid: missing or not a valid hash');
        }

        if (!isObject(seller)) {
            throw new Error('action.seller: missing or not an object');
        }

        if (isObject(seller.payment)) {
            const payment = seller.payment;
            if (!(payment.escrow in EscrowType)) {
                throw new Error('action.buyer.payment.escrow: expecting escrow type, unknown value, got ' + payment.escrow);
            }

            // TODO: implement all validators
            switch (payment.escrow) {
                case EscrowType.MULTISIG:
                    FV_MPA_ACCEPT_ESCROW_MULTISIG.validate(payment);
                    break;
                default:
                    throw new Error('action.seller.payment.escrow: unknown validation format, unknown value, got ' + payment.escrow);
            }

            if (!isValidPrice(payment.fee)) {
                throw new Error('action.seller.payment.fee: not a valid fee');
            }

        } else {
            throw new Error('action.seller.payment: missing or not an object');
        }

        return true;
    }


}
