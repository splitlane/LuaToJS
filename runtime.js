/*
    runtime.js

    Runtime library for LuaToJS, Contains all of the lua functions written in JS

    WARNING: Minify for production

    Taken from old LuaToJS (Code (Summer 2023)) and worked on
*/




var RuntimeInternal = {};




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
        return !RuntimeInternal.isFalse();
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













// ASTToJavaScript.js


// UnaryOperator '#'
{
    RuntimeInternal.getLength = function(o) {
        if (typeof o == 'string') {
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
// {
//     RuntimeInternal.wrap = function(o) {

//     }
// }






















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


function next(t, k) {
    // Find refs for each key in t
    var refMap = {};
    var refList = [];
    var kref;
    for (let [k2, v] of Object.entries(t)) {
        var ref = RuntimeInternal.findRef(k2);
        refMap[ref] = k2;
        refList.push(ref);
        if (k == k2) {
            kref = ref;
        }
    }
    refList.sort();

    if (k == undefined) {
        if (RuntimeInternal.getLength(t) == 0) {
            return;
        } else {
            var k2 = refMap[refList[0]];
            return [k2, t[k2]];
        }
    } else {
        if (kref) {
            var index = refList.indexOf(kref);
            var k2 = refMap[refList[index + 1]];
            return [k2, t[k2]];
        } else {
            error('invalid key to \'next\'');
            return;
        }
    }
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
        if (typeof err == 'string') {
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
        str = str + tostring(arg) + '\t'
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
function require(modname) {

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
    } else if (typeof o == 'string') {
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
        if (typeof err == 'string') {
            return false, errhandler(err);
        } else {
            return false, errhandler(err.name);
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


var io = {};


// NONFUNCTIONAL (*)
io.close = function() {

}


// NONFUNCTIONAL (*)
io.flush = function() {

}


// NONFUNCTIONAL (*)
io.input = function() {

}


// NONFUNCTIONAL (*)
io.lines = function() {

}


// NONFUNCTIONAL (*)
io.open = function() {

}


// NONFUNCTIONAL (*)
io.output = function() {

}


// NONFUNCTIONAL (*)
io.popen = function() {

}


// NONFUNCTIONAL (*)
io.read = function() {

}


// NONFUNCTIONAL (*)
io.stderr = function() {

}


// NONFUNCTIONAL (*)
io.stdin = function() {

}


// NONFUNCTIONAL (*)
io.stdout = function() {

}


// NONFUNCTIONAL (*)
io.tmpfile = function() {

}


// NONFUNCTIONAL (*)
io.type = function() {

}


// NONFUNCTIONAL (*)
io.write = function(...args) {
    // https://www.lua.org/pil/21.1.html
    var str = '';
    args.forEach(arg => {
        str = str + tostring(arg) + '\t'
    });
    str = str.substring(0, str.length - 1);
    process.stdout.write(str);
    return;
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


var string = {};


string.byte = function(s, i, j) {
    if (i == undefined) {
        i = 1;
    }
    if (j == undefined) {
        j = 1;
    }
}


string.char = function(...args) {
    var str = '';
    args.forEach(arg => {
        str = str + String.fromCharCode(arg);
    });
    return str;
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


string.len = function() {
    
}


string.lower = function() {
    
}


string.match = function() {
    
}


string.rep = function() {
    
}


string.reverse = function() {
    
}


string.sub = function() {
    
}


string.upper = function() {
    
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


