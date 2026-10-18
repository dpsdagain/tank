const assert = require('node:assert/strict');
const crypto = require('node:crypto');
function canvasRecorder() {
  const state = {globalAlpha:.8,globalCompositeOperation:'source-over',imageSmoothingEnabled:false,lineWidth:1,fillStyle:'#fff',strokeStyle:'#fff',lineCap:'butt',lineJoin:'miter'};
  const calls=[], stack=[];
  const ctx=new Proxy(state,{get(o,key){
    if(key in o)return o[key];
    if(key==='save')return ()=>stack.push({...state});
    if(key==='restore')return ()=>{assert.ok(stack.length);Object.assign(state,stack.pop());};
    return (...args)=>{
      const values=args.map(a=>{if(typeof a==='number'){assert.ok(Number.isFinite(a),`${key} geometry`);return Math.round(a*1e5)/1e5;}return a?.tag||a;});
      calls.push([key,values,{...state}]);
    };
  }});
  return {ctx,calls,stack,state};
}
function nuclearFrames(Effects,data) {
  const original=Math.random,frames=[];Math.random=()=>.5;
  try {
    for(const id of ['nuke','mega_nuke'])for(const age of [.08,.2,.4,.6,1.1,2]){
      const fx=new Effects(data);fx.images.flowFire={complete:true,naturalWidth:1024,tag:'flowFire'};
      fx.images.fireball={complete:true,naturalWidth:400,tag:'fireball'};
      fx.event({type:'explosion',weaponId:id,x:315,y:245,radius:id==='nuke'?96:137});
      const r=canvasRecorder();
      for(const e of fx.effects)if(age<e.life){e.age=age;fx.drawEffect(r.ctx,e);}
      assert.equal(r.stack.length,0);
      frames.push({id,age,calls:r.calls.length,sha256:crypto.createHash('sha256').update(JSON.stringify(r.calls)).digest('hex')});
    }
  } finally {Math.random=original;}
  return frames;
}
module.exports={canvasRecorder,nuclearFrames};
