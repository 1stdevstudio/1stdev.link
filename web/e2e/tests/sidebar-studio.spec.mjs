import { test, expect } from '@playwright/test';

const menu = [
  ['home', 'Beranda', '#home'],
  ['profile', 'Halaman', '#content'],
  ['links', 'Link', '#links'],
  ['stats', 'Statistik', '#stats'],
];

async function openWorkspace(page) {
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

test.describe('Studio sidebar redesign', () => {
  for (const [width, height] of [[1024, 768], [1280, 800], [1440, 900], [1920, 1080]]) {
    test('visual, four primary destinations and settings shortcut at ' + width + '×' + height, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      await openWorkspace(page);
      const sidebar = page.locator('.sidebar4');
      await expect(sidebar).toBeVisible();
      await expect(sidebar.locator('.sidebar4-brand')).toBeVisible();
      await expect(sidebar.locator('.sidebar4-brand')).toContainText('Semua dalam satu tempat.');
      await expect(sidebar.locator('.sidebar4-nav-heading')).toContainText('MENU UTAMA');
      await expect(sidebar.locator('.sidebar4-nav-links > button[data-nav-id]')).toHaveCount(4);
      await expect(sidebar.locator('.sidebar4-settings')).toBeVisible();
      await expect(sidebar.locator('.sidebar4-share')).toBeVisible();
      await expect(sidebar.locator('.sidebar4-account')).toBeVisible();

      const colors = await sidebar.evaluate((el) => ({
        background: getComputedStyle(el).backgroundColor,
        brand: getComputedStyle(el.querySelector('.sidebar4-brand')).backgroundImage,
        width: el.getBoundingClientRect().width,
        scrollable: el.scrollHeight >= el.clientHeight,
      }));
      expect(colors.background).toBe('rgb(245, 249, 245)');
      expect(colors.brand).toContain('linear-gradient');
      expect(colors.width).toBeGreaterThan(200);
      expect(colors.scrollable).toBe(true);

      for (const [id, label, hash] of menu) {
        const item = sidebar.locator('button[data-nav-id="' + id + '"]');
        await expect(item).toContainText(label);
        await item.click();
        await expect(page).toHaveURL(new RegExp(hash + '$'));
        await expect(item).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.locator('.sidebar4-nav-links button[aria-current="page"]')).toHaveCount(1);
      }

      await sidebar.locator('.sidebar4-settings').click();
      await expect(page).toHaveURL(/#account$/);
      await expect(sidebar.locator('.sidebar4-settings')).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('.panel3-account')).toBeVisible();
      await sidebar.locator('button[data-nav-id="home"]').click();
      await expect(page).toHaveURL(/#home$/);
      await page.evaluate(async () => document.fonts.ready);
      const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
      await testInfo.attach('studio-sidebar-' + width + 'px', { body: screenshot, contentType: 'image/png' });

      await sidebar.getByRole('button', { name: 'Bagikan halaman' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await sidebar.getByRole('button', { name: 'Simpan akun' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  }

  test('mobile keeps four-item dock and header settings', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);
    await expect(page.locator('.sidebar4')).toBeHidden();
    const dock = page.locator('.panel3-dock');
    await expect(dock).toBeVisible();
    const ids = await dock.locator('button[data-nav-id]').evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('data-nav-id'))
    );
    expect(ids).toEqual(menu.map(([id]) => id));
    await page.locator('.panel3-topbar .panel3-settings-shortcut').click();
    await expect(page).toHaveURL(/#account$/);
    await expect(page.locator('.panel3-account')).toBeVisible();
  });

  test('sidebar is still reachable at 1024px with a short viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await openWorkspace(page);
    const sidebar = page.locator('.sidebar4');
    await expect(sidebar).toBeVisible();
    await sidebar.getByRole('button', { name: 'Simpan akun' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
