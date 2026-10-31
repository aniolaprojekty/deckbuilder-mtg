"""Builds www/ (web + Android) from src/. Usage: python3 tools/build.py"""
import os, shutil
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, www = os.path.join(R, 'src'), os.path.join(R, 'www')
os.makedirs(www, exist_ok=True)
html = open(os.path.join(src, 'app.html'), encoding='utf8').read()
data = open(os.path.join(src, 'precons.json'), encoding='utf8').read().replace('</', '<\\/')
open(os.path.join(www, 'index.html'), 'w', encoding='utf8').write(html.replace('/*PRECONS*/', data))
for f in ('manifest.webmanifest', 'icon.svg', 'sw.js'):
    shutil.copy(os.path.join(src, f), www)
print('www/ built')
