#!/usr/bin/env python3
"""Checks Hale's US pre-launch must-fixes on every built page. Run after tools/build.py."""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = sorted(ROOT.glob("*.html")) + sorted((ROOT / "library").glob("*.html"))
DATE = "6 November 2026"
MISS = "Kai looks for some words that may mean you're in danger, but it can miss things. If you're unsafe, call 911 or call or text 988 yourself."
FOOT = "Site features that save anything (Kai's chat, where you put Kai, and the breath-hold setting) keep it only in this browser's local storage. Nothing is sent to HomeCircle."
OPERATOR = "Luke Endrody (sole trader), Queensland, Australia. ABN 53 687 374 897."
STUDY = "That study tested a longer, guided program, not this page."
fail = 0

def bad(msg):
    global fail
    fail += 1
    print("FAIL", msg)

def main_text(html):
    return html.split("<footer", 1)[0]

if not PAGES:
    sys.exit("no html pages")

for path in PAGES:
    rel = path.relative_to(ROOT).as_posix()
    text = html.unescape(path.read_text())
    if "(draft)" in text or "not yet in effect" in text:
        bad(f"{rel}: draft or placeholder wording")
    if 'href="' not in text or "privacy.html#health\">Consumer Health Data Privacy" not in text:
        bad(f"{rel}: missing Consumer Health Data Privacy link")
    if FOOT not in text:
        bad(f"{rel}: footer storage line")
    if "(health notes" in text or "health safety answers" in text:
        bad(f"{rel}: still mentions health notes or health safety answers")
    notes = re.findall(r'<p class="kai-note">.*?</p>', text)
    if not any(MISS in n for n in notes):
        bad(f"{rel}: Kai panel is missing Hale's can-miss line")
    if any(n.count("can miss things") > 1 or "tries to show help numbers, but it can miss things" in n for n in notes):
        bad(f"{rel}: Kai panel still repeats the can-miss warning")
    if "Privacy Policy</a>" not in text or "Terms of Use</a>" not in text:
        bad(f"{rel}: privacy or terms link label")
    if OPERATOR not in text:
        bad(f"{rel}: operator line")
    if "support@homecircle.au" not in text:
        bad(f"{rel}: support email")

privacy = main_text(html.unescape((ROOT / "privacy.html").read_text()))
for snippet in [
    f"Last updated {DATE}",
    "Luke Endrody (sole trader), Queensland, Australia, ABN 53 687 374 897",
    "What we collect: nothing through the site",
    "There are no accounts, cookies, ads, trackers or analytics. We don't sell or share personal data, and we don't use it for ads.",
    "Kai's chat, where you put Kai on the screen, and your \"hide breath holds\" choice",
    "The site is hosted on GitHub Pages.",
    "We don't receive or use these logs.",
    "Our email is forwarded through ImprovMX to Gmail.",
    'id="health"',
    "Consumer health data (Washington, Nevada, Connecticut and other states)",
    "We will reply within 45 days.",
    "HomeCircle is for people 18 and over.",
    "We'll post any changes here with a new date.",
]:
    if snippet not in privacy:
        bad(f"privacy.html missing: {snippet}")

terms = main_text(html.unescape((ROOT / "terms.html").read_text()))
for snippet in [
    f"Last updated {DATE}",
    "These terms are between you and Luke Endrody (sole trader), Queensland, Australia, ABN 53 687 374 897",
    "(not a crisis line)",
    "You must be 18 or older to use HomeCircle.",
    "Kai is a fixed-reply program, not a person, counselor, doctor or sponsor. Kai looks for some words that may mean you're in danger, but it can miss things.",
    'In an emergency call <a href="tel:911">911</a>. For crisis support call or text <a href="tel:988">988</a>.',
    "There is no arbitration and no class-action waiver.",
    "These terms are governed by the laws of Queensland, Australia.",
    "Nothing in these terms takes away rights you have under the consumer laws where you live.",
]:
    if snippet not in terms:
        bad(f"terms.html missing: {snippet}")
if "tap I'm not safe" in terms:
    bad("terms.html main still uses the panel's not-safe line instead of Hale's terms sentence")
if "Kai isn't AI" in terms:
    bad("terms.html main still says Kai isn't AI")

support = main_text(html.unescape((ROOT / "support.html").read_text()))
if "Only what you choose to save: the breath-hold setting, Kai's chat and where you put Kai on the screen." not in support:
    bad("support.html save answer")
if "health safety answers" in support:
    bad("support.html still says health safety answers")

for name in ("library/urge-surfing.html", "library/urge-surfing-meditation.html"):
    if STUDY not in html.unescape((ROOT / name).read_text()):
        bad(f"{name}: missing the longer-program sentence")

print(f"{len(PAGES)} pages checked, {fail} failure(s)")
sys.exit(1 if fail else 0)
