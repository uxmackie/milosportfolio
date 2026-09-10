(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tabs = [...document.querySelectorAll('[role=tab]')];
  const dock = document.querySelector('.tabs');
  const selection = document.querySelector('.selection');
  let active = 0, springFrame = 0, x = 0, velocity = 0, target = 0, previous = 0;
  function spring(now) {
    const dt = Math.min((now - (previous || now)) / 1000, .032); previous = now;
    const w = 30, d = x - target, c = velocity + w * d, decay = Math.exp(-w * dt);
    x = target + (d + c * dt) * decay; velocity = (velocity - w * c * dt) * decay;
    selection.style.transform = `translateX(${x}px)`;
    if (Math.abs(x-target) > .05 || Math.abs(velocity) > .05) springFrame = requestAnimationFrame(spring);
    else { selection.style.transform = `translateX(${target}px)`; x=target; springFrame=0; previous=0; }
  }
  function position(instant) {
    const tab=tabs[active]; target=tab.offsetLeft;selection.style.width=`${tab.offsetWidth}px`;
    if (instant || reduced.matches) {cancelAnimationFrame(springFrame);springFrame=0;previous=0;velocity=0;x=target;selection.style.transform=`translateX(${x}px)`;}
    else if (!springFrame) springFrame=requestAnimationFrame(spring);
  }
  const area=document.querySelector('.panel-area');
  let sizeAnimation;
  function fitPanel(instant=false){
    const current=area.getBoundingClientRect().height;
    const panel=document.getElementById(tabs[active].getAttribute('aria-controls'));
    const next=panel.getBoundingClientRect().height;
    if(Math.abs(next-current)<.5 && !sizeAnimation)return;
    if(sizeAnimation){sizeAnimation.cancel();sizeAnimation=null;}
    area.style.height=`${next}px`;
    if(!instant && !reduced.matches && Math.abs(current-next)>.5){
      const animation=area.animate([{height:`${current}px`},{height:`${next}px`}],{duration:260,easing:'cubic-bezier(.23,1,.32,1)'});
      sizeAnimation=animation;animation.onfinish=()=>{if(sizeAnimation===animation)sizeAnimation=null;};
    }
  }
  window.addEventListener('portfolio:content',()=>fitPanel());
  new ResizeObserver(()=>fitPanel(true)).observe(dock);
  if(document.fonts)document.fonts.ready.then(()=>fitPanel(true));
  function select(index, keyboard=false) {
    if (index===active) {if(keyboard)tabs[index].focus();return;}
    area.style.height=`${area.getBoundingClientRect().height}px`;
    active=index;
    for (const [i,tab] of tabs.entries()) {
      const selected=i===index, panel=document.getElementById(tab.getAttribute('aria-controls'));
      tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
      panel.getAnimations().forEach(animation=>animation.cancel());panel.hidden=!selected;
      if(selected && !keyboard && !reduced.matches) panel.animate([{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.23,1,.32,1)'});
    }
    dock.dataset.active=tabs[index].dataset.tab;
    fitPanel(keyboard);
    window.dispatchEvent(new CustomEvent("portfolio:tab",{detail:tabs[index].dataset.tab}));
    position(keyboard);if(keyboard)tabs[index].focus();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',event=>select(index,event.detail===0));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();select(next,true);}
    });
  });
  new ResizeObserver(()=>position(true)).observe(dock);
  reduced.addEventListener('change',()=>position(true));

  // Each glass surface receives the same wallpaper crop as the scene behind it.
  // Blur is applied to that actual canvas element, independently of backdrop-filter.
  const background=document.getElementById('wallpaper');
  const surfaces=[...document.querySelectorAll('.glass-texture')];
  const ctx=background.getContext('2d',{alpha:false});
  const layers=surfaces.map(canvas=>({canvas,ctx:canvas.getContext('2d',{alpha:false})}));
  
  if(!ctx || layers.some(layer=>!layer.ctx)){return;}
  const picture=new Image();
  let loaded=false,paused=reduced.matches,clock=0,last=0,frame=0,lastPaint=0,geometry=[];
  function measure(){
    const dpr=Math.min(devicePixelRatio||1,1.5);
    const bw=Math.round(innerWidth*dpr),bh=Math.round(innerHeight*dpr);
    if(background.width!==bw)background.width=bw;
    if(background.height!==bh)background.height=bh;
    geometry=layers.map(layer=>{
      const box=layer.canvas.getBoundingClientRect();
      // Low-resolution glass textures make the frosting soft and inexpensive.
      const cw=Math.ceil(box.width*.75),ch=Math.ceil(box.height*.75);
      if(layer.canvas.width!==cw)layer.canvas.width=cw;
      if(layer.canvas.height!==ch)layer.canvas.height=ch;
      return {left:box.left,top:box.top,width:box.width,height:box.height};
    });
    // Repaint in this same task: setting canvas dimensions clears its bitmap.
    if(loaded){cancelAnimationFrame(frame);frame=0;paint(performance.now(),true);}
  }
  function drawImage(context,width,height,left,top,viewWidth,viewHeight){
    context.setTransform(1,0,0,1,0,0);context.fillStyle="#0b192b";context.fillRect(0,0,width,height);
    context.setTransform(width/viewWidth,0,0,height/viewHeight,-left*width/viewWidth,-top*height/viewHeight);
    const scale=Math.max(innerWidth/picture.naturalWidth,innerHeight/picture.naturalHeight)*1.10;
    const w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;
    const dx=Math.sin(clock*.12)*innerWidth*.015,dy=Math.sin(clock*.09)*innerHeight*.012;
    context.drawImage(picture,(innerWidth-w)*.5+dx,(innerHeight-h)*.5+dy,w,h);
  }
  function paint(now,force=false){
    frame=0;if(!loaded || document.hidden)return;
    if(!force && !paused && now-lastPaint<32){frame=requestAnimationFrame(paint);return;}
    if(!paused && last)clock+=Math.min((now-last)/1000,.1);
    last=now;lastPaint=now;
    drawImage(ctx,background.width,background.height,0,0,innerWidth,innerHeight);
    layers.forEach((layer,i)=>{const g=geometry[i];if(g)drawImage(layer.ctx,layer.canvas.width,layer.canvas.height,g.left,g.top,g.width,g.height);});
    if(!paused)frame=requestAnimationFrame(paint);
  }
  function refresh(){if(!frame)frame=requestAnimationFrame(paint);}
  reduced.addEventListener('change',()=>{paused=reduced.matches;last=0;refresh();});
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else refresh();});
  addEventListener('resize',measure);addEventListener('scroll',measure,{passive:true});
  new ResizeObserver(measure).observe(document.querySelector('main'));
  if(document.fonts)document.fonts.ready.then(measure);
  picture.onload=()=>{loaded=true;measure();};
  picture.onerror=()=>{background.hidden=true;surfaces.forEach(canvas=>canvas.hidden=true);};
  picture.src='assets/background.jpg';
})();
