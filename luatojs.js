/*
Converts lua to js

TODO:
Standard library

Comments, whitespace after lastnode

Typedarrays for strings?

Metatables: Proxy, Reflect or (compile?)

GetFirstValue
*/


var parser = require('luaparse');



// https://www.geeksforgeeks.org/node-js-fs-readfilesync-method/
const fs = require('fs');
var infile = './in.lua';
var outfile = './out.js';
var runtimefile = './runtime.js'
// var runtimefile = './runtime_min.js'
var CODE = fs.readFileSync(infile, {encoding: 'utf8', flag: 'r'});






var options = {
    scope: true,
    // locations: true,
    ranges: true,
    luaVersion: 'LuaJIT',
};

// 1. Generate AST
var ast = parser.parse(CODE, options);
// console.log(JSON.stringify(ast, null, 2));


// 2. Generate a list of all comments
var comments = [];
function r(node) {
    for (let k in node) {
        let v = node[k];
        if (typeof v == 'object' && v != null) {
            if (v.type == 'Comment') {
                comments.push(v);
            }
            r(v);
        }
    }
}
r(ast);


// 3. AST to JS
var out = '';


// 3.1. Declare all globals at the top
let definedGlobals = []; // Exclude already defined globals
function listGlobals() {
    return Object.getOwnPropertyNames(this);
}
let g = listGlobals()
for (let i = 0; i < g.length; i++) {
    definedGlobals.push(g[i]);
}
let definedGlobalsMap = {};
for (let i = 0; i < definedGlobals.length; i++) {
    definedGlobalsMap[definedGlobals[i]] = true;
}

if (ast.globals.length != 0) {
    let empty = true;
    // out += 'var ';
    for (let i = 0; i < ast.globals.length; i++) {
        let c = ast.globals[i];
        if (!definedGlobalsMap[c.name]) {
            if (empty) {
                out += 'var ';
                empty = false;
            }
            // out += c.name + '=' + c.name + '?' + c.name + ':undefined';
            out += c.name;
            if (i != ast.globals.length - 1) {
                out += ',';
            }
        }
    }
    if (!empty) {
        out += ';'
    }
}


// 3.2. Recurse on AST
var lastNode;
var localsUsed;
function recurse(node, isList) {
    // scopeIndex++;
    // scopes.push(structuredClone(scopes[scopes.length - 1]));
    if (isList) {
        for (let i = 0; i < node.length; i++) {
            recurse(node[i]);
        }
    } else {
        // Comments
        // TODO: BETWEEN TOKENS
        /*
        let removeList = [];
        for (let i = 0; i < comments.length; i++) {
            let comment = comments[i];
            if ((!lastNode && comment.range[1] <= node.range[0]) || lastNode && (lastNode.range[0] < comment.range[0] && comment.range[1] < node.range[1])) {
                // Insert comment
                recurse(comment);
                removeList.push(i);
            }
        }
        for (let i = removeList.length - 1; i > -1; i--) {
            comments.splice(removeList[i], 1);
        }
        // */

        // Whitespace (using locations and range)


        lastNode = node;

        switch (node.type) {
            case 'LabelStatement':
                console.log('ERROR: TODO');
                break;
            case 'BreakStatement':
                out += 'break;';
                break;
            case 'GotoStatement':
                console.log('ERROR: TODO');
                break;
            case 'ReturnStatement':
                if (node.arguments.length == 0) {
                    out += 'return;';
                } else {
                    if (node.arguments.length == 1) {
                        out += 'return ';
                        recurse(node.arguments[0]);
                    } else {
                        out += 'return['
                        for (let i = 0; i < node.arguments.length; i++) {
                            recurse(node.arguments[i]);
                            if (i != node.arguments.length - 1) {
                                out += ',';
                            }
                        }
                        out += ']'
                    }
                    out += ';';
                }
                break;
            case 'IfStatement':
                recurse(node.clauses, true);
                break;
            case 'IfClause':
                out += 'if(RuntimeInternal.isTrue(';
                recurse(node.condition);
                out += ')){';
                recurse(node.body, true);
                out += '}';
                break;
            case 'ElseifClause':
                out += 'else if(RuntimeInternal.isTrue(';
                recurse(node.condition);
                out += ')){';
                recurse(node.body, true);
                out += '}';
                break;
            case 'ElseClause':
                out += 'else{';
                recurse(node.body, true);
                out += '}';
                break;
            case 'WhileStatement':
                out += 'while(RuntimeInternal.isTrue(';
                recurse(node.condition);
                out += ')){';
                recurse(node.body, true);
                out += '}';
                break;
            case 'DoStatement':
                out += '{';
                recurse(node.body, true);
                out += '}';
                break;
            case 'RepeatStatement':
                out += 'do{';
                recurse(node.body, true);
                out += '}while(RuntimeInternal.isTrue('; 
                recurse(node.condition);
                out += '));';
                break;
            case 'LocalStatement':
                let noLocalList = [];
                let empty = true;
                // out += 'let ';
                for (let i = 0; i < node.variables.length; i++) {
                    // TODO: ADD MORE CALL STATEMENT TYPES
                    if (i < node.init.length && (node.init[i].type == 'CallExpression') && (i + 1 == node.init.length && node.variables.length > i + 1)) {
                        // function call
                        let noLocalsUsed = true;
                        for (let i2 = i; i2 < node.variables.length; i2++) {
                            if (localsUsed[node.variables[i2].name] && i2 < node.init.length) {
                                noLocalsUsed = false;
                                // noLocalList.push(node.variables[i2]);
                            }
                        }

                        if (noLocalsUsed) {
                            if (empty) {
                                out += 'let';
                                empty = false;
                            }
                            out += '[';
                            for (let i2 = i; i2 < node.variables.length; i2++) {
                                recurse(node.variables[i2]);
                                if (i2 != node.variables.length - 1) {
                                    out += ',';
                                }
                            }
                            out += ']=';
                            recurse(node.init[i]);
                            break;
                        } else {
                            if (noLocalList.length > 0) {
                                if (!empty) {
                                    out += ';';
                                    empty = false;
                                }
                                for (let i = 0; i < noLocalList.length; i++) {
                                    recurse(noLocalList[i]);
                                    if (i < node.init.length) {
                                        out += '=';
                                        recurse(node.init[i]);
                                    }
                                    out += ',';
                                }
                            }
                            noLocalList = [];

                            out += '[';
                            for (let i2 = i; i2 < node.variables.length; i2++) {
                                recurse(node.variables[i2]);
                                if (i2 != node.variables.length - 1) {
                                    out += ',';
                                }
                            }
                            out += ']=';
                            recurse(node.init[i]);
                            out += ';'
                            break;
                        }
                    } else if (i < node.init.length && (node.init[i].type == 'VarargLiteral') && (i + 1 == node.init.length && node.variables.length > i + 1)) {
                        // vararg
                        // RuntimeInternal_VARARG
                        let noLocalsUsed = true;
                        for (let i2 = i; i2 < node.variables.length; i2++) {
                            if (localsUsed[node.variables[i2].name] && i2 < node.init.length) {
                                noLocalsUsed = false;
                                // noLocalList.push(node.variables[i2]);
                            }
                        }

                        if (noLocalsUsed) {
                            if (empty) {
                                out += 'let';
                                empty = false;
                            }
                            out += '[';
                            for (let i2 = i; i2 < node.variables.length; i2++) {
                                recurse(node.variables[i2]);
                                if (i2 != node.variables.length - 1) {
                                    out += ',';
                                }
                            }
                            out += ']=RuntimeInternal_VARARG';
                            break;
                        } else {
                            if (noLocalList.length > 0) {
                                if (!empty) {
                                    out += ';';
                                    empty = false;
                                }
                                for (let i = 0; i < noLocalList.length; i++) {
                                    recurse(noLocalList[i]);
                                    if (i < node.init.length) {
                                        out += '=';
                                        recurse(node.init[i]);
                                    }
                                    out += ',';
                                }
                            }
                            noLocalList = [];

                            out += '[';
                            for (let i2 = i; i2 < node.variables.length; i2++) {
                                recurse(node.variables[i2]);
                                if (i2 != node.variables.length - 1) {
                                    out += ',';
                                }
                            }
                            out += ']=RuntimeInternal_VARARG;';
                            break;
                        }
                    } else {
                        // normal
                        if (localsUsed[node.variables[i].name] && i < node.init.length) {
                            noLocalList.push(node.variables[i]);
                        } else {
                            if (empty) {
                                out += 'let ';
                                empty = false;
                            } else {
                                if (i != 0) {
                                    out += ',';
                                }
                            }
                            localsUsed[node.variables[i].name] = true;
                            recurse(node.variables[i]);
                            if (i < node.init.length) {
                                out += '=';
                                recurse(node.init[i]);
                            }
                            // if (i != node.variables.length - 1) {
                            //     out += ',';
                            // }
                        }
                    }
                }

                if (noLocalList.length > 0) {
                    if (!empty) {
                        out += ';';
                    }
                    for (let i = 0; i < noLocalList.length; i++) {
                        recurse(noLocalList[i]);
                        if (i < node.init.length) {
                            out += '=';
                            recurse(node.init[i]);
                        }
                        if (i != node.variables.length - 1) {
                            out += ',';
                        }
                    }
                    out += ';';
                } else {
                    if (!empty) {
                        out += ';';
                    }
                }

                break;
            case 'AssignmentStatement':
                for (let i = 0; i < node.variables.length; i++) {
                    recurse(node.variables[i]);
                    if (i < node.init.length) {
                        out += '=';
                        recurse(node.init[i]);
                    }
                    if (i != node.variables.length - 1) {
                        out += ',';
                    }
                }
                out += ';';
                break;
            case 'CallStatement':
                recurse(node.expression);
                out += ';';
                break;
            case 'FunctionDeclaration':
                if (node.identifier != null) {
                    if (node.isLocal && !localsUsed[node.identifier.name]) {
                        out += 'let ';
                    }
                    recurse(node.identifier);
                    out += '=';
                }
                out += 'function(';
                // recurse(node.parameters, true);
                for (let i = 0; i < node.parameters.length; i++) {
                    let c = node.parameters[i];
                    // if (c.type == 'VarargLiteral') {
                    //     out += '...';
                    // }
                    recurse(c);
                    if (i != node.parameters.length - 1) {
                        out += ',';
                    }
                }
                out += '){';
                recurse(node.body, true);
                out += '}';
                if (node.identifier != null) {
                    out += ';'
                }
                break;
            case 'ForNumericStatement':
                out += 'for(let ';
                recurse(node.variable);
                out += '=';
                recurse(node.start);
                out += ';';
                recurse(node.variable);
                out += '<=';
                recurse(node.end);
                out += ';';
                recurse(node.variable);
                if (node.step != null) {
                    out += '+=';
                    recurse(node.step);
                } else {
                    out += '++';
                }
                out += '){';
                recurse(node.body, true);
                out += '}';
                break;
            case 'ForGenericStatement':
                out += 'let _=';
                for (let i = 0; i < node.iterators.length; i++) {
                    recurse(node.iterators[i]);
                    if (i != node.iterators.length - 1) {
                        out += ',';
                    }
                }
                out += ',_f,_s,_v;if(typeof _==\'object\'){[_f,_s,_v]=_}else{_f=_}while(true){let[';
                for (let i = 0; i < node.variables.length; i++) {
                    recurse(node.variables[i]);
                    if (i != node.variables.length - 1) {
                        out += ',';
                    }
                }
                out += ']=_f(_s,_v);_v=';
                recurse(node.variables[0]);
                out += ';if(_v==null||_v==undefined){break}';
                recurse(node.body, true);
                out += '}';
                break;
            case 'Chunk':
                localsUsed = {};
                recurse(node.body, true);
                break;
            case 'Identifier':
                out += node.name;
                break;
            case 'StringLiteral':
                let s = node.raw;
                if (s[0] == '\'' || s[0] == '\"') {
                    // Normal string
                    out += s;
                } else {
                    // Long string
                    let i = 1;
                    while (true) {
                        if (s[i] == '[') {
                            break;
                        }
                        i++;
                    }
                    out += '`' + s.substring(i + 1, s.length - i - 1).replaceAll('`', '\\`').replaceAll('$', '\\$') + '`'
                }

                break;
            case 'NumericLiteral':
                out += node.value;
                break;
            case 'BooleanLiteral':
                out += node.value;
                break;
            case 'NilLiteral':
                out += 'null';
                break;
            case 'VarargLiteral':
                out += '...RuntimeInternal_VARARG';
                break;
            case 'TableKey':
                out += '[';
                recurse(node.key);
                out += ']:';
                recurse(node.value);
                break;
            case 'TableKeyString':
                // out += '[';
                recurse(node.key);
                // out += ']:';
                recurse(node.value);
                break;
            case 'TableValue':
                recurse(node.value);
                break;
            case 'TableConstructorExpression':
                out += '{';
                let i2 = 1; // Counter for TableValue
                for (let i = 0; i < node.fields.length; i++) {
                    let c = node.fields[i];
                    if (c.type == 'TableValue') {
                        out += i2 + ':';
                        i2++;
                    }
                    recurse(c);
                    if (i != node.fields.length - 1) {
                        out += ',';
                    }
                }

                out += '}';
                break;
            case 'LogicalExpression':
                recurse(node.left);
                switch (node.operator) {
                    case 'and':
                        out += '&&';
                        break;
                    case 'or':
                        out += '||';
                        break;
                }
                recurse(node.right);
                break;
            case 'BinaryExpression':
                out += '(';
                switch (node.operator) {
                    case '..':
                        recurse(node.left);
                        out += '+';
                        recurse(node.right);
                        break;
                    case '==':
                        recurse(node.left);
                        out += '===';
                        recurse(node.right);
                        break;
                    case '>>':
                        recurse(node.left);
                        out += '>>';
                        recurse(node.right);
                        break;
                    case '>=':
                        recurse(node.left);
                        out += '>=';
                        recurse(node.right);
                        break;
                    case '>':
                        recurse(node.left);
                        out += '>';
                        recurse(node.right);
                        break;
                    case '<=':
                        recurse(node.left);
                        out += '<=';
                        recurse(node.right);
                        break;
                    case '<':
                        recurse(node.left);
                        out += '<';
                        recurse(node.right);
                        break;
                    case '~=':
                        recurse(node.left);
                        out += '!==';
                        recurse(node.right);
                        break;
                    case '~':
                        recurse(node.left);
                        out += '^';
                        recurse(node.right);
                        break;
                    case '//':
                        out += 'Math.floor(';
                        recurse(node.left);
                        out += '/';
                        recurse(node.right);
                        out += ')';
                        break;
                    case '/':
                        recurse(node.left);
                        out += '/';
                        recurse(node.right);
                        break;
                    case '*':
                        recurse(node.left);
                        out += '*';
                        recurse(node.right);
                        break;
                    case '^':
                        recurse(node.left);
                        out += '**';
                        recurse(node.right);
                        break;
                    case '%':
                        recurse(node.left);
                        out += '%';
                        recurse(node.right);
                        break;
                    case '-':
                        recurse(node.left);
                        out += '-';
                        recurse(node.right);
                        break;
                    case '+':
                        recurse(node.left);
                        out += '+';
                        recurse(node.right);
                        break;
                    default:
                        break;
                }
                out += ')';
                break;
            case 'UnaryExpression':
                switch (node.operator) {
                    case '#':
                        out += 'RuntimeInternal.getLength('
                        recurse(node.argument);
                        out += ')'
                        break;
                    case '-':
                        out += '-';
                        recurse(node.argument);
                        break;
                    case '~':
                        out += '~';
                        recurse(node.argument);
                        break;
                    case 'not':
                        out += '!';
                        recurse(node.argument);
                        break;
                    default:
                        break;
                }
                break;
            case 'MemberExpression':
                recurse(node.base);
                out += '.';
                recurse(node.identifier);
                break;
            case 'IndexExpression':
                recurse(node.base);
                out += '[';
                recurse(node.index);
                out += ']';
                break;
            case 'CallExpression':
                recurse(node.base);
                out += '(';
                for (let i = 0; i < node.arguments.length; i++) {
                    recurse(node.arguments[i]);
                    if (i != node.arguments.length - 1) {
                        out += ',';
                    }
                }
                out += ')';
                break;
            case 'TableCallExpression':
                recurse(node.base);
                out += '(';
                for (let i = 0; i < node.arguments.length; i++) {
                    recurse(node.arguments[i]);
                    if (i != node.arguments.length - 1) {
                        out += ',';
                    }
                }
                out += ')';
                break;
            case 'StringCallExpression':
                recurse(node.base);
                out += '(';
                for (let i = 0; i < node.arguments.length; i++) {
                    recurse(node.arguments[i]);
                    if (i != node.arguments.length - 1) {
                        out += ',';
                    }
                }
                out += ')';
                break;
            case 'Comment':
                out += '/*' + node.value + '*/';
                break;

            default:
                break;
                
        }
    }
    // scopes.pop();
}
recurse(ast);

// 4. Serialize all remaining comments
/*
for (let i = 0; i < comments.length; i++) {
    recurse(comments[i]);
}
// */





// console.log(out);

var runtime = fs.readFileSync(runtimefile, {encoding: 'utf8', flag: 'r'});
out = runtime + out;
fs.writeFileSync(outfile, out, {encoding: 'utf8', flag: 'w'});