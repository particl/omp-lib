import { Prevout, CryptoAddress, CryptoAddressType } from "../../interfaces/crypto";
import { isObject, isNumber, isString, isTxid, isArray } from "../../util";
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

        if (!isArray(payment.prevouts)) {
            throw new Error('action.buyer.payment.prevouts: not an array');
        }

        payment.prevouts.forEach((elem, i) => {
            FV_CRYPTO.validatePrevout(elem);
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

        if (!isArray(payment.signatures)) {
            throw new Error('action.seller.payment.signatures: missing or not an array');
        }

        payment.signatures.forEach((elem, i) => {
            FV_CRYPTO.validateSignature(elem);
        });

        if (payment.signatures.length !== payment.prevouts.length) {
            throw new Error('action.seller.payment.signatures: amount of signatures does not match amount of prevouts');
        }

        return true;
    }

}

export class FV_MPA_LOCK_ESCROW_MULTISIG {

    constructor() {
    }

    static validate(payment: any): boolean {

        if (!isArray(payment.signatures)) {
            throw new Error('action.buyer.payment.signatures: missing or not an array');
        }

        payment.signatures.forEach((elem, i) => {
            FV_CRYPTO.validateSignature(elem);
        });

        return true;
    }

}

export class FV_MPA_RELEASE_ESCROW_MULTISIG {

    constructor() {
    }

    static validate(payment: any): boolean {

        if (!isArray(payment.signatures)) {
            throw new Error('action.seller.payment.signatures: missing or not an array');
        }

        payment.signatures.forEach((elem, i) => {
            FV_CRYPTO.validateSignature(elem);
        });

        return true;
    }

}

export class FV_MPA_REFUND_ESCROW_MULTISIG {

    constructor() {
    }

    static validate(payment: any): boolean {

        if (!isArray(payment.signatures)) {
            throw new Error('action.buyer.payment.signatures: missing or not an array');
        }

        payment.signatures.forEach((elem, i) => {
            FV_CRYPTO.validateSignature(elem);
        });

        return true;
    }

}