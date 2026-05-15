# Tabatica

A modern Tabata / interval workout timer built as an installable iOS web app
(PWA). Configure Prepare / Work / Rest / Cycles / Sets, save your favourite
workouts, get sound + voice cues, and track every session with stats, streaks
and an Apple Health–friendly export.

## Features

- **Interval timer** — Prepare, Work, Rest, Cycles, Sets, Set Break and
  Cooldown, with per-phase descriptions.
- **Live run screen** — big countdown dial, phase colours, next-up,
  pause / skip / previous, overall progress.
- **Sound & voice** — phase cues, last-3-seconds countdown beeps, optional
  spoken cues, volume control (Web Audio, unlocked on iOS via the START tap).
- **Saved presets & templates** — store your own workouts, plus built-in
  templates (Classic Tabata, HIIT 40/20, …). Everything persists locally.
- **Workout history** — automatic logging on completion, with totals,
  active minutes and a daily streak.
- **Export** — CSV (shaped for Apple Health via Shortcuts) and JSON backup.
- **PWA** — installable, full-screen, works offline, keeps the screen awake
  during a workout, light/dark themes.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/ (also regenerates PWA icons)
```

## Deploying to GitHub Pages

A workflow (`.github/workflows/deploy.yml`) builds and deploys on every push
to the default branch and self-enables Pages. Once it runs, the app is live at
(note the repo-name casing):

```
https://vlad-168.github.io/Tabatica/
```

> The Vite production `base` is `./` (relative), so assets resolve correctly
> no matter the path or casing the site is served from — no change needed if
> the repo is renamed or hosted elsewhere.

## Install on iPhone

Open the URL in **Safari**, tap **Share → Add to Home Screen**. It then runs
full-screen like a native app, offline, with the screen kept awake during
workouts.

## Apple Health

Safari has no HealthKit access, so a web app can't write to Apple Health
directly. Tabatica keeps your full history in-app and exports it:

1. **History → Export CSV (for Apple Health)**.
2. Create a free **Apple Shortcut** that loops the CSV rows and runs the
   **Log Health Sample** action → **Workout → High Intensity Interval
   Training**, using the row's start time and duration.

Each CSV row includes start/end time, total/active/work minutes and the
cycle×set count.
