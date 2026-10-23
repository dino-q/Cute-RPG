import {getGunnerMuzzle} from './gunner-sprite.js';
import {recordRoleEffect} from './role-card-art.js';
// Character skills, ultimates, dodge
import {
  PI, TAU, PR,
  ULT_CHARGE_NEED, BH_DURATION_MS, BH_COOLDOWN_MS,
  MAX_PARTICLES, PLAYER_DMG_SCALE, ULT_D,
  charCfg
} from "./config.js";
import { di, cl, rn, $ } from "./utils.js";
import { sfx, sfxShoot } from "./audio.js";
import { par, burst } from "./render.js";
import { joy, setClientUltReq } from "./input.js";
import { settleEnemyDeaths } from "./combat.js";

/* ═══ module-local refs (injected by main.js) ═══ */
let g;
let _net = null;
let _isCoopMode = false;
let _clientSkillReq = false;
let _dashGhosts = [];
let _mapWFn, _mapHFn;
let _setShakeFn;
let _getIsEliteFn;

export function initSkills(deps) {
  if (deps.mapW) _mapWFn = deps.mapW;
  if (deps.mapH) _mapHFn = deps.mapH;
  if (deps.setShake) _setShakeFn = deps.setShake;
  if (deps.isElite) _getIsEliteFn = deps.isElite;
}
export function setSkillsG(game) { g = game; }
export function setSkillsCoopState(isCoop, net) { _isCoopMode = isCoop; _net = net; }
export function setSkillsClientSkillReq(v) { _clientSkillReq = v; }
export function getSkillsClientSkillReq() { return _clientSkillReq; }
export function getDashGhosts() { return _dashGhosts; }
export function setDashGhosts(v) { _dashGhosts = v; }
export function resetDashGhosts() { _dashGhosts = []; }

function _isElite() { return _getIsEliteFn ? _getIsEliteFn() : false; }
function mapW() { return _mapWFn ? _mapWFn() : 2400; }
function mapH() { return _mapHFn ? _mapHFn() : 2400; }
function setShake(t, pow) { if (_setShakeFn) _setShakeFn(t, pow); }

/* ═══ skill system ═══ */
// Skill CDs now read from CHAR config via charCfg(ct).skillCD (fallback 5000)
export const SKILL_CDS = new Proxy({}, { get(_, ct) { return charCfg(ct).skillCD || 5000; } });
let _skillCdEnd = 0;
let _p2SkillCdEnd = 0;

export function getSkillCdEnd() { return _skillCdEnd; }
export function setSkillCdEnd(v) { _skillCdEnd = v; }
export function getP2SkillCdEnd() { return _p2SkillCdEnd; }
export function setP2SkillCdEnd(v) { _p2SkillCdEnd = v; }

/* ═══ skill registry — add new chars here ═══ */
const SKILL_FN = {
  gunner:    (now, pp, isP2) => skillSnipe(now, pp, isP2),
  swordsman: (now, pp, isP2) => skillGhostSlash(now, pp, isP2),
  tank:      (now, pp, isP2) => skillTaunt(now, pp, isP2),
  assassin:  (now, pp, isP2) => skillShadowStrike(now, pp, isP2)
};
export function registerSkill(charType, fn) { SKILL_FN[charType] = fn; }

function _castSkill(ct, now, pp, isP2) {
  const fn = SKILL_FN[ct];
  if (fn) fn(now, pp, isP2);
}

/* ═══ P2 skill (AI auto-cast) ═══ */
export function p2UseSkill() {
  if (!g || !g.run || !g.p2 || g.p2._pickPending || g.p2._bladeRush) return;
  const now = performance.now();
  if (now < _p2SkillCdEnd) return;
  const ct = g.p2.charType || "gunner";
  if (ct === "assassin" && g.p2._shadowMark) return; // 影襲標記中不可重放、不扣冷卻
  _p2SkillCdEnd = now + (ct === "assassin" ? 4400 : (SKILL_CDS[ct] || 5000)); // 影襲: covers the 4s mark and the return
  _castSkill(ct, now, g.p2, true);
}

/* ═══ P1 skill ═══ */
export function useCharSkill() {
  if (!g || !g.run || (_net?.role==='client'?g.p2:g.p)?._pickPending || (_net?.role==='client'?g.p2:g.p)?._bladeRush) return;
  if (_net && _net.role === "client") { _clientSkillReq = true; return; }
  const now = performance.now();
  if (now < _skillCdEnd) return;
  const cd = SKILL_CDS[g.charType] || 5000;
  _skillCdEnd = now + cd;
  _castSkill(g.charType, now, null, false);
  const cdEl = $("skillCd"); if (cdEl) cdEl.style.display = "flex";
  const _cdI = setInterval(() => { const left = Math.max(0, _skillCdEnd - performance.now()); if (left <= 0) { if (cdEl) cdEl.style.display = "none"; clearInterval(_cdI); } else if (cdEl) cdEl.textContent = (left / 1000).toFixed(1); }, 100);
}

function skillAimDirection(player,isP2,range=650,origin=player){
 const fallback=(isP2?player._ad:g.ad)||player._moveDir||{x:0,y:1};
 const target=g.ene.filter(e=>e.hp>0&&!e.ragePoo&&!e._bossCore&&di(player,e)<=range+e.r).sort((a,b)=>di(player,a)-di(player,b))[0];
 if(!target)return fallback;
 const dx=target.x-origin.x,dy=target.y-origin.y,d=Math.hypot(dx,dy)||1;
 const dir={x:dx/d,y:dy/d};player._ad=dir;if(!isP2)g.ad=dir;return dir;
}

/* ═══ gunner: snipe ═══ */
export function skillSnipe(now, _pp, _isP2) {
  if (!_pp) _pp = g.p;
  var _pad = _isP2 ? (_pp._ad || { x: _pp.face || 1, y: 0 }) : (g.ad || { x: _pp.face || 1, y: 0 });
  _pp._snipeT = now;
  _pp._iFrameEnd = now + 600;
  const session=g;
  _pad=skillAimDirection(_pp,!!_isP2,650);
  const ba = Math.atan2(_pad.y, _pad.x);
  setTimeout(() => {
    if (g!==session || !g?.run || _pp._downed || _pp._pickPending) return;
    const bm = (_pp.berserk && _pp.hp / _pp.maxHp < _pp.berserk) ? 2 : 1;
    const ohBonus = (g._heatWarn || g.heatCD) ? 2.5 : 1;
    const dmg = (3.5 + _pp.atk) * 4 * bm * ohBonus * (_pp.ultDmgMul || 1);
    sfxShoot(); sfx("ult");
    const initialAim=skillAimDirection(_pp,!!_isP2,650);_pp._pixelShotAt=performance.now();
    const muzzle=getGunnerMuzzle(_pp.x,_pp.y,PR,initialAim,_pp._pixelShotAt,_pp)||{x:_pp.x,y:_pp.y-PR*.4};
    const fireAim=skillAimDirection(_pp,!!_isP2,650,muzzle);
    const ba2 = Math.atan2(fireAim.y,fireAim.x);
    g.bul.push({ x: muzzle.x, y: muzzle.y, vx: Math.cos(ba2) * 12, vy: Math.sin(ba2) * 12, dmg: dmg * PLAYER_DMG_SCALE, life: 1, crit: true, bc: ohBonus > 1 ? { f: "#FF4500", g: "#FF0000", t: "#FFD43B" } : { f: "#FFD43B", g: "#FF922B", t: "#FFD43B" }, trail: [], _tw: 0, pierce: 999, hm: 0, _minigun: 0, _armorPen: 0, _isP2: !!_isP2 });
    _pp._snipeBeamT = performance.now(); _pp._snipeBeamAng = ba2;
    recordRoleEffect(g,'snipe',_pp.x,_pp.y,ba2,{owner:_isP2?'p2':'p1',follow:true,ox:muzzle.x-_pp.x,oy:muzzle.y-_pp.y,life:180,range:420});
    const mzX=muzzle.x,mzY=muzzle.y;
    burst(mzX, mzY, ohBonus > 1 ? "#FF4500" : "#FFD43B", 12); burst(mzX, mzY, "#fff", 6);
    setShake(ohBonus > 1 ? .5 : .3, ohBonus > 1 ? 8 : 5);
    g.dn.push({ x: _pp.x, y: _pp.y - 30, d: ohBonus > 1 ? " 過熱狙擊！！" : " 狙擊！", life: 1.5, color: ohBonus > 1 ? "#FF4500" : "#FFD43B", big: 1 });
  }, 400);
}

/* ═══ swordsman: ghost slash ═══ */
export function skillGhostSlash(now, _pp, _isP2) {
  if (!_pp) _pp = g.p;
  const dmg = (3.5 + _pp.atk) * 2 * (_pp.elemBoost || 1) * (_pp.levelDmgMul || 1) * (_pp.ultDmgMul || 1);
  const dashDist = PR * 8;
  var dx, dy;
  if (_isP2) { var _pad = _pp._ad || { x: _pp.face || 1, y: 0 }; dx = _pad.x; dy = _pad.y; }
  else { const _joyActive = joy.a && (joy.dx || joy.dy); dx = _joyActive ? joy.dx : (_pp.face || 1); dy = _joyActive ? joy.dy : 0; }
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const ndx = dx / d, ndy = dy / d;
  sfxShoot();
  const startX = _pp.x, startY = _pp.y;
  const endX = cl(startX + ndx * dashDist, PR + 4, mapW() - PR - 4);
  const endY = cl(startY + ndy * dashDist, PR + 4, mapH() - PR - 4);
  const hitRange = PR * 4;
  _pp._iFrameEnd = now + 500;
  _pp._gsDash = { startX, startY, endX, endY, startT: now, dur: 200 };
  _pp._travelFacing={x:endX-startX,y:endY-startY,until:now+200};
  for (let i = 0; i < 6; i++) { const p = i / 5; _dashGhosts.push({ x: startX + ndx * dashDist * p, y: startY + ndy * dashDist * p, face: _pp.face, charType:_pp.charType||g.charType, fx:{..._pp.fx}, direction:{x:ndx,y:ndy}, life: 1 }); }
  setTimeout(() => {
    if (!g || !g.run) return;
    g.ene.forEach(e => {
      if (e.hp <= 0) return;
      const ex2 = e.x - startX, ey2 = e.y - startY;
      const proj = ex2 * ndx + ey2 * ndy;
      if (proj < -hitRange || proj > dashDist + hitRange) return;
      const perp = Math.abs(ex2 * ndy - ey2 * ndx);
      if (perp > hitRange) return;
      let fd = dmg;
      if (e._coopShield) { fd = 0; }
      if (!e.boss && !e.stageBoss) fd += e.mhp * .1;
      if (e.boss && e.bossType === "armor") fd *= .7;
      if (_pp.iceFrag && (e.st > 0 || e.frozen > 0)) fd *= (1 + _pp.iceFrag);
      e.hp -= fd; e.st = Math.max(e.st || 0, 1200);
      const fx = _pp.fx;
      if (fx.fire) { e.burnT = Math.max(e.burnT || 0, 2000); e.burnLv = Math.max(fx.fire || 0, 1); }
      if (fx.poison && _pp.poison > 0) { e.poisonT = _pp.poison * 1000; e.poisonLv = Math.max(fx.poison || 0, 1); }
      burst(e.x, e.y, "#FF922B", 8);
      g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(fd), life: 1, color: "#FFD43B", big: 1 });
    });
  }, 100);
  for (let i = 0; i < 16; i++) { const a = PI * 2 * i / 16; par.push({ x: _pp.x + Math.cos(a) * 15, y: _pp.y + Math.sin(a) * 15, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: .6, color: i % 2 ? "#FF922B" : "#FFD43B", sz: rn(2, 5) }); }
  g.dn.push({ x: _pp.x, y: _pp.y - 30, d: " 鬼斬", life: 1.2, color: "#FF922B", big: 1 });
  var _gsAtkRef = _isP2 ? "_p2AtkAnim" : "_atkAnim";
  if (!g[_gsAtkRef]) g[_gsAtkRef] = { active: false, startT: 0 }; g[_gsAtkRef].active = true; g[_gsAtkRef].startT = performance.now();
}

/* ═══ tank: taunt ═══ */
export function skillTaunt(now, _pp, _isP2) {
  if (!_pp) _pp = g.p; var _pad = _isP2 ? (_pp._ad || { x: 0, y: -1 }) : (g.ad || { x: 0, y: -1 });
  sfxShoot(); sfx("ult");
  g.ene.forEach(e => {
    if (e.hp <= 0) return;
    e._tauntEnd = now + 3000; e._tauntTarget = _isP2 ? "p2" : "p1"; e.st = 0;
    g.dn.push({ x: e.x, y: e.y - e.r - 8, d: "", life: 1, color: "#FF6B6B", big: 1 });
  });
  if (_pp._tauntAtkBonus > 0) { _pp.atk -= _pp._tauntAtkBonus; }
  const _tauntBonus = Math.floor(2 * (_pp.ultDmgMul || 1));
  _pp._tauntAtkEnd = now + 3000; _pp._tauntAtkBonus = _tauntBonus; _pp.atk += _tauntBonus;
  recordRoleEffect(g,'taunt',_pp.x,_pp.y,Math.atan2(_pad.y,_pad.x),{owner:_isP2?'p2':'p1',follow:true,life:850,range:145});
  _pp._tauntVisualEnd=now+3000;
  g.dn.push({x:_pp.x,y:_pp.y-40,d:'迎戰！',life:1.2,color:'#a8cfb5',big:1});
  burst(_pp.x,_pp.y,'#a2bfa8',8);setShake(.12,2);

}

/* ═══ assassin: shadow strike (影襲) ═══ */
// 放置閃光標記 → 自由行動 4 秒 → 自動回歸（回程無敵）→ CD 1.7 秒
export function skillShadowStrike(now, _pp, _isP2) {
  if (!_pp) _pp = g.p;
  if (_isP2) {
    if (_pp._shadowMark) return;
    sfx("ult");_pp._shadowMark = { x: _pp.x, y: _pp.y, t: now, dur: 4000 };
    burst(_pp.x, _pp.y, "#DDB4FE", 8);
    g.dn.push({ x: _pp.x, y: _pp.y - 30, d: " 影襲！攻擊×1.5・4秒後回歸", life: 2, color: "#DDB4FE", big: 1 });
    return;
  }
  if (g._shadowReturn) return;
  sfx("ult");
  g._shadowReturn = { x: _pp.x, y: _pp.y, t: now, dur: 4000 };
  // 施放時重設 CD 為 0（讓按鈕顯示標記期間不可用）
  _skillCdEnd = now + 99999; // 暫時鎖住，回歸時再設真正 CD
  const cdEl = $("skillCd"); if (cdEl) { cdEl.style.display = "flex"; cdEl.textContent = "冷卻"; }
  burst(_pp.x, _pp.y, "#fff", 12);
  burst(_pp.x, _pp.y, "#DDB4FE", 8);
  g.dn.push({ x: _pp.x, y: _pp.y - 30, d: " 影襲！攻擊×1.5・4秒後回歸", life: 2, color: "#DDB4FE", big: 1 });
}

// 影襲 locks its cooldown until the return; anything that cancels the return early must use this.
export function releaseShadowLock(now){
  _skillCdEnd = now + 1700;
  const cdEl = $("skillCd"); if (!cdEl) return; cdEl.style.display = "flex";
  const timer = setInterval(() => { const left = Math.max(0, _skillCdEnd - performance.now()); if (left <= 0) { cdEl.style.display = "none"; clearInterval(timer); } else cdEl.textContent = (left / 1000).toFixed(1); }, 100);
}

/* ═══ dash (lightning step) ═══ */
export function _startDash(now,player=g?.p,isP2=false) {
  if (!g||!player) return;
  const input=isP2?null:joy,ad=isP2?(player._ad||{x:0,y:1}):g.ad;
  const hasJoy = input?.a && (Math.abs(input.dx) > .2 || Math.abs(input.dy) > .2);
  const ldx = hasJoy ? input.dx : ad.x, ldy = hasJoy ? input.dy : ad.y;
  const ld = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
  player._dashEnd = now + (player.lStepDur || 200);
  player._dashDx = ldx / ld; player._dashDy = ldy / ld;
  player._dashSpd = player.lStepSpd || 8;
  player._inv = true;
  burst(player.x, player.y, "#FFE066", 6);
  g.dn.push({ x: player.x, y: player.y - 20, d: "衝刺", life: 1, color: "#FFE066" });
  g.ene.forEach(e => { if ((e.boss || e.stageBoss) && e.hp > 0 && di(e, player) < 80) {
    const ld2 = Math.min(player.atk * 3, e.mhp * .05); e.hp -= ld2;
    burst(e.x, e.y, "#FFE066", 8); g.dn.push({ x: e.x, y: e.y - e.r, d: "" + Math.floor(ld2), life: 1, color: "#FFE066", big: 1 });
  } });
}

/* ═══ ultimate ═══ */

// Shared by both players. Card-based black hole/time-stop/magnet still use their own rules.
export function castRoleUltimate(player,now,damage,isP2=false){
 if(!g||!player||player._bladeRush)return;
 const ct=player.charType||(isP2?'gunner':g.charType),dir=ct==='gunner'?skillAimDirection(player,isP2,650):((isP2?player._ad:g.ad)||player._moveDir||{x:0,y:1}),angle=Math.atan2(dir.y,dir.x),owner=isP2?'p2':'p1';
 if(ct==='assassin'){
  const viewW=document.getElementById('cv')?.width||window.innerWidth,viewH=document.getElementById('cv')?.height||window.innerHeight;
  const targets=g.ene.filter(e=>e.hp>0&&!e.ragePoo&&!e._bossCore&&Math.abs(e.x-player.x)<Math.min(650,viewW*.58)&&Math.abs(e.y-player.y)<Math.min(650,viewH*.58)).sort((a,b)=>di(player,a)-di(player,b)).slice(0,8);
  player._gsDash=null;player._dashEnd=0;if(!isP2&&g._shadowReturn){g._shadowReturn=null;releaseShadowLock(now);}if(isP2&&player._shadowMark){player._shadowMark=null;_p2SkillCdEnd=now+1700;}
  player._bladeRush={elapsed:0,leg:-1,targets,damage,isP2,angle,origin:{x:player.x,y:player.y},hits:new Map(),lastGhost:0};
  player._iFrameEnd=Math.max(player._iFrameEnd||0,now+1450);
  recordRoleEffect(g,'rush-start',player.x,player.y,angle,{owner,follow:true,life:250});
  sfx('ult');g.dn.push({x:player.x,y:player.y-40,d:'八閃・雙刃影殺',life:1.4,color:'#d6c3f5',big:1});return;
 }
 const names={gunner:'天穹貫穿砲',swordsman:'八方破天斬',tank:'不破盾陣',assassin:'雙刃影殺'};
 recordRoleEffect(g,'ultimate',player.x,player.y,angle,{role:ct,owner,follow:true,life:950,range:ct==='gunner'?650:ct==='tank'?280:ct==='assassin'?320:300});
 player._iFrameEnd=Math.max(player._iFrameEnd||0,now+700);
 const animKey=isP2?'_p2AtkAnim':'_atkAnim';
 g[animKey]={...(g[animKey]||{}),active:true,startT:now,angle,_qiSpin:ct==='swordsman'};
 player._pixelShotAt=now;player._attackAt=now;
 if(ct==='tank')player._iFrameEnd=Math.max(player._iFrameEnd,now+1600);
 let targetEffects=0;
 for(const enemy of g.ene){
  if(enemy.hp<=0||enemy.ragePoo||enemy._bossCore)continue;
  const dx=enemy.x-player.x,dy=enemy.y-player.y,distance=Math.hypot(dx,dy),along=dx*Math.cos(angle)+dy*Math.sin(angle),across=Math.abs(dx*Math.sin(angle)-dy*Math.cos(angle));
  const caught=ct==='gunner'?along>=-35&&along<=650&&across<=65+enemy.r:distance<=(ct==='tank'?280:ct==='assassin'?320:300)+enemy.r;
  if(!caught||enemy._coopShield)continue;
  const dealt=_isElite()&&enemy.stageBoss?Math.min(damage,enemy.mhp*.05):damage;
  enemy.hp-=dealt;burst(enemy.x,enemy.y,ct==='assassin'?'#ceb0ff':ct==='tank'?'#a6e6c2':'#ffe5a6',8);
  g.dn.push({x:enemy.x,y:enemy.y-enemy.r,d:Math.floor(dealt),life:1.2,color:'#ffe5bd',big:1});
  if(ct==='assassin'&&targetEffects++<8)recordRoleEffect(g,'ultimate-target',enemy.x,enemy.y,angle,{role:ct,owner,follow:false,life:750});
 }
 settleEnemyDeaths();setShake(.3,ct==='tank'?7:4);sfx('ult');
 g.dn.push({x:player.x,y:player.y-40,d:names[ct]||names.gunner,life:1.6,color:ct==='assassin'?'#d4b9ff':ct==='tank'?'#b1eccb':'#ffe3a2',big:1});
}


// Each enemy takes at most 1.2x of the ultimate in total (elite stage boss: 5% max HP).
function rushBudget(rush,enemy){return _isElite()&&enemy.stageBoss?Math.min(rush.damage*1.2,enemy.mhp*.05):rush.damage*1.2;}
// Host-owned timed movement: pause-safe, no delayed callbacks from a previous game.
export function updateAssassinUltimates(now,elapsedMs){
 if(!g)return;
 // P2 影襲: after 4s glide back to the mark with brief invulnerability.
 const p2=g.p2,mark=p2?._shadowMark;
 if(mark){
  if(p2.hp<=0||p2._downed||p2.charType!=='assassin'){p2._shadowMark=null;_p2SkillCdEnd=now+1700;}
  else if(!mark.ret&&now-mark.t>=mark.dur){mark.ret={x:p2.x,y:p2.y,start:now,dur:Math.min(400,Math.max(150,Math.hypot(mark.x-p2.x,mark.y-p2.y)*.8))};p2._iFrameEnd=Math.max(p2._iFrameEnd||0,now+mark.ret.dur+500);sfx('ult');}
  if(p2._shadowMark&&mark.ret){const q=Math.min(1,(now-mark.ret.start)/mark.ret.dur),t=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;p2.x=mark.ret.x+(mark.x-mark.ret.x)*t;p2.y=mark.ret.y+(mark.y-mark.ret.y)*t;
   if(q>=1){p2._shadowMark=null;_p2SkillCdEnd=now+1700;burst(p2.x,p2.y,'#DDB4FE',8);g.dn.push({x:p2.x,y:p2.y-25,d:'✦ 回歸！',life:1.2,color:'#fff',big:1});}}
 }
 for(const player of [g.p,g.p2].filter(Boolean)){
  const rush=player._bladeRush;if(!rush)continue;
  if((player.charType||(rush.isP2?'assassin':g.charType))!=='assassin'||player.hp<=0||player._downed||player._pickPending){player._bladeRush=null;continue;}
  if(rush.retreat){
   rush.retreat.age+=elapsedMs;const q=Math.min(1,rush.retreat.age/220),t=1-Math.pow(1-q,2),r=rush.retreat;
   player.x=r.x+(r.tx-r.x)*t;player.y=r.y+(r.ty-r.y)*t;player._travelFacing={x:r.tx-r.x,y:r.ty-r.y,until:now+100};player._iFrameEnd=now+800;
   if(q>=1){player._bladeRush=null;recordRoleEffect(g,'rush-finish',player.x,player.y,rush.angle,{owner:rush.isP2?'p2':'p1',follow:true,life:330});}
   continue;
  }
  rush.elapsed+=elapsedMs;const leg=Math.min(7,Math.floor(rush.elapsed/170)),q=Math.min(1,(rush.elapsed-leg*170)/170),owner=rush.isP2?'p2':'p1';
  if(leg!==rush.leg){
   rush.leg=leg;rush.legCuts=0;rush.legVictim=null;rush.from={x:player.x,y:player.y};rush.legHits=new Set();
   const living=rush.targets.filter(e=>e.hp>0),target=living.length?living[leg%living.length]:null;
   const a=target?Math.atan2(target.y-player.y,target.x-player.x):rush.angle+leg*TAU/8;
   const tx=target?target.x+Math.cos(a)*55:rush.origin.x+Math.cos(a)*170,ty=target?target.y+Math.sin(a)*55:rush.origin.y+Math.sin(a)*170;
   const distance=Math.hypot(tx-player.x,ty-player.y),limit=Math.min(1,620/(distance||1));
   rush.to={x:cl(player.x+(tx-player.x)*limit,PR+4,mapW()-PR-4),y:cl(player.y+(ty-player.y)*limit,PR+4,mapH()-PR-4)};
   rush.angle=Math.atan2(rush.to.y-player.y,rush.to.x-player.x);
   const anim=rush.isP2?'_p2AtkAnim':'_atkAnim';g[anim]={active:true,startT:now,angle:rush.angle};
   recordRoleEffect(g,'rush-cut',player.x,player.y,rush.angle,{owner,follow:false,life:230,endX:rush.to.x,endY:rush.to.y});
  }
  const old={x:player.x,y:player.y},t=1-Math.pow(1-q,2);
  player.x=rush.from.x+(rush.to.x-rush.from.x)*t;player.y=rush.from.y+(rush.to.y-rush.from.y)*t;
  player._travelFacing={x:Math.cos(rush.angle),y:Math.sin(rush.angle),until:now+100};player._iFrameEnd=now+150;
  player.face=Math.cos(rush.angle)>=0?1:-1;
  if(now-rush.lastGhost>45){rush.lastGhost=now;_dashGhosts.push({x:player.x,y:player.y,face:player.face,charType:'assassin',fx:{...player.fx},direction:{x:Math.cos(rush.angle),y:Math.sin(rush.angle)},life:.65});if(_dashGhosts.length>16)_dashGhosts.shift();}
  const dx=player.x-old.x,dy=player.y-old.y,length=dx*dx+dy*dy;
  if(!rush.legVictim||rush.legVictim.hp<=0){
   rush.legVictim=rush.targets.find(enemy=>{
    if(enemy.hp<=0||enemy._coopShield||(rush.hits.get(enemy)||0)>=rushBudget(rush,enemy)-1e-6)return false;
    const along=length?cl(((enemy.x-old.x)*dx+(enemy.y-old.y)*dy)/length,0,1):0;
    return Math.hypot(enemy.x-old.x-dx*along,enemy.y-old.y-dy*along)<=enemy.r+42;
   })||null;
  }
  const enemy=rush.legVictim;
  if(enemy&&enemy.hp>0&&!enemy._coopShield){
   const due=Math.min(3,Math.floor(q*3)+1);
   while(rush.legCuts<due&&enemy.hp>0){
    const budget=rushBudget(rush,enemy),dealt=rush.hits.get(enemy)||0;
    const n=Math.max(1,rush.targets.length),dmg=Math.min(budget*n/(24-n),budget-dealt); /* spare cuts absorb each target's partial last cut, so all 24 cover every full budget */
    if(dmg<=1e-6){rush.legVictim=null;break;}rush.legCuts++;
    rush.hits.set(enemy,dealt+dmg);enemy.hp-=dmg;recordRoleEffect(g,'ultimate-target',enemy.x,enemy.y,rush.angle+(rush.legCuts-2)*.25,{owner,follow:false,life:160});
    g.dn.push({x:enemy.x+(rush.legCuts-2)*12,y:enemy.y-enemy.r,d:Math.round(dmg*10)/10,life:.6,color:'#d3bbf4'});burst(enemy.x,enemy.y,'#c1a7ea',2);
   }
  }
  settleEnemyDeaths();
  if(rush.elapsed>=1360){
   const threats=g.ene.filter(e=>e.hp>0&&!e._bossCore&&di(player,e)<300);let best={x:player.x,y:player.y},score=-Infinity;
   for(let i=0;i<12;i++){const a=rush.angle+Math.PI+TAU*i/12,point={x:cl(player.x+Math.cos(a)*155,PR+4,mapW()-PR-4),y:cl(player.y+Math.sin(a)*155,PR+4,mapH()-PR-4)};
    const clearance=Math.min(500,...threats.map(e=>di(point,e)-e.r));if(clearance>score){score=clearance;best=point;}}
   rush.retreat={x:player.x,y:player.y,tx:threats.length?best.x:player.x,ty:threats.length?best.y:player.y,age:0};player._iFrameEnd=now+1000;setShake(.16,3);
  }
 }
}


export function updateSummonOrbs(now,elapsedMs){
 if(!g)return;
 for(const [player,isP2] of [[g.p,false],[g.p2,true]]){
  if(!player)continue;const count=Math.min(3,Math.max(0,player.orbiters||0));
  if(!count){player._summonOrbs=[];continue;}
  if(player._downed||player._pickPending)continue;
  const balls=player._summonOrbs||(player._summonOrbs=[]);balls.length=count;
  for(let i=0;i<count;i++){
   const a=now/600+TAU*i/count,home={x:Math.cos(a)*44,y:Math.sin(a)*44};
   const ball=balls[i]||(balls[i]={ox:home.x,oy:home.y,nextAt:now+i*140,age:0,target:null});
   if(!ball.target&&now>=ball.nextAt){
    const targets=g.ene.filter(e=>e.hp>0&&!e.ragePoo&&!e._bossCore&&!e._coopShield&&!(e._spawnShield>now)&&di(player,e)<(player._orbRange||300)+e.r).sort((a,b)=>di(player,a)-di(player,b));
    if(targets.length){ball.target=targets[i%targets.length];ball.age=0;ball.start={x:ball.ox,y:ball.oy};ball.hit=false;}
    else ball.nextAt=now+150;
   }
   if(!ball.target){ball.ox=home.x;ball.oy=home.y;continue;}
   ball.age+=elapsedMs;const target=ball.target,tx=target.x-player.x,ty=target.y-player.y;
   const q=ball.age<180?Math.min(1,ball.age/180):Math.max(0,1-(ball.age-180)/220),t=q*q*(3-2*q);
   ball.ox=home.x+(tx-home.x)*t;ball.oy=home.y+(ty-home.y)*t;
   if(!ball.hit&&ball.age>=180){
    ball.hit=true;
    if(target.hp>0&&!target._coopShield&&!(target._spawnShield>now)&&di(player,target)<(player._orbRange||300)+target.r){
     let dmg=(player.atk*1.3+8)*(player._orbPower||1)*(player.elemBoost||1)*(player.levelDmgMul||1);const orbCrit=Math.random()<(player.crit||.05);if(orbCrit)dmg*=2;
     if(target.boss&&target.bossType==='armor')dmg*=.7;
     dmg*=target.boss?(player.bossDmg||1):(player.mobDmg||1);target.hp-=dmg;
     recordRoleEffect(g,'orb-impact',target.x,target.y,Math.atan2(ty,tx),{owner:isP2?'p2':'p1',follow:false,life:220});
     g.dn.push({x:target.x,y:target.y-target.r,d:Math.floor(dmg),life:.7,color:orbCrit?'#FFD43B':'#f1daa2',big:orbCrit});
    }
   }
   if(ball.age>=400){ball.target=null;ball.nextAt=now+Math.max(0,(player._orbCD||500)-400);}
  }
 }
 settleEnemyDeaths();
}

export function doUlt(){
 if(_net?.role==='client'){setClientUltReq(true);return false;}
 return castPlayerUltimate(g?.p,false);
}
export function doP2Ult(){return castPlayerUltimate(g?.p2,true);}
function castPlayerUltimate(player,isP2){
 if(!g||!g.run||!player||player._downed||player._pickPending||player._bladeRush)return false;
 const state=isP2?(g._p2Ultimate||(g._p2Ultimate={ultCharge:0,ultCdEnd:0,ultHold:false})):g;
 const level=isP2?(g.p2Level||1):g.level;
  const isBH = !!player.hasBH;
  const isTS = !!player.hasTS;
  const isMF = !!player.hasMF;
  const isCd = isBH || isTS || isMF;
  const isLS = !!player.lStep;
  const now = performance.now();
  if (isCd && now < (state.ultCdEnd || 0)) return;
  if (!isCd && state.ultCharge < ULT_CHARGE_NEED) return;
  let _comboUlt=false;
  if(_isCoopMode&&g.p2&&!g.p2._downed&&!g.p._downed){
   const other=isP2?'_p1UltTime':'_p2UltTime',own=isP2?'_p2UltTime':'_p1UltTime';
   if(g[other]&&now-g[other]<1000){_comboUlt=true;g[other]=0;g[own]=0;}else g[own]=now;
  }
  const ultLv = player.ultLv || 0;
  const _comboMul = _comboUlt ? 3 : 1;
  const baseDmg = (ULT_D + player.atk * 6 + level * 5) * (player.ultDmgMul || 1) * (1 + ultLv * .35) * _comboMul;
  const cdVal = (isBH ? BH_COOLDOWN_MS : isMF ? (player.mfCd || 12e3) : (player.tsCd || 15e3)) / (player.ultRate || 1) * (1 - (player.ultCdReduce || 0));
  if (isBH) {
    state.bhEnd = now + BH_DURATION_MS;
    state.bhPow = 1 + ultLv * .45;
    player.bhSafeEnd = now + BH_DURATION_MS + 800;
  }
  if (isTS) {
    const frzDur = player.tsFrzDur || 2e3;
    state._cardTsEnd=now+frzDur; // visual timer only
    const tsDmg = baseDmg * .5;
    g.ene.forEach(e => { if(!e.boss&&!e.stageBoss)e.frozen = Math.max(e.frozen || 0, frzDur); const td = (_isElite() && e.stageBoss) ? Math.min(tsDmg, e.mhp * .05) : tsDmg; e.hp -= td; g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(td), life: 1.3, color: "#74C0FC" }); if (e.hp <= 0) burst(e.x, e.y, e.color, 10); });
    settleEnemyDeaths();
    burst(player.x, player.y, "#74C0FC", 25);
    g.dn.push({ x: player.x, y: player.y - 30, d: isBH ? "黑洞+時停" : "時間停止+凍結傷害", life: 1.5, color: "#74C0FC", big: 1 });
    const cols = ["#74C0FC", "#4DABF7", "#339AF0", "#fff"];
    for (let i = 0; i < 30 && par.length < MAX_PARTICLES; i++) { const a = Math.PI * 2 * i / 30, v = rn(3, 8); par.push({ x: player.x + Math.cos(a) * 15, y: player.y + Math.sin(a) * 15, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2, color: cols[i % cols.length], sz: rn(3, 7) }); }
  }
  if (isMF) {
    const _mfDur = player.mfDur || 1500;
    state.mfEnd = now + _mfDur;
    state.mfPx = player.x; state.mfPy = player.y;
    state.mfR = player.mfR || 200;
    state.mfDmgMul = player.mfDmgMul || 1;
    state.mfSlow = player.mfSlow || 0;
    player._iFrameEnd = Math.max(player._iFrameEnd || 0, now + 1500);
    burst(player.x, player.y, "#339AF0", 20);
    g.dn.push({ x: player.x, y: player.y - 30, d: " 磁力場！", life: 2, color: "#339AF0", big: 1 });
    for (let i = 0; i < 24 && par.length < MAX_PARTICLES; i++) {
      const a = TAU * i / 24; par.push({ x: player.x + Math.cos(a) * 80, y: player.y + Math.sin(a) * 80, vx: -Math.cos(a) * rn(2, 4), vy: -Math.sin(a) * rn(2, 4), life: 1, color: i % 2 ? "#339AF0" : "#74C0FC", sz: rn(3, 6) });
    }
  }
  if (isCd) state.ultCdEnd = now + cdVal;
  if(!isCd)castRoleUltimate(player,now,baseDmg,isP2);
  if (isBH) {
    g.ene.forEach(e => { const ud = (_isElite() && e.stageBoss) ? Math.min(baseDmg, e.mhp * .05) : baseDmg; e.hp -= ud; g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(ud), life: 1.3, color: isBH ? "#868E96" : "#FFD43B", big: 1 }); if (e.hp <= 0) burst(e.x, e.y, e.color, 14); });
    settleEnemyDeaths();
  }
  const cols = isBH ? ["#495057", "#868E96", "#CED4DA", "#fff"] : isTS ? ["#74C0FC", "#4DABF7", "#339AF0", "#fff"] : ["#BE4BDB", "#FFD43B", "#FF6B6B", "#74C0FC", "#fff"];
  const burstCount = 40 + ultLv * 12;
  if(!((player.charType||g.charType)==='assassin'&&!isCd))for (let i = 0; i < burstCount && par.length < MAX_PARTICLES; i++) { const a = Math.PI * 2 * i / burstCount, v = rn(2, 7 + ultLv); par.push({ x: player.x + Math.cos(a) * 20, y: player.y + Math.sin(a) * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.3 + ultLv * .15, color: cols[i % cols.length], sz: rn(3, 8 + ultLv) }); }
  g.ultFlash = isBH ? 1 : isTS ? .6 : (isMF?.3:.18); g.ultType = isBH ? "bh" : "n"; if (!isCd) state.ultCharge = 0; sfx("ult");
  if (isLS&&!player._bladeRush) _startDash(now,player,isP2);
  if (_comboUlt) {
    g.dn.push({ x: g.p.x, y: g.p.y - 50, d: " 合體大招！×3 傷害！", life: 3, color: "#FFD43B", big: 1 });
    g.dn.push({ x: g.p2.x, y: g.p2.y - 50, d: " 合體大招！", life: 3, color: "#F06595", big: 1 });
    if(g.charType!=='assassin')burst(g.p.x,g.p.y,'#FFD43B',25);if(g.p2.charType!=='assassin')burst(g.p2.x,g.p2.y,'#F06595',25);
    sfx("phoenix");
  }
 return true;
}
