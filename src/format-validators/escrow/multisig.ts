import { Output, CryptoAddress, CryptoAddressType } from "../../interfaces/crypto";
import { isObject, isNumber, isString, isTxid, isArray } from "../util";
import { FV_CRYPTO } from "../crypto";
import { EscrowType } from "../../interfaces/omp-enums";


export class FV_MPA_BID_ESCROW_MULTISIG {

    constructor() {
    }

    static validate(payment: any): boolean {

        if (!isObject(payment)) {
            throw new Error('escrow mad: missing or not an object!');
        }

        if (payment.escrow !== EscrowType.MULTISIG) {
            throw new Error('escrow mad: expected MULTISIG, got' + payment.escrow);
        }

        if (!isString(payment.pubKey)) {
            throw new Error('action.buyer.payment.pubKey: missing or not a string');
        }

        if (!isArray(payment.outputs)) {
            throw new Error('action.buyer.payment.outputs: not an array');
        }

        payment.outputs.forEach((elem, i) => {
            FV_CRYPTO.validateOutput(elem);
        });

        FV_CRYPTO.validateCryptoAddress(payment.changeAddress);

        return true;
    }

}

export class FV_MPA_ACCEPT_ESCROW_MULTISIG {

    constructor() {
    }

    static validate(payment: any): boolean {
        FV_MPA_BID_ESCROW_MULTISIG.validate(payment);
        return true;
    }

}