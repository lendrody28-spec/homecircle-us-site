/* HomeCircle read aloud. Shared by the AU and US sites (keep byte-identical).
 *
 * PRIVACY: read aloud never sends text anywhere.
 *  1. Fixed lines (Kai's crisis reply, start-button replies, first-open line, Help page)
 *     play pre-recorded clips made offline with Piper. Clip files have neutral hashed
 *     names, and all of a page's clips for the chosen voice load together on the first
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
      var head = a === "1800" ? "one eight hundred" : "one three hundred";
      return head + ", " + digits(b) + ", " + (c === "1800" ? "one eight hundred" : digits(c));
    });
    t = t.replace(/\(?\b(0[2378])\)? (\d{4}) (\d{4})\b/g, function (m, a, b, c) { return digits(a) + ", " + digits(b) + ", " + digits(c); });
    t = t.replace(/\b(04\d\d) (\d{3}) (\d{3})\b/g, function (m, a, b, c) { return digits(a) + ", " + digits(b) + ", " + digits(c); });
    t = t.replace(/\b(04\d\d) (?=1[38]\b)/g, function (m, a) { return digits(a) + ", "; });
    t = t.replace(/\b24\/7\b/g, "twenty-four seven");
    t = t.replace(/\b(13) (\d\d) (\d\d)\b/g, function (m, a, b, c) { return pair(a) + " " + pair(b) + " " + pair(c); });
    t = t.replace(/\b000\b/g, "triple zero");
    t = t.replace(/\b911\b/g, "nine one one");
    t = t.replace(/\b988\b/g, "nine eight eight");
    t = t.replace(/ > /g, ", then ");
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
  function textOf(node) {
    var out = [];
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) out.push(c.nodeValue);
        else if (c.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(c.nodeName) && !(c.classList && c.classList.contains("ra-skip"))) walk(c);
      }
    })(node);
    return norm(out.join(" "));
  }
  var FEMALE = /female|woman|karen|catherine|samantha|victoria|serena|kate|moira|tessa|fiona|allison|ava|susan|zira|hazel|libby|natasha|sonia|joanna|salli|kimberly/i;
  var MALE = /\bmale\b|\bman\b|daniel|lee|gordon|alex|fred|tom|aaron|arthur|oliver|george|ryan|william|james|david|mark|guy|rishi/i;
  /* Local voices only. Prefer the site's English (en-AU or en-US), then any local English;
     within that, prefer the chosen voice's style ("female" for A, "male" for B). */
  function pickVoice(voices, lang, want) {
    var local = (voices || []).filter(function (v) { return v && v.localService === true && /^en([-_]|$)/i.test(v.lang || ""); });
    if (!local.length) return null;
    function score(v) {
      var s = 0, n = v.name || "";
      if ((v.lang || "").replace("_", "-").toLowerCase() === (lang || "en-AU").toLowerCase()) s += 4;
      if (want === "A" && FEMALE.test(n) && !/\bmale\b/i.test(n.replace(/female/i, ""))) s += 2;
      if (want === "B" && MALE.test(n) && !/female/i.test(n)) s += 2;
      return s;
    }
    return local.slice().sort(function (a, b) { return score(b) - score(a); })[0];
  }
  var api = { speakable: speakable, key: key, norm: norm, pickVoice: pickVoice, textOf: textOf };
  if (typeof document === "undefined" || typeof window === "undefined") return api;

  /* ---------- browser ---------- */
  var html = document.documentElement, LANG = html.lang === "en-US" ? "en-US" : "en-AU";
  var SPK = '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var clips = { A: {}, B: {} }, voiceNames = {};
  try { var cj = JSON.parse((document.getElementById("ra-clips") || {}).textContent || "{}"); clips = cj.clips || clips; voiceNames = cj.voices || {}; } catch (e) {}
  var base = (document.getElementById("ra-clips") || { getAttribute: function () { return ""; } }).getAttribute("data-base") || "";
  function hasVoice(v) { return clips[v] && Object.keys(clips[v]).length > 0; }
  var both = hasVoice("A") && hasVoice("B");
  function chosen() { var v = null; try { v = localStorage.getItem("hc.ra.voice.v1"); } catch (e) {} if (v !== "A" && v !== "B") v = "A"; if (!hasVoice(v)) v = hasVoice("A") ? "A" : (hasVoice("B") ? "B" : v); return v; }
  function setChosen(v) { try { localStorage.setItem("hc.ra.voice.v1", v); } catch (e) {} syncVoiceUI(); }
  var synth = window.speechSynthesis, localVoice = null;
  function refreshVoices() {
    localVoice = synth && synth.getVoices ? pickVoice(synth.getVoices(), LANG, chosen()) : null;
    update();
  }
  /* blobs: voice -> Promise<{file: objectURL}> ; loaded once per voice, on first tap */
  var loads = {};
  function preload(v) {
    if (loads[v]) return loads[v];
    var files = {}, list = [];
    Object.keys(clips[v] || {}).forEach(function (k) { var f = clips[v][k]; if (list.indexOf(f) < 0) list.push(f); });
    loads[v] = Promise.all(list.map(function (f) {
      return fetch(base + "assets/audio/" + f).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (b) { files[f] = URL.createObjectURL(b); }, function () {});
    })).then(function () { return files; });
    return loads[v];
  }
  var audio = null, active = null, queue = [], token = 0;
  function stop() {
    token++; queue = [];
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
    if (synth) try { synth.cancel(); } catch (e) {}
    if (active) { setBtn(active, false); active = null; }
  }
  function setBtn(b, on) {
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.classList.toggle("on", on);
    var t = b.querySelector(".ra-t"); if (t) t.textContent = on ? "Stop" : "Read aloud";
    b.setAttribute("aria-label", on ? "Stop reading" : (b.getAttribute("data-ra-label") || "Read aloud"));
  }
  /* play one text: chosen voice clip, else the other voice's clip, else device voice. Never silent if any exists. */
  function playOne(text, my, done) {
    var k = key(text), v = chosen(), o = v === "A" ? "B" : "A";
    var order = [v, o].filter(function (x) { return clips[x] && clips[x][k]; });
    function tryClip(i) {
      if (my !== token) return;
      if (i >= order.length) return speakDevice(text, my, done);
      preload(order[i]).then(function (files) {
        if (my !== token) return;
        var url = files[clips[order[i]][k]];
        if (!url) return tryClip(i + 1);
        audio = new Audio(url);
        audio.onended = function () { if (my === token) done(); };
        audio.onerror = function () { tryClip(i + 1); };
        var p = audio.play(); if (p && p.catch) p.catch(function () { if (my === token) tryClip(i + 1); });
      });
    }
    tryClip(0);
  }
  function speakDevice(text, my, done) {
    if (!localVoice || !synth || typeof SpeechSynthesisUtterance === "undefined") return done();
    var u = new SpeechSynthesisUtterance(speakable(text));
    u.voice = localVoice; u.lang = localVoice.lang;
    u.onend = u.onerror = function () { if (my === token) done(); };
    synth.speak(u);
  }
  function run(btn, texts) {
    stop();
    var v = chosen(); if (texts.some(function (t) { return clips[v] && clips[v][key(t)]; })) preload(v);   /* one batch for the chosen voice, only if this text has clips */
    var my = token; active = btn; setBtn(btn, true); queue = texts.slice();
    (function next() {
      if (my !== token) return;
      var t = queue.shift();
      if (t == null) { setBtn(btn, false); active = null; return; }
      if (!t) return next();
      playOne(t, my, next);
    })();
  }
  function canRead(texts) { return !!localVoice || texts.every(function (t) { var k = key(t); return (clips.A && clips.A[k]) || (clips.B && clips.B[k]); }); }
  function pageTexts() {
    var w = document.querySelector("main .wrap"); if (!w) return [];
    return Array.prototype.filter.call(w.children, function (c) { return !c.classList.contains("ra-bar") && !c.classList.contains("ra-skip"); }).map(textOf).filter(Boolean);
  }
  function button(label, getTexts, small) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "ra-btn ra-skip" + (small ? " ra-small" : "");
    b.innerHTML = SPK + '<span class="ra-t">Read aloud</span>';
    b.setAttribute("data-ra-label", label); b.setAttribute("aria-label", label); b.setAttribute("aria-pressed", "false");
    b._raTexts = getTexts;
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
    var v = chosen();
    Array.prototype.forEach.call(document.querySelectorAll(".ra-voices"), function (g) {
      g.hidden = !both;
      Array.prototype.forEach.call(g.querySelectorAll("[data-ra-voice]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-ra-voice") === v ? "true" : "false"); });
    });
    if (synth && synth.getVoices) localVoice = pickVoice(synth.getVoices(), LANG, v);
  }
  function voicePicker() {
    var g = document.createElement("div");
    g.className = "ra-voices ra-skip"; g.setAttribute("role", "group"); g.setAttribute("aria-label", "Read aloud voice");
    ["A", "B"].forEach(function (v) {
      var pick = document.createElement("button");
      pick.type = "button"; pick.className = "ra-voice"; pick.setAttribute("data-ra-voice", v);
      pick.textContent = "Voice " + v; pick.setAttribute("aria-label", "Use Voice " + v + " for read aloud");
      var smp = document.createElement("button");
      smp.type = "button"; smp.className = "ra-sample"; smp.setAttribute("data-ra-sample", v);
      smp.innerHTML = SPK + '<span class="sr-only">Play a sample of Voice ' + v + "</span>";
      g.appendChild(pick); g.appendChild(smp);
    });
    g.hidden = !both;
    return g;
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest(".ra-btn,[data-ra-voice],[data-ra-sample]") : null;
    if (!t) return;
    if (t.hasAttribute("data-ra-voice")) { stop(); setChosen(t.getAttribute("data-ra-voice")); return; }
    if (t.hasAttribute("data-ra-sample")) {
      var v = t.getAttribute("data-ra-sample"), s = voiceNames.sample;
      stop(); var my = token;
      if (s && clips[v] && clips[v][s]) preload(v).then(function (f) { if (my !== token) return; var u = f[clips[v][s]]; if (u) { audio = new Audio(u); audio.play(); } });
      return;
    }
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
    if (bar) { bar.insertBefore(button("Read this page aloud", pageTexts), bar.firstChild); bar.appendChild(voicePicker()); }
    if (synth && synth.addEventListener) synth.addEventListener("voiceschanged", refreshVoices);
    else if (synth) synth.onvoiceschanged = refreshVoices;
    refreshVoices();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  api.button = button; api.voicePicker = voicePicker; api.stop = stop; api.update = update;
  return api;
});
