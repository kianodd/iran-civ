#!/usr/bin/env python3
"""تأیید فایل‌های زندهٔ iran-civ روی GitHub Pages با SHA-1 blob."""
import hashlib, json, os, subprocess, sys, urllib.request

GH = os.path.expanduser('~/workspace/custom-connectors/custom.github-pat/bin/gh.py')
REPO = 'kianodd/iran-civ'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ['index.html', 'version.json', 'css/style.css', 'js/version.js',
         'js/paths.js', 'js/data.js', 'js/app.js', 'manifest.webmanifest', 'sw.js']

def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def gh(method, path):
    out = subprocess.run(['python3', GH, method, path], capture_output=True, text=True, timeout=120)
    return json.loads(out.stdout)

missing, mismatch = [], []
for rel in FILES:
    local = open(os.path.join(ROOT, rel), 'rb').read()
    cur = gh('GET', f'/repos/{REPO}/contents/{rel}')
    remote_sha = (cur.get('result') or {}).get('sha') if cur.get('status') == 200 else None
    if remote_sha is None:
        missing.append(rel)
    elif remote_sha != git_blob_sha(local):
        mismatch.append(rel)

print(f'remote blobs: {len(FILES) - len(missing)}')
print(f'missing: {missing}')
print(f'mismatch: {mismatch}')

# live version check
try:
    with urllib.request.urlopen('https://kianodd.github.io/iran-civ/version.json', timeout=30) as r:
        live = json.loads(r.read().decode('utf-8'))
    local_v = json.load(open(os.path.join(ROOT, 'version.json'), encoding='utf-8'))['version']
    print(f'live version: {live.get("version")}  local version: {local_v}  match={live.get("version") == local_v}')
except Exception as e:
    print('live fetch FAILED:', e)
    live = None

ok = not missing and not mismatch and live and live.get('version') == json.load(open(os.path.join(ROOT, 'version.json'), encoding='utf-8'))['version']
print('VERIFY: ' + ('PASS' if ok else 'FAIL'))
sys.exit(0 if ok else 1)
