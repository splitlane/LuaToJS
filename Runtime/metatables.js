function setmetatable(t, mt) {
    t = new Proxy(t, jsmt);
}

function getmetatable(t, mt) {

}


const target = {
  message1: "hello",
  message2: "everyone",
};

const handler2 = {
  get(target, property, receiver) {
    console.log(target, prop, receiver)
    return "world";
  },
};

const proxy2 = new Proxy(target, handler2);


console.log(proxy2.a);