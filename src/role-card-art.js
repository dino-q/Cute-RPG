import {weaponPoseFor} from './weapon-rig.js';
import {drawArt} from './generated-art.js';
const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
export function recordRoleEffect(game,kind,x,y,angle=0,data={}){
 if(!game)return;const now=performance.now(),life=kind==='qi'?400:kind==='draw'?280:kind==='quake'?700:kind==='shieldwave'?190:kind==='knockhit'?170:360;
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
  if(e.kind==='taunt'){
   if(ground){const radius=28+(e.range||145)*(1-Math.pow(1-q,3));
    for(let i=0;i<8;i++){const a=TAU*i/8;drawArt(c,'guardian',5,x+Math.cos(a)*radius,y+Math.sin(a)*radius,34,20,{angle:a,alpha:.6*(1-q)});}}
   else drawArt(c,'guardian',6,x,y+12,48,42,{alpha:alpha*.65});
   continue;
  }
  if(e.kind==='rush-cut'){
   if(!ground){const dx=e.endX-x,dy=e.endY-y,length=Math.hypot(dx,dy);
    for(const side of [-1,1])drawArt(c,'sword-beam',2,x-Math.sin(e.angle)*side*7,y+Math.cos(e.angle)*side*7,length,5,{angle:e.angle,anchorX:0,stretch:true,alpha:.6*(1-q)});}
   continue;
  }
  if(e.kind==='rush-start'||e.kind==='rush-finish'){
   if(!ground)for(const side of [-1,1])drawArt(c,'sword-draw',Math.min(3,Math.floor(q*4)),x,y,e.kind==='rush-finish'?110:65,e.kind==='rush-finish'?110:65,{angle:e.angle+side*.6,alpha:alpha*.85});
   continue;
  }
  if(e.kind==='ultimate'||e.kind==='ultimate-target'){

   const phase=Math.min(7,Math.floor(q*8)),fade=Math.sin(Math.PI*q),range=e.range||300;
   if(e.kind==='ultimate-target'){
    if(!ground)for(const sign of [-1,1])drawArt(c,'sword-draw',Math.min(3,Math.floor(q*4)),x,y,105,105,{angle:e.angle+sign*Math.PI/4,alpha:fade});
   }else if(e.role==='tank'){
    if(ground){drawArt(c,'quake-radial',0,x,y,range*2*(.35+.65*q),range*2*(.35+.65*q),{alpha:fade*.85});
     for(let i=0;i<8;i++){const a=TAU*i/8;drawArt(c,'guardian',6,x+Math.cos(a)*range*.7,y+Math.sin(a)*range*.7,65,75,{angle:a,alpha:fade*.75});}}
   }else if(e.role==='gunner'){
    if(!ground){const extension=clamp((q-.12)/.22),width=18+Math.sin(q*Math.PI)*42;
     for(const offset of [-16,0,16])drawArt(c,'sword-beam',Math.min(3,Math.floor(q*4)),x+Math.cos(e.angle)*24-Math.sin(e.angle)*offset,y+Math.sin(e.angle)*24+Math.cos(e.angle)*offset,range*extension,width*(offset===0?1:.35),{angle:e.angle,stretch:true,anchorX:0,alpha:fade*(offset===0?1:.65)});
     drawArt(c,'star',7,x+Math.cos(e.angle)*24,y+Math.sin(e.angle)*24,64,64,{angle:e.angle,alpha:fade});}
   }else if(e.role==='swordsman'){
    if(!ground)for(let i=0;i<8;i++){const a=e.angle+TAU*i/8+(q<.5?q*TAU:Math.PI),radius=q<.5?35+q*90:80+(q-.5)*2*(range-80);
     drawArt(c,'sword-qi-v2',phase,x+Math.cos(a)*radius,y+Math.sin(a)*radius,55,85,{angle:a,alpha:fade});}
   }else if(e.role==='assassin'){
    if(!ground)for(let i=0;i<6;i++){const a=e.angle+TAU*i/6,radius=45+Math.sin(q*Math.PI)*110;
     drawArt(c,'arcane',5,x+Math.cos(a)*radius,y+Math.sin(a)*radius,36,55,{alpha:fade*.5});
     for(const side of [-1,1])drawArt(c,'sword-draw',Math.min(3,Math.floor(q*4)),x+Math.cos(a)*radius,y+Math.sin(a)*radius,72,72,{angle:a+side*.5,alpha:fade});}
   }
   continue;
  }
  if(e.kind==='quake'||e.kind==='shieldwave'){

   if(ground){
    const limit=e.range||(e.kind==='quake'?210:90),expand=1-Math.pow(1-q,3);
    if(e.kind==='quake'){
     // Original stone-and-gold style, now authored radially with a transparent centre.
     const diameter=limit*2*(.45+.55*expand),fade=q<.18?q/.18:Math.pow(1-q,.65);
     drawArt(c,'quake-radial',0,x,y,diameter,diameter,{alpha:fade*.88});
    }else{
     const radius=16+Math.min(limit-16,68)*expand;
     c.save();c.globalAlpha*=.43*(1-q);c.strokeStyle='#a7c4b1';c.lineWidth=1.5;
     c.beginPath();c.arc(x,y,radius,e.angle-.7,e.angle+.7);c.stroke();c.restore();
    }
   }continue;
  }
  if(e.kind==='knockhit'){
   if(!ground){const distance=q*16;drawArt(c,'wind',4,x+Math.cos(e.angle)*distance,y+Math.sin(e.angle)*distance,27,11,{angle:e.angle,stretch:true,alpha:.48*(1-q)});if(q<.45)drawArt(c,'star',3,x,y,17,17,{alpha:.5*(1-q/.45)});}continue;
  }
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
  if(p._tauntVisualEnd>now){const fade=Math.min(1,(p._tauntVisualEnd-now)/450);drawArt(c,'guardian',5,x,y+16*s,66*s,25*s,{stretch:true,alpha:fade*.45});}
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
