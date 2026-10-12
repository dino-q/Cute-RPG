"""Deterministic cleanup/packing of approved image_gen art; no drawing of raw art."""
import json, math, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
PROCESSOR=Path('C:/Users/AG_Di/.codex/skills/generate2dsprite/scripts/generate2dsprite.py')
CELL=128
items=[]
manifest=json.loads((ROOT/'角色預覽/card-effects-review-manifest.json').read_text(encoding='utf-8'))
for a in manifest['assets']:
    im=Image.open(ROOT/'角色預覽'/a['file']).convert('RGBA')
    items.append((a['id'].replace('-review','').replace('-effects',''),im,a['rows'],a['cols'],a['type']))
for a in json.loads((ROOT/'docs/generated-art-sources.json').read_text(encoding='utf-8'))['sources']:
    out=Path(tempfile.gettempdir())/'cute-rpg-boss-art'/a['id']
    if not (out/'sheet-transparent.png').exists():
        subprocess.run([sys.executable,'-X','utf8',str(PROCESSOR),'process','--input',str(ROOT/a['file']),
           '--target','asset' if a['kind']=='fx' or a['id']=='chest-art' else 'creature','--mode','custom_grid',
           '--rows',str(a['rows']),'--cols',str(a['cols']),'--output-dir',str(out),
           '--cell-size','128','--fit-scale','.72','--align','center' if a['kind']=='fx' else 'feet',
           '--scale-strategy','preserve','--component-mode','all' if a['kind']=='fx' or 'defeat' in a['id'] or a['id']=='chest-art' else 'largest'],check=True,capture_output=True)
    items.append((a['id'],Image.open(out/'sheet-transparent.png').convert('RGBA'),a['rows'],a['cols'],'sequence' if a['kind']=='fx' else 'body'))
frames=[]
groups={}
for name,im,rows,cols,kind in items:
    cw,ch=im.width/cols,im.height/rows
    local=[]
    for j in range(rows):
        for i in range(cols):
            crop=im.crop((round(i*cw),round(j*ch),round((i+1)*cw),round((j+1)*ch)))
            box=crop.getbbox()
            if not box: raise ValueError(f'Empty frame {name} {j*cols+i}')
            local.append((crop,box))
    maxw=max(b[2]-b[0] for _,b in local);maxh=max(b[3]-b[1] for _,b in local)
    # Same family scale and original center retained for animation; props can center individually.
    shared=min(112/maxw,112/maxh,1)
    groups[name]=[]
    for i,(crop,box) in enumerate(local):
        canvas=Image.new('RGBA',(CELL,CELL))
        if kind=='pack':
            cut=crop.crop(box);factor=min(108/cut.width,108/cut.height)
            cut=cut.resize((max(1,round(cut.width*factor)),max(1,round(cut.height*factor))),Image.Resampling.NEAREST)
            canvas.alpha_composite(cut,((CELL-cut.width)//2,(CELL-cut.height)//2))
        else:
            cut=crop.resize((round(crop.width*shared),round(crop.height*shared)),Image.Resampling.NEAREST)
            canvas.alpha_composite(cut,((CELL-cut.width)//2,(CELL-cut.height)//2))
        b=canvas.getbbox()
        groups[name].append(dict(index=len(frames),bounds=list(b),origin=[64,64],feet=[64,112]))
        frames.append(canvas)
atlas=Image.new('RGBA',(CELL*8,CELL*math.ceil(len(frames)/8)))
for n,frame in enumerate(frames):atlas.alpha_composite(frame,((n%8)*CELL,(n//8)*CELL))
atlas.save(ROOT/'assets/generated-art.png',optimize=True)
(ROOT/'assets/generated-art.json').write_text(json.dumps(dict(cell=CELL,columns=8,groups=groups),ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'Packed {len(frames)} frames in {len(groups)} groups; {atlas.width}x{atlas.height}')
