"""Recover native visual recipes and animation frames for the browser renderer."""
from pathlib import Path
import json
import re
import shutil
import xml.etree.ElementTree as ET
from PIL import Image
from export_assets import metadata, ROOT, SOURCE, OUT, SPECS


def decoded(data):
    buf = bytearray(b ^ (3 if i % 2 == 0 else 24) for i, b in enumerate(data))
    for i in range(0, len(buf) & ~15, 16):
        for n in (0, 1, 5, 6):
            buf[i + n], buf[i + n + 8] = buf[i + n + 8], buf[i + n]
    return bytes(buf).decode('latin1')


def fields(body):
    return dict(re.findall(r'^\s*([A-Z_]+):\s*([^\r\n]+)', body, re.M))


def number(value, default=0):
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def extract():
    art = metadata((SOURCE / 'native_art.bbk').read_bytes())
    palette = [int(v) for v in art.find('.//PALETTE[@number="1"]').text.split()]
    colors = ['#' + ''.join(f'{v:02x}' for v in palette[i:i + 3]) for i in range(0, len(palette), 3)]
    blocks, weapon_segments = {}, {}
    for path in (ROOT / 't5_work/decrypted_weaps').glob('*.txt'):
        text = re.sub(r'//[^\r\n]*', '', path.read_text(encoding='latin1'))
        for match in re.finditer(r'^WEAPON:\s*([^\r\n]+)\s*\{(.*?)(?=^WEAPON:|\Z)', text, re.M | re.S):
            weapon_segments[match.group(1).strip()] = match.group(2)
        for kind, name, body in re.findall(r'^(WEAPON|TRIGGER|BULLET|EXPLOSION|SHRAPNEL):\s*([^\r\n]+)\s*\{(.*?)^\s*\}', text, re.M | re.S):
            blocks[(kind, name.strip())] = body

    def commands(body):
        return [fields('TIMEDELAY:' + part) for part in body.split('TIMEDELAY:')[1:]]

    def find_bullet(name, seen=None):
        seen = set() if seen is None else seen
        if name in seen:
            return {}
        seen.add(name)
        for cmd in commands(blocks.get(('TRIGGER', name), '')):
            target = cmd.get('COMMAND', '').strip()
            if cmd.get('TYPE', '').strip() == 'BULLET':
                return fields(blocks.get(('BULLET', target), ''))
            result = find_bullet(target, seen)
            if result:
                return result
        return {}

    def explosions(trigger, offset=0, depth=0):
        if depth > 4:
            return []
        result, elapsed = [], offset
        for cmd in commands(blocks.get(('TRIGGER', trigger), '')):
            elapsed += min(1.5, max(0, number(cmd.get('TIMEDELAY')) / 1000))
            name = cmd.get('COMMAND', '').strip()
            if ('EXPLOSION', name) in blocks:
                data = fields(blocks[('EXPLOSION', name)])
                result.append(dict(name=name, delay=round(elapsed, 3), radius=number(data.get('RADIUS'), 20),
                    color=int(number(data.get('DRAW_COLOR'), 28)), direction=int(number(data.get('DRAW_COLOR_DIRECTION'), -1)),
                    bands=int(number(data.get('DRAW_COLOR_LENGTH'), 12)), draw=data.get('DRAW_DIRECTION', 'EXPLOSION_OUT').strip(),
                    erase=data.get('ERASE_DIRECTION', '').strip(), eraseDelay=number(data.get('ERASE_DELAY')),
                    sound=data.get('SOUND_EFFECT', 'NONE').strip(), emitter=data.get('EMITTER_NAME', '').strip()))
            elif cmd.get('TYPE', '').strip() == 'TRIGGER':
                result.extend(explosions(name, elapsed, depth + 1))
            if len(result) >= 20:
                break
        return result[:20]

    profiles, emitter_names = {}, set()
    for name, behavior, category, color in SPECS:
        header = fields(blocks[('WEAPON', name)])
        bullet = find_bullet(header.get('TRIGGER', '').strip())
        recipe = explosions(bullet.get('EXPLOSION_TRIGGER', '').strip())
        if not recipe:
            recipe = explosions(header.get('TRIGGER', '').strip())
        emitter = bullet.get('BULLET_EMITTER_NAME', '').strip()
        if emitter and emitter != 'NONE':
            emitter_names.add(emitter)
        source_explosion = re.search(r'^EXPLOSION:[^\r\n]*\s*\{(.*?)^\s*\}', weapon_segments.get(name, ''), re.M | re.S)
        source_fields = fields(source_explosion.group(1)) if source_explosion else {}
        profiles[re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')] = dict(
            behavior=behavior, bulletColor=int(number(bullet.get('DRAW_COLOR'), 107)),
            impactColor=int(number(source_fields.get('DRAW_COLOR'), -1)),
            impactBands=int(number(source_fields.get('DRAW_COLOR_LENGTH'), 12)),
            impactDirection=int(number(source_fields.get('DRAW_COLOR_DIRECTION'), -1)),
            trailLength=number(bullet.get('TRAIL_LENGTH'), 11),
            animation=[Path(p.replace('\\', '/')).stem for p in bullet.get('DRAW_ANIM', '').split() if p.lower().endswith('.bmp')],
            animationFPS=number(bullet.get('DRAW_ANIM_SPEED'), 30),
            emitter=emitter, explosions=recipe)

    emitters = {}
    for path in (SOURCE / 'weapdata').glob('emitter*'):
        try:
            data = ET.fromstring(decoded(path.read_bytes()))
        except ET.ParseError:
            continue
        for e in data.iter('EMITTER'):
            if e.get('name') in emitter_names or e.get('name') in ('laser', 'napalm', 'comet'):
                emitters[e.get('name')] = [node.attrib for node in e.iter('NODE')]

    # Native indexed images have individual palettes, not the grayscale tank palette.
    source = metadata((SOURCE / 'weapons.bbk').read_bytes())
    palettes = {p.get('number'): [int(v) for v in p.text.split()] for p in source.iter('PALETTE')}
    pixels = (SOURCE / 'weapons.dat').read_bytes()
    images = {}
    for image in source.iter('IMAGE'):
        a = image.attrib
        if a['name'] not in images or int(a['width']) > int(images[a['name']]['width']):
            images[a['name']] = a
    sequences = {
        'fireball': [f'fballexp{i:04}' for i in range(2, 32)],
        'meteor': [f'meteor{i:04}' for i in range(1, 31)],
        'comet': [f'comets{i:04}' for i in range(1, 26)],
        'missile': [f'hmissile{i:02}' for i in range(1, 9)],
        'flame': [f'oilslick_flame{i:04}' for i in range(1, 25)],
        'smoke': [f'boostersmoke{i}' for i in range(1, 10)],
    }
    folder = OUT / 'vfx'
    folder.mkdir(exist_ok=True)
    atlases = {}
    for key, names in sequences.items():
        frames = []
        for name in names:
            a = images[name]
            w, h, pitch, start, size = (int(a[n]) for n in ('width', 'height', 'pitch', 'dataOffset', 'dataSize'))
            image = Image.frombytes('P', (w, h), pixels[start:start + size], 'raw', 'P', pitch)
            image.putpalette(palettes[a['paletteNumber']])
            image.info['transparency'] = 0
            frames.append(image.convert('RGBA'))
        cell = max(max(frame.size) for frame in frames)
        columns = min(10, len(frames))
        atlas = Image.new('RGBA', (cell * columns, cell * ((len(frames) + columns - 1) // columns)))
        for i, frame in enumerate(frames):
            atlas.paste(frame, (i % columns * cell + (cell - frame.width) // 2, i // columns * cell + (cell - frame.height) // 2))
        atlas.save(folder / (key + '.png'), optimize=True)
        atlases[key] = dict(src='assets/vfx/' + key + '.png', frames=len(frames), cell=cell, columns=columns)

    sounds = {p.stem.lower(): p for p in SOURCE.rglob('*.ogg')}
    audio = set()
    for profile in profiles.values():
        for explosion in profile['explosions']:
            name = Path(explosion['sound'].replace('\\', '/')).stem.lower()
            if name in sounds:
                shutil.copy2(sounds[name], OUT / 'audio' / (name + '.ogg'))
                audio.add(name)
    for name in ('exphuge', 'explong', 'expshort', 'expshort2'):
        shutil.copy2(sounds[name], OUT / 'audio' / (name + '.ogg'))
        audio.add(name)
    result = dict(palette=colors, profiles=profiles, emitters=emitters, atlases=atlases, sounds=sorted(audio))
    (ROOT / 'native-effects.js').write_text('/* Extracted native palette, draw recipes, emitter parameters and sprite atlas metadata. */\n'
        'globalThis.POCKET_NATIVE_FX = ' + json.dumps(result, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('Exported', len(profiles), 'visual recipes,', sum(v['frames'] for v in atlases.values()), 'native animation frames,', len(audio), 'impact sounds.')
    for key in ('single_shot', 'big_shot', 'nuke', 'mega_nuke', 'fireball', 'laser'):
        p = profiles[key]
        print(key, [(e['delay'], e['radius'], colors[e['color'] % 256], e['bands']) for e in p['explosions'][:5]])


if __name__ == '__main__':
    extract()
