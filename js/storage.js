const STORAGE_KEYS = {
    locale: 'soundboard-locale',
    quickActions: 'quick-actions',
    quickMinimized: 'quick-minimized',
    dockPosition: 'dock-position'
};

export const DEFAULT_QUICK_ACTION_IDS = [
    'applause',
    'tada_entry',
    'drum_roll_long',
    'kaching_deal',
    'record_scratch',
    'buzzer_error',
    'windows_error',
    'faustao_wrong',
    'heartbeat',
    'suspense_sudden',
    'psycho_violin_screech'
];

const LEGACY_DEFAULT_QUICK_ACTION_IDS = ['drum_roll', 'kaching_deal', 'victory_theme', 'applause'];

export function loadLocale() {
    return localStorage.getItem(STORAGE_KEYS.locale) || 'enus';
}

export function saveLocale(locale) {
    localStorage.setItem(STORAGE_KEYS.locale, locale);
}

export function loadQuickActions() {
    const raw = localStorage.getItem(STORAGE_KEYS.quickActions);
    if (!raw) return DEFAULT_QUICK_ACTION_IDS;

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            if (matchesIds(parsed, LEGACY_DEFAULT_QUICK_ACTION_IDS)) {
                saveQuickActions(DEFAULT_QUICK_ACTION_IDS);
                return DEFAULT_QUICK_ACTION_IDS;
            }

            return parsed;
        }
        return DEFAULT_QUICK_ACTION_IDS;
    } catch {
        return DEFAULT_QUICK_ACTION_IDS;
    }
}

function matchesIds(ids, expectedIds) {
    return ids.length === expectedIds.length && ids.every((id, index) => id === expectedIds[index]);
}

export function saveQuickActions(ids) {
    localStorage.setItem(STORAGE_KEYS.quickActions, JSON.stringify(Array.from(ids)));
}

export function loadQuickMinimized() {
    return localStorage.getItem(STORAGE_KEYS.quickMinimized) === '1';
}

export function saveQuickMinimized(isMinimized) {
    localStorage.setItem(STORAGE_KEYS.quickMinimized, isMinimized ? '1' : '0');
}

export function loadDockPosition() {
    const raw = localStorage.getItem(STORAGE_KEYS.dockPosition);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            Number.isFinite(parsed.x) &&
            Number.isFinite(parsed.y)
        ) {
            return {
                x: parsed.x,
                y: parsed.y,
                layoutMode: typeof parsed.layoutMode === 'string' ? parsed.layoutMode : null
            };
        }
        return null;
    } catch {
        return null;
    }
}

export function saveDockPosition(position) {
    localStorage.setItem(STORAGE_KEYS.dockPosition, JSON.stringify(position));
}

export function clearDockPosition() {
    localStorage.removeItem(STORAGE_KEYS.dockPosition);
}
