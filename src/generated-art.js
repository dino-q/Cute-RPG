// Approved raster art, packed offline. Drawing always restores canvas state.
let atlas=null,contract=null;
export const generatedArtReady=Promise.all([
 new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Cannot load generated-art.png'));im.src=import.meta.env.BASE_URL+'generated-art.png';}),
 fetch(import.meta.env.BASE_URL+'generated-art.json').then(r=>{if(!r.ok)throw Error('Cannot load generated-art.json');return r.json();})
]).then(([im,data])=>{atlas=im;contract=data;window.dispatchEvent(new Event('game-art-ready'));return true;}).catch(error=>{console.error('Generated game art unavailable.',error);return false;});
export function artFrame(name,index=0){const frames=contract?.groups[name];return frames?.[((Math.floor(index)%frames.length)+frames.length)%frames.length];}
export function drawArt(c,name,index,x,y,width,height=width,options={}){
 const f=artFrame(name,index);if(!atlas||!f)return false;
 const cell=contract.cell,b=f.bounds,sw=b[2]-b[0],sh=b[3]-b[1];
 c.save();c.shadowBlur=0;c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));
 if(options.angle)c.rotate(options.angle);if(options.flip)c.scale(-1,1);
 if(options.alpha!==undefined)c.globalAlpha*=Math.max(0,Math.min(1,options.alpha));
 if(options.fullCell)c.drawImage(atlas,(f.index%contract.columns)*cell,Math.floor(f.index/contract.columns)*cell,cell,cell,-width/2,-height/2,width,height);
 else{const ratio=Math.min(width/sw,height/sh),dw=sw*ratio,dh=sh*ratio;
 c.drawImage(atlas,(f.index%contract.columns)*cell+b[0],Math.floor(f.index/contract.columns)*cell+b[1],sw,sh,-dw*(options.anchorX??.5),-dh*(options.anchorY??.5),dw,dh);}
 c.restore();return true;
}
export function artThumbnail(name,index=0){
 if(!atlas||!artFrame(name,index))return null;
 const cv=document.createElement('canvas');cv.width=96;cv.height=64;
 const c=cv.getContext('2d');c.fillStyle='#182333';c.fillRect(0,0,96,64);
 drawArt(c,name,index,48,32,82,56);return cv.toDataURL();
}
export function directionIndex(angle){return ((Math.round(angle/(Math.PI/4))%8)+8)%8;}
