import * from 'jest';
import { hash, ConfigurableHasher } from '../src/hasher/hash';
import { clone, strip } from '../src/util';
import { sha256 } from 'js-sha256';
import { HashableListingMessageConfig } from '../src/hasher/config/listingitemadd';
import { HashableValidator } from '../src/format-validators/hashable';
import { MPAction } from '../src/interfaces/omp-enums';
import { BaseHashableConfig, HashableFieldConfig, HashableFieldValueConfig } from '../src/interfaces/configs';

export class HashableImageCreateRequestConfig extends BaseHashableConfig {
    public fields = [{
        from: 'data',
        to: 'imageData'
    }] as HashableFieldConfig[];

    constructor(values?: HashableFieldValueConfig[]) {
        super(values);
    }
}

describe('Hash', () => {

        // A shrunken picture of a Japanese cat with a milk carton on his head, converted to base64 using the *NIX command `base64`
    const milkcatSmall = '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'
        + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQkB'
        + 'AAEAAAAAAAAAAAAAAEFTQ0lJAAAAICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg'
        + 'ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgAGQAAABkAAAAAgAB'
        + 'AAIABAAAAFI5OAACAAcABAAAADAxMDAAAAAABgADAQMAAQAAAAYAAAAaAQUAAQAAABAOAAAbAQUAAQAAABgOAAAoAQMAAQAAAAIA'
        + 'AAABAgQAAQAAACAOAAACAgQAAQAAAMECAAAAAAAASAAAAAEAAABIAAAAAQAAAP/Y/+AAEEpGSUYAAQEAAAEAAQAA/9sAQwBQNzxG'
        + 'PDJQRkFGWlVQX3jIgnhubnj1r7mRyP///////////////////////////////////////////////////9sAQwFVWlp4aXjrgoLr'
        + '/////////////////////////////////////////////////////////////////////////8AAEQgAHAAmAwEiAAIRAQMRAf/E'
        + 'AB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGh'
        + 'CCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqS'
        + 'k5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEB'
        + 'AQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1Lw'
        + 'FWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZ'
        + 'mqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8AiKADG7FI'
        + 'VBwA1O2nsR+VKFAx65pAWlG0YGKqzKWkPzcZqx5ikjGaiPJpsCEJk5zRUmB6UUAJSgE01acPWgBxJC8jBpuaOppO1AC5opDRQB//'
        + '2f/hDDxodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVT'
        + 'ek5UY3prYzlkJz8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0nYWRvYmU6bnM6bWV0YS8nPgo8cmRmOlJERiB4bWxuczpyZGY9J2h0dHA6'
        + 'Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMnPgoKIDxyZGY6RGVzY3JpcHRpb24geG1sbnM6ZXhpZj0naHR0'
        + 'cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8nPgogIDxleGlmOkltYWdlRGVzY3JpcHRpb24+T0xZTVBVUyBESUdJVEFMIENBTUVS'
        + 'QSAgICAgICAgIDwvZXhpZjpJbWFnZURlc2NyaXB0aW9uPgogIDxleGlmOk1ha2U+T0xZTVBVUyBJTUFHSU5HIENPUlAuICA8L2V4'
        + 'aWY6TWFrZT4KICA8ZXhpZjpNb2RlbD5GRTMxMCxYODQwLEM1MzA8L2V4aWY6TW9kZWw+CiAgPGV4aWY6T3JpZW50YXRpb24+VG9w'
        + 'LWxlZnQ8L2V4aWY6T3JpZW50YXRpb24+CiAgPGV4aWY6WFJlc29sdXRpb24+MTYwPC9leGlmOlhSZXNvbHV0aW9uPgogIDxleGlm'
        + 'OllSZXNvbHV0aW9uPjE2MDwvZXhpZjpZUmVzb2x1dGlvbj4KICA8ZXhpZjpSZXNvbHV0aW9uVW5pdD5JbmNoPC9leGlmOlJlc29s'
        + 'dXRpb25Vbml0PgogIDxleGlmOlNvZnR3YXJlPjEuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2V4aWY6U29mdHdhcmU+'
        + 'CiAgPGV4aWY6RGF0ZVRpbWU+MjAwOTowNjoxNCAxNjo0OToxOTwvZXhpZjpEYXRlVGltZT4KICA8ZXhpZjpZQ2JDclBvc2l0aW9u'
        + 'aW5nPkNvLXNpdGVkPC9leGlmOllDYkNyUG9zaXRpb25pbmc+CiAgPGV4aWY6UHJpbnRJbWFnZU1hdGNoaW5nPjU0NiBieXRlcyB1'
        + 'bmRlZmluZWQgZGF0YTwvZXhpZjpQcmludEltYWdlTWF0Y2hpbmc+CiAgPGV4aWY6Q29tcHJlc3Npb24+SlBFRyBjb21wcmVzc2lv'
        + 'bjwvZXhpZjpDb21wcmVzc2lvbj4KICA8ZXhpZjpYUmVzb2x1dGlvbj43MjwvZXhpZjpYUmVzb2x1dGlvbj4KICA8ZXhpZjpZUmVz'
        + 'b2x1dGlvbj43MjwvZXhpZjpZUmVzb2x1dGlvbj4KICA8ZXhpZjpSZXNvbHV0aW9uVW5pdD5JbmNoPC9leGlmOlJlc29sdXRpb25V'
        + 'bml0PgogIDxleGlmOkV4cG9zdXJlVGltZT4xLzYwIHNlYy48L2V4aWY6RXhwb3N1cmVUaW1lPgogIDxleGlmOkZOdW1iZXI+Zi8z'
        + 'LjM8L2V4aWY6Rk51bWJlcj4KICA8ZXhpZjpFeHBvc3VyZVByb2dyYW0+Q3JlYXRpdmUgcHJvZ3JhbW1lIChiaWFzZWQgdG93YXJk'
        + 'cyBkZXB0aCBvZiBmaWVsZCk8L2V4aWY6RXhwb3N1cmVQcm9ncmFtPgogIDxleGlmOklTT1NwZWVkUmF0aW5ncz4KICAgPHJkZjpT'
        + 'ZXE+CiAgICA8cmRmOmxpPjgwPC9yZGY6bGk+CiAgIDwvcmRmOlNlcT4KICA8L2V4aWY6SVNPU3BlZWRSYXRpbmdzPgogIDxleGlm'
        + 'OkV4aWZWZXJzaW9uPkV4aWYgVmVyc2lvbiAyLjIxPC9leGlmOkV4aWZWZXJzaW9uPgogIDxleGlmOkRhdGVUaW1lT3JpZ2luYWw+'
        + 'MjAwOTowNjoxNCAxNjo0OToxOTwvZXhpZjpEYXRlVGltZU9yaWdpbmFsPgogIDxleGlmOkRhdGVUaW1lRGlnaXRpemVkPjIwMDk6'
        + 'MDY6MTQgMTY6NDk6MTk8L2V4aWY6RGF0ZVRpbWVEaWdpdGl6ZWQ+CiAgPGV4aWY6Q29tcG9uZW50c0NvbmZpZ3VyYXRpb24+CiAg'
        + 'IDxyZGY6U2VxPgogICAgPHJkZjpsaT5ZIENiIENyIC08L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvZXhpZjpDb21wb25lbnRz'
        + 'Q29uZmlndXJhdGlvbj4KICA8ZXhpZjpFeHBvc3VyZUJpYXNWYWx1ZT4wLjAwIEVWPC9leGlmOkV4cG9zdXJlQmlhc1ZhbHVlPgog'
        + 'IDxleGlmOk1heEFwZXJ0dXJlVmFsdWU+Mi45NyBFViAoZi8yLjgpPC9leGlmOk1heEFwZXJ0dXJlVmFsdWU+CiAgPGV4aWY6TWV0'
        + 'ZXJpbmdNb2RlPkNlbnRyZS13ZWlnaHRlZCBhdmVyYWdlPC9leGlmOk1ldGVyaW5nTW9kZT4KICA8ZXhpZjpMaWdodFNvdXJjZT5V'
        + 'bmtub3duPC9leGlmOkxpZ2h0U291cmNlPgogIDxleGlmOkZsYXNoIHJkZjpwYXJzZVR5cGU9J1Jlc291cmNlJz4KICA8L2V4aWY6'
        + 'Rmxhc2g+CiAgPGV4aWY6Rm9jYWxMZW5ndGg+Ni4yIG1tPC9leGlmOkZvY2FsTGVuZ3RoPgogIDxleGlmOk1ha2VyTm90ZT4yMDc2'
        + 'IGJ5dGVzIHVuZGVmaW5lZCBkYXRhPC9leGlmOk1ha2VyTm90ZT4KICA8ZXhpZjpVc2VyQ29tbWVudD4gICAgICAgICAgICAgICAg'
        + 'ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg'
        + 'ICAgICAgICAgICAgICAgICAgICAgICAgICA8L2V4aWY6VXNlckNvbW1lbnQ+CiAgPGV4aWY6Rmxhc2hQaXhWZXJzaW9uPkZsYXNo'
        + 'UGl4IFZlcnNpb24gMS4wPC9leGlmOkZsYXNoUGl4VmVyc2lvbj4KICA8ZXhpZjpDb2xvclNwYWNlPnNSR0I8L2V4aWY6Q29sb3JT'
        + 'cGFjZT4KICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+MTI4MDwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgPGV4aWY6UGl4ZWxZRGlt'
        + 'ZW5zaW9uPjk2MDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgPGV4aWY6RmlsZVNvdXJjZT5EU0M8L2V4aWY6RmlsZVNvdXJjZT4K'
        + 'ICA8ZXhpZjpDdXN0b21SZW5kZXJlZD5Ob3JtYWwgcHJvY2VzczwvZXhpZjpDdXN0b21SZW5kZXJlZD4KICA8ZXhpZjpFeHBvc3Vy'
        + 'ZU1vZGU+QXV0byBleHBvc3VyZTwvZXhpZjpFeHBvc3VyZU1vZGU+CiAgPGV4aWY6V2hpdGVCYWxhbmNlPkF1dG8gd2hpdGUgYmFs'
        + 'YW5jZTwvZXhpZjpXaGl0ZUJhbGFuY2U+CiAgPGV4aWY6RGlnaXRhbFpvb21SYXRpbz4xLjAwPC9leGlmOkRpZ2l0YWxab29tUmF0'
        + 'aW8+CiAgPGV4aWY6U2NlbmVDYXB0dXJlVHlwZT5TdGFuZGFyZDwvZXhpZjpTY2VuZUNhcHR1cmVUeXBlPgogIDxleGlmOkdhaW5D'
        + 'b250cm9sPkxvdyBnYWluIHVwPC9leGlmOkdhaW5Db250cm9sPgogIDxleGlmOkNvbnRyYXN0Pk5vcm1hbDwvZXhpZjpDb250cmFz'
        + 'dD4KICA8ZXhpZjpTYXR1cmF0aW9uPk5vcm1hbDwvZXhpZjpTYXR1cmF0aW9uPgogIDxleGlmOlNoYXJwbmVzcz5Ob3JtYWw8L2V4'
        + 'aWY6U2hhcnBuZXNzPgogIDxleGlmOkludGVyb3BlcmFiaWxpdHlJbmRleD5SOTg8L2V4aWY6SW50ZXJvcGVyYWJpbGl0eUluZGV4'
        + 'PgogIDxleGlmOkludGVyb3BlcmFiaWxpdHlWZXJzaW9uPjAxMDA8L2V4aWY6SW50ZXJvcGVyYWJpbGl0eVZlcnNpb24+CiA8L3Jk'
        + 'ZjpEZXNjcmlwdGlvbj4KCjwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjw/eHBhY2tldCBlbmQ9J3InPz4K/9sAQwBQNzxGPDJQRkFG'
        + 'WlVQX3jIgnhubnj1r7mRyP///////////////////////////////////////////////////9sAQwFVWlp4aXjrgoLr////////'
        + '/////////////////////////////////////////////////////////////////8IAEQgAJgAyAwEhAAIRAQMRAf/EABcAAQEB'
        + 'AQAAAAAAAAAAAAAAAAABAgP/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABwi9rOOVIo3uucKAaMgILYigzSwsA'
        + '/8QAGRAAAgMBAAAAAAAAAAAAAAAAARACESBA/9oACAEBAAEFAqQCOY9X/8QAFBEBAAAAAAAAAAAAAAAAAAAAQP/aAAgBAwEBPwEn'
        + '/8QAFBEBAAAAAAAAAAAAAAAAAAAAQP/aAAgBAgEBPwEn/8QAFBABAAAAAAAAAAAAAAAAAAAAUP/aAAgBAQAGPwIP/8QAHRAAAwAC'
        + 'AgMAAAAAAAAAAAAAAAERICEQMUFhgf/aAAgBAQABPyEJP6bt8XSMjL7OzszyPbJgmV5bHlXj/9oADAMBAAIAAwAAABBrjuTACMzK'
        + 'AMxA/8QAFhEBAQEAAAAAAAAAAAAAAAAAAQBA/9oACAEDAQE/EJMf/8QAFxEBAAMAAAAAAAAAAAAAAAAAAQAhQP/aAAgBAgEBPxCD'
        + 'WP8A/8QAIBABAAMAAgICAwAAAAAAAAAAAQARITFREEEggWFxof/aAAgBAQABPxAQQQrywj35ZkHOIWwbI1BXHM/ESnuDVD9zILfU'
        + '9poe5+03v+TOiFXhGGx2GlvPx9kAJRcaFJ9S5ctg8eAChlb4Nm9z/9k=';

    const ok = JSON.parse(
        `{
            "version": "0.1.0.0",
            "action": {
                "type": "${MPAction.MPA_LISTING_ADD}",
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



    let config: HashableListingMessageConfig;
    let validator: HashableValidator;

    beforeAll(async () => {
        // todo: do all the setup for suite tests here
        config = new HashableListingMessageConfig();
        validator = new HashableValidator(config);

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

    // note: images are not part of the listing hash currently
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

    test('Should fail because missing imageData', () => {
        expect.assertions(1);
        try {
            ConfigurableHasher.hash({fail: true}, new HashableImageCreateRequestConfig());
        } catch ( ex ) {
            expect(ex).toEqual(new Error('imageData: missing'));
        }
    });

    test('Should return hash for HashableImage', () => {
        const h = ConfigurableHasher.hash({
            data: milkcatSmall
        }, new HashableImageCreateRequestConfig());

        expect(h).toBe('0844d47be9d6c06de3db0835696e2d03b2fc22bef07061590c33c080c80cfae0');
    });

});
