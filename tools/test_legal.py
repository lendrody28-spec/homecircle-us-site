#!/usr/bin/env python3
"""Checks Hale's US static wording file (10 Nov 2026) and the 28 Nov 2026 health-data redraft (DRAFT FOR HALE)
word for word on the built pages. Run after tools/build.py."""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = sorted(ROOT.glob("*.html")) + sorted((ROOT / "library").glob("*.html"))
DATE = "28 November 2026"        # Privacy, Consumer Health Data Privacy Policy, request page
TERMS_DATE = "10 November 2026"  # Terms unchanged
FOOT = "Anything you save stays in this browser's local storage. Our web host logs visits. Privacy Policy · Consumer Health Data Privacy Policy · Terms of Use"
OPERATOR = "Luke Endrody (sole trader), Queensland, Australia. ABN 53 687 374 897."
STUDY = "That study tested a longer, guided program, not this page."
fail = 0

def bad(msg):
    global fail
    fail += 1
    print("FAIL", msg)

def text_of(fragment):
    """Visible text: tags removed, entities decoded, whitespace collapsed."""
    spaced = re.sub(r"</?(?:h[1-6]|p|li|ul|ol|div|section|details|summary)\b[^>]*>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", spaced))).strip()

def main_text(raw):
    return text_of(raw.split("<main", 1)[1].split("</main>", 1)[0])

if not PAGES:
    sys.exit("no html pages")

for path in PAGES:
    rel = path.relative_to(ROOT).as_posix()
    raw = path.read_text()
    vis = text_of(raw)
    for banned in ("US fellowships", "collects (nothing)", "Support, not care"):
        if banned in html.unescape(raw):
            bad(f"{rel}: banned wording {banned!r} (visible text or meta)")
    if re.search(r"read-aloud|read aloud|press Play", vis, re.I):
        bad(f"{rel}: mentions read-aloud, which isn't on the US site")
    bar = raw.split('<div class="crisis-bar"', 1)[-1].split("</div></div>", 1)[0]
    for label in ("Need help now?", ">Call 911<", ">Call 988<", ">Text 988<", 'href="tel:18006624357" aria-label="Call SAMHSA\'s National Helpline, 1-800-662-4357">SAMHSA Helpline 1-800-662-4357<', 'href="tel:+18006973738" aria-label="Call or text 1-800-MY-RESET, National Problem Gambling Helpline, 1-800-697-3738">Gambling help 1-800-MY-RESET<'):
        if label not in bar:
            bad(f"{rel}: crisis bar label {label[:40]}")
    if re.search(r"kai", raw, re.I):
        bad(f"{rel}: still mentions Kai")
    if re.search(r"(?<![\d.,-])000(?![\d,])|13 ?11 ?14", vis):
        bad(f"{rel}: Australian number")
    if "(draft)" in vis or "not yet in effect" in vis:
        bad(f"{rel}: draft or placeholder wording")
    foot = text_of(raw.split("<footer", 1)[1].split("</footer>", 1)[0])
    if FOOT not in foot:
        bad(f"{rel}: Hale's footer line (section 4)")
    if 'href="' + ("../" if "/" in rel else "") + 'health-privacy.html">Consumer Health Data Privacy Policy</a>' not in raw:
        bad(f"{rel}: footer link to health-privacy.html")
    if OPERATOR not in vis:
        bad(f"{rel}: operator line")
    if "support@homecircle.au" not in vis:
        bad(f"{rel}: support email")

privacy = main_text((ROOT / "privacy.html").read_text())
for snippet in [
    f"Last updated {DATE}",
    "What we collect The site itself has no accounts, forms, cookies, ads, trackers or analytics, so it doesn't send us anything about you",
    "What your browser saves One feature saves a choice in this browser's local storage, on this device only: the \"hide breath holds\" setting. It's a single on/off choice and doesn't record any health condition.",
    "GitHub stores visitor IP addresses for security.",
    "We don't routinely see individual visitor logs, we don't keep our own visitor-log database, and we don't sell visitor information. GitHub hasn't published how long it keeps these records for GitHub Pages.",
    "We delete support emails within 90 days after our last reply",
    "Consumer health data See our Consumer Health Data Privacy Policy.",
    "Adults only HomeCircle is for people 18 and over.",
    "Changes We'll post any changes here with a new date.",
]:
    if snippet not in privacy:
        bad(f"privacy.html missing: {snippet[:70]}...")
raw_priv = (ROOT / "privacy.html").read_text()
if 'href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"' not in raw_priv: bad("privacy.html: GitHub privacy statement link")
if '<a href="health-privacy.html">Consumer Health Data Privacy Policy</a>' not in raw_priv: bad("privacy.html: pointer link to health-privacy.html")
if '<a href="health-data-request.html">' not in raw_priv: bad("privacy.html: link to health-data-request.html")
for old in ("What we collect: nothing through the site", "We can't see or use those records", "We don't collect anything through the site itself"):
    if old in privacy: bad(f"privacy.html: old wording {old!r}")

# Washington RCW 19.373.020 policy contents and .040 rights (28 Nov 2026 redraft, DRAFT FOR HALE).
hp_raw = (ROOT / "health-privacy.html").read_text()
hp = main_text(hp_raw)
for snippet in [
    f"Consumer Health Data Privacy Policy. Last updated {DATE}. This policy covers consumer health data under Washington's My Health My Data Act and similar laws in Nevada, Connecticut and other states. HomeCircle is run by Luke Endrody (sole trader), Queensland, Australia, ABN 53 687 374 897. Contact: support@homecircle.au (not a crisis line).",
    "What may be collected, and why",            # .020(1)(a)(i) categories and purposes
    "Where it comes from",                       # .020(1)(a)(ii) sources
    "Who it's shared with",                      # .020(1)(a)(iii)-(iv) shared categories, third parties, affiliates
    "We don't have any affiliates.",
    "GitHub, Inc. (part of Microsoft)", "ImprovMX", "Google (Gmail)",
    "confirm whether we collect, share or sell consumer health data about you",   # .040(1)(a)
    "with a list of everyone we have shared it with and how to contact them",     # .040(1)(a)
    "withdraw any consent",                                                       # .040(1)(b)
    "tell ImprovMX, Google and GitHub about your request",                        # .040(1)(c)(i)(B)
    "Requests are free, up to twice in any 12 months. You don't need an account.",  # .040(1)(d),(f)
    "We'll reply within 45 days. If we need more time, we may take 45 more days once, and we'll tell you why within the first 45 days.",  # .040(1)(g)
    "We'll respond in writing within 45 days and explain what we did and why. If we deny your appeal, you can contact your state attorney general.",  # .040(1)(h)
    "ask for your consent before we do",                                          # .020(1)(c)-(d)
    "Adults only HomeCircle is for adults 18 and over and isn't directed to children.",
    "Changes We'll post any changes here with a new date.",
]:
    if snippet not in hp:
        bad(f"health-privacy.html missing: {snippet[:70]}...")
for old in ("We don't collect consumer health data through the site", "We don't receive, use, sell or share them"):
    if old in hp: bad(f"health-privacy.html: blanket claim Hale flagged {old!r}")
for href in ("https://support.github.com/contact/privacy", "https://improvmx.com/contact/", "https://support.google.com/policies/contact/general_privacy_form", "https://www.atg.wa.gov/file-complaint", "health-data-request.html"):
    if f'href="{href}"' not in hp_raw: bad(f"health-privacy.html: link {href}")

req_raw = (ROOT / "health-data-request.html").read_text()
req = main_text(req_raw)
for snippet in ["Health data requests and appeals", f"Last updated {DATE}", "You don't need an account", "Appeal a decision", "This email is not a crisis line."]:
    if snippet not in req: bad(f"health-data-request.html missing: {snippet}")
for subj in ("Health%20data%20request%3A%20confirm%20and%20copy", "Health%20data%20request%3A%20delete", "Health%20data%20request%3A%20withdraw%20consent", "Appeal%3A%20health%20data%20request"):
    if f'href="mailto:support@homecircle.au?subject={subj}"' not in req_raw: bad(f"health-data-request.html: mailto {subj}")
if "<form" in req_raw or "<input" in req_raw.split("<main", 1)[1]: bad("health-data-request.html: must stay email-only (no forms)")
if 'Read our <a href="health-privacy.html">Consumer Health Data Privacy Policy</a>' not in (ROOT / "index.html").read_text():
    bad("index.html: conspicuous homepage link to the health policy (RCW 19.373.020(1)(b))")

# Data minimisation: the only saved value is the hideHolds on/off choice; no health conditions stored.
site_js = (ROOT / "assets" / "site.js").read_text()
for cond in ("heartOrBloodPressure", "asthmaOrLung", "pregnancy", "panicAttacks", "hc.kai", "hc.journal", "hc.circle", "fetch(", "XMLHttpRequest", "sendBeacon"):
    if cond in site_js: bad(f"assets/site.js still has {cond!r}")
if (ROOT / "assets" / "readaloud.js").exists(): bad("assets/readaloud.js is back in the repo")

terms = main_text((ROOT / "terms.html").read_text())
for snippet in [
    f"Last updated {TERMS_DATE}",
    "Support, not medical care HomeCircle is general wellness and peer-support information. It is not a medical device, not medical advice, diagnosis or treatment, and not an emergency or crisis service. In an emergency call 911. For crisis support call or text 988.",
    "There is no arbitration and no class-action waiver.",
    "These terms are governed by the laws of Queensland, Australia.",
]:
    if snippet not in terms:
        bad(f"terms.html missing: {snippet[:70]}...")

support = main_text((ROOT / "support.html").read_text())
for snippet in [
    "Does the website collect my data? Not through the site itself. There are no forms, cookies, ads, trackers, analytics or third-party scripts or fonts, and nothing you save is sent to HomeCircle. Like any website, our web host, GitHub, automatically receives request information when you open a page, including your IP address and the page you asked for.",
    "What does the website save, and where? Only what you choose to save: the \"hide breath holds\" setting.",
]:
    if snippet not in support:
        bad(f"support.html missing: {snippet[:70]}...")
if "Is Kai on the website?" in support: bad("support.html still has the Kai question")

for name in ("library/urge-surfing.html", "library/urge-surfing-meditation.html"):
    if STUDY not in text_of((ROOT / name).read_text()):
        bad(f"{name}: missing the longer-program sentence")

print(f"{len(PAGES)} pages checked, {fail} failure(s)")
sys.exit(1 if fail else 0)
