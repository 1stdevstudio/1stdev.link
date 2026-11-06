import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBioPage } from '../../shared/renderBioPage.js';
import { BUSINESS_CSS } from '../../shared/renderBusiness.js';
import type { BioProfile } from '../../shared/types.js';

const profile: BioProfile = { user_id: 'design-test', handle: 'design-test', display_name: 'Design test', updated_at: 1 };
test('business skins preserve atmospheric layers and selected avatar shape', () => {
  for (const skin of ['paper', 'ink']) {
    for (const shape of ['circle', 'squircle', 'rounded']) {
      const html = renderBioPage({ ...profile, avatar_shape: shape, business_json: JSON.stringify({ version: 1, mode: 'business', industry: 'services', skin }), style: JSON.stringify({ av_shape: 'circle', bgfx: ['aurora', 'grain'], accent: '#abc', bg_image: 'https://example.com/wallpaper.jpg', bg_blur: 8, bg_dim: 30 }) }, []);
      assert.match(html, new RegExp(`avatar-placeholder shape-${shape}`));
      assert.match(html, /<div class="aurora-layer"><\/div>/);
      assert.match(html, /<div class="grain-layer"><\/div>/);
      assert.match(html, /<div class="bg-custom-image"><\/div>/);
      assert.match(html, /filter: blur\(8px\)/);
      assert.match(html, /rgba\(0, 0, 0, 0.3\)/);
      assert.match(html, /color-mix\(in srgb, var\(--accent\) 35%/);
    }
  }
  assert.doesNotMatch(BUSINESS_CSS, /\.(?:bg-custom-image|bg-dim-layer|aurora-layer|grain-layer)[^{]*\{[^}]*display:none/);
  assert.doesNotMatch(BUSINESS_CSS, /\.business-page \.avatar,[^{]*\{[^}]*border-radius/);
});
test('legacy avatar shape is supported when canonical shape is absent; disabled effects stay absent', () => {
  const html = renderBioPage({ ...profile, style: JSON.stringify({ av_shape: 'squircle', bgfx: [] }) }, []);
  assert.match(html, /avatar-placeholder shape-squircle/);
  assert.doesNotMatch(html, /<div class="(?:aurora|grain)-layer">/);
});
