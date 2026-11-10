#!/usr/bin/env python3
"""Builds the static HomeCircle website from tools/app-content.json (pulled from the
iOS app source by extract_app_content.py) and events.json. Run from the repo root:
  python3 tools/build.py
"""
import json, html, re, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
C = json.loads((ROOT / "tools" / "app-content.json").read_text())
L = C["legal"]
E = html.escape
ITEMS = {i["id"]: i for i in C["items"]}
ARTS, DRAW, HERO, BG = C["arts"], C["drawing"], C["hero"], C["backgrounds"]
TODAY = datetime.date.today().isoformat()

# Words that only make sense inside the iPhone app, changed for the web. Listed in the report.
WEB_EDITS = {
    "When it eases, jot what helped. That note stays on this phone.": "When it eases, jot down what helped.",
    "Angry: is something unnamed? You can tell a sponsor or write it here, on this phone.": "Angry: is something unnamed? You can tell a sponsor or write it down.",
    "This practice is off until you turn it on in Profile. If focusing inward brings up distress, stop.": "This practice stays hidden until you choose to show it. If focusing inward brings up distress, stop.",
    "The out-breath is the long part. The hold is optional in spirit: skip this practice if holds are off in Health safety.": "The out-breath is the long part. Skip this practice if breath holds aren't right for you (see the safety note above).",
    "Use it when the other counts are hidden by your health notes, or whenever you prefer it.": "Use it if breath holds aren't right for you, or whenever you prefer it.",
    "Kai leads a short sit with the wave of an urge.": "A short guided sit with the wave of an urge.",
    "Use the official site, or find a meeting in the app.": "Use the official site to find a meeting.",
}
def web(t):
    t = WEB_EDITS.get(t, t)
    return t[5:] if t.startswith("Kai: ") else t

PAGES = [("index.html", "Home"), ("library.html", "Library"), ("twelve-steps.html", "12 Steps"),
         ("meditations.html", "Breathing & practices"), ("meetings.html", "Meetings"), ("help.html", "Help"), ("support.html", "Support")]
PRIVACY = L["privacyURL"]
TERMS = L["termsURL"]
import hashlib as _h
CSS_V = _h.sha1((ROOT / "assets" / "site.css").read_bytes()).hexdigest()[:8]
SITE_V = _h.sha1((ROOT / "assets" / "site.js").read_bytes()).hexdigest()[:8]
SITE_URL = "https://homecirclerecovery.com"

# Published HTML paths on each site. hreflang tags are generated from the intersection.
AU_SITE_PATHS = {
    'events.html',
    'families/child.html',
    'families/family.html',
    'families/friend.html',
    'families/index.html',
    'families/kids.html',
    'families/overdose.html',
    'families/partner.html',
    'families/safety.html',
    'families/withdrawal.html',
    'help.html',
    'index.html',
    'library.html',
    'library/24-hour-plan.html',
    'library/4-7-8-breathing.html',
    'library/alcohol-and-the-body.html',
    'library/alcoholics-anonymous.html',
    'library/body-and-recovery-stages.html',
    'library/body-scan.html',
    'library/box-breathing.html',
    'library/breathing-anchor.html',
    'library/cannabis-and-the-body.html',
    'library/gambling-support.html',
    'library/grounding-5-4-3-2-1.html',
    'library/halt.html',
    'library/mindful-eating.html',
    'library/mindful-walking.html',
    'library/narcotics-anonymous.html',
    'library/one-thing-focus.html',
    'library/opioids-and-the-body.html',
    'library/pornography-addiction-support.html',
    'library/recovery-books.html',
    'library/slow-out-breath.html',
    'library/stimulants-and-the-body.html',
    'library/stress-and-anxiety.html',
    'library/urge-surfing-meditation.html',
    'library/urge-surfing.html',
    'meditations.html',
    'meetings.html',
    'support.html',
    'twelve-steps.html',
    'your-circle.html',
}
US_SITE_PATHS = {
    'health-privacy.html',
    'help.html',
    'index.html',
    'library.html',
    'library/24-hour-plan.html',
    'library/4-7-8-breathing.html',
    'library/alcoholics-anonymous.html',
    'library/body-scan.html',
    'library/box-breathing.html',
    'library/breathing-anchor.html',
    'library/gamblers-anonymous.html',
    'library/grounding-5-4-3-2-1.html',
    'library/halt.html',
    'library/mindful-eating.html',
    'library/mindful-walking.html',
    'library/narcotics-anonymous.html',
    'library/one-thing-focus.html',
    'library/pornography-addiction-support.html',
    'library/recovery-books.html',
    'library/slow-out-breath.html',
    'library/stress-and-anxiety.html',
    'library/urge-surfing-meditation.html',
    'library/urge-surfing.html',
    'meditations.html',
    'meetings.html',
    'overdose.html',
    'privacy.html',
    'support.html',
    'terms.html',
    'twelve-steps.html',
}

AU_ORIGIN = "https://homecircle.au"
US_ORIGIN = "https://homecirclerecovery.com"

def page_abs_url(origin, path):
    return origin + "/" + ("" if path == "index.html" else path)

def hreflang_tags(path):
    """Alternate language tags for paths that exist on both sites. x-default is the AU URL."""
    if path not in (AU_SITE_PATHS & US_SITE_PATHS):
        return ""
    au = page_abs_url(AU_ORIGIN, path)
    us = page_abs_url(US_ORIGIN, path)
    return (
        f'<link rel="alternate" hreflang="en-AU" href="{au}">\n'
        f'<link rel="alternate" hreflang="en-US" href="{us}">\n'
        f'<link rel="alternate" hreflang="x-default" href="{au}">\n'
    )
HEALTH_PRIVACY = "health-privacy.html"
# Hale's wording file (10 Nov 2026), section 4: footer line on every page.
BROWSER_ONLY = "Anything you save stays in this browser's local storage. Our web host logs visits."
# The only feature that saves anything on the US site (hc.health.v1, key hideHolds). Hale's file, sections 1 and 3.
SAVED_FEATURES = 'the "hide breath holds" setting'
BUILT = []   # every page written, for sitemap.xml
SLUG = {
    "breath-box": "box-breathing", "breath-478": "4-7-8-breathing", "breath-46": "slow-out-breath",
    "guide-urge": "urge-surfing", "guide-halt": "halt", "guide-24h": "24-hour-plan", "guide-54321": "grounding-5-4-3-2-1",
    "guide-one": "one-thing-focus", "guide-stress": "stress-and-anxiety", "body-alcohol": "alcohol-and-the-body",
    "body-stimulants": "stimulants-and-the-body", "body-opioids": "opioids-and-the-body", "body-cannabis": "cannabis-and-the-body",
    "med-urge": "urge-surfing-meditation", "med-scan": "body-scan", "med-breath": "breathing-anchor", "med-walk": "mindful-walking",
    "med-eat": "mindful-eating", "fell-aa": "alcoholics-anonymous", "fell-na": "narcotics-anonymous", "fell-ga": "gambling-support",
    "fell-pa": "pornography-addiction-support",
}
SLUG["fell-ga"] = "gamblers-anonymous"
def item_href(i, r=""):
    return f"{r}library/{SLUG[i]}.html"
BOOKS_HREF = "library/recovery-books.html"

HEART = '<svg class="heart" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 21.2l-1.4-1.3C5.4 15.3 2 12.2 2 8.4 2 5.3 4.4 3 7.4 3c1.7 0 3.4.8 4.6 2.1C13.2 3.8 14.9 3 16.6 3 19.6 3 22 5.3 22 8.4c0 3.8-3.4 6.9-8.6 11.5L12 21.2z"/></svg>'

def tel(line, label=None):
    """A call button for one HelpDirectory line, exactly as the app shows it."""
    return f'<a class="btn ghost" href="tel:{line["dial"]}">{E(label or "Call " + line["displayNumber"])}</a>'

def canonical(path):
    return SITE_URL + "/" + ("" if path == "index.html" else path)

def head(title, desc, r, path):
    return f"""<!DOCTYPE html>
<html lang="en-US" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'">
<meta name="referrer" content="no-referrer">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{canonical(path)}">
{hreflang_tags(path)}<link rel="icon" href="{r}favicon.png" type="image/png">
<link rel="apple-touch-icon" href="{r}assets/logo-192.png">
<link rel="stylesheet" href="{r}assets/site.css?v={CSS_V}">
<script src="{r}assets/site.js?v={SITE_V}" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{crisis_bar()}"""

def crisis_bar():
    """Static crisis bar at the top of every page. Plain links: works with no JavaScript at all.
    At 480px and under, SAMHSA and the gambling helpline sit in a no-JS <details> so the bar stays compact."""
    sam = '<a class="cb-btn" href="tel:18006624357" aria-label="Call SAMHSA\'s National Helpline, 1-800-662-4357">SAMHSA Helpline 1-800-662-4357</a>'
    gam = '<a class="cb-btn" href="tel:+18006973738" aria-label="Call or text 1-800-MY-RESET, National Problem Gambling Helpline, 1-800-697-3738">Gambling help 1-800-MY-RESET</a>'
    return f"""<div class="crisis-bar" role="region" aria-label="Crisis lines"><div class="wrap"><strong class="cb-lead">Need help now?</strong>
  <a class="cb-btn cb-911" href="tel:911">Call 911</a>
  <a class="cb-btn" href="tel:988" aria-label="Call 988, Suicide and Crisis Lifeline">Call 988</a>
  <a class="cb-btn" href="sms:988" aria-label="Text 988, Suicide and Crisis Lifeline">Text 988</a>
  <span class="cb-wide">{sam}{gam}</span>
  <details class="cb-more"><summary>More help lines</summary>{sam}{gam}</details>
</div></div>"""

def header(active, r):
    lis = "".join(f'<li><a href="{r}{h}"{" aria-current=\"page\"" if h == active else ""}>{E(t)}</a></li>' for h, t in PAGES)
    return f"""
<header class="site-head"><div class="wrap">
  <a class="brand" href="{r}index.html"><img src="{r}assets/logo-96.png" alt="" width="46" height="46"><span><b>HomeCircle</b><span class="us-badge" title="HomeCircle US"><span class="sr-only">, United States</span><span aria-hidden="true">US</span></span><small>Support for your recovery journey</small></span></a>
  <a class="region-switch region-switch-header" href="https://homecircle.au/">In Australia? Go to HomeCircle AU</a>
  <button class="btn ghost menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" hidden>Menu</button>
  <nav class="nav" id="site-nav" aria-label="Main"><ul>{lis}<li class="region-switch-item"><a class="region-switch region-switch-menu" href="https://homecircle.au/">In Australia? Go to HomeCircle AU</a></li></ul></nav>
</div></header>
<a class="help-pill" id="help-pill" href="{r}help.html#now" aria-label="{E(C["crisis"]["accessibilityLabel"])}" aria-describedby="help-pill-hint" aria-controls="help-dialog">{HEART}<span aria-hidden="true">Help</span></a>
<span class="sr-only" id="help-pill-hint">{E(C["crisis"]["accessibilityHint"])}</span>"""

def footer(r):
    s_ = C["crisis"]
    return f"""
<footer class="site-foot"><div class="wrap cols">
  <div>
    <h2>HomeCircle</h2>
    <p>Support for your recovery journey. Free, with no accounts, no sign-in, no cookies, no ads, no trackers and no analytics.</p>
    <p>{E(L["gpLine"])} {E(L["notMedicalDevice"])} In an emergency call <a href="tel:911">911</a>. Call or text <a href="tel:988">988</a> for the Suicide &amp; Crisis Lifeline.</p>
    <p>HomeCircle is independent and isn&#x27;t affiliated with or endorsed by Alcoholics Anonymous, Narcotics Anonymous or any other group listed on this site.</p>
  </div>
  <div><h2>Explore</h2><ul>{"".join(f'<li><a href="{r}{h}">{E(t)}</a></li>' for h, t in PAGES)}</ul></div>
  <div><h2>About</h2><ul>
    <li><a href="{r}{PRIVACY}">Privacy Policy</a></li>
    <li><a href="{r}{TERMS}">Terms of Use</a></li>
    <li><a href="{r}{HEALTH_PRIVACY}">Consumer Health Data Privacy Policy</a></li>
    <li><a href="{r}support.html#website">About this website</a></li>
    <li><a href="mailto:support@homecircle.au">Contact</a></li>
    <li><a href="mailto:{L["supportEmail"]}">{L["supportEmail"]}</a> (not a crisis line)</li>
  </ul><p class="small">{E(BROWSER_ONLY)} <a href="{r}{PRIVACY}">Privacy Policy</a> · <a href="{r}{HEALTH_PRIVACY}">Consumer Health Data Privacy Policy</a> · <a href="{r}{TERMS}">Terms of Use</a></p></div>
</div><div class="wrap"><p class="fine-print">© 2026 {E(L["owner"])} (sole trader), {E(L["ownerPlace"])}. ABN 53 687 374 897.</p></div></footer>
<dialog class="help" id="help-dialog" aria-labelledby="help-title">
  <div class="help-in">
    <button class="close-x" type="button" data-close aria-label="Close">×</button>
    <h2 id="help-title">{E(s_["sheetTitle"])}</h2>
    <ul class="help-lines">
      <li><a class="first" href="tel:911">Call 911<small>If a life is in danger. Police, fire or ambulance.</small></a></li>
      <li><a class="second" href="tel:988">Call 988<small>Suicide &amp; Crisis Lifeline, 24/7. You can also text 988.</small></a></li>
    </ul>
    <p>{E(s_["sheetIntro"])}</p>
    <a class="btn ghost wide" href="{r}help.html">More helplines on the Help page</a>
    <button class="btn ghost wide plain" type="button" data-close>Close</button>
  </div>
</dialog>
</body>
</html>
"""

def page(path, active, title, desc, body):
    r = "../" * path.count("/")
    BUILT.append(path)
    out = head(title, desc, r, path) + header(active, r) + f'\n<main id="main"><div class="wrap">\n{body}\n</div></main>' + footer(r)
    (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / path).write_text(out)

def art_img(key, r, cls="", eager=False):
    a = ARTS[key]
    return f'<img src="{r}assets/art/{a["asset"]}.jpg" alt="{E(a["label"])}" width="1024" height="768"{"" if eager else " loading=\"lazy\""}{f" class=\"{cls}\"" if cls else ""}>'

def tile(href, title, summary, tag, artkey, r, mins=None, hold=False):
    pic = art_img(artkey, r) if artkey else f'<div class="icon-tile" aria-hidden="true">{E(title)}</div>'
    m = f" · {mins} min" if mins and mins > 1 else ""
    return f'<a class="card tile" href="{href}"{" data-breath-hold" if hold else ""}>{pic}<div class="tbody"><span class="tag">{E(tag)}{m}</span><h3>{E(title)}</h3><p>{E(summary)}</p></div></a>'

def src_list(links, heading="Sources"):
    if not links: return ""
    lis = "".join(f'<li><a href="{E(l["url"])}" rel="noopener">{E(l["title"])}</a></li>' for l in links)
    return f'<div class="sources"><h3>{heading}</h3><ul>{lis}</ul></div>'

def stat_card(s):
    return f'<div class="stat"><p>{E(s["text"])}</p><a href="{E(s["sourceURL"])}" rel="noopener">Source: {E(s["sourceTitle"])}</a></div>'

def aside(r):
    return f"""<aside><div class="card sage"><h3>Need help now?</h3><p>If you or someone else is in danger, call <a href="tel:911">911</a>. The 988 Suicide &amp; Crisis Lifeline is there 24/7: call or text <a href="tel:988">988</a>.</p><p class="small">{E(L["gpLine"])}</p><p><a href="{r}help.html">All helplines</a></p></div></aside>"""

# ---------- home ----------
def build_home():
    r = ""
    feats = [
        ("meditations.html", "Breathe now", "An animated breathing guide: box, 4-7-8 or a slow out-breath.", "Breathing", "breatheIn"),
        ("library.html", "Library", "Guides, breathing, meditation and links to AA, NA and GA's own sites.", "Library", "oneThing"),
        ("twelve-steps.html", "The 12 Steps", C["twelveStepsCopy"]["summary"], "12 Steps", "dayPlan"),
        ("help.html", "Helplines", "911, 988 and US helplines for substance use, crisis and domestic violence.", "Help", "handOnChest"),
    ]
    tiles = "".join(tile(h, t, s, tg, a, r) for h, t, s, tg, a in feats)
    body = f"""
<section class="hero">
  <div>
    <p class="eyebrow">Free · United States · No sign-in</p>
    <h1><span class="grad-text">Support for your recovery journey</span></h1>
    <p class="lede">HomeCircle is a free recovery support website for people in the United States. Breathe along with a guide, read plain-language guides and the 12 Steps, and find links to AA, NA and GA's own sites.</p>
    <div class="btn-row"><a class="btn" href="meditations.html">Breathe now</a><a class="btn ghost" href="library.html">Open the Library</a><a class="btn ghost" href="help.html">Get help</a></div>
    <p class="small">Everything here is free. No accounts, no cookies, no ads, no trackers and no analytics. Anything you save stays in this browser.</p>
  </div>
  <div class="hero-art"><img src="assets/logo-192.png" alt="HomeCircle logo: three people with arms raised inside a circle" width="260" height="260"><p>You're not alone.</p></div>
</section>
<div class="notice"><strong>Need help right now?</strong> {E(L["notMedicalDevice"])} In an emergency call <a href="tel:911">911</a>. For crisis support call or text <a href="tel:988">988</a>.</div>
<h2>What you can do here</h2>
<div class="grid g4">{tiles}</div>
<div class="card mt"><h2 class="mt0">Coming soon</h2><p>Events and pages for families and partners are on the way. To find a meeting, use the <a href="meetings.html">Find a meeting</a> page, which links to each group&#x27;s own official finder.</p></div>
<div class="card sage mt"><h3>Support, not medical care</h3><p>{E(L["gpLine"])}</p><p>{E(L["notAffiliated"])}</p><p>HomeCircle never reproduces the Big Book or NA literature. We link to the free official pages instead.</p></div>"""
    page("index.html", "index.html", "HomeCircle – Support for your recovery journey",
         "HomeCircle is a free US recovery support website: breathing and meditation guides, the 12 Steps, helplines and links to AA, NA and GA's own sites. No accounts.", body)

# ---------- library hub ----------
def build_library():
    r = ""
    sections = [
        ("guide", "Guides", [i for i in C["items"] if i["category"] == "guide"]),
        ("breathing", "Breathing", [i for i in C["items"] if i["category"] == "breathing"]),
        ("meditation", "Meditation", [i for i in C["items"] if i["category"] == "meditation"]),
        ("fellowship", "Fellowships", [i for i in C["items"] if i["category"] == "fellowship"]),
    ]
    chips = '<div class="filters" role="group" aria-label="Show category" hidden><button class="chip" type="button" data-filter="all" aria-pressed="true">All</button>' + "".join(f'<button class="chip" type="button" data-filter="{k}" aria-pressed="false">{t}</button>' for k, t, _ in sections) + "</div>"
    out = []
    for k, t, items in sections:
        tiles = []
        if k == "fellowship":
            tiles.append(tile("twelve-steps.html", C["twelveStepsCopy"]["title"], C["twelveStepsCopy"]["summary"], "Fellowship", "dayPlan", r))
            tiles.append(tile(BOOKS_HREF, C["booksCopy"]["title"], C["booksCopy"]["summary"], "Fellowship", None, r))
        for i in items:
            tiles.append(tile(item_href(i["id"]), i["title"], web(i["summary"]), i["tag"], HERO.get(i["id"]), r, i["minutes"], i.get("breathHold")))
        out.append(f'<section data-cat="{k}" aria-labelledby="h-{k}"><h2 id="h-{k}">{t}</h2><div class="grid g4">{"".join(tiles)}</div></section>')
    body = f"""<h1>Library</h1>
<p class="lede">Resources and tools to support your growth: guides, breathing, meditation and fellowships, with links to the official US pages of AA, NA, Gamblers Anonymous, Al-Anon and Nar-Anon. Free to use here.</p>
{chips}
{HOLDS_NOTE}
{"".join(out)}
<p class="note small">{E(L["gpLine"])} {E(L["notAffiliated"])}</p>"""
    page("library.html", "library.html", "Library – HomeCircle", "Free recovery guides, breathing, meditation and links to AA, NA and GA's own sites.", body)

HOLDS_NOTE = '<p class="note small" data-holds-hidden-note hidden>Breath holds are hidden in this browser, so box breathing and 4-7-8 breathing are left out. Use the setting on the breathing page to change this.</p>'

def holds_toggle(r):
    return f"""<div class="card sage holds" id="holds"><h2 class="mt0">Breath holds</h2>
<p>{E(L["breathHold"])}</p>
<label class="check"><input type="checkbox" data-health="hideHolds"> Hide breath holds in this browser</label>
<p class="small" data-holds-status aria-live="polite"></p>
<p class="small">This choice is kept only in this browser (local storage). </p></div>"""

# ---------- breathing widget ----------
def breath_widget(ids, r, default):
    opts = "".join(f'<option value="{i}"{" selected" if i == default else ""}>{E(ITEMS[i]["title"])}</option>' for i in ids)
    cues = "".join(f'<div data-cue-for="{i}"><p><strong>{E(ITEMS[i]["title"])}:</strong> {E(ITEMS[i]["summary"])}</p><ul>' + "".join(f'<li><strong>{E(s["title"])}</strong>: {E(s["cue"])}</li>' for s in ITEMS[i]["steps"]) + "</ul></div>" for i in ids)
    choose = f'<div><label for="b-pattern">Pattern</label><select id="b-pattern" data-pattern>{opts}</select></div>' if len(ids) > 1 else ""
    return f"""<div class="breath player" data-breath="{default}">
  <div class="breath-stage" aria-hidden="true"><div class="breath-ring"></div><div class="breath-ball"></div><div class="breath-label dark"><b data-phase>Ready</b><span data-count></span></div></div>
  <div>
    <div class="grid g2">{choose}<div><label for="b-min">Length</label><select id="b-min" data-minutes><option value="1">1 min</option><option value="3" selected>3 min</option><option value="5">5 min</option></select></div></div>
    <div class="btn-row"><button class="btn" type="button" data-start aria-pressed="false">Start</button><span class="status" data-left aria-hidden="true"></span></div>
    <p class="sr-only small" data-live aria-live="polite"></p>
    {cues}
    <p class="small">Stop whenever you want. Press Stop or Esc to end.</p>
  </div>
</div>"""

def safety_notes(i):
    out = []
    if i["kind"] in ("breathing", "meditation"):
        out.append(f'<div class="note"><strong>Before you start.</strong> {E(L["beforeYouStart"])}</div>')
    if i.get("breathHold"):
        out.append(f'<div class="notice"><strong>Breath holds.</strong> {E(L["breathHold"])} The <a href="{item_href("breath-46", "../")}">slow out-breath</a> has no hold.</div>')
    if i.get("traumaSensitive"):
        out.append(f'<div class="note">{E(L["trauma"])}</div>')
    return "".join(out)

def player(i, r):
    lis = []
    for s in i["steps"]:
        a = DRAW.get(s["drawing"])
        img = art_img(a, r) if a else ""
        secs = f' <span class="small">({s["seconds"]} seconds)</span>' if s["seconds"] else ""
        lis.append(f'<li class="pstep" data-seconds="{s["seconds"]}"><div class="grid g2">{img}<div><h3>{E(s["title"])}{secs}</h3><p>{E(web(s["cue"]))}</p></div></div></li>')
    return f"""<section class="player" data-player aria-labelledby="pl-h"><h2 id="pl-h" class="mt0">Step by step</h2>
<div class="pcontrols" hidden><div class="progress" aria-hidden="true"><i></i></div><p class="status" data-pos aria-live="polite"></p></div>
<ol class="steps-list">{"".join(lis)}</ol>
<div class="pcontrols btn-row" hidden><button class="btn ghost" type="button" data-prev>Back</button><button class="btn" type="button" data-play>Start</button><button class="btn ghost" type="button" data-next>Next</button><span class="count" data-pcount aria-hidden="true"></span></div>
</section>"""

def build_item(i):
    path = item_href(i["id"])
    r = "../"
    hero = HERO.get(i["id"])
    parts = [f'<p class="crumbs"><a href="../library.html">Library</a> › {E(i["category"].title() if i["category"] != "guide" else "Guides")}</p>',
             f'<h1>{E(i["title"])}</h1><p class="lede">{E(web(i["summary"]))}</p>']
    main = []
    if hero:
        main.append(f'<figure class="figure">{art_img(hero, r, eager=True)}</figure>')
    main.append(safety_notes(i))
    paras = "".join(f"<p>{E(web(p))}</p>" for p in i["paragraphs"])
    if i["id"] == "med-scan":
        main.append(f'<div class="card sage" id="bodyscan-optin" hidden><h2 class="mt0">Body scan is off until you choose it</h2><p>It walks attention through the body. Skip it if that doesn\'t feel right. Nothing is saved.</p><button class="btn" type="button">Show the body scan</button></div><div id="bodyscan-content"><h2 tabindex="-1">About this practice</h2>{paras}')
    else:
        main.append(f'<div>{paras}</div>')
    if i["kind"] == "breathing" and i.get("breathHold"):
        main.append(f'<div class="card sage" data-holds-hidden-note hidden><h2 class="mt0">Breath holds are hidden in this browser</h2><p>You chose to hide breath holds, or saved a health note that rules them out. Try the <a href="{item_href("breath-46", r)}">slow out-breath</a> instead, which has no hold.</p><div class="btn-row"><button class="btn ghost" type="button" data-show-holds>Show this practice anyway</button></div></div>')
        main.append(f'<div data-breath-hold><h2>Breathe along</h2>{breath_widget([i["id"]], r, i["id"])}</div>')
        main.append(holds_toggle(r))
    elif i["kind"] == "breathing":
        main.append(f'<h2>Breathe along</h2>{breath_widget([i["id"]], r, i["id"])}')
    elif i["steps"]:
        main.append(player(i, r))
    if i["id"] == "med-scan":
        main.append("</div>")
    bg = BG.get(i["id"])
    if bg:
        main.append(f'<div class="card"><h2 class="mt0">Where this comes from</h2><p>{E(bg["origin"])}</p><h2>Why it can help</h2><p>{E(bg["why"].replace("a year later than people in usual aftercare.", "a year later than people in usual aftercare. That study tested a longer, guided program, not this page."))}</p>{src_list(bg["sources"])}</div>')
    links = [l for l in i["links"] if not l.get("inAppMeetings")]
    if links:
        main.append(src_list(links, "Official pages" if i["category"] == "fellowship" else "Read more"))
    if i.get("phoneDial"):
        main.append(f'<p><a class="btn ghost" href="tel:{i["phoneDial"]}">Call {E(i["phoneDisplay"])}</a></p>')
    if i["id"] == "fell-ga":
        main.append('<div class="card mt"><h2 class="mt0">National Problem Gambling Helpline</h2><p>Professional help, not a fellowship: free, confidential and 24/7 by call, text or chat, for you or someone you\'re worried about. Run by the National Council on Problem Gambling.</p><div class="btn-row"><a class="btn ghost" href="tel:+18006973738">Call or text 1-800-MY-RESET (1-800-697-3738)</a><a class="btn ghost" href="sms:+18006973738">Text 1-800-697-3738</a><a class="btn ghost" href="https://www.ncpgambling.org/help-treatment/" rel="noopener">ncpgambling.org</a></div><p class="small">The Gamblers Anonymous number above is a fellowship line. Checked 5 November 2026.</p></div>')
    main.append(f'<p class="small">{E(L["gpLine"])}</p>')
    body = "".join(parts) + f'<div class="layout"><div>{"".join(main)}</div>{aside(r)}</div>'
    page(path, "library.html", f'{i["title"]} – HomeCircle Library', web(i["summary"]), body)

def build_books():
    r = "../"; B = C["booksCopy"]
    cards = "".join(f'<a class="card tile" href="{E(b["url"])}" rel="noopener"><div class="tbody"><span class="tag">{E(b["opens"])}</span><h3>{E(b["title"])}</h3><p>{E(b["detail"])}</p></div></a>' for b in C["books"])
    body = f"""<p class="crumbs"><a href="../library.html">Library</a> › Fellowships</p>
<h1>{E(B["title"])}</h1><p class="lede">{E(B["note"])}</p>
<div class="grid g3">{cards}</div>
<div class="card mt"><h2 class="mt0">Where this comes from</h2><p>Every link goes to a free page that Alcoholics Anonymous World Services or Narcotics Anonymous World Services hosts on its own site.</p></div>
<p class="small">{E(C["twelveStepsCopy"]["independence"])}</p>"""
    page(BOOKS_HREF, "library.html", "Recovery books (free to read) – HomeCircle", B["summary"], body)

def build_steps():
    r = ""; T = C["twelveStepsCopy"]
    cards = "".join(f'<div class="card"><p class="num">Step {s["number"]}</p><h3>{E(s["theme"])}</h3><p>{E(s["note"])}</p><p class="reflect">{E(s["reflection"])}</p></div>' for s in C["twelveSteps"])
    body = f"""<div class="layout"><div>
<h1>{E(T["title"])}</h1><p class="lede">{E(T["intro"])}</p>
<div class="note"><strong>In HomeCircle's own plain-language words.</strong> These notes are HomeCircle's own summaries, not the official wording of AA or NA. For AA's own wording of the Twelve Steps, see <a href="{E(T["officialURL"])}" rel="noopener">aa.org</a>.</div>
<div class="btn-row"><a class="btn" href="{E(T["officialURL"])}" rel="noopener">{E(T["officialLinkTitle"])}</a><a class="btn ghost" href="{BOOKS_HREF}">Free recovery books</a></div>
<div class="twelve">{cards}</div>
<div class="card mt"><h2 class="mt0">Where this comes from</h2><p>The 12 Steps were first written down by Alcoholics Anonymous in the 1930s. Narcotics Anonymous and other fellowships adapted them. The notes on this page are HomeCircle's own plain-language summaries, not the official wording of AA or NA.</p>{src_list([{"title": "The Twelve Steps (opens aa.org)", "url": T["officialURL"]}])}</div>
<p class="small">{E(T["independence"])}</p>
</div><aside><figure class="figure">{art_img("dayPlan", r, eager=True)}</figure><div class="card sage"><h3>Find a meeting</h3><p>Many people work the Steps with a sponsor they meet at meetings.</p><p><a href="meetings.html">Find a meeting</a> through each group&#x27;s own official finder, including AA and NA.</p></div></aside></div>"""
    page("twelve-steps.html", "twelve-steps.html", "The 12 Steps – HomeCircle", T["summary"], body)

def build_meditations():
    r = ""
    br = ["breath-46", "breath-box", "breath-478"]
    meds = [i for i in C["items"] if i["category"] == "meditation"]
    tiles_b = "".join(tile(item_href(i), ITEMS[i]["title"], ITEMS[i]["summary"], "Breathing", HERO.get(i), r, ITEMS[i]["minutes"], ITEMS[i]["breathHold"]) for i in br)
    tiles_m = "".join(tile(item_href(i["id"]), i["title"], web(i["summary"]), "Meditation", HERO.get(i["id"]), r, i["minutes"]) for i in meds)
    body = f"""<h1>Meditations and breathing</h1>
<p class="lede">Breathe along with the circle: it grows as you breathe in and shrinks as you breathe out. Then try a short guided meditation.</p>
<div class="note"><strong>Before you start.</strong> {E(L["beforeYouStart"])}</div>
<div class="notice"><strong>Breath holds.</strong> {E(L["breathHold"])} The slow out-breath has no hold.</div>
<h2>Breathing guide</h2>
{breath_widget(br, r, "breath-46")}
{holds_toggle(r)}
<h2>Breathing practices</h2>{HOLDS_NOTE}<div class="grid g3">{tiles_b}</div>
<h2>Meditations</h2><p>Each meditation is a few short steps. Eyes can stay open. Stop if you feel unwell.</p><div class="grid g3">{tiles_m}</div>
<p class="note small">{E(L["trauma"])} {E(L["gpLine"])}</p>"""
    page("meditations.html", "meditations.html", "Meditations and breathing – HomeCircle", "A free animated breathing guide (box, 4-7-8, slow out-breath) and short guided meditations.", body)

# US helplines. Each checked against the service's own website on 4 Nov 2026; sources in SOURCES.md.
# Keep to what the official page says. If something can't be verified, leave it out.
# (name, one-liner, buttons [(href, label)], more-info lines, url)
US_LINES = [
    ("988 Suicide & Crisis Lifeline", "For anyone in emotional distress, a suicidal crisis, or a substance use crisis. You don't have to be suicidal to reach out.",
     [("tel:988", "Call 988"), ("sms:988", "Text 988"), ("https://988lifeline.org/chat/", "Chat online")],
     ["Free, confidential support from trained counselors across the US and its territories, 24/7.",
      "Reasons to reach out include substance use, money worries, relationships, loneliness, and mental or physical illness.",
      "Spanish: press 2, or text AYUDA to 988. Veterans: press 1, or text 838255. TTY: use your relay service or dial 711 then 988."],
     "https://988lifeline.org/get-help/"),
    ("Crisis Text Line", "For anyone who'd rather text: stress, anxiety, loneliness, self-harm or suicidal thoughts.",
     [("sms:741741&body=HOME", "Text HOME to 741741")],
     ["Free, confidential support from a trained volunteer Crisis Counselor, 24/7, by text.",
      "Your first message can say anything. A counselor usually joins within five minutes, sometimes longer when busy.",
      "Volunteers aren't medical professionals and can't give medical advice."],
     "https://www.crisistextline.org/text-us/"),
    ("SAMHSA's National Helpline", "For people and families facing substance use or mental health issues who want treatment and support options.",
     [("tel:18006624357", "Call 1-800-662-4357")],
     ["Free, confidential treatment referral and information, 24/7, 365 days a year, in English and Spanish.",
      "Refers you to local treatment, support groups and community organizations. It doesn't provide counseling.",
      "TTY: 1-800-487-4889. You can also text your 5-digit ZIP code to 435748 (HELP4U) for help near you (English only).",
      "No insurance needed. They can refer you to state-funded or sliding-fee programs."],
     "https://www.samhsa.gov/find-help/helplines/national-helpline"),
    ("National Domestic Violence Hotline", "For anyone experiencing abuse in a relationship, or worried about someone who is.",
     [("tel:18007997233", "Call 1-800-799-7233"), ("sms:88788&body=START", "Text START to 88788")],
     ["Free, confidential, 24/7. Advocates offer support, crisis intervention, safety planning and local referrals.",
      "Live chat is on their website. If you're in immediate danger, call 911.",
      "If someone may check your phone or browser, their site has its own quick-exit button."],
     "https://www.thehotline.org/"),
    ("National Problem Gambling Helpline", "For anyone worried about their own gambling or someone else's, including family and friends.",
     [("tel:+18006973738", "Call or text 1-800-MY-RESET (1-800-697-3738)"), ("sms:+18006973738", "Text 1-800-697-3738")],
     ["Run by the National Council on Problem Gambling. Free and confidential, by call, text or chat, 24/7.",
      "Connects you to local help in all 50 states and US territories. It isn't a crisis line: in a crisis call 911 or 988.",
      "1-800-522-4700 also still works."],
     "https://www.ncpgambling.org/help-treatment/about-the-national-problem-gambling-helpline/"),
    ("Gamblers Anonymous national hotline (fellowship line)", "A fellowship line for people who think they might have a gambling problem.",
     [("tel:8552225542", "Call 855-222-5542")],
     ["A fellowship, not a professional service. Meetings are in person, online or by phone, with no dues or fees.",
      "Hours for the hotline aren't published on the site."],
     "https://gamblersanonymous.org/"),
]

def domain_of(url):
    from urllib.parse import urlparse
    d = urlparse(url).netloc
    return d[4:] if d.startswith("www.") else d

def more_info(lines, url, label=None):
    items = "".join(f"<li>{E(x)}</li>" for x in lines)
    return f'<details class="more"><summary>More info</summary><ul>{items}</ul><p><a href="{E(url)}" rel="noopener">{E(label or domain_of(url))}</a></p></details>'

def more_card(name, one, btns, info, url):
    b = "".join(f'<a class="btn ghost" href="{E(h)}"{" rel=\"noopener\"" if h.startswith("http") else ""}>{E(t)}</a>' for h, t in btns)
    return f'<div class="card"><h3>{E(name)}</h3><p class="one">{E(one)}</p><div class="btn-row">{b}</div>{more_info(info, url)}</div>'

def build_help():
    lines = "".join(more_card(*l) for l in US_LINES)
    fam = [
        ("Al-Anon Family Groups", "For people worried about someone with a drinking problem. Alateen is for teens.", [("https://al-anon.org/", "Open al-anon.org")],
         ["Al-Anon members are family and friends who learn from others who have faced similar problems.", "The site has self-assessment quizzes and meeting information."], "https://al-anon.org/"),
        ("Nar-Anon Family Groups", "For family and friends affected by someone else's drug addiction. Narateen is for teens.", [("https://nar-anon.org/", "Open nar-anon.org")],
         ["A Twelve-Step fellowship. The only requirement is a problem of addiction in a relative or friend. No dues or fees.", "World Service Office: (800) 477-6291, Monday to Friday 8am to 2pm Pacific. This is an office line, not a crisis line."], "https://nar-anon.org/contact/"),
    ]
    body = f"""<div id="now" class="btn-row"><a class="btn danger" href="tel:911">Call 911</a><a class="btn" href="tel:988">Call 988</a><a class="btn ghost" href="sms:988">Text 988</a></div>
<h1>Get help</h1>
<p class="lede">We're here to support you. Help is always available. You're not alone.</p>
<p><strong>{E(L["notMedicalDevice"])}</strong></p>
<div class="notice"><strong>Call 911 immediately</strong> if a life is in danger. <strong>Call or text 988</strong> any time, 24/7, for the Suicide &amp; Crisis Lifeline, including for a substance use crisis.</div>
<h2>Helplines</h2>
<div class="grid g3">{lines}</div>
<p class="small">These are independent services. HomeCircle is not affiliated with them.</p>
<h2 id="family">Family &amp; friends</h2>
<div class="note">This is not medical advice. For any major concern, see a doctor. If a life is in danger, call 911.</div>
<div class="grid g2">{"".join(more_card(*f) for f in fam)}</div>
<h2>Self-help kit</h2>
<p>Tools to support you in the moment.</p>
<div class="grid g4">{tile(item_href("guide-urge"), "Urge plan", ITEMS["guide-urge"]["summary"], "Guide", "urgeWave", "")}{tile(item_href("guide-halt"), "HALT", ITEMS["guide-halt"]["summary"], "Guide", "haltPause", "")}{tile(item_href("guide-24h"), "24-hour plan", ITEMS["guide-24h"]["summary"], "Guide", "dayPlan", "")}{tile("meditations.html", "Breathe now", "An animated breathing guide.", "Breathing", "breatheOut", "")}</div>
<div class="grid g2 mt">
<div class="card"><h2 class="mt0">Keep your details private</h2><p>{E(L["privateDetails"])}</p></div>
<div class="card"><h2 class="mt0">Code of conduct</h2><p>{E(L["rulesBody"])}</p></div>
</div>
<div class="emergency-card mt"><h2 class="mt0">Call 911 immediately</h2><p>If a life is in danger, call 911 or go to your nearest emergency room.</p><a class="btn" href="tel:911">Call 911</a></div>
<div class="card mt" id="overdose"><h2 class="mt0">What to do in an overdose</h2><p>Call 911 first. Then see the signs of overdose, the first aid steps, and where to get naloxone (Narcan).</p><a class="btn" href="overdose.html">What to do in an overdose</a></div>
<p class="small">Hours and numbers can change, so check the service's own website. Checked 4 November 2026.</p>
<p class="small">{E(L["gpLine"])}</p>"""
    page("help.html", "help.html", "Get help – HomeCircle", "US helplines: 911, 988 Suicide & Crisis Lifeline, Crisis Text Line, SAMHSA's National Helpline, National Domestic Violence Hotline, and family support.", body)

OD_SRC = [
    ("American Red Cross: Opioid overdose first aid", "https://www.redcross.org/take-a-class/resources/learn-first-aid/opioid-overdose"),
    ("American Red Cross: CPR classes", "https://www.redcross.org/take-a-class/cpr"),
    ("CDC: Lifesaving naloxone", "https://www.cdc.gov/stop-overdose/caring/naloxone.html"),
    ("FDA: FDA approves first over-the-counter naloxone nasal spray", "https://www.fda.gov/news-events/press-announcements/fda-approves-first-over-counter-naloxone-nasal-spray"),
    ("NIAAA (NIH): Understanding the dangers of alcohol overdose", "https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/understanding-dangers-of-alcohol-overdose"),
    ("DEA: Methamphetamine fact sheet", "https://www.dea.gov/factsheets/methamphetamine"),
    ("DEA: GHB fact sheet", "https://www.dea.gov/factsheets/ghb-gamma-hydroxybutyric-acid"),
    ("DEA Get Smart About Drugs: What should you do during a drug overdose?", "https://www.getsmartaboutdrugs.gov/consequences/what-should-you-do-during-drug-overdose"),
    ("SAMHSA's National Helpline", "https://www.samhsa.gov/find-help/helplines/national-helpline"),
    ("Poison Control (poison.org)", "https://www.poison.org/"),
]

def build_overdose():
    src = "; ".join(f'<a href="{u}" rel="noopener">{n}</a>' for n, u in OD_SRC)
    body = f"""<div class="fam-strip" role="region" aria-label="Call for help now"><a class="btn danger fam-big" href="tel:911">Call 911 now</a>
<button class="btn ghost fam-exit" type="button" id="quick-exit" aria-label="Quick exit, leaves this site">Quick exit, leaves this site<span class="small fam-esc"> (Esc)</span></button>
<span class="small fam-exit-note">Quick exit won't clear your browser history. A private window is safer.</span></div>
<p><strong>Say it's an overdose. Stay with them and do what the 911 dispatcher tells you.</strong></p>
<p>This is general first aid information, not medical training. Always follow the 911 dispatcher.</p>
<h1>What to do in an overdose</h1>
<section class="card mt" id="steps"><h2 class="mt0">What to do</h2>
<ol>
<li><strong>Check the scene is safe</strong> for you and them.</li>
<li><strong>Call <a href="tel:911">911</a></strong> and say it's an overdose.</li>
<li><strong>If they're breathing,</strong> roll them onto their side.</li>
<li><strong>If they're not breathing,</strong> start CPR as the 911 dispatcher directs, and use an AED if one is available.</li>
<li><strong>Naloxone (Narcan).</strong> If opioids might be involved and you have naloxone, use it as the package directs. Don't delay CPR to do it.</li>
<li><strong>Stay with them</strong> until help arrives.</li>
<li><strong>Tell the paramedics</strong> what they took, how much and when, if you know.</li>
</ol>
<details class="more"><summary>More info</summary>
<p>Keep them from getting too cold or too hot, and tell them help is on the way.</p>
<p><strong>Good Samaritan laws.</strong> The CDC says Good Samaritan laws are in place in most states to protect people who are overdosing, and anyone helping them, from criminal penalties. They vary by state. The DEA's Get Smart About Drugs says they generally cover minor offenses like simple possession, not selling or trafficking. Don't let worry stop you calling 911.</p>
</details></section>
<section class="card mt" id="signs"><h2 class="mt0">Signs of an overdose</h2>
<p>They don't need to have every sign. If you're worried, call <a href="tel:911">911</a>.</p>
<details class="more"><summary>More info</summary>
<h3>Opioids (like heroin, fentanyl, oxycodone or codeine)</h3>
<ul><li>Not responding</li><li>Breathing slowly, or only a few times a minute</li><li>Gasping or gurgling</li><li>Bluish or grayish skin</li></ul>
<h3>Alcohol</h3>
<ul><li>Confusion, or can't stay awake or be woken</li><li>Vomiting</li><li>Seizures</li><li>Slow or irregular breathing</li><li>Slow heart rate and clammy skin</li><li>Very low body temperature, bluish skin or paleness</li></ul>
<h3>Stimulants (like meth)</h3>
<ul><li>Agitation, anxiety or paranoia</li><li>Fast heart rate and high body temperature</li><li>Seizures (convulsions)</li><li>Signs of a stroke or heart attack</li></ul>
<h3>GHB</h3>
<ul><li>Unconsciousness</li><li>Seizures</li><li>Greatly slowed breathing and a slow heart rate</li><li>Vomiting</li></ul>
</details></section>
<section class="card mt" id="dont"><h2 class="mt0">What not to do</h2>
<ul><li>Don't leave them alone.</li><li>Don't assume they'll be fine sleeping it off.</li><li>Don't rely on cold showers, coffee or walking them around. They don't reverse an alcohol overdose and could make things worse.</li></ul></section>
<section class="card mt" id="after"><h2 class="mt0">Afterward</h2>
<p><strong>They still need medical care, even if they wake up.</strong> Naloxone's effects often wear off before the opioid's do.</p>
<details class="more"><summary>More info</summary>
<p>The CDC says that if you give naloxone, stay with them until emergency help arrives, or for at least four hours, to make sure their breathing returns to normal.</p>
<p>For questions about a possible poisoning or medicine mix-up when they're awake and well, call Poison Help at <a href="tel:18002221222">1-800-222-1222</a>. If they collapse, have a seizure, have trouble breathing or can't be woken, call 911.</p>
<p>For a crisis, including a substance use crisis, call or text <a href="tel:988">988</a>. For treatment referrals, call SAMHSA's National Helpline at <a href="tel:18006624357">1-800-662-4357</a>.</p>
<div class="btn-row"><a class="btn ghost" href="tel:18002221222">Poison Help 1-800-222-1222</a><a class="btn ghost" href="tel:988">Call 988</a><a class="btn ghost" href="tel:18006624357">SAMHSA 1-800-662-4357</a></div></details></section>
<section class="card mt" id="naloxone"><h2 class="mt0">Naloxone (Narcan) and first aid classes</h2>
<p>The FDA approved Narcan naloxone nasal spray for over-the-counter use, without a prescription. The CDC says naloxone is available over the counter in all 50 states, at places like pharmacies, convenience stores, grocery stores and gas stations.</p>
<details class="more"><summary>More info</summary>
<p>Naloxone only reverses opioid overdoses, but the CDC says it won't harm someone who is overdosing on other drugs.</p>
<p>A first aid or CPR class teaches you these skills hands-on. The American Red Cross runs classes across the US.</p>
<div class="btn-row"><a class="btn ghost" href="https://www.cdc.gov/stop-overdose/caring/naloxone.html" rel="noopener">CDC: naloxone</a><a class="btn ghost" href="https://www.redcross.org/take-a-class/cpr" rel="noopener">Red Cross CPR classes</a></div></details></section>
<p class="small"><strong>Sources:</strong> {src}. Last checked: 5 Nov 2026.</p>
<p class="small">HomeCircle is a free support app, not medical care, and isn't part of any service listed here.</p>
<script src="assets/quick-exit.js" defer></script>"""
    page("overdose.html", "help.html", "What to do in an overdose – HomeCircle", "Signs of overdose and what to do: call 911, CPR, naloxone (Narcan), Good Samaritan laws. US sources.", body)

def build_support():
    body = f"""<h1>HomeCircle Support</h1>
<p class="lede">Help with the HomeCircle website, and how to contact us.</p>
<div class="notice"><strong>In crisis or need help now?</strong> HomeCircle is not an emergency service. Call <a href="tel:911">911</a> in an emergency, or call or text <a href="tel:988">988</a>. <a href="help.html">More helplines</a>.</div>
<h2>Contact us</h2>
<div class="card"><p>Email: <a href="mailto:{L["supportEmail"]}">{L["supportEmail"]}</a></p><p>Please include your device and a short description of the issue. This email is not a crisis line.</p></div>
<h2 id="website">About this website</h2>
<h3>Do I need an account?</h3><p>No. The website has no accounts and no sign-in, and everything on it is free.</p>
<h3>Does the website collect my data?</h3><p>No. There are no cookies, ads, trackers, analytics or third-party scripts or fonts, and nothing you save is sent to HomeCircle. Like any website, our web host, GitHub, logs visits. See the <a href="{PRIVACY}">Privacy Policy</a> and <a href="{HEALTH_PRIVACY}">Consumer Health Data Privacy Policy</a>.</p>
<h3>What does the website save, and where?</h3><p>Only what you choose to save: {SAVED_FEATURES}. It stays in this browser's local storage, on this device. Private browsing or clearing your browser data removes it.</p>
<h2>Privacy and terms</h2><p>Read the <a href="{PRIVACY}">Privacy Policy</a>, <a href="{HEALTH_PRIVACY}">Consumer Health Data Privacy Policy</a> and <a href="{TERMS}">Terms of Use</a>. {E(BROWSER_ONLY)}</p>"""
    page("support.html", "support.html", "Support – HomeCircle", "Get help with the HomeCircle website: contact, FAQs and crisis support.", body)


# ---------- meetings (links to official finders) ----------
def meetings_list_slot():
    """Same place as the AU page's #finder / #results block.

    Return any future US meeting-list markup from here so both sites keep the
    same section order: title, list (when there is one), kinds, official finders.
    Emit nothing visible until there is a US list. No heading, placeholder or
    coming-soon box.
    """
    return ""

def build_meetings():
    """A links-only Find a meeting page. Finder cards are listed A to Z."""
    finders = [
        (
            "Al-Anon and Alateen",
            "Official Al-Anon meeting search for families and friends affected by someone else's drinking. The groups listed may meet in person, as a hybrid, or electronically. A separate official search lists Alateen meetings.",
            [
                ("Open Al-Anon meeting search", "https://al-anon.org/al-anon-meetings/find-an-al-anon-meeting/"),
                ("Open Alateen meeting search", "https://al-anon.org/al-anon-meetings/find-an-alateen-meeting/"),
            ],
        ),
        (
            "Alcoholics Anonymous",
            "aa.org's Find A.A. page points you to local AA offices and their meeting lists, and to the Meeting Guide app, which lists in-person and online meetings.",
            [
                ("Open Find A.A.", "https://www.aa.org/find-aa"),
                ("Open Meeting Guide app", "https://www.aa.org/meeting-guide-app"),
            ],
        ),
        (
            "Gamblers Anonymous",
            "Official Gamblers Anonymous Find a Meeting page, with US in-person, virtual and telephone meetings.",
            [("Open GA meeting finder", "https://gamblersanonymous.org/find-a-meeting/")],
        ),
        (
            "Narcotics Anonymous",
            "Official Find NA page. NA meetings can be in-person or virtual. It points you to local NA websites and phonelines, and has a virtual meeting search.",
            [("Open Find NA", "https://na.org/meetingsearch/")],
        ),
        (
            "Online Intergroup of Alcoholics Anonymous",
            "Official Online Intergroup of Alcoholics Anonymous directory of online meetings worldwide, in video, telephone, email or chat formats.",
            [("Open Online Intergroup directory", "https://aa-intergroup.org/oiaa/")],
        ),
        (
            "Porn Addicts Anonymous",
            "Official Porn Addicts Anonymous meetings calendar, including Discord meetings.",
            [("Open PAA meetings calendar", "https://parec.org/meetings")],
        ),
        (
            "SMART Recovery USA",
            "Official SMART Recovery meeting finder for in-person and online meetings in the United States.",
            [("Open SMART Recovery meeting finder", "https://meetings.smartrecovery.org/")],
        ),
    ]
    cards = []
    for title, blurb, links in finders:
        btns = "".join(
            f'<a class="btn ghost" href="{E(url)}" rel="noopener">{E(label)}</a>'
            for label, url in links
        )
        cards.append(
            f'<div class="card"><h3 class="mt0">{E(title)}</h3><p>{E(blurb)}</p>'
            f'<div class="btn-row">{btns}</div></div>'
        )
    kinds = [
        ("In person", "A meeting you go to in a room, or sometimes outdoors."),
        ("Online (video)", "A meeting you join on a video call."),
        ("Phone or audio only", "A meeting you join by telephone, or online with the camera off."),
        ("Open", "Anyone can sit in and listen, including family and friends."),
        ("Closed", "For people who want to stop drinking or using."),
    ]
    kind_cards = "".join(
        f'<div class="card"><h3 class="mt0">{E(title)}</h3><p>{E(blurb)}</p></div>'
        for title, blurb in kinds
    )
    # Section order matches the AU meetings page, so a future list can slot in
    # on both sites: title and lede, list slot, kinds / about, official finders.
    body = f"""<h1>Find a meeting</h1>
<p class="lede">Official meeting finders from the groups themselves.</p>
<p>Meeting times change, so check with the group before you go. For any health concern, talk to your doctor. HomeCircle is support, not medical care.</p>
{meetings_list_slot()}
<h2 id="kinds">Kinds of meetings</h2>
<p>Meetings may be in person, online (including video), or by phone. Some are open and some are closed. Other groups may use these words with their own rules. Check each meeting's listing to see if it's open or closed, and how you can attend.</p>
<div class="grid g2">{kind_cards}</div>
<p class="small">You can also read more about kinds of meetings on AA's own site: <a href="https://www.aa.org/information-about-meetings" rel="noopener">What to Expect at an A.A. Meeting</a>, and <a href="https://www.aa.org/faq/can-i-attend-meeting-online-or-phone" rel="noopener">attending a meeting online or by phone</a>.</p>
<h2 id="finders">Official meeting finders</h2>
<p>These are listed A to Z. A link here is not a recommendation or a ranking.</p>
<p>HomeCircle is independent and isn't affiliated with or endorsed by any group listed here.</p>
<div class="grid g3">{"".join(cards)}</div>"""
    page(
        "meetings.html",
        "meetings.html",
        "Find a meeting – HomeCircle",
        "Official US meeting finders for AA, NA, GA, SMART Recovery, Al-Anon, Alateen and Porn Addicts Anonymous. HomeCircle is independent and isn't affiliated with these groups.",
        body,
    )


def build_legal():
    # Hale's US legal review (5 Nov 2026), items 1 and 4, and Hale's US static wording file (10 Nov 2026).
    updated = "10 November 2026"
    mail = f'<a href="mailto:{L["supportEmail"]}">{L["supportEmail"]}</a>'
    page("privacy.html", "", "Privacy Policy – HomeCircle", "HomeCircle US privacy policy: what our web host logs, what your browser saves, email, and consumer health data.", f"""<h1>Privacy Policy</h1>
<p><strong>Privacy Policy.</strong> Last updated {updated}. HomeCircle is run by Luke Endrody (sole trader), Queensland, Australia, ABN 53 687 374 897. Contact: {mail}.</p>
<h2>What we collect</h2><p>We don't collect anything through the site itself. There are no accounts, cookies, ads, trackers or analytics, and we don't sell or share personal data or use it for ads. Our web host does keep technical records of visits, as explained under "Our web host".</p>
<h2>What your browser saves</h2><p>Some features save your choices in this browser's local storage, on this device only: {E(SAVED_FEATURES)}. We can't see them. To delete them, change the setting back or clear this site's data in your browser. Private browsing removes them when you close the window.</p>
<h2 id="host">Our web host</h2><p>The site is hosted on GitHub Pages, run by GitHub (part of Microsoft). When you visit a page, your browser asks GitHub for it, and GitHub automatically receives standard request data, such as your IP address, browser type and the page requested, to deliver and secure the site. GitHub handles that data under <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">its own privacy statement</a>. We can't see or use those records. Because this is a recovery website, a visit itself may say something about your health; if that worries you, use private browsing or a network you trust.</p>
<h2>If you email us</h2><p>We get your email address and what you write. We use it only to reply, and we delete it when it is no longer needed. Our email is forwarded through ImprovMX to Gmail. Please don't send health details you'd rather keep private.</p>
<h2 id="health">Consumer health data</h2><p>See our <a href="{HEALTH_PRIVACY}">Consumer Health Data Privacy Policy</a>.</p>
<h2>Adults only</h2><p>HomeCircle is for people 18 and over. We don't knowingly collect information from children under 13 (or anyone under 18).</p>
<h2>Changes</h2><p>We'll post any changes here with a new date.</p>""")
    page("terms.html", "", "Terms of Use – HomeCircle", "HomeCircle US terms of use.", f"""<h1>Terms of Use</h1>
<p><strong>Terms of Use.</strong> Last updated {updated}. These terms are between you and Luke Endrody (sole trader), Queensland, Australia, ABN 53 687 374 897, who runs HomeCircle. Contact: {mail} (not a crisis line).</p>
<h2>18+ only</h2><p>You must be 18 or older to use HomeCircle.</p>
<h2>Support, not medical care</h2><p>HomeCircle is general wellness and peer-support information. It is not a medical device, not medical advice, diagnosis or treatment, and not an emergency or crisis service. In an emergency call <a href="tel:911">911</a>. For crisis support call or text <a href="tel:988">988</a>.</p>
<h2>Not affiliated</h2><p>HomeCircle is independent and isn't affiliated with or endorsed by Alcoholics Anonymous, Narcotics Anonymous, Gamblers Anonymous, Al-Anon, Nar-Anon or Porn Addicts Anonymous. Their names belong to them. Links go to their own sites, which we don't control.</p>
<h2>Free, as is</h2><p>HomeCircle is free. We try to keep it accurate and working, but we provide it "as is". We can't promise it will always be available, error-free, or that helpline details won't change. Check the service's own site.</p>
<h2>Our liability</h2><p>To the extent the law allows, we are not liable for indirect or consequential loss from using the site. Nothing in these terms limits liability that can't legally be limited, such as for gross negligence, willful misconduct, or death or personal injury caused by negligence. Nothing in these terms takes away rights you have under the consumer laws where you live.</p>
<h2>Law and disputes</h2><p>These terms are governed by the laws of Queensland, Australia. You may also be able to bring a claim in the courts where you live. There is no arbitration and no class-action waiver. Please email us first so we can try to sort it out.</p>
<h2>Changes</h2><p>We may update these terms and will post the new date here.</p>""")
    # Hale's US static wording file (10 Nov 2026), section 2.
    page(HEALTH_PRIVACY, "", "Consumer Health Data Privacy Policy – HomeCircle", "HomeCircle's Consumer Health Data Privacy Policy for the US: what we collect, our web host, email, your rights, appeals and adults only.", f"""<h1>Consumer Health Data Privacy Policy</h1>
<p><strong>Consumer Health Data Privacy Policy.</strong> Last updated {updated}. This policy covers consumer health data under Washington's My Health My Data Act and similar laws in Nevada, Connecticut and other states. HomeCircle is run by Luke Endrody (sole trader), Queensland, Australia, ABN 53 687 374 897. Contact: {mail} (not a crisis line).</p>
<p><strong>What we collect.</strong> We don't collect consumer health data through the site. There are no accounts, forms, cookies, ads, trackers or analytics. Anything you choose to save stays in your browser on your device, and we can't see it.</p>
<p><strong>Our web host.</strong> GitHub, our web host, automatically records technical data when you visit a page, such as your IP address and the page requested. Because this is a recovery website, those records could suggest something about your health. GitHub uses them to deliver and secure the site under its own privacy statement. We don't receive, use, sell or share them.</p>
<p><strong>If you email us.</strong> If you choose to email us health information, we get your email address and what you write, through our email forwarding service (ImprovMX) and our email provider (Google Gmail). We use it only to reply to you and delete it when it is no longer needed. We never sell it, never use it for ads, and never share it with anyone else except those service providers, who handle it only to deliver our email.</p>
<p id="rights"><strong>Your rights.</strong> You can ask us to confirm whether we hold your consumer health data, to see it and the providers it went through, or to delete it, and you can withdraw any consent. Email {mail}. We'll reply within 45 days, and may take 45 more days if needed, in which case we'll tell you why.</p>
<p id="appeals"><strong>Appeals.</strong> If we refuse your request, reply to our answer to appeal. We'll respond within 45 days and explain our decision. If you're still unhappy, you can contact your state attorney general (for Washington: <a href="https://www.atg.wa.gov/file-complaint" rel="noopener">https://www.atg.wa.gov/file-complaint</a>).</p>
<p><strong>Adults only.</strong> HomeCircle is for adults 18 and over and isn't directed to children.</p>
<p><strong>Changes.</strong> We'll post any changes here with a new date.</p>""")

# ---------- sitemap and robots ----------
def build_sitemap():
    urls = "".join(f"  <url><loc>{canonical(p)}</loc></url>\n" for p in sorted(BUILT))
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")

build_home(); build_library(); build_steps(); build_meditations(); build_meetings(); build_help(); build_overdose(); build_support(); build_legal()
for i in C["items"]:
    build_item(i)
build_books()
build_sitemap()
print("built")
