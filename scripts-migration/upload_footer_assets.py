#!/usr/bin/env python3
"""
Uploads footer assets to DA.live:
  - /assets/icons/icon-facebook.svg
  - /assets/icons/icon-linkedin.svg
  - /footer  (updated footer document — no About Australia Post paragraph)

Run after refreshing .hlx/.da-token.json.
"""
import json
import sys
from pathlib import Path
import requests

REPO_ROOT = Path(__file__).parent.parent
ORG = 'kapilmalik84'
SITE = 'nr'
DA_SOURCE = f'https://admin.da.live/source/{ORG}/{SITE}'
HLX_ADMIN = f'https://admin.hlx.page'


def load_token():
    token_file = REPO_ROOT / '.hlx' / '.da-token.json'
    with open(token_file) as f:
        return json.load(f)['access_token']


def da_put(path, content, content_type, token, session):
    url = f'{DA_SOURCE}{path}'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': content_type}
    r = session.put(url, data=content, headers=headers)
    r.raise_for_status()
    return r


def hlx_preview(path, token, session):
    url = f'{HLX_ADMIN}/preview/{ORG}/{SITE}/main{path}'
    headers = {'Authorization': f'Bearer {token}'}
    r = session.post(url, headers=headers)
    if r.status_code not in (200, 204):
        print(f'  Preview warn {r.status_code}: {path}')
    return r


def upload_svg(path, local_file, token, session):
    content = Path(local_file).read_bytes()
    print(f'  Uploading {path} ...')
    da_put(path, content, 'image/svg+xml', token, session)
    print(f'  Previewing {path} ...')
    hlx_preview(path, token, session)
    print(f'  OK: {path}')


def upload_footer(token, session):
    local = REPO_ROOT / 'sharepoint-content' / 'footer.html'
    content = local.read_text(encoding='utf-8')
    print('  Uploading /footer ...')
    da_put('/footer', content.encode('utf-8'), 'text/html', token, session)
    print('  Previewing /footer ...')
    hlx_preview('/footer', token, session)
    print('  OK: /footer')


def main():
    try:
        token = load_token()
    except Exception as e:
        print(f'ERROR loading token: {e}')
        sys.exit(1)

    import time
    token_data = json.loads((REPO_ROOT / '.hlx' / '.da-token.json').read_text())
    exp = token_data['expires_at'] / 1000
    if exp < time.time():
        print('ERROR: DA token is expired. Please refresh .hlx/.da-token.json first.')
        sys.exit(1)

    session = requests.Session()

    print('=== Uploading social icons to DA.live ===')
    upload_svg(
        '/assets/icons/icon-facebook.svg',
        REPO_ROOT / 'assets' / 'icons' / 'icon-facebook.svg',
        token, session,
    )
    upload_svg(
        '/assets/icons/icon-linkedin.svg',
        REPO_ROOT / 'assets' / 'icons' / 'icon-linkedin.svg',
        token, session,
    )

    print('\n=== Uploading updated footer document ===')
    upload_footer(token, session)

    print('\nAll done. Test at: https://main--nr--kapilmalik84.aem.page/')


if __name__ == '__main__':
    main()
