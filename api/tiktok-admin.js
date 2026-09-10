const a=require('../lib/tiktok-auth.cjs');
module.exports=async(req,res)=>{
 a.headers(res);
 try{a.config();}catch{return a.page(res,503,'Setup needed','<p>The owner connection is not configured yet. Complete the private environment settings described in TIKTOK-SETUP.md, then redeploy.</p>');}
 if(!a.owner(req,res))return;
 try{
  if(req.method==='GET'){
   const csrf=a.random();await a.redis('SET',a.key('form:'+a.hash(csrf)),'1','EX',600);a.setCookie(res,'__Host-milo-form',csrf);
   const conn=await a.connection();
   const text=conn?'Your TikTok account is connected. Access renews automatically when the stats are requested.':'Connect your own TikTok account to display its public statistics and latest video.';
   const forms=conn?`<a class="owner-button" href="/?tab=tiktok">View TikTok tab ↗</a><form method="post"><input type="hidden" name="csrf" value="${csrf}"><button name="action" value="disconnect" class="owner-button danger">Disconnect TikTok</button></form>`:`<form method="post"><input type="hidden" name="csrf" value="${csrf}"><button name="action" value="connect" class="owner-button">Continue with TikTok</button></form>`;
   return a.page(res,200,conn?'TikTok connected':'Connect TikTok',`<p>${text}</p><p class="owner-note">Only the portfolio owner authorizes an account. Visitors do not sign in. This integration reads your display name, public counts, and videos; it cannot upload or publish.</p>${forms}`);
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).send('Method not allowed');}
  const body=typeof req.body==='string'?Object.fromEntries(new URLSearchParams(req.body)):req.body||{};
  const csrf=a.cookie(req,'__Host-milo-form');
  if(req.headers.origin!==a.config().origin||!/^[a-f0-9]{64}$/.test(csrf)||!a.equal(csrf,body.csrf||'')||!await a.redis('GETDEL',a.key('form:'+a.hash(csrf))))return a.page(res,403,'Please try again','<p>This form expired or could not be verified. <a href="/api/tiktok-admin">Return to setup</a>.</p>');
  if(body.action==='connect'){
   if(await a.connection())return a.page(res,409,'Already connected','<p>Disconnect the current account before connecting another.</p>');
   const state=a.random(),nonce=a.random();
   await a.redis('SET',a.key('state:'+a.hash(state)),a.hash(nonce),'EX',600);
   a.setCookie(res,'__Host-milo-oauth',nonce);
   const url=new URL('https://www.tiktok.com/v2/auth/authorize/');
   url.search=new URLSearchParams({client_key:process.env.TIKTOK_CLIENT_KEY,response_type:'code',scope:a.scopes.join(','),redirect_uri:a.config().redirect,state,disable_auto_auth:'1'}).toString();
   return res.redirect(303,url.href);
  }
  if(body.action==='disconnect'){
   // Delete locally first. A concurrent refresh cannot write the connection back.
   const raw=await a.redis('GETDEL',a.key('tokens'));let revoked=true;
   if(raw){try{await a.oauth({token:a.unseal(raw).access},'revoke');}catch{revoked=false;}}
   return a.page(res,200,'TikTok disconnected',`<p>The stored connection has been removed and the portfolio will stop retrieving your TikTok data.</p>${revoked?'':'<p>TikTok could not confirm revocation. Also remove this app in TikTok’s app permissions to revoke access there.</p>'}<a class="owner-button" href="/api/tiktok-admin">Return to setup</a>`);
  }
  return res.status(400).send('Unknown action');
 }catch{return a.page(res,503,'Connection unavailable','<p>Please try again shortly. If this continues, check the private app and storage settings. <a href="/api/tiktok-admin">Return to setup</a>.</p>');}
};
