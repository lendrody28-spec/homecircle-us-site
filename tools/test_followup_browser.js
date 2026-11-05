// Breathing follow-up browser tests (Finn). Serve the built site: cd SITE && python3 -m http.server 8765 ; node tools/test_followup_browser.js
let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('/workspace/kaipw/node_modules/playwright-core'); }
const { chromium, devices } = pw;
const fs = require('fs'), path = require('path');
const SITE = process.env.SITE || path.resolve(__dirname, '..');
const BASE = process.env.FU_BASE || 'http://localhost:8765/';
const exe = fs.readdirSync(process.env.HOME + '/.cache/ms-playwright').find(d => d.startsWith('chromium-'));
globalThis.self = globalThis; require(SITE + '/assets/kai-data.js');
const C = require(SITE + '/assets/kai-crisis.js'), K = require(SITE + '/assets/kai-engine.js');
const REGION = /KAI_REGION = "US"/.test(fs.readFileSync(SITE + '/assets/kai-engine.js', 'utf8')) ? 'US' : 'AU';
const F = K.BUTTON_COPY.followUp, CHECKIN = C.region(REGION).replies.checkIn, WORSE = CHECKIN.replace(/\s*Want to tell me more\?\s*$/, '');
const manifest = fs.existsSync(SITE + '/tools/audio-manifest.json') ? JSON.parse(fs.readFileSync(SITE + '/tools/audio-manifest.json')) : null;
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('FAIL ' + m); } };
const mock = `(() => { window.__played = []; HTMLMediaElement.prototype.play = function () { if (!String(this.src).startsWith('data:')) window.__played.push(this.src); const a = this; a.__t = setTimeout(() => a.onended && a.onended(), 300); return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () { clearTimeout(this.__t); }; Object.defineProperty(HTMLMediaElement.prototype, 'onerror', { set() {}, get() { return null; }, configurable: true }); })();`;
async function context(b, opts) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, opts || {}));
  await ctx.addInitScript(mock);
  ctx.net = []; ctx.on('request', r => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) ctx.net.push(u); });
  ctx.flowReqs = null; ctx.on('request', r => { if (ctx.flowReqs && r.resourceType() !== 'document' && !/\.(css|js|png|jpe?g|webp|svg|ico|woff2?)(\?|$)/.test(r.url()) && !/assets\/audio\//.test(r.url())) ctx.flowReqs.push(r.url()); });
  return ctx;
}
async function page(ctx, p0) { const p = p0 || await ctx.newPage(); p.errs = p.errs || []; if (!p0) p.on('pageerror', e => p.errs.push(e.message)); return p; }
async function openKai(p) { if (await p.locator('#kai-panel').isHidden()) await p.click('#kai-bubble'); await p.waitForSelector('#kai-panel:not([hidden])'); }
const kaiLines = p => p.$$eval('#kai-log .from-kai p', x => x.map(e => e.textContent));
const chips = p => p.$$eval('#kai-chips .chip', x => x.map(e => e.textContent));
async function chip(p, label) { await p.locator('#kai-chips .chip', { hasText: label }).first().click(); await p.waitForTimeout(80); }
async function breatheAndReturn(p) {   // Kai's own breathing button -> practice page -> back to a Kai page
  await openKai(p); await p.click('[data-kai-button="struggling"]'); await p.waitForTimeout(80);
  await chip(p, REGION === 'AU' ? 'Breathing exercise' : 'Breathing exercise');
  const link = p.locator('#kai-after a.kai-link').first(); const href = await link.getAttribute('href');
  await link.click(); await p.waitForLoadState('load'); await p.waitForTimeout(200);
  return href;
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/' + exe + '/chrome-linux64/chrome' });
  // 1. F1 asked once, only after Kai's breathing button, not on the practice page, not on reload, not in a second tab
  { const ctx = await context(b); const p = await page(ctx); await p.goto(BASE + 'index.html');
    ctx.flowReqs = [];
    const href = await breatheAndReturn(p);
    ok(/library\/(box-breathing|slow-out-breath|4-7-8-breathing)\.html$/.test(href), 'breathing button opens a breathing practice ' + href);
    await openKai(p); let L = await kaiLines(p);
    ok(!L.includes(F.ask), 'no question on the practice page itself');
    await p.reload(); await p.waitForTimeout(200); await openKai(p);
    ok(!(await kaiLines(p)).includes(F.ask), 'reload on the practice page: still no question');
    const tab2 = await page(ctx); await tab2.goto(BASE + 'index.html'); await tab2.waitForTimeout(200); await openKai(tab2);
    ok(!(await kaiLines(tab2)).includes(F.ask), 'second tab never asks'); await tab2.close();
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(200); await openKai(p);
    L = await kaiLines(p);
    ok(L[L.length - 1] === F.ask, 'back on a Kai page: "How was that?" asked');
    ok(JSON.stringify(await chips(p)) === JSON.stringify([F.better, F.same, F.worse]), 'three answers');
    ok(await p.evaluate(() => sessionStorage.getItem('hc.kai.fu.v1')) === null, 'flag cleared once asked');
    await p.reload(); await p.waitForTimeout(200); await openKai(p);
    ok((await kaiLines(p)).filter(x => x === F.ask).length === 1, 'reload does not ask again');
    // I'm not safe visible and first in tab order on this step
    ok(await p.locator('#kai-notsafe').isVisible() && await p.locator('#kai-crisis').isVisible(), 'I\'m not safe and 000 strip visible on F1');
    // 2. About the same -> one technique; technique -> practice -> back -> F1; About the same -> reach-out
    await chip(p, F.same);
    L = await kaiLines(p); const ch = await chips(p);
    ok(L.slice(-2).join('|') === F.sameReply + '|' + F.encourage && ch.length === 1 && /^Try /.test(ch[0]), 'F3: text, encouragement, one technique ' + ch);
    ok(/^Something some people find helps/.test(await p.$eval('#kai-after .kai-note', e => e.textContent)), 'F3 sub-line');
    await chip(p, ch[0]);
    const t = p.locator('#kai-after a.kai-link').first(); const th = await t.getAttribute('href');
    ok(!/box-breathing/.test(th), 'technique is not the one just done ' + th);
    await t.click(); await p.waitForLoadState('load'); await p.goto(BASE + 'help.html'); await p.waitForTimeout(200); await openKai(p);
    L = await kaiLines(p); ok(L[L.length - 1] === F.ask, 'back from the technique: asked again');
    await chip(p, F.same);
    L = await kaiLines(p); ok(L[L.length - 1] === F.reachOut && (await chips(p)).length === 0, 'second About the same -> reach-out, no technique');
    ok((await p.$$('#kai-after a[href^="tel:"]')).length >= 2, 'reach-out call buttons');
    ok(await p.locator('#kai-after .kai-copyline').innerText() === F.friendLine && await p.locator('#kai-after a[href^="sms:"]').count() === 0, 'computer: copyable line instead of sms:');
    ok(ctx.flowReqs.length === 0, 'no network requests during the flow ' + ctx.flowReqs);
    ok(ctx.net.length === 0, 'no off-site requests ' + ctx.net);
    ok(p.errs.length === 0, 'no errors ' + p.errs);
    await ctx.close(); }
  // 3. Library-direct visit never asks; expired flag (31 min) never asks
  { const ctx = await context(b); const p = await page(ctx);
    await p.goto(BASE + 'library/box-breathing.html'); await p.goto(BASE + 'index.html'); await p.waitForTimeout(200); await openKai(p);
    ok(!(await kaiLines(p)).includes(F.ask), 'Library-direct visit: no question');
    await p.evaluate(() => sessionStorage.setItem('hc.kai.fu.v1', JSON.stringify({ at: Date.now() - 31 * 60 * 1000, id: 'breath-box', href: 'library/box-breathing.html' })));
    await p.reload(); await p.waitForTimeout(200); await openKai(p);
    ok(!(await kaiLines(p)).includes(F.ask) && await p.evaluate(() => sessionStorage.getItem('hc.kai.fu.v1')) === null, 'after 30 minutes: no question, flag cleared');
    await ctx.close(); }
  // 4. Worse: real crisis reply (strip, #kai-live, focus), text from kai-crisis.js; no technique for the rest of the day; recorded clip
  for (const vp of [{ width: 375, height: 667 }, { width: 320, height: 640 }]) {
    const ctx = await context(b, { viewport: vp, hasTouch: true, isMobile: true }); const p = await page(ctx); await p.goto(BASE + 'index.html');
    ctx.flowReqs = [];
    await breatheAndReturn(p); await p.goto(BASE + 'index.html'); await p.waitForTimeout(200); await openKai(p);
    await p.evaluate(() => { document.getElementById('kai-crisis').hidden = true; });
    await chip(p, F.worse); await p.waitForTimeout(100);
    const st = await p.evaluate(() => ({ strip: !document.getElementById('kai-crisis').hidden, live: document.getElementById('kai-live').textContent, focus: document.activeElement.textContent, label: document.activeElement.getAttribute('aria-label') }));
    ok(st.strip, `@${vp.width} Worse un-hides the crisis strip`);
    ok(st.live === WORSE && st.focus.indexOf(WORSE) >= 0 && st.label === "Kai's reply", `@${vp.width} Worse: reply in #kai-live and focused ${JSON.stringify(st)}`);
    const L = await kaiLines(p);
    ok(L.slice(-3).join('|') === [WORSE, F.worseReply, F.reachOut].join('|'), `@${vp.width} Worse: crisis reply, thanks, reach-out`);
    ok(await p.locator('#kai-after a[href="sms:"]').count() === 1, `@${vp.width} phone: blank sms: link`);
    const em = REGION === 'AU' ? 'tel:000' : 'tel:911';
    ok(await p.locator(`#kai-after a[href="${em}"]`).count() === 1, `@${vp.width} emergency call in the reply`);
    const lay = await p.evaluate(() => [...document.querySelectorAll('#kai-after a, #kai-after button, #kai-notsafe')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 30), h: r.height, w: r.width, right: r.right }; }));
    ok(lay.every(x => x.right <= vp.width + 0.5), `@${vp.width} reach-out buttons fit, 44px ${JSON.stringify(lay.filter(x => x.right > vp.width))}`);
    ok(lay.filter(x => x.h < 44).length === 0, `@${vp.width} tap targets >= 44px ${JSON.stringify(lay.filter(x => x.h < 44))}`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `@${vp.width} no horizontal scroll`);
    await p.screenshot({ path: `/workspace/shots/followup-worse-${vp.width}.png` });
    if (manifest) {   // read aloud: crisis reply plays its recorded clip first
      const want = manifest.lines.find(l => l.id === 'kai.crisis.worse');
      await p.locator('#kai-after .ra-btn').click(); await p.waitForTimeout(500);
      const played = await p.evaluate(() => window.__played);
      ok(want && played.length >= 1 && played[0].startsWith('blob:'), `@${vp.width} Worse read aloud plays a recorded clip`);
      ok(want && ctx.flowReqs.length === 0, `@${vp.width} no non-audio network requests`);
      await p.click('#kai-notsafe'); await p.waitForTimeout(100);
    }
    // no technique or breathing offer after Worse, rest of the day
    await p.click('[data-kai-button="struggling"]'); await p.waitForTimeout(80);
    ok(!(await chips(p)).some(x => /Breathing|Try |breath/i.test(x)), `@${vp.width} after Worse: no Breathing exercise button`);
    await p.fill('#kai-input', 'I feel stressed'); await p.press('#kai-input', 'Enter'); await p.waitForTimeout(80);
    ok(!(await chips(p)).some(x => /Breath|Box|Slow|meditation|Grounding|walk/i.test(x)), `@${vp.width} after Worse: no technique chips`);
    ok(p.errs.length === 0, `@${vp.width} no errors ${p.errs}`);
    await ctx.close(); }
  // 5. A bit better -> journal note in Your circle; Clear everything wipes the new flags
  { const ctx = await context(b); const p = await page(ctx); await p.goto(BASE + 'index.html');
    await breatheAndReturn(p); await p.goto(BASE + 'index.html'); await p.waitForTimeout(200); await openKai(p);
    await chip(p, F.better);
    ok((await kaiLines(p)).slice(-1)[0] === F.betterReply && JSON.stringify(await chips(p)) === JSON.stringify(F.journal ? [F.journal, F.done] : [F.done]), 'F2 text and buttons');
    if (!F.journal) { ok(true, 'US: no journal page, no journal button'); await ctx.close(); } else {
    await chip(p, F.journal);
    ok((await kaiLines(p)).slice(-1)[0] === F.journalSaved, 'journal saved message');
    await p.goto(BASE + 'your-circle.html'); await p.waitForTimeout(200);
    ok(await p.locator('#journal-list').innerText().then(t => t.indexOf(F.journalNote) >= 0), 'note shows in the Your circle journal');
    await p.evaluate(() => { sessionStorage.setItem('hc.kai.fu.v1', '{"at":1}'); });
    p.on('dialog', d => d.accept());
    await p.click('#delete-all'); await p.waitForLoadState('load'); await p.waitForTimeout(200);
    const left = await p.evaluate(() => ({ s: Object.keys(sessionStorage).filter(k => /^hc|kai/i.test(k)), l: Object.keys(localStorage).filter(k => /^hc|kai/i.test(k)) }));
    ok(left.s.length === 0 && left.l.length === 0, 'Clear everything wipes the follow-up flag, worse flag, journal and chat ' + JSON.stringify(left));
    ok(p.errs.length === 0, 'no errors ' + p.errs);
    await ctx.close(); } }
  // 6. Typed crisis at F1 wins
  { const ctx = await context(b); const p = await page(ctx); await p.goto(BASE + 'index.html');
    await breatheAndReturn(p); await p.goto(BASE + 'index.html'); await p.waitForTimeout(200); await openKai(p);
    await p.fill('#kai-input', 'I want to kill myself'); await p.press('#kai-input', 'Enter'); await p.waitForTimeout(80);
    const L = await kaiLines(p); ok(/(000|911)/.test(L[L.length - 1]) && (await chips(p)).every(x => ![F.better, F.same, F.worse].includes(x)), 'typed crisis at F1: crisis reply, flow stops');
    await ctx.close(); }
  await b.close(); console.log(`followup browser: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
