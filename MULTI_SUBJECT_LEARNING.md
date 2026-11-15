# Multi-subject learning

The existing `/studio` now has five subject tabs. Physics initially opens the established projectile notebook; selecting a subject opens its lesson cards and custom question form. All eight advertised visualizations are implemented in trusted React/SVG components.

## Demo questions

| Subject | Interactive visualization | Demo question |
| --- | --- | --- |
| Mathematics | Linear function | How do slope and intercept change a linear function? |
| Mathematics | Quadratic function | How do the coefficients change a quadratic function? |
| Physics | Projectile motion | Why is projectile range greatest at 45 degrees? |
| Physics | Simple pendulum | How does length change a simple pendulum’s period? |
| Physics | Newton’s second law | How does Newton’s second law relate force, mass, and acceleration? |
| Chemistry | Water molecule | Why is the water molecule bent and polar? |
| Biology | Animal cell | What do the structures in an animal cell do? |
| Computer Science | Bubble sort | How does bubble sort compare and swap numbers? |

Use the cards to select a validated concept explicitly. You can also type the demo questions into the selected subject's question form. Unknown concepts are explanation only, with no unrelated animation. All five subjects support written Gemini explanations. Offline written references include integration, electric fields, sodium chloride, photosynthesis, and binary search. Other offline questions receive a clearly labeled study guide and an invitation to use Gemini for a tailored explanation.

## Architecture

`backend/visual_learning.py` adds `POST /api/visual-lesson`. Requests include session UUID, subject, question, mode, and an optional enum concept ID. Curated cards send explicit concept IDs; conservative subject-specific rules recognize common custom questions. Subject/concept mismatches are rejected. Unmatched questions keep a null concept. Cubic polynomials and double pendulums cannot accidentally select their simpler counterparts.

Pydantic validates concept IDs, finite bounded numeric parameters, unknown fields, and bounded sort arrays. Every concept has a default parameter model, including the existing projectile parameters. Invalid Gemini JSON, unsupported IDs, or invalid parameters fall back to written reference content. A valid but mismatched Gemini concept is removed before rendering. Provider configuration, authentication, quota, and network errors remain visible; they are not presented as successful generated lessons.

The existing Gemini SDK helper accepts a subject-specific system instruction while retaining its original projectile instruction and numerical validation for the original plan schemas. New lessons use native structured JSON responses and the existing session-scoped RAM cache implementation. Keys include session, question/context, model, instruction, schema, and credential hash inputs; no credentials are sent to the browser. Only data is accepted from Gemini. React renders prose as text, and the renderer selects from a static component registry.

`frontend/lib/visualizations.ts` contains concept metadata, defaults, deterministic mathematics, sorting logic, and scientific selection descriptions. `frontend/components/visualizations/registry.ts` associates every concept with a typed trusted component and declares supported interactions. `SubjectStudio` renders supported components and ordered lesson steps, manages stale requests and errors, and delegates projectile lessons to the original notebook with the selected question and mode.

## Scientific scope

- Linear graphs show slope, intercept, and instant coefficient updates.
- Quadratic graphs show vertex, symmetry axis, opening direction, and real roots. Zero leading coefficient becomes a linear or constant function. Root calculation avoids unnecessary cancellation. The fixed graph window is stated; features outside it remain in the text readout.
- Projectile physics, verified metrics, adaptive strategies, PDFs, what-if controls, and existing assumptions are preserved.
- Pendulum animation uses θ(t) = θ₀ cos(√(g/L)t) and T = 2π√(L/g), with SI units. Angles are limited to ±15°. It assumes a point mass and massless rigid rod, and omits damping. Rod length on screen is schematic. Reduced motion pauses automatic playback.
- Newton's diagram displays a signed net-force arrow and a = F/m with acceleration direction. It is a force/acceleration diagram, not a position integrator. No friction or individual force decomposition is modeled.
- Water contains one O and two H atoms with a 104.5° bond angle. It is a simplified ball-and-stick diagram, with selectable atoms and bonds. Electron clouds and lone pairs are omitted.
- The animal cell includes selectable membrane, cytoplasm, nucleus, mitochondria, and ribosomes. It is simplified and not to scale.
- Bubble sort generates actual adjacent comparisons and swaps for the entered array. Stable element identities animate real swaps. Next/Previous, Play/Pause, Reset, validation, and completion work with negatives and duplicate values. The visualization stores snapshots for reversibility; that teaching history uses additional memory beyond an in-place sorting implementation.

## Voice and Red Pen

New lessons reuse `VoiceTutorControls` and `useSpeechSynthesis`; there is no new narration service. Narration follows the selected teaching step and cancels when the step, question, or subject changes. Listen, Pause, Resume, Replay, Stop, installed voices, and saved speed preferences use the existing browser speech system. Availability still depends on the browser.

Projectile lessons retain the existing Red Pen panel, its submission/reveal gates, and its verified challenge bank. Red Pen has not been extended to other subjects. Switching away from the projectile notebook unmounts it; returning restores its existing session history or opens the explicitly selected projectile question.

## Local commands (macOS/Linux)

From the repository root, run in separate terminals:

```sh
backend/.venv/bin/python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

```sh
cd frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open http://127.0.0.1:3000/studio. Demo works without credentials. Configure Gemini only in `backend/.env` using the existing example and README instructions. A configured model and API key are required for live mode.

Validation commands:

```sh
backend/.venv/bin/python -m pytest backend -q
cd frontend
npm run typecheck
npm run build
npx playwright test tests/multi-subject.spec.ts
npx playwright test
```

Playwright uses installed Google Chrome and now starts the backend with the appropriate Windows or POSIX virtualenv executable. The optional `ANIMIND_LIVE_GEMINI_TEST=1` browser test consumes real service quota and is skipped by default.

## Remaining limitations

New multi-subject lessons are not stored in SQLite history and do not support PDF grounding, adaptive strategy switching, server-saved coefficient changes, or graded comprehension answers. Those capabilities remain available in the established projectile workflow. New comprehension questions are prompts for reflection. Demo lessons are curated rather than generated to answer arbitrary questions. Gemini prose is schema-validated but not a formal proof of scientific accuracy. No unsupported molecule, organelle set, sorting algorithm, or advanced physical model is advertised as interactive.

## Files

Created: `backend/visual_learning.py`, `backend/written_references.py`, `backend/tests/test_visual_learning.py`; `frontend/lib/visualizations.ts`; `frontend/components/studio/SubjectStudio.tsx`, `subject-studio.css`; `frontend/components/visualizations/{registry.ts,FunctionGraph.tsx,PhysicsModels.tsx,LifeDiagrams.tsx,BubbleSort.tsx}`; `frontend/tests/multi-subject.spec.ts`; this report.

Modified: `backend/main.py`, `backend/teaching.py`; `frontend/app/studio/page.tsx`, `frontend/components/studio/LearningStudio.tsx`, `frontend/lib/useLearningStudio.ts`, `frontend/playwright.config.ts`, `frontend/next.config.ts`; `README.md`.

No commits, pushes, PRs, merges, or deployments were performed. Work stays on `feature/multi-subject-learning`.

## Initial implementation validation — November 15, 2026

- Full backend pytest suite: **125 passed**, with six dependency deprecation warnings.
- TypeScript: **passed** (`npm run typecheck`).
- Frontend production build: **passed** (`npm run build`, webpack).
- Focused multi-subject Playwright suite: **8 passed**, including the final zero-polynomial intercept readout assertion.
- Full Playwright suite: **61 passed, 1 skipped**. The skipped test is the explicit opt-in real Gemini service test. Existing projectile calculations/animations, Demo mode, mocked Gemini mode/cache provenance/errors, PDF workflows, Red Pen submission/reveal behavior, and Voice Tutor lifecycle all passed.
- The installed Google Gemini SDK's multi-subject JSON-schema serialization was exercised through a local HTTP mock transport. Malformed JSON, unknown visualization IDs, out-of-range parameters, blank teaching steps, session cache reuse, and explanation fallback were tested. **No live Gemini service request was verified.**
- Mobile axe accessibility and reduced-motion checks passed for the new lesson UI; existing responsive/accessibility regressions also passed. The rendered quadratic UI was additionally inspected in Chrome.

Earlier development runs caught test locator ambiguities and a projectile initialization bug; these were corrected before the successful final runs. The final focused run also verifies that the zero polynomial reports all real x as intercepts.

This shell initially had no Node/npm on PATH. Verification used a temporary Node 22.16.0 runtime under `/tmp`, outside the repository. Local run commands require Node/npm on PATH, Python with the backend dependencies, and installed Chrome for browser tests. No runtime downloads or generated build/test artifacts are included in Git changes.


## Final quality and integration review — November 15, 2026

The review inspected every modified and untracked source, test, configuration, and documentation file. It found and corrected these reproducible issues:

- Custom requests for damped/forced pendulums, non-polynomial functions, mixed unsupported molecules, and plant-cell comparisons could select simpler diagrams. Conservative routing now leaves those topics explanation only. Explicit ideal assumptions such as “without air resistance” remain supported. Newton’s formula recognition now requires the complete `F = ma` expression rather than matching the start of `mass`.
- Custom projectile questions in Gemini mode generated a plan that the legacy projectile notebook discarded before generating another one. The multi-subject endpoint now returns trusted routing/reference data for projectile questions; the established projectile API owns the single generation request.
- Editing a question could cancel browser speech while leaving controls in the speaking state. The existing speech hook’s content key now includes the draft question, so both narration and its controls reset. Incoming projectile mode is also initialized correctly before a request completes or fails.
- Valid fractional Gemini coefficients could be rounded by slider step constraints while the graph displayed the original value. Range controls now preserve arbitrary validated precision within their existing bounds.
- Next development HMR rejected the documented `127.0.0.1` URL when the existing server was initialized for `localhost`, leaving the page unhydrated. The Next configuration now narrowly allows the additional loopback development origin. Both URLs were verified, and all seven affected QA tests passed on rerun.
- The electric-field reference now describes electric force direction rather than implying acceleration follows that force when other forces may exist. The cytoplasm description explicitly excludes the nucleus.
- The modified learning hook was normalized to LF line endings so plain `git diff --check` passes. Ignoring line endings shows only the intended initial-question/mode changes to this existing hook.

Additional Chrome checks measured the actual SVG H–O–H angle as 104.50000000000001°, selected all five water parts and all five cell structures, checked pendulum length scaling, zero and negative force boundaries, real/absent quadratic roots, and completion of a custom bubble-sort array containing negatives and duplicates. These checks passed.

The first full regression run exposed the development-origin issue. Overlapping browser runners also collided in their ignored artifact directory; final regression verification was rerun with one browser runner at a time. These failures were investigated rather than reported as passes.

Live Gemini remains opt-in and unverified against the real service. All eight visualizers work in Demo mode; existing projectile PDF/history/adaptation and Red Pen functionality remain separate from the simpler new subject lessons. Natural-language recognition is conservative, not a general semantic classifier. Unknown offline questions still receive a study guide rather than a fabricated topic-specific explanation.

### Exact commit inventory

Commit only the following source, test, configuration, and documentation files after approval. No staging or commit was performed during this review.

```text
MULTI_SUBJECT_LEARNING.md
README.md
backend/main.py
backend/teaching.py
backend/tests/test_visual_learning.py
backend/visual_learning.py
backend/written_references.py
frontend/app/studio/page.tsx
frontend/components/studio/LearningStudio.tsx
frontend/components/studio/SubjectStudio.tsx
frontend/components/studio/subject-studio.css
frontend/components/visualizations/BubbleSort.tsx
frontend/components/visualizations/FunctionGraph.tsx
frontend/components/visualizations/LifeDiagrams.tsx
frontend/components/visualizations/PhysicsModels.tsx
frontend/components/visualizations/registry.ts
frontend/lib/useLearningStudio.ts
frontend/lib/visualizations.ts
frontend/next.config.ts
frontend/playwright.config.ts
frontend/tests/multi-subject.spec.ts
```

Credential-pattern scanning and manual inspection found no real API keys in these candidates. Test credentials are dummy literals. The environment, dependency, virtualenv, build, database, and test-artifact paths are ignored and excluded. The generated `frontend/next-env.d.ts` development rewrite is excluded from the inventory. The index is empty; do not use a force-add or blanket staging command for ignored runtime files.


### Final review results

| Check | Actual final result |
| --- | --- |
| Full backend pytest | 133 passed; six dependency deprecation warnings |
| TypeScript (`npm run typecheck`) | Passed |
| Production build (`npm run build`) | Passed |
| Focused multi-subject Playwright | 10 passed |
| Affected loopback QA Playwright | 7 passed |
| Full Playwright, single runner | 63 passed, 1 skipped in 2.9 minutes |
| Plain `git diff --check` | Passed |
| Candidate credential/path audit | No real-key pattern matches or forbidden runtime paths |

The skipped browser test is the opt-in real Gemini integration. Installed-SDK request serialization, mocked Gemini output, validation failures, cache behavior, and fallback explanations passed local tests. This review used installed Node v26.13.1 and npm 11.20.0. The existing local servers were left running.

Readiness: ready for Demo-mode demonstrations and source review within the documented scope. No reproducible implementation blocker remains in the reviewed paths. Live Gemini, deployment behavior, and formal validation of generated prose remain unverified. New subjects still do not add persistent history, PDF grounding, adaptive alternative scenes, or automatic comprehension grading.

Final branch: `feature/multi-subject-learning`. The proposed inventory contains 21 files (eight modified tracked files and thirteen new files). No files are staged. No commit, push, merge, or deployment was performed.
