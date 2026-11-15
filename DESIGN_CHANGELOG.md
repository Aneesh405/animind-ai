# Animind AI — The Learning Atelier

Implemented November 14, 2026, in the existing application.

## Curiosity Lab signature redesign — November 15, 2026

The product now presents itself as a living science notebook: warm paper, deep ink, electric blue, coral, and citron; oversized editorial type; tactile borders and offset shadows; and a visible grid connecting the interface to the physics. The redesign uses the existing React, SVG, CSS, and local fonts, with no new runtime dependency.

- The landing hero asks a real question and routes it into the existing studio. Its projectile exhibit remains directly interactive.
- A new subject-discovery bento makes Physics the single open lab. Mathematics, Biology, Chemistry, and Computer Science are clearly labeled explanation previews, not working labs.
- The studio is now the **Curiosity Lab**, with a dark exhibit frame around the existing visualization, a more legible teaching companion, tactile parameter experiments, and unified treatments for Voice Tutor and Red Pen Challenge.
- Existing Demo/Gemini modes, APIs, equations, animation controls, adaptation, PDFs, history, speech, and physics calculations were preserved.
- Responsive and accessibility coverage includes 320, 390, 768, 1280, and 1440px states. A final 320px MathML containment fix prevents a long selected-step equation from widening the document.

This work lives on local branch `feature/curiosity-lab-redesign`. It has not been pushed or deployed.

## Synchronized teaching player — November 15, 2026

Voice and animation are now presented as one dark exhibit controller inside the visualization. **Teach me** starts a six-scene projectile guide; captions, real speech state, scene progress, pause/resume, navigation, replay, narration, and device voice settings share the same surface. Citron signals the active teaching action and highlighted SVG evidence. The interface deliberately shows scene progress instead of a fake audio waveform.

## Direction

A warm scientific notebook: off-white paper, precise diagrams, generous margins, and a focused learning companion. Blue identifies actions and the principal 45-degree trajectory; coral identifies the selected projectile; teal identifies variables and velocity components; gold marks a change in teaching perspective. Labels and line styles supplement the palette.

## Product structure

- `/` is now the public landing page: the requested editorial headline, a working projectile experiment, three distinct storytelling sections, supported explorations, and a closing invitation.
- `/studio` contains the existing functional workspace. The root URL remains valid and provides immediate Start Learning / Start Exploring navigation. Existing browser tests now enter `/studio` and retain their functional assertions.
- Supported exploration links carry a question into the studio. These explicit navigation requests start a clearly labeled Demo lesson; live generation remains an explicit mode selection and submission.
- The landing teaching preview is labeled `Interactive preview · no AI request`. It changes actual deterministic SVG representations without pretending to generate an AI explanation.

## Studio changes

- Replaced the fixed sidebar with compact top navigation and a collapsible Notebook containing recent lessons, PDF access, and supported topics.
- Put the current question and provenance first, followed by the composer and a substantial scientific canvas.
- Created a companion with real returned steps, selected-step explanations, a visual-stage indicator, semantic equations, narration, and the adaptive action.
- Renamed the action to **Explain it differently**. The selected step stays selected during the request. A successful response displays the previous/new strategies, a tentative hypothesis with correct provenance, and the returned understanding check.
- Successful adaptation returns to an offscreen diagram so the representation change is visible. Scrolling respects reduced motion.
- On tablet/mobile, the companion follows the canvas/results; variables and experiments follow the companion. Core controls remain present.
- Preserved parameter persistence, save retries, suggestions, what-if calculations, PDF sources, errors, checks, history, fullscreen, and browser narration.
- Added PDF drag/drop alongside the existing picker. Upload loading and invalid-file errors use the existing API behavior.

## Scientific visualization

- Replaced the dark canvas with a light coordinate grid, refined axes, accurate labels, distinguishable comparison paths, a coral projectile, and instantaneous velocity-component arrows.
- Preserved shared elapsed physical time for comparison paths. Landed projectiles stay at their landing coordinates.
- Preserved deterministic calculations and the 30/60-degree equal-range relationship under equal-height assumptions.
- Added a single-path/comparison control. The studio starts in comparison mode; the landing hero starts with one selected path.
- Added compact SVG layouts based on canvas width, avoiding illegible desktop labels on mobile.
- Improved vectors with angle arcs, consistent arrowheads, quantitative component readouts, and a mobile arrangement.
- Range bars show calculated ranges even when reduced motion pauses playback. Timeline focus emphasizes comparison rows.
- Memoized trajectory geometry, cached axis formatters, and stopped progress updates for offscreen/hidden players. Animation timing uses requestAnimationFrame elapsed time; pause, resume, replay, and scrubbing remain supported.
- Added dynamic reduced-motion handling and larger mobile playback targets.

## Foundation and components

- Tokens: [tokens.css](frontend/app/tokens.css). Studio/base styles: [atelier.css](frontend/app/atelier.css). Landing: [landing.css](frontend/app/landing.css).
- Self-hosted Inter and Instrument Serif through `next/font/local`; OFL licenses are retained in [app/fonts](frontend/app/fonts). Future builds and browser visits do not fetch external fonts.
- Native MathML renders a fixed vocabulary of canonical equations. Model output cannot supply executable markup or arbitrary expressions.
- Original mathematical-curve brand mark, SVG icon, and matching multi-size fallback ICO.
- Split the original page into `useLearningStudio`, studio/landing components, playback, and scientific diagrams. Retained the API client, TypeScript contracts, and physics utility.
- Disabled the development badge because it overlapped mobile player controls. Framework error reporting remains available.

**New runtime dependencies: none.** Existing React, Next.js, Lucide, CSS, MathML, and browser APIs supply the required interaction. No animation or equation-rendering package was added.

## Preservation and checkpoint

Before editing, source was archived at:

```text
..\animind-checkpoints\before-atelier-redesign-20261114-152057.zip
```

The archive excludes environment files, dependencies, databases, runtime data, and test artifacts. Existing source and uncommitted work were preserved. SHA-256 comparisons confirmed all nine backend Python source/test files are unchanged. The existing `backend/.env` and key were not edited or copied into the checkpoint.

## Review and verification

Rendered Chrome screenshots cover 1440, 1280, 768, and 390 pixels. Accessibility findings from initial runs were corrected: SVG group semantics, the mobile Notebook name, and an editorial annotation's contrast. Exact final results are in [TEST_REPORT.md](TEST_REPORT.md).

Screenshots and machine-readable browser reports are generated in ignored `frontend/design-review/`. They cover the landing page, studio, and alternate scientific representations. See [DEMO.md](DEMO.md) for the local three-minute walkthrough.
