import { test, expect } from '@playwright/test';

async function mockEmptyWorkspace(page) {
  await page.addInitScript(() => {
    localStorage.setItem('edgelink_mock_links', '[]');
    localStorage.removeItem('edgelink_token');
    localStorage.removeItem('edgelink_cached_session');
    localStorage.removeItem('edgelink_tab');
    localStorage.removeItem('edgelink_profile_tab');
  });
}

test('guest shortlink starts in links, opens and closes Add Link sheet', async ({ page }) => {
  await mockEmptyWorkspace(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?lang=id');

  await page.getByRole('button', { name: /Pendekkan link saja/ }).click();
  await page.getByRole('button', { name: /Mulai sekarang/ }).click();

  await expect(page.locator('h1.workspace-page-title')).toHaveText('Link');
  await expect(page.locator('.link-empty-panel')).toBeVisible();
  await expect(page.locator('.workspace-sidebar')).toBeVisible();

  await page.locator('.link-empty-panel').getByRole('button', { name: /Tambah link/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('desktop nav uses the available workspace width', async ({ page }, testInfo) => {
  await mockEmptyWorkspace(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?lang=id');
  await page.getByRole('button', { name: /Pendekkan link saja/ }).click();
  await page.getByRole('button', { name: /Mulai sekarang/ }).click();
  await expect(page.locator('.link-empty-panel')).toBeVisible();

  const bounds = await page.evaluate(() => {
    const workspace = document.querySelector('.workspace-frame')?.getBoundingClientRect();
    const content = document.querySelector('.main-area')?.getBoundingClientRect();
    const sidebar = document.querySelector('.workspace-sidebar')?.getBoundingClientRect();
    const doc = document.documentElement;
    return {
      viewport: doc.clientWidth,
      documentWidth: Math.max(doc.scrollWidth, document.body.scrollWidth),
      workspaceWidth: workspace?.width || 0,
      contentWidth: content?.width || 0,
      sidebarWidth: sidebar?.width || 0,
    };
  });
  expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewport + 2);
  expect(bounds.workspaceWidth).toBeGreaterThan(1100);
  expect(bounds.contentWidth).toBeGreaterThan(600);
  expect(bounds.sidebarWidth).toBeGreaterThan(170);

  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach('workspace-links-desktop-1440px', { body: screenshot, contentType: 'image/png' });

  await page.locator('.workspace-sidebar').getByRole('button', { name: 'Beranda' }).click();
  await expect(page).toHaveURL(/#home$/);
  await expect(page.locator('h1.workspace-page-title')).toBeVisible();

  await page.locator('.workspace-sidebar').getByRole('button', { name: 'Link' }).click();
  await expect(page).toHaveURL(/#links$/);
});

test('mobile dock and one-column links workspace remain usable', async ({ page }, testInfo) => {
  await mockEmptyWorkspace(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lang=id');
  await page.getByRole('button', { name: /Pendekkan link saja/ }).click();
  await page.getByRole('button', { name: /Mulai sekarang/ }).click();

  await expect(page.locator('.link-empty-panel')).toBeVisible();
  await expect(page.locator('.dock')).toBeVisible();
  const columns = await page.locator('.link-empty-panel').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(1);

  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach('workspace-links-mobile-390px', { body: screenshot, contentType: 'image/png' });

  await page.locator('.dock').getByRole('button', { name: 'Statistik' }).click();
  await expect(page.locator('h1.workspace-page-title')).toHaveText('Statistik');
  await expect(page).toHaveURL(/#stats$/);
});

test('builder preview uses the shared public HTML renderer', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('edgelink_token', 'dev_mock_session');
    localStorage.setItem('edgelink_tab', 'profile');
    localStorage.setItem('edgelink_profile_tab', 'content');
    localStorage.setItem('edgelink_mock_links', '[]');
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?lang=id#content');

  await expect(page.getByRole('heading', { name: 'Halaman Saya' })).toBeVisible();
  await expect(page.locator('.studio-tabs')).toBeVisible();

  const frame = page.locator('iframe[title="Preview profil publik"]').first();
  await expect(frame).toBeVisible();
  const html = await frame.getAttribute('srcdoc');
  expect(html).toContain('html');
  expect(html).toContain('Yogi Iskandar');
});
