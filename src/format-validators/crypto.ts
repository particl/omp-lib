import { Prevout, CryptoAddress, CryptoAddressType, ISignature, BlindPrevout, ToBeBlindOutput } from '../interfaces/crypto';
import { isObject, isNumber, isString, isTxid, isArray, isBlindFactor } from '../util';
import { isPublicKey, isPrivateKey } from './util';

export class FV_CRYPTO {

    public static validatePrevout(out: Prevout): boolean {

        if (!isObject(out)) {
            throw new Error('missing or not an object!');
        }

        if (!isTxid(out.txid)) {
            throw new Error('txid missing');
        }

        if (!isNumber(out.vout)) {
            throw new Error('vout is of the wrong type, expecting number');
        }

        if (out.vout < 0) {
            throw new Error('vout can not be negative');
        }

        return true;
    }

    public static validateBlindPrevout(out: BlindPrevout): boolean {
        this.validatePrevout(out);

        if (!isBlindFactor(out.blindFactor)) {
            throw new Error('blindFactor is missing or wrong type, expecting string');
        }

        return true;
    }

    public static validateBlindOutput(out: ToBeBlindOutput): boolean {

        if (!isObject(out)) {
            throw new Error('missing or not an object!');
        }

        FV_CRYPTO.validateStealthAddress(out.address, true);


        if (!isBlindFactor(out.blindFactor)) {
            throw new Error('missing blind factor');
        }

        return true;
    }

    public static validateCryptoAddress(address: CryptoAddress): boolean {
        if (!isObject(address)) {
            throw new Error('CryptoAddress: missing or not an object!');
        }

        if (!isString(address.type)) {
            throw new Error('CryptoAddress.type: missing or not a string');
        }

        if (!(address.type in CryptoAddressType)) {
            throw new Error('CryptoAddress.type: unrecognized value');
        }

        if (!isString(address.address)) {
            throw new Error('CryptoAddress.address: address is missing or wrong type, expecting string');
        }

        if (address.type === CryptoAddressType.STEALTH && address.ephem && isObject(address.ephem) && !isPublicKey(address.ephem.public)) {
            throw new Error('CryptoAddress.ephem: ephem is missing or wrong type, expecting public key');
        }
        return true;
    }

    public static validateStealthAddress(address: CryptoAddress, expectedPrivateKey: boolean = false): boolean {
        this.validateCryptoAddress(address);

        if (address.type !== CryptoAddressType.STEALTH) {
            throw new Error('CryptoAddress.type: expecting STEALTH, received=' + address.type);
        }

        if (!address.ephem || !isObject(address.ephem)) {
            throw new Error('CryptoAddress.ephem: ephem is missing or wrong type');
        }

        // TODO: this should be removeable?
        if (!isPublicKey(address.pubKey!)) {
            throw new Error('CryptoAddress: missing public key');
        }

        if (!isPublicKey(address.ephem.public)) {
            throw new Error('CryptoAddress.ephem: ephem is missing public key');
        }

        // Ephem private key is only required for shared addresses.
        if (expectedPrivateKey && (!address.ephem.private || !isPrivateKey(address.ephem.private))) {
            throw new Error('CryptoAddress.ephem: ephem is missing private key');
        }

        return true;
    }

    public static validateSignatureObject(signature: ISignature): boolean {

        if (!isObject(signature)) {
            throw new Error('Signature: missing or not an object');
        }

        if (!isString(signature.signature)) {
            throw new Error('Signature.signature: missing or not a string');
        }

        if (!isString(signature.pubKey)) {
            throw new Error('Signature.pubKey: missing or not a string');
        }

        return true;
    }


    constructor() {
        //
    }

}
