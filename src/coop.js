/* ═══ coop.js — PeerJS 連線、狀態同步 ═══ */
import { Peer } from "peerjs";
import { $ } from "./utils.js";
import { CHAR } from "./config.js";
import { C } from "./cards.js";
import { par, filterPar, setPar, drawPlayer, drawEnemy } from "./render.js";
import { drawMinimap } from "./hud.js";
import { setEnemiesCoopMode } from "./enemies.js";
import { setCombatCoopState } from "./combat.js";
import { setSkillsCoopState, getP2SkillCdEnd, getDashGhosts, setDashGhosts } from "./skills.js";
import { setBossCoopMode } from "./boss.js";

// ── module-level deps injected via initCoop ──
let _g = null;        // getter: ()=>g
let _setIsCoopMode = null; // setter in main
let _getIsCoopMode = null; // getter in main
let _setNet = null;
let _getNet = null;
let _setP2AI = null;
let _getP2AI = null;
let _getP2Input = null;
let _getInv2 = null;
let _setInv2 = null;
let _isElite = null;
let _showOver = null;
let _startGame = null;
let _showFn = null;    // show(name) in main
let _cam = null;
let _PR = 10;   // player radius constant
let _BR = 4;    // bullet radius
let _VW = 400;
let _VH = 700;
let _setPendingMode = null;
let _cx = null;       // canvas 2d context getter
let _aim = null;
let _ULT_CHARGE_NEED = 100;
let _CHAR = null;
let _burst = null;

export function initCoop(deps) {
  _g = deps.getG;
  _setIsCoopMode = deps.setIsCoopMode;
  _getIsCoopMode = deps.getIsCoopMode;
  _setNet = deps.setNet;
  _getNet = deps.getNet;
  _setP2AI = deps.setP2AI;
  _getP2AI = deps.getP2AI;
  _getP2Input = deps.getP2Input;
  _getInv2 = deps.getInv2;
  _setInv2 = deps.setInv2;
  _isElite = deps.isElite;
  _showOver = deps.showOver;
  _startGame = deps.startGame;
  _showFn = deps.show;
  _cam = deps.cam;
  _PR = deps.PR || 10;
  _BR = deps.BR || 4;
  _setPendingMode = deps.setPendingMode;
  _cx = deps.getCx;
  _aim = deps.aim;
  _ULT_CHARGE_NEED = deps.ULT_CHARGE_NEED || 100;
  _CHAR = deps.CHAR;
  _burst = deps.burst;
}

export function setCoopVW(w) { _VW = w; }
export function setCoopVH(h) { _VH = h; }

/* ═══ PeerJS ICE config — STUN + TURN 確保 NAT 穿透 ═══ */
const _ICE_CFG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
  ]
};
const _PEER_OPTS = { debug: 0, config: _ICE_CFG };

/* ═══ Co-op Lobby ═══ */
export function _coopGenCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.random() * c.length | 0];
  return s;
}

export function showCoopLobby() {
  _showFn("title");
  $("titleOv").style.display = "none";
  $("coopOv").style.display = "flex";
  $("coopMenu").style.display = "block";
  $("coopCreate").style.display = "none";
  $("coopJoin").style.display = "none";
  $("coopStatus").style.display = "none";
  $("coopConnected").style.display = "none";
  const net = _getNet();
  if (net && net.peer) { net.peer.destroy(); _setNet(null); }
}

export function coopShowCreate() {
  $("coopMenu").style.display = "none";
  $("coopCreate").style.display = "block";
  $("coopJoin").style.display = "none";
  $("coopHostCode").value = "";
}

export function coopShowJoin() {
  $("coopMenu").style.display = "none";
  $("coopCreate").style.display = "none";
  $("coopJoin").style.display = "block";
  $("coopCodeInput").value = "";
}

export function coopCreateCustom() {
  const code = ($("coopHostCode").value || "").trim();
  if (code.length < 2) { $("coopHostCode").style.borderColor = "#FF6B6B"; return; }
  _coopDoCreate(code);
}

export function coopBack() {
  const net = _getNet();
  if (net && net.peer) { net.peer.destroy(); _setNet(null); }
  _setIsCoopMode(false);
  setEnemiesCoopMode(false);
  setCombatCoopState(false, null, _getP2AI());
  setSkillsCoopState(false, null);
  setBossCoopMode(false);
  _setInv2([]);
  $("coopOv").style.display = "none";
  $("titleOv").style.display = "flex";
}

export function coopCreateRoom() { _coopDoCreate(_coopGenCode()); }

export function _coopDoCreate(code) {
  $("coopMenu").style.display = "none";
  $("coopCreate").style.display = "none";
  $("coopStatus").style.display = "block";
  $("coopRoomDisplay").textContent = code;
  $("coopStatusText").textContent = "等待對方加入...";
  $("coopConnected").style.display = "none";
  const peer = new Peer(code, _PEER_OPTS);
  const netObj = { role: "host", peer, conn: null, roomCode: code, connected: false };
  _setNet(netObj);
  peer.on("open", () => { $("coopStatusText").textContent = "房間已建立，等待對方加入..."; });
  peer.on("connection", conn => {
    netObj.conn = conn;
    conn.on("open", () => {
      netObj.connected = true;
      $("coopStatusText").textContent = "對方已連線！";
      $("coopConnected").style.display = "block";
      conn.on("data", data => {
        if (!data) return;
        const p2i = _getP2Input();
        if (data.t === "inp") { p2i.dx = data.jx || 0; p2i.dy = data.jy || 0; p2i.a = data.ja || 0; p2i.aimA = data.aa || 0; p2i.aimDx = data.ax || 0; p2i.aimDy = data.ay || 0; p2i.ult = !!data.ult; p2i.dodge = !!data.dodge; p2i.pick = data.pick ?? -1; p2i.skill = !!data.skill; }
        if (data.t === "p2picked" && data.cardId) { _applyP2Card(data.cardId); }
        if (data.t === "p2reroll" && data.idx !== undefined) { _handleP2Reroll(data.idx); }
        if (data.t === "p2char" && data.charType) {
          const g = _g();
          if (g && g.p2) {
            g.p2.charType = data.charType;
            const CC2 = (_CHAR || CHAR)[data.charType] || (_CHAR || CHAR).gunner;
            g.p2.hp = CC2.startHp; g.p2.maxHp = CC2.startHp; g.p2.atk = CC2.startAtk;
            g.p2.speed = CC2.startSpeed; g.p2.armor = CC2.armor; g.p2.dodge = CC2.dodge; g.p2.crit = CC2.crit; g.p2.fr = CC2.fr;
          }
        }
      });
      conn.on("close", () => { netObj.connected = false; const g = _g(); if (g && g.run) { g.run = false; _showOver(); } });
    });
  });
  peer.on("error", err => {
    if (err.type === "unavailable-id") {
      $("coopStatusText").textContent = "❌ 此密碼已被使用，請換一個";
      $("coopConnected").style.display = "none";
      setTimeout(() => { $("coopMenu").style.display = "block"; $("coopStatus").style.display = "none"; $("coopCreate").style.display = "none"; $("coopJoin").style.display = "none"; }, 2000);
    } else { $("coopStatusText").textContent = "錯誤：" + err.type; }
  });
}

export function coopJoinRoom() {
  const code = ($("coopCodeInput").value || "").toUpperCase().trim();
  if (code.length < 4) { $("coopCodeInput").style.borderColor = "#FF6B6B"; return; }
  $("coopMenu").style.display = "none";
  $("coopStatus").style.display = "block";
  $("coopRoomDisplay").textContent = code;
  $("coopStatusText").textContent = "連線中...";
  $("coopConnected").style.display = "none";
  const peer = new Peer(undefined, _PEER_OPTS);
  const netObj = { role: "client", peer, conn: null, roomCode: code, connected: false };
  _setNet(netObj);
  peer.on("open", () => {
    const conn = peer.connect(code, { reliable: true });
    netObj.conn = conn;
    conn.on("open", () => {
      netObj.connected = true;
      $("coopStatusText").textContent = "已連線！等待 Host 開始...";
      $("coopConnected").style.display = "block";
      $("coopStartBtn").style.display = "none"; // Client 不能按開始
      conn.on("data", data => {
        if (!data) return;
        if (data.t === "start") {
          // CLIENT 收到開始：也選角色後開始
          _setIsCoopMode(true); setEnemiesCoopMode(true); setCombatCoopState(true, netObj, _getP2AI()); setSkillsCoopState(true, netObj); setBossCoopMode(true); _setPendingMode("coop");
          $("coopOv").style.display = "none";
          $("charSelectOv").style.display = "flex";
        }
        if (data.t === "state") { const g = _g(); if (g) applyCoopState(data); }
        if (data.t === "p2pick") { const g = _g(); if (g) showCoopPick(data); }
        if (data.t === "over") { const g = _g(); if (g) { g.run = false; _showOver(); } }
      });
      conn.on("close", () => { netObj.connected = false; const g = _g(); if (g && g.run) { g.run = false; _showOver(); } });
    });
    conn.on("error", err => {
      $("coopStatusText").textContent = "連線失敗：" + err.type;
      setTimeout(() => { $("coopMenu").style.display = "block"; $("coopStatus").style.display = "none"; $("coopJoin").style.display = "none"; }, 2000);
    });
  });
  peer.on("error", err => { $("coopStatusText").textContent = "錯誤：" + err.type; });
}

export function coopStart() {
  const net = _getNet();
  _setIsCoopMode(true); setEnemiesCoopMode(true); setCombatCoopState(true, net, _getP2AI()); setSkillsCoopState(true, net); setBossCoopMode(true);
  $("coopOv").style.display = "none";
  // 先選角色再開始
  _setPendingMode("coop");
  $("charSelectOv").style.display = "flex";
}

// 原始 coopStart 邏輯（pickChar 後呼叫）
export function _coopStartReal(charType) {
  const net = _getNet();
  if (net && net.role === "host" && net.conn && net.connected) {
    net.conn.send({ t: "start", hostChar: charType });
  }
  // CLIENT：選完角色後告知 HOST 自己的角色
  if (net && net.role === "client" && net.conn && net.conn.open) {
    net.conn.send({ t: "p2char", charType: charType });
  }
  _startGame("coop");
}

/* ═══ P2 選卡系統 ═══ */
// HOST 端：P2 打開寶箱 → 生成選項 → 發給 CLIENT
let _p2BigChestLeft = 0; // P2 大寶箱剩餘次數
let _p2LastPicks = []; // HOST 記錄當前 P2 選卡選項

export function getP2BigChestLeft() { return _p2BigChestLeft; }
export function setP2BigChestLeft(v) { _p2BigChestLeft = v; }

export function _sendP2Pick(cr) {
  const g = _g();
  const net = _getNet();
  const inv2 = _getInv2();
  // 大寶箱：設定多次選卡
  if (cr && cr.bigChest && _p2BigChestLeft <= 0) {
    _p2BigChestLeft = _isElite() ? 4 : 5;
  }
  const p2ct = g.p2.charType || "gunner";
  const pool = C.filter(c => {
    if (c.charReq && c.charReq !== p2ct) return false;
    const ex = inv2.find(x => x.id === c.id);
    if (c.once && ex) return false;
    return !ex || ex.lv < 2;
  });
  const picks = []; const used = new Set();
  for (let i = 0; i < 3 && i < pool.length; i++) {
    let at2 = 0;
    while (at2 < 50) { at2++; const c = pool[Math.random() * pool.length | 0]; if (!used.has(c.id)) { used.add(c.id); picks.push({ id: c.id, n: c.n, e: c.e, r: c.r, d: c.d }); break; } }
  }
  if (picks.length === 0) { _p2BigChestLeft = 0; return; }
  const isBig = _p2BigChestLeft > 0;
  // AI P2：自動選第一張
  if (_getP2AI()) {
    _applyP2Card(picks[0].id);
    if (isBig) { _p2BigChestLeft--; if (_p2BigChestLeft > 0) { setTimeout(() => _sendP2Pick(null), 300); return; } }
    g.p2._inv = false; g.p2._pickPending = false;
    g.p2._iFrameEnd = performance.now() + 1000; // AI 也給保護時間
    return;
  }
  // 真人 P2：發送給 CLIENT
  if (net && net.conn && net.conn.open) {
    _p2LastPicks = picks.slice(); // HOST 記錄，供重骰用
    net.conn.send({ t: "p2pick", cards: picks, bigLeft: _p2BigChestLeft });
  }
}

// HOST：處理 P2 重骰請求
export function _handleP2Reroll(idx) {
  const g = _g();
  const net = _getNet();
  const inv2 = _getInv2();
  if (!g || !g.p2 || idx < 0 || idx >= _p2LastPicks.length) return;
  const p2ct = g.p2.charType || "gunner";
  const used = new Set(_p2LastPicks.map(c => c.id));
  const pool = C.filter(c => {
    if (c.charReq && c.charReq !== p2ct) return false;
    if (used.has(c.id)) return false;
    const ex = inv2.find(x => x.id === c.id);
    if (c.once && ex) return false;
    return !ex || ex.lv < 2;
  });
  if (pool.length === 0) return;
  const newCard = pool[Math.random() * pool.length | 0];
  _p2LastPicks[idx] = { id: newCard.id, n: newCard.n, e: newCard.e, r: newCard.r, d: newCard.d };
  // 發送更新後的卡片列表給 CLIENT
  if (net && net.conn && net.conn.open) {
    net.conn.send({ t: "p2pick", cards: _p2LastPicks, bigLeft: _p2BigChestLeft, reroll: idx });
  }
}

// HOST 端：收到 CLIENT 選擇後套用
export function _applyP2Card(cardId) {
  const g = _g();
  const inv2 = _getInv2();
  const cd = C.find(c => c.id === cardId); if (!cd) return;
  const ex = inv2.find(x => x.id === cd.id);
  let lv = 0;
  if (ex) { if (ex.lv < 2) { ex.lv++; lv = ex.lv; } else return; }
  else { inv2.push({ id: cd.id, lv: 0 }); }
  cd.ap[lv](g.p2);
  g.p2.hp = Math.min(g.p2.hp + 15, g.p2.maxHp);
  if (_burst) _burst(g.p2.x, g.p2.y, "#DA77F2", 12);
  g.dn.push({ x: g.p2.x, y: g.p2.y - 30, d: cd.e + cd.n + " Lv" + (lv + 1), life: 2, color: "#DA77F2", big: 1 });
  // 大寶箱：繼續下一輪選卡
  if (_p2BigChestLeft > 0) { _p2BigChestLeft--; if (_p2BigChestLeft > 0) { setTimeout(() => _sendP2Pick(null), 300); return; } }
  g.p2._inv = false; g.p2._pickPending = false;
  // 選卡結束後給 1 秒無敵保護（防止被圍攻秒殺）
  g.p2._iFrameEnd = performance.now() + 1000;
}

// CLIENT 端：收到選卡選項 → 顯示 UI
export function showCoopPick(data) {
  const net = _getNet();
  const cards = data.cards || data;
  const bigLeft = data.bigLeft || 0;
  if (!cards || !cards.length) return;
  // 移除舊的 overlay（如果還在）
  const old = document.getElementById("_p2PickOv"); if (old) old.remove();
  const title = bigLeft > 0 ? `📦 大寶箱！(剩餘${bigLeft}次)` : "📦 寶箱解鎖！選擇一張卡牌";
  let h = '<div style="position:fixed;inset:0;background:rgba(10,10,24,.92);z-index:50;display:flex;justify-content:center;align-items:center" id="_p2PickOv">';
  h += '<div style="background:rgba(12,12,30,.96);border-radius:16px;border:1px solid rgba(240,101,149,.2);padding:20px;max-width:360px;width:90%;text-align:center">';
  h += `<div style="color:#F06595;font-size:14px;font-weight:700;margin-bottom:10px">${title}</div>`;
  h += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">';
  cards.forEach((c, ci) => {
    const rc = { R: "#74C0FC", SR: "#DA77F2", SSR: "#FFD43B" }[c.r] || "#fff";
    h += `<div id="_p2c${ci}" style="width:100px;background:rgba(255,255,255,.04);border:2px solid ${rc}40;border-radius:12px;padding:10px 6px;text-align:center">`;
    h += `<div style="font-size:28px">${c.e}</div>`;
    h += `<div style="color:${rc};font-weight:700;font-size:12px;margin:4px 0">${c.n}</div>`;
    h += `<div style="color:${rc};font-size:9px">${c.r}</div>`;
    h += `<div style="color:rgba(255,255,255,.4);font-size:8px;margin-top:4px;line-height:1.3">${c.d[0]}</div>`;
    h += `<div style="display:flex;gap:4px;margin-top:6px;justify-content:center">`;
    h += `<button onclick="_p2PickCard(${c.id})" style="padding:4px 10px;font-size:10px;border:none;border-radius:6px;background:${rc};color:#000;font-weight:700;cursor:pointer">選擇</button>`;
    h += `<button onclick="_p2RerollCard(${ci})" id="_p2rr${ci}" style="padding:4px 8px;font-size:9px;border:1px solid rgba(255,255,255,.2);border-radius:6px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.5);cursor:pointer">🔄</button>`;
    h += `</div></div>`;
  });
  h += '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  // 儲存當前卡片供重骰用
  window._p2PickCards = cards;
  window._p2PickRerolled = [false, false, false];
}

/* ═══ Co-op Network Sync ═══ */
export function serializeCoopState(g, cam, par, getDashGhosts, getP2SkillCdEnd, aim, ULT_CHARGE_NEED) {
  if (!g || !g.p2) return null;
  const cm = cam();
  return {
    t: "state",
    p1: { x: g.p.x, y: g.p.y, hp: g.p.hp, mhp: g.p.maxHp, face: g.p.face, _downed: g.p._downed, _iFrameEnd: g.p._iFrameEnd, _rescueTimer: g.p._rescueTimer || 0, _pickPending: g.p._pickPending || false, charType: g.charType },
    p2: { x: g.p2.x, y: g.p2.y, hp: g.p2.hp, mhp: g.p2.maxHp, face: g.p2.face, _downed: g.p2._downed, _iFrameEnd: g.p2._iFrameEnd, _rescueTimer: g.p2._rescueTimer || 0, _pickPending: g.p2._pickPending || false, charType: g.p2.charType },
    ene: g.ene.map(e => ({ x: e.x, y: e.y, hp: e.hp, mhp: e.mhp, r: e.r, color: e.color, boss: e.boss, mega: e.mega, tier: e.tier, role: e.role, face: e.face, t: e.t, st: e.st, frozen: e.frozen, stageBoss: e.stageBoss, sbPhase: e.sbPhase, _coopShield: e._coopShield, _coopCircles: e._coopCircles, _coopShieldBrokenEnd: e._coopShieldBrokenEnd, _coopCircleTimer: e._coopCircleTimer, _rage: e._rage, _rageState: e._rageState, _rageDx: e._rageDx, _rageDy: e._rageDy, eliteEnemy: e.eliteEnemy, _eDashing: e._eDashing, _eShieldEnd: e._eShieldEnd, dashState: e.dashState, dashDx: e.dashDx, dashDy: e.dashDy, shieldAng: e.shieldAng, flankA: e.flankA, bhExeAt: e.bhExeAt, bossType: e.bossType, poisonT: e.poisonT, burnT: e.burnT, _tauntEnd: e._tauntEnd, _tauntTarget: e._tauntTarget })),
    bul: g.bul.filter(b => b.life > 0).map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, crit: b.crit, life: b.life })),
    ebul: g.ebul.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, color: b.color, life: b.life })),
    dn: g.dn.map(d => ({ x: d.x, y: d.y, d: d.d, life: d.life, color: d.color, big: d.big })),
    orbs: g.orbs.map(o => ({ x: o.x, y: o.y })),
    crates: g.crates.filter(c => c.hp > 0).map(c => ({ x: c.x, y: c.y, hp: c.hp, mhp: c.mhp, bigChest: c.bigChest, hits: c.hits, needed: c.needed })),
    pickOpen: g.pickOpen || false,
    wave: g.wave, level: g.level, score: g.score, kills: g.kills,
    p2Lv: g.p2Level, p2Exp: g.p2Exp, p2ExpTo: g.p2ExpTo,
    // 視覺同步（限量避免頻寬爆）
    par: par.slice(-30).map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, life: p.life, color: p.color, sz: p.sz })),
    ltn: g.ltn.slice(-8).map(l => ({ x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, life: l.life, c: l.c })),
    ghosts: getDashGhosts().slice(-6).map(gh => ({ x: gh.x, y: gh.y, face: gh.face, life: gh.life })),
    // 特效數據
    heat: g.heat || 0, heatCD: g.heatCD || 0, _heatWarn: g._heatWarn || false,
    coopLink: g._coopLink || false,
    lightBeams: (g._lightBeams || []).slice(-3).map(b => ({ x: b.x, y: b.y, ang: b.ang, len: b.len, t: b.t })),
    dragonFx: g._dragonBreathFx ? { ang: g._dragonBreathFx.ang, range: g._dragonBreathFx.range, on: g._dragonBreathFx.on } : null,
    ghostShadow: g._ghostShadow && g._ghostShadow.life > 0 ? { x: g._ghostShadow.x, y: g._ghostShadow.y, face: g._ghostShadow.face, life: g._ghostShadow.life } : null,
    ghostArc: g._ghostArc ? { x: g._ghostArc.x, y: g._ghostArc.y, ang: g._ghostArc.ang, t: g._ghostArc.t } : null,
    ultFlash: g.ultFlash || 0,
    p1Atk: g._atkAnim ? { active: g._atkAnim.active, elapsed: performance.now() - g._atkAnim.startT, _qiSpin: g._atkAnim._qiSpin } : null,
    p1Wb: g._wbSwing || 0,
    p2Atk: g._p2AtkAnim ? { active: g._p2AtkAnim.active, elapsed: performance.now() - g._p2AtkAnim.startT, _qiSpin: g._p2AtkAnim._qiSpin } : null,
    p2Wb: g._p2WbSwing || 0,
    // P2 數據（CLIENT 需要顯示自己的 HUD）
    p2Hp: g.p2 ? g.p2.hp : 0, p2Mhp: g.p2 ? g.p2.maxHp : 0,
    p2Ult: g.ultCharge || 0, p2UltNeed: ULT_CHARGE_NEED,
    p2SkillCd: Math.max(0, getP2SkillCdEnd() - performance.now()),
    p2Combo: aim.tn || 0,
    run: g.run
  };
}

export function applyCoopState(data, g, showOver, setPar, setDashGhosts) {
  if (!g) return;
  // 更新雙方玩家（含角色類型同步）
  if (data.p1) { if (data.p1.charType) g.charType = data.p1.charType; Object.assign(g.p, data.p1); g.p.maxHp = data.p1.mhp; }
  if (data.p2 && g.p2) { if (data.p2.charType) g.p2.charType = data.p2.charType; Object.assign(g.p2, data.p2); g.p2.maxHp = data.p2.mhp; }
  // 更新敵人
  if (data.ene) g.ene = data.ene;
  // 更新子彈
  if (data.bul) g.bul = data.bul;
  if (data.ebul) g.ebul = data.ebul;
  // 傷害數字
  if (data.dn) g.dn = data.dn;
  // 經驗球
  if (data.orbs) g.orbs = data.orbs;
  // 視覺效果同步
  if (data.par) setPar(data.par);
  if (data.ltn) g.ltn = data.ltn;
  if (data.ghosts) setDashGhosts(data.ghosts);
  // 特效狀態
  if (data.heat !== undefined) g.heat = data.heat;
  if (data.heatCD !== undefined) g.heatCD = data.heatCD;
  if (data._heatWarn !== undefined) g._heatWarn = data._heatWarn;
  if (data.coopLink !== undefined) g._coopLink = data.coopLink;
  if (data.lightBeams) g._lightBeams = data.lightBeams;
  if (data.dragonFx !== undefined) g._dragonBreathFx = data.dragonFx;
  if (data.ghostShadow !== undefined) g._ghostShadow = data.ghostShadow;
  if (data.ghostArc !== undefined) g._ghostArc = data.ghostArc;
  if (data.ultFlash !== undefined) g.ultFlash = data.ultFlash;
  // 動畫同步：elapsed → 本地 startT
  var _syncNow = performance.now();
  if (data.p1Atk) { g._atkAnim = { active: data.p1Atk.active, startT: _syncNow - data.p1Atk.elapsed, _qiSpin: data.p1Atk._qiSpin }; }
  if (data.p1Wb !== undefined) g._wbSwing = data.p1Wb;
  if (data.p2Atk) { g._p2AtkAnim = { active: data.p2Atk.active, startT: _syncNow - data.p2Atk.elapsed, _qiSpin: data.p2Atk._qiSpin }; }
  if (data.p2Wb !== undefined) g._p2WbSwing = data.p2Wb;
  // P2 HUD 數據（CLIENT 用）
  if (data.p2Hp !== undefined) g._clientP2Hp = data.p2Hp;
  if (data.p2Mhp !== undefined) g._clientP2Mhp = data.p2Mhp;
  if (data.p2Ult !== undefined) g._clientP2Ult = data.p2Ult;
  if (data.p2UltNeed !== undefined) g._clientP2UltNeed = data.p2UltNeed;
  if (data.p2SkillCd !== undefined) g._clientP2SkillCd = data.p2SkillCd;
  if (data.p2Combo !== undefined) g._clientP2Combo = data.p2Combo;
  // 寶箱
  if (data.crates) g.crates = data.crates;
  // 選卡狀態
  if (data.pickOpen !== undefined) g._remotePickOpen = data.pickOpen;
  // 遊戲資訊
  if (data.wave !== undefined) g.wave = data.wave;
  if (data.level !== undefined) g.level = data.level;
  if (data.score !== undefined) g.score = data.score;
  if (data.kills !== undefined) g.kills = data.kills;
  if (data.p2Lv !== undefined) g.p2Level = data.p2Lv;
  if (data.p2Exp !== undefined) g.p2Exp = data.p2Exp;
  if (data.p2ExpTo !== undefined) g.p2ExpTo = data.p2ExpTo;
  if (data.run === false) { g.run = false; showOver(); }
}

export function clientRenderLoop(g, cx, cam, VW, VH, BR, PR, par, filterPar, setPar, getDashGhosts, setDashGhosts, drawPlayer, drawEnemy, drawMinimap, CHAR, getP2SkillCdEnd, aim, $) {
  if (!g || !cx) return;
  const now = g.time || performance.now();
  const cm = cam();
  cx.clearRect(0, 0, VW, VH); cx.save(); cx.translate(-cm.x, -cm.y);
  // background
  const tileS = 80, sxT = Math.floor(cm.x / tileS), syT = Math.floor(cm.y / tileS);
  const exT = Math.ceil((cm.x + VW) / tileS), eyT = Math.ceil((cm.y + VH) / tileS);
  for (let ty = syT; ty <= eyT; ty++) for (let tx = sxT; tx <= exT; tx++) {
    cx.fillStyle = (tx + ty) % 2 === 0 ? "#0d0d22" : "#0a0a18"; cx.fillRect(tx * tileS, ty * tileS, tileS, tileS);
  }
  // crates (寶箱)
  if (g.crates) g.crates.forEach(c => {
    if (c.hp <= 0) return;
    const cs2 = c.bigChest ? 14 : 10;
    cx.save(); cx.fillStyle = c.bigChest ? "#FFD43B" : "#FF922B"; cx.globalAlpha = .9;
    cx.fillRect(c.x - cs2 / 2, c.y - cs2 / 2, cs2, cs2);
    cx.strokeStyle = c.bigChest ? "#FCC419" : "#E8590C"; cx.lineWidth = 1.5; cx.strokeRect(c.x - cs2 / 2, c.y - cs2 / 2, cs2, cs2);
    cx.fillStyle = "#fff"; cx.globalAlpha = .6; cx.font = "bold 8px sans-serif"; cx.textAlign = "center";
    cx.fillText(c.bigChest ? "👑" : "📦", c.x, c.y + 3);
    cx.restore();
  });
  // enemies
  g.ene.forEach(e => { if (e.hp > 0) drawEnemy(e); });
  // bullets
  g.bul.forEach(b => { if (b.life > 0) { cx.fillStyle = b.crit ? "#FFD43B" : "#FFE066"; cx.beginPath(); cx.arc(b.x, b.y, BR, 0, Math.PI * 2); cx.fill(); } });
  // enemy bullets
  g.ebul.forEach(b => { cx.fillStyle = b.color || "#FF6B6B"; cx.beginPath(); cx.arc(b.x, b.y, 4, 0, Math.PI * 2); cx.fill(); });
  // orbs
  g.orbs.forEach(o => { cx.fillStyle = "#74C0FC"; cx.globalAlpha = .7; cx.beginPath(); cx.arc(o.x, o.y, 4, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1; });
  // P1
  const _p1Col = (CHAR[g.charType] || CHAR.gunner).col;
  cx.save(); if (g.p._downed) cx.globalAlpha = .35;
  cx.shadowColor = _p1Col; cx.shadowBlur = 20; drawPlayer(g.p.x, g.p.y, PR, now / 1000, _p1Col, g.p.face); cx.restore();
  // P2
  if (g.p2) {
    cx.save(); if (g.p2._downed) cx.globalAlpha = .35;
    cx.shadowColor = "#F06595"; cx.shadowBlur = 20;
    const _p1ct2 = g.charType, _p1atk2 = g._atkAnim, _p1wb2 = g._wbSwing;
    g.charType = g.p2.charType || "gunner";
    g._atkAnim = g._p2AtkAnim || { active: false, startT: 0 }; g._wbSwing = g._p2WbSwing || 0;
    drawPlayer(g.p2.x, g.p2.y, PR, now / 1000, "#F06595", g.p2.face);
    g.charType = _p1ct2; g._atkAnim = _p1atk2; g._wbSwing = _p1wb2; cx.restore();
  }
  // 粒子
  filterPar(p => { p.x += p.vx || 0; p.y += p.vy || 0; p.life -= .03; return p.life > 0; });
  par.forEach(p => { cx.save(); cx.globalAlpha = Math.min(1, p.life); cx.fillStyle = p.color || "#fff"; cx.beginPath(); cx.arc(p.x, p.y, p.sz || 2, 0, Math.PI * 2); cx.fill(); cx.restore(); });
  // 閃電
  if (g.ltn) g.ltn = g.ltn.filter(l => { l.life -= .05; return l.life > 0; });
  if (g.ltn) g.ltn.forEach(l => { cx.save(); cx.globalAlpha = l.life; cx.strokeStyle = l.c || "#FAB005"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(l.x1, l.y1); cx.lineTo(l.x2, l.y2); cx.stroke(); cx.restore(); });
  // 殘影
  setDashGhosts(getDashGhosts().filter(gh => { gh.life -= .04; return gh.life > 0; }));
  getDashGhosts().forEach(gh => { cx.save(); cx.globalAlpha = gh.life * .4; drawPlayer(gh.x, gh.y, PR, now / 1000, "#FFE066", gh.face); cx.restore(); });
  // 殘影斬剪影
  if (g._ghostShadow && g._ghostShadow.life > 0) {
    g._ghostShadow.life -= .04;
    cx.save(); cx.globalAlpha = g._ghostShadow.life * .35; cx.shadowColor = "#DA77F2"; cx.shadowBlur = 12;
    drawPlayer(g._ghostShadow.x, g._ghostShadow.y, PR, now / 1000, "#DA77F2", g._ghostShadow.face);
    cx.restore();
  }
  // 過熱條（CLIENT 端 P2 用 — 顯示在自己角色下方）
  if (g.p2 && g.heat > 0) {
    const _hp3 = g.heat / 15, _hbW = PR * 2.4, _hbH = 3, _hbX = g.p2.x - _hbW / 2, _hbY = g.p2.y + PR + 8;
    cx.save(); cx.globalAlpha = .5 + _hp3 * .4;
    cx.fillStyle = "rgba(0,0,0,.35)"; cx.fillRect(_hbX, _hbY, _hbW, _hbH);
    cx.fillStyle = _hp3 > .75 ? "#FF4500" : _hp3 > .5 ? "#FF922B" : "#FFD43B";
    cx.fillRect(_hbX, _hbY, _hbW * _hp3, _hbH); cx.restore();
  }
  if (g._heatWarn && g.p2) {
    cx.save(); cx.font = "bold 9px Nunito,sans-serif"; cx.textAlign = "center";
    cx.fillStyle = "#FF4500"; cx.globalAlpha = Math.sin(now / 60) > 0 ? .8 : 0;
    cx.fillText("⚠ 過熱警告", g.p2.x, g.p2.y + PR + 18); cx.restore();
  }
  if (g.heatCD > 0 && g.p2) {
    cx.save(); cx.font = "bold 9px Nunito,sans-serif"; cx.textAlign = "center";
    cx.fillStyle = "#FF4040"; cx.globalAlpha = .6 + Math.sin(now / 80) * .3;
    cx.fillText("🔥 冷卻 " + (g.heatCD / 1000).toFixed(1) + "s", g.p2.x, g.p2.y + PR + 18); cx.restore();
  }
  // 連攜光環
  if (g._coopLink && g.p2) {
    const _mx3 = (g.p.x + g.p2.x) / 2, _my3 = (g.p.y + g.p2.y) / 2;
    cx.save(); cx.globalAlpha = .12 + Math.sin(now / 250) * .06;
    const _lg = cx.createRadialGradient(_mx3, _my3, 10, _mx3, _my3, 80);
    _lg.addColorStop(0, "#FFD43B"); _lg.addColorStop(1, "transparent");
    cx.fillStyle = _lg; cx.beginPath(); cx.arc(_mx3, _my3, 80, 0, Math.PI * 2); cx.fill();
    cx.globalAlpha = .2 + Math.sin(now / 200) * .1; cx.strokeStyle = "#FFD43B"; cx.lineWidth = 1.5; cx.setLineDash([4, 4]);
    cx.beginPath(); cx.moveTo(g.p.x, g.p.y); cx.lineTo(g.p2.x, g.p2.y); cx.stroke(); cx.setLineDash([]);
    cx.restore();
  }
  // 光劍光束
  if (g._lightBeams) {
    g._lightBeams = g._lightBeams.filter(b => {
      const el = now - b.t; if (el > 300) return false;
      const bp = el / 300;
      cx.save(); cx.lineCap = "round";
      cx.globalAlpha = (1 - bp) * .4; cx.strokeStyle = "#FFD43B"; cx.lineWidth = 6 * (1 - bp);
      cx.shadowColor = "#FFD43B"; cx.shadowBlur = 12;
      cx.beginPath(); cx.moveTo(b.x, b.y); cx.lineTo(b.x + Math.cos(b.ang) * b.len, b.y + Math.sin(b.ang) * b.len); cx.stroke();
      cx.globalAlpha = (1 - bp) * .8; cx.strokeStyle = "#fff"; cx.lineWidth = 2 * (1 - bp); cx.shadowBlur = 0;
      cx.beginPath(); cx.moveTo(b.x, b.y); cx.lineTo(b.x + Math.cos(b.ang) * b.len, b.y + Math.sin(b.ang) * b.len); cx.stroke();
      cx.restore(); return true;
    });
  }
  // 龍息錐形
  if (g._dragonBreathFx && g._dragonBreathFx.on && g.p) {
    const _dbf = g._dragonBreathFx, _dbA2 = _dbf.ang, _dbR2 = _dbf.range;
    const _dbX = g.p.x, _dbY = g.p.y;
    cx.save();
    for (let i = 0; i < 20; i++) {
      const t2 = i / 20, d2 = _dbR2 * t2;
      const w2 = t2 * 8 + 1;
      const col2 = t2 < .2 ? "#FFF8E0" : t2 < .4 ? "#FFD43B" : t2 < .6 ? "#FF922B" : "#FF4500";
      cx.globalAlpha = (1 - t2 * .4) * .25; cx.fillStyle = col2;
      cx.beginPath(); cx.arc(_dbX + Math.cos(_dbA2) * d2, _dbY + Math.sin(_dbA2) * d2, w2, 0, Math.PI * 2); cx.fill();
    }
    cx.restore();
  }
  // 殘影斬紫弧
  if (g._ghostArc) {
    const _ga = g._ghostArc, _gaEl = now - _ga.t;
    if (_gaEl < 400) {
      const _gap = _gaEl / 400;
      cx.save(); cx.globalAlpha = (1 - _gap) * .5; cx.strokeStyle = "#DA77F2"; cx.lineWidth = 3 * (1 - _gap);
      cx.shadowColor = "#DA77F2"; cx.shadowBlur = 10;
      cx.beginPath(); cx.arc(_ga.x, _ga.y, PR * 2 + _gap * 20, _ga.ang - Math.PI * .5, _ga.ang + Math.PI * .5); cx.stroke();
      cx.restore();
    } else { g._ghostArc = null; }
  }
  // 大招閃光
  if (g.ultFlash > 0) {
    cx.save(); cx.globalAlpha = g.ultFlash * .5; cx.fillStyle = "#fff"; cx.fillRect(0, 0, VW * 2, VH * 2); cx.restore();
    g.ultFlash = Math.max(0, g.ultFlash - .03);
  }
  // damage numbers
  g.dn = g.dn.filter(d => { d.life -= .025; return d.life > 0; });
  g.dn.forEach(d => { cx.save(); cx.globalAlpha = Math.min(1, d.life); cx.font = (d.big ? "bold 15px" : "bold 11px") + " 'Nunito',sans-serif"; cx.textAlign = "center"; cx.fillStyle = d.color || "#fff"; cx.fillText(typeof d.d === "number" ? "-" + d.d : d.d, d.x, d.y); cx.restore(); });
  // 對方選卡中通知
  if (g._remotePickOpen) {
    cx.save(); cx.font = "bold 14px 'Nunito',sans-serif"; cx.textAlign = "center";
    cx.fillStyle = "rgba(0,0,0,.6)"; cx.fillRect(VW / 2 - 80, VH / 2 - 15, 160, 30);
    cx.fillStyle = "#FFD43B"; cx.fillText("🃏 對方選卡中...", VW / 2, VH / 2 + 5);
    cx.restore();
  }
  cx.restore();
  // CLIENT HUD：顯示 P2（自己）的數據
  if (g.p2 && g._clientP2Hp !== undefined) {
    const _hp2 = g._clientP2Hp, _mhp2 = g._clientP2Mhp || 1;
    $("hl").textContent = "❤️" + Math.floor(_hp2) + "/" + _mhp2;
    $("hb").style.width = Math.max(0, Math.min(100, _hp2 / _mhp2 * 100)) + "%";
    $("ll").textContent = "Lv." + (g.p2Level || 1);
    // 集氣條
    const _ult2 = g._clientP2Ult || 0, _ultN2 = g._clientP2UltNeed || 100;
    const _up2 = Math.min(1, _ult2 / _ultN2);
    $("ub").style.width = (_up2 * 100) + "%";
    $("ulbl").textContent = _up2 >= 1 ? "💥MAX" : "💎" + Math.floor(_up2 * 100) + "%";
    $("ulr").textContent = _up2 >= 1 ? "💥 READY" : "💎" + Math.floor(_up2 * 100) + "%";
    $("ulr").style.color = _up2 >= 1 ? "#FFD43B" : "rgba(190,78,219,.85)";
  }
  // 技能 CD 顯示
  const _skCd = g._clientP2SkillCd || 0;
  const _skEl = $("skillCd");
  if (_skEl) { if (_skCd > 0) { _skEl.style.display = "flex"; _skEl.textContent = (_skCd / 1000).toFixed(1); } else { _skEl.style.display = "none"; } }
  // 波次/分數/擊殺
  const _sl = $("sl"), _kl = $("kl");
  if (_sl) _sl.textContent = "⭐" + (g.score || 0);
  if (_kl) _kl.textContent = "💀" + (g.kills || 0);
  // Combo 文字
  const _cmb = g._clientP2Combo || 0;
  const _cEl = $("combo");
  if (_cEl) _cEl.textContent = _cmb > 2 ? _cmb + "x COMBO!" : "";
  drawMinimap();
}

/* ── practice mode coop room helpers ── */
export function pracCoopRoom(opts) {
  // opts: { isCoopMode, getG, getNet, setNet, getP2AI, setP2AI, getP2Input, _coopGenCode, applyCoopState, showCoopPick, applyP2Card, handleP2Reroll, CHAR, $ }
  const { isCoopMode, getG, getNet, setNet, getP2AI, setP2AI, getP2Input } = opts;
  if (!isCoopMode()) return;
  const code = prompt("輸入房間密碼（留空隨機）：") || "";
  const roomCode = code.trim().length >= 2 ? code.trim() : _coopGenCode();
  const peer = new Peer(roomCode, _PEER_OPTS);
  const netObj = { role: "host", peer, conn: null, roomCode, connected: false };
  setNet(netObj);
  setP2AI(true); // 先用 AI，等對方加入後切換
  peer.on("open", () => {
    const g = getG();
    g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "🔗 房間：" + roomCode + " 等待加入...", life: 4, color: "#F06595", big: 1 });
    $("pracRoomBtn").textContent = "🔗" + roomCode;
  });
  peer.on("connection", conn => {
    netObj.conn = conn;
    conn.on("open", () => {
      netObj.connected = true; setP2AI(false); // 對方加入，關閉 AI
      const g = getG();
      g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "✅ 對方已加入！", life: 3, color: "#51CF66", big: 1 });
      $("pracRoomBtn").textContent = "✅已連線";
      conn.on("data", data => {
        const g2 = getG();
        const p2i = getP2Input();
        if (data && data.t === "inp") { p2i.dx = data.jx || 0; p2i.dy = data.jy || 0; p2i.a = data.ja || 0; p2i.aimA = data.aa || 0; p2i.aimDx = data.ax || 0; p2i.aimDy = data.ay || 0; p2i.ult = !!data.ult; p2i.dodge = !!data.dodge; p2i.skill = !!data.skill; }
        if (data && data.t === "p2picked" && data.cardId) { _applyP2Card(data.cardId); }
        if (data && data.t === "p2reroll" && data.idx !== undefined) { _handleP2Reroll(data.idx); }
        if (data && data.t === "p2char" && data.charType && g2 && g2.p2) {
          g2.p2.charType = data.charType;
          const CC3 = CHAR[data.charType] || CHAR.gunner;
          g2.p2.hp = CC3.startHp; g2.p2.maxHp = CC3.startHp; g2.p2.atk = CC3.startAtk; g2.p2.speed = CC3.startSpeed; g2.p2.armor = CC3.armor; g2.p2.dodge = CC3.dodge; g2.p2.crit = CC3.crit; g2.p2.fr = CC3.fr;
        }
      });
      conn.on("close", () => { netObj.connected = false; setP2AI(true); const g3 = getG(); g3.dn.push({ x: g3.p.x, y: g3.p.y - 40, d: "⚠️ 對方已離線，切換 AI", life: 3, color: "#FF6B6B", big: 1 }); });
    });
  });
  peer.on("error", err => {
    const g = getG();
    if (err.type === "unavailable-id") {
      g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "❌ 此密碼已被使用，請換一個", life: 3, color: "#FF6B6B", big: 1 });
      $("pracRoomBtn").textContent = "🔗建房";
    } else { g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "❌ 錯誤：" + err.type, life: 3, color: "#FF6B6B", big: 1 }); }
  });
}

export function pracCoopJoin(opts) {
  const { isCoopMode, getG, getNet, setNet, getP2AI, setP2AI } = opts;
  if (!isCoopMode()) return;
  const code = prompt("輸入對方的房間密碼：");
  if (!code || code.trim().length < 2) return;
  const roomCode = code.trim();
  const net = getNet();
  if (net && net.peer) { net.peer.destroy(); }
  const peer = new Peer(undefined, _PEER_OPTS);
  const netObj = { role: "client", peer, conn: null, roomCode, connected: false };
  setNet(netObj);
  peer.on("open", () => {
    const conn = peer.connect(roomCode, { reliable: true });
    netObj.conn = conn;
    conn.on("open", () => {
      netObj.connected = true; setP2AI(false);
      const g = getG();
      g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "✅ 已加入 " + roomCode + "！", life: 3, color: "#51CF66", big: 1 });
      $("pracJoinBtn").textContent = "✅已連線";
      // Client 送操作、收狀態
      conn.on("data", data => {
        const g2 = getG();
        if (data && data.t === "state" && g2) applyCoopState(data, g2, _showOver, setPar, setDashGhosts);
        if (data && data.t === "p2pick") showCoopPick(data);
      });
      conn.on("close", () => { netObj.connected = false; const g3 = getG(); g3.dn.push({ x: g3.p.x, y: g3.p.y - 40, d: "⚠️ 已斷線", life: 3, color: "#FF6B6B", big: 1 }); });
    });
    conn.on("error", err => { const g = getG(); g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "❌ 連線失敗：" + err.type, life: 3, color: "#FF6B6B", big: 1 }); });
  });
}
