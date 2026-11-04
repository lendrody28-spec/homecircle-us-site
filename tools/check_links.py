#!/usr/bin/env python3
"""Checks every internal link and asset in the built pages, and lists external links."""
import re, glob, os, sys, json, urllib.parse
from html.parser import HTMLParser
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
pages = sorted(glob.glob("*.html") + glob.glob("library/*.html"))
ids, refs, ext = {}, [], set()
class P(HTMLParser):
    def __init__(s, f): super().__init__(); s.f = f; ids[f] = set()
    def handle_starttag(s, t, a):
        a = dict(a)
        if "id" in a: ids[s.f].add(a["id"])
        for k in ("href", "src"):
            if k in a and a[k] is not None: refs.append((s.f, a[k]))
for f in pages: P(f).feed(open(f).read())
bad = []
for f, u in refs:
    if u.startswith(("mailto:", "tel:", "sms:")): continue
    if u.startswith("http"): ext.add(u); continue
    path, _, frag = u.partition("#")
    path = path.partition("?")[0]
    target = os.path.normpath(os.path.join(os.path.dirname(f), path)) if path else f
    if not os.path.exists(target): bad.append((f, u)); continue
    if frag and target.endswith(".html") and frag not in ids.get(target, set()): bad.append((f, u + " (missing id)"))
# data-src for events and JS assets
print("pages:", len(pages), "internal refs:", len([1 for f, u in refs if not u.startswith(("http", "mailto:", "tel:"))]))
print("BROKEN:", bad)
json.dump(sorted(ext), open("/tmp/ext-links.json", "w"), indent=1)
print("external:", len(ext))
sys.exit(1 if bad else 0)
