const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/views.js');
async function call(method = 'POST', origin = 'https://portfolio.example') {
  const res = { headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.code=n; return this; }, json(body) { this.body=body; return this; } };
  await handler({ method, headers: { origin } }, res);
  return res;
}
test('shared views: reads, increments, origin validation and storage failures', async () => {
  const names = ['SITE_URL','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];
  const old = names.map(n=>process.env[n]); const originalFetch = global.fetch;
  try {
    names.forEach(n=>delete process.env[n]);
    assert.equal((await call()).code,503);
    process.env.SITE_URL='https://portfolio.example';
    process.env.UPSTASH_REDIS_REST_URL='https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN='test-secret';
    let total=null, requests=0;
    global.fetch=async (url, options)=>{
      requests++;
      assert.equal(options.headers.Authorization,'Bearer test-secret');
      const [command,key]=JSON.parse(options.body);
      assert.equal(key,'milo:views:https://portfolio.example');
      if(command==='INCR')total=(total||0)+1;
      else assert.equal(command,'GET');
      return {ok:true,json:async()=>({result:total===null?null:String(total)})};
    };
    assert.deepEqual((await call('GET')).body,{views:0});
    assert.equal((await call()).body.views,1);
    const concurrent=await Promise.all(Array.from({length:10},()=>call()));
    assert.equal(concurrent.every(r=>r.code===200),true);
    assert.equal((await call('GET')).body.views,11);
    const before=requests;
    assert.equal((await call('POST','https://other.example')).code,403);
    assert.equal((await call('POST','')).code,403);
    assert.equal((await call('DELETE')).code,405);
    assert.equal(requests,before);
    for(const result of [null,-1,'NaN','',true,{},'9007199254740992']) {
      global.fetch=async()=>({ok:true,json:async()=>({result})});
      assert.equal((await call()).code,503);
    }
    global.fetch=async()=>({ok:false,json:async()=>({error:'secret storage detail'})});
    assert.deepEqual((await call()).body,{status:'unavailable'});
    global.fetch=async()=>{throw new Error('timeout')};
    assert.equal((await call()).code,503);
  } finally {
    global.fetch=originalFetch;
    names.forEach((n,i)=>{if(old[i]===undefined)delete process.env[n];else process.env[n]=old[i];});
  }
});
