import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import type { Env } from '../src/types.js';

const env = { BASE_URL: 'https://1stdev.link' } as Env;

test('Legal pages serve canonical crawlable content and do not run client scripts', async () => {
  for (const kind of ['privacy', 'terms']) {
    const response = await app.fetch(new Request('https://1stdev.link/' + kind), env);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    const html = await response.text();
    assert.ok(html.includes('<link rel="canonical" href="https://1stdev.link/' + kind + '">'));
    assert.ok(html.includes('application/ld+json'));
    assert.ok(html.includes('2026-11-09'));
    assert.ok(html.includes('support@1stdev.link'));
    assert.ok(!html.includes('<script src='));
  }
});
test('English legal pages have unique language-specific canonical', async () => {
  const response = await app.fetch(new Request('https://1stdev.link/privacy?lang=en'), env);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('<html lang="en">'));
  assert.ok(html.includes('<title>Privacy Policy'));
  assert.ok(html.includes('<link rel="canonical" href="https://1stdev.link/privacy?lang=en">'));
});


test('Both legal pages share responsive reading design and preserve SEO metadata', async () => {
  for (const kind of ['terms', 'privacy']) {
    const response = await app.fetch(new Request('https://1stdev.link/' + kind), env);
    const html = await response.text();
    assert.match(html, /class="hero-layout"/);
    assert.match(html, /class="summary-grid"/);
    assert.match(html, /class="reading-layout"/);
    assert.match(html, /class="mobile-toc"/);
    assert.match(html, /class="contact-banner"/);
    assert.match(html, /@media\(max-width:740px\)/);
    assert.match(html, /href="#section-1"/);
    assert.match(html, /<main id="content"/);
    assert.match(html, /href="mailto:support@1stdev.link"/);
    assert.match(html, /<meta property="og:image"/);
    assert.ok(!html.includes('<script src='));
  }
});
