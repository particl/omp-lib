import * as WebRequest from 'web-request';

import "reflect-metadata";
import { injectable, Container, interfaces } from 'inversify';
import { TYPES } from './types';

import { Rpc, ILibrary, CtRpc } from './abstract/rpc';
import { MPM } from './interfaces/omp';

import { BidConfiguration } from './interfaces/configs';
import { IBid } from './abstract/actions'
import { Bid } from './bid';

import { CryptoType } from './interfaces/crypto';

import { IMultiSigBuilder, IMadCTBuilder } from './abstract/transactions';
import { MultiSigBuilder } from './buyflow/multisig';
import { MadCTBuilder } from './buyflow/madct';

//import { bid as createBid } from './bid';


//@injectable()
export class OpenMarketProtocol {

    // public TxLibs: Object = {};
    private container: Container;

    constructor() {
        this.container = new Container();

        this.setup();
    }

    /**
     *  Setup the container.
     */
    private setup() {
        // This is our library factory
        // it returns the Rpc libraries that we injected below (cfr. inject() ).
        // based on a cryptocurrency: CryptoType
        this.container.bind<ILibrary>(TYPES.Library).toFactory<CtRpc | Rpc>(
            (ctx: interfaces.Context) => {
                return (cryptocurrency: CryptoType, isCt?: boolean) => {
                    let lib;
                    if(!isCt) {
                        lib = ctx.container.getNamed<Rpc>(TYPES.Rpc, cryptocurrency)
                    } else {
                        lib = ctx.container.getNamed<CtRpc>(TYPES.CtRpc, cryptocurrency)
                    }
                    return lib;
                };
            });

        this.container.bind<IBid>(TYPES.Bid).to(Bid);
        this.container.bind<IMultiSigBuilder>(TYPES.MultiSigBuilder).to(MultiSigBuilder);
        this.container.bind<IMadCTBuilder>(TYPES.MadCTBuilder).to(MadCTBuilder);
    }

    
    /**
     * Bind an Rpc service for a given cryptocurrency.
     * @param cryptocurrency The currency for which this service works.
     * @param service Rpc service
     */
    public inject(cryptocurrency: CryptoType, service: any, isCt?: boolean) {
        // Bind an _instance_ (constant value)
        // to the container.
        // and give it the name of the cryptocurrency.
        if(!isCt) {
            this.container.bind<Rpc>(TYPES.Rpc).toConstantValue(service).whenTargetNamed(cryptocurrency.toString());
        } else {
            this.container.bind<CtRpc>(TYPES.CtRpc).toConstantValue(service).whenTargetNamed(cryptocurrency.toString());
        }

    }

    public async bid(config: BidConfiguration, listing: MPM) {
        const bid = this.container.get<IBid>(TYPES.Bid);
        return bid.bid(config, listing);
    }

    public async accept(listing: MPM, bid: MPM) {
        const action = this.container.get<IBid>(TYPES.Bid);
        return action.accept(listing, bid);
    }

    public async lock(listing: MPM, bid: MPM, accept: MPM) {
        const action = this.container.get<IBid>(TYPES.Bid);
        return action.lock(listing, bid, accept);
    }

    public async complete(listing: MPM, bid: MPM, accept: MPM, lock: MPM) {
        const action = this.container.get<IBid>(TYPES.Bid);
        return action.complete(listing, bid, accept, lock);
    }

    public async release(listing: MPM, bid: MPM, accept: MPM, release?: MPM) {
        const action = this.container.get<IBid>(TYPES.Bid);
        return action.release(listing, bid, accept, release);
    }

    public async refund(listing: MPM, bid: MPM, accept: MPM, lock: MPM, refund?: MPM) {
        const action = this.container.get<IBid>(TYPES.Bid);
        return action.refund(listing, bid, accept, lock, refund);
    }

    public rpc(cryptocurrency: CryptoType) {
        return this.container.getNamed<Rpc>(TYPES.Rpc, cryptocurrency);
    }
}