import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { BioProfile, LinkItem } from '../types';
import { useI18n } from '../i18n/context';
import { renderBioPage } from '../../../shared/renderBioPage';
export { THEME_STYLES } from '../../../shared/bio';

interface LivePhonePreviewProps { profile: BioProfile; links: LinkItem[] }

export const orderedBioLinks = (links: LinkItem[]) => links
  .filter((l) => Boolean(l.is_bio_entry))
  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

/** The preview renders the same document as the public Worker route. */
export const LivePhonePreview: React.FC<LivePhonePreviewProps> = ({ profile, links }) => {
  const { tx, lang } = useI18n();
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const html = useMemo(() => renderBioPage({
    ...profile,
    user_id: '', updated_at: 0,
    business_json: JSON.stringify(profile.business),
    verified_badge: profile.verified_badge ? 1 : 0,
    style: JSON.stringify(profile.style || {}),
    social_links: JSON.stringify(profile.social_links || {}),
  }, orderedBioLinks(links).map((link) => ({
    ...link, data_json: typeof link.data_json === 'string' ? link.data_json : link.data_json ? JSON.stringify(link.data_json) : undefined, user_id: '', created_at: link.created_at || 0,
    is_active: link.is_active ? 1 : 0, is_bio_entry: link.is_bio_entry ? 1 : 0,
    style: typeof link.style === 'string' ? link.style : JSON.stringify(link.style || {}),
  })), baseUrl, lang), [profile, links, baseUrl, lang]);

  return <div className="flex flex-col items-center gap-3">
    <iframe title={tx('Preview profil publik', 'Public profile preview')}
      className="phone" style={{ padding: 0, display: 'block', border: 0 }}
      sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={html} />
    <a href={`${baseUrl}/@${encodeURIComponent(profile.handle)}`} target="_blank" rel="noreferrer" className="btn btn-g btn-sm text-[13px]">
      <ExternalLink size={14} strokeWidth={1.75} />
      <span>{tx('Buka halaman', 'Open page')}</span>
    </a>
  </div>;
};
