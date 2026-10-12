import {C} from './cards.js';
import {RC,LVC} from './config.js';
import {drawCardIcon} from './card-vfx.js';
import { setActionEmblem } from "./button-art.js";
// HUD, minimap, floating hints, player damage numbers
import {
  BH_COOLDOWN_MS, ULT_CHARGE_NEED, PR,
  CHAR, ROLE_SHOOTER, ROLE_SHIELD
} from "./config.js";
import { di, $ } from "./utils.js";

/* ═══ module-local refs (set by main.js via initHud) ═══ */
let g, _isCoopMode, _net, _skillCdEnd, aim;
let VW, VH;
let _camFn, _mapWFn, _mapHFn, _crateActiveFn;

export function initHud(deps) {
  if (deps.cam) _camFn = deps.cam;
  if (deps.mapW) _mapWFn = deps.mapW;
  if (deps.mapH) _mapHFn = deps.mapH;
  if (deps.crateActive) _crateActiveFn = deps.crateActive;
}
export function setHudG(game) { g = game; }
export function setHudCoopState(isCoop, net) { _isCoopMode = isCoop; _net = net; }
export function setHudSkillCd(v) { _skillCdEnd = v; }
export function getHudSkillCd() { return _skillCdEnd; }
export function setHudAim(a) { aim = a; }
export function setHudVW(v) { VW = v; }
export function setHudVH(v) { VH = v; }

// 玩家受傷紅色拋物線數字
export function showPlayerDmg(dmg, p) {
  if (!g || dmg < 1) return;
  const pp = p || g.p;
  g.dn.push({ x: pp.x, y: pp.y - PR - 5, d: "-" + Math.floor(dmg), life: 1.6, color: "#FF4040", big: 1, _playerDmg: true });
}

/* ═══ HUD ═══ */
export function hud() {
  if (!g) return;
  const roleArt = {gunner:["gun","狙擊"],swordsman:["sword","鬼斬"],tank:["shield","嘲諷"],assassin:["dagger","影襲"]};
  const currentRole = (_isCoopMode && _net?.role === "client" ? g.p2?.charType : g.charType) || "gunner";
  const [skillArt, skillName] = roleArt[currentRole] || roleArt.gunner;
  setActionEmblem("skillIcon", skillArt, skillName, "W");
  const _hudIsClient = !!(_isCoopMode && _net && _net.role === "client");
  const _hudP = _hudIsClient && g.p2 ? g.p2 : g.p;
  const _hudLv = _hudIsClient ? g.p2Level || 1 : g.level;
  const _hudExp = _hudIsClient ? g.p2Exp || 0 : g.exp;
  const _hudExpTo = _hudIsClient ? g.p2ExpTo || 100 : g.expTo;
  // 閃避按鈕 CD 外圈
  const _db = $("dodgeBtn");
  if (_db) {
    const _dn = performance.now(), _dCD = _hudP._dodgeCD || 0, _dReady = _dn >= _dCD;
    const _dPct = _dReady ? 1 : Math.max(0, 1 - ((_dCD - _dn) / 2000));
    const _dDeg = _dPct * 360;
    _db.style.background = _dReady ? 'radial-gradient(circle,rgba(116,192,252,.2),rgba(20,20,40,.9))' : `conic-gradient(rgba(116,192,252,.45) ${_dDeg - 1}deg,rgba(116,192,252,.2) ${_dDeg}deg,rgba(20,20,40,.9) ${_dDeg + 1}deg)`;
    _db.style.borderColor = _dReady ? "rgba(116,192,252,.6)" : "rgba(255,255,255,.15)";
    _db.style.opacity = _dReady ? "1" : ".6";
  }
  // 技能 CD 顯示
  const _skBtn = $("skillCd");
  if (_skBtn) {
    const _skLeft = _hudIsClient ? (g._clientP2SkillCd || 0) : Math.max(0, _skillCdEnd - performance.now());
    if (_skLeft > 0) { _skBtn.style.display = "flex"; _skBtn.textContent = (_skLeft / 1000).toFixed(1); }
    else { _skBtn.style.display = "none"; }
  }
  $("hl").textContent = "HP " + Math.floor(_hudP.hp) + "/" + _hudP.maxHp;
  $("hb").style.width = (_hudP.hp / _hudP.maxHp * 100) + "%";
  $("ll").textContent = "Lv." + _hudLv;
  $("eb").style.width = (_hudExp / _hudExpTo * 100) + "%";
  $("sl").textContent = "分數 " + g.score; $("kl").textContent = "擊殺 " + g.kills;
  const _hasBH = !!_hudP.hasBH, _hasTS = !!_hudP.hasTS, _hasMF = !!_hudP.hasMF, _hasLS = !!_hudP.lStep, _hasCd = _hasBH || _hasTS || _hasMF;
  const _ultCount = (_hasBH ? 1 : 0) + (_hasTS ? 1 : 0) + (_hasMF ? 1 : 0) + (_hasLS ? 1 : 0);
  if (_hasCd) {
    const cdMs = (_hasBH ? BH_COOLDOWN_MS : _hasMF ? (_hudP.mfCd || 12e3) : (_hasTS ? (_hudP.tsCd || 15e3) : 15e3)) / (_hudP.ultRate || 1);
    const icon = _ultCount >= 2 ? "" : _hasBH ? "" : _hasMF ? "" : "";
    const label = [_hasBH ? "黑洞" : null, _hasMF ? "磁力場" : null, _hasTS ? "時停" : null, _hasLS ? "閃電步" : null].filter(Boolean).join("+");
    const cdColor = _hasBH ? "#495057" : _hasMF ? "#339AF0" : "#74C0FC";
    const now = performance.now(), cdLeft = Math.max(0, (g.ultCdEnd || 0) - now), ready = cdLeft <= 0;
    const pct = ready ? 1 : 1 - cdLeft / cdMs;
    $("ultR").style.background = "conic-gradient(" + cdColor + " " + (pct * 360) + "deg,rgba(190,78,219,.1) " + (pct * 360) + "deg)";
    setActionEmblem("ultI", ready ? (_hasBH ? "orb" : _hasMF ? "target" : "hourglass") : "hourglass", ready ? "大招" : "冷卻", "E");
    $("ultL").textContent = ready ? ` ${label}就緒 ` : `冷卻 ${Math.ceil(cdLeft / 1000)}s`;
    $("ub").style.width = (pct * 100) + "%";
    $("ulbl").textContent = ready ? `${icon}READY` : `${Math.ceil(cdLeft / 1000)}s`;
    $("ulr").textContent = ready ? `${icon} READY` : ` ${Math.ceil(cdLeft / 1000)}s`;
    $("ulr").style.color = ready ? "#FFD43B" : "rgba(190,78,219,.85)";
    $("ultR").style.animation = ready ? "gw .45s infinite" : "none";
  } else {
    const _hudUltCharge = _hudIsClient ? (g._clientP2Ult || 0) : g.ultCharge;
    const pct = Math.min(_hudUltCharge / ULT_CHARGE_NEED, 1);
    $("ultR").style.background = "conic-gradient(#BE4BDB " + (pct * 360) + "deg,rgba(190,78,219,.1) " + (pct * 360) + "deg)";
    const _lsReady = pct >= 1 && _hudP.lStep;
    setActionEmblem("ultI", pct >= 1 ? (_lsReady ? "bolt" : "burst") : "gem", pct >= 1 ? "發動" : "集氣", "E");
    $("ultL").textContent = pct >= 1 ? (_lsReady ? " 閃電步 " : " 發動 ") : (g.ultHold || (_hudIsClient && aim.a)) ? "集氣中..." : "長壓集氣";
    $("ub").style.width = (pct * 100) + "%";
    $("ulbl").textContent = pct >= 1 ? "MAX" : `${Math.floor(pct * 100)}%`;
    $("ulr").textContent = pct >= 1 ? " READY" : "" + Math.floor(pct * 100) + "%";
    $("ulr").style.color = pct >= 1 ? "#FFD43B" : "rgba(190,78,219,.85)";
    $("ultR").style.animation = pct >= 1 ? "gw .45s infinite" : "none";
  }
  // P2 HUD (co-op)
  const _p2h = $("p2hud");
  if (_isCoopMode && g.p2 && _p2h) {
    _p2h.style.display = "block";
    const _otherP = _hudIsClient ? g.p : g.p2;
    const _otherLv = _hudIsClient ? g.level : g.p2Level;
    const _otherExp = _hudIsClient ? g.exp : g.p2Exp;
    const _otherExpTo = _hudIsClient ? g.expTo : g.p2ExpTo;
    const p2s = _otherP._downed ? "" : "";
    const _otherLabel = _hudIsClient ? "P1" : "P2";
    $("p2hl").textContent = p2s + " " + _otherLabel + " " + Math.floor(_otherP.hp) + "/" + _otherP.maxHp;
    $("p2hb").style.width = (Math.max(0, _otherP.hp) / _otherP.maxHp * 100) + "%";
    $("p2ll").textContent = _otherLabel + " Lv." + _otherLv;
    $("p2eb").style.width = (_otherExp / _otherExpTo * 100) + "%";
  } else if (_p2h) { _p2h.style.display = "none"; }
}

/* ═══ floating hints ═══ */
let hintQueue = [], hintShowing = false;
export function showHint(text) {
  hintQueue.push(text);
  if (hintShowing) return;
  hintShowing = true;
  const run = () => {
    const msg = hintQueue.shift();
    if (!msg) { hintShowing = false; return; }
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = "position:absolute;top:70px;left:50%;transform:translateX(-50%);z-index:15;color:#FFD43B;font-size:13px;font-weight:700;font-family:Nunito,sans-serif;text-shadow:0 0 10px rgba(255,215,75,.5);pointer-events:none;opacity:0;transition:opacity .4s,top .4s;white-space:nowrap;";
    document.getElementById("app").appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = "1"; el.style.top = "60px"; });
    setTimeout(() => { el.style.opacity = "0"; el.style.top = "50px"; }, 2800);
    setTimeout(() => { el.remove(); run(); }, 3300);
  };
  run();
}

/* ═══ minimap ═══ */
export function drawMinimap() {
  const mc = $("minimap"), mx = mc.getContext("2d"), mw = mc.width, mh = mc.height;
  mx.fillStyle = "rgba(10,10,24,.7)"; mx.fillRect(0, 0, mw, mh);
  const _mw = _mapWFn(), _mh = _mapHFn();
  const sx = mw / _mw, sy = mh / _mh;
  // crates
  g.crates.forEach(c => { if (_crateActiveFn(c)) { mx.fillStyle = c.bigChest ? "rgba(255,215,0,.9)" : "rgba(255,215,75,.6)"; const s2 = c.bigChest ? 3 : 2; mx.fillRect(c.x * sx - 1, c.y * sy - 1, s2, s2); } });
  // enemies
  g.ene.forEach(e => { mx.fillStyle = e.boss ? "#FF6B6B" : e.role === ROLE_SHOOTER ? "#FFA94D" : e.role === ROLE_SHIELD ? "#4DABF7" : "rgba(255,100,100,.5)"; mx.fillRect(e.x * sx - 1, e.y * sy - 1, e.boss ? 3 : 2, e.boss ? 3 : 2); });
  // player
  mx.fillStyle = (CHAR[g.charType] || CHAR.gunner).col; mx.fillRect(g.p.x * sx - 2, g.p.y * sy - 2, 4, 4);
  // P2 co-op
  if (_isCoopMode && g.p2) {
    const p2mx = g.p2.x * sx, p2my = g.p2.y * sy;
    const pulse = 2 + Math.sin(performance.now() / 400) * .8;
    mx.fillStyle = "#F06595"; mx.globalAlpha = 1;
    mx.beginPath(); mx.arc(p2mx, p2my, pulse, 0, Math.PI * 2); mx.fill();
    mx.strokeStyle = "rgba(240,101,149,.5)"; mx.lineWidth = 1;
    mx.beginPath(); mx.arc(p2mx, p2my, pulse + 2, 0, Math.PI * 2); mx.stroke();
    mx.globalAlpha = 1;
  }
  // viewport box
  const c = _camFn(); mx.strokeStyle = "rgba(255,255,255,.3)"; mx.lineWidth = 1; mx.strokeRect(c.x * sx, c.y * sy, VW * sx, VH * sy);
}

export function drawAbilitySidebar(cx,inv,player,VW,VH){
 const g={p:player};
  // 右側能力欄（溢出時往左換列，避開小地圖）
  if(inv.length>0){
    const abS=26,abGap=3,abStep=abS+abGap,abStartY=140;
    const maxRows=Math.max(1,Math.floor((VH-abStartY-65)/abStep));
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
      // Shared generated card artwork
      cx.globalAlpha=.8;cx.font="14px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
      drawCardIcon(cx,cd,x+abS/2,y+abS/2-2,abS-5);
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
      cx.globalAlpha=.8;cx.font="14px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";drawCardIcon(cx,{n:"越戰越勇"},ax+abS/2,ay+abS/2-2,abS-5);
      cx.globalAlpha=.9;cx.font="bold 7px 'Nunito',sans-serif";cx.fillStyle="#FFD43B";cx.fillText("越戰越勇",ax+abS/2,ay+abS-3);
    }
    cx.restore();
  }


}
