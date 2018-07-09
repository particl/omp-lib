import { MPA_LOCK } from "../interfaces/omp"
import { MPAction } from "../interfaces/omp-enums";
import { isObject, isArray, isString, isSHA256Hash } from "./util";

import { FV_CRYPTO } from "./crypto";
import { FV_MPA } from "./mpa";

export class FV_MPA_LOCK {

  constructor() {
  }

  static validate(msg: MPA_LOCK): boolean {
    // validate base class
    FV_MPA.validate(msg);

    const action = msg.action;
    const buyer = action.buyer;

    if (!isString(action.type)) {
      throw new Error('action.type: missing');
    }

    if (action.type !== MPAction.MPA_LOCK) {
      throw new Error('action.type: expecting MPA_LOCK got ' + action.type);
    }

    if (!isSHA256Hash(action.bid)) {
        throw new Error('action.bid: missing or not a valid hash');
    }

    if (!isObject(buyer)) {
      throw new Error('action.buyer: missing or not an object');
    }

    if (isObject(buyer.payment)) {

      if (!isArray(buyer.payment.signatures)) {
        throw new Error('action.buyer.payment.signatures: missing or not an array');
      }

      buyer.payment.signatures.forEach((elem, i) => {
        FV_CRYPTO.validateSignature(elem);
      });


    } else {
        throw new Error('action.buyer.payment: missing or not an object');
    }

    return true;
  }


}
