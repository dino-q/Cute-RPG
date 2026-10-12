import { cardWeaponAtlas } from './card-vfx.js';
import { drawSpriteWithEyes } from './sprite-eyes.js';
// Directional bodies with continuous, hand-anchored weapon motion.
let atlas,contract,swordAtlas,swordContract,assassinAtlas,assassinContract,shieldAtlas;
export const assassinActionsReady=Promise.all([new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error("Cannot load assassin-action.png"));image.src=import.meta.env.BASE_URL+"assassin-action.png";}),fetch(import.meta.env.BASE_URL+"assassin-action.json").then(r=>{if(!r.ok)throw Error("Cannot load assassin-action.json");return r.json();})]).then(([image,data])=>{assassinAtlas=image;assassinContract=data;return true;}).catch(error=>{console.error("Assassin actions unavailable; using dual-dagger fallback.",error);return false;});
export const tankShieldReady=new Promise(resolve=>{const image=new Image();image.onload=()=>{shieldAtlas=image;resolve(true);};image.onerror=()=>{console.error("Cannot load tank-shield.png; using original shield.");resolve(false);};image.src=import.meta.env.BASE_URL+"tank-shield.png";});
export const swordActionsReady=Promise.all([new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error("Cannot load swordsman-action.png"));image.src=import.meta.env.BASE_URL+"swordsman-action.png";}),fetch(import.meta.env.BASE_URL+"swordsman-action.json").then(r=>{if(!r.ok)throw Error("Cannot load swordsman-action.json");return r.json();})]).then(([image,data])=>{swordAtlas=image;swordContract=data;return true;}).catch(error=>{console.error("Sword actions unavailable; using continuous weapon motion.",error);return false;});
// Visible shield bounds exclude detached generation scraps beside the actual shield.
const shieldBounds=[[26,20,5,24],[23,20,10,24],[25,20,13,24],[26,20,12,24],[26,20,4,24],[23,20,11,24],[24,20,15,24],[26,20,11,24]];
const models=new WeakMap();
export const meleeSpritesReady=Promise.all([
 new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Cannot load melee-pixel.png'));img.src=import.meta.env.BASE_URL+'melee-pixel.png';}),
 fetch(import.meta.env.BASE_URL+'melee-pixel.json').then(r=>{if(!r.ok)throw Error('Cannot load melee-pixel.json');return r.json();})
]).then(([image,data])=>{atlas=image;contract=data;return true;}).catch(error=>{console.error('Melee sprites unavailable; using original appearance.',error);return false;});
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function drawPixelMelee(ctx,role,x,y,r,direction,animation,player,fx,weapons,forceAim=false,travelDirection=null){
 if(!atlas||!contract?.roles[role])return false;
 const now=performance.now(),scale=r/18*1.25;
 const duration=role==='assassin'?150:role==='tank'?280:320;
 const elapsed=animation?.active?now-animation.startT:Infinity;
 const active=elapsed>=0&&elapsed<duration;
 const progress=active?clamp(elapsed/duration):0;
 const attackAngle=travelDirection?Math.atan2(travelDirection.y,travelDirection.x):Number.isFinite(animation?.angle)?animation.angle:Math.atan2(direction.y,direction.x);
 let model=player&&models.get(player);
 if(!model){model={angle:Math.PI/2,time:now,x,y};if(player)models.set(player,model);}
 const dt=Math.max(0,Math.min(.05,(now-model.time)/1000));
 const actualX=player?.x??x,actualY=player?.y??y;
 const dx=actualX-model.x,dy=actualY-model.y,moving=Math.hypot(dx,dy)>.08;
 const target=travelDirection?Math.atan2(travelDirection.y,travelDirection.x):active||forceAim?attackAngle:moving?Math.atan2(dy,dx):Math.PI/2;
 if(travelDirection)model.angle=target;
 model.angle+=angleDelta(model.angle,target)*Math.min(1,dt*(active?32:16));model.time=now;model.x=actualX;model.y=actualY;
 const index=((Math.round(model.angle/(Math.PI/4))%8)+8)%8;
 const actionAtlas=role==='swordsman'?swordAtlas:role==='assassin'?assassinAtlas:null;
 const actionContract=role==='swordsman'?swordContract:role==='assassin'?assassinContract:null;
 if(actionAtlas&&actionContract){
  // Each key pose animates hands, shoulders, stance AND the blade together.
  const lockedIndex=active?((Math.round(attackAngle/(Math.PI/4))%8)+8)%8:index;
  const row=active?(progress<.18?0:progress<.45?1:progress<.74?2:3):3;
  const frame=actionContract.frames[row*8+lockedIndex];
  const stride=active?Math.sin(progress*Math.PI)*2.5*scale:0;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowBlur=0;
  if(role==='assassin'&&((player?._shadowStrikeEnd||0)>now||(player?._shadowStepEnd||0)>now))ctx.globalAlpha*=.4;
  drawSpriteWithEyes(ctx,cardWeaponAtlas(actionAtlas,role+'-action',player),role==='swordsman'?'swordsman-action':'assassin-action',frame.x,frame.y,96,Math.round(x-48*scale+Math.cos(attackAngle)*stride),Math.round(y-56*scale+Math.sin(attackAngle)*stride),96*scale);
  ctx.restore();return true;
 }
 const frame=contract.roles[role][index];
 const wind=active&&progress<.2?ease(progress/.2):0;
 const strike=active&&progress>=.2&&progress<.65?ease((progress-.2)/.45):0;
 const recover=active&&progress>=.65?ease((progress-.65)/.35):0;
 const pulse=active?(progress<.2?-wind*.35:progress<.65?Math.sin(strike*Math.PI/2):1-recover):0;
 const push=pulse*(role==='assassin'?7:3)*scale;
 const bx=x+Math.cos(attackAngle)*push,by=y+Math.sin(attackAngle)*push;
 const lean=active?Math.cos(attackAngle)*pulse*.07:0;
 const left=bx-32*scale,top=by-40*scale;
 const handX=left+frame.hand[0]*scale,handY=top+frame.hand[1]*scale;
 const extension=active?Math.max(0,pulse)*(role==='assassin'?11:2)*scale:0;
 const pivotX=handX+Math.cos(attackAngle)*extension,pivotY=handY+Math.sin(attackAngle)*extension;
 const swing=active?(progress<.2?-.4-wind*1.1:progress<.65?-1.5+strike*2.7:1.2*(1-recover)):-.45;
 const weaponAngle=(active?attackAngle:model.angle)+(role==='swordsman'?swing:0);
 const hidden=role==='assassin'&&((player?._shadowStrikeEnd||0)>now||(player?._shadowStepEnd||0)>now);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowBlur=0;if(hidden)ctx.globalAlpha*=.4;
 const drawBody=()=>{ctx.save();ctx.translate(bx,by);ctx.rotate(lean);drawSpriteWithEyes(ctx,atlas,'melee-pixel',frame.x,frame.y,64,-32*scale,-40*scale,64*scale);ctx.restore();};
 const drawArm=()=>{ctx.save();ctx.strokeStyle='#efb789';ctx.lineWidth=(role==='tank'?1.5:3)*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(pivotX,pivotY);ctx.stroke();ctx.restore();};
 const drawWeapon=()=>{
  // Tank forearm is short and sits BEHIND the shield, including south-facing attacks.
  if(role==='tank')drawArm();
  ctx.save();ctx.translate(pivotX,pivotY);ctx.rotate(weaponAngle+(role==='tank'?0:Math.PI/2));
  if(role==='swordsman')weapons.sword(ctx);
  else if(role==='tank'){
   ctx.rotate(-weaponAngle);
   const shieldScale=.75*scale;
   if(shieldAtlas){const [sx,sy,sw,sh]=shieldBounds[index];ctx.drawImage(cardWeaponAtlas(shieldAtlas,'tank-shield',player),index*64+sx,sy,sw,sh,-sw*shieldScale/2,-sh*shieldScale/2,sw*shieldScale,sh*shieldScale);}
   else{ctx.scale(.4125*scale,.4125*scale);weapons.shield(ctx);}
  }
  else {ctx.scale(scale,scale);ctx.fillStyle=fx.poison?'#9bd78b':'#e4d9f5';ctx.fillRect(-1,-17,3,15);ctx.fillStyle='#9586ae';ctx.fillRect(2,-14,1,12);ctx.fillStyle='#d4aff5';ctx.fillRect(-4,-2,9,2);ctx.fillStyle='#46304d';ctx.fillRect(-1,0,3,5);ctx.translate(-9,5);ctx.rotate(.55);ctx.fillStyle=fx.poison?'#9bd78b':'#e4d9f5';ctx.fillRect(-1,-14,3,12);ctx.fillStyle='#d4aff5';ctx.fillRect(-4,-2,9,2);ctx.fillStyle='#46304d';ctx.fillRect(-1,0,3,4);}
  ctx.restore();
  if(role!=='tank')drawArm();
 };
 if(Math.sin(model.angle)<-.15){drawWeapon();drawBody();}else{drawBody();drawWeapon();}
 if(role==='tank'&&active&&progress>.2&&progress<.6){
  // One crisp impact rim, attached to the shield push. No filled haze or duplicate trail.
  const impact=(progress-.2)/.4;
  ctx.save();ctx.globalAlpha*=Math.sin(impact*Math.PI)*.7;ctx.shadowBlur=0;ctx.strokeStyle=fx.fire?'#f6a35a':fx.ice?'#9ad5ed':'#d7edbf';ctx.lineWidth=Math.max(1,Math.round(scale));
  const allAround=(player?.dblAtk||0)>=1;
  const rim=allAround?r*3:r*.6;
  ctx.beginPath();ctx.arc(allAround?bx:pivotX,allAround?by:pivotY,rim,allAround?0:attackAngle-.65,allAround?Math.PI*2:attackAngle+.65);ctx.stroke();ctx.restore();
 }
 if(role!=='tank'&&active&&progress>.2&&progress<.75){
  ctx.save();ctx.globalAlpha*=Math.sin(clamp((progress-.2)/.55)*Math.PI)*.65;ctx.strokeStyle=fx.fire?'#f6a35a':fx.ice?'#9ad5ed':role==='assassin'?'#d4aff5':'#ffe0a3';ctx.lineWidth=role==='assassin'?2:3;
  ctx.beginPath();if(role==='assassin'){ctx.moveTo(pivotX,pivotY);ctx.lineTo(pivotX+Math.cos(attackAngle)*r*1.8,pivotY+Math.sin(attackAngle)*r*1.8);}else{ctx.arc(handX,handY,r*1.7,weaponAngle-.7,weaponAngle+.25);}ctx.stroke();ctx.restore();
 }
 ctx.restore();return true;
}
