a = [[

var ast = exports.ast = {
    labelStatement: function(label) {
    return {
        type: 'LabelStatement'
      , label: label
    };
  }

  , breakStatement: function() {
    return {
        type: 'BreakStatement'
    };
  }

  , gotoStatement: function(label) {
    return {
        type: 'GotoStatement'
      , label: label
    };
  }

  , returnStatement: function(args) {
    return {
        type: 'ReturnStatement'
      , 'arguments': args
    };
  }

  , ifStatement: function(clauses) {
    return {
        type: 'IfStatement'
      , clauses: clauses
    };
  }
  , ifClause: function(condition, body) {
    return {
        type: 'IfClause'
      , condition: condition
      , body: body
    };
  }
  , elseifClause: function(condition, body) {
    return {
        type: 'ElseifClause'
      , condition: condition
      , body: body
    };
  }
  , elseClause: function(body) {
    return {
        type: 'ElseClause'
      , body: body
    };
  }

  , whileStatement: function(condition, body) {
    return {
        type: 'WhileStatement'
      , condition: condition
      , body: body
    };
  }

  , doStatement: function(body) {
    return {
        type: 'DoStatement'
      , body: body
    };
  }

  , repeatStatement: function(condition, body) {
    return {
        type: 'RepeatStatement'
      , condition: condition
      , body: body
    };
  }

  , localStatement: function(variables, init) {
    return {
        type: 'LocalStatement'
      , variables: variables
      , init: init
    };
  }

  , assignmentStatement: function(variables, init) {
    return {
        type: 'AssignmentStatement'
      , variables: variables
      , init: init
    };
  }

  , callStatement: function(expression) {
    return {
        type: 'CallStatement'
      , expression: expression
    };
  }

  , functionStatement: function(identifier, parameters, isLocal, body) {
    return {
        type: 'FunctionDeclaration'
      , identifier: identifier
      , isLocal: isLocal
      , parameters: parameters
      , body: body
    };
  }

  , forNumericStatement: function(variable, start, end, step, body) {
    return {
        type: 'ForNumericStatement'
      , variable: variable
      , start: start
      , end: end
      , step: step
      , body: body
    };
  }

  , forGenericStatement: function(variables, iterators, body) {
    return {
        type: 'ForGenericStatement'
      , variables: variables
      , iterators: iterators
      , body: body
    };
  }

  , chunk: function(body) {
    return {
        type: 'Chunk'
      , body: body
    };
  }

  , identifier: function(name) {
    return {
        type: 'Identifier'
      , name: name
    };
  }

  , literal: function(type, value, raw) {
    type = (type === StringLiteral) ? 'StringLiteral'
      : (type === NumericLiteral) ? 'NumericLiteral'
      : (type === BooleanLiteral) ? 'BooleanLiteral'
      : (type === NilLiteral) ? 'NilLiteral'
      : 'VarargLiteral';

    return {
        type: type
      , value: value
      , raw: raw
    };
  }

  , tableKey: function(key, value) {
    return {
        type: 'TableKey'
      , key: key
      , value: value
    };
  }
  , tableKeyString: function(key, value) {
    return {
        type: 'TableKeyString'
      , key: key
      , value: value
    };
  }
  , tableValue: function(value) {
    return {
        type: 'TableValue'
      , value: value
    };
  }


  , tableConstructorExpression: function(fields) {
    return {
        type: 'TableConstructorExpression'
      , fields: fields
    };
  }
  , binaryExpression: function(operator, left, right) {
    var type = ('and' === operator || 'or' === operator) ?
      'LogicalExpression' :
      'BinaryExpression';

    return {
        type: type
      , operator: operator
      , left: left
      , right: right
    };
  }
  , unaryExpression: function(operator, argument) {
    return {
        type: 'UnaryExpression'
      , operator: operator
      , argument: argument
    };
  }
  , memberExpression: function(base, indexer, identifier) {
    return {
        type: 'MemberExpression'
      , indexer: indexer
      , identifier: identifier
      , base: base
    };
  }

  , indexExpression: function(base, index) {
    return {
        type: 'IndexExpression'
      , base: base
      , index: index
    };
  }

  , callExpression: function(base, args) {
    return {
        type: 'CallExpression'
      , base: base
      , 'arguments': args
    };
  }

  , tableCallExpression: function(base, args) {
    return {
        type: 'TableCallExpression'
      , base: base
      , 'arguments': args
      , argument: args
    };
  }

  , stringCallExpression: function(base, argument) {
    return {
        type: 'StringCallExpression'
      , base: base
      , argument: argument
    };
  }

  , comment: function(value, raw) {
    return {
        type: 'Comment'
      , value: value
      , raw: raw
    };
  }
};
]]


local out = ''
a:gsub('type: \'(.-)\'', function(a)
    out = out .. 'case \'' .. a .. '\':\n    break;\n'
end)

print(out)