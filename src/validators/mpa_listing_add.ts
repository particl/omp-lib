import { MPA, MPA_LISTING_ADD } from "../interfaces/omp"


class ValidateMpaListingAdd {

    constructor() {
    }

    // Only after MPA base class has already validated
    validate(msg: MPA_LISTING_ADD): boolean {
      const action = msg.action;
      const item = action.item;

      if (!action.type || action.type !== 'MPA_LISTING_ADD') {
        throw new Error('action.type: wrong or missing');
      }

      // TODO check length of hash
      if (!item.hash) {
        throw new Error('action.item.hash: missing');
      }




      // Validate information
      if (item.information) {
        const information = item.information;

        // TODO check length?
        if (!information.title) {
          throw new Error('action.item.information.title: missing');
        }

        // TODO check length?
        if (!information.short_description) {
          throw new Error('action.item.information.short_description: missing');
        }

        // TODO check length?
        if (!information.long_description) {
          throw new Error('action.item.information.long_description: missing');
        }

        if (information.category) {
          if(information.category.length === 0) {
            throw new Error('action.item.information.category: no categories specified!');
          }
        } else {
          throw new Error('action.item.information.category: missing');
        }

      } else {
        throw new Error('action.item.information: missing');
      }




      // Validate Payment
      if (item.payment) {
        const payment = item.payment;

        if (payment.type) {
          // do checks inner fields
          if(['FREE', 'SALE'].indexOf(payment.type) === -1) {
            throw new Error('action.item.payment.type: unknown value');
          }
        } else {
          throw new Error('action.item.payment.type: missing');
        }

        // TODO check length?
        if (payment.cryptocurrency) {
          // do checks inner fields
        } else {
          throw new Error('action.item.payment.cryptocurrency: missing');
        }

      } else {
        throw new Error('action.item.payment: missing');
      }


      return true;
    }


}

/*
    type: 'MPA_LISTING_ADD',
    item: {
      payment: {
        type: string, // SALE | FREE
        escrow: {
          type: string,
          ratio: { // Missing from spec
            buyer: Number,
            seller: Number
          }
        },
        cryptocurrency: [
          {
            currency: string, // PARTICL | BITCOIN
            base_price: Number,
          }
        ]
      },
      messaging: [
        {
          protocol: string,
          public_key: string
        }
      ],
      //// rm !implementation
      // objects: any[]
    }
    */