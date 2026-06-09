const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE_URL = 'https://api.spotify.com/v1';
const SCOPES = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing'
];

const STORAGE_KEYS = {
    clientId: 'spotify-client-id',
    tokens: 'spotify-tokens',
    codeVerifier: 'spotify-code-verifier',
    oauthState: 'spotify-oauth-state',
    selectedDeviceId: 'spotify-selected-device-id'
};

const DEFAULT_SPOTIFY_VOLUME = 50;

export function createSpotifyController({ dom, t }) {
    const elements = {
        panel: dom.spotifyPanel,
        title: dom.spotifyTitle,
        status: dom.spotifyStatus,
        clientLabel: dom.spotifyClientLabel,
        clientInput: dom.spotifyClientIdInput,
        saveClientButton: dom.spotifySaveClientButton,
        connectButton: dom.spotifyConnectButton,
        disconnectButton: dom.spotifyDisconnectButton,
        deviceLabel: dom.spotifyDeviceLabel,
        deviceSelect: dom.spotifyDeviceSelect,
        refreshDevicesButton: dom.spotifyRefreshDevicesButton,
        transferButton: dom.spotifyTransferButton,
        playbackStatus: dom.spotifyPlaybackStatus,
        track: dom.spotifyTrack,
        previousButton: dom.spotifyPreviousButton,
        playPauseButton: dom.spotifyPlayPauseButton,
        nextButton: dom.spotifyNextButton,
        volumeLabel: dom.spotifyVolumeLabel,
        volumeSlider: dom.spotifyVolumeSlider,
        volumeValue: dom.spotifyVolumeValue,
        volumeDownButton: dom.spotifyVolumeDownButton,
        volumeUpButton: dom.spotifyVolumeUpButton
    };

    const state = {
        clientId: loadString(STORAGE_KEYS.clientId),
        selectedDeviceId: loadString(STORAGE_KEYS.selectedDeviceId),
        tokens: loadJson(STORAGE_KEYS.tokens),
        devices: [],
        playback: null,
        busy: false,
        statusMessage: ''
    };

    return {
        init,
        syncTexts
    };

    function init() {
        if (!elements.panel) return;

        bindControls();
        syncClientInput();
        syncTexts();
        syncUi();
        completeAuthorizationIfNeeded()
            .then(() => refreshSpotifyState())
            .catch(error => {
                setStatus(getErrorMessage(error));
                syncUi();
            });
    }

    function bindControls() {
        elements.clientInput?.addEventListener('input', () => {
            updateClientId(elements.clientInput.value.trim());
            clearStatus();
            syncUi();
        });

        elements.saveClientButton?.addEventListener('click', () => {
            const nextClientId = elements.clientInput.value.trim();
            updateClientId(nextClientId);
            if (!nextClientId) {
                disconnect();
            } else {
                setStatus(t('spotify.clientSaved', 'Client ID saved'));
                syncUi();
            }
        });

        elements.connectButton?.addEventListener('click', () => {
            beginAuthorization().catch(error => {
                setStatus(getErrorMessage(error));
                syncUi();
            });
        });

        elements.disconnectButton?.addEventListener('click', () => {
            disconnect();
        });

        elements.refreshDevicesButton?.addEventListener('click', () => {
            runCommand(() => refreshSpotifyState());
        });

        elements.deviceSelect?.addEventListener('change', () => {
            state.selectedDeviceId = elements.deviceSelect.value;
            localStorage.setItem(STORAGE_KEYS.selectedDeviceId, state.selectedDeviceId);
            syncUi();
        });

        elements.transferButton?.addEventListener('click', () => {
            runCommand(() => transferPlayback());
        });

        elements.previousButton?.addEventListener('click', () => {
            runCommand(async () => {
                await spotifyApi('/me/player/previous', { method: 'POST', deviceId: getSelectedDeviceId() });
                await refreshSpotifyState();
            });
        });

        elements.playPauseButton?.addEventListener('click', () => {
            runCommand(() => togglePlayback());
        });

        elements.nextButton?.addEventListener('click', () => {
            runCommand(async () => {
                await spotifyApi('/me/player/next', { method: 'POST', deviceId: getSelectedDeviceId() });
                await refreshSpotifyState();
            });
        });

        elements.volumeSlider?.addEventListener('input', () => {
            updateVolumeLabel(Number(elements.volumeSlider.value));
        });

        elements.volumeSlider?.addEventListener('change', () => {
            runCommand(() => setSpotifyVolume(Number(elements.volumeSlider.value)));
        });

        elements.volumeDownButton?.addEventListener('click', () => {
            const nextVolume = clampVolume(Number(elements.volumeSlider.value) - 10);
            updateVolumeControl(nextVolume);
            runCommand(() => setSpotifyVolume(nextVolume));
        });

        elements.volumeUpButton?.addEventListener('click', () => {
            const nextVolume = clampVolume(Number(elements.volumeSlider.value) + 10);
            updateVolumeControl(nextVolume);
            runCommand(() => setSpotifyVolume(nextVolume));
        });
    }

    function syncTexts() {
        setText(elements.title, t('spotify.title', 'Spotify'));
        setText(elements.clientLabel, t('spotify.clientId', 'Client ID'));
        setText(elements.saveClientButton, t('spotify.saveClient', 'Save'));
        setText(elements.connectButton, t('spotify.connect', 'Connect'));
        setText(elements.disconnectButton, t('spotify.disconnect', 'Disconnect'));
        setText(elements.deviceLabel, t('spotify.device', 'Device'));
        setText(elements.refreshDevicesButton, t('spotify.refreshDevices', 'Refresh'));
        setText(elements.transferButton, t('spotify.transfer', 'Transfer'));
        setText(elements.previousButton, t('spotify.previous', 'Prev'));
        setText(elements.nextButton, t('spotify.next', 'Next'));
        setText(elements.volumeLabel, t('spotify.volume', 'Music Volume'));

        if (elements.clientInput) {
            elements.clientInput.placeholder = t('spotify.clientPlaceholder', 'Spotify app Client ID');
        }

        syncUi();
    }

    function syncUi() {
        const hasClientId = Boolean(state.clientId);
        const connected = hasValidTokens();
        const hasDevice = Boolean(getSelectedDeviceId());
        const controlsEnabled = connected && hasDevice && !state.busy;
        const volumeEnabled = controlsEnabled && getSelectedDevice()?.supports_volume !== false;

        elements.connectButton.disabled = !hasClientId || connected || state.busy;
        elements.disconnectButton.disabled = !connected || state.busy;
        elements.refreshDevicesButton.disabled = !connected || state.busy;
        elements.deviceSelect.disabled = !connected || state.busy || state.devices.length === 0;
        elements.transferButton.disabled = !controlsEnabled;
        elements.previousButton.disabled = !controlsEnabled;
        elements.playPauseButton.disabled = !controlsEnabled;
        elements.nextButton.disabled = !controlsEnabled;
        elements.volumeSlider.disabled = !volumeEnabled;
        elements.volumeDownButton.disabled = !volumeEnabled;
        elements.volumeUpButton.disabled = !volumeEnabled;

        setText(elements.playPauseButton, state.playback?.is_playing
            ? t('spotify.pause', 'Pause')
            : t('spotify.play', 'Play'));

        updateDeviceOptions();
        updateStatusText();
        updateTrackText();
        updateVolumeFromState();
    }

    function updateStatusText() {
        if (state.statusMessage) {
            setText(elements.status, state.statusMessage);
            return;
        }

        if (!state.clientId) {
            setText(elements.status, t('spotify.statusNeedsClient', 'Add a Spotify Client ID'));
            return;
        }

        if (!hasValidTokens()) {
            setText(elements.status, t('spotify.statusDisconnected', 'Disconnected'));
            return;
        }

        if (state.devices.length === 0) {
            setText(elements.status, t('spotify.statusNoDevices', 'No Spotify devices found'));
            return;
        }

        const device = getSelectedDevice();
        setText(elements.status, device
            ? t('spotify.statusReady', 'Ready') + `: ${device.name}`
            : t('spotify.statusSelectDevice', 'Select a device'));
    }

    function updateTrackText() {
        const item = state.playback?.item;
        if (!item) {
            setText(elements.track, `${t('spotify.track', 'Track')}: ${t('ui.none', '-')}`);
            setText(elements.playbackStatus, t('spotify.playbackUnknown', 'Playback: -'));
            return;
        }

        const artists = Array.isArray(item.artists)
            ? item.artists.map(artist => artist.name).filter(Boolean).join(', ')
            : '';
        const trackText = artists ? `${item.name} - ${artists}` : item.name;
        setText(elements.track, `${t('spotify.track', 'Track')}: ${trackText}`);
        setText(elements.playbackStatus, state.playback.is_playing
            ? t('spotify.playing', 'Playing')
            : t('spotify.paused', 'Paused'));
    }

    function updateDeviceOptions() {
        if (!elements.deviceSelect) return;

        const selectedDeviceId = getSelectedDeviceId();
        elements.deviceSelect.innerHTML = '';

        if (state.devices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = t('spotify.noDevices', 'No devices');
            elements.deviceSelect.appendChild(option);
            return;
        }

        state.devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id || '';
            option.textContent = `${device.name} (${device.type})`;
            option.disabled = device.is_restricted || !device.id;
            elements.deviceSelect.appendChild(option);
        });

        elements.deviceSelect.value = selectedDeviceId;
    }

    function updateVolumeFromState() {
        const device = getSelectedDevice();
        const nextVolume = Number.isFinite(device?.volume_percent)
            ? device.volume_percent
            : Number(elements.volumeSlider?.value || DEFAULT_SPOTIFY_VOLUME);
        updateVolumeControl(nextVolume);
    }

    function updateVolumeControl(value) {
        const nextVolume = clampVolume(value);
        if (elements.volumeSlider) {
            elements.volumeSlider.value = String(nextVolume);
            elements.volumeSlider.style.setProperty('--spotify-volume-percent', `${nextVolume}%`);
        }
        updateVolumeLabel(nextVolume);
    }

    function updateVolumeLabel(value) {
        setText(elements.volumeValue, `${clampVolume(value)}%`);
    }

    async function completeAuthorizationIfNeeded() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');
        const returnedState = params.get('state');

        if (!code && !error) return;

        cleanupAuthorizationParams(params);

        if (error) {
            throw new Error(`${t('spotify.authError', 'Spotify authorization failed')}: ${error}`);
        }

        const expectedState = loadString(STORAGE_KEYS.oauthState);
        if (!expectedState || returnedState !== expectedState) {
            throw new Error(t('spotify.stateMismatch', 'Spotify authorization state mismatch'));
        }

        const codeVerifier = loadString(STORAGE_KEYS.codeVerifier);
        if (!codeVerifier) {
            throw new Error(t('spotify.missingVerifier', 'Missing Spotify authorization verifier'));
        }

        state.clientId = loadString(STORAGE_KEYS.clientId);
        state.tokens = await requestToken({
            grant_type: 'authorization_code',
            code,
            redirect_uri: getRedirectUri(),
            code_verifier: codeVerifier,
            client_id: state.clientId
        });

        saveTokens(state.tokens);
        localStorage.removeItem(STORAGE_KEYS.codeVerifier);
        localStorage.removeItem(STORAGE_KEYS.oauthState);
        setStatus(t('spotify.connected', 'Spotify connected'));
    }

    async function beginAuthorization() {
        state.clientId = elements.clientInput.value.trim() || state.clientId;
        if (!state.clientId) {
            throw new Error(t('spotify.statusNeedsClient', 'Add a Spotify Client ID'));
        }

        localStorage.setItem(STORAGE_KEYS.clientId, state.clientId);

        const codeVerifier = generateRandomString(96);
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const oauthState = generateRandomString(32);
        localStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);
        localStorage.setItem(STORAGE_KEYS.oauthState, oauthState);

        const authUrl = new URL(AUTH_URL);
        authUrl.search = new URLSearchParams({
            client_id: state.clientId,
            response_type: 'code',
            redirect_uri: getRedirectUri(),
            scope: SCOPES.join(' '),
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            state: oauthState
        }).toString();

        window.location.assign(authUrl.toString());
    }

    async function refreshSpotifyState() {
        if (!state.clientId || !state.tokens) {
            syncUi();
            return;
        }

        await refreshDevices();
        await refreshPlayback();
        clearStatus();
        syncUi();
    }

    async function refreshDevices() {
        const data = await spotifyApi('/me/player/devices');
        state.devices = Array.isArray(data?.devices) ? data.devices : [];

        const storedDevice = state.devices.find(device => device.id === state.selectedDeviceId && !device.is_restricted);
        const activeDevice = state.devices.find(device => device.is_active && device.id && !device.is_restricted);
        const firstDevice = state.devices.find(device => device.id && !device.is_restricted);
        const nextDevice = storedDevice || activeDevice || firstDevice || null;
        state.selectedDeviceId = nextDevice?.id || '';

        if (state.selectedDeviceId) {
            localStorage.setItem(STORAGE_KEYS.selectedDeviceId, state.selectedDeviceId);
        } else {
            localStorage.removeItem(STORAGE_KEYS.selectedDeviceId);
        }
    }

    async function refreshPlayback() {
        state.playback = await spotifyApi('/me/player');
    }

    async function transferPlayback() {
        const deviceId = getSelectedDeviceId();
        if (!deviceId) return;

        await spotifyApi('/me/player', {
            method: 'PUT',
            body: {
                device_ids: [deviceId],
                play: false
            }
        });
        await refreshSpotifyState();
    }

    async function togglePlayback() {
        const deviceId = getSelectedDeviceId();
        if (!deviceId) return;

        if (state.playback?.is_playing) {
            await spotifyApi('/me/player/pause', { method: 'PUT', deviceId });
        } else {
            await spotifyApi('/me/player/play', { method: 'PUT', deviceId });
        }
        await refreshSpotifyState();
    }

    async function setSpotifyVolume(value) {
        const deviceId = getSelectedDeviceId();
        if (!deviceId) return;

        await spotifyApi('/me/player/volume', {
            method: 'PUT',
            deviceId,
            query: {
                volume_percent: clampVolume(value)
            }
        });
        await refreshSpotifyState();
    }

    async function runCommand(command) {
        if (state.busy) return;

        state.busy = true;
        syncUi();
        try {
            await command();
            clearStatus();
        } catch (error) {
            setStatus(getErrorMessage(error));
        } finally {
            state.busy = false;
            syncUi();
        }
    }

    async function spotifyApi(path, options = {}) {
        const token = await getAccessToken();
        const url = new URL(`${API_BASE_URL}${path}`);
        const query = options.query || {};

        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        });

        if (options.deviceId && !url.searchParams.has('device_id')) {
            url.searchParams.set('device_id', options.deviceId);
        }

        const response = await fetch(url.toString(), {
            method: options.method || 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.body ? { 'Content-Type': 'application/json' } : {})
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (response.status === 204) return null;
        if (response.status === 401) {
            clearTokens();
            throw new Error(t('spotify.unauthorized', 'Spotify authorization expired'));
        }
        if (response.status === 403) {
            throw new Error(t('spotify.premiumRequired', 'Spotify Premium or device permission required'));
        }
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new Error(retryAfter
                ? `${t('spotify.rateLimited', 'Spotify rate limited')}. ${t('spotify.retryAfter', 'Retry after')} ${retryAfter}s`
                : t('spotify.rateLimited', 'Spotify rate limited'));
        }
        if (!response.ok) {
            throw new Error(`${t('spotify.apiError', 'Spotify API error')}: ${response.status}`);
        }

        return response.json();
    }

    async function getAccessToken() {
        if (!state.tokens) {
            throw new Error(t('spotify.statusDisconnected', 'Disconnected'));
        }

        if (Date.now() < state.tokens.expiresAt - 60000) {
            return state.tokens.accessToken;
        }

        if (!state.tokens.refreshToken) {
            clearTokens();
            throw new Error(t('spotify.unauthorized', 'Spotify authorization expired'));
        }

        const refreshedTokens = await requestToken({
            grant_type: 'refresh_token',
            refresh_token: state.tokens.refreshToken,
            client_id: state.clientId
        });

        state.tokens = {
            ...state.tokens,
            ...refreshedTokens,
            refreshToken: refreshedTokens.refreshToken || state.tokens.refreshToken
        };
        saveTokens(state.tokens);
        return state.tokens.accessToken;
    }

    async function requestToken(params) {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(params).toString()
        });

        if (!response.ok) {
            throw new Error(`${t('spotify.authError', 'Spotify authorization failed')}: ${response.status}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
        };
    }

    function disconnect() {
        clearTokens();
        state.devices = [];
        state.playback = null;
        state.selectedDeviceId = '';
        localStorage.removeItem(STORAGE_KEYS.selectedDeviceId);
        setStatus(t('spotify.statusDisconnected', 'Disconnected'));
        syncUi();
    }

    function updateClientId(nextClientId) {
        const changed = nextClientId !== state.clientId;
        state.clientId = nextClientId;
        localStorage.setItem(STORAGE_KEYS.clientId, nextClientId);

        if (changed) {
            clearTokens();
            state.devices = [];
            state.playback = null;
            state.selectedDeviceId = '';
            localStorage.removeItem(STORAGE_KEYS.selectedDeviceId);
        }
    }

    function getSelectedDeviceId() {
        return state.selectedDeviceId || elements.deviceSelect?.value || '';
    }

    function getSelectedDevice() {
        const deviceId = getSelectedDeviceId();
        return state.devices.find(device => device.id === deviceId) || null;
    }

    function syncClientInput() {
        if (elements.clientInput) {
            elements.clientInput.value = state.clientId;
        }
    }

    function setStatus(message) {
        state.statusMessage = message;
    }

    function clearStatus() {
        state.statusMessage = '';
    }

    function hasValidTokens() {
        return Boolean(state.tokens?.accessToken);
    }

    function saveTokens(tokens) {
        state.tokens = tokens;
        localStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(tokens));
    }

    function clearTokens() {
        state.tokens = null;
        localStorage.removeItem(STORAGE_KEYS.tokens);
    }

    function getRedirectUri() {
        return `${window.location.origin}${window.location.pathname}`;
    }

    function cleanupAuthorizationParams(params) {
        params.delete('code');
        params.delete('state');
        params.delete('error');
        const queryString = params.toString();
        const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
        window.history.replaceState({}, document.title, nextUrl);
    }
}

function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

function loadString(key) {
    return localStorage.getItem(key) || '';
}

function loadJson(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        localStorage.removeItem(key);
        return null;
    }
}

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, value => possible[value % possible.length]).join('');
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function clampVolume(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
