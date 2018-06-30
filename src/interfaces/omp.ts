/**
 * All the interfaces of OMP.
 */
export interface MPA {

}

export interface MPA_LISTING extends MPA {
    label: string;
}

export interface MPA_BID extends MPA {
    buyer_outputs: string[];
    buyer_pubkey: string[];
}

export interface MPA_ACCEPT extends MPA {
    label: string;
}

export interface MPA_LOCK extends MPA {
    label: string;
}

export interface MPA_RELEASE  extends MPA{
    label: string;
}

export interface MPA_LISTING extends MPA {
    label: string;
}