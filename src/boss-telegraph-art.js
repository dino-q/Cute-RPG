import {drawArt} from './generated-art.js';
const clamp=v=>Math.max(0,Math.min(1,v));
export function drawBossRoute(c,group,row,a,b,width,phase,alpha=1){
 const angle=Math.atan2(b.y-a.y,b.x-a.x),length=Math.hypot(b.x-a.x,b.y-a.y);
 drawArt(c,group,row+Math.min(3,Math.max(0,phase)),a.x-Math.cos(angle)*width/2,a.y-Math.sin(angle)*width/2,length+width,width,{stretch:true,angle,anchorX:0,alpha});
}
export function drawBossPulseGround(c,e,now){
 if(e.stageBoss!==30)return;
 if(e._teleExe>now){
  const q=clamp(1-(e._teleExe-now)/1000);
  drawArt(c,'dark-pulse',Math.min(3,Math.floor(q*4)),e._teleLandX,e._teleLandY,e.r*2.2,e.r*2.2,{stretch:true,alpha:.65+.3*q});
  c.save();c.fillStyle='#f2c9fc';c.textAlign='center';c.font='bold 11px sans-serif';c.fillText('瞬移落點',e._teleLandX,e._teleLandY-e.r-10);c.restore();
 }
 if(e._dashChargeEnd>now&&Number.isFinite(e._dashAimAngle)){
  const a=e._dashAimAngle;
  drawBossRoute(c,'devil-route',0,{x:e.x,y:e.y},{x:e.x+Math.cos(a)*168,y:e.y+Math.sin(a)*168},e.r*1.6,Math.min(3,Math.floor((1-(e._dashChargeEnd-now)/650)*4)),.9);
 }
 const warn=e._p3cycle==='pulse_warn',boom=e._p3cycle==='pulse_boom';
 if(!warn&&!boom)return;
 const q=clamp((now-e._p3t)/(warn?2000:1000));
 // An invisible clipping mask keeps the entire true 150-unit safe interior clear.
 c.save();c.beginPath();c.rect(-10000,-10000,20000,20000);c.moveTo(e.x+150,e.y);c.arc(e.x,e.y,150,0,Math.PI*2);c.clip('evenodd');
 if(warn){
  drawArt(c,'dark-pulse',Math.min(3,Math.floor(q*4)),e.x,e.y,370,370,{stretch:true,alpha:.5+.35*q});
 }else{
  const row=q<.55?4:8,phase=Math.min(3,Math.floor((q<.55?q/.55:(q-.55)/.45)*4));
  // All visible outside space erupts together: no gaps suggesting a dodgeable projectile.
  for(let i=0;i<6;i++){const radius=170+i*170+q*110;drawArt(c,'dark-pulse',row+phase,e.x,e.y,radius*2,radius*2,{stretch:true,alpha:(1-q)*(.8-i*.055)});}
 }
 c.restore();
 drawArt(c,'dark-pulse',12+Math.floor(now/180)%4,e.x,e.y,300,300,{stretch:true,alpha:warn?.9:1-q*.5});
 c.save();c.fillStyle='#bcffea';c.textAlign='center';c.font='bold 12px sans-serif';c.fillText('圈內安全・圈外衝擊',e.x,e.y+142);c.restore();
}
