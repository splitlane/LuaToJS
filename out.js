/*
    runtime.js

    Runtime library for LuaToJS, Contains all of the lua functions written in JS

    WARNING: Minify for production

    Taken from old LuaToJS (Code (Summer 2023)) and worked on
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
    RuntimeInternal.stringToActualString = function(str) {
        var out = '';
        for (let i = 0; i < str.length; i++) {
            out = out + String.fromCharCode(str[i]);
        }
        return out;
    }
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
    // var out = [];
    // for (let i2 = i; i2 < j + 1; i2++) {
    //     out.push(list[i2]);
    // }
    // return out;
    return list.slice(i, j + 1);
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
    // RuntimeInternal.Fengari.posrelat = function(pos, len) {
    //     if (pos >= 0) return pos;
    //     else if (0 - pos > len) return 0;
    //     else return len + pos + 1;
    // }
    // RuntimeInternal.Fengari.find_subarray = function(arr, subarr, from_index) {
    //     var i = from_index >>> 0,
    //         sl = subarr.length;
    
    //     if (sl === 0)
    //         return i;
    
    //     for (; (i = arr.indexOf(subarr[0], i)) !== -1; i++) {
    //         if (arr.subarray(i, i+sl) == subarr)
    //             return i;
    //     }
    
    //     return -1;
    // }
    // RuntimeInternal.Fengari.MatchState = function() {
    //     return {
    //         src: null,  /* unmodified source string */
    //         src_init: null,  /* init of source string */
    //         src_end: null,  /* end ('\0') of source string */
    //         p: null,  /* unmodified pattern string */
    //         p_end: null,  /* end ('\0') of pattern */
    //         matchdepth: NaN,  /* control for recursive depth */
    //         level: NaN,  /* total number of captures (finished or unfinished) */
    //         capture: [],
    //     }
    // }
    // RuntimeInternal.Fengari.prepstate = function(ms, L, s, ls, p, lp) {
    //     ms.L = L;
    //     ms.matchdepth = MAXCCALLS;
    //     ms.src = s;
    //     ms.src_init = 0;
    //     ms.src_end = ls;
    //     ms.p = p;
    //     ms.p_end = lp;
    // }
    // RuntimeInternal.Fengari.reprepstate = function(ms) {
    //     ms.level = 0;
    //     lualib.lua_assert(ms.matchdepth === MAXCCALLS);
    // }
    // RuntimeInternal.Fengari.push_captures = function(ms, s, e) {
    //     let nlevels = (ms.level === 0 && s != null) ? 1 : ms.level;
    //     let out = [];
    //     for (let i = 0; i < nlevels; i++)
    //         out.push(push_onecapture(ms, i, s, e));
    //     return out;  /* number of strings pushed */
    // }
    // RuntimeInternal.Fengari.push_onecapture = function(ms, i, s, e) {
    //     if (i >= ms.level) {
    //         // if (i === 0)
    //         // TODO: DOING RN
    //             lua_pushlstring(ms.L, ms.src.subarray(s, e), e - s);  /* add whole match */
    //         // else
    //         //     luaL_error(ms.L, to_luastring("invalid capture index %%%d"), i + 1);
    //     } else {
    //         let l = ms.capture[i].len;
    //         if (l === CAP_UNFINISHED) luaL_error(ms.L, to_luastring("unfinished capture"));
    //         if (l === CAP_POSITION)
    //             lua_pushinteger(ms.L, ms.capture[i].init - ms.src_init + 1);
    //         else
    //             lua_pushlstring(ms.L, ms.src.subarray(ms.capture[i].init), l);
    //     }
    // }
    // RuntimeInternal.Fengari.str_find_aux = function(s, p, init, plain, find) {
    //     let ls = s.length;
    //     let lp = p.length;
    //     let init = RuntimeInternal.Fengari.posrelat(init, ls);
    //     if (init < 1) init = 1;
    //     else if (init > ls + 1) {  /* start after string's end? */
    //         return [];
    //     }
    //     /* explicit request or no special characters? */
    //     if (find && (plain || nospecials(p, lp))) {
    //         /* do a plain search */
    //         let f = RuntimeInternal.Fengari.find_subarray(s.subarray(init - 1), p, 0);
    //         if (f > -1) {
    //             return [init + f, init + f + lp - 1];
    //         }
    //     } else {
    //         let ms = RuntimeInternal.Fengari.MatchState();
    //         let s1 = init - 1;
    //         let anchor = p[0] === 94 /* '^'.charCodeAt(0) */;
    //         if (anchor) {
    //             p = p.subarray(1); lp--;  /* skip anchor character */
    //         }
    //         RuntimeInternal.Fengari.prepstate(ms, L, s, ls, p, lp);
    //         do {
    //             let res;
    //             RuntimeInternal.Fengari.reprepstate(ms);
    //             if ((res = match(ms, s1, 0)) !== null) {
    //                 if (find) {
    //                     return [s1 + 1,  /* start */
    //                         res,   /* end */
    //                         ...RuntimeInternal.Fengari.push_captures(ms, null, 0) + 2
    //                     ];
    //                 } else
    //                     return [...RuntimeInternal.Fengari.push_captures(ms, s1, res)];
    //             }
    //         } while (s1++ < ms.src_end && !anchor);
    //     }
    //     return [];
    // }
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


string.dump = function() {
    
}


string.find = function() {
    
}


string.format = function() {
    
}


string.gmatch = function() {
    
}


string.gsub = function() {
    
}


string.len = function(str) {
    return str.length;
}


string.lower = function() {
    
}


string.match = function() {
    
}


string.rep = function() {
    
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


string.upper = function() {
    
}

{
    // Prototype
    for (const [key, value] of Object.entries(string)) {
        Uint8Array.prototype[key] = value;
    }
}


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


var A,B,z,b,E,S,math,C,F,I,io,T,string,W,P,print,H,e,g,m,n,d,f,c,h,D,l,t,x,y,o,N;A=0;B=0;z={};b={};E={1:32,2:46,3:44,4:45,5:126,6:58,7:59,8:61,9:33,10:42,11:35,12:36,13:64};S=math.sin;C=math.cos;F=math.floor;I=io.write;T=string.char;W=60;P=print;H=25;P(new Uint8Array([92,92,120,49,98,91,50,74]));for(let w=1;w<=240;w++){for(let o=0;o<=(W*H);o++){b[o]=1;z[o]=0;}e=S(A);g=C(A);m=C(B);n=S(B);for(let j=0;j<=6.28;j+=0.09){d=C(j);f=S(j);for(let i=0;i<=6.28;i+=0.04){c=S(i);h=(d+2);D=(1/((((c*h)*e)+(f*g))+5));l=C(i);t=(((c*h)*g)-(f*e));x=F(((W/2)+(((W*0.3)*D)*(((l*h)*m)-(t*n)))));y=F(((H/2)+(((H*0.6)*D)*(((l*h)*n)+(t*m)))));o=(x+(W*y));N=(math.max(0,F((8*((((((f*e)-((c*d)*g))*m)-((c*d)*e))-(f*g))-((l*d)*n)))))+2);if(RuntimeInternal.isTrue((H>y)&&(y>0)&&(x>0)&&(W>x)&&(D>z[o]))){z[o]=D;b[o]=N;}}}P(new Uint8Array([92,92,120,49,98,91,72]));for(let k=0;k<=(W*H);k++){if(RuntimeInternal.isTrue(((k%W)!==0))){I(T(E[b[k]]));}else{I(T(10));}}A=(A+0.04);B=(B+0.02);}