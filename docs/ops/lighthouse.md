# Lighthouse Performance Budget

Manual gate (not CI-blocking — a single-instance Passenger deploy doesn't
warrant an lhci server; revisit if regressions recur).

Targets: Performance ≥ 80, LCP ≤ 3 s, TBT ≤ 300 ms, CLS ≤ 0.1 on `/` and
`/admin/dashboard`. Budget file: `lighthouse-budget.json`.

## Run

```bash
bun run build && bun run start &   # production bundle on :3000
bunx lighthouse http://localhost:3000 \
  --budget-path=lighthouse-budget.json --output=html \
  --output-path=./lighthouse-home.html --only-categories=performance,accessibility
bunx lighthouse http://localhost:3000/admin/dashboard \
  --budget-path=lighthouse-budget.json --output=html \
  --output-path=./lighthouse-admin.html --only-categories=performance,accessibility
```

Admin pages require an authenticated session — use Chrome DevTools' Lighthouse
panel on a logged-in tab for authenticated audits, or accept the redirect to
`/admin/login` as the audited page.

Run before each production deploy; attach reports to the release notes when
scores drop below target.
