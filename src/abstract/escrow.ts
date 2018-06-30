import {MPA_ACCEPT, MPA_BID, MPA_LISTING, MPA_LOCK, MPA_RELEASE} from "../interfaces/omp"

/**
 * The abstract class for the Escrow.
 * It should contain all actions that directly represent escrow actions.
 * 
 *   * create(MPA_LISTING): returns MPA_BID.
 *   * accept(MPA_LISTING, MPA_BID): returns MPA_ACCEPT.
 *   * lock(MPA_LISTING, MPA_BID, MPA_ACCEPT): make this also create the release tx. returns MPA_LOCK.
 *   * release(MPA_LISTING, MPA_BID, MPA_ACCEPT, MPA_LOCK): returns MPA_RELEASE.
 */
abstract class Escrow {
    abstract create(listing: MPA_LISTING): MPA_BID; 
    abstract accept(listing: MPA_LISTING, bid: MPA_BID): MPA_ACCEPT; 
    abstract lock(listing: MPA_LISTING, bid: MPA_BID, accept: MPA_ACCEPT): MPA_LOCK; 
    abstract release(listing: MPA_LISTING, bid: MPA_BID, accept: MPA_ACCEPT, lock: MPA_LOCK): MPA_RELEASE; 
}