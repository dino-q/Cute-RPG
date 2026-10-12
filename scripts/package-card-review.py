from pathlib import Path
import zipfile, sys
base=Path(sys.argv[1])
files=[base/'卡牌特效預覽-待確認.html',base/'card-effects-review-manifest.json']+sorted(base.glob('*-review.png'))
with zipfile.ZipFile(base/'卡牌特效預覽-待確認.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
    for p in files: z.write(p,p.name)
print('預覽包：'+str(len(files))+' 個檔案')
