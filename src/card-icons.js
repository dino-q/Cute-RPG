import contract from '../assets/card-icons.json';
const REVISION='card-icons-20261013-v1';
const empty='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
let atlas=null;const urls=new Map();
const byName=new Map(contract.cards.map(card=>[card.name,card]));
// This is a wave buff status, not another collectible card.
byName.set('越戰越勇',byName.get('狂暴之力'));
export const cardIconsReady=new Promise(resolve=>{
 const image=new Image();image.onload=()=>{atlas=image;window.dispatchEvent(new Event('card-icons-ready'));resolve(true);};
 image.onerror=()=>{console.error('Cannot load card-icons.png');resolve(false);};image.src=import.meta.env.BASE_URL+'card-icons.png?v='+REVISION;
});
export function cardIconUrl(card){
 const icon=byName.get(card?.n);if(!atlas||!icon)return empty;
 if(urls.has(icon.name))return urls.get(icon.name);
 const cv=document.createElement('canvas');cv.width=cv.height=contract.cell;const c=cv.getContext('2d');
 c.drawImage(atlas,icon.x,icon.y,contract.cell,contract.cell,0,0,contract.cell,contract.cell);
 const url=cv.toDataURL();urls.set(icon.name,url);return url;
}
export function drawInventoryCardIcon(c,card,x,y,size=22){
 const icon=byName.get(card?.n);if(!atlas||!icon)return false;
 c.save();c.imageSmoothingEnabled=false;c.drawImage(atlas,icon.x,icon.y,contract.cell,contract.cell,x-size/2,y-size/2,size,size);c.restore();return true;
}
