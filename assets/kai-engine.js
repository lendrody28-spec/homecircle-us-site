/* Kai, HomeCircle's recovery buddy: a plain JavaScript port of KaiEngine.swift and
   KaiFeelings.swift from the HomeCircle iOS app (1.3.0, build 30), with the build 31 crisis check
   (KaiCrisis.swift, commit 149628f) in assets/kai-crisis.js.
   Kai isn't AI and isn't a person. Replies come from fixed rules in this file.
   No network calls. Nothing typed leaves the browser. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api; else root.HCKaiEngine = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";
  function D() { return (root && root.HCKaiData) || { items: {}, steps: {}, stages: [], stats: {}, safetyLine: "", privateDetails: "" }; }

  /* ---------- KaiFeelings ---------- */
  var FEELINGS = ["struggling", "anger", "anxious", "sad", "stress", "lonely"];
  var CHOICE = { struggling: "Can't cope", anger: "Angry", anxious: "Anxious", sad: "Sad or low", stress: "Stressed", lonely: "Lonely" };

  var spellingFixes = {
    stresed: "stressed", stressd: "stressed", strssed: "stressed", streesed: "stressed",
    stresssed: "stressed", stessed: "stressed", stresd: "stressed", stressedout: "stressed",
    anxous: "anxious", anxios: "anxious", anxiuos: "anxious", axious: "anxious",
    anxoius: "anxious", anxius: "anxious", anxiouse: "anxious",
    anxeity: "anxiety", anxity: "anxiety", anxitey: "anxiety", anixety: "anxiety",
    nervus: "nervous", nervouse: "nervous", nervos: "nervous",
    woried: "worried", worred: "worried", wooried: "worried",
    scard: "scared", scaared: "scared", skared: "scared",
    angy: "angry", angery: "angry", anrgy: "angry", angrey: "angry",
    frustated: "frustrated", fustrated: "frustrated", frusterated: "frustrated", frustraited: "frustrated",
    iritated: "irritated", irratated: "irritated", irritaded: "irritated", irrated: "irritated",
    fumin: "fuming", furius: "furious",
    sadd: "sad", upsett: "upset", depresed: "depressed", teery: "teary",
    heartbroke: "heartbroken", heartbrokn: "heartbroken",
    overwelmed: "overwhelmed", overwhelmd: "overwhelmed", overwhlemed: "overwhelmed",
    strugling: "struggling", struggeling: "struggling", strugglin: "struggling",
    lonley: "lonely", lonly: "lonely",
    panicing: "panicking", restles: "restless",
    freakin: "freaking", freaken: "freaking",
    cnt: "cant", cannot: "cant", carnt: "cant",
    shity: "shitty"
  };
  var own = Object.prototype.hasOwnProperty;
  function splitWords(s) { return s.split(/[^\p{L}\p{N}]+/u).filter(function (w) { return w.length; }); }
  function splitLetters(s) { return s.split(/[^\p{L}]+/u).filter(function (w) { return w.length; }); }

  function normalizeForMatch(text) {
    var f = String(text || "").trim().toLowerCase();
    var swaps = [["\u2018", "'"], ["\u2019", "'"], ["\u201A", "'"], ["\u201B", "'"], ["\u2032", "'"], ["\u00B4", "'"], ["`", "'"],
      ["\u201C", "\""], ["\u201D", "\""], ["\u201E", "\""], ["\u201F", "\""], ["\u2013", "-"], ["\u2014", "-"]];
    swaps.forEach(function (s) { f = f.split(s[0]).join(s[1]); });
    return f;
  }

  function tokens(text) {
    var folded = normalizeForMatch(text).split("'").join("");
    var words = splitWords(folded).map(function (w) { return own.call(spellingFixes, w) ? spellingFixes[w] : w; });
    var i = 0;
    while (i + 1 < words.length) {
      if (words[i] === "can" && words[i + 1] === "not") { words[i] = "cant"; words.splice(i + 1, 1); }
      i++;
    }
    return words;
  }

  function set(a) { var o = {}; a.forEach(function (x) { o[x] = true; }); return o; }
  var negators = set(["not", "no", "dont", "never", "isnt", "wasnt", "arent", "aint", "without", "nothing", "nobody", "less"]);
  var softeners = set(["so", "too", "that", "really", "very", "feeling", "feel", "as", "at", "all", "overly", "even", "super", "a", "bit", "the", "im", "being", "to", "getting", "get"]);

  var phrases = {
    struggling: ["struggling", "overwhelmed", "cant cope", "not coping", "cant handle", "cant take it", "cant take this",
      "cant do this", "so over it", "im over it", "over it all", "really over it", "just over it", "bit over it",
      "totally over it", "completely over it", "falling apart", "at my limit", "at the end of my rope", "hopeless", "breaking down"],
    anger: ["angry", "anger", "furious", "fuming", "seething", "livid", "raging", "rage", "pissed off", "pissed at",
      "pissed with", "so pissed", "really pissed", "frustrated", "frustrating", "irritated", "irritable", "annoyed",
      "cranky", "mad at", "so mad", "really mad", "seeing red", "losing it", "lost it", "wound up", "shitty at",
      "shitty with", "ropeable", "spewing", "hot under the collar", "blew up", "snapped"],
    anxious: ["anxious", "anxiety", "nervous", "nervy", "nerves", "worried", "worrying", "worry", "on edge", "edgy",
      "scared", "afraid", "frightened", "terrified", "panic", "panicky", "panicking", "panicked", "freaking out",
      "freaking", "freaked out", "freak out", "shaky", "restless", "jittery", "wired", "buzzing", "cant calm down",
      "cant settle", "cant relax", "uneasy", "heart racing", "racing thoughts", "mind racing"],
    sad: ["sad", "sadness", "upset", "crying", "cried", "cry", "teary", "tearful", "in tears", "sobbing", "bawling",
      "feeling flat", "feel flat", "bit flat", "so flat", "pretty flat", "really flat", "flat today",
      "shitty", "feel like shit", "feeling like shit", "heartbroken", "broken hearted", "gutted", "devastated",
      "miserable", "depressed", "feeling blue", "bummed", "unhappy", "down in the dumps",
      "feel lost", "feeling lost", "so lost", "im lost", "bit lost", "really lost", "totally lost", "lost inside",
      "feel empty", "feeling empty", "so empty", "im empty", "empty inside", "really empty",
      "numb"],
    stress: ["stressed", "stress", "stressful", "stressing", "stressed out", "under pressure", "frazzled", "snowed under",
      "burnt out", "burned out", "burnout", "tense", "overloaded", "too much on", "flat out"],
    lonely: ["lonely", "alone", "isolated", "no one to talk to", "nobody to talk to", "on my own"]
  };
  var stems = { struggling: ["struggl", "overwhelm"], anger: ["frustrat", "irritat"], anxious: ["anxi", "panic", "worr"], sad: ["depress"], stress: ["stress"], lonely: [] };

  var downNotMood = set(["calm", "settle", "slow", "sit", "lie", "lay", "shut", "break", "breaking", "broke", "come", "coming", "came",
    "back", "turn", "put", "write", "look", "go", "going", "went", "cool", "wind", "winding", "upside", "walk",
    "walked", "run", "ran", "step", "stepped", "knock", "knocked", "let", "letting", "track", "hunt", "pin", "cut",
    "play", "water", "hold", "wear", "worn", "get", "got", "fall", "fell", "push", "pushed", "pull", "head", "drive"]);
  var downNextNotMood = set(["to", "the", "there", "here", "south", "for", "with", "at", "stairs", "street", "road", "under"]);
  var lowNextNotMood = set(["key", "battery", "carb", "fat", "sugar", "cost", "price", "risk", "income", "on", "tide"]);

  function negated(w, s) {
    if (s >= 1 && negators[w[s - 1]]) return true;
    if (s >= 2 && negators[w[s - 2]] && softeners[w[s - 1]]) return true;
    if (s >= 3 && negators[w[s - 3]] && softeners[w[s - 2]] && softeners[w[s - 1]]) return true;
    return false;
  }
  function hasPhrase(w, phrase) {
    var parts = phrase.split(" ");
    if (!parts.length || w.length < parts.length) return false;
    for (var s = 0; s <= w.length - parts.length; s++) {
      var ok = true;
      for (var k = 0; k < parts.length; k++) if (w[s + k] !== parts[k]) { ok = false; break; }
      if (ok && !negated(w, s)) return true;
    }
    return false;
  }
  function hasStem(w, stem) {
    for (var i = 0; i < w.length; i++) if (w[i].indexOf(stem) === 0 && !negated(w, i)) return true;
    return false;
  }
  function hasMoodDownOrLow(w) {
    for (var i = 0; i < w.length; i++) {
      var prev = i > 0 ? w[i - 1] : "", next = i + 1 < w.length ? w[i + 1] : "";
      if (w[i] === "down" && !downNotMood[prev] && !downNextNotMood[next] && !negated(w, i)) return true;
      if (w[i] === "low" && !lowNextNotMood[next] && prev !== "lay" && prev !== "lie" && !negated(w, i)) return true;
    }
    return false;
  }
  function shortSadWord(w) {
    if (w.length > 4) return false;
    for (var i = 0; i < w.length; i++) {
      if (["empty", "lost", "flat"].indexOf(w[i]) < 0) continue;
      var next = i + 1 < w.length ? w[i + 1] : "";
      if (w[i] === "flat" && ["out", "tyre", "tire", "white"].indexOf(next) >= 0) continue;
      if (!negated(w, i)) return true;
    }
    return false;
  }
  function feelings(text) {
    var w = tokens(text);
    if (!w.length) return [];
    var found = [];
    FEELINGS.forEach(function (f) {
      var byPhrase = phrases[f].some(function (p) { return hasPhrase(w, p); });
      var byStem = stems[f].some(function (s) { return hasStem(w, s); });
      var byDown = f === "sad" && hasMoodDownOrLow(w);
      var j = w.join(" ");
      var bareOverIt = f === "struggling" && (j === "over it" || j === "over it all");
      var bareSad = f === "sad" && shortSadWord(w);
      if (byPhrase || byStem || byDown || bareOverIt || bareSad) found.push(f);
    });
    if (found.indexOf("anger") >= 0 && found.indexOf("sad") >= 0 && (hasPhrase(w, "shitty at") || hasPhrase(w, "shitty with"))) {
      var others = phrases.sad.filter(function (p) { return p !== "shitty"; });
      if (!others.some(function (p) { return hasPhrase(w, p); }) && !hasMoodDownOrLow(w) && !hasStem(w, "depress")) {
        found = found.filter(function (f) { return f !== "sad"; });
      }
    }
    return found;
  }
  function strongest(found) {
    if (found.indexOf("struggling") >= 0) return "struggling";
    return found.length === 1 ? found[0] : null;
  }
  var calmAsks = ["what can help", "what could help", "what helps", "what might help", "what do you have", "what have you got",
    "what you got", "what can you do", "what do you do", "help me calm down", "help me calm", "help me relax",
    "help me settle", "what tools", "what can i try", "what can i do to calm down", "how do i calm down",
    "how can i calm down", "i need to calm down", "need to calm down"];
  function asksForCalmingTools(text) { var w = tokens(text); return calmAsks.some(function (p) { return hasPhrase(w, p); }); }

  /* ---------- KaiEngine ---------- */
  function freshSession() {
    return { recentReplyIDs: [], topic: null, mood: null, lastSuggestion: null, declined: [], disclaimerShown: false,
      justListen: false, followUpAsked: false, privateShown: false, crisisHeld: false, respectHeld: false, mensReferralHeld: false };
  }
  function copySession(s) { var o = freshSession(); s = s || {}; for (var k in o) if (own.call(s, k)) o[k] = Array.isArray(s[k]) ? s[k].slice() : s[k]; return o; }
  function contains(t, n) { return t.indexOf(n) >= 0; }
  function containsAny(t, ns) { return ns.some(function (n) { return contains(t, n); }); }
  function Q(id, label, chip) { return { id: id, label: label, chip: chip }; }
  var PRACTICE = "practice:";

  /* Crisis check: the build 31 KaiCrisis port in assets/kai-crisis.js, shared by the AU and US sites.
     KAI_REGION picks the phone numbers in the crisis replies. */
  var KAI_REGION = "US";
  var Crisis = (root && root.HCKaiCrisis) || (typeof require === "function" ? require("./kai-crisis.js") : null);
  function crisisRoute(text) { return Crisis ? Crisis.primaryRoute(Crisis.routes(text)) : null; }
  function isCrisis(text) { return crisisRoute(text) != null; }
  function mentionsGambling(f) { return ["gambl", "casino", "betting", "poker", "pokies", "sportsbet", "slot machine"].some(function (n) { return contains(f, n); }); }
  function mentionsPrivateDetails(f) {
    return ["my address", "home address", "bank", "password", "bsb", "send money", "send me money",
      "my number", "phone number", "credit card", "account number", "pick me up"].some(function (n) { return contains(f, n); });
  }
  function shouldMentionGambling(f, route, ctx) {
    if (mentionsGambling(f)) return true;
    return !!(ctx.includesGA && (route === "craving" || contains(f, "craving") || contains(f, "urge")));
  }
  function wantsJustListen(f) { return ["just listen", "only listen", "don't advise", "dont advise", "no advice", "stop suggesting"].some(function (n) { return contains(f, n); }); }
  function isDecline(f) { return ["no", "no thanks", "no thank you", "not now", "nah", "stop", "don't", "dont"].indexOf(f) >= 0; }
  function asksAboutKai(f) {
    return ["are you ai", "are you an ai", "are you a bot", "are you a robot", "are you real", "are you human",
      "are you a person", "are you a counsellor", "are you a counselor", "are you a therapist",
      "are you chatgpt", "are you a real", "you a counsellor", "you a counselor", "you a therapist", "who are you", "what are you", "is this ai", "are you a doctor"]
      .some(function (n) { return contains(f, n); });
  }
  function stepNumber(f) {
    var words = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
    var t = splitWords(f);
    for (var i = 0; i + 1 < t.length; i++) {
      if (t[i] !== "step") continue;
      var next = t[i + 1];
      if (/^\d+$/.test(next)) { var n = parseInt(next, 10); if (n >= 1 && n <= 12) return n; }
      var p = words.indexOf(next); if (p >= 0) return p + 1;
    }
    return null;
  }
  function hasWord(f, word) { return splitLetters(f).indexOf(word) >= 0; }
  function isGreeting(f) {
    return ["hi", "hey", "hello", "hi kai", "hey kai", "hello kai", "good morning", "good night",
      "morning", "evening", "how's it going", "hows it going", "i'm here", "im here"].indexOf(f) >= 0;
  }
  var CHIP_ROUTES = { body: "body", mybody: "body", struggling: "struggling", heavy: "struggling", breathing: "breathing", breathe: "breathing",
    anxious: "anxious", anxiety: "anxious", lonely: "lonely", grateful: "grateful", craving: "craving", slip: "slip", sleep: "sleep",
    anger: "anger", family: "family", milestone: "milestone", meeting: "meeting", ideas: "ideas", stages: "body", stress: "stress",
    grounding: "grounding", ground: "grounding", halt: "halt", steps: "steps", books: "books", walk: "walking", eat: "eating",
    about: "aboutKai", sad: "sad", low: "sad", down: "sad", tools: "calmTools", calm: "calmTools" };
  function intent(f, chip) {
    if (chip) {
      if (own.call(CHIP_ROUTES, chip)) return CHIP_ROUTES[chip];
      if (chip.indexOf(PRACTICE) === 0) return "practice";
    }
    if (contains(f, "just listen")) return "listen";
    if (asksAboutKai(f)) return "aboutKai";
    if (containsAny(f, ["12 step", "twelve step", "the steps", "step one", "first step"]) || stepNumber(f) !== null) return "steps";
    if (containsAny(f, ["big book", "basic text", "aa book", "na book", "recovery book", "literature"])) return "books";
    if (containsAny(f, ["relapse", "slipped", "had a slip", "i drank", "i used", "used again", "picked up", "i picked up"])) return "slip";
    if (containsAny(f, ["can't sleep", "cant sleep", "cannot sleep", "insomnia", "awake all night", "no sleep"])) return "sleep";
    if (containsAny(f, ["got pissed", "got drunk", "got smashed", "got on the piss"])) return "slip";
    var found = feelings(f);
    if (found.length === 1 && found[0] === "anger") return "anger";
    if (containsAny(f, ["my partner", "my wife", "my husband", "the kids", "my family", "couples", "argument at home"])) return "family";
    if (containsAny(f, ["find a meeting", "meeting nearby", "need a meeting", "where is a meeting", "where's a meeting"])) return "meeting";
    if (containsAny(f, ["milestone", "90 days", "one year", "anniversary", "my chip"])) return "milestone";
    if (contains(f, "my body") || contains(f, "how's my body") || contains(f, "hows my body")) return "body";
    if (containsAny(f, ["withdrawal", "withdrawing", "detox", "body stage", "recovery stage", "what happens to my body", "first week sober", "healing timeline", "my liver"])) return "body";
    if (hasWord(f, "halt") || contains(f, "hungry angry")) return "halt";
    if (containsAny(f, ["mindful walk", "walking meditation", "go for a walk", "take a walk"])) return "walking";
    if (containsAny(f, ["mindful eating", "eat mindfully", "eating meditation"])) return "eating";
    if (containsAny(f, ["grounding", "ground me", "54321", "5-4-3-2-1"])) return "grounding";
    if (contains(f, "craving") || contains(f, "urge to")) return "craving";
    var s = strongest(found);
    if (s) return s;
    if (found.length > 1) return "mixedFeelings";
    if (asksForCalmingTools(f)) return "calmTools";
    if (contains(f, "grateful") || contains(f, "thankful")) return "grateful";
    if (f === "heavy") return "struggling";
    if (contains(f, "breathe") || contains(f, "breathing")) return "breathing";
    if (isGreeting(f) || f === "") return "greeting";
    return "default";
  }
  function moodFor(route) {
    return ({ craving: "craving", slip: "craving", lonely: "lonely", sad: "low", anxious: "anxious", stress: "anxious", anger: "angry",
      grateful: "grateful", milestone: "grateful", struggling: "heavy" })[route] || null;
  }

  // Same rule as HealthRules in the app, plus the website's own "Hide breath holds" switch (hideHolds).
  function hidesBreathHolds(h) { h = h || {}; return !!(h.hideHolds || h.heartOrBloodPressure || h.asthmaOrLung || h.pregnancy || h.panicAttacks); }
  function prefersGroundingFirst(h) { return !!(h && h.traumaOrPTSD); }
  function preferredBreathingID(h) { return hidesBreathHolds(h) ? "breath-46" : "breath-box"; }
  function itemTitle(id) { var i = D().items[id]; return i ? i.title : null; }
  function breathingReply(wanted, ctx) {
    var id = hidesBreathHolds(ctx.health) ? "breath-46" : wanted;
    return Q("breathe", itemTitle(id) || "Breathe with me", PRACTICE + id);
  }
  var meditationReply = Q("meditate", "Breathing anchor meditation", "practice:med-breath");
  var walkReply = Q("walk", "Mindful walk", "walk");
  var listenReply = Q("listen", "Just listen", "listen");
  var meetingReply = Q("meeting", "Find a meeting", "meeting");
  var LIFELINE_LINE = "If it gets heavier, you can call or text 988, any time.";
  var BREATHING_OFFER = "Want to try a breathing exercise?";
  var STEPS_ID = "page-twelve-steps", STAGES_ID = "page-body-stages", BOOKS_ID = "page-recovery-books";
  var L = { practice: function (id) { return { practiceID: id }; }, meetings: { openMeetings: true }, help: { openHelp: true }, family: { openFamily: true } };

  function pick(group, options, session) {
    var recent = session.recentReplyIDs.slice(-10), choice = 0;
    for (var i = 0; i < options.length; i++) if (recent.indexOf(group + "#" + i) < 0) { choice = i; break; }
    session.recentReplyIDs.push(group + "#" + choice);
    if (session.recentReplyIDs.length > 10) session.recentReplyIDs.splice(0, session.recentReplyIDs.length - 10);
    return options[choice];
  }
  function reflect(text, session) {
    var clip = Array.from(text).slice(0, 80).join("").trim();
    return pick("reflect", ["I hear you. " + clip, "I'll stay with that. " + clip, "No plan from me. " + clip], session).split("?").join(".");
  }
  function starterReplies(ctx) {
    var r = [Q("craving", "I'm craving", "craving"), meetingReply, listenReply];
    if (ctx.session.declined.indexOf("breathe") >= 0) r = r.filter(function (q) { return q.id !== "craving"; });
    return r.slice(0, 3);
  }
  function stageForDay(day) {
    if (!day || day <= 0) return null;
    return D().stages.filter(function (s) { return day >= s.days[0] && day <= s.days[1]; })[0] || null;
  }
  function bodyStageText(ctx) {
    var parts = ["I can't tell how your body is going, and I won't guess. A doctor can."];
    var stage = stageForDay(ctx.dayCount);
    if (stage && ctx.dayCount) parts.push("Day " + ctx.dayCount + ". " + stage.kaiLine.charAt(0).toUpperCase() + stage.kaiLine.slice(1));
    else parts.push("For questions about withdrawal or how your body is doing, talk to a doctor.");
    var stat = D().stats[(stage && stage.statID) || "adf-withdrawal-weeks"] || null;
    if (stat) parts.push(stat.text + " Source: " + stat.sourceTitle + ".");
    parts.push(D().safetyLine);
    if (ctx.health && ctx.health.recentDetox) parts.push("You noted a recent detox. Stay in touch with your doctor.");
    if (ctx.health && ctx.health.epilepsyOrSeizures) parts.push("You noted seizures. Stop a practice if you feel unwell.");
    return { text: parts.join(" "), stat: stat };
  }
  function greeting(ctx, session, now) {
    var h = now.getHours(), part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    var who = "";
    var dayBit = ctx.dayCount && ctx.dayCount > 0 ? "Day " + ctx.dayCount + ". " : "";
    var Part = part.charAt(0).toUpperCase() + part.slice(1);
    var openers = [
      who + "good " + part + ". " + dayBit + "Good to see you.",
      who + Part + " suits a quiet check-in. " + dayBit,
      who + "I'm here this " + part + ". " + dayBit,
      who + "Hello. " + dayBit + "No agenda.",
      who + "Hey. " + dayBit + "We can keep this short.",
      who + "Good " + part + ". " + dayBit + "One thing at a time.",
      who + "Welcome back this " + part + ". " + dayBit,
      who + dayBit + "Glad you opened this.",
      who + "This " + part + " can be simple. " + dayBit,
      who + "Hi. " + dayBit + "Say what's true, or don't."
    ];
    var text = pick("greet", openers, session).trim();
    // The app starts its first opener lowercase after a name; with no name on the web, capitalise it.
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!session.followUpAsked && (ctx.recentUserLines || []).some(function (l) { return contains(String(l).toLowerCase(), "meeting"); })) {
      text += " How'd the meeting go?"; session.followUpAsked = true;
    }
    return { id: "greet", text: text, offerBreathing: false, replies: starterReplies(ctx), link: null };
  }

  function line(route, ctx, session, now, f, chip) {
    var declinedBreathe = ctx.session.declined.indexOf("breathe") >= 0, text, replies;
    switch (route) {
      case "craving":
        var breath = !declinedBreathe;
        text = pick("craving", [
          "Cravings rise and fall. The Urge plan and HALT in Help are there when you want them.",
          "This wave can pass. Urge plan first, then HALT if you want a second look.",
          "You don't have to obey the craving. HALT and the Urge plan are in the Library."], session);
        session.lastSuggestion = breath ? "breathe" : "guide-urge";
        return { id: "craving", text: text, offerBreathing: breath && !ctx.offeredBreathingToday,
          replies: [Q("urge", "Urge plan", "craving"), Q("halt", "HALT", "halt"), Q("decline", "Not now", "decline")], link: L.practice("guide-urge") };
      case "slip":
        text = pick("slip", ["A slip is information, not a verdict. The next hour can still be yours.",
          "You're here, and that counts. No lecture from me.", "One rough patch doesn't erase the rest of the day."], session);
        session.lastSuggestion = "guide-24h";
        return { id: "slip", text: text, offerBreathing: false, replies: [Q("plan", "24-hour plan", "slip"), meetingReply, listenReply], link: L.practice("guide-24h") };
      case "lonely":
        text = pick("lonely", ["That lonely hour is real. A meeting is one way to not sit in it alone.",
          "You don't have to fill the quiet by yourself.", "Company can be a room, a call, or just staying on this chat."], session);
        session.followUpAsked = true;
        session.lastSuggestion = "meetings";
        return { id: "lonely", text: text, offerBreathing: false, replies: [meetingReply, listenReply], link: L.meetings };
      case "anxious":
        var allowed = !declinedBreathe;
        text = pick("anxious", ["That sounds tight. You don't have to fix the whole day.",
          "Anxiety can shout. A small pause is enough for now.", "We can keep this small. One breath at a time."], session);
        if (allowed) { session.lastSuggestion = "breathe"; text += " " + BREATHING_OFFER; } else text += " Feet on the floor is another way to settle.";
        replies = allowed ? [breathingReply("breath-46", ctx), meditationReply, walkReply] : [Q("ground", "Grounding", "grounding"), walkReply, listenReply];
        return { id: "anxious", text: text, offerBreathing: allowed, replies: replies, link: allowed ? L.practice("breath-46") : L.practice("guide-54321") };
      case "stress":
        var ok = !declinedBreathe;
        text = pick("stress", ["Stress builds up in the body. You can let some of it out without solving everything.",
          "That's a lot to carry. Small steps count.", "Stress can shout. A pause doesn't have to fix anything."], session);
        text += " The Stress and anxiety guide has three small steps.";
        if (ok) { session.lastSuggestion = "breathe"; text += " " + BREATHING_OFFER; }
        replies = ok ? [breathingReply("breath-box", ctx), meditationReply, walkReply] : [meditationReply, walkReply, Q("halt", "HALT check", "halt")];
        return { id: "stress", text: text, offerBreathing: ok, replies: replies, link: L.practice("guide-stress") };
      case "grounding":
        text = pick("grounding", ["Let's come back to the room. Five things you can see is a good start.",
          "Feet on the floor. Then name a few things around you.", "Grounding is simple: what you can see, feel and hear, right now."], session);
        session.lastSuggestion = "guide-54321";
        return { id: "grounding", text: text, offerBreathing: false, replies: [walkReply, listenReply], link: L.practice("guide-54321") };
      case "halt":
        text = pick("halt", ["HALT is a quick check: hungry, angry, lonely or tired. Meeting one need can take the edge off.",
          "Worth a HALT check. Food, a vent, a person or rest might help more than you'd think.",
          "Hungry, angry, lonely, tired. Which one is loudest right now?"], session);
        session.lastSuggestion = "guide-halt";
        return { id: "halt", text: text, offerBreathing: false, replies: [listenReply, meetingReply], link: L.practice("guide-halt") };
      case "walking":
        text = pick("walking", ["A slow walk is a good way to move restless energy. The Mindful walking practice keeps it simple.",
          "Walking counts. Notice your feet, your breath, and what's around you."], session);
        session.lastSuggestion = "med-walk";
        return { id: "walking", text: text, offerBreathing: false, replies: [listenReply], link: L.practice("med-walk") };
      case "eating":
        text = pick("eating", ["Mindful eating is just noticing one snack with your senses. No rules and no diet.",
          "Try one slow bite and notice it. The Mindful eating practice walks you through it."], session);
        session.lastSuggestion = "med-eat";
        return { id: "eating", text: text, offerBreathing: false, replies: [listenReply], link: L.practice("med-eat") };
      case "steps":
        var n = stepNumber(f), st = n ? D().steps[n] : null;
        if (st) text = "In HomeCircle's own words, step " + n + " is about " + st.theme.toLowerCase() + ". " + st.note + " AA's own wording is on aa.org.";
        else text = "Many AA and NA members work the 12 Steps over time, often with a sponsor. HomeCircle has short notes in its own words (not the official wording), plus a button to AA's own wording on aa.org.";
        session.lastSuggestion = STEPS_ID;
        return { id: "steps", text: text, offerBreathing: false, replies: [meetingReply, Q("books", "Free books", "books")], link: L.practice(STEPS_ID) };
      case "books":
        session.lastSuggestion = BOOKS_ID;
        return { id: "books", text: "The Big Book and NA's Basic Text audio are free on aa.org and na.org. HomeCircle links to them rather than copying them.",
          offerBreathing: false, replies: [Q("steps", "The 12 Steps", "steps"), meetingReply], link: L.practice(BOOKS_ID) };
      case "aboutKai":
        // Web edit: "on this phone" becomes "in this browser".
        return { id: "aboutKai", text: "I'm Kai, a recovery buddy in HomeCircle. My replies come from saved rules in this browser, with no network and no AI service. I'm not a counselor and can't diagnose, and HomeCircle isn't part of AA or NA.",
          offerBreathing: false, replies: [listenReply, meetingReply], link: null };
      case "sleep":
        text = pick("sleep", ["Awake nights are rough. This isn't a sleep treatment. A simple wind-down is in the Library if you want it.",
          "You can rest without solving tomorrow. One small routine is enough.", "Being awake doesn't mean you have to start the day."], session);
        session.lastSuggestion = "guide-one";
        return { id: "sleep", text: text, offerBreathing: false, replies: [Q("one", "One-thing focus", "sleep"), listenReply], link: L.practice("guide-one") };
      case "anger":
        text = pick("anger", ["Anger can be the A in HALT. You don't have to act on it this minute.",
          "That heat is allowed. A pause is allowed too.", "Name it, then decide the next ten minutes."], session);
        session.lastSuggestion = "guide-halt";
        replies = [Q("halt", "HALT check", "halt")];
        if (!declinedBreathe) replies.push(breathingReply("breath-478", ctx));
        replies.push(walkReply);
        return { id: "anger", text: text + " A slow breath or a walk can help the heat pass.", offerBreathing: false, replies: replies, link: L.practice("guide-halt") };
      case "family":
        text = pick("family", ["Family worry is heavy. Help has a Family and friends section, and HomeCircle doesn't host their literature.",
          "You can care about them and still keep your own next hour simple.",
          "Families have their own lines in Help. I won't pretend to be in the middle of it."], session);
        session.lastSuggestion = "family";
        return { id: "family", text: text, offerBreathing: false, replies: [Q("family", "Family lines", "family"), listenReply], link: L.family };
      case "milestone":
        text = pick("milestone", ["That's a real mark. You don't have to make a speech about it.",
          "Mark it, then let the rest of the day be ordinary.", "Small or large, it counts."], session);
        return { id: "milestone", text: text, offerBreathing: false, replies: [Q("grateful", "I'm grateful", "grateful"), meetingReply], link: null };
      case "meeting":
        // Web edits: the app's "Meetings tab" and "stays on this phone" lines.
        text = pick("meeting", ["I can open the meeting finder.",
          "There's a Meetings page whenever you want a room.", "Look for a meeting when you're ready. No rush from me."], session);
        session.lastSuggestion = "meetings";
        return { id: "meeting", text: text, offerBreathing: false, replies: [Q("open", "Open meetings", "meeting")], link: L.meetings };
      case "body":
        var b = bodyStageText(ctx);
        session.lastSuggestion = STAGES_ID;
        return { id: "body", text: b.text, offerBreathing: false, replies: [Q("breathe", "Breathe with me", "breathing"), listenReply], link: L.help, stat: b.stat };
      case "breathing":
        var practice = preferredBreathingID(ctx.health);
        if (hidesBreathHolds(ctx.health)) text = "A slow out-breath fits your breath-hold setting. Skip breath holds.";
        else if (prefersGroundingFirst(ctx.health)) text = "Feet on the floor first, then a short breath if you still want one.";
        else text = pick("breathing", ["We can do a short one. Stop any time.", "Box breathing, 4-7-8, or a slow out-breath. Your choice.",
          "A few breaths, then we stop. Nothing longer than you want."], session);
        session.lastSuggestion = "breathe";
        return { id: "breathing", text: text, offerBreathing: true, replies: [Q("start", "Start breathing", "breathing"), Q("decline", "Not now", "decline")], link: L.practice(practice) };
      case "grateful":
        // Web edit: "on this phone only" becomes "in this browser only".
        text = pick("grateful", ["That's worth keeping.", "Small good things count.", "I'll remember you said that, in this browser only."], session);
        return { id: "grateful", text: text, offerBreathing: false, replies: [meetingReply, listenReply], link: null };
      case "struggling":
        text = pick("struggling", ["I'm glad you said it. One hour is enough for now.", "You don't have to explain it perfectly.",
          "We can stay with this hour and leave the rest."], session);
        var br = !declinedBreathe;
        if (br) session.lastSuggestion = "breathe";
        replies = br ? [breathingReply("breath-46", ctx), meditationReply, listenReply] : [meditationReply, listenReply, meetingReply];
        return { id: "struggling", text: text + " " + LIFELINE_LINE, offerBreathing: br, replies: replies, link: br ? L.practice(preferredBreathingID(ctx.health)) : L.meetings };
      case "sad":
        text = pick("sad", ["I'm sorry it's a heavy one. You don't have to cheer up for me.",
          "Feeling low is hard. We can go gently, one small thing at a time.", "That sounds rough. It's okay to feel flat for a while."], session);
        session.lastSuggestion = "med-breath";
        replies = [meditationReply, walkReply];
        if (!declinedBreathe) replies.unshift(breathingReply("breath-46", ctx)); else replies.push(listenReply);
        return { id: "sad", text: text + " " + LIFELINE_LINE, offerBreathing: false, replies: replies, link: L.practice("med-breath") };
      case "mixedFeelings":
        var found = feelings(f);
        text = pick("mixed", ["Sounds like a few things at once. Which one's loudest right now?",
          "That's a lot of feelings in one go. Which one do you want to start with?"], session);
        return { id: "mixedFeelings", text: text, offerBreathing: false, replies: found.slice(0, 3).map(function (x) { return Q(x, CHOICE[x], x); }), link: null };
      case "calmTools":
        var breaths = hidesBreathHolds(ctx.health) ? "a slow out-breath (it suits your health notes)" : "breathing exercises (box, 4-7-8 and a slow out-breath)";
        // Web edit: the website has no check-in after each practice, so that part is left out.
        session.lastSuggestion = null;
        return { id: "calmTools", text: "Here's what's in HomeCircle: " + breaths + ", short meditations, a mindful walk, 5-4-3-2-1 grounding and a HALT check. Pick one, or just tell me how you're feeling.",
          offerBreathing: false, replies: [Q("breathe", "Breathing", "breathing"), meditationReply, Q("ground", "Grounding", "grounding")], link: null };
      case "practice":
        var id = String(chip || "").slice(PRACTICE.length);
        if (hidesBreathHolds(ctx.health) && (id === "breath-box" || id === "breath-478")) id = "breath-46";
        var item = D().items[id];
        if (!item) return line("breathing", ctx, session, now, f);
        if (item.kind === "breathing") { text = item.title + " is ready in the Library. Stop any time."; session.lastSuggestion = "breathe"; }
        else if (item.kind === "meditation") { text = item.title + " is a short meditation in the Library. Go at your own pace."; session.lastSuggestion = id; }
        else { text = item.title + " is in the Library when you want it."; session.lastSuggestion = id; }
        return { id: "practice", text: text, offerBreathing: item.kind === "breathing", replies: [listenReply], link: L.practice(id) };
      case "ideas":
        session.justListen = false;
        return { id: "ideas", text: "What do you want an idea for?", offerBreathing: false, replies: starterReplies(ctx), link: null };
      case "greeting":
        return greeting(ctx, session, now);
      default:
        text = pick("default", ["I'm here. Say as much or as little as you want.", "This hour can stay ordinary.",
          "Tell me one true thing about right now, if you want."], session);
        return { id: "default", text: text, offerBreathing: false, replies: starterReplies(ctx), link: null };
    }
  }

  function finish(o, session) {
    var spoken = String(o.text).trim();
    if (o.privateLine) {
      if (session.privateShown) spoken += " Same reminder: don't share bank details or passwords. Tell your sponsor or a trusted person if someone asks.";
      else { spoken += " " + D().privateDetails; session.privateShown = true; }
    }
    if (o.gambling) spoken += " The National Problem Gambling Helpline is 1-800-MY-RESET (1-800-697-3738), with call, text and chat 24/7. The Gamblers Anonymous fellowship line is 855-222-5542, and you can call or text 988 any time.";
    if ((spoken.match(/\?/g) || []).length > 1) spoken = spoken.slice(0, spoken.indexOf("?") + 1);
    if (o.link) session.lastSuggestion = session.lastSuggestion == null ? o.id : session.lastSuggestion;
    return { text: spoken, offerBreathing: !!o.offerBreathing, crisis: !!o.crisis, privateDetailsReminder: !!o.privateDetails,
      quickReplies: (o.replies || []).slice(0, 3), link: o.link || null, session: session,
      replyID: session.recentReplyIDs.length ? session.recentReplyIDs[session.recentReplyIDs.length - 1] : o.id, stat: o.stat || null, route: o.route || o.id };
  }

  function fixedCrisisFilter(message, session) {
    var route = crisisRoute(message);
    if (!route) return null;
    var s = copySession(session);
    s.topic = "crisis"; s.justListen = false; s.crisisHeld = true;
    if (route === "familyViolence") s.respectHeld = true;
    if (route === "familyHarm") s.mensReferralHeld = true;
    var r = finish({ id: "crisis", text: Crisis.replyText(route, KAI_REGION),
      crisis: true, replies: [Q("listen", "Stay with me", "listen")], link: L.help }, s);
    r.crisisRoute = route;
    return r;
  }

  /* reply(message, chip, ctx): ctx = { dayCount, health, session, recentUserLines, includesGA, offeredBreathingToday } */
  function reply(message, chip, ctx, now) {
    ctx = ctx || {};
    ctx.session = copySession(ctx.session);
    ctx.health = ctx.health || {};
    now = now || new Date();
    var c = fixedCrisisFilter(message || "", ctx.session);
    if (c) return c;
    var text = String(message || "").trim(), f = text.toLowerCase(), session = copySession(ctx.session);
    var listenQR = [Q("listen", "Keep listening", "listen"), Q("ideas", "I'm ready for an idea", "ideas")];
    if (wantsJustListen(f) || chip === "listen") {
      session.justListen = true; session.topic = "listen"; session.lastSuggestion = null;
      return finish({ id: "listen", text: reflect(text === "" ? "you want me to listen" : text, session), replies: listenQR }, session);
    }
    if (chip === "ideas") session.justListen = false;
    if ((isDecline(f) || chip === "decline") && session.lastSuggestion != null) {
      if (session.declined.indexOf(session.lastSuggestion) < 0) session.declined.push(session.lastSuggestion);
      session.lastSuggestion = null;
      var dl = pick("decline", ["All right. I won't bring that up again this chat.", "Got it. We'll leave that one.", "Okay. You can pick something else if you want."], session);
      return finish({ id: "decline", text: dl, replies: starterReplies(ctx) }, session);
    }
    if (session.justListen && !chip) {
      var spoken = reflect(text, session);
      if (shouldMentionGambling(f, "", ctx)) spoken += " The National Problem Gambling Helpline is 1-800-MY-RESET (1-800-697-3738), with call, text and chat 24/7. The Gamblers Anonymous fellowship line is 855-222-5542.";
      var p = mentionsPrivateDetails(f);
      return finish({ id: "listen", text: spoken, privateDetails: p, privateLine: p, replies: listenQR }, session);
    }
    var route = intent(f, chip);
    session.topic = route;
    var m = moodFor(route); if (m) session.mood = m;
    var built = line(route, ctx, session, now, f, chip);
    var pd = mentionsPrivateDetails(f);
    return finish({ id: built.id, route: route, text: built.text, offerBreathing: built.offerBreathing, privateDetails: pd, privateLine: pd,
      gambling: shouldMentionGambling(f, route, ctx), replies: built.replies, link: built.link, stat: built.stat }, session);
  }

  function linkTitle(link) {
    if (!link) return "";
    if (link.openHelp) return "Open Help";
    if (link.openMeetings) return "Open meetings";
    if (link.openFamily) return "Family and partners";
    var id = link.practiceID;
    if (!id) return "Open";
    if (id === STEPS_ID) return "Open The 12 Steps";
    if (id === STAGES_ID) return "Open body & recovery stages";
    if (id === BOOKS_ID) return "Open recovery books";
    if (id === "breath-box" || id === "breath-478" || id === "breath-46") return "Try a breathing exercise";
    var t = itemTitle(id);
    return t ? "Open " + t : "Open Library";
  }
  function linkHref(link, base) {
    base = base || "";
    if (!link) return null;
    if (link.openHelp) return base + "help.html";
    if (link.openMeetings) return "https://www.aa.org/find-aa";
    if (link.openFamily) return base + "help.html#family";
    var id = link.practiceID, pages = D().pages || {};
    if (pages[id]) return base + pages[id];
    return base + "library.html";
  }

  return { reply: reply, isCrisis: isCrisis, crisisRoute: crisisRoute, feelings: feelings, strongest: strongest, asksForCalmingTools: asksForCalmingTools,
    tokens: tokens, normalizeForMatch: normalizeForMatch, freshSession: freshSession, linkTitle: linkTitle, linkHref: linkHref,
    hidesBreathHolds: hidesBreathHolds, stageForDay: stageForDay, intent: intent };
});
