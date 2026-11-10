"""Fails if the retired national gambling number appears anywhere on the US site (Hale, 5 Nov 2026).
The only national gambling helpline shown is 1-800-MY-RESET (1-800-697-3738), tel:+18006973738.

help.html and every gambling page must also show, in the page body and visible
without opening a disclosure: a tel: button labelled
"Call or text 1-800-MY-RESET (1-800-697-3738)", plus an sms: link to the same number.
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BAD = re.compile(r"GAMBLER|426[-. ]?2537|4262537")
SKIP = {".git", "__pycache__", "node_modules"}
LABEL = "Call or text 1-800-MY-RESET (1-800-697-3738)"
TEL = "tel:+18006973738"
SMS = "sms:+18006973738"

hits = []
for f in ROOT.rglob("*"):
    if f.is_dir() or any(p in SKIP for p in f.parts) or f.name == "test_gambling_number.py":
        continue
    if f.suffix.lower() in {".jpg", ".png", ".m4a", ".mp3", ".onnx", ".ico", ".pdf"}:
        continue
    try:
        t = f.read_text(errors="ignore")
    except Exception:
        continue
    for n, line in enumerate(t.splitlines(), 1):
        if BAD.search(line):
            hits.append(f"{f.relative_to(ROOT)}:{n}")
if hits:
    sys.exit("retired gambling number found:\n  " + "\n  ".join(hits))
print("ok: no GAMBLER / 1-800-426-2537 anywhere")

def gambling_pages():
    pages = [ROOT / "help.html"]
    pages += sorted(p for p in ROOT.glob("library/*gambl*.html") if p.is_file())
    return pages

def strip_crisis_bar(html):
    return re.sub(
        r'<div class="crisis-bar"[^>]*>.*?</div>\s*</div>',
        "",
        html,
        count=1,
        flags=re.S,
    )

def without_details(html):
    return re.sub(r"<details\b[^>]*>.*?</details>", "", html, flags=re.S)

def anchor_text(inner):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", inner)).strip()

def has_visible_tel_button(html):
    for m in re.finditer(r"<a\b([^>]*)>(.*?)</a>", html, flags=re.S):
        attrs, text = m.group(1), anchor_text(m.group(2))
        href = re.search(r'href="([^"]*)"', attrs)
        if text == LABEL and href and href.group(1) == TEL:
            return True
    return False

def has_visible_sms_link(html):
    return bool(re.search(r'<a\b[^>]*href="' + re.escape(SMS) + r'"', html))

failures = []
pages = gambling_pages()
if not (ROOT / "help.html").is_file():
    failures.append("help.html is missing")
if not any("gambl" in p.name for p in pages):
    failures.append("no library gambling page found")

for f in pages:
    rel = str(f.relative_to(ROOT))
    visible = without_details(strip_crisis_bar(f.read_text()))
    if not has_visible_tel_button(visible):
        failures.append(
            f"{rel}: missing a body tel: button labelled {LABEL!r}, visible without opening a disclosure"
        )
    if not has_visible_sms_link(visible):
        failures.append(
            f"{rel}: missing a body sms: link to 1-800-697-3738, visible without opening a disclosure"
        )

if failures:
    sys.exit("gambling helpline body buttons:\n  " + "\n  ".join(failures))
print("ok: help.html and gambling pages show Call or text 1-800-MY-RESET as tel: and sms: buttons")
