import { test, expect } from '@playwright/test';

const widths = [320, 390, 768, 1024, 1440, 1920];

test.describe('first-visit design baseline (no saved session)', () => {
  for (const width of widths) {
    test('welcome fits ' + width + 'px and exports a visual artifact', async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.goto('/?lang=id');

      const chooser = page.locator('.welcome-chooser');
      await expect(chooser).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Kamu ingin membuat apa?' })).toBeVisible();
      await expect(page.locator('.welcome-choice')).toHaveCount(4);
      await expect(page.locator('#start-title')).toContainText('Bukan sekadar');
      await expect(page.locator('.start-browser')).toBeVisible();
      await expect(page.locator('.start-highlights')).toBeVisible();
      await expect(page.locator('.start-chooser')).toBeVisible();

      const gridColumns = await page.locator('.start-choice-grid').evaluate((el) =>
        getComputedStyle(el).gridTemplateColumns.split(' ').length
      );
      expect(gridColumns, 'the goal cards must adapt to viewport width')
        .toBe(width <= 390 ? 1 : width < 950 ? 2 : 4);

      const visual = await page.evaluate(() => {
        const root = document.documentElement;
        const shell = document.querySelector('.welcome-shell');
        const section = document.querySelector('.welcome-screen');
        return {
          viewport: root.clientWidth,
          docWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
          shellRight: shell?.getBoundingClientRect().right ?? Infinity,
          background: section ? getComputedStyle(section).backgroundColor : '',
          bodyBackground: getComputedStyle(document.body).backgroundColor,
        };
      });
      expect(visual.background).toBe('rgb(247, 249, 247)');
      expect(visual.bodyBackground, 'the HTML body must not paint the old dark theme').toBe('rgb(247, 249, 247)');
      expect(visual.docWidth, 'document must not scroll horizontally').toBeLessThanOrEqual(visual.viewport + 2);
      expect(visual.shellRight, 'welcome layout must stay inside viewport').toBeLessThanOrEqual(visual.viewport + 2);

      // These are evidence screenshots, NOT auto-approved regression snapshots.
      // Review the artifacts and approve a baseline in a dedicated UI review PR.
      await page.evaluate(async () => { await document.fonts.ready; });
      const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
      await testInfo.attach('welcome-' + width + 'px', { body: screenshot, contentType: 'image/png' });
    });
  }

  test('goal choice and accessible sign-in dialog work with keyboard', async ({ page }) => {
    await page.goto('/?lang=id');
    const affiliate = page.getByRole('button', { name: /Afiliasi & Rekomendasi/ });
    await affiliate.click();
    await expect(affiliate).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('english copy keeps a visible goal picker', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?lang=en');
    await expect(page.getByRole('heading', { name: 'What would you like to create?' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Shorten links only/ })).toBeVisible();
  });

  for (const width of [390, 1440]) {
    test('marketing preview evidence at ' + width + 'px', async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/landing?lang=id');
      await expect(page.locator('.portfolio-landing')).toBeVisible();
      await page.evaluate(async () => { await document.fonts.ready; });
      const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
      await testInfo.attach('marketing-preview-' + width + 'px', { body: screenshot, contentType: 'image/png' });
    });
  }
});
