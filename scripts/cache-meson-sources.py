#!/usr/bin/env python3
"""Inclure aussi les sources téléchargées implicitement par Meson au build."""
import configparser
import hashlib
from pathlib import Path
import sys
import urllib.request

checkout=Path(sys.argv[1])
for relative in ['cairo/subprojects/pixman.wrap','cairo/subprojects/libpng.wrap',
                 'glib/subprojects/pcre2.wrap','glib/subprojects/proxy-libintl.wrap']:
    wrap=checkout/'libs'/relative
    config=configparser.ConfigParser()
    config.read(wrap)
    section=config['wrap-file']
    cache=wrap.parent/'packagecache'
    cache.mkdir(exist_ok=True)
    for kind in ['source','patch']:
        if kind+'_url' not in section:continue
        destination=cache/section[kind+'_filename']
        expected=section[kind+'_hash']
        if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest()==expected:continue
        urls=[section[kind+'_url']]
        if kind+'_fallback_url' in section:urls.append(section[kind+'_fallback_url'])
        for url in urls:
            try:
                data=urllib.request.urlopen(url,timeout=60).read()
                if hashlib.sha256(data).hexdigest()!=expected:raise ValueError('Empreinte incorrecte')
                destination.write_bytes(data)
                print(destination.name,flush=True)
                break
            except Exception:
                if url==urls[-1]:raise
