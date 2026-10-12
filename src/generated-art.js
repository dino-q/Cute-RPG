export const ART_REVISION='creatures-follow-qi-20261012-v6';
// Approved raster art, packed offline. Drawing always restores canvas state.
let atlas=null,contract=null;
export const generatedArtReady=Promise.all([
 new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Cannot load generated-art.png'));im.src=import.meta.env.BASE_URL+'generated-art.png?v='+ART_REVISION;}),
 fetch(import.meta.env.BASE_URL+'generated-art.json?v='+ART_REVISION).then(r=>{if(!r.ok)throw Error('Cannot load generated-art.json');return r.json();})
]).then(([im,data])=>{atlas=im;contract=data;window.dispatchEvent(new Event('game-art-ready'));return true;}).catch(error=>{console.error('Generated game art unavailable.',error);return false;});
export function artFrame(name,index=0){const frames=contract?.groups[name];return frames?.[((Math.floor(index)%frames.length)+frames.length)%frames.length];}
const styledFrames=new Map();
function styledFrame(f,outline,brightness){
 const key=f.index+':'+outline+':'+brightness;if(styledFrames.has(key))return styledFrames.get(key);
 const cell=contract.cell,cv=document.createElement('canvas');cv.width=cv.height=cell;const c=cv.getContext('2d');
 const sx=(f.index%contract.columns)*cell,sy=Math.floor(f.index/contract.columns)*cell;
 if(outline){for(const [dx,dy]of [[-3,0],[3,0],[0,-3],[0,3]])c.drawImage(atlas,sx,sy,cell,cell,dx,dy,cell,cell);
 c.globalCompositeOperation='source-in';c.fillStyle=outline;c.fillRect(0,0,cell,cell);c.globalCompositeOperation='source-over';}
 c.filter='brightness('+(brightness||1)+')';c.drawImage(atlas,sx,sy,cell,cell,0,0,cell,cell);c.filter='none';
 styledFrames.set(key,cv);return cv;
}
export function drawArt(c,name,index,x,y,width,height=width,options={}){
 const f=artFrame(name,index);if(!atlas||!f)return false;
 const cell=contract.cell,pad=options.outline?3:0,b=[Math.max(0,f.bounds[0]-pad),Math.max(0,f.bounds[1]-pad),Math.min(cell,f.bounds[2]+pad),Math.min(cell,f.bounds[3]+pad)],sw=b[2]-b[0],sh=b[3]-b[1];
 const styled=options.outline||options.brightness?styledFrame(f,options.outline,options.brightness):null;
 const source=styled||atlas,sx=styled?0:(f.index%contract.columns)*cell,sy=styled?0:Math.floor(f.index/contract.columns)*cell;
 c.save();c.shadowBlur=0;c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));
 if(options.angle)c.rotate(options.angle);if(options.flip)c.scale(-1,1);
 if(options.alpha!==undefined)c.globalAlpha*=Math.max(0,Math.min(1,options.alpha));
 if(options.fullCell)c.drawImage(source,sx,sy,cell,cell,-width*(options.anchorX??.5),-height*(options.anchorY??.5),width,height);
 else{const ratio=Math.min(width/sw,height/sh),dw=options.stretch?width:sw*ratio,dh=options.stretch?height:sh*ratio;
 c.drawImage(source,sx+b[0],sy+b[1],sw,sh,-dw*(options.anchorX??.5),-dh*(options.anchorY??.5),dw,dh);}
 c.restore();return true;
}
export function artThumbnail(name,index=0){
 if(!atlas||!artFrame(name,index))return null;
 const cv=document.createElement('canvas');cv.width=96;cv.height=64;
 const c=cv.getContext('2d');c.fillStyle='#182333';c.fillRect(0,0,96,64);
 drawArt(c,name,index,48,32,82,56);return cv.toDataURL();
}
export function directionIndex(angle){return ((Math.round(angle/(Math.PI/4))%8)+8)%8;}

export function drawMountedArt(c,name,index,grip,tip,mount){
 const f=artFrame(name,index);if(!atlas||!f)return false;
 const sx=(f.index%contract.columns)*contract.cell,sy=Math.floor(f.index/contract.columns)*contract.cell;
 const ax=mount.tip[0]-mount.grip[0],ay=mount.tip[1]-mount.grip[1],dx=tip[0]-grip[0],dy=tip[1]-grip[1];
 const sourceLength=Math.hypot(ax,ay),length=Math.hypot(dx,dy);if(sourceLength<1||length<1)return false;
 const k=length/sourceLength,a=Math.atan2(dy,dx)-Math.atan2(mount.mirrorY?-ay:ay,ax),b=mount.crop||[0,0,contract.cell,contract.cell];
 c.save();c.shadowBlur=0;c.imageSmoothingEnabled=false;c.translate(grip[0],grip[1]);c.rotate(a);if(mount.mirrorY)c.scale(1,-1);
 c.drawImage(atlas,sx+b[0],sy+b[1],b[2]-b[0],b[3]-b[1],(b[0]-mount.grip[0])*k,(b[1]-mount.grip[1])*k,(b[2]-b[0])*k,(b[3]-b[1])*k);c.restore();return true;
}
