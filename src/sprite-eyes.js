// Fixed eye geometry shared by portraits, idle bodies and full-body attacks.
// Each rectangle covers an ORIGINAL eye (including its old outline), in cell pixels.
// Source PNG files stay untouched. Faces are corrected only by the game renderer.
const pair=(x,y,w=2,h=3)=>[x,y,w,h];
const bodyRows=[
 [[pair(38,41,2,3)],[pair(31,41),pair(38,41)],[pair(26,41,3),pair(35,41)],[pair(23,41),pair(30,41)],[pair(28,41,3,2)],[],[],[]],
 [[pair(38,38,2,3)],[pair(31,39),pair(38,39)],[pair(26,39,3),pair(35,39)],[pair(23,39),pair(30,39)],[pair(28,38,3,3)],[],[],[]],
 [[pair(38,37,2,2)],[pair(31,37),pair(38,37)],[pair(26,37,3),pair(35,37)],[pair(23,37),pair(30,37)],[pair(28,36,2,3)],[],[],[]]
];
const swordRows=[
 [[pair(45,61,3,4),pair(52,61,2,4)],[pair(45,61,3,4),pair(53,61,3,4)],[pair(44,61,2,4),pair(51,61,3,4)],[pair(55,61,2,4)],[pair(43,61,2,4),pair(51,61,2,4)],[pair(43,61,2,4)],[pair(43,61,3,4),pair(51,61,2,4)],[pair(43,61,3,4),pair(51,61,2,4)]],
 [[pair(46,62,2,4),pair(53,62,3,3)],[pair(45,62,3,4),pair(52,62,3,3)],[pair(44,62,2,3),pair(51,62,2,3)],[pair(42,64,2,2),pair(50,63,2,2)],[pair(42,62,2,3),pair(50,62,2,3)],[pair(43,62,2,3)],[pair(44,62,2,3),pair(51,62,2,3)],[pair(43,62,3,3),pair(51,62,2,3)]],
 [[pair(45,63,3,3),pair(52,63,3,3)],[pair(47,63,3,3),pair(55,63,3,3)],[pair(44,63,2,3),pair(51,63,2,3)],[pair(55,63,2,3)],[pair(42,63,2,3),pair(50,63,2,3)],[pair(42,63,2,3)],[],[pair(55,63,2,2)]],
 [[pair(45,61,3,4),pair(53,61,3,4)],[pair(45,61,3,4),pair(53,61,3,4)],[pair(44,61,2,3),pair(51,61,3,4)],[pair(55,61,2,3)],[pair(43,61,2,4),pair(51,61,2,3)],[pair(43,61,2,3)],[pair(43,61,3,4),pair(51,61,2,3)],[pair(43,61,2,4),pair(51,61,3,3)]]
];
const assassinRows=[
 [[pair(50,63,2,2)],[pair(45,63,2,2),pair(48,63,1,2)],[pair(44,63,2,2),pair(50,63,2,2)],[pair(43,63,1,2),pair(47,63,1,2)],[pair(44,64,1,1)],[],[],[pair(50,63,1,2)]],
 [[pair(51,59,1,2)],[pair(46,59,1,2),pair(48,59,1,2)],[pair(44,59,2,2),pair(50,59,2,2)],[pair(42,59,1,2),pair(46,59,1,2)],[pair(45,60,1,1)],[],[],[pair(51,60,1,1)]],
 [[pair(51,60,1,2)],[pair(47,60,1,2),pair(50,59,1,3)],[pair(44,60,2,3),pair(50,60,2,3)],[pair(39,59,1,1),pair(44,60,1,3)],[pair(41,61,1,2)],[],[],[pair(52,60,1,3)]],
 [[pair(49,59,1,2)],[pair(45,59,2,1),pair(48,59,1,2)],[pair(44,59,2,2),pair(50,59,2,2)],[pair(43,59,1,2),pair(47,59,1,2)],[pair(44,59,2,2)],[],[],[pair(51,59,1,2)]]
];
const eyes={
 'gunner-pixel':[[pair(35,44,2,2)],[pair(32,45,2,3),pair(38,44,2,2)],[pair(30,45,2,2),pair(37,45,1,2)],[pair(30,43,2,2),pair(36,45,2,2)],[pair(27,43,2,2)],[],[],[]],
 'melee-pixel':bodyRows.flat(),
 'swordsman-action':swordRows.flat(),
 'assassin-action':assassinRows.flat()
};
const samples=new WeakMap();
function skinAt(image,sx,sy,box){
 let data=samples.get(image);
 if(!data){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);data=ctx.getImageData(0,0,image.width,image.height).data;samples.set(image,data);}
 const [x,y,w,h]=box;
 // Prefer skin just under the old eye, then its sides. Never sample hair/outline.
 for(const [dx,dy]of [[0,h],[1,h],[-1,1],[w,1],[-1,h],[w,h],[0,h+1]]){
  const i=((sy+y+dy)*image.width+sx+x+dx)*4;const [r,g,b,a]=data.slice(i,i+4);
  if(a>128&&r>155&&g>95&&b>55&&r>g*1.12&&g>b*1.05)return 'rgb('+r+','+g+','+b+')';
 }
 return '#f3bf91';
}
export function drawSpriteWithEyes(ctx,image,key,sx,sy,cell,dx,dy,size){
 ctx.drawImage(image,sx,sy,cell,cell,dx,dy,size,size);
 const boxes=eyes[key]?.[(sy/cell)*(image.width/cell)+sx/cell];
 if(!boxes?.length)return;
 const scale=size/cell;
 ctx.save();
 // Cover old eyes first, so one eye's cover cannot erase its neighbour.
 for(const box of boxes){const [x,y,w,h]=box;ctx.fillStyle=skinAt(image,sx,sy,box);const left=Math.round(dx+x*scale),top=Math.round(dy+y*scale);ctx.fillRect(left,top,Math.round(dx+(x+w)*scale)-left,Math.round(dy+(y+h)*scale)-top);}
 const eyeSize=Math.max(1,Math.round(2*scale));
 const eyeY=Math.round(boxes.reduce((sum,b)=>sum+b[1],0)/boxes.length);
 ctx.fillStyle='#241c22';
 for(const [x,,w]of boxes){const left=Math.round(dx+(x+(w-2)/2)*scale),top=Math.round(dy+eyeY*scale);ctx.fillRect(left,top,eyeSize,eyeSize);}
 ctx.restore();
}
