// Formal-game pixel effects. Pure drawing: never changes damage, timers or RNG.
const TAU=Math.PI*2;
export const CARD_PALETTES={fire:['#713231','#df6045','#ffd080'],ice:['#365b83','#78bddc','#e0fbff'],lightning:['#735224','#e9b649','#fff0b5'],poison:['#43522d','#94be59','#e0ef91'],dragon:['#73352d','#de8144','#ffe2a1'],star:['#544778','#b397d9','#fff2d2'],whirl:['#365f70','#86c7c6','#e0f5e4']};
const pick=p=>p?._lightSaber?'star':Object.keys(CARD_PALETTES).find(k=>k==='dragon'&&p?.fx?.[k])||['star','fire','ice','lightning','poison','whirl'].find(k=>p?.fx?.[k]||(k==='poison'&&p?._poisonBlade))||null;
function px(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function stamp(c,rows,pal,x,y,s=2){for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const col=pal[rows[j][i]];if(col)px(c,x+i*s,y+j*s,s,s,col);}}
function gem(c,x,y,col,s=2){stamp(c,['..a..','.aba.','abcba','.aba.','..a..'],{a:col,b:'#fff3d5',c:'#fff'},x-2*s,y-2*s,s);}
function spark(c,x,y,col,s=2){px(c,x-2*s,y,s*5,s,col);px(c,x,y-2*s,s,s*5,col);px(c,x,y,s,s,'#fff8df');}
function ring(c,x,y,r,col,t=0,stretch=1){for(let i=0;i<48;i++){const a=i*TAU/48+t;px(c,x+Math.cos(a)*r,y+Math.sin(a)*r*stretch,2,2,col);}}
function cut(c,x,y,r,a,col,alpha=1){c.save();c.globalAlpha*=alpha;for(let j=0;j<24;j++){const q=a-1+j/23*2;px(c,x+Math.cos(q)*r,y+Math.sin(q)*r,3,3,col);if(j>6&&j<18)px(c,x+Math.cos(q)*(r-3),y+Math.sin(q)*(r-3),2,2,'#fff5db');}c.restore();}
function wing(c,x,y,side,t,fire=false,s=2){c.save();c.translate(Math.round(x),Math.round(y));c.scale(side,1);const flap=Math.round(Math.sin(t/190)*2);const pal=fire?{a:'#6c3138',b:'#db694c',c:'#f1ac59',d:'#ffe0a2'}:{a:'#52647c',b:'#93a8c4',c:'#d9e6ec',d:'#fff5db'};
 stamp(c,['........aa','.......abb','......abdc','.....abddc','....abddca','...abddcba','..abddcbaa','.abddcba..','abddcba...','abbcba....','.aaa......'],pal,3,-17+flap,s);
 for(let i=0;i<4;i++){const xx=6+i*3,yy=-5-i*4+flap;stamp(c,['.a','ab','dc','dc','cb','a.'],pal,xx*s,yy*s,s);}c.restore();}
export function drawPixelPhoenix(c,x,y,size,time=0,flap=0){const s=Math.max(.8,size/64);c.save();c.shadowBlur=0;wing(c,x,y,-1,time+flap*100,true,s);wing(c,x,y,1,time+flap*100,true,s);stamp(c,['...a...','..aba..','..cbc..','...d...','..bcb..','.bbcbb.','..bcb..','..cdc..','..cbc..','...b...','..b.b..','.b...b.'],{a:'#ffe4a6',b:'#c95543',c:'#f4ac58',d:'#fff1c7'},x-3*s,y-8*s,s);c.restore();}
export function drawCardPlayerLayer(c,p,x,y,r,now,front=false){if(!p)return;const f=p.fx||{},s=r/18;c.save();c.shadowBlur=0;
 if(!front){
  if(p.invCD&&p._inv){wing(c,x-3,y+5,-1,now,false,1.6*s);wing(c,x+3,y+5,1,now,false,1.6*s);}
  if(f.phoenix&&p.revive>0){const a=now/1200;stamp(c,['..a..','.aba.','abbba','.aba.','..a..'],{a:'#e69562',b:'#ffdeac'},x+Math.cos(a)*(r+6)-4,y+Math.sin(a)*(r+6)-4,2);}
  if(p._guardAura){const rr=r+25+p._guardAura*10;c.globalAlpha*=.45;ring(c,x,y,rr,'#d6b978',0,.45);for(let i=0;i<6;i++){const a=i*TAU/6;stamp(c,['aaa','aba','aaa'],{a:'#c4a465',b:'#f4dfac'},x+Math.cos(a)*rr-3,y+Math.sin(a)*rr*.45-3,2);}}
  if(p._shadowStepEnd>now||p._shadowStrikeEnd>now||p._killSpeedEnd>now){for(let i=0;i<3;i++)px(c,x-18-i*4,y+6+i*4,8,2,'#9c78bf');}
 }else{
  if(p._sh||p.projImmune||p._iwActive){const rr=r+6,col=p._iwActive?'#b8cad2':p._sh?'#84bddd':'#c8b892';c.globalAlpha*=.75;for(let side of [-1,1])stamp(c,['aaa','a..','a..','a..','aaa'],{a:col},x+side*rr-3,y-8,2);if(p._sh)gem(c,x,y-r-8,col,1);}
  if(p.thorns){for(let side of [-1,1])stamp(c,['..a','aba','.a.'],{a:'#427854',b:'#b9db90'},x+side*(r-3),y+6,2);}
  if(p.invCD&&p._inv){c.globalAlpha*=.9;ring(c,x,y-r-11,8,'#f0d4a1',0,.3);}
  if(p.regen&&p.hp<p.maxHp&&Math.floor(now/180)%8<3)spark(c,x-r+2,y+6-(Math.floor(now/180)%8)*3,'#a8d7a3',1);
  if(p._healFlash&&now-p._healFlash<180){const a=1-(now-p._healFlash)/180;c.globalAlpha*=a;for(let i=0;i<3;i++){const yy=y-3-(1-a)*16;spark(c,x+(i-1)*12,yy,'#a9d9a0',1);}}
  const active=Object.keys(CARD_PALETTES).filter(k=>f[k]);for(let i=0;i<active.length;i++){const k=active[i],a=now/2200+i*TAU/Math.max(1,active.length);gem(c,x+Math.cos(a)*(r+7),y+8+Math.sin(a)*5,CARD_PALETTES[k][1],1);}
  if(p._mgBerserkEnd>now||p.berserk&&p.hp<p.maxHp*p.berserk){for(let side of [-1,1])stamp(c,['.a.','aba','aba','.b.'],{a:'#9d4141',b:'#ef9b6f'},x+side*(r+3),y+5+Math.sin(now/180)*2,2);}
  const reveal=p._cardReveal;if(reveal&&now-reveal.at<850){const q=(now-reveal.at)/850;c.globalAlpha*=Math.sin(q*Math.PI);for(let i=0;i<6;i++){const a=i*TAU/6;spark(c,x+Math.cos(a)*(r+8+q*12),y+Math.sin(a)*(r+8+q*12),reveal.color,1);}c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle='#ffe5b0';c.fillText(reveal.name,x,y-r-22-q*8);}
 }c.restore();}
// Tint ONLY neutral metal pixels outside the face. Keeps the original full-body attack pose.
const variants=new WeakMap();
export function cardWeaponAtlas(image,key,p){const k=pick(p);if(!image||!k)return image;let cache=variants.get(image);if(!cache){cache=new Map();variants.set(image,cache);}const tier=Math.min(3,p?.fx?.[k]||1),id=key+':'+k+':'+tier;if(cache.has(id))return cache.get(id);const cv=document.createElement('canvas');cv.width=image.width;cv.height=image.height;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const d=c.getImageData(0,0,cv.width,cv.height),cell=key.includes('action')?96:64;const pal=CARD_PALETTES[k].map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
 const edges=[];
 for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const i=(y*cv.width+x)*4,a=d.data[i+3];if(a<128)continue;const xx=x%cell,yy=y%cell;
  const face=cell===96?xx>=32&&xx<=64&&yy>=35&&yy<=75:xx>=20&&xx<=43&&yy>=16&&yy<=48;
  if(key!=='tank-shield'&&face)continue;const rgb=[d.data[i],d.data[i+1],d.data[i+2]],hi=Math.max(...rgb),lo=Math.min(...rgb);if(hi-lo>45||hi<95)continue;
  if(hi>150&&(xx+yy)%5===0)edges.push([x,y]);const bright=tier>=2&&(xx+yy)%6===0;const color=pal[bright||hi>220?2:hi>150?1:0];for(let j=0;j<3;j++)d.data[i+j]=color[j];
 }c.putImageData(d,0,0);
 // Small crystals / dragon scale barbs follow the original metal silhouette.
 if(tier>=2&&key!=='gunner-pixel')for(const [x,y]of edges){for(const side of [-1,1]){const xx=x+side,yy=y-1;if(xx<0||xx>=cv.width||yy<0||d.data[(yy*cv.width+xx)*4+3]>0)continue;px(c,xx,yy,k==='ice'?2:1,k==='dragon'?2:1,CARD_PALETTES[k][1]);if(tier===3)px(c,xx,yy,1,1,CARD_PALETTES[k][2]);}}
 cache.set(id,cv);return cv;}
export function drawCardGun(c,p,muzzle,dir,scale,now){if(!p||!muzzle)return;const k=pick(p);if(!k&&!p._minigun)return;const pal=CARD_PALETTES[k]||['#4a4d65','#99afbd','#e6d8ab'];c.save();c.shadowBlur=0;c.translate(Math.round(muzzle.x),Math.round(muzzle.y));c.rotate(Math.atan2(dir.y,dir.x));c.scale(scale,scale);px(c,-9,-3,9,6,pal[0]);px(c,-9,-2,8,2,pal[1]);px(c,-3,-2,2,2,pal[2]);if(p._minigun){px(c,-11,-4,11,2,'#526375');px(c,-11,3,11,2,'#526375');px(c,-10,-1,8,2,pal[2]);}if(p._pixelShotAt&&now-p._pixelShotAt<70)spark(c,2,0,pal[2],1);c.restore();}
export function drawCardBullet(c,b,p,now,r=3){p=b.cardFx||p;const k=pick(p),pal=CARD_PALETTES[k]||['#695c40','#d4b471','#fff0ba'];c.save();c.shadowBlur=0;const trails=b.trail||[];for(let i=Math.max(0,trails.length-5);i<trails.length;i++){const q=trails[i];c.globalAlpha*=Math.max(0,q.life||0)*.45;px(c,q.x-1,q.y-1,2,2,pal[1]);c.globalAlpha=1;}if(k==='lightning'){c.fillStyle=b.crit?'#FFD43B':'#FAB005';c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy||0,b.vx||1));c.beginPath();c.moveTo(r*1.2,0);c.lineTo(r*.2,r*.5);c.lineTo(r*.5,0);c.lineTo(-r*.2,-r*.5);c.lineTo(r*.2,0);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.arc(0,0,r*.25,0,TAU);c.fill();c.restore();c.restore();return;}c.translate(Math.round(b.x),Math.round(b.y));c.rotate(Math.atan2(b.vy||0,b.vx||1));const s=Math.max(1,r/3);c.scale(s,s);
 const shape=k==='ice'?['....a..','..abba.','abcccba','..abba.','....a..']:k==='lightning'?['...aa..','..abb..','abbccaa','..bb...','.aa....']:k==='poison'?['..aa..','.abba.','abccba','abccba','.abba.','..aa..']:k==='star'?['...a...','...b...','..aba..','abbcbba','..aba..','...b...','...a...']:k==='fire'||k==='dragon'?['.a.....','..abb..','aabbcca','..abb..','.a.....']:b._armorPen?['....a..','...aba.','aabbcca','...aba.','....a..']:['..aaa..','aabbcca','..aaa..'];stamp(c,shape,{a:pal[0],b:pal[1],c:b.crit?'#fff':pal[2]},-4,-3,1);if(b.hm)spark(c,-6,0,'#d6a0bb',1);if(b._minigun)px(c,-8,-1,6,2,pal[1]);c.restore();}
export function drawCardStatus(c,e,now){c.save();c.shadowBlur=0;if(e.burnT>0){for(let i=0;i<3;i++)stamp(c,['..c..','.cbc.','abbaa','abbaa','.aaa.'],{a:'#aa4438',b:'#e7804e',c:'#ffd899'},e.x-e.r+i*e.r*.7,e.y+e.r-10-Math.round(Math.sin(now/120+i)*2),2);}if(e.st>0||e.frozen>0){for(let side of [-1,1])stamp(c,['..a..','.aba.','abcba','.aba.','..a..'],{a:'#577d9e',b:'#9bd4e5',c:'#e6fbff'},e.x+side*e.r-4,e.y+e.r-6,2);if(e.frozen>0){c.globalAlpha*=.7;ring(c,e.x,e.y,e.r+3,'#b8e7f0',0,.9);}}
 if(e._bleedEnd>now){stamp(c,['.a.','aba','aba','.a.'],{a:'#90404b',b:'#e8948e'},e.x+e.r-2,e.y+3,2);}
 if(e.poisonT>0){const yy=e.y-e.r-6-Math.floor(now/180)%3;stamp(c,['.aa.','abba','abba','.aa.','..b.'],{a:'#567b44',b:'#b2d47c'},e.x-4,yy,2);}c.restore();}
// Preserve the original smooth, double-stroke lightning; it intentionally is NOT pixel art.
export function drawCardLightning(c,l,quality=1,count=1){
 const jit=(count>60?7:10)*quality,jitter=()=>-jit+Math.random()*jit*2;
 const mx1=(l.x1*2+l.x2)/3+jitter(),my1=(l.y1*2+l.y2)/3+jitter();
 const mx2=(l.x1+l.x2*2)/3+jitter(),my2=(l.y1+l.y2*2)/3+jitter();
 c.save();c.shadowBlur=0;c.globalAlpha=l.life*.35;c.strokeStyle='#FFD43B';c.lineWidth=6;
 c.beginPath();c.moveTo(l.x1,l.y1);c.lineTo(mx1,my1);c.lineTo(mx2,my2);c.lineTo(l.x2,l.y2);c.stroke();
 c.globalAlpha=l.life*(quality<.6?.72:1);c.strokeStyle='#FAB005';c.lineWidth=2;
 c.beginPath();c.moveTo(l.x1,l.y1);c.lineTo(mx1,my1);c.lineTo(mx2,my2);c.lineTo(l.x2,l.y2);c.stroke();c.restore();
}
function dragon(c,dp,now,lv){const s=1.2+Math.min(3,lv)*.15;c.save();c.translate(Math.round(dp.x),Math.round(dp.y+Math.sin(now/300)*2));c.scale(dp.face||1,1);const flap=Math.floor(Math.sin(now/140)*2);stamp(c,['......aa','....aabb','..aabbbb','aabbbbba','.abccba.','..abbba.','...aa...'],{a:'#683d40',b:'#b46851',c:'#e9ae74'},-18,-17+flap,s);stamp(c,['..........aa....','.........aba....','.....aaaabbaa...','...aabbbbbbbba..','..abbbbcbbbbbba.','.abbbbcbbbbcbbba','abbbbcbbbbbccbaa','abbbbcbbbbbba...','.abbbcbbbbbba...','..abbbbbbbba....','...abbbbbba.....','....abbbba......','...abaaaa.......','..aa............'],{a:'#55363d',b:'#ce7650',c:'#f5bc76'},-12,-13,s);px(c,8*s,-8*s,2*s,2*s,'#fff0ab');px(c,9*s,-8*s,s,s,'#292336');stamp(c,['ab','ab','aa'],{a:'#563c42',b:'#edb57b'},-4,5,s);c.restore();}
export function drawCardWorld(c,g,now,r=18,phoenix=0){if(!g?.p)return;const p=g.p;c.save();c.shadowBlur=0;
 if(g._dragonPet){dragon(c,g._dragonPet,now,p._dragonBreath||p.fx?.dragon||1);const b=g._dragonBreathFx;if(b?.on){const dp=g._dragonPet,x=dp.x+(dp.face||1)*15,y=dp.y-14;for(let lane=-1;lane<=1;lane++)for(let i=0;i<22;i++){const q=i/22,d=b.range*q,shift=Math.sin(now/75-i)*2+lane*q*10;const xx=x+Math.cos(b.ang)*d-Math.sin(b.ang)*shift,yy=y+Math.sin(b.ang)*d+Math.cos(b.ang)*shift;c.globalAlpha=.9*(1-q);stamp(c,['.a.','aba','.a.'],{a:q>.5?'#c45b40':'#efa04f',b:q>.4?'#ffba65':'#fff0bf'},xx,yy,2+q*2);}}}
 c.globalAlpha=1;
 for(const w of g._wb||[]){c.save();c.globalAlpha*=Math.min(1,w.life/700);const a=now/160;cut(c,w.x,w.y,16,a,'#87c8cb');cut(c,w.x,w.y,11,a+Math.PI,'#e3f5dd');gem(c,w.x,w.y,'#a6d8cf',1);c.restore();}
 for(const b of g._booms||[]){c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(b.rot||0);stamp(c,['aaa.....','abca....','.abca...','..abcaaa','...abbba','....aaa.'],{a:'#344e59',b:'#73bca0',c:b.phase==='return'?'#fff4d2':'#d9edba'},-7,-7,2);c.restore();}
 const count=p.orbiters||0;for(let i=0;i<count;i++){const a=now/600+TAU*i/count;gem(c,p.x+Math.cos(a)*42,p.y+Math.sin(a)*42,'#d9b967',2);}
 for(const b of g._lightBeams||[]){const q=(now-b.t)/300;if(q<0||q>=1)continue;c.globalAlpha=1-q;for(let d=10;d<b.len;d+=5){px(c,(b.x??p.x)+Math.cos(b.ang)*d,(b.y??p.y)+Math.sin(b.ang)*d,3,3,'#f0c774');}spark(c,(b.x??p.x)+Math.cos(b.ang)*b.len,(b.y??p.y)+Math.sin(b.ang)*b.len,'#fff0bf',2);}
 c.globalAlpha=1;const ga=g._ghostArc;if(ga){const q=(now-ga.t)/250;if(q>=0&&q<1)cut(c,ga.x,ga.y,r*2.4,ga.ang,'#c3a1dc',1-q);}
 if(g._quakeRingT){const q=(now-g._quakeRingT)/(g._quakeRingSmall?400:800);if(q>=0&&q<1){c.globalAlpha=1-q;const rr=(g._quakeRingSmall?45:160)*q;ring(c,p.x,p.y+r,rr,'#ddaf70',0,.3);for(let i=0;i<8&&!g._quakeRingSmall;i++){const a=TAU*i/8;for(let d=6;d<rr;d+=5)px(c,p.x+Math.cos(a)*d+(d%11),p.y+r+Math.sin(a)*d*.35,3,2,'#9d6751');}}}
 c.globalAlpha=1;if(g._thornFlash){const q=(now-g._thornFlash)/300;if(q>=0&&q<1){c.globalAlpha=1-q;for(let i=0;i<8;i++){const a=i*TAU/8;gem(c,p.x+Math.cos(a)*(r+q*22),p.y+Math.sin(a)*(r+q*22),'#a6ce80',1);}}}
 c.globalAlpha=1;if(g.bhEnd>now){for(let arm=0;arm<3;arm++)for(let i=0;i<18;i++){const q=i/18,a=now/280+arm*TAU/3+q*4,rr=10+q*44;px(c,p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr*.65,3,2,i%3?'#71688c':'#d4c9d8');}stamp(c,['..aaa..','.abbba.','abbbbba','abbbbba','.abbba.','..aaa..'],{a:'#6a5b7d',b:'#211b32'},p.x-7,p.y-6,2);}
 if(g.mfEnd>now){const q=1-(g.mfEnd-now)/(p.mfDur||1500),rr=(g.mfR||200)*(1-q*.3);for(let i=0;i<12;i++){const a=i*TAU/12;const d=rr*(1-((now/750+i/12)%1));stamp(c,['a.a','aba','.b.'],{a:'#466c99',b:'#a0d7e5'},g.mfPx+Math.cos(a)*d-3,g.mfPy+Math.sin(a)*d-3,2);}c.globalAlpha=.6;ring(c,g.mfPx,g.mfPy,rr,'#6187b1');}
 if(g._cardTsEnd>now){c.globalAlpha=.5;for(let i=0;i<12;i++){const a=i*TAU/12;stamp(c,['aa','aa'],{a:'#b6dcea'},p.x+Math.cos(a)*70,p.y+Math.sin(a)*70,2);}ring(c,p.x,p.y,76,'#82afce');}
 if(phoenix>0){const q=1-phoenix/1.2;c.globalAlpha=Math.sin(Math.min(1,q)*Math.PI);drawPixelPhoenix(c,p.x,p.y-12-q*35,70+q*20,now);for(let i=0;i<8;i++){const a=i*TAU/8;spark(c,p.x+Math.cos(a)*(20+q*60),p.y+Math.sin(a)*(20+q*60),'#eab777',1);}}
 for(const hit of g._cardImpacts||[]){const q=(now-hit.at)/320;if(q<0||q>=1)continue;const pal=CARD_PALETTES[hit.kind]||CARD_PALETTES.fire;c.save();c.globalAlpha=1-q;const rr=5+q*(hit.kind==='explosion'?45:15);for(let i=0;i<6;i++){const a=i*TAU/6;const xx=hit.x+Math.cos(a)*rr,yy=hit.y+Math.sin(a)*rr;if(hit.kind==='ice')gem(c,xx,yy,pal[1],1);else if(hit.kind==='poison')stamp(c,['.a.','aba','.a.'],{a:pal[0],b:pal[1]},xx,yy,2);else spark(c,xx,yy,pal[1],1);}if(q<.4)spark(c,hit.x,hit.y,pal[2],2);c.restore();}
 c.restore();}
export function revealCard(player,card){if(player)player._cardReveal={at:performance.now(),name:card.n,color:card.c||'#dfc08b'};}

export function drawCardStrike(c,p,animation,now,r=18){if(!animation?.active||!p)return;const role=p.charType||'swordsman',duration=role==='assassin'?150:role==='tank'?280:320,q=(now-animation.startT)/duration;if(q<.18||q>.8||role==='tank')return;const key=pick(p),pal=CARD_PALETTES[key]||['#7e6150','#e3b67b','#ffeaca'],dir=p._ad||{x:0,y:1},a=Number.isFinite(animation.angle)?animation.angle:Math.atan2(dir.y,dir.x);const strength=Math.sin((q-.18)/.62*Math.PI);if(p.dblAtk)for(let i=0;i<3;i++)cut(c,p.x,p.y,r*2.5,a+i*TAU/3,pal[1],strength*.6);else{cut(c,p.x,p.y,r*(role==='assassin'?1.8:2.5),a-.6+q*1.2,pal[1],strength*.75);if(role==='assassin')cut(c,p.x,p.y,r*1.35,a+.4-q*.8,pal[2],strength*.7);}}

// The card selection artwork reuses the SAME objects as combat, rather than a generic symbol.
const cardPictures=new Map();
export function cardIllustration(card){card={...card,c:card.c||'#d8bc88'};if(cardPictures.has(card.id))return cardPictures.get(card.id);const cv=document.createElement('canvas');cv.width=96;cv.height=64;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;px(c,0,0,96,64,'#182333');px(c,3,3,90,58,'#243449');for(let y=7;y<59;y+=6)for(let x=7;x<91;x+=6)if((x+y)%3===0)px(c,x,y,1,1,'#354a5a');const n=card.n;
 if(/龍之/.test(n)){dragon(c,{x:48,y:34,face:1},0,3);stamp(c,['.aa.aa.','abbabba','abbbbba','.abbba.','..aba..','...a...'],{a:'#773b42',b:'#f1ad6a'},43,42,2);}
 else if(/天使之翼/.test(n)){wing(c,45,37,-1,0,false,1.4);wing(c,51,37,1,0,false,1.4);gem(c,48,35,'#f2d39b',2);ring(c,48,12,7,'#f0d7a2',0,.3);}
 else if(/不死鳥/.test(n))drawPixelPhoenix(c,48,35,50,0);
 else if(/黑洞|磁力|時間停止/.test(n)){drawCardWorld(c,{p:{x:48,y:32,mfDur:1500},bhEnd:/黑洞/.test(n)?100:0,mfEnd:/磁力/.test(n)?100:0,mfPx:48,mfPy:32,mfR:27,_cardTsEnd:/時間/.test(n)?100:0},0,10);}
 else if(/召喚/.test(n)){for(let i=0;i<3;i++)gem(c,48+Math.cos(i*TAU/3)*21,32+Math.sin(i*TAU/3)*18,'#dfbd72',2);}
 else if(/迴力鏢|旋風/.test(n))drawCardWorld(c,{p:{x:48,y:32},_booms:/迴力/.test(n)?[{x:48,y:32,rot:.5}]:[],_wb:/旋風/.test(n)?[{x:48,y:32,life:1000}]:[]},0,10);
 else if(/盾|鐵壁|石膚|意志|守護/.test(n)){stamp(c,['aaaaaaaaaaa','abbbbbbbbba','abcccccccba','abccdcdccba','abccdddccba','abccdcdccba','abcccccccba','.abcccccba.','..abcccba..','...abcba...','....aba....','.....a.....'],{a:'#354856',b:'#9bafaa',c:card.c,d:'#f5e4b3'},31,14,3);if(/荊棘/.test(n))for(let i=0;i<5;i++)stamp(c,['.a.','aba'],{a:'#436642',b:'#a6ce80'},24+i*9,47,2);}
 else if(/斬|刃|劍|拔刀|毒刺|穿透|箭/.test(n)){const key=/毒/.test(n)?'poison':/星|創世|無盡|光劍/.test(n)?'star':/殘影/.test(n)?'star':'ice';const pal=CARD_PALETTES[key];c.save();c.translate(48,32);c.rotate(.6);stamp(c,['..a..','.aba.','.bcb.','.bcb.','.bcb.','.bcb.','.bcb.','.bcb.','.bcb.','abbba','..a..','..a..','..b..'],{a:pal[0],b:pal[1],c:pal[2]},-6,-24,3);c.restore();cut(c,48,32,23,.5,card.c,.7);}
 else if(/火|焰|冰|雪|雷|彈|機關槍|弩|音速/.test(n)){const key=/冰|雪/.test(n)?'ice':/雷/.test(n)?'lightning':/火|焰/.test(n)?'fire':'star';drawCardGun(c,{fx:{[key]:2},_minigun:/機關/.test(n)?2:0},{x:66,y:34},{x:1,y:0},2,0);drawCardBullet(c,{x:76,y:33,vx:1,vy:0,crit:false},{fx:{[key]:2}},0,5);stamp(c,['aaaa','abba','abba','abba','.aa.'],{a:'#3b394b',b:'#b3926a'},38,34,3);}
 else if(/生命|回血|癒|堅韌|吸血|吞噬/.test(n)){stamp(c,['.aaa.aaa.','abbbabbba','abbbbbbba','.abbbbba.','..abbba..','...aba...','....a....'],{a:'#623f54',b:card.c},30,20,4);spark(c,67,44,'#ffe8b0',2);}
 else if(/時光|命運/.test(n)){stamp(c,['aaaaaaaaa','.bcccccb.','..bcccb..','...bcb...','....a....','...bcb...','..bcccb..','.bcccccb.','aaaaaaaaa'],{a:'#97734e',b:'#e3bd79',c:'#a6d5c0'},35,17,3);}
 else if(/影|虛空|斗篷/.test(n)){stamp(c,['....aaa....','...abbba...','..abbbbba..','.abbcccbba.','abccddcccba','abccddcccba','..abbbba...','.abbbbbbba.','abbbbbbbbba','aaaaaaaaaaa'],{a:'#352b4d',b:'#8b6aa7',c:'#b99acd',d:'#e5cfad'},32,17,3);}
 else {gem(c,48,30,card.c,4);for(let i=0;i<3;i++)spark(c,24+i*24,50,card.c,1);}
 px(c,5,5,12,1,'#c9ab75');px(c,5,5,1,10,'#c9ab75');px(c,79,58,12,1,'#c9ab75');px(c,90,49,1,10,'#c9ab75');const url=cv.toDataURL();cardPictures.set(card.id,url);return url;}

export function addCardImpact(g,x,y,source){if(!g)return;const kind=typeof source==='string'?source:pick(source);if(!kind||kind==='lightning')return;const now=performance.now();g._cardImpacts=(g._cardImpacts||[]).filter(h=>now-h.at<320).slice(-23);g._cardImpacts.push({x,y,kind,at:now});}
