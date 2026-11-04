/* Kai on the HomeCircle website: the chat bubble and panel. The rules live in kai-engine.js.
   Kai isn't AI and isn't a person. No network calls: nothing you type leaves this browser.
   The chat, the bubble position and your health notes are kept in this browser's localStorage only. */
(function () {
  "use strict";
  var E = window.HCKaiEngine, root = document.getElementById("kai");
  if (!E || !root) return;
  var base = root.getAttribute("data-root") || "";
  var KEY = "hc.kai.v1", POS = "hc.kai.pos.v1";
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off: chat stays on this page */ } }
  var state = load(KEY, null);
  if (!state || !Array.isArray(state.messages)) state = { messages: [], session: E.freshSession(), quick: null, latest: null };

  var bubble = document.getElementById("kai-bubble"), panel = document.getElementById("kai-panel"),
    log = document.getElementById("kai-log"), chips = document.getElementById("kai-chips"),
    form = document.getElementById("kai-form"), input = document.getElementById("kai-input"),
    crisis = document.getElementById("kai-crisis"), empty = document.getElementById("kai-empty"),
    clearBtn = document.getElementById("kai-clear"), minBtn = document.getElementById("kai-min"),
    moveBtn = document.getElementById("kai-move"), confirmBox = document.getElementById("kai-confirm"),
    after = document.getElementById("kai-after");
  root.hidden = false;

  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function context() {
    var circle = load("hc.circle.v1", {}), day = null;
    if (circle && /^\d{4}-\d{2}-\d{2}$/.test(circle.soberDate || "")) {
      var p = circle.soberDate.split("-"), start = new Date(+p[0], +p[1] - 1, +p[2]), now = new Date();
      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var diff = Math.round((today - start) / 86400000);
      day = diff < 0 ? 0 : diff + 1;
    }
    var mine = state.messages.filter(function (m) { return !m.kai; }).slice(-5).map(function (m) { return m.text; });
    return { dayCount: day, health: load("hc.health.v1", {}), session: state.session, recentUserLines: mine, includesGA: false, offeredBreathingToday: state.breathOfferedOn === todayKey() };
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function render() {
    log.textContent = "";
    empty.hidden = state.messages.length > 0;
    state.messages.forEach(function (m) {
      var row = el("div", "kai-msg " + (m.kai ? "from-kai" : "from-me"));
      row.appendChild(el("span", "sr-only", m.kai ? "Kai: " : "You: "));
      row.appendChild(el("p", null, m.text));
      log.appendChild(row);
    });
    after.textContent = "";
    var latest = state.latest;
    if (latest && latest.link) {
      var a = el("a", "kai-link", E.linkTitle(latest.link));
      a.href = E.linkHref(latest.link, base);
      after.appendChild(a);
    }
    if (latest && latest.stat && /^https:\/\//.test(latest.stat.sourceURL)) {
      var s = el("a", "kai-source", "Source: " + latest.stat.sourceTitle);
      s.href = latest.stat.sourceURL; s.rel = "noopener";
      after.appendChild(s);
    }
    crisis.hidden = !(state.session && state.session.crisisHeld);
    chips.textContent = "";
    var quick = state.quick || [{ label: "I'm craving", chip: "craving" }, { label: "Find a meeting", chip: "meeting" }, { label: "Just listen", chip: "listen" }, { label: "What can help?", chip: "tools" }];
    quick.forEach(function (q) {
      var b = el("button", "chip", q.label); b.type = "button";
      b.addEventListener("click", function () { send(q.label, q.chip); });
      chips.appendChild(b);
    });
    log.scrollTop = log.scrollHeight;
    var sc = panel.querySelector(".kai-scroll"); if (sc) sc.scrollTop = sc.scrollHeight;
  }
  function send(text, chip) {
    text = String(text || "").trim();
    if (!text) return;
    var r = E.reply(text, chip || null, context());
    if (r.offerBreathing) state.breathOfferedOn = todayKey();
    state.messages.push({ kai: false, text: text });
    state.messages.push({ kai: true, text: r.text });
    if (state.messages.length > 200) state.messages = state.messages.slice(-200);
    state.session = r.session;
    state.quick = r.quickReplies.map(function (q) { return { label: q.label, chip: q.chip }; });
    state.latest = { link: r.link, stat: r.stat ? { sourceTitle: r.stat.sourceTitle, sourceURL: r.stat.sourceURL } : null };
    save(KEY, state);
    render();
    var live = document.getElementById("kai-live");
    if (live) { live.textContent = ""; setTimeout(function () { live.textContent = "Kai: " + r.text; }, 30); }
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); var t = input.value; input.value = ""; send(t, null); input.focus(); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });

  /* Open, minimise, clear */
  function open() {
    panel.hidden = false; bubble.setAttribute("aria-expanded", "true"); root.classList.add("open");
    render(); input.focus();
  }
  function minimise() {
    panel.hidden = true; confirmBox.hidden = true; bubble.setAttribute("aria-expanded", "false"); root.classList.remove("open"); bubble.focus();
  }
  minBtn.addEventListener("click", minimise);
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); minimise(); } });
  clearBtn.addEventListener("click", function () { confirmBox.hidden = false; confirmBox.querySelector("[data-yes]").focus(); });
  confirmBox.querySelector("[data-no]").addEventListener("click", function () { confirmBox.hidden = true; clearBtn.focus(); });
  confirmBox.querySelector("[data-yes]").addEventListener("click", function () {
    state = { messages: [], session: E.freshSession(), quick: null, latest: null };
    try { localStorage.removeItem(KEY); } catch (e) {}
    confirmBox.hidden = true; render(); input.focus();
  });

  /* Draggable bubble. It snaps to the nearer side and remembers where it sits, in this browser only. */
  var pos = load(POS, { side: "right", y: null });
  function place() {
    var size = bubble.offsetWidth || 64, h = window.innerHeight;
    var y = pos.y == null ? h - size - 24 : Math.round(pos.y * h);
    y = Math.max(84, Math.min(h - size - 12, y));
    root.style.top = y + "px"; root.style.bottom = "auto";
    root.classList.toggle("left", pos.side === "left");
    root.style.left = pos.side === "left" ? "12px" : "auto";
    root.style.right = pos.side === "left" ? "auto" : "12px";
  }
  var drag = null, moved = false;
  bubble.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, top: root.getBoundingClientRect().top, left: root.getBoundingClientRect().left };
    moved = false;
    bubble.setPointerCapture(e.pointerId);
  });
  bubble.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 8) return;
    moved = true; root.classList.add("dragging");
    root.style.left = (drag.left + dx) + "px"; root.style.right = "auto";
    root.style.top = (drag.top + dy) + "px";
  });
  function endDrag(e) {
    if (!drag) return;
    if (moved) {
      var r = root.getBoundingClientRect();
      pos = { side: r.left + r.width / 2 < window.innerWidth / 2 ? "left" : "right", y: r.top / window.innerHeight };
      save(POS, pos); place();
    }
    root.classList.remove("dragging");
    drag = null;
  }
  bubble.addEventListener("pointerup", endDrag);
  bubble.addEventListener("pointercancel", endDrag);
  bubble.addEventListener("click", function (e) {
    if (moved) { moved = false; e.preventDefault(); return; }
    if (panel.hidden) open(); else minimise();
  });
  moveBtn.addEventListener("click", function () {
    pos.side = pos.side === "left" ? "right" : "left"; save(POS, pos); place();
    moveBtn.textContent = pos.side === "left" ? "Move Kai to the right" : "Move Kai to the left";
  });
  moveBtn.textContent = pos.side === "left" ? "Move Kai to the right" : "Move Kai to the left";
  window.addEventListener("resize", place);
  place();
  render();
})();
