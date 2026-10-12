import {recordRoleEffect} from './role-card-art.js';
import {generatedArtReady,drawArt} from './generated-art.js';
import {bossArtReady,endingArtReady,drawBossArt,drawBossEndingFrame} from './boss-art.js';
import {drawPixelMelee,meleeSpritesReady,swordActionsReady,assassinActionsReady,tankShieldReady} from './melee-sprite.js';
import {drawPixelGunner,gunnerSpriteReady,getGunnerMuzzle} from './gunner-sprite.js';
import {drawCardBullet,drawCardWorld,drawCardGround,drawCardPlayerLayer,drawCardStrike,drawCardGun,drawGhostSlash,cardIllustration} from './card-vfx.js';
import {drawTreasure} from './treasure-art.js';
import {C} from './cards.js';
const $=id=>document.getElementById(id);
const actor=$('actor').getContext('2d'),bosses=$('bosses').getContext('2d'),ending=$('ending').getContext('2d');
let angle=Math.PI/2,bossAngle=Math.PI/2,attackAt=-1e5,bossAttackUntil=0,deathAt=-1e5,chestAt=-1e5,endAt=null,endType=30;
const player={x:260,y:136,charType:'swordsman',face:1,fx:{},hp:100,maxHp:100};
const scene={p:player};
let selectedClass=null;
function selectClass(){
 const cards=C.filter(c=>c.charReq===$('role').value);$('classCard').innerHTML='<option value="">職業專用卡：無</option>'+cards.map(c=>'<option value="'+c.id+'">'+c.n+'</option>').join('');applyClass();
}
function applyClass(){
 for(const key of Object.keys(player))delete player[key];Object.assign(player,{x:260,y:136,charType:$('role').value,face:1,fx:{},hp:100,maxHp:100,atk:10,fr:1,crit:.05,armor:0,pierce:0,spread:0,homing:0,ls:0});selectedClass=C.find(c=>c.id===Number($('classCard').value))||null;selectedClass?.ap[0](player);scene._roleEffects=[];scene._lightBeams=[];scene._ghostShadow=null;scene._ghostArc=null;attackAt=-1e5;$('classHint').textContent=selectedClass?selectedClass.n+'：'+selectedClass.d[0]+'。按攻擊查看外觀與觸發示意；遊戲仍依原本條件觸發。':'選一張職業專用卡，再按「揮擊／射擊」看觸發示意。';
}
$('role').onchange=selectClass;$('classCard').onchange=applyClass;selectClass();
const dscene={p:{fx:{dragon:3},_dragonBreath:3},_dragonPet:{x:665,y:126,face:1,breathCycle:0},_dragonBreathFx:{on:false,range:115,arc:.55,ang:0}};
const emptyWeapons={sword:()=>{},shield:()=>{}};
function hero(c,x,y,r,role,dir,animation,p=player){if(role==='gunner')drawPixelGunner(c,x,y,r,dir,animation.active?animation.startT:0,p);else drawPixelMelee(c,role,x,y,r,dir,animation,p,p.fx,emptyWeapons,true,dir);}
$('turn').onclick=()=>angle+=Math.PI/4;
$('attack').onclick=()=>{
 attackAt=performance.now();player._pixelShotAt=attackAt;player._swordQiCount=(player._swordQiCount||0)+1;
 const name=selectedClass?.n;
 if(name==='拔刀術')recordRoleEffect(scene,'draw',player.x,player.y,angle,{range:125});
 if(name==='劍氣強化')recordRoleEffect(scene,'qi',player.x,player.y,angle,{range:125,level:1});
 if(name==='達摩的光劍')scene._lightBeams=[-.25,0,.25].map(a=>({x:player.x,y:player.y,ang:angle+a,len:200,t:attackAt}));
 if(name==='殘影斬'){$('ghost').onclick();}
 const events={'大地震擊':'quake','荊棘之盾':'thorns','鋼鐵意志':'ironwill','致命打擊':'critical','毒刃':'poison','暗影步':'shadow','連環殺戮':'chainkill','音速投擲':'sonic'};
 if(events[name])recordRoleEffect(scene,events[name],player.x+Math.cos(angle)*45,player.y+Math.sin(angle)*45,angle);
 if(name==='鋼鐵意志')player._iwActive=true;
 if(name==='暗影步')player._shadowStepEnd=attackAt+1000;
 if(name==='連環殺戮')player._killSpeedEnd=attackAt+1000;
};
$('ghost').onclick=()=>{if($('role').value!=='swordsman')$('role').value='swordsman';attackAt=performance.now();scene._ghostShadow={x:player.x,y:player.y,ang:angle,t:attackAt,life:1,face:1,player:{fx:{...player.fx},charType:'swordsman'}};scene._ghostArc={x:player.x,y:player.y,ang:angle,t:attackAt+150};};
$('bossTurn').onclick=()=>bossAngle+=Math.PI/4;
$('bossAtk').onclick=()=>bossAttackUntil=performance.now()+900;
$('bossDeath').onclick=()=>deathAt=performance.now();
$('chestOpen').onclick=()=>chestAt=performance.now();
$('endPlay').onclick=()=>{endAt=performance.now();endType=30;};
$('endPoo').onclick=()=>{endAt=performance.now();endType=20;};
$('endStop').onclick=()=>endAt=null;
function frame(now){
 const role=$('role').value,theme=$('theme').value;player.charType=role;player.fx=theme==='armor'?{}:theme?{[theme]:3}:{};player.projImmune=theme==='armor';scene.bhEnd=theme==='blackhole'?now+1000:0;const dir={x:Math.cos(angle),y:Math.sin(angle)},anim={active:now-attackAt<320,startT:attackAt,angle,_qiSpin:selectedClass?.n==='劍氣強化'};
 actor.clearRect(0,0,960,230);actor.fillStyle='#27394c';actor.fillRect(0,178,960,1);drawCardGround(actor,scene,now);drawCardPlayerLayer(actor,player,player.x,player.y,23,now,false);hero(actor,player.x,player.y,23,role,dir,anim);
 drawGhostSlash(actor,scene,now,23,(x,y,r,t,col,face,p,opts)=>hero(actor,x,y,r,'swordsman',opts.travelDirection,opts.animation,p));
 drawCardPlayerLayer(actor,player,player.x,player.y,23,now,true);
 if(role==='gunner'&&now-attackAt>=0&&now-attackAt<650){const age=(now-attackAt)/650,m=getGunnerMuzzle(player.x,player.y,23,dir,attackAt);if(m)for(const spread of player._roleCards?.['分裂彈']||player._roleCards?.['彈幕之王']?[-.22,0,.22]:[0]){const a=angle+spread;drawCardBullet(actor,{x:m.x+Math.cos(a)*age*140,y:m.y+Math.sin(a)*age*140,vx:Math.cos(a),vy:Math.sin(a),hm:player.homing,cardFx:player,_minigun:player._minigun},scene,now,4);}}
 drawCardStrike(actor,player,anim,now,23);drawCardWorld(actor,scene,now,23);
 dscene._dragonPet.x=665+Math.cos(now/1600)*35;dscene._dragonPet.y=126+Math.sin(now/1600)*20;dscene._dragonPet.breathCycle=now%3500;dscene._dragonBreathFx.on=now%3500<2000;dscene._dragonBreathFx.ang=angle;drawCardWorld(actor,dscene,now,23);
 actor.fillStyle='#bac9ce';actor.font='14px sans-serif';actor.textAlign='center';actor.fillText('人物與武器',260,210);actor.fillText('龍之心：飛行、振翅、噴火',665,210);
 bosses.clearRect(0,0,960,280);
 for(const [type,x]of [[20,200],[30,485]]){const age=now-deathAt;if(age>=0&&age<1600)drawArt(bosses,type===20?'sludge-defeat':'devil-defeat',Math.min(5,Math.floor(age/260)),x,140,200,200,{fullCell:true});else drawBossArt(bosses,{stageBoss:type,x,y:140,r:80,_artAngle:bossAngle,_artAttackUntil:bossAttackUntil},now,x,140,200);}
 const age=now-chestAt;if(age>=0&&age<1800)drawArt(bosses,'chest-art',Math.min(3,Math.floor(age/130)),780,145,120,120,{fullCell:true});else drawTreasure(bosses,{x:780,y:145,bigChest:true,hits:0,needed:10},now);
 bosses.fillStyle='#d1c3a5';bosses.font='15px sans-serif';bosses.textAlign='center';bosses.fillText('污泥王',200,255);bosses.fillText('燼角魔王',485,255);bosses.fillText('寶箱',780,255);
 const t=endAt===null?0:Math.min(9.5,(now-endAt)/1000);drawBossEndingFrame(ending,endType,t,960,540,(c,x,y,r,seconds,front)=>hero(c,x,y,r,role,front?{x:0,y:1}:{x:0,y:-1},{active:false},{charType:role,fx:{}}));
 requestAnimationFrame(frame);
}
Promise.all([generatedArtReady,bossArtReady,endingArtReady,gunnerSpriteReady,meleeSpritesReady,swordActionsReady,assassinActionsReady,tankShieldReady]).then(()=>{
$('cards').innerHTML=C.map(card=>'<div class="card"><img alt="" src="'+cardIllustration(card)+'"><div>'+card.n+'</div></div>').join('');
requestAnimationFrame(frame);
});
