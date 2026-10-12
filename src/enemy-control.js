
export function applyIceControl(enemy,player,now,{chance=.25,allowFreeze=true}={}){
 if(!enemy||enemy.hp<=0||enemy.ragePoo||enemy._bossCore)return false;
 const level=Math.min(3,Math.max(1,player?.fx?.ice||1));
 const major=!!(enemy.stageBoss||enemy.eliteEnemy||(enemy.boss&&!enemy.miniPoo&&!enemy.miniDemon));
 enemy._iceChill=Math.max(enemy._iceChill||0,1500);
 enemy._iceSpeedFactor=major?.7:[1,.7,.6,.5][level];
 enemy.st=Math.max(enemy.st||0,1500);
 if(major||!allowFreeze||(enemy._iceLock||0)>0||(enemy.frozen||0)>0)return false;
 if(Math.random()>=Math.min(.4,chance*(player?.elemBoost||1)))return false;
 enemy.frozen=400;enemy._iceLock=1900;
 return true;
}
export function tickEnemyControl(enemy,elapsedMs){
 for(const key of ['_iceChill','_iceLock','_magSlowT'])enemy[key]=Math.max(0,(enemy[key]||0)-elapsedMs);
}
export function enemySlowFactor(enemy,base=1){
 if(enemy._iceChill>0)base=Math.min(base,enemy._iceSpeedFactor||.7);
 if(enemy._magSlowT>0)base=Math.min(base,.6);
 return Math.max(.5,Math.min(1,base));
}
