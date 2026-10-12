
import {artFrame,drawMountedArt} from './generated-art.js';
import {legendProfile} from './legend-card-art.js';
const rows={steel:0,fire:1,ice:2,lightning:3,poison:4,dragon:5,star:6,whirl:7};
export function weaponStyle(p){
 return p?._lightSaber?'star':p?.fx?.dragon?'dragon':['star','fire','ice','lightning','poison','whirl'].find(k=>p?.fx?.[k]||(k==='poison'&&p?._poisonBlade))||
 (p?.thorns?'thorn':p?._guardAura?'star':p?._qiEvery?'ice':p?._drawSlash||p?._ironWill?'steel':p?._roleCards?.['致命打擊']?'star':p?._atkDodge?'whirl':null);
}
const swordGrips=[[34,84],[39,86],[40,85],[41,85],[40,84],[41,87],[40,85],[38,90]];
const swordTips=[[108,12],[105,10],[105,11],[102,11],[106,12],[106,11],[106,11],[108,12]];
const daggerGrips=[[49,94],[51,94],[51,95],[50,95],[52,94],[52,96],[51,94],[52,94]];
const daggerTips=[[94,13],[92,13],[93,13],[94,13],[89,12],[90,13],[91,14],[103,15]];
export function drawRiggedWeapons(c,p,frame,pose,front=false){
 if(p&&frame?.weapons?.[0]){const m=frame.weapons[0];actorWeaponPoses.set(p,{x:pose.left+m.grip[0]*pose.scale,y:pose.top+m.grip[1]*pose.scale,ownerX:p.x,ownerY:p.y});}
 const style=weaponStyle(p),legend=legendProfile(p);if((!style&&!legend)||!frame?.weapons)return;
 for(const m of frame.weapons){
  if(m.back===front)continue;
  const grip=[pose.left+m.grip[0]*pose.scale,pose.top+m.grip[1]*pose.scale],tip=[pose.left+m.tip[0]*pose.scale,pose.top+m.tip[1]*pose.scale];
  const row=rows[style]||0;
  if(legend){const f=artFrame(legend.group,legend.blade);if(!f)continue;const b=f.bounds,y=(b[1]+b[3])/2;
   drawMountedArt(c,legend.group,legend.blade,grip,tip,{grip:[b[0],y],tip:[b[2],y]});}
  else{const dagger=m.kind==='dagger';drawMountedArt(c,dagger?'dagger-single':'weapon-variants',dagger?row:row*4+1,grip,tip,{grip:dagger?daggerGrips[row]:swordGrips[row],tip:dagger?daggerTips[row]:swordTips[row],crop:[0,0,128,113]});}
 }
}
export function gunRigSpec(p){
 const style=weaponStyle(p),barrage=p?._roleCards?.['彈幕之王'];
 if(!style&&!p?._minigun&&!p?._crossbow&&!barrage&&!legendProfile(p))return null;
 const arsenal=!!(p._minigun||p._crossbow||barrage),index=arsenal?(p._minigun?Math.min(2,p._minigun-1):barrage?2:3):(rows[style]||0)*4;
 return {group:arsenal?'arsenal':'weapon-variants',index,grip:arsenal?[[34,76],[32,82],[30,83],[33,73]][index]:[35,77],muzzle:arsenal?[[115,49],[116,62],[116,59],[117,82]][index]:[116,43],width:p._minigun?27:p._crossbow?25:23};
}
export function gunRigPlacement(p,frame,left,top,scale,index){
 const spec=gunRigSpec(p);if(!spec||!frame.gun)return null;
 const a=index*Math.PI/4,mirror=Math.cos(a)<-.001,k=spec.width/128*scale,gx=left+frame.gun.grip[0]*scale,gy=top+frame.gun.grip[1]*scale;
 const dx=(spec.muzzle[0]-spec.grip[0])*k,dy=(spec.muzzle[1]-spec.grip[1])*k*(mirror?-1:1);
 return {spec,x:gx,y:gy,scale:k,angle:a,mirror,back:frame.gun.back,muzzle:{x:gx+Math.cos(a)*dx-Math.sin(a)*dy,y:gy+Math.sin(a)*dx+Math.cos(a)*dy}};
}
export function drawRiggedGun(c,rig){
 if(!rig)return;
 const s=rig.spec;drawMountedArt(c,s.group,s.index,[rig.x,rig.y],[rig.muzzle.x,rig.muzzle.y],{grip:s.grip,tip:s.muzzle,mirrorY:rig.mirror,crop:[0,0,128,113]});
}

const handMasks=new WeakMap();
export function drawRiggedHands(c,image,p,frame,pose){
 if(!weaponStyle(p)&&!legendProfile(p)&&!gunRigSpec(p))return;
 const mounts=frame.weapons?.map(m=>m.grip)||(frame.gun?[frame.gun.grip]:[]);if(!mounts.length)return;
 let frames=handMasks.get(image);if(!frames){frames=new Map();handMasks.set(image,frames);}
 const id=frame.x+':'+frame.y;let mask=frames.get(id);
 if(!mask){mask=document.createElement('canvas');mask.width=mask.height=pose.cell;const mc=mask.getContext('2d',{willReadFrequently:true});mc.drawImage(image,frame.x,frame.y,pose.cell,pose.cell,0,0,pose.cell,pose.cell);const data=mc.getImageData(0,0,pose.cell,pose.cell);
  for(let y=0;y<pose.cell;y++)for(let x=0;x<pose.cell;x++){const i=(y*pose.cell+x)*4,r=data.data[i],g=data.data[i+1],b=data.data[i+2];if(!(r>155&&g>95&&b>55&&r>g*1.12&&g>b*1.05&&mounts.some(([gx,gy])=>Math.hypot(x-gx,y-gy)<=3)))data.data[i+3]=0;}mc.putImageData(data,0,0);frames.set(id,mask);}
 c.save();c.imageSmoothingEnabled=false;c.drawImage(mask,pose.left,pose.top,pose.cell*pose.scale,pose.cell*pose.scale);c.restore();
}

const actorWeaponPoses=new WeakMap();
export function weaponPoseFor(player){return player&&actorWeaponPoses.get(player);}
