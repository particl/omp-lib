import { MPA_LISTING_ADD, MPA_ACCEPT, MPA_REJECT, MPA_CANCEL, MPA_BID, MPM } from "../interfaces/omp"
import { isObject, isArray, isString, isSHA256Hash } from "../util";
import { Format } from "../format-validators/validate";
import { MPAction } from "../interfaces/omp-enums";
import { hash } from "../hasher/hash";


export class Sequence {

    constructor() {
    }

    static validate(sequence: MPM[]): boolean {

        // validate the format first for all of them
        sequence.forEach((action: MPM) => Format.validate(action));

        let listing: MPA_LISTING_ADD;
        let listingHash: string;

        let bidHash: string;

        // 
        sequence.forEach((mpm: MPM, i) => {
            
            if(i === 0) { // must be an MPA_LISTING
                if(mpm.action.type !== MPAction.MPA_LISTING_ADD) {
                    throw new Error('Sequence: first action in the sequence must be a MPA_LISTING_ADD.')
                }
                listing = <MPA_LISTING_ADD>mpm.action;
                listingHash = hash(mpm);

            } else if(i === 1) { // must be an MPA_BID
                const cur: MPA_BID = <MPA_BID>mpm.action;
                if(cur.type !== MPAction.MPA_BID) {
                    throw new Error('Sequence: second action in the sequence must be a MPA_BID.')
                }

                if(cur.item !== listingHash) {
                    throw new Error('Sequence: second action in the sequence did not match the hash of the item. expecting=' + listingHash)
                }


                const isRightCurrency = listing.item.payment.cryptocurrency.find(elem => elem.currency === cur.buyer.payment.cryptocurrency);
                if(!isObject(isRightCurrency)) {
                    throw new Error('Sequence: currency provided by MPA_BID not accepted by the listing.')
                }
                

                const isRightEscrow = listing.item.payment.escrow.type === cur.buyer.payment.escrow;
                if(!isRightEscrow) {
                    throw new Error('Sequence: escrow provided by MPA_BID not accepted by the listing.')
                }
                

                bidHash = hash(mpm);
            } else if(i === 2) { // must be an MPA_ACCEPT, MPA_REJECT, MPA_CANCEL
                const cur: any = mpm.action;
                if([MPAction.MPA_ACCEPT, MPAction.MPA_REJECT, MPAction.MPA_CANCEL].indexOf(cur.type) === -1) {
                    throw new Error('Sequence: third action in the sequence must be a MPA_ACCEPT, MPA_REJECT, MPA_CANCEL.')
                }

                if(cur.bid !== bidHash) {
                    throw new Error('Sequence: third action in the sequence did not match the hash of the bid. expecting=' + bidHash)
                }

                if(cur.type === MPAction.MPA_ACCEPT) {
                    const isRightEscrow = listing.item.payment.escrow.type === cur.seller.payment.escrow;
                    if(!isRightEscrow) {
                        throw new Error('Sequence: escrow provided by MPA_ACCEPT not accepted by the listing.')
                    }
                }
                
            } else if(i === 3) { // must be an MPA_LOCK
                const cur: any = mpm.action;
                if([MPAction.MPA_LOCK].indexOf(cur.type) === -1) {
                    throw new Error('Sequence: fourth action in the sequence must be a MPA_ACCEPT, MPA_REJECT, MPA_CANCEL.')
                }

                const prev: any = sequence[i-1].action;
                if(prev.type !== MPAction.MPA_ACCEPT) {
                    throw new Error('Sequence: MPA_LOCK can only be after MPA_ACCEPT.')
                }

                if(cur.bid !== bidHash) {
                    throw new Error('Sequence: fourth action in the sequence did not match the hash of the bid. expecting=' + bidHash)
                }

                const isRightEscrow = listing.item.payment.escrow.type === cur.buyer.payment.escrow;
                if(!isRightEscrow) {
                    throw new Error('Sequence: escrow provided by MPA_LOCK not accepted by the listing.')
                }
                

            } else if(i === 4) { // must be an MPA_RELEASE or MPA_REFUND
                const cur: any = mpm.action;

                if([MPAction.MPA_RELEASE, MPAction.MPA_REFUND].indexOf(cur.type) === -1) {
                    throw new Error('Sequence: fifth action in the sequence must be a MPA_RELEASE or a MPA_REFUND.')
                }


                const prev: any = sequence[i-1].action;
                if(prev.type !== MPAction.MPA_LOCK) {
                    throw new Error('Sequence: MPA_RELEASE or MPA_REFUND can only be after MPA_LOCK.')
                }

                if(cur.bid !== bidHash) {
                    throw new Error('Sequence: fifth action in the sequence did not match the hash of the bid. expecting=' + bidHash)
                }
                
            }
        });
        return true;
    }

}
