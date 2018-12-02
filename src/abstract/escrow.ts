import { MPA_ACCEPT, MPA_BID, MPA_LISTING_ADD, MPA_LOCK, MPA_RELEASE } from '../interfaces/omp';

/**
 * The abstract class for the Escrow.
 * It should contain all actions that directly represent escrow actions.
 *
 *   * create(MPA_LISTING_ADD): returns MPA_BID.
 *   * accept(MPA_LISTING_ADD, MPA_BID): returns MPA_ACCEPT.
 *   * lock(MPA_LISTING_ADD, MPA_BID, MPA_ACCEPT): make this also create the release tx. returns MPA_LOCK.
 *   * release(MPA_LISTING_ADD, MPA_BID, MPA_ACCEPT, MPA_LOCK): returns MPA_RELEASE.
 */
export interface Escrow {
    bid(listing: MPA_LISTING_ADD): MPA_BID;
    accept(listing: MPA_LISTING_ADD, bid: MPA_BID): MPA_ACCEPT;
    lock(listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT): MPA_LOCK;
    release(listing: MPA_LISTING_ADD, bid: MPA_BID, accept: MPA_ACCEPT, lock: MPA_LOCK): MPA_RELEASE;
}
