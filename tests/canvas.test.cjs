const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('resize repaints synchronously and unchanged measurements do not clear canvas',()=>{
 const source=fs.readFileSync('dist/assets/portfolio.js','utf8');
 const functions=source.slice(source.indexOf('  function measure(){'),source.indexOf('  function refresh(){'));
 let clears=0,draws=0,callbacks=0;
 const context={setTransform(){},fillRect(){},drawImage(){draws++;}};
 function canvas(w,h){let width=w,height=h;return {get width(){return width;},set width(v){width=v;clears++;},get height(){return height;},set height(v){height=v;clears++;},getBoundingClientRect(){return {left:10,top:10,width:200,height:300};}};}
 const sandbox={devicePixelRatio:1,innerWidth:400,innerHeight:800,background:canvas(400,800),layers:[{canvas:canvas(150,225),ctx:context}],ctx:context,loaded:true,geometry:[],frame:123,paused:false,clock:0,last:0,lastPaint:99,document:{hidden:false},picture:{naturalWidth:1536,naturalHeight:1396},performance:{now:()=>100},requestAnimationFrame(){callbacks++;return callbacks;},cancelAnimationFrame(){},Math};
 vm.createContext(sandbox);vm.runInContext(functions,sandbox);
 vm.runInContext('measure()',sandbox);assert.equal(clears,0);assert.equal(draws,2,'must repaint despite frame throttle');
 sandbox.innerWidth=420;vm.runInContext('measure()',sandbox);assert.equal(clears,1);assert.equal(draws,4,'resize and repaint must finish in same call');
 sandbox.paused=true;vm.runInContext('measure()',sandbox);assert.equal(draws,6,'paused wallpaper must redraw after geometry changes');
});
