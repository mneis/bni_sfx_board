import { expect, test } from '@playwright/test';

test('keyboard shortcuts trigger quick actions and diagnostics', async ({ page }) => {
  await page.goto('/?debug=keyboard');

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
  await page.goto('/?debug=keyboard');

  await page.locator('#quick-actions-grid .botao-som').first().click();
  await expect(page.locator('#now-playing')).not.toContainText('Now Playing: -');

  await page.waitForFunction(() => document.activeElement === document.body);
  await page.keyboard.press('Space');
  await expect(page.locator('#now-playing')).toContainText('Now Playing: -');
});

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
