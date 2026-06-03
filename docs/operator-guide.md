# Operator Guide

Use this guide to run BNI SFX Board during a live meeting. It is written for a technical or semi-technical operator who is responsible for keeping audio cues clear, useful, and under control.

## Recommended Setup

- Use an iPad for BNI SFX Board.
- Use a MacBook for Spotify or other background music.
- Keep the core soundboard on the iPad, even if music is handled elsewhere.
- Connect audio output before the meeting starts.
- Use the browser in fullscreen or a distraction-free view when possible.
- Use a Bluetooth keyboard, numpad, or macro pad if tactile shortcuts help during live operation.
- Keep the iPad charged or connected to power.
- Test volume with the room audio system, not only with headphones or device speakers.

Spotify integration is optional and planned for a future version. The soundboard works without Spotify.

## Before The Meeting

- Open the soundboard in the iPad browser.
- Confirm the page loads without critical browser errors.
- Set the global volume to a safe starting level.
- Test Stop All.
- Test applause.
- Test the main sound categories:
  - opening energy
  - transitions and pace
  - error or comedy breaks
  - business or TYFCB cues
  - suspense or tension
  - final celebration
- Pin the most useful sounds in Quick Actions.
- Collapse or expand Quick Actions based on how much screen space you want.
- Test the Quick Action shortcut keys in `QWERTYUIOPA` order. Extra pinned actions continue with the remaining keyboard letters, skipping `F`.
- Test `Space` for Stop All.
- Test `F` for fullscreen or focus mode.
- Open Spotify on the MacBook if you use meeting playlists.
- Confirm Spotify audio output and volume separately from the iPad.
- Confirm the iPad battery level.

## During The Meeting

- Keep Stop All visible and easy to reach.
- Use Quick Actions for the cues you expect to use most often.
- Use `QWERTYUIOPA` to trigger Quick Actions from a physical keyboard or macro pad. Extra pinned actions receive the next available letter badge.
- Use `F` to enter fullscreen or focus mode when you want fewer visual distractions.
- Use applause after recognitions, testimonials, guest moments, and presentations.
- Use transition sounds only after the speaker finishes.
- Keep music low during speaking moments.
- Avoid triggering comedy or error sounds during serious member moments.
- Watch the Now Playing label so you know which cue is active.
- Use global volume to adjust room energy without changing the room mixer.
- Use Stop All immediately if a cue starts at the wrong time or is too distracting.

When Meeting Flow Mode is available, use it to follow the BNI meeting sequence, advance between steps, and trigger suggested sounds for each moment. Until then, use Quick Actions as the main live-operation surface.

## Suggested Live Flow

1. Start with a low global volume.
2. Trigger opening energy or applause as the meeting begins.
3. Use subtle transitions between structured moments.
4. Use applause for recognitions and guest participation.
5. Use business cues sparingly for TYFCB or closed-business moments.
6. Use suspense cues only when they support the speaker.
7. Finish with applause or a celebration cue.
8. Stop any remaining sound before closing or switching activities.

## Emergency Controls

- Press Stop All to immediately stop the active sound.
- Press `Space` to trigger Stop All from the keyboard.
- Lower global volume if the room audio is too loud.
- Reload the page if the interface becomes unresponsive.
- Switch back to the full soundboard if Quick Actions does not include the cue you need.
- If Spotify or the MacBook has problems, continue with the iPad soundboard only.

## After The Meeting

- Review which cues worked well.
- Adjust Quick Actions for the next meeting.
- Remove sounds that caused confusion or interrupted speakers.
- Export configuration when import/export support becomes available.
- Keep useful changes in the repository configuration when they should become standard.
- Check whether any new operator notes or meeting-step cues should be added to future Meeting Flow Mode.

## Reliability Notes

- The soundboard is designed to work as a static GitHub Pages app.
- The current app stores Quick Actions in browser localStorage.
- Browser or device changes may require setting Quick Actions again.
- Do not depend on future Spotify controls during a live meeting until they have been tested in the room setup.
