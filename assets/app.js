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
    el.textContent = el.dataset[key] || el.textContent;
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
  const base = s.dominio || 'https://tuodominio.com';
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

/* ── HOME ────────────────────────────────────────────────────── */
async function renderHome() {
  const [homeMd, newsMd, s] = await Promise.all([
    fetchText('content/home.md').catch(() => ''),
    fetchText('content/news.md').catch(() => ''),
    loadSettings(),
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
          <button class="btn-play" onclick="void(0)">
            <div class="play-circle">
              <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
            <div class="play-label" data-it="ASCOLTA<br>IL MIO SOUND" data-en="LISTEN TO<br>MY SOUND">ASCOLTA<br>IL MIO SOUND</div>
          </button>
        </div>
      </div>
    </section>

    <!-- BIO preview -->
    <section class="bio-section">
      <div class="section-inner bio-grid">
        <div class="bio-image reveal">
          <div class="bio-image-line"></div>
          ${placeholderImg('bio')}
        </div>
        <div class="bio-text reveal">
          <span class="section-label">BIO</span>
          <h2 class="section-title" data-it="CHI SONO" data-en="ABOUT ME">${state.lang === 'it' ? 'CHI SONO' : 'ABOUT ME'}</h2>
          <div class="bio-short">${marked.parse(extractLang(hBody, state.lang).slice(0, 600))}</div>
          <div class="bio-stats">
            <div class="stat-item">
              <span class="stat-number">${hMeta.anni_esperienza || '10'}+</span>
              <span class="stat-label" data-it="Anni Esperienza" data-en="Years Exp.">${state.lang === 'it' ? 'Anni Esperienza' : 'Years Exp.'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${hMeta.concerti || '200'}+</span>
              <span class="stat-label" data-it="Live Show" data-en="Live Shows">${state.lang === 'it' ? 'Live Show' : 'Live Shows'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${hMeta.album || '12'}</span>
              <span class="stat-label" data-it="Album" data-en="Albums">Album</span>
            </div>
          </div>
          <a href="/bio" data-link="/bio" class="btn-text" data-it="LEGGI DI PIÙ" data-en="READ MORE">
            ${state.lang === 'it' ? 'LEGGI DI PIÙ' : 'READ MORE'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </section>

    <!-- SERVICES -->
    <section class="services-section">
      <div class="section-inner">
        <span class="section-label reveal" data-it="COSA FACCIO" data-en="WHAT I DO">${state.lang === 'it' ? 'COSA FACCIO' : 'WHAT I DO'}</span>
        <div class="services-grid reveal">
          ${renderServiceCards(s)}
        </div>
      </div>
    </section>

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
            <div id="track-list-home" class="track-list">
              <div style="color:var(--grey3);font-size:.85rem;padding:1rem 0" data-it="Caricamento tracce..." data-en="Loading tracks...">Caricamento tracce...</div>
            </div>
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
        <a href="/blog" data-link="/blog" class="btn-text reveal" data-it="VEDI TUTTE LE NEWS" data-en="ALL NEWS">
          ${state.lang === 'it' ? 'VEDI TUTTE LE NEWS' : 'ALL NEWS'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
    </section>` : ''}
  `;

  // Carica tracce async
  loadTrackListPreview();
  initDiscPlay();
  pageEnter();
}

function renderServiceCards(s) {
  const services = [
    {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
      title_it: 'LIVE',   title_en: 'LIVE',
      desc_it: s.servizio_live_it   || 'Performance ed energia dal vivo.',
      desc_en: s.servizio_live_en   || 'Performance and live energy.',
    },
    {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>`,
      title_it: 'STUDIO', title_en: 'STUDIO',
      desc_it: s.servizio_studio_it || 'Registrazioni, produzioni e collaborazioni.',
      desc_en: s.servizio_studio_en || 'Recordings, productions and collaborations.',
    },
    {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
      title_it: 'COLLABORAZIONI', title_en: 'COLLABORATIONS',
      desc_it: s.servizio_collab_it || 'Progetti e artisti con cui suono.',
      desc_en: s.servizio_collab_en || 'Projects and artists I play with.',
    },
    {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
      title_it: 'MUSICA', title_en: 'MUSIC',
      desc_it: s.servizio_musica_it || 'Ascolta i miei brani e le mie produzioni.',
      desc_en: s.servizio_musica_en || 'Listen to my tracks and productions.',
    },
  ];

  return services.map(sv => `
    <div class="service-card reveal">
      <div class="service-icon">${sv.icon}</div>
      <h3 class="service-title" data-it="${sv.title_it}" data-en="${sv.title_en}">${state.lang === 'it' ? sv.title_it : sv.title_en}</h3>
      <p class="service-desc" data-it="${sv.desc_it}" data-en="${sv.desc_en}">${state.lang === 'it' ? sv.desc_it : sv.desc_en}</p>
    </div>
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
            ${placeholderImg('bio-portrait')}
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
            <div class="track-list" id="track-list-full">
              ${tracks.map((t, i) => trackItemHTML(t, i)).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  initTrackItems();
  initDiscPlay();
  pageEnter();
}

function parseTracks(raw) {
  const tracks = [];
  const lines = raw.split('\n');
  let inList = false;
  for (const line of lines) {
    // Cerca righe tipo: - Titolo Brano | 3:45 | genere
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
        <div class="page-hero-inner">
          <span class="section-label" data-it="GALLERY" data-en="GALLERY">GALLERY</span>
          <h1 class="page-hero-title" data-it="${titleIt}" data-en="${titleEn}">${title}</h1>
        </div>
      </div>
      <div class="gallery-page-inner">
        <div class="gallery-page-grid">
          ${photos.map((p, i) => `
            <div class="gallery-page-item reveal" data-index="${i}" data-src="${p.src}">
              ${p.src.startsWith('assets/') ? `<img src="${p.src}" alt="${p.alt || ''}" loading="lazy" />` : placeholderImg('gallery-' + i)}
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
  const { meta } = parseFrontmatter(raw);
  const articles = await loadBlogIndex(raw);

  updateSEO({ title: state.lang === 'it' ? 'News & Blog' : 'News & Blog', slug: 'blog' });

  $('#app').innerHTML = `
    <div class="page-enter">
      <div class="page-hero">
        <div class="page-hero-inner">
          <span class="section-label" data-it="NEWS & BLOG" data-en="NEWS & BLOG">NEWS & BLOG</span>
          <h1 class="page-hero-title" data-it="TUTTI GLI ARTICOLI" data-en="ALL ARTICLES">${state.lang === 'it' ? 'TUTTI GLI ARTICOLI' : 'ALL ARTICLES'}</h1>
        </div>
      </div>
      <div class="blog-list">
        ${articles.length
          ? articles.map(a => newsCardHTML(a)).join('')
          : `<p style="color:var(--grey3);grid-column:1/-1" data-it="Nessun articolo pubblicato." data-en="No articles published yet.">${state.lang === 'it' ? 'Nessun articolo pubblicato.' : 'No articles published yet.'}</p>`
        }
      </div>
    </div>
  `;
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
  const tit  = meta[`titolo_${state.lang}`]  || meta.titolo_it || slug;
  const desc  = meta[`seo_desc_${state.lang}`] || meta[`descrizione_${state.lang}`] || '';
  const data  = meta.data ? formatDate(meta.data) : '';
  const tag   = meta.tag || '';
  const img   = meta.immagine || '';
  const text  = extractLang(body, state.lang);

  updateSEO({ title: tit, description: desc, slug: `blog/${slug}`, image: img });

  $('#app').innerHTML = `
    <div class="page-enter">
      <div class="article-page">
        <div class="article-back">
          <a href="/blog" data-link="/blog" class="btn-text" data-it="← TUTTI GLI ARTICOLI" data-en="← ALL ARTICLES">
            ${state.lang === 'it' ? '← TUTTI GLI ARTICOLI' : '← ALL ARTICLES'}
          </a>
        </div>
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

/* ── CONTATTI ────────────────────────────────────────────────── */
async function renderContatti() {
  const s = await loadSettings();
  const email = s.email || 'info@tuodominio.com';
  const tel   = s.telefono || '+39 000 0000000';
  const citta = s.citta || 'Milano, Italia';

  updateSEO({ title: state.lang === 'it' ? 'Contatti' : 'Contact', slug: 'contatti' });

  $('#app').innerHTML = `
    <div class="contatti-page page-enter">
      <div class="contatti-inner">
        <span class="section-label reveal" data-it="CONTATTI" data-en="CONTACT" style="text-align:center;display:block">${state.lang === 'it' ? 'CONTATTI' : 'CONTACT'}</span>
        <h1 class="section-title reveal" data-it="SCRIVIMI" data-en="GET IN TOUCH" style="text-align:center">${state.lang === 'it' ? 'SCRIVIMI' : 'GET IN TOUCH'}</h1>
        <div class="contatti-grid contatti-grid-single">
          <div class="contatti-info reveal" style="text-align:center;max-width:520px;margin:0 auto">
            <p data-it="Hai un progetto, una collaborazione o vuoi semplicemente salutare? Scrivimi, rispondo a tutti."
               data-en="Have a project, collaboration or just want to say hi? Write me, I reply to everyone.">
              ${state.lang === 'it'
                ? 'Hai un progetto, una collaborazione o vuoi semplicemente salutare? Scrivimi, rispondo a tutti.'
                : 'Have a project, collaboration or just want to say hi? Write me, I reply to everyone.'}
            </p>
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
async function renderPrivacy() {
  updateSEO({ title: 'Privacy Policy', slug: 'privacy' });
  $('#app').innerHTML = `<div class="article-page page-enter"><h1 class="article-title">Privacy Policy</h1><div class="article-body"><p data-it="Inserisci qui il testo della tua Privacy Policy." data-en="Insert your Privacy Policy text here.">${state.lang === 'it' ? 'Inserisci qui il testo della tua Privacy Policy.' : 'Insert your Privacy Policy text here.'}</p></div></div>`;
  pageEnter();
}
async function renderCookie() {
  updateSEO({ title: 'Cookie Policy', slug: 'cookie' });
  $('#app').innerHTML = `<div class="article-page page-enter"><h1 class="article-title">Cookie Policy</h1><div class="article-body"><p data-it="Inserisci qui il testo della tua Cookie Policy." data-en="Insert your Cookie Policy text here.">${state.lang === 'it' ? 'Inserisci qui il testo della tua Cookie Policy.' : 'Insert your Cookie Policy text here.'}</p></div></div>`;
  pageEnter();
}

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
      const excerpt = extractLang(body, state.lang).replace(/#{1,6}\s/g, '').slice(0, 200);
      articles.push({
        slug,
        titolo:   meta[`titolo_${state.lang}`]  || meta.titolo_it || slug,
        data:     meta.data || '',
        tag:      meta.tag || '',
        immagine: meta.immagine || '',
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
    <div class="news-card reveal" onclick="navigate('/blog/${a.slug}')" style="cursor:pointer">
      <div class="news-card-img">
        ${a.immagine ? `<img src="assets/images/${a.immagine}" alt="${a.titolo}" loading="lazy" />` : placeholderImg('news')}
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
