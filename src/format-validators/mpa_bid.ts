import { MPA_BID, MPM, ShippingAddress, PaymentDataBid, PaymentDataBidMultisig, PaymentDataBidCT } from '../interfaces/omp';
import { MPAction, EscrowType } from '../interfaces/omp-enums';
import { isObject, isString, isTimestamp, isSHA256Hash, isCountry } from '../util';
import { FV_MPM } from './mpm';
import { FV_OBJECTS } from './objects';
import { FV_MPA_BID_ESCROW_MULTISIG } from './escrow/multisig';
import { Cryptocurrency } from '../interfaces/crypto';
import { FV_MPA_BID_ESCROW_MAD_CT } from './escrow/madct';

// TODO: cognitive-complexity 22, should be less than 20
// tslint:disable:cognitive-complexity


export class FV_MPA_BID {

    public static validate(msg: MPM): boolean {
        // validate base class
        FV_MPM.validate(msg);

        const action = <MPA_BID> msg.action;

        if (!isString(action.type)) {
            throw new Error('action.type: missing');
        }

        if (action.type !== MPAction.MPA_BID) {
            throw new Error('action.type: expecting MPA_BID received=' + action.type);
        }

        if (!isTimestamp(action.generated)) {
            throw new Error('action.generated: missing or not a valid timestamp');
        }

        if (!isSHA256Hash(action.item)) {
            throw new Error('action.item: missing or not a valid hash');
        }

        if (!isObject(action.buyer)) {
            throw new Error('action.buyer: missing or not an object');
        }

        const paymentDataBid = action.buyer.payment as PaymentDataBid;

        if (isObject(paymentDataBid)) {
            if (!paymentDataBid.cryptocurrency) {
                throw new Error('action.buyer.payment.cryptocurrency: missing cryptocurrency type');
            }

            if (!(paymentDataBid.cryptocurrency in Cryptocurrency)) {
                throw new Error('action.buyer.payment.cryptocurrency: expecting cryptocurrency type, unknown value, received=' + paymentDataBid.cryptocurrency);
            }

            if (!(paymentDataBid.escrow in EscrowType)) {
                throw new Error('action.buyer.payment.escrow: expecting escrow type, unknown value, received=' + paymentDataBid.escrow);
            }

            // TODO: implement all validators
            switch (paymentDataBid.escrow) {
                case EscrowType.MULTISIG:
                    FV_MPA_BID_ESCROW_MULTISIG.validate(paymentDataBid as PaymentDataBidMultisig);
                    break;
                case EscrowType.MAD_CT:
                    FV_MPA_BID_ESCROW_MAD_CT.validate(paymentDataBid as PaymentDataBidCT);
                    break;
                case EscrowType.FE:
                    // TODO: not implemented
                case EscrowType.MAD:
                    // TODO: not implemented
                default:
                    throw new Error('action.buyer.payment.escrow: unknown validation format, unknown value, received=' + paymentDataBid.escrow);
            }

        } else {
            throw new Error('action.buyer.payment: not an object');
        }


        if (!isObject(action.buyer.shippingAddress)) {
            throw new Error('action.buyer.shippingAddress: missing or not an object');
        }

        const shipping: ShippingAddress = action.buyer.shippingAddress!;
        if (!isString(shipping.firstName)) {
            throw new Error('action.buyer.shippingAddress.firstName: missing');
        }

        if (!isString(shipping.lastName)) {
            throw new Error('action.buyer.shippingAddress.lastName: missing');
        }

        if (!isString(shipping.addressLine1)) {
            throw new Error('action.buyer.shippingAddress.addressLine1: missing');
        }
        // addressLine2 is not required!

        if (!isString(shipping.city)) {
            throw new Error('action.buyer.shippingAddress.city: missing');
        }

        if (!isString(shipping.state)) {
            throw new Error('action.buyer.shippingAddress.state: missing');
        }

        if (!isString(shipping.zipCode)) {
            throw new Error('action.buyer.shippingAddress.zipCode: missing');
        }

        // TODO: validate country against list?
        // TODO: check length?
        if (!isCountry(shipping.country)) {
            throw new Error('action.buyer.shippingAddress.country: missing or not a country');
        }

        if (action.objects) {
            FV_OBJECTS.validate(action.objects);
        }

        return true;
    }

    constructor() {
        //
    }

}
