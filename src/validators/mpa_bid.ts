import { MPA, MPA_LISTING_ADD, MPA_BID } from "../interfaces/omp"
import { MPAction } from "../interfaces/omp-enums";
import { Crypto } from "./crypto";


export class ValidateMpaBid {

  constructor() {
  }

  // Only after MPA base class has already validated
  static validate(msg: MPA_BID): boolean {
    const action = msg.action;
    const buyer = action.buyer;

    if (!action.type) {
      throw new Error('action.type: missing');
    }

    if (action.type !== MPAction.MPA_BID) {
      throw new Error('action.type: expecting MPA_BID got ' + action.type);
    }

    if (!action.created) {
      throw new Error('action.created: missing');
    }


    if (!buyer) {
      throw new Error('action.buyer: missing');
    }

    if (buyer.payment) {
      if (typeof buyer.payment === 'object') {
        const payment = buyer.payment;

        if (!payment.pubKey) {
          throw new Error('action.buyer.payment.pubKey: missing');
        }

        if (!payment.outputs) {
          throw new Error('action.buyer.payment.outputs: missing');
        }

        if (!Array.isArray(payment.outputs)) {
          throw new Error('action.buyer.payment.outputs: not an array');
        }

        payment.outputs.forEach((elem, i) => {
          Crypto.validateOutput(elem);
        });

        if (!payment.changeAddress) {
          throw new Error('action.buyer.payment.changeAddress: missing');
        }

      } else {
        throw new Error('action.buyer.payment: not an object');
      }
    }

    if (!buyer.shippingAddress) {
      throw new Error('action.created: missing');
    }

    const shipping = buyer.shippingAddress;
    if (!shipping.firstName) {
      throw new Error('action.buyer.shippingAddress.firstName: missing');
    }

    if (!shipping.lastName) {
      throw new Error('action.buyer.shippingAddress.lastName: missing');
    }

    if (!shipping.addressLine1) {
      throw new Error('action.buyer.shippingAddress.addressLine1: missing');
    }
    //addressLine2 is not required!

    if (!shipping.city) {
      throw new Error('action.buyer.shippingAddress.city: missing');
    }

    if (!shipping.state) {
      throw new Error('action.buyer.shippingAddress.state: missing');
    }

    if (!shipping.zipCode) {
      throw new Error('action.buyer.shippingAddress.zipCode: missing');
    }

    // TODO: validate country against list?
    if (!shipping.country) {
      throw new Error('action.buyer.shippingAddress.country: missing');
    }

    return true;
  }


}

/*
    type: 'MPA_BID',
    created: Number, // timestamp
    item: string, // item hash
    buyer: { 
      payment: {
        pubKey: string,
        outputs: Output[],
        changeAddress: string
      },
      shippingAddress: {
        firstName: string,
        lastName: string,
        addressLine1: string,
        addressLine2: string,
        city: string,
        state: string,
        zipCode: Number,
        country: string,
      }
    }
    */