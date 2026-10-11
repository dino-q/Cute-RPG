"""Export whole-body sword key poses with a shared head scale and foot anchor."""
from PIL import Image
from pathlib import Path
import numpy as np
import json,sys
root=Path(__file__).resolve().parents[1]
raw=Image.open(sys.argv[1]).convert('RGBA');a=np.array(raw);a[:,:,3]=np.where(a[:,:,3]>=128,255,0);raw=Image.fromarray(a)
cells=[]
for row in range(4):
 for col in range(8):
  tile=raw.crop((col*raw.width//8,row*raw.height//4,(col+1)*raw.width//8,(row+1)*raw.height//4));p=np.array(tile)
  hair=(p[:,:,3]>128)&(p[:,:,0]>70)&(p[:,:,0]<200)&(p[:,:,0]>p[:,:,1]*1.35)&(p[:,:,1]>p[:,:,2]*1.05)
  yy,xx=np.where(hair)
  if len(xx)==0: raise ValueError('Missing sword character hair')
  center=(xx.min()+xx.max())/2;headwidth=xx.max()-xx.min()+1
  Y,X=np.indices(p.shape[:2]);boots=(p[:,:,3]>128)&(p[:,:,:3].max(axis=2)<90)&(abs(X-center)<headwidth*.48)&(Y>yy.max()+5)
  ys=np.where(boots)[0];feet=int(ys.max()) if len(ys) else tile.getbbox()[3]
  cells.append((tile,center,feet,headwidth))
scale=32/max(c[3] for c in cells);sheet=Image.new('RGBA',(768,384));frames=[]
for i,(tile,center,feet,_) in enumerate(cells):
 resized=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.NEAREST)
 left=round(48-center*scale);top=round(75-feet*scale)
 cell=Image.new('RGBA',(96,96));cell.paste(resized,(left,top),resized);sheet.paste(cell,((i%8)*96,(i//8)*96))
 frames.append({'x':(i%8)*96,'y':(i//8)*96})
sheet.save(root/'assets'/'swordsman-action.png')
(root/'assets'/'swordsman-action.json').write_text(json.dumps({'cellSize':96,'origin':[48,56],'frames':frames},indent=2)+'\n',encoding='utf8')
# Imagegen edits the actual gunner atlas; normalize export size without redrawing it.
eye=Image.open(sys.argv[2]).convert('RGBA')
if eye.size!=(256,128):eye=eye.resize((256,128),Image.Resampling.NEAREST)
eye.save(root/'assets'/'gunner-pixel.png')
print('Sword whole-body key poses and game-size eye repair exported.')
