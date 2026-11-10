# HomeCircle US website (homecirclerecovery.com) — v1 LOCAL DRAFT

Not published. Separate from the AU site (homecircle.au) so US crisis numbers always show.
Static HTML/CSS/JS, no accounts or tracking. Build: `python3 tools/build.py`. Links: `python3 tools/check_links.py`. Legal copy: `python3 tools/test_legal.py`. Publish folder + launch checks: `python3 tools/package_site.py` (writes `_site/`).

Pages: index, help, overdose, library (+ library/*), twelve-steps, meditations (breathing & practices), support, privacy, terms, health-privacy (Hale's US static wording file, 10 Nov 2026; Privacy, Terms and Consumer Health Data Privacy Policy last updated 10 November 2026).
No Kai on the US site in this release (board decision, 10 Nov 2026). Crisis bar (911, 988 call/text, SAMHSA, 1-800-MY-RESET) is static HTML at the top of every page.
Hosting: GitHub Pages via the workflow in `deploy/github-pages-workflow.yml` (move it to `.github/workflows/pages.yml` to activate; it deploys `_site/` only), custom domain in `CNAME`. Pages is not enabled yet; DNS is not changed here.
`assets/readaloud.js` is kept in the repo (shared with AU) but no US page loads it, so it isn't published.
Dropped for v1: families pages, events feed, meeting finder, Your circle, body/recovery-stages pages (AU-sourced).
`tools/us_content.py` is the one-off script that converted the AU app-content.json (already applied).
Helpline sources: SOURCES.md. Operator: Luke Endrody (sole trader), Queensland, Australia (ABN 53 687 374 897).
