import {drawArt} from './generated-art.js';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const players=g=>[g.p,g.p2].filter(p=>p&&p.hp>0&&!p._downed);
const segmentDistance=(x,y,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?clamp(((x-a.x)*dx+(y-a.y)*dy)/d,0,1):0;return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);};
function hit(g,p,damage,color){g.ebul.push({x:p.x,y:p.y,vx:0,vy:0,life:.015,dmg:damage,color,_groundHit:true,_targetPlayer:p===g.p?'p1':'p2'});}
function rest(e,now,duration=2500){
 e._pattern=null;e._patternRecoveryEnd=now+duration;e._spawnShield=0;e._shieldNextCD=now+duration+5000;
 e.sbAtkCD=Math.max(e.sbAtkCD||0,now+duration+1400);e.sbTeleCD=Math.max(e.sbTeleCD||0,now+duration+2500);
 e.sbSpawnCD=Math.max(e.sbSpawnCD||0,now+duration+4000);e.sbPulseCD=Math.max(e.sbPulseCD||0,now+duration+3000);
 e._patternAt=now+duration+5500;
}
export function clearBossPattern(g,e){
 if(e)g.ene=g.ene.filter(m=>!m._bossCore||m._bossOwner!==e.stageBoss);
 if(e){e._pattern=null;e._patternRecoveryEnd=0;}
 g._bossHazards=[];
}
function cores(g,e,pattern,now,mw,mh){
 const hp=Math.max(35,Math.min(150,(g.p.atk+4)*3));
 pattern.coreGroup=e.stageBoss+':'+now;pattern.coreCount=2;
 for(const side of [-1,1]){
  const a=pattern.angle+side*Math.PI*.55;
  g.ene.push({x:clamp(e.x+Math.cos(a)*105,24,mw-24),y:clamp(e.y+Math.sin(a)*105,24,mh-24),
   hp,mhp:hp,r:15,speed:0,t:0,color:e.stageBoss===20?'#a6ce80':'#ffcf71',boss:false,mega:false,tier:0,role:0,face:1,xp:0,st:0,frozen:0,
   poisonT:0,burnT:0,burnLv:0,poisonLv:0,dmgMul:0,_bossCore:true,_bossOwner:e.stageBoss,_coreGroup:pattern.coreGroup,deadHandled:false});
 }
 e._spawnShield=pattern.executeAt;
}
export function updateBossPattern(g,e,now,dt,target,mw,mh){
 if(!g||!e||e.hp<=0)return false;
 const phase=e.hp/e.mhp>.66?1:e.hp/e.mhp>.33?2:3;
 if(e.stageBoss===30&&phase!==e.sbPhase){clearBossPattern(g,e);e._patternAt=now+2500;return false;}
 const gap=e._patternLastTick?now-e._patternLastTick:0;e._patternLastTick=now;
 if(gap>250){
  const shift=gap-16;e._patternAt=(e._patternAt||now)+shift;
  if(e._patternRecoveryEnd)e._patternRecoveryEnd+=shift;
  if(e._pattern){e._pattern.startAt+=shift;e._pattern.executeAt+=shift;e._pattern.endAt+=shift;if(e._spawnShield)e._spawnShield+=shift;}
 }
 if(e._patternRecoveryEnd>now)return true;
 if(!e._patternAt)e._patternAt=now+900;
 const busy=e._p3cycle&&!['idle','free'].includes(e._p3cycle);
 if(!e._pattern&&now>=e._patternAt&&!busy){
  const sequence=e._patternSequence||0;e._patternSequence=sequence+1;
  const type=e.stageBoss===20?(sequence%2?'slam':'mud'):(sequence%2?'rift':'wing');
  const a=Math.atan2(target.y-e.y,target.x-e.x),warning=type==='rift'?1900:type==='mud'?1600:1300;
  const p={type,startAt:now,executeAt:now+warning,endAt:now+warning+500,angle:a,startX:e.x,startY:e.y,done:false};
  if(type==='mud')p.points=[-1,0,1].map(i=>({x:clamp(target.x+i*68,35,mw-35),y:clamp(target.y+(i?30:0),35,mh-35),r:27}));
  if(type==='slam'||type==='wing'){const length=type==='wing'?230:155;p.endX=clamp(e.x+Math.cos(a)*length,e.r,mw-e.r);p.endY=clamp(e.y+Math.sin(a)*length,e.r,mh-e.r);p.width=type==='wing'?34:28;}
  if(type==='rift')p.lines=[0,Math.PI/2].map(turn=>{const angle=a+turn;return {a:{x:e.x-Math.cos(angle)*205,y:e.y-Math.sin(angle)*205},b:{x:e.x+Math.cos(angle)*205,y:e.y+Math.sin(angle)*205}};});
  g.ebul=[];e._pattern=p;e._artAttackUntil=p.executeAt+500;
  if(type==='mud'||type==='rift')cores(g,e,p,now,mw,mh);
  g.dn.push({x:e.x,y:e.y-e.r-30,d:type==='mud'?'泥雨・打破泥核可中斷':type==='slam'?'重拳蓄力・離開標線':type==='wing'?'張翼衝刺・側移躲開':'裂界蓄力・打破護盾核',life:1.8,color:'#f1d599',big:1});
 }
 const p=e._pattern;if(!p)return false;e._artAngle=p.angle;e._artAttackUntil=now+120;
 if(p.coreGroup){
  const alive=g.ene.filter(m=>m._bossCore&&m._coreGroup===p.coreGroup&&m.hp>0).length;
  if(alive<p.coreCount){
   g.ene=g.ene.filter(m=>m._coreGroup!==p.coreGroup);
   g.dn.push({x:e.x,y:e.y-e.r-30,d:'失衡！反擊機會',life:2.4,color:'#b5e5ab',big:1});rest(e,now,3000);return true;
  }
 }
 if(now<p.executeAt)return true;
 const damage=Math.min(26,10+(g.wave||20)*.35);
 if(!p.done){
  p.done=true;
  if(p.type==='mud'){
   g._bossHazards=(g._bossHazards||[]).filter(h=>h.endAt>now).concat(p.points.map(q=>({...q,owner:e.stageBoss,startAt:now,endAt:now+3500}))).slice(-6);
   for(const q of p.points)for(const player of players(g))if(Math.hypot(player.x-q.x,player.y-q.y)<q.r+12)hit(g,player,damage,'#c5a76b');
  }else if(p.type==='slam'){
   let caught=false;for(const player of players(g))if(segmentDistance(player.x,player.y,{x:p.startX,y:p.startY},{x:p.endX,y:p.endY})<p.width+12){hit(g,player,damage,'#d2b275');caught=true;}
   p.recovery=caught?1800:3000;
  }else if(p.type==='rift'){
   for(const player of players(g))if(p.lines.some(line=>segmentDistance(player.x,player.y,line.a,line.b)<18+12))hit(g,player,damage,'#d49bea');
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
function line(c,a,b,width,color,alpha){c.save();c.strokeStyle=color;c.lineWidth=width;c.globalAlpha*=alpha;c.lineCap='round';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.restore();}
export function drawBossPatternGround(c,g,now){
 for(const h of g?._bossHazards||[])drawArt(c,'poison',3,h.x,h.y,h.r*2,h.r*1.2,{stretch:true,alpha:.58});
 for(const e of g?.ene||[]){
  if(!e.stageBoss||e.hp<=0)continue;const p=e._pattern;
  if(e._patternRecoveryEnd>now){drawArt(c,'guardian',5,e.x,e.y+e.r*.55,e.r*2.4,e.r*.7,{stretch:true,alpha:.5});c.save();c.textAlign='center';c.fillStyle='#b8e9ac';c.font='bold 12px sans-serif';c.fillText('失衡・反擊',e.x,e.y-e.r-28);c.restore();}
  if(!p)continue;
  const warn=now<p.executeAt,progress=clamp((now-p.startAt)/(p.executeAt-p.startAt),0,1),color=e.stageBoss===20?'#ebc77b':'#e4abff';
  if(p.type==='mud'){
   for(const q of p.points){c.save();c.globalAlpha*=warn?.3+.3*progress:.8;c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(q.x,q.y,q.r,0,TAU);c.stroke();c.fillStyle=color;c.globalAlpha*=.22;c.fill();c.restore();if(!warn)drawArt(c,'guardian',8,q.x,q.y,q.r*2.4,q.r*1.6,{stretch:true,alpha:.85});}
  }else if(p.type==='slam'||p.type==='wing'){
   const a={x:p.startX,y:p.startY},b={x:p.endX,y:p.endY};line(c,a,b,p.width*2,color,warn?.15+.2*progress:.5);line(c,a,b,2,color,warn?.7:.9);
   if(!warn&&p.type==='slam')drawArt(c,'guardian',8,b.x,b.y,100,65,{stretch:true,alpha:.9});
  }else if(p.type==='rift'){
   for(const l of p.lines){line(c,l.a,l.b,35,color,warn?.1+.15*progress:.45);line(c,l.a,l.b,2,color,.8);if(!warn){const a=Math.atan2(l.b.y-l.a.y,l.b.x-l.a.x);drawArt(c,'sword-beam',2,l.a.x,l.a.y,410,15,{stretch:true,angle:a,anchorX:0,alpha:.9});}}
  }
 }
}
export function drawBossPatternCore(c,e,now){
 const mud=e._bossOwner===20;drawArt(c,mud?'guardian':'arcane',mud?7:9,e.x,e.y,31,31,{outline:mud?'#c6e8a0':'#fff2bf',brightness:1.2});
 c.save();c.fillStyle='#101a27';c.fillRect(e.x-16,e.y+19,32,4);c.fillStyle=mud?'#abd879':'#efc875';c.fillRect(e.x-16,e.y+19,32*Math.max(0,e.hp/e.mhp),4);
 c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle='#fff2d5';c.fillText(mud?'泥核':'護盾核',e.x,e.y-21);c.restore();
}
