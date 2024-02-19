/*
    runtime.js

    Runtime library for LuaToJS, Contains all of the lua functions written in JS

    WARNING: Minify for production

    Taken from old LuaToJS (Code (Summer 2023)) and worked on

    https://github.com/teoxoy/lua-in-js
        https://github.com/teoxoy/lua-in-js/tree/master/src/lib
*/




var RuntimeInternal = {
    Fengari: {}
};




// os.clock

RuntimeInternal.msSinceStart = performance.now();


// https://dev.to/arthurbiensur/kind-of-getting-the-memory-address-of-a-javascript-object-2mnd

// Get "unique" memory address
// Modified to not pollute the global namespace

{
    //This generator doesn't garantee uniqueness, but looks way more memoryish than a incremental counter
    //if you use this code for real, do incremental or something else unique!
    let generator = function*() {
    while (true) {
        const random = Math.random()
        .toString(16)
        .slice(2, 10);
        yield `0x${random}`;
    }
    }

    let preload = (knowObjects, refs, generate) => (reference = false) => {
    if (reference) {
        return refs;
    } else {
        return object => {
        let address;
        if (knowObjects.has(object)) {
            address = knowObjects.get(object);
        } else {
            address = generate.next().value;
            knowObjects.set(object, address);
            refs[address] = object;
        }
        return address;
        };
    }
    };

    RuntimeInternal.findRef = (preload(new Map(), {}, generator()))(false);
}


// Is true in lua?

// NOTE: In lua, 0 and '' are truthy, while in js, no

{
    RuntimeInternal.isFalse = function(o) {
        if (o === false || o === null || o === undefined) {
            return true;
        } else {
            return false;
        }
    }
    RuntimeInternal.isTrue = function(o) {
        return !RuntimeInternal.isFalse(o);
    }
}


// https://stackoverflow.com/questions/46611353/javascript-is-there-an-equivalent-of-luas-g-in-javascript

// _G
{
    RuntimeInternal.getGlobal = function () {
        // the only reliable means to get the global object is
        // `Function('return this')()`
        // However, this causes CSP violations in Chrome apps.
        if (typeof self !== 'undefined') { return self; }
        if (typeof window !== 'undefined') { return window; }
        if (typeof global !== 'undefined') { return global; }
    };
}


// metatables (only supports getting, setting, methods don't work)
{
    RuntimeInternal.metatables = {};
}


// ipairsf
{
    RuntimeInternal.ipairsf = function(t, k) {
        if (k) {
            k = k + 1;
            if (t[k] == undefined) {
                return [];
            } else {
                return [k, t[k]];
            }
        } else {
            return [1, t[1]];
        }
    }
}


// tonumber
{
    RuntimeInternal.Digits = {
        '0':true,
        '1':true,
        '2':true,
        '3':true,
        '4':true,
        '5':true,
        '6':true,
        '7':true,
        '8':true,
        '9':true
    };
}


// math.random

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
{
    RuntimeInternal.getRandom = function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
    }
}


// table.sort
{
    RuntimeInternal.defaultSortComparisonf = function(a, b) {
        return a < b;
    }
}


// table (*)
{
    RuntimeInternal.coerceToArray = function(o) {
        if (Array.isArray(o)) {
            // if (o[0] == undefined) {
            //     o[0] = null;
            // }
            return o;
        } else {
            var t = [];
            for (let k in o) {
                t[k] = o[k];
            }

            // if (o[0] == undefined) {
            //     o[0] = null;
            // }
            return t;
        }
    }
}


// print
{
    // WARNING: MAY RESULT IN DATA LOSS
    // lua (Uint8Array) to js (string)
    RuntimeInternal.stringToActualString = function(str) {
        var out = '';
        for (let i = 0; i < str.length; i++) {
            out = out + String.fromCharCode(str[i]);
        }
        return out;
    }
    // lua (Uint8Array) from js (string)
    RuntimeInternal.actualStringToString = function(str) {
        var out = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            out[i] = str[i].charCodeAt(0);
        }
        return out;
    }
    // console.log(RuntimeInternal.stringToActualString(RuntimeInternal.actualStringToString('amogus')))
    RuntimeInternal.toActualString = function(o) {
        if (o === true) {
            return 'true';
        } else if (o === false) {
            return 'false';
        } else if (o === null || o === undefined) {
            return 'nil';
        } else if (ArrayBuffer.isView(o)) {
            return RuntimeInternal.stringToActualString(o);
        } else if (typeof o === 'object') {
            return 'table: ' + RuntimeInternal.findRef(o);
        } else if (typeof o === 'function') {
            return 'function: ' + RuntimeInternal.findRef(o);
        } else {
            return String(o);
        }
    }
}









// ASTToJavaScript.js


// UnaryOperator '#'
{
    RuntimeInternal.getLength = function(o) {
        // console.log();
        if (ArrayBuffer.isView(o)) {
            return o.length;
        } else {
            let i = 1;
            while (true) {
                if (o[i] === undefined) {
                    break;
                }
                i++;
            }
            return i - 1;
        }
    }
}


// CallExpression
{
    RuntimeInternal.wrapAmbiguousCall = function(out) {
        if (Array.isArray(out)) {
            return out[0];
        } else {
            return out;
        }
    }
}


// BinaryExpression '..'
{
    RuntimeInternal.concatString = function(str1, str2) {
        // https://stackoverflow.com/a/49129872
        var out = new Uint8Array(str1.length + str2.length);
        out.set(str1);
        out.set(str2, str1.length);
        return out;
    }
}


// StringLiteral
{
    Uint8Array.prototype.toString = function() {
        return RuntimeInternal.toActualString(this);
    };
    Uint8Array.prototype.equals = function(other) {
        // Inspiration: https://gist.github.com/fflorent/e5e85e955a0ddbf8dc62
        if (Object.getPrototypeOf(this) !== Object.getPrototypeOf(other)) {
            return false;
        }
        if (this.length === undefined || this.length !== other.length) {
            return false;
        }

        for (let i = 0; i < this.length; i++) {
            if (this[i] !== other[i]) {
                return false;
            }
        }

        return true;
    }
}


// fs
{
    RuntimeInternal.oldRequire = require;
}


// RuntimeInternal_VARARG
{
    RuntimeInternal_VARARG = [];
    let t = process.argv;
    for (let i = 2; i < t.length; i++) {
        RuntimeInternal_VARARG.push(t[i]);
    }
}


// TableConstructorExpression - VarargLiteral
{
    RuntimeInternal.addVararg = function(object, args, starti) {
        for (let i2 = 0; i2 < args.length; i2++) {
            object[starti + i2] = args[i2];
        }
        return object;
    }
    // console.log(RuntimeInternal.addVararg({1: 1, 2: 2}, ['a', 'b'], 3))
}













// _G START


var _G = RuntimeInternal.getGlobal();


var _VERSION = 'Lua 5.1';


function assert(v, msg, ...args) {
    if (RuntimeInternal.isTrue(v)) {
        return [v, msg, ...args];
    } else {
        if (RuntimeInternal.isTrue(msg)) {
            error(msg);
        } else {
            error('assertion failed!');
        }
    }
}


// NONFUNCTIONAL (*)
function collectgarbage(opt, arg) {
    if (opt == undefined || opt == 'collect') {

    } else if (opt == 'stop') {

    } else if (opt == 'restart') {

    } else if (opt == 'count') {
        return [0];
    } else if (opt == 'step') {

    } else if (opt == 'setpause') {
        return [0];
    } else if (opt == 'setstepmul') {
        return [0];
    }
    return;
}


// NONFUNCTIONAL (*), TODO
function dofile(filename) {

}


// NONFUNCTIONAL (level)
function error(message, level) {
    throw Error(message);
}


// NONFUNCTIONAL (*)
function getfenv(f) {

}


// NONFUNCTIONAL (methods)
function getmetatable(o) {
    return RuntimeInternal.metatables[RuntimeInternal.findRef(o)];
}


function ipairs(t) {
    return [RuntimeInternal.ipairsf, t, 0];
}


// NONFUNCTIONAL (*)
function load(func, chunkname) {

}


// NONFUNCTIONAL (*)
function loadfile(filename) {
    
}


// NONFUNCTIONAL (*)
function loadstring(str, chunkname) {
    
}


// NONFUNCTIONAL (*)
function module(name, ...args) {
    // if (typeof package.loaded[name] === 'object') {

    // }
}


// REF, buggy
// function next(t, k) {
//     // Find refs for each key in t
//     var refMap = {};
//     var refList = [];
//     var kref;
//     for (let [k2, v] of Object.entries(t)) {
//         var ref = RuntimeInternal.findRef(k2);
//         refMap[ref] = k2;
//         refList.push(ref);
//         if (k == k2) {
//             kref = ref;
//         }
//     }
//     refList.sort();

//     if (k == undefined) {
//         if (RuntimeInternal.getLength(t) == 0) {
//             return;
//         } else {
//             var k2 = refMap[refList[0]];
//             return [k2, t[k2]];
//         }
//     } else {
//         if (kref) {
//             var index = refList.indexOf(kref);
//             var k2 = refMap[refList[index + 1]];
//             return [k2, t[k2]];
//         } else {
//             error('invalid key to \'next\'');
//             return;
//         }
//     }
// }


function next(t, kc) {
    let keys = Object.keys(t).sort();
    if (kc == null) {
        let k = keys[0];
        return [k, t[k]];
    }
    for (let i = 0; i < keys.length - 1; i++) {
        if (keys[i] == kc) {
            let k = keys[i + 1];
            return [k, t[k]];
        }
    }
    return [];
}


function pairs(t) {
    return [next, t, null];
}


function pcall(f, ...args) {
    var out;
    try {
        out = f(...args);
    }
    catch(err) {
        if (ArrayBuffer.isView(err)) {
            return false, err;
        } else {
            return false, err.name;
        }
    }

    return [true, ...out];
}


function print(...args) {
    var str = '';
    args.forEach(arg => {
        str = str + RuntimeInternal.toActualString(arg) + '\t'
    });
    str = str.substring(0, str.length - 1);
    console.log(str);
    return;
}


function rawequal(v1, v2) {
    return v1 === v2;
}


function rawget(t, k) {
    return t[k];
}


function rawset(t, k, v) {
    t[k] = v;
    return t;
}


// NONFUNCTIONAL (*)
require = function(modname) {

}


function select(index, ...args) {
    if (index == '#') {
        return [args.length - 1];
    } else {
        // var out = [];
        // for (let i = index - 1; i < args.length; i++) {
        //     out.push(args[i]);
        // }
        // return out;
        return args.slice(index - 1)
    }
}


// NONFUNCTIONAL (*)
function setfenv(f, t) {

}


function setmetatable(t, mt) {
    var oldmt = getmetatable(t);
    if (oldmt && oldmt.__metatable) {
        error('cannot change a protected metatable');
    } else {
        RuntimeInternal.metatables[RuntimeInternal.findRef(o)] = mt;
        return t;
    }
}


function tonumber(e, base) {
    if (base == undefined) {
        base = 10;
    }
    if (base == 10) {
        // can have decimal, exponent
        var i = 0;
        var lasti = 0;
        while (RuntimeInternal.Digits[e[i]]) {
            i = i + 1;
        }
        if (e[i] == '.') {
            i = i + 1;
            while (RuntimeInternal.Digits[e[i]]) {
                i = i + 1;
            }
        }
        var data = parseFloat(e.substring(lasti, i));
        if (e[i] == 'e' || e[i] == 'E') {
            i = i + 1;
            var lasti2 = i;
            if (e[i] == '-' || e[i] == '+') {
                i = i + 1;
            }
            while (RuntimeInternal.Digits[e[i]]) {
                i = i + 1;
            }
            var data2 = parseInt(e.substring(lasti2, i));
            // console.log(data, data2)
            data = data * 10 ** (data2);
        }
        i = i - 1;
        
        return data;
    } else {
        // unsigned integer
        return parseInt(e, base);
    }
}


function tostring(o) {
    if (o === true) {
        return 'true';
    } else if (o === false) {
        return 'false';
    } else if (o === null || o === undefined) {
        return 'nil';
    } else if (ArrayBuffer.isView(o)) {
        return o;
    } else if (typeof o === 'object') {
        return 'table: ' + RuntimeInternal.findRef(o);
    } else if (typeof o === 'function') {
        return 'function: ' + RuntimeInternal.findRef(o);
    } else {
        return String(o);
    }
}


// NONFUNCTIONAL (thread)
function type(o) {
    if (o === null || o === undefined) {
        return 'nil';
    } else if (typeof o == 'number') {
        return 'number';
    } else if (ArrayBuffer.isView(o)) {
        return 'string';
    } else if (o === true || o === false) {
        return 'boolean';
    } else if (typeof o === 'object') {
        return 'table';
    } else if (typeof o === 'function') {
        return 'function';
    } else {
        return 'userdata';
    }
}


function unpack(list, i, j) {
    if (i == undefined) {
        i = 1;
    }
    if (j == undefined) {
        j = RuntimeInternal.getLength(list);
    }

    var out = [];
    for (let i2 = i; i2 < j + 1; i2++) {
        out.push(list[i2]);
    }
    return out;

    // for arrays, not objects
    /*
    return list.slice(i, j + 1);
    */
}


function xpcall(f, errhandler) {
    var out;
    try {
        out = f(...args);
    }
    catch(err) {
        if (ArrayBuffer.isView(err)) {
            return [false, errhandler(err)];
        } else {
            return [false, errhandler(err.name)];
        }
    }

    return [true, ...out];
}


// NONFUNCTIONAL (*)
function newproxy() {

}


// _G END




// coroutine START


var coroutine = {};


// NONFUNCTIONAL (*)
coroutine.create = function() {

}


// NONFUNCTIONAL (*)
coroutine.resume = function() {

}


// NONFUNCTIONAL (*)
coroutine.running = function() {

}


// NONFUNCTIONAL (*)
coroutine.status = function() {

}


// NONFUNCTIONAL (*)
coroutine.wrap = function() {

}


// NONFUNCTIONAL (*)
coroutine.yield = function() {

}


// coroutine END




// debug START


var debug = {};


// NONFUNCTIONAL (*)
debug.debug = function() {

}


// NONFUNCTIONAL (*)
debug.getfenv = function() {

}


// NONFUNCTIONAL (*)
debug.gethook = function() {

}


// NONFUNCTIONAL (*)
debug.getinfo = function() {

}


// NONFUNCTIONAL (*)
debug.getlocal = function() {

}


// NONFUNCTIONAL (*)
debug.getmetatable = function() {

}


// NONFUNCTIONAL (*)
debug.getregistry = function() {

}


// NONFUNCTIONAL (*)
debug.getupvalue = function() {

}


// NONFUNCTIONAL (*)
debug.setfenv = function() {

}


// NONFUNCTIONAL (*)
debug.sethook = function() {

}


// NONFUNCTIONAL (*)
debug.setlocal = function() {

}


// NONFUNCTIONAL (*)
debug.setmetatable = function() {

}


// NONFUNCTIONAL (*)
debug.setupvalue = function() {

}


// NONFUNCTIONAL (*)
debug.traceback = function() {

}


// debug END




// io START


{
    // RuntimeInternal.asyncToSync = function(f) {
    //     return (...args) => {
    //         // Assumes last one is callback
    //         let cb = args[args.length - 1];
    //         let out = null;
    //         args[args.length - 1] = (...o) => {
    //             out = o;
    //         }
    //         while (!out) {

    //         }
    //         return out;
    //     }
    // }

    // NODE ONLY
    RuntimeInternal.fs = RuntimeInternal.oldRequire('fs');
    // RuntimeInternal.fsOpen = RuntimeInternal.asyncToSync(fs.open);
    // RuntimeInternal.fsRead = RuntimeInternal.asyncToSync(fs.read);
    // RuntimeInternal.fsWrite = RuntimeInternal.asyncToSync(fs.write);
    // RuntimeInternal.fsClose = RuntimeInternal.asyncToSync(fs.close);
    RuntimeInternal.fsOpen = RuntimeInternal.fs.openSync;
    RuntimeInternal.fsRead = RuntimeInternal.fs.readSync;
    RuntimeInternal.fsWrite = RuntimeInternal.fs.writeSync;
    RuntimeInternal.fsClose = RuntimeInternal.fs.closeSync;

    RuntimeInternal.fileIdentifier = {
        file: {},
        closedFile: {},
    }

    RuntimeInternal.toFile = function(f) {
        return {
            RuntimeInternal_fileIdentifier: RuntimeInternal.fileIdentifier.file,
            RuntimeInternal_filePosition: 0,
            RuntimeInternal_file: f,
            close: (file) => {
                file.RuntimeInternal_fileIdentifier = RuntimeInternal.fileIdentifier.closedFile;
                RuntimeInternal.fsClose(f);
            },
            flush: (file) => {
                // TODO: IMPLEMENT
            },
            lines: (file) => {
                // TODO: IMPLEMENT
                return [];
            },
            read: (file, ...args) => {
                let out = [];
    
                if (args.length == 0) {
                    args.push('*l');
                }
    
                for (let i = 0; i < args.length; i++) {
                    let arg = RuntimeInternal.toActualString(args[i]);
                    switch (arg.slice(0, 2)) {
                        case '*n':
                            break;
                        case '*a':
                            // RuntimeInternal.fsRead();
                            break;
                        case '*l':
                            break;
                        default:
                            if (typeof args[i] == 'number') {
                                let str = new Uint8Array(args[i]);
                                RuntimeInternal.fsRead(f)                                
                            }
                            break;
                    }
                }
    
                if (out.length == 0 || out.length == 1) {
                    return out[0];
                } else {
                    return out;
                }
            },
            seek: (file, whence, offset) => {
                let base;
                switch (whence) {
                    case 'set':
                        base = 0;
                        break;
                    case 'cur':
                        // base = file.
                        break;
                    case 'end':
                        // base = fs.statsy
                        break;
                    default:
                        break;
                }
            },
            setvbuf: (file) => {
                // TODO: IMPLEMENT
                return [];
            },
            write: (file, ...args) => {
                // TODO: Modes, double check if implemented
                // TODO: ERROR HANDLING
                let data = '';
                for (let i = 0; i < args.length; i++) {
                    data = data + RuntimeInternal.stringToActualString(args[i]);
                }

                // TODO: actual writing of data
            },
        };
    }
}

var io = {};


// NONFUNCTIONAL (*)
io.close = function() {

}


// NONFUNCTIONAL (*)
io.flush = function() {

}


io.input = function(file) {
    if (file == undefined) {
        // Do nothing
    } else if (ArrayBuffer.isView(file)) {
        var f = io.open(file, 'r');
        io.stdin = f;
    } else {
        io.stdin = f;
    }
    return io.stdin;
}


// NONFUNCTIONAL (*)
io.lines = function() {

}


io.open = function(filenameraw, moderaw) {
    // TODO: TRANSLATION OF mode TO flag
    let flag = RuntimeInternal.stringToActualString(moderaw);
    let filename = RuntimeInternal.stringToActualString(filenameraw);

    let [err, f] = RuntimeInternal.fsOpen(filename, flag);

    return RuntimeInternal.toFile(f);
}


io.output = function(file) {
    if (file == undefined) {
        // Do nothing
    } else if (ArrayBuffer.isView(file)) {
        var f = io.open(file, 'w');
        io.stdout = f;
    } else {
        io.stdout = f;
    }
    return io.stdout;
}


// NONFUNCTIONAL (*)
io.popen = function() {

}


io.read = function(...args) {
    let f = io.input();
    return f.read(f);
}


io.stderr = RuntimeInternal.toFile(process.stderr.fd);


io.stdin = RuntimeInternal.toFile(process.stdin.fd);


io.stdout = RuntimeInternal.toFile(process.stdout.fd);


// NONFUNCTIONAL (*)
io.tmpfile = function() {

}


io.type = function(obj) {
    if (obj.RuntimeInternal_fileIdentifier === RuntimeInternal.fileIdentifier.file) {
        return 'file';
    } else if (obj.RuntimeInternal_fileIdentifier === RuntimeInternal.fileIdentifier.closedFile) {
        return 'closed file';
    } else {
        return null;
    }
}


io.write = function(...args) {
    let f = io.output();
    return f.write(f);
}


// TEMP REPLACEMENT
io.write = function(...args) {
    // https://www.lua.org/pil/21.1.html
    var str = '';
    args.forEach(arg => {
        str = str + RuntimeInternal.toActualString(arg);
    });
    process.stdout.write(str);
    return [];
}


// io END




// math START


var math = {};


math.abs = function(x) {
    return Math.abs(x);
}


math.acos = function(x) {
    return Math.acos(x);
}


math.asin = function(x) {
    return Math.asin(x);
}


math.atan = function(x) {
    return Math.atan(x);
}


math.atan2 = function(y, x) {
    return Math.atan2(y, x);
}


math.ceil = function(x) {
    return Math.ceil(x);
}


math.cos = function(x) {
    return Math.cos(x);
}


math.cosh = function(x) {
    return Math.cosh(x);
}


math.deg = function(x) {
    return rad / (Math.PI / 180);
}


math.exp = function(x) {
    return Math.exp(x);
}


math.floor = function(x) {
    return Math.floor(x);
}


math.fmod = function(x, y) {
    return x % y;
}


math.frexp = function(arg) {
    // https://locutus.io/c/math/frexp/

    // Modified a bit
    arg = Number(arg)
    const result = [arg, 0]
    if (arg !== 0 && Number.isFinite(arg)) {
        const absArg = Math.abs(arg)
        // Math.log2 was introduced in ES2015, use it when available
        let exp = Math.max(-1023, Math.floor(Math.log2(absArg)) + 1)
        let x = absArg * Math.pow(2, -exp)
        // These while loops compensate for rounding errors that sometimes occur because of ECMAScript's Math.log2's undefined precision
        // and also works around the issue of Math.pow(2, -exp) === Infinity when exp <= -1024
        while (x < 0.5) {
            x *= 2
            exp--
        }
        while (x >= 1) {
            x *= 0.5
            exp++
        }
        if (arg < 0) {
            x = -x
        }
        result[0] = x
        result[1] = exp
    }
    return result;
}


math.huge = Number.MAX_SAFE_INTEGER;


math.ldexp = function(mantissa, exponent) {
    // https://blog.codefrau.net/2014/08/deconstructing-floats-frexp-and-ldexp.html

    var steps = Math.min(3, Math.ceil(Math.abs(exponent) / 1023));
    var result = mantissa;
    for (var i = 0; i < steps; i++)
        result *= Math.pow(2, Math.floor((exponent + i) / steps));
    return result;
}


math.log = function(x) {
    return Math.log(x);
}


math.log10 = function(x) {
    return Math.log10(x);
}


math.max = function(...args) {
    var c;
    args.forEach(arg => {
        if (c == undefined) {
            c = arg;
        } else if (arg > c) {
            c = arg;
        }
    })
    return c;
}


math.min = function(...args) {
    var c;
    args.forEach(arg => {
        if (c == undefined) {
            c = arg;
        } else if (arg < c) {
            c = arg;
        }
    })
    return c;
}


math.modf = function(x) {
    var i = Math.floor(x);
    return [i, x - i];
}


math.pi = Math.PI;


math.pow = function(x, y) {
    return Math.pow(x, y);
}


math.rad = function(deg) {
    return deg * (Math.PI / 180);
}


math.random = function(m, n) {
    if (m == undefined && n == undefined) {
        return Math.random();
    } else if (n == undefined) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
        return RuntimeInternal.getRandom(1, m);
    } else {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
        return RuntimeInternal.getRandom(m, n);
    }
}


// NONFUNCTIONAL (*)
math.randomseed = function(x) {
    // https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
}


math.sin = function(x) {
    return Math.sin(x);
}


math.sinh = function(x) {
    return Math.sin(x);
}


math.sqrt = function(x) {
    return Math.sqrt(x);
}


math.tan = function(x) {
    return Math.tan(x);
}


math.tanh = function(x) {
    return Math.tanh(x);
}


// math END




// os START


var os = {};


os.clock = function() {
    return (performance.now - RuntimeInternal.msSinceStart) / 1000;
}


// NONFUNCTIONAL (*), TODO
os.date = function(format, time) {
    
}


os.difftime = function(t2, t1) {
    return [t2 - t1];
}


// NONFUNCTIONAL (*), TODO
os.execute = function(command) {
    
}


os.exit = function(code) {
    if (code == undefined) {
        code = 0;
    }
    process.exit(code);
}


// NONFUNCTIONAL (*), TODO
os.getenv = function() {
    
}


// NONFUNCTIONAL (*), TODO
os.remove = function() {
    
}


// NONFUNCTIONAL (*), TODO
os.rename = function() {
    
}


// NONFUNCTIONAL (*), TODO
os.setlocale = function() {
    
}


// NONFUNCTIONAL (*), TODO
os.time = function() {
    
}


// NONFUNCTIONAL (*), TODO
os.tmpname = function() {
    
}


// os END




// package START


// NONFUNCTIONAL (*), TODO
// package is reserved


// package END




// string START


{
    RuntimeInternal.luainjs = {};
    
// lua-in-js dependency: printj
// Apache-2.0
// https://github.com/SheetJS/printj/blob/master/printj.js
// https://minify-js.com/
RuntimeInternal.luainjs.PRINTJ={};RuntimeInternal.luainjs.PRINTJ.sprintf=function(){for(var e=new Array(arguments.length-1),t=0;t<e.length;++t)e[t]=arguments[t+1];return RuntimeInternal.luainjs.PRINTJ.doit(RuntimeInternal.luainjs.PRINTJ.tokenize(arguments[0]),e)};RuntimeInternal.luainjs.PRINTJ.tcache={},RuntimeInternal.luainjs.PRINTJ.tokenize=function(e){if(RuntimeInternal.luainjs.PRINTJ.tcache[e])return RuntimeInternal.luainjs.PRINTJ.tcache[e];for(var t=[],a=0,r=0,s=!1,n="",c="",h="",i="",g="",l=0,o=e.length;r<o;++r)if(l=e.charCodeAt(r),s)if(l>=48&&l<58)i.length?i+=String.fromCharCode(l):48!=l||h.length?h+=String.fromCharCode(l):c+=String.fromCharCode(l);else switch(l){case 36:i.length?i+="$":"*"==h.charAt(0)?h+="$":(n=h+"$",h="");break;case 39:c+="'";break;case 45:c+="-";break;case 43:c+="+";break;case 32:c+=" ";break;case 35:c+="#";break;case 46:i=".";break;case 42:"."==i.charAt(0)?i+="*":h+="*";break;case 104:case 108:if(g.length>1)throw"bad length "+g+String(l);g+=String.fromCharCode(l);break;case 76:case 106:case 122:case 116:case 113:case 90:case 119:if(""!==g)throw"bad length "+g+String.fromCharCode(l);g=String.fromCharCode(l);break;case 73:if(""!==g)throw"bad length "+g+"I";g="I";break;case 100:case 105:case 111:case 117:case 120:case 88:case 102:case 70:case 101:case 69:case 103:case 71:case 97:case 65:case 99:case 67:case 115:case 83:case 112:case 110:case 68:case 85:case 79:case 109:case 98:case 66:case 121:case 89:case 74:case 86:case 84:case 37:s=!1,i.length>1&&(i=i.substr(1)),t.push([String.fromCharCode(l),e.substring(a,r+1),n,c,h,i,g]),a=r+1,g=i=h=c=n="";break;default:throw new Error("Invalid format string starting with |"+e.substring(a,r+1)+"|")}else{if(37!==l)continue;a<r&&t.push(["L",e.substring(a,r)]),a=r,s=!0}return a<e.length&&t.push(["L",e.substring(a)]),RuntimeInternal.luainjs.PRINTJ.tcache[e]=t},RuntimeInternal.luainjs.PRINTJ.u_inspect=JSON.stringify,RuntimeInternal.luainjs.PRINTJ.doit=function(e,t){for(var a="",r=0,s=0,n=0,c="",h=0;h<e.length;++h){var i=e[h],g=i[0].charCodeAt(0);if(76!==g)if(37!==g){var l="",o=0,b=10,f=4,u=!1,p=i[3],d=p.indexOf("#")>-1;if(i[2])r=parseInt(i[2],10)-1;else if(109===g&&!d){a+="Success";continue}var k=0;i[4].length>0&&(k="*"!==i[4].charAt(0)?parseInt(i[4],10):1===i[4].length?t[s++]:t[parseInt(i[4].substr(1),10)-1]);var x=-1;i[5].length>0&&(x="*"!==i[5].charAt(0)?parseInt(i[5],10):1===i[5].length?t[s++]:t[parseInt(i[5].substr(1),10)-1]),i[2]||(r=s++);var C=t[r],O=i[6];switch(g){case 83:case 115:l=String(C),x>=0&&(l=l.substr(0,x)),(k>l.length||-k>l.length)&&((-1==p.indexOf("-")||k<0)&&-1!=p.indexOf("0")?l=(c=k-l.length>=0?"0".repeat(k-l.length):"")+l:(c=k-l.length>=0?" ".repeat(k-l.length):"",l=p.indexOf("-")>-1?l+c:c+l));break;case 67:case 99:switch(typeof C){case"number":var S=C;67==g||108===O.charCodeAt(0)?(S&=4294967295,l=String.fromCharCode(S)):(S&=255,l=String.fromCharCode(S));break;case"string":l=C.charAt(0);break;default:l=String(C).charAt(0)}(k>l.length||-k>l.length)&&((-1==p.indexOf("-")||k<0)&&-1!=p.indexOf("0")?l=(c=k-l.length>=0?"0".repeat(k-l.length):"")+l:(c=k-l.length>=0?" ".repeat(k-l.length):"",l=p.indexOf("-")>-1?l+c:c+l));break;case 68:f=8;case 100:case 105:o=-1,u=!0;break;case 85:f=8;case 117:o=-1;break;case 79:f=8;case 111:o=-1,b=8;break;case 120:o=-1,b=-16;break;case 88:o=-1,b=16;break;case 66:f=8;case 98:o=-1,b=2;break;case 70:case 102:o=1;break;case 69:case 101:o=2;break;case 71:case 103:o=3;break;case 65:case 97:o=4;break;case 112:n="number"==typeof C?C:C?Number(C.l):-1,isNaN(n)&&(n=-1),l=d?n.toString(10):"0x"+(n=Math.abs(n)).toString(16).toLowerCase();break;case 110:C&&(C.len=a.length);continue;case 109:l=C instanceof Error?C.message?C.message:C.errno?"Error number "+C.errno:"Error "+String(C):"Success";break;case 74:l=(d?RuntimeInternal.luainjs.PRINTJ.u_inspect:JSON.stringify)(C);break;case 86:l=null==C?"null":String(C.valueOf());break;case 84:l=d?(l=Object.prototype.toString.call(C).substr(8)).substr(0,l.length-1):typeof C;break;case 89:case 121:l=C?d?"yes":"true":d?"no":"false",89==g&&(l=l.toUpperCase()),x>=0&&(l=l.substr(0,x)),(k>l.length||-k>l.length)&&((-1==p.indexOf("-")||k<0)&&-1!=p.indexOf("0")?l=(c=k-l.length>=0?"0".repeat(k-l.length):"")+l:(c=k-l.length>=0?" ".repeat(k-l.length):"",l=p.indexOf("-")>-1?l+c:c+l))}if(k<0&&(k=-k,p+="-"),-1==o){switch(n=Number(C),O){case"hh":f=1;break;case"h":f=2;break;case"l":case"L":case"q":case"ll":case"j":case"t":case"z":case"Z":case"I":4==f&&(f=8)}switch(f){case 1:n&=255,u&&n>127&&(n-=256);break;case 2:n&=65535,u&&n>32767&&(n-=65536);break;case 4:n=u?0|n:n>>>0;break;default:n=isNaN(n)?0:Math.round(n)}if(f>4&&n<0&&!u)if(16==b||-16==b)l=(n>>>0).toString(16),l=(16-(l=((n=Math.floor((n-(n>>>0))/Math.pow(2,32)))>>>0).toString(16)+(8-l.length>=0?"0".repeat(8-l.length):"")+l).length>=0?"f".repeat(16-l.length):"")+l,16==b&&(l=l.toUpperCase());else if(8==b)l=(10-(l=(n>>>0).toString(8)).length>=0?"0".repeat(10-l.length):"")+l,l="1"+(21-(l=(l=((n=Math.floor((n-(n>>>0&1073741823))/Math.pow(2,30)))>>>0).toString(8)+l.substr(l.length-10)).substr(l.length-20)).length>=0?"7".repeat(21-l.length):"")+l;else{n=-n%1e16;for(var A=[1,8,4,4,6,7,4,4,0,7,3,7,0,9,5,5,1,6,1,6],w=A.length-1;n>0;)(A[w]-=n%10)<0&&(A[w]+=10,A[w-1]--),--w,n=Math.floor(n/10);l=A.join("")}else l=-16===b?n.toString(16).toLowerCase():16===b?n.toString(16).toUpperCase():n.toString(b);if(0!==x||"0"!=l||8==b&&d){if(l.length<x+("-"==l.substr(0,1)?1:0)&&(l="-"!=l.substr(0,1)?(x-l.length>=0?"0".repeat(x-l.length):"")+l:l.substr(0,1)+(x+1-l.length>=0?"0".repeat(x+1-l.length):"")+l.substr(1)),!u&&d&&0!==n)switch(b){case-16:l="0x"+l;break;case 16:l="0X"+l;break;case 8:"0"!=l.charAt(0)&&(l="0"+l);break;case 2:l="0b"+l}}else l="";u&&"-"!=l.charAt(0)&&(p.indexOf("+")>-1?l="+"+l:p.indexOf(" ")>-1&&(l=" "+l)),k>0&&l.length<k&&(p.indexOf("-")>-1?l+=k-l.length>=0?" ".repeat(k-l.length):"":p.indexOf("0")>-1&&x<0&&l.length>0?(x>l.length&&(l=(x-l.length>=0?"0".repeat(x-l.length):"")+l),c=k-l.length>=0?(x>0?" ":"0").repeat(k-l.length):"",l=l.charCodeAt(0)<48?"x"==l.charAt(2).toLowerCase()?l.substr(0,3)+c+l.substring(3):l.substr(0,1)+c+l.substring(1):"x"==l.charAt(1).toLowerCase()?l.substr(0,2)+c+l.substring(2):c+l):l=(k-l.length>=0?" ".repeat(k-l.length):"")+l)}else if(o>0){n=Number(C),null===C&&(n=NaN),"L"==O&&(f=12);var N=isFinite(n);if(N){var v=0;-1==x&&4!=o&&(x=6),3==o&&(0===x&&(x=1),x>(v=+(l=n.toExponential(1)).substr(l.indexOf("e")+1))&&v>=-4?(o=11,x-=v+1):(o=12,x-=1));var I=n<0||1/n==-1/0?"-":"";switch(n<0&&(n=-n),o){case 1:case 11:if(n<1e21){l=n.toFixed(x),1==o?0===x&&d&&-1==l.indexOf(".")&&(l+="."):d?-1==l.indexOf(".")&&(l+="."):l=l.replace(/(\.\d*[1-9])0*$/,"$1").replace(/\.0*$/,"");break}v=+(l=n.toExponential(20)).substr(l.indexOf("e")+1),l=l.charAt(0)+l.substr(2,l.indexOf("e")-2),l+=v-l.length+1>=0?"0".repeat(v-l.length+1):"",(d||x>0&&11!==o)&&(l=l+"."+(x>=0?"0".repeat(x):""));break;case 2:case 12:v=(l=n.toExponential(x)).indexOf("e"),l.length-v==3&&(l=l.substr(0,v+2)+"0"+l.substr(v+2)),d&&-1==l.indexOf(".")?l=l.substr(0,v)+"."+l.substr(v):d||12!=o||(l=l.replace(/\.0*e/,"e").replace(/\.(\d*[1-9])0*e/,".$1e"));break;case 4:if(0===n){l="0x0"+(d||x>0?"."+(x>=0?"0".repeat(x):""):"")+"p+0";break}var m=(l=n.toString(16)).charCodeAt(0);if(48==m){for(m=2,v=-4,n*=16;48==l.charCodeAt(m++);)v-=4,n*=16;m=(l=n.toString(16)).charCodeAt(0)}var J=l.indexOf(".");if(l.indexOf("(")>-1){var M=l.match(/\(e(.*)\)/),P=M?+M[1]:0;v+=4*P,n/=Math.pow(16,P)}else J>1?(v+=4*(J-1),n/=Math.pow(16,J-1)):-1==J&&(v+=4*(l.length-1),n/=Math.pow(16,l.length-1));if(f>8?m<50?(v-=3,n*=8):m<52?(v-=2,n*=4):m<56&&(v-=1,n*=2):m>=56?(v+=3,n/=8):m>=52?(v+=2,n/=4):m>=50&&(v+=1,n/=2),(l=n.toString(16)).length>1){if(l.length>x+2&&l.charCodeAt(x+2)>=56){var R=102==l.charCodeAt(0);l=(n+8*Math.pow(16,-x-1)).toString(16),R&&49==l.charCodeAt(0)&&(v+=4)}x>0?(l=l.substr(0,x+2)).length<x+2&&(l.charCodeAt(0)<48?l=l.charAt(0)+(x+2-l.length>=0?"0".repeat(x+2-l.length):"")+l.substr(1):l+=x+2-l.length>=0?"0".repeat(x+2-l.length):""):0===x&&(l=l.charAt(0)+(d?".":""))}else x>0?l=l+"."+(x>=0?"0".repeat(x):""):d&&(l+=".");l="0x"+l+"p"+(v>=0?"+"+v:v)}""===I&&(p.indexOf("+")>-1?I="+":p.indexOf(" ")>-1&&(I=" ")),l=I+l}else n<0?l="-":p.indexOf("+")>-1?l="+":p.indexOf(" ")>-1&&(l=" "),l+=isNaN(n)?"nan":"inf";k>l.length&&(p.indexOf("-")>-1?l+=k-l.length>=0?" ".repeat(k-l.length):"":p.indexOf("0")>-1&&l.length>0&&N?(c=k-l.length>=0?"0".repeat(k-l.length):"",l=l.charCodeAt(0)<48?"x"==l.charAt(2).toLowerCase()?l.substr(0,3)+c+l.substring(3):l.substr(0,1)+c+l.substring(1):"x"==l.charAt(1).toLowerCase()?l.substr(0,2)+c+l.substring(2):c+l):l=(k-l.length>=0?" ".repeat(k-l.length):"")+l),g<96&&(l=l.toUpperCase())}a+=l}else a+="%";else a+=i[1]}return a};





    // string.js
    RuntimeInternal.luainjs.ROSETTA_STONE = {
        '([^a-zA-Z0-9%(])-': '$1*?',
        '([^%])-([^a-zA-Z0-9?])': '$1*?$2',
        '([^%])\\.': '$1[\\s\\S]',
        '(.)-$': '$1*?',
        '%a': '[a-zA-Z]',
        '%A': '[^a-zA-Z]',
        '%c': '[\x00-\x1f]',
        '%C': '[^\x00-\x1f]',
        '%d': '\\d',
        '%D': '[^d]',
        '%l': '[a-z]',
        '%L': '[^a-z]',
        '%p': '[.,"\'?!;:#$%&()*+-/<>=@\\[\\]\\\\^_{}|~]',
        '%P': '[^.,"\'?!;:#$%&()*+-/<>=@\\[\\]\\\\^_{}|~]',
        '%s': '[ \\t\\n\\f\\v\\r]',
        '%S': '[^ \t\n\f\v\r]',
        '%u': '[A-Z]',
        '%U': '[^A-Z]',
        '%w': '[a-zA-Z0-9]',
        '%W': '[^a-zA-Z0-9]',
        '%x': '[a-fA-F0-9]',
        '%X': '[^a-fA-F0-9]',
        '%([^a-zA-Z])': '\\$1'
    };

    // pattern should be js string
    RuntimeInternal.luainjs.translatePattern = function(pattern) {
        // TODO Add support for balanced character matching (not sure this is easily achieveable).

        // Replace single backslash with double backslashes
        let tPattern = pattern.replace(/\\/g, '\\\\')
        
        for (const [k, v] of Object.entries(RuntimeInternal.luainjs.ROSETTA_STONE)) {
            tPattern = tPattern.replace(new RegExp(k, 'g'), v)
        }

        let nestingLevel = 0

        for (let i = 0, l = tPattern.length; i < l; i++) {
            if (i && tPattern.substr(i - 1, 1) === '\\') {
                continue
            }

            // Remove nested square brackets caused by substitutions
            const character = tPattern.substr(i, 1)

            if (character === '[' || character === ']') {
                if (character === ']') {
                    nestingLevel -= 1
                }

                if (nestingLevel > 0) {
                    tPattern = tPattern.substr(0, i) + tPattern.substr(i + 1)
                    i -= 1
                    l -= 1
                }

                if (character === '[') {
                    nestingLevel += 1
                }
            }
        }

        return tPattern
    };


    // string.ts start
    
    /**
     * Looks for the first match of pattern (see §6.4.1) in the string s. If it finds a match, then find returns
     * the indices of s where this occurrence starts and ends; otherwise, it returns nil.
     * A third, optional numeric argument init specifies where to start the search; its default value is 1 and can be negative.
     * A value of true as a fourth, optional argument plain turns off the pattern matching facilities,
     * so the function does a plain "find substring" operation, with no characters in pattern being considered magic.
     * Note that if plain is given, then init must be given as well.
     *
     * If the pattern has captures, then in a successful match the captured values are also returned, after the two indices.
     */
    RuntimeInternal.luainjs.find = function(s, pattern, init, plain) {
        // const S = coerceArgToString(s, 'find', 1)
        // const P = coerceArgToString(pattern, 'find', 2)
        const S = RuntimeInternal.stringToActualString(s);
        const P = RuntimeInternal.stringToActualString(pattern);
        const INIT = init === undefined ? 1 : init;
        const PLAIN = plain === undefined ? false : plain;

        // Regex
        if (!PLAIN) {
            const regex = new RegExp(RuntimeInternal.luainjs.translatePattern(P))
            const index = S.substr(INIT - 1).search(regex)

            if (index < 0) return []

            const match = S.substr(INIT - 1).match(regex)
            const result = [index + INIT, index + INIT + match[0].length - 1]

            match.shift()
            return [...result, ...match]
        }

        // Plain
        const index = S.indexOf(P, INIT - 1)
        return index === -1 ? [] : [index + 1, index + P.length]
    };

    RuntimeInternal.luainjs.format = function(formatstring1, ...args) {
        let formatstring = RuntimeInternal.stringToActualString(formatstring1)
        // Pattern with all constraints:
        // /%%|%([-+ #0]{0,5})?(\d{0,2})?(?:\.(\d{0,2}))?([AEGXacdefgioqsux])/g
        const PATTERN = /%%|%([-+ #0]*)?(\d*)?(?:\.(\d*))?(.)/g

        let i = -1
        return formatstring.replace(PATTERN, (format, flags, width, precision, modifier) => {
            if (format === '%%') return '%'
            if (!modifier.match(/[AEGXacdefgioqsux]/)) {
                throw new LuaError(`invalid option '%${format}' to 'format'`)
            }
            if (flags && flags.length > 5) {
                throw new LuaError(`invalid format (repeated flags)`)
            }
            if (width && width.length > 2) {
                throw new LuaError(`invalid format (width too long)`)
            }
            if (precision && precision.length > 2) {
                throw new LuaError(`invalid format (precision too long)`)
            }

            i += 1
            const arg = args[i]
            if (arg === undefined) {
                throw new LuaError(`bad argument #${i} to 'format' (no value)`)
            }
            if (/A|a|E|e|f|G|g/.test(modifier)) {
                // return RuntimeInternal.luainjs.PRINTJ.sprintf(format, coerceArgToNumber(arg, 'format', i))
                return RuntimeInternal.luainjs.PRINTJ.sprintf(format, arg);
            }
            if (/c|d|i|o|u|X|x/.test(modifier)) {
                // return RuntimeInternal.luainjs.PRINTJ.sprintf(format, coerceArgToNumber(arg, 'format', i))
                return RuntimeInternal.luainjs.PRINTJ.sprintf(format, arg);
            }

            if (modifier === 'q') {
                return `"${(RuntimeInternal.toActualString(arg)).replace(/([\n"])/g, '\\$1')}"`
            }
            if (modifier === 's') {
                return RuntimeInternal.luainjs.PRINTJ.sprintf(format, RuntimeInternal.toActualString(tostring(arg)))
            }
            return RuntimeInternal.luainjs.PRINTJ.sprintf(format, arg) // maybe add modifier here? (RuntimeInternal.toActualString())
        })
    };

    /**
     * Returns an iterator function that, each time it is called, returns the next captures from pattern (see §6.4.1)
     * over the string s. If pattern specifies no captures, then the whole match is produced in each call.
     */
    RuntimeInternal.luainjs.gmatch = function(s, pattern) {
        // const S = coerceArgToString(s, 'gmatch', 1)
        // const P = RuntimeInternal.luainjs.translatePattern(coerceArgToString(pattern, 'gmatch', 2))
        const S = RuntimeInternal.stringToActualString(s);
        const P = RuntimeInternal.luainjs.translatePattern(RuntimeInternal.stringToActualString(pattern));

        const reg = new RegExp(P, 'g')
        const matches = S.match(reg)

        return () => {
            const match = matches.shift()
            if (match === undefined) return []

            const groups = new RegExp(P).exec(match)
            groups.shift()
            return groups.length ? groups : [match]
        }
    };

    /**
     * Returns a copy of s in which all (or the first n, if given) occurrences of the pattern (see §6.4.1)
     * have been replaced by a replacement string specified by repl, which can be a string, a table, or a function.
     * gsub also returns, as its second value, the total number of matches that occurred.
     * The name gsub comes from Global SUBstitution.
     *
     * If repl is a string, then its value is used for replacement. The character % works as an escape character:
     * any sequence in repl of the form %d, with d between 1 and 9, stands for the value of the d-th captured substring.
     * The sequence %0 stands for the whole match. The sequence %% stands for a single %.
     *
     * If repl is a table, then the table is queried for every match, using the first capture as the key.
     *
     * If repl is a function, then this function is called every time a match occurs,
     * with all captured substrings passed as arguments, in order.
     *
     * In any case, if the pattern specifies no captures, then it behaves as if the whole pattern was inside a capture.
     *
     * If the value returned by the table query or by the function call is a string or a number,
     * then it is used as the replacement string; otherwise, if it is false or nil, then there is no replacement
     * (that is, the original match is kept in the string).
     */
    RuntimeInternal.luainjs.gsub = function(s, pattern, repl, n) {
        // let S = coerceArgToString(s, 'gsub', 1)
        let S = RuntimeInternal.stringToActualString(s);
        // const N = n === undefined ? Infinity : coerceArgToNumber(n, 'gsub', 3)
        const N = n === undefined ? Infinity : n;
        // const P = RuntimeInternal.luainjs.translatePattern(coerceArgToString(pattern, 'gsub', 2))
        const P = RuntimeInternal.luainjs.translatePattern(RuntimeInternal.stringToActualString(pattern));

        const REPL = (() => {
            if (typeof repl === 'function')
                return strs => {
                    const ret = repl(strs[0])[0]
                    return ret === undefined ? strs[0] : ret
                }

            if (repl instanceof Table) return strs => repl.get(strs[0]).toString()

            return strs => `${repl}`.replace(/%([0-9])/g, (_, i) => strs[i])
        })()

        let result = ''
        let count = 0
        let match
        let lastMatch
        while (count < N && S && (match = S.match(P))) {
            const prefix =
                // eslint-disable-next-line no-nested-ternary
                match[0].length > 0 ? S.substr(0, match.index) : lastMatch === undefined ? '' : S.substr(0, 1)

            lastMatch = match[0]
            result += `${prefix}${REPL(match)}`
            S = S.substr(`${prefix}${lastMatch}`.length)

            count += 1
        }

        return `${result}${S}`
    };

    // ...

    /**
     * Looks for the first match of pattern (see §6.4.1) in the string s.
     * If it finds one, then match returns the captures from the pattern; otherwise it returns nil.
     * If pattern specifies no captures, then the whole match is returned.
     * A third, optional numeric argument init specifies where to start the search; its default value is 1 and can be negative.
     */
    RuntimeInternal.luainjs.match = function(s, pattern, init) {
        // let str = coerceArgToString(s, 'match', 1)
        let str = RuntimeInternal.stringToActualString(s);
        // const patt = coerceArgToString(pattern, 'match', 2)
        const patt = RuntimeInternal.stringToActualString(pattern);
        // const ini = coerceArgToNumber(init, 'match', 3)
        const ini = init == undefined ? 0 : init;

        str = str.substr(ini)
        const matches = str.match(new RegExp(translatePattern(patt)))

        if (!matches) {
            return
        } else if (!matches[1]) {
            return matches[0]
        }

        matches.shift()
        return matches
    };



    // string.lower, string.upper
    /*
    runtime_genstringmappings.lua
    */
    RuntimeInternal.lowerMap = {65:97,66:98,67:99,68:100,69:101,70:102,71:103,72:104,73:105,74:106,75:107,76:108,77:109,78:110,79:111,80:112,81:113,82:114,83:115,84:116,85:117,86:118,87:119,88:120,89:121,90:122};
    RuntimeInternal.upperMap = {97:65,98:66,99:67,100:68,101:69,102:70,103:71,104:72,105:73,106:74,107:75,108:76,109:77,110:78,111:79,112:80,113:81,114:82,115:83,116:84,117:85,118:86,119:87,120:88,121:89,122:90};
}

var string = {};


string.byte = function(s, i, j) {
    if (i == undefined) {
        i = 1;
    }
    if (j == undefined) {
        j = i;
    }

    var out = [];

    for (let i2 = i - 1; i2 < j; i2++) {
        out.push(s[i2]);
    }

    return out; // TODO: One return ambiguous?
}


string.char = function(...args) {
    return new Uint8Array(args);
}


// NONFUNCTIONAL (*), TODO
string.dump = function() {
    
}


string.find = RuntimeInternal.luainjs.find;


string.format = RuntimeInternal.luainjs.format;


string.gmatch = RuntimeInternal.luainjs.gmatch;


string.gsub = RuntimeInternal.luainjs.gsub;


string.len = function(str) {
    return str.length;
}


string.lower = function(str) {
    let out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        let s = RuntimeInternal.lowerMap[str[i]];
        out[i] = s == undefined ? str[i] : s;
    }
    return out;
}


string.match = RuntimeInternal.luainjs.match;


string.rep = function(s, n) {
    let out = new Uint8Array(s.length * n);
    for (let i = 0; i < n; i++) {
        out.set(s, i * s.length);
    }
    return out;
}


string.reverse = function(str) {
    var out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        out[i] = str[str.length - i - 1];
    }
    return out;
}


string.sub = function(str, i, j) {
    if (j == undefined) {
        j = -1;
    }
    if (i < 0) {
        i = str.length + 1 + i;
    }
    if (j < 0) {
        j = str.length + 1 + j;
    }

    var out = new Uint8Array(j - i + 1);
    for (let i2 = i - 1; i2 < j; i2++) {
        out[i2 - i + 1] = str[i2];
    }
    return out;
}


string.upper = function(str) {
    let out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        let s = RuntimeInternal.upperMap[str[i]];
        out[i] = s == undefined ? str[i] : s;
    }
    return out;
}

{
    // Prototype
    for (const [key, value] of Object.entries(string)) {
        Uint8Array.prototype[key] = value;
    }
}

// {
//     // test
//     console.log(RuntimeInternal.stringToActualString(string.upper(string.lower(RuntimeInternal.actualStringToString('AMOGUS'))))); // -> 'AMOGUS'
//     console.log(RuntimeInternal.stringToActualString(string.rep(RuntimeInternal.actualStringToString('sus'), 3))); // -> 'sussussus'
// }


// string END




// table START


var table = {};


table.concat = function(t, sep, i, j) {
    t = RuntimeInternal.coerceToArray(t);
    
    if (sep == undefined) {
        sep = '';
    }
    if (i == undefined) {
        i = 1;
    }
    if (j == undefined) {
        j = RuntimeInternal.getLength(t);
    }

    if (i > j) {
        return '';
    }

    // var a = [];
    // for (let i2 = i; i2 < j + 1; i2++) {
    //     a.push(t[i2]);
    // }

    return t.slice(i, j + 1).join(sep);
}


table.insert = function(t, pos, value) {
    if (value == undefined) {
        value = pos;
        pos = RuntimeInternal.getLength(t) + 1;
    }

    for (let i = (RuntimeInternal.getLength(t)) + 1; i > pos - 1; i--) {
        if (i == pos) {
            t[i] = value;
        } else {
            t[i] = t[i - 1];
        }
    }
}


table.maxn = function(t) {
    t = RuntimeInternal.coerceToArray(t);
    
    var a = t.length
    if (a) {
        return a - 1 + 1;
    } else {
        return 0;
    }
}


table.remove = function(t, pos) {
    if (pos == undefined) {
        pos = RuntimeInternal.getLength(t);
    }

    for (let i = pos; i < RuntimeInternal.getLength(t) + 1; i++) {
        if (i == RuntimeInternal.getLength(t)) {
            t.pop();
        } else {
            t[i] = t[i + 1];
        }
    }
}


table.sort = function(t, comp) {
    if (comp == undefined) {
        comp = RuntimeInternal.defaultSortComparisonf
    }
    t.sort(comp);
}


// table END











// runtime.js END


var math,string,tonumber,type,assert,error,luaY,setmetatable,bit,bit32,require,table,unpack,ipairs,pairs,select,pcall,getfenv;let a={};let b={};b.OpMode={['iABC']:0,['iABx']:1,['iAsBx']:2};b.SIZE_C=9;b.SIZE_B=9;b.SIZE_Bx=(b.SIZE_C+b.SIZE_B);b.SIZE_A=8;b.SIZE_OP=6;b.POS_OP=0;b.POS_A=(b.POS_OP+b.SIZE_OP);b.POS_C=(b.POS_A+b.SIZE_A);b.POS_B=(b.POS_C+b.SIZE_C);b.POS_Bx=b.POS_C;b.MAXARG_Bx=(math.ldexp(1,b.SIZE_Bx)-1);b.MAXARG_sBx=math.floor((b.MAXARG_Bx/2));b.MAXARG_A=(math.ldexp(1,b.SIZE_A)-1);b.MAXARG_B=(math.ldexp(1,b.SIZE_B)-1);b.MAXARG_C=(math.ldexp(1,b.SIZE_C)-1);b.GET_OPCODE=function(c){return self.ROpCode[c.OP];};b.SET_OPCODE=function(c,d){c.OP=self.OpCode[d];};b.GETARG_A=function(c){return c.A;};b.SETARG_A=function(c,e){c.A=e;};b.GETARG_B=function(c){return c.B;};b.SETARG_B=function(c,f){c.B=f;};b.GETARG_C=function(c){return c.C;};b.SETARG_C=function(c,f){c.C=f;};b.GETARG_Bx=function(c){return c.Bx;};b.SETARG_Bx=function(c,f){c.Bx=f;};b.GETARG_sBx=function(c){return (c.Bx-self.MAXARG_sBx);};b.SETARG_sBx=function(c,f){c.Bx=(f+self.MAXARG_sBx);};b.CREATE_ABC=function(d,g,f,h){return {['OP']:self.OpCode[d],['A']:g,['B']:f,['C']:h};};b.CREATE_ABx=function(d,g,i){return {['OP']:self.OpCode[d],['A']:g,['Bx']:i};};b.CREATE_Inst=function(h){let d=(h%64);h=((h-d)/64);let g=(h%256);h=((h-g)/256);return self.CREATE_ABx(self,d,g,h);};b.Instruction=function(c){if(RuntimeInternal.isTrue(c.Bx)){c.C=(c.Bx%512);c.B=((c.Bx-c.C)/512);}let j=((c.A*64)+c.OP);let k=(j%256);j=((c.C*64)+((j-k)/256));let l=(j%256);j=((c.B*128)+((j-l)/256));let m=(j%256);let n=((j-m)/256);return string.char(k,l,m,n);};b.DecodeInst=function(o){let p=string.byte;let c={};j=RuntimeInternal.wrapAmbiguousCall(p(o,1));let q=(j%64);c.OP=q;j=((p(o,2)*4)+((j-q)/64));g=(j%256);c.A=g;j=((p(o,3)*4)+((j-g)/256));let h=(j%512);c.C=h;c.B=((p(o,4)*2)+((j-h)/512));let r=self.OpMode[tonumber(string.sub(self.opmodes[(q+1)],7,7))];if(RuntimeInternal.isTrue((r!==new Uint8Array([105,65,66,67])))){c.Bx=((c.B*512)+c.C);}return c;};b.BITRK=math.ldexp(1,(b.SIZE_B-1));b.ISK=function(o){return (o>=self.BITRK);};b.INDEXK=function(o){return (o-self.BITRK);};b.MAXINDEXRK=(b.BITRK-1);b.RKASK=function(o){return (o+self.BITRK);};b.NO_REG=b.MAXARG_A;b.opnames={};b.OpCode={};b.ROpCode={};c=0;let _=string.gmatch(new Uint8Array([13,10,77,79,86,69,32,76,79,65,68,75,32,76,79,65,68,66,79,79,76,32,76,79,65,68,78,73,76,32,71,69,84,85,80,86,65,76,13,10,71,69,84,71,76,79,66,65,76,32,71,69,84,84,65,66,76,69,32,83,69,84,71,76,79,66,65,76,32,83,69,84,85,80,86,65,76,32,83,69,84,84,65,66,76,69,13,10,78,69,87,84,65,66,76,69,32,83,69,76,70,32,65,68,68,32,83,85,66,32,77,85,76,13,10,68,73,86,32,77,79,68,32,80,79,87,32,85,78,77,32,78,79,84,13,10,76,69,78,32,67,79,78,67,65,84,32,74,77,80,32,69,81,32,76,84,13,10,76,69,32,84,69,83,84,32,84,69,83,84,83,69,84,32,67,65,76,76,32,84,65,73,76,67,65,76,76,13,10,82,69,84,85,82,78,32,70,79,82,76,79,79,80,32,70,79,82,80,82,69,80,32,84,70,79,82,76,79,79,80,32,83,69,84,76,73,83,84,13,10,67,76,79,83,69,32,67,76,79,83,85,82,69,32,86,65,82,65,82,71,13,10]),new Uint8Array([37,83,43])),_f,_s,_v;if(typeof _=='object'){[_f,_s,_v]=_}else{_f=_}while(true){let[s]=_f(_s,_v);_v=s;if(_v==null||_v==undefined){break}let t=(RuntimeInternal.concatString(new Uint8Array([79,80,95]),s));b.opnames[c]=s;b.OpCode[t]=c;b.ROpCode[c]=t;c=(c+1);}b.NUM_OPCODES=c;b.OpArgMask={['OpArgN']:0,['OpArgU']:1,['OpArgR']:2,['OpArgK']:3};b.getOpMode=function(u){return (self.opmodes[self.OpCode[u]]%4);};b.getBMode=function(u){return (math.floor((self.opmodes[self.OpCode[u]]/16))%4);};b.getCMode=function(u){return (math.floor((self.opmodes[self.OpCode[u]]/4))%4);};b.testAMode=function(u){return (math.floor((self.opmodes[self.OpCode[u]]/64))%2);};b.testTMode=function(u){return math.floor((self.opmodes[self.OpCode[u]]/128));};b.LFIELDS_PER_FLUSH=50;r=function(v,g,f,h,u){b=b;return (((((v*128)+(g*64))+(b.OpArgMask[f]*16))+(b.OpArgMask[h]*4))+b.OpMode[u]);};b.opmodes={1:r(0,1,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,120])),2:r(0,1,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,85]),new Uint8Array([105,65,66,67])),3:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67])),4:r(0,1,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67])),5:r(0,1,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,120])),6:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),7:r(0,0,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,120])),8:r(0,0,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67])),9:r(0,0,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),10:r(0,1,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,85]),new Uint8Array([105,65,66,67])),11:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),12:r(0,1,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),13:r(0,1,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),14:r(0,1,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),15:r(0,1,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),16:r(0,1,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),17:r(0,1,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),18:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67])),19:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67])),20:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67])),21:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,82]),new Uint8Array([105,65,66,67])),22:r(0,0,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,115,66,120])),23:r(1,0,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),24:r(1,0,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),25:r(1,0,new Uint8Array([79,112,65,114,103,75]),new Uint8Array([79,112,65,114,103,75]),new Uint8Array([105,65,66,67])),26:r(1,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,85]),new Uint8Array([105,65,66,67])),27:r(1,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,85]),new Uint8Array([105,65,66,67])),28:r(0,1,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,85]),new Uint8Array([105,65,66,67])),29:r(0,1,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,85]),new Uint8Array([105,65,66,67])),30:r(0,0,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67])),31:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,115,66,120])),32:r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,115,66,120])),33:r(1,0,new Uint8Array([79,112,65,114,103,78]),new Uint8Array([79,112,65,114,103,85]),new Uint8Array([105,65,66,67])),34:r(0,0,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,85]),new Uint8Array([105,65,66,67])),35:r(0,0,new Uint8Array([79,112,65,114,103,78]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67])),36:r(0,1,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,120])),37:r(0,1,new Uint8Array([79,112,65,114,103,85]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67]))};b.opmodes[0]=r(0,1,new Uint8Array([79,112,65,114,103,82]),new Uint8Array([79,112,65,114,103,78]),new Uint8Array([105,65,66,67]));a.LuaP=b;let w={};w.make_getS=function(x){let f=x;return function(){if(RuntimeInternal.isTrue(!f)){return null;}let y=f;f=null;return y;};};w.init=function(z,y,A){if(RuntimeInternal.isTrue(!z)){return;}let B={};B.reader=z;B.data=y||new Uint8Array([]);B.name=A;if(RuntimeInternal.isTrue(!y||(y===new Uint8Array([])))){B.n=0;}else{B.n=RuntimeInternal.getLength(y);}B.p=0;return B;};w.fill=function(B){let x=RuntimeInternal.wrapAmbiguousCall(B.reader());B.data=x;if(RuntimeInternal.isTrue(!x||(x===new Uint8Array([])))){return new Uint8Array([69,79,90]);}B.n=(RuntimeInternal.getLength(x)-1),B.p=1;return string.sub(x,1,1);};w.zgetc=function(B){let C=(B.p+1);t=B.n;if(RuntimeInternal.isTrue((t>0))){B.n=(t-1),B.p=C;return string.sub(B.data,C,C);}else{return self.fill(self,B);}};a.LuaZ=w;let D={};b=a.LuaP;D.LUA_SIGNATURE=new Uint8Array([92,50,55,76,117,97]);D.LUA_TNUMBER=3;D.LUA_TSTRING=4;D.LUA_TNIL=0;D.LUA_TBOOLEAN=1;D.LUA_TNONE=(-1);D.LUAC_VERSION=81;D.LUAC_FORMAT=0;D.LUAC_HEADERSIZE=12;D.make_setS=function(){let x={};x.data=new Uint8Array([]);let E=function(F,x){if(RuntimeInternal.isTrue(!F)){return 0;}x.data=(RuntimeInternal.concatString(x.data,F));return 0;};return[E,x];};D.ttype=function(d){let G=RuntimeInternal.wrapAmbiguousCall(type(d.value));if(RuntimeInternal.isTrue((G===new Uint8Array([110,117,109,98,101,114])))){return self.LUA_TNUMBER;}else if(RuntimeInternal.isTrue((G===new Uint8Array([115,116,114,105,110,103])))){return self.LUA_TSTRING;}else if(RuntimeInternal.isTrue((G===new Uint8Array([110,105,108])))){return self.LUA_TNIL;}else if(RuntimeInternal.isTrue((G===new Uint8Array([98,111,111,108,101,97,110])))){return self.LUA_TBOOLEAN;}else{return self.LUA_TNONE;}};D.from_double=function(o){let H=function(s){h=(s%256);return[((s-h)/256),string.char(h)];};let I=0;if(RuntimeInternal.isTrue((o<0))){I=1;o=(-o);}let[J,K]=math.frexp(o);if(RuntimeInternal.isTrue((o===0))){J=0,K=0;}else if(RuntimeInternal.isTrue((o===(1/0)))){J=0,K=2047;}else{J=(((J*2)-1)*math.ldexp(0.5,53));K=(K+1022);}let s=new Uint8Array([]),p;o=math.floor(J);for(let c=1;c<=6;c++){o=H(o),p;s=(RuntimeInternal.concatString(s,p));}o=H(((K*16)+o)),p;s=(RuntimeInternal.concatString(s,p));o=H(((I*128)+o)),p;s=(RuntimeInternal.concatString(s,p));return s;};D.from_int=function(o){s=new Uint8Array([]);o=math.floor(o);if(RuntimeInternal.isTrue((o<0))){o=(4294967296+o);}for(let c=1;c<=4;c++){h=(o%256);s=(RuntimeInternal.concatString(s,string.char(h)));o=math.floor((o/256));}return s;};D.DumpBlock=function(f,L){if(RuntimeInternal.isTrue((L.status===0))){L.status=L.write(f,L.data);}};D.DumpChar=function(M,L){self.DumpBlock(self,string.char(M),L);};D.DumpInt=function(o,L){self.DumpBlock(self,self.from_int(self,o),L);};D.DumpNumber=function(o,L){self.DumpBlock(self,self.from_double(self,o),L);};D.DumpString=function(F,L){if(RuntimeInternal.isTrue((F===null))){self.DumpInt(self,0,L);}else{F=(RuntimeInternal.concatString(F,new Uint8Array([92,48])));self.DumpInt(self,RuntimeInternal.getLength(F),L);self.DumpBlock(self,F,L);}};D.DumpCode=function(N,L){t=N.sizecode;self.DumpInt(self,t,L);for(let c=0;c<=(t-1);c++){self.DumpBlock(self,b.Instruction(b,N.code[c]),L);}};D.DumpConstants=function(N,L){t=N.sizek;self.DumpInt(self,t,L);for(let c=0;c<=(t-1);c++){d=N.k[c];let G=RuntimeInternal.wrapAmbiguousCall(self.ttype(self,d));self.DumpChar(self,G,L);if(RuntimeInternal.isTrue((G===self.LUA_TNIL))){}else if(RuntimeInternal.isTrue((G===self.LUA_TBOOLEAN))){self.DumpChar(self,d.value&&1||0,L);}else if(RuntimeInternal.isTrue((G===self.LUA_TNUMBER))){self.DumpNumber(self,d.value,L);}else if(RuntimeInternal.isTrue((G===self.LUA_TSTRING))){self.DumpString(self,d.value,L);}else{}}t=N.sizep;self.DumpInt(self,t,L);for(let c=0;c<=(t-1);c++){self.DumpFunction(self,N.p[c],N.source,L);}};D.DumpDebug=function(N,L){let t;t=L.strip&&0||N.sizelineinfo;self.DumpInt(self,t,L);for(let c=0;c<=(t-1);c++){self.DumpInt(self,N.lineinfo[c],L);}t=L.strip&&0||N.sizelocvars;self.DumpInt(self,t,L);for(let c=0;c<=(t-1);c++){self.DumpString(self,N.locvars[c].varname,L);self.DumpInt(self,N.locvars[c].startpc,L);self.DumpInt(self,N.locvars[c].endpc,L);}t=L.strip&&0||N.sizeupvalues;self.DumpInt(self,t,L);for(let c=0;c<=(t-1);c++){self.DumpString(self,N.upvalues[c],L);}};D.DumpFunction=function(N,C,L){let O=N.source;if(RuntimeInternal.isTrue((O===C)||L.strip)){O=null;}self.DumpString(self,O,L);self.DumpInt(self,N.lineDefined,L);self.DumpInt(self,N.lastlinedefined,L);self.DumpChar(self,N.nups,L);self.DumpChar(self,N.numparams,L);self.DumpChar(self,N.is_vararg,L);self.DumpChar(self,N.maxstacksize,L);self.DumpCode(self,N,L);self.DumpConstants(self,N,L);self.DumpDebug(self,N,L);};D.DumpHeader=function(L){let P=RuntimeInternal.wrapAmbiguousCall(self.header(self));assert((RuntimeInternal.getLength(P)===self.LUAC_HEADERSIZE));self.DumpBlock(self,P,L);};D.header=function(){let o=1;return (RuntimeInternal.concatString(self.LUA_SIGNATURE,string.char(self.LUAC_VERSION,self.LUAC_FORMAT,o,4,4,4,8,0)));};D.dump=function(Q,N,R,y,S){let L={};L.L=Q;L.write=R;L.data=y;L.strip=S;L.status=0;self.DumpHeader(self,L);self.DumpFunction(self,N,null,L);L.write(null,L.data);return L.status;};a.LuaU=D;w=a.LuaZ;let T={};T.RESERVED=new Uint8Array([13,10,84,75,95,65,78,68,32,97,110,100,13,10,84,75,95,66,82,69,65,75,32,98,114,101,97,107,13,10,84,75,95,68,79,32,100,111,13,10,84,75,95,69,76,83,69,32,101,108,115,101,13,10,84,75,95,69,76,83,69,73,70,32,101,108,115,101,105,102,13,10,84,75,95,69,78,68,32,101,110,100,13,10,84,75,95,70,65,76,83,69,32,102,97,108,115,101,13,10,84,75,95,70,79,82,32,102,111,114,13,10,84,75,95,70,85,78,67,84,73,79,78,32,102,117,110,99,116,105,111,110,13,10,84,75,95,73,70,32,105,102,13,10,84,75,95,73,78,32,105,110,13,10,84,75,95,76,79,67,65,76,32,108,111,99,97,108,13,10,84,75,95,78,73,76,32,110,105,108,13,10,84,75,95,78,79,84,32,110,111,116,13,10,84,75,95,79,82,32,111,114,13,10,84,75,95,82,69,80,69,65,84,32,114,101,112,101,97,116,13,10,84,75,95,82,69,84,85,82,78,32,114,101,116,117,114,110,13,10,84,75,95,84,72,69,78,32,116,104,101,110,13,10,84,75,95,84,82,85,69,32,116,114,117,101,13,10,84,75,95,85,78,84,73,76,32,117,110,116,105,108,13,10,84,75,95,87,72,73,76,69,32,119,104,105,108,101,13,10,84,75,95,67,79,78,67,65,84,32,46,46,13,10,84,75,95,68,79,84,83,32,46,46,46,13,10,84,75,95,69,81,32,61,61,13,10,84,75,95,71,69,32,62,61,13,10,84,75,95,76,69,32,60,61,13,10,84,75,95,78,69,32,126,61,13,10,84,75,95,78,65,77,69,32,60,110,97,109,101,62,13,10,84,75,95,78,85,77,66,69,82,32,60,110,117,109,98,101,114,62,13,10,84,75,95,83,84,82,73,78,71,32,60,115,116,114,105,110,103,62,13,10,84,75,95,69,79,83,32,60,101,111,102,62]);T.MAXSRC=80;T.MAX_INT=2147483645;T.LUA_QS=new Uint8Array([39,37,115,39]);T.LUA_COMPAT_LSTR=1;T.init=function(){let U={},V={};let _=string.gmatch(self.RESERVED,new Uint8Array([91,94,92,110,93,43])),_f,_s,_v;if(typeof _=='object'){[_f,_s,_v]=_}else{_f=_}while(true){let[s]=_f(_s,_v);_v=s;if(_v==null||_v==undefined){break}let[Waaa,W,X,Y]=string.find(s,new Uint8Array([40,37,83,43,41,37,115,43,40,37,83,43,41]));U[X]=Y;V[Y]=X;}self.tokens=U;self.enums=V;};T.chunkid=function(O,Z){let _;let a0=RuntimeInternal.wrapAmbiguousCall(string.sub(O,1,1));if(RuntimeInternal.isTrue((a0===new Uint8Array([61])))){_=string.sub(O,2,Z);}else{if(RuntimeInternal.isTrue((a0===new Uint8Array([64])))){O=string.sub(O,2);Z=(Z-RuntimeInternal.getLength(new Uint8Array([32,39,46,46,46,39,32])));let a1=RuntimeInternal.getLength(O);_=new Uint8Array([]);if(RuntimeInternal.isTrue((a1>Z))){O=string.sub(O,((1+a1)-Z));_=(RuntimeInternal.concatString(_,new Uint8Array([46,46,46])));}_=(RuntimeInternal.concatString(_,O));}else{let a2=RuntimeInternal.wrapAmbiguousCall(string.find(O,new Uint8Array([91,92,110,92,114,93])));a2=a2&&(a2-1)||RuntimeInternal.getLength(O);Z=(Z-RuntimeInternal.getLength(new Uint8Array([32,91,115,116,114,105,110,103,32,92,34,46,46,46,92,34,93,32])));if(RuntimeInternal.isTrue((a2>Z))){a2=Z;}_=new Uint8Array([91,115,116,114,105,110,103,32,92,34]);if(RuntimeInternal.isTrue((a2<RuntimeInternal.getLength(O)))){_=(RuntimeInternal.concatString(_,(RuntimeInternal.concatString(string.sub(O,1,a2),new Uint8Array([46,46,46])))));}else{_=(RuntimeInternal.concatString(_,O));}_=(RuntimeInternal.concatString(_,new Uint8Array([92,34,93])));}}return _;};T.token2str=function(a3,a4){if(RuntimeInternal.isTrue((string.sub(a4,1,3)!==new Uint8Array([84,75,95])))){if(RuntimeInternal.isTrue(string.find(a4,new Uint8Array([37,99])))){return string.format(new Uint8Array([99,104,97,114,40,37,100,41]),string.byte(a4));}return a4;}else{}return self.tokens[a4];};T.lexerror=function(a3,a5,a4){let a6=function(a3,a4){if(RuntimeInternal.isTrue((a4===new Uint8Array([84,75,95,78,65,77,69]))||(a4===new Uint8Array([84,75,95,83,84,82,73,78,71]))||(a4===new Uint8Array([84,75,95,78,85,77,66,69,82])))){return a3.buff;}else{return self.token2str(self,a3,a4);}};x=RuntimeInternal.wrapAmbiguousCall(self.chunkid(self,a3.source,self.MAXSRC));let a5=RuntimeInternal.wrapAmbiguousCall(string.format(new Uint8Array([37,115,58,37,100,58,32,37,115]),x,a3.linenumber,a5));if(RuntimeInternal.isTrue(a4)){a5=string.format((RuntimeInternal.concatString(new Uint8Array([37,115,32,110,101,97,114,32]),self.LUA_QS)),a5,a6(a3,a4));}error(a5);};T.syntaxerror=function(a3,a5){self.lexerror(self,a3,a5,a3.t.token);};T.currIsNewline=function(a3){return (a3.current===new Uint8Array([92,110]))||(a3.current===new Uint8Array([92,114]));};T.inclinenumber=function(a3){let a7=a3.current;self.nextc(self,a3);if(RuntimeInternal.isTrue(self.currIsNewline(self,a3)&&(a3.current!==a7))){self.nextc(self,a3);}a3.linenumber=(a3.linenumber+1);if(RuntimeInternal.isTrue((a3.linenumber>=self.MAX_INT))){self.syntaxerror(self,a3,new Uint8Array([99,104,117,110,107,32,104,97,115,32,116,111,111,32,109,97,110,121,32,108,105,110,101,115]));}};T.setinput=function(Q,a3,B,O){if(RuntimeInternal.isTrue(!a3)){a3={};}if(RuntimeInternal.isTrue(!a3.lookahead)){a3.lookahead={};}if(RuntimeInternal.isTrue(!a3.t)){a3.t={};}a3.decpoint=new Uint8Array([46]);a3.L=Q;a3.lookahead.token=new Uint8Array([84,75,95,69,79,83]);a3.z=B;a3.fs=null;a3.linenumber=1;a3.lastline=1;a3.source=O;self.nextc(self,a3);};T.check_next=function(a3,a8){if(RuntimeInternal.isTrue(!string.find(a8,a3.current,1,1))){return false;}self.save_and_next(self,a3);return true;};T.next=function(a3){a3.lastline=a3.linenumber;if(RuntimeInternal.isTrue((a3.lookahead.token!==new Uint8Array([84,75,95,69,79,83])))){a3.t.seminfo=a3.lookahead.seminfo;a3.t.token=a3.lookahead.token;a3.lookahead.token=new Uint8Array([84,75,95,69,79,83]);}else{a3.t.token=self.llex(self,a3,a3.t);}};T.lookahead=function(a3){a3.lookahead.token=self.llex(self,a3,a3.lookahead);};T.nextc=function(a3){h=RuntimeInternal.wrapAmbiguousCall(w.zgetc(w,a3.z));a3.current=h;return h;};T.save=function(a3,h){x=a3.buff;a3.buff=(RuntimeInternal.concatString(x,h));};T.save_and_next=function(a3){self.save(self,a3,a3.current);return self.nextc(self,a3);};T.str2d=function(F){let a9=RuntimeInternal.wrapAmbiguousCall(tonumber(F));if(RuntimeInternal.isTrue(a9)){return a9;}if(RuntimeInternal.isTrue((string.lower(string.sub(F,1,2))===new Uint8Array([48,120])))){a9=tonumber(F,16);if(RuntimeInternal.isTrue(a9)){return a9;}}return null;};T.buffreplace=function(a3,aa,ab){let a9=new Uint8Array([]);x=a3.buff;for(let C=1;C<=RuntimeInternal.getLength(x);C++){h=RuntimeInternal.wrapAmbiguousCall(string.sub(x,C,C));if(RuntimeInternal.isTrue((h===aa))){h=ab;}a9=(RuntimeInternal.concatString(a9,h));}a3.buff=a9;};T.trydecpoint=function(a3,ac){a7=a3.decpoint;self.buffreplace(self,a3,a7,a3.decpoint);let ad=RuntimeInternal.wrapAmbiguousCall(self.str2d(self,a3.buff));ac.seminfo=ad;if(RuntimeInternal.isTrue(!ad)){self.buffreplace(self,a3,a3.decpoint,new Uint8Array([46]));self.lexerror(self,a3,new Uint8Array([109,97,108,102,111,114,109,101,100,32,110,117,109,98,101,114]),new Uint8Array([84,75,95,78,85,77,66,69,82]));}};T.read_numeral=function(a3,ac){do{self.save_and_next(self,a3);}while(RuntimeInternal.isTrue(string.find(a3.current,new Uint8Array([37,68]))&&(a3.current!==new Uint8Array([46]))));if(RuntimeInternal.isTrue(self.check_next(self,a3,new Uint8Array([69,101])))){self.check_next(self,a3,new Uint8Array([43,45]));}while(RuntimeInternal.isTrue(string.find(a3.current,new Uint8Array([94,37,119,36]))||(a3.current===new Uint8Array([95])))){self.save_and_next(self,a3);}self.buffreplace(self,a3,new Uint8Array([46]),a3.decpoint);let ad=RuntimeInternal.wrapAmbiguousCall(self.str2d(self,a3.buff));ac.seminfo=ad;if(RuntimeInternal.isTrue(!ad)){self.trydecpoint(self,a3,ac);}};T.skip_sep=function(a3){let ae=0;let F=a3.current;self.save_and_next(self,a3);while(RuntimeInternal.isTrue((a3.current===new Uint8Array([61])))){self.save_and_next(self,a3);ae=(ae+1);}return (a3.current===F)&&ae||((-ae)-1);};T.read_long_string=function(a3,ac,af){let ag=0;self.save_and_next(self,a3);if(RuntimeInternal.isTrue(self.currIsNewline(self,a3))){self.inclinenumber(self,a3);}while(RuntimeInternal.isTrue(true)){h=a3.current;if(RuntimeInternal.isTrue((h===new Uint8Array([69,79,90])))){self.lexerror(self,a3,ac&&new Uint8Array([117,110,102,105,110,105,115,104,101,100,32,108,111,110,103,32,115,116,114,105,110,103])||new Uint8Array([117,110,102,105,110,105,115,104,101,100,32,108,111,110,103,32,99,111,109,109,101,110,116]),new Uint8Array([84,75,95,69,79,83]));}else if(RuntimeInternal.isTrue((h===new Uint8Array([91])))){if(RuntimeInternal.isTrue(self.LUA_COMPAT_LSTR)){if(RuntimeInternal.isTrue((self.skip_sep(self,a3)===af))){self.save_and_next(self,a3);ag=(ag+1);if(RuntimeInternal.isTrue((self.LUA_COMPAT_LSTR===1))){if(RuntimeInternal.isTrue((af===0))){self.lexerror(self,a3,new Uint8Array([110,101,115,116,105,110,103,32,111,102,32,91,91,46,46,46,93,93,32,105,115,32,100,101,112,114,101,99,97,116,101,100]),new Uint8Array([91]));}}}}}else if(RuntimeInternal.isTrue((h===new Uint8Array([93])))){if(RuntimeInternal.isTrue((self.skip_sep(self,a3)===af))){self.save_and_next(self,a3);if(RuntimeInternal.isTrue(self.LUA_COMPAT_LSTR&&(self.LUA_COMPAT_LSTR===2))){ag=(ag-1);if(RuntimeInternal.isTrue((af===0)&&(ag>=0))){break;}}break;}}else if(RuntimeInternal.isTrue(self.currIsNewline(self,a3))){self.save(self,a3,new Uint8Array([92,110]));self.inclinenumber(self,a3);if(RuntimeInternal.isTrue(!ac)){a3.buff=new Uint8Array([]);}}else{if(RuntimeInternal.isTrue(ac)){self.save_and_next(self,a3);}else{self.nextc(self,a3);}}}if(RuntimeInternal.isTrue(ac)){C=(3+af);ac.seminfo=string.sub(a3.buff,C,(-C));}};T.read_string=function(a3,ah,ac){self.save_and_next(self,a3);while(RuntimeInternal.isTrue((a3.current!==ah))){h=a3.current;if(RuntimeInternal.isTrue((h===new Uint8Array([69,79,90])))){self.lexerror(self,a3,new Uint8Array([117,110,102,105,110,105,115,104,101,100,32,115,116,114,105,110,103]),new Uint8Array([84,75,95,69,79,83]));}else if(RuntimeInternal.isTrue(self.currIsNewline(self,a3))){self.lexerror(self,a3,new Uint8Array([117,110,102,105,110,105,115,104,101,100,32,115,116,114,105,110,103]),new Uint8Array([84,75,95,83,84,82,73,78,71]));}else if(RuntimeInternal.isTrue((h===new Uint8Array([92,92])))){h=self.nextc(self,a3);if(RuntimeInternal.isTrue(self.currIsNewline(self,a3))){self.save(self,a3,new Uint8Array([92,110]));self.inclinenumber(self,a3);}else if(RuntimeInternal.isTrue((h!==new Uint8Array([69,79,90])))){c=RuntimeInternal.wrapAmbiguousCall(string.find(new Uint8Array([97,98,102,110,114,116,118]),h,1,1));if(RuntimeInternal.isTrue(c)){self.save(self,a3,string.sub(new Uint8Array([92,97,92,98,92,102,92,110,92,114,92,116,92,118]),c,c));self.nextc(self,a3);}else if(RuntimeInternal.isTrue(!string.find(h,new Uint8Array([37,100])))){self.save_and_next(self,a3);}else{h=0,c=0;do{h=((10*h)+a3.current);self.nextc(self,a3);c=(c+1);}while(RuntimeInternal.isTrue((c>=3)||!string.find(a3.current,new Uint8Array([37,100]))));if(RuntimeInternal.isTrue((h>255))){self.lexerror(self,a3,new Uint8Array([101,115,99,97,112,101,32,115,101,113,117,101,110,99,101,32,116,111,111,32,108,97,114,103,101]),new Uint8Array([84,75,95,83,84,82,73,78,71]));}self.save(self,a3,string.char(h));}}}else{self.save_and_next(self,a3);}}self.save_and_next(self,a3);ac.seminfo=string.sub(a3.buff,2,(-2));};T.llex=function(a3,ac){a3.buff=new Uint8Array([]);while(RuntimeInternal.isTrue(true)){h=a3.current;if(RuntimeInternal.isTrue(self.currIsNewline(self,a3))){self.inclinenumber(self,a3);}else if(RuntimeInternal.isTrue((h===new Uint8Array([45])))){h=self.nextc(self,a3);if(RuntimeInternal.isTrue((h!==new Uint8Array([45])))){return new Uint8Array([45]);}let af=(-1);if(RuntimeInternal.isTrue((self.nextc(self,a3)===new Uint8Array([91])))){af=self.skip_sep(self,a3);a3.buff=new Uint8Array([]);}if(RuntimeInternal.isTrue((af>=0))){self.read_long_string(self,a3,null,af);a3.buff=new Uint8Array([]);}else{while(RuntimeInternal.isTrue(!self.currIsNewline(self,a3)&&(a3.current!==new Uint8Array([69,79,90])))){self.nextc(self,a3);}}}else if(RuntimeInternal.isTrue((h===new Uint8Array([91])))){af=RuntimeInternal.wrapAmbiguousCall(self.skip_sep(self,a3));if(RuntimeInternal.isTrue((af>=0))){self.read_long_string(self,a3,ac,af);return new Uint8Array([84,75,95,83,84,82,73,78,71]);}else if(RuntimeInternal.isTrue((af===(-1)))){return new Uint8Array([91]);}else{self.lexerror(self,a3,new Uint8Array([105,110,118,97,108,105,100,32,108,111,110,103,32,115,116,114,105,110,103,32,100,101,108,105,109,105,116,101,114]),new Uint8Array([84,75,95,83,84,82,73,78,71]));}}else if(RuntimeInternal.isTrue((h===new Uint8Array([61])))){h=self.nextc(self,a3);if(RuntimeInternal.isTrue((h!==new Uint8Array([61])))){return new Uint8Array([61]);}else{self.nextc(self,a3);return new Uint8Array([84,75,95,69,81]);}}else if(RuntimeInternal.isTrue((h===new Uint8Array([60])))){h=self.nextc(self,a3);if(RuntimeInternal.isTrue((h!==new Uint8Array([61])))){return new Uint8Array([60]);}else{self.nextc(self,a3);return new Uint8Array([84,75,95,76,69]);}}else if(RuntimeInternal.isTrue((h===new Uint8Array([62])))){h=self.nextc(self,a3);if(RuntimeInternal.isTrue((h!==new Uint8Array([61])))){return new Uint8Array([62]);}else{self.nextc(self,a3);return new Uint8Array([84,75,95,71,69]);}}else if(RuntimeInternal.isTrue((h===new Uint8Array([126])))){h=self.nextc(self,a3);if(RuntimeInternal.isTrue((h!==new Uint8Array([61])))){return new Uint8Array([126]);}else{self.nextc(self,a3);return new Uint8Array([84,75,95,78,69]);}}else if(RuntimeInternal.isTrue((h===new Uint8Array([92,34]))||(h===new Uint8Array([39])))){self.read_string(self,a3,h,ac);return new Uint8Array([84,75,95,83,84,82,73,78,71]);}else if(RuntimeInternal.isTrue((h===new Uint8Array([46])))){h=self.save_and_next(self,a3);if(RuntimeInternal.isTrue(self.check_next(self,a3,new Uint8Array([46])))){if(RuntimeInternal.isTrue(self.check_next(self,a3,new Uint8Array([46])))){return new Uint8Array([84,75,95,68,79,84,83]);}else{return new Uint8Array([84,75,95,67,79,78,67,65,84]);}}else if(RuntimeInternal.isTrue(!string.find(h,new Uint8Array([37,100])))){return new Uint8Array([46]);}else{self.read_numeral(self,a3,ac);return new Uint8Array([84,75,95,78,85,77,66,69,82]);}}else if(RuntimeInternal.isTrue((h===new Uint8Array([69,79,90])))){return new Uint8Array([84,75,95,69,79,83]);}else{if(RuntimeInternal.isTrue(string.find(h,new Uint8Array([37,115])))){self.nextc(self,a3);}else if(RuntimeInternal.isTrue(string.find(h,new Uint8Array([37,100])))){self.read_numeral(self,a3,ac);return new Uint8Array([84,75,95,78,85,77,66,69,82]);}else if(RuntimeInternal.isTrue(string.find(h,new Uint8Array([91,95,37,97,93])))){do{h=self.save_and_next(self,a3);}while(RuntimeInternal.isTrue((h===new Uint8Array([69,79,90]))||!string.find(h,new Uint8Array([91,95,37,119,93]))));let ai=a3.buff;let X=self.enums[ai];if(RuntimeInternal.isTrue(X)){return X;}ac.seminfo=ai;return new Uint8Array([84,75,95,78,65,77,69]);}else{self.nextc(self,a3);return h;}}}};a.LuaX=T;let aj={};b=a.LuaP;T=a.LuaX;aj.MAXSTACK=250;aj.ttisnumber=function(d){if(RuntimeInternal.isTrue(d)){return (type(d.value)===new Uint8Array([110,117,109,98,101,114]));}else{return false;}};aj.nvalue=function(d){return d.value;};aj.setnilvalue=function(d){d.value=null;};aj.setsvalue=function(d,o){d.value=o;};aj.setnvalue=aj.setsvalue;aj.sethvalue=aj.setsvalue;aj.setbvalue=aj.setsvalue;aj.numadd=function(g,f){return (g+f);};aj.numsub=function(g,f){return (g-f);};aj.nummul=function(g,f){return (g*f);};aj.numdiv=function(g,f){return (g/f);};aj.nummod=function(g,f){return (g%f);};aj.numpow=function(g,f){return (g**f);};aj.numunm=function(g){return (-g);};aj.numisnan=function(g){return (!g===g);};aj.NO_JUMP=(-1);aj.BinOpr={['OPR_ADD']:0,['OPR_SUB']:1,['OPR_MUL']:2,['OPR_DIV']:3,['OPR_MOD']:4,['OPR_POW']:5,['OPR_CONCAT']:6,['OPR_NE']:7,['OPR_EQ']:8,['OPR_LT']:9,['OPR_LE']:10,['OPR_GT']:11,['OPR_GE']:12,['OPR_AND']:13,['OPR_OR']:14,['OPR_NOBINOPR']:15};aj.UnOpr={['OPR_MINUS']:0,['OPR_NOT']:1,['OPR_LEN']:2,['OPR_NOUNOPR']:3};aj.getcode=function(ak,al){return ak.f.code[al.info];};aj.codeAsBx=function(ak,d,am,an){return self.codeABx(self,ak,d,am,(an+b.MAXARG_sBx));};aj.setmultret=function(ak,al){self.setreturns(self,ak,al,luaY.LUA_MULTRET);};aj.hasjumps=function(al){return (al.t!==al.f);};aj.isnumeral=function(al){return (al.k===new Uint8Array([86,75,78,85,77]))&&(al.t===self.NO_JUMP)&&(al.f===self.NO_JUMP);};aj._nil=function(ak,aa,t){if(RuntimeInternal.isTrue((ak.pc>ak.lasttarget))){if(RuntimeInternal.isTrue((ak.pc===0))){if(RuntimeInternal.isTrue((aa>=ak.nactvar))){return;}}else{let ao=ak.f.code[(ak.pc-1)];if(RuntimeInternal.isTrue((b.GET_OPCODE(b,ao)===new Uint8Array([79,80,95,76,79,65,68,78,73,76])))){let ap=RuntimeInternal.wrapAmbiguousCall(b.GETARG_A(b,ao));let aq=RuntimeInternal.wrapAmbiguousCall(b.GETARG_B(b,ao));if(RuntimeInternal.isTrue((ap<=aa)&&(aa<=(aq+1)))){if(RuntimeInternal.isTrue((((aa+t)-1)>aq))){b.SETARG_B(b,ao,((aa+t)-1));}return;}}}}self.codeABC(self,ak,new Uint8Array([79,80,95,76,79,65,68,78,73,76]),aa,((aa+t)-1),0);};aj.jump=function(ak){let ar=ak.jpc;ak.jpc=self.NO_JUMP;let as=RuntimeInternal.wrapAmbiguousCall(self.codeAsBx(self,ak,new Uint8Array([79,80,95,74,77,80]),0,self.NO_JUMP));as=self.concat(self,ak,as,ar);return as;};aj.ret=function(ak,a0,at){self.codeABC(self,ak,new Uint8Array([79,80,95,82,69,84,85,82,78]),a0,(at+1),0);};aj.condjump=function(ak,q,am,au,av){self.codeABC(self,ak,q,am,au,av);return self.jump(self,ak);};aj.fixjump=function(ak,aw,ax){let ay=ak.f.code[aw];let az=(ax-(aw+1));assert((ax!==self.NO_JUMP));if(RuntimeInternal.isTrue((math.abs(az)>b.MAXARG_sBx))){T.syntaxerror(T,ak.ls,new Uint8Array([99,111,110,116,114,111,108,32,115,116,114,117,99,116,117,114,101,32,116,111,111,32,108,111,110,103]));}b.SETARG_sBx(b,ay,az);};aj.getlabel=function(ak){ak.lasttarget=ak.pc;return ak.pc;};aj.getjump=function(ak,aw){az=RuntimeInternal.wrapAmbiguousCall(b.GETARG_sBx(b,ak.f.code[aw]));if(RuntimeInternal.isTrue((az===self.NO_JUMP))){return self.NO_JUMP;}else{return ((aw+1)+az);}};aj.getjumpcontrol=function(ak,aw){let aA=ak.f.code[aw];let aB=ak.f.code[(aw-1)];if(RuntimeInternal.isTrue((aw>=1)&&(b.testTMode(b,b.GET_OPCODE(b,aB))!==0))){return aB;}else{return aA;}};aj.need_value=function(ak,aC){while(RuntimeInternal.isTrue((aC!==self.NO_JUMP))){c=RuntimeInternal.wrapAmbiguousCall(self.getjumpcontrol(self,ak,aC));if(RuntimeInternal.isTrue((b.GET_OPCODE(b,c)!==new Uint8Array([79,80,95,84,69,83,84,83,69,84])))){return true;}aC=self.getjump(self,ak,aC);}return false;};aj.patchtestreg=function(ak,aD,aE){c=RuntimeInternal.wrapAmbiguousCall(self.getjumpcontrol(self,ak,aD));if(RuntimeInternal.isTrue((b.GET_OPCODE(b,c)!==new Uint8Array([79,80,95,84,69,83,84,83,69,84])))){return false;}if(RuntimeInternal.isTrue((aE!==b.NO_REG)&&(aE!==b.GETARG_B(b,c)))){b.SETARG_A(b,c,aE);}else{b.SET_OPCODE(b,c,new Uint8Array([79,80,95,84,69,83,84]));f=RuntimeInternal.wrapAmbiguousCall(b.GETARG_B(b,c));b.SETARG_A(b,c,f);b.SETARG_B(b,c,0);}return true;};aj.removevalues=function(ak,aC){while(RuntimeInternal.isTrue((aC!==self.NO_JUMP))){self.patchtestreg(self,ak,aC,b.NO_REG);aC=self.getjump(self,ak,aC);}};aj.patchlistaux=function(ak,aC,aF,aE,aG){while(RuntimeInternal.isTrue((aC!==self.NO_JUMP))){let aH=RuntimeInternal.wrapAmbiguousCall(self.getjump(self,ak,aC));if(RuntimeInternal.isTrue(self.patchtestreg(self,ak,aC,aE))){self.fixjump(self,ak,aC,aF);}else{self.fixjump(self,ak,aC,aG);}aC=aH;}};aj.dischargejpc=function(ak){self.patchlistaux(self,ak,ak.jpc,ak.pc,b.NO_REG,ak.pc);ak.jpc=self.NO_JUMP;};aj.patchlist=function(ak,aC,aI){if(RuntimeInternal.isTrue((aI===ak.pc))){self.patchtohere(self,ak,aC);}else{assert((aI<ak.pc));self.patchlistaux(self,ak,aC,aI,b.NO_REG,aI);}};aj.patchtohere=function(ak,aC){self.getlabel(self,ak);ak.jpc=self.concat(self,ak,ak.jpc,aC);};aj.concat=function(ak,aJ,aK){if(RuntimeInternal.isTrue((aK===self.NO_JUMP))){return aJ;}else if(RuntimeInternal.isTrue((aJ===self.NO_JUMP))){return aK;}else{let aC=aJ;let aH=RuntimeInternal.wrapAmbiguousCall(self.getjump(self,ak,aC));while(RuntimeInternal.isTrue((aH!==self.NO_JUMP))){aC=aH;aH=self.getjump(self,ak,aC);}self.fixjump(self,ak,aC,aK);}return aJ;};aj.checkstack=function(ak,t){let aL=(ak.freereg+t);if(RuntimeInternal.isTrue((aL>ak.f.maxstacksize))){if(RuntimeInternal.isTrue((aL>=self.MAXSTACK))){T.syntaxerror(T,ak.ls,new Uint8Array([102,117,110,99,116,105,111,110,32,111,114,32,101,120,112,114,101,115,115,105,111,110,32,116,111,111,32,99,111,109,112,108,101,120]));}ak.f.maxstacksize=aL;}};aj.reserveregs=function(ak,t){self.checkstack(self,ak,t);ak.freereg=(ak.freereg+t);};aj.freereg=function(ak,aE){if(RuntimeInternal.isTrue(!b.ISK(b,aE)&&(aE>=ak.nactvar))){ak.freereg=(ak.freereg-1);assert((aE===ak.freereg));}};aj.freeexp=function(ak,al){if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,78,79,78,82,69,76,79,67])))){self.freereg(self,ak,al.info);}};aj.addk=function(ak,aM,s){let Q=ak.L;let aN=ak.h[aM.value];let N=ak.f;if(RuntimeInternal.isTrue(self.ttisnumber(self,aN))){return self.nvalue(self,aN);}else{aN={};self.setnvalue(self,aN,ak.nk);ak.h[aM.value]=aN;luaY.growvector(luaY,Q,N.k,ak.nk,N.sizek,null,b.MAXARG_Bx,new Uint8Array([99,111,110,115,116,97,110,116,32,116,97,98,108,101,32,111,118,101,114,102,108,111,119]));N.k[ak.nk]=s;let aO=ak.nk;ak.nk=(ak.nk+1);return aO;}};aj.stringK=function(ak,F){d={};self.setsvalue(self,d,F);return self.addk(self,ak,d,d);};aj.numberK=function(ak,aP){d={};self.setnvalue(self,d,aP);return self.addk(self,ak,d,d);};aj.boolK=function(ak,f){d={};self.setbvalue(self,d,f);return self.addk(self,ak,d,d);};aj.nilK=function(ak){let aM={};s={};self.setnilvalue(self,s);self.sethvalue(self,aM,ak.h);return self.addk(self,ak,aM,s);};aj.setreturns=function(ak,al,aQ){if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,67,65,76,76])))){b.SETARG_C(b,self.getcode(self,ak,al),(aQ+1));}else if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,86,65,82,65,82,71])))){b.SETARG_B(b,self.getcode(self,ak,al),(aQ+1));b.SETARG_A(b,self.getcode(self,ak,al),ak.freereg);aj.reserveregs(aj,ak,1);}};aj.setoneret=function(ak,al){if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,67,65,76,76])))){al.k=new Uint8Array([86,78,79,78,82,69,76,79,67]);al.info=b.GETARG_A(b,self.getcode(self,ak,al));}else if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,86,65,82,65,82,71])))){b.SETARG_B(b,self.getcode(self,ak,al),2);al.k=new Uint8Array([86,82,69,76,79,67,65,66,76,69]);}};aj.dischargevars=function(ak,al){aM=al.k;if(RuntimeInternal.isTrue((aM===new Uint8Array([86,76,79,67,65,76])))){al.k=new Uint8Array([86,78,79,78,82,69,76,79,67]);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,85,80,86,65,76])))){al.info=self.codeABC(self,ak,new Uint8Array([79,80,95,71,69,84,85,80,86,65,76]),0,al.info,0);al.k=new Uint8Array([86,82,69,76,79,67,65,66,76,69]);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,71,76,79,66,65,76])))){al.info=self.codeABx(self,ak,new Uint8Array([79,80,95,71,69,84,71,76,79,66,65,76]),0,al.info);al.k=new Uint8Array([86,82,69,76,79,67,65,66,76,69]);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,73,78,68,69,88,69,68])))){self.freereg(self,ak,al.aux);self.freereg(self,ak,al.info);al.info=self.codeABC(self,ak,new Uint8Array([79,80,95,71,69,84,84,65,66,76,69]),0,al.info,al.aux);al.k=new Uint8Array([86,82,69,76,79,67,65,66,76,69]);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,86,65,82,65,82,71]))||(aM===new Uint8Array([86,67,65,76,76])))){self.setoneret(self,ak,al);}else{}};aj.code_label=function(ak,am,f,aR){self.getlabel(self,ak);return self.codeABC(self,ak,new Uint8Array([79,80,95,76,79,65,68,66,79,79,76]),am,f,aR);};aj.discharge2reg=function(ak,al,aE){self.dischargevars(self,ak,al);aM=al.k;if(RuntimeInternal.isTrue((aM===new Uint8Array([86,78,73,76])))){self._nil(self,ak,aE,1);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,70,65,76,83,69]))||(aM===new Uint8Array([86,84,82,85,69])))){self.codeABC(self,ak,new Uint8Array([79,80,95,76,79,65,68,66,79,79,76]),aE,(al.k===new Uint8Array([86,84,82,85,69]))&&1||0,0);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,75])))){self.codeABx(self,ak,new Uint8Array([79,80,95,76,79,65,68,75]),aE,al.info);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,75,78,85,77])))){self.codeABx(self,ak,new Uint8Array([79,80,95,76,79,65,68,75]),aE,self.numberK(self,ak,al.nval));}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,82,69,76,79,67,65,66,76,69])))){let aw=RuntimeInternal.wrapAmbiguousCall(self.getcode(self,ak,al));b.SETARG_A(b,aw,aE);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,78,79,78,82,69,76,79,67])))){if(RuntimeInternal.isTrue((aE!==al.info))){self.codeABC(self,ak,new Uint8Array([79,80,95,77,79,86,69]),aE,al.info,0);}}else{assert((al.k===new Uint8Array([86,86,79,73,68]))||(al.k===new Uint8Array([86,74,77,80])));return;}al.info=aE;al.k=new Uint8Array([86,78,79,78,82,69,76,79,67]);};aj.discharge2anyreg=function(ak,al){if(RuntimeInternal.isTrue((al.k!==new Uint8Array([86,78,79,78,82,69,76,79,67])))){self.reserveregs(self,ak,1);self.discharge2reg(self,ak,al,(ak.freereg-1));}};aj.exp2reg=function(ak,al,aE){self.discharge2reg(self,ak,al,aE);if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,74,77,80])))){al.t=self.concat(self,ak,al.t,al.info);}if(RuntimeInternal.isTrue(self.hasjumps(self,al))){let aS;let aT=self.NO_JUMP;let aU=self.NO_JUMP;if(RuntimeInternal.isTrue(self.need_value(self,ak,al.t)||self.need_value(self,ak,al.f))){let aV=(al.k===new Uint8Array([86,74,77,80]))&&self.NO_JUMP||self.jump(self,ak);aT=self.code_label(self,ak,aE,0,1);aU=self.code_label(self,ak,aE,1,0);self.patchtohere(self,ak,aV);}aS=self.getlabel(self,ak);self.patchlistaux(self,ak,al.f,aS,aE,aT);self.patchlistaux(self,ak,al.t,aS,aE,aU);}al.f=self.NO_JUMP,al.t=self.NO_JUMP;al.info=aE;al.k=new Uint8Array([86,78,79,78,82,69,76,79,67]);};aj.exp2nextreg=function(ak,al){self.dischargevars(self,ak,al);self.freeexp(self,ak,al);self.reserveregs(self,ak,1);self.exp2reg(self,ak,al,(ak.freereg-1));};aj.exp2anyreg=function(ak,al){self.dischargevars(self,ak,al);if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,78,79,78,82,69,76,79,67])))){if(RuntimeInternal.isTrue(!self.hasjumps(self,al))){return al.info;}if(RuntimeInternal.isTrue((al.info>=ak.nactvar))){self.exp2reg(self,ak,al,al.info);return al.info;}}self.exp2nextreg(self,ak,al);return al.info;};aj.exp2val=function(ak,al){if(RuntimeInternal.isTrue(self.hasjumps(self,al))){self.exp2anyreg(self,ak,al);}else{self.dischargevars(self,ak,al);}};aj.exp2RK=function(ak,al){self.exp2val(self,ak,al);aM=al.k;if(RuntimeInternal.isTrue((aM===new Uint8Array([86,75,78,85,77]))||(aM===new Uint8Array([86,84,82,85,69]))||(aM===new Uint8Array([86,70,65,76,83,69]))||(aM===new Uint8Array([86,78,73,76])))){if(RuntimeInternal.isTrue((ak.nk<=b.MAXINDEXRK))){if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,78,73,76])))){al.info=self.nilK(self,ak);}else{al.info=(al.k===new Uint8Array([86,75,78,85,77]))&&self.numberK(self,ak,al.nval)||self.boolK(self,ak,(al.k===new Uint8Array([86,84,82,85,69])));}al.k=new Uint8Array([86,75]);return b.RKASK(b,al.info);}}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,75])))){if(RuntimeInternal.isTrue((al.info<=b.MAXINDEXRK))){return b.RKASK(b,al.info);}}else{}return self.exp2anyreg(self,ak,al);};aj.storevar=function(ak,aW,aX){aM=aW.k;if(RuntimeInternal.isTrue((aM===new Uint8Array([86,76,79,67,65,76])))){self.freeexp(self,ak,aX);self.exp2reg(self,ak,aX,aW.info);return;}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,85,80,86,65,76])))){let al=RuntimeInternal.wrapAmbiguousCall(self.exp2anyreg(self,ak,aX));self.codeABC(self,ak,new Uint8Array([79,80,95,83,69,84,85,80,86,65,76]),al,aW.info,0);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,71,76,79,66,65,76])))){let al=RuntimeInternal.wrapAmbiguousCall(self.exp2anyreg(self,ak,aX));self.codeABx(self,ak,new Uint8Array([79,80,95,83,69,84,71,76,79,66,65,76]),al,aW.info);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,73,78,68,69,88,69,68])))){let al=RuntimeInternal.wrapAmbiguousCall(self.exp2RK(self,ak,aX));self.codeABC(self,ak,new Uint8Array([79,80,95,83,69,84,84,65,66,76,69]),aW.info,aW.aux,al);}else{assert(0);}self.freeexp(self,ak,aX);};aj._self=function(ak,al,aY){self.exp2anyreg(self,ak,al);self.freeexp(self,ak,al);let aZ=ak.freereg;self.reserveregs(self,ak,2);self.codeABC(self,ak,new Uint8Array([79,80,95,83,69,76,70]),aZ,al.info,self.exp2RK(self,ak,aY));self.freeexp(self,ak,aY);al.info=aZ;al.k=new Uint8Array([86,78,79,78,82,69,76,79,67]);};aj.invertjump=function(ak,al){let aw=RuntimeInternal.wrapAmbiguousCall(self.getjumpcontrol(self,ak,al.info));assert((b.testTMode(b,b.GET_OPCODE(b,aw))!==0)&&(b.GET_OPCODE(b,aw)!==new Uint8Array([79,80,95,84,69,83,84,83,69,84]))&&(b.GET_OPCODE(b,aw)!==new Uint8Array([79,80,95,84,69,83,84])));b.SETARG_A(b,aw,(b.GETARG_A(b,aw)===0)&&1||0);};aj.jumponcond=function(ak,al,a_){if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,82,69,76,79,67,65,66,76,69])))){let b0=RuntimeInternal.wrapAmbiguousCall(self.getcode(self,ak,al));if(RuntimeInternal.isTrue((b.GET_OPCODE(b,b0)===new Uint8Array([79,80,95,78,79,84])))){ak.pc=(ak.pc-1);return self.condjump(self,ak,new Uint8Array([79,80,95,84,69,83,84]),b.GETARG_B(b,b0),0,a_&&0||1);}}self.discharge2anyreg(self,ak,al);self.freeexp(self,ak,al);return self.condjump(self,ak,new Uint8Array([79,80,95,84,69,83,84,83,69,84]),b.NO_REG,al.info,a_&&1||0);};aj.goiftrue=function(ak,al){let aw;self.dischargevars(self,ak,al);aM=al.k;if(RuntimeInternal.isTrue((aM===new Uint8Array([86,75]))||(aM===new Uint8Array([86,75,78,85,77]))||(aM===new Uint8Array([86,84,82,85,69])))){aw=self.NO_JUMP;}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,70,65,76,83,69])))){aw=self.jump(self,ak);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,74,77,80])))){self.invertjump(self,ak,al);aw=al.info;}else{aw=self.jumponcond(self,ak,al,false);}al.f=self.concat(self,ak,al.f,aw);self.patchtohere(self,ak,al.t);al.t=self.NO_JUMP;};aj.goiffalse=function(ak,al){let aw;self.dischargevars(self,ak,al);aM=al.k;if(RuntimeInternal.isTrue((aM===new Uint8Array([86,78,73,76]))||(aM===new Uint8Array([86,70,65,76,83,69])))){aw=self.NO_JUMP;}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,84,82,85,69])))){aw=self.jump(self,ak);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,74,77,80])))){aw=al.info;}else{aw=self.jumponcond(self,ak,al,true);}al.t=self.concat(self,ak,al.t,aw);self.patchtohere(self,ak,al.f);al.f=self.NO_JUMP;};aj.codenot=function(ak,al){self.dischargevars(self,ak,al);aM=al.k;if(RuntimeInternal.isTrue((aM===new Uint8Array([86,78,73,76]))||(aM===new Uint8Array([86,70,65,76,83,69])))){al.k=new Uint8Array([86,84,82,85,69]);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,75]))||(aM===new Uint8Array([86,75,78,85,77]))||(aM===new Uint8Array([86,84,82,85,69])))){al.k=new Uint8Array([86,70,65,76,83,69]);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,74,77,80])))){self.invertjump(self,ak,al);}else if(RuntimeInternal.isTrue((aM===new Uint8Array([86,82,69,76,79,67,65,66,76,69]))||(aM===new Uint8Array([86,78,79,78,82,69,76,79,67])))){self.discharge2anyreg(self,ak,al);self.freeexp(self,ak,al);al.info=self.codeABC(self,ak,new Uint8Array([79,80,95,78,79,84]),0,al.info,0);al.k=new Uint8Array([86,82,69,76,79,67,65,66,76,69]);}else{assert(0);}al.f=al.t,al.t=al.f;self.removevalues(self,ak,al.f);self.removevalues(self,ak,al.t);};aj.indexed=function(ak,v,aM){v.aux=self.exp2RK(self,ak,aM);v.k=new Uint8Array([86,73,78,68,69,88,69,68]);};aj.constfolding=function(q,b1,b2){let aP;if(RuntimeInternal.isTrue(!self.isnumeral(self,b1)||!self.isnumeral(self,b2))){return false;}let b3=b1.nval;let b4=b2.nval;if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,95,65,68,68])))){aP=self.numadd(self,b3,b4);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,95,83,85,66])))){aP=self.numsub(self,b3,b4);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,95,77,85,76])))){aP=self.nummul(self,b3,b4);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,95,68,73,86])))){if(RuntimeInternal.isTrue((b4===0))){return false;}aP=self.numdiv(self,b3,b4);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,95,77,79,68])))){if(RuntimeInternal.isTrue((b4===0))){return false;}aP=self.nummod(self,b3,b4);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,95,80,79,87])))){aP=self.numpow(self,b3,b4);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,95,85,78,77])))){aP=self.numunm(self,b3);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,95,76,69,78])))){return false;}else{assert(0);aP=0;}if(RuntimeInternal.isTrue(self.numisnan(self,aP))){return false;}b1.nval=aP;return true;};aj.codearith=function(ak,q,b1,b2){if(RuntimeInternal.isTrue(self.constfolding(self,q,b1,b2))){return;}else{let b5=(q!==new Uint8Array([79,80,95,85,78,77]))&&(q!==new Uint8Array([79,80,95,76,69,78]))&&self.exp2RK(self,ak,b2)||0;let b6=RuntimeInternal.wrapAmbiguousCall(self.exp2RK(self,ak,b1));if(RuntimeInternal.isTrue((b6>b5))){self.freeexp(self,ak,b1);self.freeexp(self,ak,b2);}else{self.freeexp(self,ak,b2);self.freeexp(self,ak,b1);}b1.info=self.codeABC(self,ak,q,0,b6,b5);b1.k=new Uint8Array([86,82,69,76,79,67,65,66,76,69]);}};aj.codecomp=function(ak,q,a_,b1,b2){let b6=RuntimeInternal.wrapAmbiguousCall(self.exp2RK(self,ak,b1));b5=RuntimeInternal.wrapAmbiguousCall(self.exp2RK(self,ak,b2));self.freeexp(self,ak,b2);self.freeexp(self,ak,b1);if(RuntimeInternal.isTrue((a_===0)&&(q!==new Uint8Array([79,80,95,69,81])))){b6=b5,b5=b6;a_=1;}b1.info=self.condjump(self,ak,q,a_,b6,b5);b1.k=new Uint8Array([86,74,77,80]);};aj.prefix=function(ak,q,al){let b2={};b2.t=self.NO_JUMP,b2.f=self.NO_JUMP;b2.k=new Uint8Array([86,75,78,85,77]);b2.nval=0;if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,77,73,78,85,83])))){if(RuntimeInternal.isTrue(!self.isnumeral(self,al))){self.exp2anyreg(self,ak,al);}self.codearith(self,ak,new Uint8Array([79,80,95,85,78,77]),al,b2);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,78,79,84])))){self.codenot(self,ak,al);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,76,69,78])))){self.exp2anyreg(self,ak,al);self.codearith(self,ak,new Uint8Array([79,80,95,76,69,78]),al,b2);}else{assert(0);}};aj.infix=function(ak,q,s){if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,65,78,68])))){self.goiftrue(self,ak,s);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,79,82])))){self.goiffalse(self,ak,s);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,67,79,78,67,65,84])))){self.exp2nextreg(self,ak,s);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,65,68,68]))||(q===new Uint8Array([79,80,82,95,83,85,66]))||(q===new Uint8Array([79,80,82,95,77,85,76]))||(q===new Uint8Array([79,80,82,95,68,73,86]))||(q===new Uint8Array([79,80,82,95,77,79,68]))||(q===new Uint8Array([79,80,82,95,80,79,87])))){if(RuntimeInternal.isTrue(!self.isnumeral(self,s))){self.exp2RK(self,ak,s);}}else{self.exp2RK(self,ak,s);}};aj.arith_op={['OPR_ADD']:new Uint8Array([79,80,95,65,68,68]),['OPR_SUB']:new Uint8Array([79,80,95,83,85,66]),['OPR_MUL']:new Uint8Array([79,80,95,77,85,76]),['OPR_DIV']:new Uint8Array([79,80,95,68,73,86]),['OPR_MOD']:new Uint8Array([79,80,95,77,79,68]),['OPR_POW']:new Uint8Array([79,80,95,80,79,87])};aj.comp_op={['OPR_EQ']:new Uint8Array([79,80,95,69,81]),['OPR_NE']:new Uint8Array([79,80,95,69,81]),['OPR_LT']:new Uint8Array([79,80,95,76,84]),['OPR_LE']:new Uint8Array([79,80,95,76,69]),['OPR_GT']:new Uint8Array([79,80,95,76,84]),['OPR_GE']:new Uint8Array([79,80,95,76,69])};aj.comp_cond={['OPR_EQ']:1,['OPR_NE']:0,['OPR_LT']:1,['OPR_LE']:1,['OPR_GT']:0,['OPR_GE']:0};aj.posfix=function(ak,q,b1,b2){let b7=function(b1,b2){b1.k=b2.k;b1.info=b2.info;b1.aux=b2.aux;b1.nval=b2.nval;b1.t=b2.t;b1.f=b2.f;};if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,65,78,68])))){assert((b1.t===self.NO_JUMP));self.dischargevars(self,ak,b2);b2.f=self.concat(self,ak,b2.f,b1.f);b7(b1,b2);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,79,82])))){assert((b1.f===self.NO_JUMP));self.dischargevars(self,ak,b2);b2.t=self.concat(self,ak,b2.t,b1.t);b7(b1,b2);}else if(RuntimeInternal.isTrue((q===new Uint8Array([79,80,82,95,67,79,78,67,65,84])))){self.exp2val(self,ak,b2);if(RuntimeInternal.isTrue((b2.k===new Uint8Array([86,82,69,76,79,67,65,66,76,69]))&&(b.GET_OPCODE(b,self.getcode(self,ak,b2))===new Uint8Array([79,80,95,67,79,78,67,65,84])))){assert((b1.info===(b.GETARG_B(b,self.getcode(self,ak,b2))-1)));self.freeexp(self,ak,b1);b.SETARG_B(b,self.getcode(self,ak,b2),b1.info);b1.k=new Uint8Array([86,82,69,76,79,67,65,66,76,69]);b1.info=b2.info;}else{self.exp2nextreg(self,ak,b2);self.codearith(self,ak,new Uint8Array([79,80,95,67,79,78,67,65,84]),b1,b2);}}else{let b8=self.arith_op[q];if(RuntimeInternal.isTrue(b8)){self.codearith(self,ak,b8,b1,b2);}else{let b9=self.comp_op[q];if(RuntimeInternal.isTrue(b9)){self.codecomp(self,ak,b9,self.comp_cond[q],b1,b2);}else{assert(0);}}}};aj.fixline=function(ak,ba){ak.f.lineinfo[(ak.pc-1)]=ba;};aj.code=function(ak,c,ba){N=ak.f;self.dischargejpc(self,ak);luaY.growvector(luaY,ak.L,N.code,ak.pc,N.sizecode,null,luaY.MAX_INT,new Uint8Array([99,111,100,101,32,115,105,122,101,32,111,118,101,114,102,108,111,119]));N.code[ak.pc]=c;luaY.growvector(luaY,ak.L,N.lineinfo,ak.pc,N.sizelineinfo,null,luaY.MAX_INT,new Uint8Array([99,111,100,101,32,115,105,122,101,32,111,118,101,114,102,108,111,119]));N.lineinfo[ak.pc]=ba;aw=ak.pc;ak.pc=(ak.pc+1);return aw;};aj.codeABC=function(ak,d,g,f,h){assert((b.getOpMode(b,d)===b.OpMode.iABC));assert((b.getBMode(b,d)!==b.OpArgMask.OpArgN)||(f===0));assert((b.getCMode(b,d)!==b.OpArgMask.OpArgN)||(h===0));return self.code(self,ak,b.CREATE_ABC(b,d,g,f,h),ak.ls.lastline);};aj.codeABx=function(ak,d,g,i){assert((b.getOpMode(b,d)===b.OpMode.iABx)||(b.getOpMode(b,d)===b.OpMode.iAsBx));assert((b.getCMode(b,d)===b.OpArgMask.OpArgN));return self.code(self,ak,b.CREATE_ABx(b,d,g,i),ak.ls.lastline);};aj.setlist=function(ak,bb,bc,bd){h=(math.floor(((bc-1)/b.LFIELDS_PER_FLUSH))+1);f=(bd===luaY.LUA_MULTRET)&&0||bd;assert((bd!==0));if(RuntimeInternal.isTrue((h<=b.MAXARG_C))){self.codeABC(self,ak,new Uint8Array([79,80,95,83,69,84,76,73,83,84]),bb,f,h);}else{self.codeABC(self,ak,new Uint8Array([79,80,95,83,69,84,76,73,83,84]),bb,f,0);self.code(self,ak,b.CREATE_Inst(b,h),ak.ls.lastline);}ak.freereg=(bb+1);};a.LuaK=function(g){luaY=g;return aj;};let luaY={};T=a.LuaX;aj=RuntimeInternal.wrapAmbiguousCall(a.LuaK(luaY));b=a.LuaP;luaY.LUA_QS=T.LUA_QS||new Uint8Array([39,37,115,39]);luaY.SHRT_MAX=32767;luaY.LUAI_MAXVARS=200;luaY.LUAI_MAXUPVALUES=60;luaY.MAX_INT=T.MAX_INT||2147483645;luaY.LUAI_MAXCCALLS=200;luaY.VARARG_HASARG=1;luaY.HASARG_MASK=2;luaY.VARARG_ISVARARG=2;luaY.VARARG_NEEDSARG=4;luaY.LUA_MULTRET=(-1);luaY.LUA_QL=function(o){return (RuntimeInternal.concatString(new Uint8Array([39]),(RuntimeInternal.concatString(o,new Uint8Array([39])))));};luaY.growvector=function(Q,s,bc,be,v,bf,al){if(RuntimeInternal.isTrue((bc>=bf))){error(al);}};luaY.newproto=function(Q){N={};N.k={};N.sizek=0;N.p={};N.sizep=0;N.code={};N.sizecode=0;N.sizelineinfo=0;N.sizeupvalues=0;N.nups=0;N.upvalues={};N.numparams=0;N.is_vararg=0;N.maxstacksize=0;N.lineinfo={};N.sizelocvars=0;N.locvars={};N.lineDefined=0;N.lastlinedefined=0;N.source=null;return N;};luaY.int2fb=function(o){let al=0;while(RuntimeInternal.isTrue((o>=16))){o=math.floor(((o+1)/2));al=(al+1);}if(RuntimeInternal.isTrue((o<8))){return o;}else{return ((((al+1)*8)+o)-8);}};luaY.hasmultret=function(aM){return (aM===new Uint8Array([86,67,65,76,76]))||(aM===new Uint8Array([86,86,65,82,65,82,71]));};luaY.getlocvar=function(ak,c){return ak.f.locvars[ak.actvar[c]];};luaY.checklimit=function(ak,s,a1,u){if(RuntimeInternal.isTrue((s>a1))){self.errorlimit(self,ak,a1,u);}};luaY.anchor_token=function(a3){if(RuntimeInternal.isTrue((a3.t.token===new Uint8Array([84,75,95,78,65,77,69]))||(a3.t.token===new Uint8Array([84,75,95,83,84,82,73,78,71])))){}};luaY.error_expected=function(a3,a4){T.syntaxerror(T,a3,string.format((RuntimeInternal.concatString(self.LUA_QS,new Uint8Array([32,101,120,112,101,99,116,101,100]))),T.token2str(T,a3,a4)));};luaY.errorlimit=function(ak,bf,bg){let a5=(ak.f.linedefined===0)&&string.format(new Uint8Array([109,97,105,110,32,102,117,110,99,116,105,111,110,32,104,97,115,32,109,111,114,101,32,116,104,97,110,32,37,100,32,37,115]),bf,bg)||string.format(new Uint8Array([102,117,110,99,116,105,111,110,32,97,116,32,108,105,110,101,32,37,100,32,104,97,115,32,109,111,114,101,32,116,104,97,110,32,37,100,32,37,115]),ak.f.linedefined,bf,bg);T.lexerror(T,ak.ls,a5,0);};luaY.testnext=function(a3,h){if(RuntimeInternal.isTrue((a3.t.token===h))){T.next(T,a3);return true;}else{return false;}};luaY.check=function(a3,h){if(RuntimeInternal.isTrue((a3.t.token!==h))){self.error_expected(self,a3,h);}};luaY.checknext=function(a3,h){self.check(self,a3,h);T.next(T,a3);};luaY.check_condition=function(a3,h,a5){if(RuntimeInternal.isTrue(!h)){T.syntaxerror(T,a3,a5);}};luaY.check_match=function(a3,bg,bh,bi){if(RuntimeInternal.isTrue(!self.testnext(self,a3,bg))){if(RuntimeInternal.isTrue((bi===a3.linenumber))){self.error_expected(self,a3,bg);}else{T.syntaxerror(T,a3,string.format((RuntimeInternal.concatString(self.LUA_QS,(RuntimeInternal.concatString(new Uint8Array([32,101,120,112,101,99,116,101,100,32,40,116,111,32,99,108,111,115,101,32]),(RuntimeInternal.concatString(self.LUA_QS,new Uint8Array([32,97,116,32,108,105,110,101,32,37,100,41]))))))),T.token2str(T,a3,bg),T.token2str(T,a3,bh),bi));}}};luaY.str_checkname=function(a3){self.check(self,a3,new Uint8Array([84,75,95,78,65,77,69]));ai=a3.t.seminfo;T.next(T,a3);return ai;};luaY.init_exp=function(al,aM,c){al.f=aj.NO_JUMP,al.t=aj.NO_JUMP;al.k=aM;al.info=c;};luaY.codestring=function(a3,al,F){self.init_exp(self,al,new Uint8Array([86,75]),aj.stringK(aj,a3.fs,F));};luaY.checkname=function(a3,al){self.codestring(self,a3,al,self.str_checkname(self,a3));};luaY.registerlocalvar=function(a3,bj){let ak=a3.fs;N=ak.f;self.growvector(self,a3.L,N.locvars,ak.nlocvars,N.sizelocvars,null,self.SHRT_MAX,new Uint8Array([116,111,111,32,109,97,110,121,32,108,111,99,97,108,32,118,97,114,105,97,98,108,101,115]));N.locvars[ak.nlocvars]={};N.locvars[ak.nlocvars].varname=bj;let bk=ak.nlocvars;ak.nlocvars=(ak.nlocvars+1);return bk;};luaY.new_localvarliteral=function(a3,s,t){self.new_localvar(self,a3,s,t);};luaY.new_localvar=function(a3,A,t){ak=a3.fs;self.checklimit(self,ak,((ak.nactvar+t)+1),self.LUAI_MAXVARS,new Uint8Array([108,111,99,97,108,32,118,97,114,105,97,98,108,101,115]));ak.actvar[(ak.nactvar+t)]=self.registerlocalvar(self,a3,A);};luaY.adjustlocalvars=function(a3,bl){ak=a3.fs;ak.nactvar=(ak.nactvar+bl);for(let c=bl;c<=1;c+=(-1)){self.getlocvar(self,ak,(ak.nactvar-c)).startpc=ak.pc;}};luaY.removevars=function(a3,bm){ak=a3.fs;while(RuntimeInternal.isTrue((ak.nactvar>bm))){ak.nactvar=(ak.nactvar-1);self.getlocvar(self,ak,ak.nactvar).endpc=ak.pc;}};luaY.indexupvalue=function(ak,A,s){N=ak.f;for(let c=0;c<=(N.nups-1);c++){if(RuntimeInternal.isTrue((ak.upvalues[c].k===s.k)&&(ak.upvalues[c].info===s.info))){assert((N.upvalues[c]===A));return c;}}self.checklimit(self,ak,(N.nups+1),self.LUAI_MAXUPVALUES,new Uint8Array([117,112,118,97,108,117,101,115]));self.growvector(self,ak.L,N.upvalues,N.nups,N.sizeupvalues,null,self.MAX_INT,new Uint8Array([]));N.upvalues[N.nups]=A;assert((s.k===new Uint8Array([86,76,79,67,65,76]))||(s.k===new Uint8Array([86,85,80,86,65,76])));ak.upvalues[N.nups]={['k']:s.k,['info']:s.info};let bn=N.nups;N.nups=(N.nups+1);return bn;};luaY.searchvar=function(ak,t){for(let c=(ak.nactvar-1);c<=0;c+=(-1)){if(RuntimeInternal.isTrue((t===self.getlocvar(self,ak,c).varname))){return c;}}return (-1);};luaY.markupval=function(ak,bo){let bp=ak.bl;while(RuntimeInternal.isTrue(bp&&(bp.nactvar>bo))){bp=bp.previous;}if(RuntimeInternal.isTrue(bp)){bp.upval=true;}};luaY.singlevaraux=function(ak,t,aW,bb){if(RuntimeInternal.isTrue((ak===null))){self.init_exp(self,aW,new Uint8Array([86,71,76,79,66,65,76]),b.NO_REG);return new Uint8Array([86,71,76,79,66,65,76]);}else{s=RuntimeInternal.wrapAmbiguousCall(self.searchvar(self,ak,t));if(RuntimeInternal.isTrue((s>=0))){self.init_exp(self,aW,new Uint8Array([86,76,79,67,65,76]),s);if(RuntimeInternal.isTrue((bb===0))){self.markupval(self,ak,s);}return new Uint8Array([86,76,79,67,65,76]);}else{if(RuntimeInternal.isTrue((self.singlevaraux(self,ak.prev,t,aW,0)===new Uint8Array([86,71,76,79,66,65,76])))){return new Uint8Array([86,71,76,79,66,65,76]);}aW.info=self.indexupvalue(self,ak,t,aW);aW.k=new Uint8Array([86,85,80,86,65,76]);return new Uint8Array([86,85,80,86,65,76]);}}};luaY.singlevar=function(a3,aW){let bj=RuntimeInternal.wrapAmbiguousCall(self.str_checkname(self,a3));ak=a3.fs;if(RuntimeInternal.isTrue((self.singlevaraux(self,ak,bj,aW,1)===new Uint8Array([86,71,76,79,66,65,76])))){aW.info=aj.stringK(aj,ak,bj);}};luaY.adjust_assign=function(a3,bl,bq,al){ak=a3.fs;let br=(bl-bq);if(RuntimeInternal.isTrue(self.hasmultret(self,al.k))){br=(br+1);if(RuntimeInternal.isTrue((br<=0))){br=0;}aj.setreturns(aj,ak,al,br);if(RuntimeInternal.isTrue((br>1))){aj.reserveregs(aj,ak,(br-1));}}else{if(RuntimeInternal.isTrue((al.k!==new Uint8Array([86,86,79,73,68])))){aj.exp2nextreg(aj,ak,al);}if(RuntimeInternal.isTrue((br>0))){let aE=ak.freereg;aj.reserveregs(aj,ak,br);aj._nil(aj,ak,aE,br);}}};luaY.enterlevel=function(a3){a3.L.nCcalls=(a3.L.nCcalls+1);if(RuntimeInternal.isTrue((a3.L.nCcalls>self.LUAI_MAXCCALLS))){T.lexerror(T,a3,new Uint8Array([99,104,117,110,107,32,104,97,115,32,116,111,111,32,109,97,110,121,32,115,121,110,116,97,120,32,108,101,118,101,108,115]),0);}};luaY.leavelevel=function(a3){a3.L.nCcalls=(a3.L.nCcalls-1);};luaY.enterblock=function(ak,bp,bs){bp.breaklist=aj.NO_JUMP;bp.isbreakable=bs;bp.nactvar=ak.nactvar;bp.upval=false;bp.previous=ak.bl;ak.bl=bp;assert((ak.freereg===ak.nactvar));};luaY.leaveblock=function(ak){bp=ak.bl;ak.bl=bp.previous;self.removevars(self,ak.ls,bp.nactvar);if(RuntimeInternal.isTrue(bp.upval)){aj.codeABC(aj,ak,new Uint8Array([79,80,95,67,76,79,83,69]),bp.nactvar,0,0);}assert(!bp.isbreakable||!bp.upval);assert((bp.nactvar===ak.nactvar));ak.freereg=ak.nactvar;aj.patchtohere(aj,ak,bp.breaklist);};luaY.pushclosure=function(a3,aZ,s){ak=a3.fs;N=ak.f;self.growvector(self,a3.L,N.p,ak.np,N.sizep,null,b.MAXARG_Bx,new Uint8Array([99,111,110,115,116,97,110,116,32,116,97,98,108,101,32,111,118,101,114,102,108,111,119]));N.p[ak.np]=aZ.f;ak.np=(ak.np+1);self.init_exp(self,s,new Uint8Array([86,82,69,76,79,67,65,66,76,69]),aj.codeABx(aj,ak,new Uint8Array([79,80,95,67,76,79,83,85,82,69]),0,(ak.np-1)));for(let c=0;c<=(aZ.f.nups-1);c++){d=(aZ.upvalues[c].k===new Uint8Array([86,76,79,67,65,76]))&&new Uint8Array([79,80,95,77,79,86,69])||new Uint8Array([79,80,95,71,69,84,85,80,86,65,76]);aj.codeABC(aj,ak,d,0,aZ.upvalues[c].info,0);}};luaY.open_func=function(a3,ak){Q=a3.L;N=RuntimeInternal.wrapAmbiguousCall(self.newproto(self,a3.L));ak.f=N;ak.prev=a3.fs;ak.ls=a3;ak.L=Q;a3.fs=ak;ak.pc=0;ak.lasttarget=(-1);ak.jpc=aj.NO_JUMP;ak.freereg=0;ak.nk=0;ak.np=0;ak.nlocvars=0;ak.nactvar=0;ak.bl=null;N.source=a3.source;N.maxstacksize=2;ak.h={};};luaY.close_func=function(a3){Q=a3.L;ak=a3.fs;N=ak.f;self.removevars(self,a3,0);aj.ret(aj,ak,0,0);N.sizecode=ak.pc;N.sizelineinfo=ak.pc;N.sizek=ak.nk;N.sizep=ak.np;N.sizelocvars=ak.nlocvars;N.sizeupvalues=N.nups;assert((ak.bl===null));a3.fs=ak.prev;if(RuntimeInternal.isTrue(ak)){self.anchor_token(self,a3);}};luaY.parser=function(Q,B,x,A){let bt={};bt.t={};bt.lookahead={};let bu={};bu.upvalues={};bu.actvar={};Q.nCcalls=0;bt.buff=x;T.setinput(T,Q,bt,B,A);self.open_func(self,bt,bu);bu.f.is_vararg=self.VARARG_ISVARARG;T.next(T,bt);self.chunk(self,bt);self.check(self,bt,new Uint8Array([84,75,95,69,79,83]));self.close_func(self,bt);assert((bu.prev===null));assert((bu.f.nups===0));assert((bt.fs===null));return bu.f;};luaY.field=function(a3,s){ak=a3.fs;let aY={};aj.exp2anyreg(aj,ak,s);T.next(T,a3);self.checkname(self,a3,aY);aj.indexed(aj,ak,s,aY);};luaY.yindex=function(a3,s){T.next(T,a3);self.expr(self,a3,s);aj.exp2val(aj,a3.fs,s);self.checknext(self,a3,new Uint8Array([93]));};luaY.recfield=function(a3,bv){ak=a3.fs;aE=a3.fs.freereg;let bw={};aY={};if(RuntimeInternal.isTrue((a3.t.token===new Uint8Array([84,75,95,78,65,77,69])))){self.checklimit(self,ak,bv.nh,self.MAX_INT,new Uint8Array([105,116,101,109,115,32,105,110,32,97,32,99,111,110,115,116,114,117,99,116,111,114]));self.checkname(self,a3,aY);}else{self.yindex(self,a3,aY);}bv.nh=(bv.nh+1);self.checknext(self,a3,new Uint8Array([61]));let bx=RuntimeInternal.wrapAmbiguousCall(aj.exp2RK(aj,ak,aY));self.expr(self,a3,bw);aj.codeABC(aj,ak,new Uint8Array([79,80,95,83,69,84,84,65,66,76,69]),bv.t.info,bx,aj.exp2RK(aj,ak,bw));ak.freereg=aE;};luaY.closelistfield=function(ak,bv){if(RuntimeInternal.isTrue((bv.v.k===new Uint8Array([86,86,79,73,68])))){return;}aj.exp2nextreg(aj,ak,bv.v);bv.v.k=new Uint8Array([86,86,79,73,68]);if(RuntimeInternal.isTrue((bv.tostore===b.LFIELDS_PER_FLUSH))){aj.setlist(aj,ak,bv.t.info,bv.na,bv.tostore);bv.tostore=0;}};luaY.lastlistfield=function(ak,bv){if(RuntimeInternal.isTrue((bv.tostore===0))){return;}if(RuntimeInternal.isTrue(self.hasmultret(self,bv.v.k))){aj.setmultret(aj,ak,bv.v);aj.setlist(aj,ak,bv.t.info,bv.na,self.LUA_MULTRET);bv.na=(bv.na-1);}else{if(RuntimeInternal.isTrue((bv.v.k!==new Uint8Array([86,86,79,73,68])))){aj.exp2nextreg(aj,ak,bv.v);}aj.setlist(aj,ak,bv.t.info,bv.na,bv.tostore);}};luaY.listfield=function(a3,bv){self.expr(self,a3,bv.v);self.checklimit(self,a3.fs,bv.na,self.MAX_INT,new Uint8Array([105,116,101,109,115,32,105,110,32,97,32,99,111,110,115,116,114,117,99,116,111,114]));bv.na=(bv.na+1);bv.tostore=(bv.tostore+1);};luaY.constructor=function(a3,v){ak=a3.fs;let ba=a3.linenumber;aw=RuntimeInternal.wrapAmbiguousCall(aj.codeABC(aj,ak,new Uint8Array([79,80,95,78,69,87,84,65,66,76,69]),0,0,0));let bv={};bv.v={};bv.na=0,bv.nh=0,bv.tostore=0;bv.t=v;self.init_exp(self,v,new Uint8Array([86,82,69,76,79,67,65,66,76,69]),aw);self.init_exp(self,bv.v,new Uint8Array([86,86,79,73,68]),0);aj.exp2nextreg(aj,a3.fs,v);self.checknext(self,a3,new Uint8Array([123]));do{assert((bv.v.k===new Uint8Array([86,86,79,73,68]))||(bv.tostore>0));if(RuntimeInternal.isTrue((a3.t.token===new Uint8Array([125])))){break;}self.closelistfield(self,ak,bv);h=a3.t.token;if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,78,65,77,69])))){T.lookahead(T,a3);if(RuntimeInternal.isTrue((a3.lookahead.token!==new Uint8Array([61])))){self.listfield(self,a3,bv);}else{self.recfield(self,a3,bv);}}else if(RuntimeInternal.isTrue((h===new Uint8Array([91])))){self.recfield(self,a3,bv);}else{self.listfield(self,a3,bv);}}while(RuntimeInternal.isTrue(!self.testnext(self,a3,new Uint8Array([44]))&&!self.testnext(self,a3,new Uint8Array([59]))));self.check_match(self,a3,new Uint8Array([125]),new Uint8Array([123]),ba);self.lastlistfield(self,ak,bv);b.SETARG_B(b,ak.f.code[aw],self.int2fb(self,bv.na));b.SETARG_C(b,ak.f.code[aw],self.int2fb(self,bv.nh));};luaY.parlist=function(a3){ak=a3.fs;N=ak.f;let by=0;N.is_vararg=0;if(RuntimeInternal.isTrue((a3.t.token!==new Uint8Array([41])))){do{h=a3.t.token;if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,78,65,77,69])))){self.new_localvar(self,a3,self.str_checkname(self,a3),by);by=(by+1);}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,68,79,84,83])))){T.next(T,a3);self.new_localvarliteral(self,a3,new Uint8Array([97,114,103]),by);by=(by+1);N.is_vararg=(self.VARARG_HASARG+self.VARARG_NEEDSARG);N.is_vararg=(N.is_vararg+self.VARARG_ISVARARG);}else{T.syntaxerror(T,a3,(RuntimeInternal.concatString(new Uint8Array([60,110,97,109,101,62,32,111,114,32]),(RuntimeInternal.concatString(self.LUA_QL(self,new Uint8Array([46,46,46])),new Uint8Array([32,101,120,112,101,99,116,101,100]))))));}}while(RuntimeInternal.isTrue((N.is_vararg!==0)||!self.testnext(self,a3,new Uint8Array([44]))));}self.adjustlocalvars(self,a3,by);N.numparams=(ak.nactvar-(N.is_vararg%self.HASARG_MASK));aj.reserveregs(aj,ak,ak.nactvar);};luaY.body=function(a3,al,bz,ba){let bA={};bA.upvalues={};bA.actvar={};self.open_func(self,a3,bA);bA.f.lineDefined=ba;self.checknext(self,a3,new Uint8Array([40]));if(RuntimeInternal.isTrue(bz)){self.new_localvarliteral(self,a3,new Uint8Array([115,101,108,102]),0);self.adjustlocalvars(self,a3,1);}self.parlist(self,a3);self.checknext(self,a3,new Uint8Array([41]));self.chunk(self,a3);bA.f.lastlinedefined=a3.linenumber;self.check_match(self,a3,new Uint8Array([84,75,95,69,78,68]),new Uint8Array([84,75,95,70,85,78,67,84,73,79,78]),ba);self.close_func(self,a3);self.pushclosure(self,a3,bA,al);};luaY.explist1=function(a3,s){t=1;self.expr(self,a3,s);while(RuntimeInternal.isTrue(self.testnext(self,a3,new Uint8Array([44])))){aj.exp2nextreg(aj,a3.fs,s);self.expr(self,a3,s);t=(t+1);}return t;};luaY.funcargs=function(a3,N){ak=a3.fs;let bB={};let by;ba=a3.linenumber;h=a3.t.token;if(RuntimeInternal.isTrue((h===new Uint8Array([40])))){if(RuntimeInternal.isTrue((ba!==a3.lastline))){T.syntaxerror(T,a3,new Uint8Array([97,109,98,105,103,117,111,117,115,32,115,121,110,116,97,120,32,40,102,117,110,99,116,105,111,110,32,99,97,108,108,32,120,32,110,101,119,32,115,116,97,116,101,109,101,110,116,41]));}T.next(T,a3);if(RuntimeInternal.isTrue((a3.t.token===new Uint8Array([41])))){bB.k=new Uint8Array([86,86,79,73,68]);}else{self.explist1(self,a3,bB);aj.setmultret(aj,ak,bB);}self.check_match(self,a3,new Uint8Array([41]),new Uint8Array([40]),ba);}else if(RuntimeInternal.isTrue((h===new Uint8Array([123])))){self.constructor(self,a3,bB);}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,83,84,82,73,78,71])))){self.codestring(self,a3,bB,a3.t.seminfo);T.next(T,a3);}else{T.syntaxerror(T,a3,new Uint8Array([102,117,110,99,116,105,111,110,32,97,114,103,117,109,101,110,116,115,32,101,120,112,101,99,116,101,100]));return;}assert((N.k===new Uint8Array([86,78,79,78,82,69,76,79,67])));let bb=N.info;if(RuntimeInternal.isTrue(self.hasmultret(self,bB.k))){by=self.LUA_MULTRET;}else{if(RuntimeInternal.isTrue((bB.k!==new Uint8Array([86,86,79,73,68])))){aj.exp2nextreg(aj,ak,bB);}by=(ak.freereg-(bb+1));}self.init_exp(self,N,new Uint8Array([86,67,65,76,76]),aj.codeABC(aj,ak,new Uint8Array([79,80,95,67,65,76,76]),bb,(by+1),2));aj.fixline(aj,ak,ba);ak.freereg=(bb+1);};luaY.prefixexp=function(a3,s){h=a3.t.token;if(RuntimeInternal.isTrue((h===new Uint8Array([40])))){ba=a3.linenumber;T.next(T,a3);self.expr(self,a3,s);self.check_match(self,a3,new Uint8Array([41]),new Uint8Array([40]),ba);aj.dischargevars(aj,a3.fs,s);}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,78,65,77,69])))){self.singlevar(self,a3,s);}else{T.syntaxerror(T,a3,new Uint8Array([117,110,101,120,112,101,99,116,101,100,32,115,121,109,98,111,108]));}return;};luaY.primaryexp=function(a3,s){ak=a3.fs;self.prefixexp(self,a3,s);while(RuntimeInternal.isTrue(true)){h=a3.t.token;if(RuntimeInternal.isTrue((h===new Uint8Array([46])))){self.field(self,a3,s);}else if(RuntimeInternal.isTrue((h===new Uint8Array([91])))){aY={};aj.exp2anyreg(aj,ak,s);self.yindex(self,a3,aY);aj.indexed(aj,ak,s,aY);}else if(RuntimeInternal.isTrue((h===new Uint8Array([58])))){aY={};T.next(T,a3);self.checkname(self,a3,aY);aj._self(aj,ak,s,aY);self.funcargs(self,a3,s);}else if(RuntimeInternal.isTrue((h===new Uint8Array([40]))||(h===new Uint8Array([84,75,95,83,84,82,73,78,71]))||(h===new Uint8Array([123])))){aj.exp2nextreg(aj,ak,s);self.funcargs(self,a3,s);}else{return;}}};luaY.simpleexp=function(a3,s){h=a3.t.token;if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,78,85,77,66,69,82])))){self.init_exp(self,s,new Uint8Array([86,75,78,85,77]),0);s.nval=a3.t.seminfo;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,83,84,82,73,78,71])))){self.codestring(self,a3,s,a3.t.seminfo);}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,78,73,76])))){self.init_exp(self,s,new Uint8Array([86,78,73,76]),0);}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,84,82,85,69])))){self.init_exp(self,s,new Uint8Array([86,84,82,85,69]),0);}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,70,65,76,83,69])))){self.init_exp(self,s,new Uint8Array([86,70,65,76,83,69]),0);}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,68,79,84,83])))){ak=a3.fs;self.check_condition(self,a3,(ak.f.is_vararg!==0),(RuntimeInternal.concatString(new Uint8Array([99,97,110,110,111,116,32,117,115,101,32]),(RuntimeInternal.concatString(self.LUA_QL(self,new Uint8Array([46,46,46])),new Uint8Array([32,111,117,116,115,105,100,101,32,97,32,118,97,114,97,114,103,32,102,117,110,99,116,105,111,110]))))));let bC=ak.f.is_vararg;if(RuntimeInternal.isTrue((bC>=self.VARARG_NEEDSARG))){ak.f.is_vararg=(bC-self.VARARG_NEEDSARG);}self.init_exp(self,s,new Uint8Array([86,86,65,82,65,82,71]),aj.codeABC(aj,ak,new Uint8Array([79,80,95,86,65,82,65,82,71]),0,1,0));}else if(RuntimeInternal.isTrue((h===new Uint8Array([123])))){self.constructor(self,a3,s);return;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,70,85,78,67,84,73,79,78])))){T.next(T,a3);self.body(self,a3,s,false,a3.linenumber);return;}else{self.primaryexp(self,a3,s);return;}T.next(T,a3);};luaY.getunopr=function(q){if(RuntimeInternal.isTrue((q===new Uint8Array([84,75,95,78,79,84])))){return new Uint8Array([79,80,82,95,78,79,84]);}else if(RuntimeInternal.isTrue((q===new Uint8Array([45])))){return new Uint8Array([79,80,82,95,77,73,78,85,83]);}else if(RuntimeInternal.isTrue((q===new Uint8Array([35])))){return new Uint8Array([79,80,82,95,76,69,78]);}else{return new Uint8Array([79,80,82,95,78,79,85,78,79,80,82]);}};luaY.getbinopr_table={[new Uint8Array([43])]:new Uint8Array([79,80,82,95,65,68,68]),[new Uint8Array([45])]:new Uint8Array([79,80,82,95,83,85,66]),[new Uint8Array([42])]:new Uint8Array([79,80,82,95,77,85,76]),[new Uint8Array([47])]:new Uint8Array([79,80,82,95,68,73,86]),[new Uint8Array([37])]:new Uint8Array([79,80,82,95,77,79,68]),[new Uint8Array([94])]:new Uint8Array([79,80,82,95,80,79,87]),[new Uint8Array([84,75,95,67,79,78,67,65,84])]:new Uint8Array([79,80,82,95,67,79,78,67,65,84]),[new Uint8Array([84,75,95,78,69])]:new Uint8Array([79,80,82,95,78,69]),[new Uint8Array([84,75,95,69,81])]:new Uint8Array([79,80,82,95,69,81]),[new Uint8Array([60])]:new Uint8Array([79,80,82,95,76,84]),[new Uint8Array([84,75,95,76,69])]:new Uint8Array([79,80,82,95,76,69]),[new Uint8Array([62])]:new Uint8Array([79,80,82,95,71,84]),[new Uint8Array([84,75,95,71,69])]:new Uint8Array([79,80,82,95,71,69]),[new Uint8Array([84,75,95,65,78,68])]:new Uint8Array([79,80,82,95,65,78,68]),[new Uint8Array([84,75,95,79,82])]:new Uint8Array([79,80,82,95,79,82])};luaY.getbinopr=function(q){let bD=self.getbinopr_table[q];if(RuntimeInternal.isTrue(bD)){return bD;}else{return new Uint8Array([79,80,82,95,78,79,66,73,78,79,80,82]);}};luaY.priority={1:{1:6,2:6},2:{1:6,2:6},3:{1:7,2:7},4:{1:7,2:7},5:{1:7,2:7},6:{1:10,2:9},7:{1:5,2:4},8:{1:3,2:3},9:{1:3,2:3},10:{1:3,2:3},11:{1:3,2:3},12:{1:3,2:3},13:{1:3,2:3},14:{1:2,2:2},15:{1:1,2:1}};luaY.UNARY_PRIORITY=8;luaY.subexpr=function(a3,s,bf){self.enterlevel(self,a3);let bE=RuntimeInternal.wrapAmbiguousCall(self.getunopr(self,a3.t.token));if(RuntimeInternal.isTrue((bE!==new Uint8Array([79,80,82,95,78,79,85,78,79,80,82])))){T.next(T,a3);self.subexpr(self,a3,s,self.UNARY_PRIORITY);aj.prefix(aj,a3.fs,bE,s);}else{self.simpleexp(self,a3,s);}q=RuntimeInternal.wrapAmbiguousCall(self.getbinopr(self,a3.t.token));while(RuntimeInternal.isTrue((q!==new Uint8Array([79,80,82,95,78,79,66,73,78,79,80,82]))&&(self.priority[(aj.BinOpr[q]+1)][1]>bf))){b4={};T.next(T,a3);aj.infix(aj,a3.fs,q,s);let bF=RuntimeInternal.wrapAmbiguousCall(self.subexpr(self,a3,b4,self.priority[(aj.BinOpr[q]+1)][2]));aj.posfix(aj,a3.fs,q,s,b4);q=bF;}self.leavelevel(self,a3);return q;};luaY.expr=function(a3,s){self.subexpr(self,a3,s,0);};luaY.block_follow=function(a4){if(RuntimeInternal.isTrue((a4===new Uint8Array([84,75,95,69,76,83,69]))||(a4===new Uint8Array([84,75,95,69,76,83,69,73,70]))||(a4===new Uint8Array([84,75,95,69,78,68]))||(a4===new Uint8Array([84,75,95,85,78,84,73,76]))||(a4===new Uint8Array([84,75,95,69,79,83])))){return true;}else{return false;}};luaY.block=function(a3){ak=a3.fs;bp={};self.enterblock(self,ak,bp,false);self.chunk(self,a3);assert((bp.breaklist===aj.NO_JUMP));self.leaveblock(self,ak);};luaY.check_conflict=function(a3,bG,s){ak=a3.fs;br=ak.freereg;let bH=false;while(RuntimeInternal.isTrue(bG)){if(RuntimeInternal.isTrue((bG.v.k===new Uint8Array([86,73,78,68,69,88,69,68])))){if(RuntimeInternal.isTrue((bG.v.info===s.info))){bH=true;bG.v.info=br;}if(RuntimeInternal.isTrue((bG.v.aux===s.info))){bH=true;bG.v.aux=br;}}bG=bG.prev;}if(RuntimeInternal.isTrue(bH)){aj.codeABC(aj,ak,new Uint8Array([79,80,95,77,79,86,69]),ak.freereg,s.info,0);aj.reserveregs(aj,ak,1);}};luaY.assignment=function(a3,bG,bl){al={};h=bG.v.k;self.check_condition(self,a3,(h===new Uint8Array([86,76,79,67,65,76]))||(h===new Uint8Array([86,85,80,86,65,76]))||(h===new Uint8Array([86,71,76,79,66,65,76]))||(h===new Uint8Array([86,73,78,68,69,88,69,68])),new Uint8Array([115,121,110,116,97,120,32,101,114,114,111,114]));if(RuntimeInternal.isTrue(self.testnext(self,a3,new Uint8Array([44])))){let bI={};bI.v={};bI.prev=bG;self.primaryexp(self,a3,bI.v);if(RuntimeInternal.isTrue((bI.v.k===new Uint8Array([86,76,79,67,65,76])))){self.check_conflict(self,a3,bG,bI.v);}self.checklimit(self,a3.fs,bl,(self.LUAI_MAXCCALLS-a3.L.nCcalls),new Uint8Array([118,97,114,105,97,98,108,101,115,32,105,110,32,97,115,115,105,103,110,109,101,110,116]));self.assignment(self,a3,bI,(bl+1));}else{self.checknext(self,a3,new Uint8Array([61]));let bq=RuntimeInternal.wrapAmbiguousCall(self.explist1(self,a3,al));if(RuntimeInternal.isTrue((bq!==bl))){self.adjust_assign(self,a3,bl,bq,al);if(RuntimeInternal.isTrue((bq>bl))){a3.fs.freereg=(a3.fs.freereg-(bq-bl));}}else{aj.setoneret(aj,a3.fs,al);aj.storevar(aj,a3.fs,bG.v,al);return;}}self.init_exp(self,al,new Uint8Array([86,78,79,78,82,69,76,79,67]),(a3.fs.freereg-1));aj.storevar(aj,a3.fs,bG.v,al);};luaY.cond=function(a3){s={};self.expr(self,a3,s);if(RuntimeInternal.isTrue((s.k===new Uint8Array([86,78,73,76])))){s.k=new Uint8Array([86,70,65,76,83,69]);}aj.goiftrue(aj,a3.fs,s);return s.f;};luaY.breakstat=function(a3){ak=a3.fs;bp=ak.bl;let bJ=false;while(RuntimeInternal.isTrue(bp&&!bp.isbreakable)){if(RuntimeInternal.isTrue(bp.upval)){bJ=true;}bp=bp.previous;}if(RuntimeInternal.isTrue(!bp)){T.syntaxerror(T,a3,new Uint8Array([110,111,32,108,111,111,112,32,116,111,32,98,114,101,97,107]));}if(RuntimeInternal.isTrue(bJ)){aj.codeABC(aj,ak,new Uint8Array([79,80,95,67,76,79,83,69]),bp.nactvar,0,0);}bp.breaklist=aj.concat(aj,ak,bp.breaklist,aj.jump(aj,ak));};luaY.whilestat=function(a3,ba){ak=a3.fs;bp={};T.next(T,a3);let bK=RuntimeInternal.wrapAmbiguousCall(aj.getlabel(aj,ak));let bL=RuntimeInternal.wrapAmbiguousCall(self.cond(self,a3));self.enterblock(self,ak,bp,true);self.checknext(self,a3,new Uint8Array([84,75,95,68,79]));self.block(self,a3);aj.patchlist(aj,ak,aj.jump(aj,ak),bK);self.check_match(self,a3,new Uint8Array([84,75,95,69,78,68]),new Uint8Array([84,75,95,87,72,73,76,69]),ba);self.leaveblock(self,ak);aj.patchtohere(aj,ak,bL);};luaY.repeatstat=function(a3,ba){ak=a3.fs;let bM=RuntimeInternal.wrapAmbiguousCall(aj.getlabel(aj,ak));let bN={},bO={};self.enterblock(self,ak,bN,true);self.enterblock(self,ak,bO,false);T.next(T,a3);self.chunk(self,a3);self.check_match(self,a3,new Uint8Array([84,75,95,85,78,84,73,76]),new Uint8Array([84,75,95,82,69,80,69,65,84]),ba);let bL=RuntimeInternal.wrapAmbiguousCall(self.cond(self,a3));if(RuntimeInternal.isTrue(!bO.upval)){self.leaveblock(self,ak);aj.patchlist(aj,a3.fs,bL,bM);}else{self.breakstat(self,a3);aj.patchtohere(aj,a3.fs,bL);self.leaveblock(self,ak);aj.patchlist(aj,a3.fs,aj.jump(aj,ak),bM);}self.leaveblock(self,ak);};luaY.exp1=function(a3){al={};self.expr(self,a3,al);aM=al.k;aj.exp2nextreg(aj,a3.fs,al);return aM;};luaY.forbody=function(a3,bb,ba,bl,bP){bp={};ak=a3.fs;self.adjustlocalvars(self,a3,3);self.checknext(self,a3,new Uint8Array([84,75,95,68,79]));let bQ=bP&&aj.codeAsBx(aj,ak,new Uint8Array([79,80,95,70,79,82,80,82,69,80]),bb,aj.NO_JUMP)||aj.jump(aj,ak);self.enterblock(self,ak,bp,false);self.adjustlocalvars(self,a3,bl);aj.reserveregs(aj,ak,bl);self.block(self,a3);self.leaveblock(self,ak);aj.patchtohere(aj,ak,bQ);let bR=bP&&aj.codeAsBx(aj,ak,new Uint8Array([79,80,95,70,79,82,76,79,79,80]),bb,aj.NO_JUMP)||aj.codeABC(aj,ak,new Uint8Array([79,80,95,84,70,79,82,76,79,79,80]),bb,0,bl);aj.fixline(aj,ak,ba);aj.patchlist(aj,ak,bP&&bR||aj.jump(aj,ak),(bQ+1));};luaY.fornum=function(a3,bj,ba){ak=a3.fs;bb=ak.freereg;self.new_localvarliteral(self,a3,new Uint8Array([40,102,111,114,32,105,110,100,101,120,41]),0);self.new_localvarliteral(self,a3,new Uint8Array([40,102,111,114,32,108,105,109,105,116,41]),1);self.new_localvarliteral(self,a3,new Uint8Array([40,102,111,114,32,115,116,101,112,41]),2);self.new_localvar(self,a3,bj,3);self.checknext(self,a3,new Uint8Array([61]));self.exp1(self,a3);self.checknext(self,a3,new Uint8Array([44]));self.exp1(self,a3);if(RuntimeInternal.isTrue(self.testnext(self,a3,new Uint8Array([44])))){self.exp1(self,a3);}else{aj.codeABx(aj,ak,new Uint8Array([79,80,95,76,79,65,68,75]),ak.freereg,aj.numberK(aj,ak,1));aj.reserveregs(aj,ak,1);}self.forbody(self,a3,bb,ba,1,true);};luaY.forlist=function(a3,bS){ak=a3.fs;al={};let bl=0;bb=ak.freereg;self.new_localvarliteral(self,a3,new Uint8Array([40,102,111,114,32,103,101,110,101,114,97,116,111,114,41]),bl);bl=(bl+1);self.new_localvarliteral(self,a3,new Uint8Array([40,102,111,114,32,115,116,97,116,101,41]),bl);bl=(bl+1);self.new_localvarliteral(self,a3,new Uint8Array([40,102,111,114,32,99,111,110,116,114,111,108,41]),bl);bl=(bl+1);self.new_localvar(self,a3,bS,bl);bl=(bl+1);while(RuntimeInternal.isTrue(self.testnext(self,a3,new Uint8Array([44])))){self.new_localvar(self,a3,self.str_checkname(self,a3),bl);bl=(bl+1);}self.checknext(self,a3,new Uint8Array([84,75,95,73,78]));ba=a3.linenumber;self.adjust_assign(self,a3,3,self.explist1(self,a3,al),al);aj.checkstack(aj,ak,3);self.forbody(self,a3,bb,ba,(bl-3),false);};luaY.forstat=function(a3,ba){ak=a3.fs;bp={};self.enterblock(self,ak,bp,true);T.next(T,a3);let bj=RuntimeInternal.wrapAmbiguousCall(self.str_checkname(self,a3));h=a3.t.token;if(RuntimeInternal.isTrue((h===new Uint8Array([61])))){self.fornum(self,a3,bj,ba);}else if(RuntimeInternal.isTrue((h===new Uint8Array([44]))||(h===new Uint8Array([84,75,95,73,78])))){self.forlist(self,a3,bj);}else{T.syntaxerror(T,a3,(RuntimeInternal.concatString(self.LUA_QL(self,new Uint8Array([61])),(RuntimeInternal.concatString(new Uint8Array([32,111,114,32]),(RuntimeInternal.concatString(self.LUA_QL(self,new Uint8Array([105,110])),new Uint8Array([32,101,120,112,101,99,116,101,100]))))))));}self.check_match(self,a3,new Uint8Array([84,75,95,69,78,68]),new Uint8Array([84,75,95,70,79,82]),ba);self.leaveblock(self,ak);};luaY.test_then_block=function(a3){T.next(T,a3);let bL=RuntimeInternal.wrapAmbiguousCall(self.cond(self,a3));self.checknext(self,a3,new Uint8Array([84,75,95,84,72,69,78]));self.block(self,a3);return bL;};luaY.ifstat=function(a3,ba){ak=a3.fs;let bT=aj.NO_JUMP;let bU=RuntimeInternal.wrapAmbiguousCall(self.test_then_block(self,a3));while(RuntimeInternal.isTrue((a3.t.token===new Uint8Array([84,75,95,69,76,83,69,73,70])))){bT=aj.concat(aj,ak,bT,aj.jump(aj,ak));aj.patchtohere(aj,ak,bU);bU=self.test_then_block(self,a3);}if(RuntimeInternal.isTrue((a3.t.token===new Uint8Array([84,75,95,69,76,83,69])))){bT=aj.concat(aj,ak,bT,aj.jump(aj,ak));aj.patchtohere(aj,ak,bU);T.next(T,a3);self.block(self,a3);}else{bT=aj.concat(aj,ak,bT,bU);}aj.patchtohere(aj,ak,bT);self.check_match(self,a3,new Uint8Array([84,75,95,69,78,68]),new Uint8Array([84,75,95,73,70]),ba);};luaY.localfunc=function(a3){s={},f={};ak=a3.fs;self.new_localvar(self,a3,self.str_checkname(self,a3),0);self.init_exp(self,s,new Uint8Array([86,76,79,67,65,76]),ak.freereg);aj.reserveregs(aj,ak,1);self.adjustlocalvars(self,a3,1);self.body(self,a3,f,false,a3.linenumber);aj.storevar(aj,ak,s,f);self.getlocvar(self,ak,(ak.nactvar-1)).startpc=ak.pc;};luaY.localstat=function(a3){bl=0;let bq;al={};do{self.new_localvar(self,a3,self.str_checkname(self,a3),bl);bl=(bl+1);}while(RuntimeInternal.isTrue(!self.testnext(self,a3,new Uint8Array([44]))));if(RuntimeInternal.isTrue(self.testnext(self,a3,new Uint8Array([61])))){bq=self.explist1(self,a3,al);}else{al.k=new Uint8Array([86,86,79,73,68]);bq=0;}self.adjust_assign(self,a3,bl,bq,al);self.adjustlocalvars(self,a3,bl);};luaY.funcname=function(a3,s){let bz=false;self.singlevar(self,a3,s);while(RuntimeInternal.isTrue((a3.t.token===new Uint8Array([46])))){self.field(self,a3,s);}if(RuntimeInternal.isTrue((a3.t.token===new Uint8Array([58])))){bz=true;self.field(self,a3,s);}return bz;};luaY.funcstat=function(a3,ba){s={},f={};T.next(T,a3);bz=RuntimeInternal.wrapAmbiguousCall(self.funcname(self,a3,s));self.body(self,a3,f,bz,ba);aj.storevar(aj,a3.fs,s,f);aj.fixline(aj,a3.fs,ba);};luaY.exprstat=function(a3){ak=a3.fs;s={};s.v={};self.primaryexp(self,a3,s.v);if(RuntimeInternal.isTrue((s.v.k===new Uint8Array([86,67,65,76,76])))){b.SETARG_C(b,aj.getcode(aj,ak,s.v),1);}else{s.prev=null;self.assignment(self,a3,s,1);}};luaY.retstat=function(a3){ak=a3.fs;al={};let a0,at;T.next(T,a3);if(RuntimeInternal.isTrue(self.block_follow(self,a3.t.token)||(a3.t.token===new Uint8Array([59])))){a0=0,at=0;}else{at=self.explist1(self,a3,al);if(RuntimeInternal.isTrue(self.hasmultret(self,al.k))){aj.setmultret(aj,ak,al);if(RuntimeInternal.isTrue((al.k===new Uint8Array([86,67,65,76,76]))&&(at===1))){b.SET_OPCODE(b,aj.getcode(aj,ak,al),new Uint8Array([79,80,95,84,65,73,76,67,65,76,76]));assert((b.GETARG_A(b,aj.getcode(aj,ak,al))===ak.nactvar));}a0=ak.nactvar;at=self.LUA_MULTRET;}else{if(RuntimeInternal.isTrue((at===1))){a0=aj.exp2anyreg(aj,ak,al);}else{aj.exp2nextreg(aj,ak,al);a0=ak.nactvar;assert((at===(ak.freereg-a0)));}}}aj.ret(aj,ak,a0,at);};luaY.statement=function(a3){ba=a3.linenumber;h=a3.t.token;if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,73,70])))){self.ifstat(self,a3,ba);return false;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,87,72,73,76,69])))){self.whilestat(self,a3,ba);return false;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,68,79])))){T.next(T,a3);self.block(self,a3);self.check_match(self,a3,new Uint8Array([84,75,95,69,78,68]),new Uint8Array([84,75,95,68,79]),ba);return false;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,70,79,82])))){self.forstat(self,a3,ba);return false;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,82,69,80,69,65,84])))){self.repeatstat(self,a3,ba);return false;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,70,85,78,67,84,73,79,78])))){self.funcstat(self,a3,ba);return false;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,76,79,67,65,76])))){T.next(T,a3);if(RuntimeInternal.isTrue(self.testnext(self,a3,new Uint8Array([84,75,95,70,85,78,67,84,73,79,78])))){self.localfunc(self,a3);}else{self.localstat(self,a3);}return false;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,82,69,84,85,82,78])))){self.retstat(self,a3);return true;}else if(RuntimeInternal.isTrue((h===new Uint8Array([84,75,95,66,82,69,65,75])))){T.next(T,a3);self.breakstat(self,a3);return true;}else{self.exprstat(self,a3);return false;}};luaY.chunk=function(a3){let bV=false;self.enterlevel(self,a3);while(RuntimeInternal.isTrue(!bV&&!self.block_follow(self,a3.t.token))){bV=self.statement(self,a3);self.testnext(self,a3,new Uint8Array([59]));assert((a3.fs.f.maxstacksize>=a3.fs.freereg)&&(a3.fs.freereg>=a3.fs.nactvar));a3.fs.freereg=a3.fs.nactvar;}self.leavelevel(self,a3);};a.LuaY=luaY;let bW={['_TYPE']:new Uint8Array([109,111,100,117,108,101]),['_NAME']:new Uint8Array([98,105,116,111,112,46,102,117,110,99,115]),['_VERSION']:new Uint8Array([49,46,48,45,48])};let bX=math.floor;let bY=(2**32);let bZ=(bY-1);let b_=function(N){let c0={};let v=RuntimeInternal.wrapAmbiguousCall(setmetatable({},c0));c0.__index=function(aM){s=RuntimeInternal.wrapAmbiguousCall(N(aM));v[aM]=s;return s;};return v;};let c1=function(v,u){let c2=function(g,f){let c3=0;C=1;while(RuntimeInternal.isTrue((g!==0)&&(f!==0))){let c4=(g%u),c5=(f%u);c3=(c3+(v[c4][c5]*C));g=((g-c4)/u);f=((f-c5)/u);C=(C*u);}c3=(c3+((g+f)*C));return c3;};return c2;};let c6=function(v){let c7=RuntimeInternal.wrapAmbiguousCall(c1(v,(2**1)));let c8=RuntimeInternal.wrapAmbiguousCall(b_(function(g){return b_(function(f){return c7(g,f);});}));return c1(c8,(2**v.n||1));};bW.tobit=function(o){return (o%(2**32));};bW.bxor=c6();let c9=bW.bxor;bW.bnot=function(g){return (bZ-g);};let ca=bW.bnot;bW.band=function(g,f){return (((g+f)-c9(g,f))/2);};let cb=bW.band;bW.bor=function(g,f){return (bZ-cb((bZ-g),(bZ-f)));};let cc=bW.bor;let cd,ce;bW.rshift=function(g,cf){if(RuntimeInternal.isTrue((cf<0))){return cd(g,(-cf));}return bX(((g%(2**32))/(2**cf)));};ce=bW.rshift;bW.lshift=function(g,cf){if(RuntimeInternal.isTrue((cf<0))){return ce(g,(-cf));}return ((g*(2**cf))%(2**32));};cd=bW.lshift;bW.tohex=function(o,t){t=t||8;let cg;if(RuntimeInternal.isTrue((t<=0))){if(RuntimeInternal.isTrue((t===0))){return new Uint8Array([]);}cg=true;t=(-t);}o=cb(o,((16**t)-1));return (RuntimeInternal.concatString(new Uint8Array([37,48]),(RuntimeInternal.concatString(t,cg&&new Uint8Array([88])||new Uint8Array([120]))))).format((RuntimeInternal.concatString(new Uint8Array([37,48]),(RuntimeInternal.concatString(t,cg&&new Uint8Array([88])||new Uint8Array([120]))))),o);};let ch=bW.tohex;bW.extract=function(t,ci,cj){cj=cj||1;return cb(ce(t,ci),((2**cj)-1));};let ck=bW.extract;bW.replace=function(t,s,ci,cj){cj=cj||1;let cl=((2**cj)-1);s=cb(s,cl);let cm=RuntimeInternal.wrapAmbiguousCall(ca(cd(cl,ci)));return (cb(t,cm)+cd(s,ci));};let cn=bW.replace;bW.bswap=function(o){g=RuntimeInternal.wrapAmbiguousCall(cb(o,255));o=ce(o,8);f=RuntimeInternal.wrapAmbiguousCall(cb(o,255));o=ce(o,8);h=RuntimeInternal.wrapAmbiguousCall(cb(o,255));o=ce(o,8);let co=RuntimeInternal.wrapAmbiguousCall(cb(o,255));return (cd((cd((cd(g,8)+f),8)+h),8)+co);};let cp=bW.bswap;bW.rrotate=function(o,cf){cf=(cf%32);let cq=RuntimeInternal.wrapAmbiguousCall(cb(o,((2**cf)-1)));return (ce(o,cf)+cd(cq,(32-cf)));};let cr=bW.rrotate;bW.lrotate=function(o,cf){return cr(o,(-cf));};let cs=bW.lrotate;bW.rol=bW.lrotate;bW.ror=bW.rrotate;bW.arshift=function(o,cf){B=RuntimeInternal.wrapAmbiguousCall(ce(o,cf));if(RuntimeInternal.isTrue((o>=2147483648))){B=(B+cd(((2**cf)-1),(32-cf)));}return B;};let ct=bW.arshift;bW.btest=function(o,M){return (cb(o,M)!==0);};bW.bit32={};let cu=function(o){return (((-1)-o)%bY);};bW.bit32.bnot=cu;let cv=function(g,f,h,...RuntimeInternal_VARARG){let B;if(RuntimeInternal.isTrue(f)){g=(g%bY);f=(f%bY);B=c9(g,f);if(RuntimeInternal.isTrue(h)){B=cv(B,h,...RuntimeInternal_VARARG);}return B;}else if(RuntimeInternal.isTrue(g)){return (g%bY);}else{return 0;}};bW.bit32.bxor=cv;let cw=function(g,f,h,...RuntimeInternal_VARARG){let B;if(RuntimeInternal.isTrue(f)){g=(g%bY);f=(f%bY);B=(((g+f)-c9(g,f))/2);if(RuntimeInternal.isTrue(h)){B=cw(B,h,...RuntimeInternal_VARARG);}return B;}else if(RuntimeInternal.isTrue(g)){return (g%bY);}else{return bZ;}};bW.bit32.band=cw;let cx=function(g,f,h,...RuntimeInternal_VARARG){let B;if(RuntimeInternal.isTrue(f)){g=(g%bY);f=(f%bY);B=(bZ-cb((bZ-g),(bZ-f)));if(RuntimeInternal.isTrue(h)){B=cx(B,h,...RuntimeInternal_VARARG);}return B;}else if(RuntimeInternal.isTrue(g)){return (g%bY);}else{return 0;}};bW.bit32.bor=cx;bW.bit32.btest=function(...RuntimeInternal_VARARG){return (cw(...RuntimeInternal_VARARG)!==0);};bW.bit32.lrotate=function(o,cf){return cs((o%bY),cf);};bW.bit32.rrotate=function(o,cf){return cr((o%bY),cf);};bW.bit32.lshift=function(o,cf){if(RuntimeInternal.isTrue((cf>31)||(cf<(-31)))){return 0;}return cd((o%bY),cf);};bW.bit32.rshift=function(o,cf){if(RuntimeInternal.isTrue((cf>31)||(cf<(-31)))){return 0;}return ce((o%bY),cf);};bW.bit32.arshift=function(o,cf){o=(o%bY);if(RuntimeInternal.isTrue((cf>=0))){if(RuntimeInternal.isTrue((cf>31))){return (o>=2147483648)&&bZ||0;}else{B=RuntimeInternal.wrapAmbiguousCall(ce(o,cf));if(RuntimeInternal.isTrue((o>=2147483648))){B=(B+cd(((2**cf)-1),(32-cf)));}return B;}}else{return cd(o,(-cf));}};bW.bit32.extract=function(o,ci,...RuntimeInternal_VARARG){let cj=RuntimeInternal_VARARG[0]||1;if(RuntimeInternal.isTrue((ci<0)||(ci>31)||(cj<0)||((ci+cj)>32))){error(new Uint8Array([111,117,116,32,111,102,32,114,97,110,103,101]));}o=(o%bY);return ck(o,ci,...RuntimeInternal_VARARG);};bW.bit32.replace=function(o,s,ci,...RuntimeInternal_VARARG){cj=RuntimeInternal_VARARG[0]||1;if(RuntimeInternal.isTrue((ci<0)||(ci>31)||(cj<0)||((ci+cj)>32))){error(new Uint8Array([111,117,116,32,111,102,32,114,97,110,103,101]));}o=(o%bY);s=(s%bY);return cn(o,s,ci,...RuntimeInternal_VARARG);};bW.bit={};bW.bit.tobit=function(o){o=(o%bY);if(RuntimeInternal.isTrue((o>=2147483648))){o=(o-bY);}return o;};let cy=bW.bit.tobit;bW.bit.tohex=function(o,...RuntimeInternal_VARARG){return ch((o%bY),...RuntimeInternal_VARARG);};bW.bit.bnot=function(o){return cy(ca((o%bY)));};let cz=function(g,f,h,...RuntimeInternal_VARARG){if(RuntimeInternal.isTrue(h)){return cz(cz(g,f),h,...RuntimeInternal_VARARG);}else if(RuntimeInternal.isTrue(f)){return cy(cc((g%bY),(f%bY)));}else{return cy(g);}};bW.bit.bor=cz;let cA=function(g,f,h,...RuntimeInternal_VARARG){if(RuntimeInternal.isTrue(h)){return cA(cA(g,f),h,...RuntimeInternal_VARARG);}else if(RuntimeInternal.isTrue(f)){return cy(cb((g%bY),(f%bY)));}else{return cy(g);}};bW.bit.band=cA;let cB=function(g,f,h,...RuntimeInternal_VARARG){if(RuntimeInternal.isTrue(h)){return cB(cB(g,f),h,...RuntimeInternal_VARARG);}else if(RuntimeInternal.isTrue(f)){return cy(c9((g%bY),(f%bY)));}else{return cy(g);}};bW.bit.bxor=cB;bW.bit.lshift=function(o,t){return cy(cd((o%bY),(t%32)));};bW.bit.rshift=function(o,t){return cy(ce((o%bY),(t%32)));};bW.bit.arshift=function(o,t){return cy(ct((o%bY),(t%32)));};bW.bit.rol=function(o,t){return cy(cs((o%bY),(t%32)));};bW.bit.ror=function(o,t){return cy(cr((o%bY),(t%32)));};bW.bit.bswap=function(o){return cy(cp((o%bY)));};bit=bW.bit;let bit=bit||bit32||require(new Uint8Array([98,105,116]));let unpack=table.unpack||unpack;let cC;let cD;let cE;let cF=50;let cG={[0]:new Uint8Array([65,66,67]),1:new Uint8Array([65,66,120]),2:new Uint8Array([65,66,67]),3:new Uint8Array([65,66,67]),4:new Uint8Array([65,66,67]),5:new Uint8Array([65,66,120]),6:new Uint8Array([65,66,67]),7:new Uint8Array([65,66,120]),8:new Uint8Array([65,66,67]),9:new Uint8Array([65,66,67]),10:new Uint8Array([65,66,67]),11:new Uint8Array([65,66,67]),12:new Uint8Array([65,66,67]),13:new Uint8Array([65,66,67]),14:new Uint8Array([65,66,67]),15:new Uint8Array([65,66,67]),16:new Uint8Array([65,66,67]),17:new Uint8Array([65,66,67]),18:new Uint8Array([65,66,67]),19:new Uint8Array([65,66,67]),20:new Uint8Array([65,66,67]),21:new Uint8Array([65,66,67]),22:new Uint8Array([65,115,66,120]),23:new Uint8Array([65,66,67]),24:new Uint8Array([65,66,67]),25:new Uint8Array([65,66,67]),26:new Uint8Array([65,66,67]),27:new Uint8Array([65,66,67]),28:new Uint8Array([65,66,67]),29:new Uint8Array([65,66,67]),30:new Uint8Array([65,66,67]),31:new Uint8Array([65,115,66,120]),32:new Uint8Array([65,115,66,120]),33:new Uint8Array([65,66,67]),34:new Uint8Array([65,66,67]),35:new Uint8Array([65,66,67]),36:new Uint8Array([65,66,120]),37:new Uint8Array([65,66,67])};let cH={[0]:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,78])},1:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,78])},2:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,85])},3:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,78])},4:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,78])},5:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,78])},6:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,75])},7:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,78])},8:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,78])},9:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},10:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,85])},11:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,75])},12:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},13:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},14:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},15:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},16:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},17:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},18:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,78])},19:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,78])},20:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,78])},21:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,82])},22:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,78])},23:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},24:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},25:{['b']:new Uint8Array([79,112,65,114,103,75]),['c']:new Uint8Array([79,112,65,114,103,75])},26:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,85])},27:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,85])},28:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,85])},29:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,85])},30:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,78])},31:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,78])},32:{['b']:new Uint8Array([79,112,65,114,103,82]),['c']:new Uint8Array([79,112,65,114,103,78])},33:{['b']:new Uint8Array([79,112,65,114,103,78]),['c']:new Uint8Array([79,112,65,114,103,85])},34:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,85])},35:{['b']:new Uint8Array([79,112,65,114,103,78]),['c']:new Uint8Array([79,112,65,114,103,78])},36:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,78])},37:{['b']:new Uint8Array([79,112,65,114,103,85]),['c']:new Uint8Array([79,112,65,114,103,78])}};let cI=function(cJ,F,al,co){let cK=0;for(let c=F;c<=al;c+=co){cK=(cK+(cJ.byte(cJ,c,c)*(256**(c-F))));}return cK;};let cL=function(cM,cN,cO,cP){I=((-1)**bit.rshift(cP,7));let cQ=(bit.rshift(cO,7)+bit.lshift(bit.band(cP,127),1));let cR=((cM+bit.lshift(cN,8))+bit.lshift(bit.band(cO,127),16));let cS=1;if(RuntimeInternal.isTrue((cQ===0))){if(RuntimeInternal.isTrue((cR===0))){return (I*0);}else{cS=0;cQ=1;}}else if(RuntimeInternal.isTrue((cQ===127))){if(RuntimeInternal.isTrue((cR===0))){return ((I*1)/0);}else{return ((I*0)/0);}}return ((I*(2**(cQ-127)))*(1+(cS/(2**23))));};let cT=function(cM,cN,cO,cP,cU,cV,cW,cX){I=((-1)**bit.rshift(cX,7));cQ=(bit.lshift(bit.band(cX,127),4)+bit.rshift(cW,4));cR=(bit.band(cW,15)*(2**48));cS=1;cR=((((((cR+(cV*(2**40)))+(cU*(2**32)))+(cP*(2**24)))+(cO*(2**16)))+(cN*(2**8)))+cM);if(RuntimeInternal.isTrue((cQ===0))){if(RuntimeInternal.isTrue((cR===0))){return (I*0);}else{cS=0;cQ=1;}}else if(RuntimeInternal.isTrue((cQ===2047))){if(RuntimeInternal.isTrue((cR===0))){return ((I*1)/0);}else{return ((I*0)/0);}}return ((I*(2**(cQ-1023)))*(cS+(cR/(2**52))));};let cY=function(cJ,F,al){return cI(cJ,F,(al-1),1);};let cZ=function(cJ,F,al){return cI(cJ,(al-1),F,(-1));};let c_=function(cJ,F){return cL(cJ.byte(cJ,F,(F+3)));};let d0=function(cJ,F){let[cM,cN,cO,cP]=cJ.byte(cJ,F,(F+3));return cL(cP,cO,cN,cM);};let d1=function(cJ,F){return cT(cJ.byte(cJ,F,(F+7)));};let d2=function(cJ,F){let[cM,cN,cO,cP,cU,cV,cW,cX]=cJ.byte(cJ,F,(F+7));return cT(cX,cW,cV,cU,cP,cO,cN,cM);};let d3={[4]:{['little']:c_,['big']:d0},[8]:{['little']:d1,['big']:d2}};let d4=function(d5){aN=d5.index;let d6=RuntimeInternal.wrapAmbiguousCall(d5.source.byte(d5.source,aN,aN));d5.index=(aN+1);return d6;};let d7=function(d5,a2){let d8=(d5.index+a2);let Y=RuntimeInternal.wrapAmbiguousCall(d5.source.sub(d5.source,d5.index,(d8-1)));d5.index=d8;return Y;};let d9=function(d5){let a2=RuntimeInternal.wrapAmbiguousCall(d5.s_szt(d5));let Y;if(RuntimeInternal.isTrue((a2!==0))){Y=d7(d5,a2).sub(d7(d5,a2),1,(-2));}return Y;};let da=function(a2,aZ){return function(d5){d8=(d5.index+a2);let db=RuntimeInternal.wrapAmbiguousCall(aZ(d5.source,d5.index,d8));d5.index=d8;return db;};};let dc=function(a2,aZ){return function(d5){let dd=RuntimeInternal.wrapAmbiguousCall(aZ(d5.source,d5.index));d5.index=(d5.index+a2);return dd;};};let de=function(d5){let be=RuntimeInternal.wrapAmbiguousCall(d5.s_int(d5));let df={};for(let c=1;c<=be;c++){let dg=RuntimeInternal.wrapAmbiguousCall(d5.s_ins(d5));q=RuntimeInternal.wrapAmbiguousCall(bit.band(dg,63));bB=cG[q];let dh=cH[q];y={['value']:dg,['op']:q,['A']:bit.band(bit.rshift(dg,6),255)};if(RuntimeInternal.isTrue((bB===new Uint8Array([65,66,67])))){y.B=bit.band(bit.rshift(dg,23),511);y.C=bit.band(bit.rshift(dg,14),511);y.is_KB=(dh.b===new Uint8Array([79,112,65,114,103,75]))&&(y.B>255);y.is_KC=(dh.c===new Uint8Array([79,112,65,114,103,75]))&&(y.C>255);}else if(RuntimeInternal.isTrue((bB===new Uint8Array([65,66,120])))){y.Bx=bit.band(bit.rshift(dg,14),262143);y.is_K=(dh.b===new Uint8Array([79,112,65,114,103,75]));}else if(RuntimeInternal.isTrue((bB===new Uint8Array([65,115,66,120])))){y.sBx=(bit.band(bit.rshift(dg,14),262143)-131071);}df[c]=y;}return df;};let di=function(d5){let be=RuntimeInternal.wrapAmbiguousCall(d5.s_int(d5));let dj={};for(let c=1;c<=be;c++){let G=RuntimeInternal.wrapAmbiguousCall(d4(d5));let aM;if(RuntimeInternal.isTrue((G===1))){aM=(d4(d5)!==0);}else if(RuntimeInternal.isTrue((G===3))){aM=d5.s_num(d5);}else if(RuntimeInternal.isTrue((G===4))){aM=d9(d5);}dj[c]=aM;}return dj;};let dk=function(d5,cJ){let be=RuntimeInternal.wrapAmbiguousCall(d5.s_int(d5));let dl={};for(let c=1;c<=be;c++){dl[c]=cE(d5,cJ);}return dl;};let dm=function(d5){let be=RuntimeInternal.wrapAmbiguousCall(d5.s_int(d5));let dn={};for(let c=1;c<=be;c++){dn[c]=d5.s_int(d5);}return dn;};let dp=function(d5){let be=RuntimeInternal.wrapAmbiguousCall(d5.s_int(d5));let dq={};for(let c=1;c<=be;c++){dq[c]={['varname']:d9(d5),['startpc']:d5.s_int(d5),['endpc']:d5.s_int(d5)};}return dq;};let dr=function(d5){let be=RuntimeInternal.wrapAmbiguousCall(d5.s_int(d5));let ds={};for(let c=1;c<=be;c++){ds[c]=d9(d5);}return ds;};cE=function(d5,dt){let du={};let cJ=d9(d5)||dt;du.source=cJ;d5.s_int(d5);d5.s_int(d5);du.numupvals=d4(d5);du.numparams=d4(d5);d4(d5);d4(d5);du.code=de(d5);du.const=di(d5);du.subs=dk(d5,cJ);du.lines=dm(d5);dp(d5);dr(d5);let _=ipairs(du.code),_f,_s,_v;if(typeof _=='object'){[_f,_s,_v]=_}else{_f=_}while(true){let[W,s]=_f(_s,_v);_v=W;if(_v==null||_v==undefined){break}if(RuntimeInternal.isTrue(s.is_K)){s.const=du.const[(s.Bx+1)];}else{if(RuntimeInternal.isTrue(s.is_KB)){s.const_B=du.const[(s.B-255)];}if(RuntimeInternal.isTrue(s.is_KC)){s.const_C=du.const[(s.C-255)];}}}return du;};cC=function(cJ){let dv;let dw;let dx;let dy;let dz;let dA;let dB;let dC={['index']:1,['source']:cJ};assert((d7(dC,4)===new Uint8Array([92,50,55,76,117,97])),new Uint8Array([105,110,118,97,108,105,100,32,76,117,97,32,115,105,103,110,97,116,117,114,101]));assert((d4(dC)===81),new Uint8Array([105,110,118,97,108,105,100,32,76,117,97,32,118,101,114,115,105,111,110]));assert((d4(dC)===0),new Uint8Array([105,110,118,97,108,105,100,32,76,117,97,32,102,111,114,109,97,116]));dw=(d4(dC)!==0);dx=d4(dC);dy=d4(dC);dz=d4(dC);dA=d4(dC);dB=(d4(dC)!==0);dv=dw&&cY||cZ;dC.s_int=da(dx,dv);dC.s_szt=da(dy,dv);dC.s_ins=da(dz,dv);if(RuntimeInternal.isTrue(dB)){dC.s_num=da(dA,dv);}else if(RuntimeInternal.isTrue(d3[dA])){dC.s_num=dc(dA,d3[dA][dw&&new Uint8Array([108,105,116,116,108,101])||new Uint8Array([98,105,103])]);}else{error(new Uint8Array([117,110,115,117,112,112,111,114,116,101,100,32,102,108,111,97,116,32,115,105,122,101]));}return cE(dC,new Uint8Array([64,118,105,114,116,117,97,108]));};let dD=function(aC,dE){let _=pairs(aC),_f,_s,_v;if(typeof _=='object'){[_f,_s,_v]=_}else{_f=_}while(true){let[c,dF]=_f(_s,_v);_v=c;if(_v==null||_v==undefined){break}if(RuntimeInternal.isTrue((dF.index>=dE))){dF.value=dF.store[dF.index];dF.store=dF;dF.index=new Uint8Array([118,97,108,117,101]);aC[c]=null;}}};let dG=function(aC,dE,dH){let dI=aC[dE];if(RuntimeInternal.isTrue(!dI)){dI={['index']:dE,['store']:dH};aC[dE]=dI;}return dI;};let dJ=function(...RuntimeInternal_VARARG){return[select(new Uint8Array([35]),...RuntimeInternal_VARARG),RuntimeInternal.addVararg({},RuntimeInternal_VARARG,1)];};let dK=function(dL,dM){cJ=dL.source;ba=dL.lines[(dL.pc-1)];let[dt,dN,dO]=dM.match(dM,new Uint8Array([94,40,46,45,41,58,40,37,100,43,41,58,37,115,43,40,46,43,41]));let dP=new Uint8Array([37,115,58,37,105,58,32,91,37,115,58,37,105,93,32,37,115]);ba=ba||new Uint8Array([48]);dt=dt||new Uint8Array([63]);dN=dN||new Uint8Array([48]);dO=dO||dM;error(string.format(dP,cJ,ba,dt,dN,dO),0);};let dQ=function(dL){df=dL.code;let dR=dL.subs;let dS=dL.env;let dT=dL.upvals;let dU=dL.varargs;let dV=(-1);let dW={};let dH=dL.stack;aw=dL.pc;while(RuntimeInternal.isTrue(true)){let dX=df[aw];q=dX.op;aw=(aw+1);if(RuntimeInternal.isTrue((q<19))){if(RuntimeInternal.isTrue((q<9))){if(RuntimeInternal.isTrue((q<4))){if(RuntimeInternal.isTrue((q<2))){if(RuntimeInternal.isTrue((q<1))){dH[dX.A]=dH[dX.B];}else{dH[dX.A]=dX.const;}}else if(RuntimeInternal.isTrue((q>2))){for(let c=dX.A;c<=dX.B;c++){dH[c]=null;}}else{dH[dX.A]=(dX.B!==0);if(RuntimeInternal.isTrue((dX.C!==0))){aw=(aw+1);}}}else if(RuntimeInternal.isTrue((q>4))){if(RuntimeInternal.isTrue((q<7))){if(RuntimeInternal.isTrue((q<6))){dH[dX.A]=dS[dX.const];}else{let dE;if(RuntimeInternal.isTrue(dX.is_KC)){dE=dX.const_C;}else{dE=dH[dX.C];}dH[dX.A]=dH[dX.B][dE];}}else if(RuntimeInternal.isTrue((q>7))){let dF=dT[dX.B];dF.store[dF.index]=dH[dX.A];}else{dS[dX.const]=dH[dX.A];}}else{dF=dT[dX.B];dH[dX.A]=dF.store[dF.index];}}else if(RuntimeInternal.isTrue((q>9))){if(RuntimeInternal.isTrue((q<14))){if(RuntimeInternal.isTrue((q<12))){if(RuntimeInternal.isTrue((q<11))){dH[dX.A]={};}else{let am=dX.A;let au=dX.B;let dE;if(RuntimeInternal.isTrue(dX.is_KC)){dE=dX.const_C;}else{dE=dH[dX.C];}dH[(am+1)]=dH[au];dH[am]=dH[au][dE];}}else if(RuntimeInternal.isTrue((q>12))){let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}dH[dX.A]=(dY-dZ);}else{let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}dH[dX.A]=(dY+dZ);}}else if(RuntimeInternal.isTrue((q>14))){if(RuntimeInternal.isTrue((q<17))){if(RuntimeInternal.isTrue((q<16))){let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}dH[dX.A]=(dY/dZ);}else{let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}dH[dX.A]=(dY%dZ);}}else if(RuntimeInternal.isTrue((q>17))){dH[dX.A]=(-dH[dX.B]);}else{let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}dH[dX.A]=(dY**dZ);}}else{let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}dH[dX.A]=(dY*dZ);}}else{let dE,d_;if(RuntimeInternal.isTrue(dX.is_KB)){dE=dX.const_B;}else{dE=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){d_=dX.const_C;}else{d_=dH[dX.C];}dH[dX.A][dE]=d_;}}else if(RuntimeInternal.isTrue((q>19))){if(RuntimeInternal.isTrue((q<29))){if(RuntimeInternal.isTrue((q<24))){if(RuntimeInternal.isTrue((q<22))){if(RuntimeInternal.isTrue((q<21))){dH[dX.A]=RuntimeInternal.getLength(dH[dX.B]);}else{Y=dH[dX.B];for(let c=(dX.B+1);c<=dX.C;c++){Y=(RuntimeInternal.concatString(Y,dH[c]));}dH[dX.A]=Y;}}else if(RuntimeInternal.isTrue((q>22))){let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}if(RuntimeInternal.isTrue(((dY===dZ)!==(dX.A!==0)))){aw=(aw+1);}}else{aw=(aw+dX.sBx);}}else if(RuntimeInternal.isTrue((q>24))){if(RuntimeInternal.isTrue((q<27))){if(RuntimeInternal.isTrue((q<26))){let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}if(RuntimeInternal.isTrue(((dY<=dZ)!==(dX.A!==0)))){aw=(aw+1);}}else{if(RuntimeInternal.isTrue((!dH[dX.A]===(dX.C!==0)))){aw=(aw+1);}}}else if(RuntimeInternal.isTrue((q>27))){am=dX.A;au=dX.B;let av=dX.C;let e0;let e1,e2;if(RuntimeInternal.isTrue((au===0))){e0=(dV-am);}else{e0=(au-1);}e1=dJ(dH[am](unpack(dH,(am+1),(am+e0)))),e2;if(RuntimeInternal.isTrue((av===0))){dV=((am+e1)-1);}else{e1=(av-1);}for(let c=1;c<=e1;c++){dH[((am+c)-1)]=e2[c];}}else{am=dX.A;au=dX.B;if(RuntimeInternal.isTrue((!dH[au]===(dX.C!==0)))){aw=(aw+1);}else{dH[am]=dH[au];}}}else{let dY,dZ;if(RuntimeInternal.isTrue(dX.is_KB)){dY=dX.const_B;}else{dY=dH[dX.B];}if(RuntimeInternal.isTrue(dX.is_KC)){dZ=dX.const_C;}else{dZ=dH[dX.C];}if(RuntimeInternal.isTrue(((dY<dZ)!==(dX.A!==0)))){aw=(aw+1);}}}else if(RuntimeInternal.isTrue((q>29))){if(RuntimeInternal.isTrue((q<34))){if(RuntimeInternal.isTrue((q<32))){if(RuntimeInternal.isTrue((q<31))){am=dX.A;au=dX.B;let e3={};let be;if(RuntimeInternal.isTrue((au===0))){be=((dV-am)+1);}else{be=(au-1);}for(let c=1;c<=be;c++){e3[c]=dH[((am+c)-1)];}dD(dW,0);return[be,e3];}else{am=dX.A;let e4=dH[(am+2)];dE=(dH[am]+e4);let bf=dH[(am+1)];let e5;if(RuntimeInternal.isTrue((e4===math.abs(e4)))){e5=(dE<=bf);}else{e5=(dE>=bf);}if(RuntimeInternal.isTrue(e5)){dH[dX.A]=dE;dH[(dX.A+3)]=dE;aw=(aw+dX.sBx);}}}else if(RuntimeInternal.isTrue((q>32))){am=dX.A;aZ=dH[am];let e6=dH[(am+1)];dE=dH[(am+2)];bb=(am+3);let e3;dH[(bb+2)]=dE;dH[(bb+1)]=e6;dH[bb]=aZ;e3={1:aZ(e6,dE)};for(let c=1;c<=dX.C;c++){dH[((bb+c)-1)]=e3[c];}if(RuntimeInternal.isTrue((dH[bb]!==null))){dH[(am+2)]=dH[bb];}else{aw=(aw+1);}}else{am=dX.A;let e7,bf,e4;e7=assert(tonumber(dH[am]),new Uint8Array([96,102,111,114,96,32,105,110,105,116,105,97,108,32,118,97,108,117,101,32,109,117,115,116,32,98,101,32,97,32,110,117,109,98,101,114]));bf=assert(tonumber(dH[(am+1)]),new Uint8Array([96,102,111,114,96,32,108,105,109,105,116,32,109,117,115,116,32,98,101,32,97,32,110,117,109,98,101,114]));e4=assert(tonumber(dH[(am+2)]),new Uint8Array([96,102,111,114,96,32,115,116,101,112,32,109,117,115,116,32,98,101,32,97,32,110,117,109,98,101,114]));dH[am]=(e7-e4);dH[(am+1)]=bf;dH[(am+2)]=e4;aw=(aw+dX.sBx);}}else if(RuntimeInternal.isTrue((q>34))){if(RuntimeInternal.isTrue((q<36))){dD(dW,dX.A);}else if(RuntimeInternal.isTrue((q>36))){am=dX.A;be=dX.B;if(RuntimeInternal.isTrue((be===0))){be=dU.size;dV=((am+be)-1);}for(let c=1;c<=be;c++){dH[((am+c)-1)]=dU.list[c];}}else{dl=dR[(dX.Bx+1)];bn=dl.numupvals;let e8;if(RuntimeInternal.isTrue((bn!==0))){e8={};for(let c=1;c<=bn;c++){let e9=df[((aw+c)-1)];if(RuntimeInternal.isTrue((e9.op===0))){e8[(c-1)]=dG(dW,e9.B,dH);}else if(RuntimeInternal.isTrue((e9.op===4))){e8[(c-1)]=dT[e9.B];}}aw=(aw+bn);}dH[dX.A]=cD(dl,dS,e8);}}else{am=dX.A;av=dX.C;be=dX.B;let ea=dH[am];let az;if(RuntimeInternal.isTrue((be===0))){be=(dV-am);}if(RuntimeInternal.isTrue((av===0))){av=dX[aw].value;aw=(aw+1);}az=((av-1)*cF);for(let c=1;c<=be;c++){ea[(c+az)]=dH[(am+c)];}}}else{am=dX.A;au=dX.B;let e0;if(RuntimeInternal.isTrue((au===0))){e0=(dV-am);}else{e0=(au-1);}dD(dW,0);return dJ(dH[am](unpack(dH,(am+1),(am+e0))));}}else{dH[dX.A]=!dH[dX.B];}dL.pc=aw;}};cD=function(e6,dS,ds){let eb=e6.code;let ec=e6.subs;let ed=e6.lines;let ee=e6.source;let ef=e6.numparams;let eg=function(...RuntimeInternal_VARARG){dH={};let eh={};let ei=0;let[ej,ek]=dJ(...RuntimeInternal_VARARG);let dL;let el,dM,e3;for(let c=1;c<=ef;c++){dH[(c-1)]=ek[c];}if(RuntimeInternal.isTrue((ef<ej))){ei=(ej-ef);for(let c=1;c<=ei;c++){eh[c]=ek[(ef+c)];}}dL={['varargs']:{['list']:eh,['size']:ei},['code']:eb,['subs']:ec,['lines']:ed,['source']:ee,['env']:dS,['upvals']:ds,['stack']:dH,['pc']:1};el=pcall(dQ,dL,...RuntimeInternal_VARARG),dM,e3;if(RuntimeInternal.isTrue(el)){return unpack(e3,1,dM);}else{dK(dL,dM);}return;};return eg;};a.Parser=cC;a.ParserWrap=cD;T=a.LuaX;luaY=a.LuaY;w=a.LuaZ;D=a.LuaU;let em=a.Parser;let en=a.ParserWrap;T.init(T);let eo={};a.Loadstring=function(Y,dS){let N,E,x;let[ep,error]=pcall(function(){dS=dS||getfenv();let eq=RuntimeInternal.wrapAmbiguousCall(w.init(w,w.make_getS(w,Y),null));if(RuntimeInternal.isTrue(!eq)){return error();}aZ=RuntimeInternal.wrapAmbiguousCall(luaY.parser(luaY,eo,eq,null,new Uint8Array([64,105,110,112,117,116])));E=D.make_setS(D),x;D.dump(D,eo,aZ,E,x);N=a.ParserWrap(em(x.data),dS);});if(RuntimeInternal.isTrue(ep)){return[N,x.data];}else{return[null,error];}};a.Loadstring(new Uint8Array([112,114,105,110,116,40,34,116,101,115,116,34,41]))();