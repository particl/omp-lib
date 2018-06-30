import { MPA } from "../interfaces/omp";

/**
 * The abstract class for the Escrow.
 * It should contain all actions that directly represent escrow actions.
 * 
 *   * build(..MPA_*):  rebuilds the transaction for a given and spits outs the rawtx.
 *   * validate(ANY): validate that a marketplace action conforms to the protocol and return the MPA.
 *   * verify(..MPA_*): verifies a _chain_ of MarketPlaceActions.
 *   * strip(MPA_*):  strip any fields that do not belong in the protocol (rule: delete all that start with "_").
 */
abstract class General {
    abstract build(...actions: MPA[]): string; // rawtx 
    abstract validate(action: any): MPA;
    abstract verify(...actions: MPA[]): boolean;
    abstract strip(action: MPA): MPA;
}