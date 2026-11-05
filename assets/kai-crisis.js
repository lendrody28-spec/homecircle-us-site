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
        selfHarm: "If you might act on this, call 000 now. Lifeline is 13 11 14. Kai is a recovery buddy, not a counsellor, and can't diagnose. Kai can miss things, so please reach out yourself.",
        emergency: "Call 000 now if you or anyone else is in danger. Lifeline is 13 11 14, any time. Please make the call yourself. Kai can't call anyone and can miss things.",
        familyHarm: "Call 000 now if anyone is in danger. Please keep everyone safe: step away and give yourself space. Lifeline is 13 11 14. Men's Referral Service is 1300 766 491, for help to stop using violence. Please make the call yourself. Kai can't call anyone and can miss things.",
        familyViolence: "Call 000 now if you or anyone else is in danger. Lifeline is 13 11 14. 1800RESPECT is 1800 737 732, 24 hours, for family and domestic violence. Please call one of them yourself. Kai can't call anyone and can miss things.",
        childAbuse: "If anyone is in danger right now, call 000. 1800RESPECT (1800 737 732) helps with sexual abuse, any time. Kids Helpline (1800 55 1800) is for young people up to 25. Bravehearts (1800 272 831) supports people affected by child sexual abuse. Kai can miss things.",
        checkIn: "Just checking in. If you or anyone else is in danger right now, call 000, or Lifeline on 13 11 14. Kai can miss things. Want to tell me more?",
        medical: "This sounds like a medical emergency. Call 000 now and ask for an ambulance. Stay with the person if it's safe. Lifeline is 13 11 14. Kai can't call anyone and can miss things, so please make the call yourself."
      }
    },
    US: {
      emergency: "911", crisisLine: "988 Suicide & Crisis Lifeline", crisisNumber: "988",
      replies: {
        selfHarm: "If you might act on this, call 911 now. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. Kai is a recovery buddy, not a counselor, and can't diagnose. Kai can miss things, so please reach out yourself.",
        emergency: "Call 911 now if you or anyone else is in danger. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. Please make the call yourself. Kai can't call anyone and can miss things.",
        familyHarm: "Call 911 now if anyone is in danger. Please keep everyone safe: step away and give yourself space. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. Please make the call yourself. Kai can't call anyone and can miss things.",
        familyViolence: "Call 911 now if you or anyone else is in danger. You can call or text 988, the Suicide & Crisis Lifeline, 24/7. The National Domestic Violence Hotline is 1-800-799-7233, 24/7. Please call one of them yourself. Kai can't call anyone and can miss things.",
        childAbuse: "If anyone is in danger right now, call 911. The Childhelp National Child Abuse Hotline is 1-800-422-4453. Kai can miss things.",
        checkIn: "Just checking in. If you or anyone else is in danger right now, call 911, or call or text 988. Kai can miss things. Want to tell me more?",
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
    kms: ["kms"], selfharm: ["self", "harm"],
    ambo: ["ambulance"], ambos: ["ambulance"], everyones: ["everyone"], everybodys: ["everyone"], everybody: ["everyone"]
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
    // WEB: "triple zero", "triple-0", "triple 0", "triple oh" all read as 000.
    return joined.join(" ").replace(/\btriple (zero|0|oh|o)\b/g, "000")
      // WEB (Finn signoff rows): Australian "my old man" / "my old lady" = dad / mum.
      .replace(/\b(my|our|his|her|your|their|the) old (man|fella)\b/g, "$1 dad")
      .replace(/\b(my|our|his|her|your|their|the) old (lady|woman|girl)\b/g, "$1 mum");
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
    /\b(fent|fentanyl) test (strip|strips|kit|kits)( kit| kits)?\b/g,
    // WEB: a police or customs seizure of drugs or goods, not a medical seizure.
    /\b(drug|drugs|police|cocaine|meth|ice|heroin|cannabis|weed|record|border|customs|asset|cash|gun|guns|weapons|firearms) seizures?\b/g,
    /\bseizures? of (the |a |an |some |\w+ ){0,3}(drugs|cash|guns|weapons|firearms|money|assets|goods|property|shipment|shipments|cocaine|meth|ice|heroin|cannabis|weed|contraband|cars?|vehicles?|phones?|documents)\b/g,
    // WEB (Finn last rows): everyday or injury uses of "myself" verbs.
    /\b(hurt|hurting|cut|cutting|burnt|burned|burn|burning|injured|injure|injuring) (myself|my self) (at (the )?(gym|training|work|footy|soccer|netball|cricket|practice|park|pool)|playing \w+|lifting|training|running|cooking|gardening|on (the |a )?(stove|kettle|oven|iron|pan|fence|glass|tin|can|bbq|grill|heater|tray|paper|corner|table)|with (the |a )?(kettle|iron|stove|oven|pan|scissors|bread knife)|in the (kitchen|garden|shed)|by accident|accidentally|doing \w+|skating|surfing|skiing|riding)\b/g,
    /\b(kill|killing|killed) (myself|my self) (laughing|with laughter)\b/g,
    /\b(shot|shoot|shooting) (myself|my self) in the foot\b/g,
    /\b(burn|burning|burnt|burned|wore|wear|wearing|run|ran|running|worn) (myself|my self) (out|down|ragged)\b/g,
    /\b(throw|throwing|threw) (myself|my self) a (party|bbq|birthday)\b/g,
    /\b(throw|throwing|threw|thrown) (myself|my self) (in|into) (my |the |a )?(work|it|study|studies|training|recovery|the program|program|job|role|things|everything|meetings|service|project|gym|music|hobbies)\b/g,
    // WEB (Finn last rows): breathing practice, not a crisis.
    /\b((slow|slowly|deep|box|calm|belly|mindful|steady|shallow) )?breathing (exercise|exercises|technique|techniques|practice|app|guide|helps|helped|really helps|calms|to calm|to relax)\b/g,
    /\bbreathing slowly (helps|to calm|to relax|calms)\b/g,
    // WEB (round 6, end-web): busy-day breathing and a toddler bump that is fine.
    /\bbarely breathing (at|with) work\b/g,
    /\b(hit|bumped|banged) (her|his|their) head on the (cot|table|bed|couch|door|chair|floor)\b(?=.*\b(fine|ok|okay|laughing|all good)\b)/g,
    // WEB (round 8): "die laughing" is an idiom.
    /\b(die|dying|died|dead) (laughing|of laughter|from laughing)\b/g,
    // WEB (round 6): "bullet journal", "bullet points" are not weapons.
    /\bbullet (journal|journals|journaling|point|points|list|lists|proof|train)\b/g,
    // WEB: beating someone at a game or sport ("beat his kids at chess", "beats me at Uno").
    /\b(beat|beats|beating|beaten|flogged|flogs|flogging|flog|belted|belts|belting|thrashed|thrashes|smashed|smashes|hammered|whooped|whupped|destroyed|kicked|kicks|kicking) (\w+ ){1,4}(at|in) (a |the |his |her |their |our |my )?(chess|uno|cards|card games?|games?|matches|match|monopoly|scrabble|checkers|draughts|poker|tennis|footy|football|soccer|basketball|netball|cricket|golf|ping pong|table tennis|pool|darts|mario kart|fifa|fortnite|minecraft|video games?|board games?|trivia|quiz|race|races|arm wrestling|wrestling match|sudoku|wordle|mahjong|dominoes|bingo|connect four|jenga)\b/g,
    // WEB (Finn adv rows): blue lips from something cold, or from food or drink colouring, is not a crisis.
    /\b(lips|lip|tongue|mouth|fingers|hands|nails|face) (is |are |were |was |went |turned |gone |going |have gone |have turned |all )*(blue|purple) (from|because of|after|cause of|coz of|thanks to) (the |an? |my |some |eating |drinking |that |this |swimming in )*(icy ?poles?|ice ?blocks?|ice blocks?|ice ?creams?|ice|popsicles?|slushies|slushie|slushy|slurpees?|snow ?cones?|lollies|lolly|lollipops?|candy|sweets|blueberries|berries|cordial|drink|drinks|gatorade|powerade|food colou?ring|dye|cold|freezing|the cold|snow|swimming|pool|water|ocean|beach|surf|frozen \w+)\b/g
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
  var familyVerbs = "(flogs|flogged|flogging|lays into|laid into|laying into|belts|belted|belting|hits|hit|hitting|beats|beat|beating|bashes|bashed|bashing|chokes|choked|choking|strangles|strangled|strangling|punches|punched|punching|kicks|kicked|kicking|slaps|slapped|slapping|attacks|attacked|abuses|abused|abusing|raped|rapes|hurts|hurt|hurting|kill|stabbed|stab|threatens|threatened|threatening|stalking|stalks)";
  var fvNouns = "(partner|husband|wife|boyfriend|girlfriend|fiance|fiancee|ex|dad|mum|stepdad|stepmum|brother|sister|son|daughter|uncle|aunt|auntie|aunty|grandad|grandpa|grandma|nan|nanna|pop|cousin|housemate|flatmate|carer|kids?|children|child|baby|babies|bub|bubs|toddler|family|parents?|stepkids?|stepson|stepdaughter|stepbrother|stepsister|siblings?|nephew|niece)";
  var fvSubject = "(he|she|hes|shes|they|theyre|((my|our|the|mums|dads|my mums|my dads|her|his) )?((little|big|older|younger|baby|new|old|step) )?" + fvNouns + ")";
  var fvVerbs = "(flogs|flogged|flogging|lays into|laid into|laying into|hits|hit|hitting|beats|beat|beating|beaten|bashes|bashed|bashing|hurts|hurt|hurting|punches|punched|punching|kicks|kicked|kicking|chokes|choked|choking|strangles|strangled|strangling|slaps|slapped|slapping|attacks|attacked|attacking|abuses|abused|abusing|smacks|smacked|smacking|belts|belted|belting|throttles|throttled)";
  var fvObject = "(me|him|her|them|us|((my|his|her|their|our|the|your) )?((little|big|older|younger|baby|new|step) )?" + fvNouns + ")";
  var household = "\\b((my|our|mums|dads|her|his) (\\w+ )?" + fvNouns + "|stepdad|stepmum|husband|wife|partner|boyfriend|girlfriend|mum|dad)\\b";
  var assaultPatterns = [
    /\b(smashed|smashing|smashes|smash|slammed|slamming|slams|bashed|bashing|threw|thrown|throwing|throws|pushed|pushing|pushes|shoved|shoving|kicked|dragged|banged|banging)( \w+){0,4} (head|face|skull) (into|against|on|onto|through) (the |a )?(wall|walls|floor|ground|door|table|bench|window|mirror|concrete|car|tiles|sink)\b/,
    /\b(threw|thrown|throwing|throws|pushed|pushes|pushing|shoved|shoves|shoving|kicked|dragged|chucked) (me|him|her|them|us|someone|somebody|mum|dad|(my|his|her|their|our|the) (\w+ )?(partner|husband|wife|boyfriend|girlfriend|ex|mum|dad|brother|sister|son|daughter|kids?|child|baby|bub|toddler|mate|friend|nan|grandma|grandpa|stepdad|stepmum|housemate|flatmate)|a (guy|bloke|man|woman|kid|girl|boy))( \w+){0,2} (down the stairs|down stairs|down the steps|into the wall|against the wall|into a wall|out of the car|through the window|across the room|into the door|to the ground|on the floor|off the balcony)\b/,
    /\b(stabbed|stabbing|stabs|shot|shooting|shoots|strangled|strangling|strangles|glassed|glassing|glasses|knifed|throttled|throttling)( (me|him|her|them|us|someone|somebody|a guy|a man|a woman|a bloke|that guy|this guy)\b(?! (a look|a glance|a smile|a text|a message|an email|a photo|a video|down|up))|( my| his| her| their| our) (?!(finger|fingers|thumb|hand|hands|toe|toes|foot|feet|shot|shots|chance|goal|hoop|eyes|dinner|lunch)\b)\w+)/
  ];
  var pills = "(pills|tablets|meds|medication|medications|painkillers|panadol|sleeping pills|valium|xanax|oxys?|endone)";
  function R(s) { return new RegExp(s); }

  /* ---------- Patterns ---------- */
  var familyHarmPatterns = [
    // WEB (Finn final rows): the person themselves hurting family ("I hit my kid and I'm scared I'll do it again").
    /\bi (have |just |accidentally )?(hit|hurt|smacked|slapped|punched|kicked|shook|shoved|pushed|beat|belted|choked|strangled|grabbed|threw) (my|our) (kids?|child|children|son|daughter|baby|bub|toddler|partner|wife|husband|girlfriend|boyfriend|mum|dad|stepkids?|stepson|stepdaughter)\b/,
    R("\\b" + intent + fillers + " " + harmVerbs + " " + familyTargets + "\\b")
  ];

  var emergencyPatterns = [
    R("\\b" + intent + fillers + " " + harmVerbs + " " + others + "\\b"),
    /\b(someone|somebody|people|a man|a guy|a woman|this guy|some guy|strangers?)( \w+){0,5} (is |are |keeps |keep |going to |trying to |wants to |will )?(hurting|hitting|attacking|beating|bashing|threatening|following|chasing|kill|hurt|attack|stab|shoot|rape|raping) me\b/,
    /\b(someone|somebody) (is |has )?(broken|breaking) in\b/,
    // WEB (round 8): an overdose of injected drugs is an emergency.
    /\bshot up (way |far |heaps )?too much\b/,
    // WEB (round 6, Finn B): any request for help, police, cops or an ambulance goes to the full emergency route.
    /\b(call|calling|ring|ringing|phone|phoning|get|getting|send|sending|fetch|dial|need|needs|want|bring)( me| us| him| her| them)?( the| an| a| some)? (police|cops|cop|ambulance|ambulances|paramedics|emergency services|fire brigade|firies)\b/,
    // WEB (round 8): help is an emergency only with an urgent cue. Bare "help" and help with sobriety/steps/app/family get nothing.
    /\b(call|ring|phone|send|fetch|bring)( me| us| him| her| them)?( some| a| the)? help\b(?! (with|for (my|his|her|their) (drinking|gambling|using|recovery|steps?)))/,
    /\b(need|get|want) (help|someone|somebody) (now|right now|urgently|asap|fast|quick|quickly|immediately)\b/,
    /\bhelp (me|us|him|her) (now|right now|quick|quickly|asap|please hes|please shes)\b/,
    /\b(emergency help|need an emergency|(its|this is) an emergency|medical emergency|emergency now)\b/,
    /\b(someone|somebody) (please )?help (me|us|him|her)?\s*(now|please)?$/,
    // WEB (Finn adv rows): asking Kai to call emergency services. Kai can't call; the reply says so.
    /^(please |pls |plz |quick |quickly |someone |somebody |just )?(call|ring|phone|dial) (000|911|an ambulance|the ambulance|ambulance|the police|the cops|emergency services|emergency)( now| please| pls| plz| quick| quickly| asap| for me| for us| right now)*$/,
    /\b(help me|can you|could you|can u|will you|please|pls|plz) (to )?(call|ring|phone|dial|get) (911|000|an ambulance|the ambulance|the police|the cops|emergency services)\b/,
    /\b(call|ring|phone|dial) (911|000|triple zero|an ambulance|the police|the cops|emergency services|for help) for (me|us|him|her|them)\b/,
    R("\\b" + intent + fillers + " (smash|bash|kick|cave|punch|stomp) (his|her|their|your|someones|somebodys|that guys|this guys) (head|face|skull)( in)?\\b")
  ];

  var familyViolencePatterns = [
    R("\\b" + family + familyGap + " " + familyVerbs + " me\\b"),
    R("\\b" + family + familyGap + " (wont|will not|doesnt|does not) let me (leave|go|out)\\b"),
    // WEB (Finn fresh rows): anyone in the family or household hurting another person, any tense.
    R("\\b" + fvSubject + familyGap + " " + fvVerbs + " " + fvObject + "\\b(?! (record|time|score|best|pb|personal best|high score|lap time|to it|to the))"),
    // WEB (Finn last rows): any man or partner in mum's, dad's or a sibling's life hurting someone.
    R("\\b((my )?(mums|dads|sisters|brothers|nans|grandmas|aunties|aunts|her|his)( (new|old|current|latest|step))? (bloke|boyfriend|bf|partner|guy|man|husband|hubby|fella|girlfriend|gf|wife|missus|ex|stepdad)|(the |her |my mums |mums )?new (guy|bloke|boyfriend|fella|man|partner)|stepdad|stepfather|step dad)" + familyGap + " " + fvVerbs + " " + fvObject + "\\b"),
    // WEB (round 6): throwing something at, lunging at, going for, or grabbing a family member by the throat.
    R("\\b(threw|throws|throwing|chucked|chucks|chucking|hurled|hurls|hurling|flung|smashed|pegged) (a |an |the |his |her |my |some )?(\\w+ ){0,2}(at|into) " + fvObject + "\\b"),
    R("\\b(lunged|lunges|lunging|went|goes|going|came|comes|coming|charged|charges|ran|runs) (at|for) " + fvObject + "\\b(?! (a |the )?(walk|run|coffee|lunch|dinner|drive|swim|ride|chat|drink|beer|visit))"),
    R("\\b(grabbed|grabs|grabbing|held|holds|holding|pinned|pins|had|has) " + fvObject + " (by|around) the (throat|neck|hair)\\b"),
    // WEB (Finn adv rows): a child being hurt, e.g. "my brother is beating his kids".
    R("\\b" + family + familyGap + " " + familyVerbs + " (his|her|their|my|our|the|your) (kids?|kiddies|children|child|son|sons|daughter|daughters|baby|babies|bub|bubs|toddler|stepkids?|stepson|stepdaughter)\\b"),
    /\b(not|dont feel|never feel|dont|never) safe (at|in my( own)?) home\b/,
    /\bunsafe (at|in my( own)?) home\b/,
    /\b(scared|afraid|frightened|terrified) to go home\b/,
    /\b(domestic|family) violence\b/,
    /\b(scared|afraid|frightened|terrified) of (my )?(partner|husband|wife|boyfriend|girlfriend|fiance|fiancee|ex|dad|mum|stepdad)\b/
  ];

  var medicalPatterns = [
    // WEB (Finn signoff rows): overdose signs on a person: gone grey, pale, blue, floppy, limp.
    /\b(hes|shes|he is|she is|theyre|they are|he has|she has|theyve|baby is|bub is|my \w+ is|my \w+s|mates|friends|someone is|body is|body has)( (gone|going|turned|turning|gone all|looking|looks|really|so|all|very|completely))* (grey|gray|pale|floppy|limp|blue|unresponsive)\b(?!.*\b(hair|hairs|beard|roots|shirt|jumper|car|eyes)\b)/,
    /\b(floppy|limp) and (grey|gray|pale|blue|not|wont|unresponsive|cold)\b/,
    /\b(not|isnt|is not|stopped|aint|arent|wasnt) breathing\b/,
    /\bcant breathe\b/,
    /\b(unconscious|unresponsive)\b/,
    /\b(wont|will not|isnt|is not|not) (wake|waking) up\b(?! (early|this early|so early|that early|before|so|too|for|in time|on time|late|the|a|an|him|her|them|us|my|your|his|their|our|anyone|anybody|everyone|everybody|someone|somebody|people|neighbou?rs|until|till|at \d|at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|dawn|sunrise|lunch)))/,
    /\bcant wake (him|her|them|my \w+|\w+ up)\b/,
    /\b(i|he|she|they|we|hes|shes|theyve|ive|someone|somebody|mate|friend|partner|son|daughter|brother|sister|has|have|just|think|might|may) (has |have |just |probably |might have |may have )?(od|ods|oding|oded)\b/,
    /\b(overdose|overdoses|overdosed|overdosing)\b/,
    R("\\b(took|taken|take|taking|had|swallowed) too many( \\w+){0,3} " + pills + "\\b"),
    /\b(mixed|mixing|mix) (xanax|valium|benzos?|oxys?|endone|pills|meds|tablets|painkillers|sleeping pills|heroin|fent|fentanyl) (and|with) (grog|alcohol|booze|drink|drinks|vodka|beer|wine|goon|xanax|valium|benzos?|heroin|fent|fentanyl|oxys?|pills|meds)\b/,
    /\b(mixed|mixing|mix) (grog|alcohol|booze|drink|drinks|vodka|beer|wine|goon) (and|with) (xanax|valium|benzos?|oxys?|endone|pills|meds|tablets|painkillers|sleeping pills|heroin|fent|fentanyl)\b/,
    /\b(having|had|took|taken|taking) an? (overdose|od)\b/,
    /\b(seizure|seizures)\b/,
    // WEB (Finn last rows): breathing that is not, barely, slow, weird, shallow or stopped (practice wording is masked).
    /\b(not|barely|hardly|stopped|isnt|aint|wasnt|struggling|trouble|weird|funny|strange|shallow|slow|slowly) (\w+ )?breathing\b(?! down)/,
    /\bbreathing (is |was |has |had |just |really |very |so |too |super |all )*(slow|slowly|shallow|weird|funny|strange|stopped|barely|ragged|gurgling|rattly|wrong)\b/,
    // WEB (Iris/Finn rows): fits, convulsions, foaming at the mouth, slow or shallow breathing, won't wake.
    /\b(having|had|has|having another|in the middle of|going into) (a |another )?(fit|fits)\b/,
    /\b(fitting|convulsing|convulsions)\b/,
    /\bfoaming at the mouth\b/,
    /\b(hes|shes|he is|she is|theyre|they are|his|her|their|mates|friends|partners|my \w+ is|my \w+s) (\w+ )?breathing (is )?(really |very |so |super |too )?(slow|slowly|shallow|funny|weird|strange|ragged|rattly|gurgling|snoring|wrong)\b/,
    /\b(wont|will not|isnt|is not|cant|cannot) (wake|respond|come to)\b(?! (up|the|him|her|them|us|my|your|his|their|our|anyone|everyone|people|neighbou?rs|to))/,
    /\b(is|hes|shes|am|are|keeps) (seizing|convulsing)\b/,
    /\b(hes|shes|he is|she is|theyre|they are|baby is|bub is|someone is|i am|my \w+ is) choking\b(?! (me|her|him|them|up|back))/,
    /\bchest pains?\b/,
    /\bpain in my chest\b/,
    /\b(i|he|she|they|someone|somebody|mate|friend|partner|son|daughter|brother|sister|dad|mum|husband|wife)( has| have| just| has just)? collapsed\b/,
    /\bsevere withdrawals?\b/,
    // WEB (US rows, Finn): fentanyl and other strong opioids taken, and someone turning blue.
    // The build 31 OD pattern above already covers "he's ODing" and "she OD'd".
    /\b(took|taken|just took|smoked|snorted|shot up|shot|injected|did|done|had) (some |a lot of |heaps of |too much |more |a bit of )?(fent|fentanyl|nitazenes?|tranq|xylazine|h|gear|smack|heroin)\b(?! (test|strip|strips))/,
    /\bcant feel my (legs|arms|body|face|hands|feet)\b/,
    /\b(turning|turned|gone|going) (blue|purple)\b/,
    /\b(lips|lip|face|skin|fingertips|fingers|nails) (is |are |was |were |have |has )?(went |turned |turning |gone |going |looking |look |looks )?(blue|purple|grey|gray)\b/,
    // WEB (Finn adv rows): asking for or needing an ambulance.
    /\b(call|calling|ring|ringing|phone|get|need|needs|send) (me )?(an|the) ambulance\b/
  ];

  // WEB (round 8): child sexual abuse gets its own route.
  var caWho = "(uncle|aunt|aunty|auntie|stepdad|step dad|stepfather|stepmum|step mum|stepmother|dad|father|mum|mother|grandad|grandpa|grandfather|pop|nan|cousin|brother|sister|stepbrother|coach|teacher|priest|pastor|neighbour|neighbor|babysitter|tutor|mums boyfriend|mums partner|family friend|youth leader|scout leader|leader|he|she|someone|an adult|a man|a guy|a lady|a woman)";
  var caVictim = "(me|my (daughter|son|kid|kids|child|children|little (sister|brother|girl|boy)|sister|brother|niece|nephew|grandkids?|granddaughter|grandson))";
  var childAbusePatterns = [
    R("\\b" + caWho + "( \\w+){0,2} (touches|touched|keeps touching|is touching|was touching|molests|molested|is molesting|fondles|fondled|sexually abuses|sexually abused|keeps abusing) " + caVictim + "\\b"),
    R("\\b(touch|touches|touched|touching)( \\w+){0,8} (our secret|a secret|not to tell|dont tell|never tell|wont tell)\\b"),
    /\b(makes|made|forces|forced|keeps making|is making|tries to make) (me|my \w+) (do|watch) (sexual|sex|rude|dirty) (things|stuff|acts|videos)\b/,
    /\b(makes|made|forces|forced|keeps making) me touch (him|her|them|his|their)\b/,
    /\b(i was|im being|i am being|i have been|ive been|been|getting|she was|he was|shes being|hes being) (molested|sexually abused|groomed)\b(?!.*\b(years ago|when (i|she|he) was (a kid|little|young)|as a kid)\b(?!.*\b(still|again|now)\b))/,
    /\b(molested|sexually abused|touched)( \w+){0,6} (and|but) (its|it is|he|she) (still|is still)( \w+)? (happening|does|doing it|going on)\b/
  ];
  var selfHarmPatterns = [
    // WEB (round 8): specific full rules (warning signs, means ready, burning, last night, want it all to stop).
    /\b(burn|burns|burning|burnt|burned) (myself|my (arms?|legs?|skin|wrists?|hands?|thighs?|stomach|body))( \w+){0,4} (with|on purpose|deliberately)\b(?! (the|a) (oven|stove|iron|kettle|pan|tray))/,
    /\b(hold|holds|held|holding|put|putting) (a |the |my )?(lighter|flame|cigarette|ciggie|match|lit \w+) (to|on|against) my (skin|arms?|legs?|wrists?|hands?|body)\b/,
    /\b(this is|tonight is|today is|will be|its|it is|going to be|gonna be) my last (night|day)\b(?! (at|of|in|before|on (the|my) (job|shift|holiday|trip)|working))/,
    /\bmy last night (on earth|alive|here)\b/,
    /\b(want|wanna|need|wish)( \w+)? (it|it all|everything|this|all of this|all this) (all )?to (stop|end) (forever|permanently|for good)\b/,
    /\b(im|i am) (so )?done with (life|living|being alive|it all|everything)\b/,
    /\b(cant|can not|cannot|dont know if i can|not sure i can) keep myself safe\b/,
    /\bnot safe (from|with|around) myself\b/,
    /\b(dont|do not) (feel|trust myself) safe (with|around) myself\b/,
    /\b(wrote|written|writing|write|made|making|finished) (my |a )?(will|goodbye (letters?|notes?)|suicide (letters?|notes?))\b(?!.*\b(lawyer|solicitor|estate|mortgage|house|addiction|old self|journal)\b)/,
    /\b(gave|give|giving|given) (away )?(my|all my) (dog|cat|pets?|things|stuff|belongings|possessions|guitar|stuff) away\b|\b(gave|give|giving|given) away (my|all my) (dog|cat|pets?|things|stuff|belongings|possessions)\b/,
    /\b(pills|tablets|meds|oxys?|rope|noose|gun|razor|blades?)( \w+){0,8} (ready|lined up|laid out|counted out|set out)\b/,
    /\b(lined up|laid out|counted out) (my |the |all my )?(pills|tablets|meds)\b/,
    /\b(bought|got|have|tied|hung|set up|made) (a |the |some )?(rope|noose)( today| tonight| for myself)?\b(?! swing)/,
    /\bno reason to (keep )?(live|living|go on|going on|be here|being here|stay alive)\b/,
    /\b(better|happier|easier) (off )?(if|when) i (died|was dead|were dead|was gone|wasnt here|disappeared|killed myself)\b/,
    /\b(im|i am|i keep|keep|started|start) (cutting|burning|hurting myself|self harming) again\b/,
    /\b(used to|stopped|quit) (cut|cutting|self harm|self harming|hurt myself|hurting myself|burn myself|burning myself)\b.*\b(again|started again)\b/,
    /\b(gun|pistol|rifle)\b.*\b(thinking (of|about) using it|use it on myself|loaded)\b|\bloaded (the|my|a) (gun|pistol|rifle)\b/,
    /\b(drink|drinking|use|using) (myself )?(until|till|til) i (die|am dead|dont wake up)\b/,
    /\b(im going to|im gonna|gonna|going to|i will|ill|i might|might)( just)? top myself\b/,
    // WEB (round 6): a method on a body part without "myself". Injury context ("on the fence", "at work", "cooking") is excluded.
    /\b(slash|slashing|slashed|slit|slitting|cut|cutting|stab|stabbing|shoot|shooting|blow|blowing|slice|slicing|open|opening) (open )?(my|me) (own )?(wrists?|arms?|head|throat|neck|veins?|temple)( open| off| out)?\b(?! (on|from|at work|cooking|shaving|while|by accident|accidentally|healing|is healing|in the kitchen))/,
    /\b(bullet|bullets|gun|pistol|rifle|shotgun|blade|blades|knife|knives|razor|razors)( \w+){0,3} (in|into|to|through|against|on|at|across|in to) (my|me) (own )?(wrists?|arms?|head|throat|neck|temple|mouth|veins?|chest|heart)\b/,
    // WEB (round 6): jump or leap off a height or any named bridge; not past-tense fun or swimming contexts.
    /\b(jump|jumping|leap|leaping|throw myself|go|going|hurl myself) off (the |a |that |this |of )?(\w+ ){0,2}(bridge|cliff|cliffs|roof|rooftop|building|tower|overpass|balcony|car park|carpark|parking garage|top floor|gap|ledge|dam)\b(?!.*\b(swim|swimming|swam|pool|into the (water|river|creek|lake|ocean|sea)|diving|jetty|pier|bungee|parachute|movie|film|game|video)\b)/,
    // WEB (round 6): crashing a vehicle on purpose.
    /\b(crash|crashing|drive|driving|wrap|wrapping|roll|rolling|flip|flipping|plough|ploughing|smash|smashing|run|running|steer|steering|stack|stacking|put|putting)( \w+){0,3} (car|ute|truck|bike|motorbike|van)( \w+){0,5} (on purpose|deliberately|intentionally)\b/,
    /\b(deliberately|on purpose|intentionally) (crash|drive|wrap|roll|stack|smash|run)\b/,
    /\b(going to|want to|wanted to|will|might|gonna|about to|ready to|planning to|plan to|thinking about|thinking of|tempted to|urge to)( just)? (wrap|wrapping) (my |the )?(car|ute|truck|bike|motorbike|van) (around|round) (a |the )?(tree|pole|power pole)\b/,
    // WEB (round 6): stop existing / not exist.
    /\b(stop|stopped|stopping|cease|ceased|ceasing) (to )?exist(ing)?\b(?! on autopilot| like a robot| as a zombie)/,
    /\b(want|wanna|wish|like|rather|prefer|need)( to)?( just)? (not|never) (to )?exist\b/,
    /\b(dont|do not|never) (want to |wanna )?exist\b/,
    /\bwish i (didnt|did not|never|wouldnt|could just not|could stop|could) (exist|existed|stop existing)\b/,
    // WEB (Finn last rows): broad rule, a harm verb with "myself" (everyday and injury phrases are masked above).
    /\b(kill|killing|killed|hurt|hurting|cut|cutting|drown|drowning|drowned|gas|gassing|gassed|hang|hanging|hanged|shoot|shooting|shot|stab|stabbing|stabbed|burn|burning|burnt|burned|starve|starving|starved|throw|throwing|threw|poison|poisoning|poisoned|od|ode|overdose|overdosing|off|offing|offed|electrocute|suffocate|suffocating|smother|set fire to|run over|bleed|bleeding) (myself|my self)\b(?! (on fire alarm))/,
    /\b(end|ending|ended) my (own )?life\b(?! (insurance|policy|story))/,
    // WEB (Finn last rows): "better (off) without me" in any form; "plays better without me" style is excluded.
    /(?<!\b(plays?|played|playing|runs?|ran|running|sounds?|sounded|looks?|looked|works?|worked|went|goes|go|cooks?|sings?|sang|did|does|do|fits?) )\bbetter( off)? without me\b/,
    // WEB (Finn signoff rows): methods. Intent words needed, so "stepped in front of the camera" and "catching the train" stay clean.
    /\b(going to|want to|wanted to|will|might|gonna|about to|ready to|planning to|plan to|thinking about|thinking of|feel like|tempted to|urge to|could just|should just|i will just)( just)? (step|stepping|jump|jumping|throw myself|walk|walking|lie down|lying down|lay down|run|running) (out )?in front of (a |the |an |that |this |oncoming )?(next |\w+ )?(train|trains|bus|truck|tram|car|lorry|semi|traffic)\b/,
    /\b(going to|want to|wanted to|will|might|gonna|about to|ready to|planning to|plan to|thinking about|thinking of|feel like|tempted to|urge to)( just)? (drive|driving|crash|crashing|wrap|wrapping|plough|ploughing|plow|steer|steering|run|running|put|putting|smash|smashing) ((my |the )?(car|ute|truck|van|bike|motorbike)( \w+){0,2} )?(into|off|over) (a |the |that |this )?(tree|wall|pole|power pole|pylon|bridge|cliff|pier|river|dam|truck|oncoming traffic|barrier|edge)\b/,
    /\b(on|up on|at|onto) (the |a |this |my |that )?(roof|rooftop|ledge|balcony|bridge|cliff|top floor|railing)\b.*\b(going to|want to|about to|gonna|will|ready to|might|plan to|planning to) jump\b/,
    // WEB (Finn signoff rows): a note left for family; errands ("to buy milk", "for the plumber") stay clean.
    /\b(left|leave|leaving|wrote|written|writing|write) (a |my |some )?(note|notes|letter|letters)( \w+){0,2} (for|to) (my |the )?(family|kids|children|partner|wife|husband|mum|dad|parents|son|daughter|girlfriend|boyfriend|loved ones|everyone)\b(?! (to (buy|get|pick|grab|call|feed|take|put|do|remember|say|let)|about|saying (i|where|when)|on the))/,
    // WEB (Finn signoff rows): better off if I wasn't here / they'd all be better off.
    /\bbetter off (if|when|once|after) i ((wasnt|werent|was not|were not|wont be|will not be)( here| around| alive| born| in the picture)?|(was|were|am) (gone|dead|not here|not around|not alive|never born|out of the picture)|(died|die|disappeared|didnt exist|did not exist|never existed|killed myself|left this world|ended it))\b/,
    /\b(theyd|they would|everyone would|everyone d|they will|everyone will|my family would|my kids would|the world would)( all)? be better off\b(?! (with|taking|using|going|buying|staying|waiting|asking|at|in|on|if they|getting|having))/,
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
    /\b(dont|do not|never) want to wake up\b(?! (early|this early|so early|that early|before|so|too|for|in time|on time|late|the|a|an|him|her|them|us|my|your|his|their|our|anyone|anybody|everyone|everybody|someone|somebody|people|neighbou?rs|until|till|at \d|at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|dawn|sunrise|lunch)))/,
    /\b(shoot|shooting) (myself|my self)\b/,
    // WEB (Finn final rows): cutting wrists/arms, a blade "to use on myself".
    /\b(cut|cutting|slit|slitting|slashed|slashing|sliced|slicing) (my|me) (wrist|wrists|arm|arms|leg|legs|thigh|thighs|throat|vein|veins|skin)\b(?! (shaving|on|while|by accident|accidentally|at work))/,
    /\b(knife|knives|blade|blades|razor|razors|box cutter|stanley knife|scalpel)( \w+){0,8} (use|using|used) (it |them |that |this )?on (myself|my self|me)\b/,
    // WEB (Iris/Finn rows): at a height or an edge.
    /\b(standing|stood|sitting|sat|am|climbed|climbing|perched|leaning|hanging|balancing|up|on|at) (on |at |over |onto |up on )?(the |a |this |that )?(edge|ledge|top|railing|railings|side)( of)? (the |a |this |that )?(bridge|cliff|roof|rooftop|building|balcony|overpass|tower|car park|carpark|gap|dam wall|parking garage)\b/,
    /\b(standing|stood|perched|balancing|climbed|climbing|sitting|sat) (on|onto|up on|over) (the |a |this |that )(ledge|railing|railings|parapet)\b/,
    /\b(standing|stood|perched|balancing) (on|up on) (the |a |this |that )(bridge|cliff|roof|rooftop|overpass|tower)\b/,
    // WEB (Iris/Finn rows): goodbye notes, better off without me, a burden.
    /\b(my|written|wrote|writing|left|leaving|finished|recorded) (my )?goodbye (note|notes|letter|letters|messages|videos?)\b/,
    /\b(written|wrote|writing|said|saying|finished) (all )?my goodbyes?\b/,
    /\bbetter off without me\b/,
    /\b(a|such a|just a|nothing but a|only a|the) burden (to|on|for) (everyone|my family|them|you|my \w+|people|all|you all)\b/,
    /\bi am (just |only |such )?(a |such a )?burden\b/,
    // WEB (Finn fresh rows): a knife, blade or razor at, on or against the wrist or throat.
    /\b(knife|knives|blade|blades|razor|razors|razor blade|box cutter|stanley knife|scalpel|shard|broken glass)( \w+){0,3} (at|on|against|to|across|into|in) (my|my own) (wrist|wrists|throat|neck|arm|arms|veins?|skin)\b/,
    /\b(gun|pistol|rifle|shotgun|firearm|revolver|glock)( \w+){0,8} (on|at|against|to) (myself|my self|my head)\b/,
    /\b(eat|eating) (a |my )?(gun|bullet)\b/,
    // WEB (Finn adv rows): hoping not to wake up, and holding a gun.
    /\b(hope|hoping|wish|pray|praying) (that )?i (dont|do not|never|wont|will not) wake up\b(?! (early|this early|so early|that early|before|so|too|for|in time|on time|late|the|a|an|him|her|them|us|my|your|his|their|our|anyone|anybody|everyone|everybody|someone|somebody|people|neighbou?rs|until|till|at \d|at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|dawn|sunrise|lunch)))/,
    // WEB (Finn fresh rows): wanting to sleep and never wake up.
    /\b(hope|hoping|wish|want|wanting|pray|praying|rather)( \w+){0,8} never wake up\b(?! (early|this early|so early|that early|before|so|too|for|in time|on time|late|the|a|an|him|her|them|us|my|your|his|their|our|anyone|anybody|everyone|everybody|someone|somebody|people|neighbou?rs|until|till|at \d|at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|dawn|sunrise|lunch)))/,
    /\b(go to sleep|fall asleep|sleep|lie down|close my eyes|drift off|nod off)( \w+){0,4} (and|then) never wake up\b(?! (early|this early|so early|that early|before|so|too|for|in time|on time|late|the|a|an|him|her|them|us|my|your|his|their|our|anyone|anybody|everyone|everybody|someone|somebody|people|neighbou?rs|until|till|at \d|at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|dawn|sunrise|lunch)))/,
    /\b(gun|pistol|rifle|shotgun|firearm|revolver|glock|handgun) (is )?in my (hand|hands|lap|mouth)\b/
  ];

  function mentionsWeaponAndHarm(t) {
    return /\b(have|got|grabbed|holding) (a|my|the) (knife|gun|weapon|machete|bat)\b/.test(t) && R("\\b" + harmVerbs + "\\b").test(t);
  }
  // WEB (Finn fresh rows): took too much, or overdid it, plus a body symptom.
  function tooMuchAndSymptom(t) {
    return /\b((took|taken|take|had|have had|did|done|used|drank|smoked|snorted|shot up|injected|swallowed)( way| far| a bit| a little| a lot| slightly)? too much|overdid it|overdone it|over did it|over done it|overdid|too big a dose|too high a dose)\b/.test(t)
      && /\b(chest (hurts|is hurting|hurting|pain|pains|is tight|feels tight|tight|is killing me)|pain in my chest|cant breathe|cant breath|struggling to breathe|hard to breathe|trouble breathing|short of breath|breathing (is )?(weird|slow|shallow|funny)|heart (is )?(racing|pounding|going crazy|beating (really |so |too )?fast|going so fast|skipping)|(passing|passed|pass|blacking|blacked) out|vomiting|throwing up|threw up|spewing|cant stop (vomiting|throwing up|spewing)|seizure|seizing|fitting|convulsing|shaking (badly|uncontrollably)|cant stay awake|cant keep my eyes open|nodding off|keep falling asleep|turning blue|cant feel my)\b/.test(t);
  }
  // WEB (Iris/Finn rows): alcohol mixed with pills, sedatives, G or other drugs.
  function mixedAlcoholAndSedatives(t) {
    var alc = /\b((drank|drinking|drunk|had|downed|skolled|smashed|finished)( \w+){0,4} (bottle|bottles|slab|carton|goon|heaps|a lot|lots|vodka|whisky|whiskey|rum|gin|tequila|wine|beers|shots|drinks|too much)\b(?! of (water|coffee|tea|juice|milk|cola|coke|soda))|\b(alcohol|grog|booze))\b/.test(t);
    var sed = /\b(took|taken|take|taking|had|swallowed|popped|necked|dropped|did|done|mixed|mixing|on|some|a bunch of|heaps of|my)( \w+){0,3} (pills|sleeping pills|benzos?|xanax|valium|meds|medication|tablets|g|ghb|oxys?|endone|painkillers|seroquel|codeine|opioids?|heroin|fent|fentanyl|ketamine|ket|h|gear|smack)\b/.test(t);
    return alc && sed;
  }
  // WEB (Iris rows): coercive control by a partner (locking in, taking phone/keys, money, isolating, tracking).
  function coerciveControl(t) {
    var partner = /\b(my (partner|husband|wife|boyfriend|girlfriend|fiance|fiancee|ex|hubby|missus)|he|she|hes|shes)\b/.test(t);
    var act = /\b((locks|locked|locking|lock|keeps|kept) me (in|inside|out|in the house|in my room|in the room)|(takes|took|taking|hides|hid|hiding|smashed|smashes|breaks|broke|confiscates|confiscated|keeps|kept|steals|stole) (away )?my (phone|keys|car keys|wallet|cards?|bank cards?|money|passport|pay|medication)|(controls|controlling|controlled|control) (all )?(of )?(my|our) (money|finances|bank|accounts?|pay|spending|phone|life)|(wont|will not|doesnt|does not|never|dont|do not) (let|allow) me (to )?(see|talk to|call|visit|go out with|text|have|leave|work|go to work|go out)( (my|any))? ?(friends|family|mum|dad|sister|brother|anyone|people|money|a phone|my phone|the house|out|job)?|(tracks|tracking|tracked|monitors|monitoring|monitored|checks|checking|reads|reading|goes through|went through) (me|my phone|my location|where i go|my messages|my texts|my car|my bank))\b/.test(t);
    return partner && act;
  }
  // WEB (Finn last rows + Iris routine-meds exemption): medication with a saving, all, heap, necking, in-my-hand or whole-packet cue.
  // Routine or prescribed context (breakfast, morning, as prescribed, the doctor said, Webster pack, methadone/bupe dosing,
  // vitamins) exempts it UNLESS an intent or stockpile word is present. A bare "I'm going to take all my pills" still fires.
  var MED = "(pills|tablets|meds|medication|medications|sleeping (pills|tablets)|sleepers|antidepressants|anti depressants|benzos?|oxys?|oxycodone|endone|panadol|paracetamol|nurofen|ibuprofen|codeine|painkillers|valium|xanax|seroquel|quetiapine|lithium|tramadol|lyrica|sertraline|zoloft|prozac|insulin|scripts|script)";
  var medStock = R("\\b(stockpiled|stockpiling|stockpile|saving|saved|save|hoarding|hoarded|hoard|stashing|stashed|stash|collecting|collected)( up)?( all)?( of)?( my| the| some| a lot of| heaps of)?( \\w+)? " + MED + "\\b|\\b" + MED + "( \\w+){0,3} (stockpiled|saved up|stashed|hoarded)\\b");
  var medIntent = /\b(going to|gonna|want to|wanna|wanted to|about to|ready to|planning to|plan to|thinking about|thinking of|tempted to|might just|end it|end things|end my life|kill myself|so i dont wake up|so i do not wake up|never wake up|to die|be dead|overdose|od)\b/;
  var medRoutine = /\b(breakfast|lunch|dinner|morning|mornings|night|nights|nightly|bedtime|with food|with water|doctor|doctors|gp|dr|pharmacist|chemist|prescribed|prescription|my script|every day|everyday|daily|each day|vitamins|supplements|multivitamin|webster|dosette|blister pack|methadone|bupe|buprenorphine|suboxone|dose|dosing|dosed|so i dont forget|so i do not forget|routine|together)\b/;
  function medsCheck(t) {
    var med = R("\\b" + MED + "\\b").test(t), vit = /\b(vitamins|supplements|multivitamins?)\b/.test(t);
    if (!med && !vit) return null;
    var stock = medStock.test(t), intent = medIntent.test(t);
    if (medRoutine.test(t) && !stock && !intent) return null;
    if (!med) return null;
    if (stock) return "selfHarm";
    var cue = R("\\b(take|taking|took|taken|swallow|swallowing|swallowed|neck|necking|necked|down|downing|downed|pop|popping|popped|have|had|eat|ate|empty|emptied|finish|finished|use|using|chuck|chucking|chucked)( \\w+){0,2} (all|every one of|the lot of|a heap of|heaps of|a bunch of|a handful of|handfuls of|loads of|lots of|a lot of|the rest of|(the |a )?whole (packet|bottle|box|pack|strip|lot) of|(a |two |three |\\d+ )?(months|weeks) worth of)( the| my| these| those| of my| of the| his| her)? (\\w+ )?" + MED + "\\b").test(t)
      || R("\\b(neck|necking|necked)( \\w+){0,3} " + MED + "\\b").test(t)
      || R("\\b" + MED + "( \\w+){0,2} (in|on) my (hand|hands|palm|lap)\\b").test(t)
      || R("\\b(holding|staring at|counting|lined up|lining up)( \\w+){0,3} " + MED + "\\b").test(t)
      || R("\\b(the |a |my )?whole (packet|bottle|box|pack|strip|script|supply)( of)?( my| the)?( " + MED + ")?\\b").test(t)
      || R("\\b" + MED + "( \\w+){0,4} (all )?(at once|in one go|in one hit)\\b").test(t) && intent
      || R("\\bevery (pill|tablet) i (have|own|got)\\b").test(t);
    if (!cue) return null;
    return /\b(took|taken|swallowed|necked|downed|popped|had|ate|emptied|finished|used|chucked)\b/.test(t) && !intent ? "medical" : "selfHarm";
  }
  // WEB (Finn last rows): 000 / triple zero anywhere goes to emergency, unless it is informational.
  function mentions000(t) {
    return /\b000\b/.test(t) && !/\b(number|numbers|is the emergency|emergency number|fridge|taught|teach|teaching|learnt|learned|learning|poster|magnet|sticker|card|remember|in australia|for emergencies|if needed|if you need|if i need|when to call|how to call|what is|whats|said call|says call|tells you|reminder|ad|ads|advert|test|exam|quiz|class|school)\b/.test(t);
  }
  // WEB (round 6): "end it" without "all". Break-up and meeting/shift contexts are exempt.
  function endIt(t) {
    if (!/\b(going to|gonna|want to|wanna|ready to|time to|about to|planning to|plan to|will|i|just|need to|have to|gotta|could|should|might)( just)? end it\b(?! (with|there|here|between|early|for (today|now|the day|tonight)|at|after|on a|off|before))/.test(t)) return false;
    return !/\b(relationship|boyfriend|girlfriend|bf|gf|dating|marriage|break up|breakup|broke up|dumped|cheating|cheated|the meeting|meeting|shift|class|game|lease|contract|subscription|membership|series|show|chapter|story|book)\b/.test(t);
  }
  // WEB (round 6, Finn A): second tier. Broad risk words get a short check-in when no full crisis route fires.
  // WEB (round 8, Finn): tier 2 narrowed to words that are risky on their own, or a risk word paired with myself, a hurt person, or intent.
  var checkInWords = [
    /\b(rope|noose|hang|hanging)( \w+){0,4} (myself|me)\b|\bmyself( \w+){0,4} (rope|noose)\b/,
    /\b(my|this is my|tonight is my) last night\b/,
    /\b(saying|say|said|written|wrote|writing) (my )?goodbyes?\b(?! to (my )?(old|the old|drinking|using|the bottle|booze|addiction|my addiction|grog|the pokies|the pub|alcohol|drugs))|\bgoodbye (everyone|all|forever|world|for good)\b/,
    /\b(cant|can not|cannot) (go on|keep going|do this anymore|take (it|this) anymore|cope anymore)\b/,
    /\b(no|whats the|what is the) point (anymore|in (living|life|going on|anything|trying|being here)|of (living|life|anything|going on|being here))\b/,
    /\b(want|wanna|need|wish)( \w+)? (it|it all|everything|this|all of this|all this|the pain) (all )?to (stop|end)\b/,
    /\b(im|i am|i feel|feeling|i dont feel|i do not feel|im not|i am not) (\w+ )?(unsafe|not safe|safe)\b(?!.*\bnot in danger\b)/,
    /\b(kms|kys|unalive|unaliving)\b/,
    /\b(suicide|suicidal)\b/,
    /\b(hurt|hurting|harm|harming|cut|cutting|burn|burning|kill|killing|end|ending|punish|starve|starving) myself\b/,
    /\b(want to|wanna|wish i (was|were|could)|going to|gonna|i should|might as well|rather|better off)( just)? (die|dead|be dead|disappear|not wake up|not be here|vanish|be gone)\b/,
    /\b(dont|do not) want to (be here|live|wake up|exist|be alive|go on)\b(?! (early|at|for|so|before|til|till|until|on))/,
    /\b(im going to|im gonna|going to|gonna) jump\s*$/,
    /\b(tired|sick) of (living|life|being alive)\b(?! paycheck)/,
    /\b(give|giving|gave) up on (life|living|everything|myself)\b/,
    /\b(he|she|they|someone|somebody|my \w+|mum|dad)( is| are| was|s)? (hurt|bleeding|unconscious|not breathing|not moving|choking|blue|bashed)\b(?!.*\b(fine|ok|okay|all good|now|last|years ago|at work)\b)/,
    /\b(i took|ive taken|just took|took) (all|too many|heaps of|a whole|the whole)( \w+){0,3} (pills|tablets|meds|packet)\b(?!.*\b(as prescribed|with (breakfast|dinner|lunch|food)|this morning|like (the|my) (doctor|gp)))/
  ];
  // Past-only: "used to", "years ago" etc. with no present-tense risk. Lowers non-self-harm routes to nothing (medical/emergency) or a check-in; self-harm drops to a check-in, never nothing.
  var pastCue = /\b(used to|years ago|year ago|back then|back in the day|last year|in my (teens|twenties|20s|30s)|in (19|20)\d\d|when (i|he|she) was (a kid|young|younger|little|a teenager))\b/;
  var presentCue = /\b(again|now|tonight|today|right now|this week|still|keep|keeps|want to|wanna|going to|gonna|will|started|starting|is happening)\b/;
  function pastOnly(m) { return pastCue.test(m) && !presentCue.test(m); }
  function checkIn(text) {
    var m = mask(canonical(text));
    if (!m || routes(text).length) return false;
    var low = rawRoutes(m);   // a full route lowered by past-only context: self-harm, abuse and violence still get a check-in
    for (var k = 0; k < low.length; k++) if (low[k] !== "medical" && low[k] !== "emergency") return true;
    for (var i = 0; i < checkInWords.length; i++) if (checkInWords[i].test(m)) return true;
    return false;
  }
  function followedAndScared(t) {
    return R("\\b" + family + familyGap + " (wont stop|keeps|keep|is|wont leave me alone and keeps) (following|watching|stalking) me\\b").test(t)
      && /\b(scared|afraid|frightened|terrified|unsafe|not safe)\b/.test(t);
  }

  function routes(text) {
    var m = mask(canonical(text));
    if (!m) return [];
    var found = rawRoutes(m);
    if (found.length && pastOnly(m)) {
      var keep = [];
      return keep;
    }
    return found;
  }
  function rawRoutes(m) {
    var found = [];
    if (matches(m, childAbusePatterns)) found.push("childAbuse");
    if (matches(m, familyHarmPatterns)) found.push("familyHarm");
    var assault = matches(m, assaultPatterns);
    var meds = medsCheck(m);
    if (matches(m, emergencyPatterns) || mentionsWeaponAndHarm(m) || assault || mentions000(m)) found.push("emergency");
    if (matches(m, familyViolencePatterns) || followedAndScared(m) || coerciveControl(m) || (assault && R(household).test(m))) found.push("familyViolence");
    if (matches(m, medicalPatterns) || tooMuchAndSymptom(m) || mixedAlcoholAndSedatives(m) || meds === "medical") found.push("medical");
    if (matches(m, selfHarmPatterns) || meds === "selfHarm" || endIt(m)) found.push("selfHarm");
    return found;
  }
  var ORDER = ["childAbuse", "familyViolence", "familyHarm", "emergency", "medical", "selfHarm"];
  function primaryRoute(found) { for (var i = 0; i < ORDER.length; i++) if (found.indexOf(ORDER[i]) >= 0) return ORDER[i]; return null; }
  function region(code) { return REGIONS[code] || REGIONS.AU; }
  function replyText(route, code) { return region(code).replies[route] || region(code).replies.selfHarm; }
  function isCrisis(text) { return routes(text).length > 0; }
  function checkInText(code) { return region(code).replies.checkIn; }
  // tier(text): "crisis" (full route), "checkIn" (second tier) or null.
  function tier(text) { return routes(text).length ? "crisis" : (checkIn(text) ? "checkIn" : null); }

  return { REGIONS: REGIONS, normalizeForMatch: normalizeForMatch, canonical: canonical, mask: mask, routes: routes,
    primaryRoute: primaryRoute, replyText: replyText, region: region, isCrisis: isCrisis,
    checkIn: checkIn, checkInText: checkInText, tier: tier };
});
