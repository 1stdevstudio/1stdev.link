import type { Link } from './types.js';
import { escapeHtml as e } from './publicSeo.js';
import { businessOpenStatus, validateBusinessData } from './business.js';

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export function renderBusinessBlock(link: Link): string {
  try {
    const data = validateBusinessData(link.block_type || '', link.data_json);
    const title = `<h2>${e(link.title || '')}</h2>`;
    if (data.kind === 'catalog') {
      const items = data.items.filter((i) => i.status !== 'hidden');
      if (!items.length) return '';
      const id = `catalog-${link.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      const categories = data.categories.filter((c) => items.some((i) => i.category === c));
      const tabs = ['', ...categories].map((category, n) => `<input class="biz-radio" type="radio" name="${id}" id="${id}-${n}" ${n === 0 ? 'checked' : ''}><label class="biz-tab" for="${id}-${n}">${e(category || 'Semua')}</label>`).join('');
      const filters = categories.map((_, n) => `#${id}:has(#${id}-${n + 1}:checked) .biz-item:not([data-category="${n + 1}"]){display:none}#${id}-${n + 1}:checked+label{background:var(--text);color:var(--bg)}`).join('');
      return `<section class="biz-section biz-catalog" id="${id}">${title}${data.disclosure ? `<p class="biz-disclosure">${e(data.disclosure)}</p>` : ''}<fieldset class="biz-filters"><legend class="sr-only">Kategori ${e(link.title || 'katalog')}</legend>${tabs}</fieldset><style>${filters}</style><div class="biz-items ${data.layout === 'grid' ? 'biz-grid' : ''}">${items.map((item) => {
        const action = item.status === 'available' && item.action_url
          ? `<a class="biz-action biz-product-action" href="${e(item.action_url)}" target="_blank" rel="noopener noreferrer${data.disclosure ? ' sponsored' : ''}">${e(item.action_label || 'Lihat produk')}</a>`
          : item.status === 'available' && data.whatsapp
            ? `<a class="biz-action biz-product-action" href="https://wa.me/${data.whatsapp}?text=${e(encodeURIComponent(item.name))}" target="_blank" rel="noopener noreferrer">Tanya produk ini</a>` : '';
        return `<article class="biz-item" data-category="${categories.indexOf(item.category) + 1}">
        ${item.image_url ? `<img class="biz-thumb" src="${e(item.image_url)}" alt="${e(item.name)}" loading="lazy" width="80" height="88">` : ''}
        <div class="biz-item-copy"><h3>${e(item.name)}</h3>${item.description ? `<p>${e(item.description)}</p>` : ''}<div class="biz-price">${item.price_kind === 'ask' ? 'Hubungi untuk harga' : `${item.price_kind === 'from' ? 'Mulai ' : ''}${money.format(item.price!)}${item.unit ? ` / ${e(item.unit)}` : ''}`}</div>${item.duration ? `<small>${item.duration} menit</small>` : ''}${item.status === 'unavailable' ? '<span class="biz-stock">Tidak tersedia</span>' : ''}${action}</div></article>`;
      }).join('')}</div></section>`;
    }
    if (data.kind === 'business_info') {
      if (!data.hours.length && !data.note && !data.closed) return '';
      const status = businessOpenStatus(data);
      return `<section class="biz-section biz-info">${title}<span class="biz-status">${status === 'open' ? 'Buka sekarang' : status === 'closed' ? (data.closed ? 'Tutup sementara' : 'Sedang tutup') : 'Jam buka belum tersedia'}</span>${data.hours.length ? `<dl class="biz-hours">${[1, 2, 3, 4, 5, 6, 0].map((day) => { const hours = data.hours.find((h) => h.day === day); return `<div><dt>${dayNames[day]}</dt><dd>${hours ? `${hours.open}–${hours.close}${hours.close < hours.open ? ' (+1 hari)' : ''}` : 'Tutup'}</dd></div>`; }).join('')}</dl><p class="biz-timezone">${e(data.timezone)}</p>` : ''}${data.note ? `<p class="biz-note">${e(data.note)}</p>` : ''}</section>`;
    }
    if (data.kind === 'location') {
      if (!data.address && !data.map_url) return '';
      return `<section class="biz-section biz-info">${title}${data.address ? `<p class="biz-note">${e(data.address)}</p>` : ''}${data.map_url ? `<a class="biz-action" href="${e(data.map_url)}" target="_blank" rel="noopener noreferrer">Buka peta <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M7 17 17 7M7 7h10v10"/></svg></a>` : ''}</section>`;
    }
    if (data.kind === 'contact') {
      const links = [data.whatsapp && ['WhatsApp', `https://wa.me/${data.whatsapp}`], data.phone && ['Telepon', `tel:${data.phone}`], data.email && ['Email', `mailto:${encodeURIComponent(data.email)}`], data.website && ['Website', data.website]].filter((v): v is string[] => !!v);
      if (!links.length) return '';
      return `<section class="biz-section">${title}<div class="biz-contacts">${links.map(([label, url]) => `<a class="biz-action" href="${e(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`).join('')}</div></section>`;
    }
    return data.text ? `<section class="biz-section biz-announcement">${title}<p class="biz-note">${e(data.text)}</p></section>` : '';
  } catch { return ''; } // Old/corrupt records must not break the public profile.
}

export const BUSINESS_CSS = `
.business-page{font-family:Inter,system-ui,sans-serif;padding-top:16px}
.business-paper{--bg:#f7f4ed;--text:#252b25;--text-muted:#626b60;background:var(--bg);color:var(--text)}
.business-paper .whatsapp-card{color:#166534}
.business-ink{--bg:#0d1b16;--text:#eef3ee;--text-muted:#a3b3a5;background:var(--bg);color:var(--text)}
.business-page .profile-card{align-items:stretch;text-align:left;padding-top:12px}
.business-page .name-row{justify-content:flex-start}.business-page h1{font-family:Georgia,serif;font-size:32px;font-weight:400;letter-spacing:-1px;overflow-wrap:anywhere}
.business-page .handle{font-size:11px}.business-page .bio{max-width:100%;font-size:14px;white-space:pre-line}
.business-page .avatar-placeholder{background:var(--accent);color:#182822}.business-page .avatar-wrapper{align-self:flex-start;margin-bottom:14px}.business-page .avatar,.business-page .avatar-placeholder{width:52px;height:52px;font-size:22px}
.business-page .socials{justify-content:flex-start}.business-page .cover-banner{width:100%;max-width:100%;height:180px;border-radius:16px;margin-bottom:20px}
.business-page .links-container{gap:22px}.biz-section{width:100%;min-width:0}.biz-section h2{font-size:17px;font-weight:600;margin:0 0 14px;overflow-wrap:anywhere}.biz-section h3{font-size:14px;font-weight:600;overflow-wrap:anywhere}
.biz-filters{border:0;display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;padding:0;min-width:0}.biz-tab{cursor:pointer;display:inline-flex;align-items:center;min-height:44px;max-width:100%;overflow-wrap:anywhere;font-size:12px;padding:9px 14px;border-radius:24px;background:color-mix(in srgb,var(--text) 8%,var(--bg));color:var(--text)}
.biz-radio{position:absolute;opacity:0;width:1px;height:1px}.biz-radio:focus-visible+label{outline:2px solid var(--accent);outline-offset:3px}.biz-radio:checked+label{background:var(--text);color:var(--bg)}
.biz-items{display:grid;gap:10px}.biz-item{display:flex;gap:14px;align-items:flex-start;padding:14px;min-width:0;border-radius:16px;background:color-mix(in srgb,var(--text) 6%,var(--bg))}.biz-item-copy{min-width:0;flex:1}.biz-item p{font-size:12px;color:var(--text-muted);line-height:1.6;margin:5px 0;white-space:pre-line;overflow-wrap:anywhere}.biz-thumb{width:80px;height:88px;object-fit:contain;border-radius:12px;flex-shrink:0;background:color-mix(in srgb,var(--text) 4%,var(--bg))}.biz-price{font-size:13px;font-weight:600;margin-top:6px;overflow-wrap:anywhere}.biz-item small,.biz-stock{display:block;color:var(--text-muted);font-size:11px;margin-top:4px}.biz-stock{font-weight:600}.biz-disclosure{font-size:12px;line-height:1.6;color:var(--text-muted);margin:0 0 14px;overflow-wrap:anywhere;white-space:pre-line}.biz-product-action{margin-top:12px;max-width:100%;overflow-wrap:anywhere}.biz-grid .biz-product-action{width:100%}
.biz-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.biz-grid .biz-item{display:block}.biz-grid .biz-thumb{width:100%;height:auto;aspect-ratio:4/3;margin-bottom:9px}.biz-info,.biz-announcement{padding:18px;border-radius:16px;background:color-mix(in srgb,var(--text) 6%,var(--bg))}.biz-note{font-size:13px;line-height:1.7;white-space:pre-line;overflow-wrap:anywhere}.biz-status{display:inline-block;font-size:12px;font-weight:600;margin-bottom:8px}.biz-hours{font-size:12px;margin-top:8px}.biz-hours>div{display:flex;justify-content:space-between;gap:12px;margin:5px 0}.biz-hours dd{text-align:right}.biz-timezone{font-size:11px;color:var(--text-muted);margin:10px 0}.biz-action{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:44px;padding:9px 14px;border-radius:12px;background:color-mix(in srgb,var(--text) 10%,var(--bg));color:var(--text);text-decoration:none;font-size:13px}.biz-info .biz-action{margin-top:12px}.biz-contacts{display:flex;gap:8px;flex-wrap:wrap}.biz-action:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
`;
