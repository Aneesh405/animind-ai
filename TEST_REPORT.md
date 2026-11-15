# Animind AI - performance and animated teaching verification

## Current result - November 14, 2026

The existing application was improved on branch `feature/animated-teaching-performance`. The premium design, working Demo/Gemini paths, PDF workflow, session ownership, revision handling, scene allowlist, strict plan validation, and existing local changes were preserved. This verification record was captured before the separately authorized commit/push. The source checkpoint is `../animind-checkpoints/before-teaching-fix-20261114-201728.zip`; credentials, dependencies, and runtime data were excluded.

### Measured diagnosis

Animind uses deterministic React/SVG, not generated video. Before the teaching changes, a real website lesson spent **3,223 ms in Gemini** out of **3,654 ms backend time** (about 88%). Physics was 0.08 ms; plan validation was 0.06 ms; SQLite creation was 16.66 ms. Browser response-to-paint was 81 ms. The cloud planner dominated, rather than physics or drawing.

The teaching weakness was separate: the component scene showed initial velocity projections and a dot moving along the launch arrow, rather than actual flight with changing vertical velocity. Timeline stages followed the index of generated prose steps, and the unselected tutor showed a generic lesson summary.

### Changes completed

- Preserved the existing concise-plan/LOW-thinking optimization for the configured `gemini-3.8-flash`, structured-output compatibility fix, timeout/error classification, and full validation. No extra sequential AI calls or video service were added.
- Added opt-in backend `Server-Timing` measurements for fixed phase names, plus development-only frontend request/decode performance entries. No prompt, source excerpt, session identifier, credential, or credential fingerprint is logged. Normal backend startup omits timing headers.
- Added a bounded RAM cache of **validated initial plans**: session scoped, full request/configuration bound, five-minute TTL, 64 entries, deep copies, concurrent duplicate sharing. Errors are not cached. PDF lessons and adaptive requests bypass the cache. Each use creates a distinct lesson and recalculates physics. The UI explicitly labels **Saved Gemini plan**.
- Removed the optional health refresh from the lesson's blocking path. Pending new lessons show a neutral workspace and truthful request/wait/open stages; no unrelated physics scene appears before validation. Input survives errors and Demo remains an explicit choice.
- Added six visual chapters: **knowns/goal → components → equation choice → motion → calculation → meaning**. Chapter buttons and the scrubber seek the visual. The guided sequence stops at the conclusion. Generated tutor steps remain intact and seek by equation meaning, with a specific visual-evidence hint for every step. Playing or scrubbing releases an explicit selected-step focus; narration follows the displayed step.
- Replaced launch-only component animation with an analytic projectile path and attached vectors. Horizontal velocity stays constant; vertical velocity shrinks, reaches zero at the apex, and points down during descent. Gravity points down. Equal spatial scales preserve vector direction. Arrows stop at landing because the model has no collision physics. A height-focused step seeks a real apex, including in a range lesson.
- Added equal-speed 30/45/60 comparison evidence for range, time, and horizontal velocity. Range bars now fill according to actual horizontal distance at shared elapsed time and freeze individually at landing; outlines denote final ranges.
- Retained controls, sliders, persistence, responsive layouts, native MathML, reduced motion, elapsed-time animation, memoized path geometry, and offscreen/background clock handling. Parent tutor updates follow stage changes rather than every animation frame.
- Fixed the new 60-degree evidence label's contrast and transient low contrast caused by opacity fades/text-color transitions when selecting a step. Instructional text now stays at full contrast during content changes.

### Actual timings

Measurements used the running development servers, the same question ("Why does a projectile travel farthest at 45 degrees?"), default parameters, no PDF, and configured `gemini-3.8-flash`. Both comparable runs already used the earlier LOW-thinking settings. Each comparable entry is **one request**, not an average or guarantee. The same browser measurement script and paint wait were used before/after; each request validated a real Gemini plan.

| Phase | Before these teaching/cache changes | After, fresh uncached request |
| --- | ---: | ---: |
| Visualize to painted lesson | 3,762 ms | 3,730 ms |
| Backend total | 3,654.17 ms | 3,625.77 ms |
| Gemini generation | 3,223.30 ms | 3,257.40 ms |
| Physics calculations | 0.08 ms | 0.09 ms |
| Plan/schema validation | 0.06 ms | 0.19 ms |
| SQLite creation | 16.66 ms | 10.35 ms |
| Response to painted lesson | 81 ms | 82 ms |

This is **no meaningful demonstrated improvement for a new uncached question**. A separate complete live browser test observed 4,956 ms for its uncached lesson (including extra UI assertions), **112 ms** for the identical cached request, and **4,413 ms** for an uncached real adaptation. The cached backend response took 12.25 ms and contained no Gemini span. Earlier in the same implementation session another cached request took 137 ms. Cloud/network/output variability remains the main limit for new questions; the cache improvement applies only to repeats and is clearly identified in the UI.

The earlier planner-settings A/B result (13.53 s versus 6.51 s) is retained below as a separate historical measurement. It is not the baseline for the new cache or the six visual chapters.

Evidence is kept locally in ignored `frontend/design-review/pipeline-baseline.json`, `pipeline-after-comparable.json`, and `pipeline-after.json`. These files contain phase timings and strategy names, not keys or private student content.

### PASSED tests actually executed

| Verification | Result |
| --- | --- |
| Complete backend suite | **98 passed**, 0 failed; one existing Starlette/httpx adapter deprecation warning |
| Running API regression script | **32 checks passed**, plus one real configured Gemini lesson |
| Frontend `npm run typecheck` | **Passed** |
| Frontend production build | **Passed**, including static landing/studio/icon routes |
| Complete frontend run, live opt-in enabled | **44 passed**, 0 failed, 0 skipped, no retries; about 1.8 minutes |
| Browser portion of that run | **39 Chrome scenarios**: 15 original + 14 redesign + 9 teaching + 1 real Gemini workflow |
| Pure frontend portion | **5 physics/synchronization checks** |
| Built production application | **Passed** a separate complete Demo student journey: generation, playback, adaptation, variable/what-if changes, checks, alternate diagram, reload |
| Python dependency consistency | **Passed**, `pip check` |

The real Gemini browser test used Animind's own `/api/lesson` and `/api/adapt`, not a standalone SDK result. The initial representation was range comparison and the adaptive representation was flight-component vectors. It verified mode and cache provenance, selected-step context, understanding-check response, saved reload, and zero console/page errors, failed requests, or HTTP errors in the successful journey.

Physics coverage includes complementary equal ranges, maximum range at 45 degrees, shared physical time, slider boundaries, speed/gravity relationships, constant horizontal arrows, upward/zero/downward vertical arrows, fixed vector scale, correct gravity direction, and clamping at landing. At 20 m/s and 9.81 m/s², 30° and 60° both yield 35.31194307 m; 45° yields 40.77471967 m.

Interaction coverage includes six chapters, automatic conclusion stop, equation-linked tutor selection, play/pause/replay/scrubbing, keyboard Home/End, parameter saves/reload/failure retry, nonblocking health refresh, pending live requests, unsupported new questions without an unrelated animation, genuine alternate SVGs, Demo labels, PDF upload/references, invalid inputs, and backend Gemini failure sanitization. Responsive/no-overflow and axe WCAG 2 A/AA checks passed at tested widths including 320, 390, 768, 1280, and 1440 px. Desktop/mobile screenshots of the studio, component view, and range view were inspected.

### FAILED tests and bugs fixed

**No failures remain in the final test run.** Earlier axe failures exposed the label and transition contrast issues described above; both were corrected and the complete suite was rerun successfully. One intermediate command also encountered a Playwright trace-file collision because two test commands shared the output folder. The final 44-test run was a single sequential command and had no trace collision; this was a test-runner issue rather than an application failure.

### NOT TESTED and remaining limits

- A broad statistical latency/load benchmark, guaranteed first-request latency, GPU/FPS profiling, and large-scale teaching-quality evaluation were not performed. The measurements above are individual observations.
- Real Gemini planning with uploaded PDF excerpts, real account quota exhaustion, manual audible narration, Firefox/Safari, real mobile hardware, and screen-reader audits remain unverified. PDF extraction/grounding and provider error behavior were exercised with local API/browser tests and provider mocks where stated.
- The genuine topic scope remains **ideal equal-height projectile motion, launch-angle comparisons, and velocity components**, with constant gravity and no air resistance. General algebra/function scenes, OCR, drag, slopes, unequal heights, and collision simulation are outside the MVP. Unsupported requests receive an explicit limitation.
- The canonical equations and calculated values are verified; arbitrary model prose is not mathematically certified. The generated tutor has three to five steps; the six-chapter visual sequence is deterministic and supplements those steps.
- The cache is temporary and local to a backend worker. New questions, configuration changes, PDFs, adaptation, expired entries, or another worker can still require a cloud call. The app remains a local MVP without account authentication or production hosting.

### Local run and review

Start the backend from the project root with `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1`; add `-DevTiming` only for local diagnostics. Start the frontend in another terminal with `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1`. Open `http://127.0.0.1:3000/studio`. The detailed commands and secure Gemini configuration steps remain in README.md.

The functionality is ready for review and a hackathon demo within this supported scope. Demo is the reliable offline fallback; live Gemini still depends on provider availability and quota. Publication was authorized separately after this local verification.

### Secret review and final service state

- `backend/.env` remains ignored and untracked; no credential file is in the 73-file source candidate. No API key was replaced, displayed, logged, or committed.
- Exact configured-secret matching found **zero matches** in candidate source files and all local Git objects. Gitleaks found **zero findings** in both the complete local Git history and an isolated copy of all tracked/nonignored candidate source files. Runtime data, environment files, dependencies, screenshots, and test artifacts were excluded from that source candidate. Scan output was limited to counts.
- `git diff --check` passed. Work is on `feature/animated-teaching-performance`; the four preexisting local performance edits were retained. At verification time no commit or push had been performed. **The scans cleared the source candidate for review and a later authorized commit/push.** Consult the branch history for its current publication status. No force-push is needed.
- The running backend was restarted to worker PID **40320**, confirmed `gemini-3.8-flash`, and reported matching loaded environment settings. Live application generation/adaptation succeeded. The frontend development server was restored after production verification. Backend timing is opt-in for this local diagnostic run; `.env` was not edited.
- Production-browser diagnostics found **zero runtime errors** and **zero development-only `animind:` performance entries**. Separate production screenshots confirmed the apex has zero vertical velocity and the descent arrow points downward.

---

## Earlier verification records (historical)

The sections below retain previous work and measurements. Their test counts and process IDs describe earlier snapshots; the current result above supersedes them.

## Gemini planning latency follow-up

The local planner now uses the supported LOW thinking level for `gemini-3.8-flash`, omits unsupported temperature tuning for that model, and requests concise steps. Other model configurations retain their prior generation settings. The key, model ID, website, schemas, physics engine, JSON validation, and 6,000-token output allowance are unchanged.

| Measurement | Observed result |
| --- | --- |
| Current planner settings, same question | 13.53 s total; 12.04 s provider generation |
| Optimized settings, same question | 6.51 s total; 5.29 s provider generation |
| Sample size | One sequential before/after pair; both plans validated |
| Real website lesson generation after restart | HTTP 200, 7.79 s, Gemini mode, three steps |
| Real website adaptation | HTTP 200, 5.60 s; range comparison changed to component vectors |
| Understanding check and reload | Passed; the Gemini lesson and adapted scene persisted |
| Browser console, page, transport, HTTP errors | Zero in the successful live workflow |
| Current backend regression suite | 91 passed; one existing Starlette adapter deprecation warning |

The paired result was about 2.08 times faster in this sample. Provider load and network timing vary; this is not an SLA or a broad latency benchmark. The token limit was not lowered to force incomplete JSON. The baseline returned 317 output tokens and the candidate returned 350; lower output-token count was not the demonstrated benefit. The candidate did not report a thinking-token count, so zero thinking tokens is not claimed.

The serving backend was restarted to worker PID 16056 and confirmed matching `backend/.env` configuration. Validation and model error handling remain active; no scripted Demo substitute was used. Four provider generations were used for this follow-up: the paired initial plans and the website's lesson/adaptation requests. The live browser evidence is in ignored `frontend/design-review/latency-check.json`.

The broad redesign results below are the earlier verification record. This follow-up reran the complete backend suite and a real browser lesson/adaptation/check/reload workflow; it did not rerun every earlier frontend scenario. Changes are currently local to this checkout.


> **Latest credential recheck: live Gemini is working with the updated key.** The backend was fully stopped and restarted. Worker PID 4504 confirmed matching loaded `backend/.env` settings and `gemini-3.8-flash`. A real `POST /api/lesson` in Gemini mode returned HTTP 200 in 12.6 seconds, produced three validated steps in the range-comparison scene, and saved the Gemini lesson successfully; a subsequent GET confirmed persistence. The key was not displayed or modified. This recheck verifies live lesson generation; the broader browser/adaptation results below remain the earlier redesign verification. No application-code changes or GitHub push were performed.


Date: November 14, 2026. Windows workspace; America/New_York.

## Final result

**The Learning Atelier redesign is implemented and verified locally. All 30 unique browser scenarios passed: 29 regression/redesign scenarios and one separately executed real Gemini scenario. All 89 backend tests, 32 API checks, TypeScript checks, and the production build passed.**

| Check actually run | Result |
| --- | --- |
| Backend pytest suite | **89 passed**, 0 failed; one existing Starlette adapter deprecation warning |
| API regression script, running port 8000 | **32 passed**, plus a successful configured live Gemini lesson |
| Frontend `npm run typecheck` | **Passed** |
| Frontend `npm run build` | **Passed**, including landing, studio, icon, and static page generation |
| Existing Chrome browser regressions | **15 passed** after route/label migration |
| Added redesign browser scenarios | **14 passed** |
| Opt-in real Gemini browser scenario | **1 passed**, with no mocked generation/adaptation responses |
| Browser scenario total | **30 passed**, 0 final failures, 0 retries, 0 skipped in the executed groups |
| Responsive/a11y visual cases | Both routes at **1440, 1280, 768, 390 px**; no overflow and no axe WCAG 2 A/AA violations in tested states |
| Backend preservation | All **9 backend Python source/test files** match the pre-redesign checkpoint by SHA-256 |

The 29-scenario browser regression run took about 2.9 minutes. The separate live Gemini website scenario took 21.0 seconds (21.8 seconds including runner overhead). These are observations from this run, not latency guarantees. Browser testing used the existing development server; the production build was compiled separately.

## Application and preservation

- Landing page: `http://127.0.0.1:3000/`.
- Learning studio: `http://127.0.0.1:3000/studio`.
- Backend: `http://127.0.0.1:8000`.
- Existing FastAPI endpoints, session ownership, optimistic revisions, SQLite persistence, error classes, strict model schemas, and verified physics remain unchanged.
- `backend/.env` and the existing key were not modified, displayed, or included in the source checkpoint. Health confirmed `gemini-3.8-flash` and matching loaded environment settings.
- Existing browser tests now enter `/studio` and use the renamed **Explain it differently** action. Their functional assertions were retained.
- No runtime dependencies were added. Fonts are local, with their OFL licenses included.

## Verified coverage

| Requested area | Verified result |
| --- | --- |
| Backend startup, health, endpoints | **Passed.** Fresh-start unit/integration coverage, running health, and API checks. |
| TypeScript and production build | **Passed.** Both commands exited successfully after implementation. |
| Question-to-visual lesson | **Passed in Demo and live Gemini.** Submitted through the actual UI/API. Supported landing exploration links also generated the intended Demo concepts. |
| Playback, pause, replay, timeline | **Passed.** Coordinate changes, paused stability, resumed motion, and launch/landing scrubbing were verified. Landing playback was tested too. |
| Angle, speed, gravity | **Passed.** Boundaries, presets, reset, immediate preview, saved values, reload, and failed-save retry. |
| Physics correctness | **Passed for ideal equal-height projectile motion.** Equal 30/60-degree ranges, greater 45-degree range, deterministic speed/gravity relationships, and SVG endpoints. |
| Step selection | **Passed.** Keyboard/mouse selection, selected state, visual-stage seeking, explanation, and semantic MathML. |
| Adaptive explanation | **Passed in Demo and live Gemini.** Exact confusion submitted; selected step retained during delayed loading; the returned strategy changed the actual SVG representation. |
| Understanding checks | **Passed.** Demo correct/incorrect feedback and another-visual action; live Gemini check submission returned HTTP 200. |
| PDF | **Passed.** A small supported text PDF uploaded, topics and page references appeared, and a lesson was created. Invalid uploads showed useful errors while preserving the lesson. |
| Demo mode and labeling | **Passed.** Composer, lesson, and hypothesis provenance remained explicit. Landing teaching previews are labeled as local previews making no AI request. |
| Live Gemini | **Passed.** Real lesson generation, adaptation, different diagram, check submission, and reload persistence through the redesigned website. |
| Errors and invalid inputs | **Passed in automated scope.** Unsupported questions, network recovery, PDF errors, stale revisions, ownership, invalid values, and simulated provider failures. |
| Responsive and accessibility | **Passed within tested scope.** Four requested widths on both pages, plus existing 320/390 px checks, keyboard interaction, and axe scans. Dynamic reduced-motion preferences pause automatic playback. |
| Browser console/network | **Passed for successful tested journeys.** Live Gemini and existing Demo journeys recorded clean runtime diagnostics. Both page routes were additionally checked for console/network errors during the visual review. Fresh-browser favicon returned HTTP 200. |

Under equal heights, no drag, initial speed 20 m/s, and gravity 9.81 m/s^2:

| Angle | Verified horizontal range |
| --- | --- |
| 30 degrees | 35.31194307 m |
| 45 degrees | 40.77471967 m |
| 60 degrees | 35.31194307 m |

The landing hero's 30/60-degree results matched, and 45 degrees traveled farther. Trajectory comparisons use a shared elapsed physical time and retain landed particles at the ground. Axis values, component readouts, and range bars come from deterministic calculations.

## Actual live Gemini evidence

The real website test performed this sequence with the existing secure backend configuration:

1. Opened `/studio`, started a new lesson, selected Gemini mode, and submitted: "Why does a projectile travel farthest at 45 degrees?"
2. Observed successful `POST /api/lesson`, HTTP 200, and the **Gemini lesson** label.
3. Selected returned step 2 and submitted the exact confusion below through `POST /api/adapt`.
4. Observed HTTP 200, `mode=gemini`, retained selected-step/feedback context, and strategy history advancing from `range_comparison` to `components`.
5. Verified that range-comparison bars were replaced by a velocity-vector SVG with its component markers. The strategy was not inferred from changed text alone.
6. Submitted an understanding-check answer successfully and reloaded. The Gemini provenance and adapted scene were restored.
7. Recorded **zero console errors, page errors, failed requests, or HTTP errors** throughout this successful workflow.

> Why doesn't 60 degrees travel farther if it stays in the air longer?

The API regression script made one additional real lesson request. This redesign verification used three live generation requests total: two lessons and one adaptation. Other tests used Demo behavior or explicit error fixtures. No standalone SDK HTTP response was used as proof of application success.

The previously repaired JSON-schema compatibility/error-classification bug remains fixed. No backend changes were needed for this redesign.

## Visual review and resolved findings

Rendered screenshots were inspected at all four requested widths on both pages, including mobile vector and range-comparison scenes. The review checked typography, spacing, chart labels, overflow, controls, and the companion's mobile ordering.

Initial automated findings were corrected:

- An annotated SVG group needed a valid accessible role.
- The collapsed mobile Notebook summary needed an explicit accessible name.
- A serif annotation needed stronger contrast.

The final test groups passed. A final targeted visual run also records fresh screenshots and page-level console/network checks. Screenshot capture resets the scroll position to prevent offscreen fixed skip-link artifacts in full-page images.

Evidence is retained in the ignored `frontend/design-review/` directory:

- `regression-results.json`: 29 passing regression/redesign scenarios.
- `live-results.json`: the real Gemini workflow summary and empty runtime-error arrays.
- `visual-results.json`: final targeted responsive/a11y/runtime checks.
- `landing-{width}.png`, `studio-{width}.png`, canvas/companion captures, and alternate-representation screenshots.

## Failed tests, remaining issues, and limits

**Final functional failures: none observed in the tested workflows.** The existing Starlette `httpx` adapter deprecation warning remains; tests pass with the installed dependencies.

Not tested or not established by this audit:

- Broad stochastic teaching-quality evaluation, extended load, real quota exhaustion, or deliberate invalidation of live credentials.
- Live Gemini generation grounded in PDF excerpts; PDF extraction and Demo source grounding passed.
- Audible narration, a manual screen-reader audit, native fullscreen behavior, physical touch devices, Firefox, Safari, or Edge.
- Public hosting, authentication, or multi-user production readiness.

The implemented content remains ideal projectile motion. OCR, air resistance, unequal launch/landing heights, and additional math-scene families remain outside this MVP. Numerical verification does not certify every sentence of model-generated prose. Live Gemini still depends on account quota and provider availability.

**Hackathon readiness: yes for the verified local Demo and live Gemini workflows.** Keep Demo available as the offline fallback. The three-minute walkthrough and exact Windows launch commands are in [DEMO.md](DEMO.md).

## Reproduce from the project root

Backend and API checks:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest -q
Set-Location ..
$apiResults = .\backend\.venv\Scripts\python.exe scripts\qa-api.py | ConvertFrom-Json
$apiResults | Select-Object passed_checks, live_gemini
```

Frontend and all browser scenarios (live requests use real quota):

```powershell
Set-Location frontend
npm run typecheck
npm run build
$env:ANIMIND_LIVE_GEMINI_TEST = '1'
try {
    npm run test:e2e
} finally {
    Remove-Item Env:ANIMIND_LIVE_GEMINI_TEST -ErrorAction SilentlyContinue
}
```

Without the opt-in flag, the 29 local regression/redesign cases run and the additional live case is skipped. The actual recorded verification executed the 29 cases together, then the single live test separately; it did not repeat paid calls for each viewport.
