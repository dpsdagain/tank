"""Read sprite alpha and build draw-window metadata. Never rewrites image pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'assets/projectiles/painted'
SOURCES = {
    'heatseeker': ('heatseeker.png', 1, 1),
    'diggerBody': ('digger-parts.png', 2, 1),
    'diggerTip': ('digger-tip-4.png', 2, 2),
    'beehive': ('beehive.png', 1, 1),
    'comet': ('comet.png', 1, 1),
    'fireball': ('fireball-4.png', 2, 2),
}
assets, inspection = {}, []
for key, (name, cols, rows) in SOURCES.items():
    path = FOLDER / name
    with Image.open(path) as im:
        assert im.mode == 'RGBA', f'{name} must have a real alpha channel'
        width, height = im.size
        alpha = im.getchannel('A')
        histogram = alpha.histogram()
        assert histogram[0] > width * height * .1, f'{name} needs transparent gutters'
        strong = alpha.point(lambda value: 255 if value > 96 else 0)
        frames = []
        for row in range(rows):
            for col in range(cols):
                left, top = col * width // cols, row * height // rows
                right, bottom = (col + 1) * width // cols, (row + 1) * height // rows
                cell = (left, top, right, bottom)
                # Alpha is inspected only; full soft edges remain in the PNG.
                visible = alpha.crop(cell).getbbox()
                core = strong.crop(cell).getbbox()
                assert visible and core, f'{name}: empty sprite cell'
                assert core[0] > 1 and core[1] > 1 and core[2] < right-left-1 and core[3] < bottom-top-1, f'{name}: clipped body'
                frames.append({
                    'rect': [left + visible[0], top + visible[1], visible[2]-visible[0], visible[3]-visible[1]],
                    'body': [left + core[0], top + core[1], core[2]-core[0], core[3]-core[1]],
                })
        assets[key] = {'src': f'assets/projectiles/painted/{name}', 'size': [width, height], 'frames': frames}
        inspection.append({'key': key, 'file': name, 'size': [width, height], 'mode': im.mode,
            'transparentPixels': histogram[0], 'partialPixels': sum(histogram[1:255]),
            'alphaRange': list(alpha.getextrema()), 'frames': frames,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size})

manifest = {'version': 1, 'assets': assets, 'weapons': {
    'heatseeker': {'asset': 'heatseeker', 'width': 38},
    'digger': {'asset': 'diggerBody', 'width': 20, 'tipAsset': 'diggerTip', 'tipWidth': 22, 'fps': 16},
    'beehive': {'asset': 'beehive', 'width': 30},
    'comet': {'asset': 'comet', 'width': 27},
    'fireball': {'asset': 'fireball', 'width': 44, 'fps': 12},
}}
source = '/* Alpha-aware source windows for unmodified generated PNGs. See PROMPTS.md. */\n'
source += '(function(root){\n  const data = ' + json.dumps(manifest, separators=(',', ':')) + ';\n'
source += '  root.PAINTED_SPRITES=data;\n  if(typeof module!=="undefined"&&module.exports)module.exports=data;\n})(typeof globalThis!=="undefined"?globalThis:this);\n'
(FOLDER / 'manifest.js').write_text(source, encoding='utf-8')
(FOLDER / 'asset-inspection.json').write_text(json.dumps(inspection, indent=2), encoding='utf-8')
print(f'Inspected {len(assets)} unmodified RGBA images; generated metadata for {len(manifest["weapons"])} weapons.')
for key, asset in assets.items():
    print(key, asset['size'], len(asset['frames']), 'frames')
