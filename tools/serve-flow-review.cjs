const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),concept=path.join(root,'flow-concepts','2026-10-17');
const rootFiles=new Set(['weapons.js','native-effects.js','game-core.js','weapon-fx.js']);
const artFiles=new Set(['review.html','battle-concept.jpg','scenery-layer.jpg','explosion-sheet.jpg','assessment.md']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.ttf':'font/ttf','.md':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'review.html';}catch{res.writeHead(400).end();return;}
  let file;if(artFiles.has(name))file=path.join(concept,name);else if(rootFiles.has(name))file=path.join(root,name);else if(/^assets\/vfx\/(fireball|meteor|comet|missile|flame|smoke)\.png$/.test(name)||name==='assets/Lato-Bold.ttf')file=path.join(root,name);
  if(!file){res.writeHead(404).end();return;}fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);});
}).listen(5175,'127.0.0.1',()=>console.log('Flow art review: http://127.0.0.1:5175'));
