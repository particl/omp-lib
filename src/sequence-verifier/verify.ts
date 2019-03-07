import {
    MPA_LISTING_ADD,
    MPA_ACCEPT,
    MPA_REJECT,
    MPA_CANCEL,
    MPA_BID,
    MPM,
    MPA,
    MPA_LOCK,
    MPA_REFUND,
    MPA_RELEASE,
    PaymentOption,
    PaymentDataBid, PaymentData, PaymentInfoEscrow
} from '../interfaces/omp';
import { isObject, isArray, isString, isSHA256Hash } from '../util';
import { Format } from '../format-validators/validate';
import { EscrowType, MPAction } from '../interfaces/omp-enums';
import { hash } from '../hasher/hash';
import { Cryptocurrency } from '../interfaces/crypto';


export class Sequence {

    public static validate(sequence: MPM[]): boolean {

        // validate the format first for all of them
        sequence.forEach((action: MPM) => Format.validate(action));

        let listing: MPA_LISTING_ADD;
        let listingHash: string;

        let bidHash: string;

        // loop through each MPM in the sequence
        sequence.forEach((mpm: MPM, index) => {
            const type: MPAction = mpm.action.type;

            Sequence.validateActionIndex(index, type);

            switch (index) {
                case 0: // must be an MPA_LISTING
                    listing = <MPA_LISTING_ADD> mpm.action;
                    listingHash = hash(mpm);
                    break;

                case 1: { // must be an MPA_BID
                    const action: MPA_BID = <MPA_BID> mpm.action;
                    const prevType: MPAction = sequence[index - 1].action.type;

                    const paymentDataBid = action.buyer.payment as PaymentDataBid;
                    const options: PaymentOption[] = listing.item.payment.options || [];
                    const paymentInfo = listing.item.payment as PaymentInfoEscrow;

                    Sequence.validatePreviousAction(prevType, MPAction.MPA_LISTING_ADD);
                    Sequence.validateHash(type, action.item, listingHash);
                    Sequence.validateCurrency(type, paymentDataBid.cryptocurrency, options);
                    Sequence.validateEscrow(type, action.buyer.payment.escrow, paymentInfo.escrow.type);
                    bidHash = hash(mpm);
                    break;
                }
                case 2: { // must be an MPA_ACCEPT, MPA_REJECT, MPA_CANCEL
                    const action = <MPA_ACCEPT | MPA_REJECT | MPA_CANCEL> mpm.action;
                    const prevType: MPAction = sequence[index - 1].action.type;

                    const paymentInfo = listing.item.payment as PaymentInfoEscrow;

                    Sequence.validatePreviousAction(prevType, MPAction.MPA_BID);
                    Sequence.validateHash(type, action.bid, bidHash);
                    if (type === MPAction.MPA_ACCEPT) {
                        Sequence.validateEscrow(type, (<MPA_ACCEPT> action).seller.payment.escrow, paymentInfo.escrow.type);
                    }

                    if (mpm.action.type !== MPAction.MPA_ACCEPT && index !== sequence.length) {
                        throw new Error('Sequence: there should not be any more messages after MPA_REJECT or MPA_CANCEL!.');
                    }

                    break;
                }
                case 3: { // must be an MPA_LOCK or MPA_RELEASE
                    const action = <MPA_LOCK | MPA_RELEASE | MPA_REFUND> mpm.action;
                    const prevType: MPAction = sequence[index - 1].action.type;

                    const paymentInfo = listing.item.payment as PaymentInfoEscrow;

                    Sequence.validatePreviousAction(prevType, MPAction.MPA_ACCEPT);
                    Sequence.validateHash(type, action.bid, bidHash);
                    if (action.type === MPAction.MPA_LOCK || action.type === MPAction.MPA_REFUND) {
                        Sequence.validateEscrow(type, action.buyer.payment.escrow, paymentInfo.escrow.type);
                    } else {
                        Sequence.validateEscrow(type, action.seller.payment.escrow, paymentInfo.escrow.type);
                    }

                    break;
                }
                case 4: { // must be an MPA_RELEASE or MPA_REFUND
                    const action = <MPA_RELEASE | MPA_REFUND> mpm.action;
                    const prevType: MPAction = sequence[index - 1].action.type;
                    Sequence.validatePreviousAction(prevType, MPAction.MPA_LOCK);
                    Sequence.validateHash(type, action.bid, bidHash);
                    break;
                }
            }
        });
        return true;
    }

    /**
     * validates that the given sequence index contains correct MPAction type
     * @param type
     * @param index
     */
    private static validateActionIndex(index: number, type: MPAction): void {
        switch (index) {
            case 0: // must be an MPA_LISTING
                if (MPAction.MPA_LISTING_ADD !== type) {
                    throw new Error('Sequence: first action in the sequence must be a MPA_LISTING_ADD.');
                }
                break;

            case 1: // must be an MPA_BID
                if (MPAction.MPA_BID !== type) {
                    throw new Error('Sequence: second action in the sequence must be a MPA_BID.');
                }
                break;

            case 2: // must be an MPA_ACCEPT, MPA_REJECT, MPA_CANCEL
                if ([MPAction.MPA_ACCEPT, MPAction.MPA_REJECT, MPAction.MPA_CANCEL].indexOf(type) === -1) {
                    throw new Error('Sequence: third action in the sequence must be a MPA_ACCEPT, MPA_REJECT, MPA_CANCEL.');
                }
                break;
            case 3: // must be an MPA_LOCK or eager release of seller!
                if ([MPAction.MPA_LOCK, MPAction.MPA_RELEASE, MPAction.MPA_REFUND].indexOf(type) === -1) {
                    throw new Error('Sequence: fourth action in the sequence must be a MPA_LOCK, MPA_RELEASE or MPA_REFUND, got=' + type);
                }
                break;
            case 4: // must be an MPA_RELEASE or MPA_REFUND  OR a MPA_LOCK in the case of an eager release
                if ([MPAction.MPA_RELEASE, MPAction.MPA_REFUND, MPAction.MPA_LOCK].indexOf(type) === -1) {
                    throw new Error('Sequence: fifth action in the sequence must be a MPA_LOCK, MPA_RELEASE or a MPA_REFUND.');
                }
                break;
            case 5: // Can potentially be a MPA_REFUND if eagerly requesting refund.
                if ([MPAction.MPA_REFUND].indexOf(type) === -1) {
                    throw new Error('Sequence: sixth action can only be an eagerly requested MPA_REFUND.');
                }
                break;
            default:
                throw new Error('Sequence: invalid amount of actions.');
        }
    }

    /**
     * validates that the given hash matches the required hash
     * @param type
     * @param givenHash
     * @param requiredHash
     */
    private static validateHash(type: MPAction, givenHash: string, requiredHash: string): void {
        if (requiredHash !== givenHash) {
            throw new Error('Sequence: hash provided by ' + type + ' did not match. expecting=' + requiredHash + ' got=' + givenHash);
        }
    }

    /**
     * validates that the listingCurrencies contain the given currency
     * @param type
     * @param bidderCurrency
     * @param listingCurrencies
     */
    private static validateCurrency(type: MPAction, bidderCurrency: Cryptocurrency, listingCurrencies: PaymentOption[]): void {
        const isRightCurrency: PaymentOption | undefined = listingCurrencies.find(elem => elem.currency === bidderCurrency);
        if (!isRightCurrency || !isObject(isRightCurrency)) {
            throw new Error('Sequence: currency provided by ' + type + ' not accepted by the listing.');
        }
    }

    /**
     * validates that the bidEscrow matches the listingEscrow
     * @param type
     * @param bidEscrow
     * @param listingEscrow
     */
    private static validateEscrow(type: MPAction, bidEscrow: EscrowType, listingEscrow: EscrowType): void {
        const isRightEscrow = bidEscrow === listingEscrow;
        if (!isRightEscrow) {
            throw new Error('Sequence: escrow provided by ' + type + ' not accepted by the listing.');
        }
    }

    /**
     * validates that the previous MPAction was correct one
     * todo: should support previousTypes: MPAction[]
     * @param currentType
     * @param previousType
     */
    private static validatePreviousAction(currentType: MPAction, previousType: MPAction): void {
        if (previousType !== currentType) {
            throw new Error('Sequence: ' + currentType + ' can only be after ' + previousType + '.');
        }
    }

    constructor() {
        //
    }

}
