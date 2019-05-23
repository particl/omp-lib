import 'reflect-metadata';
import { Container, interfaces } from 'inversify';
import { TYPES } from './types';
import { Rpc, ILibrary, CtRpc } from './abstract/rpc';
import { MPM } from './interfaces/omp';
import { BidConfiguration } from './interfaces/configs';
import { OMP } from './abstract/omp';
import { Processor } from './processor';
import { Cryptocurrency } from './interfaces/crypto';

// Escrow buyflows
import { IMultiSigBuilder, IMadCTBuilder } from './abstract/transactions';
import { MultiSigBuilder } from './buyflow/multisig';
import { MadCTBuilder } from './buyflow/madct';

import { strip } from './util';

import { Format } from './format-validators/validate';
import { Sequence } from './sequence-verifier/verify';
import { EscrowType } from './interfaces/omp-enums';
import { Config } from './abstract/config';

export { Cryptocurrency, BidConfiguration, EscrowType, MPM, Rpc};

export function ompVersion(): string {
    const pjson = require('pjson');
    return pjson.version;
}

// @injectable()
export class OpenMarketProtocol implements OMP {

    public static strip(msg: MPM): MPM {
        return strip(msg);
    }

    public static verify(chain: MPM[]): boolean {
        chain.forEach((msg: MPM) => {
            Format.validate(msg);
        });

        Sequence.validate(chain);

        return true;
    }

    private container: Container = new Container();

    constructor(config: Config) {
        this.setup(config);
    }


    /**
     * Bind an Rpc service for a given cryptocurrency.
     * @param cryptocurrency The currency for which this service works.
     * @param service Rpc service
     */
    public inject(cryptocurrency: Cryptocurrency, service: any): void {
        // Bind an _instance_ (constant value) to the container.
        // and give it the name of the cryptocurrency.

        if (service instanceof CtRpc) {
            this.container.bind<CtRpc>(TYPES.CtRpc).toConstantValue(service).whenTargetNamed(cryptocurrency.toString());
        } else if (service instanceof Rpc) {
            this.container.bind<Rpc>(TYPES.Rpc).toConstantValue(service).whenTargetNamed(cryptocurrency.toString());
        } else {
            throw new Error('The injected service did not comply to the abstracted Rpc class for which it was specified!');
        }
    }

    public async bid(config: BidConfiguration, listing: MPM): Promise<MPM> {
        Format.validate(listing);

        const actionProcessor = this.container.get<OMP>(TYPES.Processor);
        return await actionProcessor.bid(config, listing);
    }

    public async accept(listing: MPM, bid: MPM): Promise<MPM> {
        Format.validate(listing);
        Format.validate(bid);

        const cloned_listing = strip(listing);
        const cloned_bid = strip(bid);

        Sequence.validate([cloned_listing, cloned_bid]);

        const actionProcessor = this.container.get<OMP>(TYPES.Processor);
        return await actionProcessor.accept(cloned_listing, cloned_bid);
    }

    public async lock(listing: MPM, bid: MPM, accept: MPM): Promise<MPM> {
        Format.validate(listing);
        Format.validate(bid);
        Format.validate(accept);

        const cloned_listing = strip(listing);
        const cloned_bid = strip(bid);
        const cloned_accept = strip(accept);

        Sequence.validate([cloned_listing, cloned_bid, cloned_accept]);

        const actionProcessor = this.container.get<OMP>(TYPES.Processor);
        return await actionProcessor.lock(cloned_listing, cloned_bid, cloned_accept);
    }

    public async complete(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> {
        const actionProcessor = this.container.get<OMP>(TYPES.Processor);
        return actionProcessor.complete(listing, bid, accept, lock);
    }

    public async release(listing: MPM, bid: MPM, accept: MPM): Promise<string> {
        Format.validate(listing);
        Format.validate(bid);
        Format.validate(accept);

        const chain: MPM[] = [strip(listing), strip(bid), strip(accept)];

        Sequence.validate(chain);

        const actionProcessor = this.container.get<OMP>(TYPES.Processor);
        return await actionProcessor.release(chain[0], chain[1], chain[2]);
    }

    public async refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM): Promise<string> {
        // TODO: validate that there are no cancels/rejects in here!
        Format.validate(listing);
        Format.validate(bid);
        Format.validate(accept);
        Format.validate(lock);

        const chain: MPM[] = [strip(listing), strip(bid), strip(accept), strip(lock)];

        Sequence.validate(chain);

        const actionProcessor = this.container.get<OMP>(TYPES.Processor);
        return await actionProcessor.refund(chain[0], chain[1], chain[2], chain[3]);
    }


    public rpc(cryptocurrency: Cryptocurrency): Rpc {
        return this.container.getNamed<Rpc>(TYPES.Rpc, cryptocurrency);
    }

    /**
     *  Setup the container.
     */
    private setup(config: Config): void {
        // This is our library factory
        // it returns the Rpc libraries that we injected below (cfr. inject() ).
        // based on a cryptocurrency: Cryptocurrency
        this.container.bind<ILibrary>(TYPES.Library).toFactory<CtRpc | Rpc>(
            (ctx: interfaces.Context) => {
                return (cryptocurrency: Cryptocurrency, isCt: boolean = false) => {
                    let lib;
                    if (!isCt) {
                        try {
                            lib = ctx.container.getNamed<Rpc>(TYPES.Rpc, cryptocurrency);
                        } catch(e) {
                            lib = ctx.container.getNamed<CtRpc>(TYPES.CtRpc, cryptocurrency);
                        }
                    } else {
                        lib = ctx.container.getNamed<CtRpc>(TYPES.CtRpc, cryptocurrency);
                    }
                    return lib;
                };
            });

        this.container.bind<OMP>(TYPES.Processor).to(Processor);
        this.container.bind<Config>(TYPES.Config).toConstantValue(config);
        this.container.bind<IMultiSigBuilder>(TYPES.MultiSigBuilder).to(MultiSigBuilder);
        this.container.bind<IMadCTBuilder>(TYPES.MadCTBuilder).to(MadCTBuilder);
    }

}

