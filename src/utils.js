// Pure utility functions — no state dependency
export const di = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
export const cl = (v, l, h) => Math.max(l, Math.min(h, v));
export const rn = (a, b) => a + Math.random() * (b - a);
export const $ = id => document.getElementById(id);

// Skill facing is independent of aim: show the direction actually travelled.
export function getSkillTravelDirection(player,now=performance.now()){
 if(!player)return null;let direction;
 if(player._dashEnd>now)direction={x:player._dashDx,y:player._dashDy};
 else if(player._gsDash&&now-player._gsDash.startT<player._gsDash.dur)direction={x:player._gsDash.endX-player._gsDash.startX,y:player._gsDash.endY-player._gsDash.startY};
 else if(player._travelFacing?.until>now)direction=player._travelFacing;
 if(!direction||!Number.isFinite(direction.x)||!Number.isFinite(direction.y))return null;
 const length=Math.hypot(direction.x,direction.y);return length>.001?{x:direction.x/length,y:direction.y/length}:null;
}
