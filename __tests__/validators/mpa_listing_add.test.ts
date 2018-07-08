import { ValidateMpaListingAdd } from "../../src/format-validators/mpa_listing_add";
import { hash } from "../../src/util";

const validate = ValidateMpaListingAdd.validate;


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


const negative_buyer = JSON.parse(JSON.stringify(ok));
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

const negative_seller = JSON.parse(JSON.stringify(ok));
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



const not_array_cryptocurrency = JSON.parse(JSON.stringify(ok));
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

const missing_cryptocurrency = JSON.parse(JSON.stringify(ok));
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

const negative_basePrice = JSON.parse(JSON.stringify(ok));
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
    expect(error).toEqual(expect.stringContaining("action.item.payment.cryptocurrency: only basePrice > 0 is allowed"));
});


const not_array_category = JSON.parse(JSON.stringify(ok));
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

const empty_array_category = JSON.parse(JSON.stringify(ok));
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

const negativeShippingPrice = JSON.parse(JSON.stringify(ok));
negativeShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice = {};
test('empty shippingPrice object extended market listing', () => {
    let error: string = "";
    try {
        validate(negativeShippingPrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("not a number"));
});


negativeShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice.domestic = -10;
negativeShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice.international = 10;
test('negative domestic shipping price extended market listing', () => {
    let error: string = "";
    try {
        validate(negativeShippingPrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("negative"));
});

negativeShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice.domestic = 10;
negativeShippingPrice.action.item.payment.cryptocurrency[0].shippingPrice.international = -10;
test('negative international shipping price extended market listing', () => {
    let error: string = "";
    try {
        validate(negativeShippingPrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("negative"));
});


const listing_with_images = JSON.parse(JSON.stringify(ok));
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

const listing_with_local_images = JSON.parse(JSON.stringify(ok));
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

const listing_with_local_images_fail = JSON.parse(JSON.stringify(ok));
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