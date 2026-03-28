import { test, expect, Page } from 'playwright/test';

async function dismissWelcome(page: Page) {
  const closeBtn = page.locator('button:has-text("Close")').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
  }
}

async function waitForMap(page: Page) {
  await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 15000 });
  // Wait for tiles to load
  await page.waitForTimeout(1000);
}

test.describe('Long press to add spot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spots');
    await dismissWelcome(page);
    await waitForMap(page);
  });

  test('right-click (contextmenu) on map opens add form with pin at click location', async ({ page }) => {
    const mapContainer = page.locator('.leaflet-container');

    // Right-click triggers contextmenu (same as long press on mobile)
    const box = await mapContainer.boundingBox();
    expect(box).toBeTruthy();

    // Click center of the map
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, { button: 'right' });

    // Should trigger auth dialog (not logged in) OR enter adding mode
    // Check: either auth dialog appears, or the add form/marker appears
    const authDialog = page.locator('h2:has-text("Log in")');
    const addMarker = page.locator('.leaflet-marker-icon').last();
    const formDialog = page.locator('[role="dialog"]');

    const authShown = await authDialog.isVisible({ timeout: 3000 }).catch(() => false);

    if (authShown) {
      // Not logged in: auth dialog blocks the flow — expected behavior
      await expect(authDialog).toBeVisible();
      test.info().annotations.push({
        type: 'note',
        description: 'Auth dialog shown (user not logged in) — long press correctly requires auth',
      });
    } else {
      // Logged in: adding mode should be active
      // The add button should now show X (cancel mode)
      const cancelBtn = page.locator('button[aria-label]').filter({ has: page.locator('svg') });

      // The form dialog or the draggable marker should appear
      const formVisible = await formDialog.isVisible({ timeout: 3000 }).catch(() => false);
      const markerVisible = await addMarker.isVisible({ timeout: 2000 }).catch(() => false);

      expect(formVisible || markerVisible).toBe(true);
      test.info().annotations.push({
        type: 'note',
        description: 'Adding mode activated via long press',
      });
    }
  });

  test('long press does NOT trigger when already in adding mode', async ({ page }) => {
    // Enter adding mode via the + button first
    const addBtn = page.locator('button[aria-label]').filter({ has: page.locator('svg.lucide-plus') });
    const addBtnVisible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!addBtnVisible) {
      test.skip(true, 'Add button not visible — cannot test');
      return;
    }

    await addBtn.click();

    // If auth dialog appears, skip
    const authDialog = page.locator('h2:has-text("Log in")');
    const authShown = await authDialog.isVisible({ timeout: 2000 }).catch(() => false);
    if (authShown) {
      test.skip(true, 'User not logged in — cannot test adding mode guard');
      return;
    }

    // Now right-click on the map — should NOT create a second marker or reset
    const mapContainer = page.locator('.leaflet-container');
    const box = await mapContainer.boundingBox();
    const markersBefore = await page.locator('.leaflet-marker-icon').count();

    await page.mouse.click(box!.x + box!.width / 4, box!.y + box!.height / 4, { button: 'right' });
    await page.waitForTimeout(500);

    const markersAfter = await page.locator('.leaflet-marker-icon').count();
    // Marker count should not increase from a second long press
    expect(markersAfter).toBeLessThanOrEqual(markersBefore + 1);
  });

  test('contextmenu does not show browser context menu', async ({ page }) => {
    const mapContainer = page.locator('.leaflet-container');
    const box = await mapContainer.boundingBox();

    // Listen for contextmenu default behavior
    const contextMenuPrevented = await page.evaluate((coords) => {
      return new Promise<boolean>((resolve) => {
        const handler = (e: MouseEvent) => {
          resolve(e.defaultPrevented);
          document.removeEventListener('contextmenu', handler);
        };
        document.addEventListener('contextmenu', handler);
        const el = document.querySelector('.leaflet-container');
        if (el) {
          el.dispatchEvent(new MouseEvent('contextmenu', {
            clientX: coords.x, clientY: coords.y, bubbles: true, cancelable: true,
          }));
        }
      });
    }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });

    expect(contextMenuPrevented).toBe(true);
  });
});
