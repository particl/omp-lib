import * as WebRequest from 'web-request';
import "reflect-metadata";
import { container, createContainer } from './container';
import { Rpc } from './abstract/rpc';
import { TYPES } from './types';
import { CryptoType } from './interfaces/crypto';
import { Container } from 'inversify/dts/container/container';

import { injectable } from 'inversify';

@injectable()
export class OpenMarketProtocol {

    // public TxLibs: Object = {};

    constructor() {
        createContainer();
    }

    /**
     * Bind an Rpc service for a given cryptocurrency.
     * @param cryptocurrency The currency for which this service works.
     * @param service Rpc service
     */
    public inject(cryptocurrency: CryptoType, service: any) {
        // Bind an _instance_ (constant value)
        // to the container.
        // and give it the name of the cryptocurrency.
        container.bind<Rpc>(TYPES.Rpc).toConstantValue(service).whenTargetNamed(cryptocurrency.toString());
    }

}