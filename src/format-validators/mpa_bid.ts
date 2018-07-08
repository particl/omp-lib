import { MPA, MPA_LISTING_ADD, MPA_BID } from "../interfaces/omp"
import { MPAction } from "../interfaces/omp-enums";
import { Crypto } from "./crypto";
import { isNumber, isObject, isArray, isString, isTimestamp, isSHA256Hash } from "./util";

// TODO: Objects!
export class ValidateMpaBid {

  constructor() {
  }

  // Only after MPA base class has already validated
  static validate(msg: MPA_BID): boolean {
    const action = msg.action;
    const buyer = action.buyer;

    if (!isString(action.type)) {
      throw new Error('action.type: missing');
    }

    if (action.type !== MPAction.MPA_BID) {
      throw new Error('action.type: expecting MPA_BID got ' + action.type);
    }

    if (!isTimestamp(action.created)) {
      throw new Error('action.created: missing or not a valid timestamp');
    }

    if (!isSHA256Hash(action.item)) {
      throw new Error('action.item: missing or not a valid hash');
    }

    if (!isObject(buyer)) {
      throw new Error('action.buyer: missing or not an object');
    }

    if (isObject(buyer.payment)) {
      const payment = buyer.payment;

      if (!isString(payment.pubKey)) {
        throw new Error('action.buyer.payment.pubKey: missing or not a string');
      }

      if (!isArray(payment.outputs)) {
        throw new Error('action.buyer.payment.outputs: not an array');
      }

      payment.outputs.forEach((elem, i) => {
        Crypto.validateOutput(elem);
      });

      if (!isString(payment.changeAddress)) {
        throw new Error('action.buyer.payment.changeAddress: missing');
      }

      Crypto.validateCryptoAddress(payment.changeAddress);

    } else {
      throw new Error('action.buyer.payment: not an object');
    }


    if (!isObject(buyer.shippingAddress)) {
      throw new Error('action.buyer.shippingAddress: missing or not an object');
    }

    const shipping = buyer.shippingAddress;
    if (!isString(shipping.firstName)) {
      throw new Error('action.buyer.shippingAddress.firstName: missing');
    }

    if (!isString(shipping.lastName)) {
      throw new Error('action.buyer.shippingAddress.lastName: missing');
    }

    if (!isString(shipping.addressLine1)) {
      throw new Error('action.buyer.shippingAddress.addressLine1: missing');
    }
    //addressLine2 is not required!

    if (!isString(shipping.city)) {
      throw new Error('action.buyer.shippingAddress.city: missing');
    }

    if (!isString(shipping.state)) {
      throw new Error('action.buyer.shippingAddress.state: missing');
    }

    if (!isString(shipping.zipCode)) {
      throw new Error('action.buyer.shippingAddress.zipCode: missing');
    }

    // TODO: validate country against list?
    // TODO: check length?
    if (!isString(shipping.country)) {
      throw new Error('action.buyer.shippingAddress.country: missing');
    }



    if(action.objects) {
      if(!isArray(action.objects)) {
        throw new Error('action.objects: not an array');
      }

      action.objects.forEach((elem, i) => {
        if (!isObject(elem)) {
          throw new Error('action.objects: not an object element=' + i);
        }
  
        if (!isString(elem.id) || !(isString(elem.value) || isNumber(elem.value))) {
          throw new Error('action.objects: missing elements in element=' + i);
        }
      });
    }

    return true;
  }


}
