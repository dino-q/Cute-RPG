import {endingArtReady,drawBossEndingFrame,bossName} from './boss-art.js';
import {drawPixelGunner} from './gunner-sprite.js';
import {drawPixelMelee} from './melee-sprite.js';
import { drawPixelPhoenix, drawCardWorld } from './card-vfx.js';
import { getLayoutViewport, applyControlLayout, setLayoutNotice } from './control-layout.js';
import { cardEmblem, pixelEmblem } from "./button-art.js";
/**
 * ui.js — 選單、設定、結果畫面、cutscene、鳳凰復活動畫
 * 依賴：state, config, utils, audio, render, hud, input
 */
import { EXP_BASE, EXP_SCALE, MAX_PARTICLES, SPAWN_R } from "./config.js";
import { $ } from "./utils.js";
import { C } from "./cards.js";
import { RC, LVC, charCfg, PR } from "./config.js";
import { sfx, bgmStop, bgmPlay, getActx, getMuted } from "./audio.js";
import { setHudVW, setHudVH } from "./hud.js";
import { par, filterPar, burst } from "./render.js";
import { rn } from "./utils.js";
import { rebindActiveTouches, resetControls } from "./input.js";
import { getPracticeMode, showCardTip } from "./practice.js";

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
  const cv = _getCv() || document.getElementById('cv');
  const fxc = _getFxc() || document.getElementById('fx');
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
  const viewport = getLayoutViewport({left:safeL,top:topPad,width:sw-safeL-safeR,height:sh-topPad-botPad});
  const aw = viewport.width;
  const ah = viewport.height;
  const ratio = aw / ah;
  const newVW = isLand ? Math.round(400 * ratio) : 400;
  const newVH = isLand ? 400 : Math.round(400 / ratio);
  if (VW !== newVW || VH !== newVH) {
    VW = newVW; VH = newVH;
    _setVW(VW); _setVH(VH);
    setHudVW(VW); setHudVH(VH);
    let pausedFrame;
    if(cv && g && !g.run){pausedFrame=document.createElement('canvas');pausedFrame.width=cv.width;pausedFrame.height=cv.height;pausedFrame.getContext('2d').drawImage(cv,0,0);}
    if (cv) { cv.width = VW; cv.height = VH; if(pausedFrame)cv.getContext('2d').drawImage(pausedFrame,0,0,VW,VH); }
    if (fxc) { fxc.width = VW; fxc.height = VH; }
  }
  [cv, fxc].forEach(c => {
    if (c) { c.style.width = aw + "px"; c.style.height = ah + "px"; c.style.left = viewport.left + "px"; c.style.top = viewport.top + "px"; }
  });
  const ctl = $("ctl");
  if (ctl && isLand) { ctl.style.paddingLeft = (safeL + 12) + "px"; ctl.style.paddingRight = (safeR + 12) + "px"; }
  else if (ctl) { ctl.style.paddingLeft = "12px"; ctl.style.paddingRight = "12px"; }
  $("minimap").style.display = g ? "block" : "none";
  // iOS: 按鈕收緊到攻擊搖桿旁（螢幕小、無全螢幕）
  const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (_isIOS) {
    const uw = $("ultW"), sb = $("skillBtn"), db = $("dodgeBtn");
    if (uw) { uw.style.bottom = "120px"; uw.style.right = "4px"; }
    if (sb) { sb.style.bottom = "108px"; sb.style.right = "70px"; sb.style.width = "min(44px,11vw)"; sb.style.height = "min(44px,11vw)"; }
    if (db) { db.style.bottom = "58px"; db.style.right = "110px"; db.style.width = "min(44px,11vw)"; db.style.height = "min(44px,11vw)"; }
  }
  applyControlLayout();
}

// ── show ──────────────────────────────────────────────────────────────────────
export function show(n) {
  ["titleOv", "charSelectOv", "tutOv", "pickOv", "overOv", "victoryOv", "practiceOv", "coopOv"].forEach(id => {
    const el = $(id); if (el) el.style.display = "none";
  });
  if (n === "title") {
    $('titleOv').style.display='flex';
    let button=$('continueAdventureBtn');
    if(!button){button=document.createElement('button');button.id='continueAdventureBtn';button.className='menu-control primary';button.style.cssText='width:100%;box-sizing:border-box;padding:12px;font-size:14px;margin:0;display:none';button.onclick=continueAdventure;$('continueAdventureSlot').appendChild(button);}
    const session=_getG();button.style.display=session?._homeSuspended?'block':'none';button.textContent='繼續冒險 · Lv'+(session?.level||1);$('continueAdventureSlot').style.display=session?._homeSuspended?'block':'none';
  }
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
      if (_isCoopMode&&!g.pickOpen&&!g._localPickTransition&&!g._localPickQueue?.length) { g.p._inv = false; g.p._pickPending = false; }
      g.run = true;
      const n = performance.now();
      g.lS = n; g.laF = n; g.lhF = n; g.lf = n; g.lastKill = n; g.lastHunt = 0; g.p._iFrameEnd = n + 1500;
      rebindActiveTouches();
      if (cb) cb();
    });
  });
}

// ── resetSessionUi ────────────────────────────────────────────────────────────
let chaosNoticeTimer;
export function showChaosNotice(notice,session=_getG()){
 if(!notice?.gains?.length||!session||session._shownChaosNotice===notice.id)return;
 session._shownChaosNotice=notice.id;clearTimeout(chaosNoticeTimer);setLayoutNotice('chaosNotice','',false);
 const panel=document.getElementById('chaosNotice');if(!panel)return;panel.replaceChildren();panel.hidden=false;
 panel.style.cssText='position:fixed;top:max(76px,env(safe-area-inset-top));right:12px;z-index:10000;max-width:calc(100vw - 24px);width:290px;box-sizing:border-box;padding:14px 16px;border:1px solid #bda063;border-radius:12px;background:rgba(16,20,35,.97);color:#e4dfd2;box-shadow:0 8px 26px rgba(0,0,0,.3);pointer-events:auto';
 const title=document.createElement('strong');title.textContent='混沌核心 · Lv'+notice.level;title.style.cssText='display:block;color:#e6c78a;font-size:15px;margin-bottom:7px';panel.appendChild(title);
 const summary=document.createElement('div');summary.textContent='本次增加 '+notice.gains.length+' 項能力'+(notice.level>1?' · 累計 '+notice.total+' 項':'');summary.style.cssText='font-size:11px;color:#acb2bf;margin-bottom:8px';panel.appendChild(summary);
 for(const gain of notice.gains){const line=document.createElement('div');line.textContent=gain;line.style.cssText='font-size:13px;line-height:1.8';panel.appendChild(line);}
 const close=document.createElement('button');close.textContent='知道了';close.className='menu-control quiet';close.style.cssText='margin-top:10px;padding:5px 12px;font-size:11px';close.onclick=()=>{panel.hidden=true;};panel.appendChild(close);applyControlLayout();
 chaosNoticeTimer=setTimeout(()=>{panel.hidden=true;},4000);
}

export function resetSessionUi() {
  clearTimeout(chaosNoticeTimer);setLayoutNotice("chaosNotice","",false);
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
let endingCancel=null;
export function playEndCutscene(onComplete){
 const game=_getG(),ov=document.getElementById('endCutsceneOv'),cv=document.getElementById('endFx');
 if(!ov||!cv){onComplete?.();return;}
 endingCancel?.();resetControls();ov.style.display='block';ov.style.opacity='1';
 document.body.classList.add('ending-playing');
 const ctx=cv.getContext('2d'),type=game?._finalBoss?.type||30;
 const players=[{...game?.p,charType:game?.charType||'gunner'},...(game?.p2?[{...game.p2}]:[])];
 let done=false,raf=0,start=null;
 const skip=document.getElementById('endSkip');
 const fit=()=>{cv.width=Math.max(1,window.innerWidth);cv.height=Math.max(1,window.innerHeight);};fit();window.addEventListener('resize',fit);
 function finish(call=true){if(done)return;done=true;cancelAnimationFrame(raf);window.removeEventListener('resize',fit);skip?.removeEventListener('click',skipNow);document.removeEventListener('keydown',keys);
 ov.style.display='none';document.body.classList.remove('ending-playing');endingCancel=null;if(call)onComplete?.();}
 function skipNow(ev){ev?.stopPropagation();finish();}
 function keys(ev){if(ev.key==='Escape'||ev.key==='Enter'){ev.preventDefault();finish();}}
 endingCancel=()=>finish(false);skip?.addEventListener('click',skipNow);document.addEventListener('keydown',keys);
 function hero(c,x,y,r,t,front){players.forEach((p,i)=>{const xx=x+(i-(players.length-1)/2)*r*2.2,dir=front?{x:0,y:1}:{x:0,y:-1};
 if(p.charType==='gunner')drawPixelGunner(c,xx,y,r,dir,0,p);
 else drawPixelMelee(c,p.charType,xx,y,r,dir,{active:false},p,{}, {sword:()=>{},shield:()=>{}},true,dir);});}
 function frame(now){if(done)return;if(game&&_getG()!==game){finish(false);return;}
 if(start===null)start=now;const t=(now-start)/1000;drawBossEndingFrame(ctx,type,t,cv.width,cv.height,hero);
 if(t>=9.5){finish();return;}raf=requestAnimationFrame(frame);}
 // Start the timeline only when the ending art has finished loading.
 endingArtReady.then(()=>{if(!done)raf=requestAnimationFrame(frame);});
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
    <div class="screen-emblem">${pixelEmblem("crown")}</div>
    <h1 style="font-size:26px;font-weight:900;color:#FFD43B;margin:0 0 6px;text-shadow:0 0 20px #FFD43B60;animation:fadeIn .8s both">恭喜通關！</h1>
    <p style="color:rgba(255,255,255,.5);font-size:11px;margin:0 0 18px;animation:fadeIn 1s .3s both">你擊敗了${bossName(g._finalBoss?.type||30)}！</p>
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
      <div style="color:#FFD43B;font-size:20px;font-weight:900;margin-bottom:8px">${inv.length} / ${C.length}</div>
      <div style="display:flex;gap:3px;justify-content:center;flex-wrap:wrap;max-height:100px;overflow-y:auto">${inv.map(ci => { const cd = C.find(c => c.id === ci.id); return cd ? `<span style="display:inline-flex;align-items:center;gap:2px;background:rgba(255,255,255,.05);border-radius:5px;padding:2px 5px;font-size:10px;border:1px solid ${RC[cd.r]}25;color:${RC[cd.r]}">${cardEmblem(cd,true)}${cd.n}<span style="font-size:8px;font-weight:900;background:${LVC[ci.lv]};color:#000;border-radius:2px;padding:0 3px;margin-left:2px">Lv${ci.lv + 1}</span></span>` : ""; }).join("")}</div>
    </div>
    <button class="btn btn-b" style="margin-top:18px;animation:fadeIn 1s 1.2s both;box-shadow:0 0 20px rgba(255,215,0,.3)" onclick="SG()"> 再來一次</button>`;
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
  if(!g||g._victoryPending)return;
  g._finalBoss={type:bossE.stageBoss||30,phase:bossE.sbPhase||1};
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
    if(_getG()!==g)return;
    g.run = false;
    playEndCutscene(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => showVictoryScreen()));
    });
  }, 1500);
}

// ── showOver ──────────────────────────────────────────────────────────────────
export function showOver() {
  const g = _getG();
  if(g)g._gameOver=true;
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
        return `<span style="display:inline-flex;align-items:center;gap:2px;background:rgba(255,255,255,.05);border-radius:5px;padding:2px 6px;font-size:10px;border:1px solid ${RC[cd.r]}25;color:${RC[cd.r]}">${cardEmblem(cd,true)}${cd.n}<span style="font-size:8px;font-weight:900;background:${LVC[ci.lv]};color:#000;border-radius:2px;padding:0 3px;margin-left:2px">Lv${ci.lv + 1}</span></span>`;
      }).join("") + '</div>';
  }
  p.innerHTML = `<div class="screen-emblem">${pixelEmblem("skull")}</div><h1 style="font-size:24px;font-weight:900;color:#FF6B6B;margin:0 0 12px">冒險結束！</h1><div style="background:rgba(255,255,255,.03);border-radius:12px;padding:14px 24px;margin-bottom:12px;border:1px solid rgba(255,255,255,.05)"><div style="color:rgba(255,255,255,.4);font-size:11px">最終分數</div><div style="color:#FFD43B;font-size:34px;font-weight:900">${g.score}</div><div style="display:flex;gap:16px;justify-content:center;margin-top:8px"><div><div style="color:rgba(255,255,255,.3);font-size:10px">等級</div><div style="color:#74C0FC;font-size:16px;font-weight:700">${g.level}</div></div><div><div style="color:rgba(255,255,255,.3);font-size:10px">擊殺</div><div style="color:#FF6B6B;font-size:16px;font-weight:700">${g.kills}</div></div></div></div>${cardsHtml}<button class="btn btn-b" style="margin-top:12px" onclick="SG()"> 再來一次</button><button class="btn" style="margin-top:8px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.5)" onclick="overGoHome()"> 返回首頁</button>`;
  show("over");
}

// ── Settings panel ────────────────────────────────────────────────────────────
let _bossBgmStop = null;

export function openSettings() {
  const g = _getG();
  if (!_settingsOpen) _wasRunning = !!(g && g.run);
  _settingsOpen = true;
  if (g) { g.run = false; g.ultHold = false; }
  resetControls();
  const ov = document.getElementById("settingsOv");
  if (ov) ov.style.display = "flex";
  // 更新靜音按鈕狀態
  const muted = getMuted();
  const tog = document.getElementById("sfxToggle");
  const knob = document.getElementById("sfxKnob");
  if (tog && knob) {
    tog.style.background = muted ? "#394653" : "#7eaf84";
    tog.setAttribute("aria-pressed",String(!muted));
    knob.style.left = muted ? "3px" : "27px";
  }
}

export function closeSettings() {
  cancelSettingsCardPress();const tip=$("cardTip");if(tip)tip.style.display="none";
  _settingsOpen = false;
  const ov = document.getElementById("settingsOv");
  if (ov) ov.style.display = "none";
  // 隱藏 stats 面板
  const ss = document.getElementById("settingsStats");
  if (ss) ss.style.display = "none";
  const g = _getG();
  if (_wasRunning && g) { g.run = true; g.lf = performance.now(); }
}

export function settingsGoHome(){
 const session=_getG();
 // Never call closeSettings here: it would briefly resume the paused game.
 _settingsOpen=false;_wasRunning=false;const ov=$('settingsOv');if(ov)ov.style.display='none';
 const stats=$('settingsStats');if(stats)stats.style.display='none';resetControls();
 if(session){session.run=false;if(!session._victoryPending&&(session.p.hp>0||session.p2?.hp>0))session._homeSuspended=true;}
 show('title');
}
export function continueAdventure(){
 const session=_getG();if(!session?._homeSuspended)return;
 session._homeSuspended=false;session._homeRestartApproved=false;
 if(session.pickOpen){show('pick');return;}
 bgmPlay();resumeGame();
}
export function confirmAdventureRestart(proceed){
 const session=_getG();if(!session?._homeSuspended||session._homeRestartApproved){proceed();return;}
 if(document.getElementById('restartAdventureDialog'))return;
 const ov=document.createElement('div');ov.id='restartAdventureDialog';ov.className='coin-overlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','重新開始冒險');
 ov.innerHTML='<section class="coin-panel"><div class="coin-kicker">你還有一場冒險</div><h2>要重新開始嗎？</h2><p class="coin-odds" style="line-height:1.8;margin-bottom:20px">重新開始會取代目前角色、卡片與關卡進度。</p><button class="menu-control primary" style="margin-bottom:10px">繼續原本冒險</button><button class="menu-control quiet">放棄進度，重新開始</button></section>';
 document.body.appendChild(ov);const buttons=ov.querySelectorAll('button');buttons[0].onclick=()=>{ov.remove();continueAdventure();};buttons[1].onclick=()=>{ov.remove();session._homeRestartApproved=true;proceed();};buttons[0].focus();
}

let cancelSettingsCardPress=()=>{};
function bindSettingsCardDetails(container,session,player){
 cancelSettingsCardPress();
 for(const row of container.querySelectorAll('[data-card-id]')){
  let timer=null,start=null;
  const cancel=()=>{clearTimeout(timer);timer=null;start=null;};
  const open=()=>{if(!_settingsOpen||_getG()!==session||!row.isConnected||container.style.display==='none')return;
   showCardTip(Number(row.dataset.cardId),{level:Number(row.dataset.cardLevel),charType:player.charType||session.charType});};
  row.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;cancelSettingsCardPress();cancelSettingsCardPress=cancel;start={x:e.clientX,y:e.clientY,id:e.pointerId};timer=setTimeout(()=>{timer=null;open();},450);});
  row.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)cancel();});
  for(const event of ['pointerup','pointercancel','pointerleave'])row.addEventListener(event,cancel);
  row.addEventListener('contextmenu',e=>e.preventDefault());
  row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();cancel();open();}});
 }
}

export function toggleStatsPanel() {
  const g = _getG();
  const client=!!(g?.p2&&g._remoteStateSeq!==undefined&&_getIsCoopMode());
  const inv=client?(g._clientInventory||[]):_getInv();
  const ss = document.getElementById("settingsStats");
  if (!ss) return;
  const isOpen = ss.style.display !== "none";
  if (isOpen) {
    ss.style.display = "none";
  } else {
    ss.style.display = "block";
    if (!g) { ss.innerHTML = '<div style="color:rgba(255,255,255,.4)">遊戲未開始</div>'; return; }
    const p=client?g.p2:g.p;
    let h = '<h3 class="settings-section-title">'+pixelEmblem('shield')+'角色能力</h3>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;margin-bottom:8px">';
    const _cc=charCfg(p.charType||g.charType);
    const _atkSpd = _cc.atkType === "melee" && _cc.atkCD > 0
      ? (1000 / (_cc.atkCD * (p.fr || 1))).toFixed(1) + "次/秒"
      : Math.round(1000 / (115 * (p.fr || 1))) + "發/秒";
    const ps = [
      ["等級", client?g.p2Level:g.level], ["攻擊力", Math.round(p.atk)],
      ["攻速", _atkSpd], ["攻擊距離", _cc.atkType === "ranged" ? "遠程" : Math.round(PR * 5)],
      ["移速", p.speed?.toFixed(1)],
      ["暴擊率", Math.round((p.crit || .05) * 100) + "%"], ["護甲", Math.round((p.armor || 0) * 100) + "%"],
      ["閃避", Math.round((p.dodge || 0) * 100) + "%"], ["分裂", p.split || 1],
      ["穿透", p.pierce || 0], ["吸血", p.ls || 0],
      ["回復", p.regen?.toFixed(1) || 0], ["復活", p.revive || 0],
      ["緩速", p.slow < 1 ? Math.round((1 - p.slow) * 100) + "%" : "無"], ["反刺", p.thorns ? Math.round(p.thorns * 100) + "%" : "無"],
      ["元素倍率", p.elemBoost?.toFixed(1) || 1], ["Boss傷", p.bossDmg?.toFixed(1) || 1],
      ["等級傷害", ((p.levelDmgMul || 1) * 100 - 100).toFixed(0) + "%"], ["風刃", p.windBlades || 0],
      ["召喚球", p.orbiters || 0], ["迴力鏢", p.boomerang || 0],
    ];
    ps.forEach(([k, v]) => { h += `<div class="settings-stat-row"><span style="color:rgba(255,255,255,.5)">${k}</span><span style="color:#fff;font-weight:700">${v}</span></div>`; });
    h += '</div>';
    if (inv.length) {
      h += '<div style="color:rgba(255,255,255,.4);font-size:10px;margin-bottom:4px">卡牌（' + inv.length + '/'+C.length+'）· 長按查看效果</div>';
      h += '<div class="settings-card-list">';
      inv.forEach(ci => {
        const cd = C.find(c => c.id === ci.id);
        if (cd) h += `<div class="settings-card-row" data-card-id="${ci.id}" data-card-level="${ci.lv}" role="button" tabindex="0" aria-label="${cd.n} Lv${ci.lv+1}，長按查看效果" style="--card-color:${RC[cd.r]};user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:pan-y;cursor:pointer">${cardEmblem(cd,true)}<span>${cd.n}</span><b>${cd.r} · Lv${ci.lv+1}</b></div>`;
      });
      h += '</div>';
    }
    ss.innerHTML=h;bindSettingsCardDetails(ss,g,p);
  }
}

// ── Phoenix revival animation ─────────────────────────────────────────────────
export function drawPhoenixSprite(ctx,cx2,cy2,size,time,flapPhase){drawPixelPhoenix(ctx,cx2,cy2,size,time,flapPhase);}

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
      g.dn.push({ x: a.targetX, y: a.targetY - 35, d: " 不死鳥復活！", life: 2.5, color: "#FF922B", big: 1 });
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
    cx.globalAlpha=1;cx.shadowBlur=0;
    drawCardWorld(cx,{p:{x:px,y:py}},now,18,1.2*(1-bt));
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
