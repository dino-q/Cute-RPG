// Device-local layout profiles: portrait and landscape stay independent.
const KEY='cute-rpg-layout-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mode=()=>innerWidth>innerHeight?'landscape':'portrait';
const empty=()=>({items:{},screen:{x:.5,y:.5,w:1,h:1}});
let profiles={portrait:empty(),landscape:empty()},draft=null,drafts=null,editing=false,selected='jzL',group='play';
let callbacks={},baseRect={left:0,top:0,width:innerWidth,height:innerHeight},overlay,toolbar,targets=[],pointers=new Map(),gesture=null,framePending=false;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===1)for(const key of ['portrait','landscape']){const p=saved[key];if(p?.items&&p?.screen)profiles[key]=p;}}catch(error){console.warn('Cannot read saved control layout.',error);}
const registry=[
 ['jzL','移動搖桿','play',140,140],['jzR','攻擊搖桿','play',120,120],['skillBtn','職業技能','play',52,52],['dodgeBtn','閃避','play',52,52],['ultW','大招與集氣','play',86,86],
 ['minimap','小地圖','play',80,80],['layoutHealth','生命值','play',300,12],['layoutLevel','等級與經驗','play',300,10],['layoutUltCharge','大招能量','play',300,10],['hud2','分數與擊殺','play',300,14],['p2hud','隊友資訊','play',300,25],['combo','連擊提示','play',100,18],['huntBanner','追獵提示','play',180,42],['settingsBtn','設定按鈕','play',68,32],
 ['gameHint','教學與升級提示','play',340,48],['chaosNotice','混沌核心能力提示','play',290,190],['bossNotice','Boss危險提示','play',340,72],['coopNotice','隊友選卡／暫停提示','play',280,44],['coopAwaitingLabel','雙人出發提示','play',300,44],
 ['pracCards','練習卡片清單','practice',220,360],['pracEnemies','練習敵人清單','practice',200,360],['pracStats','練習能力清單','practice',360,200]
];
function profile(){return editing?drafts[mode()]:profiles[mode()];}
function numeric(value,fallback,min,max){return Number.isFinite(value)?clamp(value,min,max):fallback;}
export function getLayoutViewport(rect){
 baseRect={...rect};const screen=profile().screen;
 const width=rect.width*numeric(screen.w,1,.35,1),height=rect.height*numeric(screen.h,1,.3,1);
 const viewport={width,height,left:rect.left+clamp(numeric(screen.x,.5,0,1)*rect.width-width/2,0,rect.width-width),top:rect.top+clamp(numeric(screen.y,.5,0,1)*rect.height-height/2,0,rect.height-height)};
 const masks=document.getElementById('gameBlackBars')?.children;
 if(masks){const v=viewport;const boxes=[[0,0,innerWidth,v.top],[0,v.top+v.height,innerWidth,Math.max(0,innerHeight-v.top-v.height)],[0,v.top,v.left,v.height],[v.left+v.width,v.top,Math.max(0,innerWidth-v.left-v.width),v.height]];for(let i=0;i<4;i++){const [x,y,w,h]=boxes[i];masks[i].style.cssText='left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px';}}
 return viewport;
}
// Stable slots remain present when hidden, so every notice can be edited before it appears.
export function setLayoutNotice(id,text,visible=true){
 const el=document.getElementById(id);if(!el)return;
 const next=text||(!visible?el.textContent:text);
 const changed=el.hidden===visible||el.textContent!==next;
 if(el.textContent!==next)el.textContent=next;el.hidden=!visible;
 if(changed)applyControlLayout();
}
function dimensions(target){
 const r=target.el.getBoundingClientRect();
 return {w:r.width||Math.min(target.w,innerWidth*.9),h:r.height||Math.min(target.h,innerHeight*.65),x:r.width?r.left+r.width/2:innerWidth*.5,y:r.height?r.top+r.height/2:innerHeight*.5};
}
export function applyControlLayout(){
 for(const t of targets){t.el.classList.remove('layout-positioned');if(t.marker)t.marker.after(t.el);}
 for(const t of targets)t.natural=dimensions(t);
 for(const t of targets){
  const natural=t.natural;const item=profile().items[t.id];if(!item)continue;
  const scale=numeric(item.s,1,.45,2.5),w=natural.w,h=natural.h;
  const x=clamp(numeric(item.x,.5,0,1)*innerWidth,Math.min(w*scale/2,innerWidth/2),Math.max(innerWidth-w*scale/2,innerWidth/2));
  const y=clamp(numeric(item.y,.5,0,1)*innerHeight,Math.min(h*scale/2,innerHeight/2),Math.max(innerHeight-h*scale/2,innerHeight/2));
  const styles={'--layout-x':x+'px','--layout-y':y+'px','--layout-w':w+'px','--layout-h':h+'px','--layout-scale':scale};
  for(const [key,val]of Object.entries(styles))t.el.style.setProperty(key,val);
  if(t.marker)document.getElementById('practiceOv').append(t.el);
  t.el.classList.add('layout-positioned');
 }
 if(editing)drawHandles();
}
function itemState(id){
 if(id==='screen')return draft.screen;
 if(!draft.items[id]){const t=targets.find(t=>t.id===id);const r=t.el.getBoundingClientRect();draft.items[id]={x:(r.left+r.width/2)/innerWidth,y:(r.top+r.height/2)/innerHeight,s:1};}
 return draft.items[id];
}
function requestApply(){if(framePending)return;framePending=true;requestAnimationFrame(()=>{framePending=false;callbacks.resize();updateInspector();});}
function selectedGroup(){for(const t of targets)t.el.classList.toggle('layout-selected',t.id===selected);const target=targets.find(t=>t.id===selected);if(target)group=target.group;document.body.classList.toggle('layout-practice',group==='practice');}
function select(id){selected=id;selectedGroup();applyControlLayout();updateInspector();}
function screenBounds(){return document.getElementById('cv').getBoundingClientRect();}
function drawHandles(){
 for(const el of overlay.querySelectorAll('.layout-handle'))el.remove();
 const all=[{id:'screen',label:'遊戲畫面',group:'play'},...targets];
 for(const t of all){if(t.id!=='screen'&&t.group!==group)continue;
  const r=t.id==='screen'?screenBounds():t.el.getBoundingClientRect();if(!r.width||!r.height)continue;
  const handle=document.createElement('div');handle.className='layout-handle'+(selected===t.id?' selected':'')+(t.id==='screen'?' screen-handle':'');handle.dataset.target=t.id;
  handle.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';
  const label=document.createElement('span');label.textContent=t.label;handle.append(label);
  if(t.id==='screen'){const tab=document.createElement('button');tab.type='button';tab.className='screen-grip';tab.textContent='拖曳／縮放畫面';tab.dataset.target='screen';handle.append(tab);}
  overlay.append(handle);
 }
}
function anchor(){
 const p=[...pointers.values()];if(!p.length){gesture=null;return;}
 const state={...itemState(selected)},r=selected==='screen'?screenBounds():targets.find(t=>t.id===selected).el.getBoundingClientRect();
 gesture={state,cx:r.left+r.width/2,cy:r.top+r.height/2,start:p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}:p[0],distance:p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0};
}
function moveGesture(){
 if(!gesture)return;const p=[...pointers.values()];if(!p.length)return;
 const center=p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}:p[0];
 const state=itemState(selected),x=gesture.cx+center.x-gesture.start.x,y=gesture.cy+center.y-gesture.start.y;
 if(selected==='screen'){state.x=clamp((x-baseRect.left)/baseRect.width,0,1);state.y=clamp((y-baseRect.top)/baseRect.height,0,1);}
 else{state.x=clamp(x/innerWidth,0,1);state.y=clamp(y/innerHeight,0,1);}
 if(p.length>1&&gesture.distance>0){const ratio=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/gesture.distance;
  if(selected==='screen'){state.w=clamp(gesture.state.w*ratio,.35,1);state.h=clamp(gesture.state.h*ratio,.3,1);}else state.s=clamp(gesture.state.s*ratio,.45,2.5);
 }
 requestApply();
}
function updateInspector(){
 if(!toolbar||!editing)return;const s=selected==='screen'?draft.screen:draft.items[selected];const r=selected==='screen'?screenBounds():targets.find(t=>t.id===selected).el.getBoundingClientRect();
 const x=s?.x??(r.left+r.width/2)/innerWidth,y=s?.y??(r.top+r.height/2)/innerHeight;
 toolbar.querySelector('#layoutTarget').value=selected;
 for(const [key,value]of [['x',x*100],['y',y*100],['s',(s?.s??1)*100],['w',draft.screen.w*100],['h',draft.screen.h*100]]){const input=toolbar.querySelector('[data-setting="'+key+'"]');input.value=Math.round(value);input.parentElement.querySelector('output').textContent=Math.round(value)+'%';}
 toolbar.querySelector('.layout-size-row').hidden=selected==='screen';toolbar.querySelector('.layout-screen-rows').hidden=selected!=='screen';
 toolbar.querySelector('#layoutNotice').textContent=(mode()==='portrait'?'直式':'橫式')+'版面 · 拖曳移動，兩指縮放；電腦可用滑桿。';
}
function finish(save){
 if(!editing)return;
 if(save){const savedProfiles=structuredClone(drafts);try{localStorage.setItem(KEY,JSON.stringify({version:1,...savedProfiles}));profiles=savedProfiles;}catch(error){toolbar.querySelector('#layoutNotice').textContent='裝置無法儲存，請允許網站儲存資料後再試。';console.warn('Cannot save control layout.',error);return;}}
 editing=false;draft=null;drafts=null;pointers.clear();gesture=null;document.body.classList.remove('layout-editing','layout-practice');overlay.hidden=true;toolbar.hidden=true;callbacks.reset();callbacks.resize();applyControlLayout();callbacks.returnToSettings();
}
export function openLayoutEditor(){
 if(editing)return;drafts=structuredClone(profiles);draft=drafts[mode()];editing=true;group='play';selected='jzL';callbacks.reset();document.body.classList.add('layout-editing');overlay.hidden=false;toolbar.hidden=false;selectedGroup();callbacks.resize();applyControlLayout();updateInspector();
}
export function initControlLayout(deps){
 callbacks=deps;
 for(const [id,text]of [['gameHint','擊殺敵人會掉經驗球，靠近自動吸取！'],['chaosNotice','混沌核心 · 能力提升清單'],['bossNotice','靠近 Boss！\n圈外衝擊波無處閃避・進入安全圈'],['coopNotice','隊友選卡中…'],['coopAwaitingLabel','等待隊友選好職業，再一起出發']]){
  const el=document.createElement('section');el.id=id;el.className='layout-notice';el.textContent=text;el.hidden=true;el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.getElementById('app').append(el);
 }
 const bars=document.createElement('div');bars.id='gameBlackBars';bars.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)bars.append(document.createElement('div'));document.getElementById('app').append(bars);
 const hudBars=document.querySelectorAll('#hud > .hbar');['layoutHealth','layoutLevel','layoutUltCharge'].forEach((id,i)=>{if(hudBars[i])hudBars[i].id=id;});
 document.querySelectorAll('#pracToolbar > button').forEach((el,i)=>{if(!el.id)el.id='layoutPractice'+i;registry.push([el.id,el.textContent.trim(),'practice',80,28]);});
 targets=registry.map(([id,label,group,w,h])=>({id,label,group,w,h,el:document.getElementById(id)})).filter(t=>t.el);
 for(const t of targets)if(t.el.parentElement?.id==='pracToolbar'){t.marker=document.createComment('layout home: '+t.id);t.el.before(t.marker);t.el.classList.add('layout-practice-button');}
 overlay=document.createElement('div');overlay.id='layoutOverlay';overlay.hidden=true;overlay.setAttribute('aria-label','版面編輯區');document.body.append(overlay);
 toolbar=document.createElement('section');toolbar.id='layoutEditor';toolbar.hidden=true;toolbar.setAttribute('aria-label','版面編輯工具');
 toolbar.innerHTML='<header><div><small>裝置專屬配置</small><strong>版面編輯</strong></div><button type="button" data-layout-action="dock">移到下方</button></header><p id="layoutNotice"></p><div class="layout-picker"><select id="layoutTarget" aria-label="選擇調整項目"></select><button type="button" data-layout-action="resetItem">還原此項</button></div><div class="layout-sliders"><label>左右 <input type="range" data-setting="x" min="0" max="100"><output></output></label><label>上下 <input type="range" data-setting="y" min="0" max="100"><output></output></label><label class="layout-size-row">大小 <input type="range" data-setting="s" min="45" max="250"><output></output></label><div class="layout-screen-rows"><label>畫面寬 <input type="range" data-setting="w" min="35" max="100"><output></output></label><label>畫面高 <input type="range" data-setting="h" min="30" max="100"><output></output></label><div class="layout-black-presets"><button type="button" data-black-bars="0">全畫面</button><button type="button" data-black-bars="10">上下各10%</button><button type="button" data-black-bars="20">上下各20%</button></div><small>黑邊會遮住遊戲畫面，按鍵仍可放在黑邊。儲存後套用；直式與橫式分別儲存。</small></div></div><footer><button type="button" data-layout-action="resetAll">還原版面</button><button type="button" data-layout-action="cancel">取消</button><button type="button" class="primary" data-layout-action="save">儲存完成</button></footer>';
 const selectEl=toolbar.querySelector('select');for(const [label,list]of [['畫面',[{id:'screen',label:'遊戲畫面／黑邊'}]],['戰鬥介面',targets.filter(t=>t.group==='play')],['練習模式',targets.filter(t=>t.group==='practice')]]){const optgroup=document.createElement('optgroup');optgroup.label=label;for(const t of list){const option=document.createElement('option');option.value=t.id;option.textContent=t.label;optgroup.append(option);}selectEl.append(optgroup);}
 document.body.append(toolbar);
 document.getElementById('editLayoutBtn').addEventListener('click',openLayoutEditor);
 selectEl.addEventListener('change',e=>select(e.target.value));
 toolbar.addEventListener('input',e=>{const key=e.target.dataset.setting;if(!key)return;const s=itemState(selected);if(['w','h'].includes(key))draft.screen[key]=Number(e.target.value)/100;else s[key]=Number(e.target.value)/100;requestApply();});
 toolbar.addEventListener('click',e=>{const preset=e.target.closest('[data-black-bars]');if(preset){draft.screen={x:.5,y:.5,w:1,h:1-Number(preset.dataset.blackBars)/50};requestApply();return;}const action=e.target.closest('[data-layout-action]')?.dataset.layoutAction;if(!action)return;
  if(action==='save')finish(true);if(action==='cancel')finish(false);
  if(action==='dock'){toolbar.classList.toggle('dock-bottom');e.target.textContent=toolbar.classList.contains('dock-bottom')?'移到上方':'移到下方';}
  if(action==='resetItem'){if(selected==='screen')draft.screen=empty().screen;else delete draft.items[selected];requestApply();}
  if(action==='resetAll'){drafts[mode()]=empty();draft=drafts[mode()];requestApply();}
 });
 overlay.addEventListener('pointerdown',e=>{const id=pointers.size?selected:(e.target.closest('[data-target]')?.dataset.target||(selected==='screen'?'screen':null));if(!id)return;e.preventDefault();if(pointers.size&&selected!==id)return;if(!pointers.size)select(id);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});overlay.setPointerCapture(e.pointerId);anchor();});
 overlay.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});moveGesture();});
 const end=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);anchor();};overlay.addEventListener('pointerup',end);overlay.addEventListener('pointercancel',end);overlay.addEventListener('lostpointercapture',end);
 overlay.addEventListener('wheel',e=>{const id=e.target.closest('[data-target]')?.dataset.target;if(!id)return;e.preventDefault();select(id);const s=itemState(id),factor=e.deltaY<0?1.05:.95;if(id==='screen'){s.w=clamp(s.w*factor,.35,1);s.h=clamp(s.h*factor,.3,1);}else s.s=clamp(s.s*factor,.45,2.5);requestApply();},{passive:false});
 // Capture editor touches before original combat handlers. Pointer events above own gestures.
 for(const type of ['touchstart','touchmove','touchend','touchcancel','mousedown','click'])document.addEventListener(type,e=>{if(editing&&!toolbar.contains(e.target)&&!overlay.contains(e.target)){e.stopImmediatePropagation();if(e.cancelable)e.preventDefault();}},{capture:true,passive:false});
 window.addEventListener('keydown',e=>{if(!editing)return;if(e.key==='Escape'){e.preventDefault();finish(false);}},{capture:true});
 window.addEventListener('resize',()=>{if(editing){pointers.clear();gesture=null;draft=drafts[mode()];selectedGroup();callbacks.resize();}requestAnimationFrame(()=>{applyControlLayout();if(editing)updateInspector();});});
 const watch=new MutationObserver(changes=>{
  if(changes.some(c=>{const before=(c.oldValue||'').match(/(?:^|;)\s*display\s*:\s*([^;]+)/)?.[1]||'';return before!==c.target.style.display;}))requestAnimationFrame(applyControlLayout);
 });
 for(const el of new Set([...targets.map(t=>t.el),document.getElementById('ctl'),document.getElementById('hud'),document.getElementById('practiceOv')]))if(el)watch.observe(el,{attributes:true,attributeFilter:['style'],attributeOldValue:true});
 applyControlLayout();
}
