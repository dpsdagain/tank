const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../game-core.js');
require('../weapons.js');require('../native-effects.js');
require('../assets/vfx/native-impact-recipes.js');require('../assets/vfx/impact-art.js');
const painted=require('../assets/projectiles/painted/manifest.js');
const ProjectileArt=require('../projectile-art.js');
const WeaponEffects=require('../weapon-fx.js');

function recorder(capture=false){
  const state={globalAlpha:.8,globalCompositeOperation:'source-over',lineWidth:1,fillStyle:'#fff',strokeStyle:'#fff',lineCap:'butt',lineJoin:'miter',imageSmoothingEnabled:false,imageSmoothingQuality:'low'};
  const stack=[],calls=[];let count=0;
  const ctx=new Proxy(state,{get(o,key){
    if(key in o)return o[key];
    if(key==='save')return ()=>stack.push({...state});
    if(key==='restore')return ()=>{assert.ok(stack.length,'balanced canvas restore');Object.assign(state,stack.pop());};
    return (...args)=>{
      count++;
      for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${String(key)} has finite geometry`);
      if(key==='arc')assert.ok(args[2]>=0);if(key==='ellipse')assert.ok(args[2]>=0&&args[3]>=0);
      if(capture)calls.push([key,...args.map(x=>typeof x==='number'?Math.round(x*1000)/1000:x),state.lineWidth]);
    };
  }});
  return {ctx,calls,stack,state,get count(){return count;}};
}
const shot=(weapon,extra={})=>({weapon,x:300,y:170,vx:240,vy:-80,age:.85,
  trail:Array.from({length:24},(_,i)=>({x:180+i*5,y:220-i*2})),...extra});
function loaded(art=new ProjectileArt()){
  for(const [key,asset] of Object.entries(painted.assets))art.paintedImages[key]={complete:true,naturalWidth:asset.size[0],src:asset.src};
  return art;
}

test('all 36 weapons have flight identities and materially different silhouette commands',()=>{
  assert.deepEqual(Object.keys(ProjectileArt.catalog).sort(),POCKET_WEAPONS.map(w=>w.id).sort());
  const art=new ProjectileArt(), signatures=new Map();
  for(const weapon of POCKET_WEAPONS){
    const r=recorder(true),p=shot(weapon),before=JSON.stringify(p);
    art.draw(r.ctx,p);
    assert.equal(JSON.stringify(p),before,'drawing must not mutate a physics projectile');
    assert.equal(r.stack.length,0);assert.equal(r.state.globalAlpha,.8);assert.equal(r.state.globalCompositeOperation,'source-over');
    signatures.set(weapon.id,JSON.stringify(r.calls));
  }
  assert.ok(new Set(signatures.values()).size>=32,'weapons need different geometry, not just different colors');
  for(const [a,b] of [['single_shot','big_shot'],['cannon_ball','skipper'],['roller','heavy_roller'],['3_shot','5_shot'],['nuke','mega_nuke'],['comet','fireball']])assert.notEqual(signatures.get(a),signatures.get(b));
});

test('flight, child and reduced-motion rendering preserves state and supports every direction',()=>{
  const art=new ProjectileArt({reducedMotion:true}), fx=new WeaponEffects(POCKET_NATIVE_FX),r=recorder();
  assert.ok(fx.flight instanceof ProjectileArt,'the production effects class must use the flight renderer');
  for(const weapon of POCKET_WEAPONS)for(const [vx,vy] of [[0,0],[-250,-90],[0,350],[250,50]])for(const child of [false,true]){
    const p=shot(weapon,{vx,vy,child,rolling:weapon.behavior==='roller'&&child});
    const before=JSON.stringify(p);fx.drawProjectile(r.ctx,p);art.draw(r.ctx,p);
    assert.equal(JSON.stringify(p),before);assert.equal(r.stack.length,0);
  }
  const bee=POCKET_WEAPONS.find(w=>w.id==='beehive'),first=recorder(true),later=recorder(true);
  art.draw(first.ctx,shot(bee,{child:true,age:.1}));art.draw(later.ctx,shot(bee,{child:true,age:2}));
  assert.deepEqual(first.calls,later.calls,'reduced-motion wings hold a stable pose');
  const phone=recorder(true);phone.ctx.canvas={width:1200,clientWidth:350};
  fx.drawProjectile(phone.ctx,shot(bee));
  assert.ok(phone.calls.some(c=>c[0]==='scale'&&c[1]===2&&c[2]===2),'small game canvases enlarge the silhouette, not its physics');
  fx.drawJets(r.ctx,{x:200,y:180});
  assert.ok(r.count>1000);assert.equal(r.stack.length,0);
});

test('all real weapon flights and secondary stages resolve through the integrated renderer',()=>{
  const r=recorder(),children=new Set(),rolling=new Set();
  for(const weapon of POCKET_WEAPONS){
    const b=new C.Battle(POCKET_WEAPONS,{mode:'practice',terrain:'flat',wind:false,seed:123});
    const fx=new WeaponEffects(POCKET_NATIVE_FX,{particleLimit:180});
    loaded(fx.flight);
    b.select(weapon.id);b.tank.power=weapon.behavior==='roller'?35:65;b.fire();
    let i=0;
    for(;i<3500&&b.phase!=='aim';i++){
      b.update();for(const e of b.events.splice(0))fx.event(e);
      fx.update(C.STEP,b.projectiles,b.terrain);
      for(const p of b.projectiles){if(p.child)children.add(weapon.id);if(p.rolling)rolling.add(weapon.id);if(i%16===0)fx.drawProjectile(r.ctx,p);}
      if(i%16===0){fx.draw(r.ctx);if(weapon.id==='jump_jets')fx.drawJets(r.ctx,b.tanks[0]);}
      assert.ok(fx.particles.length<=180);
    }
    assert.equal(b.phase,'aim',`${weapon.name} returned control after its real flight`);
    assert.equal(r.stack.length,0);
  }
  for(const id of ['beehive','pin_cushion','hail_storm','meteor_shower','volcano'])assert.ok(children.has(id),`${id} child artwork was exercised`);
  for(const id of ['roller','heavy_roller'])assert.ok(rolling.has(id),`${id} rolling artwork was exercised`);
  assert.ok(r.count>10000);
});

test('painted PNG sources retain alpha, provenance hashes and valid per-frame source windows',()=>{
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
  const inspection=require('../assets/projectiles/painted/asset-inspection.json');
  assert.equal(Object.keys(painted.weapons).length,5);
  for(const record of inspection){
    const asset=painted.assets[record.key],png=fs.readFileSync(path.join(__dirname,'..',asset.src));
    assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6,'PNG has an RGBA color type');
    assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],asset.size);
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'),record.sha256,'generated source remains unmodified');
    assert.ok(record.transparentPixels>asset.size[0]*asset.size[1]*.1);
    assert.deepEqual(record.frames,asset.frames);
    for(const {rect:r,body:b} of asset.frames){
      assert.ok(r[0]>=0&&r[1]>=0&&r[2]>0&&r[3]>0&&r[0]+r[2]<=asset.size[0]&&r[1]+r[3]<=asset.size[1]);
      assert.ok(b[0]>=r[0]&&b[1]>=r[1]&&b[0]+b[2]<=r[0]+r[2]&&b[1]+b[3]<=r[1]+r[3]);
    }
  }
  assert.equal(painted.assets.diggerTip.frames.length,4);assert.equal(painted.assets.fireball.frames.length,4);
});

test('all five painted bodies follow velocity without changing physics or leaking canvas state',()=>{
  const art=loaded();
  for(const id of Object.keys(painted.weapons))for(const [vx,vy] of [[250,-90],[-250,-90],[0,350],[0,0]]){
    const p=shot(POCKET_WEAPONS.find(w=>w.id===id),{vx,vy}),before=JSON.stringify(p),r=recorder(true),state={...r.state};
    assert.ok(art.paintedAvailable(id));art.draw(r.ctx,p);
    assert.equal(JSON.stringify(p),before);assert.deepEqual(r.state,state);assert.equal(r.stack.length,0);
    const images=r.calls.filter(c=>c[0]==='drawImage');
    assert.equal(images.length,id==='digger'?2:1);
    assert.ok(r.calls.some(c=>c[0]==='rotate'&&Math.abs(c[1]-Math.atan2(vy,vx))<.001));
    for(const call of images){
      const asset=Object.values(painted.assets).find(a=>a.src===call[1].src);
      assert.ok(asset.frames.some(frame=>JSON.stringify(frame.rect)===JSON.stringify(call.slice(2,6))));
      assert.ok(call[8]>0&&call[9]>0,'painted destination has positive dimensions');
    }
  }
});

test('painted flame and drill cycles use all four frames, anchor their bodies and honor reduced motion',()=>{
  for(const id of ['digger','fireball']){
    const art=loaded(),spec=painted.weapons[id],weapon=POCKET_WEAPONS.find(w=>w.id===id),seen=new Set();
    for(let i=0;i<4;i++){
      const r=recorder(true);art.draw(r.ctx,shot(weapon,{age:(i+.1)/spec.fps}));
      const call=r.calls.filter(c=>c[0]==='drawImage').at(-1);
      seen.add(JSON.stringify(call.slice(2,6)));
      const asset=painted.assets[spec.tipAsset||spec.asset],frame=asset.frames[i],ratio=(spec.tipWidth||spec.width)/frame.body[2];
      const anchor=id==='digger'?0:.74,target=id==='digger'?-1:0;
      assert.ok(Math.abs(call[6]+(frame.body[0]+frame.body[2]*anchor-frame.rect[0])*ratio-target)<.002,'body anchor remains stable across poses');
    }
    assert.equal(seen.size,4);
    const reduced=loaded(new ProjectileArt({reducedMotion:true})),a=recorder(true),b=recorder(true);
    reduced.draw(a.ctx,shot(weapon,{age:.01}));reduced.draw(b.ctx,shot(weapon,{age:2.5}));assert.deepEqual(a.calls,b.calls);
  }
});

test('loading failures, disabled painted art and released bees retain the original silhouette',()=>{
  const weapon=id=>POCKET_WEAPONS.find(w=>w.id===id);
  for(const id of Object.keys(painted.weapons)){
    for(const art of [new ProjectileArt(),loaded(new ProjectileArt({paintedArt:false}))]){
      const r=recorder(true);art.draw(r.ctx,shot(weapon(id)));assert.equal(r.calls.filter(c=>c[0]==='drawImage').length,0);assert.ok(r.calls.length>5);assert.equal(r.stack.length,0);
    }
  }
  const partial=loaded();partial.paintedImages.diggerTip={complete:true,naturalWidth:0};
  const drill=recorder(true);partial.draw(drill.ctx,shot(weapon('digger')));assert.ok(!drill.calls.some(c=>c[0]==='drawImage'),'a partially loaded drill falls back as a whole');
  const a=recorder(true),b=recorder(true),p=shot(weapon('beehive'),{child:true});
  loaded().draw(a.ctx,p);new ProjectileArt({paintedArt:false}).draw(b.ctx,p);assert.deepEqual(a.calls,b.calls,'split bees keep their striped bodies and wing animation');
});
