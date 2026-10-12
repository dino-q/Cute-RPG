import {generatedArtReady,drawArt} from './generated-art.js';
import {bossArtReady,endingArtReady,drawBossArt,drawBossEndingFrame} from './boss-art.js';
import {drawPixelMelee,meleeSpritesReady,swordActionsReady,assassinActionsReady,tankShieldReady} from './melee-sprite.js';
import {drawPixelGunner,gunnerSpriteReady,getGunnerMuzzle} from './gunner-sprite.js';
import {drawCardWorld,drawCardStrike,drawCardGun,drawGhostSlash,cardIllustration} from './card-vfx.js';
import {drawTreasure} from './treasure-art.js';
import {C} from './cards.js';
const $=id=>document.getElementById(id);
const actor=$('actor').getContext('2d'),bosses=$('bosses').getContext('2d'),ending=$('ending').getContext('2d');
let angle=0,bossAngle=Math.PI/2,attackAt=-1e5,bossAttackUntil=0,deathAt=-1e5,chestAt=-1e5,endAt=null,endType=30;
const player={x:260,y:136,charType:'swordsman',face:1,fx:{},hp:100,maxHp:100};
const scene={p:player};
const dscene={p:{fx:{dragon:3},_dragonBreath:3},_dragonPet:{x:665,y:126,face:1,breathCycle:0},_dragonBreathFx:{on:false,range:115,arc:.55,ang:0}};
const emptyWeapons={sword:()=>{},shield:()=>{}};
function hero(c,x,y,r,role,dir,animation,p=player){if(role==='gunner')drawPixelGunner(c,x,y,r,dir,animation.active?animation.startT:0,p);else drawPixelMelee(c,role,x,y,r,dir,animation,p,p.fx,emptyWeapons,true,dir);}
$('turn').onclick=()=>angle+=Math.PI/4;
$('attack').onclick=()=>attackAt=performance.now();
$('ghost').onclick=()=>{if($('role').value!=='swordsman')$('role').value='swordsman';attackAt=performance.now();scene._ghostShadow={x:player.x,y:player.y,ang:angle,t:attackAt,life:1,face:1,player:{fx:{...player.fx},charType:'swordsman'}};scene._ghostArc={x:player.x,y:player.y,ang:angle,t:attackAt+150};};
$('bossTurn').onclick=()=>bossAngle+=Math.PI/4;
$('bossAtk').onclick=()=>bossAttackUntil=performance.now()+900;
$('bossDeath').onclick=()=>deathAt=performance.now();
$('chestOpen').onclick=()=>chestAt=performance.now();
$('endPlay').onclick=()=>{endAt=performance.now();endType=30;};
$('endPoo').onclick=()=>{endAt=performance.now();endType=20;};
$('endStop').onclick=()=>endAt=null;
function frame(now){
 const role=$('role').value,theme=$('theme').value;player.charType=role;player.fx=theme?{[theme]:3}:{};const dir={x:Math.cos(angle),y:Math.sin(angle)},anim={active:now-attackAt<320,startT:attackAt,angle};
 actor.clearRect(0,0,960,230);actor.fillStyle='#27394c';actor.fillRect(0,178,960,1);hero(actor,player.x,player.y,23,role,dir,anim);
 drawGhostSlash(actor,scene,now,23,(x,y,r,t,col,face,p,opts)=>hero(actor,x,y,r,'swordsman',opts.travelDirection,opts.animation,p));
 drawCardStrike(actor,player,anim,now,23);drawCardWorld(actor,scene,now,23);
 dscene._dragonPet.x=665+Math.cos(now/1600)*35;dscene._dragonPet.y=126+Math.sin(now/1600)*20;dscene._dragonPet.breathCycle=now%3500;dscene._dragonBreathFx.on=now%3500<2000;drawCardWorld(actor,dscene,now,23);
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
