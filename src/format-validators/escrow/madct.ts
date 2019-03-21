import { Prevout, CryptoAddress, CryptoAddressType, ToBeBlindOutput } from '../../interfaces/crypto';
import { isObject, isNumber, isString, isTxid, isArray, isBlindFactor, isNonNegativeNaturalNumber } from '../../util';
import { FV_CRYPTO } from '../crypto';
import { EscrowType } from '../../interfaces/omp-enums';
import { isPublicKey, isPrivateKey } from '../util';

// TODO: max one class per file
// tslint:disable max-classes-per-file

/**
 * Validates release/refund/destroy objects in the protocol messages.
 * @param exit either a release, refund or destroy object.
 * @param expectEphem sometimes an ephem is not expected.
 * @param expectSignatures sometimes a signature object is not expected.
 */
function validateReleaseRefundDestroy(exit, expectEphem = true, expectSignatures = true): boolean {

    if (!isObject(exit)) {
        throw new Error('missing or not an object');
    }

    if (expectSignatures) {
        if (!isArray(exit.signatures)) {
            throw new Error('signatures: missing or not an array');
        }

        exit.signatures.forEach((elem, i) => {
            try {
                FV_CRYPTO.validateSignatureObject(elem);
            } catch (e) {
                throw new Error('action.buyer.payment.release.signatures[' + i + ']: ' + e);
            }
        });

        if (exit.signatures.length !== 2) {
            throw new Error('signatures: amount of signatures does not equal 2');
        }
    }

    if (expectEphem) {
        if (!isObject(exit.ephem)) {
            throw new Error('ephem: missing or not an object');
        }
        if (!isPublicKey(exit.ephem.public)) {
            throw new Error('ephem.public: missing or not a public key');
        }
        if (!isPrivateKey(exit.ephem.private)) {
            throw new Error('ephem.private: missing or not a private key');
        }
    }

    if (exit.blindFactor && !isBlindFactor(exit.blindFactor)) {
        throw new Error('blindFactor: missing or not a private key');
    }

    return true;
}

export class FV_MPA_BID_ESCROW_MAD_CT {

    public static validate(payment: any): boolean {

        if (!isObject(payment)) {
            throw new Error('action.buyer.payment: missing or not an object!');
        }

        if (payment.escrow !== EscrowType.MAD_CT) {
            throw new Error('action.buyer.payment.escrow: expected MAD_CT, received=' + payment.escrow);
        }

        if (!isArray(payment.prevouts)) {
            throw new Error('action.buyer.payment.prevouts: not an array');
        }

        payment.prevouts.forEach((elem, i) => {
            try {
                FV_CRYPTO.validateBlindPrevout(elem);
            } catch (e) {
                throw new Error('action.buyer.payment.prevouts[' + i + ']: ' + e);
            }
        });

        if (!isArray(payment.outputs)) {
            throw new Error('action.buyer.payment.outputs: not an array');
        }

        payment.outputs.forEach((elem: ToBeBlindOutput, i) => {
            try {
                FV_CRYPTO.validateBlindOutput(elem);
            } catch (e) {
                throw new Error('action.buyer.payment.outputs[' + i + ']: ' + e);
            }
        });


        try {
            validateReleaseRefundDestroy(payment.release, true, false)
        } catch (e) {
            throw new Error('action.buyer.payment.release: ' + e);
        }


        return true;
    }

    constructor() {
        //
    }

}

export class FV_MPA_ACCEPT_ESCROW_MAD_CT {

    public static validate(payment: any): boolean {
        FV_MPA_BID_ESCROW_MAD_CT.validate(payment);

        if (!isNonNegativeNaturalNumber(payment.fee) && payment.fee > 0) {
            throw new Error('action.seller.payment.fee: not a non negative number or > 0');
        }

        // Validate that all fields are present in the release object.
        try {
            validateReleaseRefundDestroy(payment.release)
        } catch (e) {
            throw new Error('action.seller.payment.release: ' + e);
        }

        try {
            validateReleaseRefundDestroy(payment.destroy, false)
        } catch (e) {
            throw new Error('action.seller.payment.destroy: ' + e);
        }

        return true;
    }

    constructor() {
        //
    }

}

export class FV_MPA_LOCK_ESCROW_MAD_CT {

    public static validate(payment: any): boolean {

        if (!isArray(payment.signatures)) {
            throw new Error('action.buyer.payment.signatures: missing or not an array');
        }

        payment.signatures.forEach((elem, i) => {
            try {
                FV_CRYPTO.validateSignatureObject(elem);
            } catch (e) {
                throw new Error('action.buyer.payment.signatures[' + i + ']: ' + e);
            }
        });


        // payment.refund
        try {
            validateReleaseRefundDestroy(payment.refund, false)
        } catch (e) {
            throw new Error('action.buyer.payment.refund: ' + e);
        }

        return true;
    }

    constructor() {
        //
    }
}
