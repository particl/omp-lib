import { MPA, MPA_BID, MPM} from '../interfaces/omp';
import { Sequence } from '../sequence-verifier/verify';
import { MPAction, EscrowType } from '../interfaces/omp-enums';
import { CryptoType } from '../interfaces/crypto';

export class Tx {

    constructor() {
        //
    }

    public build(sequence: MPM[]): boolean {

        // verify sequence & format
        Sequence.validate(sequence);

        if (sequence.length < 3) {
            throw new Error('Tx: need atleast an MPA_ACCEPT to build transaction');
        }

        if (sequence[1].action.type !== MPAction.MPA_BID) {
            throw new Error('Tx: does not have an MPA_BID');
        }

        if (sequence[2].action.type !== MPAction.MPA_ACCEPT) {
            throw new Error('Tx: does not have an MPA_ACCEPT');
        }

        return true;
    }

}
