import { test, expect } from '@playwright/test';

const menu = [
  ['home', 'Beranda', '#home'],
  ['profile', 'Halaman', '#content'],
  ['links', 'Link', '#links'],
  ['stats', 'Statistik', '#stats'],
  ['account', 'Pengaturan', '#account'],
];

async function startGuest(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('edgelink_token');
    localStorage.removeItem('edgelink_cached_session');
    localStorage.removeItem('edgelink_tab');
    localStorage.removeItem('edgelink_profile_tab');
    localStorage.setItem('edgelink_mock_links', '[]');
  });
  await page.goto('/?lang=id');
  await page.getByRole('button', { name: /Pendekkan link saja/ }).click();
  await page.getByRole('button', { name: /Mulai sekarang/ }).click();
  await expect(page.locator('.panel3')).toBeVisible();
}

test.describe('one consistent navigation across every page', () => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    test('all five destinations, labels, active state and create at ' + width + 'px', async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      await startGuest(page);
      const activeNav = width >= 1024 ? page.locator('.panel3-sidebar .workspace-nav') : page.locator('.panel3-dock');
      const passiveNav = width >= 1024 ? page.locator('.panel3-dock') : page.locator('.panel3-sidebar');
      await expect(activeNav).toBeVisible();
      await expect(passiveNav).toBeHidden();

      const ids = await activeNav.locator('button[data-nav-id]').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-nav-id')));
      expect(ids).toEqual(menu.map(([id]) => id));

      for (const [id, label, hash] of menu) {
        const button = activeNav.locator('button[data-nav-id="' + id + '"]');
        await expect(button).toContainText(label);
        await button.click();
        await expect(page).toHaveURL(new RegExp(hash + '$'));
        await expect(button).toHaveAttribute('aria-current', 'page');
        await expect(activeNav.locator('button[aria-current="page"]')).toHaveCount(1);
        const current = await activeNav.locator('button[aria-current="page"]').getAttribute('data-nav-id');
        expect(current).toBe(id);
      }
      await expect(page.locator('.panel3-topbar').getByRole('button', { name: 'Buat', exact: true })).toBeVisible();
      await page.locator('.panel3-topbar').getByRole('button', { name: 'Buat', exact: true }).click();
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(page.getByRole('menuitem')).toHaveCount(2);
      await page.getByRole('menuitem', { name: /Pendekkan link/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const widthState = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      }));
      expect(widthState.document).toBeLessThanOrEqual(widthState.viewport + 2);
      await page.keyboard.press('Escape');
      const image = await page.screenshot({ fullPage: true, animations: 'disabled' });
      await testInfo.attach('unified-navigation-' + width + 'px', { body: image, contentType: 'image/png' });
    });
  }

  test('Welcome and /landing display identical marketing navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?lang=id');
    const home = page.locator('.site-header');
    await expect(home).toBeVisible();
    const homeLabels = await home.locator('nav').evaluate((nav) =>
      [...nav.querySelectorAll('a, button')].map((node) => node.textContent.trim())
    );
    const homeHrefs = await home.locator('nav a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    await page.goto('/landing?lang=id');
    const landing = page.locator('.site-header');
    await expect(landing).toBeVisible();
    const landingLabels = await landing.locator('nav').evaluate((nav) =>
      [...nav.querySelectorAll('a, button')].map((node) => node.textContent.trim())
    );
    const landingHrefs = await landing.locator('nav a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(landingLabels).toEqual(homeLabels);
    expect(landingHrefs).toEqual(homeHrefs);
    await landing.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('mobile /landing and Welcome share the same visible header elements', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    for (const path of ['/?lang=id', '/landing?lang=id']) {
      await page.goto(path);
      const header = page.locator('.site-header');
      await expect(header).toBeVisible();
      await expect(header.getByRole('link', { name: '1stdev.link' })).toBeVisible();
      await expect(header.getByRole('button', { name: 'Masuk' })).toBeVisible();
      const state = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        doc: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      }));
      expect(state.doc).toBeLessThanOrEqual(state.viewport + 2);
    }
  });
});
