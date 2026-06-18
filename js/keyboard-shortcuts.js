const QUICK_ACTION_KEYS = [
    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
    'a', 's', 'd', 'g', 'h', 'j', 'k', 'l',
    'z', 'x', 'c', 'v', 'b', 'n', 'm'
];

const REPEAT_THROTTLE_MS = 140;

export function bindKeyboardShortcuts({
    getQuickActionEntries,
    onTriggerEntry,
    onStopAll,
    onToggleFullscreen,
    onShortcutEvent
}) {
    const lastTriggerByShortcut = new Map();

    window.addEventListener('keydown', event => {
        if (shouldIgnoreShortcut(event)) {
            reportShortcutEvent(onShortcutEvent, event, 'ignored');
            return;
        }

        const normalizedKey = normalizeKey(event.key);
        const quickIndex = QUICK_ACTION_KEYS.indexOf(normalizedKey);
        if (quickIndex >= 0) {
            const entry = getQuickActionEntries()[quickIndex];
            const shortcutId = `quick:${normalizedKey}`;

            event.preventDefault();
            if (!entry) {
                reportShortcutEvent(onShortcutEvent, event, 'missing-entry', { shortcutId });
                return;
            }

            if (shouldThrottleRepeat(event, shortcutId, lastTriggerByShortcut)) {
                reportShortcutEvent(onShortcutEvent, event, 'throttled', { shortcutId, entryId: entry.id });
                return;
            }

            reportShortcutEvent(onShortcutEvent, event, 'triggered', { shortcutId, entryId: entry.id });
            onTriggerEntry(entry, { source: 'keyboard', shortcutKey: normalizedKey });
            return;
        }

        if (event.key === ' ' || event.code === 'Space') {
            const shortcutId = 'stop-all';
            event.preventDefault();
            if (shouldThrottleRepeat(event, shortcutId, lastTriggerByShortcut)) {
                reportShortcutEvent(onShortcutEvent, event, 'throttled', { shortcutId });
                return;
            }

            reportShortcutEvent(onShortcutEvent, event, 'triggered', { shortcutId });
            onStopAll();
            return;
        }

        if (normalizedKey === 'f') {
            const shortcutId = 'fullscreen';
            event.preventDefault();
            if (shouldThrottleRepeat(event, shortcutId, lastTriggerByShortcut)) {
                reportShortcutEvent(onShortcutEvent, event, 'throttled', { shortcutId });
                return;
            }

            reportShortcutEvent(onShortcutEvent, event, 'triggered', { shortcutId });
            onToggleFullscreen();
        }
    }, { capture: true });

    window.addEventListener('keyup', event => {
        const normalizedKey = normalizeKey(event.key);
        lastTriggerByShortcut.delete(`quick:${normalizedKey}`);

        if (event.key === ' ' || event.code === 'Space') {
            lastTriggerByShortcut.delete('stop-all');
        }

        if (normalizedKey === 'f') {
            lastTriggerByShortcut.delete('fullscreen');
        }
    }, { capture: true });
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

function shouldThrottleRepeat(event, shortcutId, lastTriggerByShortcut) {
    const now = performance.now();
    const lastTriggeredAt = lastTriggerByShortcut.get(shortcutId) || 0;

    if (event.repeat && now - lastTriggeredAt < REPEAT_THROTTLE_MS) {
        return true;
    }

    lastTriggerByShortcut.set(shortcutId, now);
    return false;
}

function normalizeKey(key) {
    return String(key || '').toLowerCase();
}

function reportShortcutEvent(onShortcutEvent, event, status, extra = {}) {
    if (!onShortcutEvent) return;

    onShortcutEvent({
        status,
        key: event.key,
        code: event.code,
        repeat: event.repeat,
        target: describeElement(event.target),
        activeElement: describeElement(document.activeElement),
        ...extra
    });
}

function describeElement(element) {
    if (!(element instanceof Element)) return '';

    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const className = typeof element.className === 'string' && element.className.trim()
        ? `.${element.className.trim().split(/\s+/).join('.')}`
        : '';

    return `${tag}${id}${className}`;
}
