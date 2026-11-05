"""Fails if the retired national gambling number appears anywhere on the US site (Hale, 5 Nov 2026).
The only national gambling helpline shown is 1-800-MY-RESET (1-800-697-3738), tel:+18006973738."""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
BAD = re.compile(r"GAMBLER|426[-. ]?2537|4262537")
SKIP = {".git", "__pycache__", "node_modules"}
hits = []
for f in ROOT.rglob("*"):
    if f.is_dir() or any(p in SKIP for p in f.parts) or f.name == "test_gambling_number.py": continue
    if f.suffix.lower() in {".jpg", ".png", ".m4a", ".mp3", ".onnx", ".ico", ".pdf"}: continue
    try: t = f.read_text(errors="ignore")
    except Exception: continue
    for n, line in enumerate(t.splitlines(), 1):
        if BAD.search(line): hits.append(f"{f.relative_to(ROOT)}:{n}")
if hits: sys.exit("retired gambling number found:\n  " + "\n  ".join(hits))
print("ok: no GAMBLER / 1-800-426-2537 anywhere")
