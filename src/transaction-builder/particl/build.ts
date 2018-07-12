import { MPA, MPA_BID} from "../../interfaces/omp"
import { Sequence } from "../../sequence-verifier/verify";
import { MPAction, EscrowType } from "../../interfaces/omp-enums";
import { CryptoType } from "../../interfaces/crypto";


export class ParticlTx {

    constructor() {
    }

    build(sequence: MPA[]): boolean {

        // verify sequence & format
        Sequence.validate(sequence);

        if(sequence.length < 3) {
            throw new Error('Tx (PART): need atleast an MPA_ACCEPT to build transaction');
        }

        if(sequence[1].action.type !== MPAction.MPA_BID) {
            throw new Error('Tx (PART): does not have an MPA_BID');
        }

        if(sequence[2].action.type !== MPAction.MPA_ACCEPT) {
            throw new Error('Tx (PART): does not have an MPA_ACCEPT');
        }

        const escrow: EscrowType = (<MPA_BID>sequence[1]).action.buyer.payment.escrow;

        switch(escrow) {
            case EscrowType.MULTISIG:
                // do multisig escrow
                break;
            default:
                throw new Error('Tx (PART): Escrow type not implemented yet!')
        }


        return true;
    }

}
