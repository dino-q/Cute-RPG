
import {drawArt,artFrame} from './generated-art.js';
import {ROLE_FLANKER,ROLE_SHOOTER,ROLE_DASHER,ROLE_SHIELD} from './config.js';
const tierGroups=['mob-jelly','mob-fang','mob-crystal','mob-bastion','mob-spinner'];
export function enemyArtGroup(e){
 if(e.boss||e.eliteEnemy)return e.bossType==='armor'||e.role===ROLE_SHIELD?'miniboss-armor':'miniboss-tough';
 if(e.role===ROLE_FLANKER)return 'mob-fang';
 if(e.role===ROLE_SHOOTER)return 'mob-crystal';
 if(e.role===ROLE_DASHER)return 'mob-spinner';
 if(e.role===ROLE_SHIELD)return 'mob-bastion';
 return tierGroups[Math.min(4,Math.max(0,e.tier||0))];
}
export function drawEnemyCreature(c,e,now){
 const group=enemyArtGroup(e);if(!artFrame(group))return false;
 if(e._artLastHp!==undefined&&e.hp<e._artLastHp)e._artHitUntil=now+100;e._artLastHp=e.hp;
 const phase=Math.floor(now/170+(e.t||0))%4,size=e.r*4.3;
 const hit=e._artHitUntil>now;
 drawArt(c,group,phase,e.x,e.y+e.r,size,size,{fullCell:true,anchorY:.875,flip:e.face<0,brightness:hit?2.3:1});
 if(e.mega)drawArt(c,'guardian',5,e.x,e.y+e.r+3,e.r*3.2,e.r*.8,{stretch:true,alpha:.65});
 return true;
}
