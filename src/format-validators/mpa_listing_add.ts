import { Item, ItemInfo, MPA_LISTING_ADD, MPM, PaymentDataBid, PaymentInfoEscrow, PaymentOption, SellerData, SellerInfo } from '../interfaces/omp';
import { SaleType, MPAction, EscrowType } from '../interfaces/omp-enums';
import { isString, isObject, isArrayAndContains, isNumber, isValidPrice, isValidPercentage, isCountry, isNonNegativeNaturalNumber, isArray } from '../util';
import { FV_MPM } from './mpm';
import { FV_CRYPTO } from './crypto';
import { Cryptocurrency } from '../interfaces/crypto';
import { FV_CONTENT } from './content';
import { FV_OBJECTS } from './objects';

// TODO: DSN validation (images)
// TODO: shippingPrice
// TODO: cognitive-complexity 143, should be less than 20
// tslint:disable:cognitive-complexity

export class FV_MPA_LISTING {

    public static validate(msg: MPM): boolean {

        // validate base class
        FV_MPM.validate(msg);

        const action = <MPA_LISTING_ADD> msg.action;
        const item: Item = action.item;

        if (!isString(action.type) || action.type !== MPAction.MPA_LISTING_ADD) {
            throw new Error('action.type: wrong or missing');
        }

        if (!isObject(item)) {
            throw new Error('action.item: missing or not an object');
        }

        // Validate seller
        // note, this was changed in marketplace 0.3
        if (isObject(item.seller)) {
            // tslint:disable-next-line:no-collapsible-if

            const seller: SellerInfo = item.seller;
            if (!isString(seller.address)) {
                throw new Error('action.item.seller.address: missing or not a string');
            }
            if (!isString(seller.signature)) {
                throw new Error('action.item.seller.signature: missing or not a string');
            }
        } else {
            throw new Error('action.item.seller: missing');
        }

        // TODO: to simplify this, split the validation of separate types into separate functions
        // TODO: create and replace Error's with more exact Exceptions, like MissingParamException('param')
        // Validate information
        if (isObject(item.information)) {
            const information: ItemInfo = item.information;

            // TODO check length?
            if (!isString(information.title)) {
                throw new Error('action.item.information.title: missing');
            }

            // TODO check length?
            if (!isString(information.shortDescription)) {
                throw new Error('action.item.information.shortDescription: missing');
            }

            // TODO check length?
            if (!isString(information.longDescription)) {
                throw new Error('action.item.information.longDescription: missing');
            }


            if (!isArrayAndContains(information.category)) {
                throw new Error('action.item.information.category: not an array');
            }

            if (information.category.length === 0) {
                throw new Error('action.item.information.category: no categories specified!');
            }

            information.category.forEach((elem, i) => {
                if (!isString(elem)) {
                    throw new Error('action.item.information.categories: not a string, element=' + i);
                }
            });

            if (isObject(information.location)) {
                const location = information.location;

                if (location && location.country && !isCountry(location.country)) {
                    throw new Error('action.item.information.location.country: not a country');
                }

                if (location && location.address && !isString(location.address)) {
                    throw new Error('action.item.information.location.address: not a string');
                }

                if (location && location.gps) {
                    if (!isObject(location.gps)) {
                        throw new Error('action.item.information.location.gps: not an object');
                    }

                    if (!isNumber(location.gps.lat)) {
                        throw new Error('action.item.information.location.gps.lat: not a number');
                    }

                    if (!isNumber(location.gps.lng)) {
                        throw new Error('action.item.information.location.gps.lng: not a number');
                    }

                    if (location.gps.title && !isString(location.gps.title)) {
                        throw new Error('action.item.information.location.gps.title: not a string');
                    }

                    if (location.gps.description && !isString(location.gps.description)) {
                        throw new Error('action.item.information.location.gps.description: not a string');
                    }
                }
            }

            if (information.shippingDestinations) {
                if (!isArray(information.shippingDestinations)) {
                    throw new Error('action.item.information.shippingDestinations: not an array');
                }

                information.shippingDestinations.forEach((value, i) => {
                    if (!isString(value)) {
                        throw new Error('shippingDestinations: not a string, fault at element=' + i);
                    }
                });
            }

            if (information.images) {
                if (!isArray(information.images)) {
                    throw new Error('action.item.information.images: not an array');
                }

                // validate the content references
                information.images.forEach((elem) => {
                    FV_CONTENT.validate(elem);
                });
            }

        } else {
            throw new Error('action.item.information: missing');
        }

        // Validate Payment
        if (isObject(item.payment)) {
            const payment = item.payment as PaymentInfoEscrow;

            if (isString(payment.type)) {
                if (!(payment.type in SaleType)) {
                    throw new Error('action.item.payment.type: unknown value');
                }
            } else {
                throw new Error('action.item.payment.type: missing');
            }

            // If it's a sale,
            // it must contain some payment information.
            // TODO: FREE
            // TODO: RENT?
            // TODO: replace with the SaleType enum
            if (['SALE', 'RENT'].indexOf(payment.type) !== -1) {

                if (!payment.escrow  || !isObject(payment.escrow)) {
                    throw new Error('action.item.payment.escrow: missing');
                }

                if (!isString(payment.escrow.type)) {
                    throw new Error('action.item.payment.escrow.type: missing or not a string');
                }

                if (!(payment.escrow.type in EscrowType)) {
                    throw new Error('action.item.payment.escrow.type: unknown value');
                }

                if (payment.escrow.secondsToLock && !isNonNegativeNaturalNumber(payment.escrow.secondsToLock)) {
                    throw new Error('action.item.payment.secondsToLock: missing or not an non-negative natural number');
                }

                if (payment.escrow && !isObject(payment.escrow.ratio)) {
                    throw new Error('action.item.payment.escrow: missing or not an object');
                }

                if ((!isValidPercentage(payment.escrow.ratio.buyer))
                    || !isValidPercentage(payment.escrow.ratio.seller)) {
                    throw new Error('action.item.payment.escrow.ratio: missing or invalid percentages');
                }

                if (!isArrayAndContains(payment.options)) {
                    throw new Error('action.item.payment.options: not an array');
                }

                if (!payment.options || payment.options.length <= 0) {
                    throw new Error('action.item.payment.options: length of array is 0, missing?');
                }


                for (const paymentOption of payment.options) {

                    if (!isObject(paymentOption)) {
                        throw new Error('action.item.payment.options: not an object element');
                    }

                    if (!isString(paymentOption.currency)) {
                        throw new Error('action.item.payment.options.currency: missing or not a string, fault in element');
                    }

                    // TODO: fix for fiat as well now
                    if (!(paymentOption.currency in Cryptocurrency)) {
                        throw new Error('action.item.payment.options.currency: unknown value, fault in element');
                    }

                    if (!isValidPrice(paymentOption.basePrice)) {
                        throw new Error('action.item.payment.options: faulty basePrice (< 0, fractional or overflow), fault in element');
                    }

                    if (paymentOption.shippingPrice) {
                        if (!isObject(paymentOption.shippingPrice)) {
                            throw new Error('action.item.payment.options.shippingPrice: not an object, fault in element');
                        }

                        const s = paymentOption.shippingPrice;
                        if (!isValidPrice(s.domestic, true)) {
                            throw new Error('action.item.payment.options.shippingPrice.domestic: faulty domestic shipping price (< 0, fractional '
                                + 'or overflow), fault in element');
                        }

                        if (!isValidPrice(s.international, true)) {
                            throw new Error('action.item.payment.options.shippingPrice.international: faulty international shipping price (< 0,'
                                + ' fractional or overflow), fault in element');
                        }
                    }

                    if (paymentOption.address) {
                        FV_CRYPTO.validateCryptoAddress(paymentOption.address);
                    }
                }
            }

        } else {
            throw new Error('action.item.payment: missing');
        }

        if (item.messaging) {
            if (!isObject(item.messaging)) {
                throw new Error('action.item.messaging: not an object');
            }

            if (!isArray(item.messaging.options)) {
                throw new Error('action.item.messaging.options: not an array');
            }

            // TODO: not required for now
            // if (item.messaging.options.length === 0) {
            //    throw new Error('action.item.messaging.options: length of array is 0, missing?');
            // }

            item.messaging.options.forEach((elem, i) => {
                if (!isObject(elem)) {
                    throw new Error('action.item.messaging: not an object element=' + i);
                }

                if (!isString(elem.protocol) || !isString(elem.publicKey)) {
                    throw new Error('action.item.messaging: missing elements in element=' + i);
                }
            });
        }

        // action.item.messaging is optional for now
        // else {
        //    throw new Error('action.item.messaging: missing');
        // }

        if (item.objects) {
            FV_OBJECTS.validate(item.objects);
        }

        return true;
    }

    constructor() {
        //
    }

}
