// Stage Boss system — Lv20 💩 / Lv30 😈
import { MAX_PARTICLES, ROLE_NORMAL, PR } from "./config.js";
import { di, cl, rn } from "./utils.js";
import { sfx, sfxCtx, bgmRef, bgmStop } from "./audio.js";
import { getCx, par, burst } from "./render.js";
import { aim } from "./input.js";
import { showPlayerDmg } from "./hud.js";
import { showAngelCard } from "./cards-ui.js";
import { spawnBonusCrates } from "./enemies.js";

/* ═══ module-local mutable refs (injected by main.js) ═══ */
let g;
let _isCoopMode = false;
let _mapWFn, _mapHFn;
let _triggerVictoryFn;
let _setShakeFn;
let _setHitFlashFn;

/* ═══ module-local state ═══ */
let _stageBoss = null;
let _bossBgmInterval = null;

/* ═══ init / setters ═══ */
export function initBoss(deps) {
  if (deps.mapW) _mapWFn = deps.mapW;
  if (deps.mapH) _mapHFn = deps.mapH;
  if (deps.triggerVictory) _triggerVictoryFn = deps.triggerVictory;
  if (deps.setShake) _setShakeFn = deps.setShake;
  if (deps.setHitFlash) _setHitFlashFn = deps.setHitFlash;
}
export function setBossG(game) { g = game; }
export function setBossCoopMode(v) { _isCoopMode = v; }

/* ═══ getters/setters for _stageBoss (used by main.js) ═══ */
export function getStageBoss() { return _stageBoss; }
export function setStageBoss(v) { _stageBoss = v; }

/* ═══ local helpers ═══ */
function mapW() { return _mapWFn ? _mapWFn() : 2400; }
function mapH() { return _mapHFn ? _mapHFn() : 2400; }
function setShake(t, p) { if (_setShakeFn) _setShakeFn(t, p); }
function setHitFlash(v) { if (_setHitFlashFn) _setHitFlashFn(v); }
function triggerVictory(e) { if (_triggerVictoryFn) _triggerVictoryFn(e); }

function nearestPlayer(e) {
  if (!_isCoopMode || !g.p2 || g.p2._downed) return g.p;
  if (g.p._downed) return g.p2;
  return di(e, g.p) < di(e, g.p2) ? g.p : g.p2;
}

/* ═══════════ STAGE BOSS SYSTEM (Lv20 💩 / Lv30 😈) ═══════════ */

export function bossBgmStart(bpm){
  bossBgmStop();
  const ac=sfxCtx();if(!ac)return;
  if(bgmRef())bgmRef().volume=.18;
  const interval=60000/bpm;
  _bossBgmInterval=setInterval(()=>{
    const ac=sfxCtx();if(!ac)return;const now=ac.currentTime;
    const o=ac.createOscillator(),g2=ac.createGain();
    o.type="sine";o.frequency.setValueAtTime(150,now);o.frequency.exponentialRampToValueAtTime(40,now+.1);
    g2.gain.setValueAtTime(.18,now);g2.gain.exponentialRampToValueAtTime(.001,now+.15);
    o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+.16);
    const buf=ac.createBuffer(1,ac.sampleRate*.02|0,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.3;
    const ns=ac.createBufferSource(),ng=ac.createGain();
    ns.buffer=buf;ng.gain.setValueAtTime(.05,now);ng.gain.exponentialRampToValueAtTime(.001,now+.02);
    ns.connect(ng).connect(ac.destination);ns.start(now);
  },interval);
}
export function bossBgmStop(){if(_bossBgmInterval){clearInterval(_bossBgmInterval);_bossBgmInterval=null;}if(bgmRef())bgmRef().volume=.35;}
export function bossBgmSetBpm(bpm){bossBgmStart(bpm);}

export function sfxBossEntrance(type){
  const ac=sfxCtx();if(!ac)return;const now=ac.currentTime;
  if(type===20){
    const o=ac.createOscillator(),g2=ac.createGain();
    o.type="sine";o.frequency.setValueAtTime(60,now);
    g2.gain.setValueAtTime(0,now);g2.gain.linearRampToValueAtTime(.2,now+.8);g2.gain.exponentialRampToValueAtTime(.001,now+1.2);
    o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+1.3);
    [1,1.3,1.6].forEach(t=>{
      const o2=ac.createOscillator(),g3=ac.createGain();
      o2.type="sine";o2.frequency.setValueAtTime(80,now+t);o2.frequency.exponentialRampToValueAtTime(30,now+t+.12);
      g3.gain.setValueAtTime(.2,now+t);g3.gain.exponentialRampToValueAtTime(.001,now+t+.15);
      o2.connect(g3).connect(ac.destination);o2.start(now+t);o2.stop(now+t+.16);
    });
  }else{
    [185,233,311,415].forEach((f,i)=>{
      const o=ac.createOscillator(),g2=ac.createGain();
      o.type=i<2?"sawtooth":"square";o.frequency.setValueAtTime(f,now);
      g2.gain.setValueAtTime(0,now);g2.gain.linearRampToValueAtTime(.08,now+1);g2.gain.exponentialRampToValueAtTime(.001,now+1.8);
      o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+2);
    });
  }
}

export function sfxBossAtk(type){
  const ac=sfxCtx();if(!ac)return;const now=ac.currentTime;
  if(type==="shockwave"){const o=ac.createOscillator(),g2=ac.createGain();o.type="sawtooth";o.frequency.setValueAtTime(200,now);o.frequency.exponentialRampToValueAtTime(60,now+.15);g2.gain.setValueAtTime(.14,now);g2.gain.exponentialRampToValueAtTime(.001,now+.18);o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+.2);}
  else if(type==="spawn"){const o=ac.createOscillator(),g2=ac.createGain();o.type="sine";o.frequency.setValueAtTime(250,now);o.frequency.exponentialRampToValueAtTime(80,now+.06);g2.gain.setValueAtTime(.1,now);g2.gain.exponentialRampToValueAtTime(.001,now+.08);o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+.09);}
  else if(type==="darkshot"){const o=ac.createOscillator(),g2=ac.createGain();o.type="sawtooth";o.frequency.setValueAtTime(400,now);o.frequency.exponentialRampToValueAtTime(150,now+.04);g2.gain.setValueAtTime(.08,now);g2.gain.exponentialRampToValueAtTime(.001,now+.05);o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+.06);}
  else if(type==="crosswave"){const o=ac.createOscillator(),g2=ac.createGain();o.type="square";o.frequency.setValueAtTime(120,now);o.frequency.exponentialRampToValueAtTime(50,now+.3);g2.gain.setValueAtTime(.12,now);g2.gain.exponentialRampToValueAtTime(.001,now+.35);o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+.36);}
  else if(type==="teleport"){const o=ac.createOscillator(),g2=ac.createGain();o.type="sine";o.frequency.setValueAtTime(800,now);o.frequency.exponentialRampToValueAtTime(100,now+.08);g2.gain.setValueAtTime(.1,now);g2.gain.exponentialRampToValueAtTime(.001,now+.1);o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+.11);}
  else if(type==="slam"){const o=ac.createOscillator(),g2=ac.createGain();o.type="sine";o.frequency.setValueAtTime(100,now);o.frequency.exponentialRampToValueAtTime(30,now+.15);g2.gain.setValueAtTime(.18,now);g2.gain.exponentialRampToValueAtTime(.001,now+.2);o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+.22);}
  else if(type==="darkpulse"){const o=ac.createOscillator(),g2=ac.createGain();o.type="sine";o.frequency.setValueAtTime(200,now);o.frequency.exponentialRampToValueAtTime(600,now+.5);g2.gain.setValueAtTime(.06,now);g2.gain.linearRampToValueAtTime(.14,now+.45);g2.gain.exponentialRampToValueAtTime(.001,now+.55);o.connect(g2).connect(ac.destination);o.start(now);o.stop(now+.56);}
  else if(type==="phase"){[220,277,330].forEach((f,i)=>{const o=ac.createOscillator(),g2=ac.createGain();o.type="sawtooth";o.frequency.setValueAtTime(f,now+i*.08);g2.gain.setValueAtTime(.08,now+i*.08);g2.gain.exponentialRampToValueAtTime(.001,now+i*.08+.3);o.connect(g2).connect(ac.destination);o.start(now+i*.08);o.stop(now+i*.08+.32);});}
}

/* ═══ _isElite injected fn ═══ */
let _isEliteFn;
export function setBossIsElite(fn) { _isEliteFn = fn; }
function isElite(){ return _isEliteFn ? _isEliteFn() : false; }

// 估算玩家對Boss的DPS

function estimateBossDPS(lv){
  const p=g.p,fr=p.fr||1;
  const shotsPerSec=1000/(200*fr);
  const split=p.split||1;
  const hitsPerSec=shotsPerSec*split;
  if(isElite()){
    // 每秒 cap 制：估算是否需要天使卡
    const bHp=lv===20?30000:50000;
    const secCap=bHp/(lv===20?120:180);
    const bulletDmg=(2.2+p.atk*.7)*(p.elemBoost||1)*(p.levelDmgMul||1);
    const estDps=bulletDmg*hitsPerSec;
    return Math.min(estDps,secCap);
  }
  const bulletDmg=(2.2+p.atk*.7)*(p.elemBoost||1)*(p.levelDmgMul||1)*(p.bossDmg||1);
  const bossDR=lv===20?.1:.01;
  return bulletDmg*hitsPerSec*bossDR;
}

export function triggerStageBoss(lv){
  // 計算是否需要天使卡
  const dps=estimateBossDPS(lv);
  const _bossEliteMul=isElite()?10:1;
  const baseHp=isElite()?(lv===20?30000:50000):(1500+g.wave*100)*_bossEliteMul;
  const hpMul=isElite()?1:(lv===20?1.2:3.5);
  const bossHp=baseHp*hpMul;
  const estTime=bossHp/Math.max(dps,0.1);
  const angelKey="_angelOffer"+lv;
  if(estTime>120&&!g[angelKey]){
    // 預估超過2分鐘，出天使寶箱（每個Boss各一次機會）
    g[angelKey]=true;
    g._pendingStageBoss=lv;
    g.run=false;
    showAngelCard();
    return;
  }

  g.ene.forEach(e=>{if(!e.stageBoss)burst(e.x,e.y,e.color,5);});
  g.ene=g.ene.filter(e=>e.stageBoss);
  g.ebul=[];g.bul=[];g._stageBossActive=true;g._stageBossLv=lv;

  // === Boss 登場動畫 ===
  g.run=false;
  const isPoo=lv===20;
  const bossCol=isPoo?"#8B6914":"#9B59B6";
  const bossEmoji=isPoo?"💩":"😈";
  const bossTitle=isPoo?"中場 Boss 登場！":"最終魔王降臨！";

  // VW/VH — read from canvas at trigger time
  const _cv=document.getElementById("cv");
  const VW=_cv?_cv.width:400;
  const VH=_cv?_cv.height:700;

  // 暫停 + 暗幕
  const _entOv=document.createElement("div");
  _entOv.style.cssText="position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0);transition:background .4s;pointer-events:none;display:flex;align-items:center;justify-content:center;flex-direction:column";
  document.body.appendChild(_entOv);
  requestAnimationFrame(()=>_entOv.style.background="rgba(0,0,0,.6)");

  // 粒子 canvas
  const _entCv=document.createElement("canvas");
  _entCv.width=VW;_entCv.height=VH;_entCv.style.cssText="position:absolute;inset:0";
  _entOv.appendChild(_entCv);
  const _ectx=_entCv.getContext("2d");
  let _entPar=[],_entRaf,_entT=0;
  function entLoop(){
    _ectx.clearRect(0,0,VW,VH);_entT+=16;
    // 粒子從四周匯聚到中心
    if(_entT<1800&&Math.random()<.6){
      for(let i=0;i<4;i++){
        const edge=Math.random()*4|0;
        const sx=edge===0?0:edge===1?VW:rn(0,VW);
        const sy=edge===2?0:edge===3?VH:rn(0,VH);
        const dx2=VW/2-sx,dy2=VH/2-sy,dd=Math.sqrt(dx2*dx2+dy2*dy2)||1;
        _entPar.push({x:sx,y:sy,vx:dx2/dd*rn(3,6),vy:dy2/dd*rn(3,6),life:1,sz:rn(2,5),color:isPoo?(Math.random()>.5?"#8B6914":"#D4A017"):(Math.random()>.5?"#9B59B6":"#E74C3C")});
      }
    }
    _entPar.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=.012;p.sz*=.99;
      _ectx.globalAlpha=Math.max(0,p.life);_ectx.fillStyle=p.color;
      _ectx.beginPath();_ectx.arc(p.x,p.y,p.sz,0,Math.PI*2);_ectx.fill();});
    _entPar=_entPar.filter(p=>p.life>0);
    // 中心脈動光球
    const pulse=Math.sin(_entT/120)*.2;
    _ectx.globalAlpha=.3+pulse;_ectx.fillStyle=bossCol;
    _ectx.beginPath();_ectx.arc(VW/2,VH/2,30+_entT*.02,0,Math.PI*2);_ectx.fill();
    _ectx.globalAlpha=1;
    _entRaf=requestAnimationFrame(entLoop);
  }
  entLoop();

  // 0.6秒：顯示 Boss emoji + 名稱
  setTimeout(()=>{
    const txt=document.createElement("div");
    txt.style.cssText="position:relative;z-index:1;text-align:center";
    txt.innerHTML=`
      <div style="font-size:60px;animation:fl 1.5s ease-in-out infinite;filter:drop-shadow(0 0 20px ${bossCol})">${bossEmoji}</div>
      <div style="font-size:20px;font-weight:900;color:${bossCol};text-shadow:0 0 20px ${bossCol};margin-top:8px;animation:fadeIn .5s both">${bossTitle}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:4px;animation:fadeIn .8s .3s both">${isPoo?"🛡️ 防禦型 — 物理傷害降低":"💪 韌性型 — 免疫控制效果"}</div>
    `;
    _entOv.appendChild(txt);
  },600);

  // 2.5秒：淡出 + 生成 Boss + 開始遊戲
  setTimeout(()=>{
    if(_entRaf)cancelAnimationFrame(_entRaf);
    _entOv.style.background="rgba(0,0,0,0)";
    setTimeout(()=>{if(_entOv.parentNode)_entOv.parentNode.removeChild(_entOv);},500);

    sfxBossEntrance(lv);
    const now2=performance.now(),px=g.p.x,py=g.p.y;
    const bx=px+(Math.random()>.5?1:-1)*180,by=py+(Math.random()>.5?1:-1)*180;
    const bHp=baseHp*hpMul;
    const sb={x:cl(bx,60,mapW()-60),y:cl(by,60,mapH()-60),hp:bHp,mhp:bHp,
      speed:lv===20?0.6:0.45,color:bossCol,t:0,r:lv===20?54:48,st:0,
      boss:true,mega:true,tier:4,face:1,xp:lv===20?200:500,
      poisonT:0,frozen:0,burnT:0,burnLv:0,poisonLv:0,dmgMul:lv===20?2:3.5,
      role:ROLE_NORMAL,flankA:0,shootCD:0,dashState:0,dashTimer:0,dashDx:0,dashDy:0,shieldAng:0,bossSkillCD:0,bossSkill:0,
      stageBoss:lv,bossType:lv===20?"armor":"tough",sbPhase:1,sbAtkCD:now2+3000,sbSpawnCD:now2+10000,sbTeleCD:now2+8000,sbPulseCD:now2+12000,deadHandled:false,_pendingPulse:0,_spawnShield:now2+2500,_spawnTime:now2};
    g.ene.push(sb);_stageBoss=sb;
    // 練習模式：Boss 創建後立刻套用階段設定（在 g.run=true 之前！）
    if(g._pracBossSetup){
      const ps=g._pracBossSetup;g._pracBossSetup=null;
      if(ps.pooRage){sb.hp=Math.floor(sb.mhp*.45);}
      if(ps.devilPhase>=2){
        sb.hp=ps.devilPhase===2?Math.floor(sb.mhp*.6):Math.floor(sb.mhp*.3);
        sb.sbPhase=ps.devilPhase;
        if(ps.devilPhase===3){sb._p3cycle="idle";sb.sbTeleCD=performance.now()+2000;}
        g.p.projImmune=false;g.p._demonDeal=true;
        g.p._demonLifesteal={accT:0,healPer5:5};
        bossBgmSetBpm(ps.devilPhase===2?140:160);
      }
    }
    // 登場爆發特效
    burst(sb.x,sb.y,bossCol,25);
    for(let i=0;i<20&&par.length<MAX_PARTICLES;i++){const a=Math.PI*2*i/20,v=rn(2,5);par.push({x:sb.x,y:sb.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,color:isPoo?"#D4A017":"#DA77F2",sz:rn(3,7)});}
    g.dn.push({x:sb.x,y:sb.y-sb.r-20,d:bossEmoji+" "+bossTitle,life:3,color:bossCol,big:1});
    g.run=true;const n=performance.now();g.lf=n;g.lS=n;g.laF=n;
    setTimeout(()=>bossBgmStart(120),500);
  },2500);
}

export function updateStageBoss(e,now,dt){
  if(!e||e.hp<=0)return;
  const lv=e.stageBoss;
  // 護盾循環：每6秒觸發2秒護盾
  if(!e._spawnShield||now>=e._spawnShield){
    if(!e._shieldNextCD)e._shieldNextCD=now+6000;
    if(now>=e._shieldNextCD){e._spawnShield=now+2500;e._shieldNextCD=now+8500;
      sfxBossAtk("shockwave");
      g.dn.push({x:e.x,y:e.y-e.r-18,d:"⚠️ 護盾啟動！普攻無效！",life:2.5,color:"#4DABF7",big:1});}
  }
  const _sbt=(_isCoopMode&&g.p2)?nearestPlayer(e):g.p;
  const dx=_sbt.x-e.x,dy=_sbt.y-e.y,d=Math.sqrt(dx*dx+dy*dy)||1;
  if(Math.abs(dx)>2)e.face=dx>0?1:-1;

  // 😈 Phase transitions
  if(lv===30){
    const hpPct=e.hp/e.mhp,newPhase=hpPct>.66?1:hpPct>.33?2:3;
    if(newPhase!==e.sbPhase){
      const oldPhase=e.sbPhase;e.sbPhase=newPhase;sfxBossAtk("phase");setHitFlash(.5);setShake(.4,6);
      burst(e.x,e.y,"#9B59B6",30);
      if(newPhase===2&&!e._dealDone){
        e._dealDone=true; // 惡魔交易只觸發一次
        bossBgmSetBpm(140);
        // 惡魔的交易：暫停 + 吸取能量動畫
        g.run=false;
        const _dealOv=document.createElement("div");
        _dealOv.id="_demonDealOv";
        _dealOv.style.cssText="position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0);transition:background 0.5s;pointer-events:none;display:flex;align-items:center;justify-content:center;flex-direction:column";
        document.body.appendChild(_dealOv);
        // 淡入暗幕
        requestAnimationFrame(()=>_dealOv.style.background="rgba(0,0,0,.65)");
        // 吸取能量粒子動畫
        const _cv=document.getElementById("cv");
        const VW=_cv?_cv.width:400;
        const VH=_cv?_cv.height:700;
        const _dealCv=document.createElement("canvas");
        _dealCv.width=VW;_dealCv.height=VH;_dealCv.style.cssText="position:absolute;inset:0";
        _dealOv.appendChild(_dealCv);
        const _dctx=_dealCv.getContext("2d");
        let _dealPar=[],_dealRaf,_dealT=0;
        const px=VW/2,py=VH/2; // 玩家在畫面中心
        function dealLoop(){
          _dctx.clearRect(0,0,VW,VH);_dealT+=16;
          // 從玩家身上吸出紫色能量粒子飛向上方
          if(_dealT<2000&&Math.random()<.4){
            for(let i=0;i<3;i++){
              const a=rn(0,Math.PI*2),sp=rn(1.5,3.5);
              _dealPar.push({x:px+rn(-12,12),y:py+rn(-12,12),vx:Math.cos(a)*sp*.3,vy:-sp,life:1,sz:rn(3,7),color:Math.random()>.5?"#9B59B6":"#E74C3C"});
            }
          }
          _dealPar.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy-=.02;p.life-=.015;p.sz*=.98;
            _dctx.globalAlpha=Math.max(0,p.life);_dctx.fillStyle=p.color;
            _dctx.beginPath();_dctx.arc(p.x,p.y,p.sz,0,Math.PI*2);_dctx.fill();});
          _dealPar=_dealPar.filter(p=>p.life>0);
          // 玩家位置脈動光環（被吸取感）
          const pulse=Math.sin(_dealT/150)*.3;
          _dctx.globalAlpha=.2+pulse;_dctx.strokeStyle="#9B59B6";_dctx.lineWidth=3;
          _dctx.beginPath();_dctx.arc(px,py,20+Math.sin(_dealT/100)*5,0,Math.PI*2);_dctx.stroke();
          _dctx.globalAlpha=1;
          _dealRaf=requestAnimationFrame(dealLoop);
        }
        dealLoop();
        // 0.5秒後顯示文字 + 確認按鈕
        setTimeout(()=>{
          const txt=document.createElement("div");
          txt.style.cssText="position:relative;z-index:1;text-align:center;animation:fadeIn .5s both;pointer-events:auto";
          txt.innerHTML=`
            <div style="font-size:28px;margin-bottom:6px">😈</div>
            <div style="font-size:18px;font-weight:900;color:#9B59B6;text-shadow:0 0 15px #9B59B6;margin-bottom:10px">惡魔的交易</div>
            <div style="font-size:12px;color:#FF4040;margin-bottom:6px">🚫 鐵壁金身被打破！遠距攻擊必定命中</div>
            <div style="font-size:12px;color:#69DB7C;margin-bottom:14px">🩸 賦予武器吸血：攻擊5秒回復5HP</div>
            <button id="_dealConfirm" style="padding:10px 28px;font-size:14px;font-weight:900;border:2px solid #9B59B6;border-radius:12px;background:rgba(155,89,182,.2);color:#fff;cursor:pointer;touch-action:manipulation;box-shadow:0 0 20px rgba(155,89,182,.4);animation:gw .8s infinite">接受交易</button>
          `;
          _dealOv.appendChild(txt);
          _dealOv.style.pointerEvents="auto";
          g.p.projImmune=false;g.p._demonDeal=true;
          g.p._demonLifesteal={accT:0,healPer5:5};
          // 按下確認後才繼續
          const confirmBtn=document.getElementById("_dealConfirm");
          const doDealConfirm=()=>{
            confirmBtn.removeEventListener("click",doDealConfirm);
            confirmBtn.removeEventListener("touchstart",doDealTap);
            sfx("chest");
            // 召喚小惡魔
            for(let i=0;i<2;i++){const a2=Math.PI*2*i/2+Math.random(),mx=cl(e.x+Math.cos(a2)*60,20,mapW()-20),my=cl(e.y+Math.sin(a2)*60,20,mapH()-20);
              const mhp3=800+g.wave*50;
              g.ene.push({x:mx,y:my,hp:mhp3,mhp:mhp3,speed:1.2,color:"#8E44AD",t:rn(0,10),r:14,st:0,boss:true,mega:false,tier:2,face:1,xp:15,poisonT:0,frozen:0,burnT:0,burnLv:0,poisonLv:0,dmgMul:2,role:ROLE_NORMAL,flankA:0,shootCD:0,dashState:0,dashTimer:0,dashDx:0,dashDy:0,shieldAng:0,bossSkillCD:0,bossSkill:0,miniDemon:true,bossType:Math.random()>.5?"tough":"armor",_demonTeleCD:performance.now()+5000});}
            sfxBossAtk("spawn");
            g.dn.push({x:e.x,y:e.y-e.r-10,d:"👿 小惡魔降臨！",life:2,color:"#8E44AD",big:1});
            // 淡出 + 恢復遊戲
            if(_dealRaf)cancelAnimationFrame(_dealRaf);
            _dealOv.style.background="rgba(0,0,0,0)";_dealOv.style.pointerEvents="none";
            setTimeout(()=>{if(_dealOv.parentNode)_dealOv.parentNode.removeChild(_dealOv);},500);
            if(g){
              const n2=performance.now();
              e.sbAtkCD=n2+3000;e.sbSpawnCD=n2+4000;e.sbTeleCD=n2+5000;
              e.sbPulseCD=n2+8000;
              // 清除暫停前殘留的瞬移/衝刺/後退狀態，避免Boss亂飄
              e._teleExe=0;e._teleLandShow=0;e._teleShake=0;
              e._retreatEnd=0;e._dashChargeEnd=0;
              if(e._p3cycle&&e._p3cycle!=="idle")e._p3cycle="idle";
              e._p3dashN=0;
              g.run=true;g.lf=n2;g.lS=n2;g.laF=n2;
            }
          };
          const doDealTap=(ev)=>{ev.preventDefault();ev.stopPropagation();doDealConfirm();};
          confirmBtn.addEventListener("click",doDealConfirm);
          confirmBtn.addEventListener("touchstart",doDealTap,{passive:false});
        },500);
      }
      if(newPhase===3){
        bossBgmSetBpm(160);
        e.bossType="armor"; // 最終階段獲得護甲，降低物理傷害
        e._p3armor=0.5; // 50% 減傷
        g.dn.push({x:e.x,y:e.y-e.r-20,d:"😈 最終階段！護甲強化！",life:3,color:"#C0392B",big:1});
      }
    }
  }

  // 惡魔吸血回復
  if(g.p._demonLifesteal&&aim.a){
    const dl=g.p._demonLifesteal;dl.accT+=dt*16.67;
    if(dl.accT>=5000){dl.accT-=5000;const heal=dl.healPer5;g.p.hp=Math.min(g.p.hp+heal,g.p.maxHp);
      g.dn.push({x:g.p.x,y:g.p.y-30,d:"🩸+"+heal,life:.8,color:"#69DB7C"});}
  }

  // Move（撞擊後退開）
  e.t+=.02*dt;
  if(e._retreatEnd&&now<e._retreatEnd){
    e.x+=(-dx/d*.8)*dt;e.y+=(-dy/d*.8)*dt;
    e.x=cl(e.x,e.r,mapW()-e.r);e.y=cl(e.y,e.r,mapH()-e.r);
  }else{
    if(e._retreatEnd)e._retreatEnd=0;
    const spd=e.speed*(e.frozen>0?0:1)*(e.st>0?.5:1);
    e.x+=dx/d*spd*dt;e.y+=dy/d*spd*dt;
    e.x=cl(e.x,e.r,mapW()-e.r);e.y=cl(e.y,e.r,mapH()-e.r);
  }

  // 💩 半血狂暴：抖動 + 召喚20個半透明便便散佈地圖
  if(lv===20&&e.hp<e.mhp*.5&&!e._pooRageSpawned){
    e._pooRageSpawned=true;e._pooRage=true;
    setShake(.6,8);sfxBossAtk("phase");
    g.dn.push({x:e.x,y:e.y-e.r-20,d:"💩 狂暴！便便軍團！",life:3,color:"#8B6914",big:1});
    const mw=mapW(),mh=mapH();
    for(let i=0;i<10;i++){
      const mx=rn(40,mw-40),my=rn(40,mh-40);
      g.ene.push({x:mx,y:my,hp:500,mhp:500,speed:1.0,color:"#C4A882",t:rn(0,10),r:16,st:0,
        boss:false,mega:false,tier:0,face:1,xp:0,poisonT:0,frozen:0,burnT:0,burnLv:0,poisonLv:0,dmgMul:0,
        role:ROLE_NORMAL,flankA:0,shootCD:0,dashState:0,dashTimer:0,dashDx:0,dashDy:0,shieldAng:0,bossSkillCD:0,bossSkill:0,
        ragePoo:true});}
  }

  // 💩 Attacks
  if(lv===20){
    if(now>e.sbAtkCD){e.sbAtkCD=now+(e._pooRage?3000:4000);sfxBossAtk("shockwave");
      for(let i=0;i<10;i++){const a=Math.PI*2*i/10;g.ebul.push({x:e.x,y:e.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,dmg:15+g.wave*1.2,life:1.2,color:"#8B6914"});}burst(e.x,e.y,"#8B6914",12);}
    if(now>e.sbSpawnCD){e.sbSpawnCD=now+(e._pooRage?8000:10000);sfxBossAtk("spawn");
      const spnHp=400+g.wave*25;
      for(let i=0;i<3;i++){const a=Math.PI*2*i/3,mx=cl(e.x+Math.cos(a)*40,20,mapW()-20),my=cl(e.y+Math.sin(a)*40,20,mapH()-20);
        g.ene.push({x:mx,y:my,hp:spnHp,mhp:spnHp,speed:1.8,color:"#A0822A",t:rn(0,10),r:18,st:0,boss:true,mega:false,tier:1,face:1,xp:5,poisonT:0,frozen:0,burnT:0,burnLv:0,poisonLv:0,dmgMul:1.5,role:ROLE_NORMAL,flankA:0,shootCD:0,dashState:0,dashTimer:0,dashDx:0,dashDy:0,shieldAng:0,bossSkillCD:0,bossSkill:0,miniPoo:true,bossType:Math.random()>.5?"tough":"armor"});}
      g.dn.push({x:e.x,y:e.y-e.r-10,d:"💩 增生！",life:1.5,color:"#A0822A"});}
  }

  // 😈 Attacks
  if(lv===30){
    const phase=e.sbPhase,brgCD=phase===1?3000:phase===2?2200:1600;
    // Phase 3 循環中（非 idle/free）停止所有遠程攻擊
    const p3inCycle=phase===3&&e._p3cycle&&e._p3cycle!=="idle"&&e._p3cycle!=="free";
    if(!p3inCycle&&now>e.sbAtkCD){e.sbAtkCD=now+brgCD;sfxBossAtk("darkshot");
      const n=phase===1?5:phase===2?8:10,baseA=Math.atan2(dy,dx),spread=Math.PI/(phase===1?4:3);
      for(let i=0;i<n;i++){const a=baseA-spread/2+spread*i/(n-1),sp=3+phase*.5;g.ebul.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg:12+g.wave*1.5+phase*5,life:1.5,color:"#9B59B6"});}}
    if(!p3inCycle&&phase>=2&&now>e.sbSpawnCD){e.sbSpawnCD=now+6000;sfxBossAtk("crosswave");
      [0,Math.PI/2,Math.PI,Math.PI*1.5].forEach(a=>{for(let j=0;j<5;j++){const sp=2+j*.6;g.ebul.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg:18+g.wave*1.5,life:2,color:"#E74C3C"});}});burst(e.x,e.y,"#E74C3C",20);}
    // === Phase 2 瞬移（獨立，不走循環）===
    if(phase===2&&now>e.sbTeleCD&&!e._p3cycle){
      e.sbTeleCD=now+8000;
      g.dn.push({x:g.p.x,y:g.p.y-50,d:"⚠️ 惡魔在身邊！",life:1.5,color:"#9B59B6",big:1});
      const tr=120+rn(0,40),ta=Math.random()*Math.PI*2;
      e._teleLandX=cl(g.p.x+Math.cos(ta)*tr,e.r,mapW()-e.r);
      e._teleLandY=cl(g.p.y+Math.sin(ta)*tr,e.r,mapH()-e.r);
      e._teleLandShow=now+300;e._teleExe=now+1000;e._teleShake=now+1000;
    }
    // === Phase 3 攻擊循環狀態機 ===
    // 狀態：idle → tele_warn → tele_land → dash(×3) → pulse_warn → pulse_boom → free → idle
    if(phase===3){
      if(!e._p3cycle)e._p3cycle="idle";
      if(e._p3cycle==="idle"&&now>e.sbTeleCD){
        e._p3cycle="tele_warn";e._p3t=now;
        g.dn.push({x:g.p.x,y:g.p.y-50,d:"⚠️ 惡魔在身邊！",life:1.5,color:"#9B59B6",big:1});
        const tr=90+rn(0,30),ta=Math.random()*Math.PI*2;
        e._teleLandX=cl(g.p.x+Math.cos(ta)*tr,e.r,mapW()-e.r);
        e._teleLandY=cl(g.p.y+Math.sin(ta)*tr,e.r,mapH()-e.r);
        e._teleLandShow=now+300;e._teleExe=now+1000;
      }
      // 衝刺子循環
      if(e._p3cycle==="dash"){
        if(!e._p3dashN)e._p3dashN=0;
        // 蓄力
        if(e._dashChargeEnd&&now<e._dashChargeEnd){
          e.x+=(Math.random()-.5)*4;e.y+=(Math.random()-.5)*4;
        }else if(e._dashChargeEnd&&now>=e._dashChargeEnd){
          e._dashChargeEnd=0;
          const _ct=(_isCoopMode&&g.p2)?nearestPlayer(e):g.p;
          const cdx=_ct.x-e.x,cdy=_ct.y-e.y,cd=Math.sqrt(cdx*cdx+cdy*cdy)||1;
          e._chargeDx=cdx/cd;e._chargeDy=cdy/cd;e._chargeEnd=now+350;
          sfxBossAtk("slam");
        }
        // 衝刺中
        if(e._chargeEnd&&now<e._chargeEnd){
          const cspd=8*dt;
          e.x+=e._chargeDx*cspd;e.y+=e._chargeDy*cspd;
          e.x=cl(e.x,e.r,mapW()-e.r);e.y=cl(e.y,e.r,mapH()-e.r);
          if(par.length<MAX_PARTICLES&&Math.random()<.5)par.push({x:e.x,y:e.y,vx:0,vy:0,life:.3,color:"rgba(155,89,182,.4)",sz:e.r*.9});
          if(di(e,g.p)<e.r+PR+5){
            e._chargeEnd=0;
            setShake(.4,8);burst(e.x,e.y,"#8E44AD",15);
            for(let i=0;i<8;i++){const a=Math.PI*2*i/8;g.ebul.push({x:e.x,y:e.y,vx:Math.cos(a)*2.5,vy:Math.sin(a)*2.5,dmg:10+g.wave,life:1,color:"#8E44AD"});}
            e._p3dashPause=now+500; // 撞到後短暫停頓
          }
        }else if(e._chargeEnd){
          e._chargeEnd=0;burst(e.x,e.y,"#8E44AD",8);
          e._p3dashPause=now+500;
        }
        // 衝刺間隔
        if(e._p3dashPause&&now>=e._p3dashPause){
          e._p3dashPause=0;e._p3dashN++;
          if(e._p3dashN>=3){
            // 3次衝刺完成 → 進入脈衝預告
            e._p3cycle="pulse_warn";e._p3t=now;
            g.dn.push({x:e.x,y:e.y-e.r-20,d:"⚠️ 暗黑脈衝！",life:2.2,color:"#FF4040",big:1});
            g._pulseWarnEnd=now+2200; // 畫面警告計時
            sfxBossAtk("darkpulse");
          }else{
            // 下一次衝刺
            e._dashChargeEnd=now+400;
            g.dn.push({x:e.x,y:e.y-e.r-10,d:"⚠️",life:0.5,color:"#FF4040"});
          }
        }
      }
      // 脈衝預告（2.5秒蓄力，Boss 固定站位）
      if(e._p3cycle==="pulse_warn"){
        const elapsed=now-e._p3t;
        // 粒子匯聚（邏輯層，視覺在 drawStageBoss）
        const prog=Math.min(1,elapsed/2000),pulseR=100+prog*80;
        if(par.length<MAX_PARTICLES&&Math.random()<.4+prog*.3){
          const pa=rn(0,Math.PI*2),pr=pulseR+rn(0,30);
          par.push({x:e.x+Math.cos(pa)*pr,y:e.y+Math.sin(pa)*pr,vx:-Math.cos(pa)*rn(2,4),vy:-Math.sin(pa)*rn(2,4),life:.5,color:Math.random()>.5?"#9B59B6":"#E74C3C",sz:rn(2,5)});
        }
        if(elapsed>=2000){
          // 脈衝爆發！
          e._p3cycle="pulse_boom";e._p3t=now;
          setHitFlash(.8);setShake(.6,10);sfxBossAtk("slam");
          const pulseDist=di(e,g.p),safe=pulseDist<150;
          if(!safe&&!g.p._inv&&!(g.p._iFrameEnd>0&&now<g.p._iFrameEnd)){
            // 撞擊傷害（非遠距），走接觸傷害邏輯
            const dmg=(40+g.wave*3)*e.dmgMul;
            g.p.hp-=dmg;burst(g.p.x,g.p.y,"#9B59B6",10);sfx("hurt");setHitFlash(1);setShake(.5,8);showPlayerDmg(dmg);g.p._iFrameEnd=performance.now()+800;
          }else if(safe){g.dn.push({x:g.p.x,y:g.p.y-30,d:"安全！",life:1.5,color:"#51CF66",big:1});}
          // 華麗爆炸特效
          for(let r=0;r<3;r++){
            const delay=r*80;
            setTimeout(()=>{if(!g||!g.run)return;
              const ring=120+r*50;
              for(let i=0;i<16;i++){const a=Math.PI*2*i/16;
                par.push({x:e.x+Math.cos(a)*ring*.3,y:e.y+Math.sin(a)*ring*.3,vx:Math.cos(a)*rn(3,6),vy:Math.sin(a)*rn(3,6),life:.8,color:r===0?"#9B59B6":r===1?"#E74C3C":"#FFD43B",sz:rn(3,7)});}
              burst(e.x,e.y,r===0?"#9B59B6":"#E74C3C",15);
            },delay);
          }
        }
      }
      // 脈衝後短暫休息 → 自由攻擊 → 回到 idle
      if(e._p3cycle==="pulse_boom"&&now-e._p3t>1000){
        e._p3cycle="free";e._p3t=now;
        e.sbAtkCD=now+1500; // 脈衝後 Boss 靜止，玩家有時間離開
      }
      if(e._p3cycle==="free"&&now-e._p3t>5000){
        e._p3cycle="idle";e._p3dashN=0;
        e.sbTeleCD=now+2000; // 2秒後可再次進入循環
      }
    }
    // === 通用：落點預告標記（紫色脈動圈）===
    if(e._teleLandShow&&now<(e._teleExe||0)){
      const lx=e._teleLandX,ly=e._teleLandY;
      const prog=1-(e._teleExe-now)/700;
      const mr=e.r*2*(1-prog*.3);
      const cx=getCx();
      cx.save();cx.globalAlpha=.3+prog*.3;
      cx.strokeStyle="#9B59B6";cx.lineWidth=2.5;cx.setLineDash([6,4]);
      cx.beginPath();cx.arc(lx,ly,mr,0,Math.PI*2);cx.stroke();cx.setLineDash([]);
      cx.globalAlpha=.15+prog*.15;cx.fillStyle="#9B59B6";
      cx.beginPath();cx.arc(lx,ly,mr*.6,0,Math.PI*2);cx.fill();
      cx.restore();
      // 不再每幀 push damage number — 改用低頻閃爍
      if(Math.random()<.1)g.dn.push({x:lx,y:ly-mr-5,d:"⚡",life:0.3,color:"#9B59B6"});
    }
    // === 通用：執行瞬移 ===
    if(e._teleExe&&now>=e._teleExe){e._teleExe=0;e._teleLandShow=0;sfxBossAtk("teleport");
      for(let gi=0;gi<4;gi++){par.push({x:e.x+rn(-5,5),y:e.y+rn(-5,5),vx:0,vy:0,life:.5,color:"rgba(155,89,182,.5)",sz:e.r*1.2});}
      burst(e.x,e.y,"#9B59B6",15);
      const oldX=e.x,oldY=e.y;
      e.x=e._teleLandX;e.y=e._teleLandY;
      const tdx=e.x-oldX,tdy=e.y-oldY;
      for(let gi=0;gi<6;gi++){const t2=gi/6;par.push({x:oldX+tdx*t2,y:oldY+tdy*t2,vx:0,vy:0,life:.4,color:"rgba(155,89,182,.35)",sz:e.r*.8});}
      burst(e.x,e.y,"#9B59B6",15);
      // Phase 2: 瞬移後散射
      if(phase===2){setTimeout(()=>{if(!g||!g.run||e.hp<=0)return;sfxBossAtk("slam");setShake(.3,6);
        for(let i=0;i<8;i++){const a=Math.PI*2*i/8;g.ebul.push({x:e.x,y:e.y,vx:Math.cos(a)*2.5,vy:Math.sin(a)*2.5,dmg:10+g.wave,life:1,color:"#8E44AD"});}burst(e.x,e.y,"#8E44AD",20);},400);}
      // Phase 3: 瞬移後進入衝刺
      if(phase===3&&e._p3cycle==="tele_warn"){
        e._p3cycle="dash";e._p3dashN=0;
        e._dashChargeEnd=now+400;
        g.dn.push({x:e.x,y:e.y-e.r-10,d:"⚠️",life:0.5,color:"#FF4040"});
      }
    }
    // Phase 2 瞬移前抖動
    if(e._teleShake&&now<e._teleShake){
      e.x+=(Math.random()-.5)*3;e.y+=(Math.random()-.5)*3;}
  }

  // 小惡魔 AI：瞬移追擊
  g.ene.forEach(me=>{
    if(!me.miniDemon||me.hp<=0)return;
    if(!me._demonTeleCD)me._demonTeleCD=now+4000;
    if(now>me._demonTeleCD){me._demonTeleCD=now+4000+rn(0,2000);
      const mdx=g.p.x-me.x,mdy=g.p.y-me.y,md=Math.sqrt(mdx*mdx+mdy*mdy)||1;
      if(md>60){// 瞬移到玩家附近
        for(let gi=0;gi<3;gi++)par.push({x:me.x,y:me.y,vx:0,vy:0,life:.4,color:"rgba(142,68,173,.4)",sz:me.r});
        const ma=Math.atan2(mdy,mdx)+rn(-.5,.5),mr=40+rn(0,20);
        me.x=cl(g.p.x-Math.cos(ma)*mr,me.r,mapW()-me.r);me.y=cl(g.p.y-Math.sin(ma)*mr,me.r,mapH()-me.r);
        burst(me.x,me.y,"#8E44AD",6);sfxBossAtk("teleport");
      }
    }
  });

  g.lS=now; // suppress normal spawns
}

export function drawStageBoss(e,now){
  if(!e||e.hp<=0)return;
  const cx=getCx();
  const lv=e.stageBoss,shielded=e._spawnShield&&now<e._spawnShield;cx.save();
  const bounce=Math.sin(now/(lv===20?200:300))*4,breathe=1+Math.sin(now/400)*.06;
  // 受擊反饋：短暫縮放脈衝（快速恢復，不會持續變形）
  const hitPulse=e.st>0?1+Math.max(0,1-e.st/300)*.12:0;
  const scaleX=breathe+(hitPulse>0?hitPulse*.04:0);
  const scaleY=breathe-(hitPulse>0?hitPulse*.03:0);
  // 護盾視覺（加大 + 多層 + 脈動）
  if(shielded){
    const sp=Math.sin(now/80)*.2;
    cx.globalAlpha=.15+sp;cx.fillStyle="#4DABF7";cx.beginPath();cx.arc(e.x,e.y+bounce,e.r*2.4,0,Math.PI*2);cx.fill();
    cx.globalAlpha=.4+sp;cx.strokeStyle="#fff";cx.lineWidth=3;cx.beginPath();cx.arc(e.x,e.y+bounce,e.r*2,0,Math.PI*2);cx.stroke();
    cx.globalAlpha=.6;cx.strokeStyle="#4DABF7";cx.lineWidth=1.5;cx.beginPath();cx.arc(e.x,e.y+bounce,e.r*2.2+Math.sin(now/120)*3,0,Math.PI*2);cx.stroke();
    cx.globalAlpha=1;
  }
  if(lv===30){const phase=e.sbPhase;
    // 亮色底圖光盤（讓Boss在暗背景中清楚可見）
    const grad=cx.createRadialGradient(e.x,e.y+bounce,0,e.x,e.y+bounce,e.r*3);
    const pulse=.5+Math.sin(now/200)*.15;
    if(phase===1){grad.addColorStop(0,"rgba(200,140,255,"+(.45*pulse)+")");grad.addColorStop(.4,"rgba(155,89,182,"+(.3*pulse)+")");grad.addColorStop(1,"rgba(155,89,182,0)");}
    else if(phase===2){grad.addColorStop(0,"rgba(255,120,100,"+(.5*pulse)+")");grad.addColorStop(.4,"rgba(231,76,60,"+(.35*pulse)+")");grad.addColorStop(1,"rgba(231,76,60,0)");}
    else{grad.addColorStop(0,"rgba(255,80,80,"+(.6*pulse)+")");grad.addColorStop(.35,"rgba(220,50,50,"+(.4*pulse)+")");grad.addColorStop(1,"rgba(192,57,43,0)");}
    cx.globalAlpha=1;cx.fillStyle=grad;cx.beginPath();cx.arc(e.x,e.y+bounce,e.r*3,0,Math.PI*2);cx.fill();
    // 外圈亮環
    const ringPulse=.6+Math.sin(now/120)*.2;
    cx.globalAlpha=ringPulse;cx.strokeStyle=phase===1?"#C89DFF":phase===2?"#FF6B6B":"#FF4040";cx.lineWidth=2.5;
    cx.beginPath();cx.arc(e.x,e.y+bounce,e.r*2.2+Math.sin(now/100)*3,0,Math.PI*2);cx.stroke();
    if(phase>=2){cx.globalAlpha=ringPulse*.6;cx.strokeStyle=phase===2?"#E74C3C":"#FF4040";cx.lineWidth=1.5;cx.beginPath();cx.arc(e.x,e.y+bounce,e.r*2.8+Math.sin(now/80)*4,0,Math.PI*2);cx.stroke();}
    if(phase===3){cx.globalAlpha=.2+Math.sin(now/60)*.1;cx.fillStyle="#E74C3C";cx.beginPath();cx.arc(e.x,e.y+bounce,e.r*3.2,0,Math.PI*2);cx.fill();}}
  cx.globalAlpha=e.st>0?.85:1;cx.font=`${lv===20?e.r*1.8:e.r*2}px 'Nunito',sans-serif`;cx.textAlign="center";cx.textBaseline="middle";
  cx.save();cx.translate(e.x,e.y+bounce);cx.scale(scaleX,scaleY);
  if(lv===20){const rageShake=e._pooRage?(Math.random()-.5)*.15:0;cx.rotate(Math.sin(now/500)*.06+rageShake);cx.fillText("💩",0,0);}
  else{
    if(e.sbPhase>=2)cx.translate((Math.random()-.5)*2,(Math.random()-.5)*2);
    // 亮色光暈底層（讓 emoji 從暗背景中突出）
    const gPhase=e.sbPhase||1;
    const glowCol=gPhase===1?"rgba(190,120,255,.6)":gPhase===2?"rgba(231,100,100,.6)":"rgba(255,80,80,.7)";
    cx.shadowColor=glowCol;cx.shadowBlur=20;
    cx.fillText("😈",0,0);
    // 再疊一層加強亮度
    cx.shadowBlur=35;cx.globalAlpha=.5;cx.fillText("😈",0,0);
    cx.shadowBlur=0;
  }
  cx.restore();
  // HP bar
  const barW=e.r*2.5,barH=5,bx2=e.x-barW/2,by2=e.y-e.r-16+bounce;
  cx.globalAlpha=.6;cx.fillStyle="#333";cx.fillRect(bx2,by2,barW,barH);
  const hpCol=lv===20?"#8B6914":(e.sbPhase===1?"#9B59B6":e.sbPhase===2?"#E74C3C":"#C0392B");
  cx.fillStyle=hpCol;cx.fillRect(bx2,by2,barW*Math.max(0,e.hp/e.mhp),barH);
  cx.globalAlpha=.8;cx.strokeStyle="#fff";cx.lineWidth=.5;cx.strokeRect(bx2,by2,barW,barH);
  // 暗黑脈衝蓄力視覺（Phase 3 循環中）
  if(e._p3cycle==="pulse_warn"&&e._p3t){
    const elapsed=now-e._p3t,prog=Math.min(1,elapsed/2000);
    const pulseR=100+prog*80;
    // 內圈收縮（暗能量匯聚）
    cx.globalAlpha=.1+prog*.25;cx.fillStyle="#9B59B6";
    cx.beginPath();cx.arc(e.x,e.y,pulseR*(1-prog*.5),0,Math.PI*2);cx.fill();
    // 外圈擴張（衝擊波預告）
    cx.globalAlpha=.15+prog*.2;cx.strokeStyle="#E74C3C";cx.lineWidth=3+prog*4;
    cx.beginPath();cx.arc(e.x,e.y,pulseR,0,Math.PI*2);cx.stroke();
    // 能量線條匯聚
    for(let i=0;i<8;i++){
      const la=Math.PI*2*i/8+now/300,lr=pulseR*(1.2-prog*.4);
      cx.globalAlpha=.3*prog;cx.strokeStyle="#DA77F2";cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(e.x+Math.cos(la)*lr,e.y+Math.sin(la)*lr);
      cx.lineTo(e.x+Math.cos(la)*20,e.y+Math.sin(la)*20);cx.stroke();
    }
    // 安全區提示圈（綠色虛線 + 文字）
    cx.globalAlpha=.3+Math.sin(now/100)*.15;cx.strokeStyle="#51CF66";cx.lineWidth=2.5;cx.setLineDash([5,4]);
    cx.beginPath();cx.arc(e.x,e.y,150,0,Math.PI*2);cx.stroke();cx.setLineDash([]);
    cx.globalAlpha=.08;cx.fillStyle="#51CF66";cx.beginPath();cx.arc(e.x,e.y,150,0,Math.PI*2);cx.fill();
    cx.globalAlpha=.7;cx.font="bold 10px 'Nunito',sans-serif";cx.textAlign="center";cx.fillStyle="#51CF66";
    cx.fillText("← 安全區 →",e.x,e.y+150+14);
  }
  cx.restore();
}

export function drawMiniEnemy(e,now){
  const cx=getCx();
  cx.save();const bounce=Math.sin(now/120+e.t)*3,wobble=Math.sin(now/200+e.t*2)*.15;
  cx.translate(e.x,e.y+bounce);cx.rotate(wobble);
  const sz=e.ragePoo?16:e.miniPoo?20:16;
  cx.font=sz+"px 'Nunito',sans-serif";cx.textAlign="center";cx.textBaseline="middle";
  if(e.ragePoo){cx.globalAlpha=.5;cx.fillText("💩",0,0);}
  else cx.fillText(e.miniPoo?"💩":"😈",0,0);
  cx.restore();
}

export function checkStageBossDeath(){
  if(!g._stageBossActive||!_stageBoss)return;
  if(_stageBoss.hp<=0){
    const lv=_stageBoss.stageBoss,e=_stageBoss;
    g._stageBossActive=false;bossBgmStop();
    // 波次制：Boss 擊敗後給休息時間，避免立刻出怪
    if(g._ew){g._ew.active=false;g._ew.restEnd=performance.now()+4000;}
    g.ebul=[]; // 清空敵彈
    if(lv===20){burst(e.x,e.y,"#8B6914",30);burst(e.x,e.y,"#FFD43B",20);sfx("phoenix");
      g.dn.push({x:e.x,y:e.y-40,d:"💩 Boss 擊敗！",life:3,color:"#FFD43B",big:1});
      g.dn.push({x:g.p.x,y:g.p.y-60,d:"📦 寶箱獎勵！",life:2.5,color:"#FFD43B",big:1});
      setTimeout(()=>spawnBonusCrates(2),1500);
      g.ene=g.ene.filter(oe=>{if(oe===e||oe.miniPoo||oe.ragePoo){burst(oe.x,oe.y,"#A0822A",5);return false;}return true;});
      _stageBoss=null;
    }else if(lv===30){
      bgmStop();
      // 清除殘留 DOM overlay
      const dov=document.getElementById("_demonDealOv");if(dov&&dov.parentNode)dov.parentNode.removeChild(dov);
      g.ene.forEach(oe=>burst(oe.x,oe.y,oe.color,8));g.ene=[];g.ebul=[];_stageBoss=null;
      triggerVictory(e);
    }
  }
}
