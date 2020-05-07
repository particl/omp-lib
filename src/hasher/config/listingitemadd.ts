import { HashableCommonField, HashableItemField } from '../../interfaces/omp-enums';
import { BaseHashableConfig, HashableFieldConfig, HashableFieldValueConfig } from '../../interfaces/configs';

export class HashableListingMessageConfig extends BaseHashableConfig {

    public fields = [{
        from: 'generated',
        to: HashableCommonField.GENERATED
    }, {
// we can't use seller for the template right now as it would be the selected market identity and theres no relation to that right now
//        from: 'item.seller.address',
//        to: HashableItemField.SELLER
//   }, {
        from: 'item.information.title',
        to: HashableItemField.TITLE
    }, {
        from: 'item.information.shortDescription',
        to: HashableItemField.SHORT_DESC
    }, {
        from: 'item.information.longDescription',
        to: HashableItemField.LONG_DESC
    }, {
        from: 'item.payment.type',
        to: HashableItemField.SALE_TYPE
    }, {
        from: 'item.payment.escrow.type',
        to: HashableItemField.ESCROW_TYPE
    }, {
        from: 'item.payment.escrow.ratio.buyer',
        to: HashableItemField.ESCROW_RATIO_BUYER
    }, {
        from: 'item.payment.escrow.ratio.seller',
        to: HashableItemField.ESCROW_RATIO_SELLER
    }, {
        from: 'item.payment.options[0].currency',
        to: HashableItemField.PAYMENT_CURRENCY
    }, {
        from: 'item.payment.options[0].basePrice',
        to: HashableItemField.PAYMENT_BASE_PRICE
    }, {
        from: 'item.payment.options[0].address.type',
        to: HashableItemField.PAYMENT_ADDRESS_TYPE
    }, {
        from: 'item.payment.options[0].address.address',
        to: HashableItemField.PAYMENT_ADDRESS_ADDRESS
    }, {
        from: 'item.payment.options[0].shippingPrice.domestic',
        to: HashableItemField.PAYMENT_SHIPPING_PRICE_DOMESTIC
    }, {
        from: 'item.payment.options[0].shippingPrice.international',
        to: HashableItemField.PAYMENT_SHIPPING_PRICE_INTL
    }] as HashableFieldConfig[];

    public values: HashableFieldValueConfig[] = [];

    constructor(values?: HashableFieldValueConfig[]) {
        super(values);
    }
}
