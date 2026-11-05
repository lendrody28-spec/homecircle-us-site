// Breathing follow-up ("Did that help?") engine tests, both sites: node tools/test_followup.js
globalThis.self = globalThis;
require("../assets/kai-data.js");
const C = require("../assets/kai-crisis.js");
const K = require("../assets/kai-engine.js");
const fs = require("fs");
const REGION = /KAI_REGION = "US"/.test(fs.readFileSync(__dirname + "/../assets/kai-engine.js", "utf8")) ? "US" : "AU";
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log("FAIL " + m); } };
const F = K.BUTTON_COPY.followUp;
const ctx = (s, extra) => Object.assign({ session: s, health: {} }, extra || {});
const ask = (prev, id) => K.followUpAsk(prev || K.freshSession(), id || "breath-box");
// F1
let a = ask();
ok(a.text === "How was that? Did you notice any change in your body, even a small one?", "F1 question");
ok(JSON.stringify(a.quickReplies.map(q => q.label)) === '["A bit better","About the same","Worse"]', "F1 three buttons");
// F2
let r = K.reply(F.better, "fu:better", ctx(a.session));
ok(r.text === "Good on you for giving it a go. You can come back to this any time.", "F2 text");
ok(r.quickReplies.map(q => q.chip).join() === (K.BUTTON_COPY.followUp.journal ? "fu:journal,fu:done" : "fu:done"), "F2 journal (AU only) + done");
let j = K.reply(F.journal, "fu:journal", ctx(r.session));
ok(j.journal && j.journal.body && j.noKai, "journal note returned for kai.js to save");
let d = K.reply(F.done, "fu:done", ctx(r.session));
ok(d.quickReplies.length === 0 && d.session.fu === null, "I'm done ends the flow");
// F3: one technique, never the one just done; never the same twice
r = K.reply(F.same, "fu:same", ctx(a.session));
ok(r.messages[0].text === F.sameReply && r.messages[1].text === F.encourage, "F3 text then encouragement");
ok(r.quickReplies.length === 1 && /^fu:t:/.test(r.quickReplies[0].chip), "exactly one technique button");
ok(/^Something some people find helps/.test(r.note), "technique sub-line wording");
for (const first of ["guide-54321", "breath-46", "med-breath"]) {
  const s = K.reply(F.same, "fu:same", ctx(ask(null, first).session));
  const t = F.techniques.find(x => "fu:t:" + x.id === s.quickReplies[0].chip);
  ok(t && t.practice !== first, "not the technique just done: " + first + " -> " + (t && t.practice));
}
// holds hidden: first breathing was breath-46 -> no slow out-breath offered
{
  const h = { hideHolds: true };
  const s1 = K.followUpAsk(K.freshSession(), "breath-46");
  const all = [];
  let sess = s1.session;
  let x = K.reply(F.same, "fu:same", ctx(sess, { health: h })); all.push(x.quickReplies[0].chip);
  ok(x.quickReplies[0].chip !== "fu:t:outbreath", "holds hidden: breath-46 not offered again");
  const t = F.techniques.find(y => "fu:t:" + y.id === x.quickReplies[0].chip);
  const tr = K.reply(t.label, x.quickReplies[0].chip, ctx(x.session, { health: h }));
  ok(tr.arm === t.practice && tr.link && tr.link.practiceID === t.practice, "technique opens its practice and arms the follow-up");
  const back = K.followUpAsk(tr.session, t.practice);
  const x2 = K.reply(F.same, "fu:same", ctx(back.session, { health: h }));
  ok(x2.id === "fuReach" && x2.quickReplies.length === 0 && x2.messages[0].text === F.reachOut, "second About the same -> straight to reach-out, no technique");
  ok(!x2.messages.some(m => m.text === F.encourage), "no repeat encouragement");
}
// Worse: the checkIn crisis reply exactly, without the question, then thanks, then reach-out
const checkIn = C.region(REGION).replies.checkIn;
const want = checkIn.replace(/\s*Want to tell me more\?\s*$/, "");
r = K.reply(F.worse, "fu:worse", ctx(a.session));
ok(checkIn.endsWith("Want to tell me more?") && r.messages[0].text === want, "Worse -> checkIn text from kai-crisis.js minus the question");
ok(r.crisis === true && r.worse === true && r.messages[0].crisis === true, "Worse is a crisis reply");
ok(r.messages[1].text === "Thanks for telling me. You don't have to push through this alone." && r.messages[2].text === F.reachOut, "Worse: thanks then reach-out");
ok(r.tels.some(t => t.href === (REGION === "AU" ? "tel:000" : "tel:911")), "Worse shows the emergency call");
const em = REGION === "AU" ? "000" : "911", line = REGION === "AU" ? "13 11 14" : "988";
ok(want.indexOf(em) >= 0 && want.indexOf(em) < want.indexOf(line), "emergency number before crisis line");
// Reach-out targets
const tels = r.reach.tels.map(t => t.href);
if (REGION === "AU") {
  ok(tels.includes("tel:131114") && tels.includes("tel:1800250015") && !tels.includes("tel:1800858858"), "AU reach-out: Lifeline, AOD, no gambling without GA");
  const ga = K.reply(F.worse, "fu:worse", ctx(a.session, { includesGA: true })).reach.tels;
  ok(ga.some(t => t.href === "tel:1800858858" && /Gambling Helpline/.test(t.label)), "AU: Gambling Helpline with GA");
} else {
  ok(tels.includes("tel:988") && tels.includes("tel:18006624357") && !tels.includes("tel:18006973738"), "US reach-out: 988, SAMHSA, no gambling without GA");
  const ga = K.reply(F.worse, "fu:worse", ctx(a.session, { includesGA: true })).reach.tels;
  ok(ga.some(t => t.href === "tel:+18006973738"), "US: 1-800-MY-RESET with GA");
  ok(!new RegExp("GAMB" + "LER", "i").test(JSON.stringify(F)), "no retired national gambling number");
}
ok(r.reach.friend.line === "Having a rough day, can you talk?" && r.reach.meeting.href === "meetings.html", "friend line and meetings link");
// Worse: no technique or breathing for the rest of the day
for (const [m, chip] of [["I'm stressed", null], ["anxious", null], ["breathing", "breathing"], ["", "practice:breath-box"], ["ground me", "ground"]]) {
  const x = K.reply(m || "x", chip, ctx(r.session, { worseToday: true }));
  ok(!x.quickReplies.some(q => /^(breathing|breathe|start|ground|grounding|meditate|walk|eat|fu:t:|practice:)/.test(q.chip)) && !/breathing exercise\?/i.test(x.text) && !(x.link && /^(breath|med|guide-54321)/.test(x.link.practiceID || "")), "after Worse no technique: " + (m || chip));
}
for (const id of ["struggling", "cravings"]) {
  const x = K.buttonReply(id, ctx(r.session, { worseToday: true }));
  ok(!x.quickReplies.some(q => q.chip === "breathing"), "after Worse no Breathing exercise button: " + id);
}
// Typed crisis wins at every step
for (const s of [a.session, K.reply(F.same, "fu:same", ctx(a.session)).session]) {
  const x = K.reply("I want to kill myself", null, ctx(s)); ok(x.crisis, "typed crisis wins mid-flow");
  const y = K.reply("I want to kill myself", "fu:better", ctx(s)); ok(y.crisis, "typed crisis wins even with a follow-up chip");
}
// Wording lint
const all = JSON.stringify(F);
for (const b of ["you're doing great", "your body settling", "treats anxiety", "treating anxiety", "calms your nervous system", "lowers heart rate"]) ok(all.toLowerCase().indexOf(b) < 0, "banned: " + b);
console.log(`followup unit: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
