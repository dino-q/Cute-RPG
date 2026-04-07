// Main game loop — extracted from main.js (Stage 3-14)
import {
  PI, TAU, PR, ER, BR, PS,
  AUTO_CD, HOLD_CD, ULT_CHARGE_NEED,
  BH_DURATION_MS, BH_COOLDOWN_MS, CRATE_HP, BOSS_EVERY,
  MAX_PARTICLES, MAX_BULLETS, MAX_ENEMIES,
  SP_B, SPAWN_R, ULT_D, MAX_EBULLETS,
  PLAYER_DMG_SCALE, ENEMY_HP_SCALE, LIGHTNING_CAP, HOLD_COOLDOWN_NEED,
  ROLE_NORMAL, ROLE_FLANKER, ROLE_SHOOTER, ROLE_DASHER, ROLE_SHIELD,
  CHAR, MODE, RW, RC, RECOMMENDED, RG, LVC, EC, TC,
  pickRole, charCfg
} from "./config.js";
import { di, cl, rn, $ } from "./utils.js";
import { C, rndBuff } from "./cards.js";
import { sfx, sfxHit, sfxCtx, getActx, bgmPlay, bgmStop, bgmRef } from "./audio.js";
import {
  setCx, getCx, setG, getG, setFxQ, getFxQ,
  par, resetPar, setPar, filterPar, resetLtnRingIdx,
  burst, addLtn, bCol, drawPoly, drawStar, WP, getWpn,
  drawPlayer, drawEnemy
} from "./render.js";
import {
  initHud, setHudG, setHudCoopState, setHudSkillCd, getHudSkillCd,
  setHudAim, setHudVW, setHudVH, showPlayerDmg, hud, showHint, drawMinimap
} from "./hud.js";
import {
  joy, aim, ks, initInput, setupInputListeners, setStick, resetControls, resetJoyAim,
  attachTouchToStick, rebindActiveTouches,
  getClientUltReq, setClientUltReq, getClientDodgeReq, setClientDodgeReq
} from "./input.js";
import {
  initEnemies, setEnemiesG, setEnemiesMode, setEnemiesCoopMode, setEnemiesPracticeMode,
  maxTierForWave, enemyGrowth, tierHpFor, pickEnemyTier, spawnTargetForWave,
  spikeConfigForWave, genCrates, spawnBonusCrates, spawn, _coopGenCircles,
  triggerSpikeWave, triggerHuntPressure
} from "./enemies.js";
import {
  initCombat, setCombatG, setCombatMode, setCombatCoopState, setCombatInv,
  setCombatSkillCd, getCombatSkillCd, setCombatP2SkillCd, getCombatP2SkillCd,
  setCombatClientSkillReq, getCombatClientSkillReq,
  nearestTargets, awardEnemyKill, settleEnemyDeaths, fire, swordSwing, shieldBash, tapAtk
} from "./combat.js";
import {
  initSkills, setSkillsG, setSkillsCoopState, setSkillsClientSkillReq, getSkillsClientSkillReq,
  getDashGhosts, resetDashGhosts, SKILL_CDS,
  getSkillCdEnd, setSkillCdEnd, getP2SkillCdEnd, setP2SkillCdEnd,
  p2UseSkill, useCharSkill, skillSnipe, skillGhostSlash, skillTaunt, _startDash, doUlt
} from "./skills.js";
import {
  initCardsUi, setCardsUiG, setCardsUiInv, getCardLv, addCard, pks,
  showPick, showAngelCard, triggerBigChest, getCurrentPickCtx
} from "./cards-ui.js";
import {
  initBoss, setBossG, setBossCoopMode, setBossIsElite,
  getStageBoss, setStageBoss, bossBgmStart, bossBgmStop, bossBgmSetBpm,
  sfxBossEntrance, sfxBossAtk, triggerStageBoss, updateStageBoss,
  drawStageBoss, drawMiniEnemy, checkStageBossDeath
} from "./boss.js";
import {
  initCoop, setCoopVW, setCoopVH,
  _coopGenCode,
  showCoopLobby, coopShowCreate, coopShowJoin, coopCreateCustom, coopBack, coopCreateRoom, _coopDoCreate,
  coopJoinRoom, coopStart, _coopStartReal,
  _sendP2Pick, _handleP2Reroll, _applyP2Card, showCoopPick,
  serializeCoopState as _serializeCoopState,
  applyCoopState as _applyCoopState,
  clientRenderLoop as _clientRenderLoop
} from "./coop.js";
import {
  initPractice, bindPracticeToWindow,
  getPracticeMode, setPracticeMode,
  getPracFiniteHp, setPracFiniteHp,
  openPractice, exitPractice,
  pracClear, pracRebuildCards,
  pracRefreshStats, showCardTip
} from "./practice.js";
import {
  initUi,
  expForLevel, resize, show, resumeGame, resetSessionUi,
  sfxVictory, playEndCutscene,
  showVictoryScreen, triggerVictory, showOver,
  openSettings, closeSettings, settingsGoHome, toggleStatsPanel,
  drawPhoenixSprite, triggerPhoenixRevive, phoenixAnimLoop,
  getPhoenixAnim, setPhoenixAnim, getPhoenixT, setPhoenixT
} from "./ui.js";

/* ═══ module-level vars (set by initLoop / setLoopInv / startGame) ═══ */
let g, cx, fxctx, fxc;
let VW, VH;
let _mode, _charType;
let _isElite; // function
let _isCoopMode, _net, _p2AI, _p2Input;
let _hitFlash = 0, _shakeT = 0, _shakePow = 0;
let inv = [], inv2 = [];
let raf, cTimer;
// dragon pet sprite refs
let _dpWingImg, _dpBodyImg, _dpW, _dpH, _dpJX, _dpJY;
// map helpers
let mapW, mapH, crateActive;

export function initLoop(deps) {
  if (deps.getG)        g         = deps.getG();
  if (deps.getCx)       cx        = deps.getCx();
  if (deps.getFxctx)    fxctx     = deps.getFxctx();
  if (deps.getFxc)      fxc       = deps.getFxc();
  if (deps.getVW)       VW        = deps.getVW();
  if (deps.getVH)       VH        = deps.getVH();
  if (deps.getMode)     _mode     = deps.getMode();
  if (deps.getCharType) _charType = deps.getCharType();
  if (deps.isElite)     _isElite  = deps.isElite;
  if (deps.getIsCoopMode) _isCoopMode = deps.getIsCoopMode();
  if (deps.getNet)      _net      = deps.getNet();
  if (deps.getP2AI)     _p2AI     = deps.getP2AI();
  if (deps.getP2Input)  _p2Input  = deps.getP2Input();
  if (deps.mapW)        mapW      = deps.mapW;
  if (deps.mapH)        mapH      = deps.mapH;
  if (deps.crateActive) crateActive = deps.crateActive;
  // dragon pet
  if (deps.getDpWingImg) _dpWingImg = deps.getDpWingImg();
  if (deps.getDpBodyImg) _dpBodyImg = deps.getDpBodyImg();
  if (deps.getDpW)       _dpW       = deps.getDpW();
  if (deps.getDpH)       _dpH       = deps.getDpH();
  if (deps.getDpJX)      _dpJX      = deps.getDpJX();
  if (deps.getDpJY)      _dpJY      = deps.getDpJY();
}

// Called from startGame() to refresh all mutable main.js refs for this run
export function syncLoopState(deps) {
  if (deps.g        !== undefined) g        = deps.g;
  if (deps.cx       !== undefined) cx       = deps.cx;
  if (deps.fxctx    !== undefined) fxctx    = deps.fxctx;
  if (deps.fxc      !== undefined) fxc      = deps.fxc;
  if (deps.VW       !== undefined) VW       = deps.VW;
  if (deps.VH       !== undefined) VH       = deps.VH;
  if (deps.mode     !== undefined) _mode    = deps.mode;
  if (deps.charType !== undefined) _charType= deps.charType;
  if (deps.isCoopMode!==undefined) _isCoopMode = deps.isCoopMode;
  if (deps.net      !== undefined) _net     = deps.net;
  if (deps.p2AI     !== undefined) _p2AI    = deps.p2AI;
  if (deps.p2Input  !== undefined) _p2Input = deps.p2Input;
  if (deps.inv      !== undefined) inv      = deps.inv;
  if (deps.inv2     !== undefined) inv2     = deps.inv2;
}

// Getters/setters for mutable vars that must be read/written from main.js
export function getRaf()    { return raf; }
export function setRaf(v)   { raf = v; }
export function getCTimer() { return cTimer; }
export function setCTimer(v){ cTimer = v; }
export function setLoopShake(t, p) { _shakeT = t; _shakePow = p; }
export function setLoopHitFlash(v) { _hitFlash = v; }
// Sync mode/char/coop state when changed outside the loop
export function setLoopMode(v)       { _mode = v; }
export function setLoopCharType(v)   { _charType = v; }
export function setLoopCoopState(isCoop, net, p2ai, p2input) {
  _isCoopMode = isCoop; _net = net; _p2AI = p2ai; if (p2input) _p2Input = p2input;
}
export function setLoopVWVH(vw, vh) { VW = vw; VH = vh; }
export function setLoopG(gg)        { g = gg; }
export function setLoopCanvas(newCx, newFxctx, newFxc) { cx = newCx; fxctx = newFxctx; fxc = newFxc; }

/* ═══ camera ═══ */
export function cam(){const w=mapW(),h=mapH();const t=(_isCoopMode&&_net&&_net.role==="client"&&g.p2)?g.p2:g.p;return{x:cl(t.x-VW/2,0,w-VW),y:cl(t.y-VH/2,0,h-VH)};}

/* ═══ Co-op helpers ═══ */
export function nearestPlayer(e){if(!_isCoopMode||!g.p2||g.p2._downed)return g.p;if(g.p._downed)return g.p2;return di(e,g.p)<di(e,g.p2)?g.p:g.p2;}
export function bothPlayers(){return(_isCoopMode&&g.p2)?[g.p,g.p2]:[g.p];}

/* ═══ serializeCoopState wrapper (called inside loop) ═══ */
function serializeCoopState(){
  return _serializeCoopState(g,cam,par,getDashGhosts,getP2SkillCdEnd,aim,ULT_CHARGE_NEED);
}

/* ═══════ MAIN LOOP ════════ */
export function loop(){
  // 鳳凰復活動畫（遊戲暫停期間獨立運行）
  if(getPhoenixAnim()){
    g.time=performance.now();
    filterPar(p=>{p.x+=p.vx;p.y+=p.vy;if(p.g)p.vy+=p.g;p.life-=.025;return p.life>0;});
    g.dn=g.dn.filter(d=>{d.y-=1.1;d.life-=.025;return d.life>0;});
    const cm=cam();cx.clearRect(0,0,VW,VH);cx.save();cx.translate(-cm.x,-cm.y);
    const tileS=80,sxT=Math.floor(cm.x/tileS),syT=Math.floor(cm.y/tileS);
    const exT=Math.ceil((cm.x+VW)/tileS),eyT=Math.ceil((cm.y+VH)/tileS);
    for(let ty=syT;ty<=eyT;ty++)for(let tx=sxT;tx<=exT;tx++){
      cx.fillStyle=(tx+ty)%2===0?"#0d0d22":"#0a0a18";cx.fillRect(tx*tileS,ty*tileS,tileS,tileS);}
    g.ene.forEach(e=>{if(e.hp>0)drawEnemy(e);});
    cx.save();cx.shadowColor="#74C0FC";cx.shadowBlur=20;
    drawPlayer(g.p.x,g.p.y,PR,g.time/1000,"#74C0FC",g.p.face);cx.restore();
    phoenixAnimLoop();
    par.forEach(p=>{cx.globalAlpha=p.life;cx.fillStyle=p.color;cx.beginPath();cx.arc(p.x,p.y,p.sz,0,Math.PI*2);cx.fill();});
    cx.globalAlpha=1;
    g.dn.forEach(d=>{cx.save();cx.globalAlpha=d.life;cx.font=(d.big?"bold 15px":"11px")+" Nunito,sans-serif";
      cx.fillStyle=d.color;cx.textAlign="center";cx.fillText(d.d,d.x,d.y);cx.restore();});
    cx.restore();raf=requestAnimationFrame(loop);return;}
  if(!g||!g.run){raf=requestAnimationFrame(loop);return;}
  try{ // 保護 loop 不被未捕獲異常中斷
  // Client: 送操作，然後和 HOST 共用同一套渲染代碼
  const _isClientMode=!!(_isCoopMode&&_net&&_net.role==="client"&&_net.connected);
  if(_isClientMode){
    try{
      g.time=performance.now();
      if(_net.conn&&_net.conn.open){_net.conn.send({t:"inp",jx:joy.dx,jy:joy.dy,ja:joy.a,aa:aim.a,ax:aim.dx,ay:aim.dy,ult:!!getClientUltReq(),dodge:!!getClientDodgeReq(),pick:-1,skill:!!getSkillsClientSkillReq()});}
      setSkillsClientSkillReq(false);setClientUltReq(false);setClientDodgeReq(false);
    }catch(e){console.error("CLIENT input error:",e);}
    // 不 return — 繼續往下跑渲染代碼
  }
  const now=performance.now(),frameMs=Math.min(now-g.lf,33),dt=frameMs/16.67;g.lf=now;g.time=now;
  if(!_isClientMode){ // ═══ 以下遊戲邏輯只在 HOST 端執行 ═══
  var bhSafe=!!(g.p.bhSafeEnd&&now<g.p.bhSafeEnd);
  setFxQ(frameMs>24?Math.max(.45,getFxQ()-.05):Math.min(1,getFxQ()+.02));

  // 鬼斬衝刺動畫
  if(g.p._gsDash){
    var gd=g.p._gsDash,gp=Math.min(1,(now-gd.startT)/gd.dur);
    var ease=gp<.5?2*gp*gp:1-Math.pow(-2*gp+2,2)/2; // easeInOut
    g.p.x=gd.startX+(gd.endX-gd.startX)*ease;
    g.p.y=gd.startY+(gd.endY-gd.startY)*ease;
    if(gp>=1)g.p._gsDash=null;
  }
  // move P1
  if(!g.p._gsDash&&!g.p._downed){
    if(joy.a){g.p.x+=joy.dx*g.p.speed*dt;g.p.y+=joy.dy*g.p.speed*dt;if(Math.abs(joy.dx)>.2)g.p.face=joy.dx>0?1:-1;}
  }else if(g.p._downed&&joy.a){
    g.p.x+=joy.dx*.5*dt;g.p.y+=joy.dy*.5*dt; // 倒地爬行
  }
  g.p.x=cl(g.p.x,PR+4,mapW()-PR-4);g.p.y=cl(g.p.y,PR+4,mapH()-PR-4);
  // P2 鬼斬衝刺動畫
  if(_isCoopMode&&g.p2&&g.p2._gsDash){
    var gd2=g.p2._gsDash,gp2=Math.min(1,(now-gd2.startT)/gd2.dur);
    var ease2=gp2<.5?2*gp2*gp2:1-Math.pow(-2*gp2+2,2)/2;
    g.p2.x=gd2.startX+(gd2.endX-gd2.startX)*ease2;
    g.p2.y=gd2.startY+(gd2.endY-gd2.startY)*ease2;
    if(gp2>=1)g.p2._gsDash=null;
  }
  // move P2 (co-op) — AI 模式跳過（AI 自己控制移動）
  if(_isCoopMode&&g.p2&&!_p2AI){
    var p2i=(_net&&_net.role==="host")?_p2Input:joy; // Client 用自己的 joy
    if(g.p2._gsDash){
      // 鬼斬衝刺中，不處理手動移動
    }else if(!g.p2._downed){
      if(p2i.dx||p2i.dy){g.p2.x+=p2i.dx*g.p2.speed*dt;g.p2.y+=p2i.dy*g.p2.speed*dt;if(Math.abs(p2i.dx)>.2)g.p2.face=p2i.dx>0?1:-1;}
    }else{
      if(p2i.dx||p2i.dy){g.p2.x+=p2i.dx*.5*dt;g.p2.y+=p2i.dy*.5*dt;} // 倒地爬行
    }
    g.p2.x=cl(g.p2.x,PR+4,mapW()-PR-4);g.p2.y=cl(g.p2.y,PR+4,mapH()-PR-4);
  }
  // AI P2 行為
  if(_p2AI&&g.p2&&!g.p2._downed&&!g.p2._gsDash&&_isCoopMode){
    if(!g.p2._aiWander){g.p2._aiWander={tx:g.p2.x,ty:g.p2.y,nextT:0};}
    var aw=g.p2._aiWander;
    var spd2=g.p2.speed*dt;
    // 找有護盾的 Boss（需要去佔圈）
    var shieldBoss=null;
    g.ene.forEach(e=>{if(e.boss&&e._coopShield&&e._coopCircles)shieldBoss=e;});
    // P1 倒地 → 最優先去救
    if(g.p._downed){
      var rdx=g.p.x-g.p2.x,rdy=g.p.y-g.p2.y,rd=Math.sqrt(rdx*rdx+rdy*rdy)||1;
      if(rd>30){g.p2.x+=rdx/rd*spd2;g.p2.y+=rdy/rd*spd2;}
    }
    // 有護盾 Boss → 去佔一個圈
    else if(shieldBoss){
      var c=shieldBoss._coopCircles;
      var p1on0=di(g.p,c[0])<30,p1on1=di(g.p,c[1])<30;
      var target=p1on0?c[1]:p1on1?c[0]:(di(g.p2,c[0])<di(g.p2,c[1])?c[0]:c[1]);
      var tdx=target.x-g.p2.x,tdy=target.y-g.p2.y,td=Math.sqrt(tdx*tdx+tdy*tdy)||1;
      if(td>20){g.p2.x+=tdx/td*spd2;g.p2.y+=tdy/td*spd2;}
      // 邊走邊閃
      var dodgeT=Math.sin(now/400)*1.5;
      g.p2.x+=Math.cos(Math.atan2(tdy,tdx)+Math.PI/2)*dodgeT*dt;
      if(Math.abs(tdx)>.2)g.p2.face=tdx>0?1:-1;
      _p2Input.aimA=1;
    }
    // 有敵人 → 隨機走位 + 射擊 + 閃避
    else{
      var aiTarget=null,aiDist=1e9;
      g.ene.forEach(e=>{if(e.hp<=0||e.ragePoo)return;var d=di(g.p2,e);if(d<aiDist){aiDist=d;aiTarget=e;}});
      var _p2IsMelee=charCfg(g.p2.charType).atkType==="melee";
      // 近戰 AI：直接衝向敵人（到攻擊距離內）
      if(_p2IsMelee&&aiTarget&&aiDist>PR*2.5){
        var adx=aiTarget.x-g.p2.x,ady=aiTarget.y-g.p2.y,ad2=Math.sqrt(adx*adx+ady*ady)||1;
        g.p2.x+=adx/ad2*spd2*1.1;g.p2.y+=ady/ad2*spd2*1.1;
        aw.nextT=now+500; // 短間隔重新評估
      }
      // 遠程 AI：隨機漫遊保持距離
      else{
        if(now>aw.nextT){
          var cx2=aiTarget?aiTarget.x:g.p.x,cy2=aiTarget?aiTarget.y:g.p.y;
          var wRange=_p2IsMelee?40:(aiTarget?120:100); // 近戰漫遊範圍小
          aw.tx=cx2+rn(-wRange,wRange);aw.ty=cy2+rn(-wRange,wRange);
          aw.tx=cl(aw.tx,PR+20,mapW()-PR-20);aw.ty=cl(aw.ty,PR+20,mapH()-PR-20);
          aw.nextT=now+(_p2IsMelee?rn(600,1200):rn(1500,3000));
        }
        var wdx=aw.tx-g.p2.x,wdy=aw.ty-g.p2.y,wd=Math.sqrt(wdx*wdx+wdy*wdy)||1;
        if(wd>15){g.p2.x+=wdx/wd*spd2*.7;g.p2.y+=wdy/wd*spd2*.7;}
      }
      if(aiTarget&&Math.abs(aiTarget.x-g.p2.x)>.2)g.p2.face=(aiTarget.x-g.p2.x)>0?1:-1;
      _p2Input.aimA=aiTarget?1:0;
      // 離 P1 太遠時趨近
      var p1d=di(g.p,g.p2);
      if(p1d>300){var fdx=g.p.x-g.p2.x,fdy=g.p.y-g.p2.y,fd=Math.sqrt(fdx*fdx+fdy*fdy)||1;g.p2.x+=fdx/fd*spd2*.4;g.p2.y+=fdy/fd*spd2*.4;}
    }
    // === AI 閃避：遠離太近的敵人（<55px 時反方向推開）===
    var evadeX=0,evadeY=0;
    g.ene.forEach(e=>{
      if(e.hp<=0)return;
      var ed=di(g.p2,e);
      if(ed<55+e.r){
        var ex=g.p2.x-e.x,ey=g.p2.y-e.y,el=Math.sqrt(ex*ex+ey*ey)||1;
        var push=(55+e.r-ed)/(55+e.r); // 越近推力越大
        evadeX+=ex/el*push*2;evadeY+=ey/el*push*2;
      }
    });
    // 閃避敵彈
    g.ebul.forEach(b=>{
      var bd=di(g.p2,b);
      if(bd<40){
        var bx=g.p2.x-b.x,by=g.p2.y-b.y,bl=Math.sqrt(bx*bx+by*by)||1;
        evadeX+=bx/bl*1.5;evadeY+=by/bl*1.5;
      }
    });
    if(evadeX||evadeY){
      g.p2.x+=evadeX*spd2;g.p2.y+=evadeY*spd2;
    }
    g.p2.x=cl(g.p2.x,PR+4,mapW()-PR-4);g.p2.y=cl(g.p2.y,PR+4,mapH()-PR-4);
  }
  // AI 倒地爬向 P1
  if(_p2AI&&g.p2&&g.p2._downed&&!g.p._downed&&_isCoopMode){
    var rdx=g.p.x-g.p2.x,rdy=g.p.y-g.p2.y,rd=Math.sqrt(rdx*rdx+rdy*rdy)||1;
    g.p2.x+=rdx/rd*.5*dt;g.p2.y+=rdy/rd*.5*dt;
  }

  // heat system
  if(g.heatCD>0){g.heatCD-=dt*16.67;if(g.heatCD<=0){g.heatCD=0;g.heat=0;}}
  else if(g.huntModeUntil&&now<g.huntModeUntil){$("combo").innerHTML='<span style="display:inline-block;color:#fff;background:linear-gradient(135deg,#FA5252,#C92A2A);border:1px solid #FFA8A8;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:900;box-shadow:0 0 14px #FA5252aa;animation:gw .55s infinite">⚠️ 獵殺模式</span>';}
  else if(g._cw&&g._cw.raged&&g.ene.some(e=>e._rage&&e._rageDashes<3)){$("combo").innerHTML='<span style="display:inline-block;color:#fff;background:linear-gradient(135deg,#FA5252,#C92A2A);border:1px solid #FFA8A8;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:900;box-shadow:0 0 14px #FA5252aa;animation:gw .55s infinite">⚠️ 獵殺模式</span>';}

  // ult charge — hold to charge, tap when full to detonate (non-black-hole)
  else if($("combo").innerHTML.includes("#FA5252aa")){$("combo").textContent="";}
  if(!g.p.hasBH&&!g.p.hasTS){
    if(g.ultHold&&g.ultCharge<ULT_CHARGE_NEED){var _pu=g.ultCharge;g.ultCharge=Math.min(g.ultCharge+(g.p.ultRate||1)*dt*1.2,ULT_CHARGE_NEED);if(_pu<ULT_CHARGE_NEED&&g.ultCharge>=ULT_CHARGE_NEED)g._ultReadyUntil=performance.now()+1500;}
    if(!g.ultHold&&g.ultCharge>0&&g.ultCharge<ULT_CHARGE_NEED){g.ultCharge=Math.max(0,g.ultCharge-dt*.4);}// slowly drain if released early
  }else g.ultHold=false;
  if(!g.heatCD&&aim.a&&!g.p._noOverheat){g.heat=Math.min(HOLD_COOLDOWN_NEED,g.heat+dt*16.67);}
  else if(g.heat>0&&!aim.a){g.heat=Math.max(0,g.heat-dt*40);}
  if(g.heat>=HOLD_COOLDOWN_NEED&&!g.heatCD&&!g.p._noOverheat){g.heatCD=700;g.heat=HOLD_COOLDOWN_NEED;}
  // 快過熱預警：標記給繪圖階段在主角頭上顯示
  g._heatWarn=(!g.heatCD&&g.heat/HOLD_COOLDOWN_NEED>.75&&!g.p._noOverheat);

  // 閃電步 dash movement + afterimage
  if(g.p._dashEnd&&now<g.p._dashEnd){
    var ds=g.p._dashSpd||8;
    g.p.x+=g.p._dashDx*ds*g.p.speed*dt;
    g.p.y+=g.p._dashDy*ds*g.p.speed*dt;
    g.p.x=cl(g.p.x,PR+4,mapW()-PR-4);g.p.y=cl(g.p.y,PR+4,mapH()-PR-4);
    // 閃電步：吸取路過的經驗球
    g.orbs.forEach(o=>{if(di(o,g.p)<80){o.x=g.p.x;o.y=g.p.y;}});
    // spawn afterimage every ~40ms
    if(!g.p._dashGT||now-g.p._dashGT>40){
      g.p._dashGT=now;
      getDashGhosts().push({x:g.p.x,y:g.p.y,face:g.p.face,life:1});
      if(getDashGhosts().length>8)getDashGhosts().shift();
    }
  }else if(g.p._dashEnd&&now>=g.p._dashEnd){
    g.p._dashEnd=0;g.p._inv=false;
    burst(g.p.x,g.p.y,"#FFE066",6);
  }
  // decay afterimages
  for(var i=getDashGhosts().length-1;i>=0;i--){getDashGhosts()[i].life-=.06*dt;if(getDashGhosts()[i].life<=0)getDashGhosts().splice(i,1);}

  // black-hole ult field: 3s duration, pull + stylish execute for non-boss enemies
  if(g.bhEnd&&now<g.bhEnd){
    var bhLv=(g.p.ultLv||0),bhR=170+bhLv*30;
    g.ene.forEach(e=>{
      if(e.stageBoss||(e.boss&&!e.miniPoo&&!e.miniDemon))return; // 真Boss免疫吸引，召喚怪可被吸
      var dx=g.p.x-e.x,dy=g.p.y-e.y,d=Math.sqrt(dx*dx+dy*dy)||1;
      if(d>bhR)return;
      var pull=(1-d/bhR)*(4+bhLv*1.2)*dt*16.67;
      e.x+=dx/d*pull;e.y+=dy/d*pull;
      if(!e.bhExeAt)e.bhExeAt=now+260; // brief vortex animation, then execute
    });
  }else if(g.bhEnd){
    g.p.bhSafeEnd=Math.max(g.p.bhSafeEnd||0,now+800);
    g.bhEnd=0;g.bhPow=1;
  }
  settleEnemyDeaths();

  // auto-aim target (attack input only triggers shooting, not direction control)
  var nr=null,nd=1e9;
  g.ene.forEach(e=>{if(e.ragePoo)return;var d=di(g.p,e);if(d<nd){nd=d;nr=e;}});
  g.crates.forEach(cr=>{if(!crateActive(cr))return;var d=di(g.p,cr);if(d<nd&&d<VW*.7){nd=d;nr=cr;}});
  if(nr){
    var dx=nr.x-g.p.x,dy=nr.y-g.p.y,d=Math.sqrt(dx*dx+dy*dy)||1;
    g.ad={x:dx/d,y:dy/d};
    if(Math.abs(g.ad.x)>.3)g.p.face=g.ad.x>0?1:-1;
  }else g.ad={x:0,y:-1};
  // 機關槍狂暴：連射3秒後觸發2秒加速
  if(g.p._minigunBerserk){
    if(aim.a){g.p._mgFireT=(g.p._mgFireT||0)+dt*16.67;
      if(g.p._mgFireT>=3000&&!g.p._mgBerserkEnd){g.p._mgBerserkEnd=now+2000;g.dn.push({x:g.p.x,y:g.p.y-30,d:"🔥 狂暴射擊！",life:1.5,color:"#FF4500",big:1});}
    }else{g.p._mgFireT=0;g.p._mgBerserkEnd=0;}
  }
  var mgBerserkMul=(g.p._mgBerserkEnd&&now<g.p._mgBerserkEnd)?.5:1;
  // 攻擊間隔：近戰用動畫時長，槍手用 HOLD_CD
  // 劍士鬼斬CD期間攻速+30%
  var _p1Cfg=charCfg(g.charType);
  var _gsAtkBuff=(g.charType==="swordsman"&&getSkillCdEnd()>0&&now<getSkillCdEnd())?.7:1;
  var _atkCD=_p1Cfg.atkCD?Math.round(_p1Cfg.atkCD*(g.p.fr||1)*_gsAtkBuff):HOLD_CD*(g.p.fr||1)*mgBerserkMul;
  if(aim.a&&!g.heatCD&&now-g.lhF>_atkCD){
    // 長按也累加 combo（近戰+槍手通用）
    aim.tn=(aim.tn||0)+1;
    if(!g.heatCD&&aim.tn>2)$("combo").textContent=aim.tn+"x COMBO!";
    // combo 集氣
    if(aim.tn>0&&!g.p.hasBH&&!g.p.hasTS){
      var _cp2=Math.min((aim.tn%50)/50,1);var _pu4=g.ultCharge;
      g.ultCharge=Math.max(g.ultCharge,_cp2*ULT_CHARGE_NEED);
      if(aim.tn%50===0)g.ultCharge=ULT_CHARGE_NEED;
      if(_pu4<ULT_CHARGE_NEED&&g.ultCharge>=ULT_CHARGE_NEED)g._ultReadyUntil=now+1500;
    }
    clearTimeout(cTimer);cTimer=setTimeout(()=>{if(!g.heatCD){$("combo").textContent="";}aim.tn=0;},700);
    if(g.charType==="swordsman"){swordSwing();}
    else if(g.charType==="tank"){shieldBash();}
    else{var bm=(g.p.berserk&&g.p.hp/g.p.maxHp<g.p.berserk)?2:1;fire((2.2+g.p.atk*.7)*bm,g.ad.x,g.ad.y,g.p._minigun?.12:.07);}
    // NOTE: 新角色若需要自訂攻擊，在上方 if-else 添加分支，或改用 atkType registry
    g.lhF=now;g.heat+=1;
  }

  // === P2 auto-aim + fire (co-op) ===
  if(_isCoopMode&&g.p2&&!g.p2._downed){
    // P2 auto-aim
    var nr2=null,nd2=1e9;
    g.ene.forEach(e=>{if(e.ragePoo)return;var d=di(g.p2,e);if(d<nd2){nd2=d;nr2=e;}});
    if(nr2){var dx2=nr2.x-g.p2.x,dy2=nr2.y-g.p2.y,d2=Math.sqrt(dx2*dx2+dy2*dy2)||1;g.p2._ad={x:dx2/d2,y:dy2/d2};if(Math.abs(g.p2._ad.x)>.3)g.p2.face=g.p2._ad.x>0?1:-1;}
    else{g.p2._ad=g.p2._ad||{x:0,y:-1};}
    // P2 hold-attack（根據 P2 角色類型分流）
    var p2aim=_p2AI?_p2Input.aimA:(_net&&_net.role==="host")?_p2Input.aimA:aim.a;
    if(!g.p2._lhF)g.p2._lhF=0;
    var p2ct=g.p2.charType||"gunner";
    var _p2Cfg=charCfg(p2ct);
    var _p2AtkCD=_p2Cfg.atkCD?Math.round(_p2Cfg.atkCD*(g.p2.fr||1)):HOLD_CD*(g.p2.fr||1);
    if(p2aim&&now-g.p2._lhF>_p2AtkCD){
      if(p2ct==="swordsman"){swordSwing(g.p2,true);}
      else if(p2ct==="tank"){shieldBash(g.p2,true);}
      else{var ad2=g.p2._ad||{x:0,y:-1};fire((2.2+g.p2.atk*.7),ad2.x,ad2.y,g.p2._minigun?.12:.07,g.p2);g._p2AtkAnim={active:true,startT:now};g._p2WbSwing=1;}
      g.p2._lhF=now;
    }
    // P2 技能：AI 自動施放 / 真人透過 _p2Input.skill
    if(_p2AI&&now>=getP2SkillCdEnd()){p2UseSkill();}
    else if(!_p2AI&&_p2Input&&_p2Input.skill){_p2Input.skill=false;p2UseSkill();}
    // P2 閃避
    if(_p2Input&&_p2Input.dodge){
      _p2Input.dodge=false;
      if(!g.p2._dodgeCD||now>=g.p2._dodgeCD){
        var dd=g.p2._ad||{x:0,y:-1};
        var dDist=40;
        g.p2.x=cl(g.p2.x+dd.x*dDist,PR+4,mapW()-PR-4);
        g.p2.y=cl(g.p2.y+dd.y*dDist,PR+4,mapH()-PR-4);
        g.p2._dodgeCD=now+1500;g.p2._inv=true;g.p2._iFrameEnd=now+300;
        burst(g.p2.x,g.p2.y,"#F06595",8);
      }
    }
    // P2 ult: AI 每 8 秒自動放一次，連線時用 _p2Input
    var p2ult=_p2AI?(now-(g.p2._aiUltT||0)>8000):(_p2Input&&_p2Input.ult);
    if(_p2Input&&_p2Input.ult)_p2Input.ult=false; // 消耗一次性 flag
    if(p2ult&&!g.p2._ultCooldown){
      if(_p2AI)g.p2._aiUltT=now;
      g.p2._ultCooldown=now+3000; // 3s cooldown for P2 ult
      g._p2UltTime=now;
      // check if P1 also pressed within 1 sec → combo triggers from P1's doUlt
      if(g._p1UltTime&&now-g._p1UltTime<1000){
        doUlt(); // triggers combo check inside doUlt
      }else{
        // P2 solo ult: basic damage burst
        var p2Dmg=(ULT_D+g.p2.atk*6+g.p2Level*5);
        g.ene.forEach(e=>{var d2=di(g.p2,e);if(d2<200){e.hp-=p2Dmg;g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(p2Dmg),life:1.3,color:"#F06595",big:1});if(e.hp<=0)burst(e.x,e.y,e.color,10);}});
        burst(g.p2.x,g.p2.y,"#F06595",20);g.ultFlash=.5;sfx("ult");
        g.dn.push({x:g.p2.x,y:g.p2.y-30,d:"💥 P2 大招！",life:1.5,color:"#F06595",big:1});
      }
    }
    if(g.p2._ultCooldown&&now>=g.p2._ultCooldown)g.p2._ultCooldown=0;
  }

  // co-op link aura（連攜光環：靠近 120px 內雙方攻擊 +30%）
  if(_isCoopMode&&g.p2&&!g.p._downed&&!g.p2._downed){
    var linkDist=di(g.p,g.p2);
    g._coopLink=linkDist<120;
  }else{g._coopLink=false;}

  // passive regen
  if(g.p.regen>0&&g.p.hp<g.p.maxHp)g.p.hp=Math.min(g.p.hp+g.p.regen*dt/60,g.p.maxHp);
  if(_isCoopMode&&g.p2&&g.p2.regen>0&&g.p2.hp<g.p2.maxHp&&!g.p2._downed)g.p2.hp=Math.min(g.p2.hp+g.p2.regen*dt/60,g.p2.maxHp);
  // ═══ 角色被動技能 ═══
  if(g.charType==="tank"){
    // 鐵壁被動：每5秒回10HP
    g.p._ironwallT=(g.p._ironwallT||0)+dt*16.67;
    if(g.p._ironwallT>=5000){g.p._ironwallT=0;if(g.p.hp<g.p.maxHp){g.p.hp=Math.min(g.p.hp+10,g.p.maxHp);g.dn.push({x:g.p.x,y:g.p.y-25,d:"+10",life:.6,color:"#51CF66"});}}
  }
  // 劍士被動（劍氣）在 swordSwing() 內處理
  // 坦克嘲諷攻擊加成到期（P1 + P2）
  if(g.p._tauntAtkEnd&&now>=g.p._tauntAtkEnd){g.p.atk-=(g.p._tauntAtkBonus||0);g.p._tauntAtkEnd=0;g.p._tauntAtkBonus=0;}
  if(g.p2&&g.p2._tauntAtkEnd&&now>=g.p2._tauntAtkEnd){g.p2.atk-=(g.p2._tauntAtkBonus||0);g.p2._tauntAtkEnd=0;g.p2._tauntAtkBonus=0;}
  // 鋼鐵意志：<30% HP 自動減傷+回血
  if(g.p._ironWill&&g.p.hp>0){
    var iwActive=g.p.hp/g.p.maxHp<.3;
    if(iwActive&&!g.p._iwActive){g.p._iwActive=true;g.dn.push({x:g.p.x,y:g.p.y-30,d:"💪 鋼鐵意志！",life:1.5,color:"#868E96",big:1});}
    if(!iwActive&&g.p._iwActive&&g.p.hp/g.p.maxHp>=.5)g.p._iwActive=false;
    if(g.p._iwActive){g.p.hp=Math.min(g.p.hp+g.p.maxHp*.03*dt/60,g.p.maxHp);}
  }
  // 守護者光環特效
  if(g.p._guardAura&&g.p._guardAura>0){
    // coop: P2 在範圍內減傷（在碰撞區處理）
    // 視覺光環在渲染區處理
  }
  // shield timer (守護星)
  if(g.p.shieldCD>0){g.p._shT=(g.p._shT||0)+dt*16.67;if(g.p._shT>=g.p.shieldCD&&!g.p._sh){g.p._sh=true;g.p._shT=0;g.p._shSpawn=now;burst(g.p.x,g.p.y,"#4DABF7",12);g.dn.push({x:g.p.x,y:g.p.y-30,d:"🛡️守護星",life:1,color:"#4DABF7"});}}
  // invincibility timer (天使之翼) — 用 game-time 計時，暫停時不消耗
  if(g.p.invCD>0){
    g.p._ivT=(g.p._ivT||0)+dt*16.67;
    if(g.p._ivT>=g.p.invCD&&!g.p._invEnd){g.p._inv=true;g.p._ivT=0;g.p._invEnd=now+(g.p.invDur||2e3);}
    if(g.p._invEnd&&now>=g.p._invEnd){g.p._inv=false;g.p._invEnd=0;}
  }

  // === 龍寵物系統 ===
  if(g.p._dragonBreath&&!g._dragonPet){
    g._dragonPet={x:g.p.x-30,y:g.p.y-35,face:1,breathCycle:0,_tgtE:null};
    g.dn.push({x:g.p.x,y:g.p.y-40,d:"🐉 噴火龍降臨！",life:2.5,color:"#FF922B",big:1});
  }
  if(g._dragonPet){
    var _dp=g._dragonPet;
    // 找最近敵人
    var _nrE=null,_nrD=1e9;
    g.ene.forEach(function(e){if(e.hp>0){var d3=di(_dp,e);if(d3<_nrD){_nrD=d3;_nrE=e;}}});
    _dp._tgtE=_nrE;
    var _dbLv=g.p._dragonBreath,_dbR=[0,110,140,180][_dbLv];
    var _dpMaxSpd=3.5*dt; // 噴火龍最大移動速度（每幀）
    if(_nrE&&_nrD<_dbR*2.5){
      // 有敵人在範圍內：飛向敵人（保持噴火距離）
      var _tAng=Math.atan2(_nrE.y-_dp.y,_nrE.x-_dp.x);
      var _idealD=_dbR*0.5;
      var _tgtX=_nrE.x-Math.cos(_tAng)*_idealD;
      var _tgtY=_nrE.y-Math.sin(_tAng)*_idealD+Math.sin(now/400)*4;
      var _dmx=(_tgtX-_dp.x)*.08*dt,_dmy=(_tgtY-_dp.y)*.08*dt;
      var _dmd=Math.sqrt(_dmx*_dmx+_dmy*_dmy);
      if(_dmd>_dpMaxSpd){_dmx=_dmx/_dmd*_dpMaxSpd;_dmy=_dmy/_dmd*_dpMaxSpd;}
      _dp.x+=_dmx;_dp.y+=_dmy;
      _dp.face=_nrE.x>_dp.x?1:-1;
    }else{
      // 沒有敵人或太遠：跟隨玩家（微浮動）
      var _fmx=(g.p.x-25*g.p.face-_dp.x)*.06*dt,_fmy=(g.p.y-30+Math.sin(now/400)*6-_dp.y)*.06*dt;
      var _fmd=Math.sqrt(_fmx*_fmx+_fmy*_fmy);
      if(_fmd>_dpMaxSpd){_fmx=_fmx/_fmd*_dpMaxSpd;_fmy=_fmy/_fmd*_dpMaxSpd;}
      _dp.x+=_fmx;_dp.y+=_fmy;
      _dp.face=g.p.face;
    }
    _dp.breathCycle=(_dp.breathCycle||0)+dt*16.67;
    var _cyc=_dp.breathCycle%3500;
    _dp.breathOn=_cyc<2000;
    // 只在有近距離敵人時才噴火
    if(_dp.breathOn&&_nrE&&_nrD<_dbR*1.5){
      var _dbA=[0,.45,.55,.65][_dbLv];
      var _dbD=(g.p.atk*.3+2)*(1+_dbLv*.3)*dt;
      var _bAng=Math.atan2(_nrE.y-_dp.y,_nrE.x-_dp.x);
      _dp._breathAng=_bAng;
      g.ene.forEach(function(e){if(e.hp<=0)return;
        var dx5=e.x-_dp.x,dy5=e.y-_dp.y,d5=Math.sqrt(dx5*dx5+dy5*dy5);
        if(d5>_dbR)return;var ea5=Math.atan2(dy5,dx5);
        var da5=Math.abs(((ea5-_bAng)%(PI*2)+PI*3)%(PI*2)-PI);
        if(da5>_dbA)return;var fd5=_dbD;if(e.boss)fd5=Math.min(fd5,.5*dt);
        e.hp-=fd5;e.burnT=Math.max(e.burnT||0,800);e.burnLv=Math.max(e.burnLv||0,_dbLv);
        if(Math.random()<.05)burst(e.x,e.y,"#FF4500",2);
      });
      g._dragonBreathFx={ang:_bAng,range:_dbR,arc:_dbA,on:true};
    }else{if(g._dragonBreathFx)g._dragonBreathFx.on=false;}
  }
  // Stage boss AI update
  if(g._stageBossActive&&getStageBoss()&&getStageBoss().hp>0)updateStageBoss(getStageBoss(),now,dt);
  // checkStageBossDeath 移到 DPS cap 之後，避免 cap 回血前 Boss 被判定死亡

  // 練習模式：鎖血（無限模式）或正常血量 + 跳過自動升級
  if(getPracticeMode()){if(!getPracFiniteHp()){g.p.hp=99999;g.p.maxHp=99999;}g.exp=0;g.lS=now;}
  // spawn system
  if(getPracticeMode()){/* skip */}
  else if(g._stageBossActive){g.lS=now;} // skip spawn during stage boss
  else if(_mode==="elite"||_mode==="coop"){
    // === 精英/coop模式：波次制 ===
    if(!g._ew)g._ew={num:0,restEnd:0,active:false};
    var ew=g._ew;
    var aliveEnemies=g.ene.filter(e=>e.hp>0&&!e.stageBoss).length;
    if(ew.active&&aliveEnemies===0){
      // 波次清完 → 休息（前期短，後期長）
      ew.active=false;ew.restEnd=now+(ew.num<6?1200:2000);
      g.dn.push({x:g.p.x,y:g.p.y-40,d:"✨ 波次清除！",life:1.5,color:"#51CF66",big:1});
    }
    if(!ew.active&&now>=ew.restEnd){
      ew.num++;ew.active=true;
      // 特殊波次
      var isBossWave=ew.num%8===0;
      var isMegaWave=ew.num%12===0;
      var isEliteWave=ew.num%4===0&&!isBossWave;
      if(isMegaWave){
        g.dn.push({x:g.p.x,y:g.p.y-60,d:`👑 第${ew.num}波 — 巨王！`,life:2.5,color:"#FFD43B",big:1});
        sfx("boss");spawn(true,{mega:true});spawn(false);spawn(false);
      }else if(isBossWave){
        g.dn.push({x:g.p.x,y:g.p.y-60,d:`⭐ 第${ew.num}波 — 小王！`,life:2.5,color:"#FF922B",big:1});
        sfx("boss");spawn(true);
      }else if(isEliteWave){
        g.dn.push({x:g.p.x,y:g.p.y-60,d:`⚠️ 第${ew.num}波 — 精英！`,life:2,color:"#E74C3C",big:1});
        sfx("boss");
        for(var i=0;i<2;i++)spawn(false); // 精英機率 20%，大概 1 隻精英+1 小怪
      }else{
        var waveSize=Math.min(4,ew.num<4?3:2+Math.floor(ew.num/8));
        g.dn.push({x:g.p.x,y:g.p.y-60,d:`⚠️ 第${ew.num}波`,life:1.5,color:"#FF6B6B"});
        for(var i=0;i<waveSize;i++)spawn(false);
      }
    }
  }else{
    // === 經典模式：大波次漸進制 ===
    if(!g._cw)g._cw={num:0,restEnd:0,phase:"rest",target:0,spawned:0,spawnT:0,waveStart:0,raged:false};
    var cw=g._cw;
    var aliveClassic=g.ene.filter(e=>e.hp>0&&!e.stageBoss).length;
    // 波次清完 → 休息
    if(cw.phase==="active"&&aliveClassic===0&&cw.spawned>=cw.target){
      cw.phase="rest";cw.restEnd=now+1500;
      g.dn.push({x:g.p.x,y:g.p.y-40,d:"✨ 波次清除！",life:1.5,color:"#51CF66",big:1});
    }
    // 休息結束 → 開始新波次
    if(cw.phase==="rest"&&now>=cw.restEnd){
      cw.num++;cw.phase="active";cw.spawned=0;cw.spawnT=now;cw.waveStart=now;cw.raged=false;
      g.wave=cw.num; // 同步 wave（影響敵人成長）
      // 經驗追趕提示：wave 超過 level 太多時提醒玩家撿經驗球
      var _wlGap=cw.num-g.level;
      if(_wlGap>=5&&!g["_gapWarn"+Math.floor(_wlGap/3)]){
        g["_gapWarn"+Math.floor(_wlGap/3)]=true;
        showHint(_wlGap>=8?"⚠️ 等級嚴重落後！綠色經驗球有追趕加成，快去撿！":"💡 等級落後了，記得靠近綠色經驗球來升級！");
      }
      // 計算這波數量
      var wn=cw.num;
      var isBossWave=wn%8===0;
      var isMegaWave=wn%12===0;
      var isStrongWave=wn%4===0&&!isBossWave;
      if(isMegaWave){
        cw.target=spawnTargetForWave(wn);
        g.dn.push({x:g.p.x,y:g.p.y-60,d:`👑 第${wn}波 — 巨王！(${cw.target}隻)`,life:2.5,color:"#FFD43B",big:1});
        sfx("boss");spawn(true,{mega:true});
      }else if(isBossWave){
        cw.target=spawnTargetForWave(wn);
        g.dn.push({x:g.p.x,y:g.p.y-60,d:`⭐ 第${wn}波 — 小王！(${cw.target}隻)`,life:2.5,color:"#FF922B",big:1});
        sfx("boss");spawn(true);
      }else if(isStrongWave){
        cw.target=Math.floor(spawnTargetForWave(wn)*1.2);
        g.dn.push({x:g.p.x,y:g.p.y-60,d:`⚠️ 第${wn}波 — 強化！(${cw.target}隻)`,life:2,color:"#E74C3C",big:1});
      }else{
        cw.target=spawnTargetForWave(wn);
        g.dn.push({x:g.p.x,y:g.p.y-60,d:`⚠️ 第${wn}波 (${cw.target}隻)`,life:1.5,color:"#FF6B6B"});
      }
    }
    // 漸進出怪：每0.3秒出2-3隻
    if(cw.phase==="active"&&cw.spawned<cw.target&&now-cw.spawnT>300){
      cw.spawnT=now;
      var batch=Math.min(cw.target-cw.spawned,cw.num<6?2:3);
      for(var i=0;i<batch;i++){spawn(false);cw.spawned++;}
    }
    // 暴走觸發：波次開始15秒後還有小怪存活
    if(cw.phase==="active"&&!cw.raged&&cw.spawned>=cw.target&&now-cw.waveStart>15000&&aliveClassic>0){
      cw.raged=true;
      g.dn.push({x:g.p.x,y:g.p.y-50,d:"⚠️ 敵人暴走！",life:2.5,color:"#FF4040",big:1});
      g.ene.forEach((e,ei)=>{
        if(e.hp<=0||e.boss||e.stageBoss)return;
        var delay=ei*200+Math.random()*400; // 每隻錯開 200~600ms
        e._rage=1;e._rageDashes=0;e._rageState="charge";e._rageT=now+400+delay;
        // 鎖定衝刺方向
        var rdx=g.p.x-e.x,rdy=g.p.y-e.y,rd=Math.sqrt(rdx*rdx+rdy*rdy)||1;
        e._rageDx=rdx/rd;e._rageDy=rdy/rd;
      });
    }
  }

  // bullets update
  var _trailMax=getFxQ()<.65?3:5;
  g.bul=g.bul.filter(b=>{
    if(Math.random()<getFxQ()){
      if(!b._tw)b._tw=0; // trail write index
      if(b.trail.length<_trailMax){b.trail.push({x:b.x,y:b.y,life:1});}
      else{var t=b.trail[b._tw%_trailMax];t.x=b.x;t.y=b.y;t.life=1;}
      b._tw++;
    }
    for(var ti=0;ti<b.trail.length;ti++)b.trail[ti].life-=.18*dt;
    // homing
    if(b.hm>0){var hmR=g.p.homingR||200;var nr=null,nd=1e9;g.ene.forEach(e=>{if(e.ragePoo||e.hp<=0)return;var d=di(b,e);if(d<nd){nd=d;nr=e;}});if(nr&&nd<hmR){var dx=nr.x-b.x,dy=nr.y-b.y,d=Math.sqrt(dx*dx+dy*dy)||1;b.vx+=(dx/d)*b.hm*dt*60;b.vy+=(dy/d)*b.hm*dt*60;var bs=Math.sqrt(b.vx*b.vx+b.vy*b.vy);if(bs>8){b.vx=b.vx/bs*8;b.vy=b.vy/bs*8;}}}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    return b.x>g.p.x-VW&&b.x<g.p.x+VW&&b.y>g.p.y-VH&&b.y<g.p.y+VH&&b.life>0;
  });

  // enemies chase — role-aware AI
  g.ene.forEach(e=>{e.t+=.03*dt;e.st=Math.max(0,e.st-dt*16.67);e.frozen=Math.max(0,e.frozen-dt*16.67);
    // 精英怪特殊能力
    if(e.eliteEnemy&&e.hp>0&&e.frozen<=0){
      var _elt=(_isCoopMode&&g.p2)?nearestPlayer(e):g.p;
      var edx=_elt.x-e.x,edy=_elt.y-e.y,ed=Math.sqrt(edx*edx+edy*edy)||1;
      // 衝刺突進：每5秒，距離100~250時衝向玩家
      if(!e._eDashCD)e._eDashCD=now+3000;
      if(now>e._eDashCD&&ed>100&&ed<250&&!e._eDashing){
        e._eDashing=true;e._eDashEnd=now+400;
        e._eDashDx=edx/ed;e._eDashDy=edy/ed;
        burst(e.x,e.y,"#E74C3C",6);
        g.dn.push({x:e.x,y:e.y-e.r-8,d:"💨",life:.8,color:"#E74C3C"});
      }
      if(e._eDashing&&now<e._eDashEnd){
        e.x+=e._eDashDx*7*dt;e.y+=e._eDashDy*7*dt;
        e.x=cl(e.x,e.r,mapW()-e.r);e.y=cl(e.y,e.r,mapH()-e.r);
        // 衝刺殘影
        if(par.length<MAX_PARTICLES&&Math.random()<.5)
          par.push({x:e.x,y:e.y,vx:0,vy:0,life:.4,color:"rgba(231,76,60,.4)",sz:e.r*.8});
      }else if(e._eDashing){e._eDashing=false;e._eDashCD=now+5000;}
      // 能量護盾：HP<60% 時觸發，持續3秒，每15秒一次
      if(!e._eShieldCD)e._eShieldCD=now+8000;
      if(e._eShieldEnd&&now>=e._eShieldEnd){e._eShieldEnd=0;e._spawnShield=0;} // 護盾到期重設
      if(now>e._eShieldCD&&e.hp<e.mhp*.6&&!e._eShieldEnd){
        e._eShieldEnd=now+3000;e._eShieldCD=now+18000;
        g.dn.push({x:e.x,y:e.y-e.r-8,d:"🛡️",life:1,color:"#4DABF7"});
      }
      if(e._eShieldEnd&&now<e._eShieldEnd)e._spawnShield=now+50;
      // 範圍震波：每8秒，距離<80時
      if(!e._eShockCD)e._eShockCD=now+6000;
      if(now>e._eShockCD&&ed<80){
        e._eShockCD=now+8000;sfxBossAtk("shockwave");
        for(var si=0;si<6;si++){var sa=Math.PI*2*si/6;g.ebul.push({x:e.x,y:e.y,vx:Math.cos(sa)*2.5,vy:Math.sin(sa)*2.5,dmg:8+g.wave,life:1,color:"#E74C3C"});}
        burst(e.x,e.y,"#E74C3C",10);
      }
    }
    if(e.bhExeAt){
      if(now>=e.bhExeAt){
        e.hp=0;e.bhExeAt=0;
        burst(e.x,e.y,"#CED4DA",16);
        if(par.length<MAX_PARTICLES)for(var i=0;i<8;i++)par.push({x:e.x,y:e.y,vx:rn(-2.2,2.2),vy:rn(-2.2,2.2),life:.55,color:"#868E96",sz:rn(2,5)});
      }else{
        var bdx=g.p.x-e.x,bdy=g.p.y-e.y,bd=Math.sqrt(bdx*bdx+bdy*bdy)||1;
        var lockPull=(2.8+(g.p.ultLv||0)*.8)*dt*16.67;
        e.x+=bdx/bd*lockPull;e.y+=bdy/bd*lockPull;
        return;
      }
    }
    if(e.poisonT>0){
      e.poisonT-=dt*16.67;
      var lv=e.poisonLv||1;
      var pBonus=g.p.poisonDmg||0;
      var elemMul=g.p.elemBoost||1;
      var pbm=g.p.poisonBossMul||1;
      var pd=e.boss?e.mhp*(0.0006*lv+pBonus*.00015)*elemMul*pbm:((g.p.atk*.18)+.8*lv+pBonus)*elemMul;
      e.hp-=pd*dt;
    }
    // 流血（拔刀術）
    if(e._bleedEnd&&now<e._bleedEnd){
      e.hp-=(e._bleedDmg||1)*dt;
      if(Math.random()<.08*dt&&par.length<MAX_PARTICLES)par.push({x:e.x+rn(-4,4),y:e.y+rn(-2,4),vx:0,vy:rn(.3,.8),life:.35,color:"#FF4040",sz:rn(1,2.5)});
    }
    if(e.burnT>0){
      e.burnT-=dt*16.67;
      var blv=e.burnLv||1;
      var bbm=g.p.burnBossMul||1;
      var bd=e.boss?e.mhp*(0.0004*blv)*(g.p.elemBoost||1)*(g.p.burnBoost||1)*bbm*dt:(g.p.atk*.12+1.2*blv)*(g.p.elemBoost||1)*(g.p.burnBoost||1)*dt;
      e.hp-=bd;
      var bRate=.12+blv*.06; // Lv1=.18, Lv2=.24, Lv3=.30
      if(Math.random()<bRate&&par.length<MAX_PARTICLES){
        var bc=blv>=3?"#FFD43B":blv>=2?"#FF922B":"#FF6B6B";
        par.push({x:e.x+rn(-e.r,e.r),y:e.y+rn(-e.r,e.r),vx:rn(-.4,.4),vy:rn(-1.2,-.3)-.2*blv,life:.4+blv*.1,color:bc,sz:rn(2,3.5+blv)});
      }
      // 王燃特效：Boss 燃燒時額外橘金大粒子 + 定時顯示傷害數字
      if(e.boss&&bbm>1){
        if(Math.random()<.15&&par.length<MAX_PARTICLES){
          par.push({x:e.x+rn(-e.r*.6,e.r*.6),y:e.y-e.r*.5,vx:rn(-.3,.3),vy:rn(-1.8,-.8),life:.6,color:"#FFD43B",sz:rn(3.5,6)});
          par.push({x:e.x+rn(-e.r*.4,e.r*.4),y:e.y-e.r*.3,vx:rn(-.2,.2),vy:rn(-1.5,-.6),life:.5,color:"#FF922B",sz:rn(2.5,4.5)});
        }
        // 每 0.5 秒顯示一次累計燃燒傷害
        e._burnDmgAcc=(e._burnDmgAcc||0)+bd;
        e._burnDmgT=(e._burnDmgT||0)+dt*16.67;
        if(e._burnDmgT>=500){
          g.dn.push({x:e.x+rn(-6,6),y:e.y-e.r-5,d:Math.floor(e._burnDmgAcc),life:.7,color:"#FF922B"});
          e._burnDmgAcc=0;e._burnDmgT=0;
        }
      }
    }
    var rawSlow=g.p.slow||1;
    var cs=e.st>0?(_isElite()?1-(1-rawSlow)*.35:rawSlow):1; // 精英/coop模式緩速效果僅35%
    var ts=e.frozen>0?0:1;
    var hs=(g.huntModeUntil&&now<g.huntModeUntil&&e._huntStart&&now>=e._huntStart&&now<e._huntEnd)?2.1:1;
    // 嘲諷：強制追擊玩家 + 加速 1.5 倍
    var _taunted=e._tauntEnd&&now<e._tauntEnd;
    var es=e.speed*hs;
    var _et=_taunted?(e._tauntTarget==="p2"&&g.p2?g.p2:g.p):(_isCoopMode&&g.p2)?nearestPlayer(e):g.p;
    var dx=_et.x-e.x,dy=_et.y-e.y,d=Math.sqrt(dx*dx+dy*dy)||1;
    if(Math.abs(dx)>2)e.face=dx>0?1:-1;
    e.shieldAng=Math.atan2(dy,dx); // always face player for shield calc

    // 經典模式暴走 AI（3次衝刺循環）
    if(e._rage&&e._rageDashes<3){
      var rcs=e._rageState;
      if(rcs==="charge"&&now<e._rageT){
        // 蓄力：原地抖動 + 紅色閃爍
        e.x+=(Math.random()-.5)*3;e.y+=(Math.random()-.5)*3;
      }else if(rcs==="charge"&&now>=e._rageT){
        // 開始衝刺
        e._rageState="dash";e._rageT=now+300;e._rageDist=0;
        // 重新鎖定方向
        var _rgt=(_isCoopMode&&g.p2)?nearestPlayer(e):g.p;
        var rdx2=_rgt.x-e.x,rdy2=_rgt.y-e.y,rd2=Math.sqrt(rdx2*rdx2+rdy2*rdy2)||1;
        e._rageDx=rdx2/rd2;e._rageDy=rdy2/rd2;
      }else if(rcs==="dash"&&e._rageDist<120&&now<e._rageT){
        // 衝刺中：固定距離120px
        var rspd=6*dt;
        e.x+=e._rageDx*rspd;e.y+=e._rageDy*rspd;
        e._rageDist+=rspd;
        e.x=cl(e.x,e.r,mapW()-e.r);e.y=cl(e.y,e.r,mapH()-e.r);
        // 殘影
        if(par.length<MAX_PARTICLES&&Math.random()<.4)par.push({x:e.x,y:e.y,vx:0,vy:0,life:.25,color:"rgba(255,68,68,.4)",sz:e.r*.8});
      }else if(rcs==="dash"){
        // 衝刺結束 → 停頓
        e._rageState="pause";e._rageT=now+800;e._rageDashes++;
      }else if(rcs==="pause"&&now>=e._rageT){
        if(e._rageDashes>=3){
          // 3次完成 → 恢復冷靜
          e._rage=0;
          g.dn.push({x:e.x,y:e.y-e.r-10,d:"😮‍💨",life:1,color:"#ADB5BD"});
        }else{
          // 下一次蓄力
          e._rageState="charge";e._rageT=now+400;
        }
      }
    }else if(e._rage&&e._rageDashes>=3){
      e._rage=0;
      if(!g.ene.some(oe=>oe!==e&&oe._rage&&oe._rageDashes<3&&oe.hp>0)){
        g.dn.push({x:g.p.x,y:g.p.y-40,d:"😮‍💨 敵人已恢復冷靜",life:2,color:"#ADB5BD",big:1});
      }
    }else{
    // 撞擊後退開 1.5 秒
    if(e._retreatEnd&&now<e._retreatEnd){
      e.x+=(-dx/d*es*.6)*dt;e.y+=(-dy/d*es*.6)*dt;
      e.x=cl(e.x,e.r,mapW()-e.r);e.y=cl(e.y,e.r,mapH()-e.r);
    } else {
    if(e._retreatEnd)e._retreatEnd=0;
    var role=e.role||ROLE_NORMAL;
    if(role===ROLE_FLANKER&&ts){
      // orbit around player at ~120-160px, slowly closing in
      var orbitR=140-Math.min(g.wave*2,60);
      e.flankA+=(es*.012*cs)*dt;
      var tx=g.p.x+Math.cos(e.flankA)*orbitR,ty=g.p.y+Math.sin(e.flankA)*orbitR;
      var fdx=tx-e.x,fdy=ty-e.y,fd=Math.sqrt(fdx*fdx+fdy*fdy)||1;
      e.x+=(fdx/fd*es*cs*1.1+Math.sin(e.t*2.5)*.2)*dt;
      e.y+=(fdy/fd*es*cs*1.1)*dt;
    } else if(role===ROLE_SHOOTER&&ts){
      // stay at distance ~160-200, shoot at player
      var prefDist=180-Math.min(g.wave,20)*2;
      e.shootCD=Math.max(0,e.shootCD-dt*16.67);
      if(d>prefDist+30){
        e.x+=(dx/d*es*cs+Math.sin(e.t*2.5)*.3)*dt;
        e.y+=(dy/d*es*cs)*dt;
      } else if(d<prefDist-20){
        e.x+=(-dx/d*es*cs*.6)*dt;
        e.y+=(-dy/d*es*cs*.6)*dt;
      } else {
        // strafe sideways
        e.x+=(Math.sin(e.t*1.8)*es*cs*.4)*dt;
        e.y+=(Math.cos(e.t*1.8)*es*cs*.4)*dt;
      }
      // fire enemy bullet
      if(e.shootCD<=0&&g.ebul.length<MAX_EBULLETS){
        var shotSpd=2.5+Math.min(g.wave*.08,2);
        g.ebul.push({x:e.x,y:e.y,vx:dx/d*shotSpd,vy:dy/d*shotSpd,dmg:(5+g.wave*1.5)*(e.dmgMul||1)*hs,life:1,color:e.color});
        e.shootCD=1800-Math.min(g.wave*40,800); // fires faster in later waves
      }
    } else if(role===ROLE_DASHER&&ts){
      // state machine: 0=approach, 1=charging(telegraph), 2=dashing, 3=cooldown
      if(e.dashState===0){
        // approach slowly until within 180px
        e.x+=(dx/d*es*cs*.7)*dt; e.y+=(dy/d*es*cs*.7)*dt;
        if(d<180){e.dashState=1;e.dashTimer=600;e.dashDx=dx/d;e.dashDy=dy/d;} // lock direction
      } else if(e.dashState===1){
        // telegraph — pause + visual cue
        e.dashTimer-=dt*16.67;
        if(e.dashTimer<=0){e.dashState=2;e.dashTimer=300;}
      } else if(e.dashState===2){
        // DASH! fast burst
        var dashSpd=es*4;
        e.x+=e.dashDx*dashSpd*dt; e.y+=e.dashDy*dashSpd*dt;
        e.dashTimer-=dt*16.67;
        if(e.dashTimer<=0){e.dashState=3;e.dashTimer=1200;}
      } else {
        // cooldown — wander slowly
        e.x+=(Math.sin(e.t*2)*es*.3)*dt; e.y+=(Math.cos(e.t*2)*es*.3)*dt;
        e.dashTimer-=dt*16.67;
        if(e.dashTimer<=0)e.dashState=0;
      }
    } else if(role===ROLE_SHIELD&&ts){
      // normal chase but slightly slower, shield blocks frontal damage (handled in hit logic)
      e.x+=(dx/d*es*cs+Math.sin(e.t*2.5)*.2)*dt;
      e.y+=(dy/d*es*cs)*dt;
    } else {
      // ROLE_NORMAL — original behavior
      e.x+=(dx/d*es*cs*ts+Math.sin(e.t*2.5)*.3*ts)*dt;
      e.y+=(dy/d*es*cs*ts)*dt;
    }
    // 精英模式：保持距離 + 繞行
    if(_isElite()&&!e.boss){
      if(!e._orbAng)e._orbAng=rn(0,Math.PI*2);
      if(!e._orbDir)e._orbDir=Math.random()>.5?1:-1;
      var prefDist=e.eliteEnemy?(55+Math.sin(e.t)*10):(80+Math.sin(e.t)*15);
      var distDiff=d-prefDist;
      // 距離調節：太遠靠近，太近遠離
      var approach=distDiff>20?1:distDiff<-15?-.5:0;
      e.x+=(dx/d*es*cs*ts*approach*.5)*dt;
      e.y+=(dy/d*es*cs*ts*approach*.5)*dt;
      // 繞行（垂直於朝向玩家的方向）
      e._orbAng+=e._orbDir*.03*dt;
      if(Math.random()<.005*dt)e._orbDir*=-1;
      var perpX=-dy/d,perpY=dx/d; // 垂直方向
      e.x+=perpX*es*.4*e._orbDir*dt;
      e.y+=perpY*es*.4*e._orbDir*dt;
    }else{
      var jw=.18*hs;
      e.x+=Math.sin(e.t*3.7+(e.flankA||0))*jw*dt;
      e.y+=Math.cos(e.t*3.1+(e.flankA||0))*jw*dt;
    }
    } // end retreat else
    } // end rage else

    // === Boss skills (wave 10+) ===
    if(e.boss&&g.wave>=10&&ts){
      e.bossSkillCD-=dt*16.67;
      if(e.bossSkillCD<=0){
        var skills=[];
        skills.push("burst"); // always: radial burst
        if(g.wave>=12)skills.push("summon"); // wave 12+: summon minions
        if(g.wave>=15)skills.push("barrage"); // wave 15+: aimed barrage
        var sk=skills[skills.length*Math.random()|0];
        if(sk==="burst"&&g.ebul.length<MAX_EBULLETS-8){
          // radial bullet burst
          var n=6+Math.min(Math.floor(g.wave/3),6);
          var bdmg=(8+g.wave*2)*(e.dmgMul||1);
          for(var i=0;i<n;i++){var ba=Math.PI*2*i/n;g.ebul.push({x:e.x,y:e.y,vx:Math.cos(ba)*2.2,vy:Math.sin(ba)*2.2,dmg:bdmg,life:1,color:"#FFD43B"});}
          burst(e.x,e.y,"#FFD43B",8);
        } else if(sk==="summon"){
          // spawn 2-3 minions near boss
          var cnt=2+Math.min(Math.floor(g.wave/8),2);
          var _mxE=MODE[_mode].maxEnemies||MAX_ENEMIES;
          for(var i=0;i<cnt&&g.ene.length<_mxE;i++){
            var sa=rn(0,Math.PI*2),sd=40+rn(0,30);
            var mx2=cl(e.x+Math.cos(sa)*sd,30,MW-30),my2=cl(e.y+Math.sin(sa)*sd,30,MH-30);
            var mhp2=(_isElite())?Math.floor(MODE[_mode].smallHpBase+g.wave*MODE[_mode].smallHpPerWave):Math.floor((10+g.wave*5)*tierHpFor(e.tier));
            var mc=TC[e.tier][TC[e.tier].length*Math.random()|0];
            g.ene.push({x:mx2,y:my2,hp:mhp2,mhp:mhp2,speed:e.speed*1.5,color:mc,t:rn(0,10),r:ER*.8,st:0,boss:false,mega:false,tier:Math.max(0,e.tier-1),face:1,xp:2+Math.floor(g.wave/3),poisonT:0,frozen:0,burnT:0,burnLv:0,poisonLv:0,dmgMul:e.dmgMul*.6,role:ROLE_NORMAL,flankA:0,shootCD:0,dashState:0,dashTimer:0,dashDx:0,dashDy:0,shieldAng:0,bossSkillCD:0,bossSkill:0});
          }
          burst(e.x,e.y,"#BE4BDB",10);
          g.dn.push({x:e.x,y:e.y-e.r-10,d:"召喚！",life:1.2,color:"#BE4BDB",big:1});
        } else if(sk==="barrage"&&g.ebul.length<MAX_EBULLETS-5){
          // aimed 5-shot barrage at player
          var bdmg=(6+g.wave*1.5)*(e.dmgMul||1);
          for(var i=0;i<5;i++){
            var spread=rn(-.25,.25);
            var ba=Math.atan2(dy,dx)+spread;
            g.ebul.push({x:e.x,y:e.y,vx:Math.cos(ba)*(2.5+i*.3),vy:Math.sin(ba)*(2.5+i*.3),dmg:bdmg,life:1,color:"#FF6B6B"});
          }
          burst(e.x,e.y,"#FF6B6B",6);
        }
        e.bossSkillCD=3500-Math.min(g.wave*80,1500)+rn(0,800);
      }
    }
  });

  // === Enemy bullets update ===
  if(g.ebul.length>0){
    g.ebul=g.ebul.filter(b=>{
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=.003*dt;
      // out of viewport range?
      if(Math.abs(b.x-g.p.x)>VW||Math.abs(b.y-g.p.y)>VH)return false;
      if(b.life<=0)return false;
      // hit player? (respects i-frame)
      if(!g.p._inv&&!bhSafe&&!(g.p._iFrameEnd>0&&now<g.p._iFrameEnd)&&di(b,g.p)<PR+4){
        if(g.p.projImmune){burst(g.p.x,g.p.y,"#CED4DA",4);g.dn.push({x:g.p.x,y:g.p.y-25,d:"🔔彈開",life:1,color:"#CED4DA"});return false;}
        // 劍士：揮劍中擋子彈（30% 機率）
        if(g.charType==="swordsman"&&g._wbSwing>.3&&Math.random()<.3){
          burst(g.p.x,g.p.y,"#FF922B",3);g.dn.push({x:g.p.x,y:g.p.y-25,d:"⚔️彈開",life:.8,color:"#FF922B"});return false;}
        // 坦克：內建遠距傷害減半
        var _tankProjMit=g.charType==="tank"?.5:1;
        if(Math.random()<(g.p.dodge||0)){g.dn.push({x:g.p.x,y:g.p.y-25,d:"MISS",life:1,color:"#B197FC"});return false;}
        if(g.p._sh){g.p._sh=false;burst(g.p.x,g.p.y,"#4DABF7",10);g.dn.push({x:g.p.x,y:g.p.y-25,d:"🛡️擋住",life:1,color:"#4DABF7",big:1});return false;}
        var lateMul=1+Math.max(0,g.wave-10)*.07;
        var surv=(g.p.armor||0)+(g.p.dodge||0)*.9;
        var survMit=1-Math.min(.42,surv*.36);
        var dmg=Math.min(50,b.dmg*lateMul)*(1-g.p.armor)*survMit*_tankProjMit;
        if(g.p.thorns>0){/* thorns don't apply to projectiles */}
        // 坦克被動：遠程命中也反彈15%給最近敵人
        if(g.charType==="tank"&&dmg>0){
          var ne=null,nd=1e9;g.ene.forEach(e2=>{if(e2.hp<=0)return;var d2=di(g.p,e2);if(d2<nd){nd=d2;ne=e2;}});
          if(ne&&nd<150){var rd=dmg*.15;ne.hp-=rd;burst(ne.x,ne.y,"#51CF66",3);g.dn.push({x:ne.x,y:ne.y-ne.r,d:Math.floor(rd),life:.6,color:"#51CF66"});}
        }
        g.p.hp-=dmg;burst(g.p.x,g.p.y,"#FF6B6B",4);_hitFlash=1;_shakeT=.35;_shakePow=Math.min(6,2+dmg/15);sfx("hurt");showPlayerDmg(dmg);
        g.dn.push({x:g.p.x,y:g.p.y-20,d:Math.floor(dmg),life:1,color:"#FF6B6B"});
        if(g.p.hp<=0){
          if(_isCoopMode){g.p._downed=true;g.p._downedTime=now;g.p.hp=0;if(g.p2&&g.p2._downed){g.run=false;showOver();}}
          else if(g.p.revive>0){triggerPhoenixRevive();}else{g.run=false;showOver();}
        }
        return false;
      }
      // hit P2? (co-op)
      if(_isCoopMode&&g.p2&&!g.p2._downed&&!g.p2._inv&&!(g.p2._iFrameEnd>0&&now<g.p2._iFrameEnd)&&di(b,g.p2)<PR+4){
        if(Math.random()<(g.p2.dodge||0)){g.dn.push({x:g.p2.x,y:g.p2.y-25,d:"MISS",life:1,color:"#B197FC"});return false;}
        var lm2=1+Math.max(0,g.wave-10)*.07;
        var _p2TankMit=(g.p2.charType==="tank")?.5:1;
        var dm2=Math.min(50,b.dmg*lm2)*(1-(g.p2.armor||0))*_p2TankMit;
        // P2 坦克：遠程反彈15%
        if(g.p2.charType==="tank"&&dm2>0){var ne2=null,nd2=1e9;g.ene.forEach(e2=>{if(e2.hp<=0)return;var d2=di(g.p2,e2);if(d2<nd2){nd2=d2;ne2=e2;}});if(ne2&&nd2<150){var rd2=dm2*.15;ne2.hp-=rd2;burst(ne2.x,ne2.y,"#51CF66",3);g.dn.push({x:ne2.x,y:ne2.y-ne2.r,d:Math.floor(rd2),life:.6,color:"#51CF66"});}}
        g.p2.hp-=dm2;burst(g.p2.x,g.p2.y,"#FF6B6B",4);sfx("hurt");showPlayerDmg(dm2,g.p2);
        if(g.p2.hp<=0){g.p2._downed=true;g.p2._downedTime=now;g.p2.hp=0;if(g.p._downed){g.run=false;showOver();}}
        return false;
      }
      return true;
    });
  }

  // bullet-enemy hit — per-frame chain dedup + neighbor cache
  var _chainedSet=new Set();
  var _neighborCache=new Map(); // ei → [target indices]
  g.bul.forEach(b=>{if(b.life<=0)return;for(var ei=0;ei<g.ene.length;ei++){var e=g.ene[ei];if(e.hp<=0||b.life<=0)continue;if(e.ragePoo)continue;if(e._spawnShield&&now<e._spawnShield)continue;if(di(b,e)<e.r+BR){
    var fx=g.p.fx,fxLv=Math.max(fx.fire||0,fx.ice||0,fx.dragon||0,fx.star||0,fx.poison||0,1);
    var dmg=b.dmg*(g.p.elemBoost||1)*(g.p.levelDmgMul||1);if(b.crit)dmg*=2;
    if(e.boss||e.mega){if(g.p.bossDmg>1)dmg*=g.p.bossDmg;} // 穿透箭：對Boss(小王+巨王)加傷
    if(!e.mega){if(g.p.mobDmg>1)dmg*=g.p.mobDmg;} // 雷擊鏈：對小怪+小王加傷
    // Stage Boss 傷害系統
    if(e.stageBoss){
      if(!_mode||_mode!=="elite"){
        // 經典模式：DR 制（越戰越勇：隨時間遞減）
        var baseDR=e.stageBoss===20?.1:.01;
        if(g.p._angelBuff&&e._spawnTime){
          var elapsed=(now-e._spawnTime)/1000;
          var timeBonus=Math.min(.89,Math.floor(elapsed/30)*.15);
          dmg*=Math.min(.9,baseDR+timeBonus);
        }else{dmg*=baseDR;}
      }
      // 精英模式 Stage Boss：走統一每秒 cap（在 settleEnemyDeaths 前結算），此處不再 per-hit cap
    }
    // === Boss 韌性/防禦（簡化統一版）===
    var isBossUnit=e.boss&&!e.stageBoss;
    var bType=e.bossType||"";
    if(bType==="armor"){
      dmg*=.7; // 防禦型：全傷害 ×0.7
    }
    // tough 型不減傷，但免疫控制（見下方 toughImmune）
    if(!isBossUnit&&!e.stageBoss&&e.eliteEnemy){
      var hasElem=!!(fx.fire||fx.ice||fx.lightning||fx.poison||fx.dragon);
      if(hasElem)dmg*=1.2;else{dmg*=.5;dmg=Math.max(dmg,.3);} // 槍手至少 0.3
    }
    // 精英模式：小怪 per-hit cap（Boss 改用每秒上限制，見 settleEnemyDeaths 前）
    if(_isElite()&&!e.stageBoss&&!isBossUnit){
      var lvBonus=Math.max(0,g.level-5)*.003;
      dmg=Math.min(dmg,e.mhp*(.04+lvBonus));
    }
    // 冰脆：被減速/凍結的敵人受到額外傷害
    var _iceFragHit=false;
    if(g.p.iceFrag&&(e.st>0||e.frozen>0)){dmg*=(1+g.p.iceFrag);_iceFragHit=true;}
    if(e.role===ROLE_SHIELD){var ba=Math.atan2(b.vy,b.vx),fa=e.shieldAng+Math.PI,ad=Math.abs(((ba-fa)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);if(ad<Math.PI*.55)dmg*=.25;}
    if(e._p3armor)dmg*=(1-e._p3armor); // 惡魔最終階段護甲減傷
    if(e._coopShield){dmg=0;} // co-op 護盾：攻擊無效
    e.hp-=dmg;sfxHit();
    if(g.p.slow<1&&bType!=="tough")e.st=1800;
    // 元素效果：韌性型免疫燃燒/凍結（但毒可以），防禦型全部正常
    var toughImmune=bType==="tough";
    if(!toughImmune||fx.poison){
      if(fx.fire&&!toughImmune){e.burnT=Math.max(e.burnT||0,(1400+fxLv*600)*(g.p.elemBoost||1));e.burnLv=fxLv;}
      if(fx.ice&&!toughImmune){
        var iceMul=g.p.elemBoost||1;
        if(_isElite()){
          // 精英/coop模式：冰只緩速，不凍結
          e.st=Math.max(e.st||0,(800+fxLv*450)*iceMul);
        }else{
          if(Math.random()<Math.min(.95,(.12+.08*fxLv)*iceMul))e.frozen=Math.max(e.frozen||0,(350+fxLv*260)*iceMul);
          else e.st=Math.max(e.st||0,(800+fxLv*450)*iceMul);
        }
      }
      if(g.p.poison>0){e.poisonT=g.p.poison*1e3*(g.p.elemBoost||1);e.poisonLv=fxLv;} // 毒永遠有效
    }
    if(g.p.bulletHeal>0){g.p.hp=Math.min(g.p.hp+g.p.bulletHeal,g.p.maxHp);g.p._healFlash=now;}
    // splash — with explosion visual
    if(g.p.splash>0){
      var splashed=false;
      g.ene.forEach(oe=>{if(oe!==e&&oe.hp>0&&di(e,oe)<g.p.splash){
        oe.hp-=dmg*.3;splashed=true;
        burst(oe.x,oe.y,"#FF6B6B",3); // fire burst on splashed enemy
        g.dn.push({x:oe.x,y:oe.y-oe.r,d:Math.floor(dmg*.3),life:.8,color:"#FF922B"});
      }});
      // explosion ring at impact point
      if(splashed){
        var splR=g.p.splash;
        if(par.length<MAX_PARTICLES-4){
          for(var si=0;si<6;si++){var sa=Math.PI*2*si/6;par.push({x:b.x+Math.cos(sa)*splR*.4,y:b.y+Math.sin(sa)*splR*.4,vx:Math.cos(sa)*1.8,vy:Math.sin(sa)*1.8,life:.5,color:si%2?"#FF922B":"#FF6B6B",sz:rn(2.5,5)});}
        }
      }
    }
    // chain — deduped per frame, cached neighbor lookup
    if(g.p.chain>0||fx.lightning){
      var chainCnt=e.boss?1:2;
      var chainMul=(g.p.chainDmg||1)*(fx.lightning ? .58 : .3);
      // use cached neighbors for this enemy index
      var tgts=_neighborCache.get(ei);
      if(!tgts){tgts=nearestTargets(e,chainCnt);_neighborCache.set(ei,tgts);}
      tgts.forEach(t=>{
        var ti=g.ene.indexOf(t);
        var key=ei<ti?ei+"|"+ti:ti+"|"+ei;
        if(_chainedSet.has(key))return;
        _chainedSet.add(key);
        var cd=dmg*chainMul;t.hp-=cd;addLtn(e.x,e.y,t.x,t.y,.85);
      });
    }
    // hit fx — lightning throttled to avoid particle/number spam with split bullets
    var pN=3+fxLv*3;
    var ltnThrottle=fx.lightning&&(g.p.split||1)>2; // throttle when split+lightning
    if(ltnThrottle){
      // lightning+split: only 1 in 4 hits produce particles, accumulate damage numbers
      if(Math.random()<.25)burst(b.x,b.y,"#FAB005",3);
      if(!e._dmgAcc)e._dmgAcc=0;e._dmgAcc+=dmg;
      if(Math.random()<.2||e.hp<=0){g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(e._dmgAcc),life:1,color:b.crit?"#FFD43B":"#FAB005",big:b.crit});e._dmgAcc=0;}
    } else {
      if(fx.dragon){burst(b.x,b.y,"#FF922B",pN);burst(b.x,b.y,"#FFD43B",pN>>1);if(fxLv>=2)burst(b.x,b.y,"#FF6B6B",3);}
      else if(fx.fire){burst(b.x,b.y,"#FF4500",pN);if(fxLv>=2)burst(b.x,b.y,"#FFD43B",pN>>1);}
      else if(fx.ice){burst(b.x,b.y,"#66D9E8",pN);if(fxLv>=2){burst(b.x,b.y,"#fff",3);}}
      else if(fx.lightning){burst(b.x,b.y,"#FAB005",pN);}
      else if(fx.star){burst(b.x,b.y,"#F06595",pN);if(fxLv>=2)burst(b.x,b.y,"#FFD43B",3);}
      else if(fx.poison){burst(b.x,b.y,"#A9E34B",pN);if(fxLv>=2)burst(b.x,b.y,"#69DB7C",3);}
      else if(b._armorPen>0){burst(b.x,b.y,"#D4A017",pN);burst(b.x,b.y,"#FFD43B",2);}
      else burst(b.x,b.y,e.color,3);
      // 破甲箭命中 armor 型：碎甲火花
      if(b._armorPen>0&&e.bossType==="armor"){burst(b.x,b.y,"#FF922B",4);burst(b.x,b.y,"#fff",2);
        if(Math.random()<.15)g.dn.push({x:e.x,y:e.y-e.r-8,d:"💥破甲",life:.6,color:"#D4A017"});}
      // 冰脆特效：冰色碎片 + 傷害數字改色
      if(_iceFragHit){burst(b.x,b.y,"#66D9E8",4);burst(b.x,b.y,"#fff",2);}
      g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(dmg),life:1,color:b.crit?"#FFD43B":_iceFragHit?"#66D9E8":"#fff",big:b.crit});
    }
    if(e.hp<=0&&!(_isElite()&&e.boss&&!e.stageBoss&&!e.miniPoo&&!e.miniDemon)){
      if(ltnThrottle){
        // lightweight kill fx for lightning+split
        burst(e.x,e.y,e.color,5);
        addLtn(e.x,e.y,e.x+rn(-30,30),e.y+rn(-30,30),.4);
      }else{
        burst(e.x,e.y,e.color,8+fxLv*3);
        if(fx.fire||fx.dragon)burst(e.x,e.y,"#FF4500",5+fxLv*2);
        if(fx.ice)burst(e.x,e.y,"#fff",4+fxLv);
        if(fx.lightning){for(var li=0;li<Math.min(fxLv,2);li++)addLtn(e.x,e.y,e.x+rn(-40,40),e.y+rn(-40,40),.5);}
        if(fx.poison)burst(e.x,e.y,"#69DB7C",4+fxLv*2);
        if(fx.star)burst(e.x,e.y,"#FFD43B",4+fxLv*2);
      }
      if(g.p.deathBoom>0){burst(e.x,e.y,"#FF922B",8);var _boomD=g.p.deathBoom+(g.p.atk||0)*1.5;g.ene.forEach(oe=>{if(oe!==e&&oe.hp>0&&di(e,oe)<50){var bd=(oe.boss||oe.stageBoss)?Math.min(_boomD,oe.mhp*.03):_boomD;oe.hp-=bd;burst(oe.x,oe.y,"#FF922B",3);g.dn.push({x:oe.x,y:oe.y-oe.r,d:Math.floor(bd),life:.8,color:"#FF922B"});}});}
      awardEnemyKill(e);
      if(!g.run)return;
    }
    b.pierce--;if(b.pierce<0)b.life=0;
  }}});
  settleEnemyDeaths(true); // protectBoss: 波次王等 DPS cap 後再判定

  // bullet-crate hit (練習模式跳過)
  var c_=cam();
  var crateOpened=false;
  if(!getPracticeMode())g.crates.forEach(cr=>{if(crateOpened||!crateActive(cr))return;g.bul.forEach(b=>{if(crateOpened||b.life<=0)return;if(di(b,cr)<(cr.bigChest?20:16)){cr.hits++;b.life=0;burst(cr.x,cr.y,cr.bigChest?"#FFD43B":"#FFD43B",cr.bigChest?5:3);if(cr.hits>=cr.needed){cr.hp=0;burst(cr.x,cr.y,"#FFD43B",cr.bigChest?20:12);sfx("chest");crateOpened=true;
    if(b._isP2&&_isCoopMode&&g.p2){
      // P2 的子彈打開寶箱 → P2 選卡
      g.p2._inv=true;g.p2._pickPending=true;
      if(!_p2AI&&_net&&_net.conn&&_net.conn.open){_sendP2Pick(cr);}
      else{
        var _pkCtx4={player:g.p2,inv:inv2,charType:g.p2.charType||"gunner"};
        if(cr.bigChest){var _bcp3=_isElite()?4:5;g._bigChestTotal=_bcp3;g._bigChestLeft=_bcp3;showPick("bigchest",null,_pkCtx4);}
        else{showPick("crate",null,_pkCtx4);}
      }
    }else{
      if(_isCoopMode){g.p._inv=true;g.p._pickPending=true;}else{g.run=false;}
      if(cr.bigChest){var _bcp=_isElite()?4:5;g._bigChestTotal=_bcp;g._bigChestLeft=_bcp;showPick("bigchest");}
      else{showPick("crate");}
    }
  }}});});

  // exp orbs — 含追趕加成：wave 超過 level 越多，經驗倍率越高
  var _xpGap=Math.max(0,(g.wave||1)-g.level);
  var _xpCatchUp=_xpGap>3?Math.min(3,1+_xpGap*.2):1; // gap>3 開始加成，上限 3 倍
  var ep=60*(g.p.expR||1);g.orbs=g.orbs.filter(o=>{
    var d1=di(o,g.p),d2=(_isCoopMode&&g.p2)?di(o,g.p2):Infinity;
    var nearP=(_isCoopMode&&g.p2&&d1>d2)?g.p2:g.p,d=Math.min(d1,d2);
    if(d<ep){var s=Math.max(3,(ep-d)/ep*8),dx2=nearP.x-o.x,dy2=nearP.y-o.y,dd=Math.sqrt(dx2*dx2+dy2*dy2)||1;o.x+=dx2/dd*s*dt;o.y+=dy2/dd*s*dt;}
    if(d1<PR+8){g.exp+=Math.ceil(o.xp*_xpCatchUp);return false;}
    if(_isCoopMode&&g.p2&&d2<PR+8){g.p2Exp+=Math.ceil(o.xp*_xpCatchUp);return false;}
    o.life-=.001*dt;return o.life>0;});

  // enemy-player (with i-frame protection)
  if(g.p._iFrameEnd>0&&now>=g.p._iFrameEnd)g.p._iFrameEnd=0;
  var iFrameActive=g.p._iFrameEnd>0;
  if(!g.p._inv&&!bhSafe&&!iFrameActive){
  // NOTE: 接觸碰撞後敵人消失(return false)是目前的暫時設計，用來降低怪物難度。
  // 如果日後主角太強，可改回 return e.hp>0 讓敵人存活，並只在 e.hp<=0 時 awardEnemyKill。
  g.ene=g.ene.filter(e=>{if(e.bhExeAt)return true;
    // 狂暴便便：撞到扣剩餘HP 1/3，不可摧毀
    if(e.ragePoo){if(di(e,g.p)<PR+e.r-4){
      if(Math.random()<(g.p.dodge||0)){g.dn.push({x:g.p.x,y:g.p.y-25,d:"MISS",life:1,color:"#B197FC"});g.p._iFrameEnd=now+400;return true;}
      var rpDmg=(getPracticeMode()&&!getPracFiniteHp())?50:Math.floor(g.p.hp/3);
      g.p.hp-=rpDmg;burst(g.p.x,g.p.y,"#8B6914",6);_hitFlash=1;sfx("hurt");
      g.p._iFrameEnd=now+800;showPlayerDmg(rpDmg);
      if(g.p.hp<=0){if(_isCoopMode){g.p._downed=true;g.p._downedTime=now;g.p.hp=0;if(g.p2&&g.p2._downed){g.run=false;showOver();}}else if(g.p.revive>0){triggerPhoenixRevive();}else{g.run=false;showOver();}}
    }return true;}
    // Stage Boss：接觸造成傷害但Boss不消失（脈衝蓄力期間免撞傷）
    if(e.stageBoss){var _pulseWarn=e._p3cycle==="pulse_warn"||e._p3cycle==="pulse_boom";
    if(!_pulseWarn&&di(e,g.p)<PR+e.r-4){
      if(Math.random()<(g.p.dodge||0)){g.dn.push({x:g.p.x,y:g.p.y-25,d:"MISS",life:1,color:"#B197FC"});g.p._iFrameEnd=now+400;return true;}
      var lateMul=1+Math.max(0,g.wave-10)*.07;
      var dmg=Math.min(g.p.contactCap||100,(12+g.wave*3)*(e.dmgMul||1)*lateMul)*(1-g.p.armor);
      g.p.hp-=dmg;burst(g.p.x,g.p.y,"#FF6B6B",8);_hitFlash=1;_shakeT=.5;_shakePow=8;sfx("hurt");
      g.p._iFrameEnd=now+600;showPlayerDmg(dmg);
      e._retreatEnd=now+1500; // 撞擊後退開1.5秒
      if(g.p.hp<=0){if(_isCoopMode){g.p._downed=true;g.p._downedTime=now;g.p.hp=0;if(g.p2&&g.p2._downed){g.run=false;showOver();}}else if(g.p.revive>0){triggerPhoenixRevive();}else{g.run=false;showOver();}}
    }return true;}
    if(di(e,g.p)<PR+e.r-4){
    var _isWB=_isElite()&&e.boss&&!e.miniPoo&&!e.miniDemon;
    // 坦克擋衝刺：敵人衝刺中撞到坦克 → 擋下+反擊
    var _isDashing=e._eDashing||(e.dashState===2)||(e._rage&&e._rageState==="dash");
    if(g.charType==="tank"&&_isDashing&&!e.stageBoss){
      var blockDmg=(g.p.atk*3+10)*(g.p.elemBoost||1); // 反擊傷害
      e.hp-=blockDmg;
      // 擊退衝刺者
      var bdx=e.x-g.p.x,bdy=e.y-g.p.y,bd=Math.sqrt(bdx*bdx+bdy*bdy)||1;
      e.x+=bdx/bd*40;e.y+=bdy/bd*40;
      e.x=cl(e.x,e.r,mapW()-e.r);e.y=cl(e.y,e.r,mapH()-e.r);
      e._eDashing=false;e.dashState=3;e._retreatEnd=now+1000;
      e.st=Math.max(e.st||0,1500); // 長減速
      burst(g.p.x,g.p.y,"#51CF66",10);burst(e.x,e.y,"#FFD43B",6);
      g.dn.push({x:g.p.x,y:g.p.y-25,d:"🛡️ 擋下！",life:1.2,color:"#51CF66",big:1});
      g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(blockDmg),life:1,color:"#FFD43B",big:1});
      sfxHit();_shakeT=.2;_shakePow=4;
      g.p._iFrameEnd=now+300;
      return true;
    }
    if(Math.random()<(g.p.dodge||0)){g.dn.push({x:g.p.x,y:g.p.y-25,d:"MISS",life:1,color:"#B197FC"});if(g.p.dodgeAtk>0){e.hp-=g.p.dodgeAtk;g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(g.p.dodgeAtk),life:1,color:"#FFE066"});}return _isWB||e.hp>0;}
    if(g.p._sh){g.p._sh=false;burst(g.p.x,g.p.y,"#4DABF7",10);g.dn.push({x:g.p.x,y:g.p.y-25,d:"🛡️擋住",life:1,color:"#4DABF7",big:1});return true;}
    var lateMul=1+Math.max(0,g.wave-10)*.07;
    var surv=(g.p.armor||0)+(g.p.dodge||0)*.9;
    var survMit=1-Math.min(.42,surv*.36);
    var dmg=Math.min(g.p.contactCap||100,(8+g.wave*2)*(e.dmgMul||1)*lateMul)*(1-g.p.armor)*survMit;
    // 近戰近身減傷：周圍敵人越多減傷越高（最多 30%）
    if(g.charType!=="gunner"){
      var nearCnt=0;g.ene.forEach(e2=>{if(e2.hp>0&&di(g.p,e2)<80)nearCnt++;});
      var proxMit=Math.min(.3,nearCnt*.05); // 每隻 5%，最多 30%
      dmg*=(1-proxMit);
    }
    if(g.p._iwActive)dmg*=(1-g.p._ironWill); // 鋼鐵意志減傷
    if(g.p.thorns>0){var td=dmg*g.p.thorns;e.hp-=td;g._thornFlash=now;
      burst(g.p.x,g.p.y,"#51CF66",4);g.dn.push({x:e.x,y:e.y-e.r-5,d:Math.floor(td),life:.7,color:"#51CF66"});}
    // 坦克被動：接觸傷害反彈15%
    // NOTE: 遠程子彈的反彈在 ebul hit 區段另外處理（約 line+400）。
    // 如果新增其他傷害來源（地刺、Boss技能等），記得也加反彈邏輯或統一成共用函式。
    if(g.charType==="tank"){var td2=dmg*.15;e.hp-=td2;burst(e.x,e.y,"#51CF66",3);g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(td2),life:.6,color:"#51CF66"});}
    g.p.hp-=dmg;burst(g.p.x,g.p.y,"#FF6B6B",6);_hitFlash=1;_shakeT=.4;_shakePow=Math.min(8,3+dmg/12);sfx("hurt");showPlayerDmg(dmg);
    g.p._iFrameEnd=now+400; // 400ms i-frame after contact damage
    if(g.p.hp<=0){
      if(_isCoopMode){g.p._downed=true;g.p._downedTime=now;g.p.hp=0;if(g.p2&&g.p2._downed){g.run=false;showOver();return false;}}
      else if(g.p.revive>0){triggerPhoenixRevive();}else{g.run=false;showOver();return false;}
    }
    if(_isWB){e._retreatEnd=now+1500;return true;}
    if(MODE[_mode].enemyContactVanish){awardEnemyKill(e);return false;}
    else{g.p._iFrameEnd=now+500;if(e.hp>0)e._retreatEnd=now+1500;return e.hp>0||(awardEnemyKill(e),false);}
    }
    // P2 contact damage (co-op)
    if(_isCoopMode&&g.p2&&!g.p2._downed&&!g.p2._inv&&!(g.p2._iFrameEnd>0&&now<g.p2._iFrameEnd)&&!e.ragePoo&&!e.stageBoss&&di(e,g.p2)<PR+e.r-4){
      var lm2=1+Math.max(0,g.wave-10)*.07;
      var dm2=Math.min(g.p2.contactCap||100,(8+g.wave*2)*(e.dmgMul||1)*lm2)*(1-(g.p2.armor||0));
      // P2 坦克被動：接觸反彈15%
      if((g.p2.charType||"gunner")==="tank"&&dm2>0){var rd2=dm2*.15;e.hp-=rd2;burst(e.x,e.y,"#51CF66",3);g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(rd2),life:.6,color:"#51CF66"});}
      g.p2.hp-=dm2;burst(g.p2.x,g.p2.y,"#FF6B6B",6);sfx("hurt");showPlayerDmg(dm2,g.p2);
      g.p2._iFrameEnd=now+400;
      if(g.p2.hp<=0){g.p2._downed=true;g.p2._downedTime=now;g.p2.hp=0;if(g.p._downed){g.run=false;showOver();return false;}}
    }
    return true;});}

  // co-op rescue logic
  if(_isCoopMode&&g.p2){
    if(g.p2._downed&&!g.p._downed&&di(g.p,g.p2)<40){
      g.p2._rescueTimer=(g.p2._rescueTimer||0)+frameMs;
      if(g.p2._rescueTimer>=3000){g.p2._downed=false;g.p2.hp=Math.floor(g.p2.maxHp*.3);g.p2._iFrameEnd=now+2000;g.p2._rescueTimer=0;
        g.dn.push({x:g.p2.x,y:g.p2.y-PR-10,d:"💚 救援成功！",life:2,color:"#51CF66",big:1});burst(g.p2.x,g.p2.y,"#51CF66",12);}
    }else if(g.p2._downed){g.p2._rescueTimer=0;}
    if(g.p._downed&&!g.p2._downed&&di(g.p,g.p2)<40){
      g.p._rescueTimer=(g.p._rescueTimer||0)+frameMs;
      if(g.p._rescueTimer>=3000){g.p._downed=false;g.p.hp=Math.floor(g.p.maxHp*.3);g.p._iFrameEnd=now+2000;g.p._rescueTimer=0;
        g.dn.push({x:g.p.x,y:g.p.y-PR-10,d:"💚 救援成功！",life:2,color:"#51CF66",big:1});burst(g.p.x,g.p.y,"#51CF66",12);}
    }else if(g.p._downed){g.p._rescueTimer=0;}
    if(g.p2._iFrameEnd>0&&now>=g.p2._iFrameEnd)g.p2._iFrameEnd=0;
  }

  // P2 level up (co-op)
  if(_isCoopMode&&g.p2){
    while(g.p2Exp>=g.p2ExpTo){g.p2Exp-=g.p2ExpTo;g.p2Level++;g.p2ExpTo=expForLevel(g.p2Level);
      var _mc2=MODE[_mode];g.p2.atk+=_mc2.atkPerLv;g.p2.maxHp+=_mc2.hpPerLv;g.p2.hp=g.p2.maxHp;
      if(g.p2Level%5===0){g.p2.levelDmgMul=(g.p2.levelDmgMul||1)+.1;}
      // P2 升級：生成寶箱（和 P1 一樣的生成規則）
      if(g.p2Level>=2&&g.p2Level<=4){spawnBonusCrates(1);g.dn.push({x:g.p2.x,y:g.p2.y-30,d:"📦 P2 寶箱！",life:2,color:"#F06595",big:1});}
    }
  }

  // level up
  while(g.exp>=g.expTo){g.exp-=g.expTo;g.level++;if(_mode==="elite"||_mode==="coop")g.wave=g.level;g.expTo=expForLevel(g.level);sfx("levelup");
    // NOTE 未來可考慮方案D — 升級解鎖能力：Lv5解鎖衝刺、Lv10解鎖第二武器等，增加階段感
    // stat boost on level up
    var _mc=MODE[_mode];g.p.atk+=_mc.atkPerLv;g.p.maxHp+=_mc.hpPerLv;g.p.hp=g.p.maxHp;
    if(g.level%5===0){g.p.levelDmgMul=(g.p.levelDmgMul||1)+.1;} // 每5等全傷害+10%
    if(g.level%10===0){g.p.pierce=(g.p.pierce||0)+1;showHint("🔱 穿透+1！子彈可貫穿更多敵人");} // 每10等基礎穿透+1
    // milestone hints — non-intrusive floating text
    // 經典模式 Lv2 送免費 R 攻擊卡
    if(_mode==="classic"&&g.level===2&&!g._freeCard){
      g._freeCard=true;g.run=false;
      var rAtk=C.filter(c=>c.r==="R"&&c.tp==="atk"&&(!c.charReq||c.charReq===g.charType));
      var freeCard=rAtk[rAtk.length*Math.random()|0];
      if(freeCard){showPick("crate",freeCard);}
      else{g.run=true;}
    }
    if(g.level===2&&!g._hint2){g._hint2=1;showHint("💚 擊殺敵人會掉綠色經驗球，靠近自動吸取！");}
    if(g.level===3&&!g._hint3){g._hint3=1;showHint("📦 探索地圖找寶箱，打開獲得卡牌！");}
    if(g.level===6&&!g._hint6){g._hint6=1;showHint("⚠️ 新型敵人出現了！小心包圍！");}
    if(g.level===8&&!g._hint8){g._hint8=1;showHint("🎯 遠程射手出沒，注意閃避子彈！");}
    if(g.level===10&&!g._hint10){g._hint10=1;showHint("💨 衝刺者與強化 Boss 登場！");}
    if(g.level%5===0){
      var eg=enemyGrowth(g.level);
      var dmgPct=Math.round((g.p.levelDmgMul-1)*100);
      showHint(`⚔️ 敵人強化！你的全傷害+${dmgPct}%`);
    }
    if(g.level>=12&&((g.p.armor||0)+(g.p.dodge||0))<.25)showHint("🛡️ 後期建議補防禦/閃避，不然很痛！");
    // 寶箱系統（依模式不同）
    if(_mode==="elite"||_mode==="coop"){
      // 精英/coop模式：前8等每級1小寶箱，後半靠Boss獎勵
      if(g.level>=2&&g.level<=8){spawnBonusCrates(1);showHint("📦 寶箱出現！");}
      if(g.level===12&&!g._boss20){g._boss20=true;triggerStageBoss(20);}
      if(g.level===16){spawnBonusCrates(1);showHint("📦 寶箱出現！");}
      if(g.level===20&&!g._boss30){g._boss30=true;triggerStageBoss(30);}
    }else{
      // 經典模式：3個前期小寶箱 + 3個大寶箱(各5選) = 18張卡
      if(g.level>=2&&g.level<=4){spawnBonusCrates(1);showHint("📦 寶箱出現！");}
      if(g.level===7){triggerBigChest(1);}
      if(g.level===14){triggerBigChest(1);}
      if(g.level===20&&!g._boss20){g._boss20=true;triggerStageBoss(20);} // boss後給大寶箱
      if(g.level===25&&!g._boss30){g._boss30=true;triggerStageBoss(30);}
    }
  }

  // 風刃系統（旋風斬）
  if(g.p.windBlades>0){
    if(!g._wb)g._wb=[];
    // 生成風刃：全部消散後等 1 秒 CD
    g._wbSpawnT=(g._wbSpawnT||0)-dt*16.67;
    if(g._wbSpawnT<=0&&g._wb.length===0){
      g._wbSpawnT=1000; // 1 秒 CD
      for(var i=0;i<g.p.windBlades;i++){
        var a=Math.PI*2*i/g.p.windBlades;
        g._wb.push({x:g.p.x+Math.cos(a)*20,y:g.p.y+Math.sin(a)*20,life:4000,target:null,rot:a});
      }
      if(!g._atkAnim)g._atkAnim={active:false,startT:0};g._atkAnim.active=true;g._atkAnim.startT=performance.now(); // 觸發揮武器動畫
      sfx("shoot");
    }
    // 更新風刃
    g._wb=g._wb.filter(wb=>{
      wb.life-=dt*16.67;if(wb.life<=0)return false;
      var fade=wb.life<1000;// 最後 1 秒為消散期
      // 消散期不追擊不傷害，只漂浮
      if(!fade){
        // 每3幀搜尋最近敵人（降低CPU負擔）
        if(!wb._searchSkip||wb._searchSkip<=0){wb._searchSkip=3;
          var nr=null,nd=1e9;
          g.ene.forEach(e=>{if(e.hp>0&&!e.ragePoo){var d2=di(wb,e);if(d2<nd){nd=d2;nr=e;}}});
          wb._target=nr;wb._targetDist=nd;
        }else wb._searchSkip--;
        var nr=wb._target,nd=wb._targetDist||1e9;
        if(nr&&nr.hp>0){
          var dx=nr.x-wb.x,dy=nr.y-wb.y,d2=Math.sqrt(dx*dx+dy*dy)||1;
          var spd=4.5*dt;
          wb.x+=dx/d2*spd;wb.y+=dy/d2*spd;
          wb.rot=Math.atan2(dy,dx);
          if(nd<nr.r+12){var dmg=(g.p.atk*.05+1)*(g.p.elemBoost||1);nr.hp-=dmg*dt;
            if(Math.random()<.15*dt)burst(wb.x,wb.y,"#99E9F2",3);}
        }
      }
      wb.rot+=.15*dt;
      return true;
    });
  }
  // 攻擊動畫系統（時間制）
  if(!g._atkAnim)g._atkAnim={active:false,startT:0};
  if(g._atkAnim.active){
    var el=now-g._atkAnim.startT;
    var dur=charCfg(g.charType).animDur||200;
    if(el>=dur){g._atkAnim.active=false;g._atkAnim._qiSpin=false;}
    g._wbSwing=g._atkAnim.active?Math.max(0,1-el/dur):0;
  }else{g._wbSwing=0;}
  // P2 攻擊動畫衰減
  if(g._p2AtkAnim&&g._p2AtkAnim.active){
    var el2=now-g._p2AtkAnim.startT;
    var ct2=g.p2?g.p2.charType:"gunner";
    var dur2=charCfg(ct2).animDur||200;
    if(el2>=dur2){g._p2AtkAnim.active=false;g._p2AtkAnim._qiSpin=false;}
    g._p2WbSwing=g._p2AtkAnim.active?Math.max(0,1-el2/dur2):0;
  }else{g._p2WbSwing=0;}

  // 迴力鏢系統
  if(g.p.boomerang>0){
    if(!g._booms)g._booms=[];
    g._boomCD=(g._boomCD||0)-dt*16.67;
    if(g._boomCD<=0&&g._booms.length<g.p.boomerang*2){
      g._boomCD=1500;
      var ad=g.ad||{x:0,y:-1},spd=5.5;
      var cnt=g.p.boomerang;
      for(var i=0;i<cnt;i++){
        var spread=(i-(cnt-1)/2)*.3;
        var a=Math.atan2(ad.y,ad.x)+spread;
        g._booms.push({x:g.p.x,y:g.p.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          ox:g.p.x,oy:g.p.y,phase:"out",dist:0,maxDist:220+(g.p.homingR-200)*.5,
          dmg:(g.p.atk*.45+3)*(g.p.elemBoost||1),rot:0,hitOut:new Set(),hitRet:new Set()});
      }
      sfx("shoot");
    }
    g._booms=g._booms.filter(bm=>{
      bm.rot+=.25*dt;
      if(bm.phase==="out"){
        bm.x+=bm.vx*dt;bm.y+=bm.vy*dt;
        bm.dist+=Math.sqrt(bm.vx*bm.vx+bm.vy*bm.vy)*dt;
        // 穿透傷害（去程）
        g.ene.forEach(e=>{if(e.hp<=0||e.ragePoo||bm.hitOut.has(e))return;
          if(di(bm,e)<e.r+10){bm.hitOut.add(e);e.hp-=bm.dmg;burst(bm.x,bm.y,"#20C997",4);
            g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(bm.dmg),life:.8,color:"#20C997"});}});
        if(bm.dist>=bm.maxDist){bm.phase="return";burst(bm.x,bm.y,"#20C997",6);}
      }else{
        // 回程：朝玩家飛回
        var dx=g.p.x-bm.x,dy=g.p.y-bm.y,d=Math.sqrt(dx*dx+dy*dy)||1;
        var rspd=6.5*dt;
        bm.x+=dx/d*rspd;bm.y+=dy/d*rspd;
        // 穿透傷害（回程）
        g.ene.forEach(e=>{if(e.hp<=0||e.ragePoo||bm.hitRet.has(e))return;
          if(di(bm,e)<e.r+10){bm.hitRet.add(e);e.hp-=bm.dmg*1.2;burst(bm.x,bm.y,"#fff",4);
            g.dn.push({x:e.x,y:e.y-e.r,d:Math.floor(bm.dmg*1.2),life:.8,color:"#fff"});}});
        if(d<PR+12)return false; // 回到主角身邊消失
      }
      return true;
    });
  }

  // orbiters（召喚球）
  var passiveCnt=g.p.orbiters||0,totalOrb=passiveCnt,passiveOrbPos=[];
  if(totalOrb>0){for(var i=0;i<totalOrb;i++){
    var orbR=42;
    var a=now/600+Math.PI*2*i/totalOrb;
    var ox=g.p.x+Math.cos(a)*orbR,oy=g.p.y+Math.sin(a)*orbR;
    passiveOrbPos.push({x:ox,y:oy});
    g.ene.forEach(e=>{if(di({x:ox,y:oy},e)<e.r+12){var dmg=(g.p.atk*.4+2)*dt;e.hp-=dmg;}});
  }}
  // summoned orbs actively zap nearby enemies
  if(passiveCnt>0&&g.ene.length){
    g.p.orbShotT=(g.p.orbShotT||0)-dt*16.67;
    if(g.p.orbShotT<=0){
      g.p.orbShotT=420/Math.max(1,passiveCnt);
      passiveOrbPos.forEach(o=>{
        var t=null,nd=260;
        g.ene.forEach(e=>{var d=di(o,e);if(e.hp>0&&d<nd){nd=d;t=e;}});
        if(t){
          var od=(g.p.atk*1.0+3.5);
          t.hp-=od;
          addLtn(o.x,o.y,t.x,t.y,.5);
          burst(t.x,t.y,"#FCC419",4); // zap impact burst on enemy
          burst(t.x,t.y,"#FFE066",2);
          g.dn.push({x:t.x,y:t.y-t.r,d:Math.floor(od),life:.7,color:"#FCC419"});
        }
      });
    }
  }
  // co-op boss shield update
  if(_isCoopMode&&g.p2){
    g.ene.forEach(e=>{
      if(!e.boss||!e._coopCircles)return;
      var now2=performance.now();
      // 護盾已破：倒數 3 秒
      if(e._coopShieldBrokenEnd>0&&now2<e._coopShieldBrokenEnd)return; // 破盾中，可攻擊
      if(e._coopShieldBrokenEnd>0&&now2>=e._coopShieldBrokenEnd){
        e._coopShield=true;e._coopShieldBrokenEnd=0;
        _coopGenCircles(e); // 護盾恢復時才重新生成圈
        g.dn.push({x:e.x,y:e.y-e.r-15,d:"🛡️ 護盾恢復！新圈已生成",life:2.5,color:"#4DABF7",big:1});
        return;
      }
      // 圈位置固定，不自動重新定位
      // 檢查兩人是否各站一個圓點
      if(e._coopShield&&!g.p._downed&&!g.p2._downed){
        var c=e._coopCircles;
        var p1c0=di(g.p,c[0])<30,p1c1=di(g.p,c[1])<30;
        var p2c0=di(g.p2,c[0])<30,p2c1=di(g.p2,c[1])<30;
        if((p1c0&&p2c1)||(p1c1&&p2c0)){
          e._coopShield=false;e._coopShieldBrokenEnd=now2+3000;
          g.dn.push({x:e.x,y:e.y-e.r-15,d:"💥 破盾！3秒攻擊窗口！",life:2.5,color:"#FFD43B",big:1});
          burst(e.x,e.y,"#FFD43B",15);sfx("boss");
        }
      }
    });
  }
  // 每秒傷害上限（精英=全 Boss，經典=僅 Stage Boss）
  var _capAngelMul=g.p._angelBuff?1.6:1;
  var _capArmorMul=1+(g.p.armorCapBonus||0);
  g.ene.forEach(e=>{
    if(!e.boss)return;
    // 經典模式：只保護 Stage Boss
    if(!_isElite()&&!e.stageBoss)return;
    if(!e._secReset||now-e._secReset>=1000){e._secSnap=e.hp;e._secReset=now;}
    var acm=(e.bossType==="armor")?_capArmorMul:1;
    var cap;
    if(e.stageBoss===20)cap=e.mhp/(_isElite()?150:60)*_capAngelMul*acm;  // 💩：精英2.5分/經典1分
    else if(e.stageBoss===30)cap=e.mhp/(_isElite()?240:90)*_capAngelMul*acm; // 😈：精英4分/經典1.5分
    else if(_isElite())cap=e.mhp/(e.mega?30:15)*_capAngelMul*acm; // 精英/coop波次Boss
    else return; // 經典波次Boss不限制
    var taken=Math.max(0,e._secSnap-e.hp);
    if(taken>cap){e.hp=e._secSnap-cap;}
  });
  settleEnemyDeaths();
  checkStageBossDeath();

  } // ═══ HOST 遊戲邏輯結束 ═══

  // 攻擊動畫衰減（HOST + CLIENT 都要跑）
  if(!g._atkAnim)g._atkAnim={active:false,startT:0};
  if(g._atkAnim.active){
    var _ae=now-g._atkAnim.startT;
    var _ad2=charCfg(g.charType).animDur||200;
    if(_ae>=_ad2){g._atkAnim.active=false;g._atkAnim._qiSpin=false;}
    g._wbSwing=g._atkAnim.active?Math.max(0,1-_ae/_ad2):0;
  }else{g._wbSwing=0;}
  if(g._p2AtkAnim&&g._p2AtkAnim.active){
    var _ae2=now-g._p2AtkAnim.startT;
    var _ad3=g.p2?charCfg(g.p2.charType).animDur||200:200;
    if(_ae2>=_ad3){g._p2AtkAnim.active=false;g._p2AtkAnim._qiSpin=false;}
    g._p2WbSwing=g._p2AtkAnim.active?Math.max(0,1-_ae2/_ad3):0;
  }else{g._p2WbSwing=0;}

  // particles（HOST + CLIENT 都要跑，用於視覺衰減）
  filterPar(p=>{p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;p.life-=.03*dt;if(p.sz)p.sz*=.98;return p.life>0;});
  // 限制傷害數字數量，避免 boss 戰過多數字堆疊
  if(g.dn.length>60)g.dn.splice(0,g.dn.length-60);
  g.dn=g.dn.filter(d=>{
    if(d._arc||(typeof d.d==="number")||(d._playerDmg)){
      if(!d._arc){d._arc=1;d.vx=rn(-1.5,1.5);d.vy=rn(-3.5,-2.0);d.g=.16;}
      d.x+=d.vx*dt;d.vy+=d.g*dt;d.y+=d.vy*dt;
    }else d.y-=1.1*dt;
    d.life-=.025*dt;
    return d.life>0;
  });
  g.ltn=g.ltn.filter(l=>{l.life-=.06*dt;return l.life>0;});
  if(g.ultFlash>0)g.ultFlash-=.03*dt;

  // 受擊震動 + 紅光衰減 + 不死鳥動畫
  if(_shakeT>0)_shakeT=Math.max(0,_shakeT-.016*dt);
  if(_hitFlash>0)_hitFlash=Math.max(0,_hitFlash-.04*dt);
  if(getPhoenixT()>0)setPhoenixT(Math.max(0,getPhoenixT()-.016*dt));

  /* ════ DRAW ════ */
  // CLIENT: 用 clientRenderLoop 渲染 HOST 傳來的狀態，跳過 HOST 繪圖路徑
  // 畫面 debug：直接畫在 canvas 上讓手機也看得到
  if(_isCoopMode){
    cx.save();cx.fillStyle="#FFD43B";cx.font="bold 12px sans-serif";cx.textAlign="left";
    var _dbg="C:"+(_isClientMode?"Y":"N")+" R:"+(_net?_net.role:"null")+" Cn:"+(_net?_net.connected:"?")+" E:"+(g.ene?g.ene.length:"?")+" P2:"+(g.p2?"Y":"N");
    cx.fillText(_dbg,10,20);cx.restore();
  }
  if(_isClientMode){
    _clientRenderLoop(g,cx,cam,VW,VH,BR,PR,par,filterPar,setPar,getDashGhosts,setDashGhosts,drawPlayer,drawEnemy,drawMinimap,CHAR,getP2SkillCdEnd,aim,$);
    raf=requestAnimationFrame(loop);
    return;
  }

  const cm=cam();
  const _sx=_shakeT>0?(Math.random()-.5)*2*_shakePow*_shakeT:0;
  const _sy=_shakeT>0?(Math.random()-.5)*2*_shakePow*_shakeT:0;
  cx.save();
  cx.translate(-cm.x+_sx,-cm.y+_sy);

  // background tiles
  const tileS=80;
  const sx=Math.floor(cm.x/tileS),sy=Math.floor(cm.y/tileS);
  const ex=Math.ceil((cm.x+VW)/tileS),ey=Math.ceil((cm.y+VH)/tileS);
  for(let ty=sy;ty<=ey;ty++)for(let tx=sx;tx<=ex;tx++){
    const dark=((tx+ty)%2===0)?"#13132a":"#151530";
    cx.fillStyle=dark;cx.fillRect(tx*tileS,ty*tileS,tileS,tileS);
  }
  // map border
  cx.strokeStyle="rgba(255,255,255,.06)";cx.lineWidth=2;cx.strokeRect(0,0,mapW(),mapH());

  // crates
  const crateSense=Infinity; // crate hints always visible across full map
  g.crates.forEach(cr=>{if(!crateActive(cr))return;
    const cdx=cr.x-g.p.x,cdy=cr.y-g.p.y;if(Math.abs(cdx)>VW*.7||Math.abs(cdy)>VH*.7)return;
    const isBig=!!cr.bigChest;
    const sz=isBig?18:12;
    cx.save();
    if(isBig){
      // 大寶箱：金色光暈 + 脈動
      const pulse=1+Math.sin(now/200)*.08;
      cx.globalAlpha=.25+Math.sin(now/150)*.1;cx.fillStyle="#FFD43B";
      cx.beginPath();cx.arc(cr.x,cr.y,sz*1.8*pulse,0,Math.PI*2);cx.fill();
      cx.globalAlpha=1;
    }
    cx.fillStyle=isBig?"#5C4A1E":"#3D3522";cx.fillRect(cr.x-sz,cr.y-sz,sz*2,sz*2);
    cx.strokeStyle=isBig?"#FFD43B":"#FFD43B60";cx.lineWidth=isBig?2:1.5;cx.strokeRect(cr.x-sz,cr.y-sz,sz*2,sz*2);
    if(isBig){cx.strokeStyle="#fff";cx.lineWidth=1;cx.strokeRect(cr.x-sz+2,cr.y-sz+2,sz*2-4,sz*2-4);}
    cx.fillStyle="#FFD43B";cx.font=`bold ${isBig?16:10}px Nunito`;cx.textAlign="center";
    cx.fillText(isBig?"👑":"📦",cr.x,cr.y+(isBig?6:4));
    if(di(cr,g.p)<=crateSense){
      cx.strokeStyle=isBig?"rgba(255,215,0,.8)":"rgba(18,184,134,.75)";
      cx.lineWidth=2;cx.beginPath();
      cx.arc(cr.x,cr.y,(sz+6)+Math.sin(now/160)*1.5,0,Math.PI*2);cx.stroke();
    }
    // progress bar
    const pct=cr.hits/cr.needed;if(pct>0){
      const bw=sz*2;cx.fillStyle="rgba(0,0,0,.3)";cx.fillRect(cr.x-sz,cr.y+sz+3,bw,3);
      cx.fillStyle=isBig?"#FFD43B":"#FFD43B";cx.fillRect(cr.x-sz,cr.y+sz+3,bw*pct,3);}
    cx.restore();
  });

  // orbs
  g.orbs.forEach(o=>{cx.save();cx.globalAlpha=o.life;cx.shadowColor="#51CF66";cx.shadowBlur=6;cx.fillStyle="#51CF66";cx.beginPath();cx.arc(o.x,o.y,3.5,0,Math.PI*2);cx.fill();cx.restore();});

  // bullets — enhanced per element (no shadowBlur)
  const bc=bCol(),fx_=g.p.fx,fxLv_=Math.max(fx_.fire||0,fx_.ice||0,fx_.dragon||0,fx_.star||0,fx_.poison||0,fx_.lightning||0,0);
  g.bul.forEach(b=>{
    const sz=BR*(1+fxLv_*.12);
    // trail doubles as glow — slightly larger, softer
    for(let ti=0;ti<b.trail.length;ti++){const t=b.trail[ti];if(t.life<=0)continue;cx.globalAlpha=t.life*(.25+fxLv_*.06);cx.fillStyle=b.bc.t;cx.beginPath();cx.arc(t.x,t.y,sz*(t.life*.7+.4),0,Math.PI*2);cx.fill();}
    cx.save();cx.globalAlpha=1;
    cx.fillStyle=b.crit?"#FFD43B":b.bc.f;
    // outer glow circle (replaces shadowBlur — one extra arc, much cheaper)
    if(b.crit||fxLv_>=2){cx.globalAlpha=.25;cx.beginPath();cx.arc(b.x,b.y,sz*2,0,Math.PI*2);cx.fill();cx.globalAlpha=1;}
    // element-specific bullet shape
    if(fx_.fire||fx_.dragon){
      const a=Math.atan2(b.vy,b.vx);cx.translate(b.x,b.y);cx.rotate(a);
      cx.beginPath();cx.ellipse(0,0,sz*1.4,sz*.7,0,0,Math.PI*2);cx.fill();
      cx.fillStyle="#FFD43B";cx.beginPath();cx.ellipse(-sz*.3,0,sz*.5,sz*.3,0,0,Math.PI*2);cx.fill();
    }else if(fx_.ice){
      cx.translate(b.x,b.y);cx.rotate(g.time/200);
      cx.beginPath();cx.moveTo(0,-sz*1.2);cx.lineTo(sz*.6,0);cx.lineTo(0,sz*1.2);cx.lineTo(-sz*.6,0);cx.closePath();cx.fill();
    }else if(fx_.lightning){
      const a=Math.atan2(b.vy,b.vx);cx.translate(b.x,b.y);cx.rotate(a);
      cx.beginPath();cx.moveTo(sz*1.2,0);cx.lineTo(sz*.2,sz*.5);cx.lineTo(sz*.5,0);cx.lineTo(-sz*.2,-sz*.5);cx.lineTo(sz*.2,0);cx.closePath();cx.fill();
    }else if(fx_.poison){
      cx.translate(b.x,b.y);
      cx.beginPath();cx.arc(0,0,sz,0,Math.PI*2);cx.fill();
      cx.strokeStyle="#69DB7C";cx.lineWidth=1;cx.stroke();
    }else if(fx_.star){
      cx.translate(b.x,b.y);cx.rotate(g.time/150);
      cx.beginPath();for(let i=0;i<10;i++){const a2=Math.PI*i/5,rr=i%2===0?sz*1.1:sz*.5;cx.lineTo(Math.cos(a2)*rr,Math.sin(a2)*rr);}cx.closePath();cx.fill();
    }else if(b._minigun){
      // 機關槍：小型 tracer 線段
      const a=Math.atan2(b.vy,b.vx);cx.translate(b.x,b.y);cx.rotate(a);
      const mgBerserk=g.p._mgBerserkEnd&&now<g.p._mgBerserkEnd;
      cx.fillStyle=mgBerserk?"#FF4500":"#FFA94D";
      cx.fillRect(-sz*1.5,-sz*.25,sz*3,sz*.5);
      if(mgBerserk){cx.globalAlpha=.3;cx.fillStyle="#FF0000";cx.fillRect(-sz*2,-sz*.4,sz*4,sz*.8);}
    }else if(b._armorPen>0){
      // 破甲箭：金色尖銳箭型
      const a=Math.atan2(b.vy,b.vx);cx.translate(b.x,b.y);cx.rotate(a);
      cx.fillStyle="#D4A017";
      cx.beginPath();cx.moveTo(sz*1.8,0);cx.lineTo(-sz*.8,-sz*.55);cx.lineTo(-sz*.4,0);cx.lineTo(-sz*.8,sz*.55);cx.closePath();cx.fill();
      cx.fillStyle="#FFD43B";cx.globalAlpha=.5;
      cx.beginPath();cx.moveTo(sz*1.8,0);cx.lineTo(sz*.5,-sz*.2);cx.lineTo(sz*.5,sz*.2);cx.closePath();cx.fill();
    }else{
      cx.translate(b.x,b.y);
      cx.beginPath();cx.arc(0,0,sz,0,Math.PI*2);cx.fill();
    }
    // white center highlight (always at local origin since all branches translate)
    cx.fillStyle="#fff";cx.beginPath();cx.arc(0,0,sz*.25,0,Math.PI*2);cx.fill();
    cx.restore();
  });
  cx.globalAlpha=1; // reset after bullet trail rendering

  // enemy bullets
  g.ebul.forEach(b=>{
    cx.save();cx.globalAlpha=Math.min(b.life*3,1);cx.shadowColor=b.color;cx.shadowBlur=6;
    cx.fillStyle=b.color;cx.beginPath();cx.arc(b.x,b.y,4,0,Math.PI*2);cx.fill();
    cx.fillStyle="rgba(0,0,0,.4)";cx.beginPath();cx.arc(b.x,b.y,2,0,Math.PI*2);cx.fill();
    cx.restore();
  });

  // lightnings — double-stroke glow (no shadowBlur)
  const ltCnt=g.ltn.length;
  const ltStep=ltCnt>80?3:ltCnt>44?2:(getFxQ()<.6?2:1);
  for(let li=0;li<g.ltn.length;li+=ltStep){
    const l=g.ltn[li];if(l.life<=0)continue;
    const jit=(ltCnt>60?7:10)*getFxQ();
    const mx1=(l.x1*2+l.x2)/3+rn(-jit,jit),my1=(l.y1*2+l.y2)/3+rn(-jit,jit);
    const mx2=(l.x1+l.x2*2)/3+rn(-jit,jit),my2=(l.y1+l.y2*2)/3+rn(-jit,jit);
    // outer glow layer — wide, transparent
    cx.save();cx.globalAlpha=l.life*.35;cx.strokeStyle="#FFD43B";cx.lineWidth=6;
    cx.beginPath();cx.moveTo(l.x1,l.y1);cx.lineTo(mx1,my1);cx.lineTo(mx2,my2);cx.lineTo(l.x2,l.y2);cx.stroke();
    // inner core — bright, thin
    cx.globalAlpha=l.life*(getFxQ()<.6?.72:1);cx.strokeStyle="#FAB005";cx.lineWidth=2;
    cx.beginPath();cx.moveTo(l.x1,l.y1);cx.lineTo(mx1,my1);cx.lineTo(mx2,my2);cx.lineTo(l.x2,l.y2);cx.stroke();
    cx.restore();
  }

  // enemies
  g.ene.forEach(e=>{const dx=e.x-g.p.x,dy=e.y-g.p.y;
    const cullR=e.stageBoss?VW:e.boss?VW*.85:VW*.7;const cullRy=e.stageBoss?VH:e.boss?VH*.85:VH*.7;
    if(Math.abs(dx)>cullR||Math.abs(dy)>cullRy)return;
    // burn aura — scales with burnLv
    if(e.burnT>0){
      const blv=e.burnLv||1;
      const ba=.12+blv*.06; // Lv1=.18, Lv2=.24, Lv3=.30
      const br=e.r+2+blv*2; // Lv1=+4, Lv2=+6, Lv3=+8
      const bc2=blv>=3?"#FFD43B":blv>=2?"#FF922B":"#FF6B6B";
      cx.save();cx.globalAlpha=ba+Math.sin(now/120+e.t)*.04;cx.fillStyle=bc2;
      cx.beginPath();cx.arc(e.x,e.y,br,0,Math.PI*2);cx.fill();cx.restore();
    }
    // ice slow aura — scales with ice fxLv
    if(e.st>0&&g.p.fx.ice){
      const ilv=g.p.fx.ice||1;
      cx.save();cx.globalAlpha=.2+ilv*.05;cx.fillStyle="#66D9E8";
      cx.beginPath();cx.arc(e.x,e.y,e.r+2+ilv*1.5,0,Math.PI*2);cx.fill();cx.restore();
    }
    // frozen aura — scales with ice fxLv
    if(e.frozen>0){
      const ilv=g.p.fx.ice||1;
      cx.save();cx.globalAlpha=.25+ilv*.06;cx.fillStyle="#74C0FC";
      cx.beginPath();cx.arc(e.x,e.y,e.r+3+ilv*2,0,Math.PI*2);cx.fill();
      // Lv2+: ice crystal particles
      if(ilv>=2&&par.length<MAX_PARTICLES&&Math.random()<(.08+ilv*.04)*getFxQ()){
        par.push({x:e.x+rn(-e.r,e.r),y:e.y+rn(-e.r,e.r),vx:rn(-.3,.3),vy:rn(-.5,.1),life:.4,color:ilv>=3?"#fff":"#A5D8FF",sz:rn(1.5,3)});
      }
      cx.restore();
    }
    // poison smoke — scales with poisonLv
    if(e.poisonT>0){
      const plv=e.poisonLv||1;
      const pa=.14+plv*.05; // Lv1=.19, Lv2=.24, Lv3=.29
      const pc=plv>=3?"#9C36B5":plv>=2?"#69DB7C":"#A9E34B";
      cx.save();cx.globalAlpha=pa;cx.fillStyle=pc;
      cx.beginPath();cx.arc(e.x,e.y,e.r+3+plv,0,Math.PI*2);cx.fill();cx.restore();
      // smoke puffs — rate scales with level
      const pRate=.25+plv*.08; // Lv1=.33, Lv2=.41, Lv3=.49
      if(par.length<MAX_PARTICLES&&Math.random()<pRate*getFxQ()){
        const sc=plv>=3?(Math.random()>.4?"#9C36B5":"#DA77F2"):(Math.random()>.5?"#A9E34B":"#69DB7C");
        par.push({x:e.x+rn(-e.r,e.r),y:e.y+rn(-e.r*.5,e.r*.3),vx:rn(-.3,.3),vy:rn(-.8,-.2)-.1*plv,life:.5+plv*.08,color:sc,sz:rn(2,4+plv)});
      }
    }
    if(e.stageBoss)drawStageBoss(e,now);
    else if(e.miniPoo||e.miniDemon||e.ragePoo)drawMiniEnemy(e,now);
    else drawEnemy(e);
  });

  // player movement trail
  const _bhActive=g.bhEnd&&now<g.bhEnd;
  const pCol=_bhActive?"#2C3E50":g.p.fx.dragon?"#FF922B":g.p.fx.phoenix?"#BE4BDB":"#74C0FC";
  if(joy.a&&par.length<MAX_PARTICLES&&Math.random()<getFxQ()){par.push({x:g.p.x+rn(-4,4),y:g.p.y+PR*.5+rn(0,4),vx:-joy.dx*.4+rn(-.3,.3),vy:-joy.dy*.4+rn(-.1,.3),life:.55,color:pCol,sz:rn(2,4.5)});}
  // weapon aura particles — ambient element effect around player
  if(fxLv_>0&&par.length<MAX_PARTICLES&&Math.random()<(.15+fxLv_*.1)*getFxQ()){
    const aa=rn(0,Math.PI*2),ar=PR+rn(2,6+fxLv_*3);
    const ac=fx_.dragon?"#FF922B":fx_.fire?"#FF4500":fx_.ice?"#66D9E8":fx_.lightning?"#FAB005":fx_.poison?"#A9E34B":fx_.star?"#F06595":pCol;
    par.push({x:g.p.x+Math.cos(aa)*ar,y:g.p.y+Math.sin(aa)*ar,vx:Math.cos(aa)*rn(.2,.6),vy:Math.sin(aa)*rn(.2,.6)-.3,life:.4+fxLv_*.15,color:ac,sz:rn(1.5,3+fxLv_)});
  }
  // dash afterimages
  getDashGhosts().forEach(gh=>{
    cx.save();cx.globalAlpha=gh.life*.4;
    drawPlayer(gh.x,gh.y,PR,g.time/1000,"#FFE066",gh.face);
    cx.restore();
  });
  // 天使之翼：畫在主角身後（drawPlayer 之前）
  if(g.p._inv&&(!g.p._dashEnd||now>=g.p._dashEnd)){
    const px=g.p.x,py=g.p.y,f=g.p.face||1;
    const flap=Math.sin(now/90);
    const wSpan=38+flap*10; // 翅膀展開寬度
    const wH=40+flap*6; // 翅膀高度
    cx.save();
    // 左翅（3段羽毛）
    for(let s=0;s<3;s++){
      const seg=s/3,segA=-.3-seg*.5+flap*.15;
      const sx2=px-6-s*wSpan*.3,sy=py-2+s*3;
      const ex=px-wSpan*(1-seg*.2),ey=py-wH*(1-seg*.5)+flap*3;
      cx.globalAlpha=.55-.1*s;
      cx.fillStyle=s===0?"rgba(255,255,255,.6)":s===1?"rgba(220,230,255,.5)":"rgba(200,215,245,.4)";
      cx.beginPath();cx.moveTo(sx2,sy);
      cx.quadraticCurveTo(ex-4,ey,ex,ey+8);
      cx.quadraticCurveTo((sx2+ex)/2,sy+6,sx2,sy);
      cx.fill();
    }
    // 右翅（3段羽毛）
    for(let s=0;s<3;s++){
      const seg=s/3;
      const sx2=px+6+s*wSpan*.3,sy=py-2+s*3;
      const ex=px+wSpan*(1-seg*.2),ey=py-wH*(1-seg*.5)+flap*3;
      cx.globalAlpha=.55-.1*s;
      cx.fillStyle=s===0?"rgba(255,255,255,.6)":s===1?"rgba(220,230,255,.5)":"rgba(200,215,245,.4)";
      cx.beginPath();cx.moveTo(sx2,sy);
      cx.quadraticCurveTo(ex+4,ey,ex,ey+8);
      cx.quadraticCurveTo((sx2+ex)/2,sy+6,sx2,sy);
      cx.fill();
    }
    // 羽毛粒子（白色為主）
    if(par.length<MAX_PARTICLES&&Math.random()<.35){
      const side=Math.random()>.5?1:-1;
      par.push({x:px+side*rn(8,wSpan),y:py-rn(0,wH*.6),vx:side*rn(.1,.4),vy:rn(.4,1.2),life:.6,color:"rgba(255,255,255,.7)",sz:rn(1,2.5)});
    }
    cx.restore();
  }
  // player (blinks during i-frame)
  cx.save();
  if(g.p._iFrameEnd>0&&now<g.p._iFrameEnd){cx.globalAlpha=Math.sin(now/30)*0.35+0.55;}
  cx.shadowColor=pCol;cx.shadowBlur=20;drawPlayer(g.p.x,g.p.y,PR,g.time/1000,pCol,g.p.face);cx.restore();
  // co-op link aura visual
  if(g._coopLink&&g.p2){
    const mx2=(g.p.x+g.p2.x)/2,my2=(g.p.y+g.p2.y)/2;
    cx.save();cx.globalAlpha=.12+Math.sin(now/250)*.06;
    const lg=cx.createRadialGradient(mx2,my2,10,mx2,my2,80);
    lg.addColorStop(0,"#FFD43B");lg.addColorStop(1,"transparent");
    cx.fillStyle=lg;cx.beginPath();cx.arc(mx2,my2,80,0,Math.PI*2);cx.fill();
    // line between players
    cx.globalAlpha=.2+Math.sin(now/200)*.1;cx.strokeStyle="#FFD43B";cx.lineWidth=1.5;cx.setLineDash([4,4]);
    cx.beginPath();cx.moveTo(g.p.x,g.p.y);cx.lineTo(g.p2.x,g.p2.y);cx.stroke();cx.setLineDash([]);
    cx.restore();
    // show buff text occasionally
    if(!g._linkHintT||now-g._linkHintT>5000){g._linkHintT=now;
      g.dn.push({x:mx2,y:my2-20,d:"⚡連攜 ATK+30%",life:1.5,color:"#FFD43B"});}
  }
  // P2 (co-op)
  if(_isCoopMode&&g.p2){
    cx.save();
    if(g.p2._downed){cx.globalAlpha=.35;}
    else if(g.p2._iFrameEnd>0&&now<g.p2._iFrameEnd){cx.globalAlpha=Math.sin(now/30)*.35+.55;}
    cx.shadowColor="#F06595";cx.shadowBlur=20;
    // 暫時切換為 P2 角色 + 清除 P1 攻擊動畫（避免 P2 同步做出 P1 的攻擊動作）
    const _p1ct=g.charType,_p1atk=g._atkAnim,_p1wb=g._wbSwing;
    g.charType=g.p2.charType||"gunner";
    g._atkAnim=g._p2AtkAnim||{active:false,startT:0};g._wbSwing=g._p2WbSwing||0;
    drawPlayer(g.p2.x,g.p2.y,PR,g.time/1000,"#F06595",g.p2.face);
    g.charType=_p1ct;g._atkAnim=_p1atk;g._wbSwing=_p1wb;
    cx.restore();
    if(g.p2._downed){
      cx.save();cx.font="bold 12px Nunito,sans-serif";cx.textAlign="center";
      cx.fillStyle="#FF4040";cx.globalAlpha=.6+Math.sin(now/200)*.4;
      cx.fillText("💀 SOS",g.p2.x,g.p2.y-PR-10);cx.restore();
    }
    // P2 rescue progress
    if(!g.p2._downed&&g.p._downed&&g.p._rescueTimer>0){
      const pct=g.p._rescueTimer/3000;
      cx.save();cx.strokeStyle="#51CF66";cx.lineWidth=3;cx.globalAlpha=.8;
      cx.beginPath();cx.arc(g.p.x,g.p.y,PR+8,-.5*Math.PI,-.5*Math.PI+pct*Math.PI*2);cx.stroke();cx.restore();
    }
    if(!g.p._downed&&g.p2._downed&&g.p2._rescueTimer>0){
      const pct=g.p2._rescueTimer/3000;
      cx.save();cx.strokeStyle="#51CF66";cx.lineWidth=3;cx.globalAlpha=.8;
      cx.beginPath();cx.arc(g.p2.x,g.p2.y,PR+8,-.5*Math.PI,-.5*Math.PI+pct*Math.PI*2);cx.stroke();cx.restore();
    }
  }
  // P1 downed indicator
  if(_isCoopMode&&g.p&&g.p._downed){
    cx.save();cx.font="bold 12px Nunito,sans-serif";cx.textAlign="center";
    cx.fillStyle="#FF4040";cx.globalAlpha=.6+Math.sin(now/200)*.4;
    cx.fillText("💀 SOS",g.p.x,g.p.y-PR-10);cx.restore();
  }
  // P2 downed indicator — already drawn inside P2 draw block (line ~1807)
  // 挑卡中提示（對方可見）
  if(_isCoopMode){
    if(g.p._pickPending){
      cx.save();cx.font="bold 10px Nunito,sans-serif";cx.textAlign="center";
      cx.fillStyle="#FFD43B";cx.globalAlpha=.7+Math.sin(now/300)*.3;
      cx.fillText("🃏 挑卡中...",g.p.x,g.p.y-PR-18);cx.restore();
    }
    if(g.p2&&g.p2._pickPending){
      cx.save();cx.font="bold 10px Nunito,sans-serif";cx.textAlign="center";
      cx.fillStyle="#FFD43B";cx.globalAlpha=.7+Math.sin(now/300)*.3;
      cx.fillText("🃏 挑卡中...",g.p2.x,g.p2.y-PR-18);cx.restore();
    }
  }
  // 達摩的光劍：光束特效（狙擊風格，圓形收尾）
  if(g._lightBeams){
    g._lightBeams=g._lightBeams.filter(b=>{
      const el=now-b.t;if(el>300)return false;
      const bp=el/300;
      // 光束起點跟隨玩家
      const bx=g.p.x,by=g.p.y;
      cx.save();cx.lineCap="round"; // 圓形收尾
      // 外層光暈
      cx.globalAlpha=(1-bp)*.4;cx.strokeStyle="#FFD43B";cx.lineWidth=6*(1-bp);
      cx.shadowColor="#FFD43B";cx.shadowBlur=12;
      cx.beginPath();cx.moveTo(bx,by);
      cx.lineTo(bx+Math.cos(b.ang)*b.len,by+Math.sin(b.ang)*b.len);cx.stroke();
      // 內層核心
      cx.globalAlpha=(1-bp)*.8;cx.strokeStyle="#fff";cx.lineWidth=2*(1-bp);cx.shadowBlur=0;
      cx.beginPath();cx.moveTo(bx,by);
      cx.lineTo(bx+Math.cos(b.ang)*b.len,by+Math.sin(b.ang)*b.len);cx.stroke();
      cx.restore();
      return true;
    });
  }
  // 達摩的光劍：武器光粒子包覆
  if(g.p._lightSaber&&g.charType==="swordsman"){
    const _sAd2=(g&&g.ad)?g.ad:{x:g.p.face||1,y:0};
    const _sAng2=Math.atan2(_sAd2.y,_sAd2.x);
    const wpx=g.p.x+Math.cos(_sAng2)*PR*.9,wpy=g.p.y+Math.sin(_sAng2)*PR*.9-PR*.15;
    for(let lpi=0;lpi<2;lpi++){
      const la=rn(0,TAU),ld=rn(3,12);
      cx.save();cx.globalAlpha=.3+Math.sin(now/150+lpi)*.15;
      cx.fillStyle=lpi%2?"#FFD43B":"#fff";
      cx.beginPath();cx.arc(wpx+Math.cos(la)*ld,wpy+Math.sin(la)*ld,rn(1,2.5),0,TAU);cx.fill();
      cx.restore();
    }
  }
  // === 龍寵物繪製（翅膀在後旋轉 + 身體蓋上）===
  if(g._dragonPet){
    var _dp=g._dragonPet,_dpF=_dp.face||1,_dpT=now/1000;
    var _wAng=Math.sin(_dpT*14)*.35; // 振翅（~2.2Hz, ±20度）
    var _bobY=Math.sin(_dpT*3)*3; // 上下浮動
    // 移動時傾斜
    var _dpVx=(_dp._prevX!==undefined)?(_dp.x-_dp._prevX):0;
    _dp._prevX=_dp.x;
    var _tilt=Math.max(-.12,Math.min(.12,_dpVx*.06));
    cx.save();
    cx.translate(_dp.x,_dp.y+_bobY);
    cx.scale(_dpF,1); // 圖已翻轉為朝右，face=1不翻，face=-1翻轉
    cx.rotate(_tilt);
    // 翅膀（先畫，在身體後面，繞關節旋轉）
    cx.save();
    cx.translate(_dpJX-_dpW/2,_dpJY-_dpH/2);
    cx.rotate(_wAng);
    if(_dpWingImg.complete&&_dpWingImg.naturalWidth)cx.drawImage(_dpWingImg,-_dpJX,-_dpJY);
    cx.restore();
    // 身體蓋上（完整圖，遮住翅膀接合處）
    if(_dpBodyImg.complete&&_dpBodyImg.naturalWidth)cx.drawImage(_dpBodyImg,-_dpW/2,-_dpH/2);
    cx.restore();
    // 噴火（從龍嘴出發）
    if(g._dragonBreathFx&&g._dragonBreathFx.on){
      var _bfx=g._dragonBreathFx,_bAng=_bfx.ang,_bR=_bfx.range;
      // 嘴巴位置：龍頭上方偏前（精靈圖中嘴巴約在左上 1/3 處）
      var _mx=_dp.x+_dpF*15,_my=_dp.y-14;
      cx.save();
      var _cyc2=(_dp.breathCycle||0)%3500,_bFade=_cyc2>1600?(2000-_cyc2)/400:Math.min(1,_cyc2/300);
      for(var i=0;i<40;i++){var t2=i/40,d2=_bR*t2;
        var sW=Math.sin(now/80+i*1.3)*.35+Math.sin(now/50+i*2.7)*.25+Math.sin(now/130+i*4.1)*.15;
        var w2=Math.max(.5,t2*10*(1+sW)+1);var wb=w2*.15;
        var ox2=(Math.sin(i*1.7+now/180)+Math.sin(i*3.1+now/110)*.6)*wb;
        var oy2=(Math.cos(i*2.3+now/150)+Math.cos(i*2.9+now/85)*.5)*wb;
        var col2=t2<.15?"#FFF8E0":t2<.35?"#FFD43B":t2<.55?"#FF922B":t2<.75?"#FF4500":"#CC2200";
        cx.globalAlpha=_bFade*(1-t2*.4)*(.3+sW*.08);cx.fillStyle=col2;
        cx.beginPath();cx.arc(_mx+Math.cos(_bAng)*d2+Math.cos(_bAng+PI/2)*ox2,_my+Math.sin(_bAng)*d2+Math.sin(_bAng+PI/2)*oy2,w2,0,TAU);cx.fill();}
      if(_bFade>.3&&par.length<MAX_PARTICLES-2&&Math.random()<.3){var fa=_bAng+rn(-.3,.3),fd=rn(10,_bR*.7);
        par.push({x:_mx+Math.cos(fa)*fd,y:_my+Math.sin(fa)*fd,vx:Math.cos(fa)*rn(1,3),vy:Math.sin(fa)*rn(1,3)-rn(.3,.8),life:rn(.2,.4),color:["#FF4500","#FF922B","#FFD43B"][Math.random()*3|0],sz:rn(2,4),g:.02});}
      cx.restore();
    }
  }
  // 殘影斬：殘影剪影
  if(g._ghostShadow&&g._ghostShadow.life>0){
    const gs=g._ghostShadow;gs.life-=.04;
    cx.save();cx.globalAlpha=gs.life*.35;
    cx.shadowColor="#DA77F2";cx.shadowBlur=12;
    drawPlayer(gs.x,gs.y,PR,performance.now()/1000,"#DA77F2",gs.face);
    cx.shadowBlur=0;cx.restore();
    if(gs.life<=0)g._ghostShadow=null;
  }
  // 殘影斬：紫色斬擊弧
  if(g._ghostArc){
    const ga=g._ghostArc,gel=performance.now()-ga.t;
    if(gel<250){
      const gp=gel/250;
      cx.save();cx.globalAlpha=(1-gp)*.6;cx.strokeStyle="#DA77F2";cx.lineWidth=3*(1-gp);
      cx.shadowColor="#DA77F2";cx.shadowBlur=8;
      cx.beginPath();cx.arc(ga.x,ga.y,PR*2.5,ga.ang-PI*.4+gp*.3,ga.ang+PI*.4-gp*.1);cx.stroke();
      cx.strokeStyle="#fff";cx.lineWidth=1.5*(1-gp);
      cx.beginPath();cx.arc(ga.x,ga.y,PR*2,ga.ang-PI*.3+gp*.2,ga.ang+PI*.3-gp*.05);cx.stroke();
      cx.shadowBlur=0;cx.restore();
    }else{g._ghostArc=null;}
  }
  // 劍士揮劍弧線 / 坦克盾擊衝擊波
  if(g._wbSwing>0&&g.charType!=="gunner"){
    const sw=g._wbSwing,aa=Math.atan2(g.ad.y,g.ad.x);
    const _hasDbl=g.p.dblAtk>=1; // 影分身=360°特效
    cx.save();
    if(g.charType==="swordsman"){
      const swR=PR*3.5*(1-sw*.3);
      if(_hasDbl){
        // 影分身：360°完整環
        cx.globalAlpha=sw*.5;cx.strokeStyle="#FF922B";cx.lineWidth=3*sw;
        cx.shadowColor="#FFD43B";cx.shadowBlur=10*sw;
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR,0,TAU);cx.stroke();
        cx.globalAlpha=sw*.25;cx.strokeStyle="#fff";cx.lineWidth=1.5*sw;cx.shadowBlur=0;
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR*.75,0,TAU);cx.stroke();
        // 灰色殘影環
        cx.globalAlpha=sw*.15;cx.strokeStyle="#868E96";cx.lineWidth=2*sw;
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR*1.1,0,TAU);cx.stroke();
      }else{
        // 普通弧形斬擊
        const swArc=PI*.7;
        cx.globalAlpha=sw*.6;cx.strokeStyle="#FF922B";cx.lineWidth=3*sw;
        cx.shadowColor="#FFD43B";cx.shadowBlur=8*sw;
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR,aa-swArc/2,aa+swArc/2);cx.stroke();
        cx.globalAlpha=sw*.35;cx.strokeStyle="#fff";cx.lineWidth=1.5*sw;cx.shadowBlur=0;
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR*.75,aa-swArc*.4,aa+swArc*.4);cx.stroke();
      }
    }else if(g.charType==="tank"){
      const swR=PR*5*(1-sw*.2);
      if(_hasDbl){
        // 影分身：360°衝擊波環
        cx.globalAlpha=sw*.2;cx.fillStyle="rgba(81,207,102,.15)";
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR,0,TAU);cx.fill();
        const swR2=PR*3.5*(1-sw*.2);
        cx.globalAlpha=sw*.35;cx.fillStyle="rgba(81,207,102,.25)";
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR2,0,TAU);cx.fill();
        cx.strokeStyle="#51CF66";cx.lineWidth=3*sw;cx.shadowColor="#51CF66";cx.shadowBlur=8*sw;
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR,0,TAU);cx.stroke();
        cx.globalAlpha=sw*.15;cx.strokeStyle="#868E96";cx.lineWidth=2*sw;cx.shadowBlur=0;
        cx.beginPath();cx.arc(g.p.x,g.p.y,swR*1.1,0,TAU);cx.stroke();
      }else{
        // 盾擊衝擊波（精確對照 tank-preview A.盾擊）
        const pushP=sw>.65?sw/.65:1-((1-sw)/.35); // 推出→回收的進度
        const p2=1-sw; // 0→1 動畫進度
        // 盾前方位置（推出時前移）
        const shPush=pushP>0?pushP:0;
        const shFx=g.p.x+Math.cos(aa)*(PR+shPush*28);
        const shFy=g.p.y+Math.sin(aa)*(PR+shPush*28);
        // 衝擊波（p2 在 0.25~0.7 之間顯示）
        if(p2>.25&&p2<.7){
          const wp=(p2-.25)/.45;
          cx.save();
          // 外層金色弧
          cx.globalAlpha=(1-wp)*.5;cx.strokeStyle="#FFD43B";cx.lineWidth=3*(1-wp);
          cx.shadowColor="#FFD43B";cx.shadowBlur=8;
          cx.beginPath();cx.arc(shFx+Math.cos(aa)*12,shFy+Math.sin(aa)*12,8+wp*35,aa-PI*.35,aa+PI*.35);cx.stroke();
          // 內層橘色弧
          cx.strokeStyle="#FF922B";cx.lineWidth=2*(1-wp);cx.shadowBlur=0;
          cx.beginPath();cx.arc(shFx+Math.cos(aa)*12,shFy+Math.sin(aa)*12,4+wp*25,aa-PI*.25,aa+PI*.25);cx.stroke();
          cx.restore();
        }
        // 碎片（p2 在 0.3~0.65 之間顯示）
        if(p2>.3&&p2<.65){
          const sp2=(p2-.3)/.35;
          for(let i=0;i<6;i++){
            const fa=aa-.8+i*.32;const fd=10+sp2*30;
            cx.save();cx.globalAlpha=(1-sp2)*.7;cx.fillStyle=i%2?"#FFD43B":"#FF922B";
            cx.beginPath();cx.arc(shFx+Math.cos(fa)*fd,shFy+Math.sin(fa)*fd,1.5+Math.random(),0,TAU);cx.fill();cx.restore();
          }
        }
      }
    }
    cx.shadowBlur=0;cx.restore();
  }
  // 過熱條：長按攻擊時顯示在主角下方
  if(g.heat>0&&!g.p._noOverheat){
    const heatPct=g.heat/HOLD_COOLDOWN_NEED;
    const hbW=PR*2.4,hbH=3,hbX=g.p.x-hbW/2,hbY=g.p.y+PR+8;
    cx.save();cx.globalAlpha=.5+heatPct*.4;
    cx.fillStyle="rgba(0,0,0,.35)";cx.fillRect(hbX,hbY,hbW,hbH);
    const hCol=heatPct>.75?"#FF4500":heatPct>.5?"#FF922B":"#FFD43B";
    cx.fillStyle=hCol;cx.fillRect(hbX,hbY,hbW*heatPct,hbH);
    cx.restore();
  }
  // 過熱警告：集氣條下方，閃爍動畫
  if(g._heatWarn){
    const hbY2=g.p.y+PR+14;
    const blink=Math.sin(now/60); // 快速閃爍
    cx.save();cx.font="bold 9px Nunito,sans-serif";cx.textAlign="center";
    cx.fillStyle="#FF4500";cx.globalAlpha=blink>0?(.6+blink*.4):0; // 閃爍：亮→全透明→亮
    cx.shadowColor="#FF4500";cx.shadowBlur=6;
    cx.fillText("⚠ 過熱警告",g.p.x,hbY2+10);
    cx.restore();
  }
  if(g.heatCD>0){
    const hbY2=g.p.y+PR+14;
    cx.save();cx.font="bold 9px Nunito,sans-serif";cx.textAlign="center";
    cx.fillStyle="#FF4040";cx.globalAlpha=.6+Math.sin(now/80)*.3;
    cx.shadowColor="#FF4040";cx.shadowBlur=6;
    const sec=(g.heatCD/1000).toFixed(1);
    cx.fillText("🔥 冷卻 "+sec+"s",g.p.x,hbY2+10);
    cx.restore();
  }
  // 大招就緒提示：角色頭上顯示1.5秒
  if(g._ultReadyUntil&&now<g._ultReadyUntil){
    const remain=(g._ultReadyUntil-now)/1500;
    const label=g.p.lStep?"⚡ 閃電步就緒 ⚡":"💥 大招就緒 💥";
    cx.save();cx.font="bold 11px Nunito,sans-serif";cx.textAlign="center";
    cx.fillStyle="#FFD43B";cx.globalAlpha=Math.min(1,remain*2.5);
    cx.shadowColor="#BE4BDB";cx.shadowBlur=10;
    cx.fillText(label,g.p.x,g.p.y-PR-12);
    cx.restore();
  }else if(g._ultReadyUntil&&now>=g._ultReadyUntil){g._ultReadyUntil=0;}
  // 嘲諷擴散環動畫（施放瞬間 1.2 秒）
  if(g._tauntRingT&&now-g._tauntRingT<1200){
    const tp=(now-g._tauntRingT)/1200;
    cx.save();
    // 6 層擴散環（更大範圍）
    for(let i=0;i<6;i++){
      const rp=Math.min(1,Math.max(0,(tp-i*.06)/.5));
      if(rp<=0||rp>=1)continue;
      const rr=PR+rp*150+i*20;
      cx.globalAlpha=(1-rp)*.4;cx.strokeStyle=["#51CF66","#FFD43B","#FF6B6B","#51CF66","#FFD43B","#fff"][i];
      cx.lineWidth=(4-i*.4)*(1-rp);
      cx.beginPath();cx.arc(g.p.x,g.p.y,rr,0,TAU);cx.stroke();
    }
    // 中心閃光（更大更亮）
    if(tp<.4){
      cx.globalAlpha=(1-tp/.4)*.5;
      const fg=cx.createRadialGradient(g.p.x,g.p.y,0,g.p.x,g.p.y,60+tp*80);
      fg.addColorStop(0,"#fff");fg.addColorStop(.3,"#FFD43B");fg.addColorStop(.6,"#51CF66");fg.addColorStop(1,"transparent");
      cx.fillStyle=fg;cx.beginPath();cx.arc(g.p.x,g.p.y,60+tp*80,0,TAU);cx.fill();
    }
    // 紅色怒氣波紋
    if(tp>.1&&tp<.7){
      const rp2=(tp-.1)/.6;
      cx.globalAlpha=(1-rp2)*.25;cx.fillStyle="#FF4040";
      cx.beginPath();cx.arc(g.p.x,g.p.y,rp2*180,0,TAU);cx.fill();
    }
    cx.restore();
  }
  // 嘲諷持續時間提示
  if(g.p._tauntAtkEnd&&now<g.p._tauntAtkEnd){
    const tLeft=Math.ceil((g.p._tauntAtkEnd-now)/1000);
    const tPct=(g.p._tauntAtkEnd-now)/3000;
    cx.save();cx.font="bold 9px Nunito,sans-serif";cx.textAlign="center";
    cx.fillStyle="#51CF66";cx.globalAlpha=.7+Math.sin(now/200)*.2;
    cx.fillText("🛡️ 嘲諷 "+tLeft+"s",g.p.x,g.p.y+PR+16);
    // 持續時間進度條
    const bw2=PR*2,bh2=2.5,bx2=g.p.x-bw2/2,by2=g.p.y+PR+19;
    cx.globalAlpha=.4;cx.fillStyle="rgba(0,0,0,.3)";cx.fillRect(bx2,by2,bw2,bh2);
    cx.globalAlpha=.8;cx.fillStyle="#51CF66";cx.fillRect(bx2,by2,bw2*tPct,bh2);
    cx.restore();
  }
  // 震波擴散環（基礎=小環綠色，大地震擊=大環橘色）
  if(g._quakeRingT&&now-g._quakeRingT<(g._quakeRingSmall?400:800)){
    const isSmall=g._quakeRingSmall;
    const dur=isSmall?400:800;
    const qp=(now-g._quakeRingT)/dur;
    cx.save();
    if(isSmall){
      // 基礎震波：2 層小環
      for(let i=0;i<2;i++){
        const rp=Math.min(1,Math.max(0,(qp-i*.1)/.4));
        if(rp<=0||rp>=1)continue;
        cx.globalAlpha=(1-rp)*.25;cx.strokeStyle=i%2?"#69DB7C":"#51CF66";cx.lineWidth=2*(1-rp);
        cx.beginPath();cx.ellipse(g.p.x,g.p.y+PR,rp*50+i*10,rp*8+i*3+2,0,0,TAU);cx.stroke();
      }
    }else{
      // 大地震擊：5 層大環 + 中心閃光 + 裂紋
      for(let i=0;i<5;i++){
        const rp=Math.min(1,Math.max(0,(qp-i*.06)/.5));
        if(rp<=0||rp>=1)continue;
        const cols=["#FF922B","#FFD43B","#FF6B6B","#FF922B","#fff"];
        cx.globalAlpha=(1-rp)*.5;cx.strokeStyle=cols[i];cx.lineWidth=(5-i)*(1-rp);
        cx.shadowColor="#FF922B";cx.shadowBlur=6*(1-rp);
        cx.beginPath();cx.ellipse(g.p.x,g.p.y+PR,rp*180+i*15,rp*30+i*5+3,0,0,TAU);cx.stroke();
      }
      cx.shadowBlur=0;
      // 中心衝擊閃光
      if(qp<.3){
        cx.globalAlpha=(1-qp/.3)*.5;
        const fg=cx.createRadialGradient(g.p.x,g.p.y,0,g.p.x,g.p.y,50+qp*80);
        fg.addColorStop(0,"#fff");fg.addColorStop(.4,"#FFD43B");fg.addColorStop(.7,"#FF922B");fg.addColorStop(1,"transparent");
        cx.fillStyle=fg;cx.beginPath();cx.arc(g.p.x,g.p.y,50+qp*80,0,TAU);cx.fill();
      }
      // 地面裂紋
      if(qp<.6){
        cx.globalAlpha=(1-qp/.6)*.35;cx.strokeStyle="#FF6B6B";cx.lineWidth=1.5;
        for(let j=0;j<6;j++){
          const a=TAU*j/6+qp*.5;const d2=20+qp*100;
          cx.beginPath();cx.moveTo(g.p.x,g.p.y+PR);
          cx.lineTo(g.p.x+Math.cos(a)*d2,g.p.y+PR+Math.sin(a)*d2*.3);cx.stroke();
        }
      }
    }
    cx.restore();
  }
  // 大地震擊 CD 提示
  if(g.p._quake&&g.p._quakeCD&&now<g.p._quakeCD){
    const qLeft=Math.ceil((g.p._quakeCD-now)/1000);
    const qPct=(g.p._quakeCD-now)/3000;
    cx.save();cx.font="bold 8px Nunito,sans-serif";cx.textAlign="center";
    cx.fillStyle="#FF922B";cx.globalAlpha=.6;
    cx.fillText("🌋 "+qLeft+"s",g.p.x,g.p.y+PR+28);
    cx.globalAlpha=.3;cx.fillStyle="rgba(0,0,0,.3)";cx.fillRect(g.p.x-PR,g.p.y+PR+30,PR*2,2);
    cx.globalAlpha=.7;cx.fillStyle="#FF922B";cx.fillRect(g.p.x-PR,g.p.y+PR+30,PR*2*qPct,2);
    cx.restore();
  }
  // 鋼鐵意志持續提示
  if(g.p._iwActive){
    cx.save();cx.font="bold 9px Nunito,sans-serif";cx.textAlign="center";
    cx.fillStyle="#868E96";cx.globalAlpha=.7+Math.sin(now/300)*.2;
    cx.fillText("💪 鋼鐵意志",g.p.x,g.p.y-PR-20);
    // 灰色防護光圈
    cx.globalAlpha=.15+Math.sin(now/400)*.08;cx.strokeStyle="#868E96";cx.lineWidth=2;
    cx.beginPath();cx.arc(g.p.x,g.p.y,PR+6,0,TAU);cx.stroke();
    cx.restore();
  }
  // 守護者光環視覺
  if(g.p._guardAura){
    const ga=g.p._guardAura,gaR=PR+25+ga*10;
    cx.save();cx.globalAlpha=.08+Math.sin(now/500)*.04;
    const gaG=cx.createRadialGradient(g.p.x,g.p.y,PR,g.p.x,g.p.y,gaR);
    gaG.addColorStop(0,"#FFD43B");gaG.addColorStop(1,"transparent");
    cx.fillStyle=gaG;cx.beginPath();cx.arc(g.p.x,g.p.y,gaR,0,TAU);cx.fill();
    cx.globalAlpha=.12+Math.sin(now/350)*.06;cx.strokeStyle="#FFD43B";cx.lineWidth=1;
    cx.setLineDash([3,4]);cx.beginPath();cx.arc(g.p.x,g.p.y,gaR,0,TAU);cx.stroke();cx.setLineDash([]);
    cx.restore();
  }
  // 荊棘反彈特效（被打時觸發，存在 g._thornFlash）
  if(g._thornFlash&&now-g._thornFlash<300){
    const tp2=(now-g._thornFlash)/300;
    cx.save();cx.globalAlpha=(1-tp2)*.5;cx.strokeStyle="#51CF66";cx.lineWidth=2.5*(1-tp2);
    for(let i=0;i<8;i++){
      const a=TAU*i/8+tp2*2;const d=PR+tp2*25;
      cx.beginPath();cx.moveTo(g.p.x+Math.cos(a)*PR,g.p.y+Math.sin(a)*PR);
      cx.lineTo(g.p.x+Math.cos(a)*d,g.p.y+Math.sin(a)*d);cx.stroke();
    }
    cx.restore();
  }
  // 狙擊蓄力特效（更顯眼）
  if(g.p._snipeT&&now-g.p._snipeT<400){
    const sp=(now-g.p._snipeT)/400;
    const ba=Math.atan2(g.ad.y,g.ad.x);
    cx.save();
    // 紅色瞄準線（實線+粗）
    cx.globalAlpha=sp*.8;cx.strokeStyle="#FF4040";cx.lineWidth=2;cx.shadowColor="#FF4040";cx.shadowBlur=6;
    cx.beginPath();cx.moveTo(g.p.x+Math.cos(ba)*PR,g.p.y+Math.sin(ba)*PR);
    cx.lineTo(g.p.x+Math.cos(ba)*(VW*.8)*sp,g.p.y+Math.sin(ba)*(VW*.8)*sp);cx.stroke();
    // 瞄準線尾端十字準星
    if(sp>.3){
      const crX=g.p.x+Math.cos(ba)*(VW*.8)*sp,crY=g.p.y+Math.sin(ba)*(VW*.8)*sp;
      cx.globalAlpha=sp*.5;cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(crX-6,crY);cx.lineTo(crX+6,crY);cx.stroke();
      cx.beginPath();cx.moveTo(crX,crY-6);cx.lineTo(crX,crY+6);cx.stroke();
      cx.beginPath();cx.arc(crX,crY,4,0,TAU);cx.stroke();
    }
    cx.shadowBlur=0;
    // 藍色蓄力圈（更亮更大）
    cx.strokeStyle="#74C0FC";cx.lineWidth=3;cx.globalAlpha=sp*.7;
    cx.shadowColor="#74C0FC";cx.shadowBlur=8;
    cx.beginPath();cx.arc(g.p.x,g.p.y,PR+4+sp*8,0,TAU*sp);cx.stroke();
    // 蓄力內圈
    cx.globalAlpha=sp*.3;cx.lineWidth=1.5;
    cx.beginPath();cx.arc(g.p.x,g.p.y,PR+2,0,TAU*sp);cx.stroke();
    cx.shadowBlur=0;
    // 蓄力文字
    if(sp>.5){cx.globalAlpha=(sp-.5)*1.5;cx.font="bold 10px Nunito,sans-serif";cx.textAlign="center";
      cx.fillStyle="#FF4040";cx.fillText("🎯",g.p.x,g.p.y-PR-15);}
    cx.restore();
  }
  // 狙擊穿透光束（更粗更亮）
  if(g.p._snipeBeamT&&now-g.p._snipeBeamT<400){
    const bp=(now-g.p._snipeBeamT)/400;
    const ba=g.p._snipeBeamAng||0;
    cx.save();cx.globalAlpha=(1-bp)*.8;cx.strokeStyle="#74C0FC";cx.lineWidth=5*(1-bp);
    cx.shadowColor="#74C0FC";cx.shadowBlur=15;
    cx.beginPath();cx.moveTo(g.p.x,g.p.y);
    cx.lineTo(g.p.x+Math.cos(ba)*VW,g.p.y+Math.sin(ba)*VW);cx.stroke();
    cx.shadowBlur=0;cx.restore();
  }
  // 黑洞持續效果：主角周圍暗能量漩渦
  if(_bhActive){
    cx.save();
    const bhProg=Math.sin(now/100);
    cx.globalAlpha=.35+bhProg*.1;cx.strokeStyle="#495057";cx.lineWidth=2.5;
    cx.beginPath();cx.arc(g.p.x,g.p.y,PR+10+bhProg*3,0,Math.PI*2);cx.stroke();
    cx.globalAlpha=.2;cx.strokeStyle="#CED4DA";cx.lineWidth=1.5;cx.setLineDash([3,3]);
    cx.beginPath();cx.arc(g.p.x,g.p.y,PR+18+Math.sin(now/150)*4,0,Math.PI*2);cx.stroke();
    cx.setLineDash([]);cx.restore();
    if(par.length<MAX_PARTICLES&&Math.random()<.3){
      const ba=rn(0,Math.PI*2);par.push({x:g.p.x+Math.cos(ba)*(PR+15),y:g.p.y+Math.sin(ba)*(PR+15),vx:-Math.cos(ba)*rn(.5,1.5),vy:-Math.sin(ba)*rn(.5,1.5),life:.4,color:"#495057",sz:rn(2,4)});}
  }
  // 機關槍狂暴光環
  if(g.p._mgBerserkEnd&&now<g.p._mgBerserkEnd){
    cx.save();cx.globalAlpha=.25+Math.sin(now/60)*.1;cx.strokeStyle="#FF4500";cx.lineWidth=3;
    cx.beginPath();cx.arc(g.p.x,g.p.y,PR+8+Math.sin(now/80)*3,0,Math.PI*2);cx.stroke();cx.restore();
    if(par.length<MAX_PARTICLES&&Math.random()<.3)par.push({x:g.p.x+rn(-PR,PR),y:g.p.y+rn(-PR,PR),vx:rn(-.5,.5),vy:rn(-1.2,-.4),life:.3,color:"#FF4500",sz:rn(2,4)});
  }
  if(g.bhEnd&&now<g.bhEnd){
    const br=18+Math.sin(now/120)*2,or=48+Math.sin(now/200)*4;
    cx.save();cx.globalAlpha=.45;cx.fillStyle="#111";cx.beginPath();cx.arc(g.p.x,g.p.y,br,0,Math.PI*2);cx.fill();
    cx.strokeStyle="rgba(173,181,189,.7)";cx.lineWidth=2.5;cx.beginPath();cx.arc(g.p.x,g.p.y,or,0,Math.PI*2);cx.stroke();
    cx.strokeStyle="rgba(73,80,87,.7)";cx.setLineDash([4,3]);cx.beginPath();cx.arc(g.p.x,g.p.y,or+10,0,Math.PI*2);cx.stroke();cx.setLineDash([]);
    cx.restore();
  }
  if(g.p._inv){
    cx.save();cx.globalAlpha=.2+Math.sin(now/150)*.1;cx.strokeStyle="rgba(255,255,255,.4)";cx.lineWidth=2;cx.beginPath();cx.arc(g.p.x,g.p.y+Math.sin(g.time/1000*3)*2.5,PR+6,0,Math.PI*2);cx.stroke();cx.restore();
  }
  if(g.p._sh){cx.save();
    const shAge=now-(g.p._shSpawn||0),shPulse=shAge<500?1-shAge/500:0;
    cx.globalAlpha=.12+Math.sin(now/180)*.06+shPulse*.3;cx.strokeStyle="#4DABF7";cx.lineWidth=3+shPulse*4;cx.shadowColor="#4DABF7";cx.shadowBlur=12+shPulse*15;cx.beginPath();cx.arc(g.p.x,g.p.y+Math.sin(now/300)*2,PR+7+shPulse*8,0,Math.PI*2);cx.stroke();
    cx.shadowBlur=0;cx.globalAlpha=.25+Math.sin(now/150)*.1;cx.strokeStyle="#74C0FC";cx.lineWidth=1.5;cx.beginPath();cx.arc(g.p.x,g.p.y+Math.sin(now/300)*2,PR+4,0,Math.PI*2);cx.stroke();
    for(let si=0;si<4;si++){const sa=now/400+si*Math.PI/2,sx=g.p.x+Math.cos(sa)*(PR+6),sy=g.p.y+Math.sin(sa)*(PR+6);cx.globalAlpha=.4;cx.fillStyle="#fff";cx.beginPath();cx.arc(sx,sy,1.5,0,Math.PI*2);cx.fill();}
    cx.restore();}
  if(g.p.fx.dragon){cx.save();cx.globalAlpha=.12+fxLv_*.03;cx.fillStyle="#FF922B";cx.beginPath();cx.arc(g.p.x,g.p.y,PR+6+(g.p.fx.dragon||1)*3,0,Math.PI*2);cx.fill();cx.restore();}
  // bulletHeal pulse — zero-particle green flash (fades in 180ms)
  if(g.p._healFlash&&now-g.p._healFlash<180){
    const ht=1-(now-g.p._healFlash)/180;
    cx.save();cx.globalAlpha=ht*.3;cx.strokeStyle="#51CF66";cx.lineWidth=2.5;
    cx.beginPath();cx.arc(g.p.x,g.p.y,PR+3+(1-ht)*6,0,Math.PI*2);cx.stroke();
    cx.globalAlpha=ht*.12;cx.fillStyle="#69DB7C";
    cx.beginPath();cx.arc(g.p.x,g.p.y,PR+2,0,Math.PI*2);cx.fill();
    cx.restore();
  }

  // 風刃視覺（🌪️漏斗形龍捲風 — 放大版 + 消散淡出）
  if(g._wb&&g._wb.length>0){
    g._wb.forEach(wb=>{
      const fadeAlpha=wb.life<1000?wb.life/1000:1; // 最後1秒淡出
      const sc=1.8; // 放大倍率
      cx.save();cx.translate(wb.x,wb.y);cx.scale(sc,sc);
      const spin=now/50;
      for(let s=0;s<6;s++){
        const sy=-12+s*4.5;
        const sw=12-s*1.6;
        const sa=spin+s*1.3;
        cx.globalAlpha=(.5-.05*s)*fadeAlpha;
        cx.strokeStyle=s<2?"#fff":"#99E9F2";
        cx.lineWidth=2-s*.2;
        cx.beginPath();
        cx.ellipse(Math.sin(sa)*3,sy,sw,3-s*.3,Math.sin(sa+s)*.3,0,Math.PI*2);
        cx.stroke();
      }
      // 底部尖端
      cx.globalAlpha=.55*fadeAlpha;cx.fillStyle="#99E9F2";
      cx.beginPath();cx.moveTo(-3,10);cx.lineTo(0,16);cx.lineTo(3,10);cx.fill();
      cx.restore();
      // 碎屑粒子（消散期加大量碎片）
      const pRate=wb.life<1000?.6:.25;
      if(par.length<MAX_PARTICLES&&Math.random()<pRate){
        const pSz=wb.life<1000?rn(1.5,3.5):rn(1,2.5);
        par.push({x:wb.x+rn(-10,10),y:wb.y+rn(-12,8),vx:rn(-1.2,1.2),vy:rn(-1.5,-.4),life:.45,color:"#99E9F2",sz:pSz});}
    });
  }
  // 迴力鏢視覺
  if(g._booms&&g._booms.length>0){
    g._booms.forEach(bm=>{
      cx.save();cx.translate(bm.x,bm.y);cx.rotate(bm.rot);
      const sz=12,ret=bm.phase==="return";
      // 外圈光暈
      cx.globalAlpha=.2;cx.fillStyle=ret?"#fff":"#20C997";
      cx.beginPath();cx.arc(0,0,sz+4,0,Math.PI*2);cx.fill();
      // 迴力鏢本體（V形）
      cx.globalAlpha=ret?.95:.85;
      cx.fillStyle=ret?"#fff":"#20C997";cx.strokeStyle=ret?"#20C997":"#12B886";cx.lineWidth=2;
      cx.beginPath();
      cx.moveTo(sz,0);cx.quadraticCurveTo(sz*.3,-sz*.6,-sz*.2,-sz);
      cx.lineTo(0,-sz*.3);
      cx.lineTo(-sz*.2,sz);cx.quadraticCurveTo(sz*.3,sz*.6,sz,0);
      cx.closePath();cx.fill();cx.stroke();
      // 中心高光
      cx.fillStyle="#fff";cx.globalAlpha=.6;
      cx.beginPath();cx.arc(sz*.2,0,2.5,0,Math.PI*2);cx.fill();
      cx.restore();
      // 拖尾粒子
      if(par.length<MAX_PARTICLES&&Math.random()<.4){
        par.push({x:bm.x+rn(-4,4),y:bm.y+rn(-4,4),vx:rn(-.5,.5),vy:rn(-.5,.5),life:.3,color:ret?"#fff":"#20C997",sz:rn(2,4)});}
    });
  }
  // orbiters visual（召喚球）
  if(totalOrb>0){for(let i=0;i<totalOrb;i++){
    const orbR=42;
    const a=now/600+Math.PI*2*i/totalOrb;
    const ox=g.p.x+Math.cos(a)*orbR,oy=g.p.y+Math.sin(a)*orbR;
    const baseR=7.5,pulse=1+Math.sin(now/200+i*1.5)*.18;
    const col="#FCC419",colDim="rgba(252,196,25,.15)";
    cx.save();
    cx.globalAlpha=.12;cx.strokeStyle=col;cx.lineWidth=1;
    cx.beginPath();cx.moveTo(g.p.x,g.p.y);cx.lineTo(ox,oy);cx.stroke();
    cx.globalAlpha=.18+Math.sin(now/180+i)*.06;cx.fillStyle=colDim;
    cx.beginPath();cx.arc(ox,oy,baseR*pulse*1.8,0,Math.PI*2);cx.fill();
    cx.globalAlpha=1;
    const og=cx.createRadialGradient(ox-baseR*.2,oy-baseR*.3,baseR*.15,ox,oy,baseR*pulse);
    og.addColorStop(0,"#fff");og.addColorStop(.4,col);og.addColorStop(1,"#F59F00");
    cx.fillStyle=og;cx.beginPath();cx.arc(ox,oy,baseR*pulse,0,Math.PI*2);cx.fill();
    cx.globalAlpha=.7;cx.fillStyle="#fff";cx.beginPath();cx.arc(ox-baseR*.25,oy-baseR*.3,baseR*.22,0,Math.PI*2);cx.fill();
    cx.restore();
    if(par.length<MAX_PARTICLES&&Math.random()<.25*getFxQ()){
      par.push({x:ox+rn(-3,3),y:oy+rn(-3,3),vx:rn(-.4,.4),vy:rn(-.4,.4),life:.45,color:col,sz:rn(1.5,3.5)});}
  }}

  // 不死鳥復活動畫
  if(getPhoenixT()>0){
    const pt=1-getPhoenixT()/1.2,px=g.p.x,py=g.p.y;
    cx.save();
    // 擴散火焰環
    const rings=3;
    for(let i=0;i<rings;i++){
      const delay=i*.12,rt=Math.max(0,pt-delay)/(.8-delay);
      if(rt<=0||rt>1)continue;
      const rr=PR+rt*65*(1+i*.4);
      cx.globalAlpha=(1-rt)*.5;
      cx.strokeStyle=i===0?"#FF922B":i===1?"#FF6B6B":"#FFD43B";
      cx.lineWidth=3-rt*2;
      cx.beginPath();cx.arc(px,py,rr,0,Math.PI*2);cx.stroke();
    }
    // 火焰翅膀
    if(pt<.85){
      const wt=Math.min(1,pt/.4),wa=(1-Math.abs(pt-.4)/.45)*.55;
      const wingH=30+wt*25,wingW=15+wt*35;
      cx.globalAlpha=wa;
      // 左翅
      cx.fillStyle="#FF922B";cx.beginPath();
      cx.moveTo(px,py-5);
      cx.quadraticCurveTo(px-wingW,py-wingH,px-wingW*.7,py+10);
      cx.quadraticCurveTo(px-wingW*.3,py-5,px,py-5);
      cx.fill();
      cx.fillStyle="#FFD43B";cx.globalAlpha=wa*.6;cx.beginPath();
      cx.moveTo(px,py-2);
      cx.quadraticCurveTo(px-wingW*.7,py-wingH*.7,px-wingW*.5,py+5);
      cx.quadraticCurveTo(px-wingW*.2,py-2,px,py-2);
      cx.fill();
      // 右翅
      cx.globalAlpha=wa;cx.fillStyle="#FF922B";cx.beginPath();
      cx.moveTo(px,py-5);
      cx.quadraticCurveTo(px+wingW,py-wingH,px+wingW*.7,py+10);
      cx.quadraticCurveTo(px+wingW*.3,py-5,px,py-5);
      cx.fill();
      cx.fillStyle="#FFD43B";cx.globalAlpha=wa*.6;cx.beginPath();
      cx.moveTo(px,py-2);
      cx.quadraticCurveTo(px+wingW*.7,py-wingH*.7,px+wingW*.5,py+5);
      cx.quadraticCurveTo(px+wingW*.2,py-2,px,py-2);
      cx.fill();
    }
    // 上升火焰粒子
    if(par.length<MAX_PARTICLES){
      const fc=["#FF922B","#FFD43B","#FF6B6B","#BE4BDB"];
      for(let i=0;i<3;i++){
        const a=Math.random()*Math.PI*2,r=Math.random()*20;
        par.push({x:px+Math.cos(a)*r,y:py+Math.sin(a)*r,vx:Math.cos(a)*rn(.3,1.2),vy:-rn(1.5,3.5),life:.6+Math.random()*.4,color:fc[Math.random()*4|0],sz:rn(2,5)});
      }
    }
    cx.restore();
  }

  // aim line
  if(aim.a){cx.save();cx.globalAlpha=.3;cx.strokeStyle=bc.f;cx.lineWidth=1.5;cx.setLineDash([4,4]);cx.beginPath();cx.moveTo(g.p.x+g.ad.x*PR,g.p.y+g.ad.y*PR);cx.lineTo(g.p.x+g.ad.x*50,g.p.y+g.ad.y*50);cx.stroke();cx.setLineDash([]);cx.restore();}

  // particles
  par.forEach(p=>{cx.globalAlpha=p.life;cx.fillStyle=p.color;cx.beginPath();cx.arc(p.x,p.y,p.sz,0,Math.PI*2);cx.fill();});cx.globalAlpha=1;
  // dmg nums
  g.dn.forEach(d=>{cx.save();cx.globalAlpha=Math.min(1,d.life);
    const isPlayerDmg=d._playerDmg;
    cx.font=(isPlayerDmg?"bold 18px":d.big?"bold 15px":"bold 11px")+" 'Nunito',sans-serif";
    cx.textAlign="center";
    const txt=typeof d.d==="number"?"-"+d.d:d.d;
    if(isPlayerDmg){cx.strokeStyle="rgba(0,0,0,.6)";cx.lineWidth=3;cx.strokeText(txt,d.x,d.y);}
    cx.fillStyle=d.color||"#fff";cx.fillText(txt,d.x,d.y);
    cx.restore();});

  cx.restore();

  // crate indicators in screen space when detected but off-screen
  if(crateSense>0){
    const edgePad=24,halfW=VW/2,halfH=VH/2;
    g.crates.forEach(cr=>{
      if(!crateActive(cr)||di(cr,g.p)>crateSense) return;
      const sx=cr.x-cm.x,sy=cr.y-cm.y;
      if(sx>=0&&sx<=VW&&sy>=0&&sy<=VH) return;
      const vx=sx-halfW,vy=sy-halfH;
      const scale=Math.min(
        Math.abs(vx)>1?(halfW-edgePad)/Math.abs(vx):Infinity,
        Math.abs(vy)>1?(halfH-edgePad)/Math.abs(vy):Infinity
      );
      const ix=halfW+vx*scale,iy=halfH+vy*scale;
      const ang=Math.atan2(vy,vx);
      const isBigCr=!!cr.bigChest;
      cx.save();
      cx.translate(ix,iy);
      cx.rotate(ang+Math.PI/2);
      cx.globalAlpha=isBigCr?.95:.9;
      cx.fillStyle=isBigCr?"#FFD43B":"#12B886";
      cx.strokeStyle=isBigCr?"#FFF3BF":"#B2F2BB";
      cx.lineWidth=1.5;
      cx.beginPath();
      cx.moveTo(0,-9);
      cx.lineTo(7,7);
      cx.lineTo(-7,7);
      cx.closePath();
      cx.fill();
      cx.stroke();
      cx.restore();
    });
  }

  // P2 off-screen indicator (co-op)
  if(_isCoopMode&&g.p2){
    const _camP=(_net&&_net.role==="client")?g.p2:g.p; // 自己
    const _camO=(_net&&_net.role==="client")?g.p:g.p2; // 對方
    const osx=_camO.x-cm.x,osy=_camO.y-cm.y;
    if(osx<0||osx>VW||osy<0||osy>VH){
      const edgePad=24,halfW=VW/2,halfH=VH/2;
      const vx=osx-halfW,vy=osy-halfH;
      const scale=Math.min(
        Math.abs(vx)>1?(halfW-edgePad)/Math.abs(vx):Infinity,
        Math.abs(vy)>1?(halfH-edgePad)/Math.abs(vy):Infinity
      );
      const ix=halfW+vx*scale,iy=halfH+vy*scale;
      const ang=Math.atan2(vy,vx);
      const pCol2=(_net&&_net.role==="client")?"#74C0FC":"#F06595";
      const dist=Math.floor(di(_camP,_camO));
      cx.save();
      // arrow
      cx.translate(ix,iy);cx.rotate(ang+Math.PI/2);
      cx.globalAlpha=.85+Math.sin(now/300)*.15;
      cx.fillStyle=pCol2;cx.strokeStyle="#fff";cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(0,-10);cx.lineTo(8,8);cx.lineTo(-8,8);cx.closePath();cx.fill();cx.stroke();
      cx.restore();
      // label
      cx.save();cx.font="bold 9px Nunito,sans-serif";cx.textAlign="center";
      cx.fillStyle=pCol2;cx.globalAlpha=.9;
      const lbl=_camO._downed?"💀 SOS "+dist:"🤝 "+dist;
      cx.fillText(lbl,ix,iy+18);
      cx.restore();
    }
  }

  // ult flash overlay + hit vignette
  const _pulseWarn=g._pulseWarnEnd&&now<g._pulseWarnEnd;
  const _needFx=g.ultFlash>0||_hitFlash>0||getPhoenixT()>0||_pulseWarn;
  if(_needFx){
    const fctx=fxctx;fctx.clearRect(0,0,VW,VH);
    // 受擊紅色暈光
    if(_hitFlash>0){fctx.save();const hg=fctx.createRadialGradient(VW/2,VH/2,VW*.25,VW/2,VH/2,VW*.72);hg.addColorStop(0,"transparent");hg.addColorStop(1,"#FF2020");fctx.fillStyle=hg;fctx.globalAlpha=_hitFlash*.45;fctx.fillRect(0,0,VW,VH);fctx.restore();}
    // 不死鳥金色閃光
    if(getPhoenixT()>0){fctx.save();const pt=1-getPhoenixT()/1.2,pa=pt<.3?(pt/.3):(1-(pt-.3)/.9);const pg=fctx.createRadialGradient(VW/2,VH/2,0,VW/2,VH/2,VW*.6);pg.addColorStop(0,"#FFD43B");pg.addColorStop(.3,"#FF922B");pg.addColorStop(1,"transparent");fctx.fillStyle=pg;fctx.globalAlpha=pa*.35;fctx.fillRect(0,0,VW,VH);fctx.restore();}
    // 暗黑脈衝畫面警告
    if(_pulseWarn){
      fctx.save();
      const pwT=(g._pulseWarnEnd-now)/2200, pwFlash=Math.sin(now/80);
      // 紫紅色邊框閃爍
      fctx.globalAlpha=(.25+pwFlash*.15)*(1-pwT*.3);
      const eg=fctx.createRadialGradient(VW/2,VH/2,VW*.2,VW/2,VH/2,VW*.7);
      eg.addColorStop(0,"transparent");eg.addColorStop(1,"#9B59B6");
      fctx.fillStyle=eg;fctx.fillRect(0,0,VW,VH);
      // 中央文字
      fctx.globalAlpha=.7+pwFlash*.3;
      fctx.font="bold 22px Nunito,sans-serif";fctx.textAlign="center";fctx.textBaseline="middle";
      fctx.fillStyle="#FF4040";fctx.shadowColor="#FF4040";fctx.shadowBlur=15;
      fctx.fillText("⚠️ 靠近Boss！",VW/2,VH*0.18);
      fctx.font="bold 13px Nunito,sans-serif";fctx.fillStyle="#FFD43B";fctx.shadowColor="#FFD43B";
      fctx.fillText("進入Boss身邊的安全圈",VW/2,VH*0.24);
      fctx.shadowBlur=0;
      fctx.restore();
    }
    // ult flash
    if(g.ultFlash>0){fctx.save();fctx.globalAlpha=g.ultFlash*.5;const ug=fctx.createRadialGradient(VW/2,VH/2,0,VW/2,VH/2,VW);if(g.ultType==="bh"){ug.addColorStop(0,"#fff");ug.addColorStop(.3,"#495057");ug.addColorStop(1,"transparent");}else{ug.addColorStop(0,"#fff");ug.addColorStop(.2,"#FFD43B");ug.addColorStop(.5,"#BE4BDB");ug.addColorStop(1,"transparent");}fctx.fillStyle=ug;fctx.fillRect(0,0,VW,VH);const rr=(1-g.ultFlash)*VW;fctx.strokeStyle="#fff";fctx.lineWidth=3+g.ultFlash*6;fctx.globalAlpha=g.ultFlash*.5;fctx.beginPath();fctx.arc(VW/2,VH/2,rr,0,Math.PI*2);fctx.stroke();fctx.restore();}
    fxc.style.display="block";
  }else{fxctx.clearRect(0,0,VW,VH);fxc.style.display="none";}

  // 右側能力欄（溢出時往左換列，避開小地圖）
  if(inv.length>0){
    const abS=26,abGap=3,abStep=abS+abGap,abStartY=140;
    const maxRows=Math.floor((VH-abStartY-65)/abStep)||1;
    const _rr=cx.roundRect?function(x,y,w,h,r){cx.beginPath();cx.roundRect(x,y,w,h,r);}
      :function(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.lineTo(x+w-r,y);cx.arcTo(x+w,y,x+w,y+r,r);cx.lineTo(x+w,y+h-r);cx.arcTo(x+w,y+h,x+w-r,y+h,r);cx.lineTo(x+r,y+h);cx.arcTo(x,y+h,x,y+h-r,r);cx.lineTo(x,y+r);cx.arcTo(x,y,x+r,y,r);cx.closePath();};
    cx.save();cx.textAlign="center";cx.textBaseline="middle";
    inv.forEach((ci,i)=>{
      const cd=C.find(c=>c.id===ci.id);if(!cd)return;
      const col=Math.floor(i/maxRows),row=i%maxRows;
      const x=VW-abS-6-col*(abS+4),y=abStartY+row*abStep;
      // 背景
      cx.globalAlpha=.35;cx.fillStyle="#0a0a18";
      _rr(x,y,abS,abS,4);cx.fill();
      cx.globalAlpha=.25;cx.strokeStyle=RC[cd.r];cx.lineWidth=1;
      _rr(x,y,abS,abS,4);cx.stroke();
      // emoji
      cx.globalAlpha=.8;cx.font="14px 'Nunito',sans-serif";
      cx.fillText(cd.e,x+abS/2,y+abS/2);
      // Lv 標示
      cx.globalAlpha=.9;cx.font="bold 7px 'Nunito',sans-serif";
      cx.fillStyle=LVC[ci.lv]||"#fff";
      cx.fillText("Lv"+(ci.lv+1),x+abS/2,y+abS-3);
      // 不死鳥：顯示剩餘復活次數
      if(cd.n==="不死鳥"){
        cx.globalAlpha=.9;cx.font="bold 8px 'Nunito',sans-serif";
        cx.fillStyle=g.p.revive>0?"#51CF66":"#FF4040";
        cx.fillText(g.p.revive>0?"×"+g.p.revive:"×0",x+abS/2,y+5);
      }
      // 已用完標記
      let used=false;
      if(cd.n==="不死鳥"&&g.p.revive<=0)used=true;
      if(cd.n==="幸運幣"||cd.n==="命運轉輪")used=true;
      if(used){
        cx.globalAlpha=.5;cx.font="bold 18px 'Nunito',sans-serif";
        cx.fillStyle="#FF4040";cx.fillText("✕",x+abS/2,y+abS/2);
      }
    });
    // 越戰越勇 buff 圖示
    if(g.p._angelBuff){
      const abI=inv.length;
      const col2=Math.floor(abI/maxRows),row2=abI%maxRows;
      const ax=VW-abS-6-col2*(abS+4),ay=abStartY+row2*abStep;
      cx.globalAlpha=.35;cx.fillStyle="#0a0a18";_rr(ax,ay,abS,abS,4);cx.fill();
      cx.globalAlpha=.25;cx.strokeStyle="#FFD43B";cx.lineWidth=1;_rr(ax,ay,abS,abS,4);cx.stroke();
      cx.globalAlpha=.8;cx.font="14px 'Nunito',sans-serif";cx.fillText("🔥",ax+abS/2,ay+abS/2);
      cx.globalAlpha=.9;cx.font="bold 7px 'Nunito',sans-serif";cx.fillStyle="#FFD43B";cx.fillText("越戰越勇",ax+abS/2,ay+abS-3);
    }
    cx.restore();
  }

  setHudSkillCd(getSkillCdEnd());hud();drawMinimap();
  // Host: 每幀送狀態給 Client + debug
  if(_isCoopMode&&_net&&_net.role==="host"){
    // HOST debug 在右上角（綠色）
    cx.save();cx.fillStyle="#51CF66";cx.font="bold 11px sans-serif";cx.textAlign="right";
    cx.fillText("HOST Cn:"+(_net.connected?"Y":"N")+" Open:"+(_net.conn?(_net.conn.open?"Y":"N"):"X")+" E:"+g.ene.length,VW-10,20);cx.restore();
    if(_net.connected&&_net.conn&&_net.conn.open){
      const _ss=serializeCoopState();if(_ss)_net.conn.send(_ss);
    }
  }
  }catch(err){console.error("Game loop error:",err);}
  raf=requestAnimationFrame(loop);
}
