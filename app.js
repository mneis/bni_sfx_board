document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('soundboard-container');
    const quickActionsSection = document.getElementById('quick-actions');
    const quickActionsGrid = document.getElementById('quick-actions-grid');
    const stopAllButton = document.getElementById('stop-all');
    const volumeSlider = document.getElementById('volume-master');
    const localeSelector = document.getElementById('locale-selector');
    const quickEditButton = document.getElementById('quick-edit');
    const quickToggleButton = document.getElementById('quick-toggle');

    const state = {
        config: null,
        entries: [],
        currentEntry: null,
        locales: {},
        locale: localStorage.getItem('soundboard-locale') || 'enus',
        masterVolume: volumeSlider ? Number(volumeSlider.value) : 1,
        quickActionIds: new Set(loadQuickActions()),
        quickEditing: false,
        quickMinimized: localStorage.getItem('quick-minimized') === '1'
    };

    if (localeSelector) {
        localeSelector.value = state.locale;
    }

    Promise.all([
        fetch('config.json').then(response => response.json()),
        fetch('i18n/enus.json').then(response => response.json()),
        fetch('i18n/ptbr.json').then(response => response.json())
    ])
        .then(([config, enus, ptbr]) => {
            state.config = config;
            state.locales = { enus, ptbr };
            renderEverything();
            bindControls();
        })
        .catch(error => console.error('Failed to load app resources:', error));

    function bindControls() {
        if (stopAllButton) {
            stopAllButton.addEventListener('click', () => {
                stopAllAudio();
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', () => {
                state.masterVolume = Number(volumeSlider.value);
                state.entries.forEach(entry => {
                    entry.audio.volume = state.masterVolume;
                });
            });
        }

        if (localeSelector) {
            localeSelector.addEventListener('change', () => {
                state.locale = localeSelector.value;
                localStorage.setItem('soundboard-locale', state.locale);
                renderEverything();
            });
        }

        if (quickEditButton) {
            quickEditButton.addEventListener('click', () => {
                state.quickEditing = !state.quickEditing;
                updateQuickEditingState();
                updateStaticTexts();
            });
        }

        if (quickToggleButton) {
            quickToggleButton.addEventListener('click', () => {
                state.quickMinimized = !state.quickMinimized;
                localStorage.setItem('quick-minimized', state.quickMinimized ? '1' : '0');
                updateQuickMinimizedState();
                updateStaticTexts();
            });
        }
    }

    function renderEverything() {
        stopAllAudio(false);
        renderSoundboard();
        renderQuickActions();
        updateQuickEditingState();
        updateQuickMinimizedState();
        updateStaticTexts();
        updateNowPlaying();
    }

    function renderSoundboard() {
        container.innerHTML = '';
        state.entries = [];

        state.config.categorias.forEach(categoria => {
            const section = document.createElement('section');
            section.className = 'categoria';

            const title = document.createElement('h2');
            title.textContent = getCategoryLabel(categoria);
            section.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'grid-botoes';

            categoria.botoes.forEach(botaoConfig => {
                const entry = createAudioEntry(botaoConfig, categoria);
                state.entries.push(entry);
                const card = createSoundCard(entry, false);
                grid.appendChild(card);
            });

            section.appendChild(grid);
            container.appendChild(section);
        });
    }

    function createAudioEntry(botaoConfig, categoria) {
        const audio = new Audio(botaoConfig.url);
        audio.preload = 'auto';
        audio.volume = state.masterVolume;

        const entry = {
            id: botaoConfig.id,
            categoria,
            cor: botaoConfig.cor || categoria.cor_padrao || '#555',
            audio,
            buttons: []
        };

        audio.addEventListener('ended', () => {
            setEntryPlayingState(entry, false);
            if (state.currentEntry === entry) {
                state.currentEntry = null;
                updateNowPlaying();
            }
        });

        return entry;
    }

    function createSoundCard(entry, isQuickAction) {
        const card = document.createElement('div');
        card.className = 'sound-item';

        const button = document.createElement('button');
        button.className = 'botao-som';
        if (isQuickAction) {
            button.classList.add('botao-prioritario');
        }
        if (isMajorCue(entry.id)) {
            button.classList.add('botao-major');
        }

        button.style.backgroundColor = entry.cor;
        button.textContent = getButtonLabel(entry);
        button.addEventListener('click', () => {
            toggleEntry(entry);
        });

        entry.buttons.push(button);
        card.appendChild(button);

        if (!isQuickAction) {
            const pinButton = document.createElement('button');
            pinButton.className = 'pin-toggle';
            pinButton.type = 'button';
            pinButton.textContent = state.quickActionIds.has(entry.id) ? '★' : '+';
            pinButton.title = state.quickActionIds.has(entry.id) ? t('ui.unpin', 'Unpin') : t('ui.pin', 'Pin');
            pinButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                toggleQuickAction(entry.id);
                pinButton.textContent = state.quickActionIds.has(entry.id) ? '★' : '+';
                pinButton.title = state.quickActionIds.has(entry.id) ? t('ui.unpin', 'Unpin') : t('ui.pin', 'Pin');
            });
            card.appendChild(pinButton);
        }

        return card;
    }

    function renderQuickActions() {
        quickActionsGrid.innerHTML = '';

        const selectedEntries = Array.from(state.quickActionIds)
            .map(id => state.entries.find(entry => entry.id === id))
            .filter(Boolean);

        const fallback = state.entries.slice(0, 4);
        const entriesToRender = selectedEntries.length > 0 ? selectedEntries : fallback;

        entriesToRender.forEach(entry => {
            const card = createSoundCard(entry, true);
            quickActionsGrid.appendChild(card);
        });
    }

    function toggleQuickAction(buttonId) {
        if (state.quickActionIds.has(buttonId)) {
            state.quickActionIds.delete(buttonId);
        } else {
            state.quickActionIds.add(buttonId);
        }

        localStorage.setItem('quick-actions', JSON.stringify(Array.from(state.quickActionIds)));
        renderQuickActions();
    }

    function toggleEntry(entry) {
        if (state.currentEntry === entry && isPlaying(entry.audio)) {
            stopEntry(entry);
            return;
        }

        playEntryExclusive(entry);
    }

    function playEntryExclusive(entry) {
        stopAllAudio(false);
        entry.audio.currentTime = 0;
        entry.audio.volume = state.masterVolume;

        entry.audio.play()
            .then(() => {
                state.currentEntry = entry;
                setEntryPlayingState(entry, true);
                updateNowPlaying();
            })
            .catch(error => console.error('Error playing audio:', error));
    }

    function stopEntry(entry) {
        entry.audio.pause();
        entry.audio.currentTime = 0;
        setEntryPlayingState(entry, false);

        if (state.currentEntry === entry) {
            state.currentEntry = null;
        }
    }

    function stopAllAudio(updateLabel = true) {
        state.entries.forEach(stopEntry);
        state.currentEntry = null;
        if (updateLabel) {
            updateNowPlaying();
        }
    }

    function updateNowPlaying() {
        const label = state.currentEntry ? getButtonLabel(state.currentEntry) : t('ui.none', '-');
        const nowPlaying = document.getElementById('now-playing');
        if (nowPlaying) {
            nowPlaying.textContent = `${t('ui.nowPlaying', 'Now Playing')}: ${label}`;
        }
    }

    function setEntryPlayingState(entry, isPlayingNow) {
        entry.buttons.forEach(button => {
            button.classList.toggle('botao-tocando', isPlayingNow);
        });
    }

    function updateQuickEditingState() {
        document.body.classList.toggle('quick-editing', state.quickEditing);
    }

    function updateQuickMinimizedState() {
        quickActionsSection.classList.toggle('is-collapsed', state.quickMinimized);
    }

    function updateStaticTexts() {
        setText('title', t('ui.title', 'BNI Soundboard'));
        setText('subtitle', t('ui.subtitle', 'Live audio operation for BNI meetings'));
        setText('language-label', t('ui.language', 'Language'));
        setText('stop-all', t('ui.stopAll', 'Stop All'));
        setText('volume-label', t('ui.volume', 'Volume'));
        setText('quick-title', t('ui.quickActions', 'Quick Actions'));
        setText('quick-help', t('ui.quickHelp', 'Shortcuts for your most used effects during the meeting.'));

        if (quickEditButton) {
            quickEditButton.textContent = state.quickEditing ? t('ui.quickDone', 'Done') : t('ui.quickEdit', 'Edit');
        }

        if (quickToggleButton) {
            quickToggleButton.textContent = state.quickMinimized ? t('ui.quickExpand', 'Expand') : t('ui.quickMinimize', 'Minimize');
        }

        document.documentElement.lang = state.locale === 'ptbr' ? 'pt-BR' : 'en';
        updateNowPlaying();
    }

    function getCategoryLabel(categoria) {
        return t(`categories.${categoria.id}`, categoria.id);
    }

    function getButtonLabel(entryOrConfig) {
        return t(`buttons.${entryOrConfig.id}`, entryOrConfig.id);
    }

    function isMajorCue(buttonId) {
        return ['drum_roll', 'kaching_deal', 'victory_theme'].includes(buttonId);
    }

    function isPlaying(audio) {
        return !audio.paused && audio.currentTime > 0;
    }

    function setText(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = value;
    }

    function t(path, fallback) {
        const localeData = state.locales[state.locale] || state.locales.enus || {};
        const value = path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), localeData);
        return value !== undefined ? value : fallback;
    }

    function loadQuickActions() {
        const defaultIds = ['drum_roll', 'kaching_deal', 'victory_theme', 'applause'];
        const raw = localStorage.getItem('quick-actions');
        if (!raw) return defaultIds;

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
            return defaultIds;
        } catch {
            return defaultIds;
        }
    }
});
