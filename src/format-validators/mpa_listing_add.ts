import { MPA, MPA_EXT_LISTING_ADD } from "../interfaces/omp"
import { PaymentType, MPAction, EscrowType } from "../interfaces/omp-enums";
import { isString, isObject, isArray, isNumber, isValidPrice, isValidPercentage } from './util'
import { Crypto } from "./crypto";
import { ValidateContent } from "./content";

// TODO: DSN validation (images)
// TODO: shippingPrice
export class ValidateMpaListingAdd {

  constructor() {
  }

  // Only after MPA base class has already validated
  static validate(msg: MPA_EXT_LISTING_ADD): boolean {
    const action = msg.action;
    const item = action.item;

    if (!isString(action.type) || action.type !== MPAction.MPA_LISTING_ADD) {
      throw new Error('action.type: wrong or missing');
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

      if(information.images) {
        if (!isArray(information.images)) {
          throw new Error('action.item.information.images: not an array');
        }

        // validate the content references
        information.images.forEach((elem) => {
          ValidateContent.validate(elem);
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
      // TODO: RENT?
      if (payment.type === "SALE") {

        if (!isObject(payment.escrow)) {
          throw new Error('action.item.payment.escrow: missing');
        }

        if (!isObject(payment.escrow.ratio) || !isString(payment.escrow.type)) {
          throw new Error('action.item.payment.escrow: missing or incomplete');
        }

        if (!(payment.escrow.type in EscrowType)) {
          throw new Error('action.item.payment.escrow.type: unknown value');
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

          if (!isNumber(elem.basePrice) || !isString(elem.currency)) {
            throw new Error('action.item.payment.cryptocurrency: missing currency or basePrice, fault in element=' + i);
          }

          if (!isValidPrice(elem.basePrice)) {
            throw new Error('action.item.payment.cryptocurrency: only basePrice > 0 is allowed, fault in element=' + i);
          }

          if(elem.shippingPrice) {
            if(isObject(elem.shippingPrice)) {
              const s = elem.shippingPrice;
              if (!isValidPrice(s.domestic)) {
                throw new Error('action.item.payment.cryptocurrency.shippingPrice.domestic: not a number or negative, fault in element=' + i);
              }

              if (!isValidPrice(s.international)) {
                throw new Error('action.item.payment.cryptocurrency.shippingPrice.international: not a number or negative, fault in element=' + i);
              }

            } else {
              throw new Error('action.item.payment.cryptocurrency.shippingPrice: not an object, fault in element=' + i);
            }
          }

          if(elem.address) {
            Crypto.validateCryptoAddress(elem.address);
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


    if(item.objects) {
      if(!isArray(item.objects)) {
        throw new Error('action.item.objects: not an array');
      }

      item.objects.forEach((elem, i) => {
        if (!isObject(elem)) {
          throw new Error('action.item.objects: not an object element=' + i);
        }
  
        if (!isString(elem.id) || !(isString(elem.value) && isNumber(elem.value))) {
          throw new Error('action.item.objects: missing elements in element=' + i);
        }
      });

    }

    return true;
  }


}