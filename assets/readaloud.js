/* HomeCircle read aloud. Shared by the AU and US sites (keep byte-identical).
 *
 * PRIVACY: read aloud never sends text anywhere.
 *  1. Fixed lines (Kai's crisis reply, start-button replies, first-open line, Help page)
 *     play pre-recorded clips made offline (Kokoro am_michael). Clip files have neutral hashed
 *     names, and all of a page's clips load together on the first
 *     tap, so the server can't tell which line was played.
 *  2. Anything without a clip uses the device's own speech voice, and ONLY voices with
 *     voice.localService === true. Network voices (e.g. some Chrome "Google" voices)
 *     send the text to a speech server, so they are never used. If there is no clip and
 *     no local voice, the read buttons stay hidden.
 *  Voices load late in some browsers, so we listen for "voiceschanged".
 * SAFETY: read buttons are placed after "I'm not safe" and the call buttons, nothing
 * autoplays, and tapping a call link or "I'm not safe" stops speech at once.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HCReadAloud = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  var TEENS = { "10": "ten", "11": "eleven", "12": "twelve", "13": "thirteen", "14": "fourteen", "15": "fifteen", "16": "sixteen", "17": "seventeen", "18": "eighteen", "19": "nineteen" };
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function digits(s) { return s.split("").map(function (d) { return ONES[+d]; }).join(" "); }
  function pair(s) { // two digits as a number, e.g. "13" -> "thirteen", "05" -> "zero five"
    if (s[0] === "0") return digits(s);
    if (s[0] === "1") return TEENS[s];
    return TENS[+s[0]] + (s[1] === "0" ? "" : " " + ONES[+s[1]]);
  }
  /* Spoken text only. The screen keeps the digits. */
  function speakable(text) {
    var t = String(text);
    t = t.replace(/\b1800RESPECT\b/g, "one eight hundred respect");
    t = t.replace(/\b(1[38]00) ?(\d{2,3}) ?(\d{3,4})\b/g, function (m, a, b, c) {
      var head = a === "1800" ? "one eight hundred" : "thirteen hundred";
      return head + ", " + digits(b) + ", " + (c === "1800" ? "eighteen hundred" : digits(c));
    });
    t = t.replace(/\s*\(((?:one eight hundred|thirteen hundred), [^()]*)\)\s*/g, ", on $1, ");  /* "(1800 ...)" read as ", on ...," so the number is not run into the name */
    t = t.replace(/\(?\b(0[2378])\)? (\d{4}) (\d{4})\b/g, function (m, a, b, c) { return digits(a) + ", " + digits(b) + ", " + digits(c); });
    t = t.replace(/\b(04\d\d) (\d{3}) (\d{3})\b/g, function (m, a, b, c) { return digits(a) + ", " + digits(b) + ", " + digits(c); });
    t = t.replace(/\b(04\d\d) (?=1[38]\b)/g, function (m, a) { return digits(a) + ", "; });
    t = t.replace(/\b24\/7\b/g, "twenty-four seven");
    t = t.replace(/\bCall 000 Call\b/g, "Please call 000. Call");      /* two call buttons read as two sentences */
    t = t.replace(/(^|[.!?]\s+)Call (000|911)\b/g, "$1Please call $2");  /* "Call triple zero" at a start was heard as "Core" */
    t = t.replace(/\b(13) (\d\d) (\d\d)\b/g, function (m, a, b, c) { return pair(a) + " " + pair(b) + " " + pair(c); });
    t = t.replace(/\b000\b/g, "triple zero");
    t = t.replace(/\bGPs\b/g, "G Ps").replace(/\bGP\b/g, "G P");
    t = t.replace(/\bKai\b/g, "Kye");                                  /* voice says "Kye" */
    t = t.replace(/\b911\b/g, "nine one one");
    t = t.replace(/\b988\b/g, "nine eight eight");
    t = t.replace(/ > /g, ", then ");
    t = t.replace(/\s+·\s+/g, ", ");                                 /* separators are not read */
    t = t.replace(/\bLifeline is thirteen/g, "Lifeline, thirteen");
    return t.replace(/\s+/g, " ").trim();
  }
  /* FNV-1a 32-bit of the displayed text (whitespace collapsed). Same in tools/ra.py. */
  function norm(text) { return String(text).replace(/\s+/g, " ").trim(); }
  function key(text) {
    var s = norm(text), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  /* Text of an element: text nodes joined by a space, whitespace collapsed. Same in tools/ra.py. */
  /* Headings (h1-h6, summary) end with a full stop so the voice pauses. Labels (.tag, e.g. "Guide") are not read. */
  var HEAD = /^(H[1-6]|SUMMARY)$/;
  function stopAfter(out, from) {
    for (var i = out.length - 1; i >= from; i--) if (/\S/.test(out[i])) { if (!/[.!?:;,]\s*$/.test(out[i])) out[i] = out[i].replace(/\s*$/, "."); return; }
  }
  function textOf(node) {
    var out = [];
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) out.push(c.nodeValue);
        else if (c.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(c.nodeName) && !(c.classList && (c.classList.contains("ra-skip") || c.classList.contains("tag")))) {
          var from = out.length; walk(c); if (HEAD.test(c.nodeName)) stopAfter(out, from);
        }
      }
    })(node);
    var t = norm(out.join(" "));
    if (HEAD.test(node.nodeName || "")) { var o = [t]; stopAfter(o, 0); t = o[0]; }
    return t;
  }
  function textOfExcept(node, skip) {
    if (!skip.length) return textOf(node);
    skip.forEach(function (d) { d.classList.add("ra-skip"); });
    try { return textOf(node); } finally { skip.forEach(function (d) { d.classList.remove("ra-skip"); }); }
  }
  /* Read-aloud chunks of a container: its children, except a .grid, whose cards are read (and recorded) one by one, each card's <details> and .state-line separately (keeps clips under about a minute). */
  function chunksOf(w, els) {
    var out = [], at = [];
    Array.prototype.forEach.call(w.children, function (c) {
      if (c.classList.contains("ra-bar") || c.classList.contains("ra-skip")) return;
      if (c.classList.contains("grid")) Array.prototype.forEach.call(c.children, function (k) {
        if (k.classList.contains("ra-skip")) return;
        var more = Array.prototype.filter.call(k.children, function (d) { return d.nodeName === "DETAILS" || d.classList.contains("state-line"); });
        out.push(textOfExcept(k, more)); at.push(k); more.forEach(function (d) { out.push(textOf(d)); at.push(d); });   /* a card's "More info" is its own clip */
      });
      else { out.push(textOf(c)); at.push(c); }
    });
    if (els) out.forEach(function (t, i) { if (t) els.push(at[i]); });
    return out.filter(Boolean);
  }
  /* Playback. Call unlock() synchronously inside the tap handler, before any await or fetch.
     - navigator.audioSession (iOS 17+ Safari): set type "playback" so the ring/silent switch doesn't mute us, then use Web Audio
       (one AudioContext, created or resumed in the tap).
     - otherwise: one HTMLAudioElement, primed in the tap with a silent clip, then reused for every clip. */
  var SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
  function makePlayer(env) {
    var ctx = null, el = null, src = null, mode = null, urls = [];
    function unlock() {
      var nav = env.navigator || {}, AC = env.AudioContext || env.webkitAudioContext;
      if (nav.audioSession && AC) {
        try { nav.audioSession.type = "playback"; } catch (e) {}
        mode = "webaudio";
        if (!ctx) ctx = new AC();
        if (ctx.state !== "running" && ctx.resume) { var r = ctx.resume(); if (r && r.catch) r.catch(function () {}); }
      } else {
        mode = "element";
        if (!el) el = new env.Audio();
        el.onended = el.onerror = null;
        el.src = SILENT; var q = el.play(); if (q && q.catch) q.catch(function () {});
      }
      return mode;
    }
    function halt() {
      if (src) { src.onended = null; try { src.stop(); } catch (e) {} src = null; }
      if (el) { el.onended = el.onerror = null; try { el.pause(); } catch (e) {} }
    }
    /* blob: a downloaded clip. Calls done() at the end, fail() if it can't play. */
    function play(blob, done, fail) {
      halt();
      if (mode === "webaudio" && ctx) {
        (blob.arrayBuffer ? blob.arrayBuffer() : new env.Response(blob).arrayBuffer()).then(function (ab) {
          return new Promise(function (res, rej) { var p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
        }).then(function (buf) {
          var s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination);
          s.onended = function () { if (src === s) { src = null; done(); } };
          src = s; s.start(0);
        }, fail);
        return;
      }
      if (!el) el = new env.Audio();
      var u = env.URL.createObjectURL(blob); urls.push(u);
      el.onended = function () { done(); };
      el.onerror = function () { fail(); };
      el.src = u; var q = el.play(); if (q && q.catch) q.catch(function () { fail(); });
    }
    /* Pause keeps the place; resume continues from it. Call resume() inside the tap too (iOS). */
    function pause() {
      if (mode === "webaudio" && ctx && ctx.suspend) { var r = ctx.suspend(); if (r && r.catch) r.catch(function () {}); }
      else if (el) try { el.pause(); } catch (e) {}
    }
    function resume() {
      if (mode === "webaudio" && ctx && ctx.resume) { var r = ctx.resume(); if (r && r.catch) r.catch(function () {}); }
      else if (el && el.src && el.src !== SILENT) { var q = el.play(); if (q && q.catch) q.catch(function () {}); }
    }
    return { unlock: unlock, play: play, halt: halt, pause: pause, resume: resume, mode: function () { return mode; } };
  }
  var FEMALE = /female|woman|karen|catherine|samantha|victoria|serena|kate|moira|tessa|fiona|allison|ava|susan|zira|hazel|libby|natasha|sonia|joanna|salli|kimberly/i;
  var MALE = /\bmale\b|\bman\b|daniel|lee|gordon|alex|fred|tom|aaron|arthur|oliver|george|ryan|william|james|david|mark|guy|rishi/i;
  /* Local voices only. Prefer the site's English (en-AU or en-US), then any local English;
     within that, prefer a male device voice (matches Voice B / am_michael). */
  function pickVoice(voices, lang, want) {
    var local = (voices || []).filter(function (v) { return v && v.localService === true && /^en([-_]|$)/i.test(v.lang || ""); });
    if (!local.length) return null;
    want = want || "B";
    function score(v) {
      var s = 0, n = v.name || "";
      if ((v.lang || "").replace("_", "-").toLowerCase() === (lang || "en-AU").toLowerCase()) s += 4;
      if (want === "A" && FEMALE.test(n) && !/\bmale\b/i.test(n.replace(/female/i, ""))) s += 2;
      if (want !== "A" && MALE.test(n) && !/female/i.test(n)) s += 2;
      return s;
    }
    return local.slice().sort(function (a, b) { return score(b) - score(a); })[0];
  }
  var api = { speakable: speakable, key: key, norm: norm, pickVoice: pickVoice, textOf: textOf, chunksOf: chunksOf, makePlayer: makePlayer };
  if (typeof document === "undefined" || typeof window === "undefined") return api;

  /* ---------- browser ---------- */
  var html = document.documentElement, LANG = html.lang === "en-US" ? "en-US" : "en-AU";
  var SPK = '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var clips = { B: {} }, voiceNames = {};
  try { var cj = JSON.parse((document.getElementById("ra-clips") || {}).textContent || "{}"); clips = cj.clips || clips; voiceNames = cj.voices || {}; } catch (e) {}
  var base = (document.getElementById("ra-clips") || { getAttribute: function () { return ""; } }).getAttribute("data-base") || "";
  /* Single voice (B / Kokoro am_michael). Ignore or clear any stored Voice A preference. */
  try { var _ov = localStorage.getItem("hc.ra.voice.v1"); if (_ov === "A" || _ov === "B") localStorage.removeItem("hc.ra.voice.v1"); } catch (e) {}
  function chosen() { return "B"; }
  var synth = window.speechSynthesis, localVoice = null;
  function refreshVoices() {
    localVoice = synth && synth.getVoices ? pickVoice(synth.getVoices(), LANG, "B") : null;
    update();
  }
  /* blobs: voice -> Promise<{file: Blob}> ; all of the page's clips for one voice, loaded together once, on first tap */
  var loads = {};
  function preload(v) {
    if (loads[v]) return loads[v];
    var files = {}, list = [];
    Object.keys(clips[v] || {}).forEach(function (k) { var f = clips[v][k]; if (list.indexOf(f) < 0) list.push(f); });
    loads[v] = Promise.all(list.map(function (f) {
      return fetch(base + "assets/audio/" + f).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (b) { files[f] = b; }, function () {});
    })).then(function () { return files; });
    return loads[v];
  }
  var P = makePlayer(window), active = null, queue = [], token = 0, paused = false, pauseBtn = null;
  function stop() {
    token++; queue = [];
    if (paused) { P.resume(); if (synth && synth.resume) try { synth.resume(); } catch (e) {} }   /* a suspended context or paused voice would block the next read */
    paused = false; pending = null; hidePause();
    P.halt();
    if (synth) try { synth.cancel(); } catch (e) {}
    if (active) { setBtn(active, false); active = null; }
  }
  function setBtn(b, on) {
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.classList.toggle("on", on);
    var t = b.querySelector(".ra-t"); if (t) t.textContent = on ? "Stop" : "Read aloud";
    b.setAttribute("aria-label", on ? "Stop reading" : (b.getAttribute("data-ra-label") || "Read aloud"));
  }
  /* play one text: Voice B clip, else device voice. Never silent if any exists. */
  function playOne(text, my, done) {
    var k = key(text), v = "B";
    function tryClip() {
      if (my !== token) return;
      if (!(clips[v] && clips[v][k])) return speakDevice(text, my, done);
      preload(v).then(function (files) {
        if (my !== token) return;
        var blob = files[clips[v][k]];
        if (!blob) return speakDevice(text, my, done);
        whenPlaying(function () { if (my === token) P.play(blob, function () { if (my === token) done(); }, function () { if (my === token) speakDevice(text, my, done); }); });
      });
    }
    tryClip();
  }
  function speakDevice(text, my, done) {
    if (!localVoice || !synth || typeof SpeechSynthesisUtterance === "undefined") return done();
    var u = new SpeechSynthesisUtterance(speakable(text));
    u.voice = localVoice; u.lang = localVoice.lang;
    u.onend = u.onerror = function () { if (my === token) done(); };
    whenPlaying(function () { if (my === token) synth.speak(u); });
  }
  /* One Pause/Resume toggle, shown under the text being read while it plays. */
  function pauseButton() {
    if (pauseBtn) return pauseBtn;
    var b = pauseBtn = document.createElement("button");
    b.type = "button"; b.className = "ra-pause ra-skip"; b.hidden = true;
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = '<span class="ra-pt">Pause</span>';
    b.setAttribute("aria-label", "Pause reading");
    return b;
  }
  function placePause(after) {
    var b = pauseButton();
    if (after && after.parentNode && after.parentNode.classList && after.parentNode.classList.contains("grid")) { if (after.lastChild !== b) after.appendChild(b); }   /* inside the card, not a new grid cell */
    else if (after && after.parentNode && after.nextSibling !== b) after.parentNode.insertBefore(b, after.nextSibling);
    b.hidden = false; syncPause();
  }
  var pending = null;
  function whenPlaying(fn) { if (paused) pending = fn; else fn(); }   /* a clip that loads while paused waits for Resume */
  function hidePause() { if (pauseBtn) { pauseBtn.hidden = true; syncPause(); } }
  function syncPause() {
    if (!pauseBtn) return;
    pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
    pauseBtn.querySelector(".ra-pt").textContent = paused ? "Resume" : "Pause";
    pauseBtn.setAttribute("aria-label", paused ? "Resume reading" : "Pause reading");
    pauseBtn.classList.toggle("on", paused);
  }
  function togglePause() {
    if (!active) return;
    paused = !paused;
    if (paused) { P.pause(); if (synth && synth.pause) try { synth.pause(); } catch (e) {} }
    else { P.resume(); if (synth && synth.resume) try { synth.resume(); } catch (e) {} var f = pending; pending = null; if (f) f(); }
    syncPause();
  }
  function run(btn, texts) {
    stop();
    var v = chosen(); if (texts.some(function (t) { return clips[v] && clips[v][key(t)]; })) preload(v);   /* one batch for the chosen voice, only if this text has clips */
    var my = token; active = btn; setBtn(btn, true); queue = texts.slice();
    (function next() {
      if (my !== token) return;
      var t = queue.shift();
      if (t == null) { setBtn(btn, false); active = null; paused = false; hidePause(); return; }
      if (!t) return next();
      var i = texts.length - queue.length - 1, at = btn._raAnchor ? btn._raAnchor(i) : null;
      placePause(at || btn);
      playOne(t, my, next);
    })();
  }
  function canRead(texts) { return !!localVoice || texts.every(function (t) { var k = key(t); return clips.B && clips.B[k]; }); }
  var pageEls = [];
  function pageTexts() {
    var w = document.querySelector("main .wrap"); pageEls = []; return w ? chunksOf(w, pageEls) : [];
  }
  function button(label, getTexts, small) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "ra-btn ra-skip" + (small ? " ra-small" : "");
    b.innerHTML = SPK + '<span class="ra-t">Read aloud</span>';
    b.setAttribute("data-ra-label", label); b.setAttribute("aria-label", label); b.setAttribute("aria-pressed", "false");
    b._raTexts = getTexts;
    if (getTexts === pageTexts) b._raAnchor = function (i) { return pageEls[i]; };   /* pause sits under the section being read */
    b.hidden = !canRead(getTexts());
    return b;
  }
  function update() {
    Array.prototype.forEach.call(document.querySelectorAll(".ra-btn"), function (b) { if (b._raTexts) b.hidden = !canRead(b._raTexts()); });
    var any = Array.prototype.some.call(document.querySelectorAll(".ra-btn"), function (b) { return !b.hidden; });
    html.classList.toggle("ra-on", any);
    syncVoiceUI();
  }
  function syncVoiceUI() {
    if (synth && synth.getVoices) localVoice = pickVoice(synth.getVoices(), LANG, "B");
  }
  /* No voice picker: Voice B only. Stub kept so kai.js can append without a second code path. */
  function voicePicker() {
    var g = document.createElement("div");
    g.className = "ra-voices ra-skip"; g.hidden = true; g.setAttribute("aria-hidden", "true");
    return g;
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest(".ra-btn,.ra-pause") : null;
    if (!t) return;
    if (t === pauseBtn) { togglePause(); return; }
    if (t !== active) P.unlock();   /* synchronously in the tap, before any fetch or await (iOS) */
    if (t === active) { stop(); return; }
    run(t, t._raTexts());
  });
  /* SAFETY: a call link or "I'm not safe" stops speech immediately. Capture phase, no preventDefault. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="tel:"],a[href^="sms:"],#kai-notsafe,.help-pill') : null;
    if (a) stop();
  }, true);
  window.addEventListener("pagehide", stop);

  function init() {
    var bar = document.querySelector(".ra-bar");
    if (bar) { bar.insertBefore(button("Read this page aloud", pageTexts), bar.firstChild); }
    if (synth && synth.addEventListener) synth.addEventListener("voiceschanged", refreshVoices);
    else if (synth) synth.onvoiceschanged = refreshVoices;
    refreshVoices();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  api.pause = togglePause; api.isPaused = function () { return paused; };
  api.button = button; api.voicePicker = voicePicker; api.stop = stop; api.update = update;
  return api;
});
