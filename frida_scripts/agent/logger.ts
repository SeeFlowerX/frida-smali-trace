import { rpc_mode } from "./index";

export function log(message: string): void {
    if(rpc_mode){
        send({"type": "log", info: message});
    }
    else{
        console.log(message);
    }
}