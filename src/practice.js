/* ═══════════ PRACTICE MODE ═══════════ */
import { RC, CHAR, MODE } from "./config.js";
import { $, rn, cl } from "./utils.js";
import { C } from "./cards.js";
import { bgmStop } from "./audio.js";
import { SPAWN_R, ER } from "./config.js";
import { burst } from "./render.js";
import { spawn, setEnemiesPracticeMode, setEnemiesCoopMode } from "./enemies.js";
import { addCard } from "./cards-ui.js";
import { setStageBoss, triggerStageBoss, bossBgmStop } from "./boss.js";
import { setCombatCoopState } from "./combat.js";
import { setSkillsCoopState } from "./skills.js";
import { setBossCoopMode } from "./boss.js";
import {
  pracCoopRoom as _pracCoopRoom,
  pracCoopJoin as _pracCoopJoin
} from "./coop.js";

// ─── Module-local state ───────────────────────────────────────────────────────
let _practiceMode = false;
let _pracEnemySel = new Set();
let _pracCardSel = new Set();
let _pracCardLvs = {};
let _pracFiniteHp = false;

const _LV_COLORS = ["#51CF66", "#FFD43B", "#FF6B6B"];
const _LV_LABELS = ["Lv1", "Lv2", "Lv3"];

// ─── Dependency injections (set by initPractice) ─────────────────────────────
let _deps = {
  getG: () => null,
  getInv: () => [],
  getInv2: () => [],
  setInv2: () => {},
  getMode: () => "classic",
  getCharType: () => "gunner",
  setCharType: () => {},
  getIsCoopMode: () => false,
  setIsCoopMode: () => {},
  getP2AI: () => false,
  setP2AI: () => {},
  getNet: () => null,
  setNet: () => {},
  getP2Input: () => ({ dx: 0, dy: 0, a: 0, aimA: 0, aimDx: 0, aimDy: 0, ult: false, dodge: false, pick: -1 }),
  startGame: () => {},
  show: () => {},
};

export function initPractice(deps) {
  _deps = { ..._deps, ...deps };
}

// ─── Getters / setters (used by main.js game loop) ───────────────────────────
export function getPracticeMode() { return _practiceMode; }
export function setPracticeMode(v) { _practiceMode = v; }
export function getPracFiniteHp() { return _pracFiniteHp; }
export function setPracFiniteHp(v) { _pracFiniteHp = v; }

// ─── PRAC_ENEMIES definition ──────────────────────────────────────────────────
export const PRAC_ENEMIES = [
  { id: "small",     name: "小怪 ●",         emoji: "●",   tier: 0, boss: false, mega: false, desc: "基礎敵人，直線追擊" },
  { id: "tri",       name: "惡魔 ▲",         emoji: "▲",   tier: 1, boss: false, mega: false, desc: "Tier1 稍快稍硬" },
  { id: "sq",        name: "魔像 ◆",         emoji: "◆",   tier: 2, boss: false, mega: false, desc: "Tier2 更硬" },
  { id: "pent",      name: "長老 ⬠",         emoji: "⬠",   tier: 3, boss: false, mega: false, desc: "Tier3 高血高攻" },
  { id: "star",      name: "遠古 ★",         emoji: "★",   tier: 4, boss: false, mega: false, desc: "Tier4 最強小怪" },
  { id: "elite",     name: "精英怪",          emoji: "🔴",  tier: 2, boss: false, mega: false, elite: true, desc: "衝刺/護盾/震波 物理抗性 元素有效" },
  { id: "shield",    name: "盾兵 🛡️",        emoji: "🛡️", tier: 1, boss: false, mega: false, role: 5, desc: "正面擋75%傷害 需繞背攻擊" },
  { id: "shooter",   name: "射手 🎯",        emoji: "🎯",  tier: 1, boss: false, mega: false, role: 2, desc: "保持距離 發射遠程子彈" },
  { id: "dasher",    name: "衝刺者 💨",      emoji: "💨",  tier: 1, boss: false, mega: false, role: 3, desc: "蓄力後高速衝刺 有預警動作" },
  { id: "flanker",   name: "包圍者 🌀",      emoji: "🌀",  tier: 1, boss: false, mega: false, role: 1, desc: "環繞玩家軌道移動 逐漸逼近" },
  { id: "boss",      name: "小王 ⭐",        emoji: "⭐",  tier: 3, boss: true,  mega: false, desc: "隨機韌性/防禦 散射/召喚/彈幕技能 有DPS上限" },
  { id: "mega",      name: "巨王 👑",        emoji: "👑",  tier: 4, boss: true,  mega: true,  desc: "小王加強版 3倍體型 更高DPS上限" },
  { id: "poo",       name: "💩 中場Boss",    emoji: "💩",  stage: 20, desc: "護盾/散射/增生 半血狂暴召喚20便便 防禦型" },
  { id: "poo_rage",  name: "💩 中場Boss(狂暴)", emoji: "💩", stage: 20, pooRage: true, desc: "直接進入半血狂暴狀態" },
  { id: "devil1",    name: "😈 魔王 Phase1", emoji: "😈",  stage: 30, devilPhase: 1, desc: "彈幕+十字波" },
  { id: "devil2",    name: "😈 魔王 Phase2", emoji: "😈",  stage: 30, devilPhase: 2, desc: "惡魔交易+瞬移+小惡魔" },
  { id: "devil3",    name: "😈 魔王 Phase3", emoji: "😈",  stage: 30, devilPhase: 3, desc: "衝刺循環+暗黑脈衝" },
];

// ─── showCardTip ──────────────────────────────────────────────────────────────
export function showCardTip(cid) {
  const c = C.find(x => x.id === cid); if (!c) return;
  const RC2 = { R: "#74C0FC", SR: "#DA77F2", SSR: "#FFD43B" };
  const tp2 = c.tp === "atk" ? "攻擊" : "被動";
  const charLabel = c.charReq ? ({ gunner: "槍手專屬", swordsman: "劍士專屬", tank: "坦克專屬" }[c.charReq] || "") : "通用";
  $("ctEmoji").textContent = c.e;
  $("ctName").style.color = RC2[c.r] || "#fff";
  $("ctName").textContent = c.n;
  $("ctMeta").innerHTML = `<span style="color:${RC2[c.r]}">${c.r}</span> · ${tp2} · ${charLabel}${c.once ? " · 限定一次" : ""}`;
  let lvHtml = "";
  c.d.forEach((desc, i) => {
    const lvCol = i === 0 ? "#74C0FC" : i === 1 ? "#DA77F2" : "#FFD43B";
    lvHtml += `<div style="padding:4px 8px;margin:3px 0;border-radius:6px;background:rgba(255,255,255,.04);border-left:3px solid ${lvCol}">
      <span style="color:${lvCol};font-weight:900;font-size:10px">Lv.${i + 1}</span>
      <span style="color:rgba(255,255,255,.7);margin-left:6px">${desc}</span></div>`;
  });
  $("ctLevels").innerHTML = lvHtml;
  $("cardTip").style.display = "flex";
}

// ─── Panel helpers ────────────────────────────────────────────────────────────
export function pracCloseOnBlank() {
  $("pracCards").style.display = "none"; $("pracEnemies").style.display = "none"; $("pracStats").style.display = "none";
  $("pracBackdrop").style.display = "none";
}

export function pracTogglePanel(which) {
  const cards = $("pracCards"), ene = $("pracEnemies"), stats = $("pracStats");
  const panels = { cards, enemies: ene, stats };
  const target = panels[which]; if (!target) return;
  const isOpen = target.style.display !== "none";
  cards.style.display = "none"; ene.style.display = "none"; stats.style.display = "none";
  if (!isOpen) { target.style.display = "block"; $("pracBackdrop").style.display = "block"; if (which === "stats") pracRefreshStats(); }
  else { $("pracBackdrop").style.display = "none"; }
}

// ─── Stats panel ──────────────────────────────────────────────────────────────
export function pracRefreshStats() {
  const g = _deps.getG(); if (!g) return;
  const p = g.p, s = $("pracStats");
  let h = '<div style="color:#74C0FC;font-weight:900;font-size:12px;margin-bottom:6px">🧙 主角能力值</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;margin-bottom:8px">';
  const ps = [
    ["攻擊力", Math.round(p.atk)], ["射速", Math.round(1000 / (115 * (p.fr || 1))) + "發/秒"],
    ["分裂", p.split || 1], ["穿透", p.pierce || 0],
    ["暴擊率", Math.round((p.crit || .05) * 100) + "%"], ["護甲", Math.round((p.armor || 0) * 100) + "%"],
    ["閃避", Math.round((p.dodge || 0) * 100) + "%"], ["移速", p.speed?.toFixed(1)],
    ["緩速", p.slow < 1 ? Math.round((1 - p.slow) * 100) + "%" : "無"], ["吸血", p.ls || 0],
    ["回復", p.regen?.toFixed(1) || 0], ["復活", p.revive || 0],
    ["反刺", p.thorns ? Math.round(p.thorns * 100) + "%" : "無"], ["元素倍率", p.elemBoost?.toFixed(1) || 1],
    ["Boss傷", p.bossDmg?.toFixed(1) || 1], ["等級傷害", ((p.levelDmgMul || 1) * 100 - 100).toFixed(0) + "%"],
    ["風刃", p.windBlades || 0], ["召喚球", p.orbiters || 0],
    ["迴力鏢", p.boomerang || 0], ["機關槍Lv", p._minigun || 0],
    ["破甲加成", p.armorCapBonus ? "+" + Math.round(p.armorCapBonus * 100) + "%" : "無"],
    ["燃燒倍率", p.burnBoost?.toFixed(1) || 1],
  ];
  ps.forEach(([k, v]) => { h += `<div style="display:flex;justify-content:space-between;padding:1px 0"><span style="color:rgba(255,255,255,.5)">${k}</span><span style="color:#fff;font-weight:700">${v}</span></div>`; });
  h += '</div>';
  const fx = p.fx || {};
  const elems = Object.entries(fx).filter(([, v]) => v > 0).map(([k, v]) => k + "Lv" + v);
  h += `<div style="color:rgba(255,255,255,.5);margin-bottom:6px">元素：${elems.length ? elems.join(" / ") : "無"}</div>`;
  // 判斷是否精英模式
  const _mode = _deps.getMode();
  const isElite = _mode === "elite" || _mode === "coop";
  if (g.ene.length > 0) {
    h += '<div style="color:#FF6B6B;font-weight:900;font-size:12px;margin:6px 0 4px">👾 場上敵人</div>';
    const angelMul = g.p._angelBuff ? 1.6 : 1;
    const acm = 1 + (g.p.armorCapBonus || 0);
    g.ene.forEach((e, i) => {
      if (i > 8) { if (i === 9) h += '<div style="color:rgba(255,255,255,.3)">...還有' + (g.ene.length - 9) + '個</div>'; return; }
      const type = e.stageBoss ? "Stage Boss" : e.ragePoo ? "狂暴便便" : e.miniPoo ? "增生便便" : e.miniDemon ? "小惡魔" : e.eliteEnemy ? "精英怪" : e.boss ? (e.mega ? "巨王" : "小王") : "小怪";
      const hpPct = e.mhp > 99999 ? "--" : Math.round(e.hp / e.mhp * 100) + "%";
      const hpStr = e.mhp > 99999 ? "INF" : Math.round(e.hp) + "/" + e.mhp;
      let capStr = "--";
      if (e.boss && isElite) {
        const armMul = e.bossType === "armor" ? acm : 1;
        let cap;
        if (e.stageBoss === 20) cap = e.mhp / 120 * angelMul * armMul;
        else if (e.stageBoss === 30) cap = e.mhp / 180 * angelMul * armMul;
        else cap = e.mhp / (e.mega ? 30 : 15) * angelMul * armMul;
        capStr = Math.round(cap) + "/秒";
      }
      const def = e.bossType === "armor" ? "🛡️防禦" : e.bossType === "tough" ? "💪韌性" : "--";
      let abilities = [];
      if (e.stageBoss === 20) abilities = ["環形散射", "召喚增生", "護盾(普攻無效)", "半血狂暴(20便便)"];
      else if (e.stageBoss === 30) { const ph = e.sbPhase || 1; abilities = ["Phase" + ph, "暗影彈幕"]; if (ph >= 2) abilities.push("十字波", "瞬移+抖動", "小惡魔", "惡魔交易"); if (ph >= 3) abilities.push("無預警瞬移", "暗黑脈衝"); }
      else if (e.eliteEnemy) abilities = ["衝刺突進", "能量護盾", "範圍震波", "物理抗性"];
      else if (e.ragePoo) abilities = ["不可摧毀", "撞擊扣1/3血"];
      else if (e.miniDemon) abilities = ["瞬移追擊", e.bossType === "armor" ? "防禦型" : "韌性型"];
      else { const r = e.role; if (r === 5) abilities = ["正面擋75%傷害"]; if (r === 2) abilities = ["遠程射擊"]; if (r === 3) abilities = ["蓄力衝刺"]; if (r === 1) abilities = ["環繞軌道"]; }
      if (e.boss && !e.stageBoss && !e.miniPoo && !e.miniDemon) abilities.push("散射", "召喚", "彈幕");
      const abilStr = abilities.length ? abilities.join(" / ") : "無";
      h += `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="display:flex;justify-content:space-between"><span style="color:rgba(255,255,255,.8)">${type}</span><span style="color:#FF6B6B">${hpStr} <span style="color:rgba(255,255,255,.3)">(${hpPct})</span></span></div>
        <div style="display:flex;gap:10px;color:rgba(255,255,255,.45);font-size:9px"><span>DPS上限: ${capStr}</span><span>防禦: ${def}</span></div>
        <div style="color:rgba(255,255,255,.35);font-size:8px;margin-top:1px">能力: ${abilStr}</div>
      </div>`;
    });
  } else {
    h += '<div style="color:rgba(255,255,255,.3);margin-top:6px">場上無敵人</div>';
  }
  s.innerHTML = h;
}

// ─── Card UI ──────────────────────────────────────────────────────────────────
export function pracCycleCard(cid) {
  const cur = _pracCardLvs[cid];
  if (cur === undefined) _pracCardLvs[cid] = 0;
  else if (cur === 0) _pracCardLvs[cid] = 1;
  else if (cur === 1) _pracCardLvs[cid] = 2;
  else delete _pracCardLvs[cid];
  pracRebuildCards();
  pracUpdateCardUI(cid);
}

export function pracUpdateCardUI(cid) {
  const el = $("prc_" + cid); if (!el) return;
  const badge = el.querySelector(".pracLvBadge");
  const lv = _pracCardLvs[cid];
  if (lv === undefined) {
    badge.textContent = ""; badge.style.background = "transparent";
    el.style.background = "rgba(255,255,255,.03)"; el.style.opacity = "1";
  } else {
    badge.textContent = _LV_LABELS[lv]; badge.style.background = _LV_COLORS[lv]; badge.style.color = "#000";
    el.style.background = "rgba(255,255,255,.08)";
  }
}

export function pracRebuildCards() {
  const g = _deps.getG(); const inv = _deps.getInv();
  inv.length = 0;
  const _mode = _deps.getMode();
  const MC = MODE[_mode]; const CC = CHAR[g.charType] || CHAR.gunner;
  g.p.atk = CC.startAtk; g.p.fr = CC.fr; g.p.armor = CC.armor; g.p.crit = CC.crit; g.p.dodge = CC.dodge;
  g.p.chain = 0; g.p.ls = 0; g.p.slow = 1; g.p.split = 1; g.p.revive = 0; g.p.fx = {}; g.p.regen = 0;
  g.p.thorns = 0; g.p.dblAtk = 0; g.p.windBlades = 0; g.p.orbiters = 0; g.p.poison = 0; g.p.pierce = 0;
  g.p.homing = 0; g.p.homingR = 200; g.p.splash = 0; g.p.berserk = 0; g.p.deathBoom = 0; g.p.dodgeAtk = 0;
  g.p.elemBoost = 1; g.p.ultDmgMul = 1; g.p.ultRate = 1; g.p.bulletHeal = 0; g.p.bossDmg = 1; g.p.mobDmg = 1;
  g.p.hasBH = false; g.p.hasTS = false; g.p.projImmune = false; g.p.boomerang = 0;
  g.p._minigun = 0; g.p._noOverheat = false; g.p._minigunBerserk = false;
  g.p.armorCapBonus = 0; g.p.burnBoost = 1; g.p.chainDmg = 1; g.p.poisonDmg = 0; g.p.poisonBossMul = 1;
  g.p.shieldCD = 0; g.p._sh = false; g.p.lStep = false;
  g.p.invCD = 0; g.p.invDur = 0; g.p._inv = false; g.p._invEnd = 0; g.p.contactCap = 100;
  g.p._ghostSlash = 0; g.p._qiEvery = 0; g.p._qiMul = 0; g.p._drawSlash = 0; g.p._bleedChance = 0;
  g.p._quake = 0; g.p._ironWill = 0; g.p._guardAura = 0; g.p._lightSaber = false; g.p._dragonBreath = 0;
  Object.entries(_pracCardLvs).forEach(([cid, targetLv]) => {
    const cd = C.find(c => c.id === +cid); if (!cd) return;
    for (let l = 0; l <= targetLv; l++) {
      addCard(+cid);
      cd.ap[Math.min(l, 2)](g.p);
    }
  });
  if (_pracFiniteHp) { g.p.hp = 200; g.p.maxHp = 200; } else { g.p.hp = 99999; g.p.maxHp = 99999; }
  g.p.expR = 99;
  g._wb = []; g._wbSpawnT = 0; g._booms = []; g._boomCD = 0;
  if ($("pracStats").style.display !== "none") pracRefreshStats();
}

// ─── Enemy toggle / spawn / clear ─────────────────────────────────────────────
export function pracToggleEnemy(eid, on) { if (on) _pracEnemySel.add(eid); else _pracEnemySel.delete(eid); }

export function pracSpawn() {
  const g = _deps.getG();
  if (!g || !_practiceMode) return;
  const _mode = _deps.getMode();
  _pracEnemySel.forEach(eid => {
    const pe = PRAC_ENEMIES.find(p => p.id === eid); if (!pe) return;
    if (pe.stage) {
      if (!g._stageBossActive) {
        g._pracBossSetup = null;
        if (pe.devilPhase || pe.pooRage) {
          g._pracBossSetup = { devilPhase: pe.devilPhase || 0, pooRage: !!pe.pooRage };
        }
        triggerStageBoss(pe.stage);
      }
      return;
    }
    const opts = {};
    if (pe.role) opts.role = pe.role;
    if (pe.tier) opts.tier = pe.tier;
    if (pe.elite) {
      const eMC = MODE.elite, w = g.wave;
      const hp = Math.floor(eMC.eliteHpBase + w * eMC.eliteHpPerWave);
      const a = rn(0, Math.PI * 2), d = SPAWN_R + rn(0, 80);
      let x = g.p.x + Math.cos(a) * d, y = g.p.y + Math.sin(a) * d;
      x = cl(x, 20, (MODE[_mode].mapW || 4000) - 20); y = cl(y, 20, (MODE[_mode].mapH || 4000) - 20);
      g.ene.push({ x, y, hp, mhp: hp, speed: 1.5, color: "#E74C3C", t: rn(0, 10), r: ER * 1.3, st: 0, boss: false, mega: false, tier: pe.tier, face: 1, xp: 20, poisonT: 0, frozen: 0, burnT: 0, burnLv: 0, poisonLv: 0, dmgMul: 1.5, eliteEnemy: true, _eDashCD: 0, _eShieldEnd: 0, _eShockCD: 0, role: 0, flankA: rn(0, Math.PI * 2), shootCD: 0, dashState: 0, dashTimer: 0, dashDx: 0, dashDy: 0, shieldAng: 0, bossSkillCD: 0, bossSkill: 0, bossType: "" });
    } else {
      spawn(pe.boss, { mega: pe.mega, tier: pe.tier, ...opts });
    }
  });
}

export function pracClear() {
  const g = _deps.getG(); if (!g) return;
  g.ene.forEach(e => burst(e.x, e.y, e.color, 5));
  g.ene = []; g.ebul = []; g.bul = []; setStageBoss(null); g._stageBossActive = false;
  if (!_pracFiniteHp) g.p.hp = 99999;
}

// ─── HP toggle ────────────────────────────────────────────────────────────────
export function pracToggleHp() {
  const g = _deps.getG();
  if (!g || !_practiceMode) return;
  _pracFiniteHp = !_pracFiniteHp;
  if (_pracFiniteHp) { g.p.hp = 200; g.p.maxHp = 200; }
  else { g.p.hp = 99999; g.p.maxHp = 99999; }
  $("pracHpBtn").textContent = _pracFiniteHp ? "❤️血量200" : "❤️無限血量";
  $("pracHpBtn").style.background = _pracFiniteHp ? "rgba(81,207,102,.2)" : "rgba(255,107,107,.2)";
  $("pracHpBtn").style.color = _pracFiniteHp ? "#51CF66" : "#FF6B6B";
  $("pracHpBtn").style.borderColor = _pracFiniteHp ? "rgba(81,207,102,.3)" : "rgba(255,107,107,.3)";
}

// ─── Exit practice ────────────────────────────────────────────────────────────
export function exitPractice() {
  pracClear();
  _practiceMode = false; setEnemiesPracticeMode(false); _pracFiniteHp = false;
  const g = _deps.getG();
  if (g) g.run = false;
  bgmStop(); bossBgmStop();
  const dov = document.getElementById("_demonDealOv"); if (dov && dov.parentNode) dov.parentNode.removeChild(dov);
  $("practiceOv").style.display = "none";
  $("pracCards").style.display = "none";
  $("pracEnemies").style.display = "none";
  $("pracStats").style.display = "none";
  _deps.show("title");
  const _net = _deps.getNet();
  _deps.setIsCoopMode(false); setEnemiesCoopMode(false); setCombatCoopState(false, _net, false); setSkillsCoopState(false, _net); setBossCoopMode(false); _deps.setP2AI(false);
  if (_net && _net.peer) { _net.peer.destroy(); _deps.setNet(null); }
}

// ─── Switch character ─────────────────────────────────────────────────────────
export function pracSwitchChar() {
  const g = _deps.getG();
  const chars = ["gunner", "swordsman", "tank"];
  const names = { "gunner": "🔫槍手", "swordsman": "⚔️劍士", "tank": "🛡️坦克" };
  const cur = g ? g.charType : _deps.getCharType();
  const idx = (chars.indexOf(cur) + 1) % 3;
  const next = chars[idx];
  _deps.setCharType(next);
  if (g) {
    g.charType = next;
    const CC = CHAR[next];
    g.p.speed = CC.startSpeed; g.p.armor = CC.armor; g.p.dodge = CC.dodge; g.p.crit = CC.crit; g.p.fr = CC.fr;
  }
  $("pracCharBtn").textContent = "🔄" + names[next];
  g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "切換：" + names[next], life: 2, color: "#FFD43B", big: 1 });
  openPractice._rebuildCards && openPractice._rebuildCards();
}

// ─── Toggle coop ──────────────────────────────────────────────────────────────
export function pracToggleCoop() {
  const g = _deps.getG();
  let _isCoopMode = _deps.getIsCoopMode();
  _isCoopMode = !_isCoopMode;
  _deps.setIsCoopMode(_isCoopMode);
  const _net = _deps.getNet();
  const _p2AI = _isCoopMode;
  _deps.setP2AI(_p2AI);
  setEnemiesCoopMode(_isCoopMode); setCombatCoopState(_isCoopMode, _net, _p2AI); setSkillsCoopState(_isCoopMode, _net); setBossCoopMode(_isCoopMode);
  const btn = $("pracCoopBtn"), rbtn = $("pracRoomBtn");
  if (_isCoopMode) {
    btn.textContent = "🤝雙人(ON)"; btn.style.background = "rgba(240,101,149,.4)"; btn.style.color = "#fff";
    rbtn.style.display = "inline-block"; $("pracJoinBtn").style.display = "inline-block";
    $("pracP2CharBtn").style.display = "inline-block";
    if (g && !g.p2) {
      const _mode = _deps.getMode();
      const MC = MODE[_mode];
      const inv2 = _deps.getInv2();
      g.p2 = { charType: "gunner", x: g.p.x + 50, y: g.p.y, hp: 99999, maxHp: 99999, atk: 30, speed: MC.startSpeed || 5, fr: 1, armor: 0, chain: 0, ls: 0, slow: 1, split: 1, expR: 99, crit: .05, revive: 0, fx: {}, regen: 0, expMul: 1, luck: 0, dodge: 0, thorns: 0, dblAtk: 0, shieldCD: 0, _sh: false, _shT: 0, _shSpawn: 0, whirlCount: 0, whirlLv: 0, orbiters: 0, poison: 0, hasBH: false, hasTS: false, ultLv: 0, pierce: 0, homing: 0, homingR: 200, splash: 0, berserk: 0, deathBoom: 0, dodgeAtk: 0, elemBoost: 1, ultDmgMul: 1, ultRate: 1, bulletHeal: 0, invCD: 0, invDur: 0, _inv: false, _ivT: 0, timestop: 0, tsD: 0, tsFrzDur: 0, tsCd: 0, lStep: false, lStepDur: 0, lStepSpd: 0, lStepCd: 0, _dashEnd: 0, _dashDx: 0, _dashDy: 0, _dashSpd: 0, _dashGT: 0, chainDmg: 1, poisonDmg: 0, bossDmg: 1, mobDmg: 1, poisonBossMul: 1, burnBoost: 1, crateVis: 1, mapExpand: 0, pickCount: 2, face: -1, _iFrameEnd: 0, _healFlash: 0, heavyEvery: 0, _heavyCount: 0, ultCdReduce: 0, _downed: false, _rescueTimer: 0, _downedTime: 0, _pickPending: false, contactCap: 100, _dodgeCD: 0, _mgFireT: 0, _mgBerserkEnd: 0, levelDmgMul: 1, armorCapBonus: 0, _swordQiCount: 0, _tauntAtkEnd: 0, _tauntAtkBonus: 0, iceFrag: 0 };
      g.p._downed = false; g.p._rescueTimer = 0;
      inv2.length = 0; g.p2Level = 1; g.p2Exp = 0; g.p2ExpTo = 100;
    }
  } else {
    btn.textContent = "🤝雙人(AI)"; btn.style.background = "rgba(240,101,149,.15)"; btn.style.color = "#F06595";
    rbtn.style.display = "none"; $("pracJoinBtn").style.display = "none";
    $("pracP2CharBtn").style.display = "none";
    _deps.setP2AI(false);
    if (g) g.p2 = null;
    const _netCur = _deps.getNet();
    if (_netCur && _netCur.peer) { _netCur.peer.destroy(); _deps.setNet(null); }
  }
}

// ─── P2 AI char cycle ─────────────────────────────────────────────────────────
export function pracCycleP2Char() {
  const g = _deps.getG();
  if (!g || !g.p2) return;
  const types = ["gunner", "swordsman", "tank"];
  const names = { gunner: "槍手", swordsman: "劍士", tank: "坦克" };
  const icons = { gunner: "🔫", swordsman: "⚔️", tank: "🛡️" };
  const cur = g.p2.charType || "gunner";
  const next = types[(types.indexOf(cur) + 1) % 3];
  g.p2.charType = next;
  const CC = CHAR[next];
  g.p2.hp = CC.startHp; g.p2.maxHp = CC.startHp; g.p2.atk = CC.startAtk; g.p2.speed = CC.startSpeed; g.p2.armor = CC.armor; g.p2.dodge = CC.dodge; g.p2.crit = CC.crit; g.p2.fr = CC.fr;
  $("pracP2CharBtn").textContent = icons[next] + "AI:" + names[next];
  g.dn.push({ x: g.p2.x, y: g.p2.y - 40, d: "AI切換：" + names[next], life: 2, color: "#F06595", big: 1 });
}

// ─── Coop room / join wrappers ────────────────────────────────────────────────
export function pracCoopRoom() {
  _pracCoopRoom({
    isCoopMode: () => _deps.getIsCoopMode(),
    getG: () => _deps.getG(),
    getNet: () => _deps.getNet(),
    setNet: (n) => { _deps.setNet(n); },
    getP2AI: () => _deps.getP2AI(),
    setP2AI: (v) => { _deps.setP2AI(v); },
    getP2Input: () => _deps.getP2Input()
  });
}

export function pracCoopJoin() {
  _pracCoopJoin({
    isCoopMode: () => _deps.getIsCoopMode(),
    getG: () => _deps.getG(),
    getNet: () => _deps.getNet(),
    setNet: (n) => { _deps.setNet(n); },
    getP2AI: () => _deps.getP2AI(),
    setP2AI: (v) => { _deps.setP2AI(v); }
  });
}

// ─── openPractice ─────────────────────────────────────────────────────────────
export function openPractice() {
  _practiceMode = true; setEnemiesPracticeMode(true); _pracFiniteHp = false; _pracEnemySel.clear(); _pracCardLvs = {};
  _deps.startGame("elite");
  const g = _deps.getG();
  g.p.hp = 99999; g.p.maxHp = 99999; g.level = 12; g.wave = 12; g.p.atk = 30;
  requestAnimationFrame(() => {
    $("practiceOv").style.display = "block";
    const hb = $("pracHpBtn"); hb.textContent = "❤️無限血量"; hb.style.background = "rgba(255,107,107,.2)"; hb.style.color = "#FF6B6B"; hb.style.borderColor = "rgba(255,107,107,.3)";
  });
  // 建立卡片列表
  function _buildPracCards() {
    const cc2 = $("pracCards");
    let h2 = '<div style="color:#FFD43B;font-weight:900;font-size:11px;text-align:center;padding:4px 0;position:sticky;top:0;background:rgba(10,10,24,.95);z-index:1">🃏 卡片（點擊切換 / 長按說明）</div>';
    const g2 = _deps.getG();
    const _pct = g2 ? g2.charType : (_deps.getCharType() || "gunner");
    C.filter(c => !c.charReq || c.charReq === _pct).forEach(c => {
      h2 += `<div id="prc_${c.id}" onclick="pracCycleCard(${c.id})" oncontextmenu="event.preventDefault();showCardTip(${c.id})" data-cid="${c.id}" style="display:flex;align-items:center;gap:3px;padding:3px 4px;margin:1px 0;border-radius:4px;background:rgba(255,255,255,.03);cursor:pointer;border:1px solid ${RC[c.r]}20;color:${RC[c.r]};user-select:none;-webkit-user-select:none">
        <span style="font-size:12px">${c.e}</span>
        <span style="font-size:8px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.n}</span>
        <span class="pracLvBadge" style="font-size:8px;font-weight:900;min-width:24px;text-align:center;border-radius:3px;padding:1px 3px"></span>
      </div>`;
    });
    cc2.innerHTML = h2;
    cc2.querySelectorAll('[data-cid]').forEach(el => {
      let _lpT = 0;
      el.addEventListener('touchstart', e => { _lpT = setTimeout(() => { e.preventDefault(); showCardTip(parseInt(el.dataset.cid)); }, 500); }, { passive: false });
      el.addEventListener('touchend', () => clearTimeout(_lpT));
      el.addEventListener('touchmove', () => clearTimeout(_lpT));
    });
  }
  _buildPracCards();
  openPractice._rebuildCards = _buildPracCards;
  // 建立敵人列表
  const ec = $("pracEnemies");
  let ehtml = '<div style="color:#FF6B6B;font-weight:900;font-size:11px;text-align:center;padding:4px 0;position:sticky;top:0;background:rgba(10,10,24,.95);z-index:1">👾 敵人（勾選後按出怪）</div>';
  PRAC_ENEMIES.forEach(pe => {
    ehtml += `<label style="display:flex;align-items:start;gap:3px;padding:4px;margin:2px 0;border-radius:5px;background:rgba(255,255,255,.04);cursor:pointer;color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.06)">
      <input type="checkbox" data-eid="${pe.id}" onchange="pracToggleEnemy('${pe.id}',this.checked)" style="margin:2px 0 0;width:13px;height:13px;flex-shrink:0">
      <div><div style="font-size:10px">${pe.emoji} ${pe.name}</div><div style="font-size:8px;color:rgba(255,255,255,.4);line-height:1.3;margin-top:1px">${pe.desc}</div></div></label>`;
  });
  ec.innerHTML = ehtml;
}

// ─── Assign all functions to window (for HTML inline handlers) ────────────────
export function bindPracticeToWindow() {
  window.pracCloseOnBlank = pracCloseOnBlank;
  window.pracTogglePanel = pracTogglePanel;
  window.pracRefreshStats = pracRefreshStats;
  window.pracCycleCard = pracCycleCard;
  window.pracUpdateCardUI = pracUpdateCardUI;
  window.pracRebuildCards = pracRebuildCards;
  window.pracToggleEnemy = pracToggleEnemy;
  window.pracSpawn = pracSpawn;
  window.pracClear = pracClear;
  window.pracToggleHp = pracToggleHp;
  window.exitPractice = exitPractice;
  window.pracSwitchChar = pracSwitchChar;
  window.pracToggleCoop = pracToggleCoop;
  window.pracCycleP2Char = pracCycleP2Char;
  window.pracCoopRoom = pracCoopRoom;
  window.pracCoopJoin = pracCoopJoin;
  window.openPractice = openPractice;
  window.showCardTip = showCardTip;
}
