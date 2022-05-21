import { PrettyInstruction } from "./helper";
import { ShadowFrame, SwitchImplContext } from "./util";

import { log } from "./logger";

function enable_rpc_mode(flag: Boolean){
    rpc_mode = flag;
}

function get_method_name(shadow_frame: ShadowFrame){
    let method_key = shadow_frame.method.toString();
    let method_name: any = method_name_cache[method_key];
    if (!method_name){
        method_name = shadow_frame.method.PrettyMethod();
        if (method_name){
            method_name_cache[method_key] = method_name;
        }
    }
    return method_name;
}

function trace_interpreter_enrty(libart: Module, hook_switch: boolean, hook_mterp: boolean){
    libart.enumerateSymbols().forEach(function(symbol: ModuleSymbolDetails){
        let name = symbol.name;
        let address = symbol.address;
        if(name.includes("ExecuteSwitchImplCpp") && hook_switch){
            log(`start hook ${name}`);
            let offset = symbol.address.sub(libart.base);
            Interceptor.attach(address, {
                onEnter(args) {
                    let ctx = new SwitchImplContext(args[0]);
                    let shadow_frame = ctx.shadow_frame;
                    let method_key = shadow_frame.method.toString();
                    let method_name: any = method_name_cache[method_key];
                    if (!method_name){
                        method_name = shadow_frame.method.PrettyMethod();
                        if (method_name){
                            method_name_cache[method_key] = method_name;
                        }
                    }
                    let dexfile_ptr = shadow_frame.method.GetDexFile();
                    let dex_pc = shadow_frame.GetDexPC();
                    // const Instruction* next = Instruction::At(insns + dex_pc);
                    let inst_ptr = ctx.accessor.insns.add(dex_pc);
                    let inst_str = PrettyInstruction(inst_ptr, dexfile_ptr);
                    log(`[switch] ${Process.getCurrentThreadId()} ${method_name} ${inst_str}`);
                }
            });
        }
        if(name.includes("ExecuteMterpImpl") && hook_mterp){
            log(`start hook ${name}`);
            Interceptor.attach(address, {
                onEnter(args) {
                    let inst_ptr = args[1];
                    let shadow_frame = new ShadowFrame(args[2]);
                    let method_name = get_method_name(shadow_frame);
                    let dexfile_ptr = shadow_frame.method.GetDexFile();
                    let inst_str = PrettyInstruction(inst_ptr, dexfile_ptr);
                    log(`[mterp] ${Process.getCurrentThreadId()} ${method_name} ${inst_str}`);
                    // send({
                    //     type: "Mterp",
                    //     info: {
                    //         tid: Process.getCurrentThreadId(),
                    //         function_name: function_name,
                    //         inst_string: inst_string
                    //     }
                    // })
                }
            });
        }
    })
}

function trace_interpreter_switch(libart: Module, offset: number, frame_reg: string, inst_reg: string) {
    Interceptor.attach(libart.base.add(offset), {
        onEnter(args) {
            let id = switch_count;
            switch_count += 1;
            let ctx = this.context as Arm64CpuContext;
            let shadow_frame = new ShadowFrame(ctx[frame_reg as keyof typeof ctx]);
            // 通过 thread 获取到当前的 shadow_frame
            // let thread_ptr = ctx.sp.add(0x210).sub(0x168).readPointer();
            // let shadow_frame = get_shadow_frame_ptr_by_thread_ptr(thread_ptr);
            let method_name = get_method_name(shadow_frame);
            let dexfile_ptr = shadow_frame.method.GetDexFile();
            let inst_ptr = ctx[inst_reg as keyof typeof ctx];
            let inst_str = PrettyInstruction(inst_ptr, dexfile_ptr);
            log(`[${id}] [switch] ${method_name} ${inst_str}`);
        }
    });
}

function hook_mterp_op(address: NativePointer, offset: NativePointer, thread_reg: string, inst_reg: string) {
    Interceptor.attach(address, {
        onEnter(args) {
            let id = mterp_count;
            mterp_count += 1;
            let ctx = this.context as Arm64CpuContext;
            let thread_ptr = ctx[thread_reg as keyof typeof ctx];
            let shadow_frame = get_shadow_frame_ptr_by_thread_ptr(thread_ptr);
            let method_name = get_method_name(shadow_frame);
            let dexfile_ptr = shadow_frame.method.GetDexFile();
            let inst_ptr = ctx[inst_reg as keyof typeof ctx];
            let inst_str = PrettyInstruction(inst_ptr, dexfile_ptr);
            log(`[${id}] [mterp] ${Process.getCurrentThreadId()} ${method_name} ${inst_str}`);
        }
    });
}

function trace_interpreter_mterp_op(libart: Module, thread_reg: string, inst_reg: string) {
    let op_count = 0;
    let symbols = libart.enumerateSymbols();
    for (let index = 0; index < symbols.length; index++) {
        const symbol = symbols[index];
        // 过滤不符合要求的符号
        if (!symbol.name.startsWith("mterp_op_")) continue;
        if (symbol.name.endsWith("_helper")) continue;
        if (symbol.name.endsWith("_quick")) continue;
        if (symbol.name.endsWith("_no_barrier")) continue;
        if (symbol.name.includes("unused")) continue;
        // nop 对应位置的指令太短 hook 会失败 跳过
        if (symbol.name == "mterp_op_nop") continue;
        op_count += 1;
        let hook_addr = symbol.address;
        // return 相关的指令起始就是一个BL frida hook 会失败 需要把hook点向后挪4字节
        if (symbol.name.startsWith("mterp_op_return")) {
            hook_addr = symbol.address.add(0x4);
        }
        let offset = hook_addr.sub(libart.base);
        log(`[mterp_op] ${symbol.name} ${symbol.address} ${hook_addr} ${offset}`);
        // 正式 hook
        hook_mterp_op(hook_addr, offset, thread_reg, inst_reg);
    }
    log(`[mterp_op] op_count ${op_count}`);
}

function get_shadow_frame_ptr_by_thread_ptr(thread_ptr: NativePointer) : ShadowFrame {
    // 0xB8 是 managed_stack 在 Thread 中的偏移 需要结合IDA分析
    // 如何定位这个偏移
    // void art::StackVisitor::WalkStack<(art::StackVisitor::CountTransitions)0>(bool)
    // _ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb
    // 找到这个函数 然后反编译 在开头找到一个 与 0xFFFFFFFFFFFFFFFELL 相与的变量
    // 然后回溯 可以发现它时由传入参数通过偏移取指针再偏移 这个就是 managed_stack 的偏移
    // http://aospxref.com/android-11.0.0_r21/xref/art/runtime/stack.cc#835
    // let managed_stack = thread_ptr.readPointer().add(0xB8);
    let managed_stack = thread_ptr.add(0xB8);
    // 0x10 是 top_shadow_frame_ 在 ManagedStack 中的偏移 结合源码或者IDA可以分析出来
    let cur_frame_ptr = managed_stack.add(0x10).readPointer();
    return new ShadowFrame(cur_frame_ptr);
}

function main(){
    let libart = Process.findModuleByName("libart.so");
    if (libart == null) {
        log(`libart is null`);
        return;
    }

    let hook_switch = true;
    let hook_mterp = true;
    // 仅对 ExecuteSwitchImplCpp 和 ExecuteMterpImpl 调用时 hook 可以得到一些基本调用轨迹 且对APP运行影响很小
    trace_interpreter_enrty(libart, hook_switch, hook_mterp);

    // 对 ExecuteSwitchImplCpp 实际进行 opcode 判断跳转的位置进行 hook 这样可以得到一个函数内具体执行了什么
    // 通过静态分析可以知道
    // - x19 是 shadow_frame
    // - x26 是 inst
    // 调用了 trace_interpreter_switch 记得将 hook_switch 设为 false 避免重复
    // trace_interpreter_switch(libart, 0x169EB4, 'x19', 'x26');

    // 进入 ExecuteMterpImpl 后的逻辑就是
    // - 计算opcode 跳转实际处理位置 执行处理
    // - 再立刻计算下一个opcode 马上跳转实际处理位置
    // - 直到执行结束
    // 对每个 opcode 实际处理的位置进行 hook
    // 通过静态分析和实际测试可以知道
    // - x22 是 self 也就是 thread
    // - x20 是 inst
    // trace_interpreter_mterp_op(libart, "x22", "x20");

}

export let rpc_mode: Boolean = false;

let method_name_cache: {[key: string]: string} = {};
let switch_count = 0;
let mterp_count = 0;

setImmediate(main);

rpc.exports = {
    go: main,
    enablerpcmode: enable_rpc_mode,
}

// frida -U -n LibChecker -l _agent.js -o trace.log
// frida -U -n com.absinthe.libchecker -l _agent.js -o trace.log
// frida -U -f com.absinthe.libchecker -l _agent.js -o trace.log --no-pause