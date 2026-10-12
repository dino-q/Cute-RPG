import {weaponPoseFor} from './weapon-rig.js';
import {drawArt} from './generated-art.js';
const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
export function recordRoleEffect(game,kind,x,y,angle=0,data={}){
 if(!game)return;const now=performance.now(),life=kind==='qi'?400:kind==='draw'?280:kind==='quake'?650:360;
 const follow=data.follow??['qi','draw','shieldwave','ironwill','chainkill','sonic','shadow'].includes(kind),owner=data.owner||'p1',p=owner==='p2'?game.p2:game.p;
 const active=(game._roleEffects||[]).filter(e=>now-e.at<e.life&&!(follow&&e.owner===owner&&e.kind===kind&&['qi','draw','shieldwave'].includes(kind)));
 if(active.some(e=>e.kind===kind&&e.owner===owner&&Math.hypot(e.x-x,e.y-y)<6&&now-e.at<80))return;
 game._roleEffects=active.slice(-15);game._roleEffects.push({kind,x,y,angle,life,at:now,follow,owner,ox:follow&&p?x-p.x:0,oy:follow&&p?y-p.y:0,...data});
}

export function roleEffectOrigin(game,e){
 const p=e.owner==='p2'?game?.p2:e.owner==='p1'?game?.p:null;
 if(!e.follow||!p)return {x:e.x,y:e.y};
 const hand=e.bindHand?weaponPoseFor(p):null;
 return hand?{x:hand.x+(p.x-hand.ownerX)+(e.ox||0),y:hand.y+(p.y-hand.ownerY)+(e.oy||0)}:{x:p.x+(e.ox||0),y:p.y+(e.oy||0)};
}

export function drawRoleEvents(c,game,now,ground=false){
 for(const e of game?._roleEffects||[]){
  const {x,y}=roleEffectOrigin(game,e);const q=clamp((now-e.at)/e.life);if(q<=0||q>=1)continue;const alpha=Math.sin(q*Math.PI);
  if(e.kind==='quake'||e.kind==='shieldwave'){if(ground){const big=e.kind==='quake';drawArt(c,'guardian',8,x,y+12,big?180+q*120:65+q*25,big?90+q*35:28+q*12,{stretch:true,alpha:1-q});}continue;}
  if(ground)continue;

  if(e.kind==='qi'){
   const age=now-e.at,bodyProgress=clamp(age/320),v=clamp((bodyProgress-.12)/.72),turn=TAU*v*v*(3-2*v),level=e.level||1;
   if(q<.16){drawArt(c,'sword-qi-v2',Math.min(1,Math.floor(q/.16*2)),x+Math.cos(e.angle)*16,y+Math.sin(e.angle)*16,40,55,{angle:e.angle,alpha:.55+q*2});}
   else if(q<.72){
    const phase=Math.min(5,2+Math.floor((q-.16)/.56*4)),dist=22+level*2;
    for(let i=0;i<3;i++){const a=e.angle+turn+TAU*i/3;drawArt(c,'sword-qi-v2',phase,x+Math.cos(a)*dist,y+Math.sin(a)*dist,45+level*5,65+level*6,{angle:a,alpha:.88});}
   }else{
    const release=(q-.72)/.28,dist=30+release*Math.max(30,(e.range||90)-30);
    for(let i=0;i<8;i++){const a=e.angle+TAU*i/8;drawArt(c,'sword-qi-v2',release<.6?6:7,x+Math.cos(a)*dist,y+Math.sin(a)*dist,25+level*4,38+level*4,{angle:a,alpha:1-release});}
   }
  }else if(e.kind==='draw'){
   drawArt(c,'sword-draw',Math.min(3,Math.floor(q*4)),x+Math.cos(e.angle)*24,y+Math.sin(e.angle)*24,(e.range||110)*1.25,(e.range||110)*1.25,{angle:e.angle,alpha:Math.max(.2,1-q)});
  }else{
   const map={critical:['star',3,38],poison:['poison',3,30],shadow:['arcane',5,45],chainkill:['vital',7,44],sonic:['wind',4,42],thorns:['guardian',10,45],ironwill:['guardian',6,44]};
   const f=map[e.kind];if(f)drawArt(c,f[0],f[1],x,y,f[2]*(.85+q*.2),f[2]*(.85+q*.2),{angle:e.angle,alpha});
  }
 }
}
export function drawRolePlayerLayer(c,p,x,y,r,now,front){
 if(!p)return;const cards=p._roleCards||{},s=r/18;
 if(!front){
  if(p._guardAura)drawArt(c,'guardian',5,x,y+13*s,110+20*p._guardAura,44+8*p._guardAura,{stretch:true,alpha:.65});
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
