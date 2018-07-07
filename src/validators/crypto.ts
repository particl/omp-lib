import { Output, CryptoAddress, CryptoAddressType } from "../interfaces/crypto";


export class Crypto {

    constructor() {
    }

    static validateOutput(out: Output): boolean {
      if(!out) {
        throw new Error('output: missing');
      }

      if(!out.txid) {
        throw new Error('output: txid missing');
      }

      if(typeof out.vout !== 'number') {
        throw new Error('output: vout missing');
      }

      if(out.vout < 0) {
        throw new Error('output: vout can not be negative');
      }
  
      return true;
    }

    static validateCryptoAddress(address: CryptoAddress): boolean {
        if(!address) {
          throw new Error('CryptoAddress: missing');
        }
  
        if(!address.type) {
          throw new Error('CryptoAddress.type: missing');
        }

        if(!(address.type in CryptoAddressType)) {
            throw new Error('CryptoAddress.type: unrecognized value');
        }

        if(!address.address) {
            throw new Error('CryptoAddress.address: missing');
        }

        if(typeof address.address !== 'string') {
            throw new Error('CryptoAddress.address: address is of the wrong type, expecting string');
        }

        return true;
      }

}