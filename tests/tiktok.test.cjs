const test=require('node:test');const assert=require('node:assert/strict');
function handler(){delete require.cache[require.resolve('../api/tiktok.js')];return require('../api/tiktok.js');}
async function call(fn,method='GET'){const r={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};await fn({method},r);return r;}
test('TikTok endpoint: auth, scoped data, cache, partial failure, expired token',async()=>{
 const auth=require('../lib/tiktok-auth.cjs'),oldAccess=auth.access,oldFetch=global.fetch;
 try{
  auth.access=async()=>{throw new Error('not_connected');};
  assert.equal((await call(handler())).body.status,'not_connected');
  auth.access=async()=>'secret-test-token';let calls=0;
  global.fetch=async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer secret-test-token');return {ok:true,status:200,json:async()=>({error:{code:'ok'},data:url.includes('user/info')?{user:{display_name:'Test',follower_count:0,likes_count:12,video_count:1}}:{videos:[{id:'12345',video_description:'<script>not markup</script>',create_time:1700000000,like_count:0,comment_count:2,view_count:30,share_count:1}]}})};};
  const fn=handler(),r=await call(fn);assert.equal(r.body.followers,0);assert.equal(r.body.video.likes,0);assert.equal(r.body.video.caption,'<script>not markup</script>');assert.ok(!JSON.stringify(r.body).includes('secret-test-token'));
  await call(fn);assert.equal(calls,2);assert.equal((await call(fn,'POST')).code,405);
  global.fetch=async(url)=>({ok:!url.includes('video/list'),status:url.includes('video/list')?403:200,json:async()=>url.includes('video/list')?{error:{code:'scope_not_authorized'}}:{error:{code:'ok'},data:{user:{display_name:'Test',follower_count:1,likes_count:2,video_count:0}}}});
  const partial=await call(handler());assert.equal(partial.body.videoStatus,'unavailable');assert.equal(partial.body.followers,1);
  global.fetch=async()=>({ok:false,status:401,json:async()=>({error:{code:'access_token_invalid'}})});
  assert.equal((await call(handler())).body.status,'reconnect_required');
 }finally{global.fetch=oldFetch;auth.access=oldAccess;}
});
