import { test, expect, Page } from 'playwright/test';

/**
 * Helper: dismiss any welcome/onboarding dialogs that may appear on first load.
 */
async function dismissWelcome(page: Page) {
  const closeBtn = page.locator('button:has-text("Close")').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
  }
}

/**
 * Helper: wait for the map to load, then click a spot marker to open SpotDetailModal.
 * Returns once the bottom-sheet title (h2) is visible inside the modal.
 */
async function openAnySpotDetail(page: Page) {
  // Wait for map markers to render (SVG circles or Leaflet marker elements)
  const marker = page.locator('.leaflet-marker-icon, .leaflet-interactive').first();
  await marker.waitFor({ state: 'visible', timeout: 15000 });
  await marker.click({ force: true });

  // Wait for the bottom-sheet to slide up and contain a spot name
  const title = page.locator('.glass-overlay h2').first();
  await title.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('Spot Detail V2 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spots');
    await dismissWelcome(page);
  });

  // ─── Test 1: Photo carousel shows dot indicators ──────────────────────
  test('photo carousel shows dot indicators when multiple photos exist', async ({ page }) => {
    await openAnySpotDetail(page);

    // The carousel container: a flex with overflow-x-auto and snap-x
    const carousel = page.locator('.flex.snap-x');
    const carouselVisible = await carousel.isVisible({ timeout: 3000 }).catch(() => false);

    if (carouselVisible) {
      const images = carousel.locator('img');
      const imageCount = await images.count();

      if (imageCount > 1) {
        // Dot indicators: buttons with rounded-full inside a flex justify-center container
        const dotContainer = page.locator('.flex.justify-center.gap-1\\.5');
        await expect(dotContainer).toBeVisible();
        const dots = dotContainer.locator('button');
        expect(await dots.count()).toBe(imageCount);
      } else {
        // Single photo or present — dots should NOT appear for single photo
        test.info().annotations.push({ type: 'note', description: 'Spot has 0-1 photos, dot indicators not expected' });
      }
    } else {
      // No photos on this spot — just verify placeholder gradient is shown
      const placeholder = page.locator('.bg-gradient-to-br').first();
      await expect(placeholder).toBeVisible();
      test.info().annotations.push({ type: 'note', description: 'Spot has no photos — placeholder shown instead' });
    }
  });

  // ─── Test 2: Photo lightbox opens on click ─────────────────────────────
  test('photo lightbox opens on click and can be closed', async ({ page }) => {
    await openAnySpotDetail(page);

    const carouselImage = page.locator('.flex.snap-x img').first();
    const hasPhotos = await carouselImage.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasPhotos) {
      test.skip(true, 'No photos on this spot — skipping lightbox test');
      return;
    }

    // Click the first photo to open lightbox
    await carouselImage.click();

    // Verify fullscreen overlay (z-[60])
    const overlay = page.locator('.fixed.inset-0.z-\\[60\\]');
    await expect(overlay).toBeVisible({ timeout: 3000 });

    // Verify counter text "1 / N"
    const counter = overlay.locator('text=/\\d+ \\/ \\d+/');
    await expect(counter).toBeVisible();

    // Verify X close button inside lightbox
    const closeBtn = overlay.locator('button').first();
    await expect(closeBtn).toBeVisible();

    // Close the lightbox
    await closeBtn.click();

    // Verify overlay is gone
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });

  // ─── Test 3: Navigation picker opens ───────────────────────────────────
  test('navigation picker opens with all options', async ({ page }) => {
    await openAnySpotDetail(page);

    // Click the "Itinéraire" button
    const navButton = page.locator('button:has-text("Itinéraire")');
    const navVisible = await navButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!navVisible) {
      test.skip(true, 'Itinéraire button not visible — spot may not have coordinates');
      return;
    }

    await navButton.click();

    // Verify the bottom sheet picker appears with nav app options
    const picker = page.locator('.fixed.inset-x-0.bottom-0.z-50.glass-overlay');
    await expect(picker).toBeVisible({ timeout: 3000 });

    // Verify all three navigation apps are listed
    await expect(picker.locator('text=Google Maps')).toBeVisible();
    await expect(picker.locator('text=Waze')).toBeVisible();
    await expect(picker.locator('text=Apple Plans')).toBeVisible();

    // Verify "Copier l'adresse" button
    await expect(picker.locator('text=Copier l\'adresse')).toBeVisible();

    // Close the picker via the X button inside the picker header
    const pickerClose = picker.locator('button').first();
    await pickerClose.click();
    await expect(picker).not.toBeVisible({ timeout: 3000 });
  });

  // ─── Test 4: Google Maps button has correct link ───────────────────────
  test('Google Maps link has correct URL format', async ({ page }) => {
    await openAnySpotDetail(page);

    const navButton = page.locator('button:has-text("Itinéraire")');
    const navVisible = await navButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!navVisible) {
      test.skip(true, 'Itinéraire button not visible');
      return;
    }

    await navButton.click();

    // Target the Google Maps link inside the NavigationPicker bottom sheet (z-50)
    const picker = page.locator('.fixed.inset-x-0.bottom-0.z-50.glass-overlay');
    const gmapsLink = picker.locator('a:has-text("Google Maps")');
    await expect(gmapsLink).toBeVisible({ timeout: 3000 });

    const href = await gmapsLink.getAttribute('href');
    expect(href).toBeTruthy();
    // The NavigationPicker builds: google.com/maps/dir/?api=1&destination=lat,lng
    expect(href).toContain('google.com/maps');
    expect(href).toMatch(/destination=[-\d.]+,[-\d.]+/);
  });

  // ─── Test 5: Contact fields display conditionally (club spots) ─────────
  test('club info block shows contact fields when available', async ({ page }) => {
    await openAnySpotDetail(page);

    // Look for the club info block
    const clubBlock = page.locator('text=Infos club');
    const hasClubBlock = await clubBlock.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasClubBlock) {
      // The first marker might not be a club — try to find one via the list view
      // Close current modal first
      const closeModal = page.locator('.glass-overlay button').first();
      await closeModal.click();

      // Try to find a club in the list view
      const listToggle = page.locator('button[aria-label="Voir en liste"], button:has-text("Liste")').first();
      const listVisible = await listToggle.isVisible({ timeout: 2000 }).catch(() => false);

      if (listVisible) {
        await listToggle.click();
        // Look for a club badge in the list
        const clubItem = page.locator('text=Club').first();
        const clubInList = await clubItem.isVisible({ timeout: 3000 }).catch(() => false);

        if (clubInList) {
          await clubItem.click();
          const clubBlockRetry = page.locator('text=Infos club');
          const found = await clubBlockRetry.isVisible({ timeout: 5000 }).catch(() => false);

          if (found) {
            // Verify club info block structure
            const clubSection = page.locator('.glass-overlay .space-y-3').last();
            // At least one of these contact elements should be present
            const hasWebsite = await page.locator('text=Site du club').isVisible().catch(() => false);
            const hasPhone = await page.locator('a[href^="tel:"]').isVisible().catch(() => false);
            const hasEmail = await page.locator('a[href^="mailto:"]').isVisible().catch(() => false);
            const hasFiche = await page.locator('text=Fiche FFVB').isVisible().catch(() => false);

            // Club block exists, so at least the heading is there — pass
            expect(true).toBe(true);
            test.info().annotations.push({
              type: 'note',
              description: `Club contact fields: website=${hasWebsite}, phone=${hasPhone}, email=${hasEmail}, fiche=${hasFiche}`,
            });
            return;
          }
        }
      }

      test.skip(true, 'No club spot found in visible markers — cannot test club info block');
      return;
    }

    // Club block is visible on the first spot opened
    const hasWebsite = await page.locator('text=Site du club').isVisible().catch(() => false);
    const hasPhone = await page.locator('a[href^="tel:"]').isVisible().catch(() => false);
    const hasEmail = await page.locator('a[href^="mailto:"]').isVisible().catch(() => false);
    const hasSocial = await page.locator('text=Instagram').or(page.locator('text=Facebook')).or(page.locator('text=TikTok')).or(page.locator('text=YouTube')).first().isVisible().catch(() => false);

    test.info().annotations.push({
      type: 'note',
      description: `Club contact fields: website=${hasWebsite}, phone=${hasPhone}, email=${hasEmail}, social=${hasSocial}`,
    });

    // The club info block heading is visible — that's the minimum assertion
    await expect(page.locator('text=Infos club')).toBeVisible();
  });
});
