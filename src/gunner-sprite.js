import {drawAttachedCardLayer} from './attached-card-art.js';
import {ART_REVISION} from './generated-art.js';
import { cardWeaponAtlas, drawCardGun } from './card-vfx.js';
import { drawSpriteWithEyes } from './sprite-eyes.js';
// Approved generated art; direction changes swap frames without rotating the body.
let atlas, contract;
const base = import.meta.env.BASE_URL;
export const gunnerSpriteReady = Promise.all([
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Cannot load gunner-pixel.png'));
    image.src = base + 'gunner-pixel.png';
  }),
  fetch(base+'gunner-pixel.json?v='+ART_REVISION).then(response => {
    if (!response.ok) throw new Error('Cannot load gunner-pixel.json: ' + response.status);
    return response.json();
  })
]).then(([image, data]) => {
  if (data.cellSize !== 64 || data.frames?.length !== 8 || image.width !== 256 || image.height !== 128) {
    throw new Error('Invalid eight-direction gunner atlas');
  }
  atlas = image; contract = data; return true;
}).catch(error => { console.error('Pixel gunner unavailable; using original appearance.', error); return false; });

export function getGunnerPose(direction = { x: 0, y: 1 }) {
  const x = Number.isFinite(direction?.x) ? direction.x : 0;
  const y = Number.isFinite(direction?.y) ? direction.y : 1;
  const angle = x || y ? Math.atan2(y, x) : Math.PI / 2;
  const index = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  return { index, frame: contract?.frames[index], x: Math.cos(angle), y: Math.sin(angle) };
}

function spritePlacement(x, y, radius, direction, shotAt) {
  const pose = getGunnerPose(direction);
  const scale = radius / 18 * 1.25;
  const elapsed = Number.isFinite(shotAt) ? performance.now() - shotAt : Infinity;
  const recoil = elapsed >= 0 && elapsed < 120 ? (1 - elapsed / 120) * 2 : 0;
  return { ...pose, scale, elapsed, left: x - 32 * scale - pose.x * recoil, top: y - 40 * scale - pose.y * recoil };
}

export function getGunnerMuzzle(x, y, radius, direction, shotAt) {
  if (!atlas || !contract) return null;
  const pose = spritePlacement(x, y, radius, direction, shotAt);
  return { x: pose.left + pose.frame.muzzle[0] * pose.scale, y: pose.top + pose.frame.muzzle[1] * pose.scale };
}

export function drawPixelGunner(context, x, y, radius, direction, shotAt, player, effects=true) {
  if (!atlas || !contract) return false;
  const pose = spritePlacement(x, y, radius, direction, shotAt);
  context.save(); context.imageSmoothingEnabled = false; context.shadowBlur = 0;
  const attachment={left:pose.left,top:pose.top,scale:pose.scale,cell:64,torso:pose.frame.torso,direction:pose.index,effects};
  drawAttachedCardLayer(context,player,attachment,performance.now(),false);
  drawSpriteWithEyes(context, cardWeaponAtlas(atlas,'gunner-pixel',player,contract), 'gunner-pixel', pose.frame.x, pose.frame.y, 64, Math.round(pose.left), Math.round(pose.top), 64 * pose.scale);
  drawAttachedCardLayer(context,player,attachment,performance.now(),true);
  drawCardGun(context,player,getGunnerMuzzle(x,y,radius,direction,shotAt),{x:Math.cos(pose.index*Math.PI/4),y:Math.sin(pose.index*Math.PI/4)},pose.scale,performance.now());
  if (pose.elapsed >= 0 && pose.elapsed < 60) {
    const muzzle = getGunnerMuzzle(x, y, radius, direction, shotAt);
    context.fillStyle = '#ffe066';
    context.fillRect(Math.round(muzzle.x - 2), Math.round(muzzle.y - 2), 4, 4);
    context.fillStyle = '#fff'; context.fillRect(Math.round(muzzle.x - 1), Math.round(muzzle.y - 1), 2, 2);
  }
  context.restore(); return true;
}
