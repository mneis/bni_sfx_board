import { createAudioEntry } from './audio-engine.js?v=2026.06.17.1';
import { getShortcutKeyForQuickAction } from './keyboard-shortcuts.js?v=2026.06.17.1';

export function renderSoundboard({ container, state, getCategoryLabel, createSoundCard }) {
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
            const entry = createAudioEntry({
                botaoConfig,
                categoria
            });

            state.entries.push(entry);
            grid.appendChild(createSoundCard(entry, false));
        });

        section.appendChild(grid);
        container.appendChild(section);
    });
}

export function createSoundCard({ entry, isQuickAction, quickActionIndex, state, getButtonLabel, isMajorCue, onToggleEntry, onToggleQuickAction, t }) {
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
    button.setAttribute('aria-label', getButtonLabel(entry));

    const label = document.createElement('span');
    label.className = 'sound-label';
    label.textContent = getButtonLabel(entry);
    button.appendChild(label);

    const shortcutKey = isQuickAction ? getShortcutKeyForQuickAction(quickActionIndex) : null;
    if (shortcutKey) {
        const badge = document.createElement('span');
        badge.className = 'shortcut-badge';
        badge.textContent = shortcutKey;
        button.appendChild(badge);
    }

    button.addEventListener('click', () => {
        onToggleEntry(entry);
    });

    entry.buttons.push(button);
    card.appendChild(button);

    if (!isQuickAction) {
        const pinButton = document.createElement('button');
        pinButton.className = 'pin-toggle';
        pinButton.type = 'button';
        updatePinButton(pinButton, state.quickActionIds.has(entry.id), t);
        pinButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            onToggleQuickAction(entry.id);
            updatePinButton(pinButton, state.quickActionIds.has(entry.id), t);
        });
        card.appendChild(pinButton);
    }

    return card;
}

function updatePinButton(button, isPinned, t) {
    button.textContent = isPinned ? '★' : '+';
    button.title = isPinned ? t('ui.unpin', 'Unpin') : t('ui.pin', 'Pin');
}
