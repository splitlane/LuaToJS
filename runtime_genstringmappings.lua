--generate mappings
local f = string.lower
local out = '{'

function math.mod(a, b)
    return a % b
end

function decimalToHex(num)
    if num == 0 then
        return '0'
    end
    local neg = false
    if num < 0 then
        neg = true
        num = num * -1
    end
    local hexstr = "0123456789ABCDEF"
    local result = ""
    while num > 0 do
        local n = math.mod(num, 16)
        result = string.sub(hexstr, n + 1, n + 1) .. result
        num = math.floor(num / 16)
    end
    if neg then
        result = '-' .. result
    end
    return #result == 1 and '0' .. result or result
end

for i = 0, 255 do
    local a = string.char(i)
    local b = f(string.char(i))
    if a ~= b then
        -- out = out .. '\'\\x' .. decimalToHex(a:byte()) .. '\'' .. ':\'\\x' .. decimalToHex(b:byte()) .. '\','
        out = out .. a:byte() .. ':' .. b:byte() .. ','
    end
end

out = out:sub(1, -2) .. '}'
print(out)