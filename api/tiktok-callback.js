const a=require('../lib/tiktok-auth.cjs');
module.exports=async(req,res)=>{
 a.headers(res);if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).send('Method not allowed');}
 try{
  a.config();const url=new URL(req.url,a.config().origin),state=url.searchParams.get('state')||'',nonce=a.cookie(req,'__Host-milo-oauth');
  if(!/^[a-f0-9]{64}$/.test(state)||!/^[a-f0-9]{64}$/.test(nonce))throw new Error('invalid_state');
  const stateKey=a.key('state:'+a.hash(state)),expected=await a.redis('GET',stateKey);
  if(!expected||!a.equal(expected,a.hash(nonce)))throw new Error('invalid_state');
  const consumed=await a.redis('GETDEL',stateKey);if(!consumed||!a.equal(consumed,a.hash(nonce)))throw new Error('invalid_state');
  a.setCookie(res,'__Host-milo-oauth','',0);
  if(url.searchParams.has('error'))return a.page(res,400,'Connection cancelled','<p>No new account was connected. <a href="/api/tiktok-admin">Return to setup</a> when you are ready.</p>');
  const code=url.searchParams.get('code');if(!code||code.length>4096)throw new Error('invalid_code');
  const tokens=a.record(await a.oauth({grant_type:'authorization_code',code,redirect_uri:a.config().redirect}));
  if(process.env.TIKTOK_OWNER_OPEN_ID && tokens.openId!==process.env.TIKTOK_OWNER_OPEN_ID)throw new Error('account_mismatch');
  const saved=await a.redis('SET',a.key('tokens'),a.seal(tokens),'NX');
  if(!saved)throw new Error('already_connected');
  // Clean callback URL before showing confirmation; authorization code is not forwarded.
  return res.redirect(303,'/api/tiktok-admin');
 }catch(error){
  const msg=error.message==='missing_scopes'?'Please grant all three requested permissions so the portfolio can display your stats and video.':error.message==='account_mismatch'?'That account does not match the configured owner.':'The connection expired or could not be completed. Start again from the owner setup page.';
  return a.page(res,400,'Could not connect',`<p>${msg}</p><a class="owner-button" href="/api/tiktok-admin">Return to setup</a>`);
 }
};
