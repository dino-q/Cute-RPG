import {drawArt,artFrame,artThumbnail,directionIndex} from './generated-art.js';
const TAU=Math.PI*2;
export const CARD_PALETTES={fire:['#713231','#df6045','#ffd080'],ice:['#365b83','#78bddc','#e0fbff'],lightning:['#735224','#e9b649','#fff0b5'],poison:['#43522d','#94be59','#e0ef91'],dragon:['#73352d','#de8144','#ffe2a1'],star:['#544778','#b397d9','#fff2d2'],whirl:['#365f70','#86c7c6','#e0f5e4']};
const pick=p=>p?._lightSaber?'star':Object.keys(CARD_PALETTES).find(k=>k==='dragon'&&p?.fx?.[k])||['star','fire','ice','lightning','poison','whirl'].find(k=>p?.fx?.[k]||(k==='poison'&&p?._poisonBlade))||null;

const themes={fire:'fire',dragon:'fire',ice:'ice',poison:'poison',star:'star',whirl:'wind'};
const clamp=v=>Math.max(0,Math.min(1,v));
const weaponRows={fire:1,ice:2,lightning:3,poison:4,dragon:5,star:6,whirl:7};
export function drawPixelPhoenix(c,x,y,size,time=0,flap=0){drawArt(c,'phoenix',2+(Math.floor((time+flap*100)/130)%3),x,y,size,size,{fullCell:true});}
export function drawCardPlayerLayer(c,p,x,y,r,now,front=false){
 if(!p)return;const f=p.fx||{},s=r/18;
 if(!front){
  if(p.invCD&&p._inv)drawArt(c,'angel-wings',Math.floor(now/160)%6,x,y-8*s,72*s,52*s,{fullCell:true});
  if(p._guardAura)drawArt(c,'guardian',5,x,y+r*.6,(r+25+p._guardAura*10)*2,30*s,{alpha:.55});
  if(p._shadowStepEnd>now||p._shadowStrikeEnd>now)drawArt(c,'arcane',7,x,y+7*s,36*s,18*s,{alpha:.4,angle:Math.atan2(p._ad?.y||0,p._ad?.x||1)});
 }else{
  if(p._sh)drawArt(c,'guardian',1,x,y+12*s,32*s,22*s,{alpha:.45});
  if(p._iwActive)drawArt(c,'guardian',6,x,y+17*s,23*s,12*s,{alpha:.55});
  if(p.thorns)drawArt(c,'guardian',4,x,y+12*s,24*s,17*s,{alpha:.65});
  if(p.regen&&p.hp<p.maxHp&&Math.floor(now/200)%8<3)drawArt(c,'vital',0,x-r-3,y+3-(now%1600)/80,12*s,14*s,{alpha:.7});
  if(p._healFlash&&now-p._healFlash<220){const q=(now-p._healFlash)/220;drawArt(c,'vital',0,x,y-q*16,35*s,35*s,{alpha:1-q});}
  if(p._mgBerserkEnd>now||p.berserk&&p.hp<p.maxHp*p.berserk)drawArt(c,'vital',3,x,y+15*s,30*s,19*s,{alpha:.8});
  if(f.phoenix&&p.revive>0)drawArt(c,'phoenix',0,x+r+4,y-r+7,12*s,15*s);
  const reveal=p._cardReveal;if(reveal&&now-reveal.at<850){const q=(now-reveal.at)/850;drawArt(c,'vital',4,x,y-r-13-q*8,32*s,26*s,{alpha:Math.sin(q*Math.PI)});c.save();c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle='#ffe5b0';c.globalAlpha*=Math.sin(q*Math.PI);c.fillText(reveal.name,x,y-r-30-q*8);c.restore();}
 }
}
// Replace only weapon pixels outside the protected head/body, then attach approved props.
// Work is cached once per source/tier, never performed per frame.
const variants=new WeakMap();
export function cardWeaponAtlas(image,key,p,poseContract){
 const theme=pick(p),armored=!!p?.projImmune&&key!=='tank-shield';
 if(!image||(!theme&&!armored)||!artFrame('weapon-variants')||(armored&&!artFrame('fitted-armor')))return image;
 if(key==='gunner-pixel'&&!armored)return image;
 let cache=variants.get(image);if(!cache){cache=new Map();variants.set(image,cache);}
 const id=key+':'+theme+':'+armored;if(cache.has(id))return cache.get(id);
 const cv=document.createElement('canvas');cv.width=image.width;cv.height=image.height;
 const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const cell=key.includes('action')?96:64,data=c.getImageData(0,0,cv.width,cv.height),attachments=[],plates=[];
 for(let sy=0;sy<cv.height;sy+=cell)for(let sx=0;sx<cv.width;sx+=cell){
  const role=key==='melee-pixel'?['swordsman','tank','assassin'][sy/64]:null;
  const frames=role?poseContract?.roles[role]:poseContract?.frames;
  const pose=frames?.find(f=>f.x===sx&&f.y===sy);
  const direction=role?sx/cell:frames?.indexOf(pose)%8;
  if(armored&&pose?.torso)plates.push({sx,sy,torso:pose.torso,direction});
  if(!theme||key==='gunner-pixel'||key==='melee-pixel')continue;
  if(key==='tank-shield'){
   const dir=sx/64,bounds=[[26,20,5,24],[23,20,10,24],[25,20,13,24],[26,20,12,24],[26,20,4,24],[23,20,11,24],[24,20,15,24],[26,20,11,24]][dir%8];attachments.push({sx,sy,shield:bounds});continue;
  }
  const assassin=key==='assassin-action',points=[];
  for(let yy=0;yy<cell;yy++)for(let xx=0;xx<cell;xx++){
   const at=((sy+yy)*cv.width+sx+xx)*4;if(data.data[at+3]<128)continue;
   const face=assassin?yy<65&&xx>=35&&xx<=61:xx>=30&&xx<=66&&yy>=30&&yy<=68;
   const body=assassin?xx>=42&&xx<=53&&yy>=70&&yy<=85:xx>=40&&xx<=58&&yy>=69&&yy<=91;
   if(face||body)continue;
   const red=data.data[at],green=data.data[at+1],blue=data.data[at+2],hi=Math.max(red,green,blue),lo=Math.min(red,green,blue);
   if(hi<135||hi-lo>75)continue;points.push([xx,yy]);data.data[at+3]=0;
  }
  if(assassin&&pose?.hands){attachments.push({sx,sy,hands:pose.hands});continue;}
  if(!points.length)continue;
  const hand=[48,77],near=points.reduce((a,b)=>Math.hypot(b[0]-hand[0],b[1]-hand[1])<Math.hypot(a[0]-hand[0],a[1]-hand[1])?b:a);
  const tip=points.reduce((a,b)=>Math.hypot(b[0]-near[0],b[1]-near[1])>Math.hypot(a[0]-near[0],a[1]-near[1])?b:a);
  attachments.push({sx,sy,x:near[0],y:near[1],angle:Math.atan2(tip[1]-near[1],tip[0]-near[0]),size:Math.min(36,Math.max(20,Math.hypot(tip[0]-near[0],tip[1]-near[1])+7))});
 }
 c.putImageData(data,0,0);
 for(const plate of plates){
  const [x,y,w,h]=plate.torso;
  drawArt(c,'fitted-armor',plate.direction,plate.sx+x,plate.sy+y,w,h);
  // Restore the original visible skin over the fitted chest plate: face and hands stay readable.
  for(let yy=Math.floor(y-h/2);yy<=Math.ceil(y+h/2);yy++)for(let xx=Math.floor(x-w/2);xx<=Math.ceil(x+w/2);xx++){
   const at=((plate.sy+yy)*cv.width+plate.sx+xx)*4,red=data.data[at],green=data.data[at+1],blue=data.data[at+2];
   if(data.data[at+3]>128&&red>155&&green>95&&blue>55&&red>green*1.12&&green>blue*1.05){
    c.fillStyle='rgb('+red+','+green+','+blue+')';c.fillRect(plate.sx+xx,plate.sy+yy,1,1);
   }
  }
 }
 for(const a of attachments){
  if(a.shield){const [x,y,w,h]=a.shield;c.clearRect(a.sx,a.sy,cell,cell);drawArt(c,'weapon-variants',weaponRows[theme]*4+2,a.sx+x+w/2,a.sy+y+h/2,w,h);continue;}
  if(a.hands){for(const [x,y,angle]of a.hands)drawArt(c,'dagger-single',weaponRows[theme],a.sx+x,a.sy+y,16,16,{angle:angle+Math.PI/4,anchorX:.22,anchorY:.85});continue;}
  drawArt(c,'weapon-variants',weaponRows[theme]*4+1,a.sx+a.x,a.sy+a.y,a.size,a.size,{angle:a.angle+Math.PI/4,anchorX:.2,anchorY:.85});
 }
 cache.set(id,cv);return cv;
}
export function drawCardGun(c,p,muzzle,dir,scale,now){
 if(!p||!muzzle)return;const k=pick(p);if(!k&&!p._minigun&&!p._crossbow)return;
 const a=Math.atan2(dir.y,dir.x),mini=p._minigun;
 const group=mini||p._crossbow?'arsenal':'weapon-variants',frame=mini?Math.min(2,Math.max(0,mini-1)):p._crossbow?3:weaponRows[k]*4;
 const width=(mini?24:p._crossbow?22:18)*scale;
 drawArt(c,group,frame,muzzle.x-Math.cos(a)*width*.46,muzzle.y-Math.sin(a)*width*.46,width,15*scale,{angle:a});
 if(p._pixelShotAt&&now-p._pixelShotAt<60&&k!=='lightning')drawArt(c,themes[k]||'fire',3,muzzle.x+Math.cos(a)*5,muzzle.y+Math.sin(a)*5,12,12,{alpha:1-(now-p._pixelShotAt)/60,angle:a});
}
export function drawCardBullet(c,b,p,now,r=3){
 p=b.cardFx||p;const k=pick(p),a=Math.atan2(b.vy||0,b.vx||1);
 c.save();c.shadowBlur=0;const trails=b.trail||[];for(let i=Math.max(0,trails.length-4);i<trails.length;i++){const q=trails[i];c.globalAlpha=clamp(q.life||0)*.3;c.fillStyle=k==='lightning'?'#FAB005':(CARD_PALETTES[k]?.[1]||'#d4b471');c.beginPath();c.arc(q.x,q.y,1.2,0,TAU);c.fill();}c.globalAlpha=1;
 if(k==='lightning'){c.translate(b.x,b.y);c.rotate(a);c.fillStyle=b.crit?'#FFD43B':'#FAB005';c.beginPath();c.moveTo(r*1.2,0);c.lineTo(r*.2,r*.5);c.lineTo(r*.5,0);c.lineTo(-r*.2,-r*.5);c.lineTo(r*.2,0);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.arc(0,0,r*.25,0,TAU);c.fill();}
 else if(k)drawArt(c,themes[k],0,b.x,b.y,r*(k==='ice'?5:4),r*3,{angle:a});
 else{c.translate(b.x,b.y);c.rotate(a);c.fillStyle=b.crit?'#fff3b0':'#f0c477';c.fillRect(-r*1.5,-r*.55,r*3,r*1.1);}
 c.restore();
}
export function drawCardStatus(c,e,now){
 if(e.burnT>0)drawArt(c,'fire',4,e.x,e.y+e.r*.55,e.r*1.7,e.r*1.5,{alpha:.78});
 if(e.frozen>0)drawArt(c,'ice',4,e.x,e.y,e.r*2.5,e.r*2.6,{alpha:.8});
 
 if(e._bleedEnd>now)drawArt(c,'vital',1,e.x+e.r*.65,e.y-3,10,15,{alpha:.7});
 if(e.poisonT>0)drawArt(c,'poison',4,e.x,e.y-e.r-7-Math.sin(now/200)*2,16,16,{alpha:.75});
}
export function drawCardLightning(c,l,quality=1,count=1){
 const jit=(count>60?7:10)*quality,jitter=()=>-jit+Math.random()*jit*2;
 const mx1=(l.x1*2+l.x2)/3+jitter(),my1=(l.y1*2+l.y2)/3+jitter();
 const mx2=(l.x1+l.x2*2)/3+jitter(),my2=(l.y1+l.y2*2)/3+jitter();
 c.save();c.shadowBlur=0;c.globalAlpha=l.life*.35;c.strokeStyle='#FFD43B';c.lineWidth=6;
 c.beginPath();c.moveTo(l.x1,l.y1);c.lineTo(mx1,my1);c.lineTo(mx2,my2);c.lineTo(l.x2,l.y2);c.stroke();
 c.globalAlpha=l.life*(quality<.6?.72:1);c.strokeStyle='#FAB005';c.lineWidth=2;
 c.beginPath();c.moveTo(l.x1,l.y1);c.lineTo(mx1,my1);c.lineTo(mx2,my2);c.lineTo(l.x2,l.y2);c.stroke();c.restore();
}

const dragonMotion=new WeakMap();
function drawDragon(c,g,now,lv){
 const dp=g._dragonPet;let m=dragonMotion.get(g);if(!m){m={x:dp.x,y:dp.y,angle:dp.face<0?Math.PI:0,movingUntil:0};dragonMotion.set(g,m);}
 const dx=dp.x-m.x,dy=dp.y-m.y;if(Math.hypot(dx,dy)>.05){m.angle=Math.atan2(dy,dx);m.movingUntil=now+180;}
 m.x=dp.x;m.y=dp.y;const b=g._dragonBreathFx,attack=b?.on;
 const moving=m.movingUntil>now,angle=moving?m.angle:attack?b.ang:m.angle,dir=directionIndex(angle),size=70+Math.min(3,lv)*4;
 const group=moving?'dragon-flight':attack?'dragon-attack':'dragon-idle';
 const frame=group==='dragon-flight'?dir*4+Math.floor(now/130)%4:dir;
 // Maintain flight sheet origin, not a changing per-frame visible bbox.
 drawArt(c,group,frame,dp.x,dp.y,size,size,{fullCell:true});
 if(attack){const age=(dp.breathCycle||now)%3500,phase=age<160?0:age<360?1:age>1800?3:2;
  const len=b.range,mouth=15,x=dp.x+Math.cos(angle)*mouth,y=dp.y+Math.sin(angle)*mouth-4;
  drawArt(c,'dragon-breath',phase,x,y,len,Math.max(20,len*Math.sin(b.arc||.5)*.85),{angle:b.ang,anchorX:0,anchorY:.5,alpha:.92});
 }
}
// Ground effects are drawn before any actor. The world-front pass never repeats them.
export function drawCardGround(c,g,now){
 if(!g?.p)return;const p=g.p;
 if(g.bhEnd>now){c.save();c.translate(p.x,p.y+14);c.scale(1,.58);drawArt(c,'arcane',0,0,0,126,126,{angle:now/1300,alpha:.78});c.restore();}
 if(g.mfEnd>now)drawArt(c,'arcane',1,g.mfPx,g.mfPy,(g.mfR||200)*1.7,(g.mfR||200)*1.1,{alpha:.65});
 if(g._cardTsEnd>now)drawArt(c,'arcane',2,p.x,p.y+10,145,105,{angle:Math.sin(now/600)*.04,alpha:.55});
}
export function drawCardWorld(c,g,now,r=18,phoenix=0){
 if(!g?.p)return;const p=g.p;
 if(g._dragonPet)drawDragon(c,g,now,p._dragonBreath||p.fx?.dragon||1);
 for(const w of g._wb||[])drawArt(c,'wind',1,w.x,w.y,32,32,{angle:now/380,alpha:Math.min(1,w.life/700)});
 for(const b of g._booms||[])drawArt(c,'wind',2,b.x,b.y,28,28,{angle:b.rot||0});
 for(let i=0;i<(p.orbiters||0);i++){const a=now/600+TAU*i/p.orbiters;drawArt(c,'star',0,p.x+Math.cos(a)*42,p.y+Math.sin(a)*42,17,17,{angle:a});}
 for(const b of g._lightBeams||[]){const q=(now-b.t)/300;if(q<0||q>=1)continue;drawArt(c,'star',5,b.x??p.x,b.y??p.y,b.len,24,{angle:b.ang,anchorX:0,alpha:1-q});}
 const ga=g._ghostArc;if(ga){const q=(now-ga.t)/340;if(q>=0&&q<1)drawArt(c,'ghost-slash',Math.min(5,Math.floor(q*6)),ga.x+Math.cos(ga.ang)*r*.9,ga.y+Math.sin(ga.ang)*r*.9,r*4.5,r*4.5,{angle:ga.ang,alpha:Math.sin(q*Math.PI)});}
 if(g._quakeRingT){const q=(now-g._quakeRingT)/(g._quakeRingSmall?400:800);if(q>=0&&q<1)drawArt(c,'guardian',8,p.x,p.y+r,(g._quakeRingSmall?65:240)*(1+q*.2),(g._quakeRingSmall?35:110),{alpha:1-q});}
 if(g._thornFlash){const q=(now-g._thornFlash)/300;if(q>=0&&q<1)drawArt(c,'guardian',10,p.x,p.y,r*4,r*3,{alpha:1-q});}
 if(phoenix>0){const q=clamp(1-phoenix/1.2);drawArt(c,'phoenix',Math.min(5,Math.floor(q*6)),p.x,p.y-12-q*35,90,90,{fullCell:true,alpha:Math.sin(q*Math.PI)});}
 for(const hit of g._cardImpacts||[]){const q=(now-hit.at)/320;if(q<0||q>=1)continue;const group=themes[hit.kind]||'fire',frame=hit.kind==='explosion'?6:3,size=hit.kind==='explosion'?80:32;drawArt(c,group,frame,hit.x,hit.y,size*(.7+q*.4),size*(.7+q*.4),{alpha:1-q});}
}
export function revealCard(player,card){if(player)player._cardReveal={at:performance.now(),name:card.n,color:card.c||'#dfc08b'};}
export function drawCardStrike(c,p,animation,now,r=18){
 if(!animation?.active||!p)return;const role=p.charType||'swordsman',duration=role==='assassin'?150:role==='tank'?280:320,q=(now-animation.startT)/duration;
 if(q<.18||q>.8||role==='tank')return;const key=pick(p);if(!key||key==='lightning')return;
 const d=p._ad||{x:0,y:1},a=Number.isFinite(animation.angle)?animation.angle:Math.atan2(d.y,d.x),alpha=Math.sin((q-.18)/.62*Math.PI)*.85;
 drawArt(c,themes[key],2,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,r*3.5,r*3.5,{angle:a,alpha});
 if(role==='assassin')drawArt(c,themes[key],2,p.x+Math.cos(a)*r*.5,p.y+Math.sin(a)*r*.5,r*2.2,r*2.2,{angle:a+.2,flip:true,alpha:alpha*.7});
}
export function drawGhostSlash(c,g,now,r,drawPlayer){
 const gs=g._ghostShadow;if(!gs)return;const elapsed=now-gs.t;if(elapsed<150||elapsed>470)return;
 const q=(elapsed-150)/320,dir={x:Math.cos(gs.ang),y:Math.sin(gs.ang)};
 const actor={...gs.player,x:gs.x,y:gs.y,charType:'swordsman',_ad:dir};
 c.save();c.globalAlpha*=Math.sin(q*Math.PI)*.58;
 drawPlayer(gs.x-dir.x*r*.3,gs.y-dir.y*r*.3,r,now/1000,'#bfa5f0',gs.face,actor,{effects:false,travelDirection:dir,animation:{active:true,startT:gs.t+150,angle:gs.ang}});
 c.restore();
}
function cardArtSlot(n){
 if(/殘影斬/.test(n))return ['ghost-slash',2];
 if(/龍之/.test(n))return ['dragon-flight',8];
 if(/天使之翼/.test(n))return ['angel-wings',2];
 if(/不死鳥/.test(n))return ['phoenix',3];
 if(/守護天使/.test(n))return ['guardian',3];
 if(/荊棘/.test(n))return ['guardian',4];
 if(/大地震/.test(n))return ['guardian',8];
 if(/鏡|反射/.test(n))return ['guardian',0];
 if(/守護星/.test(n))return ['guardian',1];
 if(/鐵壁/.test(n))return ['guardian',2];
 if(/意志/.test(n))return ['guardian',6];
 if(/盾|石膚/.test(n))return ['guardian',7];
 if(/黑洞/.test(n))return ['arcane',0];
 if(/磁力/.test(n))return ['arcane',1];
 if(/時間停止|時光/.test(n))return ['arcane',2];
 if(/影襲/.test(n))return ['arcane',3];
 if(/虛空/.test(n))return ['arcane',4];
 if(/斗篷|隱|分身/.test(n))return ['arcane',5];
 if(/命運/.test(n))return ['arcane',8];
 if(/混沌/.test(n))return ['arcane',9];
 if(/機關槍/.test(n))return ['arsenal',1];
 if(/弩/.test(n))return ['arsenal',3];
 if(/迴力鏢/.test(n))return ['wind',2];
 if(/召喚/.test(n))return ['wind',3];
 if(/旋風|風刃/.test(n))return ['wind',0];
 if(/分裂/.test(n))return ['wind',6];
 if(/穿透/.test(n))return ['wind',5];
 if(/吸血/.test(n))return ['vital',1];
 if(/吞噬/.test(n))return ['vital',2];
 if(/生命|回血|癒|堅韌/.test(n))return ['vital',0];
 if(/狂|越戰/.test(n))return ['vital',3];
 if(/幸運/.test(n))return ['vital',4];
 if(/蓄|集氣/.test(n))return ['vital',5];
 if(/雷/.test(n))return ['weapon-variants',12];
 if(/毒/.test(n))return ['poison',/刃|刺/.test(n)?1:0];
 if(/冰|雪/.test(n))return ['ice',/斬|刃/.test(n)?2:0];
 if(/火|焰|毀滅/.test(n))return ['fire',/斬|刃/.test(n)?2:6];
 if(/斬|刃|劍|創世|星|光/.test(n))return ['star',/創世/.test(n)?6:1];
 if(/閃電步|音速/.test(n))return ['wind',4];
 return ['star',3];
}
const cardPictures=new Map();
export function cardIllustration(card){
 const [group,frame]=cardArtSlot(card.n),key=card.id+':'+!!artFrame(group);
 if(cardPictures.has(key))return cardPictures.get(key);
 const url=artThumbnail(group,frame);if(url){cardPictures.set(key,url);return url;}
 return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64"><rect width="96" height="64" fill="#182333"/></svg>');
}
export function addCardImpact(g,x,y,source){if(!g)return;const kind=typeof source==='string'?source:pick(source);if(!kind||kind==='lightning')return;const now=performance.now();g._cardImpacts=(g._cardImpacts||[]).filter(h=>now-h.at<320).slice(-23);g._cardImpacts.push({x,y,kind,at:now});}

export function drawCardIcon(c,card,x,y,size=22){
 const [group,frame]=cardArtSlot(card.n);return drawArt(c,group,frame,x,y,size,size);
}
