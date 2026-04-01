# BNI SFX Board

A lightweight web-based soundboard designed for BNI meetings, focused on making live event sonoplasty more professional, dynamic, and consistent.

## Purpose

This project helps the meeting host trigger sound effects at the right moments to improve energy, transitions, and celebration cues during the session.

## Features

- Category-based sound buttons loaded from `config.json`
- Local `.mp3` playback from the `audio/` folder
- One-click play/stop behavior per button
- Visual highlight while a sound is playing
- Simple setup (pure HTML, CSS, and JavaScript)

## Project Structure

- `index.html`: Base page structure
- `style.css`: Visual styling and button animations
- `app.js`: Dynamic rendering and playback logic
- `config.json`: Categories, button labels, colors, and audio paths
- `audio/`: Local sound effect files (`.mp3`)

## Current Button Layout

The soundboard is organized for practical BNI flow:

- **Opening and Energy**: entrance and hype cues
- **Transitions and Pace**: moment changes and pause effects
- **Business and TYFCB**: deal/value celebration sounds
- **Final Celebration**: closing victory theme

## How to Customize

1. Add or replace `.mp3` files in the `audio/` folder.
2. Edit `config.json` to update button names, colors, and file paths.
3. Reload `index.html` in your browser.

## Run Locally

Open `index.html` in a modern browser.

For best compatibility with `fetch('config.json')`, you can also serve the folder with a local HTTP server, for example:

```bash
python3 -m http.server 5500
```

Then access: `http://localhost:5500`

## Goal

Support a more professional, engaging, and well-timed audio experience during BNI events.
