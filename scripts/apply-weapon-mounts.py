"""Apply authored mounts after sprite processing; never infer axes from image pixels."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'docs/weapon-mounts.json').read_text(encoding='utf-8'))
for name,mounts in data['atlases'].items():
    path=ROOT/'assets'/f'{name}.json'
    atlas=json.loads(path.read_text(encoding='utf-8'))
    if len(atlas['frames'])!=len(mounts):
        raise ValueError(f'Weapon mount count mismatch: {name}')
    for frame,mount in zip(atlas['frames'],mounts):
        frame.update(mount)
    path.write_text(json.dumps(atlas,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
