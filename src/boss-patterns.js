import {drawBossRoute,drawBossPulseGround} from './boss-telegraph-art.js';
import {drawArt} from './generated-art.js';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const players=g=>[g.p,g.p2].filter(p=>p&&p.hp>0&&!p._downed);
const segmentDistance=(x,y,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?clamp(((x-a.x)*dx+(y-a.y)*dy)/d,0,1):0;return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);};
export function queueBossGroundHit(g,p,damage,color,absolute=false){g.ebul.push({x:p.x,y:p.y,vx:0,vy:0,life:.015,dmg:damage,color,_groundHit:true,_absoluteBossDamage:absolute,_targetPlayer:p===g.p?'p1':'p2'});}
const hit=queueBossGroundHit;
function rest(e,now,duration=2500){
 e._pattern=null;e._patternRecoveryEnd=now+duration;e._spawnShield=0;e._shieldNextCD=now+duration+5000;
 e.sbAtkCD=Math.max(e.sbAtkCD||0,now+duration+1400);e.sbTeleCD=Math.max(e.sbTeleCD||0,now+duration+2500);
 e.sbSpawnCD=Math.max(e.sbSpawnCD||0,now+duration+4000);e.sbPulseCD=Math.max(e.sbPulseCD||0,now+duration+3000);
 e._patternAt=now+duration+(e.stageBoss===30?1800:5500);
}
export function clearBossPattern(g,e){
 if(e)g.ene=g.ene.filter(m=>!m._bossCore||m._bossOwner!==e.stageBoss);
 if(e){e._pattern=null;e._patternRecoveryEnd=0;}
 g._bossHazards=[];
}
export function updateBossPattern(g,e,now,dt,target,mw,mh){
 if(!g||!e||e.hp<=0)return false;
 const phase=e.hp/e.mhp>.66?1:e.hp/e.mhp>.33?2:3;
 // Phase changes wait until the current cast and recovery finish.
 const gap=e._patternLastTick?now-e._patternLastTick:0;e._patternLastTick=now;
 if(gap>250){
  const shift=gap-16;for(const key of ['_teleExe','_teleLandShow','_dashChargeEnd','_chargeEnd','_p3dashPause','_p3t'])if(e[key])e[key]+=shift;e._patternAt=(e._patternAt||now)+shift;
  if(e._patternRecoveryEnd)e._patternRecoveryEnd+=shift;
  if(e._pattern){e._pattern.startAt+=shift;e._pattern.executeAt+=shift;e._pattern.endAt+=shift;if(e._pattern.lockAt)e._pattern.lockAt+=shift;if(e._spawnShield)e._spawnShield+=shift;}
 }
 if(e._patternRecoveryEnd>now)return true;
 if(!e._patternAt)e._patternAt=now+900;
 const busy=!!e._teleExe||!!e._chargeEnd||!!e._dashChargeEnd||(e._p3cycle&&!['idle','free'].includes(e._p3cycle));
 if(!e._pattern&&now>=e._patternAt&&!busy){
  const sequence=e._patternSequence||0;e._patternSequence=sequence+1;
  const type=e.stageBoss===20?(sequence%2?'slam':'mud'):(['claw','wing','impact','rift'][sequence%4]);
  const a=Math.atan2(target.y-e.y,target.x-e.x),warning=type==='rift'?1900:type==='mud'?1600:type==='impact'?1500:1300;
  const p={type,startAt:now,executeAt:now+warning,endAt:now+warning+500,angle:a,startX:e.x,startY:e.y,done:false};
  if(type==='mud'){
   // Six inner and ten outer pools; one broad escape sector stays open.
   p.points=[];const escape=a+Math.PI;
   for(const [count,radius,size] of [[6,95,33],[10,195,38]])for(let i=0;i<count;i++){
    const angle=escape+.6+(TAU-1.2)*(i+.5)/count;
    const point={x:clamp(target.x+Math.cos(angle)*radius,40,mw-40),y:clamp(target.y+Math.sin(angle)*radius,40,mh-40),r:size};
    if(!p.points.some(q=>Math.hypot(q.x-point.x,q.y-point.y)<35))p.points.push(point);
   }
  }
  if(type==='slam'||type==='wing'){const length=type==='wing'?clamp(Math.hypot(target.x-e.x,target.y-e.y)+100,300,520):155;p.endX=clamp(e.x+Math.cos(a)*length,e.r,mw-e.r);p.endY=clamp(e.y+Math.sin(a)*length,e.r,mh-e.r);p.width=type==='wing'?46:28;}
  if(type==='claw'){p.radius=250;p.spread=Math.PI*1.35;p.endAt=p.executeAt+650;}
  if(type==='impact'){p.x=clamp(target.x,e.r,mw-e.r);p.y=clamp(target.y,e.r,mh-e.r);p.radius=200;p.endAt=p.executeAt+750;}
  if(type==='rift'){p.lockAt=now+1100;p.endAt=p.executeAt+1100;p.arm=75;p.x=e.x;p.y=e.y;p.spinAngle=0;}
  g.ebul=[];e._pattern=p;e._artAttackUntil=p.executeAt+500;
  // Committed casts have no destructible interrupt cores.
  g.dn.push({x:e.x,y:e.y-e.r-30,d:type==='mud'?'泥雨・離開落點':type==='slam'?'重拳蓄力・離開標線':type==='wing'?'翼刃突進・側移躲開':type==='claw'?'魔爪橫掃・退到背後':type==='impact'?'墜天重擊・離開落點':'旋轉裂界・鎖定後側移',life:1.8,color:'#f1d599',big:1});
 }
 const p=e._pattern;if(!p)return false;e._artAngle=p.angle;e._artAttackUntil=now+120;
 if(p.type==='rift'&&now<p.executeAt){
  if(now<p.lockAt)p.spinAngle=(now-p.startAt)/380;
  else if(!p.locked){p.locked=true;p.angle=Math.atan2(target.y-p.startY,target.x-p.startX);p.spinAngle=Math.PI/4;p.distance=clamp(Math.hypot(target.x-p.startX,target.y-p.startY)+130,230,440);p.endX=clamp(p.startX+Math.cos(p.angle)*p.distance,30,mw-30);p.endY=clamp(p.startY+Math.sin(p.angle)*p.distance,30,mh-30);g.dn.push({x:e.x,y:e.y-e.r-32,d:'方向鎖定・側移躲開',life:.75,color:'#ffd3ef'});}
 }
 if(now<p.executeAt)return true;
 const damage=Math.min(26,10+(g.wave||20)*.35);
 if(!p.done){
  p.done=true;
  if(p.type==='mud'){
   g._bossHazards=(g._bossHazards||[]).filter(h=>h.endAt>now).concat(p.points.map(q=>({...q,owner:e.stageBoss,startAt:now,endAt:now+5000}))).slice(-32);
   // Mud rain is area control only: slow, without landing damage.
  }else if(p.type==='claw'){
   for(const player of players(g)){const angle=Math.atan2(player.y-p.startY,player.x-p.startX),delta=Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle));if(Math.hypot(player.x-p.startX,player.y-p.startY)<p.radius+12&&Math.abs(delta)<p.spread/2)hit(g,player,damage,'#eca9de');}
  }else if(p.type==='impact'){
   e.x=p.x;e.y=p.y;for(const player of players(g))if(Math.hypot(player.x-p.x,player.y-p.y)<p.radius+12)hit(g,player,damage,'#d49fea');
  }else if(p.type==='slam'){
   let caught=false;for(const player of players(g))if(segmentDistance(player.x,player.y,{x:p.startX,y:p.startY},{x:p.endX,y:p.endY})<p.width+12){hit(g,player,damage,'#d2b275');caught=true;}
   p.recovery=caught?1800:3000;
  }else if(p.type==='rift'){g.ene=g.ene.filter(m=>m._coreGroup!==p.coreGroup);p.coreGroup=null;p.hitPlayers=[];}

 }
 if(p.type==='rift'){
  const q=clamp((now-p.executeAt)/1100,0,1),old={x:p.x,y:p.y};p.x=p.startX+(p.endX-p.startX)*q;p.y=p.startY+(p.endY-p.startY)*q;
  const steps=Math.max(1,Math.ceil(Math.hypot(p.x-old.x,p.y-old.y)/10));
  for(const player of players(g)){const id=player===g.p?'p1':'p2';if(p.hitPlayers.includes(id))continue;let caught=false;
   for(let i=0;i<=steps&&!caught;i++){const x=old.x+(p.x-old.x)*i/steps,y=old.y+(p.y-old.y)*i/steps;for(const turn of [0,Math.PI/2]){const a=p.spinAngle+turn;const one={x:x-Math.cos(a)*p.arm,y:y-Math.sin(a)*p.arm},two={x:x+Math.cos(a)*p.arm,y:y+Math.sin(a)*p.arm};if(segmentDistance(player.x,player.y,one,two)<24)caught=true;}}
   if(caught){p.hitPlayers.push(id);hit(g,player,damage,'#d49bea');}
  }
 }
 if(p.type==='wing'){
  const q=clamp((now-p.executeAt)/500,0,1),old={x:e.x,y:e.y};e.x=p.startX+(p.endX-p.startX)*q;e.y=p.startY+(p.endY-p.startY)*q;
  p.hitPlayers=p.hitPlayers||[];
  for(const player of players(g)){const id=player===g.p?'p1':'p2';if(!p.hitPlayers.includes(id)&&segmentDistance(player.x,player.y,old,e)<e.r*.7+12){p.hitPlayers.push(id);hit(g,player,damage,'#caa2e8');}}
 }
 if(now>=p.endAt){g.ene=g.ene.filter(m=>!p.coreGroup||m._coreGroup!==p.coreGroup);rest(e,now,p.recovery||2600);}
 return true;
}
export function updateBossHazards(g,now){
 g._bossHazards=(g._bossHazards||[]).filter(h=>h.endAt>now);
 for(const p of players(g))if(g._bossHazards.some(h=>Math.hypot(p.x-h.x,p.y-h.y)<h.r+10))p._mudSlowEnd=now+90;
}
export function drawBossPatternGround(c,g,now){
 for(const h of g?._bossHazards||[])drawArt(c,'mud-geyser',8+Math.floor(now/220)%4,h.x,h.y,h.r*2,h.r*2,{stretch:true,alpha:.85});
 for(const e of g?.ene||[]){
  if(!e.stageBoss||e.hp<=0)continue;drawBossPulseGround(c,e,now);const p=e._pattern;
  if(e._patternRecoveryEnd>now){drawArt(c,'guardian',5,e.x,e.y+e.r*.55,e.r*2.4,e.r*.7,{stretch:true,alpha:.5});c.save();c.textAlign='center';c.fillStyle='#b8e9ac';c.font='bold 12px sans-serif';c.fillText('失衡・反擊',e.x,e.y-e.r-28);c.restore();}
  if(!p)continue;
  const warn=now<p.executeAt,progress=clamp((now-p.startAt)/(p.executeAt-p.startAt),0,1),phase=warn?Math.min(3,Math.floor(progress*4)):Math.min(3,Math.floor((now-p.executeAt)/125));
  if(p.type==='mud'){
   for(const q of p.points)drawArt(c,'mud-geyser',(warn?0:4)+phase,q.x,q.y,q.r*2,q.r*2,{stretch:true,alpha:warn?.75+.25*progress:1});
  }else if(p.type==='claw'){
   for(let i=0;i<13;i++){const angle=p.angle-p.spread/2+p.spread*i/12;
    drawBossRoute(c,'devil-route',warn?0:8,{x:p.startX+Math.cos(angle)*65,y:p.startY+Math.sin(angle)*65},{x:p.startX+Math.cos(angle)*p.radius,y:p.startY+Math.sin(angle)*p.radius},warn?14:26,phase,warn?.45+.25*progress:.85);
   }
  }else if(p.type==='impact'){
   const radius=p.radius*(warn?1:.6+.4*clamp((now-p.executeAt)/500,0,1));
   for(let i=0;i<16;i++){const angle=TAU*i/16;drawArt(c,warn?'arcane':'sword-qi-v2',warn?5:6,p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius,35,48,{angle,alpha:warn?.5+.35*progress:1-clamp((now-p.executeAt)/750,0,1)});}
   if(!warn)drawArt(c,'quake-radial',0,p.x,p.y,radius*2,radius*2,{alpha:.8*(1-clamp((now-p.executeAt)/750,0,1))});
  }else if(p.type==='slam'||p.type==='wing'){
   const a={x:p.startX,y:p.startY},b={x:p.endX,y:p.endY};
   drawBossRoute(c,p.type==='slam'?'mud-route':'devil-route',warn?0:p.type==='slam'?4:8,a,b,p.width*2,phase,warn?.72+.28*progress:.85);
  }else if(p.type==='rift'){
   if(p.locked&&warn)drawBossRoute(c,'devil-route',0,{x:p.startX,y:p.startY},{x:p.endX,y:p.endY},115,3,.8);
   const x=warn?p.startX:p.x,y=warn?p.startY:p.y,a=p.spinAngle||0,arm=p.arm||75;
   for(const turn of [0,Math.PI/2]){const angle=a+turn;
    drawBossRoute(c,'devil-route',warn?4:8,{x:x-Math.cos(angle)*arm,y:y-Math.sin(angle)*arm},{x:x+Math.cos(angle)*arm,y:y+Math.sin(angle)*arm},24,warn?Math.min(3,Math.floor(progress*4)):Math.floor(now/90)%4,warn?.65+.35*progress:1);
   }
   if(warn){c.save();c.fillStyle='#ffe0fc';c.textAlign='center';c.font='bold 11px sans-serif';c.fillText(p.locked?'方向已鎖定・側移':'裂界蓄力・準備側移',p.startX,p.startY-e.r-38);c.restore();}
  }
  if(warn&&p.coreGroup)for(const core of g.ene.filter(m=>m._coreGroup===p.coreGroup&&m.hp>0))
   drawBossRoute(c,e.stageBoss===20?'mud-route':'devil-route',0,{x:e.x,y:e.y},{x:core.x,y:core.y},6,1,.58);
 }
}
export function drawBossPatternCore(c,e,now){
 const mud=e._bossOwner===20;drawArt(c,mud?'guardian':'arcane',mud?7:9,e.x,e.y,31,31,{outline:mud?'#c6e8a0':'#fff2bf',brightness:1.2});
 c.save();c.fillStyle='#101a27';c.fillRect(e.x-16,e.y+19,32,4);c.fillStyle=mud?'#abd879':'#efc875';c.fillRect(e.x-16,e.y+19,32*Math.max(0,e.hp/e.mhp),4);
 c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle='#fff2d5';c.fillText(mud?'泥核':'護盾核',e.x,e.y-21);c.restore();
}
