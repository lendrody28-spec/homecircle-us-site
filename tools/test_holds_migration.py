"""Finn 28 Nov: old hc.health.v1 condition ticks must keep breath holds hidden after the cleanup."""
import json, re, subprocess, sys, pathlib
js = (pathlib.Path(__file__).resolve().parents[1] / "assets" / "site.js").read_text()
start = js.index('var HKEY = "hc.health.v1";'); end = js.index("function health()", start)
block = js[start:end]
harness = r"""
var store = {}; var localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
var cases = JSON.parse(process.argv[1]); var out = [];
cases.forEach(function (c) { store = {}; if (c !== null) store["hc.health.v1"] = JSON.stringify(c);
""" + block + r"""
 out.push(store["hc.health.v1"] || null); });
console.log(JSON.stringify(out));
"""
legacy = ["heart" + "OrBloodPressure", "asthma" + "OrLung", "preg" + "nancy", "panic" + "Attacks"]
cases = [{k: True} for k in legacy] + [{"hideHolds": True, legacy[0]: False}, {legacy[1]: False}, {"hideHolds": True}, None]
want = ['{"hideHolds":true}'] * 5 + [None, '{"hideHolds":true}', None]
got = json.loads(subprocess.check_output(["node", "-e", harness, json.dumps(cases)], text=True))
fails = [(c, g, w) for c, g, w in zip(cases, got, want) if g != w]
for f in fails: print("FAIL", f)
print(f"{len(cases)} cases, {len(fails)} failure(s)"); sys.exit(1 if fails else 0)
