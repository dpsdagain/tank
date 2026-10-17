"""Package only the standalone browser game; no APKs or signing files."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
out = root / 'dist'
out.mkdir(exist_ok=True)
files = [root / name for name in ('index.html', 'index.css', 'browser-game.js',
    'game-core.js', 'weapons.js', 'server.cjs', 'package.json', 'README.md',
    'ASSET_NOTES.md', 'Start-Game.cmd', 'native-effects.js', 'projectile-art.js', 'weapon-fx.js',
    'effects-preview.html', 'flight-preview.html', 'flight-preview.js')]
files.extend(sorted((root / 'assets').rglob('*')))
files.extend(sorted((root / 'tests').glob('*.cjs')))
with ZipFile(out / 'pocket-tanks-browser.zip', 'w', ZIP_DEFLATED) as archive:
    for file in files:
        if file.is_file():
            archive.write(file, file.relative_to(root).as_posix())
print(out / 'pocket-tanks-browser.zip')
