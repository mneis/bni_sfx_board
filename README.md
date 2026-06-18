# BNI SFX Board

BNI SFX Board is an iPad-first sonoplasty console for BNI meetings. It helps the meeting operator trigger sound effects, manage live audio cues, follow the meeting sequence in future versions, and optionally control Spotify playback after feasibility is confirmed.

The project is designed for real meeting operation: quick access to common cues, visible emergency controls, and a static deployment model that works on GitHub Pages.

## Current Features

- Category-based sound buttons loaded from `config.json`.
- Local `.mp3` playback from the `audio/` folder.
- Per-sound playback behavior, including exclusive playback, overlap, loop, fade, restart rules, and per-sound volume.
- Fixed control dock with `Stop All`, `Volume`, and `Now Playing`.
- Quick Actions panel for pinning common meeting cues.
- Quick Actions edit mode with browser `localStorage` persistence.
- Keyboard shortcuts for Quick Actions, Stop All, and fullscreen/focus mode.
- Fullscreen/focus mode for distraction-reduced operation.
- Dark theme for live operation environments.
- Mobile-friendly layout for iPad and browser use.
- Internationalization with `English (US)` and `Português (BR)`.

## Planned Features

- Meeting Flow Mode for following the BNI meeting sequence step by step.
- Dedicated `meeting-flow.json` configuration for meeting steps, suggested SFX, notes, optional durations, and future playlist metadata.
- Timers for moments such as the education moment and main presentations.
- Config import/export for moving preferences between browsers or devices.
- iPad-first live operator interface improvements.
- Optional Spotify controller panel, only if the Spotify Web API research confirms the workflow is reliable and safe for GitHub Pages.

## Architecture Constraints

This app is intentionally static:

- No backend is required.
- No build step is required.
- GitHub Pages compatibility must be preserved.
- Runtime configuration should remain browser-safe.
- Secrets, including Spotify client secrets, must not be stored in the public repo.

`main` is treated as the production branch for the live GitHub Pages app. Regular work should land in `staging` first, then move to `main` after release checks.

## iPad-First Usage

The primary live setup is:

- iPad running BNI SFX Board.
- MacBook running Spotify or other background music, if needed.
- Room audio connected and tested before the meeting starts.

The soundboard must remain useful even without Spotify. Spotify integration is a future optional enhancement, not a requirement for the core meeting workflow.

## Documentation

- [Operator guide](docs/operator-guide.md): Prepare the iPad, test audio, run the board during a meeting, and recover quickly if something goes wrong.
- [Release checklist](docs/release-checklist.md): Verify staging changes before merging into production.

## Project Structure

- `index.html`: Page structure and UI regions.
- `style.css`: Dark theme, layout, responsive behavior, and interaction states.
- `js/main.js`: Static ES module entrypoint and UI orchestration.
- `js/audio-engine.js`: Audio entry creation, playback, stop-all behavior, and volume updates.
- `js/soundboard-renderer.js`: Soundboard category and sound button rendering.
- `js/quick-actions.js`: Quick Actions rendering and persistence updates.
- `js/config-loader.js`: Static JSON resource loading.
- `js/i18n.js`: Translation lookup helper.
- `js/state.js`: Initial client-side state creation.
- `js/storage.js`: Browser `localStorage` helpers.
- `config.json`: Categories, button IDs, colors, and audio paths.
- `i18n/enus.json`: English translations.
- `i18n/ptbr.json`: Brazilian Portuguese translations.
- `audio/`: Local sound effect files.
- `docs/`: Operator and release documentation.
- `.github/ISSUE_TEMPLATE/`: Issue templates for bugs, features, and Codex tasks.

## Runtime Behavior

- Sounds use safe default behavior when no custom behavior is configured.
- Exclusive sounds stop or fade out other active sounds before starting.
- Overlap sounds can create multiple simultaneous audio instances.
- Looped sounds keep playing until replaced by another exclusive sound or stopped.
- `Stop All` immediately stops every active sound.
- `Volume` controls global soundboard volume and combines with each sound's configured volume.
- `Now Playing` shows the most recently triggered active cue.
- Quick Actions are stored in browser `localStorage`.
- Quick Actions can be triggered from the keyboard with the `QWERTYUIOPA` sequence.
- `Space` stops all active sounds.
- `F` toggles fullscreen when supported, or focus mode as a fallback.

## Per-Sound Playback Behavior

Each sound in `config.json` can optionally define a `behavior` object:

```json
{
  "id": "drum_roll",
  "url": "audio/drum-roll.mp3",
  "behavior": {
    "mode": "exclusive",
    "volume": 1,
    "fadeInMs": 0,
    "fadeOutMs": 800,
    "loop": false,
    "restartOnPress": true
  }
}
```

Missing or invalid fields fall back to safe defaults:

- `mode`: `exclusive`
- `volume`: `1`
- `fadeInMs`: `0`
- `fadeOutMs`: `0`
- `loop`: `false`
- `restartOnPress`: `true`

Use `mode: "exclusive"` for cues where one press should replace the current sound. Use `mode: "overlap"` for effects such as applause where repeated taps should stack naturally. Effective playback volume is `global volume * behavior.volume`.

## How Quick Actions Works

1. Click `Edit`.
2. In the category cards, use `+` to pin a sound and the star button to unpin.
3. Click `Done` to exit edit mode.
4. Use `Minimize` or `Expand` to collapse or open the Quick Actions panel.

Selections are persisted in browser `localStorage`.

Use `Reset` in edit mode to restore the repository default Quick Actions sequence after confirming the prompt.

## Operator Shortcuts

Keyboard shortcuts are designed for Bluetooth keyboards, numpads, and macro pads:

```text
Q W E R T Y U I O P A    Trigger the first 11 Quick Actions
S D G H J K L Z X C V B N M    Continue triggering extra Quick Actions
Space                    Stop All
F                        Toggle fullscreen or focus mode
```

Shortcuts are ignored while typing, selecting the language, or editing form controls. Shortcut badges are shown only on Quick Action buttons so the full soundboard remains clean. `F` is reserved for fullscreen/focus mode and is skipped for Quick Actions.

## Internationalization

- Use the language selector in the header.
- Translations come from `i18n/enus.json` and `i18n/ptbr.json`.
- Category and button labels are translated by IDs from `config.json`.

## How To Customize

1. Add or replace `.mp3` files in `audio/`.
2. Update `config.json` IDs and audio paths.
3. Update translation labels in `i18n/enus.json` and `i18n/ptbr.json`.
4. Reload the page.

## Run Locally

For best compatibility with `fetch(...)`, serve the folder with a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

If Node dependencies are installed, the repository static server can also be used:

```bash
npm run serve
```

## Browser Tests

Playwright tests cover the keyboard shortcut path used by iPad external keyboard operation.

Install the test dependencies once:

```bash
npm install
npx playwright install chromium
```

Run the keyboard shortcut smoke test:

```bash
npm run test:keyboard
```

Run all browser tests:

```bash
npm run test:e2e
```

## Release Flow

Use the staging workflow for changes:

```text
feature branch -> staging -> test -> main -> GitHub Pages
```

Before merging `staging` into `main`, use the [release checklist](docs/release-checklist.md).

## Cache Busting

Static assets and JSON resources use an app version query string so browsers and GitHub Pages clients fetch fresh files after a release. When changing CSS, JavaScript, `config.json`, or translation JSON, bump the version in:

- `index.html`
- `js/app-version.js`
- ES module import query strings in `js/`

Use the same value everywhere, for example `2026.06.03.3`.

## Audio Normalization

Use the script below to normalize all audio files in `audio/` with `ffmpeg` and `loudnorm` in 2-pass mode:

```bash
bash scripts/normalize_audio.sh
```

Useful options:

```bash
# Preview only, no changes
bash scripts/normalize_audio.sh --dry-run

# Custom target profile
bash scripts/normalize_audio.sh --target-i -16 --target-tp -1.5 --target-lra 11

# Force reprocessing of all files, use sparingly
bash scripts/normalize_audio.sh --force
```

Notes:

- The script normalizes in-place and replaces original files.
- It writes a state file at `audio/.loudnorm-state.tsv`.
- Safe to rerun on the full folder: unchanged files are skipped automatically.
- Keep `audio/.loudnorm-state.tsv` versioned in git to preserve skip history across machines and CI.
- Re-normalizing the same lossy file repeatedly is generally not ideal because each re-encode can add quality loss.
