import {drawArt} from './generated-art.js';
const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
export function recordRoleEffect(game,kind,x,y,angle=0,data={}){
 if(!game)return;const now=performance.now(),life=kind==='qi'?520:kind==='draw'?280:kind==='quake'?650:360;
 const active=(game._roleEffects||[]).filter(e=>now-e.at<e.life);
 if(active.some(e=>e.kind===kind&&Math.hypot(e.x-x,e.y-y)<6&&now-e.at<80))return;
 game._roleEffects=active.slice(-15);game._roleEffects.push({kind,x,y,angle,life,at:now,...data});
}
export function drawRoleEvents(c,game,now,ground=false){
 for(const e of game?._roleEffects||[]){
  const q=clamp((now-e.at)/e.life);if(q<=0||q>=1)continue;const alpha=Math.sin(q*Math.PI);
  if(e.kind==='quake'||e.kind==='shieldwave'){if(ground){const big=e.kind==='quake';drawArt(c,'guardian',8,e.x,e.y+12,big?180+q*120:65+q*25,big?90+q*35:28+q*12,{stretch:true,alpha:1-q});}continue;}
  if(ground)continue;
  if(e.kind==='qi'){const dist=30+q*Math.max(30,(e.range||125)-30);
   for(let i=0;i<8;i++){const a=e.angle+TAU*i/8;drawArt(c,'sword-qi',Math.min(3,Math.floor(q*4)),e.x+Math.cos(a)*dist,e.y+Math.sin(a)*dist,26+(e.level||1)*5,42+(e.level||1)*5,{angle:a+Math.PI,alpha});}
  }else if(e.kind==='draw'){
   drawArt(c,'sword-draw',Math.min(3,Math.floor(q*4)),e.x+Math.cos(e.angle)*24,e.y+Math.sin(e.angle)*24,(e.range||110)*1.25,(e.range||110)*1.25,{angle:e.angle,alpha:Math.max(.2,1-q)});
  }else{
   const map={critical:['star',3,38],poison:['poison',3,30],shadow:['arcane',5,45],chainkill:['vital',7,44],sonic:['wind',4,42],thorns:['guardian',10,45],ironwill:['guardian',6,44]};
   const f=map[e.kind];if(f)drawArt(c,f[0],f[1],e.x,e.y,f[2]*(.85+q*.2),f[2]*(.85+q*.2),{angle:e.angle,alpha});
  }
 }
}
export function drawRolePlayerLayer(c,p,x,y,r,now,front){
 if(!p)return;const cards=p._roleCards||{},s=r/18;
 if(!front){
  if(p._guardAura)drawArt(c,'guardian',5,x,y+13*s,110+20*p._guardAura,44+8*p._guardAura,{stretch:true,alpha:.65});
  if(p._shadowStepEnd>now)drawArt(c,'arcane',5,x,y+8*s,43*s,29*s,{alpha:.5});
  if(p._chainKill&&p._killSpeedEnd>now)drawArt(c,'vital',7,x,y+14*s,42*s,21*s,{alpha:.7});
 }else{
  if(p._iwActive)drawArt(c,'guardian',6,x,y+18*s,36*s,20*s,{alpha:.9});
  if(cards['劍氣強化']&&p._swordQiCount!==undefined){const every=p._qiEvery||4,count=p._swordQiCount%every;
   for(let i=0;i<every;i++)drawArt(c,'star',0,x+(i-(every-1)/2)*7*s,y+21*s,5*s,5*s,{alpha:i<count?.95:.2});}
  if(cards['追蹤彈'])drawArt(c,'star',0,x+r*.7,y+12*s,8*s,8*s,{alpha:.65});
 }
}
export function drawRoleGun(c,p,muzzle,dir,scale,now){
 const cards=p?._roleCards||{},age=now-(p?._pixelShotAt||0);if(age<0||age>95)return;
 const a=Math.atan2(dir.y,dir.x),x=muzzle.x+Math.cos(a)*5,y=muzzle.y+Math.sin(a)*5,alpha=1-age/100;
 if(cards['分裂彈'])drawArt(c,'wind',6,x,y,32+cards['分裂彈']*4,25,{angle:a,anchorX:0,alpha});
 if(cards['彈幕之王'])drawArt(c,'star',7,x,y,45,28,{angle:a,anchorX:0,alpha});
 if(p._minigun)drawArt(c,'fire',7,x,y,23,17,{angle:a,anchorX:0,alpha:.7*alpha});
}
export function drawRoleBullet(c,b,p,now,r){
 if(!p?._roleCards||p.fx?.lightning)return false;
 const a=Math.atan2(b.vy||0,b.vx||1),cards=p._roleCards;
 if(b.hm>0&&cards['追蹤彈']){
  const trail=b.trail||[];for(let i=Math.max(0,trail.length-3);i<trail.length;i++)drawArt(c,'star',7,trail[i].x,trail[i].y,7,7,{alpha:(trail[i].life||0)*.4});
  drawArt(c,'star',0,b.x,b.y,11,11,{angle:a});return true;
 }
 if(!Object.values(p.fx||{}).some(Boolean)&&(b._minigun||cards['彈幕之王']||cards['分裂彈'])){
  drawArt(c,'sword-beam',2,b.x,b.y,b._minigun?19:13,b.crit?6:4,{stretch:true,angle:a});return true;
 }
 return false;
}
