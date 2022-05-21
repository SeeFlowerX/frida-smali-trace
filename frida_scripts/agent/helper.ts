import { log } from "./logger";

export function get_PrettyMethod(){
    // let PrettyMethod_ptr =  Module.findExportByName("libart.so", "_ZN3art9ArtMethod12PrettyMethodEPS0_b");
    let PrettyMethod_ptr =  Module.findExportByName("libart.so", "_ZN3art9ArtMethod12PrettyMethodEb");
    if (PrettyMethod_ptr == null){
        log(`libart.so PrettyMethod_ptr is null`);
        return;
    }
    log(`PrettyMethod_ptr => ${PrettyMethod_ptr}`);
    let PrettyMethod_func = new NativeFunction(PrettyMethod_ptr, ["pointer", "pointer", "pointer"], ["pointer", "bool"]);
    return PrettyMethod_func;
}

export function get_GetObsoleteDexCache(){
    let GetObsoleteDexCache_ptr =  Module.findExportByName("libart.so", "_ZN3art9ArtMethod19GetObsoleteDexCacheEv");
    if (GetObsoleteDexCache_ptr == null){
        log(`libart.so GetObsoleteDexCache_ptr is null`);
        return;
    }
    log(`GetObsoleteDexCache_ptr => ${GetObsoleteDexCache_ptr}`);
    let GetObsoleteDexCache_func = new NativeFunction(GetObsoleteDexCache_ptr, "pointer", ["pointer"]);
    return GetObsoleteDexCache_func;
}

export function get_DumpString(){
    let DumpString_ptr =  Module.findExportByName("libdexfile.so", "_ZNK3art11Instruction10DumpStringEPKNS_7DexFileE");
    if (DumpString_ptr == null){
        log(`libart.so DumpString_ptr is null`);
        return;
    }
    log(`DumpString_ptr => ${DumpString_ptr}`);
    let DumpString_func = new NativeFunction(DumpString_ptr, ["pointer", "pointer", "pointer"], ["pointer", "pointer"]);
    return DumpString_func;
}

export function PrettyMethod(art_method_ptr: NativePointer){
    let results: NativePointer[] = PrettyMethod_func(art_method_ptr, 0);
    return readStdString(results);
}

export function PrettyInstruction(inst_ptr: NativePointer, dexfile_ptr: NativePointer){
    let results: NativePointer[] = DumpString_func(inst_ptr, dexfile_ptr);
    return readStdString(results);
}


// export function readStdString(pointers: NativePointer[]) {
//     let str = Memory.alloc(Process.pointerSize * 3);
//     str.writePointer(pointers[0]);
//     str.add(Process.pointerSize * 1).writePointer(pointers[1]);
//     str.add(Process.pointerSize * 2).writePointer(pointers[2]);
//     let isTiny = (str.readU8() & 1) === 0;
//     if (isTiny) {
//         return str.add(1).readUtf8String();
//     }
//     return str.add(2 * Process.pointerSize).readPointer().readUtf8String();
// }

export function readStdString(pointers: NativePointer[]){
    let str = Memory.alloc(Process.pointerSize * 3);
    str.writePointer(pointers[0]);
    let isTiny = (str.readU8() & 1) === 0;
    if (isTiny) {
        str.add(Process.pointerSize * 1).writePointer(pointers[1]);
        str.add(Process.pointerSize * 2).writePointer(pointers[2]);
        return str.add(1).readUtf8String();
    }
    else{
        return pointers[2].readUtf8String();
    }
}

export let PrettyMethod_func: any = get_PrettyMethod();
export let DumpString_func: any = get_DumpString();
export let GetObsoleteDexCache_func: any = get_GetObsoleteDexCache();