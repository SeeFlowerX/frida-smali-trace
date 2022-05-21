(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetObsoleteDexCache_func = exports.DumpString_func = exports.PrettyMethod_func = exports.readStdString = exports.PrettyInstruction = exports.PrettyMethod = exports.get_DumpString = exports.get_GetObsoleteDexCache = exports.get_PrettyMethod = void 0;
const logger_1 = require("./logger");
function get_PrettyMethod() {
    // let PrettyMethod_ptr =  Module.findExportByName("libart.so", "_ZN3art9ArtMethod12PrettyMethodEPS0_b");
    let PrettyMethod_ptr = Module.findExportByName("libart.so", "_ZN3art9ArtMethod12PrettyMethodEb");
    if (PrettyMethod_ptr == null) {
        logger_1.log(`libart.so PrettyMethod_ptr is null`);
        return;
    }
    logger_1.log(`PrettyMethod_ptr => ${PrettyMethod_ptr}`);
    let PrettyMethod_func = new NativeFunction(PrettyMethod_ptr, ["pointer", "pointer", "pointer"], ["pointer", "bool"]);
    return PrettyMethod_func;
}
exports.get_PrettyMethod = get_PrettyMethod;
function get_GetObsoleteDexCache() {
    let GetObsoleteDexCache_ptr = Module.findExportByName("libart.so", "_ZN3art9ArtMethod19GetObsoleteDexCacheEv");
    if (GetObsoleteDexCache_ptr == null) {
        logger_1.log(`libart.so GetObsoleteDexCache_ptr is null`);
        return;
    }
    logger_1.log(`GetObsoleteDexCache_ptr => ${GetObsoleteDexCache_ptr}`);
    let GetObsoleteDexCache_func = new NativeFunction(GetObsoleteDexCache_ptr, "pointer", ["pointer"]);
    return GetObsoleteDexCache_func;
}
exports.get_GetObsoleteDexCache = get_GetObsoleteDexCache;
function get_DumpString() {
    let DumpString_ptr = Module.findExportByName("libdexfile.so", "_ZNK3art11Instruction10DumpStringEPKNS_7DexFileE");
    if (DumpString_ptr == null) {
        logger_1.log(`libart.so DumpString_ptr is null`);
        return;
    }
    logger_1.log(`DumpString_ptr => ${DumpString_ptr}`);
    let DumpString_func = new NativeFunction(DumpString_ptr, ["pointer", "pointer", "pointer"], ["pointer", "pointer"]);
    return DumpString_func;
}
exports.get_DumpString = get_DumpString;
function PrettyMethod(art_method_ptr) {
    let results = exports.PrettyMethod_func(art_method_ptr, 0);
    return readStdString(results);
}
exports.PrettyMethod = PrettyMethod;
function PrettyInstruction(inst_ptr, dexfile_ptr) {
    let results = exports.DumpString_func(inst_ptr, dexfile_ptr);
    return readStdString(results);
}
exports.PrettyInstruction = PrettyInstruction;
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
function readStdString(pointers) {
    let str = Memory.alloc(Process.pointerSize * 3);
    str.writePointer(pointers[0]);
    let isTiny = (str.readU8() & 1) === 0;
    if (isTiny) {
        str.add(Process.pointerSize * 1).writePointer(pointers[1]);
        str.add(Process.pointerSize * 2).writePointer(pointers[2]);
        return str.add(1).readUtf8String();
    }
    else {
        return pointers[2].readUtf8String();
    }
}
exports.readStdString = readStdString;
exports.PrettyMethod_func = get_PrettyMethod();
exports.DumpString_func = get_DumpString();
exports.GetObsoleteDexCache_func = get_GetObsoleteDexCache();
},{"./logger":3}],2:[function(require,module,exports){
(function (setImmediate){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpc_mode = void 0;
const helper_1 = require("./helper");
const util_1 = require("./util");
const logger_1 = require("./logger");
function enable_rpc_mode(flag) {
    exports.rpc_mode = flag;
}
function get_method_name(shadow_frame) {
    let method_key = shadow_frame.method.toString();
    let method_name = method_name_cache[method_key];
    if (!method_name) {
        method_name = shadow_frame.method.PrettyMethod();
        if (method_name) {
            method_name_cache[method_key] = method_name;
        }
    }
    return method_name;
}
function trace_interpreter_enrty(libart, hook_switch, hook_mterp) {
    libart.enumerateSymbols().forEach(function (symbol) {
        let name = symbol.name;
        let address = symbol.address;
        if (name.includes("ExecuteSwitchImplCpp") && hook_switch) {
            logger_1.log(`start hook ${name}`);
            let offset = symbol.address.sub(libart.base);
            Interceptor.attach(address, {
                onEnter(args) {
                    let ctx = new util_1.SwitchImplContext(args[0]);
                    let shadow_frame = ctx.shadow_frame;
                    let method_key = shadow_frame.method.toString();
                    let method_name = method_name_cache[method_key];
                    if (!method_name) {
                        method_name = shadow_frame.method.PrettyMethod();
                        if (method_name) {
                            method_name_cache[method_key] = method_name;
                        }
                    }
                    let dexfile_ptr = shadow_frame.method.GetDexFile();
                    let dex_pc = shadow_frame.GetDexPC();
                    // const Instruction* next = Instruction::At(insns + dex_pc);
                    let inst_ptr = ctx.accessor.insns.add(dex_pc);
                    let inst_str = helper_1.PrettyInstruction(inst_ptr, dexfile_ptr);
                    logger_1.log(`[switch] ${Process.getCurrentThreadId()} ${method_name} ${inst_str}`);
                }
            });
        }
        if (name.includes("ExecuteMterpImpl") && hook_mterp) {
            logger_1.log(`start hook ${name}`);
            Interceptor.attach(address, {
                onEnter(args) {
                    let inst_ptr = args[1];
                    let shadow_frame = new util_1.ShadowFrame(args[2]);
                    let method_name = get_method_name(shadow_frame);
                    let dexfile_ptr = shadow_frame.method.GetDexFile();
                    let inst_str = helper_1.PrettyInstruction(inst_ptr, dexfile_ptr);
                    logger_1.log(`[mterp] ${Process.getCurrentThreadId()} ${method_name} ${inst_str}`);
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
    });
}
function trace_interpreter_switch(libart, offset, frame_reg, inst_reg) {
    Interceptor.attach(libart.base.add(offset), {
        onEnter(args) {
            let id = switch_count;
            switch_count += 1;
            let ctx = this.context;
            let shadow_frame = new util_1.ShadowFrame(ctx[frame_reg]);
            // 通过 thread 获取到当前的 shadow_frame
            // let thread_ptr = ctx.sp.add(0x210).sub(0x168).readPointer();
            // let shadow_frame = get_shadow_frame_ptr_by_thread_ptr(thread_ptr);
            let method_name = get_method_name(shadow_frame);
            let dexfile_ptr = shadow_frame.method.GetDexFile();
            let inst_ptr = ctx[inst_reg];
            let inst_str = helper_1.PrettyInstruction(inst_ptr, dexfile_ptr);
            logger_1.log(`[${id}] [switch] ${method_name} ${inst_str}`);
        }
    });
}
function hook_mterp_op(address, offset, thread_reg, inst_reg) {
    Interceptor.attach(address, {
        onEnter(args) {
            let id = mterp_count;
            mterp_count += 1;
            let ctx = this.context;
            let thread_ptr = ctx[thread_reg];
            let shadow_frame = get_shadow_frame_ptr_by_thread_ptr(thread_ptr);
            let method_name = get_method_name(shadow_frame);
            let dexfile_ptr = shadow_frame.method.GetDexFile();
            let inst_ptr = ctx[inst_reg];
            let inst_str = helper_1.PrettyInstruction(inst_ptr, dexfile_ptr);
            logger_1.log(`[${id}] [mterp] ${Process.getCurrentThreadId()} ${method_name} ${inst_str}`);
        }
    });
}
function trace_interpreter_mterp_op(libart, thread_reg, inst_reg) {
    let op_count = 0;
    let symbols = libart.enumerateSymbols();
    for (let index = 0; index < symbols.length; index++) {
        const symbol = symbols[index];
        // 过滤不符合要求的符号
        if (!symbol.name.startsWith("mterp_op_"))
            continue;
        if (symbol.name.endsWith("_helper"))
            continue;
        if (symbol.name.endsWith("_quick"))
            continue;
        if (symbol.name.endsWith("_no_barrier"))
            continue;
        if (symbol.name.includes("unused"))
            continue;
        // nop 对应位置的指令太短 hook 会失败 跳过
        if (symbol.name == "mterp_op_nop")
            continue;
        op_count += 1;
        let hook_addr = symbol.address;
        // return 相关的指令起始就是一个BL frida hook 会失败 需要把hook点向后挪4字节
        if (symbol.name.startsWith("mterp_op_return")) {
            hook_addr = symbol.address.add(0x4);
        }
        let offset = hook_addr.sub(libart.base);
        logger_1.log(`[mterp_op] ${symbol.name} ${symbol.address} ${hook_addr} ${offset}`);
        // 正式 hook
        hook_mterp_op(hook_addr, offset, thread_reg, inst_reg);
    }
    logger_1.log(`[mterp_op] op_count ${op_count}`);
}
function get_shadow_frame_ptr_by_thread_ptr(thread_ptr) {
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
    return new util_1.ShadowFrame(cur_frame_ptr);
}
function main() {
    let libart = Process.findModuleByName("libart.so");
    if (libart == null) {
        logger_1.log(`libart is null`);
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
exports.rpc_mode = false;
let method_name_cache = {};
let switch_count = 0;
let mterp_count = 0;
setImmediate(main);
rpc.exports = {
    go: main,
    enablerpcmode: enable_rpc_mode,
};
// frida -U -n LibChecker -l _agent.js -o trace.log
// frida -U -n com.absinthe.libchecker -l _agent.js -o trace.log
// frida -U -f com.absinthe.libchecker -l _agent.js -o trace.log --no-pause
}).call(this)}).call(this,require("timers").setImmediate)

},{"./helper":1,"./logger":3,"./util":4,"timers":6}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const index_1 = require("./index");
function log(message) {
    if (index_1.rpc_mode) {
        send({ "type": "log", info: message });
    }
    else {
        console.log(message);
    }
}
exports.log = log;
},{"./index":2}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtMethod = exports.ShadowFrame = exports.CodeItemDataAccessor = exports.SwitchImplContext = void 0;
const helper_1 = require("./helper");
const logger_1 = require("./logger");
class SwitchImplContext {
    constructor(pointer) {
        this.pointer = pointer;
        this.thread_ptr = this.pointer.readPointer();
        this.accessor = new CodeItemDataAccessor(this.pointer.add(Process.pointerSize).readPointer());
        this.shadow_frame = new ShadowFrame(this.pointer.add(Process.pointerSize * 2).readPointer());
    }
}
exports.SwitchImplContext = SwitchImplContext;
class CodeItemDataAccessor {
    constructor(pointer) {
        this.pointer = pointer;
        this.insns = this.pointer.add(Process.pointerSize).readPointer();
    }
    Insns() {
        return this.insns;
    }
}
exports.CodeItemDataAccessor = CodeItemDataAccessor;
class ShadowFrame {
    constructor(pointer) {
        this.pointer = pointer;
        this.method = new ArtMethod(this.pointer.add(Process.pointerSize).readPointer());
    }
    toString() {
        return this.pointer.toString();
    }
    GetDexPC() {
        let dex_pc_ptr_ = this.pointer.add(Process.pointerSize * 3).readPointer();
        if (!dex_pc_ptr_.equals(ptr(0x0))) {
            let dex_instructions_ = this.pointer.add(Process.pointerSize * 4).readPointer();
            return Number(dex_pc_ptr_.sub(dex_instructions_).toString());
        }
        else {
            return this.pointer.add(Process.pointerSize * 6 + 4).readU32();
        }
    }
}
exports.ShadowFrame = ShadowFrame;
class ArtMethod {
    constructor(pointer) {
        this.pointer = pointer;
    }
    toString() {
        return this.pointer.toString();
    }
    PrettyMethod() {
        return helper_1.PrettyMethod(this.pointer);
    }
    GetObsoleteDexCache() {
        // mirror_ptr ???
        return helper_1.GetObsoleteDexCache_func(this.pointer);
        // return ptr(0x0);
    }
    GetDexFile() {
        let access_flags = this.pointer.add(0x4).readU32();
        // IsObsolete() => (GetAccessFlags() & kAccObsoleteMethod) != 0;
        if ((access_flags & 0x40000) != 0) {
            logger_1.log(`flag => ${access_flags}`);
            return this.GetObsoleteDexCache();
        }
        else {
            let declaring_class_ptr = ptr(this.pointer.readU32());
            let dex_cache_ptr = ptr(declaring_class_ptr.add(0x10).readU32());
            let dex_file_ptr = dex_cache_ptr.add(0x10).readPointer();
            return dex_file_ptr;
        }
    }
}
exports.ArtMethod = ArtMethod;
},{"./helper":1,"./logger":3}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":5,"timers":6}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9oZWxwZXIudHMiLCJhZ2VudC9pbmRleC50cyIsImFnZW50L2xvZ2dlci50cyIsImFnZW50L3V0aWwudHMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUNBQSxxQ0FBK0I7QUFFL0IsU0FBZ0IsZ0JBQWdCO0lBQzVCLHlHQUF5RztJQUN6RyxJQUFJLGdCQUFnQixHQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsbUNBQW1DLENBQUMsQ0FBQztJQUNsRyxJQUFJLGdCQUFnQixJQUFJLElBQUksRUFBQztRQUN6QixZQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUMxQyxPQUFPO0tBQ1Y7SUFDRCxZQUFHLENBQUMsdUJBQXVCLGdCQUFnQixFQUFFLENBQUMsQ0FBQztJQUMvQyxJQUFJLGlCQUFpQixHQUFHLElBQUksY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3JILE9BQU8saUJBQWlCLENBQUM7QUFDN0IsQ0FBQztBQVZELDRDQVVDO0FBRUQsU0FBZ0IsdUJBQXVCO0lBQ25DLElBQUksdUJBQXVCLEdBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSwwQ0FBMEMsQ0FBQyxDQUFDO0lBQ2hILElBQUksdUJBQXVCLElBQUksSUFBSSxFQUFDO1FBQ2hDLFlBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBQ2pELE9BQU87S0FDVjtJQUNELFlBQUcsQ0FBQyw4QkFBOEIsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBQzdELElBQUksd0JBQXdCLEdBQUcsSUFBSSxjQUFj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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIn0=
