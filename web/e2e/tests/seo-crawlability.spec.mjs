import { test, expect } from '@playwright/test';

test('raw HTML serves meaningful landing content before JavaScript', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('data-seo-fallback="landing"');
  expect(html).toContain('Link bio dan link pendek gratis untuk kreator dan UMKM');
  expect(html).toContain('href="https://1stdev.link/"');
  expect(html).toContain('href="/docs"');
  expect(html).toContain('href="/llms.txt"');
  expect(html).not.toContain('<noscript>');
});

test('homepage remains readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#root h1')).toContainText('Satu link untuk semua');
    await expect(page.locator('#root')).toContainText('Link bio dan link pendek gratis untuk kreator dan UMKM');
    await expect(page.locator('#root a[href="/docs"]')).toHaveCount(1);
  } finally {
    await context.close();
  }
});

test('interactive homepage displays equivalent SEO feature explanations', async ({ page }) => {
  await page.goto('/?lang=id');
  await expect(page.getByRole('heading', { name: 'Satu halaman untuk berkarya dan menjalankan usaha.' })).toBeVisible();
  await expect(page.locator('.start-seo-grid article')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Link bio gratis untuk Instagram dan TikTok' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Link pendek gratis dengan statistik klik' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dokumentasi API' })).toHaveAttribute('href', '/docs');
});
