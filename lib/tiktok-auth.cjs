const crypto=require('node:crypto');
const scopes=['user.info.basic','user.info.stats','video.list'];
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const random=()=>crypto.randomBytes(32).toString('hex');
const equal=(a,b)=>crypto.timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
function config(){
 const env=process.env;
 for(const name of ['SITE_URL','TIKTOK_CLIENT_KEY','TIKTOK_CLIENT_SECRET','TIKTOK_ADMIN_PASSWORD','TIKTOK_ENCRYPTION_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'])if(!env[name])throw new Error('not_configured');
 const url=new URL(env.SITE_URL);
 if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password||env.TIKTOK_ADMIN_PASSWORD.length<32||!/^[a-f0-9]{64}$/i.test(env.TIKTOK_ENCRYPTION_KEY))throw new Error('not_configured');
 if(new URL(env.UPSTASH_REDIS_REST_URL).protocol!=='https:')throw new Error('not_configured');
 return {origin:url.origin,redirect:url.origin+'/api/tiktok-callback',prefix:'milo:tt:'+hash(url.origin+env.TIKTOK_CLIENT_KEY).slice(0,16)+':'};
}
function key(name){return config().prefix+name;}
async function redis(...command){
 config();const r=await fetch(process.env.UPSTASH_REDIS_REST_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(8000)});
 const b=await r.json();if(!r.ok||b.error)throw new Error('storage_unavailable');return b.result;
}
function seal(value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',Buffer.from(process.env.TIKTOK_ENCRYPTION_KEY,'hex'),iv);const data=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64url');}
function unseal(value){const b=Buffer.from(value,'base64url'),d=crypto.createDecipheriv('aes-256-gcm',Buffer.from(process.env.TIKTOK_ENCRYPTION_KEY,'hex'),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}
function headers(res){res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://www.tiktok.com");}
function cookie(req,name){return String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';}
function setCookie(res,name,value,maxAge=600){res.setHeader('Set-Cookie',`${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`);}
function owner(req,res){
 const raw=String(req.headers.authorization||'');let decoded='';try{if(raw.startsWith('Basic '))decoded=Buffer.from(raw.slice(6),'base64').toString();}catch{}
 const i=decoded.indexOf(':');
 if(i<0||!equal(decoded.slice(0,i),'owner')||!equal(decoded.slice(i+1),process.env.TIKTOK_ADMIN_PASSWORD)){
  res.setHeader('WWW-Authenticate','Basic realm="Milo owner setup", charset="UTF-8"');res.status(401).send('Owner sign-in required.');return false;
 }return true;
}
async function oauth(values,path='token'){
 const r=await fetch(`https://open.tiktokapis.com/v2/oauth/${path}/`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:process.env.TIKTOK_CLIENT_KEY,client_secret:process.env.TIKTOK_CLIENT_SECRET,...values}).toString(),signal:AbortSignal.timeout(8000)});
 const text=await r.text();const b=text?JSON.parse(text):{};
 if(!r.ok||b.error){const e=new Error(['invalid_grant','invalid_token','access_denied'].includes(b.error)?'reconnect_required':'tiktok_unavailable');throw e;}return b;
}
function record(b){
 if(!b.access_token||!b.refresh_token||!b.open_id||!Number.isFinite(b.expires_in)||b.expires_in<=0||!Number.isFinite(b.refresh_expires_in)||b.refresh_expires_in<=0)throw new Error('invalid_token_response');
 if(!scopes.every(s=>String(b.scope||'').split(',').includes(s)))throw new Error('missing_scopes');
 return {access:b.access_token,refresh:b.refresh_token,openId:b.open_id,expires:Date.now()+b.expires_in*1000,refreshExpires:Date.now()+b.refresh_expires_in*1000,scopes:b.scope};
}
async function connection(){const raw=await redis('GET',key('tokens'));return raw?{raw,value:unseal(raw)}:null;}
async function access(){
 const current=await connection();if(!current)throw new Error('not_connected');
 if(current.value.refreshExpires<=Date.now())throw new Error('reconnect_required');
 if(current.value.expires>Date.now()+120000)return current.value.access;
 const lock=random();if(!await redis('SET',key('refresh-lock'),lock,'NX','EX',30))throw new Error('refresh_in_progress');
 try{
  const latest=await connection();if(!latest)throw new Error('not_connected');
  if(latest.value.expires>Date.now()+120000)return latest.value.access;
  const renewed=record(await oauth({grant_type:'refresh_token',refresh_token:latest.value.refresh}));
  if(renewed.openId!==latest.value.openId)throw new Error('account_mismatch');
  // Compare-and-swap prevents refresh from restoring a disconnected/replaced account.
  const saved=await redis('EVAL',"if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 else return 0 end",1,key('tokens'),latest.raw,seal(renewed));
  if(!saved)throw new Error('connection_changed');return renewed.access;
 }finally{await redis('EVAL',"if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,key('refresh-lock'),lock).catch(()=>{});}
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function page(res,status,title,content){headers(res);res.setHeader('Content-Type','text/html; charset=utf-8');return res.status(status).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · milo</title><link rel="stylesheet" href="/assets/portfolio.css?v=8"><link rel="stylesheet" href="/assets/legal.css"><link rel="stylesheet" href="/assets/owner.css"></head><body class="legal-page owner-page"><canvas id="wallpaper" aria-hidden="true"></canvas><div class="shade" aria-hidden="true"></div><button id="motion" class="motion glass" aria-label="Pause background animation"><canvas class="glass-texture" aria-hidden="true"></canvas><span class="motion-icon" aria-hidden="true">Ⅱ</span><span class="motion-label">Pause motion</span></button><main class="legal-main"><article class="profile-card glass legal-card"><canvas class="glass-texture" aria-hidden="true"></canvas><p class="legal-eyebrow">milo · owner setup</p><h1>${escape(title)}</h1>${content}<footer class="legal-footer"><a href="/terms/">Terms</a><a href="/privacy/">Privacy</a><a href="/">Portfolio ↗</a></footer></article></main><script src="/assets/legal.js"></script></body></html>`);}
module.exports={config,key,redis,seal,unseal,headers,cookie,setCookie,owner,oauth,record,connection,access,escape,page,random,equal,hash,scopes};
