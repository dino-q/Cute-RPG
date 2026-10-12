"""Pack AI-generated card icons; only cleanup, crop, resize and label the preview."""
import hashlib,json,math,subprocess,sys,tempfile
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
PROCESSOR=Path.home()/'.codex/skills/generate2dsprite/scripts/generate2dsprite.py'
CELL=64;COLS=8
manifest=json.loads((ROOT/'docs/card-icon-sources.json').read_text(encoding='utf-8'))
frames=[];cards=[];summaries=[]
for source in manifest['sources']:
    out=Path(tempfile.gettempdir())/'cute-rpg-card-icons'/Path(source['file']).stem
    result=subprocess.run([sys.executable,'-X','utf8',str(PROCESSOR),'process','--input',str(ROOT/source['file']),'--target','asset','--mode','custom_grid','--rows',str(source['rows']),'--cols',str(source['cols']),'--output-dir',str(out),'--cell-size',str(CELL),'--fit-scale','.86','--align','center','--scale-strategy','fit','--component-mode','all','--min-component-area','8'],capture_output=True,text=True,encoding='utf-8')
    if result.returncode:raise RuntimeError(result.stdout+result.stderr)
    sheet=Image.open(out/'sheet-transparent.png').convert('RGBA')
    meta=json.loads((out/'pipeline-meta.json').read_text(encoding='utf-8'))
    summaries.append(dict(file=source['file'],qc=meta.get('qc_summary',{})))
    for i,card in enumerate(source['cards']):
        x=(i%source['cols'])*CELL;y=(i//source['cols'])*CELL
        frame=sheet.crop((x,y,x+CELL,y+CELL))
        # Remove isolated sub-five-pixel downsampling flecks, keeping full props and effects.
        alpha=frame.getchannel('A');pixels=alpha.load();seen=set()
        for py in range(CELL):
            for px in range(CELL):
                if (px,py) in seen or not pixels[px,py]:continue
                pending=[(px,py)];seen.add((px,py));component=[]
                while pending:
                    ax,ay=pending.pop();component.append((ax,ay))
                    for nx,ny in ((ax-1,ay),(ax+1,ay),(ax,ay-1),(ax,ay+1)):
                        if 0<=nx<CELL and 0<=ny<CELL and (nx,ny) not in seen and pixels[nx,ny]:seen.add((nx,ny));pending.append((nx,ny))
                if len(component)<5:
                    for ax,ay in component:pixels[ax,ay]=0
        frame.putalpha(alpha)
        box=frame.getbbox()
        if not box:raise ValueError('Empty icon '+card['name'])
        if box[0]==0 or box[1]==0 or box[2]==CELL or box[3]==CELL:raise ValueError('Output edge contact '+card['name'])
        index=len(frames);cards.append(dict(**card,x=(index%COLS)*CELL,y=(index//COLS)*CELL,sha256=hashlib.sha256(frame.tobytes()).hexdigest()));frames.append(frame)
if len({card['name'] for card in cards})!=len(cards) or len({card['sha256'] for card in cards})!=len(cards):raise ValueError('Duplicate icon name or image')
atlas=Image.new('RGBA',(CELL*COLS,CELL*math.ceil(len(frames)/COLS)))
for card,frame in zip(cards,frames):atlas.alpha_composite(frame,(card['x'],card['y']))
atlas.save(ROOT/'assets/card-icons.png',optimize=True)
(ROOT/'assets/card-icons.json').write_text(json.dumps(dict(revision=manifest['revision'],cell=CELL,columns=COLS,cards=cards),ensure_ascii=False,indent=2),encoding='utf-8')
font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',14)
preview=Image.new('RGB',(148*COLS,122*math.ceil(len(cards)/COLS)),(17,28,40));draw=ImageDraw.Draw(preview)
for i,(card,frame) in enumerate(zip(cards,frames)):
    x=(i%COLS)*148;y=(i//COLS)*122
    preview.paste(frame,(x+42,y+10),frame)
    text=str(card['id']).zfill(2)+' '+card['name'];box=draw.textbbox((0,0),text,font=font)
    draw.text((x+(148-box[2])/2,y+83),text,font=font,fill=(225,216,188))
preview.save(ROOT/'docs/卡片圖示總覽.png',optimize=True)
(ROOT/'docs/card-icon-qc.json').write_text(json.dumps(dict(count=len(cards),unique=len({c['sha256'] for c in cards}),output_edge_contact=0,sources=summaries),ensure_ascii=False,indent=2),encoding='utf-8')
print('Packed '+str(len(cards))+' unique card icons; '+str(atlas.width)+'x'+str(atlas.height)+'; output edge contact=0')
