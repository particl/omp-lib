import * from 'jest';
import { hash, hashListing, deepSortObject } from '../src/hasher/hash';
import { clone } from '../src/util';

const deepNestOne = {
    b: {
        outerarray: [
            {
                innerarray: [
                    'b',
                    'd',
                    'a',
                    {
                        'to test aye': 'two',
                        'alongerstring': 'one'
                    },
                    {
                        neveragain: 'two',
                        seriously: 'one'
                    },
                    {
                        ihateparsers: 'two',
                        aalongerstring: 'one'
                    }
                ]
            },
            'alevel2',
            'dlevel2',
            'blevel2',
            'clevel2'
        ],
        a: 'level1'
    },
    a: 0,
    d: 5
};

const deepNestTwo = {
    b: {
        outerarray: [
            {
                innerarray: [
                    'b',
                    'd',
                    'a',
                    {
                        'to test aye': 'two',
                        'alongerstring': 'one'
                    },
                    {
                        neveragain: 'two',
                        seriously: 'one'
                    },
                    {
                        ihateparsers: 'two',
                        aalongerstring: 'one'
                    }
                ]
            },
            'alevel2',
            'dlevel2',
            'blevel2',
            'clevel2'
        ],
        a: 'level1'
    },
    d: 5,
    a: 0
};

test('normalize and hash', () => {
    let output = 'one';
    let two = 'two';
    let three = 'three';
    try {
        // console.log(JSON.stringify(deepSortObject(deepNestOne), null, 4));
        // console.log(JSON.stringify(deepSortObject(deepNestTwo), null, 4));

        output = hash(deepNestOne);
        two = hash(deepNestTwo);
        three = hash(deepNestTwo);
        // console.log(output + " === " + two);
    } catch (e) {
        console.log(e);
    }
    expect(output).toBe(two);
    expect(output).toBe(three);
});



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

const data_image = 'fdgnihdqfgojsodhgofjsgishdfgihsdfpoghsidghipfghidshgyiyriehrtsugquregfudfugbfugd';

const ok_full_img_data = clone(ok);
ok_full_img_data.action.item.information.images = [];
ok_full_img_data.action.item.information.images.push({
    hash: hash(data_image),
    data: [
        {
            protocol: 'LOCAL',
            id: 'somename.png',
            encoding: 'BASE64',
            data: data_image
        }
    ]
});

const ok_less_img_data = clone(ok);
ok_less_img_data.action.item.information.images = [];
ok_less_img_data.action.item.information.images.push({
    hash: hash(data_image),
    data: [
        {
            protocol: 'LOCAL',
            id: 'somename.png',
            encoding: 'BASE64'
        }
    ]
});

test('compare hashes of two listings full vs less local images', () => {
    let output = 'one';
    let two = 'two';
    try {
        output = hashListing(ok_full_img_data);
        two = hashListing(ok_less_img_data);
    } catch (e) {
        console.log(e);
    }
    expect(output).toBe(two);
});
