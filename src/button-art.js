import { drawSpriteWithEyes } from './sprite-eyes.js';
// Code-native pixel emblems for the formal game interface.
const shapes = {
 gun:'M2 5h11v4H8v5H4V9H2z M11 4h2v1h-2z',
 sword:'M11 1h4v4l-7 7-3-3z M2 9l5 5-1 1-5-5z M1 14l3-3 2 2-3 3z',
 shield:'M3 2h10v8l-5 5-5-5z M7 4h2v7H7z M5 6h6v2H5z',
 dagger:'M11 1h3v5l-5 5-3-3z M4 8l5 5-2 2-5-5z M1 14l3-3 2 2-3 3z',
 flame:'M8 1h2v4h2v2h2v5h-2v2H4v-2H2V8h2V5h2v4h2z',
 ice:'M7 1h2v14H7z M1 7h14v2H1z M3 2l11 11-1 1L2 3z M13 2l1 1L3 14l-1-1z',
 heart:'M2 3h4v2h4V3h4v2h1v5l-7 5-7-5V5h1z',
 boot:'M5 2h6v7h3v2h1v3H3v-3h2z M2 5h3v2H2z M1 8h3v2H1z',
 bow:'M5 1h3l5 5v4l-5 5H5l5-7z M1 7h12v2H1z M11 5l4 3-4 3z',
 book:'M1 3h6l1 2 1-2h6v10H9l-1 2-1-2H1z M3 5h3v1H3z M10 5h3v1h-3z',
 coin:'M5 1h6v2h2v2h2v6h-2v2h-2v2H5v-2H3v-2H1V5h2V3h2z M7 4h2v8H7z',
 gem:'M5 1h6l4 5-7 9-7-9z M7 3h2v8H7z',
 poison:'M6 1h4v3h2v3h2v6l-2 2H4l-2-2V7h2V4h2z M4 8h8v2H4z',
 bolt:'M8 1h5l-4 5h5L5 15l2-6H2z',
 split:'M7 10h2v5H7z M7 5h2v5H7z M1 1h4v4H1z M11 1h4v4h-4z M5 6L3 4l1-1 3 3z M9 6l3-3 1 1-2 2z',
 shadow:'M5 2h6v2h2v7h-2v3H9v-2H7v2H5v-3H3V4h2z M5 6h2v2H5z M9 6h2v2H9z',
 target:'M4 1h8v2h2v2h1v6h-1v2h-2v2H4v-2H2v-2H1V5h1V3h2z M5 5h6v6H5z M7 7h2v2H7z',
 wing:'M1 2l6 4v8L3 11H1z M15 2l-6 4v8l4-3h2z M7 7h2v8H7z',
 orb:'M6 1h4v2h3v3h2v4h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z M6 5h4v6H6z',
 burst:'M7 1h2v4l4-3 1 1-3 4h4v2h-4l3 4-1 1-4-3v4H7v-4l-4 3-1-1 3-4H1V7h4L2 3l1-1 4 3z',
 hourglass:'M3 1h10v3l-4 4 4 4v3H3v-3l4-4-4-4z M5 3h6L8 6z M5 13h6l-3-3z',
 crown:'M1 3l4 3 3-5 3 5 4-3-2 10H3z M3 14h10v1H3z',
 skull:'M4 1h8v2h2v8h-3v4H5v-4H2V3h2z M4 5h3v3H4z M9 5h3v3H9z',
 cards:'M2 1h9v2H4v10H2z M5 4h9v11H5z M7 6h5v1H7z M8 9h3v3H8z',
 gear:'M6 1h4v2h3v3h2v4h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z M6 6h4v4H6z',
 steps:'M1 5h7v2H1z M3 9h7v2H3z M7 2h4v5h3v3h1v4H7v-3h2V7H7z'
};
const roleArt = {gunner:['gun','#82c7e8','狙擊'],swordsman:['sword','#f6b363','鬼斬'],tank:['shield','#9bd78b','嘲諷'],assassin:['dagger','#d4aff5','影襲']};
export function pixelEmblem(kind='gem', color='#e9c878') {
 return '<svg class="pixel-emblem" viewBox="0 0 16 16" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path fill="'+color+'" fill-rule="evenodd" d="'+(shapes[kind]||shapes.gem)+'"/></svg>';
}
const groups = [
 ['flame',/火|焰|龍之/],['ice',/冰|雪/],['heart',/生命|癒|回血|堅韌|吸血/],['boot',/靴/],['bow',/弩|箭/],['book',/學者/],['coin',/幸運|命運/],['poison',/毒/],['bolt',/雷|閃電/],['split',/分裂|彈幕/],['shadow',/影|虛空/],['target',/追蹤|穿透/],['wing',/翼|不死鳥/],['hourglass',/時光|時間/],['shield',/盾|鐵|守護|石膚/],['sword',/刃|斬|劍|拔刀/],['gun',/機關槍/],['skull',/致命|殺戮/],['burst',/爆|震|毀滅|狂暴|拳/],['orb',/磁|黑洞|吞噬|核心|召喚/]
];
export function cardEmblem(card,compact=false) {
 const kind=groups.find(([,pattern])=>pattern.test(card.n))?.[0]||'gem';
 return '<span class="card-emblem'+(compact?' compact':'')+'" style="--emblem-color:'+(card.c||'#e9c878')+'">'+pixelEmblem(kind,card.c||'#e9c878')+'<small>'+String(card.id).padStart(2,'0')+'</small></span>';
}
export function setActionEmblem(id,kind,label,key='') {
 const el=document.getElementById(id); if(!el)return;
 const signature=kind+'|'+label+'|'+key;
 if(el.dataset.art===signature)return;
 el.dataset.art=signature;
 el.innerHTML=pixelEmblem(kind)+'<span class="action-name">'+label+'</span>'+(key?'<kbd>'+key+'</kbd>':'');
}
// Center the visible sprite, rather than its transparent 64px cell.
export function createRolePortrait(role) {
 const canvas=document.createElement('canvas');canvas.width=48;canvas.height=56;canvas.className='role-face';canvas.setAttribute('aria-hidden','true');
 const image=new Image();
 image.onload=()=>{
  const source=document.createElement('canvas');source.width=64;source.height=64;const context=source.getContext('2d',{willReadFrequently:true});
  const row={swordsman:0,tank:1,assassin:2}[role]||0;
  drawSpriteWithEyes(context,image,role==='gunner'?'gunner-pixel':'melee-pixel',128,role==='gunner'?0:row*64,64,0,0,64);
  const data=context.getImageData(0,0,64,64).data;let left=64,top=64,right=-1,bottom=-1;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(data[(y*64+x)*4+3]>=128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)return;
  const width=right-left+1,height=bottom-top+1;
  const target=canvas.getContext('2d');target.imageSmoothingEnabled=false;
  target.drawImage(source,left,top,width,height,Math.round((48-width)/2),Math.round((56-height)/2),width,height);
 };
 image.onerror=()=>console.error('Cannot load role portrait: '+role);
 image.src=import.meta.env.BASE_URL+(role==='gunner'?'gunner-pixel.png':'melee-pixel.png');return canvas;
}

export function installGameButtons() {
 document.querySelectorAll("[data-emblem]").forEach(el=>{el.innerHTML=pixelEmblem(el.dataset.emblem);});
 document.querySelectorAll('#charSelectOv [onclick^="pickChar"]').forEach(el=>{
  const role=el.getAttribute('onclick').match(/pickChar\('([^']+)'\)/)?.[1];
  if(!roleArt[role])return;
  const [kind,color,skill]=roleArt[role];
  const button=document.createElement('button');
  button.type='button';button.className='role-choice';button.setAttribute('onclick',el.getAttribute('onclick'));button.dataset.role=role;
  button.style.setProperty('--role-color',color);
  button.innerHTML='<span class="role-portrait"></span><span class="role-copy">'+Array.from(el.children).slice(1).map(x=>x.outerHTML).join('')+'</span><span class="role-enter">選擇 →</span>';
  button.querySelector('.role-portrait').append(createRolePortrait(role));
  const title=button.querySelector('.role-copy').firstElementChild;title.classList.add('role-title');const badge=document.createElement('span');badge.className='role-weapon';badge.innerHTML=pixelEmblem(kind,color);title.prepend(badge);
  button.querySelector('.role-copy').lastElementChild.textContent='專屬技能 · '+skill;
  el.replaceWith(button);
 });
 const actions=[['classic','sword'],['elite','crown'],['Coop','wing'],['practice','target']];
 document.querySelectorAll('#titleOv button').forEach(el=>{
  const kind=actions.find(([key])=>el.getAttribute('onclick')?.includes(key))?.[1]||'gem';
  const label=el.textContent.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim();
  el.innerHTML=pixelEmblem(kind)+'<span>'+label+'</span><span class="button-arrow">→</span>';
 });
 setActionEmblem('dodgeBtn','steps','閃避','Q');
 const settings=document.getElementById('settingsBtn');
 settings.innerHTML=pixelEmblem('gear')+'<span>設定</span>';settings.setAttribute('aria-label','開啟設定');
 const toolbar=document.getElementById('pracToolbar');
 const cleanToolbar=()=>toolbar.querySelectorAll('button').forEach(el=>{
  for(const node of el.childNodes)if(node.nodeType===Node.TEXT_NODE){const clean=node.textContent.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim();if(clean!==node.textContent)node.textContent=clean;}
 });
 cleanToolbar();new MutationObserver(cleanToolbar).observe(toolbar,{subtree:true,childList:true,characterData:true});
}
