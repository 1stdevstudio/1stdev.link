import { test, expect } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { readFile } from 'node:fs/promises';

async function enterWorkspace(page, links = []) {
  await page.addInitScript((items) => {
    localStorage.removeItem('edgelink_token');
    localStorage.removeItem('edgelink_cached_session');
    localStorage.removeItem('edgelink_tab');
    localStorage.removeItem('edgelink_profile_tab');
    localStorage.setItem('edgelink_mock_links', JSON.stringify(items));
  }, links);
  await page.goto('/?lang=id');
  await page.getByRole('button', { name: /Pendekkan link saja/ }).click();
  await page.getByRole('button', { name: /Mulai sekarang/ }).click();
  await expect(page.locator('.panel3')).toBeVisible();
}

async function openProfileQr(page, width) {
  const nav = width >= 1024 ? page.locator('.sidebar4') : page.locator('.panel3-dock');
  await nav.getByRole('button', { name: 'Link', exact: true }).click();
  await page.getByRole('button', { name: /Desain QR Profil|QR Studio/ }).click();
  const studio = page.getByRole('dialog', { name: 'Custom QR Studio' });
  await expect(studio).toBeVisible();
  await expect(studio.locator('.qr-studio-status.is-ready')).toBeVisible({ timeout: 20000 });
  return studio;
}

async function inspectPngDownload(page, dialog, expectedUrl) {
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^1stdev-qr-.*\.png$/);
  const file = await download.path();
  const buffer = await readFile(file);
  const png = PNG.sync.read(buffer);
  expect(png.width).toBeGreaterThanOrEqual(512);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toBe(expectedUrl);
}

test.describe('Custom QR Studio — real decodable exports', () => {
  for (const width of [320, 390, 768, 1440]) {
    test('profile QR renders and downloads a decodable PNG at ' + width + 'px', async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 860 });
      await enterWorkspace(page);
      const dialog = await openProfileQr(page, width);
      await expect(dialog).toContainText('QR berhasil dibaca ulang');
      await page.evaluate(async () => { await document.fonts.ready; });
      const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
      await testInfo.attach('qr-studio-profile-' + width, { body: screenshot, contentType: 'image/png' });

      const rawUrl = await dialog.locator('.qr-studio-target > span:last-child').textContent();
      expect(rawUrl).toMatch(/\/@creator$/);
      await inspectPngDownload(page, dialog, rawUrl.trim());

      const svgPromise = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'SVG', exact: true }).click();
      const svgDownload = await svgPromise;
      expect(svgDownload.suggestedFilename()).toMatch(/\.svg$/);
      const svgText = (await readFile(await svgDownload.path())).toString('utf8');
      expect(svgText).toContain('<svg');
      expect(svgText).not.toMatch(/<script|foreignObject|https?:\/\/[^\s<]*image/);
    });
  }

  test('unsafe contrast blocks download and safe preset recovers', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterWorkspace(page);
    const dialog = await openProfileQr(page, 390);
    await dialog.getByRole('textbox', { name: 'Hex warna QR' }).fill('#F0F0F0');
    await expect(dialog.locator('.qr-studio-status.is-invalid')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Atur ulang ke desain aman' }).click();
    await expect(dialog.locator('.qr-studio-status.is-ready')).toBeVisible({ timeout: 20000 });
    await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
  });

  test('frame and alternate dot preset still decode at export', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await enterWorkspace(page);
    const dialog = await openProfileQr(page, 1440);
    await dialog.getByRole('button', { name: 'Minimal', exact: true }).click();
    await dialog.getByRole('button', { name: 'Dengan teks' }).click();
    await dialog.getByRole('textbox', { name: 'Teks di bawah QR' }).fill('SCAN MENU');
    await expect(dialog.locator('.qr-studio-status.is-ready')).toBeVisible({ timeout: 20000 });
    const rawUrl = (await dialog.locator('.qr-studio-target > span:last-child').textContent()).trim();
    await inspectPngDownload(page, dialog, rawUrl);
  });

  test('link card QR points to owned shortlink, not its destination', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const shortlink = {
      id: 'lnk_qr_sample', slug: 'qr-test-menu', destination_url: 'https://example.com/products',
      title: 'Menu Toko', clicks: 0, is_bio_entry: false, is_active: true, sort_order: 0,
      block_type: 'link', created_at: 1730010000,
    };
    await enterWorkspace(page, [shortlink]);
    await page.locator('.sidebar4').getByRole('button', { name: 'Link', exact: true }).click();
    await page.getByRole('button', { name: 'Desain QR untuk Menu Toko' }).click();
    const dialog = page.getByRole('dialog', { name: 'Custom QR Studio' });
    await expect(dialog.locator('.qr-studio-status.is-ready')).toBeVisible({ timeout: 20000 });
    const rawUrl = (await dialog.locator('.qr-studio-target > span:last-child').textContent()).trim();
    expect(rawUrl).toMatch(/\/qr-test-menu$/);
    expect(rawUrl).not.toContain('example.com');
    await inspectPngDownload(page, dialog, rawUrl);
  });

  test('small local PNG logo can be embedded and decoded', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await enterWorkspace(page);
    const dialog = await openProfileQr(page, 1440);
    const logo = new PNG({ width: 40, height: 40 });
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
      const i = (y * 40 + x) * 4;
      logo.data[i] = 21; logo.data[i+1] = 111; logo.data[i+2] = 75; logo.data[i+3] = 255;
    }
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'logo.png', mimeType: 'image/png', buffer: PNG.sync.write(logo),
    });
    await expect(dialog.getByRole('button', { name: 'Hapus' })).toBeVisible();
    await expect(dialog.locator('.qr-studio-status.is-ready')).toBeVisible({ timeout: 20000 });
    const rawUrl = (await dialog.locator('.qr-studio-target > span:last-child').textContent()).trim();
    await inspectPngDownload(page, dialog, rawUrl);
  });
});
