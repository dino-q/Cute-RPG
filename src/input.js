// Input module — joystick/keyboard controls, touch events
import { ULT_CHARGE_NEED } from "./config.js";
import { $ } from "./utils.js";
import { burst } from "./render.js";
import { sfx } from "./audio.js";

/* ═══ Joystick / aim state ═══ */
export let joy={a:0,dx:0,dy:0,id:null,sx:null,sy:null};
export let aim={a:0,dx:0,dy:0,id:null,sx:null,sy:null,tn:0,lt:0};

/* ═══ Client request flags ═══ */
let _clientUltReq=false;
let _clientDodgeReq=false;
export function getClientUltReq(){return _clientUltReq;}
export function setClientUltReq(v){_clientUltReq=v;}
export function getClientDodgeReq(){return _clientDodgeReq;}
export function setClientDodgeReq(v){_clientDodgeReq=v;}

/* ═══ Callback deps (injected from main.js) ═══ */
let _tapAtk, _doUlt, _useCharSkill, _getG, _getNet;

export function initInput(deps) {
  _tapAtk = deps.tapAtk;
  _doUlt = deps.doUlt;
  _useCharSkill = deps.useCharSkill;
  _getG = deps.getG;
  _getNet = deps.getNet;
}

/* ═══ Utility functions ═══ */
export function setStick(el,dx=0,dy=0){
  el.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
}
export function resetControls(){
  joy.a=0;joy.dx=0;joy.dy=0;joy.id=null;joy.sx=null;joy.sy=null;
  aim.a=0;aim.dx=0;aim.dy=0;aim.id=null;aim.sx=null;aim.sy=null;
  setStick($("jkL"));setStick($("jkR"));
}
export function resetJoyAim(){
  joy.a=0;joy.dx=0;joy.dy=0;joy.id=null;joy.sx=null;joy.sy=null;
  aim.a=0;aim.dx=0;aim.dy=0;aim.id=null;aim.sx=null;aim.sy=null;aim.tn=0;aim.lt=0;
}
export function attachTouchToStick(state,zoneId,knobId,touch){
  const zone=$(zoneId),knob=$(knobId);
  if(!zone||!knob||!touch)return false;
  const rc=zone.getBoundingClientRect();
  state.a=1;state.id=touch.identifier;
  state.sx=rc.left+rc.width/2;state.sy=rc.top+rc.height/2;
  state.dx=0;state.dy=0;
  const mx=zone.offsetWidth/2||(zoneId==="jzL"?70:60);
  let dx=touch.clientX-state.sx,dy=touch.clientY-state.sy;
  const d=Math.sqrt(dx*dx+dy*dy);
  if(d>mx&&d>0){dx=dx/d*mx;dy=dy/d*mx;}
  state.dx=dx/mx;state.dy=dy/mx;
  const travel=Math.max(0,mx-knob.offsetWidth/2);
  setStick(knob,state.dx*travel,state.dy*travel);
  return true;
}
export function rebindActiveTouches(){
  const g=_getG();
  if(!g)return;
  const activeTouches=(window.__lastTouchSnapshot&&window.__lastTouchSnapshot.length)?window.__lastTouchSnapshot:[];
  if(!joy.a){
    const left=activeTouches.find(t=>t.clientX<=window.innerWidth*.5);
    if(left)attachTouchToStick(joy,"jzL","jkL",left);
  }
  if(!aim.a){
    const right=activeTouches.find(t=>t.clientX>window.innerWidth*.5);
    if(right)attachTouchToStick(aim,"jzR","jkR",right);
  }
}

/* ═══ Ult / dodge / keyboard helpers ═══ */
function startUltPress(){
  const g=_getG();
  if(!g)return;
  const _net=_getNet();
  if(_net&&_net.role==="client"){_clientUltReq=true;return;} // CLIENT 直接發 flag
  if(g.p.hasBH||g.p.hasTS||g.p.hasMF){if(performance.now()>=(g.ultCdEnd||0))_doUlt();}
  else if(g.ultCharge>=ULT_CHARGE_NEED)_doUlt();
  else g.ultHold=true;
}
function endUltPress(){const g=_getG();const _net=_getNet();if(g&&!(_net&&_net.role==="client"))g.ultHold=false;}
// 短距離閃避位移
function doDodge(){
  const g=_getG();
  if(!g||!g.run)return;
  const _net=_getNet();
  if(_net&&_net.role==="client"){_clientDodgeReq=true;return;}
  const now=performance.now();
  if(g.p._dodgeCD&&now<g.p._dodgeCD)return;
  if(g.p._dashEnd&&now<g.p._dashEnd)return; // 已在衝刺中
  g.p._dodgeCD=now+1500;
  const hasJoy=joy.a&&(Math.abs(joy.dx)>.2||Math.abs(joy.dy)>.2);
  const ddx=hasJoy?joy.dx:g.ad.x,ddy=hasJoy?joy.dy:g.ad.y;
  const dd=Math.sqrt(ddx*ddx+ddy*ddy)||1;
  // 用 dash 系統做平滑位移（100ms，速度3）
  g.p._dashEnd=now+100;
  g.p._dashDx=ddx/dd;g.p._dashDy=ddy/dd;
  g.p._dashSpd=3;
  g.p._iFrameEnd=Math.max(g.p._iFrameEnd||0,now+200);
  burst(g.p.x,g.p.y,"#74C0FC",5);
  sfx("shoot");
}

export const ks={};
function uK(){let dx=0,dy=0;
  if(ks.ArrowLeft)dx--;
  if(ks.ArrowRight)dx++;
  if(ks.ArrowUp)dy--;
  if(ks.ArrowDown)dy++;
  if(dx||dy){const d=Math.sqrt(dx*dx+dy*dy);joy.a=1;joy.id="kb";joy.dx=dx/d;joy.dy=dy/d;}
  else if(joy.id==="kb"){joy.a=0;joy.dx=0;joy.dy=0;}
}

/* ═══ Touch & keyboard listener registration ═══ */
export function setupInputListeners(){
$("jzL").addEventListener("touchstart",e=>{
  e.preventDefault();
  window.__lastTouchSnapshot=Array.from(e.touches).map(t=>({identifier:t.identifier,clientX:t.clientX,clientY:t.clientY}));
  const t=e.changedTouches[0],rc=$("jzL").getBoundingClientRect();
  joy.a=1;joy.id=t.identifier;
  joy.sx=rc.left+rc.width/2;joy.sy=rc.top+rc.height/2;
  joy.dx=0;joy.dy=0;
  setStick($("jkL"));
},{passive:false});

$("jzR").addEventListener("touchstart",e=>{
  e.preventDefault();
  window.__lastTouchSnapshot=Array.from(e.touches).map(t=>({identifier:t.identifier,clientX:t.clientX,clientY:t.clientY}));
  const t=e.changedTouches[0],rc=$("jzR").getBoundingClientRect();
  aim.a=1;aim.id=t.identifier;
  aim.sx=rc.left+rc.width/2;aim.sy=rc.top+rc.height/2;
  aim.dx=0;aim.dy=0;
  setStick($("jkR"));
  _tapAtk();
},{passive:false});

$("ultR").addEventListener("touchstart",e=>{e.preventDefault();e.stopPropagation();startUltPress();},{passive:false});
$("ultR").addEventListener("touchend",e=>{e.preventDefault();e.stopPropagation();endUltPress();},{passive:false});
$("ultR").addEventListener("touchcancel",e=>{e.stopPropagation();endUltPress();},{passive:false});
$("ultR").addEventListener("mousedown",e=>{e.preventDefault();startUltPress();});
window.addEventListener("mouseup",()=>endUltPress());
// 閃避按鈕
$("dodgeBtn").addEventListener("touchstart",e=>{e.preventDefault();e.stopPropagation();doDodge();},{passive:false});
$("dodgeBtn").addEventListener("click",e=>{e.preventDefault();doDodge();});
$("skillBtn").addEventListener("touchstart",e=>{e.preventDefault();e.stopPropagation();_useCharSkill();},{passive:false});
$("skillBtn").addEventListener("click",e=>{e.preventDefault();_useCharSkill();});

// global touchmove — always fires, handles both joysticks
document.addEventListener("touchmove",e=>{
  if(e.target.closest&&(e.target.closest(".panel")||e.target.closest(".ov")||e.target.closest("#practiceOv")||e.target.closest("#settingsOv")))return;// allow panel/overlay/practice/settings interaction
  e.preventDefault();
  window.__lastTouchSnapshot=Array.from(e.touches).map(t=>({identifier:t.identifier,clientX:t.clientX,clientY:t.clientY}));
  for(let i=0;i<e.touches.length;i++){
    const t=e.touches[i];
    if(joy.a&&t.identifier===joy.id){
      let dx=t.clientX-joy.sx,dy=t.clientY-joy.sy;
      const d=Math.sqrt(dx*dx+dy*dy),mx=$("jzL").offsetWidth/2||70;
      if(d>mx){dx=dx/d*mx;dy=dy/d*mx;}
      joy.dx=dx/mx;joy.dy=dy/mx;
      const knob=$("jkL"),travel=Math.max(0,mx-knob.offsetWidth/2);
      setStick(knob,joy.dx*travel,joy.dy*travel);
    }
    if(aim.a&&t.identifier===aim.id){
      let dx=t.clientX-aim.sx,dy=t.clientY-aim.sy;
      const d=Math.sqrt(dx*dx+dy*dy),mx=$("jzR").offsetWidth/2||60;
      if(d>mx){dx=dx/d*mx;dy=dy/d*mx;}
      aim.dx=dx/mx;aim.dy=dy/mx;
      const knob=$("jkR"),travel=Math.max(0,mx-knob.offsetWidth/2);
      setStick(knob,aim.dx*travel,aim.dy*travel);
    }
  }
},{passive:false});

// global touchend/cancel — always fires
function touchReset(e){
  window.__lastTouchSnapshot=Array.from(e.touches).map(t=>({identifier:t.identifier,clientX:t.clientX,clientY:t.clientY}));
  for(let i=0;i<e.changedTouches.length;i++){
    const id=e.changedTouches[i].identifier;
    if(id===joy.id){joy.a=0;joy.dx=0;joy.dy=0;joy.id=null;joy.sx=null;joy.sy=null;setStick($("jkL"));}
    if(id===aim.id){aim.a=0;aim.dx=0;aim.dy=0;aim.id=null;aim.sx=null;aim.sy=null;setStick($("jkR"));}
  }
}
document.addEventListener("touchend",touchReset,{passive:false});
document.addEventListener("touchcancel",touchReset,{passive:false});

window.addEventListener("keydown",e=>{
  const c=e.code||e.key;ks[c]=true;
  // also map e.key for compat
  ks[e.key]=true;
  uK();
  if(c==="Space"||e.key===" "){e.preventDefault();if(!aim.a||aim.id!=="kb"){aim.a=1;aim.id="kb";_tapAtk();}}
  if(c==="KeyE"||e.key==="e"||e.key==="E"){startUltPress();}
  if(c==="KeyQ"||e.key==="q"||e.key==="Q"){doDodge();}
  if(c==="KeyW"||e.key==="w"||e.key==="W"){_useCharSkill();}
  if(c.startsWith("Arrow"))e.preventDefault();
},{capture:true});
window.addEventListener("keyup",e=>{
  const c=e.code||e.key;ks[c]=false;ks[e.key]=false;uK();
  if((c==="Space"||e.key===" ")&&aim.id==="kb"){aim.a=0;aim.id=null;}
  if((c==="KeyE"||e.key==="e"||e.key==="E")){const g=_getG();if(g)endUltPress();}
},{capture:true});
} // end setupInputListeners
