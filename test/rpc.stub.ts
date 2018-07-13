import { injectable, inject } from "inversify";
import "reflect-metadata";

import { Rpc } from "../src/abstract/rpc";

import * as WebRequest from 'web-request';

let RPC_REQUEST_ID = 1;

@injectable()
class CoreRpcService implements Rpc {

    constructor(
        private host: string,
        private port: number,
        private user: string,
        private password: string) {
    }


    public async call(method: string, params: any[] = []): Promise<any> {

        const id = RPC_REQUEST_ID++;
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id
        });

        const url = 'http://' + this.host + ':' + this.port;
        const options = this.getOptions();

        return await WebRequest.post(url, options, postData)
            .then( response => {

                if (response.statusCode !== 200) {
                    const message = response.content ? JSON.parse(response.content) : response.statusMessage;
                    throw new Error(response.statusCode + " " + message);
                }

                const jsonRpcResponse = JSON.parse(response.content);

                return jsonRpcResponse.result;
            })
            .catch(error => {
                console.error('ERROR: ' + JSON.stringify(error));
                throw error;
               
            });

    }

    private getOptions(): any {

        const auth = {
            user: this.user,
            pass: this.password,
            sendImmediately: false
        };

        const headers = {
            'User-Agent': 'OMP regtest',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const rpcOpts = {
            auth,
            headers
        };

        return rpcOpts;
    }
}

export const node0 = new CoreRpcService('localhost', 19792, 'rpcuser0', 'rpcpass0');
export const node1 = new CoreRpcService('localhost', 19793, 'rpcuser1', 'rpcpass1');
export const node2 = new CoreRpcService('localhost', 19794, 'rpcuser2', 'rpcpass2');

export { CoreRpcService };