"""Export generated eye repairs, dual-dagger action atlas and directional shield atlas."""
from pathlib import Path
from PIL import Image
import numpy as np
import json
root=Path(__file__).resolve().parents[1]
generated=Path(r'C:/Users/AG_Di/.codex/generated_images/01a12b25-21fa-7ed2-a6cf-fcccf9cb9cb3')
for filename,source,size in [('gunner-pixel.png','exec-60911266-27c4-4f00-a52f-69e6fab3c25f.png',(256,128)),('melee-pixel.png','exec-547b013f-ee15-4a9d-aee1-9ede20158af8.png',(512,192)),('swordsman-action.png','exec-f0ae555e-1b2a-4c8b-8053-127f30e6caac.png',(768,384))]:
 im=Image.open(generated/source).convert('RGBA')
 if im.size!=size: im=im.resize(size,Image.Resampling.NEAREST)
 p=np.array(im);p[:,:,3]=np.where(p[:,:,3]>=128,255,0);Image.fromarray(p).save(root/'assets'/filename)
# All key poses share a head scale and foot baseline, independent of blade trail bounds.
raw=Image.open(generated/'exec-2adb4e9d-c59c-484d-91e5-334097074311.png').convert('RGBA');p=np.array(raw);p[:,:,3]=np.where(p[:,:,3]>=128,255,0);raw=Image.fromarray(p)
cells=[]
for row in range(4):
 for col in range(8):
  tile=raw.crop((col*raw.width//8,row*raw.height//4,(col+1)*raw.width//8,(row+1)*raw.height//4));a=np.array(tile);Y,X=np.indices(a.shape[:2])
  hair=(a[:,:,3]>128)&(a[:,:,0]>25)&(a[:,:,:3].max(axis=2)<125)&(a[:,:,2]>a[:,:,1]*1.03)&(Y<tile.height*.65)
  yy,xx=np.where(hair)
  if len(xx)==0: raise ValueError('Missing assassin hair anchor')
  center=(xx.min()+xx.max())/2;headwidth=xx.max()-xx.min()+1
  boots=(a[:,:,3]>128)&(a[:,:,:3].max(axis=2)<90)&(abs(X-center)<headwidth*.42)&(Y>tile.height*.67)
  ys=np.where(boots)[0];feet=int(ys.max()) if len(ys) else tile.getbbox()[3]
  cells.append((tile,center,feet,headwidth))
scale=32/max(c[3] for c in cells);sheet=Image.new('RGBA',(768,384));frames=[]
for i,(tile,center,feet,_) in enumerate(cells):
 tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.NEAREST);cell=Image.new('RGBA',(96,96));cell.paste(tile,(round(48-center*scale),round(75-feet*scale)),tile);sheet.paste(cell,((i%8)*96,(i//8)*96));frames.append({'x':(i%8)*96,'y':(i//8)*96})
sheet.save(root/'assets'/'assassin-action.png');(root/'assets'/'assassin-action.json').write_text(json.dumps({'cellSize':96,'origin':[48,56],'frames':frames},indent=2)+'\n',encoding='utf8')
# Shields preserve shared height; profile views stay narrower than frontal views.
raw=Image.open(generated/'exec-634eac79-1d5a-436e-bffd-1a15aea63e47.png').convert('RGBA');p=np.array(raw);p[:,:,3]=np.where(p[:,:,3]>=128,255,0);raw=Image.fromarray(p);cells=[]
for col in range(8):
 tile=raw.crop((col*raw.width//8,0,(col+1)*raw.width//8,raw.height));cells.append(tile.crop(tile.getbbox()))
scale=24/max(t.height for t in cells);sheet=Image.new('RGBA',(512,64))
for col,tile in enumerate(cells):
 tile=tile.resize((max(1,round(tile.width*scale)),round(tile.height*scale)),Image.Resampling.NEAREST);sheet.paste(tile,(col*64+(64-tile.width)//2,(64-tile.height)//2),tile)
sheet.save(root/'assets'/'tank-shield.png')
print('Exported eye repairs, dual daggers and shield views.')
