// Combat: shooting, melee, collision, kill settlement
import {
  PI, TAU, PR, ER,
  MAX_PARTICLES, MAX_BULLETS,
  PLAYER_DMG_SCALE, ULT_CHARGE_NEED
} from "./config.js";
import { di, cl, rn, $ } from "./utils.js";
import { sfx, sfxShoot, sfxHit } from "./audio.js";
import { par, burst, addLtn, bCol } from "./render.js";
import { spawnBonusCrates } from "./enemies.js";
import { joy, aim } from "./input.js";

/* ═══ module-local refs (injected by main.js) ═══ */
let g;
let _mode = "classic";
let _isCoopMode = false;
let _net = null;
let _p2AI = false;
let inv = [];
let inv2 = [];
let _skillCdEnd = 0;
let _p2SkillCdEnd = 0;
let _clientSkillReq = false;
let cTimer;

// Callbacks injected by main.js
let _showPickFn, _sendP2PickFn, _mapWFn, _mapHFn, _crateActiveFn;
let _setShakeFn; // (t, pow) => { _shakeT=t; _shakePow=pow; }
let _getIsEliteFn; // () => boolean

export function initCombat(deps) {
  if (deps.showPick) _showPickFn = deps.showPick;
  if (deps.sendP2Pick) _sendP2PickFn = deps.sendP2Pick;
  if (deps.mapW) _mapWFn = deps.mapW;
  if (deps.mapH) _mapHFn = deps.mapH;
  if (deps.crateActive) _crateActiveFn = deps.crateActive;
  if (deps.setShake) _setShakeFn = deps.setShake;
  if (deps.isElite) _getIsEliteFn = deps.isElite;
}
export function setCombatG(game) { g = game; }
export function setCombatMode(mode) { _mode = mode; }
export function setCombatCoopState(isCoop, net, p2AI) { _isCoopMode = isCoop; _net = net; _p2AI = p2AI; }
export function setCombatInv(i1, i2) { inv = i1; inv2 = i2; }
export function setCombatSkillCd(v) { _skillCdEnd = v; }
export function getCombatSkillCd() { return _skillCdEnd; }
export function setCombatP2SkillCd(v) { _p2SkillCdEnd = v; }
export function getCombatP2SkillCd() { return _p2SkillCdEnd; }
export function setCombatClientSkillReq(v) { _clientSkillReq = v; }
export function getCombatClientSkillReq() { return _clientSkillReq; }

function _isElite() { return _getIsEliteFn ? _getIsEliteFn() : (_mode === "elite" || _mode === "coop"); }
function mapW() { return _mapWFn ? _mapWFn() : 2400; }
function mapH() { return _mapHFn ? _mapHFn() : 2400; }
function crateActive(cr) { return _crateActiveFn ? _crateActiveFn(cr) : false; }
function showPick(...args) { if (_showPickFn) _showPickFn(...args); }
function _sendP2Pick(...args) { if (_sendP2PickFn) _sendP2PickFn(...args); }
function setShake(t, pow) { if (_setShakeFn) _setShakeFn(t, pow); }

/* ═══ nearestTargets ═══ */
export function nearestTargets(src, k) {
  const out = [];
  for (let i = 0; i < g.ene.length; i++) {
    const o = g.ene[i];
    if (o === src || o.hp <= 0 || o.ragePoo) continue;
    const d2 = (src.x - o.x) * (src.x - o.x) + (src.y - o.y) * (src.y - o.y);
    let pos = out.length;
    while (pos > 0 && d2 < out[pos - 1].d2) pos--;
    if (pos < k) { out.splice(pos, 0, { e: o, d2 }); if (out.length > k) out.pop(); }
  }
  return out.map(v => v.e);
}

/* ═══ awardEnemyKill ═══ */
export function awardEnemyKill(e) {
  if (!g || !e || e.deadHandled) return false;
  e.deadHandled = true;
  g.lastKill = performance.now();
  sfx("kill");
  g.score += 10 + g.wave * 5 + (e.boss ? 50 : 0);
  g.kills++;
  const _prevUlt = g.ultCharge;
  g.ultCharge = Math.min(g.ultCharge + (g.p.ultRate || 1) * (e.boss ? 3 : 1), ULT_CHARGE_NEED);
  if (_prevUlt < ULT_CHARGE_NEED && g.ultCharge >= ULT_CHARGE_NEED) g._ultReadyUntil = performance.now() + 1500;
  g.orbs.push({ x: e.x, y: e.y, xp: e.xp * (g.p.expMul || 1), life: 1 });
  if (g.p.ls > 0) {
    g.p.hp = Math.min(g.p.hp + g.p.ls, g.p.maxHp);
    const dx = g.p.x - e.x, dy = g.p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    for (let i = 0; i < 3 && par.length < MAX_PARTICLES; i++) {
      const spread = rn(-.6, .6);
      par.push({ x: e.x, y: e.y, vx: dx / d * rn(3, 5) + Math.cos(spread) * 1.5, vy: dy / d * rn(3, 5) + Math.sin(spread) * 1.5, life: .7, color: i === 0 ? "#fff" : "#69DB7C", sz: rn(2.5, 4.5) });
    }
    g.dn.push({ x: g.p.x, y: g.p.y - PR - 8, d: "+" + Math.floor(g.p.ls), life: .9, color: "#51CF66", big: 0 });
  }
  return true;
}

/* ═══ settleEnemyDeaths ═══ */
export function settleEnemyDeaths(protectBoss) {
  if (!g) return;
  const _wb = protectBoss;
  g.ene.forEach(e => {
    if (e.hp > 0 || e.deadHandled) return;
    if (e.stageBoss) return;
    if (_wb && _isElite() && e.boss && !e.miniPoo && !e.miniDemon) return;
    burst(e.x, e.y, e.color, 10);
    if (g.p.deathBoom > 0) {
      burst(e.x, e.y, "#FF922B", 8);
      const _boomD = g.p.deathBoom + (g.p.atk || 0) * 1.5;
      g.ene.forEach(oe => { if (oe !== e && oe.hp > 0 && di(e, oe) < 50) { const bd = (oe.boss || oe.stageBoss) ? Math.min(_boomD, oe.mhp * .03) : _boomD; oe.hp -= bd; burst(oe.x, oe.y, "#FF922B", 3); g.dn.push({ x: oe.x, y: oe.y - oe.r, d: Math.floor(bd), life: .8, color: "#FF922B" }); } });
    }
    awardEnemyKill(e);
    if (g._surgeLv10 && !g._surgeCleared10) {
      g._surgeKillCount = (g._surgeKillCount || 0) + 1;
    }
  });
  g.ene = g.ene.filter(e => e.hp > 0 || e.stageBoss || (_wb && _isElite() && e.boss && !e.miniPoo && !e.miniDemon));
  if (g._surgeLv10 && !g._surgeCleared10 && g._surgeKillCount >= g._surgeKillTarget) {
    g._surgeCleared10 = true;
    spawnBonusCrates(2);
    burst(g.p.x, g.p.y, "#FFD43B", 30);
    g.dn.push({ x: g.p.x, y: g.p.y - 60, d: "🎉 攻勢通過！獲得2個寶箱！", life: 2.5, color: "#51CF66", big: 1 });
  }
}

/* ═══ fire (ranged attack) ═══ */
export function fire(dmg, dx, dy, sp, p) {
  if (g.bul.length > MAX_BULLETS) return;
  sfxShoot();
  const pp = p || g.p;
  dmg *= PLAYER_DMG_SCALE;
  if (g._coopLink) dmg *= 1.3;
  let heavy = false;
  if (pp.heavyEvery > 0) { pp._heavyCount = (pp._heavyCount || 0) + 1; if (pp._heavyCount >= pp.heavyEvery) { pp._heavyCount = 0; heavy = true; dmg *= 2; } }
  const shots = pp.split || 1, ba = Math.atan2(dy, dx), bc = heavy ? { f: "#FF922B", g: "#FF4500", t: "#FF922B" } : (p === g.p2 ? { f: "#F06595", g: "#DA77F2", t: "#F06595" } : bCol());
  const dbl = Math.random() < (pp.dblAtk || 0);
  const _ct = (p === g.p2) ? (g.p2.charType || "gunner") : (g ? g.charType : "gunner");
  if (_ct === "gunner" && par.length < MAX_PARTICLES - 6) {
    const _fAd = (p === g.p2) ? (pp._ad || { x: pp.face || 1, y: 0 }) : ((g && g.ad) ? g.ad : { x: pp.face || 1, y: 0 });
    const _fAng = Math.atan2(_fAd.y, _fAd.x);
    const mzDist = PR * 1.2;
    const mzX = pp.x + Math.cos(_fAng) * mzDist, mzY = pp.y + Math.sin(_fAng) * mzDist;
    const mzC = bc.f || "#FFE066";
    par.push({ x: mzX, y: mzY, vx: Math.cos(_fAng) * rn(1, 3), vy: Math.sin(_fAng) * rn(1, 3), life: .2, color: "#fff", sz: rn(3, 5) });
    for (let _fi = 0; _fi < 3; _fi++) {
      const sa = _fAng + rn(-.4, .4);
      par.push({ x: mzX, y: mzY, vx: Math.cos(sa) * rn(2, 4), vy: Math.sin(sa) * rn(2, 4), life: .18 + _fi * .04, color: _fi % 2 ? mzC : "#FFE066", sz: rn(1.5, 3.5) });
    }
    par.push({ x: mzX, y: mzY, vx: Math.cos(_fAng + PI / 2) * rn(.5, 1.5), vy: Math.sin(_fAng + PI / 2) * rn(.5, 1.5), life: .15, color: "#FFE066", sz: rn(1, 2) });
    par.push({ x: mzX, y: mzY, vx: Math.cos(_fAng - PI / 2) * rn(.5, 1.5), vy: Math.sin(_fAng - PI / 2) * rn(.5, 1.5), life: .15, color: "#FFE066", sz: rn(1, 2) });
  }
  const dirs = dbl ? [ba, ba + Math.PI] : [ba];
  dirs.forEach(dir => {
    const count = Math.min(shots, 12);
    for (let i = 0; i < count; i++) {
      const a = dir + (i - (count - 1) / 2) * .16 + rn(-sp, sp);
      var _nt = performance.now(), _hmOn = false;
      if (pp.homing) {
        if (!pp._hmCycleT) pp._hmCycleT = _nt;
        var _cyc = (_nt - pp._hmCycleT) % 3500;
        _hmOn = _cyc < 500;
      }
      g.bul.push({ x: pp.x, y: pp.y - PR * .4, vx: Math.cos(a) * 7.5, vy: Math.sin(a) * 7.5, dmg, life: 1, crit: Math.random() < (pp.crit || .05), bc, trail: [], _tw: 0, pierce: pp.pierce || 0, hm: _hmOn ? pp.homing : 0, _minigun: pp._minigun || 0, _armorPen: pp.armorCapBonus || 0, _isP2: p === g.p2 });
    }
  });
}

/* ═══ swordSwing (melee arc damage) ═══ */
export function swordSwing(_pp, _isP2) {
  if (!_pp) _pp = g.p; var _pad = _isP2 ? (g.p2 && g.p2._ad || { x: 0, y: -1 }) : g.ad; var _atkRef = _isP2 ? "_p2AtkAnim" : "_atkAnim"; var _wbRef = _isP2 ? "_p2WbSwing" : "_wbSwing"; var _pct = _isP2 ? (g.p2 ? g.p2.charType : "gunner") : g.charType; var _pinv = _isP2 ? inv2 : inv;
  if (!g || !g.run) return;
  const now = performance.now();
  const splitBonus = Math.max(1, (_pp.split || 1) * .5 + .5);
  let _meleeHeavy = false;
  if (_pp.heavyEvery > 0) { _pp._heavyCount = (_pp._heavyCount || 0) + 1; if (_pp._heavyCount >= _pp.heavyEvery) { _pp._heavyCount = 0; _meleeHeavy = true; } }
  const heavyMul = _meleeHeavy ? 2 : 1;
  const berserkMul = (_pp.berserk && _pp.hp / _pp.maxHp < _pp.berserk) ? 2 : 1;
  const baseDmg = (3.5 + _pp.atk) * splitBonus * berserkMul * heavyMul * (_pp.elemBoost || 1) * (_pp.levelDmgMul || 1);
  const pierceRange = (_pp.pierce || 0) > 0 ? 30 : 0;
  const splashRange = _pp.splash || 0;
  const _drawSlashMul = _pp._drawSlash ? [1, 1.3, 1.5, 1.8][_pp._drawSlash] || 1 : 1;
  var _gsCdT = _isP2 ? _p2SkillCdEnd : _skillCdEnd;
  const _gsCdActive = _gsCdT > 0 && performance.now() < _gsCdT && _pct === "swordsman";
  const _gsRangeMul = _gsCdActive ? 2 : 1;
  const range = (PR * 5 + pierceRange + splashRange) * _drawSlashMul * _gsRangeMul;
  const atkAngle = Math.atan2(_pad.y, _pad.x);
  const _dblMelee = Math.random() < (_pp.dblAtk || 0);
  const arc = _dblMelee ? TAU : PI * (.6 + Math.min(.4, (_pp.split || 1) * .05));
  sfxShoot();
  if (_dblMelee) { burst(_pp.x, _pp.y, "#868E96", 6); }
  _pp._swordQiCount = (_pp._swordQiCount || 0) + 1;
  const qiEvery = _pp._qiEvery || 5;
  const isQi = _pp._swordQiCount % qiEvery === 0;
  const qiMul = isQi ? (_pp._qiMul || 2) : 1;
  const dmg = baseDmg; // capture for ghost slash closure
  g.ene.forEach(e => {
    if (e.hp <= 0) return;
    const dx = e.x - _pp.x, dy = e.y - _pp.y, d = Math.sqrt(dx * dx + dy * dy);
    const _bossReach = (e.boss || e.stageBoss) ? 30 : 0;
    if (d > range + e.r + _bossReach + (isQi ? 40 : 0)) return;
    const ea = Math.atan2(dy, dx);
    let da = Math.abs(((ea - atkAngle) % (PI * 2) + PI * 3) % (PI * 2) - PI);
    if (da > arc && !isQi) return;
    const hitDmg = baseDmg * qiMul;
    const isBoss = e.boss && !e.stageBoss;
    const _meleeCrit = Math.random() < (_pp.crit || .05);
    let fd = hitDmg * (_meleeCrit ? 2 : 1);
    if (isBoss && e.bossType === "armor") fd *= .7;
    if ((e.boss || e.mega) && _pp.bossDmg > 1) fd *= _pp.bossDmg;
    if (!e.mega && _pp.mobDmg > 1) fd *= _pp.mobDmg;
    if (_pp.iceFrag && (e.st > 0 || e.frozen > 0)) fd *= (1 + _pp.iceFrag);
    if (e.eliteEnemy) { const hasEl = !!(_pp.fx.fire || _pp.fx.ice || _pp.fx.lightning || _pp.fx.poison || _pp.fx.dragon); if (hasEl) fd *= 1.2; else { fd *= .5; fd = Math.max(fd, 1); } }
    if (e._coopShield) { fd = 0; }
    e.hp -= fd;
    e.st = Math.max(e.st || 0, 800);
    if (_pp.bulletHeal > 0) { const mheal = Math.max(5, _pp.bulletHeal); _pp.hp = Math.min(_pp.hp + mheal, _pp.maxHp); _pp._healFlash = now; }
    const fx = _pp.fx;
    if (fx.fire) { e.burnT = Math.max(e.burnT || 0, 1400 + Math.max(fx.fire || 0, 1) * 600); e.burnLv = Math.max(fx.fire || 0, 1); }
    if (fx.poison && _pp.poison > 0) { e.poisonT = _pp.poison * 1000 * (_pp.elemBoost || 1); e.poisonLv = Math.max(fx.poison || 0, 1); }
    if (fx.ice) { if (Math.random() < .25) e.frozen = Math.max(e.frozen || 0, 500); else e.st = Math.max(e.st || 0, 1200); }
    if (_pp._bleedChance && Math.random() < _pp._bleedChance) {
      e._bleedEnd = now + 2000; e._bleedDmg = _pp.atk * .3;
      for (let bi = 0; bi < 3; bi++) par.push({ x: e.x + rn(-5, 5), y: e.y + rn(-5, 5), vx: rn(-.5, .5), vy: rn(.5, 1.5), life: .5, color: "#FF4040", sz: rn(1.5, 3), g: .05 });
      g.dn.push({ x: e.x + rn(-8, 8), y: e.y - e.r - 12, d: "🩸", life: .8, color: "#FF4040" });
    }
    const _meleeHeal = 3 + (_pp.ls > 0 ? _pp.ls * .3 : 0);
    if (_pp.hp < _pp.maxHp) { _pp.hp = Math.min(_pp.hp + _meleeHeal, _pp.maxHp); }
    burst(e.x, e.y, isQi ? "#FFD43B" : _meleeCrit ? "#FFD43B" : _meleeHeavy ? "#FF922B" : "#FF922B", 5);
    g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(fd), life: 1, color: _meleeCrit ? "#FFD43B" : isQi ? "#FFD43B" : "#fff", big: _meleeCrit || isQi });
    sfxHit();
    if (_pp.chain > 0 || fx.lightning) {
      const cMul = (_pp.chainDmg || 1) * (fx.lightning ? .58 : .3);
      const cd2 = fd * cMul;
      const _ltnHit = new Set([e]);
      let _ltnSrc = e;
      for (let _ltnJ = 0; _ltnJ < 2; _ltnJ++) {
        let nearest = null, nd = 1e9;
        g.ene.forEach(t => { if (_ltnHit.has(t) || t.hp <= 0) return; const d2 = di(_ltnSrc, t); if (d2 < 120 && d2 < nd) { nd = d2; nearest = t; } });
        if (!nearest) break;
        _ltnHit.add(nearest);
        const jDmg = cd2 * (1 - _ltnJ * .2);
        nearest.hp -= jDmg;
        addLtn(_ltnSrc.x, _ltnSrc.y, nearest.x, nearest.y, 1.2);
        addLtn(_ltnSrc.x + rn(-3, 3), _ltnSrc.y + rn(-3, 3), nearest.x + rn(-3, 3), nearest.y + rn(-3, 3), .8);
        burst(nearest.x, nearest.y, "#FAB005", 6); burst(nearest.x, nearest.y, "#fff", 3);
        for (let sp = 0; sp < 3; sp++) {
          const t2 = rn(.2, .8);
          const px = _ltnSrc.x + (_ltnSrc.x - nearest.x) * -t2, py = _ltnSrc.y + (_ltnSrc.y - nearest.y) * -t2;
          par.push({ x: px, y: py, vx: rn(-1, 1), vy: rn(-1, 1), life: .35, color: sp % 2 ? "#FAB005" : "#FFD43B", sz: rn(2, 4) });
        }
        g.dn.push({ x: nearest.x, y: nearest.y - nearest.r, d: "⚡" + Math.floor(jDmg), life: 1, color: "#FAB005", big: 1 });
        _ltnSrc = nearest;
      }
    }
  });
  if (_pp._ghostSlash) {
    const gsMul = _pp._ghostSlash;
    const _gsX = _pp.x, _gsY = _pp.y, _gsF = _pp.face;
    g._ghostShadow = { x: _gsX, y: _gsY, face: _gsF, life: 1, t: performance.now() };
    setTimeout(() => {
      if (!g || !g.run) return;
      for (let ring = 0; ring < 2; ring++) {
        const cnt = 8 + ring * 4, spd = 2 + ring * 1.5;
        for (let gi = 0; gi < cnt; gi++) {
          const a = atkAngle + TAU * gi / cnt + ring * .2;
          par.push({ x: _gsX + Math.cos(a) * (10 + ring * 8), y: _gsY + Math.sin(a) * (10 + ring * 8), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: .5 + ring * .1, color: gi % 3 === 0 ? "#fff" : gi % 3 === 1 ? "#DA77F2" : "#BE4BDB", sz: rn(2, 4 + ring) });
        }
      }
      g._ghostArc = { x: _gsX, y: _gsY, ang: atkAngle, t: performance.now() };
      g.ene.forEach(e => {
        if (e.hp <= 0) return;
        const dx2 = e.x - _gsX, dy2 = e.y - _gsY, d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d2 > range) return;
        const ea2 = Math.atan2(dy2, dx2);
        let da2 = Math.abs(((ea2 - atkAngle) % (PI * 2) + PI * 3) % (PI * 2) - PI);
        if (da2 > arc) return;
        const gd = dmg * gsMul; e.hp -= gd;
        burst(e.x, e.y, "#DA77F2", 5);
        g.dn.push({ x: e.x + rn(-6, 6), y: e.y - e.r - 5, d: Math.floor(gd), life: .8, color: "#DA77F2", big: 1 });
      });
    }, 150);
  }
  g.crates.forEach(cr => { if (!crateActive(cr)) return; if (di(_pp, cr) < range) { cr.hits += 2; burst(cr.x, cr.y, "#FFD43B", 3);
    if (cr.hits >= cr.needed && cr.hp > 0) { cr.hp = 0; burst(cr.x, cr.y, "#FFD43B", cr.bigChest ? 20 : 12); sfx("chest");
      if (_isCoopMode) { _pp._inv = true; _pp._pickPending = true;
        if (_isP2 && !_p2AI && _net && _net.conn && _net.conn.open) {
          _sendP2Pick(cr);
        } else {
          var _pkCtx = _isP2 ? { player: _pp, inv: _pinv, charType: _pct } : null;
          if (cr.bigChest) { var _bcp = _isElite() ? 4 : 5; g._bigChestTotal = _bcp; g._bigChestLeft = _bcp; showPick("bigchest", null, _pkCtx); }
          else { showPick("crate", null, _pkCtx); }
        }
      }
      else { g.run = false;
        if (cr.bigChest) { var _bcp = _isElite() ? 4 : 5; g._bigChestTotal = _bcp; g._bigChestLeft = _bcp; showPick("bigchest"); }
        else { showPick("crate"); }
      }
    }
  } });
  if (_pp._lightSaber) {
    const beamDmg = _pp.atk * 1.5 * (_pp.elemBoost || 1);
    const beamRange = 200;
    for (let bi = 0; bi < 3; bi++) {
      const ba = atkAngle + (bi - 1) * .25;
      g.ene.forEach(e => {
        if (e.hp <= 0) return;
        const bx = e.x - _pp.x, by = e.y - _pp.y, bd = Math.sqrt(bx * bx + by * by);
        if (bd > beamRange) return;
        const ba2 = Math.atan2(by, bx);
        let bda = Math.abs(((ba2 - ba) % (PI * 2) + PI * 3) % (PI * 2) - PI);
        if (bda > .15) return;
        let bfd = beamDmg; if (e.boss) bfd = Math.min(bfd, 40);
        e.hp -= bfd;
        burst(e.x, e.y, "#FFD43B", 3);
        g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(bfd), life: .7, color: "#FFD43B" });
      });
      const bLen = rn(120, beamRange);
      if (!g._lightBeams) g._lightBeams = [];
      g._lightBeams.push({ x: _pp.x, y: _pp.y, ang: ba, len: bLen, t: performance.now() });
      for (let pi = 0; pi < 5; pi++) {
        const pd = rn(20, bLen);
        par.push({ x: _pp.x + Math.cos(ba) * pd + rn(-3, 3), y: _pp.y + Math.sin(ba) * pd + rn(-3, 3), vx: Math.cos(ba) * rn(1, 4), vy: Math.sin(ba) * rn(1, 4), life: .35, color: ["#FFD43B", "#fff", "#FFE066"][pi % 3], sz: rn(1.5, 3.5) });
      }
    }
  }
  if (!g[_atkRef]) g[_atkRef] = { active: false, startT: 0 };
  g[_atkRef].active = true; g[_atkRef].startT = performance.now(); g[_atkRef]._qiSpin = false;
  if (isQi) {
    g[_atkRef]._qiSpin = true;
    for (let ring = 0; ring < 3; ring++) {
      const cnt = 10 + ring * 4, spd = 3 + ring * 1.5;
      for (let i = 0; i < cnt; i++) {
        const a = TAU * i / cnt + ring * .2;
        par.push({ x: _pp.x + Math.cos(a) * (15 + ring * 8), y: _pp.y + Math.sin(a) * (15 + ring * 8), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: .8 + ring * .15, color: ["#FFD43B", "#fff", "#FF922B", "#FFE066"][i % 4], sz: rn(2.5, 5 + ring) });
      }
    }
    burst(_pp.x, _pp.y, "#FFD43B", 15); burst(_pp.x, _pp.y, "#fff", 8);
    g.dn.push({ x: _pp.x, y: _pp.y - 35, d: "⚔️ 劍氣！", life: 1.5, color: "#FFD43B", big: 1 });
    setShake(.2, 4);
  }
}

/* ═══ shieldBash (tank melee) ═══ */
export function shieldBash(_pp, _isP2) {
  if (!_pp) _pp = g.p; var _pad = _isP2 ? (g.p2 && g.p2._ad || { x: 0, y: -1 }) : g.ad; var _atkRef = _isP2 ? "_p2AtkAnim" : "_atkAnim"; var _wbRef = _isP2 ? "_p2WbSwing" : "_wbSwing"; var _pct = _isP2 ? (g.p2 ? g.p2.charType : "gunner") : g.charType; var _pinv = _isP2 ? inv2 : inv;
  if (!g || !g.run) return;
  const now = performance.now();
  const splitBonus = Math.max(1, (_pp.split || 1) * .4 + .6);
  const _tauntMul = (_pp._tauntAtkEnd && now < _pp._tauntAtkEnd) ? 2 : 1;
  let _tankHeavy = false;
  if (_pp.heavyEvery > 0) { _pp._heavyCount = (_pp._heavyCount || 0) + 1; if (_pp._heavyCount >= _pp.heavyEvery) { _pp._heavyCount = 0; _tankHeavy = true; } }
  const heavyMul2 = _tankHeavy ? 2 : 1;
  const berserkMul2 = (_pp.berserk && _pp.hp / _pp.maxHp < _pp.berserk) ? 2 : 1;
  const dmg = (3 + _pp.atk) * splitBonus * heavyMul2 * berserkMul2 * (_pp.elemBoost || 1) * (_pp.levelDmgMul || 1) * _tauntMul;
  const pierceRange = (_pp.pierce || 0) > 0 ? 25 : 0;
  const splashRange2 = _pp.splash || 0;
  const range = PR * 3 + pierceRange + splashRange2;
  const atkAngle = Math.atan2(_pad.y, _pad.x);
  const _dblMelee2 = Math.random() < (_pp.dblAtk || 0);
  const arc = _dblMelee2 ? TAU : PI * (.5 + Math.min(.3, (_pp.split || 1) * .04));
  sfxShoot();
  if (_dblMelee2) { burst(_pp.x, _pp.y, "#868E96", 6); }
  g.ene.forEach(e => {
    if (e.hp <= 0) return;
    const dx = e.x - _pp.x, dy = e.y - _pp.y, d = Math.sqrt(dx * dx + dy * dy);
    const _bossReach2 = (e.boss || e.stageBoss) ? 30 : 0;
    if (d > range + e.r + _bossReach2) return;
    const ea = Math.atan2(dy, dx);
    let da = Math.abs(((ea - atkAngle) % (PI * 2) + PI * 3) % (PI * 2) - PI);
    if (da > arc) return;
    const _tankCrit = Math.random() < (_pp.crit || .05);
    let fd = dmg * (_tankCrit ? 2 : 1);
    if (e.boss && e.bossType === "armor") fd *= .7;
    if ((e.boss || e.mega) && _pp.bossDmg > 1) fd *= _pp.bossDmg;
    if (!e.mega && _pp.mobDmg > 1) fd *= _pp.mobDmg;
    if (_pp.iceFrag && (e.st > 0 || e.frozen > 0)) fd *= (1 + _pp.iceFrag);
    if (e.eliteEnemy) { const hasEl = !!(_pp.fx.fire || _pp.fx.ice || _pp.fx.lightning || _pp.fx.poison || _pp.fx.dragon); if (hasEl) fd *= 1.2; else { fd *= .5; fd = Math.max(fd, 1); } }
    if (e._coopShield) { fd = 0; }
    e.hp -= fd;
    if (_pp.bulletHeal > 0) { const mheal2 = Math.max(5, _pp.bulletHeal); _pp.hp = Math.min(_pp.hp + mheal2, _pp.maxHp); _pp._healFlash = now; }
    if (!e.stageBoss) {
      const pushF = e.boss ? 15 : 35;
      if (d > 0) { e.x += dx / d * pushF; e.y += dy / d * pushF; }
      e.x = cl(e.x, e.r, mapW() - e.r); e.y = cl(e.y, e.r, mapH() - e.r);
      e._retreatEnd = now + 800;
      par.push({ x: e.x - dx / d * 10, y: e.y - dy / d * 10, vx: dx / d * 3, vy: dy / d * 3, life: .3, color: "#fff", sz: rn(2, 3.5) });
    }
    e.st = Math.max(e.st || 0, 1000);
    const fx = _pp.fx;
    if (fx.fire) { e.burnT = Math.max(e.burnT || 0, 1400 + Math.max(fx.fire || 0, 1) * 600); e.burnLv = Math.max(fx.fire || 0, 1); }
    if (fx.poison && _pp.poison > 0) { e.poisonT = _pp.poison * 1000 * (_pp.elemBoost || 1); e.poisonLv = Math.max(fx.poison || 0, 1); }
    if (fx.ice) { if (Math.random() < .3) e.frozen = Math.max(e.frozen || 0, 600); else e.st = Math.max(e.st || 0, 1500); }
    burst(e.x, e.y, _tankCrit ? "#FFD43B" : "#51CF66", 6);
    g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(fd), life: 1, color: _tankCrit ? "#FFD43B" : "#51CF66", big: _tankCrit });
    sfxHit();
    if (_pp.chain > 0 || fx.lightning) {
      const cMul2 = (_pp.chainDmg || 1) * (fx.lightning ? .58 : .3);
      const cd3 = fd * cMul2;
      g.ene.forEach(t => { if (t === e || t.hp <= 0) return; if (di(e, t) < 80) {
        t.hp -= cd3; addLtn(e.x, e.y, t.x, t.y, .7); burst(t.x, t.y, "#FAB005", 3);
        g.dn.push({ x: t.x, y: t.y - t.r, d: Math.floor(cd3), life: .7, color: "#FAB005" });
      } });
    }
  });
  g.crates.forEach(cr => { if (!crateActive(cr)) return; if (di(_pp, cr) < range) { cr.hits += 2; burst(cr.x, cr.y, "#FFD43B", 3);
    if (cr.hits >= cr.needed && cr.hp > 0) { cr.hp = 0; burst(cr.x, cr.y, "#FFD43B", cr.bigChest ? 20 : 12); sfx("chest");
      if (_isCoopMode) { _pp._inv = true; _pp._pickPending = true;
        if (_isP2 && !_p2AI && _net && _net.conn && _net.conn.open) {
          _sendP2Pick(cr);
        } else {
          var _pkCtx2 = _isP2 ? { player: _pp, inv: _pinv, charType: _pct } : null;
          if (cr.bigChest) { var _bcp = _isElite() ? 4 : 5; g._bigChestTotal = _bcp; g._bigChestLeft = _bcp; showPick("bigchest", null, _pkCtx2); }
          else { showPick("crate", null, _pkCtx2); }
        }
      }
      else { g.run = false;
        if (cr.bigChest) { var _bcp = _isElite() ? 4 : 5; g._bigChestTotal = _bcp; g._bigChestLeft = _bcp; showPick("bigchest"); }
        else { showPick("crate"); }
      }
    }
  } });
  if (!g[_atkRef]) g[_atkRef] = { active: false, startT: 0 }; g[_atkRef].active = true; g[_atkRef].startT = performance.now();
  for (let i = 0; i < 6; i++) {
    const a = atkAngle - arc + arc * 2 * i / 5;
    par.push({ x: _pp.x + Math.cos(a) * 15, y: _pp.y + Math.sin(a) * 15, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, life: .4, color: "#51CF66", sz: rn(2, 4) });
  }
  const baseQuakeR = range + 40;
  const baseQuakeDmg = _pp.atk * .5;
  g.ene.forEach(e => {
    if (e.hp <= 0) return;
    const qd2 = di(_pp, e);
    if (qd2 > range && qd2 <= baseQuakeR) {
      let bqd = baseQuakeDmg; if (e.boss) bqd = Math.min(bqd, 30);
      e.hp -= bqd; e.st = Math.max(e.st || 0, 400);
      burst(e.x, e.y, "#51CF66", 2);
    }
  });
  g._quakeRingT = now; g._quakeRingSmall = true;
  if (_pp._quake && (!_pp._quakeCD || now >= _pp._quakeCD)) {
    _pp._quakeCD = now + 3000;
    const qMul = [0, 1, 1.5, 2][_pp._quake] || 1;
    const qDmg = _pp.atk * 2 * qMul;
    g.ene.forEach(e => {
      if (e.hp <= 0) return;
      let qd = qDmg; if (e.boss) qd = Math.min(qd, 80);
      e.hp -= qd; e.st = Math.max(e.st || 0, 600);
      burst(e.x, e.y, "#FF922B", 6); burst(e.x, e.y, "#FFD43B", 3);
      g.dn.push({ x: e.x, y: e.y - e.r, d: Math.floor(qd), life: 1, color: "#FF922B", big: 1 });
    });
    g._quakeRingSmall = false;
    g._quakeRingT = now;
    setShake(.4, 6);
    sfx("ult");
    burst(_pp.x, _pp.y, "#FF922B", 30); burst(_pp.x, _pp.y, "#FFD43B", 15); burst(_pp.x, _pp.y, "#FF6B6B", 10);
    for (let i = 0; i < 12; i++) {
      const a = TAU * i / 12; par.push({ x: _pp.x + Math.cos(a) * rn(10, 30), y: _pp.y + Math.sin(a) * rn(10, 30), vx: Math.cos(a) * rn(2, 5), vy: Math.sin(a) * rn(2, 5) - 1, life: .7, color: i % 3 === 0 ? "#868E96" : i % 3 === 1 ? "#ADB5BD" : "#FF922B", sz: rn(3, 6), g: .15 });
    }
    g.dn.push({ x: _pp.x, y: _pp.y - 40, d: "🌋 地震波！", life: 2, color: "#FF922B", big: 1 });
    g.ultFlash = .4; g.ultType = "n";
  }
}

/* ═══ tapAtk: dispatch by character type ═══ */
export function tapAtk() {
  if (!g || !g.run || g.heatCD > 0) return;
  if (_net && _net.role === "client") return;
  const now = performance.now(); aim.tn = (aim.tn || 0) + 1; const el = now - (aim.lt || 0); aim.lt = now; const bonus = el < 180 ? Math.min(aim.tn * .5, 4) : 0; if (el > 360) aim.tn = 1;
  // 新角色在此添加分支，或使用 atkType 配置擴展
  if (g.charType === "swordsman") { swordSwing(); }
  else if (g.charType === "tank") { shieldBash(); }
  else { const berserkMul = (g.p.berserk && g.p.hp / g.p.maxHp < g.p.berserk) ? 2 : 1; fire((3.5 + g.p.atk + bonus) * berserkMul, g.ad.x, g.ad.y, .03); }
  if (!g.heatCD) $("combo").textContent = aim.tn > 2 ? aim.tn + "x COMBO!" : "";
  if (aim.tn > 0 && !g.p.hasBH && !g.p.hasTS) {
    const _comboPct = Math.min((aim.tn % 50) / 50, 1); const _prevUlt3 = g.ultCharge;
    g.ultCharge = Math.max(g.ultCharge, _comboPct * ULT_CHARGE_NEED);
    if (aim.tn % 50 === 0) { g.ultCharge = ULT_CHARGE_NEED; }
    if (_prevUlt3 < ULT_CHARGE_NEED && g.ultCharge >= ULT_CHARGE_NEED) g._ultReadyUntil = now + 1500;
  }
  clearTimeout(cTimer); cTimer = setTimeout(() => { if (!g.heatCD) { $("combo").textContent = ""; } aim.tn = 0; }, 700);
}
