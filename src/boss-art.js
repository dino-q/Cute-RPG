import {drawArt,directionIndex,generatedArtReady} from './generated-art.js';
export const bossArtReady=generatedArtReady;
export const bossName=type=>Number(type)===20?'污泥王':'燼角魔王';
export function drawBossArt(c,e,now,x=e.x,y=e.y,size=e.r*2.3){
 const type=e.stageBoss===20||e.miniPoo||e.ragePoo?'sludge':'devil';
 const a=Number.isFinite(e._artAngle)?e._artAngle:(e.face<0?Math.PI:Math.PI/2);
 const casting=(e._artAttackUntil||0)>now||['pulse_warn','pulse_boom','dash'].includes(e._p3cycle);
 const dir=directionIndex(a),group=type+(casting?'-attack':'-idle');
 const minion=!!(e.miniPoo||e.miniDemon||e.ragePoo);
 if(minion){if(e._artLastHp!==undefined&&e.hp<e._artLastHp)e._artHitUntil=now+110;e._artLastHp=e.hp;}
 const bounce=e.miniPoo||e.miniDemon?Math.sin(now/180+(e.t||0))*1:Math.sin(now/320)*.8;
 drawArt(c,group,dir,x,y+bounce,size,size,{fullCell:!minion,outline:minion?'#c1ce88':null,brightness:minion?(e._artHitUntil>now?20:1.2):1,alpha:1});
 if((e._spawnShield||0)>now)drawArt(c,'guardian',2,x,y,size*.82,size*.82,{alpha:.65});
 if(type==='devil'&&e.sbPhase>=2)drawArt(c,'fire',4,x,y+size*.26,size*.55,size*.24,{alpha:e.sbPhase===3?.75:.45});
}
export function drawBossDefeats(c,g,now){
 for(const e of g?._bossDefeats||[]){const q=(now-e.at)/1500;if(q<0||q>=1)continue;
 drawArt(c,e.type===20?'sludge-defeat':'devil-defeat',Math.min(5,Math.floor(q*6)),e.x,e.y,e.size,e.size,{fullCell:true,alpha:q>.85?(1-q)/.15:1});}
}
let dark=null,restored=null;
function image(name){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Cannot load '+name));im.src=import.meta.env.BASE_URL+name;});}
export const endingArtReady=Promise.all([bossArtReady,image('ending-hall-dark.png'),image('ending-hall-restored.png')]).then(([,a,b])=>{dark=a;restored=b;return true;}).catch(error=>{console.error('Ending artwork unavailable.',error);return false;});
function cover(c,im,w,h){if(!im)return;const s=Math.max(w/im.width,h/im.height);c.drawImage(im,(w-im.width*s)/2,(h-im.height*s)/2,im.width*s,im.height*s);}
export function drawBossEndingFrame(c,type,seconds,w,h,drawHero){
 const t=Math.max(0,seconds),q=Math.max(0,Math.min(1,(t-3.6)/2.5));c.save();c.clearRect(0,0,w,h);c.fillStyle='#101520';c.fillRect(0,0,w,h);cover(c,dark,w,h);
 c.globalAlpha=q;cover(c,restored,w,h);c.globalAlpha=1;
 const scale=Math.min(w/960,h/540),x=w/2,y=h*.56,size=190*scale;
 if(t<1)drawBossArt(c,{stageBoss:type,x,y,r:0,face:1,_artAngle:Math.PI/2},t*1000,x,y,size);
 else if(t<5.2)drawArt(c,type===20?'sludge-defeat':'devil-defeat',Math.min(5,Math.floor((t-1)/.65)),x,y,size,size,{fullCell:true,alpha:t>4.5?(5.2-t)/.7:1});
 if(t>2.5&&t<5.8){const a=Math.max(0,Math.sin(Math.min(1,(t-2.5)/3.3)*Math.PI));drawArt(c,'star',6,x,y-10*scale,220*scale,220*scale,{alpha:a*.7,angle:t*.1});}
 // Chosen hero advances into the restored hall, then faces the player.
 if(t>4.5&&drawHero){const move=Math.min(1,(t-4.5)/2);drawHero(c,x,h*(.91-.16*move),25*scale,t,move>=1);}
 if(t>6.7){const a=Math.min(1,(t-6.7)/.8);c.globalAlpha=a;const grad=c.createLinearGradient(0,h*.08,0,h*.36);grad.addColorStop(0,'rgba(12,18,29,0)');grad.addColorStop(.5,'rgba(12,18,29,.8)');grad.addColorStop(1,'rgba(12,18,29,0)');c.fillStyle=grad;c.fillRect(0,h*.08,w,h*.3);
 c.fillStyle='#fff1c8';c.textAlign='center';c.font='900 '+Math.max(22,44*scale)+'px sans-serif';c.fillText('黎明歸來',x,h*.21);
 c.fillStyle='#f2d9a1';c.font=Math.max(12,17*scale)+'px sans-serif';c.fillText(type===20?'污泥已淨化，旅程仍在繼續':'燼角魔王的核心消散，黑暗終於退去',x,h*.28);}
 c.restore();
}
