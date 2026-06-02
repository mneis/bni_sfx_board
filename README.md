# BNI SFX Board

BNI SFX Board is an iPad-first sonoplasty console for BNI meetings. It helps the meeting operator trigger sound effects, manage live audio cues, follow the meeting sequence in future versions, and optionally control Spotify playback after feasibility is confirmed.

The project is designed for real meeting operation: quick access to common cues, visible emergency controls, and a static deployment model that works on GitHub Pages.

## Current Features

- Category-based sound buttons loaded from `config.json`.
- Local `.mp3` playback from the `audio/` folder.
- Exclusive playback, where starting one sound stops the previous one.
- Fixed control dock with `Stop All`, `Volume`, and `Now Playing`.
- Quick Actions panel for pinning common meeting cues.
- Quick Actions edit mode with browser `localStorage` persistence.
- Dark theme for live operation environments.
- Mobile-friendly layout for iPad and browser use.
- Internationalization with `English (US)` and `Português (BR)`.

## Planned Features

- Meeting Flow Mode for following the BNI meeting sequence step by step.
- Dedicated `meeting-flow.json` configuration for meeting steps, suggested SFX, notes, optional durations, and future playlist metadata.
- Per-sound playback behavior, including fade, loop, overlap, restart, and per-sound volume.
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
- `app.js`: Rendering, audio playback logic, quick actions state, and i18n loading.
- `config.json`: Categories, button IDs, colors, and audio paths.
- `i18n/enus.json`: English translations.
- `i18n/ptbr.json`: Brazilian Portuguese translations.
- `audio/`: Local sound effect files.
- `docs/`: Operator and release documentation.
- `.github/ISSUE_TEMPLATE/`: Issue templates for bugs, features, and Codex tasks.

## Runtime Behavior

- One sound plays at a time by design.
- `Stop All` immediately stops the active sound.
- `Volume` controls global soundboard volume.
- `Now Playing` shows the active cue.
- Quick Actions are stored in browser `localStorage`.

## How Quick Actions Works

1. Click `Edit`.
2. In the category cards, use `+` to pin a sound and the star button to unpin.
3. Click `Done` to exit edit mode.
4. Use `Minimize` or `Expand` to collapse or open the Quick Actions panel.

Selections are persisted in browser `localStorage`.

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

## Release Flow

Use the staging workflow for changes:

```text
feature branch -> staging -> test -> main -> GitHub Pages
```

Before merging `staging` into `main`, use the [release checklist](docs/release-checklist.md).

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
