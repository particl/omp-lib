import * from 'jest';
import { FV_MPA_LISTING } from '../../src/format-validators/mpa_listing_add';
import { hash } from '../../src/hasher/hash';
import { clone } from '../../src/util';
import { MPAction } from '../../src/interfaces/omp-enums';

describe('format-validator: MPA_BID', () => {

    const validate = FV_MPA_LISTING.validate;

    const ok = JSON.parse(
        `{
            "version": "0.1.0.0",
            "action": {
                "type": "${MPAction.MPA_LISTING_ADD}",
                "hash": "${hash('hash')}",
                "item": {
                  "information": {
                    "title": "a 6 month old dog",
                    "shortDescription": "very cute",
                    "longDescription": "not for eating",
                    "category": [
                        "Animals"
                    ]
                  },
                  "payment": {
                    "type": "SALE",
                    "escrow": {
                      "type": "MAD",
                      "ratio": {
                        "buyer": 100,
                        "seller": 100
                      }
                    },
                    "options": [
                      {
                        "currency": "PART",
                        "basePrice": 10
                      }
                    ]
                  },
                  "messaging": {
                    "options": [{
                      "protocol": "TODO",
                      "publicKey": "TODO"
                    }]
                  }
                }
            }
        }`);

    beforeAll(async () => {
        //
    });

    test('should validate a listing', () => {

        let result = false;
        try {
            result = validate(ok);
        } catch (e) {
            console.log(e);
            result = true;
        }
        expect(result).toBe(true);
    });

    test('should fail to validate a listing', () => {
        const horrible_fail = JSON.parse(
            `{
            "useless": "string",
            "action": {
            }
        }`);
        let fail = false;
        try {
            fail = !validate(horrible_fail);
        } catch (e) {
            fail = true;
        }
        expect(fail).toBe(true);
    });

    test('should fail to validate a listing with negative buyer escrowratio', () => {
        const negative_buyer = clone(ok);
        negative_buyer.action.item.payment.escrow.ratio.buyer = -0.000000001;
        let error = '';
        try {
            validate(negative_buyer);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('invalid percentages'));
    });

    test('should fail to validate a listing with negative seller escrowratio', () => {
        const negative_seller = clone(ok);
        negative_seller.action.item.payment.escrow.ratio.seller = -0.000000001;
        let error = '';
        try {
            validate(negative_seller);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('invalid percentages'));
    });

    test('should fail to validate a listing with faulty overflown basePrice', () => {
        const overflow_basePrice = clone(ok);
        overflow_basePrice.action.item.payment.options = [{
            currency: 'PART',
            basePrice: 4000000000000000000000000000000000000
        }];
        let error = '';
        try {
            validate(overflow_basePrice);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('faulty basePrice (< 0, fractional or overflow)'));
    });

    test('should fail to validate a listing with faulty fractional basePrice', () => {
        const fractional_basePrice = clone(ok);
        fractional_basePrice.action.item.payment.options = [{
            currency: 'PART',
            basePrice: 10 / 3
        }];
        let error = '';
        try {
            validate(fractional_basePrice);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('faulty basePrice (< 0, fractional or overflow)'));
    });

    test('should fail to validate a listing because payment options is not an array', () => {
        const not_array_payment_options = clone(ok);
        not_array_payment_options.action.item.payment.options = {};
        let error = '';
        try {
            validate(not_array_payment_options);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('action.item.payment.options: not an array'));
    });

    test('should fail to validate a listing because missing payment options', () => {
        const missing_payment_options = clone(ok);
        missing_payment_options.action.item.payment.options = [];
        let error = '';
        try {
            validate(missing_payment_options);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('action.item.payment.options: not an array'));
    });

    test('should fail to validate a listing because negative basePrice', () => {
        const negative_basePrice = clone(ok);
        negative_basePrice.action.item.payment.options = [
            {
                currency: 'PART',
                basePrice: -40
            }];
        let error = '';
        try {
            validate(negative_basePrice);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('action.item.payment.options: faulty basePrice (< 0, fractional or overflow)'));
    });

    test('should fail to validate a listing because category is not an array', () => {
        const not_array_category = clone(ok);
        not_array_category.action.item.information.category = {};
        let error = '';
        try {
            validate(not_array_category);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('action.item.information.category: not an array'));
    });

    test('should fail to validate a listing because category is empty array', () => {
        const empty_array_category = clone(ok);
        empty_array_category.action.item.information.category = [];
        let error = '';
        try {
            validate(empty_array_category);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('not an array'));
    });

    test('should fail to validate a listing because negative domestic shipping price', () => {
        const negativeShippingPrice = clone(ok);
        negativeShippingPrice.action.item.payment.options[0].shippingPrice = {};
        negativeShippingPrice.action.item.payment.options[0].shippingPrice.domestic = -10;
        negativeShippingPrice.action.item.payment.options[0].shippingPrice.international = 10;
        let error = '';
        try {
            validate(negativeShippingPrice);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('faulty domestic shipping price (< 0, fractional or overflow)'));
    });

    test('should fail to validate a listing because negative international shipping price', () => {
        const negativeInternationalShippingPrice = clone(ok);
        negativeInternationalShippingPrice.action.item.payment.options[0].shippingPrice = {};
        negativeInternationalShippingPrice.action.item.payment.options[0].shippingPrice.domestic = 10;
        negativeInternationalShippingPrice.action.item.payment.options[0].shippingPrice.international = -10;
        let error = '';
        try {
            validate(negativeInternationalShippingPrice);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('faulty international shipping price (< 0, fractional or overflow)'));
    });


    test('should validate listing with images', () => {
        const listing_with_images = clone(ok);
        listing_with_images.action.item.information.images = [];
        listing_with_images.action.item.information.images.push({
            hash: hash('image1'),
            data: [{
                protocol: 'URL',
                dataId: 'https://somefunnygoat/.com/oy.png'
            }]
        });
        let fail = false;
        try {
            fail = !validate(listing_with_images);
        } catch (e) {
            console.log(e);
            fail = true;
        }
        expect(fail).toBe(false);
    });

    test('should validate listing with local images', () => {
        const listing_with_local_images = clone(ok);
        listing_with_local_images.action.item.information.images = [];
        listing_with_local_images.action.item.information.images.push({
            hash: hash('image1'),
            data: [{
                protocol: 'LOCAL',
                dataId: 'somename.png',
                encoding: 'BASE64',
                data: 'muchdata'
            }]
        });
        let fail = false;
        try {
            fail = !validate(listing_with_local_images);
        } catch (e) {
            console.log(e);
            fail = true;
        }
        expect(fail).toBe(false);
    });

    test('should fail to validate a listing with local images', () => {
        const listing_with_local_images_fail = clone(ok);
        listing_with_local_images_fail.action.item.information.images = [];
        listing_with_local_images_fail.action.item.information.images.push({
            hash: hash('image1'),
            data: [{
                protocol: 'LOCAL',
                dataId: 'somename.png'
            }]
        });
        let error = '';
        try {
            validate(listing_with_local_images_fail);
        } catch (e) {
            error = e.toString();
        }
        expect(error).toEqual(expect.stringContaining('encoding: not a string!'));
    });

});
