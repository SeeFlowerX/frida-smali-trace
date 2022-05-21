import { GetObsoleteDexCache_func, PrettyMethod } from "./helper";
import { log } from "./logger";

export class SwitchImplContext {

    pointer: NativePointer;
    thread_ptr: NativePointer;
    accessor: CodeItemDataAccessor;
    shadow_frame: ShadowFrame;

    constructor (pointer: NativePointer){
        this.pointer = pointer;
        this.thread_ptr = this.pointer.readPointer();
        this.accessor = new CodeItemDataAccessor(this.pointer.add(Process.pointerSize).readPointer());
        this.shadow_frame = new ShadowFrame(this.pointer.add(Process.pointerSize * 2).readPointer());
    }

}


export class CodeItemDataAccessor {

    pointer: NativePointer;
    insns: NativePointer;

    constructor (pointer: NativePointer){
        this.pointer = pointer;
        this.insns = this.pointer.add(Process.pointerSize).readPointer();
    }

    Insns(): NativePointer {
        return this.insns;
    }

}

export class ShadowFrame {

    pointer: NativePointer;
    method: ArtMethod;

    constructor (pointer: NativePointer){
        this.pointer = pointer;
        this.method = new ArtMethod(this.pointer.add(Process.pointerSize).readPointer());
    }

    toString(): string{
        return this.pointer.toString();
    }

    GetDexPC(): number {
        let dex_pc_ptr_ = this.pointer.add(Process.pointerSize * 3).readPointer();
        if (!dex_pc_ptr_.equals(ptr(0x0))){
            let dex_instructions_ = this.pointer.add(Process.pointerSize * 4).readPointer();
            return Number(dex_pc_ptr_.sub(dex_instructions_).toString());
        }
        else{
            return this.pointer.add(Process.pointerSize * 6 + 4).readU32();
        }
            
    }

}

export class ArtMethod {

    pointer: NativePointer;

    constructor (pointer: NativePointer){
        this.pointer = pointer;
    }

    toString(): string {
        return this.pointer.toString();
    }

    PrettyMethod(): string | null {
        return PrettyMethod(this.pointer);
    }

    GetObsoleteDexCache(): NativePointer{
        // mirror_ptr ???
        return GetObsoleteDexCache_func(this.pointer);
        // return ptr(0x0);
    }

    GetDexFile(): NativePointer {
        let access_flags = this.pointer.add(0x4).readU32();
        // IsObsolete() => (GetAccessFlags() & kAccObsoleteMethod) != 0;
        if ((access_flags & 0x40000) != 0){
            log(`flag => ${access_flags}`);
            return this.GetObsoleteDexCache();
        }
        else{
            let declaring_class_ptr = ptr(this.pointer.readU32());
            let dex_cache_ptr = ptr(declaring_class_ptr.add(0x10).readU32());
            let dex_file_ptr = dex_cache_ptr.add(0x10).readPointer();
            return dex_file_ptr;
        }            
    }

}