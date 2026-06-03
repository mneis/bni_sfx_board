export function createFullscreenController({ button, t }) {
    const state = {
        focusMode: false
    };

    const isRealFullscreen = () => Boolean(document.fullscreenElement);
    const isFullscreenApiSupported = () => Boolean(document.documentElement.requestFullscreen && document.exitFullscreen);

    const sync = () => {
        const active = isRealFullscreen() || state.focusMode;
        document.body.classList.toggle('operator-focus', active);

if (button) {
            const label = active
                ? t('ui.exitFullscreen', 'Exit fullscreen')
                : t('ui.fullscreen', 'Fullscreen');
            button.textContent = '⛶';
            button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', String(active));
            button.title = label;
        }
    };

    const enableFallbackFocus = () => {
        state.focusMode = true;
        sync();
    };

    const disableFallbackFocus = () => {
        state.focusMode = false;
        sync();
    };

    const toggle = () => {
        if (isRealFullscreen()) {
            document.exitFullscreen()
                .catch(() => disableFallbackFocus());
            return;
        }

        if (state.focusMode) {
            disableFallbackFocus();
            return;
        }

        if (isFullscreenApiSupported()) {
            document.documentElement.requestFullscreen()
                .catch(() => enableFallbackFocus());
            return;
        }

        enableFallbackFocus();
    };

    document.addEventListener('fullscreenchange', () => {
        if (isRealFullscreen()) {
            state.focusMode = false;
        }
        sync();
    });

    if (button) {
        button.addEventListener('click', toggle);
    }

    sync();

    return {
        toggle,
        sync
    };
}
