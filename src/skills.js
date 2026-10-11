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
  if (!g || !g.run || !g.p2) return;
  const now = performance.now();
  if (now < _p2SkillCdEnd) return;
  const ct = g.p2.charType || "gunner";
  _p2SkillCdEnd = now + (SKILL_CDS[ct] || 5000);
  _castSkill(ct, now, g.p2, true);
}

/* ═══ P1 skill ═══ */
export function useCharSkill() {
  if (!g || !g.run) return;
  if (_net && _net.role === "client") { _clientSkillReq = true; return; }
  const now = performance.now();
  if (now < _skillCdEnd) return;
  const cd = SKILL_CDS[g.charType] || 5000;
  _skillCdEnd = now + cd;
  _castSkill(g.charType, now, null, false);
  const cdEl = $("skillCd"); if (cdEl) cdEl.style.display = "flex";
  const _cdI = setInterval(() => { const left = Math.max(0, _skillCdEnd - performance.now()); if (left <= 0) { if (cdEl) cdEl.style.display = "none"; clearInterval(_cdI); } else if (cdEl) cdEl.textContent = (left / 1000).toFixed(1); }, 100);
}

/* ═══ gunner: snipe ═══ */
export function skillSnipe(now, _pp, _isP2) {
  if (!_pp) _pp = g.p;
  var _pad = _isP2 ? (_pp._ad || { x: _pp.face || 1, y: 0 }) : (g.ad || { x: _pp.face || 1, y: 0 });
  _pp._snipeT = now;
  _pp._iFrameEnd = now + 600;
  const ba = Math.atan2(_pad.y, _pad.x);
  setTimeout(() => {
    if (!g || !g.run) return;
    const bm = (_pp.berserk && _pp.hp / _pp.maxHp < _pp.berserk) ? 2 : 1;
    const ohBonus = (g._heatWarn || g.heatCD) ? 2.5 : 1;
    const dmg = (3.5 + _pp.atk) * 4 * bm * ohBonus * (_pp.ultDmgMul || 1);
    sfxShoot(); sfx("ult");
    const ba2 = Math.atan2(_pad.y, _pad.x);
    g.bul.push({ x: _pp.x, y: _pp.y - PR * .4, vx: Math.cos(ba2) * 12, vy: Math.sin(ba2) * 12, dmg: dmg * PLAYER_DMG_SCALE, life: 1, crit: true, bc: ohBonus > 1 ? { f: "#FF4500", g: "#FF0000", t: "#FFD43B" } : { f: "#FFD43B", g: "#FF922B", t: "#FFD43B" }, trail: [], _tw: 0, pierce: 999, hm: 0, _minigun: 0, _armorPen: 0, _isP2: !!_isP2 });
    _pp._snipeBeamT = performance.now(); _pp._snipeBeamAng = ba2;
    const mzX = _pp.x + Math.cos(ba2) * PR, mzY = _pp.y + Math.sin(ba2) * PR;
    burst(mzX, mzY, ohBonus > 1 ? "#FF4500" : "#FFD43B", 12); burst(mzX, mzY, "#fff", 6);
    setShake(ohBonus > 1 ? .5 : .3, ohBonus > 1 ? 8 : 5);
    g.dn.push({ x: _pp.x, y: _pp.y - 30, d: ohBonus > 1 ? "🔥 過熱狙擊！！" : "🎯 狙擊！", life: 1.5, color: ohBonus > 1 ? "#FF4500" : "#FFD43B", big: 1 });
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
  for (let i = 0; i < 6; i++) { const p = i / 5; _dashGhosts.push({ x: startX + ndx * dashDist * p, y: startY + ndy * dashDist * p, face: _pp.face, life: 1 }); }
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
  g.dn.push({ x: _pp.x, y: _pp.y - 30, d: "⚔️ 鬼斬", life: 1.2, color: "#FF922B", big: 1 });
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
    g.dn.push({ x: e.x, y: e.y - e.r - 8, d: "⚠️", life: 1, color: "#FF6B6B", big: 1 });
  });
  if (_pp._tauntAtkBonus > 0) { _pp.atk -= _pp._tauntAtkBonus; }
  const _tauntBonus = Math.floor(2 * (_pp.ultDmgMul || 1));
  _pp._tauntAtkEnd = now + 3000; _pp._tauntAtkBonus = _tauntBonus; _pp.atk += _tauntBonus;
  for (let ring = 0; ring < 4; ring++) {
    const rOff = ring * 8, spd = 4 + ring * 2.5, cnt = 14 + ring * 6;
    for (let i = 0; i < cnt; i++) {
      const a = TAU * i / cnt + ring * .25;
      const cols = ["#51CF66", "#FFD43B", "#FF6B6B", "#fff", "#FF4040"];
      par.push({ x: _pp.x + Math.cos(a) * (12 + rOff), y: _pp.y + Math.sin(a) * (12 + rOff), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1 + ring * .25, color: cols[(i + ring) % 5], sz: rn(2.5, 6 + ring) });
    }
  }
  g.dn.push({ x: _pp.x, y: _pp.y - 40, d: "🛡️ 嘲諷！", life: 2.5, color: "#51CF66", big: 1 });
  burst(_pp.x, _pp.y, "#51CF66", 30); burst(_pp.x, _pp.y, "#FFD43B", 20); burst(_pp.x, _pp.y, "#FF4040", 10);
  g._tauntRingT = now;
  setShake(.3, 5);
}

/* ═══ assassin: shadow strike (影襲) ═══ */
// 放置閃光標記 → 自由行動 4 秒 → 自動回歸（回程無敵）→ CD 1.7 秒
export function skillShadowStrike(now, _pp, _isP2) {
  if (!_pp) _pp = g.p;
  if (g._shadowReturn) return;
  sfx("ult");
  g._shadowReturn = { x: _pp.x, y: _pp.y, t: now, dur: 4000 };
  // 施放時重設 CD 為 0（讓按鈕顯示標記期間不可用）
  _skillCdEnd = now + 99999; // 暫時鎖住，回歸時再設真正 CD
  const cdEl = $("skillCd"); if (cdEl) { cdEl.style.display = "flex"; cdEl.textContent = "⏳"; }
  burst(_pp.x, _pp.y, "#fff", 12);
  burst(_pp.x, _pp.y, "#DDB4FE", 8);
  g.dn.push({ x: _pp.x, y: _pp.y - 30, d: "🗡️ 影襲！4秒後回歸", life: 2, color: "#DDB4FE", big: 1 });
}

/* ═══ dash (lightning step) ═══ */
export function _startDash(now) {
  if (!g) return;
  const hasJoy = joy.a && (Math.abs(joy.dx) > .2 || Math.abs(joy.dy) > .2);
  const ldx = hasJoy ? joy.dx : g.ad.x, ldy = hasJoy ? joy.dy : g.ad.y;
  const ld = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
  g.p._dashEnd = now + (g.p.lStepDur || 200);
  g.p._dashDx = ldx / ld; g.p._dashDy = ldy / ld;
  g.p._dashSpd = g.p.lStepSpd || 8;
  g.p._inv = true;
  burst(g.p.x, g.p.y, "#FFE066", 6);
  g.dn.push({ x: g.p.x, y: g.p.y - 20, d: "⚡衝刺", life: 1, color: "#FFE066" });
  g.ene.forEach(e => { if ((e.boss || e.stageBoss) && e.hp > 0 && di(e, g.p) < 80) {
    const ld2 = Math.min(g.p.atk * 3, e.mhp * .05); e.hp -= ld2;
    burst(e.x, e.y, "#FFE066", 8); g.dn.push({ x: e.x, y: e.y - e.r, d: "⚡" + Math.floor(ld2), life: 1, color: "#FFE066", big: 1 });
  } });
}

/* ═══ ultimate ═══ */
export function doUlt() {
  if (!g || !g.run) return;
  if (_net && _net.role === "client") { setClientUltReq(true); return; }
  const isBH = !!g.p.hasBH;
  const isTS = !!g.p.hasTS;
  const isMF = !!g.p.hasMF;
  const isCd = isBH || isTS || isMF;
  const isLS = !!g.p.lStep;
  const now = performance.now();
  if (isCd && now < (g.ultCdEnd || 0)) return;
  if (!isCd && g.ultCharge < ULT_CHARGE_NEED) return;
  let _comboUlt = false;
  if (_isCoopMode && g.p2 && !g.p2._downed) {
    if (g._p2UltTime && now - g._p2UltTime < 1000) { _comboUlt = true; g._p2UltTime = 0; }
    else { g._p1UltTime = now; }
  }
  const ultLv = g.p.ultLv || 0;
  const _comboMul = _comboUlt ? 3 : 1;
  const baseDmg = (ULT_D + g.p.atk * 6 + g.level * 5) * (g.p.ultDmgMul || 1) * (1 + ultLv * .35) * _comboMul;
  const cdVal = (isBH ? BH_COOLDOWN_MS : isMF ? (g.p.mfCd || 12e3) : (g.p.tsCd || 15e3)) / (g.p.ultRate || 1) * (1 - (g.p.ultCdReduce || 0));
  if (isBH) {
    g.bhEnd = now + BH_DURATION_MS;
    g.bhPow = 1 + ultLv * .45;
    g.p.bhSafeEnd = now + BH_DURATION_MS + 800;
  }
  if (isTS) {
    const frzDur = g.p.tsFrzDur || 2e3;
    const tsDmg = baseDmg * .5;
    g.ene.forEach(e => { e.frozen = Math.max(e.frozen || 0, frzDur); const td = (_isElite() && e.stageBoss) ? Math.min(tsDmg, e.mhp * .05) : tsDmg; e.hp -= td; g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(td), life: 1.3, color: "#74C0FC" }); if (e.hp <= 0) burst(e.x, e.y, e.color, 10); });
    settleEnemyDeaths();
    burst(g.p.x, g.p.y, "#74C0FC", 25);
    g.dn.push({ x: g.p.x, y: g.p.y - 30, d: isBH ? "🕳️⏸️黑洞+時停" : "⏸️時間停止+凍結傷害", life: 1.5, color: "#74C0FC", big: 1 });
    const cols = ["#74C0FC", "#4DABF7", "#339AF0", "#fff"];
    for (let i = 0; i < 30 && par.length < MAX_PARTICLES; i++) { const a = Math.PI * 2 * i / 30, v = rn(3, 8); par.push({ x: g.p.x + Math.cos(a) * 15, y: g.p.y + Math.sin(a) * 15, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2, color: cols[i % cols.length], sz: rn(3, 7) }); }
  }
  if (isMF) {
    const _mfDur = g.p.mfDur || 1500;
    g.mfEnd = now + _mfDur;
    g.mfPx = g.p.x; g.mfPy = g.p.y;
    g.mfR = g.p.mfR || 200;
    g.mfDmgMul = g.p.mfDmgMul || 1;
    g.mfSlow = g.p.mfSlow || 0;
    g.p._iFrameEnd = Math.max(g.p._iFrameEnd || 0, now + 1500);
    burst(g.p.x, g.p.y, "#339AF0", 20);
    g.dn.push({ x: g.p.x, y: g.p.y - 30, d: "🧲 磁力場！", life: 2, color: "#339AF0", big: 1 });
    for (let i = 0; i < 24 && par.length < MAX_PARTICLES; i++) {
      const a = TAU * i / 24; par.push({ x: g.p.x + Math.cos(a) * 80, y: g.p.y + Math.sin(a) * 80, vx: -Math.cos(a) * rn(2, 4), vy: -Math.sin(a) * rn(2, 4), life: 1, color: i % 2 ? "#339AF0" : "#74C0FC", sz: rn(3, 6) });
    }
  }
  if (isCd) g.ultCdEnd = now + cdVal;
  if (!isTS && !isMF || isBH) {
    g.ene.forEach(e => { const ud = (_isElite() && e.stageBoss) ? Math.min(baseDmg, e.mhp * .05) : baseDmg; e.hp -= ud; g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(ud), life: 1.3, color: isBH ? "#868E96" : "#FFD43B", big: 1 }); if (e.hp <= 0) burst(e.x, e.y, e.color, 14); });
    settleEnemyDeaths();
  }
  const cols = isBH ? ["#495057", "#868E96", "#CED4DA", "#fff"] : isTS ? ["#74C0FC", "#4DABF7", "#339AF0", "#fff"] : ["#BE4BDB", "#FFD43B", "#FF6B6B", "#74C0FC", "#fff"];
  const burstCount = 40 + ultLv * 12;
  for (let i = 0; i < burstCount && par.length < MAX_PARTICLES; i++) { const a = Math.PI * 2 * i / burstCount, v = rn(2, 7 + ultLv); par.push({ x: g.p.x + Math.cos(a) * 20, y: g.p.y + Math.sin(a) * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.3 + ultLv * .15, color: cols[i % cols.length], sz: rn(3, 8 + ultLv) }); }
  g.ultFlash = isBH ? 1 : isTS ? .6 : (_comboUlt ? 1.5 : 1); g.ultType = isBH ? "bh" : "n"; if (!isCd) g.ultCharge = 0; sfx("ult");
  if (isLS) _startDash(now);
  if (_comboUlt) {
    g.dn.push({ x: g.p.x, y: g.p.y - 50, d: "🌟 合體大招！×3 傷害！", life: 3, color: "#FFD43B", big: 1 });
    g.dn.push({ x: g.p2.x, y: g.p2.y - 50, d: "🌟 合體大招！", life: 3, color: "#F06595", big: 1 });
    burst(g.p.x, g.p.y, "#FFD43B", 25); burst(g.p2.x, g.p2.y, "#F06595", 25);
    sfx("phoenix");
  }
}
