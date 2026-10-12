import {drawArt} from './generated-art.js';
export function drawTreasure(c,cr,now){
 const big=!!cr.bigChest,size=big?47:32;
 drawArt(c,'chest-art',cr.hits>0?1:0,cr.x,cr.y,size,size,{fullCell:true});
 if(big)drawArt(c,'star',7,cr.x,cr.y-4,48,48,{alpha:.25+.12*Math.sin(now/300)});
 if(cr.hits>0){const width=big?36:25;c.save();c.fillStyle='#182331';c.fillRect(cr.x-width/2,cr.y+size*.35,width,3);c.fillStyle='#dfbd6c';c.fillRect(cr.x-width/2,cr.y+size*.35,width*Math.min(1,cr.hits/cr.needed),3);c.restore();}
}
export function animateChestOpening(container){
 if(!container)return;const cv=document.createElement('canvas');cv.width=112;cv.height=88;cv.style.cssText='width:84px;height:66px;image-rendering:pixelated;display:block;margin:0 auto 4px';
 container.prepend(cv);const c=cv.getContext('2d'),start=performance.now();
 function frame(now){if(!cv.isConnected)return;const q=(now-start)/450;c.clearRect(0,0,112,88);drawArt(c,'chest-art',Math.min(3,Math.floor(q*4)),56,44,100,88,{fullCell:true});if(q<1)requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
}
