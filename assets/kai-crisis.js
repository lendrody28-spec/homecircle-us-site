/* Kai crisis check for the HomeCircle websites (AU and US).
   A plain JavaScript port of KaiCrisis.swift from the HomeCircle iOS app, 1.3.0 build 31,
   commit 149628f (signed off by Finn, 4 Nov 2026). The same file is used by both sites;
   only the phone numbers in the replies change, through REGIONS below.
   Website-only additions to the build 31 phrase lists are marked "WEB:".
   Checked in this browser only, with no network. Kai can miss things.

   How it works (same as the app):
   1. canonical() lowercases, straightens curly quotes, expands contractions ("he'll" -> "he will",
      "I'm" -> "i am", "can't" -> "cant", "OD'd" -> "od"), turns every other character that isn't a
      letter or digit into a space, and collapses spaces.
   2. A few known everyday phrases are masked out, looking only at the words that follow.
   3. Short regexes are matched with \b word boundaries.
   Negation is not applied: "I'm not suicidal" still shows the help numbers. A missed crisis is worse. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api; else root.HCKaiCrisis = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- Region numbers (only the replies change) ---------- */
  var REGIONS = {
    AU: {
      emergency: "000", crisisLine: "Lifeline", crisisNumber: "13 11 14",
      replies: {
        selfHarm: "If you might act on this, call 000 now. Lifeline is 13 11 14. Kai is a recovery buddy, not a counsellor, and can't diagnose.",
        emergency: "Call 000 now if you or anyone else is in danger. Lifeline is 13 11 14, any time. Please make the call yourself. Kai can't call anyone and can miss things.",
        familyHarm: "Call 000 now if anyone is in danger. Please keep everyone safe: step away and give yourself space. Lifeline is 13 11 14. Men's Referral Service is 1300 766 491, for help to stop using violence. Please make the call yourself. Kai can't call anyone and can miss things.",
        familyViolence: "Call 000 now if you or anyone else is in danger. Lifeline is 13 11 14. 1800RESPECT is 1800 737 732, 24 hours, for family and domestic violence. Please call one of them yourself. Kai can't call anyone and can miss things.",
        medical: "This sounds like a medical emergency. Call 000 now and ask for an ambulance. Stay with the person if it's safe. Lifeline is 13 11 14. Kai can't call anyone, so please make the call yourself."
      }
    },
    US: {
      emergency: "911", crisisLine: "988 Suicide & Crisis Lifeline", crisisNumber: "988",
      replies: {
        selfHarm: "If you might act on this, call 911 now. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. Kai is a recovery buddy, not a counselor, and can't diagnose. Kai can miss things, so please reach out yourself.",
        emergency: "Call 911 now if you or anyone else is in danger. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. Please make the call yourself. Kai can't call anyone and can miss things.",
        familyHarm: "Call 911 now if anyone is in danger. Please keep everyone safe: step away and give yourself space. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. Please make the call yourself. Kai can't call anyone and can miss things.",
        familyViolence: "Call 911 now if you or anyone else is in danger. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. The National Domestic Violence Hotline is 1-800-799-7233, 24/7. Please call one of them yourself. Kai can't call anyone and can miss things.",
        medical: "This sounds like a medical emergency. Call 911 now and ask for an ambulance. Stay with the person if it's safe. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. Kai can't call anyone and can miss things, so please make the call yourself."
      }
    }
  };

  /* ---------- Normalising (KaiEngine.normalizeForMatch + KaiCrisis.canonical) ---------- */
  function normalizeForMatch(text) {
    var f = String(text == null ? "" : text).trim().toLowerCase();
    var swaps = [["\u2018", "'"], ["\u2019", "'"], ["\u201A", "'"], ["\u201B", "'"], ["\u2032", "'"], ["\u00B4", "'"], ["`", "'"],
      ["\u201C", "\""], ["\u201D", "\""], ["\u201E", "\""], ["\u201F", "\""], ["\u2013", "-"], ["\u2014", "-"]];
    swaps.forEach(function (s) { f = f.split(s[0]).join(s[1]); });
    return f;
  }

  var wordFixes = {
    cannot: ["cant"], carnt: ["cant"], cnt: ["cant"],
    wanna: ["want", "to"], gonna: ["going", "to"], gunna: ["going", "to"],
    im: ["i", "am"], ive: ["i", "have"],
    ill: ["i", "will"],
    hell: ["he", "will"],
    itll: ["it", "will"], theyll: ["they", "will"], shell: ["she", "will"],
    dont: ["dont"], wont: ["wont"], isnt: ["isnt"],
    u: ["you"], ur: ["your"], bf: ["boyfriend"], gf: ["girlfriend"],
    mom: ["mum"], mother: ["mum"], father: ["dad"],
    stepdad: ["dad"], stepmum: ["mum"], stepmom: ["mum"],
    kms: ["kms"], selfharm: ["self", "harm"]
  };
  var own = Object.prototype.hasOwnProperty;

  function canonical(text) {
    var f = normalizeForMatch(text);
    f = f.replace(/\bo\.?d\.?'(?:e?d)\b/g, "od");
    f = f.replace(/'ll\b/g, " will").replace(/'m\b/g, " am").replace(/'re\b/g, " are").replace(/'ve\b/g, " have");
    f = f.replace(/'/g, "");
    f = f.replace(/[^\p{L}\p{N}]/gu, " ");
    var words = [];
    f.split(" ").forEach(function (w) { if (w) words = words.concat(own.call(wordFixes, w) ? wordFixes[w] : [w]); });
    var joined = [];
    words.forEach(function (w) {
      if (w === "not" && joined[joined.length - 1] === "can") joined[joined.length - 1] = "cant"; else joined.push(w);
    });
    return joined.join(" ");
  }

  /* ---------- Masks (known everyday phrases) ---------- */
  var masks = [
    /\bsuicide call ?back( service)? (number|line|phone number|phone|contact|details)\b/g,
    /\b(cut|cutting) myself (while )?shaving\b/g,
    /\b(cut|cutting) (myself|my self) off\b/g,
    /\b(cant|couldnt|could not) go on (a |the |my |our |this |that |next )?(holiday|holidays|trip|vacation|leave|cruise|camp|tour|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|excursion)\b/g,
    /\bcant breathe (through|out of|with) (my|the|your) nose\b/g,
    /\bcant breathe (in|out) (for|that long|so long|as long)\b/g,
    /\b(not|isnt|is not|stopped) breathing down\b/g,
    /\b(\d+|a few|few|couple of|couple|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred|half|many|more|extra) kms\b/g,
    /\b(ran|run|running|did|do|doing|walked|walk|walking|rode|ride|riding|cycled|cycling|drove|drive|driving|swam|hiked) (\w+ )?kms\b/g,
    /\bhurt (\w+ )?feelings\b/g,
    // WEB: "988 training", "fentanyl test strips": talking about the line or a harm-reduction kit, not a crisis.
    // Only the words that follow are looked at; "I need to call 988" still fires.
    /\b988 (training|trainings|course|courses|workshop|workshops|campaign|launch|anniversary|day|week|poster|posters|ad|ads|sticker|stickers|volunteer|volunteers|counselor training)\b/g,
    /\b(fent|fentanyl) test (strip|strips|kit|kits)( kit| kits)?\b/g
  ];

  function matches(text, patterns) { return patterns.some(function (p) { p.lastIndex = 0; return p.test(text); }); }

  function mask(c) {
    var text = c, wristOrArm = /\b(wrist|wrists|arm|arms)\b/.test(c);
    masks.forEach(function (p) {
      if (wristOrArm && p.source.indexOf("shaving") >= 0) return;
      p.lastIndex = 0; text = text.replace(p, " ");
    });
    return text.split(" ").filter(Boolean).join(" ");
  }

  /* ---------- Word groups ---------- */
  var others = "(him|her|them|someone|somebody|anyone|everyone|people|a person|that guy|this guy|my (housemate|flatmate|neighbou?r|boss|mate|friend))";
  var familyTargets = "((my|the|our) (partner|wife|husband|missus|mrs|hubby|kids?|child|children|baby|babies|son|daughter|mum|dad|boyfriend|girlfriend|fiance|fiancee|ex|brother|sister|family|bub|bubs))";
  var harmVerbs = "(kill|hurt|harm|stab|bash|choke|strangle|shoot|murder|attack|smash|hit|punch|kick|slap)";
  var intent = "(going to|want to|wanted to|will|might|could|about to|ready to|trying to|try to|feel like|plan to|planning to|need to|gotta)";
  var fillers = "( (really|just|actually|fucking|seriously|probably|definitely))?";
  var family = "(partner|husband|wife|boyfriend|girlfriend|fiance|fiancee|ex|dad|mum|brother|sister|son|daughter|uncle|aunt|he|she|hes|shes)";
  var familyGap = "(?: (?:is|was|keeps|kept|keep|has|have|had|just|always|often|sometimes|still|again|really|been|will|would|wont stop|tried to|trying to|going to|threatened to|threatens to|threatening to|said|says|he|she|they|hes|shes|to|and|also|then|even)){0,6}";
  var familyVerbs = "(hits|hit|hitting|beats|beat|beating|bashes|bashed|bashing|chokes|choked|choking|strangles|strangled|strangling|punches|punched|punching|kicks|kicked|kicking|slaps|slapped|slapping|attacks|attacked|abuses|abused|abusing|raped|rapes|hurts|hurt|hurting|kill|stabbed|stab|threatens|threatened|threatening|stalking|stalks)";
  var pills = "(pills|tablets|meds|medication|medications|painkillers|panadol|sleeping pills|valium|xanax|oxys?|endone)";
  function R(s) { return new RegExp(s); }

  /* ---------- Patterns ---------- */
  var familyHarmPatterns = [
    R("\\b" + intent + fillers + " " + harmVerbs + " " + familyTargets + "\\b")
  ];

  var emergencyPatterns = [
    R("\\b" + intent + fillers + " " + harmVerbs + " " + others + "\\b"),
    /\b(someone|somebody|people|a man|a guy|a woman|this guy|some guy|strangers?)( \w+){0,5} (is |are |keeps |keep |going to |trying to |wants to |will )?(hurting|hitting|attacking|beating|bashing|threatening|following|chasing|kill|hurt|attack|stab|shoot|rape|raping) me\b/,
    /\b(someone|somebody) (is |has )?(broken|breaking) in\b/,
    R("\\b" + intent + fillers + " (smash|bash|kick|cave|punch|stomp) (his|her|their|your|someones|somebodys|that guys|this guys) (head|face|skull)( in)?\\b")
  ];

  var familyViolencePatterns = [
    R("\\b" + family + familyGap + " " + familyVerbs + " me\\b"),
    R("\\b" + family + familyGap + " (wont|will not|doesnt|does not) let me (leave|go|out)\\b"),
    /\b(not|dont feel|never feel|dont|never) safe (at|in my( own)?) home\b/,
    /\bunsafe (at|in my( own)?) home\b/,
    /\b(scared|afraid|frightened|terrified) to go home\b/,
    /\b(domestic|family) violence\b/,
    /\b(scared|afraid|frightened|terrified) of (my )?(partner|husband|wife|boyfriend|girlfriend|fiance|fiancee|ex|dad|mum|stepdad)\b/
  ];

  var medicalPatterns = [
    /\b(not|isnt|is not|stopped|aint|arent|wasnt) breathing\b/,
    /\bcant breathe\b/,
    /\b(unconscious|unresponsive)\b/,
    /\b(wont|will not|isnt|is not|not) (wake|waking) up\b/,
    /\bcant wake (him|her|them|my \w+|\w+ up)\b/,
    /\b(i|he|she|they|we|hes|shes|theyve|ive|someone|somebody|mate|friend|partner|son|daughter|brother|sister|has|have|just|think|might|may) (has |have |just |probably |might have |may have )?(od|ods|oding|oded)\b/,
    /\b(overdose|overdoses|overdosed|overdosing)\b/,
    R("\\b(took|taken|take|taking|had|swallowed) too many( \\w+){0,3} " + pills + "\\b"),
    /\b(took|taken|swallowed) (heaps|lots|a lot|a heap|a bunch|loads|a load|a handful|handfuls|all|the whole|a whole|the rest)( (packet|bottle|box|pack|strip))?( of)?( my| the| his| her| those| these)? (pills|tablets|meds|medication|medications|painkillers|panadol|sleeping pills|valium|xanax|oxys?|endone|benzos)\b/,
    /\b(mixed|mixing|mix) (xanax|valium|benzos?|oxys?|endone|pills|meds|tablets|painkillers|sleeping pills|heroin|fent|fentanyl) (and|with) (grog|alcohol|booze|drink|drinks|vodka|beer|wine|goon|xanax|valium|benzos?|heroin|fent|fentanyl|oxys?|pills|meds)\b/,
    /\b(mixed|mixing|mix) (grog|alcohol|booze|drink|drinks|vodka|beer|wine|goon) (and|with) (xanax|valium|benzos?|oxys?|endone|pills|meds|tablets|painkillers|sleeping pills|heroin|fent|fentanyl)\b/,
    /\b(having|had|took|taken|taking) an? (overdose|od)\b/,
    /\b(seizure|seizures)\b/,
    /\b(is|hes|shes|am|are|keeps) (seizing|convulsing)\b/,
    /\b(hes|shes|he is|she is|theyre|they are|baby is|bub is|someone is|i am|my \w+ is) choking\b(?! (me|her|him|them|up|back))/,
    /\bchest pains?\b/,
    /\bpain in my chest\b/,
    /\b(i|he|she|they|someone|somebody|mate|friend|partner|son|daughter|brother|sister|dad|mum|husband|wife)( has| have| just| has just)? collapsed\b/,
    /\bsevere withdrawals?\b/,
    // WEB (US rows, Finn): fentanyl and other strong opioids taken, and someone turning blue.
    // The build 31 OD pattern above already covers "he's ODing" and "she OD'd".
    /\b(took|taken|just took|smoked|snorted|shot up|shot|injected|did|done|had) (some |a lot of |heaps of |too much |more |a bit of )?(fent|fentanyl|nitazenes?|tranq|xylazine)\b(?! (test|strip|strips))/,
    /\bcant feel my (legs|arms|body|face|hands|feet)\b/,
    /\b(turning|turned|gone|going) (blue|purple)\b/,
    /\b(lips|face|skin|fingertips|fingers|nails) (is |are |have |has )?(turned |turning |gone |going )?(blue|purple|grey|gray)\b/
  ];

  var selfHarmPatterns = [
    /\b(kill|killing|killed) (myself|my self)\b/,
    /\bkms\b/,
    /\b(end|ending|take|taking) my (own )?life\b(?! back)/,
    /\bend myself\b/,
    /\b(want|wanted|wanting|going|ready|deserve) to die\b/,
    /\bwish i (was|were) (dead|never born)\b/,
    /\bwish i (wasnt|was not|werent|were not) (alive|here|born|around)( anymore)?\b/,
    /\b(want to|going to|need to|cant stop|keep|kept) (keep )?cutting( myself| again| my \w+)?$/,
    /\b(want to|going to|need to|cant stop) (keep )?cutting (myself|again|my (wrists?|arms?|legs?|thighs?|skin))\b/,
    /\bkil (myself|my self)\b/,
    /\b(drink|drinking|drank) (myself|my self) to death\b/,
    /\b(rope|noose) (is )?(ready|tied|set up|up)\b/,
    /\b(tied|tie|tying|made|making|have|got|bought) a noose\b/,
    /\b(have|got|made|making|have got) a plan to (end it|end my life|kill myself|die|end things)\b/,
    /\b(going to|want to|wanted to|will|about to|ready to|gonna|thinking about|thinking of|planning to|plan to) (jump|jumping) (off|from|in front of) (the |a |that |this |my )?(bridge|building|roof|cliff|balcony|overpass|tower|gap|train|car park|carpark|top floor|truck|bus)\b/,
    /\b(nobody|no one|noone) (would|will|is going to) (care|notice|miss me) if i (was|were|am|died|disappeared|went)( gone| dead| not here| away)?\b/,
    /\bwant to be dead\b/,
    /\bbetter off dead\b/,
    /\b(end|ending) it all\b/,
    R("\\b(took|taken|take|taking|had|swallowed) too many( \\w+){0,3} " + pills + "\\b"),
    /\b(took|taken|swallowed) too many\b(?! (days|times|shifts|hours|breaks|drinks|risks|photos|selfies|notes|classes|steps))/,
    /\b(going to|want to|will|might|gonna) (overdose|od)\b/,
    /\b(overdose|od) on purpose\b/,
    /\b(dont|do not) want to (be here|be alive|live|exist)( anymore)?\b/,
    /\b(suicide|suicidal)\b/,
    /\bself harm(ing)?\b/,
    /\b(hurt|hurting|harm|harming) (myself|my self)\b/,
    /\b(cut|cutting) (myself|my self)\b/,
    /\b(hang|hanging) (myself|my self)\b/,
    /\b(cant|could not|couldnt) go on\b/,
    /\bno (reason|reasons)( left)? to live\b/,
    /\bnothing (left )?to live for\b/,
    /\bno point (in )?(living|being alive|going on)\b/,
    /\b(nobody|no one|noone) (would|will|is going to) (miss|care about) me\b/,
    /\b(unalive|unaliving)\b/,
    /\bun alive\b/,
    /\b(want|wish) (someone|somebody) (to|would) kill me\b/,
    // WEB (US rows, Finn): wanting to call a crisis line, taking all my pills, ending it, not waking up, guns.
    /\b(need to|have to|got to|gotta|going to|want to|about to|should i|should|i will|i might|i am calling|i am texting|im calling) (call|ring|text|phone) (988|911|000|lifeline|the lifeline|a crisis line|the crisis line|suicide (and |& )?crisis lifeline|the suicide (and |& )?crisis lifeline)\b/,
    R("\\b(going to|want to|will|might|about to|ready to|planning to|plan to|thinking about|thinking of|feel like) (take|taking|swallow|swallowing) (all|every one of|the whole|a whole|the rest of|heaps of|a handful of|a bunch of|loads of)( (packet|bottle|box|pack|strip))?( of)?( my| the| those| these)? " + pills + "\\b"),
    /\b(thinking about|thinking of|want to|going to|planning to|plan to|ready to|about to|might|feel like) (end|ending) (it|things|everything)\b(?! (with|between|early|off)\b)/,
    /\b(dont|do not|never) want to wake up\b(?! (early|at|before|so|too|for|in time))/,
    /\b(shoot|shooting) (myself|my self)\b/,
    /\b(gun|pistol|rifle|shotgun|firearm|revolver|glock)( \w+){0,8} (on|at|against|to) (myself|my self|my head)\b/,
    /\b(eat|eating) (a |my )?(gun|bullet)\b/
  ];

  function mentionsWeaponAndHarm(t) {
    return /\b(have|got|grabbed|holding) (a|my|the) (knife|gun|weapon|machete|bat)\b/.test(t) && R("\\b" + harmVerbs + "\\b").test(t);
  }
  function followedAndScared(t) {
    return R("\\b" + family + familyGap + " (wont stop|keeps|keep|is|wont leave me alone and keeps) (following|watching|stalking) me\\b").test(t)
      && /\b(scared|afraid|frightened|terrified|unsafe|not safe)\b/.test(t);
  }

  function routes(text) {
    var m = mask(canonical(text));
    var found = [];
    if (!m) return found;
    if (matches(m, familyHarmPatterns)) found.push("familyHarm");
    if (matches(m, emergencyPatterns) || mentionsWeaponAndHarm(m)) found.push("emergency");
    if (matches(m, familyViolencePatterns) || followedAndScared(m)) found.push("familyViolence");
    if (matches(m, medicalPatterns)) found.push("medical");
    if (matches(m, selfHarmPatterns)) found.push("selfHarm");
    return found;
  }
  var ORDER = ["familyViolence", "familyHarm", "emergency", "medical", "selfHarm"];
  function primaryRoute(found) { for (var i = 0; i < ORDER.length; i++) if (found.indexOf(ORDER[i]) >= 0) return ORDER[i]; return null; }
  function region(code) { return REGIONS[code] || REGIONS.AU; }
  function replyText(route, code) { return region(code).replies[route] || region(code).replies.selfHarm; }
  function isCrisis(text) { return routes(text).length > 0; }

  return { REGIONS: REGIONS, normalizeForMatch: normalizeForMatch, canonical: canonical, mask: mask, routes: routes,
    primaryRoute: primaryRoute, replyText: replyText, region: region, isCrisis: isCrisis };
});
