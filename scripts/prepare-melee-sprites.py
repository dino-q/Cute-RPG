"""Convert the generated three-class body sheet into a shared-scale game atlas."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
import sys
root=Path(__file__).resolve().parents[1]
image=Image.open(sys.argv[1]).convert('RGBA')
arr=np.array(image);arr[:,:,3]=np.where(arr[:,:,3]>=128,255,0);image=Image.fromarray(arr)
frames=[]
for row in range(3):
 for col in range(8):
  tile=image.crop((col*image.width//8,row*image.height//3,(col+1)*image.width//8,(row+1)*image.height//3))
  box=tile.getbbox()
  if box is None: raise ValueError('Empty body cell')
  frames.append(tile.crop(box))
scale=38/max(tile.height for tile in frames)
sheet=Image.new('RGBA',(512,192))
roles=['swordsman','tank','assassin'];contract={'cellSize':64,'origin':[32,40],'roles':{}}
for row,role in enumerate(roles):
 roleframes=[]
 for col in range(8):
  tile=frames[row*8+col];tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.NEAREST)
  left=(64-tile.width)//2;top=59-tile.height
  sheet.paste(tile,(col*64+left,row*64+top),tile)
  p=np.array(tile);yy,xx=np.where((p[:,:,3]>128)&(p[:,:,0]>160)&(p[:,:,1]>70)&(p[:,:,1]<215)&(p[:,:,2]<175)&(np.indices(p.shape[:2])[0]>tile.height*.66))
  if len(xx):
   angle=col*3.141592653589793/4;score=xx*np.cos(angle)+yy*np.sin(angle)
   keep=score>=score.max()-2
   hand=[round(float(xx[keep].mean())+left,2),round(float(yy[keep].mean())+top,2)]
  else: hand=[32+int(np.cos(col*3.141592653589793/4)*8),51]
  roleframes.append({'x':col*64,'y':row*64,'hand':hand})
 contract['roles'][role]=roleframes
sheet.save(root/'assets'/'melee-pixel.png')
(root/'assets'/'melee-pixel.json').write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Converted three-class body atlas.')
