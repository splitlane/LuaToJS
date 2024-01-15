/*
Converts lua to js

TODO:
Standard library, Internal library (Get from old project)

Global variables, probably set at start of code?

Scope differences, let

Comments, whitespace after lastnode
*/


var parser = require('luaparse');





var CODE = `
--test
print('hello world!')

a = 1

return 3
`

CODE = `
do end
-- hi
if a then end
`









CODE = `
package.path = package.path .. ';../?.lua'
require('path')


--generate symbols
--[[
local listnasdaq = require('list_nasdaq')
local symbols = {}
local t = listnasdaq()
local list = t.data.rows
for i = 1, #list do
    local d = list[i]
    symbols[#symbols + 1] = d.symbol:gsub('%s', '')
end
local out = '{\'' .. table.concat(symbols, '\',\'') .. '\'}'
io.open('out.txt', 'wb+'):write(out)
--]]


local json = require('json')






--[[
    1704067140: last minute of 2023
    go back in increments of 604800

    s = e - 604800


    40200

    some data is missing

    e isn't included, so just set e = s and s = e - 604800
]]









local socket = require('socket')
local FR = require('fastread')
local tickeryfinance = require('ticker_yfinance') --No cache, assumes web scraping new data

--[[
-- local s, e = 1704283800, 1704067140
local e = 1704067140
local s = e - 604800
local data = tickeryfinance('AAPL', s, e)
local t = data.chart.result[1]
local ts = t.timestamp
print(ts[1], ts[#ts])
print(e - ts[#ts])
-- print(1704067140 - ts[#ts])

-- for i = 1, #ts - 1 do
--     local d = ts[i + 1] - ts[i]
--     if d ~= 60 then
--         print(i, i + 1)
--         print(ts[i], ts[i + 1])
--         print(d)
--     end
-- end
--]]









































local ffi = require('ffi')
local C = ffi.C
function FR.GetLastElementStart(filename, notrailingcomma)
    local size = FR.GetFileSize(filename)
    -- print(size)

    --find last '}' and backtrack
    local buffersize = 100
    local memory = ffi.cast('unsigned char*', C.malloc(size))

    local f = C.fopen(filename, 'rb')

    local i = -1
    local level = 0
    local instring = false
    local instringcheck = nil
    local laste = nil
    local lasts = nil
    local out = 0
    if notrailingcomma then
        out = 1
    end
    while true do
        local position = buffersize * i
        if position < -size then
            position = -size
            buffersize = buffersize * (i + 1) + size
        end

        C.fseek(f, position, 2)
        C.fread(memory, buffersize, 1, f)

        for i2 = buffersize - 1, 0, -1 do
            -- print(memory[i2], string.char(memory[i2]), instring)
            -- print(lasts, laste)
            local a = memory[i2]


            if instringcheck then
                if a == 92 then
                    instringcheck = instringcheck + 1
                else
                    if instringcheck % 2 == 0 then
                        lasts = position + i2 + 2
                        instring = false
                    end
                    instringcheck = nil
                end
            end

            if instring then
                if a == 39 then
                    instringcheck = 0
                end
            else
                if a == 39 then
                    instring = true
                    laste = position + i2
                elseif a == 125 then
                    level = level + 1
                elseif a == 123 then
                    level = level - 1
                    if level == 0 then
                        -- print(position, i2, size)
                        C.fclose(f)
                        C.free(memory)
                        -- return out
                        return size + position + i2 + 1
                    end
                elseif a == 39 then
                    instring = true
                elseif a == 44 then
                    if level == 0 then
                        out = out + 1
                    end
                end
            end
        end

        -- print(ffi.string(memory, buffersize), buffersize) -- for visualization only

        if position == -size then
            break
        end
        i = i - 1

    end
end
















-- print(#symbols, error)









local DATA = {}

DBFILENAME = 'db.lua'

DEBUG = {
    
}

DEBUG_LASTT = nil


-- print(FR.GetLastElementStart(DBFILENAME))
-- error()

-- local start = FR.GetNextIndex(DBFILENAME)
-- local memory, size = FR.Read(DBFILENAME)
-- DATA = FR.Deserialize(memory, size)
-- local start = #DATA + 1
local start = FR.GetNextIndex(DBFILENAME) or 1
-- print(start)error()

local function SAVE()
    print('SAVING')
    print('TOTAL BYTES USED: ')

    local f = io.open(DBFILENAME, 'ab+')
    f:write(FR.ConstructData(DATA, true, DEBUG))
    f:close()

    DATA = {}
    start = #DATA + 1

    print('SAVING DONE')
end



local IM = require('indexmap')
local outmt = {
    timestamp = 2,
    volume = 3,
    close = 4,
    high = 5,
    low = 6,
    open = 7,
}

local lastdone = true
print(pcall(function()

for i = start, #symbols do
    local symbol = symbols[i]

    print(i .. '/' .. #symbols, symbol)

    local s, e = 1704067140
    local out = nil
    if out then
        IM.Map(out, outmt)
        local ts = out.timestamp
        for i = 1, #ts do
            local a = ts[i]
            if not e or tonumber(a) < e then
                e = tonumber(a)
            end
        end
    else
        out = {
            -- timestamp = {},
            -- volume = {},
            -- close = {},
            -- high = {},
            -- low = {},
            -- open = {},
            i, {}, {}, {}, {}, {}, {}, 
        }
        IM.Map(out, outmt)
    end
    

    DATA[#DATA + 1] = out
    while true do
        lastdone = false
        e = s
        s = e - 604800

        print(s .. ' -> ' .. e)

        local data, httperrcode = tickeryfinance(symbol, s, e)
        DEBUG_LASTT = data
        if data then
            local t = data.chart.result[1]
            local pricedata = t.indicators.quote[1]

            local t2 = out.timestamp
            local v = t.timestamp
            if not v then
                break
            end
            for i = 1, #v do
                t2[#t2 + 1] = v[i]
            end
            for k, v in pairs(pricedata) do
                local t2 = out[k]
                for i = 1, #v do
                    t2[#t2 + 1] = v[i]
                end
            end
        else
            if httperrcode == 422 then
                lastdone = true
                break
            elseif httperrcode == 404 then
                DATA[#DATA] = '404'
                break
            else
                error('Invalid error: ' .. httperrcode)
            end
        end

        socket.sleep(1)
    end

    -- IM.Remove(out)

    print('if ur gonna interrupt, do so now')
    socket.sleep(1)

    if i % 1000 == 0 then
        SAVE()
    end
end


end))

if lastdone == false then
    DATA[#DATA] = nil
end

SAVE()

print('PRESS ENTER TO EXIT, type something then press enter to display last')
local a = io.read()
if a ~= '' then
    print(json.encode(DEBUG_LASTT))
end
`



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
if (ast.globals.length != 0) {
    out += 'var ';
    for (let i = 0; i < ast.globals.length; i++) {
        let c = ast.globals[i];
        out += c.name;
        if (i != ast.globals.length - 1) {
            out += ','
        }
    }
    out += ';'
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
                out += 'if(';
                recurse(node.condition);
                out += '){';
                recurse(node.body, true);
                out += '}';
                break;
            case 'ElseifClause':
                out += 'else if(';
                recurse(node.condition);
                out += '){';
                recurse(node.body, true);
                out += '}';
                break;
            case 'ElseClause':
                out += 'else{';
                recurse(node.body, true);
                out += '}';
                break;
            case 'WhileStatement':
                out += 'while(';
                recurse(node.condition);
                out += '){';
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
                out += '}while('; 
                recurse(node.condition);
                out += ');';
                break;
            case 'LocalStatement':
                let noLocalList = [];
                let empty = true;
                // out += 'let ';
                for (let i = 0; i < node.variables.length; i++) {
                    // TODO: ADD MORE CALL STATEMENT TYPES
                    if (i < node.init.length && (node.init[i].type == 'CallExpression') && (i + 1 == node.init.length && node.variables.length > i + 1)) {
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
                    } else {
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
                    if (c.type == 'VarargLiteral') {
                        out += '...';
                    }
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
                out += ';if(_var==null||_var==undefined){break}';
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
                // out += '\'' + node.value + '\'';
                out += node.raw;
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
                // TODO: Internal lib
                out += '__VARARG';
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
                break;
            case 'UnaryExpression':
                switch (node.operator) {
                    case '#':
                        recurse(node.argument);
                        out += '.length'
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





console.log(out);