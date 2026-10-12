import {drawArt,directionIndex} from './generated-art.js';
// Called inside the sprite placement, using the exact current body frame.
export function drawAttachedCardLayer(c,p,pose,now,front=false){
 if(!p||pose.effects===false)return;
 const s=pose.scale,[tx,ty,tw,th]=pose.torso||[pose.cell/2,pose.cell*.77,13,8];
 const x=pose.left+tx*s,y=pose.top+(ty-th*.35)*s,dir=pose.direction;
 const a=dir*Math.PI/4,backX=x-Math.cos(a)*2*s,backY=y-Math.sin(a)*s;
 if(p.invCD&&p._inv){
  const frame=Math.floor(now/140)%4*8+dir;
  if(!front)drawArt(c,'angel-attached',frame,backX,backY,110*s,110*s,{fullCell:true});
  else if(Math.sin(a)<-.3){
   c.save();c.beginPath();c.rect(x-40*s,y-2*s,80*s,28*s);c.clip();
   drawArt(c,'angel-attached',frame,backX,backY,110*s,110*s,{fullCell:true});c.restore();
  }
 }
 if(!front&&(p._shadowStepEnd>now||p._shadowStrikeEnd>now))
  drawArt(c,'arcane',7,backX,backY+5*s,32*s,17*s,{angle:Math.cos(a)*.18,alpha:.48});
 if(front&&p._sh)drawArt(c,'guardian',1,x+Math.cos(a)*3*s,y+4*s,tw*s*1.5,th*s*1.5,{alpha:.45});
 if(front&&(p._mgBerserkEnd>now||p.berserk&&p.hp<p.maxHp*p.berserk))
  drawArt(c,'vital',3,x,y+6*s,18*s,13*s,{alpha:.72});
}
