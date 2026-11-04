"""One-off: turn the AU app-content.json into the US v1 content. Run once; output replaces tools/app-content.json."""
import json, re, pathlib
P = pathlib.Path(__file__).parent / "app-content.json"
C = json.loads(P.read_text())
keep_steps = (C["twelveSteps"], C["twelveStepsCopy"])  # 12 Steps wording stays exactly as AU
SUBS = [(r"counsell", "counsel"), (r"Counsell", "Counsel"), (r"talk to your GP or a doctor", "talk to your doctor"),
        (r"\byour GP\b", "your doctor"), (r"\ba GP\b", "a doctor"), (r"call 000", "call 911"), (r"[Mm]inimis", lambda m: m.group(0)[0] + "inimiz")]
def fix(x):
    if isinstance(x, str):
        for a, b in SUBS: x = re.sub(a, b, x)
        return x
    if isinstance(x, list): return [fix(v) for v in x]
    if isinstance(x, dict): return {k: fix(v) for k, v in x.items()}
    return x
C = fix(C); C["twelveSteps"], C["twelveStepsCopy"] = keep_steps
NA = "HomeCircle is independent and isn't affiliated with or endorsed by Alcoholics Anonymous, Narcotics Anonymous, Gamblers Anonymous, Al-Anon, Nar-Anon or Porn Addicts Anonymous."
L = C["legal"]
L.update(ownerPlace="Queensland, Australia", notAffiliated=NA,
         privacyURL="privacy.html", termsURL="terms.html",
         gpLine="For any health concern, talk to your doctor. HomeCircle is support, not medical care.")
for k in ["adisName", "adisNumber", "adisNote", "nationalName", "nationalNumber", "nationalNote", "supportURL"]: L.pop(k, None)
C["crisis"].update(accessibilityHint="Opens Call 911 and Call or text 988.", sheetIntro="If you or someone else is in danger, call 911. The 988 Suicide & Crisis Lifeline is there 24/7 by call, text or chat.")
C["helplines"] = {}
C["items"] = [i for i in C["items"] if i["category"] != "body"]
C["stages"], C["stats"], C["stageSources"] = [], [], []
for i in C["items"]:
    if i["id"] == "guide-stress":
        i["paragraphs"] = [p for p in i["paragraphs"] if "Australians" not in p]
        i["paragraphs"][-1] = "If worry or panic is getting in the way of daily life, a doctor can help. You can call or text 988 any time. In an emergency call 911."
    i["paragraphs"] = [NA if p.startswith("HomeCircle is independent") else p for p in i["paragraphs"]]
for b in C["backgrounds"].values():
    b["sources"] = [s for s in b["sources"] if ".au/" not in s["url"] and not s["url"].endswith(".au")]
    b["origin"] = b["origin"].replace("A US counseling guide", "A counseling guide")
FELL = {
 "fell-aa": dict(title="Alcoholics Anonymous", summary="AA's own US pages are on aa.org. HomeCircle does not host the literature.",
   paragraphs=["Alcoholics Anonymous publishes its own literature and local contacts on aa.org. HomeCircle does not copy that text.", "aa.org doesn't list meetings itself. Its Find A.A. page points you to local A.A. offices and their meeting lists, and to online groups.", NA, "Groups decide their own format."],
   links=[{"title": "A.A. website (aa.org)", "url": "https://www.aa.org/"}, {"title": "Find A.A. near you", "url": "https://www.aa.org/find-aa"}]),
 "fell-na": dict(title="Narcotics Anonymous", summary="NA World Services' own pages are on na.org. HomeCircle does not host the literature.",
   paragraphs=["Narcotics Anonymous publishes its own literature on na.org. HomeCircle does not copy that text.", "NA World Services doesn't keep a database of in-person meetings. Its Find NA page points you to local NA websites and phonelines, and has a virtual meeting finder.", NA],
   links=[{"title": "NA World Services (na.org)", "url": "https://na.org/"}, {"title": "Find NA near you", "url": "https://na.org/meetingsearch/"}]),
 "fell-ga": dict(title="Gamblers Anonymous", summary="Gamblers Anonymous: meetings in person, online or by phone, and a national hotline.",
   paragraphs=["Gamblers Anonymous is for people who think they might have a gambling problem. There are no dues or fees.", "Meetings run in person, online and by phone. The national hotline listed on its site is 855-222-5542.", NA],
   links=[{"title": "Gamblers Anonymous (gamblersanonymous.org)", "url": "https://gamblersanonymous.org/"}], phoneDisplay="855-222-5542", phoneDial="8552225542"),
 "fell-pa": dict(summary="The fellowship site is separate. If you need to talk today, call or text 988.",
   paragraphs=["If you need to talk today, call or text 988. The 988 Lifeline is not run by a fellowship.", "Porn Addicts Anonymous has its own site. HomeCircle does not host program literature.", NA],
   phoneDisplay="988", phoneDial="988"),
}
for i in C["items"]:
    if i["id"] in FELL:
        f = FELL[i["id"]]
        if "links" in f: f["links"] = [dict(id=f"l{n}", inAppMeetings=False, **l) for n, l in enumerate(f["links"])]
        f.setdefault("phoneDisplay", None); f.setdefault("phoneDial", None)
        i.update(f)
P.write_text(json.dumps(C, indent=1, ensure_ascii=False))
