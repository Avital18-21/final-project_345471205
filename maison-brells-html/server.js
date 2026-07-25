"use strict";

// Small framework-free JavaScript server: static files + secure JSONBin proxy.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

loadEnv(path.join(__dirname, ".env"));
console.log("ENV file path:", path.join(__dirname, ".env"));
console.log("BIN ID loaded:", Boolean(process.env.JSONBIN_BIN_ID));
console.log("ACCESS KEY loaded:", Boolean(process.env.JSONBIN_ACCESS_KEY));
const port = Number(process.env.PORT || 5500);
const demoUser = {name:"Demo Client",email:"demo@aurelle.com",password:"Aurelle123",address:"12 Avenue Montaigne, Paris",orders:[],cart:[]};

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file,"utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}
function json(res,status,data) { res.writeHead(status,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(data)); }
function config() {
  if(!process.env.JSONBIN_BIN_ID||!process.env.JSONBIN_ACCESS_KEY) throw new Error("JSONBin is not configured. Copy .env.local to .env and add your values.");
  return {url:`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`,key:process.env.JSONBIN_ACCESS_KEY};
}
async function readStore() {
  const {url,key}=config();const r=await fetch(`${url}/latest`,{headers:{"X-Access-Key":key}});if(!r.ok)throw new Error(`JSONBin read failed (${r.status})`);
  const payload=await r.json();const record=payload.record&&typeof payload.record==="object"?payload.record:{};
  const users=Array.isArray(record.users)?record.users:[];
  return {...record,users:users.some(u=>String(u.email).toLowerCase()===demoUser.email)?users:[...users,demoUser],stockLevels:record.stockLevels&&typeof record.stockLevels==="object"?record.stockLevels:{}};
}
async function writeStore(store) { const {url,key}=config();const r=await fetch(url,{method:"PUT",headers:{"Content-Type":"application/json","X-Access-Key":key},body:JSON.stringify(store)});if(!r.ok)throw new Error(`JSONBin update failed (${r.status})`); }
async function api(req,res) {
  try {
    if(req.method==="GET"){const store=await readStore();await writeStore(store);return json(res,200,{ok:true,users:store.users.length,stockLevels:store.stockLevels});}
    let raw="";for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||"{}");const store=await readStore();const list=store.users;const email=String(body.email||"").trim().toLowerCase();const index=list.findIndex(u=>String(u.email).toLowerCase()===email);
    if(body.action==="load-inventory"){
      let changed=false;for(const [id,value] of Object.entries(body.defaults||{})){if(store.stockLevels[id]===undefined){store.stockLevels[id]=Math.max(0,Number(value)||0);changed=true;}}
      if(changed)await writeStore(store);return json(res,200,{ok:true,stockLevels:store.stockLevels});
    }
    if(body.action==="login"){const user=list[index];return user&&user.password===body.password?json(res,200,{ok:true,user}):json(res,401,{ok:false,message:"Incorrect email or password"});}
    if(body.action==="register"){if(index>=0)return json(res,409,{ok:false,message:"This email is already registered"});const user={...body.user,email,orders:[],cart:body.user.cart||[]};store.users=[...list,user];await writeStore(store);return json(res,200,{ok:true,user});}
    if(body.action==="purchase"){
      const items=Array.isArray(body.order?.items)?body.order.items:[];if(!items.length)return json(res,400,{ok:false,message:"Your shopping bag is empty"});
      for(const item of items){const quantity=Number(item.quantity);const available=Number(store.stockLevels[item.id]||0);if(!Number.isInteger(quantity)||quantity<1||quantity>available)return json(res,409,{ok:false,message:`${item.title||"A product"} only has ${available} piece${available===1?"":"s"} available`,stockLevels:store.stockLevels});}
      const user=list[index];if(email&&(!user||user.password!==body.password))return json(res,401,{ok:false,message:"Session verification failed"});
      for(const item of items)store.stockLevels[item.id]-=Number(item.quantity);
      if(user){list[index]={...user,address:body.address,orders:[body.order,...(user.orders||[])],cart:[]};store.users=list;}
      await writeStore(store);return json(res,200,{ok:true,user:user?list[index]:null,stockLevels:store.stockLevels});
    }
    const user=list[index];if(!user||user.password!==body.password)return json(res,401,{ok:false,message:"Session verification failed"});
    if(body.action==="sync-cart"){list[index]={...user,cart:body.cart||[]};store.users=list;await writeStore(store);return json(res,200,{ok:true});}
    return json(res,400,{ok:false,message:"Unknown action"});
  } catch(error) { return json(res,502,{ok:false,message:error.message||"Server error"}); }
}
function staticFile(req,res) {
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);const relative=pathname==="/"?"index.html":pathname.slice(1);const file=path.resolve(__dirname,relative);if(!file.startsWith(path.resolve(__dirname)+path.sep))return json(res,403,{message:"Forbidden"});
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end("Not found");}const type={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"}[path.extname(file)]||"application/octet-stream";res.writeHead(200,{"Content-Type":type});res.end(data);});
}
http.createServer((req,res)=>req.url.startsWith("/api/store")?api(req,res):staticFile(req,res)).listen(port,()=>console.log(`Maison Brell's: http://localhost:${port}`));
//