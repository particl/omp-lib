import { MPA, MPA_EXT_LISTING_ADD } from "../interfaces/omp"
import { PaymentType, MPAction, EscrowType } from "../interfaces/omp-enums";
import { isString, isObject, isArray, isNumber, isValidPrice, isValidPercentage } from './util'
import { FV_MPA } from "./mpa";
import { FV_CRYPTO } from "./crypto";
import { CryptoType } from "../interfaces/crypto"
import { FV_CONTENT } from "./content";

export class FV_OBJECTS {

  constructor() {
  }

  static validate(objects: any): boolean {
 
    if (objects) {
      if (!isArray(objects)) {
        throw new Error('objects: not an array');
      }

      objects.forEach((elem, i) => {
        if (!isObject(elem)) {
          throw new Error('objects: not an object element=' + i);
        }

        if (!isString(elem.id) || !(isString(elem.value) || isNumber(elem.value))) {
          throw new Error('objects: missing elements in element=' + i);
        }
      });

    }

    return true;
  }


}