# Spotify Feasibility

Research for [issue #9](https://github.com/mneis/bni_sfx_board/issues/9).

## Summary

Spotify control is feasible as an optional feature for BNI SFX Board, but the best architecture depends on where the music should actually play.

The first research pass assumed this workflow:

```text
iPad soundboard -> Spotify Web API -> MacBook Spotify app / Spotify Connect device
```

That works for remote control, but it does not fully solve two live-operation problems:

- The operator still has two audio sources to balance: iPad sound effects and MacBook Spotify music.
- There may be delay, extra cabling, or an extra device connected to the sound table.

The preferred future workflow may be:

```text
iPad soundboard -> local SFX + Spotify playback from the same iPad/browser -> sound table
```

That is possible in theory with the Spotify Web Playback SDK, but it is riskier on iPad than on desktop browsers because iOS browser audio volume is under physical device control. The Spotify SDK documentation says the SDK volume property is not settable in JavaScript on iOS, and reading it always returns `1`.

The main constraints are:

- The Spotify account must be Premium for playback control endpoints.
- The MacBook must appear as an available Spotify Connect device.
- If the iPad browser is the Spotify player, iOS volume limitations may block reliable music ducking/fades.
- Spotify API commands can fail or arrive out of order, so fades and rapid controls need conservative timing.
- No Spotify client secret can be stored in this public static app.

## Recommendation

Proceed with Spotify as a future optional integration, but split the decision into two product goals:

1. Remote-control Spotify running somewhere else.
2. Make the iPad/browser itself the music player.

Remote control is safer and easier. iPad-as-player is more attractive for the sound table, but it carries the biggest technical risk because music volume and fade control may not be reliable on iOS.

Build in small stages:

1. Add Spotify configuration and Authorization Code with PKCE login.
2. Add device discovery and selected-device persistence.
3. Add basic controls: play/pause, next, previous, current track, and volume.
4. Add operator-focused controls: volume presets, quick raise/lower, fade out, and fade in.

For the first implementation, prefer Web API control of an external Spotify Connect device. Before committing to iPad-as-player, create a small browser proof of concept on the real iPad and test:

- whether the Spotify Web Playback SDK can start reliably after a user gesture;
- whether it appears as a stable Spotify Connect device;
- whether volume changes work through the Web API;
- whether SFX can play clearly over Spotify without the browser or OS ducking one source unexpectedly;
- whether fade out/fade in feels reliable enough for live operation.

Do not block the existing SFX workflow on Spotify. The app should remain fully usable when Spotify is not configured, not logged in, not Premium, or not available.

## Playback Architecture Options

| Option | What plays audio | Pros | Cons | Recommendation |
| --- | --- | --- | --- | --- |
| Static soundboard controls MacBook Spotify | iPad plays SFX, MacBook plays Spotify | Easy first version, GitHub Pages compatible, uses Spotify Connect as intended | Two audio sources/devices; harder SFX/music balance; possible delay/cabling complexity | Good first integration, but not the final ideal setup |
| Static soundboard with Web Playback SDK on iPad | iPad browser plays SFX and Spotify | One device to sound table; best operator simplicity if it works | Premium required; iOS autoplay restrictions; iOS SDK volume cannot be set in JavaScript; fade/ducking may be unreliable | Needs proof of concept before full implementation |
| Soundboard controls Spotify native app on same iPad | iPad browser plays SFX, Spotify app plays music | Uses official Spotify app as player; no Mac needed | Browser and native Spotify are separate apps; shared physical volume; focus/audio-session behavior may interrupt or duck audio; browser cannot directly mix the Spotify app | Possible experiment, but fragile for live use |
| Local backend/player host | Mac/mini/Raspberry Pi/browser host plays SFX and controls Spotify | Most reliable live architecture; iPad becomes remote control; backend can queue commands and keep auth/token state | Requires another machine/server; no longer pure GitHub Pages; Spotify still Premium/API constrained | Best professional architecture if reliability matters more than static hosting |

## iPad As The Spotify Player

Using the iPad as the single playback device is not crazy. It is actually the cleanest live-operation idea if it works:

- one device connected to the sound table;
- one operator interface;
- less cabling;
- fewer timing surprises between SFX and music.

The risk is volume control. The soundboard needs to control the relationship between SFX and music. Local sound effects can be controlled by the app because they are normal browser audio. Spotify playback through the Web Playback SDK is different: on iOS, SDK volume is not settable in JavaScript. That may prevent true music ducking/fade control from the soundboard.

This means an iPad-as-player implementation needs a technical spike before production work:

1. Open a minimal Web Playback SDK test page on the iPad.
2. Authenticate with Premium Spotify.
3. Call `activateElement()` from a real user tap before transfer/playback.
4. Transfer playback to the browser player.
5. Try play/pause, next/previous, and set-volume commands.
6. Play local SFX over Spotify and check whether both are audible and balanced.
7. Try rapid fade/ducking changes and check whether iOS applies them.

If volume control fails on iPad, this option should not be used for meeting operation.

## Spotify App On The Same iPad

Using the native Spotify app on the same iPad as the playback target is worth a quick experiment, but it should be treated as fragile.

The possible workflow would be:

```text
iPad browser soundboard -> Spotify Web API -> iPad Spotify app
```

The problem is that the browser soundboard and Spotify app do not become one mixer. They are separate applications sharing the same device output. The browser can control its own SFX volume, but it cannot directly control or mix the native Spotify app audio like a DAW or sound desk.

This option may work for simple play/pause/next/previous, but it is risky for:

- reliable fade in/out;
- music ducking while sound effects play;
- keeping both apps active and audible;
- avoiding OS audio focus changes;
- predictable behavior during a live meeting.

Recommendation: test it only as a quick proof of concept. Do not design the main architecture around it unless it behaves perfectly on the actual iPad.

## Backend Option

A backend can help, but it changes the product from a pure static GitHub Pages app into a hosted or local service.

A backend is useful for:

- keeping Spotify token refresh logic off the browser;
- storing a Spotify client secret safely if using a confidential OAuth flow;
- queuing Spotify commands so fade/play/stop requests do not overlap;
- centralizing logs and diagnostics;
- letting the iPad act as a remote controller over WebSocket/HTTP;
- playing local SFX from a dedicated host connected to the sound table.

A backend does not automatically solve:

- Spotify Premium requirement;
- Spotify API command-order limitations;
- Spotify policy restrictions;
- iOS browser volume limitations if the iPad browser is still the player;
- the fact that Spotify audio cannot be freely mixed, altered, rebroadcast, or treated like local audio samples.

The most common reliable live-sound approach is:

```text
iPad controller UI -> local playback host -> sound table
```

The playback host can be a MacBook, small PC, or Raspberry Pi-class device. It runs the actual audio engine and exposes a controller UI to the iPad. For BNI SFX Board, this could mean:

- the host plays local SFX directly;
- the host controls Spotify through Web API/Connect;
- the iPad only sends commands;
- the host is physically connected to the sound table.

This is less simple than GitHub Pages, but it is the best path if the goal is professional reliability, one audio connection, command logging, and predictable live behavior.

Recommendation: do not jump to a backend immediately. First test the static Spotify control path and the iPad Web Playback SDK spike. If iPad volume/fade control is unreliable, a local playback host/backend becomes the stronger direction.

## What Is Possible

| Question | Feasibility | Notes |
| --- | --- | --- |
| Authenticate from GitHub Pages | Yes | Spotify recommends Authorization Code with PKCE for single-page apps and clients where a secret cannot be safely stored. |
| Use Spotify without a backend | Yes, for Web API calls | Use PKCE, a public client ID, and registered redirect URIs. Do not use Client Credentials or normal Authorization Code with a client secret. |
| Show active Spotify devices | Yes | `GET /me/player/devices` returns available Spotify Connect devices with `user-read-playback-state`. Some devices may not be listed. |
| Control the MacBook Spotify session | Yes, when available | Use Spotify Connect device IDs and Web API Player endpoints. The MacBook Spotify app must be open/available enough to appear as a device. |
| Play/pause | Yes | Requires `user-modify-playback-state` and Premium. |
| Next/previous track | Yes | Requires `user-modify-playback-state` and Premium. |
| Set Spotify volume | Yes | Requires `user-modify-playback-state` and Premium. Some devices may not support volume changes. |
| Fade out/fade in | Yes, simulated | Spotify does not provide native fade endpoints. We can step volume up/down with repeated Set Playback Volume calls. |
| Read current playback | Yes | `user-read-playback-state` can read current playback state; `user-read-currently-playing` is useful for current track/queue views. |
| Browser as Spotify player | Possible, but risky on iPad | Web Playback SDK can create a Spotify player in the browser, but iOS autoplay and volume-control limitations must be tested on the real iPad. |

## What Is Not Possible Or Not Reliable

- A static app cannot safely store a Spotify client secret.
- Spotify Web API does not provide native fade in or fade out.
- Playback-control endpoints are not a precise automation clock. Spotify notes that command order is not guaranteed when using multiple Player API endpoints together.
- If Spotify is closed on the external playback device, that device may not appear in available devices and commands may fail.
- If the account is not Premium, playback control and Web Playback SDK usage should be treated as unavailable.
- If the browser player is running on iPad, Spotify volume may not be programmatically controllable enough for fade/ducking behavior.
- The app should not attempt to mix, alter, rebroadcast, record, or synchronize Spotify content with visual media.

## Required Account Type

Spotify Premium is required for the intended workflow.

The official Player endpoints for transfer playback, play/resume, pause, skip, and volume state that they work only for Premium users. The Web Playback SDK also requires a Premium account. A non-Premium account may still authenticate, but the app should show Spotify controls as unavailable and explain why.

## Required OAuth Scopes

Recommended v1 scopes:

```text
user-read-playback-state
user-modify-playback-state
user-read-currently-playing
```

Use them as follows:

- `user-read-playback-state`: list Spotify Connect devices and read playback state.
- `user-modify-playback-state`: transfer playback, play, pause, skip, set volume, and future queue controls.
- `user-read-currently-playing`: show the currently playing track and queue-related state.

Only add these later if a specific feature needs them:

- `streaming`: only if the Web Playback SDK is used to make the browser itself a Spotify player.
- `playlist-read-private` / `playlist-read-collaborative`: only if the app needs to show the operator's Spotify playlists.
- `user-read-private`: optional if we want to read account details directly, but the app can also infer Premium limitations from failed playback-control calls.

## GitHub Pages Compatibility

GitHub Pages is compatible with a Spotify Web API integration if the app uses Authorization Code with PKCE:

- Register a Spotify app in the Spotify Developer Dashboard.
- Add production redirect URI, for example the GitHub Pages URL.
- Add local development redirect URIs, for example `http://127.0.0.1:8000/` and any stable localhost URL used for testing.
- Store only the Spotify client ID in public config or code.
- Never store the client secret in the repo.
- Use browser storage carefully for access and refresh tokens.

The PKCE flow can refresh tokens from browser JavaScript by sending the refresh token and client ID. Since browser storage is accessible to client-side code, the app should provide a clear logout/disconnect action that removes Spotify tokens.

## Security Considerations

- Client ID is public and acceptable to expose.
- Client secret is private and must not be used in this repository.
- Access tokens and refresh tokens should be scoped narrowly.
- Store tokens only when necessary. Session storage is safer; local storage is more convenient for iPad operation.
- Provide a `Disconnect Spotify` action that clears tokens and selected device data.
- Use a `state` value in the OAuth redirect flow to reduce cross-site request forgery risk.
- Keep Spotify optional so an auth failure cannot break SFX playback.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| External device not listed | Operator cannot control Spotify from the iPad | Show device status, refresh devices, and keep manual Spotify fallback. |
| Spotify closed on external device | No target device for commands | Tell the operator to open Spotify and refresh devices. |
| Non-Premium account | Playback controls fail | Detect 403/errors and show controls as unavailable. |
| iPad browser volume limitation | Music fades/ducking may not work | Run an iPad Web Playback SDK spike before building the full feature. |
| API rate limit | Fades or rapid volume taps may fail | Use coarse fade steps, debounce repeated taps, and respect `Retry-After` on 429. |
| Command ordering | Fade/play commands may feel inconsistent | Queue Spotify commands in the app and avoid overlapping fades. |
| Browser token storage | Token exposure if browser/device is compromised | Keep scopes narrow, support disconnect, and avoid secrets. |
| Policy mismatch | App could violate Spotify rules if used incorrectly | Do not alter, rebroadcast, record, or synchronize Spotify content. Use Spotify as operator-side playback control only. |

## Fade Strategy

Spotify volume fades should be simulated with a controlled sequence of Set Playback Volume calls.

Suggested first version:

- Use 5 to 8 volume steps per fade.
- Keep fade durations operator-friendly, for example 1.5 to 4 seconds.
- Cancel any active fade when the operator presses a new Spotify volume command.
- Do not poll playback state during every fade step.
- If Spotify returns `429`, stop the fade and wait for the documented retry window.

This should be good enough for meeting operation without hammering the Web API.

## Suggested Follow-Up Issues

1. Add Spotify OAuth PKCE foundation
   - Add optional Spotify config.
   - Implement login callback, token refresh, and disconnect.
   - Store no client secret.

2. Add Spotify device and playback status panel
   - List available devices.
   - Select/persist the MacBook device.
   - Show current track and connection state.

3. Add Spotify transport controls
   - Play/pause.
   - Next/previous.
   - Basic volume slider.
   - Clear error states for no device, no Premium, and auth failure.

4. Add operator volume controls and fades
   - Fast raise/lower buttons.
   - Preset levels such as low, bed, normal, and high.
   - Fade out and fade in actions.
   - Command queue to prevent overlapping fades.

5. Consider playlist support
   - Only after transport/volume controls are stable.
   - Add playlist scopes only if the UI needs to browse or launch playlists.

6. Prototype iPad Web Playback SDK as the player
   - Verify autoplay/user-gesture behavior.
   - Verify whether Web API volume commands work against the iPad browser player.
   - Verify local SFX + Spotify overlap from the same iPad output.
   - Decide whether iPad-as-player is viable for live operation.

7. Evaluate local playback host/backend architecture
   - Define a minimal Node or Python backend.
   - Use WebSocket/HTTP commands from the iPad UI.
   - Play local SFX from the host.
   - Control Spotify from the host with a queued command layer.
   - Compare reliability against the static GitHub Pages approach.

## Sources

- [Authorization Code with PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Refreshing Tokens](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)
- [Scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes)
- [Rate Limits](https://developer.spotify.com/documentation/web-api/concepts/rate-limits)
- [Get Available Devices](https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices)
- [Get Playback State](https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback)
- [Transfer Playback](https://developer.spotify.com/documentation/web-api/reference/transfer-a-users-playback)
- [Start/Resume Playback](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Pause Playback](https://developer.spotify.com/documentation/web-api/reference/pause-a-users-playback)
- [Skip To Next](https://developer.spotify.com/documentation/web-api/reference/skip-users-playback-to-next-track)
- [Skip To Previous](https://developer.spotify.com/documentation/web-api/reference/skip-users-playback-to-previous-track)
- [Set Playback Volume](https://developer.spotify.com/documentation/web-api/reference/set-volume-for-users-playback)
- [Web Playback SDK getting started](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started)
- [Web Playback SDK reference](https://developer.spotify.com/documentation/web-playback-sdk/reference)
- [Web Playback SDK app player guide](https://developer.spotify.com/documentation/web-playback-sdk/howtos/web-app-player)
