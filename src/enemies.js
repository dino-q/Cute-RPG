// Enemy spawning, wave system, growth curves
import {
  MW, MH, ER, SPAWN_R, MAX_ENEMIES, CRATE_HP,
  ENEMY_HP_SCALE, MODE,
  ROLE_NORMAL, ROLE_FLANKER, ROLE_SHOOTER, ROLE_DASHER, ROLE_SHIELD,
  TC, pickRole
} from "./config.js";
import { cl, rn } from "./utils.js";
import { C } from "./cards.js";
import { sfx } from "./audio.js";
import { burst, par } from "./render.js";
import { showHint } from "./hud.js";

/* ═══ module-local refs (set by main.js via setters/init) ═══ */
let g;
let _mode = "classic";
let _isCoopMode = false;
let _practiceMode = false;
let _mapWFn, _mapHFn;

export function initEnemies(deps) {
  if (deps.mapW) _mapWFn = deps.mapW;
  if (deps.mapH) _mapHFn = deps.mapH;
}
export function setEnemiesG(game) { g = game; }
export function setEnemiesMode(mode) { _mode = mode; }
export function setEnemiesCoopMode(v) { _isCoopMode = v; }
export function setEnemiesPracticeMode(v) { _practiceMode = v; }

function _isElite() { return _mode === "elite" || _mode === "coop"; }
function mapW() { return _mapWFn ? _mapWFn() : MW; }
function mapH() { return _mapHFn ? _mapHFn() : MH; }

/* ═══ growth / tier helpers ═══ */
export function maxTierForWave(w) {
  return w < 2 ? 0 : w < 5 ? 1 : w < 10 ? 2 : w < 15 ? 3 : 4;
}

export function enemyGrowth(w) {
  const surge = !!(g && g._surgeLv10 && !g._surgeCleared10);
  if (surge) return { hp: 2.5, spd: 1.25, dmg: 1.8, size: 1.1 };
  const postSurge = w > 10 ? w - 10 : 0;
  const dmgMax = MODE[_mode].dmgCap || 1.8;
  return {
    hp: _isElite() ? (1 + Math.min(3.5, w * .07 + postSurge * .025)) : (1 + Math.min(4, w * .09 + postSurge * .035)),
    spd: _isElite() ? (1 + Math.min(.55, w * .018)) : (1 + Math.min(.65, w * .02)),
    dmg: _isElite() ? (1 + Math.min(dmgMax, w * .035 + postSurge * .012)) : (1 + Math.min(1.8, w * .04 + postSurge * .015)),
    size: 1 + Math.min(.32, w * .008)
  };
}

export function tierHpFor(t) { return [1, 1.45, 2.05, 3.05, 4.4][t] || 1; }

export function pickEnemyTier(w, boss) {
  const maxTier = maxTierForWave(w);
  if (boss) return maxTier;
  const weights = [];
  for (let i = 0; i <= maxTier; i++) {
    const weakMix = (maxTier - i) * (2.3 + Math.max(0, 14 - w) * .05);
    const eliteRise = 1 + i * (.8 + w * .045);
    weights.push(Math.max(.8, weakMix + eliteRise));
  }
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return maxTier;
}

/* ═══ wave config ═══ */
export function spawnTargetForWave(w) {
  if (_isElite()) {
    if (w < 4) return 3; if (w < 8) return 4; if (w < 15) return 5;
    if (w < 22) return 6; return Math.min(8, 7);
  }
  if (w < 2) return 12; if (w < 4) return 16; if (w < 6) return 20;
  if (w < 10) return 26; if (w < 14) return 36; if (w < 18) return 50;
  return Math.min(MAX_ENEMIES, 54 + (w - 18) * 4);
}

export function spikeConfigForWave(w) {
  if (w === 6) return { tier: 1, spawns: [ROLE_FLANKER, ROLE_FLANKER, ROLE_NORMAL, ROLE_NORMAL] };
  if (w === 10) return { tier: 2, spawns: [ROLE_SHOOTER, ROLE_SHOOTER, ROLE_DASHER, ROLE_FLANKER, ROLE_FLANKER, ROLE_NORMAL, ROLE_NORMAL, ROLE_NORMAL] };
  if (w === 14) return { tier: 3, spawns: [ROLE_DASHER, ROLE_DASHER, ROLE_SHIELD, ROLE_SHOOTER, ROLE_NORMAL, ROLE_NORMAL] };
  if (w === 18) return { tier: 4, spawns: [ROLE_DASHER, ROLE_SHIELD, ROLE_SHOOTER, ROLE_FLANKER, ROLE_NORMAL, ROLE_NORMAL, ROLE_NORMAL] };
  return null;
}

/* ═══ crate generation ═══ */
export function genCrates() {
  const _gmw = MODE[_mode].mapW || MW, _gmh = MODE[_mode].mapH || MH;
  const crates = [], spawnCenter = { x: _gmw / 2, y: _gmh / 2 };
  const a1 = rn(0, Math.PI * 2), d1 = rn(80, 160);
  const shuffled = [...C].sort(() => Math.random() - .5);
  crates.push({ x: spawnCenter.x + Math.cos(a1) * d1, y: spawnCenter.y + Math.sin(a1) * d1, hp: CRATE_HP, mhp: CRATE_HP, card: shuffled[0], hits: 0, needed: rn(8, 14) | 0, unlockLv: 0 });
  return crates;
}

export function spawnBonusCrates(count) {
  if (!g) return;
  const minDist = 400, minPlayer = 500, mw = mapW(), mh = mapH();
  for (let n = 0; n < count; n++) {
    let x, y, ok = false;
    for (let a = 0; a < 100; a++) {
      x = rn(100, mw - 100); y = rn(100, mh - 100);
      const pd = Math.sqrt((x - g.p.x) ** 2 + (y - g.p.y) ** 2);
      if (pd >= minPlayer && g.crates.every(c => c.hp <= 0 || Math.sqrt((c.x - x) ** 2 + (c.y - y) ** 2) >= minDist)) { ok = true; break; }
    }
    if (!ok) { x = rn(100, mw - 100); y = rn(100, mh - 100); }
    const shuffled = [...C].sort(() => Math.random() - .5);
    g.crates.push({ x, y, hp: CRATE_HP, mhp: CRATE_HP, card: shuffled[0], hits: 0, needed: rn(6, 10) | 0, unlockLv: 0 });
  }
}

/* ═══ spawn ═══ */
export function spawn(boss, opts = {}) {
  if (!g) return;
  if (!_practiceMode && g.ene.length >= (MODE[_mode].maxEnemies || MAX_ENEMIES)) return;
  const w = g.wave, tier = opts.tier ?? pickEnemyTier(w, boss);
  const mega = !!opts.mega;
  const grow = enemyGrowth(w);
  const earlyMobNerf = w < 8 ? .82 : 1;
  const earlyBossNerf = w < 8 ? .72 : 1;
  const earlyMul = boss ? earlyBossNerf : earlyMobNerf;
  const tierHp = (_isElite() ? [1, 1.45, 2.05, 3.05, 4.4] : [1, 1.3, 1.7, 2.2, 2.8])[tier] || 1;
  const tierSpd = [1, .98, 1.03, 1.08, 1.14][tier] || 1;
  const tierDmg = [1, 1.15, 1.35, 1.6, 1.9][tier] || 1;
  const bhp = (20 + w * 11) * (1 + w * .018) * tierHp;
  const _bossMul = _isElite() ? 1 : (boss ? 4.25 : 1);
  const _megaMul = _isElite() ? 1 : (mega ? 1.1 : 1);
  const _classicMobNerf = (_mode !== "elite" && !boss) ? .25 : 1;
  const _coopMul = (_mode === "coop") ? (MODE.coop.coopHpMul || 1.5) : 1;
  const hp = Math.floor(bhp * _bossMul * _megaMul * ENEMY_HP_SCALE * grow.hp * earlyMul * _classicMobNerf * _coopMul);
  const _spdCap = MODE[_mode].enemySpdCap || 2.4;
  const spdW = (_isElite()) ? Math.min(w, 12) : w;
  const spd = (.92 + Math.min(spdW * .13, _spdCap)) * tierSpd * enemyGrowth(spdW).spd * (mega ? .85 : 1) * (w < 8 ? .92 : 1);
  const rm = (boss ? 1.85 : 1) * (mega ? 1.9 : 1) * (1 + tier * .11) * grow.size;
  const a = rn(0, Math.PI * 2), d = SPAWN_R + rn(0, 80);
  const _sp = (_isCoopMode && g.p2 && Math.random() > .5) ? g.p2 : g.p;
  let x = _sp.x + Math.cos(a) * d, y = _sp.y + Math.sin(a) * d;
  x = cl(x, ER * rm + 5, mapW() - ER * rm - 5); y = cl(y, ER * rm + 5, mapH() - ER * rm - 5);
  const tcols = TC[tier], col = tcols[tcols.length * Math.random() | 0];
  const role = opts.role ?? pickRole(w, boss);
  let spdMul = 1, hpMul = 1, rmMul = 1;
  if (role === ROLE_SHOOTER) { spdMul = .65; hpMul = .7; }
  if (role === ROLE_DASHER) { spdMul = .5; hpMul = .85; }
  if (role === ROLE_SHIELD) { spdMul = .8; hpMul = 1.4; rmMul = 1.15; }
  if (role === ROLE_FLANKER) { spdMul = 1.12; }
  let finalHp = Math.floor(hp * hpMul);
  let isEliteEnemy = false;
  if (_isElite()) {
    const eMC = MODE[_mode];
    if (boss) {
      finalHp = Math.floor((1000 + w * 270) * (mega ? 2 : 1));
    } else {
      const earlyRamp = Math.min(1, .3 + (w - 1) * .14);
      if (w >= eMC.eliteStartWave && Math.random() < eMC.eliteChance) {
        finalHp = Math.floor((eMC.eliteHpBase + w * eMC.eliteHpPerWave) * earlyRamp);
        isEliteEnemy = true;
        if (!g._eliteHint) { g._eliteHint = true; showHint("⚠️ 精英怪有物理抗性！帶元素卡更有效"); }
      } else {
        finalHp = Math.floor((eMC.smallHpBase + w * eMC.smallHpPerWave) * earlyRamp);
      }
    }
  }
  g.ene.push({ x, y, hp: finalHp, mhp: finalHp, speed: spd * spdMul * (isEliteEnemy ? .7 : 1), color: isEliteEnemy ? "#E74C3C" : col, t: rn(0, 10), r: ER * rm * rmMul * (isEliteEnemy ? 1.3 : 1), st: 0, boss, mega, tier, face: x < g.p.x ? 1 : -1, xp: boss ? (mega ? 120 : 28) + w * 4 + tier * 4 : isEliteEnemy ? 15 + w : 4 + Math.floor(w / 2) + tier, poisonT: 0, frozen: 0, burnT: 0, burnLv: 0, poisonLv: 0, dmgMul: tierDmg * grow.dmg * (1 + Math.max(0, w - 10) * .018) * earlyMul * (isEliteEnemy ? 1.5 : 1),
    eliteEnemy: isEliteEnemy, _eDashCD: 0, _eShieldEnd: 0, _eShockCD: 0,
    role,
    flankA: rn(0, Math.PI * 2),
    shootCD: 0,
    dashState: 0, dashTimer: 0, dashDx: 0, dashDy: 0,
    shieldAng: 0,
    bossSkillCD: boss ? rn(2500, 4000) : 0, bossSkill: 0,
    bossType: boss ? (Math.random() > .5 ? "tough" : "armor") : "",
    _coopShield: (_isCoopMode && boss) ? true : false,
    _coopCircles: null, _coopShieldBrokenEnd: 0, _coopCircleTimer: 0
  });
  if (_isCoopMode && boss) {
    const ne = g.ene[g.ene.length - 1];
    _coopGenCircles(ne);
  }
}

export function _coopGenCircles(e) {
  if (!e) return;
  const mw = mapW(), mh = mapH(), pad = 40;
  const a1 = rn(0, Math.PI * 2), a2 = a1 + rn(Math.PI * .4, Math.PI * 1.6);
  const r1 = rn(80, 140), r2 = rn(80, 140);
  e._coopCircles = [
    { x: cl(e.x + Math.cos(a1) * r1, pad, mw - pad), y: cl(e.y + Math.sin(a1) * r1, pad, mh - pad) },
    { x: cl(e.x + Math.cos(a2) * r2, pad, mw - pad), y: cl(e.y + Math.sin(a2) * r2, pad, mh - pad) }
  ];
}

/* ═══ spike wave / hunt pressure ═══ */
export function triggerSpikeWave(w) {
  if (!g || g.spikeDone[w]) return;
  const spike = spikeConfigForWave(w);
  if (!spike) return;
  g.spikeDone[w] = 1;
  if (w === 10) { g._surgeLv10 = true; g._surgeCleared10 = false; g._surgeKillCount = 0; g._surgeKillTarget = spike.spawns.length; }
  spike.spawns.forEach(role => {
    if (g.ene.length < MAX_ENEMIES) spawn(false, { role, tier: spike.tier });
  });
  const label =
    w === 6 ? "敵人開始包夾！" :
    w === 10 ? "⚠️ 強烈攻勢！撐過去就有獎勵！" :
    w === 14 ? "精英突擊波！" :
    "終極混戰開始！";
  g.dn.push({ x: g.p.x, y: g.p.y - 60, d: label, life: 2.2, color: w === 10 ? "#FF6B6B" : "#FFD43B", big: 1 });
}

export function triggerHuntPressure(now) {
  if (!g || !g.run) return;
  if (now - g.lastKill < 9e3 || now - g.lastHunt < 6e3) return;
  g.lastHunt = now;
  g.huntModeUntil = now + 4500;
  g.ene.forEach(e => { if (e.hp > 0) { e._huntStart = now + Math.random() * 1200; e._huntEnd = e._huntStart + 1800 + Math.random() * 1500; } });
  const tier = Math.min(maxTierForWave(g.wave), 2 + Math.floor(g.wave / 8));
  const pack = g.wave < 8 ? [ROLE_FLANKER, ROLE_NORMAL] : [ROLE_DASHER, ROLE_SHOOTER, ROLE_FLANKER];
  pack.forEach(role => { const pre = g.ene.length; if (pre < MAX_ENEMIES) { spawn(false, { role, tier }); if (g.ene.length > pre) { const ne = g.ene[g.ene.length - 1]; ne._huntStart = now + Math.random() * 1200; ne._huntEnd = ne._huntStart + 1800 + Math.random() * 1500; } } });
  g.dn.push({ x: g.p.x, y: g.p.y - 60, d: "⚠️ 被獵殺！快擊殺敵人止壓", life: 1.6, color: "#FF6B6B", big: 1 });
}
