import S from "./state.js";
import {
  PI, TAU, MW, MH, PR, ER, BR, PS,
  AUTO_CD, HOLD_CD, ULT_CHARGE_NEED,
  BH_DURATION_MS, BH_COOLDOWN_MS, CRATE_HP, BOSS_EVERY,
  MAX_PARTICLES, MAX_BULLETS, MAX_ENEMIES,
  SP_B, SPAWN_R, ULT_D, MAX_EBULLETS,
  PLAYER_DMG_SCALE, ENEMY_HP_SCALE, LIGHTNING_CAP, HOLD_COOLDOWN_NEED,
  ROLE_NORMAL, ROLE_FLANKER, ROLE_SHOOTER, ROLE_DASHER, ROLE_SHIELD,
  CHAR, MODE, RW, RC, RECOMMENDED, RG, LVC, EC, TC,
  pickRole
} from "./config.js";
import { di, cl, rn, $ } from "./utils.js";
import { C, rndBuff, setCardsIsElite } from "./cards.js";
import { sfx, sfxShoot, sfxHit, sfxCtx, getActx, bgmPlay, bgmStop, bgmRef, setMuted, getMuted, toggleMuteState } from "./audio.js";
import { setCx, getCx, setG, getG, setFxQ, getFxQ, par, resetPar, setPar, filterPar, resetLtnRingIdx, burst, addLtn, bCol, drawPoly, drawStar, WP, getWpn, drawPlayer, drawEnemy } from "./render.js";
import { initHud, setHudG, setHudCoopState, setHudSkillCd, getHudSkillCd, setHudAim, setHudVW, setHudVH, showPlayerDmg, hud, showHint, drawMinimap } from "./hud.js";
import { joy, aim, ks, initInput, setupInputListeners, setStick, resetControls, resetJoyAim, attachTouchToStick, rebindActiveTouches, getClientUltReq, setClientUltReq, getClientDodgeReq, setClientDodgeReq } from "./input.js";
import { initEnemies, setEnemiesG, setEnemiesMode, setEnemiesCoopMode, setEnemiesPracticeMode, maxTierForWave, enemyGrowth, tierHpFor, pickEnemyTier, spawnTargetForWave, spikeConfigForWave, genCrates, spawnBonusCrates, spawn, _coopGenCircles, triggerSpikeWave, triggerHuntPressure } from "./enemies.js";
import { initCombat, setCombatG, setCombatMode, setCombatCoopState, setCombatInv, setCombatSkillCd, getCombatSkillCd, setCombatP2SkillCd, getCombatP2SkillCd, setCombatClientSkillReq, getCombatClientSkillReq, nearestTargets, awardEnemyKill, settleEnemyDeaths, fire, swordSwing, shieldBash, tapAtk } from "./combat.js";
import { initSkills, setSkillsG, setSkillsCoopState, setSkillsClientSkillReq, getSkillsClientSkillReq, getDashGhosts, resetDashGhosts, SKILL_CDS, getSkillCdEnd, setSkillCdEnd, getP2SkillCdEnd, setP2SkillCdEnd, p2UseSkill, useCharSkill, skillSnipe, skillGhostSlash, skillTaunt, _startDash, doUlt } from "./skills.js";
import { initCardsUi, setCardsUiG, setCardsUiInv, getCardLv, addCard, pks, showPick, showAngelCard, triggerBigChest, getCurrentPickCtx } from "./cards-ui.js";
import { initBoss, setBossG, setBossCoopMode, setBossIsElite, getStageBoss, setStageBoss, bossBgmStart, bossBgmStop, bossBgmSetBpm, sfxBossEntrance, sfxBossAtk, triggerStageBoss, updateStageBoss, drawStageBoss, drawMiniEnemy, checkStageBossDeath } from "./boss.js";
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
  pracRefreshStats, showCardTip,
  pracTogglePanel, pracSpawn, pracToggleHp, pracToggleCoop,
  pracCycleP2Char, pracCoopRoom, pracCoopJoin,
  pracSwitchChar, pracCloseOnBlank
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
import {
  initLoop, syncLoopState,
  loop, cam, nearestPlayer, bothPlayers,
  getRaf, setRaf, getCTimer, setCTimer,
  setLoopShake, setLoopHitFlash,
  setLoopMode, setLoopCharType, setLoopCoopState, setLoopVWVH, setLoopG, setLoopCanvas
} from "./loop.js";

// Dragon pet sprites (from state)
var _dpWingImg = S._dpWingImg, _dpBodyImg = S._dpBodyImg;
var _dpW = S._dpW, _dpH = S._dpH, _dpJX = S._dpJX, _dpJY = S._dpJY;

// Viewport
let VW = 400, VH = 700;

// Mode / character
let _mode = "classic";
let _charType = "gunner";

function _isElite() { return _mode === "elite" || _mode === "coop"; }
setCardsIsElite(_isElite);

// expForLevel → ui.js

const mapW=()=>(MODE[_mode].mapW||MW)+((g&&g.p&&g.p.mapExpand)||0);
const mapH=()=>(MODE[_mode].mapH||MH)+((g&&g.p&&g.p.mapExpand)||0);
const crateActive=cr=>!!(g&&cr&&cr.hp>0&&g.level>=(cr.unlockLv||1));
// fxQ is in render.js — use getFxQ()/setFxQ()
/* nearestTargets → combat.js */

/* inventory, pks → cards-ui.js */
let inv=[];

let cv,cx,fxc,fxctx;
let g;
let _hitFlash=0,_shakeT=0,_shakePow=0; // 受擊特效
// _phoenixT, _phoenixAnim → ui.js (use getPhoenixAnim/setPhoenixAnim)
let raf,cTimer,ultCastTimer=null;
/* ═══ Co-op Networking ═══ */
let _net=null; // {role:"host"|"client", peer:Peer, conn:DataConnection, roomCode:string, connected:bool}
let _isCoopMode=false;
let _p2AI=false; // P2 由 AI 控制
/* _clientSkillReq → skills.js */
// _clientUltReq, _clientDodgeReq — moved to input.js (use getter/setter)
let _p2Input={dx:0,dy:0,a:0,aimA:0,aimDx:0,aimDy:0,ult:false,dodge:false,pick:-1};
let inv2=[]; // P2 卡片庫存


/* ═══════════ 設定 + 靜音 ═══════════ */
// _settingsOpen, _wasRunning → ui.js
function toggleMute(){
  const muted = toggleMuteState();
  const tog=document.getElementById("sfxToggle");
  const knob=document.getElementById("sfxKnob");
  if(tog&&knob){
    tog.style.background=muted?"rgba(255,255,255,.15)":"#7C3AED";
    knob.style.left=muted?"3px":"27px";
  }
  const ev=document.getElementById("endVid");
  if(ev)ev.muted=muted;
};



// setStick, resetControls — moved to input.js
// resetSessionUi → ui.js
// attachTouchToStick, rebindActiveTouches — moved to input.js

/* awardEnemyKill, settleEnemyDeaths → combat.js */

/* ═══ camera, nearestPlayer, bothPlayers → loop.js ═══ */

/* ═══ resize → ui.js ═══ */
window.addEventListener("resize",resize);

/* showPlayerDmg → hud.js */

/* HUD, floating hints, minimap → hud.js */

/* ═══ bullet FX / draw helpers / drawPlayer / drawEnemy → render.js ═══ */

/* weapon config, getWpn → render.js */

/* drawPlayer, drawEnemy → render.js */

/* particle pool (par, burst, addLtn) → render.js */


// resumeGame, show → ui.js

/* drawTitleHero IIFE → render.js */
let _titleUltTimer=null; // 保留變數避免 startGame 報錯

/* genCrates, maxTierForWave, enemyGrowth, tierHpFor, pickEnemyTier, spawnTargetForWave, spikeConfigForWave → enemies.js */

/* fire, swordSwing, shieldBash, tapAtk → combat.js */
/* swordSwing, shieldBash, tapAtk → combat.js */

/* skills, ult, dash → skills.js */

/* ════════ 鳳凰飛入 → ui.js ════════ */


/* CARD PICK → cards-ui.js */

/* STAGE BOSS SYSTEM → boss.js */
/* triggerVictory, showVictoryScreen, showOver → ui.js */

window.overGoHome=function(){
  _isCoopMode=false;_p2AI=false;setPracticeMode(false);setEnemiesCoopMode(false);setEnemiesPracticeMode(false);setCombatCoopState(false,_net,false);setSkillsCoopState(false,_net);setBossCoopMode(false);
  if(_net&&_net.peer){_net.peer.destroy();_net=null;}
  bgmStop();bossBgmStop();show("title");
};

/* ═══ 角色選擇 ═══ */
let _pendingMode="classic";
function showCharSelect(mode){
  _pendingMode=mode;
  $("titleOv").style.display="none";
  $("charSelectOv").style.display="flex";
}
function pickChar(charType){
  _charType=charType;
  $("charSelectOv").style.display="none";
  if(_pendingMode==="coop"){_coopStartReal(_charType);}
  else if(_pendingMode==="practice"){openPractice();}
  else{startGame(_pendingMode);}
}

window.startGame=window.SG=function(mode){
  _mode=mode||_mode||"classic";const MC=MODE[_mode];
  _isCoopMode=(_mode==="coop"); // coop flag（非 coop 重設 false）
  const CC=CHAR[_charType]||CHAR.gunner; // 角色數值
  // 嘗試全螢幕（隱藏網址列）
  const el=document.documentElement;
  if(el.requestFullscreen)el.requestFullscreen().catch(()=>{});
  else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();
  sfxCtx();bgmPlay();
  if(_titleUltTimer){clearTimeout(_titleUltTimer);_titleUltTimer=null;}
  cv=$("cv");cx=cv.getContext("2d");fxc=$("fx");fxctx=fxc.getContext("2d");setCx(cx);
  resize(); // 先偵測方向更新 VW/VH
  cv.width=fxc.width=VW;cv.height=fxc.height=VH;
  resetSessionUi();
  cx.fillStyle="#0a0a18";cx.fillRect(0,0,VW,VH);
  const _mw=MC.mapW||MW,_mh=MC.mapH||MH;
  g={charType:_charType,p:{x:_mw/2,y:_mh/2,hp:CC.startHp,maxHp:CC.startHp,atk:CC.startAtk,speed:CC.startSpeed,fr:CC.fr,armor:CC.armor,chain:0,ls:0,slow:1,split:1,expR:1,crit:CC.crit,revive:0,fx:{},regen:0,expMul:1,luck:0,dodge:CC.dodge,thorns:0,dblAtk:0,shieldCD:0,_sh:false,_shT:0,_shSpawn:0,whirlCount:0,whirlLv:0,orbiters:0,poison:0,hasBH:false,hasTS:false,ultLv:0,pierce:0,homing:0,homingR:200,splash:0,berserk:0,deathBoom:0,dodgeAtk:0,elemBoost:1,ultDmgMul:1,ultRate:1,bulletHeal:0,invCD:0,invDur:0,_inv:false,_ivT:0,timestop:0,tsD:0,tsFrzDur:0,tsCd:0,lStep:false,lStepDur:0,lStepSpd:0,lStepCd:0,_dashEnd:0,_dashDx:0,_dashDy:0,_dashSpd:0,_dashGT:0,chainDmg:1,poisonDmg:0,bossDmg:1,mobDmg:1,poisonBossMul:1,burnBoost:1,crateVis:1,mapExpand:0,pickCount:2,face:1,_iFrameEnd:0,_healFlash:0,heavyEvery:0,_heavyCount:0,ultCdReduce:0,_downed:false,_rescueTimer:0,contactCap:100,_swingState:null,_sniperStack:0,_sniperTarget:0,_swordQiCount:0,_ironwallT:0,_shieldBlock:false},
    ene:[],bul:[],par:[],dn:[],orbs:[],ltn:[],ebul:[],crates:getPracticeMode()?[]:genCrates(),
    exp:0,expTo:expForLevel(1),level:1,score:0,kills:0,wave:1,
    laF:performance.now(),lhF:performance.now(),lS:performance.now(),lf:performance.now(),
    lastKill:performance.now(),lastHunt:0,
    time:0,run:true,ad:{x:0,y:-1},ultFlash:0,ultType:"n",ultCharge:0,ultCdEnd:0,_ultReadyUntil:0,nextBoss:BOSS_EVERY,bossCount:0,heat:0,heatMax:43,heatCD:0,ultHold:false,pickOpen:false,spikeDone:{},huntModeUntil:0,bhEnd:0,bhPow:1,_startTime:performance.now(),_stageBossActive:false,_stageBossLv:0,_boss20:false,_boss30:false,_bigChestTotal:0,_bigChestLeft:0,_angelOffered:false,_pendingStageBoss:0,_ew:null,_cw:null};
  setG(g);setHudG(g);setEnemiesG(g);setCombatG(g);setHudCoopState(_isCoopMode,_net);setHudAim(aim);initHud({cam,mapW,mapH,crateActive});initEnemies({mapW,mapH});setEnemiesMode(_mode);setEnemiesCoopMode(_isCoopMode);setEnemiesPracticeMode(getPracticeMode());initCombat({showPick,sendP2Pick:_sendP2Pick,mapW,mapH,crateActive,setShake:setLoopShake,isElite:_isElite});setCombatMode(_mode);setCombatCoopState(_isCoopMode,_net,_p2AI);inv=[];inv2=[];setCombatInv(inv,inv2);initSkills({mapW,mapH,setShake:setLoopShake,isElite:_isElite});setSkillsG(g);setSkillsCoopState(_isCoopMode,_net);initCardsUi({show,resumeGame,triggerStageBoss,isElite:_isElite,mapW,mapH});setCardsUiG(g);setCardsUiInv(inv,inv2);resetPar();resetLtnRingIdx();resetDashGhosts();setBossG(g);setBossCoopMode(_isCoopMode);setBossIsElite(_isElite);initBoss({mapW,mapH,triggerVictory,setShake:setLoopShake,setHitFlash:setLoopHitFlash});setStageBoss(null);bossBgmStop();setLoopHitFlash(0);setLoopShake(0,0);setPhoenixT(0);setPhoenixAnim(null);g._wb=[];g._wbSpawnT=0;
  // sync loop.js state for this run
  initLoop({
    getG:()=>g, getCx:()=>cx, getFxctx:()=>fxctx, getFxc:()=>fxc,
    getVW:()=>VW, getVH:()=>VH, getMode:()=>_mode, getCharType:()=>_charType,
    isElite:_isElite, getIsCoopMode:()=>_isCoopMode, getNet:()=>_net,
    getP2AI:()=>_p2AI, getP2Input:()=>_p2Input,
    mapW, mapH, crateActive,
    getDpWingImg:()=>_dpWingImg, getDpBodyImg:()=>_dpBodyImg,
    getDpW:()=>_dpW, getDpH:()=>_dpH, getDpJX:()=>_dpJX, getDpJY:()=>_dpJY
  });
  syncLoopState({g,cx,fxctx,fxc,VW,VH,mode:_mode,charType:_charType,isCoopMode:_isCoopMode,net:_net,p2AI:_p2AI,p2Input:_p2Input,inv,inv2});
  g._p2AtkAnim={active:false,startT:0};g._p2WbSwing=0;setP2SkillCdEnd(0);
  g.p.expR=99; // 所有模式內建全螢幕自動吸取經驗
  if(_mode==="classic"){g.p.splash=20;} // 經典模式內建基礎濺射（20px）
  // Co-op: 初始化 P2
  g.p2=null;g.p2Level=1;g.p2Exp=0;g.p2ExpTo=expForLevel(1);
  if(_mode==="coop"){
    const _mw2=MC.mapW||MW,_mh2=MC.mapH||MH;
    g.p2={charType:"gunner",x:_mw2/2+50,y:_mh2/2,hp:MC.startHp,maxHp:MC.startHp,atk:MC.startAtk,speed:MC.startSpeed,fr:1,armor:0,chain:0,ls:0,slow:1,split:1,expR:99,crit:.05,revive:0,fx:{},regen:0,expMul:1,luck:0,dodge:0,thorns:0,dblAtk:0,shieldCD:0,_sh:false,_shT:0,_shSpawn:0,whirlCount:0,whirlLv:0,orbiters:0,poison:0,hasBH:false,hasTS:false,ultLv:0,pierce:0,homing:0,homingR:200,splash:0,berserk:0,deathBoom:0,dodgeAtk:0,elemBoost:1,ultDmgMul:1,ultRate:1,bulletHeal:0,invCD:0,invDur:0,_inv:false,_ivT:0,timestop:0,tsD:0,tsFrzDur:0,tsCd:0,lStep:false,lStepDur:0,lStepSpd:0,lStepCd:0,_dashEnd:0,_dashDx:0,_dashDy:0,_dashSpd:0,_dashGT:0,chainDmg:1,poisonDmg:0,bossDmg:1,mobDmg:1,poisonBossMul:1,burnBoost:1,crateVis:1,mapExpand:0,pickCount:2,face:-1,_iFrameEnd:0,_healFlash:0,heavyEvery:0,_heavyCount:0,ultCdReduce:0,
      _downed:false,_rescueTimer:0,_downedTime:0,_pickPending:false,contactCap:100,_dodgeCD:0,_mgFireT:0,_mgBerserkEnd:0,levelDmgMul:1,armorCapBonus:0,_swordQiCount:0,_tauntAtkEnd:0,_tauntAtkBonus:0,iceFrag:0};
    g.p._downed=false;g.p._rescueTimer=0;g.p._downedTime=0;g.p._pickPending=false;
    inv2=[];
    // coop 使用 elite 波次系統
    g._ew={num:0,restEnd:performance.now()+3000,active:false};
  }
  resetJoyAim();
  show("play");if(getRaf())cancelAnimationFrame(getRaf());setRaf(requestAnimationFrame(loop));
  // 設定技能按鈕圖示
  setSkillCdEnd(0);
  const _si=$("skillIcon"),_sc=$("skillCd");
  if(_si)_si.textContent=(CHAR[_charType]||CHAR.gunner).skillIcon||"🎯";
  if(_sc)_sc.style.display="none";
  setTimeout(resetControls,60);setTimeout(resetControls,180);
};

/* ════ Event delegation: data-action → function dispatch ════ */
document.addEventListener("click", function(ev) {
  const el = ev.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const args = el.dataset.args ? el.dataset.args.split(",") : [];
  switch (action) {
    case "showCharSelect":  showCharSelect(args[0]); break;
    case "pickChar":        pickChar(args[0]); break;
    case "startGame":       startGame(); break;
    case "useCharSkill":    useCharSkill(); break;
    case "closeCardTip":    document.getElementById("cardTip").style.display="none"; break;
    case "charSelectBack":  document.getElementById("charSelectOv").style.display="none";
                            document.getElementById("titleOv").style.display="flex"; break;
    case "settingsOverlayClick": if (ev.target === el) closeSettings(); break;
    case "closeSettings":   closeSettings(); break;
    case "settingsGoHome":  settingsGoHome(); break;
    case "toggleMute":      toggleMute(); break;
    case "toggleStatsPanel": toggleStatsPanel(); break;
    case "openSettings":    openSettings(); break;
    case "showCoopLobby":   showCoopLobby(); break;
    case "coopShowCreate":  coopShowCreate(); break;
    case "coopShowJoin":    coopShowJoin(); break;
    case "coopCreateRoom":  coopCreateRoom(); break;
    case "coopCreateCustom": coopCreateCustom(); break;
    case "coopJoinRoom":    coopJoinRoom(); break;
    case "coopStart":       coopStart(); break;
    case "coopBack":        coopBack(); break;
    case "pracTogglePanel": pracTogglePanel(args[0]); break;
    case "pracSpawn":       pracSpawn(); break;
    case "pracClear":       pracClear(); break;
    case "pracToggleHp":    pracToggleHp(); break;
    case "pracToggleCoop":  pracToggleCoop(); break;
    case "pracCycleP2Char": pracCycleP2Char(); break;
    case "pracCoopRoom":    pracCoopRoom(); break;
    case "pracCoopJoin":    pracCoopJoin(); break;
    case "pracSwitchChar":  pracSwitchChar(); break;
    case "pracCloseOnBlank": pracCloseOnBlank(); break;
    case "exitPractice":    exitPractice(); break;
  }
});
// Stop propagation for elements marked data-stop-propagation
document.addEventListener("click", function(ev) {
  if (ev.target.closest("[data-stop-propagation]")) ev.stopPropagation();
}, true);

/* ════ window.xxx bindings for HTML onclick ════ */
window.showCharSelect = showCharSelect;
window.pickChar = pickChar;
window.toggleMute = toggleMute;
window.useCharSkill = useCharSkill;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.settingsGoHome = settingsGoHome;
window.toggleStatsPanel = toggleStatsPanel;
window.showCardTip = showCardTip;
window._showCoopLobby = showCoopLobby;
window.coopShowCreate = coopShowCreate;
window.coopShowJoin = coopShowJoin;
window.coopCreateRoom = coopCreateRoom;
window.coopCreateCustom = coopCreateCustom;
window.coopJoinRoom = coopJoinRoom;
window.coopStart = coopStart;
window.coopBack = coopBack;
window.exitPractice = exitPractice;
window.pracTogglePanel = pracTogglePanel;
window.pracSpawn = pracSpawn;
window.pracClear = pracClear;
window.pracToggleHp = pracToggleHp;
window.pracToggleCoop = pracToggleCoop;
window.pracCycleP2Char = pracCycleP2Char;
window.pracCoopRoom = pracCoopRoom;
window.pracCoopJoin = pracCoopJoin;
window.pracSwitchChar = pracSwitchChar;
window.pracCloseOnBlank = pracCloseOnBlank;

/* ════ CLIENT P2 card pick/reroll (called from dynamic HTML in coop.js) ════ */
// coop.js showCoopPick() 產生的動態 HTML 用 onclick="_p2PickCard(id)" / "_p2RerollCard(idx)"，
// 必須註冊到 window 上，CLIENT 才能透過 PeerJS 把選擇/重骰回傳給 HOST。
// HOST 端收到 "p2picked"/"p2reroll" 後，由 _applyP2Card() / _handleP2Reroll() 處理。
window._p2PickCard = function(cardId) {
  if (_net && _net.role === "client" && _net.conn && _net.conn.open) {
    _net.conn.send({ t: "p2picked", cardId });
    const ov = document.getElementById("_p2PickOv"); if (ov) ov.remove();
  }
};
window._p2RerollCard = function(idx) {
  if (_net && _net.role === "client" && _net.conn && _net.conn.open) {
    if (window._p2PickRerolled && window._p2PickRerolled[idx]) return; // 每張只能重骰一次
    if (window._p2PickRerolled) window._p2PickRerolled[idx] = true;
    const btn = document.getElementById("_p2rr" + idx);
    if (btn) { btn.style.opacity = ".3"; btn.style.pointerEvents = "none"; }
    _net.conn.send({ t: "p2reroll", idx });
  }
};

/* ════ TOUCH / KEYBOARD — moved to input.js ════ */
initInput({
  tapAtk, doUlt, useCharSkill,
  getG: ()=>g,
  getNet: ()=>_net
});
setupInputListeners();

/* ════ Co-op module init ════ */
initCoop({
  getG: ()=>g,
  setIsCoopMode: (v)=>{ _isCoopMode=v; },
  getIsCoopMode: ()=>_isCoopMode,
  setNet: (n)=>{ _net=n; },
  getNet: ()=>_net,
  setP2AI: (v)=>{ _p2AI=v; },
  getP2AI: ()=>_p2AI,
  getP2Input: ()=>_p2Input,
  getInv2: ()=>inv2,
  setInv2: (v)=>{ inv2=v; },
  isElite: _isElite,
  showOver,
  startGame,
  show,
  cam,
  PR, BR,
  setPendingMode: (v)=>{ _pendingMode=v; },
  getCx: ()=>cx,
  aim,
  ULT_CHARGE_NEED,
  CHAR,
  burst
});

/* ════ UI module init ════ */
initUi({
  getG: ()=>g,
  getInv: ()=>inv,
  getVW: ()=>VW,
  getVH: ()=>VH,
  setVW: (v)=>{ VW=v; },
  setVH: (v)=>{ VH=v; },
  getIsCoopMode: ()=>_isCoopMode,
  getCv: ()=>cv,
  getFxc: ()=>fxc,
  getFxctx: ()=>fxctx,
  getCx: ()=>cx,
  getCTimer,
  setCTimer,
  setShake: setLoopShake,
  getMode: ()=>_mode,
  getCharType: ()=>_charType,
  bossBgmStop,
  getCam: ()=>cam()
});

/* ════ Practice module init ════ */
initPractice({
  getG: ()=>g,
  getInv: ()=>inv,
  getInv2: ()=>inv2,
  setInv2: (v)=>{ inv2=v; },
  getMode: ()=>_mode,
  getCharType: ()=>_charType,
  setCharType: (v)=>{ _charType=v; },
  getIsCoopMode: ()=>_isCoopMode,
  setIsCoopMode: (v)=>{ _isCoopMode=v; },
  getP2AI: ()=>_p2AI,
  setP2AI: (v)=>{ _p2AI=v; },
  getNet: ()=>_net,
  setNet: (n)=>{ _net=n; },
  getP2Input: ()=>_p2Input,
  startGame,
  show,
});
bindPracticeToWindow();
