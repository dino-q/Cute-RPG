import {showChaosNotice} from './ui.js';
import {drawArt} from './generated-art.js';
import {animateChestOpening} from './treasure-art.js';
import { revealCard } from './card-vfx.js';
import { cardEmblem } from "./button-art.js";
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
let _isEliteFn,_isCoopFn,_sendP2PickFn;
let _showFn, _resumeGameFn, _triggerStageBossFn, _mapWFn, _mapHFn;

export function initCardsUi(deps) {
  if (deps.show) _showFn = deps.show;
  if (deps.resumeGame) _resumeGameFn = deps.resumeGame;
  if (deps.triggerStageBoss) _triggerStageBossFn = deps.triggerStageBoss;
  if (deps.isElite) _isEliteFn = deps.isElite;
  if(deps.isCoop)_isCoopFn=deps.isCoop;
  if(deps.sendP2Pick)_sendP2PickFn=deps.sendP2Pick;
  if (deps.mapW) _mapWFn = deps.mapW;
  if (deps.mapH) _mapHFn = deps.mapH;
}
export function setCardsUiG(game) { g = game; }
export function setCardsUiInv(i1, i2) { inv = i1; inv2 = i2; }

function _isCoop(){return !!(_isCoopFn?.()&&g?.p2);}
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
      if (c.p1Only && _useInv && _useInv !== inv) return true; // P1-only mechanics (e.g. 守護星)
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
  let desc = "本級總效果："+cd.d[Math.min(nLv, 2)];
  // 影分身：依角色顯示不同說明
  if (cd.n === "影分身") {
    const _ct = _currentPickCtx ? _currentPickCtx.charType : (g ? g.charType : "gunner");
    desc = _ct === "assassin" ? "每3秒召喚分身攻擊敵人" : _ct === "gunner" ? "100%前後攻擊" : "100%全方位攻擊";
  }
  const b = document.createElement("button"); b.className = "cb";
  const rarAnim = cd.r === "SSR" ? "ssrRainbow 1.5s infinite" : cd.r === "SR" ? "srShine 1.2s infinite" : "none";
  const tpAnim = cd.tp === "atk" ? "atkPulse 1.5s infinite" : "defPulse 1.5s infinite";
  const mainAnim = cd.r === "SSR" ? rarAnim : tpAnim;
  b.dataset.rarity = cd.r;
  b.style.cssText = `--rarity-color:${RC[cd.r]};width:100%;border:2px solid ${isUp ? LVC[nLv] : RC[cd.r]};animation:ci .35s ${i * .08}s both cubic-bezier(.34,1.56,.64,1);`;
  // The card settles after its entrance; no continual flashing.
  const tpL = cd.tp === "atk" ? '<div style="font-size:8px;color:#FF6B6B;margin-bottom:1px"> 攻擊</div>' : '<div style="font-size:8px;color:#4DABF7;margin-bottom:1px"> 被動</div>';
  const lvL = isUp ? `<div style="font-size:9px;color:#FFD43B;font-weight:900;margin-bottom:2px;text-shadow:0 0 6px #FFD43B">Lv${dLv}</div>` : "";
  const rarBadge = cd.r === "SSR" ? '<div style="font-size:9px;background:linear-gradient(90deg,#FFD43B,#FF6B6B,#DA77F2,#74C0FC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;letter-spacing:2px;margin-bottom:3px">✦ SSR ✦</div>' : `<div style="font-size:10px;color:${RC[cd.r]};font-weight:700;letter-spacing:1px;margin-bottom:3px">★${cd.r}</div>`;
  const _pct = _currentPickCtx ? _currentPickCtx.charType : (g ? g.charType : "gunner");
  const _recSet = RECOMMENDED[_pct];
  const _isRec = _recSet && _recSet.has(cd.n);
  const recBadge = _isRec ? '<div style="font-size:8px;font-weight:900;color:#FFD43B;background:rgba(255,212,59,.15);border:1px solid rgba(255,212,59,.3);border-radius:4px;padding:1px 6px;margin-bottom:3px;display:inline-block"> 推薦</div>' : "";
  b.innerHTML = `${rarBadge}${tpL}${recBadge}${cardEmblem(cd)}<div style="font-size:12px;font-weight:900;margin-bottom:2px">${cd.n}</div>${lvL}<div style="font-size:9px;color:rgba(255,255,255,.5);line-height:1.3">${desc}</div>`;
  const session=g,offer=g._localPickId;let used=false;
  const choose=()=>{if(used||g!==session||g._localPickId!==offer||!g.pickOpen)return;used=true;pickCard(cd,_bAddCard,_bpp,_binv);};
  b.onclick=choose;b.ontouchstart=e=>{e.stopPropagation();e.preventDefault();choose();};
  wrap.innerHTML = ""; wrap.appendChild(b);
}

function scheduleLocalPick(src,ctx,delay=120,options={},specificCard=null){
 const session=g;g._localPickTransition=true;
 setTimeout(()=>{if(g!==session)return;g._localPickTransition=false;showPick(src,specificCard,ctx,options);},delay);
}
function finishLocalPick(ctx){
 if(g._fateQueue>0){g._bigChestLeft=0;scheduleLocalPick('fate',ctx);return;}
 if(g._bigChestLeft>0&&--g._bigChestLeft>0){scheduleLocalPick('bigchest',ctx);return;}
 const queued=g._localPickQueue?.shift();
 if(queued){scheduleLocalPick(queued.src,queued.ctx,120,queued.options,queued.specificCard);return;}
 const player=ctx?.player||g.p;player._pickPending=false;player._inv=false;player._iFrameEnd=performance.now()+1500;
 g._localPickTransition=false;resumeGame();
}
function pickCard(cd,add,player,inventory){
 if(!g.pickOpen||g._localPickTransition)return;
 const lv=add(cd.id);if(lv<0)return;
 const ctx=_currentPickCtx;g.pickOpen=false;g._localPickTransition=true;_currentPickCtx=null;
 cd.ap[lv](player);revealCard(player,cd);if(cd.n==='混沌核心')showChaosNotice(player._chaosNotice,g);sfx('levelup');
 if(player._resetUlt){player._resetUlt=false;g.ultCharge=0;g.ultCdEnd=0;}
 if(cd.n==='命運轉輪'){
  const count=Math.max(1,inventory.length-1),entry=inventory.find(x=>x.id===cd.id);
  inventory.length=0;if(entry)inventory.push(entry);g._fateQueue=(g._fateQueue||0)+count;
 }
 if(player._luckyPick){player._luckyPick=false;scheduleLocalPick('lucky',ctx);return;}
 if(player._coinFlip){player._coinFlip=false;showCoinFlip(player,()=>finishLocalPick(ctx),{pause:!_isCoop()});return;}
 finishLocalPick(ctx);
}
export function openRewardChest(chest){
 if(!g||!chest||chest._rewardClaimed)return false;
 chest._rewardClaimed=true;chest.hp=0;
 const rounds=chest.bigChest?(_isElite()?4:5):1;
 if(_isCoop()){
  g.p._inv=true;g.p._pickPending=true;g.p2._inv=true;g.p2._pickPending=true;
  _sendP2PickFn?.(chest);
 }else g.run=false;
 showPick(chest.bigChest?'bigchest':'crate',null,null,{rounds:chest.bigChest?rounds:0});
 return true;
}

/* ═══ adventure coin: one authoritative reward per toss ═══ */
export function resolveExplorationCoin(player,win){
 if(!win||!g||!player)return null;
 const mw=mapW(),mh=mapH();let point=null,best=-Infinity;
 for(let i=0;i<24;i++){
  const a=Math.PI*2*i/24,r=100+(i%3)*24;
  const x=Math.max(35,Math.min(mw-35,player.x+Math.cos(a)*r)),y=Math.max(35,Math.min(mh-35,player.y+Math.sin(a)*r));
  const spacing=Math.min(200,...g.crates.filter(c=>c.hp>0).map(c=>Math.hypot(x-c.x,y-c.y)));
  if(spacing>best){best=spacing;point={x,y};}
 }
 const chest={...point,hp:CRATE_HP,mhp:CRATE_HP,card:null,hits:0,needed:6,unlockLv:1,bigChest:false,coinReward:true};
 g.crates.push(chest);g.dn.push({x:chest.x,y:chest.y-35,d:'幸運寶箱・擊破後選卡',life:4,color:'#ffe3a6',big:1});sfx('chest');return chest;
}
export function showCoinFlip(player,onDone,options={}){
 const session=g,win=options.win??(Math.random()<.5);
 if(options.pause!==false&&g)g.run=false;
 resetControls();const ov=document.createElement('div');ov.className='coin-overlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','探索靴擲幣');
 ov.innerHTML='<section class="coin-panel"><div class="coin-kicker">探索靴 · 幸運試煉</div><h2>讓命運落定</h2><p class="coin-odds">寶箱面 50% · 探索面 50%</p><canvas width="280" height="240" class="coin-stage"></canvas><div class="coin-result" aria-live="polite"><strong>金幣翻轉中</strong><p>寶箱面朝上，就會在附近出現寶箱</p></div><div class="coin-reward"></div><button class="menu-control primary" disabled>等待結果</button></section>';
 document.body.appendChild(ov);const c=ov.querySelector('canvas').getContext('2d'),txt=ov.querySelector('.coin-result'),button=ov.querySelector('button');
 c.imageSmoothingEnabled=false;const start=performance.now(),duration=1800;let settled=false,closed=false,autoClose;
 function finish(){if(closed)return;closed=true;clearTimeout(autoClose);ov.remove();if(g!==session)return;if(onDone)onDone();else if(options.pause!==false)resumeGame();}
 button.onclick=finish;
 function frame(now){
  if(!ov.isConnected)return;if(g!==session){ov.remove();return;}
  const q=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-q,3),angle=(Math.PI*12+(win?0:Math.PI))*ease,face=Math.cos(angle)>=0?0:1,scale=Math.max(.08,Math.abs(Math.cos(angle))),height=Math.sin(q*Math.PI)*82;
  c.clearRect(0,0,280,240);c.save();c.fillStyle='#070e1e';c.globalAlpha=.5;c.beginPath();c.ellipse(140,204,28+q*12,5,0,0,Math.PI*2);c.fill();c.restore();
  c.save();c.translate(140,158-height);c.scale(scale,1);drawArt(c,'coin-adventure',face,0,0,112,112);c.restore();
  if(q<1){requestAnimationFrame(frame);return;}
  if(settled)return;settled=true;
  const chest=options.award===false?null:resolveExplorationCoin(player,win);
  txt.innerHTML=win?'<strong>寶箱面！幸運降臨</strong><p>寶箱已出現在角色附近，擊破後三選一</p>':'<strong>探索面 · 再接再厲</strong><p>這次沒有寶箱，探索靴的閃避提升仍然保留</p>';
  if(win){ov.classList.add('coin-win');animateChestOpening(ov.querySelector('.coin-reward'));}
  button.disabled=false;button.textContent='返回冒險';autoClose=setTimeout(finish,2500);
 }
 requestAnimationFrame(frame);
}

/* ═══ showAngelCard ═══ */
export function showAngelCard() {
  if (g.pickOpen) return;
  g.pickOpen = true; resetControls();
  const p = $("pickPanel");
  p.innerHTML = `
    <div style="color:#FFF3BF;font-size:14px;font-weight:700;letter-spacing:2px;margin-bottom:8px"> 小天使感應到你需要幫助</div>
    <p style="color:rgba(255,255,255,.5);font-size:11px;margin:0 0 14px">Boss 戰可能會很艱難，要接受祝福嗎？</p>
    <div style="display:flex;gap:10px;justify-content:center">
      <button class="cb" id="_angelYes" style="width:140px;border:2px solid #FFD43B;touch-action:manipulation">
        <div style="font-size:9px;background:linear-gradient(90deg,#FFD43B,#FF6B6B,#DA77F2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;letter-spacing:2px;margin-bottom:3px">✦ 隱藏卡 ✦</div>
        <div style="font-size:28px;margin-bottom:3px"></div>
        <div style="font-size:12px;font-weight:900;margin-bottom:2px">越戰越勇</div>
        <div style="font-size:9px;color:rgba(255,255,255,.5);line-height:1.3">Boss戰越久 傷害越高</div>
      </button>
      <button class="cb" id="_angelNo" style="width:140px;border:2px solid rgba(255,255,255,.2);touch-action:manipulation">
        <div style="font-size:28px;margin-bottom:3px"></div>
        <div style="font-size:12px;font-weight:900;margin-bottom:2px">不需要</div>
        <div style="font-size:9px;color:rgba(255,255,255,.5);line-height:1.3">我要靠自己的實力</div>
      </button>
    </div>`;
  show("pick");
  const doChoice = (accept) => {
    if (accept) {
      g.p._angelBuff = true;
      g.dn.push({ x: g.p.x, y: g.p.y - 40, d: " 越戰越勇！", life: 2.5, color: "#FFD43B", big: 1 });
      sfx("levelup");
    } else {
      g.dn.push({ x: g.p.x, y: g.p.y - 40, d: " 靠自己！", life: 2, color: "#fff", big: 1 });
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
  g.dn.push({ x: g.p.x, y: g.p.y - 50, d: " 大寶箱出現！", life: 2, color: "#FFD43B", big: 1 });
  sfx("chest");
}

/* ═══ showPick ═══ */
export function showPick(src, specificCard, pickCtx,options={}) {
  if(!g)return;
  if(g.pickOpen||g._localPickTransition){(g._localPickQueue||=[]).push({src,specificCard,ctx:pickCtx,options});return;}
  if(options.rounds){g._bigChestTotal=options.rounds;g._bigChestLeft=options.rounds;}
  g._localPickId=(g._localPickId||0)+1;
  if(_isCoop()){const p=pickCtx?.player||g.p;p._pickPending=true;p._inv=true;}
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
  if(!pk.length){g.pickOpen=false;finishLocalPick(pickCtx);return;}
  const roundSeen = new Set(pk.map(c => c.id));
  const noReroll = isLucky;
  const p = $("pickPanel");
  const fateLeft = isFate ? (g._fateQueue || 0) : 0;
  const bigProgress = isBig && g._bigChestTotal ? ` (${g._bigChestTotal - g._bigChestLeft + 1}/${g._bigChestTotal})` : "";
  const title = isBig ? ` 大寶箱${bigProgress}` : isFate ? ` 命運重抽！(剩餘${fateLeft}次)` : isLucky ? " 幸運抽卡！" : src === "boss" ? " 小王擊敗！" : src === "crate" ? " 寶箱解鎖！" : " 升級！";
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
      rr.textContent = " 重骰";
      const session=g,offer=g._localPickId;let rerolled=false;
      rr.onclick = () => {
        if(rerolled||g!==session||g._localPickId!==offer||!g.pickOpen)return;rerolled=true;
        const exc = new Set(roundSeen);
        const nw = pks(1, exc, _pinv, _pct);
        if (nw.length) { pk[i] = nw[0]; roundSeen.add(nw[0].id); buildCard(nw[0], w, i, cardWrap); }
        rr.textContent = "已使用"; rr.style.opacity = ".3"; rr.style.pointerEvents = "none";
      };
      col.appendChild(rr);
    }
    cc.appendChild(col);
  });
  if(src==="crate"||isBig)animateChestOpening(p);
  show("pick");
}
