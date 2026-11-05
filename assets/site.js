/* HomeCircle website script. No tracking, no cookies, no third parties, no network calls except the
   site's own files. Your day count, journal, health notes and Kai chat are kept only in this
   browser's localStorage (keys starting "hc."), and you can delete them on the Your circle page. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  /* A practice is running: Kai's bubble steps aside until it stops. */
  var running = 0;
  function practice(on) { running = Math.max(0, running + (on ? 1 : -1)); document.body.classList.toggle("practice-running", running > 0); }

  /* Help pill: the link works without JavaScript (it goes to the Help page);
     with JavaScript it opens Call 911 and Call 988 first. */
  var pill = document.getElementById("help-pill");
  var dlg = document.getElementById("help-dialog");
  if (pill && dlg && typeof dlg.showModal === "function") {
    pill.setAttribute("role", "button");
    pill.setAttribute("aria-haspopup", "dialog");
    pill.addEventListener("click", function (e) { e.preventDefault(); dlg.showModal(); var f = dlg.querySelector(".help-lines a"); if (f) f.focus(); });
    pill.addEventListener("keydown", function (e) { if (e.key === " ") { e.preventDefault(); pill.click(); } });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("close", function () { pill.focus(); });
  }

  /* Small-screen menu */
  var mb = document.getElementById("menu-btn"), nav = document.getElementById("site-nav");
  if (mb && nav) {
    mb.hidden = false;
    mb.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      mb.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Library filter chips */
  var chips = document.querySelectorAll("[data-filter]");
  if (chips.length) {
    document.querySelector(".filters").hidden = false;
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.getAttribute("data-filter");
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        document.querySelectorAll("[data-cat]").forEach(function (sec) {
          sec.hidden = !(f === "all" || sec.getAttribute("data-cat") === f);
        });
      });
    });
  }

  /* Upcoming events from events.json, soonest first, past hidden */
  var evList = document.getElementById("events-list");
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function hidePast(root) {
    var t = todayISO(), shown = 0;
    root.querySelectorAll("[data-end]").forEach(function (li) {
      var past = li.getAttribute("data-end") < t;
      li.hidden = past;
      if (!past) shown++;
    });
    var empty = document.getElementById("events-empty");
    if (empty) empty.hidden = shown > 0;
    return shown;
  }
  if (evList) {
    hidePast(evList);
    var limit = parseInt(evList.getAttribute("data-limit") || "0", 10);
    if (limit) Array.prototype.filter.call(evList.children, function (li) { return !li.hidden; }).slice(limit).forEach(function (li) { li.hidden = true; });
  }

  /* Breathing guide */
  var PATTERNS = {
    "breath-box": [["Breathe in", 4, 1], ["Hold", 4, 1], ["Breathe out", 4, 0], ["Hold empty", 4, 0]],
    "breath-478": [["Breathe in", 4, 1], ["Hold", 7, 1], ["Breathe out", 8, 0]],
    "breath-46": [["Breathe in", 4, 1], ["Breathe out", 6, 0]]
  };
  document.querySelectorAll("[data-breath]").forEach(function (root) {
    var ball = root.querySelector(".breath-ball"), label = root.querySelector(".breath-label"),
      phaseEl = root.querySelector("[data-phase]"), countEl = root.querySelector("[data-count]"),
      live = root.querySelector("[data-live]"), start = root.querySelector("[data-start]"),
      sel = root.querySelector("[data-pattern]"), mins = root.querySelector("[data-minutes]"),
      left = root.querySelector("[data-left]"), cues = root.querySelectorAll("[data-cue-for]");
    var timer = null, endAt = 0, running = false;
    function showCue(id) { cues.forEach(function (c) { c.hidden = c.getAttribute("data-cue-for") !== id; }); }
    function stop(msg) {
      if (running) practice(false);
      running = false; clearTimeout(timer); clearInterval(root._tick);
      start.textContent = "Start"; start.setAttribute("aria-pressed", "false");
      ball.style.transitionDuration = "1.5s"; ball.style.transform = "scale(.35)";
      phaseEl.textContent = msg || "Ready"; countEl.textContent = ""; label.classList.add("dark");
      if (live) live.textContent = msg || "Stopped.";
      if (left) left.textContent = "";
      if (sel) sel.disabled = false; if (mins) mins.disabled = false;
    }
    function run(pattern, i) {
      if (!running) return;
      if (Date.now() >= endAt) { stop("Well done. Breathe normally."); return; }
      var ph = pattern[i % pattern.length], secs = ph[1];
      ball.style.transitionDuration = secs + "s";
      ball.style.transform = ph[2] ? "scale(1)" : "scale(.35)";
      label.classList.toggle("dark", !ph[2] && ph[0] !== "Hold");
      phaseEl.textContent = ph[0];
      if (live) live.textContent = ph[0] + " for " + secs;
      var n = secs; countEl.textContent = n;
      clearInterval(root._tick);
      root._tick = setInterval(function () {
        n--; if (n > 0) countEl.textContent = n;
        if (left) { var s = Math.max(0, Math.round((endAt - Date.now()) / 1000)); left.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + " left"; }
      }, 1000);
      timer = setTimeout(function () { run(pattern, i + 1); }, secs * 1000);
    }
    if (sel) { sel.addEventListener("change", function () { showCue(sel.value); }); showCue(sel.value); }
    start.addEventListener("click", function () {
      if (running) { stop("Stopped. Breathe normally."); return; }
      var id = sel ? sel.value : root.getAttribute("data-breath");
      running = true; practice(true); start.textContent = "Stop"; start.setAttribute("aria-pressed", "true");
      if (sel) sel.disabled = true; if (mins) mins.disabled = true;
      endAt = Date.now() + (mins ? parseInt(mins.value, 10) : 3) * 60000;
      run(PATTERNS[id] || PATTERNS["breath-46"], 0);
    });
    root.addEventListener("keydown", function (e) { if (e.key === "Escape" && running) stop("Stopped. Breathe normally."); });
    stop("Ready");
  });

  /* Step-by-step practice player */
  document.querySelectorAll("[data-player]").forEach(function (root) {
    var steps = root.querySelectorAll(".pstep"), i = 0, timer = null, paused = true;
    var prev = root.querySelector("[data-prev]"), next = root.querySelector("[data-next]"),
      play = root.querySelector("[data-play]"), count = root.querySelector("[data-pcount]"),
      bar = root.querySelector(".progress i"), pos = root.querySelector("[data-pos]");
    var timed = Array.prototype.some.call(steps, function (s) { return parseInt(s.getAttribute("data-seconds"), 10) > 0; });
    root.querySelectorAll(".pcontrols").forEach(function (c) { c.hidden = false; });
    root.querySelectorAll(".pstep").forEach(function (s) { s.hidden = true; });
    if (!timed && play) play.hidden = true;
    function show(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      pos.textContent = "Step " + (i + 1) + " of " + steps.length;
      prev.disabled = i === 0; next.textContent = i === steps.length - 1 ? "Finish" : "Next";
      bar.style.width = ((i + 1) / steps.length * 100) + "%";
      var secs = parseInt(steps[i].getAttribute("data-seconds"), 10) || 0;
      count.textContent = secs ? secs + "s" : "";
      clearInterval(timer);
      if (!paused && secs) {
        var left = secs;
        timer = setInterval(function () {
          left--; count.textContent = left + "s";
          if (left <= 0) { clearInterval(timer); if (i < steps.length - 1) show(i + 1); else finish(); }
        }, 1000);
      }
    }
    var playing = false;
    function setPlaying(on) { if (on !== playing) { playing = on; practice(on); } }
    function finish() { clearInterval(timer); paused = true; setPlaying(false); if (play) play.textContent = "Start again"; pos.textContent = "Finished. Take a moment before you get up."; count.textContent = ""; }
    prev.addEventListener("click", function () { show(i - 1); });
    next.addEventListener("click", function () { if (i === steps.length - 1) finish(); else show(i + 1); });
    if (play) play.addEventListener("click", function () {
      if (play.textContent === "Start again") { paused = false; setPlaying(true); play.textContent = "Pause"; show(0); return; }
      paused = !paused; setPlaying(!paused); play.textContent = paused ? "Resume" : "Pause"; show(i);
    });
    show(0);
  });

  /* Body scan opt-in (nothing is saved) */
  var optin = document.getElementById("bodyscan-optin");
  if (optin) {
    var target = document.getElementById("bodyscan-content");
    optin.hidden = false; target.hidden = true;
    optin.querySelector("button").addEventListener("click", function () { target.hidden = false; optin.hidden = true; target.querySelector("h2, h3").focus(); });
  }

  /* Health safety: the same rule as the app. Breath holds are hidden for heart, blood pressure or
     lung conditions, pregnancy or panic attacks, or when you switch them off here. Browser only. */
  var HKEY = "hc.health.v1";
  function health() { return load(HKEY, {}); }
  function hidesHolds(h) { return !!(h.hideHolds || h.heartOrBloodPressure || h.asthmaOrLung || h.pregnancy || h.panicAttacks); }
  function applyHealth() {
    var hide = hidesHolds(health()), shown = document.body.hasAttribute("data-show-holds");
    document.querySelectorAll("[data-breath-hold]").forEach(function (n) { n.hidden = hide && !shown; });
    document.querySelectorAll("[data-holds-hidden-note]").forEach(function (n) { n.hidden = !hide || shown; });
    document.querySelectorAll("select[data-pattern]").forEach(function (sel) {
      Array.prototype.forEach.call(sel.options, function (o) { var hold = o.value === "breath-box" || o.value === "breath-478"; o.hidden = o.disabled = hide && hold; });
      if (sel.selectedOptions[0] && sel.selectedOptions[0].disabled) { sel.value = "breath-46"; sel.dispatchEvent(new Event("change")); }
    });
    document.querySelectorAll("[data-health]").forEach(function (cb) { cb.checked = !!health()[cb.getAttribute("data-health")]; });
    document.querySelectorAll("[data-holds-status]").forEach(function (n) {
      n.textContent = hide ? "Breath holds are hidden in this browser. The slow out-breath has no hold." : "Breath holds are shown.";
    });
  }
  document.querySelectorAll("[data-health]").forEach(function (cb) {
    cb.addEventListener("change", function () {
      var h = health(); h[cb.getAttribute("data-health")] = cb.checked;
      if (!save(HKEY, h)) alert("This browser isn't letting the site save settings, so this choice will reset when you leave the page.");
      applyHealth();
    });
  });
  document.querySelectorAll("[data-show-holds]").forEach(function (b) {
    b.addEventListener("click", function () { document.body.setAttribute("data-show-holds", ""); applyHealth(); });
  });
  applyHealth();

  /* Your circle: day count and journal, kept only in this browser. */
  var CKEY = "hc.circle.v1", JKEY = "hc.journal.v1";
  var dateIn = document.getElementById("sober-date");
  function dayCount(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
    var p = iso.split("-"), start = new Date(+p[0], +p[1] - 1, +p[2]), n = new Date();
    var diff = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - start) / 86400000);
    return diff < 0 ? 0 : diff + 1;
  }
  function showDays() {
    var out = document.getElementById("day-count"); if (!out) return;
    var c = load(CKEY, {}), d = dayCount(c.soberDate);
    if (dateIn) dateIn.value = c.soberDate || "";
    out.textContent = d == null ? "Set a sober date when you want a day count." : d === 0 ? "Your sober date is in the future. Day 1 starts on that date." : "Day " + d;
    var clear = document.getElementById("sober-clear"); if (clear) clear.hidden = !c.soberDate;
  }
  if (dateIn) {
    var t = new Date(); dateIn.max = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    document.getElementById("sober-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var c = load(CKEY, {}); c.soberDate = dateIn.value || null; save(CKEY, c); showDays();
    });
    document.getElementById("sober-clear").addEventListener("click", function () {
      if (!confirm("Remove your sober date from this browser?")) return;
      var c = load(CKEY, {}); delete c.soberDate; save(CKEY, c); showDays();
    });
    showDays();
  }
  var jForm = document.getElementById("journal-form"), jList = document.getElementById("journal-list");
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function showJournal() {
    if (!jList) return;
    var items = load(JKEY, []); jList.textContent = "";
    document.getElementById("journal-empty").hidden = items.length > 0;
    items.slice().sort(function (a, b) { return b.at - a.at; }).forEach(function (n) {
      var li = el("li", "card");
      li.appendChild(el("p", "small", new Date(n.at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }) + (n.prompt ? " · " + n.prompt : "")));
      li.appendChild(el("h3", null, n.title || "Note"));
      li.appendChild(el("p", "jbody", n.body));
      if (n.mood) li.appendChild(el("span", "pill", n.mood));
      var del = el("button", "btn ghost small-btn", "Delete"); del.type = "button";
      del.setAttribute("aria-label", "Delete note " + (n.title || "from " + new Date(n.at).toLocaleDateString("en-AU")));
      del.addEventListener("click", function () {
        if (!confirm("Delete this note from this browser? It cannot be undone.")) return;
        save(JKEY, load(JKEY, []).filter(function (x) { return x.id !== n.id; })); showJournal();
      });
      li.appendChild(del);
      jList.appendChild(li);
    });
  }
  if (jForm) {
    jForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var body = jForm.elements.body.value.trim(); if (!body) { jForm.elements.body.focus(); return; }
      var items = load(JKEY, []);
      items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now(), prompt: jForm.elements.prompt.value,
        title: jForm.elements.title.value.trim(), body: body, mood: jForm.elements.mood.value });
      if (!save(JKEY, items)) { alert("This browser isn't letting the site save notes, so this note wasn't kept."); return; }
      jForm.reset(); showJournal();
      var st = document.getElementById("journal-status"); if (st) st.textContent = "Saved in this browser.";
    });
    jForm.elements.prompt.addEventListener("change", function () { jForm.elements.body.placeholder = jForm.elements.prompt.value; });
    showJournal();
  }
  var wipe = document.getElementById("delete-all");
  if (wipe) wipe.addEventListener("click", function () {
    if (!confirm("This deletes your sober date, journal, health answers, Kai chat and settings from this browser. It can't be undone.")) return;
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("hc") === 0 || /kai/i.test(k)) localStorage.removeItem(k); }); } catch (e) {}
    try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf("hc") === 0 || /kai/i.test(k)) sessionStorage.removeItem(k); }); } catch (e) {}   /* Kai's breathing follow-up flag */
    location.reload();
  });
  document.querySelectorAll("[data-storage-check]").forEach(function (n) {
    var ok = true; try { localStorage.setItem("hc.test", "1"); localStorage.removeItem("hc.test"); } catch (e) { ok = false; }
    n.hidden = ok;
  });
})();
