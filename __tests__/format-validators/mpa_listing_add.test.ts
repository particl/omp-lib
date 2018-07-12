import { FV_MPA_LISTING } from "../../src/format-validators/mpa_listing_add";
import { hash } from "../../src/hasher/hash";
import { clone } from "../../src/util"

const validate = FV_MPA_LISTING.validate;


const ok = JSON.parse(
    `{
        "version": "0.1.0.0",
        "action": {
            "type": "MPA_LISTING_ADD",
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
                "cryptocurrency": [
                  {
                    "currency": "PART",
                    "basePrice": 10
                  }
                ]
              },
              "messaging": [
                {
                  "protocol": "TODO",
                  "publicKey": "TODO"
                }
              ]
            }
        }
    }`);

test('validate a basic market listing', () => {
    let fail: boolean = false;
    try {
        fail = !validate(ok)
    } catch (e) {
        console.log(e)
        fail = true;
    }
    expect(fail).toBe(false);
});

const horrible_fail = JSON.parse(
    `{
        "useless": "string",
        "action": {
            
        }
    }`);

test('validate a listing', () => {
    let fail: boolean = false;
    try {
        fail = !validate(horrible_fail)
    } catch (e) {
        fail = true;
    }
    expect(fail).toBe(true);
});


const negative_buyer = clone(ok);
negative_buyer.action.item.payment.escrow.ratio.buyer = -0.000000001;
test('negative ratio buyer basic market listing', () => {
    let error: string = "";
    try {
        validate(negative_buyer)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("invalid percentages"));
});

const negative_seller = clone(ok);
negative_seller.action.item.payment.escrow.ratio.buyer = -0.000000001;
test('negative ratio seller basic market listing', () => {
    let error: string = "";
    try {
        validate(negative_seller)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("invalid percentages"));
});

const overflow_basePrice = clone(ok);
overflow_basePrice.action.item.payment.cryptocurrency = [
    {
        currency: "PART",
        basePrice: 4000000000000000000000000000000000000
    }];
test('overflow basePrice', () => {
    let error: string = "";
    try {
        validate(overflow_basePrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("faulty basePrice (< 0, fractional or overflow)"));
});

const fractional_basePrice = clone(ok);
fractional_basePrice.action.item.payment.cryptocurrency = [
    {
        currency: "PART",
        basePrice: 10/3
    }];
test('overflow basePrice', () => {
    let error: string = "";
    try {
        validate(fractional_basePrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("faulty basePrice (< 0, fractional or overflow)"));
});

const not_array_cryptocurrency = clone(ok);
not_array_cryptocurrency.action.item.payment.cryptocurrency = {};
test('cryptocurrency is not an array basic market listing', () => {
    let error: string = "";
    try {
        validate(not_array_cryptocurrency)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("action.item.payment.cryptocurrency: not an array"));
});

const missing_cryptocurrency = clone(ok);
missing_cryptocurrency.action.item.payment.cryptocurrency = [];
test('missing cryptocurrency basic market listing', () => {
    let error: string = "";
    try {
        validate(missing_cryptocurrency)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("action.item.payment.cryptocurrency: not an array"));
});

const negative_basePrice = clone(ok);
negative_basePrice.action.item.payment.cryptocurrency = [
    {
        currency: "PART",
        basePrice: -40
    }];
test('negative basePrice cryptocurrency basic market listing', () => {
    let error: string = "";
    try {
        validate(negative_basePrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("action.item.payment.cryptocurrency: faulty basePrice (< 0, fractional or overflow)"));
});


const not_array_category = clone(ok);
not_array_category.action.item.information.category = {};
test('cryptocurrency is not an array basic market listing', () => {
    let error: string = "";
    try {
        validate(not_array_category)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("action.item.information.category: not an array"));
});

const empty_array_category = clone(ok);
empty_array_category.action.item.information.category = [];
test('cryptocurrency is empty array basic market listing', () => {
    let error: string = "";
    try {
        validate(empty_array_category)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("not an array"));
});

const negativeShippingPrice = clone(ok);
negativeShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice = {};

negativeShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice.domestic = -10;
negativeShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice.international = 10;
test('negative domestic shipping price extended market listing', () => {
    let error: string = "";
    try {
        validate(negativeShippingPrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("faulty domestic shipping price (< 0, fractional or overflow)"));
});

const negativeInternationalShippingPrice = clone(ok);
negativeInternationalShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice = {};
negativeInternationalShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice.domestic = 10;
negativeInternationalShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice.international = -10;
test('negative international shipping price extended market listing', () => {
    let error: string = "";
    try {
        validate(negativeInternationalShippingPrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("faulty international shipping price (< 0, fractional or overflow)"));
});


const listing_with_images = clone(ok);
listing_with_images.action.item.information.images = [];
listing_with_images.action.item.information.images.push({
    hash: hash("image1"),
    data: [
        {
            protocol: 'URL',
            id: 'https://somefunnygoat/.com/oy.png'
        }
    ]
});
test('listing with images', () => {
    let fail: boolean = false;
    try {
        fail = !validate(listing_with_images)
    } catch (e) {
        console.log(e)
        fail = true;
    }
    expect(fail).toBe(false);
});

const listing_with_local_images = clone(ok);
listing_with_local_images.action.item.information.images = [];
listing_with_local_images.action.item.information.images.push({
    hash: hash("image1"),
    data: [
        {
            protocol: 'LOCAL',
            id: 'somename.png',
            encoding: "BASE64",
            data: 'muchdata'
        }
    ]
});
test('listing with local images', () => {
    let fail: boolean = false;
    try {
        fail = !validate(listing_with_local_images)
    } catch (e) {
        console.log(e)
        fail = true;
    }
    expect(fail).toBe(false);
});

const listing_with_local_images_fail = clone(ok);
listing_with_local_images_fail.action.item.information.images = [];
listing_with_local_images_fail.action.item.information.images.push({
    hash: hash("image1"),
    data: [
        {
            protocol: 'LOCAL',
            id: 'somename.png',
        }
    ]
});
test('fail listing with local images', () => {
    let error: string = "";
    try {
        validate(listing_with_local_images_fail)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("encoding: not a string!"));
});