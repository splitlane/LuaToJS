// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array


const x = new Uint8Array([1, 2]);
console.log(x[1]); // 31

console.log('a'.charCodeAt(0))
function decodeStringLiteral() {

}

out = '';
content = 'sus';
out += 'new Uint8Array([';
for (let i = 0; i < content.length; i++) {
    out += content.charCodeAt(i);
    if (i != content.length - 1) {
        out += ',';
    }
}
out += '])';
console.log(out)


RuntimeInternal = {}
RuntimeInternal.concatString = function(str1, str2) {
    // https://stackoverflow.com/a/49129872
    var out = new Uint8Array(str1.length + str2.length);
    out.set(str1);
    out.set(str2, str1.length);
    return out;
}

console.log(RuntimeInternal.concatString(new Uint8Array([1, 2]), new Uint8Array([3, 4])))