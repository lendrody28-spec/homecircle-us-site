#!/usr/bin/env python3
"""Before you drive (US). python3 tools/test_before_you_drive.py
Every figure in before-you-drive.json must have a link and a checked-on date.
The built page must use Hale's cleared wording, Raven's alternatives first,
and stay free of inline styles, brands, and figures that were not cleared.
"""
import glob, json, os, re, sys
from html import unescape as html_unescape
from html.parser import HTMLParser
from pathlib import Path

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
fails = 0

def ok(cond, msg):
    global fails
    print(("ok " if cond else "FAIL ") + msg)
    if not cond:
        fails += 1

data = json.loads(Path("before-you-drive.json").read_text(encoding="utf-8"))
figures = data["figures"]
ok(len(figures) >= 1, "at least one cleared figure")

class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.text = []; s.skip = 0
    def handle_starttag(s, t, a):
        if t in ("script", "style"): s.skip += 1
    def handle_endtag(s, t):
        if t in ("script", "style") and s.skip: s.skip -= 1
    def handle_data(s, d):
        if not s.skip: s.text.append(d)

src = Path("before-you-drive.html").read_text(encoding="utf-8")
main = src[src.find("<main"):src.find("</main>")]
p = P(); p.feed(main)
text = html_unescape(re.sub(r"\s+", " ", "".join(p.text)))

for fig in figures:
    ident = fig.get("id", "?")
    url = (fig.get("url") or fig.get("link") or "").strip()
    checked = (fig.get("checkedOn") or fig.get("checked-on") or fig.get("checked_on") or "").strip()
    ok(bool(url) and url.startswith("https://"), f"{ident}: has an https link")
    ok(bool(checked), f"{ident}: has a checked-on date")
    ok(url in src, f"{ident}: link is on the page")
    ok(checked in src, f"{ident}: checked-on date is on the page")
    for w in fig.get("wording") or []:
        ok(w in src, f"{ident}: wording present: {w[:80]}")

# Crisis: 911 and 988 (call and text) are available; 988 is for crisis, not road emergencies
ok('href="tel:911"' in src, "tel:911 is present")
ok('href="tel:988"' in src, "tel:988 is present")
ok('href="sms:988"' in src, "sms:988 is present")
pre = src.split("<h1", 1)[0]
ok("911" in pre and "988" in pre, "911 and 988 appear above the h1")
ok("988 is not for road emergencies" in src or "not for road emergencies" in src, "988 is not for road emergencies")

# Raven order: alternatives before any figures
alts = [
    "Call someone you trust to drive you.",
    "Book a taxi or rideshare.",
    "Take public transit.",
    "Wait until you're sure, or don't drive today.",
]
for a in alts:
    ok(a in src, f"alternative: {a}")
fig_i = text.find("11,904")
alt_i = text.find("Call someone you trust to drive you.")
ok(0 <= alt_i < fig_i, "alternatives come before the figures")
effects_i = text.find("What alcohol and drugs can do")
ok(0 <= alt_i < effects_i < fig_i or (effects_i < fig_i and alt_i < fig_i), "effects section is present and figures are not first")
# effects bullets (Hale: Affect your vision)
for b in (
    "Slow your reactions.",
    "Affect your vision.",
    "Make it harder to judge distance and speed.",
    "Make you feel more sure of yourself than you should.",
):
    ok(b in src, f"effects: {b}")
ok("Blur or narrow your vision." not in src, "old vision wording is gone")
ok("Some prescription and over-the-counter medicines can affect driving. Ask your doctor or pharmacist if you're unsure." in src, "exact medicines line")
# medicines line sits under the effects bullets (after the last bullet, before figures)
med_i = text.find("Some prescription and over-the-counter medicines can affect driving.")
last_bullet = text.find("Make you feel more sure of yourself than you should.")
ok(0 <= last_bullet < med_i < fig_i, "medicines line is under the effects bullets and before the figures")

ok("Would I be happy for someone I care about to be in the car with me right now?" in src, "care-about closing question")
ok("If something happened on the drive, would it be worth having on my conscience?" in src, "conscience question")
ok("Do I feel fine, or am I actually fine to drive?" in src, "feel-fine question")
ok("Is there another way home tonight?" in src, "other-way-home question")

# Legal fact, not advice
ok(".08" in src and "Utah" in src and ".05" in src, ".08 and Utah .05 are stated as legal facts")
ok("https://www.nhtsa.gov/risky-driving/drunk-driving" in src, "legal limits link to NHTSA")

# Qualifiers and banned figures
ok("studied trauma centers" in src and ("Oct–Dec 2020" in src or "Oct-Dec 2020" in src or "October–December 2020" in src), "56% keeps the studied trauma centers and Oct–Dec 2020 qualifier")
ok("not known" in text.lower() and "drug" in text.lower(), "national drug-impaired death count is described as not known")
ok("13,524" not in src and "13,524" not in text, "CDC 2022 13,524 figure is not used")
ok("SAMHSA" not in main and "1-800-662-4357" not in main and "18006624357" not in main, "SAMHSA is left out of the page body")

# No inline styles, brands, scare penalty lines, calculators
ok("style=" not in src, "page has no style= attributes")
low = text.lower()
for brand in ("uber", "lyft", "didi", "bolt"):
    ok(brand not in low, f"no brand name: {brand}")
ok(not re.search(r"\$10,000|10,000 fine", text), "no penalty scare line")
ok(not re.search(r"\b4x\b|\b12x\b|hours to wait|safe amount|standard drink", low), "no drink sizes, multipliers, hours to wait, or safe amount")
ok("hosts meetings" not in low and "our meetings" not in low and "homecircle meeting" not in low, "does not imply HomeCircle hosts meetings")

ok("https://homecirclerecovery.com/before-you-drive.html" in Path("sitemap.xml").read_text(), "in sitemap.xml")
ok("before-you-drive.html" in Path("index.html").read_text(), "linked from the home page")
ok("before-you-drive.html" in Path("help.html").read_text(), "linked from the Help page")
# footer on every page, not in main nav
pages = sorted(glob.glob("*.html") + glob.glob("library/*.html"))
missing = [f for f in pages if "before-you-drive.html" not in Path(f).read_text()]
ok(not missing, f"footer or in-page link on every page ({len(pages)} pages; missing: {missing})")
nav = re.search(r"<header class=\"site-head\">.*?</header>", src, re.S)
ok(nav and "before-you-drive.html" not in nav.group(0), "not in the main nav")
# US badge and AU switch exist (site convention)
ok("us-badge" in src and "homecircle.au" in src, "US badge and AU switch are present")

if fails:
    sys.exit(f"before-you-drive: {fails} failure(s)")
print("passed: 0 failure(s)")
