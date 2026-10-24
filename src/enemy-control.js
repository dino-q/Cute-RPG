
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

// Clamp all damage sources before any reward/filter can remove a major enemy.
export function applyBossDamageBudget(enemy,player,now,elite=false){
 if(!enemy?.boss||enemy.miniPoo||enemy.miniDemon||enemy.ragePoo||enemy._bossCore||enemy.deadHandled)return;
 const seconds=enemy._capSeconds||(enemy.stageBoss===20?(elite?150:45):enemy.stageBoss===30?(elite?240:65):elite?(enemy.mega?30:15):(enemy.mega?14:8));
 const bonus=(player?._angelBuff?1.6:1)*(enemy.bossType==='armor'?Math.min(1.5,1+(player?.armorCapBonus||0)):1);
 // Boss-damage cards also widen the cap so 王傷/王燃/王毒 still matter once a build hits it (capped at +60%).
 const bossCards=1+Math.min(.6,.5*Math.max(0,(player?.bossDmg||1)-1)+.25*Math.max(0,Math.max(player?.burnBossMul||1,player?.poisonBossMul||1)-1));
 const cap=enemy.mhp/seconds*bonus*bossCards;
 if(enemy._secSnap===undefined){enemy._secSnap=enemy.mhp;enemy._secReset=now;}
 // First enforce the previous window; resetting before enforcement loses lethal hits.
 enemy.hp=Math.min(enemy.mhp,Math.max(enemy.hp,enemy._secSnap-cap));
 if(now-enemy._secReset>=1000){enemy._secSnap=enemy.hp;enemy._secReset=now;}
}
export function startEnemyKnockback(enemy,origin,now,distance=55){
 if(enemy.stageBoss||enemy._bossCore||enemy.ragePoo)return;
 const a=Math.atan2(enemy.y-origin.y,enemy.x-origin.x),amount=enemy.boss?distance*.4:distance;
 enemy._knock={x:enemy.x,y:enemy.y,dx:Math.cos(a)*amount,dy:Math.sin(a)*amount,start:now,duration:180};
 enemy._retreatEnd=0;enemy._eDashing=false;enemy.dashState=0;
}
export function updateEnemyKnockback(enemy,now,mw,mh){
 const k=enemy._knock;if(!k)return false;
 const q=Math.max(0,Math.min(1,(now-k.start)/k.duration)),t=1-Math.pow(1-q,3);
 enemy.x=Math.max(enemy.r,Math.min(mw-enemy.r,k.x+k.dx*t));enemy.y=Math.max(enemy.r,Math.min(mh-enemy.r,k.y+k.dy*t));
 if(q>=1)enemy._knock=null;
 return true;
}
