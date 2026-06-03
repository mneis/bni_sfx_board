import { loadDockPosition, loadLocale, loadQuickActions, loadQuickMinimized } from './storage.js?v=2026.06.03.3';

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
            width: null
        },
        dockTapLastAt: 0
    };
}
