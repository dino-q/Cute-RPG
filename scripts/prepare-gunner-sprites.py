"""Prepare the approved eight-direction generated gunner using the sprite processor."""
import argparse
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import numpy as np
from PIL import Image


def prepare(input_path, processor_path):
    root = Path(__file__).resolve().parents[1]
    raw = Image.open(input_path).convert('RGBA')
    pixels = np.array(raw)
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    raw = Image.fromarray(pixels)
    rows = [0, round(raw.height * .35), round(raw.height * .65), raw.height]
    cols = [round(raw.width * i / 3) for i in range(4)]
    # Runtime order runs clockwise from east; the source is a compass grid.
    cells = [('e',1,2),('se',2,2),('s',2,1),('sw',2,0),('w',1,0),('nw',0,0),('n',0,1),('ne',0,2)]
    packed = Image.new('RGBA',(512*4,512*2),(255,0,255,255))
    for i, (_, row, col) in enumerate(cells):
        frame = raw.crop((cols[col],rows[row],cols[col+1],rows[row+1]))
        bbox = frame.getbbox()
        if not bbox:
            raise ValueError('Empty direction: '+cells[i][0])
        frame = frame.crop(bbox)
        packed.paste(frame,((i%4)*512+(512-frame.width)//2,(i//4)*512+448-frame.height),frame)
    with tempfile.TemporaryDirectory(prefix='gunner-sprites-') as tmp:
        tmp = Path(tmp)
        source = tmp/'packed.png'
        packed.save(source)
        subprocess.run([sys.executable,str(processor_path),'process','--input',str(source),'--target','player','--mode','attack','--rows','2','--cols','4','--output-dir',str(tmp/'processed'),'--cell-size','64','--fit-scale','0.82','--align','feet','--scale-strategy','preserve','--shared-scale','--component-mode','largest','--trim-border','0','--edge-clean-depth','0','--max-body-scale-cv','0.08','--max-anchor-y-std','0.05'],check=True)
        out = tmp/'processed'
        meta = json.loads((out/'pipeline-meta.json').read_text(encoding='utf8'))
        # Keep the processor's shared scale and anchor, with crisp nearest-neighbor sampling.
        sheet = Image.new('RGBA',(256,128),(0,0,0,0))
        for i, info in enumerate(meta['frames']):
            tile = packed.crop(tuple(info['source_box']))
            tile_pixels = np.array(tile)
            magenta = (tile_pixels[:,:,0]==255)&(tile_pixels[:,:,1]==0)&(tile_pixels[:,:,2]==255)
            tile_pixels[magenta] = [0,0,0,0]
            tile = Image.fromarray(tile_pixels).crop(tuple(info['crop_bbox']))
            tile = tile.resize(tuple(info['output_size']),Image.Resampling.NEAREST)
            px,py = info['paste_position']
            sheet.paste(tile,((i%4)*64+px,(i//4)*64+py),tile)
        frames = []
        for i, (name, _, _) in enumerate(cells):
            frame = sheet.crop(((i%4)*64,(i//4)*64,(i%4+1)*64,(i//4+1)*64))
            arr = np.array(frame)
            mask = (arr[:,:,0]>180)&(arr[:,:,1]>55)&(arr[:,:,1]<195)&(arr[:,:,2]<90)&(arr[:,:,3]>128)
            yy,xx = np.where(mask)
            if not len(xx):
                raise ValueError('No orange muzzle marker in '+name)
            angle = i*math.pi/4
            score = xx*math.cos(angle)+yy*math.sin(angle)
            keep = score >= score.max()-.6
            muzzle = [round(float(xx[keep].mean()),2),round(float(yy[keep].mean()),2)]
            frames.append({'direction':name,'x':(i%4)*64,'y':(i//4)*64,'muzzle':muzzle})
        sheet.save(root/'assets'/'gunner-pixel.png')
        contract = {'cellSize':64,'origin':[32,40],'frames':frames,'qc':meta['qc_summary'],'source':Path(input_path).name,'notes':'One static pose per direction. Shared scale; not a walk animation.'}
        (root/'assets'/'gunner-pixel.json').write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        (root/'docs'/'gunner-sprite-qc.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        print(json.dumps(contract,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--input',type=Path,required=True)
    parser.add_argument('--processor',type=Path,required=True)
    args=parser.parse_args()
    prepare(args.input,args.processor)

# Restore authored weapon mounts after regenerating the sprite contract.
import subprocess, sys
subprocess.run([sys.executable,str(Path(__file__).resolve().parents[1]/"scripts/apply-weapon-mounts.py")],check=True)
