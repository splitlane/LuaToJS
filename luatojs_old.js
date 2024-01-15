var parser = require('luaparse');





var CODE = `
--test
print('hello world!')

a = 1

return 3
`

CODE = `
--a
`









var options = {
    // scope: true,
    locations: true,
    ranges: true,
    luaVersion: 'LuaJIT',
};

// 1. Generate AST
var ast = parser.parse(CODE, options);
// console.log(JSON.stringify(ast, null, 2));


// 2. Generate a list of statements
// var currentNode = ast
var nodeList = [];
function recurse(node, isList) {
    if (isList) {
        for (let i = 0; i < node.length; i++) {
            recurse(node[i]);
        }
    } else {
        nodeList.push(node);

        switch (node.type) {
            case 'ReturnStatement':
                recurse(node.arguments, true);
                break;
            case 'IfStatement':
                recurse(node.clauses, true);
                break;
            case 'IfClause':
                recurse(node.condition);
                recurse(node.body, true);
                break;
            case 'ElseifClause':
                recurse(node.condition);
                recurse(node.body, true);
                break;
            case 'ElseClause':
                recurse(node.body, true);
                break;
            case 'WhileStatement':
                recurse(node.condition);
                recurse(node.body, true);
                break;
            case 'DoStatement':
                recurse(node.body, true);
                break;
            case 'RepeatStatement':
                recurse(node.condition);
                recurse(node.body, true);
                break;
            case 'LocalStatement':
                recurse(node.variables, true);
                recurse(node.init, true);
                break;
            case 'AssignmentStatement':
                recurse(node.variables, true);
                recurse(node.init, true);
                break;
            case 'CallStatement':
                recurse(node.expression);
                break;
            case 'FunctionDeclaration':
                recurse(node.identifier);
                recurse(node.parameters, true);
                recurse(node.body, true);
                break;
            case 'ForNumericStatement':
                recurse(node.variable);
                recurse(node.start);
                recurse(node.end);
                if (node.step != null) {
                    recurse(node.step);
                }
                recurse(node.body, true);
                break;
            case 'ForGenericStatement':
                recurse(node.variables, true);
                recurse(node.iterators, true);
                recurse(node.body, true);
                break;
            case 'Chunk':
                recurse(node.body, true);
                break;
            // Identifier
            // StringLiteral
            // NumericLiteral
            // BooleanLiteral
            // NilLiteral
            // VarargLiteral

            case 'TableKey':
                recurse(node.key);
                recurse(node.value);
                break;
            case 'TableKeyString':
                recurse(node.key);
                recurse(node.value);
                break;
            case 'TableKeyValue':
                recurse(node.value);
                break;
            case 'TableConstructorExpression':
                recurse(node.fields, true);
                break;
            case 'LogicalExpression':
                recurse(node.left);
                recurse(node.right);
                break;
            case 'BinaryExpression':
                recurse(node.left);
                recurse(node.right);
                break;
            case 'UnaryExpression':
                recurse(node.argument);
                break;
            case 'MemberExpression':
                recurse(node.base);
                recurse(node.identifier);
                break;
            case 'IndexExpression':
                recurse(node.base);
                recurse(node.index);
                break;
            case 'CallExpression':
                recurse(node.base);
                recurse(node.arguments, true);
                break;
            case 'TableCallExpression':
                recurse(node.base);
                recurse(node.arguments, true);
                break;
            case 'StringCallExpression':
                recurse(node.base);
                recurse(node.argument, true);
                break;
            // Comment

            default:
                break;
                
        }
    }
}
recurse(ast);

console.log(nodeList);

// 3. Generate JS code from statlist
var out = '';
for (let i = 0; i < nodeList.length; i++) {
    var node = nodeList[i];
    console.log(node);
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
            if (args.length == 0) {
                out += 'return;';
            } else {
                out += 'return ';
            }
            break;
        case 'IfStatement':
            out += 'if (';
            break;
        case 'IfClause':
            break;
        case 'ElseifClause':
            break;
        case 'ElseClause':
            break;
        case 'WhileStatement':
            break;
        case 'DoStatement':
            break;
        case 'RepeatStatement':
            break;
        case 'LocalStatement':
            break;
        case 'AssignmentStatement':
            break;
        case 'CallStatement':
            break;
        case 'FunctionDeclaration':
            break;
        case 'ForNumericStatement':
            break;
        case 'ForGenericStatement':
            break;
        case 'Chunk':
            break;
        case 'Identifier':
            break;
        case 'TableKey':
            break;
        case 'TableKeyString':
            break;
        case 'TableValue':
            break;
        case 'TableConstructorExpression':    
            break;
        case 'UnaryExpression':
            break;
        case 'MemberExpression':
            break;
        case 'IndexExpression':
            break;
        case 'CallExpression':
            break;
        case 'TableCallExpression':
            break;
        case 'StringCallExpression':
            break;
        case 'Comment':
            break;
    }
}




console.log(out);