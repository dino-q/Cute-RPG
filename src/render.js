// Render module — drawing functions for player, enemy, particles, title hero
import S from "./state.js";
import {
  PI, TAU, MAX_PARTICLES, LIGHTNING_CAP,
  CHAR, ROLE_NORMAL, ROLE_FLANKER, ROLE_SHOOTER, ROLE_DASHER, ROLE_SHIELD
} from "./config.js";
import { rn, di, $ } from "./utils.js";

/* ═══ module-local refs (set by main.js via setters) ═══ */
let cx, g, fxQ = 1;

export function setCx(c) { cx = c; }
export function getCx() { return cx; }
export function setG(game) { g = game; }
export function getG() { return g; }
export function setFxQ(q) { fxQ = q; }
export function getFxQ() { return fxQ; }

/* ═══ particle pool ═══ */
export let par = [];
export function resetPar() { par = []; }
export function filterPar(fn) { par = par.filter(fn); }
export function setPar(arr) { par = arr; }

let _ltnRingIdx = 0;
export function resetLtnRingIdx() { _ltnRingIdx = 0; }

export function burst(x, y, col, n) {
  const cnt = Math.max(1, Math.floor(n * Math.max(.4, fxQ)));
  const maxP = Math.max(120, Math.floor(MAX_PARTICLES * Math.max(.5, fxQ)));
  for (let i = 0; i < cnt && par.length < maxP; i++) {
    const a = Math.PI * 2 * i / cnt + rn(-.3, .3), v = rn(1.5, 3.5);
    par.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: col, sz: rn(2, 5) });
  }
}

export function addLtn(x1, y1, x2, y2, life = 1) {
  if (!g) return;
  const wave = g.wave || 1;
  if ((fxQ < .55 && Math.random() > .55) || (wave >= 12 && Math.random() < .2)) return;
  const cap = Math.max(20, Math.floor(LIGHTNING_CAP * Math.max(.45, fxQ) * (wave >= 12 ? .8 : 1)));
  if (g.ltn.length < cap) {
    g.ltn.push({ x1, y1, x2, y2, life });
  } else {
    _ltnRingIdx = _ltnRingIdx % g.ltn.length;
    const e = g.ltn[_ltnRingIdx];
    e.x1 = x1; e.y1 = y1; e.x2 = x2; e.y2 = y2; e.life = life;
    _ltnRingIdx++;
  }
}

/* ═══ bullet FX color ═══ */
export function bCol() { const f = g.p.fx; if (f.dragon) return { f: "#FF922B", g: "#FF6B00", t: "#FF922B" }; if (f.fire) return { f: "#FF6B6B", g: "#FF4500", t: "#FF6B6B" }; if (f.ice) return { f: "#66D9E8", g: "#00CED1", t: "#66D9E8" }; if (f.lightning) return { f: "#FAB005", g: "#FFD700", t: "#FAB005" }; if (f.star) return { f: "#F06595", g: "#FF69B4", t: "#F06595" }; if (f.poison) return { f: "#A9E34B", g: "#82C91E", t: "#A9E34B" }; return { f: "#FFE066", g: "#74C0FC", t: "#FFE066" }; }

/* ═══ draw helpers ═══ */
export function drawPoly(x, y, r, sides, rot) { cx.beginPath(); for (let i = 0; i <= sides; i++) { const a = rot + Math.PI * 2 * i / sides; i === 0 ? cx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : cx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } cx.closePath(); cx.fill(); }
export function drawStar(x, y, r, pts, rot) { cx.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = rot + Math.PI * i / pts, rr = i % 2 === 0 ? r : r * .5; i === 0 ? cx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } cx.closePath(); cx.fill(); }

/* ═══ tier pixel sprites (tiers 1-4) ═══ */
let _tierSprites = null;
function _spx(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(x, y, w || 1, h || 1); }
function _getTierSprites() {
  if (_tierSprites) return _tierSprites;
  _tierSprites = {};
  // Tier 1: Bat (蝙蝠)
  { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const c = cv.getContext('2d');
    _spx(c,14,13,5,4,'#6a4a7a');_spx(c,15,12,3,1,'#7a5a8a');_spx(c,15,17,3,1,'#5a3a6a');
    _spx(c,15,10,3,2,'#7a5a8a');
    _spx(c,14,8,1,2,'#6a4a7a');_spx(c,18,8,1,2,'#6a4a7a');
    _spx(c,14,8,1,1,'#8a6a9a');_spx(c,18,8,1,1,'#8a6a9a');
    _spx(c,15,10,1,1,'#FF4444');_spx(c,17,10,1,1,'#FF4444');
    _spx(c,15,12,1,1,'#fff');_spx(c,17,12,1,1,'#fff');
    _spx(c,6,11,8,1,'#5a3a6a');_spx(c,4,12,10,1,'#6a4a7a');_spx(c,3,13,11,1,'#5a3a6a');
    _spx(c,4,14,4,1,'#6a4a7a');_spx(c,10,14,4,1,'#6a4a7a');
    _spx(c,5,15,2,1,'#5a3a6a');_spx(c,11,15,2,1,'#5a3a6a');
    _spx(c,19,11,8,1,'#5a3a6a');_spx(c,19,12,10,1,'#6a4a7a');_spx(c,19,13,11,1,'#5a3a6a');
    _spx(c,19,14,4,1,'#6a4a7a');_spx(c,25,14,4,1,'#6a4a7a');
    _spx(c,20,15,2,1,'#5a3a6a');_spx(c,26,15,2,1,'#5a3a6a');
    _spx(c,6,12,2,1,'#7a5a8a');_spx(c,25,12,2,1,'#7a5a8a');
    _tierSprites[1] = cv; }
  // Tier 2: Goblin (哥布林)
  { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const c = cv.getContext('2d');
    _spx(c,10,8,2,1,'#558B2F');_spx(c,21,8,2,1,'#558B2F');
    _spx(c,11,7,1,1,'#66AA33');_spx(c,21,7,1,1,'#66AA33');
    _spx(c,13,6,7,1,'#7CB342');_spx(c,12,7,9,5,'#689F38');_spx(c,13,12,7,1,'#689F38');
    _spx(c,13,8,3,2,'#FFD43B');_spx(c,17,8,3,2,'#FFD43B');
    _spx(c,14,9,1,1,'#1a1a00');_spx(c,18,9,1,1,'#1a1a00');
    _spx(c,16,10,1,1,'#558B2F');
    _spx(c,13,11,7,1,'#3a5a1a');_spx(c,14,11,1,1,'#fff');_spx(c,16,11,1,1,'#fff');_spx(c,18,11,1,1,'#fff');
    _spx(c,12,13,9,1,'#8B6914');_spx(c,11,14,11,5,'#A0522D');_spx(c,13,17,7,2,'#8B6914');
    _spx(c,9,14,2,4,'#689F38');_spx(c,22,14,2,4,'#689F38');
    _spx(c,24,10,2,3,'#8B4513');_spx(c,23,8,4,2,'#6D3A0A');
    _spx(c,12,19,3,3,'#689F38');_spx(c,18,19,3,3,'#689F38');
    _spx(c,11,22,4,1,'#558B2F');_spx(c,18,22,4,1,'#558B2F');
    _tierSprites[2] = cv; }
  // Tier 3: Shadow Mage (暗影巫師)
  { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const c = cv.getContext('2d');
    _spx(c,12,4,9,1,'#5a1a6a');_spx(c,11,5,11,3,'#4a1060');
    _spx(c,16,3,1,1,'#7a3a8a');
    _spx(c,12,8,9,3,'#2a0a30');
    _spx(c,14,9,2,1,'#DA77F2');_spx(c,18,9,2,1,'#DA77F2');
    _spx(c,14,9,1,1,'#fff');_spx(c,19,9,1,1,'#fff');
    _spx(c,10,11,13,1,'#5a1a6a');_spx(c,9,12,15,9,'#4a1060');
    _spx(c,11,12,11,6,'#3a0a50');
    _spx(c,15,14,3,1,'#DA77F2');_spx(c,16,13,1,3,'#DA77F2');
    _spx(c,7,5,1,16,'#5C3A1E');_spx(c,6,4,3,1,'#BE4BDB');_spx(c,5,3,5,1,'#DA77F2');
    _spx(c,7,2,1,1,'#fff');
    _spx(c,9,21,3,1,'#4a1060');_spx(c,13,21,2,2,'#4a1060');
    _spx(c,18,21,2,2,'#4a1060');_spx(c,21,21,3,1,'#4a1060');
    _spx(c,5,10,1,1,'#DA77F2');_spx(c,26,8,1,1,'#DA77F2');
    _spx(c,4,15,1,1,'#9C36B5');_spx(c,27,13,1,1,'#9C36B5');
    _tierSprites[3] = cv; }
  // Tier 4: Flame Demon (炎魔)
  { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const c = cv.getContext('2d');
    _spx(c,11,3,2,1,'#8B0000');_spx(c,10,4,2,2,'#A00000');
    _spx(c,20,3,2,1,'#8B0000');_spx(c,21,4,2,2,'#A00000');
    _spx(c,13,5,7,1,'#C0392B');_spx(c,12,6,9,5,'#E74C3C');_spx(c,13,11,7,1,'#C0392B');
    _spx(c,13,7,2,2,'#FFD43B');_spx(c,18,7,2,2,'#FFD43B');
    _spx(c,14,8,1,1,'#FF0');_spx(c,19,8,1,1,'#FF0');
    _spx(c,14,10,5,1,'#8B0000');_spx(c,15,10,1,1,'#fff');_spx(c,17,10,1,1,'#fff');
    _spx(c,3,10,2,1,'#8B0000');_spx(c,2,11,4,1,'#A00000');_spx(c,1,12,6,1,'#8B0000');
    _spx(c,2,13,5,1,'#C0392B');_spx(c,3,14,5,1,'#A00000');
    _spx(c,28,10,2,1,'#8B0000');_spx(c,27,11,4,1,'#A00000');_spx(c,26,12,6,1,'#8B0000');
    _spx(c,26,13,5,1,'#C0392B');_spx(c,24,14,5,1,'#A00000');
    _spx(c,10,12,13,1,'#C0392B');_spx(c,10,13,13,8,'#E74C3C');
    _spx(c,13,14,7,3,'#C0392B');_spx(c,15,15,3,1,'#FFD43B');_spx(c,16,14,1,3,'#FFD43B');
    _spx(c,8,13,2,5,'#E74C3C');_spx(c,23,13,2,5,'#E74C3C');
    _spx(c,7,18,2,1,'#FFD43B');_spx(c,24,18,2,1,'#FFD43B');
    _spx(c,10,21,13,1,'#8B0000');_spx(c,14,21,5,1,'#FFD43B');
    _spx(c,11,22,4,4,'#C0392B');_spx(c,18,22,4,4,'#C0392B');
    _spx(c,10,26,5,2,'#4a0000');_spx(c,18,26,5,2,'#4a0000');
    _spx(c,7,6,1,1,'#FF6');_spx(c,25,5,1,1,'#FF6');_spx(c,6,19,1,1,'#F80');_spx(c,26,20,1,1,'#F80');
    _tierSprites[4] = cv; }
  return _tierSprites;
}

/* ═══ weapon config ═══ */
// [bladeColor, glowColor, lengthMul, width, guardColor]
export const WP = {
  sword: ['#CED4DA', '#ADB5BD', 1.2, 4.2, '#FFD43B'],
  firesword: ['#FF6B6B', '#FF4500', 1.3, 4.8, '#FF922B'],
  icestaff: ['#66D9E8', '#4DABF7', 1.45, 3.4, '#339AF0'],
  katana: ['#FAB005', '#FFD700', 1.5, 3.2, '#FFE066'],
  dagger: ['#A9E34B', '#69DB7C', .95, 4.4, '#51CF66'],
  energyblade: ['#F06595', '#BE4BDB', 1.35, 4.2, '#DA77F2'],
  axe: ['#FF922B', '#E8590C', 1.05, 7.5, '#D9A100'],
  dragonblade: ['#FFD43B', '#FF922B', 1.65, 5.5, '#FF6B6B'],
  spear: ['#99E9F2', '#66D9E8', 1.8, 3, '#ADB5BD']
};
export function getWpn(fx) {
  if (!fx) return 'sword';
  if (fx.dragon >= 2) return 'dragonblade'; if (fx.dragon) return 'axe';
  if (fx.star >= 2) return 'energyblade'; if (fx.fire) return 'firesword';
  if (fx.ice) return 'icestaff'; if (fx.lightning) return 'katana';
  if (fx.poison) return 'dagger'; if (fx.whirl) return 'spear';
  if (fx.star) return 'energyblade'; return 'sword';
}

/* ═══ draw player (hero) ═══ */
// 迷你手槍繪製（槍手用，縮小版 pixel art）
function _drawMiniGun(cx, fxObj) {
  const f = fxObj || {};
  const hasE = f.fire || f.ice || f.lightning || f.poison || f.dragon || f.star;
  const SD = hasE ? f.fire ? "#5a2020" : f.ice ? "#2a4a5a" : f.lightning ? "#4a3a10" : f.poison ? "#1a3a1a" : f.dragon ? "#4a2a10" : "#3a1a3a" : "#3a3a3a";
  const SM = hasE ? f.fire ? "#8B3030" : f.ice ? "#3a6a7a" : f.lightning ? "#6a5520" : f.poison ? "#2a5a2a" : f.dragon ? "#7a4a1a" : "#5a2a5a" : "#4a4a4a";
  const SL = hasE ? f.fire ? "#C04040" : f.ice ? "#7ac4d8" : f.lightning ? "#c0a030" : f.poison ? "#5a9a3a" : f.dragon ? "#c08030" : "#a050a0" : "#5a5a5a";
  const SE = hasE ? f.fire ? "#3a1515" : f.ice ? "#1a3545" : f.lightning ? "#3a2a08" : f.poison ? "#0a2a0a" : f.dragon ? "#3a1a08" : "#2a0a2a" : "#2a2a2a";
  const MZ = hasE ? f.fire ? "#FF4500" : f.ice ? "#66D9E8" : f.lightning ? "#FAB005" : f.poison ? "#A9E34B" : f.dragon ? "#FF922B" : f.star ? "#F06595" : "#74C0FC" : "#74C0FC";
  // 滑套
  cx.fillStyle = SD; cx.fillRect(0, 0, 150, 28);
  cx.fillStyle = SL; cx.fillRect(2, 1, 146, 3);
  cx.fillStyle = SM; cx.fillRect(2, 5, 146, 8);
  cx.fillStyle = SE; cx.fillRect(0, 25, 150, 3);
  // 鋸齒紋
  cx.fillStyle = SE; for (let i = 0; i < 7; i++) cx.fillRect(8 + i * 6, 4, 2, 20);
  for (let i = 0; i < 3; i++) cx.fillRect(110 + i * 6, 6, 2, 16);
  // 退殼口
  cx.fillStyle = SE; cx.fillRect(55, 4, 18, 10); cx.fillStyle = SM; cx.fillRect(56, 5, 16, 8);
  // 前準星（元素色）
  cx.fillStyle = MZ; cx.globalAlpha = .8; cx.fillRect(140, -5, 5, 6); cx.globalAlpha = 1;
  cx.fillStyle = "#fff"; cx.globalAlpha = .5; cx.fillRect(141, -5, 3, 2); cx.globalAlpha = 1;
  // 後準星
  cx.fillStyle = SE; cx.fillRect(3, -4, 4, 5); cx.fillRect(13, -4, 4, 5);
  cx.fillStyle = SD; cx.fillRect(7, -3, 6, 4);
  // 下機匣
  cx.fillStyle = "#444"; cx.fillRect(18, 28, 100, 12);
  cx.fillStyle = SE; cx.fillRect(55, 36, 40, 4);
  // 扳機護圈
  cx.strokeStyle = "#1a1a1a"; cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(42, 28); cx.lineTo(42, 44); cx.arc(56, 44, 14, Math.PI, 0, false); cx.lineTo(70, 28); cx.stroke();
  cx.fillStyle = "rgba(30,30,30,.3)"; cx.fill();
  // 扳機
  cx.strokeStyle = "#555"; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(57, 30); cx.lineTo(54, 42); cx.stroke();
  cx.fillStyle = "#555"; cx.beginPath(); cx.arc(54, 43, 2, 0, Math.PI * 2); cx.fill();
  // 握把
  cx.fillStyle = "#1a1a1a"; cx.beginPath(); cx.moveTo(18, 28); cx.lineTo(42, 28); cx.lineTo(39, 76); cx.lineTo(11, 76); cx.closePath(); cx.fill();
  cx.fillStyle = "#2a2a2a"; for (let r2 = 0; r2 < 6; r2++) for (let c2 = 0; c2 < 3; c2++) cx.fillRect(17 + c2 * 7 + (r2 % 2) * 3, 36 + r2 * 7, 3, 3);
  cx.fillStyle = "#353535"; cx.beginPath(); cx.moveTo(18, 28); cx.lineTo(22, 28); cx.lineTo(14, 76); cx.lineTo(11, 76); cx.closePath(); cx.fill();
  // 彈匣底板
  cx.fillStyle = "#2a2a2a"; cx.fillRect(11, 73, 29, 5); cx.fillStyle = "#404040"; cx.fillRect(12, 74, 27, 2);
  // 槍口
  cx.fillStyle = "#111"; cx.fillRect(148, 6, 4, 18);
  cx.fillStyle = "#000"; cx.beginPath(); cx.arc(150, 15, 5, 0, Math.PI * 2); cx.fill();
  cx.strokeStyle = MZ; cx.globalAlpha = .4; cx.lineWidth = 2; cx.beginPath(); cx.arc(150, 15, 6.5, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1;
  cx.strokeStyle = "#444"; cx.lineWidth = 1; cx.beginPath(); cx.arc(150, 15, 5.5, 0, Math.PI * 2); cx.stroke();
  // 輪廓
  cx.strokeStyle = "#1a1a1a"; cx.lineWidth = 2; cx.strokeRect(0, 0, 150, 28);
  // 元素紋路發光線
  cx.strokeStyle = MZ; cx.lineWidth = .8; cx.globalAlpha = .15;
  cx.beginPath(); cx.moveTo(50, 14); cx.lineTo(135, 14); cx.stroke(); cx.globalAlpha = 1;
  // 高光
  cx.fillStyle = SL; cx.globalAlpha = .3; cx.fillRect(30, 2, 40, 2); cx.fillRect(90, 2, 30, 2); cx.globalAlpha = 1;
}
// 劍繪製（直接移植自 sword-swing-preview）
function _drawSword(cx, r, fxObj) {
  const f = fxObj || {};
  const gc = f.fire ? "#FF4500" : f.ice ? "#66D9E8" : f.lightning ? "#FAB005" : f.poison ? "#A9E34B" : f.dragon ? "#FF922B" : f.star ? "#F06595" : "#FFD43B";
  const bm = f.fire ? "#C04040" : f.ice ? "#8abace" : f.lightning ? "#c0a030" : f.poison ? "#5a9a3a" : f.dragon ? "#c08030" : f.star ? "#a050a0" : "#E8E8E8";
  const bl2 = f.fire ? "#8B3030" : f.ice ? "#3a6a7a" : f.lightning ? "#6a5520" : f.poison ? "#2a5a2a" : f.dragon ? "#7a4a1a" : f.star ? "#5a2a5a" : "#CED4DA";
  const be = f.fire ? "#5a2020" : f.ice ? "#2a4a5a" : f.lightning ? "#4a3a10" : f.poison ? "#1a3a1a" : f.dragon ? "#4a2a10" : f.star ? "#3a1a3a" : "#ADB5BD";
  cx.save();
  cx.shadowColor = gc; cx.shadowBlur = 10;
  const bg2 = cx.createLinearGradient(0, -r * 2, 0, 0);
  bg2.addColorStop(0, "#fff"); bg2.addColorStop(.2, bm); bg2.addColorStop(.6, bl2); bg2.addColorStop(1, be);
  cx.fillStyle = bg2;
  cx.beginPath(); cx.moveTo(-2.8, 0); cx.lineTo(-2.2, -r * 1.7); cx.lineTo(0, -r * 2); cx.lineTo(2.2, -r * 1.7); cx.lineTo(2.8, 0); cx.closePath(); cx.fill();
  cx.shadowBlur = 0;
  cx.strokeStyle = "rgba(255,255,255,.4)"; cx.lineWidth = .6;
  cx.beginPath(); cx.moveTo(0, -r * .2); cx.lineTo(0, -r * 1.85); cx.stroke();
  cx.strokeStyle = "rgba(255,255,255,.2)"; cx.lineWidth = .8;
  cx.beginPath(); cx.moveTo(-2.5, -r * .1); cx.lineTo(-2, -r * 1.6); cx.lineTo(0, -r * 1.95); cx.stroke();
  // guard
  cx.fillStyle = gc;
  cx.beginPath(); cx.moveTo(-8, -1); cx.lineTo(-7, 2.5); cx.lineTo(7, 2.5); cx.lineTo(8, -1); cx.closePath(); cx.fill();
  cx.strokeStyle = "rgba(0,0,0,.3)"; cx.lineWidth = .5; cx.stroke();
  cx.fillStyle = "#FF6B6B"; cx.beginPath(); cx.arc(0, .8, 1.8, 0, TAU); cx.fill();
  cx.fillStyle = "rgba(255,255,255,.4)"; cx.beginPath(); cx.arc(-.5, .3, .7, 0, TAU); cx.fill();
  // handle
  cx.fillStyle = "#5C3A1E"; cx.fillRect(-2.5, 2.5, 5, r * .4);
  cx.strokeStyle = "#8B6914"; cx.lineWidth = .8;
  for (let i = 0; i < 4; i++) { cx.beginPath(); cx.moveTo(-2.5, 4 + i * 2.5); cx.lineTo(2.5, 5.5 + i * 2.5); cx.stroke(); }
  cx.fillStyle = gc; cx.beginPath(); cx.arc(0, 2.5 + r * .4 + 2, 2.5, 0, TAU); cx.fill();
  cx.restore();
}
function _drawMiniShield(cx, fxObj) {
  const ec = fxObj && fxObj.fire ? "#FF4500" : fxObj && fxObj.ice ? "#66D9E8" : fxObj && fxObj.lightning ? "#FAB005" : fxObj && fxObj.poison ? "#A9E34B" : fxObj && fxObj.dragon ? "#FF922B" : fxObj && fxObj.star ? "#F06595" : "#51CF66";
  cx.fillStyle = "#868E96"; cx.beginPath();
  cx.moveTo(0, -12); cx.lineTo(10, -6); cx.lineTo(9, 6); cx.lineTo(0, 13); cx.lineTo(-9, 6); cx.lineTo(-10, -6); cx.closePath(); cx.fill();
  cx.shadowColor = ec; cx.shadowBlur = 6; cx.strokeStyle = ec; cx.lineWidth = 1.5; cx.stroke(); cx.shadowBlur = 0;
  cx.strokeStyle = "rgba(255,255,255,.12)"; cx.lineWidth = .6;
  cx.beginPath(); cx.moveTo(0, -9); cx.lineTo(7, -4); cx.lineTo(6, 4); cx.lineTo(0, 10); cx.lineTo(-6, 4); cx.lineTo(-7, -4); cx.closePath(); cx.stroke();
  cx.fillStyle = ec; cx.beginPath(); cx.arc(0, 1, 2, 0, Math.PI * 2); cx.fill();
}

export function drawPlayer(x, y, r, t, col, face) {
  cx.save(); const f = face || 1, bob = Math.sin(t * 3) * 1.5, cy = y + bob;
  const fx = g ? g.p.fx : {};
  const ct = g ? g.charType : "gunner";
  const cc = CHAR[ct] || CHAR.gunner;
  // shadow
  cx.fillStyle = "rgba(0,0,0,.2)"; cx.beginPath(); cx.ellipse(x, y + r + 2, r * (ct === "tank" ? .75 : .6), 2.5, 0, 0, Math.PI * 2); cx.fill();

  // 攻擊動畫進度
  const _atkA = g && g._atkAnim && g._atkAnim.active;
  const _atkEl = _atkA ? (performance.now() - g._atkAnim.startT) : 0;
  const _wbS = g && g._wbSwing || 0;

  if (ct === "gunner") {
    // ─── 槍手：身體 + 槍（含後座力動畫）───
    const bg = cx.createRadialGradient(x - f * r * .1, cy - r * .3, r * .1, x, cy, r);
    bg.addColorStop(0, "#fff"); bg.addColorStop(.3, cc.colMid); bg.addColorStop(1, cc.col);
    cx.beginPath(); cx.arc(x, cy, r, 0, TAU); cx.fillStyle = bg; cx.fill();
    cx.strokeStyle = "rgba(0,0,0,.06)"; cx.lineWidth = 1; cx.stroke();
    // gun
    const _gAd = (g && g.ad) ? g.ad : { x: f, y: 0 };
    const _gAng = Math.atan2(_gAd.y, _gAd.x);
    const _gLeft = Math.abs(_gAng) > PI / 2;
    const _gDist = r * .85;
    // 後座力：射擊時槍往後退再回來（普攻也有微後座力）
    const _now2 = performance.now();
    const _lastFire = g ? _now2 - g.lhF : 999;
    const recoil = _lastFire < 120 ? Math.max(0, 1 - _lastFire / 120) * 4 : 0;
    // 槍口閃光（每次射擊都顯示）
    const mzDist2 = r * 1.2;
    const mzX = x + Math.cos(_gAng) * mzDist2, mzY = cy + Math.sin(_gAng) * mzDist2;
    if (_lastFire < 60) {
      const fp = _lastFire / 60;
      cx.save(); cx.globalAlpha = (1 - fp) * .7;
      cx.fillStyle = "#FFE066"; cx.beginPath(); cx.arc(mzX, mzY, 4 + fp * 6, 0, TAU); cx.fill();
      cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(mzX, mzY, 2, 0, TAU); cx.fill();
      cx.restore();
    }
    cx.save();
    cx.translate(x, cy);
    cx.rotate(_gAng);
    if (_gLeft) cx.scale(1, -1);
    cx.translate(r * .3 - recoil, 0);
    cx.scale(.09, .09);
    cx.translate(0, -14);
    _drawMiniGun(cx, fx);
    cx.restore();
  } else if (ct === "swordsman") {
    // ─── 劍士（參考 sword-swing-preview）：劍在後面 → 身體覆蓋 ───
    const wt = getWpn(fx), w = WP[wt] || WP.sword;
    const baseAng = f * .5;
    const pivotX = x + f * r * .9, pivotY = cy - r * .15;
    let sRot = 0, sOx = 0, sOy = 0, sPhase = "idle";
    const _isQiSpin = _atkA && g._atkAnim && g._atkAnim._qiSpin;
    if (_atkA && _isQiSpin) {
      const thrustAng = 1.07 * f;
      const t1 = 60, t2 = 80, t3 = 60, t4 = 120;
      if (_atkEl < t1) { const p = _atkEl / t1, e2 = 1 - (1 - p) * (1 - p); sRot = e2 * thrustAng; sOx = e2 * 3 * f; sOy = e2 * 2; sPhase = "raise"; }
      else if (_atkEl < t1 + t2) { const p = (_atkEl - t1) / t2, e2 = 1 - (1 - p) * (1 - p); sRot = thrustAng; sOx = (3 + e2 * 18) * f; sOy = 2; sPhase = "thrust"; }
      else if (_atkEl < t1 + t2 + t3) { sRot = thrustAng; sOx = 21 * f; sOy = 2; sPhase = "thrust"; }
      else if (_atkEl < t1 + t2 + t3 + t4) { const p = (_atkEl - t1 - t2 - t3) / t4, e2 = p * p; sRot = thrustAng * (1 - e2); sOx = 21 * f * (1 - e2); sOy = 2 * (1 - e2); sPhase = "recover"; }
    } else if (_atkA) {
      const t1 = 100, t2 = 140, t3 = 160;
      if (_atkEl < t1) { const p = _atkEl / t1, e2 = p * p; sRot = -e2 * 1.8 * f; sOx = -e2 * 4 * f; sOy = -e2 * 8; sPhase = "raise"; }
      else if (_atkEl < t1 + t2) { const p = (_atkEl - t1) / t2, e2 = 1 - (1 - p) * (1 - p); sRot = (-1.8 + e2 * 4.3) * f; sOx = (-4 + e2 * 10) * f; sOy = -8 + e2 * 18; sPhase = "slash"; }
      else if (_atkEl < t1 + t2 + t3) { const p = (_atkEl - t1 - t2) / t3, e2 = p * p; sRot = 2.5 * f * (1 - e2); sOx = 6 * f * (1 - e2); sOy = 10 * (1 - e2); sPhase = "recover"; }
    }
    cx.save(); cx.translate(pivotX + sOx, pivotY + sOy);
    cx.rotate(baseAng + sRot);
    if (sPhase === "idle") cx.rotate(Math.sin(t * 5) * .06);
    _drawSword(cx, r, fx);
    cx.restore();
    if (sPhase === "slash") {
      const totalAng = baseAng + sRot;
      cx.save();
      if (_isQiSpin) {
        const tipX = pivotX + sOx + Math.sin(totalAng) * r * 2;
        const tipY = pivotY + sOy - Math.cos(totalAng) * r * 2;
        cx.globalAlpha = .5; cx.strokeStyle = "#FFD43B"; cx.lineWidth = 2;
        cx.shadowColor = "#FFD43B"; cx.shadowBlur = 10;
        cx.beginPath(); cx.moveTo(tipX, tipY); cx.lineTo(tipX + Math.sin(totalAng) * 25, tipY - Math.cos(totalAng) * 25); cx.stroke();
        cx.strokeStyle = "rgba(255,255,255,.4)"; cx.lineWidth = 4;
        cx.beginPath(); cx.moveTo(tipX - 5 * Math.sin(totalAng), tipY + 5 * Math.cos(totalAng));
        cx.lineTo(tipX + Math.sin(totalAng) * 30, tipY - Math.cos(totalAng) * 30); cx.stroke();
        cx.shadowBlur = 0;
      } else {
        cx.globalAlpha = .5; cx.strokeStyle = "rgba(255,255,255,.6)"; cx.lineWidth = 2.5;
        cx.beginPath(); cx.arc(pivotX + sOx, pivotY + sOy, r * 2, totalAng - PI / 2 - .6, totalAng - PI / 2 + .3); cx.stroke();
        cx.strokeStyle = "rgba(255,213,75,.3)"; cx.lineWidth = 4;
        cx.beginPath(); cx.arc(pivotX + sOx, pivotY + sOy, r * 2.2, totalAng - PI / 2 - .4, totalAng - PI / 2 + .2); cx.stroke();
      }
      cx.restore();
    }
    const bg = cx.createRadialGradient(x - f * r * .1, cy - r * .3, r * .1, x, cy, r);
    bg.addColorStop(0, "#fff"); bg.addColorStop(.3, cc.colMid); bg.addColorStop(1, cc.col);
    cx.beginPath(); cx.arc(x, cy, r, 0, TAU); cx.fillStyle = bg; cx.fill();
    cx.strokeStyle = "rgba(255,255,255,.12)"; cx.lineWidth = 1; cx.stroke();
    // headband
    cx.save(); cx.strokeStyle = "#FF922B"; cx.lineWidth = 3; cx.globalAlpha = .85;
    cx.shadowColor = "#FF922B"; cx.shadowBlur = 6;
    cx.beginPath(); cx.arc(x, cy - 1, r + 1.5, -PI * .75, -PI * .42); cx.stroke();
    const hbx = x - f * r * .85, hby = cy - r * .55;
    cx.lineWidth = 2.2; cx.lineCap = "round";
    cx.beginPath(); cx.moveTo(hbx, hby);
    cx.quadraticCurveTo(hbx - f * 10, hby + 5 + Math.sin(t * 4) * 4, hbx - f * 16, hby + 10 + Math.sin(t * 3) * 5);
    cx.stroke();
    cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(hbx - f * 1, hby + 2);
    cx.quadraticCurveTo(hbx - f * 8, hby + 8 + Math.sin(t * 3.5) * 3, hbx - f * 13, hby + 14 + Math.sin(t * 2.8) * 4);
    cx.stroke(); cx.restore();
  } else if (ct === "assassin") {
    // ─── 刺客（參考 assassin-chibi-preview）：頭罩 + 飄帶 + 交叉匕首 ───
    const _aAd = (g && g.ad) ? g.ad : { x: f, y: 0 };
    const _aAng = Math.atan2(_aAd.y, _aAd.x);
    const _now = performance.now();
    // 隱身效果（影襲 or 暗影步擊殺）
    const _shadowActive = g && (
      (g.p._shadowStrikeEnd && _now < g.p._shadowStrikeEnd) ||
      (g.p._shadowStepEnd && _now < g.p._shadowStepEnd)
    );
    if (_shadowActive) {
      cx.globalAlpha = .35 + Math.sin(_now / 50) * .12;
      // 隱身紫色光環特效
      cx.save();
      cx.strokeStyle = "#DA77F2"; cx.lineWidth = 1.5;
      cx.globalAlpha = .3 + Math.sin(_now / 100) * .15;
      cx.shadowColor = "#BE4BDB"; cx.shadowBlur = 10;
      cx.setLineDash([4, 4]);
      cx.beginPath(); cx.arc(x, cy, r + 5 + Math.sin(_now / 150) * 2, 0, TAU); cx.stroke();
      cx.setLineDash([]);
      cx.shadowBlur = 0;
      cx.restore();
      cx.globalAlpha = .35 + Math.sin(_now / 50) * .12;
    }

    // === 紫色飄帶（身體後方）===
    cx.save(); cx.lineCap = "round"; cx.globalAlpha = .85;
    cx.shadowColor = "#BE4BDB"; cx.shadowBlur = 6;
    const rbx = x - f * r * .8, rby = cy - r * .3;
    cx.strokeStyle = "#BE4BDB"; cx.lineWidth = 2.5;
    cx.beginPath(); cx.moveTo(rbx, rby);
    cx.quadraticCurveTo(rbx - f * 14, rby + 6 + Math.sin(t * 4) * 5, rbx - f * 28, rby + 12 + Math.sin(t * 3) * 7);
    cx.stroke();
    cx.lineWidth = 1.8; cx.strokeStyle = "#9C36B5";
    cx.beginPath(); cx.moveTo(rbx - f * 2, rby + 3);
    cx.quadraticCurveTo(rbx - f * 10, rby + 10 + Math.sin(t * 3.5) * 4, rbx - f * 22, rby + 18 + Math.sin(t * 2.8) * 6);
    cx.stroke();
    cx.lineWidth = 1; cx.strokeStyle = "#DA77F2"; cx.globalAlpha = .5;
    cx.beginPath(); cx.moveTo(rbx - f * 1, rby + 5);
    cx.quadraticCurveTo(rbx - f * 8, rby + 14 + Math.sin(t * 3) * 3, rbx - f * 18, rby + 22 + Math.sin(t * 2.5) * 5);
    cx.stroke();
    cx.shadowBlur = 0; cx.restore();

    // === 雙匕首（交叉斬動畫）===
    let dPush = 0;
    const crossAmt = _atkA ? Math.sin(t * 10) : Math.sin(t * 6) * .3;
    const crossSpd = _atkA ? Math.cos(t * 10) : 0;
    if (_atkA) {
      const t1 = 60, t2 = 100, t3 = 90;
      if (_atkEl < t1) { dPush = (_atkEl / t1) * 14; }
      else if (_atkEl < t1 + t2) { dPush = 14 * (1 - (_atkEl - t1) / t2 * .5); }
      else if (_atkEl < t1 + t2 + t3) { dPush = 7 * (1 - (_atkEl - t1 - t2) / t3); }
    }
    const pivotX = x + f * r * .65 + Math.cos(_aAng) * dPush, pivotY = cy + Math.sin(_aAng) * dPush * .5;
    const spread = crossAmt * .45;
    // 斬擊殘影
    if (_atkA && Math.abs(crossSpd) > .7) {
      cx.save(); cx.globalAlpha = .12 + Math.abs(crossSpd) * .08;
      cx.strokeStyle = "#DA77F2"; cx.lineWidth = 1; cx.lineCap = "round";
      cx.beginPath(); cx.moveTo(pivotX - 4, pivotY - r * .6); cx.lineTo(pivotX + r * .5, pivotY + r * .3); cx.stroke();
      cx.beginPath(); cx.moveTo(pivotX - 4, pivotY + r * .6); cx.lineTo(pivotX + r * .5, pivotY - r * .3); cx.stroke();
      cx.restore();
    }
    // 匕首繪製 helper
    const _drawDagger = (offY, baseRot, crossRot) => {
      cx.save();
      cx.translate(pivotX, pivotY + offY);
      cx.rotate(baseRot + crossRot);
      cx.shadowColor = "#BE4BDB"; cx.shadowBlur = 5;
      const bg2 = cx.createLinearGradient(0, -r * .65, 0, 0);
      bg2.addColorStop(0, "#fff"); bg2.addColorStop(.25, "#E8E8E8"); bg2.addColorStop(.6, "#CED4DA"); bg2.addColorStop(1, "#ADB5BD");
      cx.fillStyle = bg2;
      cx.beginPath(); cx.moveTo(-1.8, 0); cx.lineTo(-1.2, -r * .55); cx.lineTo(0, -r * .72); cx.lineTo(1.2, -r * .55); cx.lineTo(1.8, 0); cx.closePath(); cx.fill();
      cx.strokeStyle = "rgba(255,255,255,.5)"; cx.lineWidth = .5;
      cx.beginPath(); cx.moveTo(0, -r * .1); cx.lineTo(0, -r * .65); cx.stroke();
      cx.strokeStyle = "rgba(190,75,219,.3)"; cx.lineWidth = .8;
      cx.beginPath(); cx.moveTo(1.4, -r * .1); cx.lineTo(.9, -r * .5); cx.stroke();
      cx.shadowBlur = 0;
      cx.fillStyle = "#9C36B5";
      cx.beginPath(); cx.moveTo(-5, -1); cx.lineTo(-4.5, 1.5); cx.lineTo(4.5, 1.5); cx.lineTo(5, -1); cx.closePath(); cx.fill();
      cx.fillStyle = "#FFD43B"; cx.beginPath(); cx.arc(0, .2, 1.3, 0, TAU); cx.fill();
      cx.fillStyle = "#2a0a30"; cx.fillRect(-1.8, 1.5, 3.6, r * .2);
      cx.restore();
    };
    _drawDagger(-r * .15, f > 0 ? -.4 : -.4 + PI, spread);
    _drawDagger(r * .15, f > 0 ? .4 : .4 + PI, -spread);
    // 交叉火花
    if (_atkA && crossAmt < -.6) {
      cx.save();
      const gi = (-crossAmt - .6) / .4;
      cx.globalAlpha = gi * .7; cx.shadowColor = "#fff"; cx.shadowBlur = 8; cx.fillStyle = "#fff";
      cx.beginPath(); cx.arc(pivotX + r * .15, pivotY, 2, 0, TAU); cx.fill();
      cx.fillStyle = "#DA77F2"; cx.shadowColor = "#BE4BDB";
      cx.beginPath(); cx.arc(pivotX + r * .15, pivotY, 1.5 * gi, 0, TAU); cx.fill();
      cx.restore();
    }

    // === 身體（紫色球 chibi 漸層）===
    const bg = cx.createRadialGradient(x - f * r * .12, cy - r * .32, r * .08, x, cy, r);
    bg.addColorStop(0, "#fff"); bg.addColorStop(.2, "#F3E4FF"); bg.addColorStop(.55, "#DDB4FE"); bg.addColorStop(.8, "#C577F2"); bg.addColorStop(1, "#9C36B5");
    cx.beginPath(); cx.arc(x, cy, r, 0, TAU); cx.fillStyle = bg; cx.fill();
    cx.strokeStyle = "rgba(255,255,255,.1)"; cx.lineWidth = 1; cx.stroke();
    cx.fillStyle = "rgba(255,255,255,.1)";
    cx.beginPath(); cx.arc(x - r * .15, cy - r * .25, r * .42, 0, TAU); cx.fill();
    cx.fillStyle = "rgba(255,255,255,.08)";
    cx.beginPath(); cx.arc(x - r * .25, cy - r * .35, r * .2, 0, TAU); cx.fill();

    // === 面罩（紫色弧線，簡潔神秘）===
    cx.save(); cx.globalAlpha = .8;
    cx.strokeStyle = "#9C36B5"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, cy + 1, r - 2, PI * .1, PI * .9); cx.stroke();
    cx.restore();

    // === 邊緣光暈 ===
    cx.save();
    const edgeGlow = cx.createRadialGradient(x, cy, r - 2, x, cy, r + 6);
    edgeGlow.addColorStop(0, "transparent"); edgeGlow.addColorStop(.6, "rgba(190,75,219,.08)"); edgeGlow.addColorStop(1, "rgba(190,75,219,.02)");
    cx.fillStyle = edgeGlow; cx.beginPath(); cx.arc(x, cy, r + 6, 0, TAU); cx.fill();
    cx.restore();

    // === 暗影粒子（旋轉菱形）===
    for (let i = 0; i < 5; i++) {
      const a = t * 2 + i * TAU / 5;
      const dist = r * 1.6 + Math.sin(t * 2.2 + i * 1.4) * 4;
      const px = x + Math.cos(a) * dist, py = cy + Math.sin(a) * dist;
      cx.save(); cx.globalAlpha = .22 + Math.sin(t * 3 + i) * .1;
      cx.shadowColor = "#BE4BDB"; cx.shadowBlur = 4; cx.fillStyle = "#DA77F2";
      cx.translate(px, py); cx.rotate(a + t);
      cx.beginPath(); cx.moveTo(0, -2.5); cx.lineTo(1.8, 0); cx.lineTo(0, 2.5); cx.lineTo(-1.8, 0); cx.closePath();
      cx.fill(); cx.restore();
    }

    // === 速度線 ===
    cx.save(); cx.globalAlpha = .1 + Math.sin(t * 6) * .05; cx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      cx.strokeStyle = i % 2 ? "#DA77F2" : "#BE4BDB"; cx.lineWidth = .8;
      const ly = cy - 12 + i * 6;
      cx.beginPath(); cx.moveTo(x - f * 22, ly); cx.lineTo(x - f * (34 + Math.sin(t * 5 + i) * 5), ly); cx.stroke();
    }
    cx.restore();

    // === 脈衝環 ===
    cx.save(); cx.strokeStyle = "#BE4BDB"; cx.lineWidth = 1;
    cx.globalAlpha = .06 + Math.sin(t * 1.8) * .03;
    cx.beginPath(); cx.arc(x, cy, r + 16, 0, TAU); cx.stroke();
    cx.restore();

    // 擊殺加速特效
    if (g && g.p._killSpeedEnd && _now < g.p._killSpeedEnd) {
      cx.save(); cx.globalAlpha = .3 + Math.sin(_now / 80) * .1;
      cx.strokeStyle = "#DA77F2"; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(x, cy, r + 4, 0, TAU); cx.stroke();
      cx.restore();
    }
    if (_shadowActive) { cx.globalAlpha = 1; }
  } else {
    // ─── 坦克（也作為未知角色的 fallback）：身體 + 盾（盾擊推出動畫）───
    const tr = r * 1.1;
    cx.strokeStyle = "rgba(81,207,102,.15)"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(x, cy, tr + 2, 0, TAU); cx.stroke();
    const bg = cx.createRadialGradient(x - f * r * .1, cy - r * .3, r * .15, x, cy, tr);
    bg.addColorStop(0, "#fff"); bg.addColorStop(.25, cc.colMid); bg.addColorStop(.7, cc.col); bg.addColorStop(1, cc.colDark);
    cx.beginPath(); cx.arc(x, cy, tr, 0, TAU); cx.fillStyle = bg; cx.fill();
    cx.strokeStyle = "rgba(0,0,0,.06)"; cx.lineWidth = 1; cx.stroke();
    // shield — 盾擊推出（參考 tank-preview）
    const _tAd = (g && g.ad) ? g.ad : { x: f, y: 0 };
    const _tAng = Math.atan2(_tAd.y, _tAd.x);
    let tPush = 0, tScale = 1;
    if (_atkA) {
      const t1 = 80, t2 = 220;
      if (_atkEl < t1) { const p = _atkEl / t1; tPush = p * 18; tScale = 1 + p * .15; }
      else if (_atkEl < t1 + t2) { const p = (_atkEl - t1) / t2; tPush = 18 * (1 - p); tScale = 1 + .15 * (1 - p); }
    }
    cx.save();
    cx.translate(x + Math.cos(_tAng) * (tr * .55 + tPush), cy + Math.sin(_tAng) * (tr * .35 + tPush * .6));
    cx.rotate(_tAng + Math.sin(t * 3) * .03);
    if (tScale !== 1) cx.scale(tScale, tScale);
    _drawMiniShield(cx, fx); cx.restore();
    // 衝擊波（推出階段）
    if (_atkA && _atkEl > 30 && _atkEl < 200) {
      const sp = (_atkEl - 30) / 170;
      cx.save(); cx.globalAlpha = (1 - sp) * .4;
      cx.strokeStyle = "#51CF66"; cx.lineWidth = 2.5 * (1 - sp); cx.shadowColor = "#51CF66"; cx.shadowBlur = 6;
      const wR = tr + sp * 30;
      cx.beginPath(); cx.arc(x + Math.cos(_tAng) * tPush, cy + Math.sin(_tAng) * tPush * .6, wR, _tAng - PI * .3, _tAng + PI * .3); cx.stroke();
      cx.shadowBlur = 0; cx.restore();
    }
  }

  // 守護星盾牌（卡牌效果，所有角色通用）
  if (g && g.p._sh && ct !== "tank") {
    cx.save(); cx.translate(x + f * r * .55, cy + r * .15); cx.rotate(f > 0 ? -.15 : .15);
    cx.globalAlpha = .9;
    cx.fillStyle = "#868E96"; cx.beginPath();
    cx.moveTo(0, -8); cx.lineTo(7, -4); cx.lineTo(6, 4); cx.lineTo(0, 9); cx.lineTo(-6, 4); cx.lineTo(-7, -4); cx.closePath(); cx.fill();
    cx.strokeStyle = "#ADB5BD"; cx.lineWidth = 1.2; cx.stroke();
    cx.strokeStyle = "#CED4DA"; cx.lineWidth = .8;
    cx.beginPath(); cx.moveTo(0, -5); cx.lineTo(0, 6); cx.stroke();
    cx.beginPath(); cx.moveTo(-4, 0); cx.lineTo(4, 0); cx.stroke();
    cx.fillStyle = "#fff"; cx.globalAlpha = .3; cx.beginPath(); cx.arc(-1.5, -2, 2, 0, Math.PI * 2); cx.fill();
    cx.restore();
  }
  cx.restore();
}

/* ═══ draw enemy ═══ */
export function drawEnemy(e) {
  const x = e.x, y = e.y, r = e.r, tier = e.tier || 0, f = e.face || 1;
  const bob = Math.sin(e.t * 3) * 2, cy = y + bob;
  const bhLeft = (e.bhExeAt || 0) - (g ? g.time : 0);
  cx.save();
  // 精英怪光環 + 物抗標示
  if (e.eliteEnemy) {
    const enow = performance.now();
    cx.globalAlpha = .3 + Math.sin(enow / 200) * .1; cx.fillStyle = "#E74C3C";
    cx.beginPath(); cx.arc(x, cy, r * 1.5, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
    cx.globalAlpha = .6; cx.font = "8px 'Nunito',sans-serif"; cx.textAlign = "center";
    cx.fillStyle = "#ADB5BD"; cx.fillText("🛡️物抗", x, cy - r - 6); cx.globalAlpha = 1;
    if (e._eShieldEnd && enow < e._eShieldEnd) {
      cx.globalAlpha = .4 + Math.sin(enow / 80) * .15; cx.strokeStyle = "#4DABF7"; cx.lineWidth = 2.5;
      cx.beginPath(); cx.arc(x, cy, r + 5, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1;
    }
  }
  // shadow
  cx.fillStyle = "rgba(0,0,0,.12)"; cx.beginPath(); cx.ellipse(x, y + r + 2, r * .65, 2.5, 0, 0, Math.PI * 2); cx.fill();
  // tier glow
  if (tier >= 2) {
    const gr = cx.createRadialGradient(x, cy, r * .5, x, cy, r + 5);
    const gc = tier >= 4 ? "rgba(255,50,50,.18)" : tier >= 3 ? "rgba(190,78,219,.15)" : "rgba(255,165,0,.12)";
    gr.addColorStop(0, gc); gr.addColorStop(1, "transparent"); cx.fillStyle = gr; cx.beginPath(); cx.arc(x, cy, r + 5, 0, Math.PI * 2); cx.fill();
  }
  if (bhLeft > 0) {
    const p = 1 - bhLeft / 260;
    cx.save();
    cx.globalAlpha = .32 + Math.sin((g ? g.time : 0) * .04) * .15;
    cx.strokeStyle = "#CED4DA"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, cy, r * (1.1 + .25 * p), 0, Math.PI * 2); cx.stroke();
    cx.strokeStyle = "#495057"; cx.lineWidth = 1.5; cx.setLineDash([4, 3]);
    cx.beginPath(); cx.arc(x, cy, r * (1.55 - .45 * p), 0, Math.PI * 2); cx.stroke();
    cx.setLineDash([]); cx.restore();
  }
  // shape by tier — 幾何圖形（圓/三角/菱形/五角/星形）
  cx.fillStyle = e.color;
  if (tier === 0) { cx.beginPath(); cx.arc(x, cy, r, 0, Math.PI * 2); cx.fill(); }
  else if (tier === 1) { drawPoly(x, cy, r, 3, -Math.PI / 2 + Math.sin(e.t) * .15 + f * .1); }
  else if (tier === 2) { drawPoly(x, cy, r, 4, Math.PI / 4 + Math.sin(e.t * .7) * .1); }
  else if (tier === 3) { drawPoly(x, cy, r, 5, -Math.PI / 2 + f * .08); }
  else { drawStar(x, cy, r * 1.1, 5, e.t * .4); }
  cx.strokeStyle = tier >= 3 ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.08)"; cx.lineWidth = tier >= 3 ? 1.5 : 1; cx.stroke();
  // highlight
  cx.beginPath(); cx.arc(x + f * r * .15, cy - r * .22, r * .28, 0, Math.PI * 2); cx.fillStyle = "rgba(255,255,255,.2)"; cx.fill();
  // face
  const s = r * .26, pd = f * s * .2;
  const fwS = 1.08, bwS = .88;
  const leS = f < 0 ? fwS : bwS, reS = f > 0 ? fwS : bwS;
  cx.fillStyle = "#222";
  if (tier <= 1) {
    cx.beginPath(); cx.arc(x + pd - s * .75, cy, s * .27 * leS, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(x + pd + s * .75, cy, s * .27 * reS, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#fff";
    cx.beginPath(); cx.arc(x + pd - s * .6 + f * s * .08, cy - s * .15, s * .12, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(x + pd + s * .9 + f * s * .08, cy - s * .15, s * .12, 0, Math.PI * 2); cx.fill();
  } else {
    cx.beginPath(); cx.ellipse(x + pd - s * .8, cy - s * .1, s * .38 * leS, s * .25, 0, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.ellipse(x + pd + s * .8, cy - s * .1, s * .38 * reS, s * .25, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = tier >= 4 ? "#FF6B6B" : "#fff";
    cx.beginPath(); cx.arc(x + pd - s * .65 + f * s * .1, cy - s * .2, s * .14, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(x + pd + s * .95 + f * s * .1, cy - s * .2, s * .14, 0, Math.PI * 2); cx.fill();
  }
  // brows
  cx.strokeStyle = "#222"; cx.lineWidth = tier >= 3 ? 2 : 1.5;
  cx.beginPath(); cx.moveTo(x + pd - s * 1.3, cy - s * (.8 + (f < 0 ? .15 : 0))); cx.lineTo(x + pd - s * .25, cy - s * (.5 - (f < 0 ? .05 : 0))); cx.stroke();
  cx.beginPath(); cx.moveTo(x + pd + s * 1.3, cy - s * (.8 + (f > 0 ? .15 : 0))); cx.lineTo(x + pd + s * .25, cy - s * (.5 - (f > 0 ? .05 : 0))); cx.stroke();
  // mouth
  cx.lineWidth = 1.3; cx.beginPath();
  if (tier >= 3) { cx.moveTo(x + pd - s * .5, cy + s * .6); cx.lineTo(x + pd + f * s * .1, cy + s * .95); cx.lineTo(x + pd + s * .5, cy + s * .6); cx.stroke(); }
  else { cx.arc(x + pd, cy + s * .7, s * .3, 1.15 * Math.PI, 1.85 * Math.PI); cx.stroke(); }
  // tier badge
  if (tier >= 2) { cx.fillStyle = tier >= 4 ? "#FF4444" : tier >= 3 ? "#BE4BDB" : "#FF922B"; cx.font = "bold " + (tier >= 4 ? 9 : 7) + "px Nunito"; cx.textAlign = "center"; cx.fillText(tier >= 4 ? "★★★" : tier >= 3 ? "★★" : "★", x, cy + r + 10); }
  // HP bar
  const hpR = e.hp / e.mhp;
  if (hpR < 1) { const bw = r * 2, bh = 3; cx.fillStyle = "rgba(0,0,0,.3)"; cx.fillRect(x - bw / 2, cy - r - (tier >= 2 ? 9 : 6), bw, bh); cx.fillStyle = hpR > .5 ? "#51CF66" : hpR > .25 ? "#FFA94D" : "#FF6B6B"; cx.fillRect(x - bw / 2, cy - r - (tier >= 2 ? 9 : 6), bw * hpR, bh); }
  // role indicators
  const role = e.role || ROLE_NORMAL;
  if (role === ROLE_SHOOTER) {
    cx.strokeStyle = "#FF6B6B"; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(x, cy - r - 8, 3.5, 0, Math.PI * 2); cx.stroke();
    cx.beginPath(); cx.moveTo(x - 5, cy - r - 8); cx.lineTo(x + 5, cy - r - 8); cx.moveTo(x, cy - r - 13); cx.lineTo(x, cy - r - 3); cx.stroke();
  }
  if (role === ROLE_DASHER) {
    if (e.dashState === 1) { cx.save(); cx.globalAlpha = .35 + Math.sin(e.t * 12) * .2; cx.strokeStyle = "#FF4444"; cx.lineWidth = 2.5; cx.setLineDash([4, 3]); cx.beginPath();
      cx.moveTo(x, cy); cx.lineTo(x + e.dashDx * 50, cy + e.dashDy * 50); cx.stroke(); cx.setLineDash([]); cx.restore(); }
    if (e.dashState === 2) {
      cx.save(); cx.globalAlpha = .15; cx.fillStyle = e.color; cx.beginPath(); cx.arc(x - e.dashDx * 12, cy - e.dashDy * 12, r * .8, 0, Math.PI * 2); cx.fill(); cx.restore(); }
  }
  if (role === ROLE_SHIELD) {
    cx.save(); cx.strokeStyle = "rgba(77,171,247,.7)"; cx.lineWidth = 3; cx.beginPath();
    const sa = e.shieldAng + Math.PI; cx.arc(x, cy, r + 3, sa - Math.PI * .55, sa + Math.PI * .55); cx.stroke();
    cx.strokeStyle = "rgba(77,171,247,.25)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, cy, r + 6, sa - Math.PI * .45, sa + Math.PI * .45); cx.stroke(); cx.restore();
  }
  if (role === ROLE_FLANKER) {
    cx.save(); cx.globalAlpha = .4; cx.strokeStyle = "#DA77F2"; cx.lineWidth = 1; cx.beginPath();
    for (let i = 0; i < 12; i++) { const a = e.t * 2 + i * .52, rr = r + 2 + i * .5; cx.lineTo(x + Math.cos(a) * rr, cy + Math.sin(a) * rr); } cx.stroke(); cx.restore();
  }
  // boss ring
  if (e.boss) {
    cx.strokeStyle = e.mega ? "#FF6B6B" : "#FFD43B"; cx.lineWidth = e.mega ? 3 : 2; cx.setLineDash([3, 3]); cx.beginPath(); cx.arc(x, cy, r + 5, 0, Math.PI * 2); cx.stroke(); cx.setLineDash([]);
    if (e.mega) { cx.globalAlpha = .6; cx.strokeStyle = "#fff"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, cy, r + 12, 0, Math.PI * 2); cx.stroke(); }
  }
  // 暴走視覺
  if (e._rage && e._rageDashes < 3) {
    const enow = performance.now();
    cx.globalAlpha = .3 + Math.sin(enow / 60) * .15; cx.strokeStyle = "#FF4040"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, cy, r + 4, 0, Math.PI * 2); cx.stroke();
    if (e._rageState === "charge") {
      cx.globalAlpha = .4 + Math.sin(enow / 80) * .2; cx.setLineDash([4, 3]); cx.strokeStyle = "#FF0000"; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(x, cy); cx.lineTo(x + e._rageDx * 60, cy + e._rageDy * 60); cx.stroke(); cx.setLineDash([]);
    }
  }
  // co-op shield bubble + circles
  if (e._coopShield && e._coopCircles) {
    const enow = performance.now();
    cx.globalAlpha = .2 + Math.sin(enow / 300) * .1; cx.strokeStyle = "#4DABF7"; cx.lineWidth = 2.5;
    cx.beginPath(); cx.arc(x, cy, r + 15, 0, Math.PI * 2); cx.stroke();
    cx.globalAlpha = .06; cx.fillStyle = "#4DABF7"; cx.beginPath(); cx.arc(x, cy, r + 15, 0, Math.PI * 2); cx.fill();
    e._coopCircles.forEach(c => {
      const occ = (g && g.p && di(g.p, c) < 30) || (g && g.p2 && di(g.p2, c) < 30);
      cx.globalAlpha = .4 + Math.sin(enow / 200) * .2;
      cx.strokeStyle = occ ? "#51CF66" : "#FFD43B"; cx.lineWidth = 2.5;
      cx.beginPath(); cx.arc(c.x, c.y, 25, 0, Math.PI * 2); cx.stroke();
      cx.globalAlpha = .08; cx.fillStyle = occ ? "#51CF66" : "#FFD43B";
      cx.beginPath(); cx.arc(c.x, c.y, 25, 0, Math.PI * 2); cx.fill();
    });
  }
  // broken shield timer indicator
  if (e._coopShieldBrokenEnd > 0) {
    const enow = performance.now(), left = (e._coopShieldBrokenEnd - enow) / 3000;
    if (left > 0) { cx.globalAlpha = .6; cx.strokeStyle = "#FF4040"; cx.lineWidth = 3;
      cx.beginPath(); cx.arc(x, cy, r + 15, -.5 * Math.PI, -.5 * Math.PI + left * Math.PI * 2); cx.stroke(); }
  }
  cx.restore();
}

/* ═══ title hero ═══ */
let _titlePar = [], _titleSlash = 0, _titleSlashX = 0, _titleSlashFace = 1;
(function drawTitleHero() {
  const hc = $("heroCanvas"); if (!hc) return;
  try {
    const hctx = hc.getContext("2d");
    const _origCx = cx; cx = hctx;
    const _origG = g;
    const t = performance.now() / 1000;
    const now = performance.now();
    const walkX = 80 + Math.sin(t * .8) * 55;
    const face = Math.cos(t * .8) > 0 ? 1 : -1;
    g = { charType: "swordsman", p: { fx: {}, _sh: false }, ad: { x: face, y: 0 }, _wbSwing: 0, _atkAnim: { active: false, startT: 0 } };
    hctx.clearRect(0, 0, 160, 60);

    _titlePar = _titlePar.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.life -= .02;
      if (p.life <= 0) return false;
      hctx.globalAlpha = p.life * p.a; hctx.fillStyle = p.c;
      hctx.beginPath(); hctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); hctx.fill();
      return true;
    });
    hctx.globalAlpha = 1;

    if (Math.random() < .4) {
      _titlePar.push({ x: walkX + rn(-4, 4), y: 42 + rn(0, 3), vx: -Math.cos(t * .8) * .3 + rn(-.2, .2), vy: rn(-.3, -.1), life: 1, a: .3, c: "rgba(116,192,252,.5)", s: rn(1, 2.5), g: .01 });
    }

    if (Math.random() < .08) {
      _titlePar.push({ x: rn(10, 150), y: rn(5, 50), vx: 0, vy: rn(-.1, .1), life: 1, a: .6, c: "#fff", s: rn(.5, 1.5), g: 0 });
    }

    if (_titleSlash <= 0 && Math.random() < .008) {
      _titleSlash = 1; _titleSlashX = walkX; _titleSlashFace = face;
      g._atkAnim = { active: true, startT: now }; g.ad = { x: face, y: 0 };
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI * .3 + Math.PI * .6 * i / 8;
        _titlePar.push({ x: walkX + face * 12, y: 28, vx: Math.cos(a) * face * rn(1.5, 3), vy: Math.sin(a) * rn(1, 2), life: 1, a: .7, c: i % 2 ? "#74C0FC" : "#fff", s: rn(1, 3), g: 0 });
      }
    }

    if (_titleSlash > 0) {
      const sp = 1 - _titleSlash;
      hctx.save();
      hctx.globalAlpha = _titleSlash * .8;
      hctx.strokeStyle = "#74C0FC"; hctx.lineWidth = 2.5;
      hctx.shadowColor = "#74C0FC"; hctx.shadowBlur = 8;
      hctx.beginPath();
      const cx2 = _titleSlashX + _titleSlashFace * 12;
      hctx.arc(cx2, 30, 14 + sp * 18, -Math.PI * .6 + sp * .3, -Math.PI * .6 + Math.PI * .8 * sp);
      hctx.stroke();
      hctx.globalAlpha = _titleSlash * .5; hctx.strokeStyle = "#fff"; hctx.lineWidth = 1; hctx.shadowBlur = 0;
      hctx.beginPath();
      hctx.arc(cx2, 30, 10 + sp * 14, -Math.PI * .5 + sp * .2, -Math.PI * .5 + Math.PI * .7 * sp);
      hctx.stroke();
      hctx.restore();
      _titleSlash = Math.max(0, _titleSlash - .025);
    }

    drawPlayer(walkX, 35, 16, t, "#74C0FC", face);

    hctx.save(); hctx.globalAlpha = .08 + Math.sin(t * 2) * .04;
    hctx.fillStyle = "#74C0FC"; hctx.beginPath(); hctx.arc(walkX, 35, 22, 0, Math.PI * 2); hctx.fill();
    hctx.restore();

    g = _origG; cx = _origCx;
  } catch (e) {}
  requestAnimationFrame(drawTitleHero);
})();
