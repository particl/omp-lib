import { MPA, MPA_EXT_LISTING_ADD, MPM } from "../interfaces/omp"
import { PaymentType, MPAction, EscrowType } from "../interfaces/omp-enums";
import { isString, isObject, isArray, isNumber, isValidPrice, isValidPercentage, isCountry } from '../util'
import { FV_MPM} from "./mpm";
import { FV_CRYPTO } from "./crypto";
import { CryptoType } from "../interfaces/crypto"
import { FV_CONTENT } from "./content";
import { FV_OBJECTS } from "./objects";

// TODO: DSN validation (images)
// TODO: shippingPrice
export class FV_MPA_LISTING {

  constructor() {
  }

  static validate(msg: MPM): boolean {
    // validate base class
    FV_MPM.validate(msg);

    const action = <MPA_EXT_LISTING_ADD>msg.action;
    const item = action.item;

    if (!isString(action.type) || action.type !== MPAction.MPA_LISTING_ADD) {
      throw new Error('action.type: wrong or missing');
    }

    if (!isObject(item)) {
      throw new Error('action.item: missing or not an object');
    }

    // Validate information
    if (isObject(item.information)) {
      const information = item.information;

      // TODO check length?
      if (!isString(information.title)) {
        throw new Error('action.item.information.title: missing');
      }

      // TODO check length?
      if (!isString(information.shortDescription)) {
        throw new Error('action.item.information.shortDescription: missing');
      }

      // TODO check length?
      if (!isString(information.longDescription)) {
        throw new Error('action.item.information.longDescription: missing');
      }


      if (!isArray(information.category)) {
        throw new Error('action.item.information.category: not an array');
      }

      if (information.category.length === 0) {
        throw new Error('action.item.information.category: no categories specified!');
      };

      information.category.forEach((elem, i) => {
        if (!isString(elem)) {
          throw new Error('action.item.information.categories: not a string, element=' + i);
        }
      });

      if (isObject(information.location)) {
        const location = information.location;

        if (!isCountry(location.country)) {
          throw new Error('action.item.information.location.country: not a country');
        }

        if (location.address && !isString(location.address)) {
          throw new Error('action.item.information.location.address: not a string');
        }

        if (location.gps) {
          if (!isObject(location.gps)) {
            throw new Error('action.item.information.location.gps: not an object');
          }

          if (!isNumber(location.gps.lat)) {
            throw new Error('action.item.information.location.gps.lat: not a number');
          }

          if (!isNumber(location.gps.lng)) {
            throw new Error('action.item.information.location.gps.lng: not a number');
          }

          if (!isString(location.gps.markerText)) {
            throw new Error('action.item.information.location.gps.markerText: not a string');
          }

          if (!isString(location.gps.markerTitle)) {
            throw new Error('action.item.information.location.gps.markerTitle: not a string');
          }
        }
      }

      if (information.shippingDestinations) {
        if (!isArray(information.shippingDestinations)) {
          throw new Error('action.item.information.shippingDestinations: not an array');
        }

        information.shippingDestinations.forEach((value, i) => {
          if (!isString(value)) {
            throw new Error('shippingDestinations: not a string, fault at element=' + i);
          }
        })
      }

      if (information.images) {
        if (!isArray(information.images)) {
          throw new Error('action.item.information.images: not an array');
        }

        // validate the content references
        information.images.forEach((elem) => {
          FV_CONTENT.validate(elem);
        });
      }

    } else {
      throw new Error('action.item.information: missing');
    }




    // Validate Payment
    if (isObject(item.payment)) {
      const payment = item.payment;

      if (isString(payment.type)) {
        if (!(payment.type in PaymentType)) {
          throw new Error('action.item.payment.type: unknown value');
        }
      } else {
        throw new Error('action.item.payment.type: missing');
      }

      // If it's a sale,
      // it must contain some payment information.
      // TODO: FREE
      // TODO: RENT?
      if (["SALE", "RENT"].includes(payment.type)) {

        if (!isObject(payment.escrow)) {
          throw new Error('action.item.payment.escrow: missing');
        }

        if (!isString(payment.escrow.type)) {
          throw new Error('action.item.payment.escrow.type: missing or not a string');
        }

        if (!(payment.escrow.type in EscrowType)) {
          throw new Error('action.item.payment.escrow.type: unknown value');
        }

        if (!isObject(payment.escrow.ratio)) {
          throw new Error('action.item.payment.escrow: missing or not an object');
        }

        if (!isValidPercentage(payment.escrow.ratio.buyer) || !isValidPercentage(payment.escrow.ratio.seller)) {
          throw new Error('action.item.payment.escrow.ratio: missing or invalid percentages');
        }

        if (!isArray(payment.cryptocurrency)) {
          throw new Error('action.item.payment.cryptocurrency: not an array');
        }

        if (payment.cryptocurrency.length === 0) {
          throw new Error('action.item.payment.cryptocurrency: length of array is 0, missing?');
        }

        payment.cryptocurrency.forEach((elem, i) => {

          if (!isObject(elem)) {
            throw new Error('action.item.payment.cryptocurrency: not an object element=' + i);
          }

          if (!isString(elem.currency)) {
            throw new Error('action.item.payment.cryptocurrency.currency: missing or not a string, fault in element=' + i);
          }

          if (!(elem.currency in CryptoType)) {
            throw new Error('action.item.payment.cryptocurrency.currency: unknown value, fault in element=' + i);
          }

          if (!isValidPrice(elem.basePrice)) {
            throw new Error('action.item.payment.cryptocurrency: faulty basePrice (< 0, fractional or overflow), fault in element=' + i);
          }

          if (elem.shippingPrice) {
            if (!isObject(elem.shippingPrice)) {
              throw new Error('action.item.payment.cryptocurrency.shippingPrice: not an object, fault in element=' + i);
            }

            const s = elem.shippingPrice;
            if (!isValidPrice(s.domestic)) {
              throw new Error('action.item.payment.cryptocurrency.shippingPrice.domestic: faulty domestic shipping price (< 0, fractional or overflow), fault in element=' + i);
            }

            if (!isValidPrice(s.international)) {
              throw new Error('action.item.payment.cryptocurrency.shippingPrice.international: faulty international shipping price (< 0, fractional or overflow), fault in element=' + i);
            }
          }

          if (elem.address) {
            FV_CRYPTO.validateCryptoAddress(elem.address);
          }
        });

      }

    } else {
      throw new Error('action.item.payment: missing');
    }


    if (!isArray(item.messaging)) {
      throw new Error('action.item.messaging: not an array');
    }

    if (item.messaging.length === 0) {
      throw new Error('action.item.messaging: length of array is 0, missing?');
    }

    item.messaging.forEach((elem, i) => {
      if (!isObject(elem)) {
        throw new Error('action.item.messaging: not an object element=' + i);
      }

      if (!isString(elem.protocol) || !isString(elem.publicKey)) {
        throw new Error('action.item.messaging: missing elements in element=' + i);
      }
    });


    if (item.objects) {
      FV_OBJECTS.validate(item.objects);
    }

    return true;
  }


}