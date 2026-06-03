import { saveQuickActions } from './storage.js';

export function renderQuickActions({ quickActionsGrid, state, createSoundCard }) {
    quickActionsGrid.innerHTML = '';

    const selectedEntries = Array.from(state.quickActionIds)
        .map(id => state.entries.find(entry => entry.id === id))
        .filter(Boolean);

    const fallback = state.entries.slice(0, 4);
    const entriesToRender = selectedEntries.length > 0 ? selectedEntries : fallback;

    entriesToRender.forEach(entry => {
        quickActionsGrid.appendChild(createSoundCard(entry, true));
    });
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
