// lua-in-js dependency: printj
// Apache-2.0
// https://github.com/SheetJS/printj/blob/master/printj.js
// https://minify-js.com/
var PRINTJ={};PRINTJ.sprintf=function(){for(var e=new Array(arguments.length-1),t=0;t<e.length;++t)e[t]=arguments[t+1];return PRINTJ.doit(PRINTJ.tokenize(arguments[0]),e)};PRINTJ.tcache={},PRINTJ.tokenize=function(e){if(PRINTJ.tcache[e])return PRINTJ.tcache[e];for(var t=[],a=0,r=0,s=!1,n="",c="",h="",i="",g="",l=0,o=e.length;r<o;++r)if(l=e.charCodeAt(r),s)if(l>=48&&l<58)i.length?i+=String.fromCharCode(l):48!=l||h.length?h+=String.fromCharCode(l):c+=String.fromCharCode(l);else switch(l){case 36:i.length?i+="$":"*"==h.charAt(0)?h+="$":(n=h+"$",h="");break;case 39:c+="'";break;case 45:c+="-";break;case 43:c+="+";break;case 32:c+=" ";break;case 35:c+="#";break;case 46:i=".";break;case 42:"."==i.charAt(0)?i+="*":h+="*";break;case 104:case 108:if(g.length>1)throw"bad length "+g+String(l);g+=String.fromCharCode(l);break;case 76:case 106:case 122:case 116:case 113:case 90:case 119:if(""!==g)throw"bad length "+g+String.fromCharCode(l);g=String.fromCharCode(l);break;case 73:if(""!==g)throw"bad length "+g+"I";g="I";break;case 100:case 105:case 111:case 117:case 120:case 88:case 102:case 70:case 101:case 69:case 103:case 71:case 97:case 65:case 99:case 67:case 115:case 83:case 112:case 110:case 68:case 85:case 79:case 109:case 98:case 66:case 121:case 89:case 74:case 86:case 84:case 37:s=!1,i.length>1&&(i=i.substr(1)),t.push([String.fromCharCode(l),e.substring(a,r+1),n,c,h,i,g]),a=r+1,g=i=h=c=n="";break;default:throw new Error("Invalid format string starting with |"+e.substring(a,r+1)+"|")}else{if(37!==l)continue;a<r&&t.push(["L",e.substring(a,r)]),a=r,s=!0}return a<e.length&&t.push(["L",e.substring(a)]),PRINTJ.tcache[e]=t},PRINTJ.u_inspect=JSON.stringify,PRINTJ.doit=function(e,t){for(var a="",r=0,s=0,n=0,c="",h=0;h<e.length;++h){var i=e[h],g=i[0].charCodeAt(0);if(76!==g)if(37!==g){var l="",o=0,b=10,f=4,u=!1,p=i[3],d=p.indexOf("#")>-1;if(i[2])r=parseInt(i[2],10)-1;else if(109===g&&!d){a+="Success";continue}var k=0;i[4].length>0&&(k="*"!==i[4].charAt(0)?parseInt(i[4],10):1===i[4].length?t[s++]:t[parseInt(i[4].substr(1),10)-1]);var x=-1;i[5].length>0&&(x="*"!==i[5].charAt(0)?parseInt(i[5],10):1===i[5].length?t[s++]:t[parseInt(i[5].substr(1),10)-1]),i[2]||(r=s++);var C=t[r],O=i[6];switch(g){case 83:case 115:l=String(C),x>=0&&(l=l.substr(0,x)),(k>l.length||-k>l.length)&&((-1==p.indexOf("-")||k<0)&&-1!=p.indexOf("0")?l=(c=k-l.length>=0?"0".repeat(k-l.length):"")+l:(c=k-l.length>=0?" ".repeat(k-l.length):"",l=p.indexOf("-")>-1?l+c:c+l));break;case 67:case 99:switch(typeof C){case"number":var S=C;67==g||108===O.charCodeAt(0)?(S&=4294967295,l=String.fromCharCode(S)):(S&=255,l=String.fromCharCode(S));break;case"string":l=C.charAt(0);break;default:l=String(C).charAt(0)}(k>l.length||-k>l.length)&&((-1==p.indexOf("-")||k<0)&&-1!=p.indexOf("0")?l=(c=k-l.length>=0?"0".repeat(k-l.length):"")+l:(c=k-l.length>=0?" ".repeat(k-l.length):"",l=p.indexOf("-")>-1?l+c:c+l));break;case 68:f=8;case 100:case 105:o=-1,u=!0;break;case 85:f=8;case 117:o=-1;break;case 79:f=8;case 111:o=-1,b=8;break;case 120:o=-1,b=-16;break;case 88:o=-1,b=16;break;case 66:f=8;case 98:o=-1,b=2;break;case 70:case 102:o=1;break;case 69:case 101:o=2;break;case 71:case 103:o=3;break;case 65:case 97:o=4;break;case 112:n="number"==typeof C?C:C?Number(C.l):-1,isNaN(n)&&(n=-1),l=d?n.toString(10):"0x"+(n=Math.abs(n)).toString(16).toLowerCase();break;case 110:C&&(C.len=a.length);continue;case 109:l=C instanceof Error?C.message?C.message:C.errno?"Error number "+C.errno:"Error "+String(C):"Success";break;case 74:l=(d?PRINTJ.u_inspect:JSON.stringify)(C);break;case 86:l=null==C?"null":String(C.valueOf());break;case 84:l=d?(l=Object.prototype.toString.call(C).substr(8)).substr(0,l.length-1):typeof C;break;case 89:case 121:l=C?d?"yes":"true":d?"no":"false",89==g&&(l=l.toUpperCase()),x>=0&&(l=l.substr(0,x)),(k>l.length||-k>l.length)&&((-1==p.indexOf("-")||k<0)&&-1!=p.indexOf("0")?l=(c=k-l.length>=0?"0".repeat(k-l.length):"")+l:(c=k-l.length>=0?" ".repeat(k-l.length):"",l=p.indexOf("-")>-1?l+c:c+l))}if(k<0&&(k=-k,p+="-"),-1==o){switch(n=Number(C),O){case"hh":f=1;break;case"h":f=2;break;case"l":case"L":case"q":case"ll":case"j":case"t":case"z":case"Z":case"I":4==f&&(f=8)}switch(f){case 1:n&=255,u&&n>127&&(n-=256);break;case 2:n&=65535,u&&n>32767&&(n-=65536);break;case 4:n=u?0|n:n>>>0;break;default:n=isNaN(n)?0:Math.round(n)}if(f>4&&n<0&&!u)if(16==b||-16==b)l=(n>>>0).toString(16),l=(16-(l=((n=Math.floor((n-(n>>>0))/Math.pow(2,32)))>>>0).toString(16)+(8-l.length>=0?"0".repeat(8-l.length):"")+l).length>=0?"f".repeat(16-l.length):"")+l,16==b&&(l=l.toUpperCase());else if(8==b)l=(10-(l=(n>>>0).toString(8)).length>=0?"0".repeat(10-l.length):"")+l,l="1"+(21-(l=(l=((n=Math.floor((n-(n>>>0&1073741823))/Math.pow(2,30)))>>>0).toString(8)+l.substr(l.length-10)).substr(l.length-20)).length>=0?"7".repeat(21-l.length):"")+l;else{n=-n%1e16;for(var A=[1,8,4,4,6,7,4,4,0,7,3,7,0,9,5,5,1,6,1,6],w=A.length-1;n>0;)(A[w]-=n%10)<0&&(A[w]+=10,A[w-1]--),--w,n=Math.floor(n/10);l=A.join("")}else l=-16===b?n.toString(16).toLowerCase():16===b?n.toString(16).toUpperCase():n.toString(b);if(0!==x||"0"!=l||8==b&&d){if(l.length<x+("-"==l.substr(0,1)?1:0)&&(l="-"!=l.substr(0,1)?(x-l.length>=0?"0".repeat(x-l.length):"")+l:l.substr(0,1)+(x+1-l.length>=0?"0".repeat(x+1-l.length):"")+l.substr(1)),!u&&d&&0!==n)switch(b){case-16:l="0x"+l;break;case 16:l="0X"+l;break;case 8:"0"!=l.charAt(0)&&(l="0"+l);break;case 2:l="0b"+l}}else l="";u&&"-"!=l.charAt(0)&&(p.indexOf("+")>-1?l="+"+l:p.indexOf(" ")>-1&&(l=" "+l)),k>0&&l.length<k&&(p.indexOf("-")>-1?l+=k-l.length>=0?" ".repeat(k-l.length):"":p.indexOf("0")>-1&&x<0&&l.length>0?(x>l.length&&(l=(x-l.length>=0?"0".repeat(x-l.length):"")+l),c=k-l.length>=0?(x>0?" ":"0").repeat(k-l.length):"",l=l.charCodeAt(0)<48?"x"==l.charAt(2).toLowerCase()?l.substr(0,3)+c+l.substring(3):l.substr(0,1)+c+l.substring(1):"x"==l.charAt(1).toLowerCase()?l.substr(0,2)+c+l.substring(2):c+l):l=(k-l.length>=0?" ".repeat(k-l.length):"")+l)}else if(o>0){n=Number(C),null===C&&(n=NaN),"L"==O&&(f=12);var N=isFinite(n);if(N){var v=0;-1==x&&4!=o&&(x=6),3==o&&(0===x&&(x=1),x>(v=+(l=n.toExponential(1)).substr(l.indexOf("e")+1))&&v>=-4?(o=11,x-=v+1):(o=12,x-=1));var I=n<0||1/n==-1/0?"-":"";switch(n<0&&(n=-n),o){case 1:case 11:if(n<1e21){l=n.toFixed(x),1==o?0===x&&d&&-1==l.indexOf(".")&&(l+="."):d?-1==l.indexOf(".")&&(l+="."):l=l.replace(/(\.\d*[1-9])0*$/,"$1").replace(/\.0*$/,"");break}v=+(l=n.toExponential(20)).substr(l.indexOf("e")+1),l=l.charAt(0)+l.substr(2,l.indexOf("e")-2),l+=v-l.length+1>=0?"0".repeat(v-l.length+1):"",(d||x>0&&11!==o)&&(l=l+"."+(x>=0?"0".repeat(x):""));break;case 2:case 12:v=(l=n.toExponential(x)).indexOf("e"),l.length-v==3&&(l=l.substr(0,v+2)+"0"+l.substr(v+2)),d&&-1==l.indexOf(".")?l=l.substr(0,v)+"."+l.substr(v):d||12!=o||(l=l.replace(/\.0*e/,"e").replace(/\.(\d*[1-9])0*e/,".$1e"));break;case 4:if(0===n){l="0x0"+(d||x>0?"."+(x>=0?"0".repeat(x):""):"")+"p+0";break}var m=(l=n.toString(16)).charCodeAt(0);if(48==m){for(m=2,v=-4,n*=16;48==l.charCodeAt(m++);)v-=4,n*=16;m=(l=n.toString(16)).charCodeAt(0)}var J=l.indexOf(".");if(l.indexOf("(")>-1){var M=l.match(/\(e(.*)\)/),P=M?+M[1]:0;v+=4*P,n/=Math.pow(16,P)}else J>1?(v+=4*(J-1),n/=Math.pow(16,J-1)):-1==J&&(v+=4*(l.length-1),n/=Math.pow(16,l.length-1));if(f>8?m<50?(v-=3,n*=8):m<52?(v-=2,n*=4):m<56&&(v-=1,n*=2):m>=56?(v+=3,n/=8):m>=52?(v+=2,n/=4):m>=50&&(v+=1,n/=2),(l=n.toString(16)).length>1){if(l.length>x+2&&l.charCodeAt(x+2)>=56){var R=102==l.charCodeAt(0);l=(n+8*Math.pow(16,-x-1)).toString(16),R&&49==l.charCodeAt(0)&&(v+=4)}x>0?(l=l.substr(0,x+2)).length<x+2&&(l.charCodeAt(0)<48?l=l.charAt(0)+(x+2-l.length>=0?"0".repeat(x+2-l.length):"")+l.substr(1):l+=x+2-l.length>=0?"0".repeat(x+2-l.length):""):0===x&&(l=l.charAt(0)+(d?".":""))}else x>0?l=l+"."+(x>=0?"0".repeat(x):""):d&&(l+=".");l="0x"+l+"p"+(v>=0?"+"+v:v)}""===I&&(p.indexOf("+")>-1?I="+":p.indexOf(" ")>-1&&(I=" ")),l=I+l}else n<0?l="-":p.indexOf("+")>-1?l="+":p.indexOf(" ")>-1&&(l=" "),l+=isNaN(n)?"nan":"inf";k>l.length&&(p.indexOf("-")>-1?l+=k-l.length>=0?" ".repeat(k-l.length):"":p.indexOf("0")>-1&&l.length>0&&N?(c=k-l.length>=0?"0".repeat(k-l.length):"",l=l.charCodeAt(0)<48?"x"==l.charAt(2).toLowerCase()?l.substr(0,3)+c+l.substring(3):l.substr(0,1)+c+l.substring(1):"x"==l.charAt(1).toLowerCase()?l.substr(0,2)+c+l.substring(2):c+l):l=(k-l.length>=0?" ".repeat(k-l.length):"")+l),g<96&&(l=l.toUpperCase())}a+=l}else a+="%";else a+=i[1]}return a};