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
