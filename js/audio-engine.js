export function createAudioEntry({ botaoConfig, categoria, masterVolume, onEnded }) {
    const audio = new Audio(botaoConfig.url);
    audio.preload = 'auto';
    audio.volume = masterVolume;

    const entry = {
        id: botaoConfig.id,
        categoria,
        cor: botaoConfig.cor || categoria.cor_padrao || '#555',
        audio,
        buttons: []
    };

    audio.addEventListener('ended', () => onEnded(entry));

    return entry;
}

export function playEntryExclusive(state, entry, callbacks) {
    stopAllAudio(state, callbacks, false);
    entry.audio.currentTime = 0;
    entry.audio.volume = state.masterVolume;

    entry.audio.play()
        .then(() => {
            state.currentEntry = entry;
            setEntryPlayingState(entry, true);
            callbacks.updateNowPlaying();
        })
        .catch(error => console.error('Error playing audio:', error));
}

export function stopEntry(state, entry) {
    entry.audio.pause();
    entry.audio.currentTime = 0;
    setEntryPlayingState(entry, false);

    if (state.currentEntry === entry) {
        state.currentEntry = null;
    }
}

export function stopAllAudio(state, callbacks, updateLabel = true) {
    state.entries.forEach(entry => stopEntry(state, entry));
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
        entry.audio.volume = state.masterVolume;
    });
}

export function setEntryPlayingState(entry, isPlayingNow) {
    entry.buttons.forEach(button => {
        button.classList.toggle('botao-tocando', isPlayingNow);
    });
}
