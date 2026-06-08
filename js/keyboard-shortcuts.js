const QUICK_ACTION_KEYS = [
    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
    'a', 's', 'd', 'g', 'h', 'j', 'k', 'l',
    'z', 'x', 'c', 'v', 'b', 'n', 'm'
];

export function bindKeyboardShortcuts({ getQuickActionEntries, onTriggerEntry, onStopAll, onToggleFullscreen }) {
    document.addEventListener('keydown', event => {
        if (shouldIgnoreShortcut(event)) return;
        if (event.repeat) return;

        const quickIndex = QUICK_ACTION_KEYS.indexOf(event.key.toLowerCase());
        if (quickIndex >= 0) {
            const entry = getQuickActionEntries()[quickIndex];
            if (!entry) return;

            event.preventDefault();
            onTriggerEntry(entry);
            return;
        }

        if (event.key === ' ' || event.code === 'Space') {
            event.preventDefault();
            onStopAll();
            return;
        }

        if (event.key.toLowerCase() === 'f') {
            event.preventDefault();
            onToggleFullscreen();
        }
    });
}

export function getShortcutKeyForQuickAction(index) {
    return QUICK_ACTION_KEYS[index] || null;
}

function shouldIgnoreShortcut(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return true;

    const target = event.target;
    if (!target) return false;

    const tagName = target.tagName ? target.tagName.toLowerCase() : '';
    if (tagName === 'input') {
        const type = target.getAttribute('type') || 'text';
        return type.toLowerCase() !== 'range';
    }

    return target.isContentEditable
        || tagName === 'select'
        || tagName === 'textarea';
}
