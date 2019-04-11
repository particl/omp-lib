import { Prevout, CryptoAddress, CryptoAddressType, ToBeBlindOutput } from '../../interfaces/crypto';
import { isObject, isNumber, isString, isTxid, isArray, isBlindFactor, isNonNegativeNaturalNumber } from '../../util';
import { FV_CRYPTO } from '../crypto';
import { EscrowType } from '../../interfaces/omp-enums';
import { isPublicKey, isPrivateKey } from '../util';
import { PaymentDataLock, PaymentDataBidCT, PaymentDataAcceptCT } from '../../interfaces/omp';

// TODO: max one class per file
// tslint:disable max-classes-per-file no-string-throw

function validateBasic(payment: any): boolean {

    if (!isObject(payment)) {
        throw ('missing or not an object!');
    }

    if (payment.escrow !== EscrowType.MAD_CT) {
        throw ('escrow: expected MAD_CT, received=' + payment.escrow);
    }

    if (!isArray(payment.prevouts)) {
        throw ('prevouts: not an array');
    }

    if (payment.prevouts.length !== 1) {
        throw ('prevouts: expecting 1 prevout, not ' + payment.prevouts.length);
    }

    payment.prevouts.forEach((elem, i) => {
        try {
            FV_CRYPTO.validateBlindPrevout(elem);
        } catch (e) {
            throw ('prevouts[' + i + ']: ' + e);
        }
    });

    if (!isArray(payment.outputs) || !payment.outputs) {
        throw ('outputs: not an array');
    }

    payment.outputs.forEach((elem: ToBeBlindOutput, i) => {
        try {
            FV_CRYPTO.validateBlindOutput(elem);
        } catch (e) {
            throw ('outputs[' + i + ']: ' + e);
        }
    });

    return true;
}

/**
 * Validates release/refund/destroy objects in the protocol messages.
 * @param exit either a release, refund or destroy object.
 * @param expectEphem sometimes an ephem is not expected.
 * @param expectSignatures sometimes a signature object is not expected.
 */
function validateReleaseRefundDestroy(exit: any, expectEphem: boolean = true, expectSignatures: boolean = true): boolean {

    if (!isObject(exit)) {
        throw ('missing or not an object');
    }

    if (expectSignatures) {
        if (!isArray(exit.signatures)) {
            throw ('signatures: missing or not an array');
        }

        exit.signatures.forEach((elem, i) => {
            try {
                FV_CRYPTO.validateSignatureObject(elem);
            } catch (e) {
                throw ('signatures[' + i + ']: ' + e);
            }
        });

        if (exit.signatures.length !== 2) {
            throw ('signatures: amount of signatures does not equal 2');
        }
    }

    if (expectEphem) {
        if (!isObject(exit.ephem)) {
            throw ('ephem: missing or not an object');
        }
        if (!isPublicKey(exit.ephem.public)) {
            throw ('ephem.public: missing or not a public key');
        }
        if (!isPrivateKey(exit.ephem.private)) {
            throw ('ephem.private: missing or not a private key');
        }
    }

    if (exit.blindFactor && !isBlindFactor(exit.blindFactor)) {
        throw ('blindFactor: missing or not a private key');
    }

    return true;
}

export class FV_MPA_BID_ESCROW_MAD_CT {

    public static validate(payment: PaymentDataBidCT): boolean {

        try {
            validateBasic(payment);
        } catch (e) {
            throw ('action.buyer.payment: ' + e);
        }

        try {
            validateReleaseRefundDestroy(payment.release, true, false);
        } catch (e) {
            throw ('action.buyer.payment.release: ' + e);
        }


        return true;
    }

    constructor() {
        //
    }

}

export class FV_MPA_ACCEPT_ESCROW_MAD_CT {

    public static validate(payment: PaymentDataAcceptCT): boolean {

        try {
            validateBasic(payment);
        } catch (e) {
            throw ('action.seller.payment: ' + e);
        }

        if (!isNonNegativeNaturalNumber(payment.fee) && payment.fee > 0) {
            throw ('action.seller.payment.fee: not a non negative number or > 0');
        }

        // Validate that all fields are present in the release object.
        try {
            validateReleaseRefundDestroy(payment.release);
        } catch (e) {
            throw ('action.seller.payment.release: ' + e);
        }

        // Validate that all fields are present in the destroy object.
        try {
            validateReleaseRefundDestroy(payment.destroy, false);
        } catch (e) {
            throw ('action.seller.payment.destroy: ' + e);
        }

        return true;
    }

    constructor() {
        //
    }

}

export class FV_MPA_LOCK_ESCROW_MAD_CT {

    public static validate(payment: PaymentDataLock): boolean {

        if (!isArray(payment.signatures)) {
            throw ('action.buyer.payment.signatures: missing or not an array');
        }

        payment.signatures.forEach((elem, i) => {
            try {
                FV_CRYPTO.validateSignatureObject(elem);
            } catch (e) {
                throw ('action.buyer.payment.signatures[' + i + ']: ' + e);
            }
        });


        // payment.refund
        try {
            validateReleaseRefundDestroy(payment.refund, false);
        } catch (e) {
            throw ('action.buyer.payment.refund: ' + e);
        }

        return true;
    }

    constructor() {
        //
    }
}
