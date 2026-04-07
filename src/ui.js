/**
 * ui.js — 選單、設定、結果畫面、cutscene、鳳凰復活動畫
 * 依賴：state, config, utils, audio, render, hud, input
 */
import { EXP_BASE, EXP_SCALE, MAX_PARTICLES, SPAWN_R } from "./config.js";
import { $ } from "./utils.js";
import { C } from "./cards.js";
import { RC, LVC } from "./config.js";
import { sfx, bgmStop, getActx, getMuted } from "./audio.js";
import { setHudVW, setHudVH } from "./hud.js";
import { par, filterPar, burst } from "./render.js";
import { rn } from "./utils.js";
import { rebindActiveTouches, resetControls } from "./input.js";
import { getPracticeMode } from "./practice.js";

// ── 依注入的 deps (由 initUi 設定) ─────────────────────────────────────────
let _getG = () => null;
let _getInv = () => [];
let _getVW = () => 400;
let _getVH = () => 700;
let _setVW = () => {};
let _setVH = () => {};
let _getIsCoopMode = () => false;
let _getCv = () => null;
let _getFxc = () => null;
let _getFxctx = () => null;
let _getCx = () => null;
let _getCTimer = () => null;
let _setCTimer = () => {};
let _setShake = () => {};
let _getMode = () => "classic";
let _getCharType = () => "gunner";

// ── 設定面板狀態 ─────────────────────────────────────────────────────────────
let _settingsOpen = false;
let _wasRunning = false;

// ── 鳳凰復活動畫狀態 ─────────────────────────────────────────────────────────
let _phoenixAnim = null;
let _phoenixT = 0;

// ── expForLevel ───────────────────────────────────────────────────────────────
export function expForLevel(lv) {
  const mode = _getMode();
  const isElite = mode === "elite" || mode === "coop";
  if (isElite) {
    if (lv <= 2) return 50;
    if (lv <= 4) return 80;
    if (lv <= 6) return 110;
    return 150;
  }
  if (lv <= 1) return 25;
  if (lv <= 2) return 35;
  if (lv <= 3) return 50;
  return Math.floor(EXP_BASE * Math.pow(EXP_SCALE, lv - 1));
}

// ── resize ────────────────────────────────────────────────────────────────────
export function resize() {
  const cv = _getCv();
  const fxc = _getFxc();
  const g = _getG();
  let VW = _getVW();
  let VH = _getVH();
  const sw = window.innerWidth, sh = window.innerHeight;
  const isLand = sw > sh;
  const cs = getComputedStyle(document.documentElement);
  const safeTop = isLand ? 0 : (parseInt(cs.getPropertyValue('--sat')) || 0);
  const topPad = isLand ? 0 : Math.max(safeTop, 20);
  const botPad = isLand ? 0 : 12;
  let safeL = 0, safeR = 0;
  if (isLand) {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;bottom:0;left:env(safe-area-inset-left,0px);right:env(safe-area-inset-right,0px);pointer-events:none;visibility:hidden';
    document.body.appendChild(probe);
    const r2 = probe.getBoundingClientRect();
    safeL = Math.round(r2.left); safeR = Math.round(sw - r2.right);
    document.body.removeChild(probe);
  }
  const aw = sw - safeL - safeR;
  const ah = sh - topPad - botPad;
  const ratio = aw / ah;
  const newVW = isLand ? Math.round(400 * ratio) : 400;
  const newVH = isLand ? 400 : Math.round(400 / ratio);
  if (VW !== newVW || VH !== newVH) {
    VW = newVW; VH = newVH;
    _setVW(VW); _setVH(VH);
    setHudVW(VW); setHudVH(VH);
    if (cv) { cv.width = VW; cv.height = VH; }
    if (fxc) { fxc.width = VW; fxc.height = VH; }
  }
  [cv, fxc].forEach(c => {
    if (c) { c.style.width = aw + "px"; c.style.height = ah + "px"; c.style.left = safeL + "px"; c.style.top = topPad + "px"; }
  });
  const ctl = $("ctl");
  if (ctl && isLand) { ctl.style.paddingLeft = (safeL + 12) + "px"; ctl.style.paddingRight = (safeR + 12) + "px"; }
  else if (ctl) { ctl.style.paddingLeft = "12px"; ctl.style.paddingRight = "12px"; }
  $("minimap").style.display = g ? "block" : "none";
}

// ── show ──────────────────────────────────────────────────────────────────────
export function show(n) {
  ["titleOv", "charSelectOv", "tutOv", "pickOv", "overOv", "victoryOv", "practiceOv", "coopOv"].forEach(id => {
    const el = $(id); if (el) el.style.display = "none";
  });
  if (n === "title") $("titleOv").style.display = "flex";
  else if (n === "tut") $("tutOv").style.display = "flex";
  else if (n === "pick") $("pickOv").style.display = "flex";
  else if (n === "over") $("overOv").style.display = "flex";
  else if (n === "victory") $("victoryOv").style.display = "flex";
  if (n === "play" && getPracticeMode()) $("practiceOv").style.display = "block";
  const playing = n === "play";
  $("hud").style.display = (playing && !getPracticeMode()) ? "block" : "none";
  $("ctl").style.display = playing ? "flex" : "none";
  $("minimap").style.display = playing ? "block" : "none";
}

// ── resumeGame ────────────────────────────────────────────────────────────────
export function resumeGame(cb) {
  requestAnimationFrame(() => {
    show("play"); resetControls();
    requestAnimationFrame(() => {
      const g = _getG();
      const _isCoopMode = _getIsCoopMode();
      if (_isCoopMode) { g.p._inv = false; g.p._pickPending = false; }
      g.run = true;
      const n = performance.now();
      g.lS = n; g.laF = n; g.lhF = n; g.lf = n; g.lastKill = n; g.lastHunt = 0; g.p._iFrameEnd = n + 1500;
      rebindActiveTouches();
      if (cb) cb();
    });
  });
}

// ── resetSessionUi ────────────────────────────────────────────────────────────
export function resetSessionUi() {
  $("combo").textContent = "";
  const ct = _getCTimer();
  if (ct) { clearTimeout(ct); _setCTimer(null); }
}

// ── sfxVictory ────────────────────────────────────────────────────────────────
export function sfxVictory() {
  const ac = getActx(); if (!ac) return;
  // 勝利琶音：六音上行和弦
  const now = ac.currentTime;
  [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = i < 3 ? "sine" : "triangle";
    o.frequency.setValueAtTime(f, now + i * 0.07);
    g.gain.setValueAtTime(0, now + i * 0.07);
    g.gain.linearRampToValueAtTime(0.13, now + i * 0.07 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
    o.connect(g).connect(ac.destination);
    o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.36);
  });
  // 最後加一個延伸的和弦
  setTimeout(() => {
    const ac2 = getActx(); if (!ac2) return;
    const t = ac2.currentTime;
    [523, 659, 784].forEach((f, i) => {
      const o = ac2.createOscillator(), g = ac2.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.connect(g).connect(ac2.destination); o.start(t); o.stop(t + 1.2);
    });
  }, 500);
}

// ── playEndCutscene ───────────────────────────────────────────────────────────
export function playEndCutscene(onComplete) {
  const ov = document.getElementById("endCutsceneOv");
  const vid = document.getElementById("endVid");
  const fxCv = document.getElementById("endFx");
  const titleEl = document.getElementById("endTitleText");
  const subEl = document.getElementById("endSubText");

  // 如果沒有 overlay 元素，直接完成
  if (!ov || !vid) { if (onComplete) onComplete(); return; }

  const muted = getMuted();
  vid.muted = muted;
  vid.src = "./assets/END_clip_clean.mp4";
  ov.style.display = "block";

  let fxCtx2 = null;
  if (fxCv) { fxCv.width = window.innerWidth; fxCv.height = window.innerHeight; fxCtx2 = fxCv.getContext("2d"); }

  // 標題動畫
  if (titleEl) {
    titleEl.style.transition = "opacity 1.5s ease, transform 1.5s ease";
    titleEl.style.opacity = "0"; titleEl.style.transform = "scale(1.8)";
    setTimeout(() => {
      titleEl.style.opacity = "1"; titleEl.style.transform = "scale(1)";
    }, 300);
  }
  if (subEl) {
    subEl.style.transition = "opacity 1.5s ease 1s";
    subEl.style.opacity = "0";
    setTimeout(() => { subEl.style.opacity = "1"; }, 1000);
  }

  // 粒子特效 loop
  let _fxRaf;
  const fxPar = [];
  function fxLoop() {
    if (!fxCtx2) { _fxRaf = requestAnimationFrame(fxLoop); return; }
    const W = fxCv.width, H = fxCv.height;
    fxCtx2.clearRect(0, 0, W, H);
    if (Math.random() < 0.05) {
      const x = Math.random() * W, y = Math.random() * H * 0.6;
      const col = ["#FFD43B", "#FF6B6B", "#74C0FC", "#BE4BDB", "#51CF66"][Math.random() * 5 | 0];
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        fxPar.push({ x, y, vx: Math.cos(a) * rn(1, 3), vy: Math.sin(a) * rn(1, 3), life: 1 + Math.random() * 0.5, color: col, sz: rn(2, 5) });
      }
    }
    fxPar.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life -= 0.012; fxCtx2.globalAlpha = Math.max(0, p.life * 0.7); fxCtx2.fillStyle = p.color; fxCtx2.beginPath(); fxCtx2.arc(p.x, p.y, p.sz, 0, Math.PI * 2); fxCtx2.fill(); });
    for (let i = fxPar.length - 1; i >= 0; i--) { if (fxPar[i].life <= 0) fxPar.splice(i, 1); }
    fxCtx2.globalAlpha = 1;
    _fxRaf = requestAnimationFrame(fxLoop);
  }
  fxLoop();

  function finish() {
    if (_fxRaf) cancelAnimationFrame(_fxRaf);
    vid.pause();
    ov.style.transition = "opacity 0.8s ease";
    ov.style.opacity = "0";
    setTimeout(() => {
      ov.style.display = "none"; ov.style.opacity = "1";
      ov.style.transition = "";
      if (onComplete) onComplete();
    }, 800);
  }

  vid.onended = finish;
  // 逾時保險：最多 30 秒
  const _cutsceneTimeout = setTimeout(finish, 30000);
  vid.onended = () => { clearTimeout(_cutsceneTimeout); finish(); };
  // 點擊跳過
  ov.onclick = () => { clearTimeout(_cutsceneTimeout); finish(); };

  vid.play().catch(() => {
    // 無法播放時直接完成
    clearTimeout(_cutsceneTimeout);
    if (_fxRaf) cancelAnimationFrame(_fxRaf);
    ov.style.display = "none";
    if (onComplete) onComplete();
  });
}

// ── showVictoryScreen ─────────────────────────────────────────────────────────
export function showVictoryScreen() {
  const g = _getG();
  const inv = _getInv();
  const VW = _getVW();
  const VH = _getVH();
  show("victory");
  bgmStop();
  const p = $("victoryPanel");
  const elapsed = ((performance.now() - (g._startTime || performance.now())) / 1000) | 0;
  const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
  p.innerHTML = `
    <div style="font-size:52px;animation:fl 2s ease-in-out infinite;margin-bottom:8px">🏆</div>
    <h1 style="font-size:26px;font-weight:900;color:#FFD43B;margin:0 0 6px;text-shadow:0 0 20px #FFD43B60;animation:fadeIn .8s both">恭喜通關！</h1>
    <p style="color:rgba(255,255,255,.5);font-size:11px;margin:0 0 18px;animation:fadeIn 1s .3s both">你擊敗了最終魔王！</p>
    <div style="background:rgba(255,255,255,.04);border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid rgba(255,215,0,.15);animation:fadeIn 1s .6s both">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:center">
        <div><div style="color:rgba(255,255,255,.4);font-size:10px">分數</div><div style="color:#FFD43B;font-size:22px;font-weight:900">${g.score}</div></div>
        <div><div style="color:rgba(255,255,255,.4);font-size:10px">等級</div><div style="color:#74C0FC;font-size:22px;font-weight:900">${g.level}</div></div>
        <div><div style="color:rgba(255,255,255,.4);font-size:10px">時間</div><div style="color:#51CF66;font-size:18px;font-weight:700">${mins}:${String(secs).padStart(2, "0")}</div></div>
        <div><div style="color:rgba(255,255,255,.4);font-size:10px">擊殺</div><div style="color:#FF6B6B;font-size:18px;font-weight:700">${g.kills}</div></div>
      </div>
    </div>
    <div style="animation:fadeIn 1s .9s both">
      <div style="color:rgba(255,255,255,.4);font-size:10px;margin-bottom:6px">收集卡牌</div>
      <div style="color:#FFD43B;font-size:20px;font-weight:900;margin-bottom:8px">${inv.length} / 52</div>
      <div style="display:flex;gap:3px;justify-content:center;flex-wrap:wrap;max-height:100px;overflow-y:auto">${inv.map(ci => { const cd = C.find(c => c.id === ci.id); return cd ? `<span style="display:inline-flex;align-items:center;gap:2px;background:rgba(255,255,255,.05);border-radius:5px;padding:2px 5px;font-size:10px;border:1px solid ${RC[cd.r]}25;color:${RC[cd.r]}">${cd.e}${cd.n}<span style="font-size:8px;font-weight:900;background:${LVC[ci.lv]};color:#000;border-radius:2px;padding:0 3px;margin-left:2px">Lv${ci.lv + 1}</span></span>` : ""; }).join("")}</div>
    </div>
    <button class="btn btn-b" style="margin-top:18px;animation:fadeIn 1s 1.2s both;box-shadow:0 0 20px rgba(255,215,0,.3)" onclick="SG()">🎮 再來一次</button>`;
  // Victory particle effects
  const vicC = $("vicFx"); vicC.width = VW; vicC.height = VH;
  const vctx = vicC.getContext("2d");
  let vicPar = []; let _vicRaf;
  function vicLoop() {
    vctx.clearRect(0, 0, VW, VH);
    if (Math.random() < 0.08) {
      const fx2 = Math.random() * VW, fy = Math.random() * VH * 0.5;
      const col = ["#FFD43B", "#FF6B6B", "#74C0FC", "#BE4BDB", "#51CF66"][Math.random() * 5 | 0];
      for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2; vicPar.push({ x: fx2, y: fy, vx: Math.cos(a) * rn(1, 4), vy: Math.sin(a) * rn(1, 4), life: 1 + Math.random() * 0.5, color: col, sz: rn(2, 5) }); }
    }
    if (Math.random() < 0.3) vicPar.push({ x: Math.random() * VW, y: -5, vx: rn(-0.3, 0.3), vy: rn(0.5, 1.5), life: 2 + Math.random(), color: Math.random() > 0.3 ? "#FFD43B" : "#fff", sz: rn(1, 3) });
    vicPar.forEach(vp => {
      vp.x += vp.vx; vp.y += vp.vy; vp.vy += 0.02; vp.life -= 0.015;
      vctx.globalAlpha = Math.max(0, vp.life); vctx.fillStyle = vp.color; vctx.beginPath(); vctx.arc(vp.x, vp.y, vp.sz, 0, Math.PI * 2); vctx.fill();
    });
    vicPar = vicPar.filter(vp => vp.life > 0); vctx.globalAlpha = 1;
    _vicRaf = requestAnimationFrame(vicLoop);
  }
  vicLoop();
  const origSG = window.SG; window.SG = function () { if (_vicRaf) cancelAnimationFrame(_vicRaf); window.SG = origSG; origSG(); };
}

// ── triggerVictory ────────────────────────────────────────────────────────────
export function triggerVictory(bossE) {
  const g = _getG();
  _setShake(0.8, 10);
  g.ultFlash = 1.5; g.ultType = "n";
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2, v = rn(2, 8);
    par.push({ x: bossE.x, y: bossE.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.5 + Math.random(), color: ["#9B59B6", "#E74C3C", "#FFD43B", "#fff"][Math.random() * 4 | 0], sz: rn(3, 8) });
  }
  sfxVictory();
  g.run = true; g._victoryPending = true;
  const vn = performance.now(); g.lf = vn; g.lS = vn; g.laF = vn;
  setTimeout(() => {
    g.run = false;
    playEndCutscene(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => showVictoryScreen()));
    });
  }, 1500);
}

// ── showOver ──────────────────────────────────────────────────────────────────
export function showOver() {
  const g = _getG();
  const inv = _getInv();
  bgmStop();
  // bossBgmStop injected via init
  if (_bossBgmStop) _bossBgmStop();
  const p = $("overPanel");
  let cardsHtml = "";
  if (inv.length) {
    cardsHtml = '<div style="color:rgba(255,255,255,.3);font-size:10px;margin:8px 0 4px">收集卡牌</div><div style="display:flex;gap:3px;justify-content:center;flex-wrap:wrap">' +
      inv.map(ci => {
        const cd = C.find(c => c.id === ci.id);
        return `<span style="display:inline-flex;align-items:center;gap:2px;background:rgba(255,255,255,.05);border-radius:5px;padding:2px 6px;font-size:10px;border:1px solid ${RC[cd.r]}25;color:${RC[cd.r]}">${cd.e}${cd.n}<span style="font-size:8px;font-weight:900;background:${LVC[ci.lv]};color:#000;border-radius:2px;padding:0 3px;margin-left:2px">Lv${ci.lv + 1}</span></span>`;
      }).join("") + '</div>';
  }
  p.innerHTML = `<div style="font-size:48px;margin-bottom:6px">😵</div><h1 style="font-size:24px;font-weight:900;color:#FF6B6B;margin:0 0 12px">冒險結束！</h1><div style="background:rgba(255,255,255,.03);border-radius:12px;padding:14px 24px;margin-bottom:12px;border:1px solid rgba(255,255,255,.05)"><div style="color:rgba(255,255,255,.4);font-size:11px">最終分數</div><div style="color:#FFD43B;font-size:34px;font-weight:900">${g.score}</div><div style="display:flex;gap:16px;justify-content:center;margin-top:8px"><div><div style="color:rgba(255,255,255,.3);font-size:10px">等級</div><div style="color:#74C0FC;font-size:16px;font-weight:700">${g.level}</div></div><div><div style="color:rgba(255,255,255,.3);font-size:10px">擊殺</div><div style="color:#FF6B6B;font-size:16px;font-weight:700">${g.kills}</div></div></div></div>${cardsHtml}<button class="btn btn-b" style="margin-top:12px" onclick="SG()">🔄 再來一次</button><button class="btn" style="margin-top:8px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.5)" onclick="overGoHome()">🏠 返回首頁</button>`;
  show("over");
}

// ── Settings panel ────────────────────────────────────────────────────────────
let _bossBgmStop = null;

export function openSettings() {
  const g = _getG();
  _settingsOpen = true;
  _wasRunning = !!(g && g.run);
  if (g) g.run = false;
  const ov = document.getElementById("settingsOv");
  if (ov) ov.style.display = "flex";
  // 更新靜音按鈕狀態
  const muted = getMuted();
  const tog = document.getElementById("sfxToggle");
  const knob = document.getElementById("sfxKnob");
  if (tog && knob) {
    tog.style.background = muted ? "rgba(255,255,255,.15)" : "#7C3AED";
    knob.style.left = muted ? "3px" : "27px";
  }
}

export function closeSettings() {
  _settingsOpen = false;
  const ov = document.getElementById("settingsOv");
  if (ov) ov.style.display = "none";
  // 隱藏 stats 面板
  const ss = document.getElementById("settingsStats");
  if (ss) ss.style.display = "none";
  const g = _getG();
  if (_wasRunning && g) g.run = true;
}

export function settingsGoHome() {
  closeSettings();
  const g = _getG();
  if (g) g.run = false;
  bgmStop();
  if (_bossBgmStop) _bossBgmStop();
  show("title");
}

export function toggleStatsPanel() {
  const g = _getG();
  const inv = _getInv();
  const ss = document.getElementById("settingsStats");
  if (!ss) return;
  const isOpen = ss.style.display !== "none";
  if (isOpen) {
    ss.style.display = "none";
  } else {
    ss.style.display = "block";
    if (!g) { ss.innerHTML = '<div style="color:rgba(255,255,255,.4)">遊戲未開始</div>'; return; }
    const p = g.p;
    let h = '<div style="color:#74C0FC;font-weight:900;font-size:12px;margin-bottom:6px">🧙 主角能力值</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;margin-bottom:8px">';
    const ps = [
      ["攻擊力", Math.round(p.atk)], ["護甲", Math.round((p.armor || 0) * 100) + "%"],
      ["移速", p.speed?.toFixed(1)], ["暴擊率", Math.round((p.crit || 0.05) * 100) + "%"],
      ["閃避", Math.round((p.dodge || 0) * 100) + "%"], ["穿透", p.pierce || 0],
      ["吸血", p.ls || 0], ["回復", p.regen?.toFixed(1) || 0],
      ["復活", p.revive || 0], ["等級", g.level],
    ];
    ps.forEach(([k, v]) => { h += `<div style="display:flex;justify-content:space-between;padding:1px 0"><span style="color:rgba(255,255,255,.5)">${k}</span><span style="color:#fff;font-weight:700">${v}</span></div>`; });
    h += '</div>';
    if (inv.length) {
      h += '<div style="color:rgba(255,255,255,.4);font-size:10px;margin-bottom:4px">卡牌（' + inv.length + '/52）</div>';
      h += '<div style="display:flex;gap:2px;flex-wrap:wrap;">';
      inv.forEach(ci => {
        const cd = C.find(c => c.id === ci.id);
        if (cd) h += `<span style="font-size:10px;background:rgba(255,255,255,.06);border-radius:3px;padding:1px 4px;color:${RC[cd.r]}">${cd.e}${cd.n}</span>`;
      });
      h += '</div>';
    }
    ss.innerHTML = h;
  }
}

// ── Phoenix revival animation ─────────────────────────────────────────────────
export function drawPhoenixSprite(ctx, cx2, cy2, size, time, flapPhase) {
  const s = size / 128, t = time || 0, flap2 = flapPhase || 0;
  ctx.save(); ctx.translate(cx2, cy2);
  const og = ctx.createRadialGradient(0, 0, 0, 0, 0, 90 * s);
  og.addColorStop(0, "rgba(255,160,50,.2)"); og.addColorStop(0.5, "rgba(255,120,30,.05)"); og.addColorStop(1, "rgba(255,100,30,0)");
  ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, 0, 90 * s, 0, Math.PI * 2); ctx.fill();
  function dwing(side) {
    const flapAngle = flap2 * 30;
    [{ a: -75, len: 75, w: 20, curve: 18 }, { a: -55, len: 68, w: 18, curve: 14 }, { a: -35, len: 58, w: 17, curve: 11 }, { a: -18, len: 45, w: 15, curve: 8 }].forEach((f, i) => {
      const fe = flapAngle * (1 - i * 0.15), angle = (f.a + fe) * Math.PI / 180, len = f.len * s, ox = side * 20 * s, oy = -5 * s;
      const tipX = ox + Math.cos(angle) * len * side, tipY = oy + Math.sin(angle) * len;
      const curv = f.curve * s, midX = (ox + tipX) / 2, midY = (oy + tipY) / 2;
      const perpX = -Math.sin(angle) * curv * side, perpY = Math.cos(angle) * curv;
      ctx.save();
      const fg = ctx.createLinearGradient(ox, oy, tipX, tipY);
      fg.addColorStop(0, "#FF922B"); fg.addColorStop(0.35, "#FFC040"); fg.addColorStop(0.7, "#FFD43B"); fg.addColorStop(1, "#FFE880");
      ctx.shadowColor = "#FFD43B"; ctx.shadowBlur = 14 * s; ctx.fillStyle = fg; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(midX + perpX, midY + perpY, tipX, tipY);
      ctx.quadraticCurveTo(midX - perpX * 0.5, midY - perpY * 0.5, ox, oy); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 5 * s; ctx.strokeStyle = "#FFE873"; ctx.lineWidth = 2 * s; ctx.globalAlpha = 0.65; ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,220,.35)"; ctx.lineWidth = 1 * s; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(midX + perpX * 0.3, midY + perpY * 0.3, tipX, tipY); ctx.stroke();
      ctx.restore();
    });
  }
  dwing(1); dwing(-1); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const bodyR = 26 * s; ctx.save(); ctx.shadowColor = "#FF922B"; ctx.shadowBlur = 20 * s;
  const bg = ctx.createRadialGradient(-3 * s, -6 * s, 2 * s, 0, 2 * s, bodyR * 1.1);
  bg.addColorStop(0, "#FFFFFF"); bg.addColorStop(0.15, "#FFF0D6"); bg.addColorStop(0.35, "#FFB74D");
  bg.addColorStop(0.6, "#FF922B"); bg.addColorStop(0.85, "#E8590C"); bg.addColorStop(1, "#D9480F");
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, bodyR, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.shadowColor = "#FFD43B"; ctx.shadowBlur = 6 * s; ctx.strokeStyle = "rgba(255,220,80,.3)"; ctx.lineWidth = 1.5 * s;
  ctx.beginPath(); ctx.arc(0, 0, bodyR, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  const hl = ctx.createRadialGradient(-2 * s, -4 * s, 0, 0, 0, bodyR * 0.65);
  hl.addColorStop(0, "rgba(255,255,255,.85)"); hl.addColorStop(0.25, "rgba(255,255,255,.35)");
  hl.addColorStop(0.55, "rgba(255,240,200,.1)"); hl.addColorStop(1, "rgba(255,200,100,0)");
  ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(-2 * s, -4 * s, bodyR * 0.65, 0, Math.PI * 2); ctx.fill();
  [{ x: 0, h: 20, w: 5, c: "#FFD43B", p: 0 }, { x: -5, h: 15, w: 4, c: "#FF922B", p: 1.3 }, { x: 5, h: 14, w: 4, c: "#FF922B", p: 2.1 }].forEach(f => {
    const sway = Math.sin(t / 140 + f.p) * 3 * s, h = f.h * s + Math.sin(t / 170 + f.p) * 2 * s, bx = f.x * s, by = -bodyR * 0.95;
    ctx.save(); ctx.shadowColor = f.c; ctx.shadowBlur = 6 * s; ctx.globalAlpha = 0.8;
    const fg2 = ctx.createLinearGradient(bx, by, bx + sway, by - h);
    fg2.addColorStop(0, f.c); fg2.addColorStop(1, "rgba(255,255,200,0)"); ctx.fillStyle = fg2;
    ctx.beginPath(); ctx.moveTo(bx - f.w * s * 0.5, by); ctx.quadraticCurveTo(bx + sway, by - h, bx + sway * 0.5, by - h);
    ctx.quadraticCurveTo(bx + sway, by - h * 0.5, bx + f.w * s * 0.5, by); ctx.closePath(); ctx.fill(); ctx.restore();
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
}

export function triggerPhoenixRevive() {
  const g = _getG();
  const now = performance.now();
  g.run = false; g.p.revive--; g.p.hp = g.p.maxHp; g.p._iFrameEnd = now + 3000;
  sfx("phoenix");
  // cam via injected getter
  const cam = _getCam ? _getCam() : { x: 0, y: 0 };
  const VW = _getVW(), VH = _getVH();
  _phoenixAnim = { phase: "flyin", startTime: now, startX: cam.x + VW + 60, startY: cam.y - 60, targetX: g.p.x, targetY: g.p.y, flyDur: 1200, burstDur: 1000 };
}

export function getPhoenixAnim() { return _phoenixAnim; }
export function setPhoenixAnim(v) { _phoenixAnim = v; }
export function getPhoenixT() { return _phoenixT; }
export function setPhoenixT(v) { _phoenixT = v; }

export function phoenixAnimLoop() {
  const cx = _getCx();
  const fxctx = _getFxctx();
  const fxc = _getFxc();
  const VW = _getVW(), VH = _getVH();
  const g = _getG();
  if (!_phoenixAnim) return;
  const now = performance.now(), a = _phoenixAnim, elapsed = now - a.startTime;
  const cam = _getCam ? _getCam() : { x: 0, y: 0 };
  cx.save(); cx.translate(-cam.x, -cam.y);
  if (a.phase === "flyin") {
    const progress = Math.min(elapsed / a.flyDur, 1), ease = progress * progress * (3 - 2 * progress);
    const px = a.startX + (a.targetX - a.startX) * ease, py = a.startY + (a.targetY - a.startY) * ease, sc = 30 + ease * 50;
    if (progress < 1 && par.length < MAX_PARTICLES) {
      const colors = ["#FF6B6B", "#FF922B", "#FFD43B"];
      for (let i = 0; i < 3; i++) par.push({ x: px + rn(-8, 8), y: py + rn(-5, 10), vx: rn(-1, 1), vy: rn(-0.5, 1), life: 0.5 + Math.random() * 0.3, color: colors[i % 3], sz: rn(2, 4) });
    }
    cx.save(); cx.translate(px, py); cx.rotate(-0.3 * (1 - ease));
    drawPhoenixSprite(cx, 0, 0, sc, now, Math.sin(now / 100)); cx.restore();
    if (progress >= 1) {
      a.phase = "burst"; a.startTime = now;
      burst(a.targetX, a.targetY, "#FF922B", 15); burst(a.targetX, a.targetY, "#FFD43B", 10);
      g.dn.push({ x: a.targetX, y: a.targetY - 35, d: "🔥 不死鳥復活！", life: 2.5, color: "#FF922B", big: 1 });
      g.ene.forEach(oe => {
        const rdx = oe.x - a.targetX, rdy = oe.y - a.targetY, rd = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
        oe.x += rdx / rd * SPAWN_R; oe.y += rdy / rd * SPAWN_R; oe.frozen = 2000;
      });
    }
  }
  if (a.phase === "burst") {
    const bt = Math.min((now - a.startTime) / a.burstDur, 1), px = a.targetX, py = a.targetY;
    cx.save(); cx.globalAlpha = bt < 0.5 ? 1 : (1 - (bt - 0.5) / 0.5);
    drawPhoenixSprite(cx, px, py - 10, 60 * (1 - bt * 0.3), now, Math.sin(now / 250) * 0.4); cx.restore();
    ["#FF922B", "#FFD43B", "#FF6B6B"].forEach((col, i) => {
      const rr = bt * (50 + i * 25); cx.globalAlpha = (1 - bt) * (0.45 - i * 0.08);
      cx.shadowColor = col; cx.shadowBlur = 10; cx.strokeStyle = col; cx.lineWidth = 2.5 - i * 0.5;
      cx.beginPath(); cx.arc(px, py, rr, 0, Math.PI * 2); cx.stroke();
    });
    cx.globalAlpha = 1; cx.shadowBlur = 0;
    if (par.length < MAX_PARTICLES && bt < 0.8) {
      const fc = ["#FF922B", "#FFD43B", "#FF6B6B"];
      for (let i = 0; i < 2; i++) {
        const ang = Math.random() * Math.PI * 2, r = Math.random() * 25;
        par.push({ x: px + Math.cos(ang) * r, y: py + Math.sin(ang) * r, vx: Math.cos(ang) * rn(0.3, 1), vy: -rn(1.5, 3), life: 0.5 + Math.random() * 0.3, color: fc[Math.random() * 3 | 0], sz: rn(2, 4.5) });
      }
    }
    if (bt >= 1) { _phoenixAnim = null; _phoenixT = 0; g.run = true; g.lf = performance.now(); g.lS = performance.now(); }
  }
  cx.restore();
  const totalE = now - a.startTime, totalD = a.phase === "flyin" ? a.flyDur : a.burstDur;
  const tp = Math.min(totalE / totalD, 1), pa = a.phase === "flyin" ? (tp * 0.3) : (0.3 * (tp < 0.3 ? 1 : (1 - (tp - 0.3) / 0.7)));
  if (fxctx && fxc) {
    fxctx.clearRect(0, 0, VW, VH); fxctx.save();
    const pg = fxctx.createRadialGradient(VW / 2, VH / 2, 0, VW / 2, VH / 2, VW * 0.6);
    pg.addColorStop(0, "#FFD43B"); pg.addColorStop(0.3, "#FF922B"); pg.addColorStop(1, "transparent");
    fxctx.fillStyle = pg; fxctx.globalAlpha = pa * 0.4; fxctx.fillRect(0, 0, VW, VH);
    fxctx.restore(); fxc.style.display = "block";
  }
}

// ── cam injection ─────────────────────────────────────────────────────────────
let _getCam = null;

// ── initUi ────────────────────────────────────────────────────────────────────
export function initUi(deps) {
  if (deps.getG) _getG = deps.getG;
  if (deps.getInv) _getInv = deps.getInv;
  if (deps.getVW) _getVW = deps.getVW;
  if (deps.getVH) _getVH = deps.getVH;
  if (deps.setVW) _setVW = deps.setVW;
  if (deps.setVH) _setVH = deps.setVH;
  if (deps.getIsCoopMode) _getIsCoopMode = deps.getIsCoopMode;
  if (deps.getCv) _getCv = deps.getCv;
  if (deps.getFxc) _getFxc = deps.getFxc;
  if (deps.getFxctx) _getFxctx = deps.getFxctx;
  if (deps.getCx) _getCx = deps.getCx;
  if (deps.getCTimer) _getCTimer = deps.getCTimer;
  if (deps.setCTimer) _setCTimer = deps.setCTimer;
  if (deps.setShake) _setShake = deps.setShake;
  if (deps.getMode) _getMode = deps.getMode;
  if (deps.getCharType) _getCharType = deps.getCharType;
  if (deps.bossBgmStop) _bossBgmStop = deps.bossBgmStop;
  if (deps.getCam) _getCam = deps.getCam;
}

// ── window bindings ───────────────────────────────────────────────────────────
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.settingsGoHome = settingsGoHome;
window.toggleStatsPanel = toggleStatsPanel;
window.showTutorial = function () { show("tut"); };
