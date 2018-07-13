// file inversify.config.ts
 
import { Container } from "inversify";
import { TYPES } from "../src/types";
import { Rpc } from "../src/abstract/rpc";
import { CoreRpcService } from "../test/rpc.stub";
 
let container: Container;

function createContainer(){
    container = new Container()
}

export { container, createContainer };