# Lua To JS: A complete Lua to JS Transpiler written in JS
LuaToJS uses the awesome [luaparse](https://github.com/fstirlitz/luaparse) library to parse Lua code into an Abstract Syntax Tree. Using this AST, LuaToJS navigates the nodes and generates JS code. The Lua standard libraries were written manually in JS.

## How to use:
Put your Lua code in [in.lua](in.lua) then run [luatojs.js](luatojs.js). The JS code will be outputted in [out.js](out.js).

## Roadmap:
1. Standard libraries
2. Wrapping function calls with deconstructors (multiple returns)
3. Obtaining all code from a project that uses require

## Issues:
Please report any issues that **are not on the roadmap** using GitHub issues.