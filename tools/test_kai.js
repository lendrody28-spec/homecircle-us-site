// Node test for the in-browser Kai port: node tools/test_kai.js
globalThis.self = globalThis;
require("../assets/kai-data.js");
const K = require("../assets/kai-engine.js");
let fail = 0, n = 0;
function ok(cond, msg) { n++; if (!cond) { fail++; console.log("FAIL", msg); } else console.log("ok  ", msg); }
const say = (m, chip) => K.reply(m, chip || null, {});

// Crisis first
for (const m of ["im sad and want to die", "cant cope, kms", "gutted, dont want to be here", "I want to end it all", "thinking about suicide"]) {
  const r = say(m); ok(K.isCrisis(m) && r.crisis === true || r.route === "crisis" || /911/.test(r.text), `crisis: "${m}" -> ${r.id || r.route}: ${r.text.slice(0, 90)}`);
}
// Slang feelings -> offers breathing / meditation / walk
for (const [m, want] of [["ropeable", "anger"], ["spewing", "anger"], ["so pissed off", "anger"], ["freaking out", "anxious"], ["feeling flat", "sad"], ["snowed under", "stress"], ["over it", null]]) {
  const fs = K.feelings(m.toLowerCase()); const r = say(m);
  ok(!K.isCrisis(m) && (want == null ? fs.length > 0 : fs.indexOf(want) >= 0), `slang: "${m}" -> feelings [${fs}] route ${r.route}: ${r.text.slice(0, 100)}`);
}
// Negatives: no false feelings
for (const m of ["follow", "below", "calm down", "low battery", "not sad", "i'm down for a meeting", "pissed"]) {
  const fs = K.feelings(m.toLowerCase());
  console.log("     ", JSON.stringify(m), "->", JSON.stringify(fs), K.isCrisis(m) ? "CRISIS" : "");
  if (["follow", "below", "low battery", "not sad", "i'm down for a meeting"].includes(m)) ok(fs.length === 0 && !K.isCrisis(m), `no feeling: "${m}"`);
}
// Mixed and strongest
let r = say("im stressed and anxious");
ok(r.route === "mixedFeelings" && (r.quickReplies || []).map(q => q.chip).join(",") === "anxious,stress", `mixed: route ${r.route}, chips ${(r.quickReplies || []).map(q => q.chip)}`);
r = say("cant cope and so angry"); ok(r.route === "struggling", `"cant cope and so angry" -> ${r.route}`);
r = say("what can help"); ok(r.route === "calmTools", `"what can help" -> ${r.route}: ${r.text}`);
r = say("I'm craving", "craving"); ok(r.route === "craving", `craving chip -> ${r.route}`);
r = say("got pissed last night"); ok(r.route === "slip", `"got pissed last night" -> ${r.route}`);
r = say("are you ai"); console.log("      about Kai:", r.text);
r = say("find a meeting", "meeting"); console.log("      meeting:", r.route, r.text, K.linkHref(r.link, ""));
// health: breath holds hidden
r = K.reply("anxious", null, { health: { hideHolds: true } });
ok(!/box breathing|4-7-8/i.test(r.text), `hideHolds: anxious reply avoids holds: ${r.text.slice(0, 100)}`);
console.log(`\n${n - fail}/${n} passed`);
process.exit(fail ? 1 : 0);
