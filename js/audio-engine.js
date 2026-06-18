const DEFAULT_BEHAVIOR = {
    mode: 'exclusive',
    volume: 1,
    fadeInMs: 0,
    fadeOutMs: 0,
    loop: false,
    restartOnPress: true
};

let playbackSequence = 0;

export function createAudioEntry({ botaoConfig, categoria }) {
    return {
        id: botaoConfig.id,
        url: botaoConfig.url,
        categoria,
        cor: botaoConfig.cor || categoria.cor_padrao || '#555',
        behavior: normalizeBehavior(botaoConfig.behavior),
        activeInstances: new Set(),
        buttons: []
    };
}

export function playEntry(state, entry, callbacks) {
    if (entry.behavior.mode === 'exclusive') {
        const isAlreadyPlaying = entry.activeInstances.size > 0;
        if (isAlreadyPlaying && !entry.behavior.restartOnPress) {
            return;
        }

        stopEntriesForReplacement(state, entry);
    }

    startPlaybackInstance(state, entry, callbacks);
}

export function stopEntry(state, entry, callbacks = {}, options = {}) {
    const immediate = options.immediate === true;
    const updateLabel = options.updateLabel !== false;

    Array.from(entry.activeInstances).forEach(instance => {
        stopPlaybackInstance(state, instance, callbacks, { immediate, updateLabel });
    });
}

export function stopAllAudio(state, callbacks, updateLabel = true) {
    state.entries.forEach(entry => {
        stopEntry(state, entry, callbacks, { immediate: true, updateLabel: false });
    });

    state.currentEntry = null;
    if (updateLabel) {
        callbacks.updateNowPlaying();
    }
}

export function applyMasterVolume(state, nextValue, controls) {
    const normalized = Math.max(0, Math.min(1, Number(nextValue.toFixed(2))));
    state.masterVolume = normalized;

    if (controls.volumeSlider) {
        controls.volumeSlider.value = String(normalized);
        controls.volumeSlider.style.setProperty('--volume-percent', `${Math.round(normalized * 100)}%`);
    }

    if (controls.volumeValue) {
        controls.volumeValue.textContent = `${Math.round(normalized * 100)}%`;
    }

    state.entries.forEach(entry => {
        entry.activeInstances.forEach(instance => {
            if (instance.fadeKind !== 'fadeIn' && instance.fadeKind !== 'fadeOut') {
                instance.audio.volume = getEffectiveVolume(state, entry);
            }
        });
    });
}

export function setEntryPlayingState(entry, isPlayingNow) {
    entry.buttons.forEach(button => {
        button.classList.toggle('botao-tocando', isPlayingNow);
    });
}

function normalizeBehavior(rawBehavior = {}) {
    const behavior = rawBehavior && typeof rawBehavior === 'object' ? rawBehavior : {};
    const mode = behavior.mode === 'overlap' ? 'overlap' : DEFAULT_BEHAVIOR.mode;

    return {
        mode,
        volume: clampNumber(behavior.volume, DEFAULT_BEHAVIOR.volume, 0, 1),
        fadeInMs: normalizeDuration(behavior.fadeInMs),
        fadeOutMs: normalizeDuration(behavior.fadeOutMs),
        loop: typeof behavior.loop === 'boolean' ? behavior.loop : DEFAULT_BEHAVIOR.loop,
        restartOnPress: typeof behavior.restartOnPress === 'boolean'
            ? behavior.restartOnPress
            : DEFAULT_BEHAVIOR.restartOnPress
    };
}

function startPlaybackInstance(state, entry, callbacks) {
    const audio = new Audio(entry.url);
    const instance = {
        id: ++playbackSequence,
        audio,
        entry,
        fadeKind: null,
        fadeTimer: null,
        cleaned: false
    };

    audio.preload = 'auto';
    audio.loop = entry.behavior.loop;
    audio.volume = entry.behavior.fadeInMs > 0 ? 0 : getEffectiveVolume(state, entry);

    entry.activeInstances.add(instance);

    const handleEnded = () => {
        cleanupPlaybackInstance(state, instance, callbacks, { updateLabel: true });
    };

    instance.handleEnded = handleEnded;
    audio.addEventListener('ended', handleEnded);

    audio.play()
        .then(() => {
            if (instance.cleaned) return;

            state.currentEntry = entry;
            setEntryPlayingState(entry, true);
            callbacks.updateNowPlaying();

            if (entry.behavior.fadeInMs > 0) {
                runFade(instance, {
                    kind: 'fadeIn',
                    durationMs: entry.behavior.fadeInMs,
                    getVolumeAtProgress: progress => getEffectiveVolume(state, entry) * progress
                });
            }
        })
        .catch(error => {
            console.error('Error playing audio:', error);
            if (callbacks.onPlaybackError) {
                callbacks.onPlaybackError({ entry, error });
            }
            cleanupPlaybackInstance(state, instance, callbacks, { updateLabel: true });
        });
}

function stopEntriesForReplacement(state, nextEntry) {
    state.entries.forEach(entry => {
        stopEntry(state, entry, {}, { immediate: entry === nextEntry, updateLabel: false });
    });
}

function stopPlaybackInstance(state, instance, callbacks, options = {}) {
    if (instance.cleaned) return;

    const immediate = options.immediate === true;
    const updateLabel = options.updateLabel !== false;
    const fadeOutMs = instance.entry.behavior.fadeOutMs;

    if (immediate || fadeOutMs <= 0) {
        cleanupPlaybackInstance(state, instance, callbacks, { updateLabel });
        return;
    }

    const startVolume = instance.audio.volume;
    runFade(instance, {
        kind: 'fadeOut',
        durationMs: fadeOutMs,
        getVolumeAtProgress: progress => startVolume * (1 - progress),
        onComplete: () => cleanupPlaybackInstance(state, instance, callbacks, { updateLabel })
    });
}

function cleanupPlaybackInstance(state, instance, callbacks = {}, options = {}) {
    if (instance.cleaned) return;

    instance.cleaned = true;
    clearFade(instance);
    instance.audio.removeEventListener('ended', instance.handleEnded);
    instance.audio.pause();
    instance.audio.currentTime = 0;
    instance.entry.activeInstances.delete(instance);

    setEntryPlayingState(instance.entry, instance.entry.activeInstances.size > 0);

    if (state.currentEntry === instance.entry && instance.entry.activeInstances.size === 0) {
        state.currentEntry = getLatestActiveEntry(state);
    }

    if (options.updateLabel !== false && callbacks.updateNowPlaying) {
        callbacks.updateNowPlaying();
    }
}

function runFade(instance, { kind, durationMs, getVolumeAtProgress, onComplete }) {
    clearFade(instance);

    if (durationMs <= 0) {
        if (onComplete) onComplete();
        return;
    }

    const startedAt = performance.now();
    instance.fadeKind = kind;
    instance.fadeTimer = window.setInterval(() => {
        if (instance.cleaned) return;

        const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
        instance.audio.volume = Math.max(0, Math.min(1, getVolumeAtProgress(progress)));

        if (progress >= 1) {
            clearFade(instance);
            if (onComplete) onComplete();
        }
    }, 16);
}

function clearFade(instance) {
    if (instance.fadeTimer) {
        window.clearInterval(instance.fadeTimer);
        instance.fadeTimer = null;
    }
    instance.fadeKind = null;
}

function getEffectiveVolume(state, entry) {
    return Math.max(0, Math.min(1, state.masterVolume * entry.behavior.volume));
}

function getLatestActiveEntry(state) {
    let latestInstance = null;

    state.entries.forEach(entry => {
        entry.activeInstances.forEach(instance => {
            if (!latestInstance || instance.id > latestInstance.id) {
                latestInstance = instance;
            }
        });
    });

    return latestInstance ? latestInstance.entry : null;
}

function normalizeDuration(value) {
    return Math.max(0, Math.floor(clampNumber(value, 0, 0, 30000)));
}

function clampNumber(value, fallback, min, max) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return fallback;
    }

    return Math.max(min, Math.min(max, numericValue));
}
