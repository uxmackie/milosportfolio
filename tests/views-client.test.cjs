const test=require('node:test'), assert=require('node:assert/strict');
const vm=require('node:vm'), fs=require('node:fs');
const source=fs.readFileSync('dist/assets/views.js','utf8');
test('view label formats the shared total and never substitutes a fake count',async()=>{
  for(const [response,expected] of [
    [{ok:true,body:{views:1234}},'1,234 views'],
    [{ok:true,body:{views:1}},'1 view'],
    [{ok:true,body:{views:0}},'0 views'],
    [{ok:true,body:{views:'12'}},'Views unavailable'],
    [{ok:false},'Views unavailable'],
    [null,'Views unavailable'],
  ]) {
    const label={textContent:'— views'};let calls=0;
    vm.runInNewContext(source,{
      document:{getElementById:()=>label},
      Intl:{NumberFormat:class {format(n){return n.toLocaleString('en-US')}}},
      AbortSignal,Number,
      fetch:async(url,options)=>{
        calls++;assert.equal(url,'/api/views');assert.equal(options.method,'POST');
        if(!response)throw new Error('offline');
        return {...response,json:async()=>response.body};
      },
    });
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(label.textContent,expected);assert.equal(calls,1);
  }
});
