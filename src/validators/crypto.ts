import { Output } from "../interfaces/crypto";


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

      if(!out.vout) {
        throw new Error('output: txid missing');
      }

      if(out.vout < 0) {
        throw new Error('output: vout can not be negative');
      }
  
      return true;
    }


}

/*
 export interface Output {
    txid: string,
    vout: Number
  }
 */