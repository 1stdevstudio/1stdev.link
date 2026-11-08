import { test, expect } from '@playwright/test';

test('legal direct link displays privacy details and shares consistent URL', async ({ page }) => {
  await page.goto('/?legal=privacy');
  const dialog = page.getByRole('dialog', { name: 'Kebijakan Privasi' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Poin penting')).toBeVisible();
  await expect(dialog.getByText('Statistik: agregat klik', { exact: false })).toBeVisible();

  await dialog.getByRole('button', { name: 'Ketentuan', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Ketentuan Layanan' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('legal')).toBe('terms');

  await page.getByRole('button', { name: 'Tutup', exact: true }).last().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('legal')).toBe(false);
});


for (const width of [320, 390, 768, 1440]) {
  test('redesigned legal reader fits viewport at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 780 : 900 });
    await page.goto('/?legal=terms');
    const dialog = page.getByRole('dialog', { name: 'Ketentuan Layanan' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.legal-hero')).toBeVisible();
    await expect(dialog.locator('.legal-summary-grid li')).toHaveCount(4);
    const bounds = await dialog.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, width: window.innerWidth, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(-2);
    expect(bounds.right).toBeLessThanOrEqual(bounds.width + 2);
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 2);
    await dialog.getByRole('button', { name: 'Privasi', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Kebijakan Privasi' })).toBeVisible();
    if (width < 681) {
      await expect(page.locator('.legal-mobile-toc')).toBeVisible();
    }
  });
}
