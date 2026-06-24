import { DEFAULT_QUICK_ACTION_IDS, saveQuickActions } from './storage.js?v=2026.06.24.3';

export function renderQuickActions({ quickActionsGrid, state, createSoundCard }) {
    quickActionsGrid.innerHTML = '';

    getQuickActionEntries(state).forEach((entry, index) => {
        quickActionsGrid.appendChild(createSoundCard(entry, true, index));
    });
}

export function getQuickActionEntries(state) {
    const selectedEntries = Array.from(state.quickActionIds)
        .map(id => state.entries.find(entry => entry.id === id))
        .filter(Boolean);

    const fallback = DEFAULT_QUICK_ACTION_IDS
        .map(id => state.entries.find(entry => entry.id === id))
        .filter(Boolean);

    return selectedEntries.length > 0 ? selectedEntries : fallback;
}

export function toggleQuickAction({ state, buttonId, renderQuickActions }) {
    if (state.quickActionIds.has(buttonId)) {
        state.quickActionIds.delete(buttonId);
    } else {
        state.quickActionIds.add(buttonId);
    }

    saveQuickActions(state.quickActionIds);
    renderQuickActions();
}

export function resetQuickActions({ state, renderQuickActions }) {
    state.quickActionIds = new Set(DEFAULT_QUICK_ACTION_IDS);
    saveQuickActions(state.quickActionIds);
    renderQuickActions();
}
