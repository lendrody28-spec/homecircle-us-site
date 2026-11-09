#!/usr/bin/env python3
"""Assembles the publishable US site into _site/ and checks it. Run from the repo root after tools/build.py:
  python3 tools/package_site.py [outdir]
Fails (exit 1) if anything that must never be published is in the output, or if a page breaks a launch rule.
Used by .github/workflows/pages.yml; run it locally too before Finn signs off a commit."""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "_site"
SITE = "https://homecirclerecovery.com"

# Never published (Sage's hosting prep, 10 Nov 2026). assets/readaloud.js is the AU/US shared read-aloud
# script: no US page loads it in this release and it holds AU number handling, so it stays in the repo only.
EXCLUDE_TOP = {".git", ".github", "deploy", "tools", "shots", "README.md", "SOURCES.md", ".gitignore", "_site", "__pycache__"}
EXCLUDE_FILES = {"assets/readaloud.js"}
def excluded(rel):
    parts = rel.split("/")
    return parts[0] in EXCLUDE_TOP or rel in EXCLUDE_FILES or rel.endswith(".bundle") or "__pycache__" in parts

fails = []
def fail(m): fails.append(m)

if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True)
for f in sorted(ROOT.rglob("*")):
    if f.is_dir() or OUT in f.parents: continue
    rel = f.relative_to(ROOT).as_posix()
    if excluded(rel): continue
    (OUT / rel).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(f, OUT / rel)

# 1. Nothing excluded may be in the output (guards against a later edit to the copy rules).
published = sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob("*") if p.is_file())
for rel in published:
    if excluded(rel) or rel.split("/")[0] in {"tools", "shots"} or rel in {"README.md", "SOURCES.md"} or rel.endswith(".bundle"):
        fail(f"would publish excluded file: {rel}")

# 2. CNAME
cname = OUT / "CNAME"
if not cname.exists() or cname.read_text().strip() != "homecirclerecovery.com":
    fail("CNAME missing or not homecirclerecovery.com")

# 3. No Kai, no Australian numbers anywhere published.
AU = re.compile(r"(?<![\d.,-])000(?![\d,])|13 ?11 ?14|\b131114\b|Lifeline Australia|triple zero", re.I)
TEXT = {".html", ".js", ".css", ".xml", ".txt", ""}
for rel in published:
    p = OUT / rel
    if p.suffix.lower() not in TEXT: 
        if "kai" in rel.lower(): fail(f"Kai file published: {rel}")
        continue
    t = p.read_text(errors="ignore")
    if "kai" in rel.lower() or re.search(r"kai", t, re.I): fail(f"Kai reference in {rel}")
    for banned in ("US fellowships", "collects (nothing)"):
        if banned in t: fail(f"banned wording {banned!r} in {rel}")
    if re.search(r"read-aloud|read aloud|press Play", t, re.I) and rel.endswith(".html"): fail(f"read-aloud mention in {rel}")
    for m in AU.finditer(t):
        fail(f"Australian number in {rel}: ...{t[max(0, m.start()-30):m.end()+30]!r}...")

# 4. Every page: crisis bar first, canonical on the US domain, health privacy link in the footer.
CRISIS = ['href="tel:911"', 'href="tel:988"', 'href="sms:988"', 'href="tel:18006624357"', 'href="tel:+18006973738"']
pages = [r for r in published if r.endswith(".html")]
for rel in pages:
    t = (OUT / rel).read_text()
    body = t.split("<body>", 1)[-1]
    bar = re.search(r'<div class="crisis-bar".*?</div></div>', body, re.S)
    if not bar or body.index('<div class="crisis-bar"') > body.index("<header"):
        fail(f"{rel}: crisis bar missing or not above the header")
    elif not all(c in bar.group(0) for c in CRISIS):
        fail(f"{rel}: crisis bar missing a number")
    want = SITE + "/" + ("" if rel == "index.html" else rel)
    if f'<link rel="canonical" href="{want}">' not in t:
        fail(f"{rel}: canonical tag is not {want}")
    foot = t.split("<footer", 1)[-1]
    if "health-privacy.html\">Consumer Health Data Privacy Policy</a>" not in foot:
        fail(f"{rel}: footer missing Consumer Health Data Privacy Policy link")
    for s in re.findall(r'<script[^>]+src="([^"]+)"', t):
        if not (OUT / rel).parent.joinpath(s.split("?")[0]).resolve().exists():
            fail(f"{rel}: script not published: {s}")

# 5. Sitemap lists every page, all on the US domain.
sm = (OUT / "sitemap.xml").read_text() if (OUT / "sitemap.xml").exists() else ""
locs = re.findall(r"<loc>(.*?)</loc>", sm)
if not locs or any(not l.startswith(SITE + "/") for l in locs): fail("sitemap.xml missing or has a non-US-domain URL")
if len(locs) != len(pages): fail(f"sitemap.xml lists {len(locs)} URLs but {len(pages)} pages are published")

print(f"_site: {len(published)} files, {len(pages)} pages")
if fails:
    print("\n".join("FAIL " + f for f in fails)); sys.exit(1)
print("ok: nothing excluded is published; no Kai; no AU numbers; crisis bar, canonical and health-privacy link on every page")
