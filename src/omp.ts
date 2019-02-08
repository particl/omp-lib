import 'reflect-metadata';
import { injectable, Container, interfaces } from 'inversify';
import { TYPES } from './types';
import { Rpc, ILibrary } from './abstract/rpc';
import { MPM } from './interfaces/omp';
import { BidConfiguration } from './interfaces/configs';
import { DirtyOMP, OMP } from './abstract/omp';
import { Bid } from './bid';
import { Cryptocurrency } from './interfaces/crypto';
import { IMultiSigBuilder } from './abstract/transactions';
import { MultiSigBuilder } from './transaction-builder/multisig';

import { strip } from './util';

import { node0, node1, node2 } from './rpc.stub';
import { FV_MPM } from './format-validators/mpm';
import { Format } from './format-validators/validate';
import { Sequence } from './sequence-verifier/verify';
import { EscrowType } from './interfaces/omp-enums';

export { node0, node1, node2, Cryptocurrency, BidConfiguration, EscrowType, MPM};

// @injectable()
export class OpenMarketProtocol implements OMP {

    // public TxLibs: Object = {};
    private container: Container;

    constructor() {
        this.container = new Container();
        this.setup();
    }

    /**
     * Bind an Rpc service for a given cryptocurrency.
     * @param cryptocurrency The currency for which this service works.
     * @param service Rpc service
     */
    public inject(cryptocurrency: Cryptocurrency, service: any): void {
        // Bind an _instance_ (constant value)
        // to the container.
        // and give it the name of the cryptocurrency.
        this.container.bind<Rpc>(TYPES.Rpc).toConstantValue(service).whenTargetNamed(cryptocurrency.toString());
    }

    public async bid(config: BidConfiguration, listing: MPM): Promise<MPM> {
        Format.validate(listing);

        const bid = this.container.get<DirtyOMP>(TYPES.Bid);
        return await bid.bid(config, listing);
    }

    public async accept(listing: MPM, bid: MPM): Promise<MPM> {
        Format.validate(listing);
        Format.validate(bid);
        Sequence.validate([listing, bid]);

        const action = this.container.get<DirtyOMP>(TYPES.Bid);
        return await action.accept(listing, bid);
    }

    public async lock(listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {
        Format.validate(listing);
        Format.validate(bid);
        Format.validate(accept);
        Sequence.validate([listing, bid, accept]);

        const action = this.container.get<DirtyOMP>(TYPES.Bid);
        return await action.lock(listing, bid, accept);
    }

    public async release(listing: MPM, bid: MPM, accept: MPM, release?: MPM): Promise<MPM> {
        Format.validate(listing);
        Format.validate(bid);
        Format.validate(accept);

        if (release) {
            Format.validate(release);
        }

        const chain = release ? [listing, bid, accept, release ] : [listing, bid, accept];
        Sequence.validate(chain);

        const action = this.container.get<DirtyOMP>(TYPES.Bid);
        return await action.release(listing, bid, accept, release);
    }

    public async refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund?: MPM): Promise<MPM> {
        Format.validate(listing);
        Format.validate(bid);
        Format.validate(accept);

        if (refund) {
            Format.validate(refund);
        }

        const chain = refund ? [listing, bid, accept, lock, refund ] : [listing, bid, accept, lock];
        Sequence.validate(chain);

        const action = this.container.get<DirtyOMP>(TYPES.Bid);
        return await action.refund(listing, bid, accept, lock, refund);
    }

    public strip(msg: MPM): MPM {
        return strip(msg);
    }

    public verify(chain: MPM[]): boolean {
        chain.forEach((msg: MPM) => {
            Format.validate(msg);
        });

        Sequence.validate(chain);

        return true;
    }

    public rpc(cryptocurrency: Cryptocurrency): Rpc {
        return this.container.getNamed<Rpc>(TYPES.Rpc, cryptocurrency);
    }

    /**
     *  Setup the container.
     */
    private setup(): void {
        // This is our library factory
        // it returns the Rpc libraries that we injected below (cfr. inject() ).
        // based on a cryptocurrency: Cryptocurrency
        this.container.bind<ILibrary>(TYPES.Library).toFactory<Rpc>(
            (ctx: interfaces.Context) => {
                return (cryptocurrency: Cryptocurrency) => {
                    const lib = ctx.container.getNamed<Rpc>(TYPES.Rpc, cryptocurrency);
                    return lib;
                };
            });

        this.container.bind<DirtyOMP>(TYPES.Bid).to(Bid);
        this.container.bind<IMultiSigBuilder>(TYPES.MultiSigBuilder).to(MultiSigBuilder);
    }
}
