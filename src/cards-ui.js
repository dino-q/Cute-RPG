// Card selection UI, angel card, big chest
import { CRATE_HP, RW, RC, LVC, RECOMMENDED } from "./config.js";
import { rn, $ } from "./utils.js";
import { C } from "./cards.js";
import { sfx } from "./audio.js";
import { resetControls } from "./input.js";

/* ═══ module-local refs (injected by main.js) ═══ */
let g;
let inv = [];
let inv2 = [];
let _isEliteFn;
let _showFn, _resumeGameFn, _triggerStageBossFn, _mapWFn, _mapHFn;

export function initCardsUi(deps) {
  if (deps.show) _showFn = deps.show;
  if (deps.resumeGame) _resumeGameFn = deps.resumeGame;
  if (deps.triggerStageBoss) _triggerStageBossFn = deps.triggerStageBoss;
  if (deps.isElite) _isEliteFn = deps.isElite;
  if (deps.mapW) _mapWFn = deps.mapW;
  if (deps.mapH) _mapHFn = deps.mapH;
}
export function setCardsUiG(game) { g = game; }
export function setCardsUiInv(i1, i2) { inv = i1; inv2 = i2; }

function _isElite() { return _isEliteFn ? _isEliteFn() : false; }
function show(...args) { if (_showFn) _showFn(...args); }
function resumeGame(...args) { if (_resumeGameFn) _resumeGameFn(...args); }
function mapW() { return _mapWFn ? _mapWFn() : 2400; }
function mapH() { return _mapHFn ? _mapHFn() : 2400; }

/* ═══ inventory helpers ═══ */
export function getCardLv(id) { const c = inv.find(x => x.id === id); return c ? c.lv : -1; }
export function addCard(id) { const ex = inv.find(x => x.id === id); if (ex) { if (ex.lv < 2) { ex.lv++; return ex.lv; } return -1; } inv.push({ id, lv: 0 }); return 0; }

export function pks(n, excludeIds, _useInv, _useCharType) {
  const _inv2 = _useInv || inv;
  const p = [], u = new Set(), ex = excludeIds || new Set();
  let at = 0;
  const _getClv = function(id) { const c = _inv2.find(x => x.id === id); return c ? c.lv : -1; };
  while (p.length < n && at < 250) {
    at++;
    const v = Math.random() * 100;
    let r = v < RW.SSR ? "SSR" : v < RW.SSR + RW.SR ? "SR" : "R";
    const _eliteExpBan = _isElite() && (c => c.n === "學者帽");
    const _ct2 = _useCharType || (g ? g.charType : "gunner");
    const _charBan = c => {
      if (c.charReq && c.charReq !== _ct2) return true;
      return false;
    };
    const pool = C.filter(c => c.r === r && !u.has(c.id) && !ex.has(c.id) && (c.once ? _getClv(c.id) < 0 : _getClv(c.id) < 2) && !(c.n === "命運轉輪" && _inv2.length === 0) && !(_eliteExpBan && _eliteExpBan(c)) && !_charBan(c));
    if (!pool.length) continue;
    const c = pool[pool.length * Math.random() | 0];
    p.push(c); u.add(c.id);
  }
  return p;
}

/* ═══ buildCard (single card DOM element) ═══ */
var _currentPickCtx = null;
export function getCurrentPickCtx() { return _currentPickCtx; }

function buildCard(cd, w, i, wrap) {
  const _bpp = _currentPickCtx ? _currentPickCtx.player : g.p;
  const _binv = _currentPickCtx ? _currentPickCtx.inv : inv;
  const _bGetLv = function(id) { const c = _binv.find(x => x.id === id); return c ? c.lv : -1; };
  const _bAddCard = function(id) { const ex = _binv.find(x => x.id === id); if (ex) { if (ex.lv < 2) { ex.lv++; return ex.lv; } return -1; } _binv.push({ id, lv: 0 }); return 0; };
  const clv = _bGetLv(cd.id), nLv = clv + 1, isUp = clv >= 0, dLv = nLv + 1;
  let desc = cd.d[Math.min(nLv, 2)];
  // 影分身：依角色顯示不同說明
  if (cd.n === "影分身") {
    const _ct = _currentPickCtx ? _currentPickCtx.charType : (g ? g.charType : "gunner");
    desc = _ct === "assassin" ? "每3秒召喚分身攻擊敵人" : _ct === "gunner" ? "100%前後攻擊" : "100%全方位攻擊";
  }
  const b = document.createElement("button"); b.className = "cb";
  const rarAnim = cd.r === "SSR" ? "ssrRainbow 1.5s infinite" : cd.r === "SR" ? "srShine 1.2s infinite" : "none";
  const tpAnim = cd.tp === "atk" ? "atkPulse 1.5s infinite" : "defPulse 1.5s infinite";
  const mainAnim = cd.r === "SSR" ? rarAnim : tpAnim;
  b.style.cssText = `width:100%;border:2px solid ${isUp ? LVC[nLv] : RC[cd.r]};animation:ci .35s ${i * .08}s both cubic-bezier(.34,1.56,.64,1);`;
  setTimeout(() => { b.style.animation = mainAnim; }, 350 + i * 80);
  const tpL = cd.tp === "atk" ? '<div style="font-size:8px;color:#FF6B6B;margin-bottom:1px">⚔️ 攻擊</div>' : '<div style="font-size:8px;color:#4DABF7;margin-bottom:1px">🛡️ 被動</div>';
  const lvL = isUp ? `<div style="font-size:9px;color:#FFD43B;font-weight:900;margin-bottom:2px;text-shadow:0 0 6px #FFD43B">⬆Lv${dLv}</div>` : "";
  const rarBadge = cd.r === "SSR" ? '<div style="font-size:9px;background:linear-gradient(90deg,#FFD43B,#FF6B6B,#DA77F2,#74C0FC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;letter-spacing:2px;margin-bottom:3px">✦ SSR ✦</div>' : `<div style="font-size:10px;color:${RC[cd.r]};font-weight:700;letter-spacing:1px;margin-bottom:3px">★${cd.r}</div>`;
  const _pct = _currentPickCtx ? _currentPickCtx.charType : (g ? g.charType : "gunner");
  const _recSet = RECOMMENDED[_pct];
  const _isRec = _recSet && _recSet.has(cd.n);
  const recBadge = _isRec ? '<div style="font-size:8px;font-weight:900;color:#FFD43B;background:rgba(255,212,59,.15);border:1px solid rgba(255,212,59,.3);border-radius:4px;padding:1px 6px;margin-bottom:3px;display:inline-block">⭐ 推薦</div>' : "";
  b.innerHTML = `${rarBadge}${tpL}${recBadge}<div style="font-size:30px;margin-bottom:3px">${cd.e}</div><div style="font-size:12px;font-weight:900;margin-bottom:2px">${cd.n}</div>${lvL}<div style="font-size:9px;color:rgba(255,255,255,.5);line-height:1.3">${desc}</div>`;
  b.onclick = () => pickCard(cd, _bAddCard, _bpp, _binv);
  b.ontouchstart = e => { e.stopPropagation(); e.preventDefault(); pickCard(cd, _bAddCard, _bpp, _binv); };
  wrap.innerHTML = ""; wrap.appendChild(b);
}

function pickCard(cd, _bAddCard, _bpp, _binv) {
  const lv = _bAddCard(cd.id);
  if (lv < 0) return;
  cd.ap[lv](_bpp); // 套用卡片效果到玩家
  if (_bpp._resetUlt) { _bpp._resetUlt = false; g.ultCharge = 0; g.ultCdEnd = 0; }
  sfx("levelup");
  // 命運轉輪：清空背包，重抽等同已有卡片數量的輪數
  if (cd.n === "命運轉輪") {
    const fateCount = Math.max(1, _binv.length - 1); // 已有卡片數（扣掉命運轉輪本身）
    const fateEntry = _binv.find(x => x.id === cd.id);
    _binv.length = 0; if (fateEntry) _binv.push(fateEntry);
    g._fateQueue = (g._fateQueue || 0) + fateCount;
  }
  // 幸運幣：立刻額外三選一（優先最高）
  if (_bpp._luckyPick) {
    _bpp._luckyPick = false;
    g.pickOpen = false;
    const _savedBigChest = g._bigChestLeft || 0; // 記住大寶箱剩餘
    setTimeout(() => {
      showPick("lucky", null, _currentPickCtx);
      g._bigChestLeft = _savedBigChest; // 恢復大寶箱剩餘
    }, 80);
    _currentPickCtx = null;
    return;
  }
  // 探索靴擲幣：立刻觸發
  if (_bpp._coinFlip) {
    _bpp._coinFlip = false;
    g.pickOpen = false;
    const _savedCtx = _currentPickCtx;
    const _savedBig2 = g._bigChestLeft || 0;
    const _savedFate = g._fateQueue || 0;
    _currentPickCtx = null;
    showCoinFlip(_bpp, () => {
      // 擲幣結束後恢復剩餘流程
      g._bigChestLeft = _savedBig2;
      g._fateQueue = _savedFate;
      if (g._fateQueue > 0) { g._bigChestLeft = 0; setTimeout(() => showPick("fate"), 300); }
      else if (g._bigChestLeft > 0) { g._bigChestLeft--; if (g._bigChestLeft > 0) setTimeout(() => showPick("bigchest"), 300); else resumeGame(); }
      else resumeGame();
    });
    return;
  }
  g.pickOpen = false;
  _currentPickCtx = null;
  // 命運連抽（優先於大寶箱剩餘輪）
  if (g._fateQueue > 0) {
    g._bigChestLeft = 0;
    setTimeout(() => showPick("fate"), 300);
    return;
  }
  // 大寶箱多輪
  if (g._bigChestLeft > 0) {
    g._bigChestLeft--;
    if (g._bigChestLeft > 0) {
      setTimeout(() => showPick("bigchest"), 300);
      return;
    }
  }
  resumeGame();
}

/* ═══ coin flip animation ═══ */
export function showCoinFlip(_bpp, _onDone) {
  const win = Math.random() < .5;
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0);transition:background .3s;display:flex;align-items:center;justify-content:center;flex-direction:column";
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.style.background = "rgba(0,0,0,.6)");
  // coin canvas
  const cc = document.createElement("canvas");
  cc.width = 200; cc.height = 200;
  cc.style.cssText = "margin-bottom:20px";
  ov.appendChild(cc);
  const ctx = cc.getContext("2d");
  // result text
  const txt = document.createElement("div");
  txt.style.cssText = "font-size:20px;font-weight:900;color:#fff;text-align:center;opacity:0;transition:opacity .5s";
  ov.appendChild(txt);
  // animation
  let t = 0, speed = 20, done = false;
  const dur = 2000; // 2 seconds
  function frame() {
    t += 16;
    ctx.clearRect(0, 0, 200, 200);
    const cx = 100, cy = 90, r = 50;
    // slow down over time
    const progress = Math.min(t / dur, 1);
    speed = 20 * (1 - progress * .85);
    const angle = t * speed * .001;
    const scaleX = Math.cos(angle); // -1 to 1 simulates flip
    const absScale = Math.abs(scaleX);
    const showFront = scaleX > 0;
    // shadow
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath(); ctx.ellipse(cx, cy + r + 10, r * absScale * .8, 6, 0, 0, Math.PI * 2); ctx.fill();
    // coin body
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(absScale, 1);
    // edge (3D effect)
    const grad = ctx.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, "#B8860B"); grad.addColorStop(.3, "#FFD700"); grad.addColorStop(.5, "#FFF8DC"); grad.addColorStop(.7, "#FFD700"); grad.addColorStop(1, "#B8860B");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#B8860B"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    // inner circle
    ctx.strokeStyle = "#DAA520"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r - 8, 0, Math.PI * 2); ctx.stroke();
    // face
    if (absScale > .15) {
      ctx.font = "bold 36px 'Nunito',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (!done) {
        ctx.fillStyle = "#8B6914"; ctx.fillText(showFront ? "🍀" : "💀", 0, 2);
      } else {
        ctx.fillStyle = "#8B6914"; ctx.fillText(win ? "🍀" : "💀", 0, 2);
      }
    }
    ctx.restore();
    if (t < dur) {
      requestAnimationFrame(frame);
    } else if (!done) {
      done = true;
      // final face
      requestAnimationFrame(frame);
      // show result
      setTimeout(() => {
        if (win) {
          txt.innerHTML = '<div style="color:#FFD43B;font-size:24px;text-shadow:0 0 20px #FFD43B">🍀 幸運！獲得寶箱！</div>';
          txt.style.opacity = "1";
          // spawn chest
          if (g) {
            const mw = _mapWFn ? _mapWFn() : 2400, mh = _mapHFn ? _mapHFn() : 2400;
            let cx2, cy2;
            for (let a = 0; a < 50; a++) {
              cx2 = rn(100, mw - 100); cy2 = rn(100, mh - 100);
              if (Math.sqrt((cx2 - g.p.x) ** 2 + (cy2 - g.p.y) ** 2) >= 300) break;
            }
            g.crates.push({ x: cx2, y: cy2, hp: 30, mhp: 30, card: null, hits: 0, needed: rn(5, 8) | 0, unlockLv: 0, bigChest: false });
            g.dn.push({ x: g.p.x, y: g.p.y - 50, d: "📦 寶箱出現！", life: 2.5, color: "#FFD43B", big: 1 });
          }
        } else {
          txt.innerHTML = '<div style="color:#ADB5BD;font-size:20px">💀 可惜！下次好運</div>';
          txt.style.opacity = "1";
        }
        // close after 1.5s
        setTimeout(() => {
          ov.style.background = "rgba(0,0,0,0)"; ov.style.pointerEvents = "none";
          setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 400);
          if (_onDone) _onDone(); else resumeGame();
        }, 1500);
      }, 300);
    }
  }
  frame();
}

/* ═══ showAngelCard ═══ */
export function showAngelCard() {
  if (g.pickOpen) return;
  g.pickOpen = true; resetControls();
  const p = $("pickPanel");
  p.innerHTML = `
    <div style="color:#FFF3BF;font-size:14px;font-weight:700;letter-spacing:2px;margin-bottom:8px">👼 小天使感應到你需要幫助</div>
    <p style="color:rgba(255,255,255,.5);font-size:11px;margin:0 0 14px">Boss 戰可能會很艱難，要接受祝福嗎？</p>
    <div style="display:flex;gap:10px;justify-content:center">
      <button class="cb" id="_angelYes" style="width:140px;border:2px solid #FFD43B;touch-action:manipulation">
        <div style="font-size:9px;background:linear-gradient(90deg,#FFD43B,#FF6B6B,#DA77F2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;letter-spacing:2px;margin-bottom:3px">✦ 隱藏卡 ✦</div>
        <div style="font-size:28px;margin-bottom:3px">🔥</div>
        <div style="font-size:12px;font-weight:900;margin-bottom:2px">越戰越勇</div>
        <div style="font-size:9px;color:rgba(255,255,255,.5);line-height:1.3">Boss戰越久 傷害越高</div>
      </button>
      <button class="cb" id="_angelNo" style="width:140px;border:2px solid rgba(255,255,255,.2);touch-action:manipulation">
        <div style="font-size:28px;margin-bottom:3px">💪</div>
        <div style="font-size:12px;font-weight:900;margin-bottom:2px">不需要</div>
        <div style="font-size:9px;color:rgba(255,255,255,.5);line-height:1.3">我要靠自己的實力</div>
      </button>
    </div>`;
  show("pick");
  const doChoice = (accept) => {
    if (accept) {
      g.p._angelBuff = true;
      g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "👼 越戰越勇！", life: 2.5, color: "#FFD43B", big: 1 });
      sfx("levelup");
    } else {
      g.dn.push({ x: g.p.x, y: g.p.y - 40, d: "💪 靠自己！", life: 2, color: "#fff", big: 1 });
    }
    g.pickOpen = false;
    resumeGame(() => { if (_triggerStageBossFn) _triggerStageBossFn(g._pendingStageBoss); });
  };
  const yb = $("_angelYes"), nb = $("_angelNo");
  yb.onclick = () => doChoice(true); yb.ontouchstart = e => { e.stopPropagation(); e.preventDefault(); doChoice(true); };
  nb.onclick = () => doChoice(false); nb.ontouchstart = e => { e.stopPropagation(); e.preventDefault(); doChoice(false); };
}

/* ═══ triggerBigChest ═══ */
export function triggerBigChest(count) {
  if (!g) return;
  const mw = mapW(), mh = mapH();
  for (let n = 0; n < count; n++) {
    let x, y;
    for (let a = 0; a < 100; a++) {
      x = rn(100, mw - 100); y = rn(100, mh - 100);
      const pd = Math.sqrt((x - g.p.x) ** 2 + (y - g.p.y) ** 2);
      if (pd >= 500 && g.crates.every(c => c.hp <= 0 || Math.sqrt((c.x - x) ** 2 + (c.y - y) ** 2) >= 400)) break;
    }
    const normalNeeded = rn(6, 10) | 0;
    g.crates.push({ x, y, hp: CRATE_HP, mhp: CRATE_HP, card: null, hits: 0, needed: Math.ceil(normalNeeded * 1.5), unlockLv: 0, bigChest: true });
  }
  g.dn.push({ x: g.p.x, y: g.p.y - 50, d: "📦📦📦 大寶箱出現！", life: 2, color: "#FFD43B", big: 1 });
  sfx("chest");
}

/* ═══ showPick ═══ */
export function showPick(src, specificCard, pickCtx) {
  if (g.pickOpen) return;
  g.pickOpen = true;
  _currentPickCtx = pickCtx || null;
  resetControls();
  const _pp = _currentPickCtx ? _currentPickCtx.player : g.p;
  const _pinv = _currentPickCtx ? _currentPickCtx.inv : inv;
  const isLucky = src === "lucky";
  const isFate = src === "fate";
  if (isFate && g._fateQueue > 0) g._fateQueue--;
  const luck = _pp.luck || 0;
  const isBig = src === "bigchest";
  const cnt = isLucky ? 3 : isFate ? 3 : isBig ? 3 : src === "crate" ? 3 : (specificCard ? 1 : (Math.random() * 100 < (25 + luck) ? 3 : (_pp.pickCount || 2)));
  const _pct = _currentPickCtx ? _currentPickCtx.charType : g.charType;
  const pk = specificCard ? [specificCard] : pks(cnt, null, _pinv, _pct);
  const roundSeen = new Set(pk.map(c => c.id));
  const noReroll = isLucky;
  const p = $("pickPanel");
  const fateLeft = isFate ? (g._fateQueue || 0) : 0;
  const bigProgress = isBig && g._bigChestTotal ? ` (${g._bigChestTotal - g._bigChestLeft + 1}/${g._bigChestTotal})` : "";
  const title = isBig ? `📦 大寶箱${bigProgress}` : isFate ? `🎰 命運重抽！(剩餘${fateLeft}次)` : isLucky ? "🍀 幸運抽卡！" : src === "boss" ? "👑 小王擊敗！" : src === "crate" ? "📦 寶箱解鎖！" : "⬆ 升級！";
  const subtitle = noReroll ? "選擇一張卡牌" : (pk.length > 1 ? "選擇一張卡牌（每張可重骰一次）" : "獲得卡牌");
  p.innerHTML = `<div style="color:#FFD43B;font-size:14px;font-weight:700;letter-spacing:3px;margin-bottom:4px">${title}</div>
    <p style="color:rgba(255,255,255,.4);font-size:11px;margin:0 0 14px">${subtitle}</p>
    <div style="display:flex;gap:8px;justify-content:center;align-items:stretch;width:100%" id="pickCards"></div>`;
  const cc = $("pickCards");
  const w = pk.length === 1 ? 160 : 105;
  pk.forEach((cd, i) => {
    const col = document.createElement("div"); col.style.cssText = "display:flex;flex-direction:column;align-items:stretch;gap:5px;flex:1;max-width:" + (pk.length === 1 ? "160" : "105") + "px;";
    const cardWrap = document.createElement("div"); cardWrap.style.cssText = "flex:1;display:flex;";
    buildCard(cd, w, i, cardWrap);
    col.appendChild(cardWrap);
    if (pk.length > 1 && !noReroll) {
      const rr = document.createElement("button");
      rr.style.cssText = "border:none;background:rgba(255,255,255,.06);color:rgba(255,255,255,.5);font-size:9px;font-weight:700;font-family:inherit;padding:4px 10px;border-radius:12px;cursor:pointer;transition:opacity .2s;";
      rr.textContent = "🎲 重骰";
      rr.onclick = () => {
        const exc = new Set(roundSeen);
        const nw = pks(1, exc, _pinv, _pct);
        if (nw.length) { pk[i] = nw[0]; roundSeen.add(nw[0].id); buildCard(nw[0], w, i, cardWrap); }
        rr.textContent = "已使用"; rr.style.opacity = ".3"; rr.style.pointerEvents = "none";
      };
      col.appendChild(rr);
    }
    cc.appendChild(col);
  });
  show("pick");
}
