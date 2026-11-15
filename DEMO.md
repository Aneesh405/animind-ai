# Animind AI - three-minute demonstration

## Start on Windows

Keep one backend terminal and one frontend terminal open. If services are already running, open the URLs below.

Terminal 1:

```powershell
Set-Location 'C:\Users\anees\Downloads\animind-ai-starter (1)\animind-ai'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
```

Terminal 2:

```powershell
Set-Location 'C:\Users\anees\Downloads\animind-ai-starter (1)\animind-ai'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

- Landing: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Studio: [http://127.0.0.1:3000/studio](http://127.0.0.1:3000/studio)
- Health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

The existing secure backend configuration is used as-is. No key belongs in frontend code or terminal arguments. If configuration is needed later, use the masked `scripts/configure-gemini.ps1` helper documented in README.md.

## Three-minute sequence

| Time | Action | What to notice |
| --- | --- | --- |
| 0:00-0:25 | Open the landing page. Try 30, 60, then 45 degrees in the hero. Click **Start Exploring**. | A real deterministic experiment: the first two ranges match; 45 degrees gives the maximum under the stated assumptions. |
| 0:25-0:55 | Click **New lesson**, select **Gemini mode**, enter the question below, and click **Visualize**. | A real request creates a **Gemini lesson**. The model selects one of three supported teaching representations. Titles and steps vary. |
| 0:55-1:15 | Play/pause or scrub the timeline. Change launch angle to 60 degrees and allow it to save. | Values and graphics update together. At default speed/gravity, range is 35.31 m, flight time about 3.53 s, and horizontal speed 10.00 m/s. |
| 1:15-1:55 | Select step 2, enter the exact confusion below, and click **Explain it differently**. | The selected step stays in focus while loading. The canvas changes representation. A banner names the old/new strategies, and the tentative hypothesis is labeled Gemini-based. |
| 1:55-2:25 | Explore the new representation. Compare 30 and 60 degrees or point out the component values. | Extra airtime comes with reduced sideways speed. The teaching strategy actually changed. |
| 2:25-2:50 | Read the current understanding check, choose an answer, and click **Check my understanding**. | Feedback explains the relationship. A wrong answer offers **Try another visual**. |
| 2:50-3:00 | Close with: "When one explanation doesn't connect, Animind finds another way to show the idea." | Leave the scientific lesson visible for questions. |

The visual has six chapters: **Knowns → Components → Equations → Motion → Calculation → Meaning**. Select **Motion**, then Play, to show the flight immediately. In the velocity perspective, pause near the apex: the vertical arrow reaches zero while horizontal velocity stays constant and gravity still points down. The full guided sequence stops on its conclusion. In a trajectory lesson, the comparison cards expose range, airtime, and sideways speed for 30°, 45°, and 60°.

For a repeat of the exact same initial question within five minutes in the same session, the app may show **Saved Gemini plan**. Explain that this reuses a validated plan and recalculates physics; it is not a new model generation. Adaptation always makes a new live request in Gemini mode. Allow for variable cloud latency and retain the explicitly labeled Demo fallback.

Question:

> Why does a projectile travel farthest at 45 degrees?

Confusion:

> Why doesn't 60 degrees travel farther if it stays in the air longer?

Gemini may start with trajectories, velocity decomposition, or range-comparison bars. Each is a valid result. Adaptation must change the current representation; the banner and actual diagram show the difference. The demonstration does not depend on a fixed model-generated title or answer order.

## Guided audiovisual lesson

Inside the main visualization, select **Teach me** once. Animind moves through launch, ascent, gravity, apex, descent, and angle comparison while the browser narrates exactly the active visual scene. Demonstrate **Pause**, **Resume**, **Replay scene**, **Previous**, **Next**, captions, and narration controls. Voice settings offer Slower, Normal, and Faster rates plus only the voices installed in the current browser. Change a slider to show the explicit return to **Explore freely**, then select **Teach me** to restart the guide using the new verified parameters. Narration is browser-local, never autoplays, and makes no Gemini request. If speech synthesis is unavailable, captions, manual scene navigation, the written explanation, and animation continue normally.

## Optional Red Pen Challenge

Below the lesson, select **Try Red Pen Challenge**. Each of the three activities contains exactly one deliberate misconception and is clearly separated from normal tutoring. Choose a statement, select **Check Answer**, then use **Show Me Why** to open the real projectile visualizer. The sequence demonstrates 30/45/60-degree range, nonzero horizontal velocity at the apex, and the equal ranges but different paths of complementary angles. It is deterministic, works in Demo mode, and makes no Gemini request.

## Reliable Demo-mode fallback

Select **Demo mode** and click **Visualize** to generate a fresh Demo lesson. Changing the selector alone does not change an existing lesson's provenance or adaptation engine.

For a predictable offline walkthrough, use the same question. Initial trajectories change to velocity decomposition after the exact confusion request. The lesson and hypothesis clearly say Demo/predefined. An incorrect check answer followed by **Try another visual** moves to range-comparison bars.

The full Demo workflow, simulation, sliders, history, checks, PDF extraction, and what-if calculations run locally after installation. The public landing teaching preview is separately labeled **Interactive preview - no AI request**.

## Optional experiments and notes

- Ask **What happens if gravity doubles?** under the experiment controls. At 60 degrees with default launch speed, range changes from 35.31 m to 17.66 m. The new gravity check's correct answer is **It halves.**
- Use **Add notes** or **Notebook > Upload lecture notes** for a small text PDF about projectile motion. Choose a detected concept and expand **Sources from your notes** for its filename, page, and excerpt. Scanned-only PDFs have no OCR support.
- Open **Notebook** to restore a lesson with its saved mode, parameters, and strategy.
- Expand **Verified equations. Clearly defined physics.** for the assumptions: equal heights, constant gravity, no drag. Numeric results and canonical equations are deterministic; generated prose is not mathematically certified.

## Quick verification before judging

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health |
    Select-Object status, process_id, gemini_model, gemini_configured, environment_file_matches
```

The model should match the account's available model, and `environment_file_matches` should be true. Presence flags alone do not verify generation. The opt-in real browser test and current results are in [TEST_REPORT.md](TEST_REPORT.md).
