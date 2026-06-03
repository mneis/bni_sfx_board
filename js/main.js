import { applyMasterVolume, playEntry, stopAllAudio } from './audio-engine.js?v=2026.06.03.1';
import { loadAppResources } from './config-loader.js?v=2026.06.03.1';
import { createFullscreenController } from './fullscreen.js?v=2026.06.03.1';
import { t as translate } from './i18n.js?v=2026.06.03.1';
import { bindKeyboardShortcuts } from './keyboard-shortcuts.js?v=2026.06.03.1';
import { getQuickActionEntries, renderQuickActions, toggleQuickAction } from './quick-actions.js?v=2026.06.03.1';
import { createSoundCard as buildSoundCard, renderSoundboard } from './soundboard-renderer.js?v=2026.06.03.1';
import { createInitialState } from './state.js?v=2026.06.03.1';
import { clearDockPosition, saveDockPosition, saveLocale, saveQuickMinimized } from './storage.js?v=2026.06.03.1';

document.addEventListener('DOMContentLoaded', () => {
    const dom = {
        container: document.getElementById('soundboard-container'),
        controlDock: document.querySelector('.control-dock'),
        dockHandle: document.getElementById('dock-handle'),
        quickActionsSection: document.getElementById('quick-actions'),
        quickActionsGrid: document.getElementById('quick-actions-grid'),
        stopAllButton: document.getElementById('stop-all'),
        volumeSlider: document.getElementById('volume-master'),
        volumeSliderShell: document.querySelector('.volume-slider-shell'),
        volumeValue: document.getElementById('volume-value'),
        volumeDownButton: document.getElementById('volume-down'),
        volumeUpButton: document.getElementById('volume-up'),
        fullscreenButton: document.getElementById('fullscreen-toggle'),
        localeSelector: document.getElementById('locale-selector'),
        quickEditButton: document.getElementById('quick-edit'),
        quickToggleButton: document.getElementById('quick-toggle')
    };

    const state = createInitialState({
        masterVolume: dom.volumeSlider ? Number(dom.volumeSlider.value) : 1
    });
    let fullscreenController = null;

    if (dom.localeSelector) {
        dom.localeSelector.value = state.locale;
    }

    loadAppResources()
        .then(({ config, locales }) => {
            state.config = config;
            state.locales = locales;
            renderEverything();
            bindControls();
        })
        .catch(error => console.error('Failed to load app resources:', error));

    function bindControls() {
        applyMasterVolume(state, state.masterVolume, dom);
        fullscreenController = createFullscreenController({
            button: dom.fullscreenButton,
            t
        });

        bindKeyboardShortcuts({
            getQuickActionEntries: () => getQuickActionEntries(state),
            onTriggerEntry: toggleEntry,
            onStopAll: () => stopAllAudio(state, { updateNowPlaying }),
            onToggleFullscreen: () => fullscreenController.toggle()
        });

        setupDockDrag();
        setupVolumeSliderTouch();

        if (dom.stopAllButton) {
            dom.stopAllButton.addEventListener('click', () => {
                stopAllAudio(state, { updateNowPlaying });
            });
        }

        if (dom.volumeSlider) {
            dom.volumeSlider.addEventListener('input', () => {
                applyMasterVolume(state, Number(dom.volumeSlider.value), dom);
            });
        }

        if (dom.volumeDownButton) {
            dom.volumeDownButton.addEventListener('click', () => {
                const next = Math.max(0, state.masterVolume - 0.1);
                applyMasterVolume(state, next, dom);
            });
        }

        if (dom.volumeUpButton) {
            dom.volumeUpButton.addEventListener('click', () => {
                const next = Math.min(1, state.masterVolume + 0.1);
                applyMasterVolume(state, next, dom);
            });
        }

        if (dom.localeSelector) {
            dom.localeSelector.addEventListener('change', () => {
                state.locale = dom.localeSelector.value;
                saveLocale(state.locale);
                renderEverything();
            });
        }

        if (dom.quickEditButton) {
            dom.quickEditButton.addEventListener('click', () => {
                state.quickEditing = !state.quickEditing;
                updateQuickEditingState();
                updateStaticTexts();
            });
        }

        if (dom.quickToggleButton) {
            dom.quickToggleButton.addEventListener('click', () => {
                state.quickMinimized = !state.quickMinimized;
                saveQuickMinimized(state.quickMinimized);
                updateQuickMinimizedState();
                updateStaticTexts();
            });
        }
    }

    function setupDockDrag() {
        if (!dom.controlDock || !dom.dockHandle) return;

        applyDockPosition();

        dom.dockHandle.addEventListener('pointerdown', event => {
            event.preventDefault();
            const rect = dom.controlDock.getBoundingClientRect();
            state.drag.active = true;
            state.drag.pointerId = event.pointerId;
            state.drag.offsetX = event.clientX - rect.left;
            state.drag.offsetY = event.clientY - rect.top;
            state.drag.width = Math.round(rect.width);

            dom.controlDock.classList.add('is-floating', 'is-dragging');
            dom.controlDock.style.left = `${Math.round(rect.left)}px`;
            dom.controlDock.style.top = `${Math.round(rect.top)}px`;
            dom.controlDock.style.width = `${state.drag.width}px`;
            dom.controlDock.style.right = 'auto';
            dom.controlDock.style.bottom = 'auto';
            state.dockPosition = { x: Math.round(rect.left), y: Math.round(rect.top) };
            dom.dockHandle.setPointerCapture(event.pointerId);
        });

        dom.dockHandle.addEventListener('pointermove', event => {
            if (!state.drag.active || state.drag.pointerId !== event.pointerId) return;
            event.preventDefault();

            state.dockPosition = clampDockPosition(
                event.clientX - state.drag.offsetX,
                event.clientY - state.drag.offsetY
            );

            applyDockPosition();
        });

        const finishDrag = event => {
            if (!state.drag.active || state.drag.pointerId !== event.pointerId) return;
            state.drag.active = false;
            state.drag.pointerId = null;
            dom.controlDock.classList.remove('is-dragging');
            saveDockPosition(state.dockPosition);
        };

        dom.dockHandle.addEventListener('pointerup', finishDrag);
        dom.dockHandle.addEventListener('pointercancel', finishDrag);

        dom.dockHandle.addEventListener('click', () => {
            const now = Date.now();
            const isDoubleTap = now - state.dockTapLastAt <= 350;
            state.dockTapLastAt = now;
            if (isDoubleTap) {
                resetDockPosition();
            }
        });

        dom.dockHandle.addEventListener('dblclick', () => {
            resetDockPosition();
        });

        window.addEventListener('resize', () => {
            if (!state.dockPosition) return;
            state.dockPosition = clampDockPosition(state.dockPosition.x, state.dockPosition.y);
            applyDockPosition();
            saveDockPosition(state.dockPosition);
        });
    }

    function setupVolumeSliderTouch() {
        if (!dom.volumeSlider || !dom.volumeSliderShell) return;
        let draggingPointerId = null;

        const syncVolumeFromPointer = clientX => {
            const rect = dom.volumeSlider.getBoundingClientRect();
            if (!rect.width) return;

            const relative = (clientX - rect.left) / rect.width;
            const clamped = Math.max(0, Math.min(1, relative));
            const stepped = Math.round(clamped / 0.05) * 0.05;
            applyMasterVolume(state, stepped, dom);
        };

        dom.volumeSliderShell.addEventListener('pointerdown', event => {
            event.preventDefault();
            draggingPointerId = event.pointerId;
            dom.volumeSliderShell.setPointerCapture(event.pointerId);
            syncVolumeFromPointer(event.clientX);
        });

        dom.volumeSliderShell.addEventListener('pointermove', event => {
            if (draggingPointerId !== event.pointerId) return;
            event.preventDefault();
            syncVolumeFromPointer(event.clientX);
        });

        const stopDragging = event => {
            if (draggingPointerId !== event.pointerId) return;
            draggingPointerId = null;
            if (dom.volumeSliderShell.hasPointerCapture(event.pointerId)) {
                dom.volumeSliderShell.releasePointerCapture(event.pointerId);
            }
        };

        dom.volumeSliderShell.addEventListener('pointerup', stopDragging);
        dom.volumeSliderShell.addEventListener('pointercancel', stopDragging);
    }

    function resetDockPosition() {
        clearDockPosition();
        state.dockPosition = null;
        state.drag.active = false;
        state.drag.pointerId = null;
        state.drag.width = null;
        dom.controlDock.classList.remove('is-floating', 'is-dragging');
        dom.controlDock.style.removeProperty('left');
        dom.controlDock.style.removeProperty('top');
        dom.controlDock.style.removeProperty('width');
        dom.controlDock.style.removeProperty('right');
        dom.controlDock.style.removeProperty('bottom');
    }

    function applyDockPosition() {
        if (!dom.controlDock || !state.dockPosition) return;
        const next = clampDockPosition(state.dockPosition.x, state.dockPosition.y);
        state.dockPosition = next;
        dom.controlDock.classList.add('is-floating');
        dom.controlDock.style.left = `${next.x}px`;
        dom.controlDock.style.top = `${next.y}px`;
        dom.controlDock.style.right = 'auto';
        dom.controlDock.style.bottom = 'auto';
    }

    function clampDockPosition(x, y) {
        const margin = 8;
        const dockWidth = dom.controlDock ? dom.controlDock.offsetWidth : 320;
        const dockHeight = dom.controlDock ? dom.controlDock.offsetHeight : 180;
        const maxX = Math.max(margin, window.innerWidth - dockWidth - margin);
        const maxY = Math.max(margin, window.innerHeight - dockHeight - margin);
        return {
            x: Math.min(Math.max(margin, Math.round(x)), maxX),
            y: Math.min(Math.max(margin, Math.round(y)), maxY)
        };
    }

    function renderEverything() {
        stopAllAudio(state, { updateNowPlaying }, false);
        renderSoundboard({
            container: dom.container,
            state,
            getCategoryLabel,
            createSoundCard
        });
        renderQuickActionsGrid();
        updateQuickEditingState();
        updateQuickMinimizedState();
        updateStaticTexts();
        updateNowPlaying();
    }

    function createSoundCard(entry, isQuickAction, quickActionIndex = null) {
        return buildSoundCard({
            entry,
            isQuickAction,
            quickActionIndex,
            state,
            getButtonLabel,
            isMajorCue,
            onToggleEntry: toggleEntry,
            onToggleQuickAction: buttonId => toggleQuickAction({
                state,
                buttonId,
                renderQuickActions: renderQuickActionsGrid
            }),
            t
        });
    }

    function renderQuickActionsGrid() {
        renderQuickActions({
            quickActionsGrid: dom.quickActionsGrid,
            state,
            createSoundCard
        });
    }

    function toggleEntry(entry) {
        playEntry(state, entry, { updateNowPlaying });
    }

    function updateNowPlaying() {
        const label = state.currentEntry ? getButtonLabel(state.currentEntry) : t('ui.none', '-');
        const nowPlaying = document.getElementById('now-playing');
        if (nowPlaying) {
            nowPlaying.textContent = `${t('ui.nowPlaying', 'Now Playing')}: ${label}`;
        }
    }

    function updateQuickEditingState() {
        document.body.classList.toggle('quick-editing', state.quickEditing);
    }

    function updateQuickMinimizedState() {
        dom.quickActionsSection.classList.toggle('is-collapsed', state.quickMinimized);
    }

    function updateStaticTexts() {
        setText('title', t('ui.title', 'BNI Soundboard'));
        setText('subtitle', t('ui.subtitle', 'Live audio operation for BNI meetings'));
        setText('language-label', t('ui.language', 'Language'));
        setText('stop-all', t('ui.stopAll', 'Stop All'));
        setText('volume-label', t('ui.volume', 'Volume'));
        setText('quick-title', t('ui.quickActions', 'Quick Actions'));
        setText('quick-help', t('ui.quickHelp', 'Shortcuts for your most used effects during the meeting.'));

        if (dom.quickEditButton) {
            dom.quickEditButton.textContent = state.quickEditing ? t('ui.quickDone', 'Done') : t('ui.quickEdit', 'Edit');
        }

        if (dom.quickToggleButton) {
            dom.quickToggleButton.textContent = state.quickMinimized ? t('ui.quickExpand', 'Expand') : t('ui.quickMinimize', 'Minimize');
        }

        document.documentElement.lang = state.locale === 'ptbr' ? 'pt-BR' : 'en';
        if (fullscreenController) {
            fullscreenController.sync();
        }
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

    function setText(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = value;
    }

    function t(path, fallback) {
        return translate(state.locales, state.locale, path, fallback);
    }
});
