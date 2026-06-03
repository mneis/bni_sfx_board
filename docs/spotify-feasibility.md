# Spotify Feasibility

Research for [issue #9](https://github.com/mneis/bni_sfx_board/issues/9).

## Summary

Spotify control is feasible as an optional feature for BNI SFX Board, but it should be built around the Spotify Web API and Spotify Connect first, not the Web Playback SDK.

The most useful live workflow is:

```text
iPad soundboard -> Spotify Web API -> MacBook Spotify app / Spotify Connect device
```

This keeps the existing soundboard static, browser-hosted, and GitHub Pages compatible. It also matches the real meeting setup: the iPad operates the board while the MacBook remains the music playback device.

The main constraints are:

- The Spotify account must be Premium for playback control endpoints.
- The MacBook must appear as an available Spotify Connect device.
- Spotify API commands can fail or arrive out of order, so fades and rapid controls need conservative timing.
- No Spotify client secret can be stored in this public static app.

## Recommendation

Proceed with Spotify as a future optional integration after this research. Do it in small stages:

1. Add Spotify configuration and Authorization Code with PKCE login.
2. Add device discovery and selected-device persistence.
3. Add basic controls: play/pause, next, previous, current track, and volume.
4. Add operator-focused controls: volume presets, quick raise/lower, fade out, and fade in.

Do not block the existing SFX workflow on Spotify. The app should remain fully usable when Spotify is not configured, not logged in, not Premium, or not available.

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
| Browser as Spotify player | Possible, not preferred for v1 | Web Playback SDK can create a Spotify player in the browser, but that shifts playback to the iPad/browser and adds more browser/autoplay constraints. |

## What Is Not Possible Or Not Reliable

- A static app cannot safely store a Spotify client secret.
- Spotify Web API does not provide native fade in or fade out.
- Playback-control endpoints are not a precise automation clock. Spotify notes that command order is not guaranteed when using multiple Player API endpoints together.
- If Spotify is closed on the MacBook, the MacBook may not appear in available devices and commands may fail.
- If the account is not Premium, playback control and Web Playback SDK usage should be treated as unavailable.
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
| MacBook device not listed | Operator cannot control Spotify from the iPad | Show device status, refresh devices, and keep manual Spotify fallback. |
| Spotify closed on MacBook | No target device for commands | Tell the operator to open Spotify on the MacBook and refresh devices. |
| Non-Premium account | Playback controls fail | Detect 403/errors and show controls as unavailable. |
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
- [Web Playback SDK app player guide](https://developer.spotify.com/documentation/web-playback-sdk/howtos/web-app-player)
