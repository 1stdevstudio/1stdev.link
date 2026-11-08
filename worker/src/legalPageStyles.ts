/* 1stdev.link legal editorial system · shared by Privacy and Terms SSR pages. */
export const LEGAL_PAGE_CSS = `
:root{color-scheme:light;--green:#18765d;--dark:#153c2d;--ink:#17362d;--muted:#52695e;--soft:#e3f3e7;--canvas:#f7f9f7;--white:#fff}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:100px}
body{margin:0;background:var(--canvas);color:var(--ink);font:15px/1.7 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--green)}a:focus-visible,summary:focus-visible{outline:3px solid #54b68a;outline-offset:4px;border-radius:5px}
.skip-link{position:absolute;top:-100px;left:16px;z-index:90;background:var(--dark);color:#fff;padding:12px 16px;border-radius:12px}.skip-link:focus{top:12px}
.shell{width:min(100% - 48px,1160px);margin-inline:auto}
.site-head{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.93);backdrop-filter:blur(16px);box-shadow:0 1px 0 rgba(21,60,45,.075)}
.site-head-inner{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:76px}
.brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--dark);white-space:nowrap}
.brand-mark{height:39px;width:39px;flex:0 0 39px}
.brand-name{font-size:22px;font-weight:800;letter-spacing:-.065em}
.brand-name em{font-style:normal;color:#0dad62}
.head-links{display:flex;gap:6px;align-items:center}
.head-links a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 15px;border-radius:12px;text-decoration:none;color:#4b6558;font-size:13px;font-weight:700}
.head-links a:hover,.head-links a[aria-current]{background:#eaf4ed;color:#145b41}
.head-links .lang{margin-left:8px;background:#f0f5f1;color:var(--dark)}
.page-hero{padding:62px 0 44px}
.breadcrumb{display:flex;align-items:center;gap:8px;color:#748c7e;font-size:12px;font-weight:700}
.breadcrumb a{color:#60796a;text-decoration:none}
.hero-layout{display:grid;grid-template-columns:minmax(0,1fr) 324px;gap:clamp(24px,5vw,72px);align-items:stretch;margin-top:23px}
.eyebrow{display:flex;align-items:center;gap:9px;color:var(--green);font-weight:850;font-size:11px;letter-spacing:.19em;text-transform:uppercase}
.eyebrow i{display:block;height:8px;width:8px;background:#25a36e;border-radius:50%;box-shadow:0 0 0 5px #e2f4e7}
.hero-title{margin:18px 0 19px;font-size:clamp(42px,5.5vw,72px);line-height:1.05;font-weight:800;letter-spacing:-.073em;color:var(--dark);text-wrap:balance}
.hero-title span{color:var(--green)}
.hero-intro{margin:0;max-width:690px;font-size:16px;line-height:1.8;color:var(--muted)}
.doc-meta{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:27px;font-size:12px;font-weight:650;color:#647d6e}
.meta-chip{display:inline-flex;align-items:center;padding:8px 12px;background:#eaf2ec;border-radius:100px}
.hero-aside{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:26px;overflow:hidden;border-radius:24px;padding:27px 26px;color:white;background:linear-gradient(150deg,#133d2e,#195a42 72%,#247455);box-shadow:0 18px 44px rgba(20,69,43,.13);min-height:260px}
.hero-aside::after{content:"";position:absolute;width:195px;height:195px;border-radius:50%;right:-85px;bottom:-96px;box-shadow:0 0 0 23px #ffffff08,0 0 0 47px #ffffff07;background:#ffffff08;pointer-events:none}
.hero-aside-icon{height:49px;width:49px;display:grid;place-items:center;border-radius:15px;background:#ffffff24}
.hero-aside-icon svg{width:24px;height:24px;stroke:#d7f7e5;fill:none;stroke-width:1.8}
.hero-aside-label{font-size:10px;letter-spacing:.18em;font-weight:800;color:#c0e7ce;text-transform:uppercase}
.hero-aside h2{font-size:23px;line-height:1.24;letter-spacing:-.035em;margin:12px 0 0;font-weight:790;max-width:230px}
.hero-aside p{font-size:12px;line-height:1.6;margin:8px 0 0;color:#c7e1cf;max-width:260px}
.summary-wrap{margin:5px 0 46px;padding:27px 31px 30px;background:var(--white);border-radius:25px;box-shadow:0 12px 40px rgba(24,79,45,.045)}
.section-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#4c8066;font-weight:850;margin:0}
.summary-heading{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}
.summary-heading h2{font-size:22px;letter-spacing:-.045em;color:var(--dark);margin:6px 0 0}
.summary-note{font-size:12px;color:#708979;margin:0}
.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin:26px 0 0;padding:0;list-style:none}
.summary-grid li{padding:16px 15px;background:#f2f7f3;border-radius:16px;color:#3d6050;font-size:12px;line-height:1.65}
.summary-num{display:block;color:var(--green);font-size:11px;font-weight:850;letter-spacing:.09em;margin-bottom:10px}
.reading-layout{display:grid;grid-template-columns:252px minmax(0,1fr);align-items:start;gap:clamp(30px,5vw,76px);padding-bottom:52px}
.reading-sidebar{position:sticky;top:101px;max-height:calc(100dvh - 120px);overflow:auto;padding:14px 10px 16px 0;scrollbar-width:thin}
.reading-sidebar .section-kicker{padding:0 12px;margin-bottom:13px}
.toc-list{display:flex;flex-direction:column;gap:2px}
.toc-list a{display:flex;gap:11px;align-items:baseline;min-height:39px;padding:9px 12px;text-decoration:none;border-radius:10px;color:#657a6d;font-size:12px;font-weight:650;line-height:1.55}
.toc-list a span{color:#8da797;font-size:10px;font-variant-numeric:tabular-nums}
.toc-list a:hover,.toc-list a:focus-visible{background:#e5f1e9;color:#165a42}
.sidebar-contact{margin:19px 10px 0;background:#e9f3ec;padding:18px;border-radius:16px}
.sidebar-contact strong{display:block;font-size:13px;color:#1f5139;line-height:1.4}
.sidebar-contact p{margin:6px 0 10px;font-size:11px;color:#607969}
.sidebar-contact a{font-size:12px;font-weight:750;overflow-wrap:anywhere}
.mobile-toc{display:none}
.article-content{min-width:0}
.article-overline{font-size:11px;letter-spacing:.17em;color:#749081;font-weight:850;text-transform:uppercase;margin:3px 0 4px}
.article-content>h2{font-size:31px;letter-spacing:-.055em;margin:0 0 23px;color:var(--dark)}
.article-content section{position:relative;padding:24px 0 31px;scroll-margin-top:110px}
.article-content section+section{box-shadow:0 -1px 0 rgba(21,60,45,.085)}
.section-count{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;margin-bottom:11px;background:#e2f1e6;border-radius:12px;color:var(--green);font-size:12px;font-weight:850}
.article-content h3{font-size:clamp(19px,2.2vw,24px);font-weight:770;line-height:1.35;letter-spacing:-.04em;color:var(--dark);margin:0 0 17px}
.article-content p{font-size:14px;line-height:1.94;color:#4e695a;margin:0 0 14px;max-width:78ch}
.contact-banner{margin:0 0 65px;background:#e5f2e9;padding:clamp(23px,4vw,39px);border-radius:25px;display:flex;justify-content:space-between;align-items:center;gap:22px}
.contact-banner h2{font-size:clamp(20px,3vw,29px);margin:8px 0;line-height:1.25;letter-spacing:-.05em}
.contact-banner p{font-size:13px;color:#557361;margin:0;max-width:620px}
.contact-actions{display:flex;flex-direction:column;align-items:stretch;gap:9px;flex:0 0 auto}
.contact-actions a{min-height:44px;padding:10px 17px;border-radius:12px;background:var(--green);color:white;text-decoration:none;text-align:center;font-size:12px;font-weight:750}
.contact-actions a.secondary{background:#fff;color:#24583e}
.site-footer{background:#fff;padding:27px 0;color:#6b8072}
.footer-inner{display:flex;justify-content:space-between;gap:17px;flex-wrap:wrap;font-size:12px}
.footer-inner a{color:#426951;text-decoration:none;font-weight:650}
@media(max-width:980px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.reading-layout{grid-template-columns:210px minmax(0,1fr);gap:25px}.hero-layout{grid-template-columns:minmax(0,1fr) 280px;gap:25px}}
@media(max-width:740px){
.shell{width:min(100% - 32px,1160px)}
.site-head-inner{min-height:64px}
.brand-name{font-size:19px}.brand-mark{height:34px;width:34px;flex-basis:34px}
.head-links{gap:2px}.head-links a{min-height:39px;padding:0 9px;font-size:11px}.head-links .lang{margin-left:0}
.page-hero{padding:34px 0 23px}.hero-layout{grid-template-columns:1fr;margin-top:16px;gap:24px}
.hero-title{font-size:clamp(39px,10vw,55px);margin:13px 0}.hero-intro{font-size:14px}
.hero-aside{min-height:190px;padding:23px;gap:10px}.hero-aside h2{font-size:21px}.hero-aside-icon{width:40px;height:40px}
.doc-meta{margin-top:19px}.summary-wrap{padding:23px 20px;margin-bottom:25px;border-radius:20px}
.summary-grid{gap:9px;margin-top:18px}.summary-grid li{padding:13px;font-size:11px}
.reading-layout{display:block}.reading-sidebar{display:none}
.mobile-toc{display:block;background:#eaf3ed;border-radius:18px;margin:0 0 31px;overflow:hidden}
.mobile-toc summary{padding:15px 18px;cursor:pointer;font-weight:750;font-size:13px}
.mobile-toc .toc-list{padding:0 11px 12px}
.article-content>h2{font-size:26px}.article-content section{padding:19px 0 26px}
.contact-banner{flex-direction:column;align-items:stretch;margin:0 0 35px}.contact-actions{flex-direction:row;flex-wrap:wrap}.contact-actions a{flex:1 1 175px}
}
@media(max-width:390px){.shell{width:min(100% - 28px,1160px)}.brand{gap:5px}.brand-name{font-size:17px}.head-links a{font-size:10px;padding:0 7px}.summary-grid{grid-template-columns:1fr}.hero-aside{min-height:175px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;
