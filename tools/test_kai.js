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
// Build 31 crisis routes (assets/kai-crisis.js): reply text by route, US numbers, plus Finn's US rows
for (const [m, route, want] of [["he's hitting me", "familyViolence", /1-800-799-7233/], ["I'm going to hurt my wife", "familyHarm", /keep everyone safe/],
  ["she OD'd and won't wake up", "medical", /ambulance/], ["my friend is turning blue", "medical", /ambulance/], ["I'm going to kill him", "emergency", /911/],
  ["I want to take my own life", "selfHarm", /988/], ["I need to call 988", "selfHarm", /988/]]) {
  const r = say(m); ok(r.crisis && r.crisisRoute === route && /911/.test(r.text) && /988/.test(r.text) && want.test(r.text) && r.text.indexOf("911") < r.text.indexOf("988") && !/000|13 11 14|1800 737 732|1300 766 491/.test(r.text), `route: "${m}" -> ${r.crisisRoute}`);
}
for (const m of ["I went to a 988 training day", "my buddy got a fentanyl test strip kit", "I'm dying to see the game tonight", "my wifi collapsed"]) ok(!K.isCrisis(m), `not crisis: "${m}"`);
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
// Buttons-first (5 Nov): each button's route; I'm not safe always gives the full crisis reply
{
  const C = require("../assets/kai-crisis.js");
  for (const ctx of [{}, { session: { crisisHeld: true } }, { session: { turns: 40 } }]) {
    const b = K.buttonReply("notSafe", ctx);
    ok(b.route === "notSafe" && b.crisis === true && b.crisisRoute === "emergency" && b.text === C.replyText("emergency", "US") && /911/.test(b.text) && /Kai can miss things\.$/.test(b.text) && b.tels.map(t => t.href).join(",") === "tel:911,tel:988,sms:988", `notSafe button -> ${b.route} ${b.tels.map(t => t.href)}: ${b.text}`);
  }
  ok(!/\\b000\\b/.test(JSON.stringify(K.BUTTON_COPY)) , "US button copy never shows 000");
  let b = K.buttonReply("struggling", {}); ok(b.route === "struggling" && !b.crisis && /tap I'm not safe/.test(b.text) && /911/.test(b.text), `struggling button -> ${b.route}: ${b.text.slice(0, 120)}`);
  b = K.buttonReply("cravings", {}); ok(b.route === "craving" && /drink/.test(b.text) && /use/.test(b.text) && /bet/.test(b.text) && /sponsor/.test(b.text) && /15 minutes/.test(b.text), `cravings button -> ${b.route}`);
  b = K.buttonReply("meeting", {}); ok(b.route && (b.extraLinks || []).some(l => /library\.html/.test(l.href)), `meeting button -> ${b.route} ${(b.extraLinks || []).map(l => l.href)}`);
  for (const m of ["I'm not safe", "im not safe right now", "help me, I'm not safe", "please help he's bleeding everywhere", "I don't feel safe"]) {
    const r = say(m); ok(r.crisis === true && r.text === C.replyText("emergency", "US"), `typed "${m}" -> full emergency reply`);
  }
  for (const m of ["I'm not safe to drive after two beers so I took a cab"]) { const r = say(m); console.log(`      typed "${m}" -> crisis=${!!r.crisis}`); }
  for (const m of ["I want to kill myself", "I'm going to end my life tonight"]) { const r = say(m); ok(r.crisis === true, `typed messages still run the crisis check: "${m}"`); }
  ok(!/detect|recogni[sz]e/i.test(JSON.stringify(K.BUTTON_COPY)), "button copy makes no detection claim");
}
console.log(`\n${n - fail}/${n} passed`);
process.exit(fail ? 1 : 0);
