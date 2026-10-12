import {drawArt} from './generated-art.js';
export function legendProfile(p){
 const cards=p?._legendCards||{};
 if(cards['創世神力'])return {group:'genesis',blade:4,slash:8,impact:8,level:cards['創世神力'],key:'genesis'};
 if(cards['無盡之刃'])return {group:'infinity-blade',blade:0,slash:4,impact:8,level:cards['無盡之刃'],key:'infinity-blade'};
 if(cards['星辰劍'])return {group:'star-sword',blade:0,slash:4,impact:8,level:cards['星辰劍'],key:'star-sword'};
 return null;
}
export function drawLegendPlayerLayer(c,p,x,y,r,now,front){
 const cards=p?._legendCards||{},s=r/18;if(!Object.keys(cards).length)return;
 if(!front&&cards['創世神力'])drawArt(c,'genesis',Math.floor(now/240)%4,x,y+15*s,78*s,42*s,{alpha:.68});
 if(front&&cards['星辰劍']){const a=now/1300;for(const side of [-1,1])drawArt(c,'star-sword',0,x+side*(r+5),y+8*s+Math.sin(a+side)*2*s,9*s,5*s,{stretch:true,angle:side<0?Math.PI:0,alpha:.6});}
}
export function drawLegendBullet(c,b,p,now,r){
 const f=legendProfile(p);if(!f||p?.fx?.lightning)return false;
 const a=Math.atan2(b.vy||0,b.vx||1),frame=f.blade+Math.floor(now/85)%4;
 for(const t of (b.trail||[]).slice(-3))drawArt(c,f.group,frame,t.x,t.y,r*7,r*3,{stretch:true,angle:a,alpha:(t.life||0)*.32});
 drawArt(c,f.group,frame,b.x,b.y,r*(8+f.level),r*(3+f.level*.3),{stretch:true,angle:a});return true;
}
export function drawLegendStrike(c,p,animation,now,r){
 const f=legendProfile(p);if(!f||!animation?.active)return false;
 const role=p.charType||'swordsman',duration=role==='assassin'?150:role==='tank'?280:320,q=(now-animation.startT)/duration;
 if(q<.18||q>.86)return true;
 const d=p._ad||{x:0,y:1},a=Number.isFinite(animation.angle)?animation.angle:Math.atan2(d.y,d.x),phase=Math.min(3,Math.floor((q-.18)/.68*4)),alpha=Math.sin((q-.18)/.68*Math.PI);
 const size=r*(role==='tank'?3.3:4.5);
 drawArt(c,f.group,f.slash+phase,p.x+Math.cos(a)*r*1.5,p.y+Math.sin(a)*r*1.5,size,size,{angle:a,alpha});
 if(role==='assassin')drawArt(c,f.group,f.slash+phase,p.x+Math.cos(a)*r*.8,p.y+Math.sin(a)*r*.8,size*.6,size*.6,{angle:a+.25,flip:true,alpha:alpha*.7});
 if(p._legendCards?.['無盡之刃']&&f.key!=='infinity-blade')drawArt(c,'infinity-blade',4+phase,p.x+Math.cos(a)*r*1.5,p.y+Math.sin(a)*r*1.5,size*.8,size*.8,{angle:a+.16,alpha:alpha*.55});
 return true;
}
