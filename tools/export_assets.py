"""Export a small, self-contained browser asset set from the supplied APK dump.

The decrypted text is already supplied in t5_work. No APK patching is performed.
Run from the project root with Python + Pillow to regenerate assets.
"""
from pathlib import Path
import json
import re
import shutil
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'decompiled/resources/assets'
OUT = ROOT / 'assets'


def metadata(data):
    data = bytearray(b ^ (3 if i % 2 == 0 else 24) for i, b in enumerate(data))
    for i in range(0, len(data) & ~15, 16):
        for offset in (0, 1, 5, 6):
            data[i + offset], data[i + offset + 8] = data[i + offset + 8], data[i + offset]
    return ET.fromstring(data)


def bank(name, wanted, folder):
    root = metadata((SOURCE / (name + '.bbk')).read_bytes())
    data = (SOURCE / (name + '.dat')).read_bytes()
    palettes = {p.attrib['number']: [int(v) for v in p.text.split()] for p in root.iter('PALETTE')}
    folder.mkdir(parents=True, exist_ok=True)
    for item in root.iter('IMAGE'):
        a = item.attrib
        if a['name'] not in wanted:
            continue
        w, h, bpp, pitch, start = (int(a[k]) for k in ('width', 'height', 'bpp', 'pitch', 'dataOffset'))
        raw = data[start:start + int(a['dataSize'])]
        if bpp == 8:
            im = Image.frombytes('P', (w, h), raw, 'raw', 'P', pitch)
            im.putpalette(palettes[a['paletteNumber']])
            im.info['transparency'] = 0
            im = im.convert('RGBA')
        else:
            mode = 'RGBA' if bpp == 32 else 'RGB'
            order = mode if int(a['redMask']) == 255 else ('BGRA' if bpp == 32 else 'BGR')
            im = Image.frombytes(mode, (w, h), raw, 'raw', order, pitch)
        im.save(folder / (a['name'] + '.png'), optimize=True)


# Names, behavior families and colors belong to the browser implementation.
# Names, descriptions, icons and native explosion parameters come from the APK.
SPECS = [
    ('Single Shot', 'shell', 'Classic', '#f9d880'),
    ('Big Shot', 'shell', 'Classic', '#f6ab63'),
    ('3 Shot', 'triple', 'Cluster', '#e4b2ff'),
    ('5 Shot', 'five', 'Cluster', '#d197f9'),
    ('Sniper Rifle', 'sniper', 'Classic', '#f3e5b8'),
    ('Cannon Ball', 'bounce', 'Classic', '#a9c7d7'),
    ('Chain Reaction', 'chain', 'Cluster', '#fdba74'),
    ('Skipper', 'skip', 'Classic', '#c7e893'),
    ('Roller', 'roller', 'Classic', '#a8c9df'),
    ('Heavy Roller', 'roller', 'Classic', '#96afdc'),
    ('Napalm', 'napalm', 'Elemental', '#ff8d55'),
    ('Hail Storm', 'hail', 'Elemental', '#9ce9f7'),
    ('Dirtball', 'dirt', 'Terrain', '#c9b694'),
    ('Big Dirtball', 'dirt', 'Terrain', '#c3a07c'),
    ('Dirt Slinger', 'dirt', 'Terrain', '#c7d19a'),
    ('Mud Pie', 'dirt', 'Terrain', '#bc9c77'),
    ('Jackhammer', 'drill', 'Terrain', '#e9bf69'),
    ('Digger', 'drill', 'Terrain', '#d1b77e'),
    ('Ground Hog', 'tunnel', 'Terrain', '#c2b286'),
    ('Pile Driver', 'drill', 'Terrain', '#d3a577'),
    ('Heatseeker', 'homing', 'Special', '#fb9a9d'),
    ('Homing Worm', 'tunnel', 'Special', '#e8aac6'),
    ('Beehive', 'bees', 'Special', '#f4d36a'),
    ('Pin Cushion', 'burst', 'Cluster', '#d3b3ff'),
    ('Laser', 'laser', 'Special', '#8bf0d7'),
    ('Super Laser', 'laser', 'Special', '#93deed'),
    ('Lightning Strike', 'lightning', 'Elemental', '#c4bdff'),
    ('Space Laser', 'orbital', 'Special', '#a4f2ee'),
    ('Nuke', 'nuke', 'Heavy', '#d6f28c'),
    ('Mega Nuke', 'nuke', 'Heavy', '#d5fb64'),
    ('Comet', 'shell', 'Heavy', '#fcaf77'),
    ('Meteor Shower', 'meteors', 'Heavy', '#e8a68a'),
    ('Fireball', 'shell', 'Elemental', '#ff9a62'),
    ('Volcano', 'volcano', 'Elemental', '#f2936c'),
    ('Jump Jets', 'jump', 'Special', '#9ed8f2'),
    ('Magic Wall', 'wall', 'Terrain', '#b3c9fa'),
]


def export():
    OUT.mkdir(exist_ok=True)
    source_weapons = {}
    for path in (ROOT / 't5_work/decrypted_weaps').glob('*.txt'):
        text = path.read_text(encoding='latin1')
        pack = text.splitlines()[0].strip()
        for match in re.finditer(r'^WEAPON:\s*([^\r\n]+)\s*\{(.*?)(?=^WEAPON:|\Z)', text, re.M | re.S):
            name, body = match.group(1).strip(), match.group(2)
            header = body.split('}', 1)[0]
            def field(key, default=''):
                found = re.search(r'^\s*' + key + r':\s*([^\r\n]+)', header, re.M)
                return found.group(1).strip() if found else default
            explosions = re.findall(r'^EXPLOSION:[^\r\n]*\s*\{(.*?)\}', body, re.M | re.S)
            values = {}
            if explosions:
                for key in ('RADIUS', 'DAMAGE'):
                    found = re.search(r'^\s*' + key + r':\s*([\d.]+)', explosions[0], re.M)
                    if found:
                        values[key.lower()] = float(found.group(1))
            source_weapons[name.casefold()] = dict(pack=pack, icon=Path(field('ICON')).stem,
                description=field('DESCRIPTION'), native=values)
    weapons = []
    for name, behavior, category, color in SPECS:
        original = source_weapons.get(name.casefold())
        if original is None:
            raise ValueError('Weapon missing from supplied source: ' + name)
        weapons.append(dict(id=re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_'), name=name,
            behavior=behavior, category=category, color=color, **original))
    bank('icons128', {w['icon'] for w in weapons}, OUT / 'icons')
    bank('hdmultires_art', {'logo'}, OUT)
    bank('native_art', {'graytank0001'}, OUT)
    (OUT / 'audio').mkdir(exist_ok=True)
    audio = {'fire': SOURCE / 'weapdata/cannon.ogg', 'select': SOURCE / 'sfx/pickweap.ogg',
        'click': SOURCE / 'sfx/button.ogg', 'bounce': SOURCE / 'sfx/ballbounce.ogg'}
    for key, path in audio.items():
        shutil.copy2(path, OUT / 'audio' / (key + path.suffix))
    # Common explosions are stored with the original weapon sounds.
    for name in ('expmedium2', 'expmedium', 'expbig', 'explarge', 'nuke'):
        found = next(iter(SOURCE.rglob(name + '.ogg')), None)
        if found:
            shutil.copy2(found, OUT / 'audio' / (name + '.ogg'))
    shutil.copy2(SOURCE / 'music/ingame.m4a', OUT / 'audio/ingame.m4a')
    shutil.copy2(SOURCE / 'fonts/Lato-Bold.ttf', OUT / 'Lato-Bold.ttf')
    # Classic script loading also works when index.html is opened via file://.
    (ROOT / 'weapons.js').write_text('/* Exported from the supplied APK. See ASSET_NOTES.md. */\n'
        'globalThis.POCKET_WEAPONS = ' + json.dumps(weapons, indent=2) + ';\n', encoding='utf-8')
    print(f'Exported {len(weapons)} weapons, native icons, logo, tank sprite, font and audio.')


if __name__ == '__main__':
    export()
