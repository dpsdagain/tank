"""Audit reachable impact scripts for the 36 browser weapons; reads supplied text only."""
from pathlib import Path
import json
import re
from export_assets import ROOT, SPECS
import sys

def log(*args):
    if '--verbose' in sys.argv:
        print(*args)

blocks = {}
for path in sorted((ROOT / 't5_work/decrypted_weaps').glob('*.txt')):
    source = re.sub(r'//[^\r\n]*', '', path.read_text(encoding='latin1'))
    for kind, name, body in re.findall(r'^([A-Z][A-Z_0-9]*):\s*([^\r\n]+)\s*\{(.*?)^\s*\}', source, re.M | re.S):
        blocks[(kind, name.strip())] = (path.name, body)

def fields(body):
    return dict(re.findall(r'^\s*([A-Z_0-9]+):\s*([^\r\n]+)', body, re.M))

report = {}
for name, behavior, category, color in SPECS:
    start = ('WEAPON', name)
    seen, pending = set(), [start]
    found = []
    while pending:
        key = pending.pop(0)
        if key in seen or key not in blocks:
            continue
        seen.add(key)
        file, body = blocks[key]
        values = fields(body)
        entry = {'kind': key[0], 'name': key[1], 'source': file, 'fields': values}
        if key[0] == 'TRIGGER':
            entry['commands'] = [fields('TIMEDELAY:' + part) for part in body.split('TIMEDELAY:')[1:]]
        found.append(entry)
        for field, value in re.findall(r'^\s*([A-Z_0-9]+):\s*([^\r\n]+)', body, re.M):
            target = value.strip()
            pending.extend(k for k in blocks if k[1] == target)
    id = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
    report[id] = {'name': name, 'behavior': behavior, 'source': blocks[start][0], 'blocks': found}
    log('\n' + name + ' [' + blocks[start][0] + ']')
    for item in found:
        data = item['fields']
        if item['kind'] == 'EXPLOSION':
            keys = ('RADIUS', 'DAMAGE', 'DRAW_DIRECTION', 'DRAW_COLOR', 'DRAW_COLOR_DIRECTION', 'DRAW_COLOR_LENGTH', 'ERASE_DIRECTION', 'ERASE_DELAY', 'SOUND_EFFECT')
            log(' EXP', item['name'], {k: data[k] for k in keys if k in data})
        elif item['kind'] == 'TRIGGER':
            commands = item.get('commands', [])
            log(' TRG', item['name'], [(c.get('TIMEDELAY'), c.get('TYPE'), c.get('COMMAND'), {k:v for k,v in c.items() if k not in ('TIMEDELAY','TYPE','COMMAND')}) for c in commands][:14])
        elif item['kind'] == 'BULLET':
            keys = ('EXPLOSION_TRIGGER', 'COLLISION_METHOD', 'TIMED_DETONATION_TRIGGER', 'BOUNCE_COUNT', 'PROXIMITY_TRIGGER', 'VERTICAL_VELOCITY_TRIGGER', 'DRAW_ANIM')
            log(' BUL', item['name'], {k: data[k] for k in keys if k in data and data[k] not in ('NONE','0')})
        elif item['kind'] != 'WEAPON':
            log(' SPECIAL', item['kind'], item['name'], data)

(ROOT / 'qa/native-impact-audit.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

# Compact runtime evidence. The browser interprets these recipes; it does not
# execute native commands or replay a child's entire trigger at every impact.
runtime = {}
for id, item in report.items():
    explosions, specials = [], []
    for block in item['blocks']:
        f = block['fields']
        if block['kind'] == 'EXPLOSION':
            explosions.append({'name': block['name'], 'radius': float(f.get('RADIUS', 1)),
                'color': int(f.get('DRAW_COLOR', 0)), 'bands': int(f.get('DRAW_COLOR_LENGTH', 1)),
                'direction': int(f.get('DRAW_COLOR_DIRECTION', -1)), 'eraseDelay': float(f.get('ERASE_DELAY', 10)),
                'sound': f.get('SOUND_EFFECT', 'NONE')})
        elif block['kind'] not in ('WEAPON', 'BULLET', 'TRIGGER'):
            specials.append({'kind': block['kind'], 'name': block['name'], **{k: v for k, v in f.items() if k != 'DRAW_ANIM'}})
    runtime[id] = {'source': item['source'], 'kinds': sorted({b['kind'] for b in item['blocks']}),
        'explosions': explosions, 'specials': specials}
script = '/* Reachable impact recipes from the supplied APK scripts. See qa/native-impact-audit.json. */\n'
script += '(function(root){const data=' + json.dumps(runtime, separators=(',', ':')) + ';\n'
script += 'root.POCKET_IMPACTS=data;if(typeof module!=="undefined"&&module.exports)module.exports=data;\n})(typeof globalThis!=="undefined"?globalThis:this);\n'
(ROOT / 'assets/vfx/native-impact-recipes.js').write_text(script, encoding='utf-8')
overview = ['Reachable native impact audit for the 36 implemented weapons.',
    'Complete source fields and trigger commands: qa/native-impact-audit.json', '']
for id, item in report.items():
    info = runtime[id]
    overview.append(f'{item["name"]} [{item["source"]}]')
    for e in info['explosions']:
        overview.append(f'  EXPLOSION {e["name"]}: radius {e["radius"]:g}, palette {e["color"]}, {e["bands"]} bands, direction {e["direction"]}')
    for s in info['specials']:
        overview.append(f'  {s["kind"]} {s["name"]}')
    overview.append('')
(ROOT / 'qa/native-impact-audit.txt').write_text('\n'.join(overview), encoding='utf-8')
print(f'Audited all {len(report)} weapons; exported reachable impact recipes without changing native palette or nuclear stages.')
