var package,require,DBFILENAME,DEBUG,DEBUG_LASTT,print,io,pcall,symbols,tonumber,pairs,error;package.path=package.path+';../?.lua';require('path');/*generate symbols*//*local listnasdaq = require('list_nasdaq')
local symbols = {}  
local t = listnasdaq()
local list = t.data.rows
for i = 1, #list do 
    local d = list[i]
    symbols[#symbols + 1] = d.symbol:gsub('%s', '')
end
local out = '{'' .. table.concat(symbols, '','') .. ''}'    
io.open('out.txt', 'wb+'):write(out)    
--*/let json=require('json');/*    1704067140: last minute of 2023
    go back in increments of 604800     

    s = e - 604800  


    40200

    some data is missing

    e isn't included, so just set e = s and s = e - 604800  
*/let socket=require('socket');let FR=require('fastread');let tickeryfinance=require('ticker_yfinance');/*No cache, assumes web scraping new data*//*-- local s, e = 1704283800, 1704067140
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
--*/let ffi=require('ffi');let C=ffi.C;/* print(size)*//*find last '}' and backtrack*//* print(memory[i2], string.char(memory[i2]), instring)*//* print(lasts, laste)*//* print(position, i2, size)*//* return out*//* print(ffi.string(memory, buffersize), buffersize) -- for visualization only*/FR.GetLastElementStart=function(filename,notrailingcomma){let size=FR.GetFileSize(filename);let buffersize=100;let memory=ffi.cast('unsigned char*',C.malloc(size));let f=C.fopen(filename,'rb');let i=-1;let level=0;let instring=false;let instringcheck=null;let laste=null;let lasts=null;let out=0;if(notrailingcomma){out=1;}while(true){let position=buffersize*i;if(position<-size){position=-size;buffersize=buffersize*i+1+size;}C.fseek(f,position,2);C.fread(memory,buffersize,1,f);for(let i2=buffersize-1;i2<=0;i2+=-1){let a=memory[i2];if(instringcheck){if(a===92){instringcheck=instringcheck+1;}else{if(instringcheck%2===0){lasts=position+i2+2;instring=false;}instringcheck=null;}}if(instring){if(a===39){instringcheck=0;}}else{if(a===39){instring=true;laste=position+i2;}else if(a===125){level=level+1;}else if(a===123){level=level-1;if(level===0){C.fclose(f);C.free(memory);return size+position+i2+1;}}else if(a===39){instring=true;}else if(a===44){if(level===0){out=out+1;}}}}if(position===-size){break;}i=i-1;}};/* print(#symbols, error)*/let DATA={};DBFILENAME='db.lua';DEBUG={};DEBUG_LASTT=null;/* print(FR.GetLastElementStart(DBFILENAME))*//* error()*//* local start = FR.GetNextIndex(DBFILENAME)*//* local memory, size = FR.Read(DBFILENAME)*//* DATA = FR.Deserialize(memory, size)*//* local start = #DATA + 1*/let start=FR.GetNextIndex(DBFILENAME)||1;/* print(start)error()*/let SAVE=function(){print('SAVING');print('TOTAL BYTES USED: ');f=io.open(DBFILENAME,'ab+');f.write(FR.ConstructData(DATA,true,DEBUG));f.close();DATA={};start=DATA.length+1;print('SAVING DONE');};let IM=require('indexmap');let outmt={timestamp2,volume3,close4,high5,low6,open7};let lastdone=true;/* timestamp = {},*//* volume = {},*//* close = {},*//* high = {},*//* low = {},*//* open = {},*//* IM.Remove(out)*/print(pcall(function(){for(let i=start;i<=symbols.length;i++){let symbol=symbols[i];print(i+'/'+symbols.length,symbol);let s=1704067140,e;out=null;if(out){IM.Map(out,outmt);let ts=out.timestamp;for(let i=1;i<=ts.length;i++){a=ts[i];if(!e||tonumber(a)<e){e=tonumber(a);}}}else{out={1:i,2:{},3:{},4:{},5:{},6:{},7:{}};IM.Map(out,outmt);}DATA[DATA.length+1]=out;while(true){lastdone=false;e=s;s=e-604800;print(s+' -> '+e);let[data,httperrcode]=tickeryfinance(symbol,s,e);DEBUG_LASTT=data;if(data){let t=data.chart.result[1];let pricedata=t.indicators.quote[1];let t2=out.timestamp;let v=t.timestamp;if(!v){break;}for(let i=1;i<=v.length;i++){t2[t2.length+1]=v[i];}let _=pairs(pricedata),_f,_s,_v;if(typeof _=='object'){[_f,_s,_v]=_}else{_f=_}while(true){let[k,v]=_f(_s,_v);_v=k;if(_var==null||_var==undefined){break}t2=out[k];for(let i=1;i<=v.length;i++){t2[t2.length+1]=v[i];}}}else{if(httperrcode===422){lastdone=true;break;}else if(httperrcode===404){DATA[DATA.length]='404';break;}else{error('Invalid error: '+httperrcode);}}socket.sleep(1);}print('if ur gonna interrupt, do so now');socket.sleep(1);if(i%1000===0){SAVE();}}}));if(lastdone===false){DATA[DATA.length]=null;}SAVE();print('PRESS ENTER TO EXIT, type something then press enter to display last');a=io.read();if(a!==''){print(json.encode(DEBUG_LASTT));}