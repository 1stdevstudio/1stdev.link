import { test, expect } from '@playwright/test';

const widths = [320, 390, 768, 1024, 1440, 1920];
const screens = ['home', 'profile', 'links', 'stats', 'account'];

async function openGuestPanel(page) {
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

async function goToScreen(page, key, width) {
  const nav = width >= 1024 ? page.locator('.panel3-sidebar') : page.locator('.panel3-dock');
  const labels = { home: 'Beranda', profile: 'Halaman', links: 'Link', stats: 'Statistik', account: 'Pengaturan' };
  if (key === 'account') {
    await (width >= 1024 ? page.locator('.sidebar4-settings') : page.locator('.panel3-topbar .panel3-settings-shortcut')).click();
  } else {
    await nav.getByRole('button', { name: labels[key], exact: true }).click();
  }
  const fragment = { home: '#home', profile: '#content', links: '#links', stats: '#stats', account: '#account' }[key];
  await expect(page).toHaveURL(new RegExp(fragment + '$'));
  await expect(page.locator('.workspace-page-title').first()).toBeVisible();
}

test.describe('Workspace 3.0 complete responsive panel', () => {
  for (const width of widths) {
    test('four destinations plus settings shortcut fit viewport ' + width + 'px', async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await openGuestPanel(page);
      await expect(page.locator('.panel3-appbar')).toBeVisible();
      if (width >= 1024) await expect(page.locator('.panel3-sidebar')).toBeVisible();
      else await expect(page.locator('.panel3-sidebar')).toBeHidden();

      for (const screen of screens) {
        await goToScreen(page, screen, width);
        const bounds = await page.evaluate(() => {
          const root = document.documentElement;
          const body = document.body;
          const main = document.querySelector('.main-area');
          const shell = document.querySelector('.shell-body');
          return {
            viewport: root.clientWidth,
            docWidth: Math.max(root.scrollWidth, body.scrollWidth),
            mainRight: main?.getBoundingClientRect().right || Infinity,
            shellRight: shell?.getBoundingClientRect().right || Infinity,
          };
        });
        expect(bounds.docWidth, screen + ' must not overflow at ' + width + 'px').toBeLessThanOrEqual(bounds.viewport + 2);
        expect(bounds.mainRight, screen + ' main must fit viewport').toBeLessThanOrEqual(bounds.viewport + 2);
        expect(bounds.shellRight, screen + ' shell must fit viewport').toBeLessThanOrEqual(bounds.viewport + 2);

        await page.evaluate(async () => { await document.fonts.ready; });
        const buffer = await page.screenshot({ fullPage: true, animations: 'disabled' });
        await testInfo.attach('panel3-' + screen + '-' + width + 'px', { body: buffer, contentType: 'image/png' });
      }
    });
  }

  test('desktop builder has live preview and design tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openGuestPanel(page);
    await goToScreen(page, 'profile', 1440);
    const preview = page.locator('.panel3-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('iframe[title="Preview profil publik"]')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Isi/ })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: /Desain/ }).click();
    await expect(page.getByRole('tab', { name: /Desain/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-design')).toBeVisible();
  });


  test('profile settings from Account navigate to the Design tab and expose tidy groups', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openGuestPanel(page);
    await goToScreen(page, 'account', 1440);
    await page.getByRole('button', { name: /Tampilan halaman/ }).click();
    await expect(page).toHaveURL(/#design$/);
    await expect(page.locator('#panel-design')).toBeVisible();
    await expect(page.locator('#profile-settings-identity')).toBeVisible();
    await expect(page.locator('#profile-settings-theme')).toBeVisible();
    await expect(page.locator('#profile-settings-media')).toBeVisible();
    await expect(page.locator('#profile-settings-effects')).toBeVisible();
    await page.locator('#profile-settings-effects summary').click();
    await expect(page.locator('#profile-settings-effects')).toHaveAttribute('open', '');
  });

  test('mobile has accessible settings entry', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openGuestPanel(page);
    await expect(page.locator('.panel3-dock')).toBeVisible();
    await goToScreen(page, 'account', 390);
    await expect(page.locator('.panel3-account')).toBeVisible();
    await expect(page.locator('.panel3-topbar .panel3-settings-shortcut')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.panel3-topbar').getByRole('button', { name: 'Buat', exact: true })).toBeVisible();
  });
});
