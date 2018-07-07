import { ValidateMpaListingAdd } from "../../src/validators/mpa_listing_add";

const validate = ValidateMpaListingAdd.validate;


const basic_listing_sale_mad_ok = JSON.parse(
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
        fail = !validate(basic_listing_sale_mad_ok)
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


const basic_listing_sale_mad_negative_buyer = JSON.parse(JSON.stringify(basic_listing_sale_mad_ok));
basic_listing_sale_mad_negative_buyer.action.item.payment.escrow.ratio.buyer = -0.000000001;
test('negative ratio buyer basic market listing', () => {
    let error: string = "";
    try {
        validate(basic_listing_sale_mad_negative_buyer)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("negative ratios are not allowed"));
});

const basic_listing_sale_mad_negative_seller = JSON.parse(JSON.stringify(basic_listing_sale_mad_ok));
basic_listing_sale_mad_negative_seller.action.item.payment.escrow.ratio.buyer = -0.000000001;
test('negative ratio seller basic market listing', () => {
    let error: string = "";
    try {
        validate(basic_listing_sale_mad_negative_seller)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("negative ratios are not allowed"));
});



const basic_listing_sale_mad_not_array_cryptocurrency = JSON.parse(JSON.stringify(basic_listing_sale_mad_ok));
basic_listing_sale_mad_not_array_cryptocurrency.action.item.payment.cryptocurrency = {};
test('cryptocurrency is not an array basic market listing', () => {
    let error: string = "";
    try {
        validate(basic_listing_sale_mad_not_array_cryptocurrency)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("action.item.payment.cryptocurrency: not an array"));
});

const basic_listing_sale_mad_missing_cryptocurrency = JSON.parse(JSON.stringify(basic_listing_sale_mad_ok));
basic_listing_sale_mad_missing_cryptocurrency.action.item.payment.cryptocurrency = [];
test('missing cryptocurrency basic market listing', () => {
    let error: string = "";
    try {
        validate(basic_listing_sale_mad_missing_cryptocurrency)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("action.item.payment.cryptocurrency: length of array is 0"));
});

const basic_listing_sale_mad_negative_basePrice = JSON.parse(JSON.stringify(basic_listing_sale_mad_ok));
basic_listing_sale_mad_negative_basePrice.action.item.payment.cryptocurrency = [
    {
        currency: "PART",
        basePrice: -40
    }];
test('negative basePrice cryptocurrency basic market listing', () => {
    let error: string = "";
    try {
        validate(basic_listing_sale_mad_negative_basePrice)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("action.item.payment.cryptocurrency: only basePrice > 0 is allowed"));
});


const basic_listing_sale_mad_not_array_category = JSON.parse(JSON.stringify(basic_listing_sale_mad_ok));
basic_listing_sale_mad_not_array_category.action.item.information.category = {};
test('cryptocurrency is not an array basic market listing', () => {
    let error: string = "";
    try {
        validate(basic_listing_sale_mad_not_array_category)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("action.item.information.category: not an array"));
});

const basic_listing_sale_mad_empty_array_category = JSON.parse(JSON.stringify(basic_listing_sale_mad_ok));
basic_listing_sale_mad_empty_array_category.action.item.information.category = [];
test('cryptocurrency is not an array basic market listing', () => {
    let error: string = "";
    try {
        validate(basic_listing_sale_mad_empty_array_category)
    } catch (e) {
        error = e.toString();
    }
    expect(error).toEqual(expect.stringContaining("no categories"));
});