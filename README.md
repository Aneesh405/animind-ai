# Animind AI

[![CI](https://github.com/Aneesh405/animind-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Aneesh405/animind-ai/actions/workflows/ci.yml)

**Don’t Just Learn It. See It.**

Animind turns a physics question into a step-by-step animated lesson. Select a confusing step, describe what feels unclear, and the tutor switches to another visual teaching strategy. Change a variable, compare the calculated results, and answer a short conceptual check.

This MVP focuses on ideal projectile motion, launch-angle comparisons, and initial velocity components. It includes three deterministic SVG scenes and an optional Gemini teaching planner.

The Curiosity Lab redesign adds a distinctive, interactive public landing page at `/` and a tactile scientific workspace at `/studio`. Its warm-paper, ink, electric-blue, coral, and citron system frames the existing deterministic physics rather than replacing it. Physics is the one open lab; four additional subjects are honestly labeled previews. Inter and Instrument Serif are hosted locally, canonical equations use native MathML, and the physics canvas has dedicated desktop/mobile layouts. The backend, secure Gemini configuration, Demo workflow, Voice Tutor, and Red Pen Challenge are preserved. Design decisions are recorded in [DESIGN_CHANGELOG.md](DESIGN_CHANGELOG.md).

## Multi-subject learning

The studio now includes Mathematics, Physics, Chemistry, Biology, and Computer Science. Eight trusted interactive visualizations cover linear/quadratic functions, projectile motion, a simple pendulum, Newton’s second law, water, an animal cell, and bubble sort. Other topics use written explanations. The existing projectile notebook, Voice Tutor, and Red Pen remain available. See [MULTI_SUBJECT_LEARNING.md](MULTI_SUBJECT_LEARNING.md) for demos, architecture, scientific limits, test results, and macOS/Linux launch commands.

## What you can do

- Ask a supported question and explore an animated lesson with play, pause, replay, scrubbing, and fullscreen controls.
- Select individual explanation steps. The animation seeks to the corresponding stage.
- Request an adaptive explanation that changes among trajectories, velocity decomposition, and a numerical range comparison. Unused strategies receive priority before strategies repeat.
- Change launch angle, launch speed, and gravity. The visual updates immediately and the backend verifies and saves the new values.
- Ask what-if questions such as “What happens if gravity doubles?” or “What if I launch at 60 degrees?”
- Answer conceptual multiple-choice questions and request another visual when you need more practice.
- Upload text-based lecture PDFs, choose a detected supported topic, and inspect page-numbered source excerpts.
- Reopen recent lessons stored in local SQLite. A browser session ID in local storage connects the browser to its lessons.
- Listen to explanations when the browser provides speech synthesis.
- Press **Teach me** for one guided player that coordinates narration, visual cues, captions, scene progression, pause/resume, replay, and completion. Speed and installed-browser voice preferences are remembered locally.
- Open the optional **Red Pen Challenge** inside a projectile lesson, spot one verified misconception, and use the same SVG physics engine to see the correction.

## Technology and scope

The frontend uses Next.js 16, React 19, TypeScript, CSS, and deterministic React/SVG scenes. The backend uses Python, FastAPI, Pydantic, the official `google-genai` SDK, SymPy, PyMuPDF, and SQLite. Playwright exercises the browser journey and axe checks the rendered interface.

Gemini produces validated teaching plans and selects an allowed visualization. Equations and numeric results come from the physics engine. Model-generated executable code has no rendering path. The API reports Gemini errors explicitly and offers Demo mode.

The supported physics assumes equal launch and landing heights, constant downward gravity, no air resistance, and a fixed initial speed when comparing angles. Under these assumptions, range is greatest at 45° and complementary angles have equal ranges.

| Quantity | Verified equation |
| --- | --- |
| Horizontal velocity | `vx = v0 cos(theta)` |
| Initial vertical velocity | `vy0 = v0 sin(theta)` |
| Flight time | `T = 2 v0 sin(theta) / g` |
| Horizontal range | `R = v0² sin(2 theta) / g = vx T` |
| Maximum height | `H = v0² sin²(theta) / (2 g)` |

Angles are supported from 0–90°, speed from 1–100 m/s, and gravity from 0.1–50 m/s². A horizontal launch from ground level has zero flight time in this model. During flight, horizontal velocity stays constant and vertical velocity follows `vy = vy0 - gt`. The component view attaches those arrows to the moving projectile and shows downward gravity. Its equal spatial scales preserve the vector direction. Trajectories share the same elapsed physical time and remain at their landing position after landing; velocity arrows stop at landing because a collision is outside this model.

The studio now guides six visual chapters: knowns and goal, components, equation choice, motion, calculation, and physical meaning. The timeline includes this reasoning sequence; elapsed physical time advances in the Motion chapter. It stops on the conclusion. Choose a chapter to inspect it or replay the sequence. The tutor's three to five generated explanation steps remain separate and seek the relevant visual by equation meaning. Each step names the evidence to inspect. Reduced motion pauses automatic playback; explicit Play remains available.

## Windows setup

Use Python 3.12 and a recent Node.js version with npm. This project was tested with Python 3.12.0 and Node.js 26.13.1 on Windows. The browser tests use the installed Google Chrome browser.

Open PowerShell in the project root. Stop running development servers before installing dependencies so Windows can replace native dependency files. This command installs dependencies into the project, creates missing example environment files, and preserves existing environment files.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

Alternatively, install dependencies manually from the project root.

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Set-Location frontend
npm ci
Set-Location ..
```

The dependencies are installed in this checkout. Demo mode runs without Gemini credentials or an internet connection after installation.

## Start the application

In the first PowerShell terminal, from the project root, run the backend.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
```

In a second PowerShell terminal, from the same project root, run the frontend.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

Open the [landing page](http://127.0.0.1:3000) and click **Start Exploring**, or open the [Curiosity Lab](http://127.0.0.1:3000/studio) directly. The backend also provides [interactive API documentation](http://localhost:8000/docs) and a [health check](http://localhost:8000/health). Keep both terminals open. Press Ctrl+C in each terminal to stop its server.

The equivalent commands, from the project root, are shown below. Run them in separate terminals.

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

```powershell
Set-Location frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Configure Gemini

Demo mode works immediately. To configure live Gemini planning, create a key in Google AI Studio and choose an available text model that supports structured JSON output. `gemini-3.8-flash` was verified with this workspace's configured account on November 14, 2026. Model availability can differ by account. [Google AI Studio keys](https://aistudio.google.com/apikey), [model catalogue](https://aistudio.google.com/docs/models)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-gemini.ps1
```

At the prompts, enter the public model ID, then paste your key into the masked key prompt. The helper writes `GEMINI_API_KEY` and `GEMINI_MODEL` to ignored `backend/.env`. Other settings are preserved. The key is kept out of command arguments, terminal history, and helper output. The backend reads the model from this file. [Google Gen AI SDK](https://googleapis.github.io/python-genai/)

In the backend terminal, press Ctrl+C, then restart it from the project root.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
```

Confirm that the configuration was loaded. This prints status flags, the public model name, and the worker process ID; it does not display the key.

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health |
    Select-Object status, process_id, gemini_model, gemini_configured, gemini_model_configured, environment_file_matches
```

Both configuration flags should be `True`, the model should match the intended model, and `environment_file_matches` should be `True` when both settings are in `backend/.env`. A `False` match means the serving worker differs from the file: stop old project backend processes and restart. Editing `.env` alone does not refresh a running process. Then run the existing live API checker. When credentials and a model are configured, it attempts one real Gemini generation.

```powershell
$verification = .\backend\.venv\Scripts\python.exe scripts\qa-api.py | ConvertFrom-Json
$verification | Select-Object passed_checks, live_gemini
```

Verify that `live_gemini` says `passed one configured live generation`. A health flag confirms presence of configuration. The successful generation verifies that the key and model work together.

In the studio at `http://127.0.0.1:3000/studio`, select **Gemini mode**, enter “Why does a projectile travel farthest at 45 degrees?”, and click **Visualize**. Confirm the **Gemini lesson** label. Select step 2, enter “Why doesn't 60 degrees travel farther if it stays in the air longer?”, and click **Explain it differently**. Confirm that the visual strategy changes and the hypothesis is labelled as Gemini-based feedback.

To automate that complete website workflow with the configured live service, run the following from the project root. The opt-in test uses real account quota. The key stays in the backend.

```powershell
Set-Location frontend
$env:ANIMIND_LIVE_GEMINI_TEST = '1'
try {
    npm run test:e2e -- tests/gemini-live.spec.ts
} finally {
    Remove-Item Env:ANIMIND_LIVE_GEMINI_TEST -ErrorAction SilentlyContinue
    Set-Location ..
}
```

Each lesson keeps the mode in which it was generated. To recover from an unavailable Gemini service, select **Demo mode** and click **Visualize** to create a demo lesson.

Credentials stay on the backend. Environment files are ignored by Git. The frontend only needs `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` when overriding its default backend URL. Restart the frontend after changing its environment. The default CORS configuration accepts both `localhost:3000` and its `127.0.0.1:3000` loopback alias. Additional origins can be supplied as a comma-separated list in `FRONTEND_ORIGIN`.

Gemini requests have a 20-second request timeout and at most two attempts for transient gateway errors. Invalid credentials, malformed structured requests, unavailable models, and rate limits receive distinct errors. Malformed plans, unknown scene types, invalid parameters, and repeated adaptive strategies are rejected. The structured request uses `response_json_schema`, preserving strict JSON Schema validation without sending unsupported native-schema properties. Actual live API and browser results are recorded in [TEST_REPORT.md](TEST_REPORT.md).

For `gemini-3.8-flash`, lesson and adaptation planning use the supported **low** thinking level and concise-step guidance to reduce response latency. The model and key remain unchanged. Strict validation, verified physics, and the 6,000-token output allowance are retained so complete structured responses can be validated. Other configured models retain their previous generation settings. Google's service latency still varies between requests.

## Planning performance

Visuals are calculated locally in React/SVG; no video-generation service is involved. A lesson needs one Gemini call on a cache miss. Identical initial requests within the same browser session can reuse a validated plan for five minutes. The RAM cache holds at most 64 plans, separates sessions, binds the full request and provider configuration, and combines concurrent identical requests. Each request still creates a new lesson and recalculates physics. The UI labels reuse as **Saved Gemini plan**. PDF lessons and adaptive explanations bypass this cache. A restart clears it; failures are never cached. Optional health refreshes no longer keep a completed lesson busy.

For safe local phase timings, start the backend with the opt-in development switch:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1 -DevTiming
```

Inspect the lesson response's `Server-Timing` header in browser developer tools for fixed phase names and milliseconds. Development frontend performance entries use fixed `animind:lesson-request` and `animind:lesson-decode` labels. These diagnostics contain no prompts, document excerpts, session identifiers, or credentials. Normal backend startup omits timing headers; the production frontend omits these performance entries. See [TEST_REPORT.md](TEST_REPORT.md) for measured results and their limits.

## Demo mode

The first visit to the studio opens a clearly labelled Demo lesson, or restores the browser session's latest lesson. Demo mode uses curated teaching plans, predefined tentative misconception hypotheses, and deterministic physics. It demonstrates the entire adaptive workflow without Gemini credentials. The numerical simulation and what-if calculations remain interactive. The public landing page uses local deterministic experiments, and its teaching preview explicitly says no AI request is made.

Try “Why does a projectile travel farthest at 45 degrees?”, select the second step, and enter “I don't understand why 60 degrees doesn't travel farther.” Click **Explain it differently** to switch to velocity decomposition. The three-minute walkthrough and exact Windows startup commands are in [DEMO.md](DEMO.md).

### Guided audiovisual lesson

The visualization now contains one integrated **Guided Lesson** controller. Selecting **Teach me** begins a six-scene projectile lesson: launch components, ascent, gravity, apex, descent, and angle comparison. Each scene uses an allowlisted visualization, cue, highlight target, and verified parameter set. Speech completion—not an estimated text timer—advances to the next scene. Pause and resume control speech and visual motion together; Stop, Replay scene, Previous, Next, captions, narration, rate, and installed-browser voice controls share the same player.

The guide uses `window.speechSynthesis` only after the student selects **Teach me**; it never autoplays, adds no Gemini request, creates no audio file, and requires no additional key. Stale callbacks are ignored, speech never overlaps, and lesson changes clean up narration. Changing a physics parameter explicitly returns to **Explore freely** so manual experimentation cannot silently corrupt guided state. Unsupported speech retains captions, scene navigation, the written lesson, and the real visualization. Only the three existing projectile topic routes have synchronized visual guides; unimplemented subjects remain clearly labeled previews.

### Red Pen Challenge

The optional **Red Pen Challenge** works entirely from a deterministic three-question bank, so it adds no Gemini request and works in Demo mode. Open it below the current lesson with **Try Red Pen Challenge**. The MVP covers maximum range, velocity at the apex, and complementary launch angles. Deliberately incorrect statements are confined to this clearly labelled activity; ordinary lessons remain unchanged.

## PDF handling and local data

Upload a text-based PDF through **Upload lecture notes** or **Add a PDF**. Uploads are limited to 10 MB, 100 pages, and 250,000 extracted characters. Password-protected, empty, unreadable, and scanned-only PDFs receive an explanatory error. Detected topics appear as buttons.

Extraction runs locally. Original PDF bytes are discarded after extraction. In Gemini mode, at most three relevant excerpts of 1,200 characters each are included in a teaching request. Source excerpts retain the filename and page number and appear separately from the added tutor explanation. Demo mode attaches source excerpts to a curated lesson for the selected supported concept.

SQLite data is stored in ignored `backend/data/animind.sqlite3`. Extracted documents become unavailable after 24 hours and expired document rows are purged on a subsequent upload. Lesson history retains questions, explanations, confusion messages, and the source excerpts used by a lesson. Browser sessions provide local ownership separation. This MVP is intended for a local learning workstation and has no account system.

## Tests and production build

Run the backend suite from the project root.

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest -q
Set-Location ..
```

Run the frontend checks from the project root. Stop the frontend development server before building, then restart it afterward.

```powershell
Set-Location frontend
npm run typecheck
npm run build
npm run test:e2e
```

Playwright starts missing local servers and reuses servers already running on ports 3000 and 8000. It uses installed Google Chrome. If Chrome is unavailable, install Chrome or change the browser channel in `frontend/playwright.config.ts` and install the matching Playwright browser. To watch the tests, run `npm run test:e2e:headed`. Failure screenshots and traces appear in ignored `frontend/test-results`.

To serve the built frontend, run `npm run start -- --hostname 127.0.0.1 --port 3000` from `frontend`, with the backend running in a separate terminal.

Backend tests cover classification, demo generation, adaptation history, session ownership, optimistic concurrency, invalid input, PDF validation, mathematical relationships, Gemini errors, cache isolation/expiry/concurrency, and timing privacy. An HTTP mock transport exercises the installed official Gemini SDK's request serialization and structured lesson/adaptation responses. The default frontend suite contains 48 Chrome scenarios and nine pure physics/challenge-bank/speech/registry checks. It covers the Demo journey, synchronized Guided Lesson lifecycle and cue mapping, Red Pen Challenge, functional Curiosity Lab question routing, truthful subject previews, PDFs, failures/loading, reduced motion, responsive controls down to 320px, actual SVG strategy changes, live vector geometry, chapter selection, and accessibility. One additional real Gemini browser test is opt-in; it also verifies labeled plan reuse. See [TEST_REPORT.md](TEST_REPORT.md) for actual results and [STATUS.md](STATUS.md) for scope.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| The learning engine cannot be reached | Start the backend and open its health check. Use `http://localhost:3000` for the frontend. |
| The browser reports a CORS error | Check `FRONTEND_ORIGIN` in `backend/.env`, then restart the backend. |
| Gemini is unavailable or rejects the key/model | Update the backend environment file, restart the backend, then create a new Gemini lesson. Demo mode remains available. |
| Gemini reports quota or a rate limit | Try again later or select Demo mode and generate a lesson. |
| A lesson changed in another request | Reopen it from Recent lessons before trying the mutation again. |
| An uploaded document expired | Upload the PDF again. Saved lesson source excerpts remain available. |
| A port is already in use | Use the existing Animind server on that port or stop it in its terminal before starting another copy. |
| PowerShell blocks a startup script | Use the provided `powershell -ExecutionPolicy Bypass -File ...` command for that process. |
| Narration is unavailable | Continue with the text and animation. Speech synthesis depends on browser support and installed voices. |

## Current limits

Supported topics are restricted to ideal projectile motion. Function graphs, equation transformations, unequal launch/landing heights, air resistance, and scanned-PDF OCR are outside this MVP. Topic and what-if parsing use a bounded vocabulary. What-if requests need a numeric value or a supported multiplier such as “doubles”. Understanding checks use a small curated multiple-choice bank. A tentative misconception hypothesis is based on the student’s message and lesson context.

Symbolic verification covers canonical equations and deterministic values. It does not certify every sentence of AI-written teaching prose. Live Gemini success requires a valid API key, an available model, and account quota. The completion record and remaining work are in [STATUS.md](STATUS.md).
