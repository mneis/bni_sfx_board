import { loadDockPosition, loadLocale, loadQuickActions, loadQuickMinimized } from './storage.js?v=2026.07.02.1';

export function createInitialState({ masterVolume }) {
    return {
        config: null,
        entries: [],
        currentEntry: null,
        locales: {},
        locale: loadLocale(),
        masterVolume,
        quickActionIds: new Set(loadQuickActions()),
        quickEditing: false,
        quickMinimized: loadQuickMinimized(),
        dockPosition: loadDockPosition(),
        drag: {
            active: false,
            pointerId: null,
            offsetX: 0,
            offsetY: 0,
            width: null,
            startX: 0,
            startY: 0,
            moved: false
        },
        touchGuard: {
            pointerId: null,
            startX: 0,
            startY: 0,
            suppressClicksUntil: 0
        },
        dockTapLastAt: 0
    };
}
