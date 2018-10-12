import { MPA } from '../interfaces/omp';

/**
 * The  class for the Escrow.
 * It should contain all actions that directly represent escrow actions.
 *
 *   * build(..MPA_*):  rebuilds the transaction for a given and spits outs the rawtx.
 *   * validate(ANY): validate that a marketplace action conforms to the protocol and return the MPA.
 *   * verify(..MPA_*): verifies a _chain_ of MarketPlaceActions.
 *   * strip(MPA_*):  strip any fields that do not belong in the protocol (rule: delete all keys that start with "_").
 */
export interface General {
    build(...actions: MPA[]): string; // rawtx
    validate(action: any): MPA;
    verify(...actions: MPA[]): boolean;
    strip(action: MPA): MPA;
}
