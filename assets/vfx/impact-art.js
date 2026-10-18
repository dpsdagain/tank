/* Impact presentation interpreted from the supplied APK scripts. No damage/physics here. */
(function (root) {
  'use strict';
  const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const definitions={
    single_shot:['palette',.62,'Magenta expanding palette burst'], big_shot:['palette',.8,'Heavy red pressure blast'],
    '3_shot':['palette',.5,'Three separate yellow bursts'], '5_shot':['palette',.48,'Five compact orange bursts'],
    sniper_rifle:['shrapnel',.38,'Pinpoint white shrapnel flash'], cannon_ball:['shrapnel',.68,'Radial steel shrapnel after bouncing'],
    chain_reaction:['palette',.42,'Short red-orange chain pulses'], skipper:['skip',.52,'Yellow skim sparks and final burst'],
    roller:['roller',.7,'Purple rolling detonation'], heavy_roller:['roller',.82,'Heavy magenta rolling detonation'],
    napalm:['napalm',.65,'Low burning liquid and persistent flames'], hail_storm:['frost',.42,'Cold pellet flashes and scattered chips'],
    dirtball:['soil',.8,'Round soil plume and falling clods'], big_dirtball:['soil',1,'Dense broad earth plume'],
    dirt_slinger:['soil',.85,'Wide fan of thrown soil'], mud_pie:['soil',.78,'Low muddy splash and heavy drops'],
    jackhammer:['hammer',.4,'Repeated compact magenta pounding'], digger:['drill',.48,'Blue-white digging face and soil chips'],
    ground_hog:['tunnel',.45,'Magenta underground pressure pulses'], pile_driver:['pile',.45,'Pale magenta descending compression'],
    heatseeker:['missile',.72,'Red missile burst with casing sparks'], homing_worm:['tunnel',.4,'Purple tunneling pulses'],
    beehive:['sting',.32,'Hive release followed by tiny orange stings'], pin_cushion:['needles',.4,'Orange needle pops and zap sparks'],
    laser:['laser',.36,'Narrow cyan endpoint sparks'], super_laser:['laser',.58,'Wide cyan endpoint flare'],
    lightning_strike:['electric',.58,'Branching cyan-violet electrical discharge'], space_laser:['orbital',.8,'Vertical beam burn and rising vapor'],
    nuke:['nuclear',2.8,'Original staged nuclear blast and mushroom'], mega_nuke:['nuclear',2.8,'Original large staged nuclear blast'],
    comet:['comet',.72,'Blue-white fragment flare with yellow core'], meteor_shower:['meteor',.7,'Hot rock impact and radial shrapnel'],
    fireball:['fire',.95,'Animated billowing fire and embers'], volcano:['eruption',.8,'Upward lava vent and molten rock impacts'],
    jump_jets:['jets',.45,'Blue jet exhaust and launch dust'], magic_wall:['wall',.85,'Rising wall with green construction sparks']
  };
  const catalog=Object.freeze(Object.fromEntries(Object.entries(definitions).map(([id,d])=>[id,Object.freeze({shape:d[0],life:d[1],label:d[2]})])));
  function disk(c,x,y,r,color){if(r<=0)return;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
  function stroke(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  const rgbHex=value=>value&&'#'+value.trim().split(/\s+/).slice(0,3).map(v=>clamp(Number(v)||0,0,255).toString(16).padStart(2,'0')).join('');
  class WeaponImpactArt {
    constructor(fx){this.fx=fx;this.native=root.POCKET_IMPACTS||{};}
    style(id){return catalog[id]||catalog.single_shot;}
    recipe(id,child=false){
      const source=this.native[id]?.explosions||[];
      const useful=source.filter(e=>e.radius>=3&&e.color>=16);
      return id==='pin_cushion'&&child?useful.at(-1):useful[0];
    }
    color(id){
      if(this.style(id).shape==='nuclear')return null;
      const shape=this.style(id).shape, special=this.native[id]?.specials?.find(s=>s.LOW_COLOR);
      if(shape==='drill')return rgbHex(special?.LOW_COLOR)||'#6464ff';
      if(['soil','wall'].includes(shape))return rgbHex(special?.HIGH_COLOR)||'#b78a52';
      if(shape==='frost')return '#b6f2ff';
      if(shape==='shrapnel')return id==='sniper_rifle'?'#f5fcff':'#bdceda';
      if(shape==='fire'||shape==='eruption')return '#ff8b29';
      if(shape==='orbital'||shape==='laser')return '#31eaff';
      const recipe=this.recipe(id);
      return recipe&&this.fx.data.palette[recipe.color];
    }
    sound(id){
      if(this.style(id).shape==='nuclear')return null;
      const native=this.native[id]||{}, candidates=[...(native.specials||[]),...(native.explosions||[])];
      return candidates.map(item=>item.SOUND_EFFECT||item.sound).find(sound=>{
        const stem=sound?.replaceAll('\\','/').split('/').pop().replace(/\.[^.]+$/,'').toLowerCase();
        return this.fx.data.sounds.includes(stem);
      });
    }
    event(e,event){
      const spec=this.style(e.id),shape=spec.shape,fx=this.fx;
      // Nuclear presentation stays on the existing renderer, including its timing.
      if(shape==='nuclear')return false;
      if(event.type==='explosion'||event.type==='dirt'){
        const radius=Math.max(3,event.radius||18),recipe=this.recipe(e.id,event.child);
        const effect={...e,kind:'weaponImpact',shape,radius,recipe,life:spec.life,child:!!event.child,airburst:!!event.airburst};
        fx.effects.push(effect);
        if(shape==='wall')fx.effects.push({...e,kind:'wallRise',life:.8});
        if(!['soil','wall','frost','sting','napalm'].includes(shape)&&!event.airburst){
          fx.scorches.push({x:e.x,y:e.y,radius:radius*.82,age:0,life:5,color:e.color});
          if(fx.scorches.length>25)fx.scorches.shift();
        }
        this.particles(effect);
        const shake=['sting','frost','napalm'].includes(shape)?.65:['drill','hammer','tunnel','pile'].includes(shape)?2.2:Math.min(7,radius*.08);
        fx.shake=Math.max(fx.shake,shake*(fx.reducedMotion?.35:1));
        if(shape==='fire'&&radius>65){fx.flash=Math.max(fx.flash,.06);fx.flashColor='#ffb156';}
        return true;
      }
      if(event.type==='beacon'){
        fx.effects.push({...e,kind:e.id==='beehive'?'hiveOpen':'impactMarker',shape,radius:28,life:e.id==='beehive'?.6:.9});return true;
      }
      if(event.type==='bounce'){
        fx.effects.push({...e,kind:'ricochet',shape,radius:e.id==='cannon_ball'?20:15,life:.32});
        fx.spray(e.x,e.y,e.id==='cannon_ball'?12:7,e.id==='cannon_ball'?'#ebf5ff':'#ffff89',130);return true;
      }
      return false;
    }
    particles(e){
      const fx=this.fx,shape=e.shape,r=e.radius;
      const earth=['soil','wall','drill','hammer','tunnel','pile'].includes(shape);
      const cool=['frost','laser','orbital','electric','comet'].includes(shape);
      const quiet=['napalm','sting','frost'].includes(shape);
      const count=Math.round(quiet?9:earth?24:shape==='shrapnel'?38:Math.min(66,14+r*.6));
      for(let i=0;i<count;i++){
        const a=earth?-Math.PI+(i+.5)/count*Math.PI:TAU*(i+.5)/count+e.seed*.1;
        const speed=(earth?75+r:110+r)*( .3+Math.random()*.8);
        const kind=shape==='frost'||shape==='comet'?'ice':earth?'soil':shape==='shrapnel'||shape==='meteor'?'steel':'spark';
        fx.addParticle({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-(earth?50:10),kind,
          color:kind==='soil'?(i%3?'#ab8054':'#e0c08a'):cool?(i%3?(shape==='comet'?'#80ddff':e.color):'#eaffff'):i%4?e.color:'#fff4c9',
          size:kind==='soil'?2+Math.random()*4:kind==='ice'?2+Math.random()*3:1+Math.random()*2,
          life:quiet?.25+Math.random()*.2:.35+Math.random()*.6,gravity:earth?370:cool?140:240,drag:1.3});
      }
      if(['missile','meteor','fire','shrapnel'].includes(shape))fx.spray(e.x,e.y-5,shape==='fire'?7:3,e.color,35,'smoke',r*.55);
    }
    bands(c,e,sx=1,sy=1,radius=e.radius){
      const p=clamp(e.age/.16,0,1),size=radius*Math.pow(p,.42),recipe=e.recipe;
      c.save();c.scale(sx,sy);
      const bands=clamp(recipe?.bands||9,4,16);
      for(let i=0;i<bands;i++){
        const color=recipe?this.fx.data.palette[clamp(recipe.color+recipe.direction*i,0,255)]:[e.color,'#d5e7ff','#f3fdff'][Math.min(2,Math.floor(i/bands*3))];
        disk(c,0,0,size*(1-i/bands),color);
      }
      if(e.age<.12)disk(c,0,0,size*.2,'#fff9db');
      c.restore();
    }
    rays(c,e,count,inner,outer,color,width=1,spread=TAU,offset=0){
      for(let i=0;i<count;i++){
        const a=offset+i/count*spread+Math.sin(i*2.4+e.seed)*.07;
        const length=outer*(.75+Math.sin(i*3.1+e.seed)*.2);
        stroke(c,[[Math.cos(a)*inner,Math.sin(a)*inner],[Math.cos(a)*length,Math.sin(a)*length]],color,width);
      }
    }
    ring(c,rx,ry,color,width=1,y=0){if(rx<=0||ry<=0)return;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(0,y,rx,ry,0,0,TAU);c.stroke();}
    draw(c,e){
      if(!['weaponImpact','hiveOpen','impactMarker','ricochet'].includes(e.kind))return false;
      const t=clamp(e.age/e.life,0,1),r=e.radius,p=clamp(e.age/.16,0,1),fade=clamp((1-t)*2.4,0,1);
      c.translate(e.x,e.y);c.globalAlpha*=fade;c.lineCap='round';c.lineJoin='round';
      if(e.kind==='hiveOpen'){
        for(let i=0;i<6;i++){
          const a=i/6*TAU,d=9+t*27,x=Math.cos(a)*d,y=Math.sin(a)*d;
          polygon(c,Array.from({length:6},(_,k)=>[x+Math.cos(k/6*TAU)*4,y+Math.sin(k/6*TAU)*4]),i%2?'#ffd260':'#c78c28');
        }
        this.ring(c,12+t*29,8+t*18,'#ffd76d',1);return true;
      }
      if(e.kind==='impactMarker'){
        const frost=e.id==='hail_storm';this.ring(c,10+t*30,4+t*10,frost?'#b5f6ff':e.color,1.8);
        if(frost)this.rays(c,e,6,2,14,'#eaffff',1.3);
        else {stroke(c,[[-12,0],[12,0]],e.color,1);stroke(c,[[0,-12],[0,12]],e.color,1);}
        return true;
      }
      if(e.kind==='ricochet'){
        this.ring(c,r*p,r*p*.23,e.id==='cannon_ball'?'#d8edff':'#ffff83',1.5);
        this.rays(c,e,e.id==='cannon_ball'?9:5,2,r*(.6+t),e.id==='cannon_ball'?'#ffffff':'#ffe14e',1.4,Math.PI,-Math.PI);return true;
      }
      const shape=e.shape;
      const glowColor=['laser','orbital','frost','comet'].includes(shape)?'#62eaff':shape==='electric'?'#9f7dff':e.color;
      if(!['soil','wall','napalm'].includes(shape))this.fx.glow(c,0,0,r*1.7,glowColor,.2*fade);
      switch(shape){
        case 'palette':
          this.bands(c,e);
          if(e.id==='big_shot'){this.ring(c,r*(1+t*.6),r*(.32+t*.15),e.color,2);this.rays(c,e,11,r*.7*p,r*1.3*p,'#ffbc87',1.4);}
          else if(e.id==='single_shot')this.rays(c,e,8,r*.8*p,r*1.22*p,'#ffacdc',1);
          else if(e.id==='3_shot')this.rays(c,e,3,r*.75*p,r*1.2*p,'#fffab3',1.6);
          else if(e.id==='5_shot')this.rays(c,e,5,r*.75*p,r*1.2*p,'#ffddaa',1.2);
          else this.ring(c,r*p*1.12,r*p*.7,'#ffc17d',1);
          break;
        case 'shrapnel': {
          const sniper=e.id==='sniper_rifle',extent=(sniper?r*1.1:r*1.4)*(.4+t);
          this.rays(c,e,sniper?6:18,2,extent,sniper?'#fffbe5':'#b9d4e7',sniper?1.2:2);
          disk(c,0,0,(sniper?4:10)*(1-t),'#f5ffff');
          if(!sniper){this.ring(c,r*p*.7,r*p*.7,'#647586',3);this.ring(c,r*(.6+t),r*(.15+t*.1),'#c4e4f2',1);}
          break;
        }
        case 'skip':this.bands(c,e,1.2,.65);this.rays(c,e,7,r*.5,r*(1+t), '#fffca2',1.2,Math.PI,-Math.PI);break;
        case 'roller':
          this.bands(c,e,1.1,.85);this.ring(c,r*(.8+t),r*(.18+t*.12),e.color,e.id==='heavy_roller'?4:2);
          if(e.id==='heavy_roller')this.ring(c,r*(.6+t),r*(.3+t*.15),'#ffb4e1',2,-6);
          break;
        case 'napalm':
          this.ring(c,r*(.5+p*.5),r*.18,'#ff9a20',2);
          for(let i=0;i<4;i++){
            const x=(i-1.5)*r*.32,h=r*(.5+Math.sin(i*3+e.age*15)*.2)*(1-t*.4);
            polygon(c,[[x-r*.14,0],[x-r*.1,-h*.4],[x+Math.sin(e.age*14+i)*3,-h],[x+r*.12,-h*.3],[x+r*.15,0]],i%2?'#ffd64a':'#ff7424');
          }break;
        case 'frost':
          this.ring(c,r*p*.65,r*p*.28,'#c9ffff',1.4);this.rays(c,e,6,2,r*(.45+t),'#cbfaff',1.5);
          for(let i=0;i<6;i++){const a=i/6*TAU,d=r*(.35+t*.5),x=Math.cos(a)*d,y=Math.sin(a)*d;polygon(c,[[x-2,y],[x,y-4],[x+2,y],[x,y+4]],i%2?'#ffffff':'#88dfff');}break;
        case 'soil':case 'wall': {
          const wide=e.id==='dirt_slinger'?1.5:e.id==='mud_pie'?1.35:1,flat=e.id==='mud_pie'?.45:1;
          for(let i=0;i<11;i++){
            const a=Math.PI+i/10*Math.PI,d=r*(.2+p*.6),x=Math.cos(a)*d*wide,y=Math.sin(a)*d*flat*(1-t*.5)+t*t*r*.4;
            c.save();c.translate(x,y);c.rotate(i*1.8+t*3);polygon(c,[[-4,-2],[1,-5],[5,0],[2,4],[-3,3]],i%3?e.color:'#d7b37e');c.restore();
          }
          this.ring(c,r*p*wide,r*p*.14,e.color,2);break;
        }
        case 'hammer':this.bands(c,e,.75,.85);this.ring(c,r*p,r*p*.2,'#ffa6d5',2);stroke(c,[[-r*.4,-r*.4],[-r*.4,-r*(.7+t*.3)]],'#f7d99b',2);break;
        case 'drill':
          this.bands(c,e,.42,1.25);this.ring(c,r*.65*p,r*.16*p,'#c9d5ff',2,-r*.5);
          for(let i=0;i<4;i++){const yy=(i/4-.2)*r;stroke(c,[[-r*.28,yy],[r*.28,yy+r*.12]],i%2?'#ffffff':'#9eaaff',1.5);}break;
        case 'pile':
          this.bands(c,e,.6,1.1);for(let i=0;i<3;i++)this.ring(c,r*(.6-i*.1)*p,r*.12,e.color,2,i*r*.25);break;
        case 'tunnel':
          this.bands(c,e,1.2,.65);for(let i=0;i<3;i++)this.ring(c,r*(.5+t*.25),r*(.22+t*.1),e.color,1,(i-1)*r*.18);break;
        case 'missile':
          this.bands(c,e);this.rays(c,e,9,r*.55*p,r*(1+t*.65),'#ffb052',2);
          if(t<.4)disk(c,0,0,r*.22*(1-t),'#fff3b8');break;
        case 'sting':
          this.rays(c,e,6,1,r*(.3+t*.35),'#ffc34b',1.5);disk(c,0,0,Math.max(1,r*.24)*(1-t),'#ffe9ad');break;
        case 'needles':
          this.bands(c,e,.6,.6,r*(e.airburst?.7:.5));this.rays(c,e,e.airburst?12:6,r*.15,r*(.5+t*.6),'#ffab45',1.3);break;
        case 'laser': {
          const heavy=e.id==='super_laser',direction=Math.atan2(e.vy||-1,e.vx||1);
          c.rotate(direction);this.rays(c,e,heavy?18:10,2,r*(.45+t*.8),'#8dfbff',heavy?2:1.2);
          this.ring(c,r*p*(heavy?1:.6),r*p*.2,'#32ecff',heavy?3:1.5);disk(c,0,0,(heavy?8:4)*(1-t),'#ffffff');break;
        }
        case 'electric':
          for(let i=0;i<7;i++){const a=i/7*TAU,len=r*(.7+t*.3),dx=Math.cos(a),dy=Math.sin(a);stroke(c,[[0,0],[dx*len*.3-dy*6,dy*len*.3+dx*6],[dx*len*.6+dy*5,dy*len*.6-dx*5],[dx*len,dy*len]],i%2?'#b59aff':'#a6ffff',i%2?2:1);}
          disk(c,0,0,6*(1-t),'#eaffff');break;
        case 'orbital':
          for(let i=0;i<5;i++){const yy=-i*r*.25;this.ring(c,r*(.45+t*.2)*(1-i*.12),r*.1,'#b5fbff',1.5,yy);}
          stroke(c,[[0,0],[0,-r*(1.2+t)]],'#efffff',Math.max(1,8*(1-t)));this.ring(c,r*p,r*p*.16,'#44eaff',2);break;
        case 'comet':
          this.bands(c,e,.45,.45);this.rays(c,e,6,r*.3,r*(.8+t*.5),'#c7ffff',2);
          for(let i=0;i<6;i++){const a=i/6*TAU,d=r*(.35+t*.6),x=Math.cos(a)*d,y=Math.sin(a)*d;polygon(c,[[x-4,y],[x,y-7],[x+4,y],[x,y+4]],i%2?'#d9ffff':'#73d9ff');}break;
        case 'meteor':
          this.bands(c,e,.7,.65);this.rays(c,e,11,r*.3,r*(.8+t*.7),'#ffb455',2);
          for(let i=0;i<5;i++){const a=i/5*TAU,d=r*(.3+t*.5),x=Math.cos(a)*d,y=Math.sin(a)*d;polygon(c,[[x-4,y-3],[x+2,y-5],[x+5,y+2],[x-2,y+4]],'#553c38');}break;
        case 'fire':
          if(!this.fx.flowArt||!this.fx.drawFlowBlast(c,{...e,x:0,y:0})){
            if(!this.fx.sprite(c,'fireball',t*29,0,-r*.12,r*2.6,r*2.6,0,fade)){
              for(let i=0;i<7;i++){const a=i/7*TAU;disk(c,Math.cos(a)*r*.32,Math.sin(a)*r*.32,r*(.45-t*.2),i%2?'#ffb62c':'#f75e22');}disk(c,0,0,r*.3,'#fff1b2');
            }
          }break;
        case 'eruption':
          this.bands(c,e,1,.4);this.rays(c,e,e.child?8:14,r*.2,r*(e.child?.7:1.5)*(1-t*.4),'#ffb84a',2,Math.PI,-Math.PI);
          if(!e.child)polygon(c,[[-r*.25,0],[-r*.12,-r*.6],[0,-r*(1.2-t*.5)],[r*.17,-r*.45],[r*.27,0]],'#ff791c');break;
        case 'jets':this.ring(c,r*p,r*p*.25,'#bcf7ff',2);break;
      }
      return true;
    }
    drawParticle(c,p,progress){
      if(!['ice','soil','steel'].includes(p.kind))return false;
      c.save();c.translate(p.x,p.y);c.rotate(p.rotation);const s=p.size*(1-progress*.3);
      if(p.kind==='ice')polygon(c,[[0,-s*1.5],[s*.6,0],[0,s],[-s*.5,0]],p.color);
      else if(p.kind==='soil')polygon(c,[[-s*.7,-s*.3],[0,-s*.65],[s*.6,0],[s*.2,s*.45],[-s*.5,s*.4]],p.color);
      else {stroke(c,[[-s*2,0],[s,0]],p.color,Math.max(.6,s*.45));polygon(c,[[0,-s*.5],[s,0],[0,s*.4]],'#d6dfe5');}
      c.restore();return true;
    }
  }
  WeaponImpactArt.catalog=catalog;root.WeaponImpactArt=WeaponImpactArt;
  if(typeof module!=='undefined'&&module.exports)module.exports=WeaponImpactArt;
})(typeof globalThis!=='undefined'?globalThis:this);
