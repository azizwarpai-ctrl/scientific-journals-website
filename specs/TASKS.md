# Initiatives Task Board

Top-level board for the two active initiatives. Each initiative has its own analysis doc with a per-task table; this file is the index plus a coarse status roll-up so the human reviewer sees both at a glance.

Status values: `todo` · `ready` · `analysis` · `in-review` · `in-progress` · `blocked-on-ops` · `done`.

| initiative | title | analysis doc | overall status | next action |
| -- | -- | -- | -- | -- |
| **B** (flagship) | Per-article audio: manager uploads, branded play button | [`specs/audio-abstracts/analysis.md`](./audio-abstracts/analysis.md) | **analysis / in-review** | Reviewer signs off **B-D1..B-D5** decisions. Operator confirms storage choice (B-D2) and runs the one-shot OJS audio diagnostic query. Then write `specs/audio-abstracts/spec.md` via speckit and start **B1**. |
| **A** | Manager dashboard / tracking: finish the existing surface | [`specs/dashboard-tracking/analysis.md`](./dashboard-tracking/analysis.md) | **analysis / in-review** | Reviewer signs off **A-D1..A-D4**. Recommended to run after Initiative B at least starts B3, so A1 doesn't have to be reshaped to add the audio-play column (A5). A3 and A4 do not depend on B and can ship in parallel if the reviewer wants quick wins. |

Recommended sequence (per the brief): **B first**, **A second**, with A3 / A4 optionally pulled forward in parallel.

For previously completed initiative tracking, see `specs/UIET-P1/tasks.md` (ORCID identity + engagement tracking) and `docs/scholar-subdomain/TASKS.md` (apex / OJS host cutover).
