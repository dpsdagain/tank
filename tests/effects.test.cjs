const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../game-core.js');
require('../weapons.js');require('../native-effects.js');
const WeaponEffects=require('../weapon-fx.js');
const data=POCKET_NATIVE_FX;

test('native draw recipes retain saturated source colors and timed nuclear layers',()=>{
  assert.equal(Object.keys(data.profiles).length,36);
  assert.equal(data.palette[235],'#ff007b');
  assert.equal(data.palette[28],'#ff3838');
  assert.deepEqual(data.profiles.mega_nuke.explosions.map(s=>s.delay),[0,.2,.4,.6]);
  assert.deepEqual(data.profiles.mega_nuke.explosions.map(s=>s.radius),[100,90,80,70]);
  assert.equal(data.profiles.single_shot.explosions[0].bands,12);
  assert.equal(Object.values(data.atlases).reduce((s,a)=>s+a.frames,0),126);
  for(const atlas of Object.values(data.atlases)) assert.ok(fs.existsSync(path.join(__dirname,'..',atlas.src)));
});

test('cascading blasts retain weapon identity and open craters progressively',()=>{
  const b=new C.Battle(POCKET_WEAPONS,{mode:'practice',seed:42,wind:false,terrain:'flat'});
  b.select('chain_reaction');b.fire();b.projectiles=[];
  const x=800,y=b.terrain.ground(x),before=b.terrain.cells.reduce((s,v)=>s+v,0);
  b.explode(x,y,50,0,0);
  assert.equal(b.terrain.cells.reduce((s,v)=>s+v,0),before);
  for(let i=0;i<8;i++)b.update();
  const first=b.terrain.cells.reduce((s,v)=>s+v,0);
  for(let i=0;i<22;i++)b.update();
  const last=b.terrain.cells.reduce((s,v)=>s+v,0);
  assert.ok(first<before&&last<first);
  assert.equal(b.events.find(e=>e.type==='explosion').weaponId,'chain_reaction');
});

test('every effect family renders finite geometry and particles remain bounded',()=>{
  let calls=0;
  const target={globalAlpha:1,save(){},restore(){},createLinearGradient(){return {addColorStop(){}}}};
  const ctx=new Proxy(target,{get(o,key){if(key in o)return o[key];return (...args)=>{calls++;for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${String(key)} received non-finite geometry`);};}});
  const fx=new WeaponEffects(data,{particleLimit:300});
  for(const weapon of POCKET_WEAPONS){
    fx.reset();fx.event({type:'fire',weaponId:weapon.id,x:250,y:240});fx.event({type:'explosion',weaponId:weapon.id,x:350,y:260,radius:75});
    fx.event({type:'beam',weaponId:weapon.id,x:30,y:5,ex:350,ey:260});fx.event({type:'lightning',weaponId:weapon.id,x:350,y:0,ex:350,ey:260});
    for(let i=0;i<100;i++){fx.update(1/60);fx.drawScorches(ctx);fx.draw(ctx);}
    assert.ok(fx.particles.length<=300);
    assert.ok(fx.effects.every(e=>Number.isFinite(e.age)));
  }
  assert.ok(calls>1000);
});

test('Flow fire uses clean cells with screen compositing and restores canvas state',()=>{
  const fx=new WeaponEffects(data), calls=[], stack=[];
  assert.ok(fs.existsSync(path.join(__dirname,'..',fx.atlases.flowFire.src)));
  assert.ok(fs.existsSync(path.join(__dirname,'../assets/art/flow-scenery.jpg')));
  fx.images.flowFire={complete:true,naturalWidth:1024};
  const ctx={globalAlpha:.8,globalCompositeOperation:'source-over',imageSmoothingEnabled:false,
    save(){stack.push([this.globalAlpha,this.globalCompositeOperation,this.imageSmoothingEnabled]);},
    restore(){[this.globalAlpha,this.globalCompositeOperation,this.imageSmoothingEnabled]=stack.pop();},
    translate(){},rotate(){},drawImage(image,...rect){calls.push({image,rect,blend:this.globalCompositeOperation,alpha:this.globalAlpha});}};
  fx.event({type:'explosion',weaponId:'big_shot',x:500,y:350,radius:72});
  const blast=fx.effects.find(e=>e.kind==='blast');
  assert.equal(blast.flowImpact,true);
  for(let i=0;i<=60;i++){blast.age=i/60;assert.equal(fx.drawFlowBlast(ctx,blast),true);}
  assert.ok(calls.length>20);
  const sampled=new Set();
  for(const call of calls){
    assert.equal(call.blend,'screen');
    assert.ok(call.alpha>=0&&call.alpha<=.8);
    const [x,y,w,h]=call.rect,frame=y/256*4+x/256;
    assert.ok(frame>=0&&frame<7,'clipped, smoke and marked cells must not render');
    assert.equal(w,256);assert.equal(h,256);sampled.add(frame);
    assert.ok(call.rect.every(Number.isFinite));
  }
  assert.equal(sampled.size,7);
  assert.equal(ctx.globalCompositeOperation,'source-over');assert.equal(ctx.globalAlpha,.8);
  fx.images.flowFire.naturalWidth=0;blast.age=.2;
  assert.equal(fx.drawFlowBlast(ctx,blast),false,'missing art must use the native fallback');
  assert.equal(new WeaponEffects(data,{flowArt:false}).atlases.flowFire,undefined);
  for(const id of ['super_laser','lightning_strike','dirtball','digger']){
    fx.reset();fx.event({type:'explosion',weaponId:id,x:300,y:300,radius:40});
    assert.equal(fx.effects.find(e=>e.kind==='blast').flowImpact,false,`${id} retains its own visual family`);
  }
});
