/* ═══════════════════════════════════════════════════════════════
   ANDREA CIOSTI CETICA — app.js
   Router SPA, Markdown loader, SEO manager, UI interactions
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── STATO GLOBALE ───────────────────────────────────────────── */
const state = {
  lang: localStorage.getItem('acc_lang') || 'it',
  settings: null,
  currentPath: null,
};

/* ── UTILS ───────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

async function fetchText(url) {
  const res = await fetch(url + '?v=' + Date.now());
  if (!res.ok) throw new Error(`404: ${url}`);
  return res.text();
}

/**
 * Legge il frontmatter YAML semplice da un file Markdown.
 * Supporta: chiave: valore (stringhe, multiline con |)
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: raw };
  const metaStr = match[1];
  const body = raw.slice(match[0].length).trim();
  const meta = {};
  const lines = metaStr.split('\n');
  let currentKey = null;
  for (const line of lines) {
    const kv = line.match(/^(\w[\w_-]*):\s*(.*)/);
    if (kv) {
      currentKey = kv[1];
      meta[currentKey] = kv[2].trim().replace(/^["']|["']$/g, '');
    } else if (currentKey && line.startsWith('  ')) {
      meta[currentKey] += '\n' + line.trim();
    }
  }
  return { meta, body };
}

/**
 * Legge la sezione nella lingua corrente.
 * Formato: testo italiano ... ---EN--- testo inglese
 */
function extractLang(text, lang) {
  if (!text) return '';
  const parts = text.split(/\n---EN---\n/i);
  if (lang === 'en' && parts[1]) return parts[1].trim();
  return parts[0].trim();
}

/** Aggiorna tutti gli elementi con data-it / data-en */
function applyLang(lang, root = document) {
  $$('[data-it]', root).forEach(el => {
    const key = lang === 'en' ? 'en' : 'it';
    const val = el.dataset[key];
    if (!val) return;
    if (el.children.length === 0) { el.textContent = val; return; }
    // L'elemento contiene icone (es. la freccia nei pulsanti): cambia solo il testo
    const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (tn) tn.textContent = ' ' + val + ' ';
  });
  $$('[data-it-placeholder]', root).forEach(el => {
    const key = lang === 'en' ? 'enPlaceholder' : 'itPlaceholder';
    el.placeholder = el.dataset[key] || el.placeholder;
  });
  $('#lang-label').textContent = lang === 'it' ? 'EN' : 'IT';
}

/* ── SETTINGS ────────────────────────────────────────────────── */
async function loadSettings() {
  if (state.settings) return state.settings;
  try {
    const raw = await fetchText('content/settings.md');
    const { meta } = parseFrontmatter(raw);
    state.settings = meta;
    applySettings(meta);
    return meta;
  } catch (e) {
    console.warn('settings.md non trovato, uso defaults');
    state.settings = {};
    return {};
  }
}

function applySettings(s) {
  // Social links
  const setHref = (id, val) => { const el = $(id); if (el && val && val !== '#') el.href = val; };
  setHref('#nav-instagram',   s.instagram);
  setHref('#nav-youtube',     s.youtube);
  setHref('#nav-spotify',     s.spotify);
  setHref('#footer-instagram', s.instagram);
  setHref('#footer-youtube',  s.youtube);
  setHref('#footer-spotify',  s.spotify);
  // Contatti footer
  if (s.email) {
    const emailLink = $('#footer-email-link');
    if (emailLink) { emailLink.href = `mailto:${s.email}`; emailLink.textContent = s.email; }
  }
  if (s.telefono) { const el = $('#footer-phone'); if (el) el.textContent = s.telefono; }
  if (s.citta)    { const el = $('#footer-city');  if (el) el.textContent = s.citta;    }
  // Copyright
  const copy = $('#footer-copy');
  if (copy && s.anno) copy.textContent = `© ${s.anno} Andrea Ciosti Cetica — All rights reserved`;
}

/* ── SEO MANAGER ─────────────────────────────────────────────── */
function updateSEO({ title, description, slug, image } = {}) {
  const s = state.settings || {};
  const base = s.dominio || 'https://andreaciosticetica.com';
  const defaultImg = `${base}/assets/images/og-cover.jpg`;

  const fullTitle = title
    ? `${title} — Andrea Ciosti Cetica`
    : (state.lang === 'it' ? s.seo_titolo_it : s.seo_titolo_en) || 'Andrea Ciosti Cetica — Drummer';

  const desc = description
    || (state.lang === 'it' ? s.seo_desc_it : s.seo_desc_en)
    || 'Batterista, percussionista e sound lover. Passione, groove e ricerca sonora.';

  const url  = slug ? `${base}/${slug}` : base;
  const img  = image ? `${base}/assets/images/${image}` : defaultImg;

  document.title = fullTitle;
  setMeta('name',     'description',    desc);
  setMeta('property', 'og:title',       fullTitle, 'og-title');
  setMeta('property', 'og:description', desc,      'og-desc');
  setMeta('property', 'og:url',         url,       'og-url');
  setMeta('property', 'og:image',       img,       'og-image');
  setMeta('name',     'twitter:title',       fullTitle, 'tw-title');
  setMeta('name',     'twitter:description', desc,      'tw-desc');
  setMeta('name',     'twitter:image',       img,       'tw-image');
  const canon = $('#canonical-tag');
  if (canon) canon.href = url;
}

function setMeta(attr, name, content, id) {
  let el = id ? document.getElementById(id) : document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.content = content;
}

/* ── ROUTER ──────────────────────────────────────────────────── */
const routes = {
  '/':          renderHome,
  '/bio':       renderBio,
  '/musica':    renderMusica,
  '/gallery':   renderGallery,
  '/blog':      renderBlog,
  '/lezioni':   renderLezioni,
  '/contatti':  renderContatti,
  '/privacy':   renderPrivacy,
  '/cookie':    renderCookie,
};

function getPath() {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

async function navigate(path, push = true) {
  if (push && path !== getPath()) {
    history.pushState({}, '', path);
  }
  state.currentPath = path;
  updateActiveNav(path);
  scrollTo({ top: 0, behavior: 'instant' });

  const app = $('#app');
  app.innerHTML = '<div style="min-height:60vh;display:flex;align-items:center;justify-content:center;"><svg class="loader-logo" style="width:48px;height:48px;animation:loaderPulse 1.2s infinite" viewBox="0 0 60 60" fill="none"><polygon points="30,4 56,52 4,52" stroke="#e8005a" stroke-width="2.5" fill="none"/><circle cx="30" cy="38" r="7" fill="#e8005a"/></svg></div>';

  // Articoli /blog/:slug
  if (path.startsWith('/blog/')) {
    const slug = path.replace('/blog/', '');
    await renderArticle(slug);
    applyLang(state.lang);
    initReveal();
    return;
  }

  const render = routes[path];
  if (render) {
    await render();
  } else {
    render404();
  }

  applyLang(state.lang);
  initReveal();
  closeMobileMenu();
}

function updateActiveNav(path) {
  $$('.nav-links a, .mobile-menu a').forEach(a => {
    a.classList.toggle('active', a.dataset.link === path || (path.startsWith('/blog/') && a.dataset.link === '/blog'));
  });
}

/* ── INTERCEPT LINKS ─────────────────────────────────────────── */
document.addEventListener('click', e => {
  const a = e.target.closest('[data-link]');
  if (!a) return;
  e.preventDefault();
  navigate(a.dataset.link);
});

window.addEventListener('popstate', () => navigate(getPath(), false));


/* ── SPOTIFY ─────────────────────────────────────────────────── */
// Player ufficiale di Spotify del profilo artista (da settings.md → spotify)
function spotifyEmbedHTML(height = 352) {
  const url = (state.settings && state.settings.spotify) || '';
  const m = url.match(/artist\/([A-Za-z0-9]+)/);
  if (!m) return '';
  return `<iframe class="spotify-embed" src="https://open.spotify.com/embed/artist/${m[1]}?utm_source=generator&theme=0" width="100%" height="${height}" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify — Andrea Ciosti Cetica"></iframe>`;
}

/* ── HOME ────────────────────────────────────────────────────── */
async function renderHome() {
  const [homeMd, newsMd, s, musicaMd] = await Promise.all([
    fetchText('content/home.md').catch(() => ''),
    fetchText('content/news.md').catch(() => ''),
    loadSettings(),
    fetchText('content/musica.md').catch(() => ''),
  ]);

  const { meta: hMeta, body: hBody } = parseFrontmatter(homeMd);
  const heroIt = extractLang(hBody, 'it');
  const heroEn = extractLang(hBody, 'en');
  const heroText = state.lang === 'it' ? heroIt : heroEn;

  // Carica news
  const newsArticles = await loadNewsIndex(newsMd);

  updateSEO({});

  $('#app').innerHTML = `
    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-bg-img"></div>
      <div class="hero-bg-overlay"></div>
      <div class="hero-logo-bg">
        <svg viewBox="0 0 200 200" fill="none">
          <polygon points="100,10 190,175 10,175" stroke="#e8005a" stroke-width="1" fill="none" opacity="0.5"/>
          <circle cx="100" cy="140" r="30" fill="#e8005a" opacity="0.3"/>
        </svg>
      </div>
      <div class="hero-content">
        <p class="hero-eyebrow" data-it="// BATTERISTA · PERCUSSIONISTA" data-en="// DRUMMER · PERCUSSIONIST">// BATTERISTA · PERCUSSIONISTA</p>
        <h1 class="hero-title">ANDREA<br>CIOSTI<br>CETICA</h1>
        <p class="hero-role" data-it="${hMeta.ruolo_it || 'DRUMMER'}" data-en="${hMeta.ruolo_en || 'DRUMMER'}">${state.lang === 'it' ? (hMeta.ruolo_it || 'DRUMMER') : (hMeta.ruolo_en || 'DRUMMER')}</p>
        <div class="hero-divider"></div>
        <p class="hero-desc" data-it="${hMeta.tagline_it || ''}" data-en="${hMeta.tagline_en || ''}">${state.lang === 'it' ? (hMeta.tagline_it || '') : (hMeta.tagline_en || '')}</p>
        <div class="hero-actions">
          <a href="/bio" data-link="/bio" class="btn-primary" data-it="SCOPRI DI PIÙ" data-en="DISCOVER MORE">
            SCOPRI DI PIÙ
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a href="${s.spotify || '#'}" target="_blank" rel="noopener" class="btn-play btn-spotify" aria-label="Spotify">
            <div class="play-circle spotify-circle">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z"/></svg>
            </div>
            <div class="play-label">
              <span class="play-label-main" data-it="ASCOLTA IL MIO BRANO" data-en="LISTEN TO MY TRACK">${state.lang === 'it' ? 'ASCOLTA IL MIO BRANO' : 'LISTEN TO MY TRACK'}</span>
              <span class="play-label-sub" data-it="su Spotify" data-en="on Spotify">${state.lang === 'it' ? 'su Spotify' : 'on Spotify'}</span>
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- BIO preview -->
    <section class="bio-section">
      <div class="section-inner bio-grid">
        <div class="bio-image reveal">
          <div class="bio-image-line"></div>
          <iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/FeCcAQFvMUE" title="Andrea Ciosti Cetica" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" style="display:block;border:0;"></iframe>
        </div>
        <div class="bio-text reveal">
          <span class="section-label">BIO</span>
          <h2 class="section-title" data-it="CHI SONO" data-en="ABOUT ME">${state.lang === 'it' ? 'CHI SONO' : 'ABOUT ME'}</h2>
          <div class="bio-short">${marked.parse(extractLang(hBody, state.lang).slice(0, 600))}</div>
          <a href="/bio" data-link="/bio" class="btn-text" data-it="LEGGI DI PIÙ" data-en="READ MORE">
            ${state.lang === 'it' ? 'LEGGI DI PIÙ' : 'READ MORE'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </section>

    <!-- DA DOVE VUOI INIZIARE: tre porte -->
    ${renderDoors(newsArticles, parseMusicaVideos(musicaMd), s)}

    <!-- MUSIC preview -->
    <section class="music-section">
      <div class="section-inner">
        <div class="music-layout">
          <div class="music-player-visual reveal">
            <div class="music-disc" id="music-disc">
              <div class="disc-ring-1"></div>
              <div class="disc-inner">
                <svg class="disc-logo" viewBox="0 0 60 60" fill="none">
                  <polygon points="30,4 56,52 4,52" stroke="#e8005a" stroke-width="2.5" fill="none"/>
                  <circle cx="30" cy="38" r="7" fill="#e8005a"/>
                </svg>
              </div>
            </div>
            <button class="music-play-btn" id="disc-play-btn" aria-label="Play">
              <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
          </div>
          <div class="reveal">
            <span class="section-label" data-it="MUSICA" data-en="MUSIC">${state.lang === 'it' ? 'MUSICA' : 'MUSIC'}</span>
            <h2 class="section-title" data-it="ASCOLTA" data-en="LISTEN">${state.lang === 'it' ? 'ASCOLTA' : 'LISTEN'}</h2>
            <div class="spotify-wrap">${spotifyEmbedHTML(232)}</div>
            <br>
            <a href="/musica" data-link="/musica" class="btn-text" data-it="VAI A TUTTA LA MUSICA" data-en="ALL MUSIC">
              ${state.lang === 'it' ? 'VAI A TUTTA LA MUSICA' : 'ALL MUSIC'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- NEWS preview -->
    ${newsArticles.length ? `
    <section class="news-section">
      <div class="section-inner">
        <span class="section-label reveal" data-it="ULTIME NEWS" data-en="LATEST NEWS">${state.lang === 'it' ? 'ULTIME NEWS' : 'LATEST NEWS'}</span>
        <div class="news-grid">
          ${newsArticles.slice(0, 3).map(a => newsCardHTML(a)).join('')}
        </div>
        <br><br>
        <a href="/blog" data-link="/blog" class="btn-text reveal" data-it="TUTTE LE NEWS" data-en="ALL NEWS">
          ${state.lang === 'it' ? 'TUTTE LE NEWS' : 'ALL NEWS'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
    </section>` : ''}
  `;

  initDiscPlay();
  pageEnter();
}

/** Home: "Da dove vuoi iniziare?" — tre porte per tre tipi di visitatore */
function renderDoors(articles, videos, s) {
  const it = state.lang === 'it';
  const t = (a, b) => (it ? a : b);
  const lesson = articles.find(a => a.categoria === 'lezione') || articles[0];
  const video = videos.find(v => v.badgeIt) || videos[0];
  const email = s.email || 'andreacetica@gmail.com';
  const subject = encodeURIComponent(t('Richiesta: live / studio / collaborazione', 'Enquiry: live / studio / collaboration'));
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  const badge = video ? (it ? video.badgeIt : video.badgeEn) : '';

  return `
    <section class="doors-section">
      <div class="section-inner">
        <span class="section-label reveal" data-it="DA DOVE VUOI INIZIARE?" data-en="WHERE DO YOU WANT TO START?">${t('DA DOVE VUOI INIZIARE?', 'WHERE DO YOU WANT TO START?')}</span>
        <div class="doors-grid">

          <a class="door reveal" href="${lesson ? '/blog/' + lesson.slug : '/lezioni'}" data-link="${lesson ? '/blog/' + lesson.slug : '/lezioni'}">
            <span class="door-num">01</span>
            <h3 class="door-q">${t('Vuoi imparare a suonare?', 'Want to learn to play?')}</h3>
            ${lesson ? `
            <div class="door-preview door-preview-text cat-${lesson.categoria || 'news'}">
              <span class="door-kicker">${t('ULTIMA LEZIONE', 'LATEST LESSON')}</span>
              <span class="door-preview-title">${lesson.titolo}</span>
            </div>` : `<p class="door-text">${t('Video lezioni, esercizi e il mio metodo.', 'Video lessons, exercises and my method.')}</p>`}
            <span class="door-cta">${lesson ? t('Leggi la lezione', 'Read the lesson') : t('Vai alla didattica', 'Go to lessons')} ${arrow}</span>
          </a>

          <a class="door reveal" href="/contatti" data-link="/contatti">
            <span class="door-num">02</span>
            <h3 class="door-q">${t('Cerchi un batterista?', 'Looking for a drummer?')}</h3>
            <p class="door-text">${t('Live, studio, orchestre e collaborazioni. Vuoi collaborare? Fammi una proposta!', 'Live shows, studio, orchestras and collaborations. Want to work together? Send me a proposal!')}</p>
            <span class="door-cta">${t('Scrivimi', 'Write to me')} ${arrow}</span>
          </a>

          <a class="door reveal" href="/musica" data-link="/musica">
            <span class="door-num">03</span>
            <h3 class="door-q">${t('Vuoi ascoltare?', 'Want to listen?')}</h3>
            ${video ? `
            <div class="door-preview door-preview-video">
              <img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="${video.titolo}" loading="lazy" />
              <span class="door-play"><svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg></span>
              ${badge ? `<span class="door-badge">★ ${badge}</span>` : ''}
            </div>
            <span class="door-video-title">${video.titolo}</span>` : `<p class="door-text">${t('Video, cover e brani originali.', 'Videos, covers and original tracks.')}</p>`}
            <span class="door-cta">${t('Guarda i video', 'Watch the videos')} ${arrow}</span>
          </a>

        </div>
      </div>
    </section>`;
}

function renderServiceCards(s) {
  const services = [
    {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
      title_it: 'LIVE',   title_en: 'LIVE', link: '/bio',
      desc_it: s.servizio_live_it   || 'Performance ed energia dal vivo.',
      desc_en: s.servizio_live_en   || 'Performance and live energy.',
    },
    {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>`,
      title_it: 'STUDIO', title_en: 'STUDIO', link: '/musica',
      desc_it: s.servizio_studio_it || 'Registrazioni, produzioni e collaborazioni.',
      desc_en: s.servizio_studio_en || 'Recordings, productions and collaborations.',
    },
    {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/></svg>`,
      title_it: 'DIDATTICA', title_en: 'TEACHING', link: '/lezioni',
      desc_it: s.servizio_didattica_it || 'Lezioni, video ed esercizi per batteristi di ogni livello.',
      desc_en: s.servizio_didattica_en || 'Lessons, videos and exercises for drummers of every level.',
    },
    {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3"/><path d="M8 7h7M8 10h5"/></svg>`,
      title_it: 'IL LIBRO', title_en: 'THE BOOK', link: '/lezioni',
      desc_it: s.servizio_libro_it || '“Suona la Batteria”: il mio metodo, in italiano e in inglese.',
      desc_en: s.servizio_libro_en || '“Suona la Batteria”: my method, in Italian and English.',
    },
  ];

  return services.map(sv => `
    <a class="service-card reveal" href="${sv.link}" data-link="${sv.link}">
      <div class="service-icon">${sv.icon}</div>
      <h3 class="service-title" data-it="${sv.title_it}" data-en="${sv.title_en}">${state.lang === 'it' ? sv.title_it : sv.title_en}</h3>
      <p class="service-desc" data-it="${sv.desc_it}" data-en="${sv.desc_en}">${state.lang === 'it' ? sv.desc_it : sv.desc_en}</p>
    </a>
  `).join('');
}

async function loadTrackListPreview() {
  try {
    const raw = await fetchText('content/musica.md');
    const tracks = parseTracks(raw);
    const container = $('#track-list-home');
    if (!container) return;
    container.innerHTML = tracks.slice(0, 4).map((t, i) => trackItemHTML(t, i)).join('');
    initTrackItems();
  } catch (e) {
    const c = $('#track-list-home');
    if (c) c.innerHTML = '';
  }
}

/* ── BIO ─────────────────────────────────────────────────────── */
async function renderBio() {
  const [raw, s] = await Promise.all([fetchText('content/bio.md').catch(() => ''), loadSettings()]);
  const { meta, body } = parseFrontmatter(raw);
  const text = extractLang(body, state.lang);
  const titleIt = meta.titolo_it || 'Chi Sono';
  const titleEn = meta.titolo_en || 'About Me';
  const title = state.lang === 'it' ? titleIt : titleEn;

  updateSEO({
    title,
    description: meta[`seo_desc_${state.lang}`],
    slug: 'bio',
    image: meta.immagine_og,
  });

  $('#app').innerHTML = `
    <div class="bio-page page-enter">
      <div class="bio-page-inner">
        <span class="section-label reveal" data-it="BIO" data-en="BIO">BIO</span>
        <h1 class="section-title reveal" data-it="${titleIt}" data-en="${titleEn}">${title}</h1>
        <div class="bio-page-grid">
          <div class="bio-page-img reveal">
            ${meta.immagine ? `<img src="assets/images/${meta.immagine}" alt="${title}">` : placeholderImg('bio-portrait')}
          </div>
          <div class="bio-page-content reveal">
            ${marked.parse(text)}
          </div>
        </div>
      </div>
    </div>
  `;
  pageEnter();
}

/* ── MUSICA ──────────────────────────────────────────────────── */
async function renderMusica() {
  const raw = await fetchText('content/musica.md').catch(() => '');
  const { meta, body } = parseFrontmatter(raw);
  const tracks = parseTracks(raw);
  const videos = parseMusicaVideos(raw);
  const ytChannel = (state.settings && state.settings.youtube) || '';
  const titleIt = meta.titolo_it || 'Musica';
  const titleEn = meta.titolo_en || 'Music';
  const title = state.lang === 'it' ? titleIt : titleEn;

  updateSEO({ title, slug: 'musica', description: meta[`seo_desc_${state.lang}`] });

  $('#app').innerHTML = `
    <div class="musica-page page-enter">
      <div class="page-hero">
        <div class="page-hero-inner">
          <span class="section-label" data-it="MUSICA" data-en="MUSIC">MUSICA</span>
          <h1 class="page-hero-title" data-it="${titleIt}" data-en="${titleEn}">${title}</h1>
        </div>
      </div>
      <div class="musica-page-inner" style="padding-top:3rem;">
        <div class="music-layout">
          <div class="music-player-visual reveal">
            <div class="music-disc playing" id="music-disc">
              <div class="disc-ring-1"></div>
              <div class="disc-inner">
                <svg class="disc-logo" viewBox="0 0 60 60" fill="none">
                  <polygon points="30,4 56,52 4,52" stroke="#e8005a" stroke-width="2.5" fill="none"/>
                  <circle cx="30" cy="38" r="7" fill="#e8005a"/>
                </svg>
              </div>
            </div>
          </div>
          <div class="reveal">
            <span class="section-label" data-it="ASCOLTA SU SPOTIFY" data-en="LISTEN ON SPOTIFY">${state.lang === 'it' ? 'ASCOLTA SU SPOTIFY' : 'LISTEN ON SPOTIFY'}</span>
            <div class="spotify-wrap">${spotifyEmbedHTML(352)}</div>
          </div>
        </div>
      </div>
      ${videos.length ? `
      <section class="musica-videos">
        <div class="musica-videos-inner">
          <span class="section-label reveal" data-it="VIDEO" data-en="VIDEOS">VIDEO</span>
          <h2 class="section-title reveal" data-it="GUARDA" data-en="WATCH">${state.lang === 'it' ? 'GUARDA' : 'WATCH'}</h2>
          <div class="musica-video-grid">
            ${videos.map((v, i) => musicaVideoHTML(v, i)).join('')}
          </div>
          ${ytChannel ? `
          <div class="musica-videos-more reveal">
            <a href="${ytChannel}" target="_blank" rel="noopener" class="btn-outline yt-more">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
              <span data-it="TUTTI I VIDEO SUL MIO CANALE YOUTUBE" data-en="ALL VIDEOS ON MY YOUTUBE CHANNEL">${state.lang === 'it' ? 'TUTTI I VIDEO SUL MIO CANALE YOUTUBE' : 'ALL VIDEOS ON MY YOUTUBE CHANNEL'}</span>
            </a>
          </div>` : ''}
        </div>
      </section>` : ''}
    </div>
  `;
  initMusicaVideos();
  pageEnter();
}

/**
 * Video nella pagina Musica. Formato in musica.md:
 * - video: ID_YOUTUBE | Titolo | Etichetta IT | Etichetta EN
 * Se un video su YouTube non si può vedere fuori da YouTube (copyright),
 * scrivi yt: davanti all'ID (es. yt:abc123) e il click aprirà YouTube.
 */
function parseMusicaVideos(raw) {
  const out = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^[-*]\s+video:\s*(.+)$/i);
    if (!m) continue;
    const [idRaw = '', titolo = '', tagIt = '', tagEn = '', badgeIt = '', badgeEn = '', badgeLink = ''] = m[1].split('|').map(p => p.trim());
    if (!idRaw) continue;
    const external = /^yt:/i.test(idRaw);
    out.push({ id: idRaw.replace(/^yt:/i, ''), external, titolo, tagIt, tagEn: tagEn || tagIt,
               badgeIt, badgeEn: badgeEn || badgeIt, badgeLink });
  }
  return out;
}

function musicaVideoHTML(v, i) {
  const tag = state.lang === 'en' ? v.tagEn : v.tagIt;
  const badge = state.lang === 'en' ? v.badgeEn : v.badgeIt;
  const badgeHTML = !badge ? '' : (v.badgeLink
    ? `<a class="musica-video-badge" href="${v.badgeLink}" target="_blank" rel="noopener">★ ${badge}</a>`
    : `<span class="musica-video-badge">★ ${badge}</span>`);
  const thumb = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
  const ytUrl = `https://www.youtube.com/watch?v=${v.id}`;
  return `
    <div class="musica-video-card reveal${i === 0 ? ' featured' : ''}">
      ${badgeHTML}
      <a class="musica-video-thumb" href="${ytUrl}" target="_blank" rel="noopener"
         data-video-id="${v.id}" data-external="${v.external ? '1' : '0'}" aria-label="${v.titolo}">
        <img src="${thumb}" alt="${v.titolo}" loading="lazy" />
        <span class="musica-video-play"><svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg></span>
      </a>
      <div class="musica-video-body">
        <h3 class="musica-video-title">${v.titolo}</h3>
        ${tag ? `<span class="musica-video-tag">${tag}</span>` : ''}
      </div>
    </div>
  `;
}

/** Click sulla copertina: carica il video nella pagina (o apre YouTube se segnato con yt:) */
function initMusicaVideos() {
  $$('.musica-video-thumb').forEach(a => {
    a.addEventListener('click', e => {
      if (a.dataset.external === '1') return; // lascia aprire YouTube
      e.preventDefault();
      const id = a.dataset.videoId;
      const wrap = document.createElement('div');
      wrap.className = 'musica-video-frame';
      wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${a.getAttribute('aria-label') || ''}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="display:block;border:0;width:100%;height:100%;"></iframe>`;
      a.replaceWith(wrap);
    });
  });
}

function parseTracks(raw) {
  const tracks = [];
  const lines = raw.split('\n');
  let inList = false;
  for (const line of lines) {
    // Cerca righe tipo: - Titolo Brano | 3:45 | genere
    if (/^[-*]\s+video:/i.test(line)) continue;
    const m = line.match(/^[-*]\s+(.+?)\s*\|\s*([\d:]+)(?:\s*\|\s*(.+))?/);
    if (m) {
      tracks.push({ nome: m[1].trim(), durata: m[2].trim(), meta: m[3] ? m[3].trim() : '' });
    }
  }
  return tracks;
}

function trackItemHTML(t, i) {
  return `
    <div class="track-item" data-index="${i}">
      <div class="track-play">
        <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
      </div>
      <div class="track-info">
        <div class="track-name">${t.nome}</div>
        ${t.meta ? `<div class="track-meta">${t.meta}</div>` : ''}
      </div>
      <div class="track-duration">${t.durata}</div>
    </div>
  `;
}

function initTrackItems() {
  $$('.track-item').forEach(item => {
    item.addEventListener('click', () => {
      $$('.track-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const disc = $('#music-disc');
      if (disc) disc.classList.add('playing');
    });
  });
}

function initDiscPlay() {
  const btn = $('#disc-play-btn');
  const disc = $('#music-disc');
  if (!btn || !disc) return;
  btn.addEventListener('click', () => {
    disc.classList.toggle('playing');
  });
}

/* ── GALLERY ─────────────────────────────────────────────────── */
async function renderGallery() {
  const raw = await fetchText('content/gallery.md').catch(() => '');
  const { meta, body } = parseFrontmatter(raw);
  const photos = parseGallery(body);
  const titleIt = meta.titolo_it || 'Gallery';
  const titleEn = meta.titolo_en || 'Gallery';
  const title = state.lang === 'it' ? titleIt : titleEn;

  updateSEO({ title, slug: 'gallery', description: meta[`seo_desc_${state.lang}`] });

  $('#app').innerHTML = `
    <div class="gallery-page page-enter">
      <div class="page-hero">
        <div class="p
        
        
        age-hero-inner">
          <span class="section-label" data-it="GALLERY" data-en="GALLERY">GALLERY</span>
          <h1 class="page-hero-title" data-it="${titleIt}" data-en="${titleEn}">${title}</h1>
        </div>
      </div>
      <div class="gallery-page-inner">
          ${photos.map((p, i) => `
            <div class="gallery-page-item reveal" data-index="${i}" data-src="${p.src}">
              ${p.src.startsWith('assets/') ? '<img src="' + p.src + '" alt="' + (p.alt || '') + '" loading="lazy" />' + (p.alt ? '<span class="gallery-caption">' + p.alt + '</span>' : '') : placeholderImg('gallery-' + i)}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <!-- Lightbox -->
    <div class="lightbox" id="lightbox">
      <button class="lightbox-close" id="lightbox-close" aria-label="Chiudi">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <img class="lightbox-img" id="lightbox-img" src="" alt="" />
    </div>
  `;

  initLightbox();
  pageEnter();
}

function parseGallery(body) {
  const photos = [];
  const lines = body.split('\n');
  for (const line of lines) {
    // Formato: - src/immagine.jpg | Didascalia
    const m = line.match(/^[-*]\s+([^\s|]+)\s*(?:\|\s*(.+))?/);
    if (m) photos.push({ src: m[1].trim(), alt: m[2] ? m[2].trim() : '' });
  }
  // Se non ci sono foto definite, genera placeholders
  if (!photos.length) {
    for (let i = 0; i < 9; i++) photos.push({ src: '', alt: 'Live ' + (i + 1) });
  }
  return photos;
}

function initLightbox() {
  const lightbox = $('#lightbox');
  const img = $('#lightbox-img');
  const closeBtn = $('#lightbox-close');
  if (!lightbox) return;

  $$('.gallery-page-item').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.dataset.src;
      if (!src) return;
      img.src = src;
      img.alt = item.querySelector('img')?.alt || '';
      lightbox.classList.add('open');
    });
  });

  closeBtn?.addEventListener('click', () => lightbox.classList.remove('open'));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lightbox.classList.remove('open'); });
}

/* ── BLOG LIST ───────────────────────────────────────────────── */
async function renderBlog() {
  const raw = await fetchText('content/blog.md').catch(() => '');
  const articles = await loadBlogIndex(raw);
  const it = state.lang === 'it';

  updateSEO({
    title: 'News',
    slug: 'blog',
    description: it
      ? 'Lezioni, nozioni e storie di batteristi e percussionisti, a cura di Andrea Ciosti Cetica.'
      : 'Lessons, know-how and stories of drummers and percussionists, by Andrea Ciosti Cetica.',
  });

  const cats = ['lezione', 'nozione', 'storia'].filter(c => articles.some(a => a.categoria === c));

  $('#app').innerHTML = `
    <div class="page-enter">
      <div class="page-hero">
        <div class="page-hero-inner">
          <span class="section-label" data-it="NEWS" data-en="NEWS">NEWS</span>
          <h1 class="page-hero-title" data-it="LEZIONI, NOZIONI E STORIE" data-en="LESSONS, KNOW-HOW AND STORIES">${it ? 'LEZIONI, NOZIONI E STORIE' : 'LESSONS, KNOW-HOW AND STORIES'}</h1>
          <p class="page-hero-sub" data-it="Ogni settimana un nuovo articolo sul mondo della batteria e delle percussioni." data-en="A new article every week about the world of drums and percussion.">${it ? 'Ogni settimana un nuovo articolo sul mondo della batteria e delle percussioni.' : 'A new article every week about the world of drums and percussion.'}</p>
        </div>
      </div>
      ${cats.length > 1 ? `
      <div class="blog-filters">
        <button class="blog-filter active" data-cat="">${it ? 'Tutti' : 'All'}</button>
        ${cats.map(c => `<button class="blog-filter" data-cat="${c}">${categoriaLabel(c)}</button>`).join('')}
      </div>` : ''}
      <div class="blog-list">
        ${articles.length
          ? articles.map(a => newsCardHTML(a)).join('')
          : `<p style="color:var(--grey3);grid-column:1/-1">${it ? 'Il primo articolo arriva presto.' : 'The first article is coming soon.'}</p>`
        }
      </div>
    </div>
  `;
  $$('.blog-filter').forEach(btn => btn.addEventListener('click', () => {
    $$('.blog-filter').forEach(b => b.classList.toggle('active', b === btn));
    const c = btn.dataset.cat;
    $$('.blog-list .news-card').forEach(card => {
      card.style.display = (!c || card.dataset.cat === c) ? '' : 'none';
    });
  }));
  pageEnter();
}

/* ── ARTICLE ─────────────────────────────────────────────────── */
async function renderArticle(slug) {
  let raw;
  try {
    raw = await fetchText(`content/articoli/${slug}.md`);
  } catch {
    render404();
    return;
  }
  const { meta, body } = parseFrontmatter(raw);
  if (isBozza(meta) && !IS_LOCAL) { render404(); return; }
  const tit  = meta[`titolo_${state.lang}`]  || meta.titolo_it || slug;
  const desc  = meta[`seo_desc_${state.lang}`] || meta[`descrizione_${state.lang}`] || '';
  const data  = meta.data ? formatDate(meta.data) : '';
  const tag   = meta.tag || categoriaLabel(meta.categoria);
  const img   = meta.immagine || '';
  const text  = extractLang(body, state.lang);
  const bozzaBanner = isBozza(meta)
    ? `<div class="bozza-banner">BOZZA — visibile solo in locale. Per pubblicarla cambia <code>stato: bozza</code> in <code>stato: pubblicato</code> nel file <code>content/articoli/${slug}.md</code> e fai git push.</div>`
    : '';

  updateSEO({ title: tit, description: desc, slug: `blog/${slug}`, image: img });

  $('#app').innerHTML = `
    <div class="page-enter">
      <div class="article-page">
        <div class="article-back">
          <a href="/blog" data-link="/blog" class="btn-text" data-it="← TUTTI GLI ARTICOLI" data-en="← ALL ARTICLES">
            ${state.lang === 'it' ? '← TUTTI GLI ARTICOLI' : '← ALL ARTICLES'}
          </a>
        </div>
        ${bozzaBanner}
        <div class="article-header">
          <div class="article-meta">
            ${data ? `<span class="article-date">${data}</span>` : ''}
            ${tag  ? `<span class="article-tag">${tag}</span>`  : ''}
          </div>
          <h1 class="article-title">${tit}</h1>
        </div>
        ${img ? `<div class="article-cover"><img src="assets/images/${img}" alt="${tit}" /></div>` : ''}
        <div class="article-body">${marked.parse(text)}</div>
      </div>
    </div>
  `;
  pageEnter();
}

/* ── LEZIONI (DIDATTICA) ─────────────────────────────────────── */
async function renderLezioni() {
  const [raw, blogRaw] = await Promise.all([
    fetchText('content/lezioni.md').catch(() => ''),
    fetchText('content/blog.md').catch(() => ''),
  ]);
  const { meta, body } = parseFrontmatter(raw);
  const videos = parseLezioniVideos(body);
  const allTips = await loadBlogIndex(blogRaw);
  const tips = allTips.some(a => a.categoria)
    ? allTips.filter(a => a.categoria === 'lezione' || a.categoria === 'nozione')
    : allTips;

  const titleIt = meta.titolo_it || 'Didattica';
  const titleEn = meta.titolo_en || 'Lessons';
  const title = state.lang === 'it' ? titleIt : titleEn;

  const L = (k) => state.lang === 'en' ? (meta[k + '_en'] || meta[k + '_it'] || '') : (meta[k + '_it'] || '');
  const libroTitolo = meta.libro_titolo || '';
  const libroSottotitolo = L('libro_sottotitolo');
  const libroDesc = L('libro_desc');
  const libroDettagli = L('libro_dettagli').split('·').map(t => t.trim()).filter(Boolean);
  const imgSrc = (raw) => !raw ? '' : (/^https?:\/\//.test(raw) ? raw : `assets/images/${raw}`);
  const libroImgIt = imgSrc(meta.libro_immagine || '');
  const libroImgEn = imgSrc(meta.libro_immagine_en || '');
  const libroTitoloEn = meta.libro_titolo_en || '';
  const libroTitoloShown = (state.lang === 'en' && libroTitoloEn) ? libroTitoloEn : libroTitolo;
  // Copertina davanti = lingua attuale, dietro = l'altra edizione
  const coverFront = state.lang === 'en' && libroImgEn
    ? { src: libroImgEn, alt: libroTitoloEn || libroTitolo }
    : { src: libroImgIt, alt: libroTitolo };
  const coverBack = state.lang === 'en' && libroImgEn
    ? (libroImgIt ? { src: libroImgIt, alt: libroTitolo } : null)
    : (libroImgEn ? { src: libroImgEn, alt: libroTitoloEn || libroTitolo } : null);
  const libroLink = meta.libro_link || '#';
  const libroVideo = meta.libro_video || '';

  updateSEO({ title, description: meta[`seo_desc_${state.lang}`], slug: 'lezioni' });

  $('#app').innerHTML = `
    <div class="lezioni-page page-enter">
      <div class="page-hero">
        <div class="page-hero-inner">
          <span class="section-label" data-it="DIDATTICA" data-en="LESSONS">DIDATTICA</span>
          <h1 class="page-hero-title" data-it="${titleIt}" data-en="${titleEn}">${title}</h1>
        </div>
      </div>

      <div class="lezioni-inner">

        ${libroTitolo ? `
        <section class="libro-hero reveal">
          <div class="libro-hero-grid">
            <div class="libro-info">
              <div class="libro-covers${coverBack ? ' has-two' : ''}">
                ${coverBack ? `<div class="libro-cover libro-cover-back"><img src="${coverBack.src}" alt="${coverBack.alt}" loading="lazy" /></div>` : ''}
                <div class="libro-cover libro-cover-front">
                  ${coverFront.src ? `<img src="${coverFront.src}" alt="${coverFront.alt}" />` : placeholderImg('libro')}
                </div>
                ${coverBack ? `<span class="libro-lang-badge" data-it="ITALIANO · ENGLISH" data-en="ENGLISH · ITALIANO">${state.lang === 'en' ? 'ENGLISH · ITALIANO' : 'ITALIANO · ENGLISH'}</span>` : ''}
              </div>
              <div class="libro-content">
                <span class="section-label" data-it="IL MIO LIBRO" data-en="MY BOOK">${state.lang === 'it' ? 'IL MIO LIBRO' : 'MY BOOK'}</span>
                <h2 class="libro-title">${libroTitoloShown}</h2>
                ${libroSottotitolo ? `<p class="libro-subtitle">${libroSottotitolo}</p>` : ''}
                ${libroDesc ? `<p class="libro-desc">${libroDesc}</p>` : ''}
                ${libroDettagli.length ? `<ul class="libro-tags">${libroDettagli.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
                <a href="${libroLink}" target="_blank" rel="noopener" class="btn-primary" data-it="ACQUISTA IL LIBRO" data-en="BUY THE BOOK">
                  ${state.lang === 'it' ? 'ACQUISTA IL LIBRO' : 'BUY THE BOOK'}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              </div>
            </div>
            ${libroVideo ? `
            <div class="libro-video">
              <iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${libroVideo}" title="${libroTitolo}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" style="display:block;border:0;"></iframe>
            </div>` : ''}
          </div>
        </section>` : ''}

        <section class="lezioni-section reveal">
          <span class="section-label" data-it="VIDEO LEZIONI" data-en="VIDEO LESSONS">${state.lang === 'it' ? 'VIDEO LEZIONI' : 'VIDEO LESSONS'}</span>
          <div class="lezioni-video-grid">
            ${videos.length
              ? videos.map(v => lezioneVideoHTML(v)).join('')
              : `<p style="color:var(--grey3)" data-it="Nessun video pubblicato ancora." data-en="No videos published yet.">${state.lang === 'it' ? 'Nessun video pubblicato ancora.' : 'No videos published yet.'}</p>`
            }
          </div>
        </section>


        <section class="lezioni-section reveal">
          <span class="section-label" data-it="CONSIGLI SCRITTI" data-en="WRITTEN TIPS">${state.lang === 'it' ? 'CONSIGLI SCRITTI' : 'WRITTEN TIPS'}</span>
          <div class="news-grid">
            ${tips.length
              ? tips.slice(0, 3).map(a => newsCardHTML(a)).join('')
              : `<p style="color:var(--grey3)" data-it="Nessun consiglio pubblicato ancora." data-en="No tips published yet.">${state.lang === 'it' ? 'Nessun consiglio pubblicato ancora.' : 'No tips published yet.'}</p>`
            }
          </div>
          ${tips.length ? `
          <br><br>
          <a href="/blog" data-link="/blog" class="btn-text reveal" data-it="VEDI TUTTI I CONSIGLI" data-en="ALL TIPS">
            ${state.lang === 'it' ? 'VEDI TUTTI I CONSIGLI' : 'ALL TIPS'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>` : ''}
        </section>

      </div>
    </div>
  `;
  pageEnter();
}

/**
 * Formato riga in lezioni.md:
 * - ID_VIDEO | Titolo IT | Descrizione IT | Titolo EN | Descrizione EN
 * Titolo EN e Descrizione EN sono facoltativi: se mancano si usa l'italiano.
 */
function parseLezioniVideos(body) {
  const videos = [];
  const lines = body.split('\n');
  for (const line of lines) {
    const m = line.match(/^[-*]\s+(.+)$/);
    if (!m) continue;
    const parts = m[1].split('|').map(p => p.trim());
    if (parts.length < 2 || !parts[0] || /\s/.test(parts[0])) continue;
    const [id, titoloIt = '', descIt = '', titoloEn = '', descEn = ''] = parts;
    videos.push({
      id,
      titoloIt,
      descIt,
      titoloEn: titoloEn || titoloIt,
      descEn: descEn || descIt,
    });
  }
  return videos;
}

/** Rende cliccabili i link (https://...) scritti nella descrizione */
function linkify(text) {
  return text.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function lezioneVideoHTML(v) {
  const titolo = state.lang === 'en' ? v.titoloEn : v.titoloIt;
  const desc = state.lang === 'en' ? v.descEn : v.descIt;
  return `
    <div class="lezione-card reveal">
      <div class="lezione-video">
        <iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${v.id}" title="${titolo}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" style="display:block;border:0;"></iframe>
      </div>
      <div class="lezione-body">
        <h3 class="lezione-title">${titolo}</h3>
        ${desc ? `<p class="lezione-desc">${linkify(desc)}</p>` : ''}
      </div>
    </div>
  `;
}

/* ── CONTATTI ────────────────────────────────────────────────── */
async function renderContatti() {
  const s = await loadSettings();
  const email = s.email || 'andreacetica@gmail.com';
  const tel   = s.telefono || '+39 000 0000000';
  const citta = s.citta || 'Milano, Italia';

  const it = state.lang === 'it';
  const waNumber = tel.replace(/[^0-9]/g, '');
  const waText = encodeURIComponent(it ? 'Ciao Andrea, ti scrivo dal tuo sito: ' : 'Hi Andrea, I\'m writing from your website: ');
  const waLink = `https://wa.me/${waNumber}?text=${waText}`;
  const mailSubject = encodeURIComponent(it ? 'Proposta di collaborazione' : 'Collaboration proposal');

  updateSEO({ title: it ? 'Contatti' : 'Contact', slug: 'contatti' });

  $('#app').innerHTML = `
    <div class="contatti-page page-enter">
      <div class="contatti-inner">
        <span class="section-label reveal" data-it="CONTATTI" data-en="CONTACT" style="text-align:center;display:block">${state.lang === 'it' ? 'CONTATTI' : 'CONTACT'}</span>
        <h1 class="section-title reveal" data-it="SCRIVIMI" data-en="GET IN TOUCH" style="text-align:center">${state.lang === 'it' ? 'SCRIVIMI' : 'GET IN TOUCH'}</h1>
        <div class="contatti-grid contatti-grid-single">
          <div class="contatti-info reveal" style="text-align:center;max-width:520px;margin:0 auto">
            <p data-it="Vuoi collaborare? Fammi una proposta! Live, studio, orchestre o lezioni: rispondo a tutti."
               data-en="Want to work together? Send me a proposal! Live shows, studio, orchestras or lessons: I reply to everyone.">
              ${it
                ? 'Vuoi collaborare? Fammi una proposta! Live, studio, orchestre o lezioni: rispondo a tutti.'
                : 'Want to work together? Send me a proposal! Live shows, studio, orchestras or lessons: I reply to everyone.'}
            </p>
            <div class="contact-actions">
              <a class="contact-btn contact-btn-wa" href="${waLink}" target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-1-1.1-1.3-1.7-.1-.2 0-.4.1-.5l.4-.5.3-.4v-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.5.8 3.4.7.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.3-.5-.4z"/></svg>
                <span>${state.lang === 'it' ? 'Scrivimi su WhatsApp' : 'Message me on WhatsApp'}</span>
              </a>
              <a class="contact-btn" href="mailto:${email}?subject=${mailSubject}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>${state.lang === 'it' ? 'Inviami un\'email' : 'Send me an email'}</span>
              </a>
              <button type="button" class="contact-copy" id="copy-email">${state.lang === 'it' ? 'Copia indirizzo email' : 'Copy email address'}</button>
            </div>
            <div class="contact-item" style="justify-content:center">
              <div class="contact-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div class="contact-item-text"><a href="mailto:${email}">${email}</a></div>
            </div>
            <div class="contact-item" style="justify-content:center">
              <div class="contact-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.28-.76a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              </div>
              <div class="contact-item-text">${tel}</div>
            </div>
            <div class="contact-item" style="justify-content:center">
              <div class="contact-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div class="contact-item-text">${citta}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  pageEnter();
}

/* ── PRIVACY / COOKIE ────────────────────────────────────────── */
async function renderLegalPage(file, slug, fallbackTitle) {
  const raw = await fetchText(`content/${file}`).catch(() => '');
  const { meta, body } = parseFrontmatter(raw);
  const title = meta[`titolo_${state.lang}`] || meta.titolo_it || fallbackTitle;
  updateSEO({ title, slug });
  $('#app').innerHTML = `<div class="article-page page-enter"><h1 class="article-title">${title}</h1><div class="article-body">${marked.parse(extractLang(body, state.lang))}</div></div>`;
  pageEnter();
}
async function renderPrivacy() { await renderLegalPage('privacy.md', 'privacy', 'Privacy Policy'); }
async function renderCookie()  { await renderLegalPage('cookie.md', 'cookie', 'Cookie Policy'); }

function render404() {
  updateSEO({ title: '404 — Pagina non trovata' });
  $('#app').innerHTML = `
    <div class="error-page page-enter">
      <div class="error-code">404</div>
      <h1 class="section-title" data-it="PAGINA NON TROVATA" data-en="PAGE NOT FOUND">${state.lang === 'it' ? 'PAGINA NON TROVATA' : 'PAGE NOT FOUND'}</h1>
      <a href="/" data-link="/" class="btn-primary" data-it="TORNA ALLA HOME" data-en="BACK TO HOME">${state.lang === 'it' ? 'TORNA ALLA HOME' : 'BACK TO HOME'}</a>
    </div>
  `;
}


/* ── NEWS: bozze e categorie ─────────────────────────────────── */
// Le bozze (stato: bozza) si vedono SOLO in locale (Live Server), mai sul sito online.
const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const CATEGORIE = {
  lezione: { it: 'Lezione', en: 'Lesson' },
  nozione: { it: 'Nozione', en: 'Know-how' },
  storia:  { it: 'Storia',  en: 'Story' },
};
function categoriaLabel(c) {
  const k = (c || '').toLowerCase();
  return CATEGORIE[k] ? CATEGORIE[k][state.lang === 'en' ? 'en' : 'it'] : '';
}
function isBozza(meta) { return (meta.stato || '').toLowerCase() === 'bozza'; }

/* ── NEWS / BLOG HELPERS ─────────────────────────────────────── */
async function loadNewsIndex(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('---'));
  const slugs = lines.filter(l => /^[-*]\s/.test(l)).map(l => l.replace(/^[-*]\s+/, '').trim());
  return loadArticlesBySlug(slugs);
}

async function loadBlogIndex(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('---'));
  const slugs = lines.filter(l => /^[-*]\s/.test(l)).map(l => l.replace(/^[-*]\s+/, '').trim());
  return loadArticlesBySlug(slugs);
}

async function loadArticlesBySlug(slugs) {
  const articles = [];
  await Promise.all(slugs.map(async slug => {
    try {
      const raw = await fetchText(`content/articoli/${slug}.md`);
      const { meta, body } = parseFrontmatter(raw);
      if (isBozza(meta) && !IS_LOCAL) return; // bozza: non pubblicata online
      const excerpt = extractLang(body, state.lang)
        .replace(/#{1,6}\s/g, '').replace(/[*_>`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .slice(0, 200);
      articles.push({
        slug,
        titolo:    meta[`titolo_${state.lang}`]  || meta.titolo_it || slug,
        data:      meta.data || '',
        tag:       meta.tag || categoriaLabel(meta.categoria),
        categoria: (meta.categoria || '').toLowerCase(),
        immagine:  meta.immagine || '',
        bozza:     isBozza(meta),
        excerpt,
      });
    } catch { /* articolo non trovato, skip */ }
  }));
  // Ordina per data decrescente
  articles.sort((a, b) => (b.data > a.data ? 1 : -1));
  return articles;
}

function newsCardHTML(a) {
  return `
    <div class="news-card reveal" data-cat="${a.categoria || ''}" onclick="navigate('/blog/${a.slug}')" style="cursor:pointer">
      <div class="news-card-img">
        ${a.immagine
          ? `<img src="assets/images/${a.immagine}" alt="${a.titolo}" loading="lazy" />`
          : `<div class="news-card-cover cat-${a.categoria || 'news'}"><span>${categoriaLabel(a.categoria) || 'News'}</span></div>`}
        ${a.bozza ? '<span class="bozza-badge">BOZZA</span>' : ''}
      </div>
      <div class="news-card-body">
        <div class="news-card-meta">
          ${a.data ? `<span class="news-card-date">${formatDate(a.data)}</span>` : ''}
          ${a.tag  ? `<span class="news-card-tag">${a.tag}</span>` : ''}
        </div>
        <h3 class="news-card-title">${a.titolo}</h3>
        <p class="news-card-excerpt">${a.excerpt}</p>
      </div>
    </div>
  `;
}

/* Esponiamo navigate globalmente per le card onclick */
window.navigate = navigate;

/* ── GALLERY HELPERS (home) ──────────────────────────────────── */

/* ── PLACEHOLDER IMG ─────────────────────────────────────────── */
function placeholderImg(key = '') {
  return `<div class="placeholder-img" title="Sostituisci con la tua foto">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
  </div>`;
}

/* ── DATE FORMAT ─────────────────────────────────────────────── */
function formatDate(str) {
  try {
    const d = new Date(str);
    return d.toLocaleDateString(state.lang === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return str; }
}

/* ── REVEAL ON SCROLL ────────────────────────────────────────── */
function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  $$('.reveal').forEach(el => io.observe(el));
}

/* ── PAGE ENTER ANIMATION ────────────────────────────────────── */
function pageEnter() {
  const app = $('#app');
  app.classList.remove('page-enter');
  void app.offsetWidth;
  app.classList.add('page-enter');
}

/* ── HEADER SCROLL ───────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  $('#header').classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

/* ── MOBILE MENU ─────────────────────────────────────────────── */
const hamburger     = $('#hamburger');
const mobileMenu    = $('#mobile-menu');
const mobileClose   = $('#mobile-menu-close');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
});
mobileClose.addEventListener('click', closeMobileMenu);

function closeMobileMenu() {
  hamburger.classList.remove('open');
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── LANG SWITCH ─────────────────────────────────────────────── */
$('#lang-switch').addEventListener('click', () => {
  state.lang = state.lang === 'it' ? 'en' : 'it';
  localStorage.setItem('acc_lang', state.lang);
  navigate(getPath(), false);
});

/* ── CUSTOM CURSOR ───────────────────────────────────────────── */
const cursor   = $('#cursor');
const follower = $('#cursor-follower');
let mx = 0, my = 0, fx = 0, fy = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

function animateCursor() {
  cursor.style.left   = mx + 'px';
  cursor.style.top    = my + 'px';
  fx += (mx - fx) * 0.12;
  fy += (my - fy) * 0.12;
  follower.style.left = fx + 'px';
  follower.style.top  = fy + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.addEventListener('mouseover', e => {
  if (e.target.closest('a, button, .track-item, .news-card, .gallery-page-item')) {
    document.body.classList.add('cursor-hover');
  }
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('a, button, .track-item, .news-card, .gallery-page-item')) {
    document.body.classList.remove('cursor-hover');
  }
});

/* ── HOME GALLERY CAROUSEL ───────────────────────────────────── */
// (Se presente nella home, inizializzato dopo il render)
document.addEventListener('click', e => {
  const btn = e.target.closest('.gallery-btn');
  if (!btn) return;
  const track = btn.closest('section')?.querySelector('.gallery-track');
  if (!track) return;
  const itemW = track.querySelector('.gallery-item')?.offsetWidth || 0;
  const gap   = 24;
  const step  = itemW + gap;
  const dir   = btn.dataset.dir === 'next' ? 1 : -1;
  const current = parseInt(track.dataset.offset || 0);
  const maxOff  = track.children.length - 4;
  const next    = Math.max(0, Math.min(current + dir, maxOff));
  track.dataset.offset = next;
  track.style.transform = `translateX(-${next * step}px)`;
});

/* ── BOOT ────────────────────────────────────────────────────── */
async function boot() {
  // Nascondi loader
  await loadSettings();
  const loader = $('#loader');
  setTimeout(() => loader.classList.add('hidden'), 600);

  // Prima navigazione
  await navigate(getPath(), false);
}

boot();
