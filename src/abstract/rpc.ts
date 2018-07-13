/**
 * The abstract class for the Rpc class.
 */
export interface Rpc {
    call(method: string, params: any[]): Promise<any>;
    getNewPubkey(): Promise<any>;
}