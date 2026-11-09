#!/usr/bin/env python3
"""Checks Hale's US static wording file (10 Nov 2026) word for word on the built pages. Run after tools/build.py."""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = sorted(ROOT.glob("*.html")) + sorted((ROOT / "library").glob("*.html"))
DATE = "10 November 2026"
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
    "What we collect We don't collect anything through the site itself. There are no accounts, cookies, ads, trackers or analytics, and we don't sell or share personal data or use it for ads. Our web host does keep technical records of visits, as explained under \"Our web host\".",
    "What your browser saves Some features save your choices in this browser's local storage, on this device only: the \"hide breath holds\" setting. We can't see them. To delete them, change the setting back or clear this site's data in your browser. Private browsing removes them when you close the window.",
    "Our web host The site is hosted on GitHub Pages, run by GitHub (part of Microsoft). When you visit a page, your browser asks GitHub for it, and GitHub automatically receives standard request data, such as your IP address, browser type and the page requested, to deliver and secure the site. GitHub handles that data under its own privacy statement. We can't see or use those records. Because this is a recovery website, a visit itself may say something about your health; if that worries you, use private browsing or a network you trust.",
    "If you email us We get your email address and what you write. We use it only to reply, and we delete it when it is no longer needed. Our email is forwarded through ImprovMX to Gmail. Please don't send health details you'd rather keep private.",
    "Consumer health data See our Consumer Health Data Privacy Policy.",
    "Adults only HomeCircle is for people 18 and over.",
    "Changes We'll post any changes here with a new date.",
]:
    if snippet not in privacy:
        bad(f"privacy.html missing: {snippet[:70]}...")
raw_priv = (ROOT / "privacy.html").read_text()
if 'href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"' not in raw_priv: bad("privacy.html: GitHub privacy statement link")
if '<a href="health-privacy.html">Consumer Health Data Privacy Policy</a>.</p>' not in raw_priv: bad("privacy.html: pointer link to health-privacy.html")
if "What we collect: nothing through the site" in privacy: bad("privacy.html: old heading")

hp = main_text((ROOT / "health-privacy.html").read_text())
for snippet in [
    f"Consumer Health Data Privacy Policy. Last updated {DATE}. This policy covers consumer health data under Washington's My Health My Data Act and similar laws in Nevada, Connecticut and other states. HomeCircle is run by Luke Endrody (sole trader), Queensland, Australia, ABN 53 687 374 897. Contact: support@homecircle.au (not a crisis line).",
    "What we collect. We don't collect consumer health data through the site. There are no accounts, forms, cookies, ads, trackers or analytics. Anything you choose to save stays in your browser on your device, and we can't see it.",
    "Our web host. GitHub, our web host, automatically records technical data when you visit a page, such as your IP address and the page requested. Because this is a recovery website, those records could suggest something about your health. GitHub uses them to deliver and secure the site under its own privacy statement. We don't receive, use, sell or share them.",
    "If you email us. If you choose to email us health information, we get your email address and what you write, through our email forwarding service (ImprovMX) and our email provider (Google Gmail). We use it only to reply to you and delete it when it is no longer needed. We never sell it, never use it for ads, and never share it with anyone else except those service providers, who handle it only to deliver our email.",
    "Your rights. You can ask us to confirm whether we hold your consumer health data, to see it and the providers it went through, or to delete it, and you can withdraw any consent. Email support@homecircle.au. We'll reply within 45 days, and may take 45 more days if needed, in which case we'll tell you why.",
    "Appeals. If we refuse your request, reply to our answer to appeal. We'll respond within 45 days and explain our decision. If you're still unhappy, you can contact your state attorney general (for Washington: https://www.atg.wa.gov/file-complaint).",
    "Adults only. HomeCircle is for adults 18 and over and isn't directed to children.",
    "Changes. We'll post any changes here with a new date.",
]:
    if snippet not in hp:
        bad(f"health-privacy.html missing: {snippet[:70]}...")

terms = main_text((ROOT / "terms.html").read_text())
for snippet in [
    f"Last updated {DATE}",
    "Support, not care HomeCircle is general wellness and peer-support information. It is not a medical device, not medical advice, diagnosis or treatment, and not an emergency or crisis service. In an emergency call 911. For crisis support call or text 988.",
    "There is no arbitration and no class-action waiver.",
    "These terms are governed by the laws of Queensland, Australia.",
]:
    if snippet not in terms:
        bad(f"terms.html missing: {snippet[:70]}...")

support = main_text((ROOT / "support.html").read_text())
for snippet in [
    "Does the website collect my data? No. There are no cookies, ads, trackers, analytics or third-party scripts or fonts, and nothing you save is sent to HomeCircle. Like any website, our web host, GitHub, logs visits. See the Privacy Policy and Consumer Health Data Privacy Policy.",
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
