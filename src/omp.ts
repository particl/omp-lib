import * as WebRequest from 'web-request';
import { CoreRpcService } from './rpc.stub';
import { CryptoType } from './interfaces/crypto';


export class OpenMarketProtocol {

    public static TxLibs: Object = {};

    constructor() {
    }

    public static addTxLib(currency: CryptoType, lib: any) {
        this.TxLibs[currency] = lib;
    }

}