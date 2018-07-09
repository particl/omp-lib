import { Output, CryptoAddress, CryptoAddressType } from "../interfaces/crypto";
import { isObject, isNumber, isString, isTxid, isArray } from "./util";


export class FV_CRYPTO {

    constructor() {
    }

    static validateOutput(out: Output): boolean {

      if(!isObject(out)) {
        throw new Error('output: missing or not an object!');
      }

      if(!isTxid(out.txid)) {
        throw new Error('output: txid missing');
      }

      if(!isNumber(out.vout)) {
        throw new Error('output: vout is of the wrong type, expecting number');
      }

      if(out.vout < 0) {
        throw new Error('output: vout can not be negative');
      }
  
      return true;
    }

    static validateCryptoAddress(address: CryptoAddress): boolean {
        if(!isObject(address)) {
          throw new Error('CryptoAddress: missing or not an object!');
        }
  
        if(!isString(address.type)) {
          throw new Error('CryptoAddress.type: missing or not a string');
        }

        if(!(address.type in CryptoAddressType)) {
            throw new Error('CryptoAddress.type: unrecognized value');
        }

        if(!isString(address.address)) {
            throw new Error('CryptoAddress.address: address is missing or wrong type, expecting string');
        }

        return true;
      }

      static validateSignature(signature: any): boolean {

        if(!isString(signature)) {
            throw new Error('Signature: missing or not a string');
        }

        return true;
      }

}