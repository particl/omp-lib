import { MPA, MPA_LISTING_ADD, MPA_BID, MPM } from "../interfaces/omp"
import { MPAction, EscrowType } from "../interfaces/omp-enums";
import { FV_CRYPTO } from "./crypto";
import { isNumber, isObject, isArray, isString, isTimestamp, isSHA256Hash, isCountry } from "../util";
import { FV_MPM} from "./mpm";
import { FV_OBJECTS } from "./objects";
import { FV_MPA_BID_ESCROW_MULTISIG } from "./escrow/multisig";
import { CryptoType } from "../interfaces/crypto";

export class FV_MPA_BID {

  constructor() {
  }

  static validate(msg: MPM): boolean {
    // validate base class
    FV_MPM.validate(msg);

    const action = <MPA_BID>msg.action;
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

      if (!(payment.cryptocurrency in CryptoType)) {
        throw new Error('action.buyer.payment.cryptocurrency: expecting cryptocurrency type, unknown value, got ' + payment.cryptocurrency);
      }

      if (!(payment.escrow in EscrowType)) {
        throw new Error('action.buyer.payment.escrow: expecting escrow type, unknown value, got ' + payment.escrow);
      }

      // TODO: implement all validators
      switch(payment.escrow) {
        case EscrowType.MULTISIG:
          FV_MPA_BID_ESCROW_MULTISIG.validate(payment);
          break;
        default:
          throw new Error('action.buyer.payment.escrow: unknown validation format, unknown value, got ' + payment.escrow);
      }

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
    if (!isCountry(shipping.country)) {
      throw new Error('action.buyer.shippingAddress.country: missing or not a country');
    }

    if(action.objects) {
      FV_OBJECTS.validate(action.objects);
    }

    return true;
  }


}
