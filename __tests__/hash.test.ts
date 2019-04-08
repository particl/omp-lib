import * from 'jest';
import { hash, hashListing, deepSortObject } from '../src/hasher/hash';
import { MPA_CANCEL } from '../src/interfaces/omp';
import { clone, strip, log } from '../src/util';
import { sha256 } from 'js-sha256';
import { MPAction } from '../src/interfaces/omp-enums';

describe('Hash', () => {

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
                    "options": [
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



    beforeAll(async () => {
        // todo: do all the setup for suite tests here
    });


    test('normalize and hash', () => {

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

    test('compare hashes of two listings full vs less local images', () => {
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


    test('strip', () => {

        const dirty = {
            b: {
                outerarray: [
                    {
                        innerarray: [
                            '_rm',
                            'a',
                            'd',
                            {
                                'to test aye': 'two',
                                'alongerstring': 'one'
                            },
                            {
                                _ihateparsers: 'two',
                                aalongerstring: 'one'
                            },
                            {
                                neveragain: 'two',
                                seriously: 'one'
                            }
                        ],
                        _removemplz: [
                            'shouldn\'t be here'
                        ]
                    },
                    'blevel2',
                    'clevel2',
                    'alevel2',
                    'dlevel2'
                ],
                a: 'level1'
            },
            d: 5,
            _thiscantbehere: 0
        };

        const clean = {
            b: {
                outerarray: [
                    {
                        innerarray: [
                            'a',
                            'd',
                            {
                                'to test aye': 'two',
                                'alongerstring': 'one'
                            },
                            {
                                aalongerstring: 'one'
                            },
                            {
                                neveragain: 'two',
                                seriously: 'one'
                            }
                        ]
                    },
                    'blevel2',
                    'clevel2',
                    'alevel2',
                    'dlevel2'
                ],
                a: 'level1'
            },
            d: 5
        };

        let stripped;
        try {
            // console.log(JSON.stringify(deepSortObject(deepNestOne), null, 4));
            // console.log(JSON.stringify(deepSortObject(deepNestTwo), null, 4));

            stripped = strip(dirty);
            // console.log(JSON.stringify(stripped, null, 4));

        } catch (e) {
            console.log(e);
        }

        expect(stripped).toEqual(clean);
    });

    test('sha256hex', () => {
        const s = sha256.create();
        // bee405d40383879ca57d4eb24b9153b356c85ee6f4bc810b8bb1b67c1112c0bd
        s.update(new Buffer('76d02c17ce9999108a568fa9c192eee9580674e73a47c1e85c1bd335aa57082e', 'hex'));
        expect(s.hex()).toEqual('bee405d40383879ca57d4eb24b9153b356c85ee6f4bc810b8bb1b67c1112c0bd');
    });

    test('hash for particl-core', () => {
        const h = hash(new Buffer('76d02c17ce9999108a568fa9c192eee9580674e73a47c1e85c1bd335aa57082e', 'hex'));
        expect(h).toEqual('bee405d40383879ca57d4eb24b9153b356c85ee6f4bc810b8bb1b67c1112c0bd');
    });

});