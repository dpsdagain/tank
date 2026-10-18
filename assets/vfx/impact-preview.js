/* Shared production physics + impact renderer; each preview starts at first contact. */
(() => {
  'use strict';
  const C=PocketCore,$=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenery=new Image();scenery.src='assets/art/flow-scenery.jpg';
  const backdrop=document.createElement('canvas');backdrop.width=600;backdrop.height=360;
  let paused=reduced,time=.01,previous=performance.now(),backdropReady=false;
  const cards=POCKET_WEAPONS.map((weapon,index)=>{
    const section=document.createElement('section'),style=WeaponImpactArt.catalog[weapon.id];section.className='reel-card';section.dataset.weapon=weapon.id;
    section.innerHTML=`<canvas width="600" height="360" role="img" aria-label="${weapon.name} impact reaction"></canvas><div class="reel-info">${WeaponIcons.html(weapon)}<h2>${weapon.name}</h2><span>${style.label}</span></div>`;
    $('reelGrid').append(section);
    return {weapon,section,ctx:section.querySelector('canvas').getContext('2d'),visible:index<6,shown:true,time:0};
  });
  function background(){
    const c=backdrop.getContext('2d'),g=c.createLinearGradient(0,0,0,360);g.addColorStop(0,'#10192f');g.addColorStop(1,'#56717a');c.fillStyle=g;c.fillRect(0,0,600,360);
    if(scenery.complete&&scenery.naturalWidth)c.drawImage(scenery,0,0,600,335);
    c.fillStyle='#314e57';c.beginPath();c.moveTo(0,360);for(let x=0;x<=600;x+=6)c.lineTo(x,232+Math.sin(x*.018)*13);c.lineTo(600,360);c.fill();backdropReady=true;
  }
  scenery.onload=()=>{background();render();};
  function setup(card){
    const w=card.weapon,b=card.battle=new C.Battle(POCKET_WEAPONS,{mode:'practice',terrain:'flat',seed:731,wind:false});
    if(!card.fx){
      card.fx=new WeaponEffects(POCKET_NATIVE_FX,{reducedMotion:reduced,particleLimit:matchMedia('(max-width:650px)').matches?120:220,onArtReady:()=>{if(card.visible&&card.battle)draw(card);}});
      for(const img of Object.values(card.fx.images))img.addEventListener('load',()=>{if(card.visible&&card.battle)draw(card);},{once:true});
      card.land=document.createElement('canvas');card.land.width=C.W/2;card.land.height=C.H/2;
      card.landCtx=card.land.getContext('2d');card.landPixels=card.landCtx.createImageData(card.land.width,card.land.height);
    }else card.fx.reset();
    b.tanks[1].x=780;b.tanks[1].y=b.terrain.ground(780);b.select(w.id);b.tank.angle=w.behavior==='laser'?0:60;b.tank.power=60;
    card.ground=b.terrain.ground(780);card.cameraX=w.behavior==='jump'?b.tank.x:780;card.time=0;
    if(w.behavior==='laser'||w.behavior==='jump')b.fire();
    else{
      b.fire();const shots=b.projectiles.map(p=>({...p}));b.projectiles=[];b.events=[];
      if(w.behavior==='burst')b.spawn({...shots[0],x:780,y:card.ground-95,vx:130,vy:1});
      else shots.forEach((p,i)=>b.impact({...p,x:780+(i-(shots.length-1)/2)*55,y:card.ground-4,vx:210,vy:170}));
    }
    events(card);card.fx.update(0,b.projectiles,b.terrain);
  }
  function events(card){for(const e of card.battle.events.splice(0))card.fx.event(e);}
  function advance(card,target){
    if(!card.battle||target<card.time)setup(card);
    while(card.time+C.STEP/2<target){card.battle.update(C.STEP);events(card);card.fx.update(C.STEP,card.battle.projectiles,card.battle.terrain);card.time+=C.STEP;}
  }
  function terrain(card){
    const t=card.battle.terrain,p=card.landPixels.data;
    for(let y=0;y<t.rows;y++)for(let x=0;x<t.cols;x++){
      const i=y*t.cols+x,k=i*4;if(!t.cells[i]){p[k+3]=0;continue;}
      const edge=y>0&&!t.cells[i-t.cols],band=Math.sin(y*.13+x*.003)> .94,grain=(x*17+y*31)%9;
      p[k]=edge?135:band?124:75+grain;p[k+1]=edge?193:band?91:53+grain;p[k+2]=edge?82:band?62:44+grain;p[k+3]=255;
    }
    card.landCtx.putImageData(card.landPixels,0,0);t.dirty=false;
  }
  function tank(c,t){
    c.save();c.translate(t.x,t.y);c.fillStyle=t.side?'#c47a58':'#a7cf76';c.beginPath();c.roundRect(-18,-18,36,12,4);c.fill();
    c.fillStyle='#24373a';c.beginPath();c.roundRect(-22,-6,44,9,4);c.fill();c.strokeStyle=t.side?'#e5a67c':'#d9f2a7';c.lineWidth=4;c.beginPath();c.moveTo(0,-17);c.lineTo(t.side?-25:25,-30);c.stroke();
    for(const x of [-13,0,13]){c.fillStyle='#94b3a0';c.beginPath();c.arc(x,-2,2,0,Math.PI*2);c.fill();}c.restore();
  }
  function draw(card){
    if(!backdropReady)background();if(!card.battle)setup(card);const c=card.ctx,b=card.battle;
    if(b.terrain.dirty)terrain(card);c.clearRect(0,0,600,360);c.drawImage(backdrop,0,0);
    c.save();const zoom=.75;c.translate(300-card.cameraX*zoom,250-card.ground*zoom);c.scale(zoom,zoom);
    c.imageSmoothingEnabled=true;c.drawImage(card.land,0,0,C.W,C.H);card.fx.drawScorches(c);b.tanks.forEach(t=>tank(c,t));
    for(const p of b.projectiles)card.fx.drawProjectile(c,p);if(card.weapon.id==='jump_jets'&&b.tanks[0].y<b.terrain.ground(b.tanks[0].x)-2)card.fx.drawJets(c,b.tanks[0]);card.fx.draw(c);c.restore();
    c.fillStyle='#cfe5d7';c.font='bold 10px Lato,Arial';c.fillText(paused?`${time.toFixed(2)}s AFTER CONTACT`:'LIVE IMPACT REACTION',17,23);
  }
  function render(){for(const card of cards)if(card.shown&&card.visible){advance(card,time);draw(card);}}
  function filter(){
    const q=$('impactSearch').value.trim().toLowerCase(),family=$('impactFamily').value;let count=0;
    for(const card of cards){card.shown=(family==='all'||card.weapon.category===family)&&`${card.weapon.name} ${WeaponImpactArt.catalog[card.weapon.id].label}`.toLowerCase().includes(q);card.section.hidden=!card.shown;if(card.shown)count++;}
    $('impactCount').textContent=`${count} / 36 WEAPONS`;$('impactEmpty').hidden=count!==0;render();
  }
  if(typeof IntersectionObserver!=='undefined'){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){const card=cards.find(c=>c.section===entry.target);card.visible=entry.isIntersecting;if(card.visible&&card.shown){advance(card,time);draw(card);}}},{rootMargin:'100px'});
    cards.forEach(card=>observer.observe(card.section));
  }else cards.forEach(card=>{card.visible=true;});
  function hold(){paused=true;time=Number($('impactMoment').value);render();$('reelStatus').textContent='IMPACT HELD · CHOOSE A MOMENT TO COMPARE';}
  $('holdImpact').onclick=hold;$('impactMoment').onchange=hold;
  $('playReel').onclick=()=>{paused=false;time=.01;render();$('reelStatus').textContent='LIVE WEAPON REACTIONS';};
  $('impactSearch').oninput=filter;$('impactFamily').onchange=filter;
  function frame(now){const dt=Math.min((now-previous)/1000,.04);previous=now;if(!paused&&!document.hidden){time+=dt;if(time>3.8)time=.01;render();}requestAnimationFrame(frame);}
  background();filter();if(reduced)hold();requestAnimationFrame(frame);
})();
