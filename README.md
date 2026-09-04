# Career Log

A personal PM career system, built as a local-first PWA for iPhone. Five pillars, one loop.

| Tab | What it does |
| --- | --- |
| **Today** | This week's goals, decisions whose review date arrived, one drill, one read, one-line capture |
| **Journal** | Six entry types, axis distribution, prediction calibration, principle extraction |
| **Board** | Seven PM thinkers seated as your C-level. Answer their questions yourself first; escalate to an LLM only if stuck |
| **Reading** | Two RSS groups (PM gurus, PM·AI media). Auto-feed lands after deployment |
| **Plan** | 10-year vision → 4 phases → yearly goals → weekly goals, plus "declared vs done" |

## Principles

- **No server.** Everything lives in IndexedDB on the device. No account, no login.
- **No save button.** Input stops, it saves 500ms later.
- **Hybrid LLM, no API.** The app assembles prompts; you run them in the LLM on your phone and paste the answer back. Ten round-trips a day should feel like nothing.
- **Scripts do assembly, the LLM does judgment.** Aggregation, calibration stats, challenge selection, feed parsing — all plain code. The model is only called where quality genuinely differs.
- **Backup is the only safety net.** Export JSON from Settings and keep it somewhere like iCloud Drive.

## The wiring

Five pillars only become one app through five connections:

1. **Plan → Today** — weekly goals sit at the top of Today, every day.
2. **Today → Journal** — drills, decisions and captures all land as entries.
3. **Journal → Board** — a stuck decision goes to the board.
4. **Board → Plan** — action items from a session get promoted to weekly goals.
5. **RSS → Board** — a guru's new post badges their seat, so the lens stays current.

## Where the LLM is called

| Round-trip | Why a model, not code |
| --- | --- |
| Classify a note | Inferring type, axis and a good title from free text |
| Board session | Applying a known thinking frame to a specific problem |
| Weekly coaching | Spotting patterns and avoidance across a week of entries |
| Decision autopsy | Naming a repeated bias from predictions vs outcomes |
| Digest a read | Separating what applies from what doesn't |
| Break down a goal | Sizing work to fit a week |
| Extract principles | Finding rules already implicit in past decisions |
| Promotion gap | Judging evidence against a rubric |
| Career narrative | Turning entries into STAR and résumé bullets |
| Build vs Buy | Building the strongest counter-case |

Everything else — axis counts, hit rates, streaks, challenge rotation, date math, search — is plain code.

## Board of Advisors

Seven seats: Marty Cagan (CPO), Shreyas Doshi (Chief of Staff), Teresa Torres (VP Discovery),
Gibson Biddle (Chief Strategy), John Cutler (COO), Josh Bersin (CHRO · Domain), Annie Duke (Decision Advisor).

These are **not quotes from real people**. They are thinking frames drawn from public writing, and every
prompt carries an explicit instruction not to invent their words. Seats are data, not code — swap them freely.

## Develop

```bash
npm install
npm run dev      # dev server
npm run build    # typecheck + production build to dist/
npm run preview  # serve the build
```

## Deploy

Upload `dist/` to any static host (Vercel, Netlify, Cloudflare Pages). Two requirements:
a SPA rewrite sending all routes to `/index.html`, and **HTTPS** — without it neither the service
worker nor Home Screen install works.

Then in Safari: Share → **Add to Home Screen**.

## Not built yet

- RSS ingestion (a GitHub Action writing `public/feed.json`, wired to Board seats by author)
- Weekly review reminders (web push, iOS 16.4+, installed only)
