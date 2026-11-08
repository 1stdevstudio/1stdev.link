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


test('social preview is product-branded and does not advertise hosting details', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  const head = html.split('</head>')[0];
  const meta = [...head.matchAll(/<meta[^>]+>/g)].map(match => match[0]);
  const preview = meta.filter(tag => /(?:og:|twitter:|name="description")/.test(tag)).join(' ');
  expect(preview).toContain('1stdev.link');
  expect(preview).toContain('og:image:secure_url');
  expect(preview).toContain('twitter:image:alt');
  expect(preview).toContain('https://1stdev.link/og.png?v=20261109');
  expect(preview).not.toMatch(/pages[.]dev|cloudflare|worker|backend|edgelink-afl/i);
  expect(preview).not.toContain('by 1stdev.space');
});

test('PWA manifest uses first-party image paths and no provider-hosted icons', async ({ request }) => {
  const response = await request.get('/site.webmanifest');
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe('1stdev.link');
  expect(manifest.theme_color.toLowerCase()).toBe('#18765d');
  expect(manifest.icons).toHaveLength(2);
  for (const icon of manifest.icons) {
    expect(icon.src.startsWith('/icon-')).toBe(true);
    expect(icon.src.endsWith('.png')).toBe(true);
    expect(icon.src).not.toContain('://');
  }
  expect(JSON.stringify(manifest)).not.toMatch(/pages[.]dev|cloudflare|workers[.]dev/i);
});
