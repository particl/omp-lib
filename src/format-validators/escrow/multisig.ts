import { Prevout, CryptoAddress, CryptoAddressType } from '../../interfaces/crypto';
import { isObject, isNumber, isString, isTxid, isArray } from '../../util';
import { FV_CRYPTO } from '../crypto';
import { EscrowType } from '../../interfaces/omp-enums';
import { isNonNegativeNaturalNumber } from '../util';

// TODO: max one class per file
// tslint:disable max-classes-per-file

export class FV_MPA_BID_ESCROW_MULTISIG {

    public static validate(payment: any): boolean {

        if (!isObject(payment)) {
            throw new Error('escrow mad: missing or not an object!');
        }

        if (payment.escrow !== EscrowType.MULTISIG) {
            throw new Error('escrow mad: expected MULTISIG, received=' + payment.escrow);
        }

        if (!isString(payment.pubKey)) {
            throw new Error('action.buyer.payment.pubKey: missing or not a string');
        }

        if (!isArray(payment.prevouts)) {
            throw new Error('action.buyer.payment.prevouts: not an array');
        }

        payment.prevouts.forEach((elem, i) => {
            try {
                FV_CRYPTO.validatePrevout(elem);
            } catch (e) {
                throw new Error('action.buyer.payment.prevouts['+i+']: ' + e);
            }
        });

        FV_CRYPTO.validateCryptoAddress(payment.changeAddress);

        return true;
    }

    constructor() {
        //
    }

}

export class FV_MPA_ACCEPT_ESCROW_MULTISIG {

    public static validate(payment: any): boolean {
        // The validation for MPA_BID can be re-used here
        // MPA_ACCEPT shares a similar structure.
        FV_MPA_BID_ESCROW_MULTISIG.validate(payment);

        if (!isNonNegativeNaturalNumber(payment.fee) && payment.fee > 0) {
            throw new Error('action.seller.payment.fee: not a non negative number or > 0');
        }

        if (!isArray(payment.signatures)) {
            throw new Error('action.seller.payment.signatures: missing or not an array');
        }

        payment.signatures.forEach((elem, i) => {
            FV_CRYPTO.validateSignatureObject(elem);
        });

        if (payment.signatures.length !== payment.prevouts.length) {
            throw new Error('action.seller.payment.signatures: amount of signatures does not match amount of prevouts');
        }

        // payment.release
        {
            if (!isObject(payment.release)) {
                throw new Error('action.seller.payment.release: missing or not an object');
            }
    
            if (!isArray(payment.release.signatures)) {
                throw new Error('action.seller.payment.release.signatures: missing or not an array');
            }
    
            payment.release.signatures.forEach((elem, i) => {
                FV_CRYPTO.validateSignatureObject(elem);
            });
    
            if (payment.release.signatures.length !== 1) {
                throw new Error('action.seller.payment.release.signatures: amount of signatures does not equal 1');
            }
        }

        return true;
    }

    constructor() {
        //
    }

}

export class FV_MPA_LOCK_ESCROW_MULTISIG {

    public static validate(payment: any): boolean {

        if (!isArray(payment.signatures)) {
            throw new Error('action.buyer.payment.signatures: missing or not an array');
        }

        payment.signatures.forEach((elem, i) => {
            FV_CRYPTO.validateSignatureObject(elem);
        });


        // payment.refund
        {
            if (!isObject(payment.refund)) {
                throw new Error('action.seller.payment.refund: missing or not an object');
            }
    
            if (!isArray(payment.refund.signatures)) {
                throw new Error('action.seller.payment.refund.signatures: missing or not an array');
            }
    
            payment.refund.signatures.forEach((elem, i) => {
                FV_CRYPTO.validateSignatureObject(elem);
            });
    
            if (payment.refund.signatures.length !== 1) {
                throw new Error('action.seller.payment.refund.signatures: amount of signatures does not equal 1');
            }
        }

        return true;
    }

    constructor() {
        //
    }
}
