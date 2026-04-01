# BNI SFX Board

A lightweight web-based soundboard designed for BNI meetings, focused on making live event sonoplasty more professional, dynamic, and consistent.

## Purpose

This project helps the meeting host trigger sound effects at the right moments to improve energy, transitions, and celebration cues during the session.

## Features

- Category-based buttons loaded from `config.json`
- Local `.mp3` playback from the `audio/` folder
- Exclusive playback (starting one sound stops the previous one)
- Quick access control dock (fixed): `Stop All`, `Volume`, and `Now Playing`
- Quick Actions panel with edit mode (pin/unpin sounds) and minimize/expand
- Dark theme optimized for live operation environments
- Mobile-friendly responsive layout
- Internationalization (i18n) with `English (US)` and `Português (BR)`

## Project Structure

- `index.html`: Page structure and UI regions
- `style.css`: Dark theme, layout, responsive behavior, interaction states
- `app.js`: Rendering, audio playback logic, quick actions state, i18n loading
- `config.json`: Categories and button IDs + audio paths
- `i18n/enus.json`: English translations
- `i18n/ptbr.json`: Brazilian Portuguese translations
- `audio/`: Local sound effect files (`.mp3`)

## Runtime Behavior

- One-sound-at-a-time playback by design
- `Stop All` immediately stops any playing audio
- `Volume` is global and always visible in the fixed control dock
- `Now Playing` updates with the active cue

## How Quick Actions Works

1. Click `Edit`.
2. In the category cards, use `+` to pin a sound and `★` to unpin.
3. Click `Done` to exit edit mode.
4. Use `Minimize` / `Expand` to collapse or open the Quick Actions panel.

Selections are persisted in browser `localStorage`.

## Internationalization

- Use the language selector in the header.
- Translations come from `i18n/enus.json` and `i18n/ptbr.json`.
- Category and button labels are translated by IDs from `config.json`.

## How to Customize

1. Add or replace `.mp3` files in `audio/`.
2. Update `config.json` IDs and audio paths.
3. Update translation labels in `i18n/enus.json` and `i18n/ptbr.json`.
4. Reload the page.

## Run Locally

For best compatibility with `fetch(...)`, serve the folder with a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

## Goal

Support a more professional, engaging, and well-timed audio experience during BNI events.
