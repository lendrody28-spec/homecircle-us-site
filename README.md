# HomeCircle US website (homecirclerecovery.com) — v1 LOCAL DRAFT

Not published. Separate from the AU site (homecircle.au) so US crisis numbers always show.
Static HTML/CSS/JS, no accounts or tracking. Build: `python3 tools/build.py`. Links: `python3 tools/check_links.py`. Legal copy: `python3 tools/test_legal.py`. Publish folder + launch checks: `python3 tools/package_site.py` (writes `_site/`).

Pages: index, help, overdose, library (+ library/*), twelve-steps, meditations (breathing & practices), meetings, before-you-drive, support, privacy, terms, health-privacy, health-data-request. Terms: Hale's US static wording file (10 Nov 2026). Privacy, the Consumer Health Data Privacy Policy and the new health-data-request page (email-only request and appeal route, WA RCW 19.373.020/.040) were redrafted on 28 Nov 2026 on branch `us-legal-fixes` and are DRAFT FOR HALE until Hale clears the exact hash.
No Kai on the US site (board decision 10 Nov 2026; LJ confirmed launch without Kai 28 Nov 2026). Kai scripts, storage keys and copy are not in this repo. Crisis bar (911, 988 call/text, SAMHSA, 1-800-MY-RESET) is static HTML at the top of every page.
Hosting: GitHub Pages via `.github/workflows/pages.yml` (deploys `_site/` only, on pushes to main), custom domain in `CNAME`. As of 28 Nov 2026 Pages IS enabled and homecirclerecovery.com serves the main branch publicly (last deploy 19 Nov 2026). Static-first: no accounts, forms, analytics, server code or server-side health data; the only browser-saved value is the hideHolds on/off choice (`hc.health.v1`).
`assets/readaloud.js` was removed from this repo on 28 Nov 2026 (it was never loaded by a US page or published).
Dropped for v1: families pages, events feed, meeting finder, Your circle, body/recovery-stages pages (AU-sourced).
`tools/us_content.py` is the one-off script that converted the AU app-content.json (already applied).
Helpline sources: SOURCES.md. Operator: Luke Endrody (sole trader), Queensland, Australia (ABN 53 687 374 897).
