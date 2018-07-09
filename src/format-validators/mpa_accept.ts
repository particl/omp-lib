import { MPA_ACCEPT } from "../interfaces/omp"
import { MPAction } from "../interfaces/omp-enums";
import { isNumber, isObject, isArray, isString, isSHA256Hash } from "./util";

import { FV_MPA } from "./mpa";
import { FV_CRYPTO } from "./crypto";
import { FV_OBJECTS } from "./objects";

export class FV_MPA_ACCEPT {

  constructor() {
  }

  static validate(msg: MPA_ACCEPT): boolean {
    // validate base class
    FV_MPA.validate(msg);

    const action = msg.action;
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

      if (!isString(seller.payment.pubKey)) {
        throw new Error('action.seller.pubKey: missing or not a string');
      }

      if (!isArray(seller.payment.outputs)) {
        throw new Error('action.seller.payment.outputs: missing or not an array');
      }

      seller.payment.outputs.forEach((elem, i) => {
        FV_CRYPTO.validateOutput(elem);
      });

      if (!isArray(seller.payment.signatures)) {
        throw new Error('action.seller.payment.signatures: missing or not an array');
      }

      seller.payment.signatures.forEach((elem, i) => {
        FV_CRYPTO.validateSignature(elem);
      });

      FV_CRYPTO.validateCryptoAddress(seller.payment.changeAddress);

    } else {
        throw new Error('action.seller.payment: missing or not an object');
    }

    return true;
  }


}
