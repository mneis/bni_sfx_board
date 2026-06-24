import { expect, test } from '@playwright/test';

test('keyboard shortcuts trigger quick actions and diagnostics', async ({ page }) => {
  await openBoard(page);

  await expect(page.locator('#quick-actions-grid .botao-som').first()).toBeVisible();
  await expect(page.locator('#now-playing')).toContainText('Now Playing: -');

  await page.keyboard.press('q');
  await expect(page.locator('#now-playing')).not.toContainText('Now Playing: -');

  const firstShortcutEvent = await findDebugEvent(page, {
    status: 'triggered',
    shortcutId: 'quick:q'
  });
  expect(firstShortcutEvent.entryId).toBeTruthy();

  await page.keyboard.down('q');
  await page.waitForTimeout(40);
  await page.keyboard.down('q');
  await page.keyboard.up('q');

  const throttledEvent = await findDebugEvent(page, {
    status: 'throttled',
    shortcutId: 'quick:q'
  });
  expect(throttledEvent.repeat).toBe(true);

  await page.keyboard.press('Space');
  await expect(page.locator('#now-playing')).toContainText('Now Playing: -');

  const stopAllEvent = await findDebugEvent(page, {
    status: 'triggered',
    shortcutId: 'stop-all'
  });
  expect(stopAllEvent.code).toBe('Space');
});

test('touch/click controls release focus for global shortcuts', async ({ page }) => {
  await openBoard(page);

  await page.locator('#quick-actions-grid .botao-som').first().click();
  await expect(page.locator('#now-playing')).not.toContainText('Now Playing: -');

  await page.waitForFunction(() => document.activeElement === document.body);
  await page.keyboard.press('Space');
  await expect(page.locator('#now-playing')).toContainText('Now Playing: -');
});

test('shortcut badges appear on quick actions and matching full-board buttons', async ({ page }) => {
  await openBoard(page);

  const quickTada = page.locator('#quick-actions-grid .botao-som').filter({ hasText: 'Tada (Entrance)' });
  const fullTada = page.locator('#soundboard-container .botao-som').filter({ hasText: 'Tada (Entrance)' });

  await expect(quickTada.locator('.shortcut-badge')).toHaveText('w');
  await expect(fullTada.locator('.shortcut-badge')).toHaveText('w');

  await page.evaluate(() => {
    localStorage.setItem('quick-actions', JSON.stringify([
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
      'psycho_violin_screech',
      'whoosh_transition'
    ]));
  });
  await page.reload();

  const whooshItem = page.locator('#soundboard-container .sound-item').filter({ hasText: 'Whoosh (Transition)' });
  const quickWhoosh = page.locator('#quick-actions-grid .botao-som').filter({ hasText: 'Whoosh (Transition)' });
  await expect(quickWhoosh.locator('.shortcut-badge')).toHaveText('s');
  await expect(whooshItem.locator('.botao-som .shortcut-badge')).toHaveText('s');
});

async function openBoard(page) {
  await page.goto('/?debug=keyboard');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function findDebugEvent(page, expected) {
  await expect.poll(async () => {
    return page.evaluate(({ status, shortcutId }) => {
      return window.__bniKeyboardDebug.events.some(event => {
        return event.status === status && event.shortcutId === shortcutId;
      });
    }, expected);
  }).toBe(true);

  return page.evaluate(({ status, shortcutId }) => {
    return window.__bniKeyboardDebug.events.find(event => {
      return event.status === status && event.shortcutId === shortcutId;
    });
  }, expected);
}
