#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GENERA-SEO — crea le pagine statiche per Google partendo dai file in content/.

Cosa fa (ogni volta che lo lanci, o in automatico a ogni git commit):
  - una pagina vera per ogni sezione: /bio/, /musica/, /lezioni/, /blog/, /contatti/ ...
    e per ogni articolo pubblicato: /blog/nome-articolo/
  - in ognuna: titolo, descrizione, canonical, Open Graph, dati strutturati (schema.org)
    e il testo della pagina già dentro l'HTML, così Google lo legge subito
  - sitemap.xml e robots.txt
Il sito per i visitatori resta identico: app.js sostituisce il contenuto come sempre.

Uso:  python3 strumenti/genera-seo.py
Solo libreria standard di Python: non serve installare nulla.
"""
import os, re, json, html, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
TODAY = datetime.date.today().isoformat()


# ── lettura / scrittura ───────────────────────────────────────
def read(rel, default=''):
    try:
        with open(P(rel), encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return default


def write(rel, text):
    path = P(rel)
    os.makedirs(os.path.dirname(path) or ROOT, exist_ok=True)
    old = None
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            old = f.read()
    if old != text:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        return True
    return False


def frontmatter(raw):
    """Stessa logica di parseFrontmatter() in app.js."""
    m = re.match(r'^---\r?\n([\s\S]*?)\r?\n---', raw)
    if not m:
        return {}, raw
    meta, key = {}, None
    for line in m.group(1).split('\n'):
        kv = re.match(r'^(\w[\w_-]*):\s*(.*)', line)
        if kv:
            key = kv.group(1)
            meta[key] = re.sub(r'^["\']|["\']$', '', kv.group(2).strip())
        elif key and line.startswith('  '):
            meta[key] += '\n' + line.strip()
    return meta, raw[m.end():].strip()


def italian(body):
    return re.split(r'\n---EN---\n', body, flags=re.I)[0].strip()


def mtime(*rels):
    ts = [os.path.getmtime(P(r)) for r in rels if os.path.exists(P(r))]
    return datetime.date.fromtimestamp(max(ts)).isoformat() if ts else TODAY


# ── mini Markdown → HTML ──────────────────────────────────────
def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*([^*\n]+)\*(?![*\w])', r'<em>\1</em>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = t.replace('&lt;br&gt;', '<br>')
    return t


def md(text):
    out, para, lst = [], [], None

    def flush():
        nonlocal para, lst
        if para:
            out.append('<p>' + inline(' '.join(para)) + '</p>')
            para = []
        if lst:
            tag = lst[0]
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(i)}</li>' for i in lst[1]) + f'</{tag}>')
            lst = None

    for line in text.split('\n'):
        s = line.strip()
        if not s or s == '---' or s.startswith('<!--'):
            flush(); continue
        h = re.match(r'^(#{1,4})\s+(.*)', s)
        if h:
            flush()
            lvl = min(len(h.group(1)) + 1, 4)
            out.append(f'<h{lvl}>{inline(h.group(2))}</h{lvl}>')
            continue
        ul = re.match(r'^[-*]\s+(.*)', s)
        ol = re.match(r'^\d+\.\s+(.*)', s)
        if ul or ol:
            if para:
                out.append('<p>' + inline(' '.join(para)) + '</p>'); para = []
            tag = 'ul' if ul else 'ol'
            if not lst or lst[0] != tag:
                flush(); lst = (tag, [])
            lst[1].append((ul or ol).group(1))
            continue
        if lst:
            flush()
        para.append(s)
    flush()
    return '\n'.join(out)


def esc(t):
    return html.escape(t or '', quote=True)


def list_items(body):
    return [re.sub(r'^[-*]\s+', '', l.strip()) for l in body.split('\n') if re.match(r'^\s*[-*]\s+', l)]


# ── dati del sito ─────────────────────────────────────────────
S, _ = frontmatter(read('content/settings.md'))
BASE = (S.get('dominio') or 'https://andreaciosticetica.com').rstrip('/')
NAME = 'Andrea Ciosti Cetica'
OG_IMG = f"{BASE}/assets/images/{S.get('og_immagine') or 'og-cover.jpg'}"
CITIES = [c.strip() for c in (S.get('seo_citta_lezioni') or 'Arezzo').split(',') if c.strip()]
SOCIAL = [S.get(k) for k in ('instagram', 'youtube', 'facebook', 'tiktok', 'spotify') if S.get(k)]
EMAIL = S.get('email', '')
PHONE = S.get('telefono', '')
WA = 'https://wa.me/' + re.sub(r'\D', '', PHONE) if PHONE else ''


def page_url(slug):
    return f'{BASE}/{slug}/' if slug else f'{BASE}/'


def seo(key, fallback_title, fallback_desc):
    if key == 'home':
        return S.get('seo_titolo_it') or fallback_title, S.get('seo_desc_it') or fallback_desc
    return (S.get(f'seo_{key}_titolo_it') or fallback_title,
            S.get(f'seo_{key}_desc_it') or fallback_desc)


PERSON = {
    '@type': 'Person',
    '@id': f'{BASE}/#person',
    'name': NAME,
    'alternateName': ['Andrea Cetica', 'Andrea "Ciosti" Cetica'],
    'url': f'{BASE}/',
    'image': f'{BASE}/assets/images/foto_bio.jpg',
    'jobTitle': ['Batterista', 'Percussionista', 'Insegnante di batteria'],
    'description': S.get('seo_desc_it', ''),
    'knowsAbout': ['Batteria', 'Percussioni', 'Didattica della batteria', 'Rudimenti',
                   'Jazz', 'Rock', 'Musica elettronica'],
    'address': {'@type': 'PostalAddress', 'addressLocality': 'Arezzo', 'addressRegion': 'AR',
                'addressCountry': 'IT'},
    'sameAs': SOCIAL,
}
if EMAIL:
    PERSON['email'] = f'mailto:{EMAIL}'
WEBSITE = {'@type': 'WebSite', '@id': f'{BASE}/#website', 'url': f'{BASE}/', 'name': NAME,
           'inLanguage': 'it-IT', 'publisher': {'@id': f'{BASE}/#person'}}


def breadcrumb(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


def webpage(slug, title, desc, kind='WebPage'):
    return {'@type': kind, '@id': page_url(slug) + '#webpage', 'url': page_url(slug), 'name': title,
            'description': desc, 'inLanguage': 'it-IT', 'isPartOf': {'@id': f'{BASE}/#website'},
            'about': {'@id': f'{BASE}/#person'}}


# ── template (index.html ripulito) ────────────────────────────
SEO_RE = re.compile(r'<!-- SEO:START[\s\S]*?<!-- SEO:END -->')
OLD_SEO_RE = re.compile(r'<!-- SEO — aggiornato dinamicamente da app\.js -->[\s\S]*?id="tw-image" />')
APP_RE = re.compile(r'<main id="app">[\s\S]*?</main>')


def load_template():
    t = read('index.html')
    if SEO_RE.search(t):
        t = SEO_RE.sub('{{SEO}}', t, count=1)
    else:
        t = OLD_SEO_RE.sub('{{SEO}}', t, count=1)
    if '{{SEO}}' not in t:
        raise SystemExit('ERRORE: non trovo il blocco SEO in index.html')
    t = APP_RE.sub('<main id="app">{{CONTENT}}</main>', t, count=1)
    # link social reali nell'HTML (prima li metteva solo il JS)
    for net in ('instagram', 'youtube', 'spotify', 'facebook', 'tiktok'):
        if S.get(net):
            t = re.sub(r'<a href="[^"]*"((?:\s+class="social-icon")?\s+id="(?:nav|footer)-%s")' % net,
                       lambda m, u=S[net]: f'<a href="{u}"{m.group(1)}', t)
    if PHONE:
        t = re.sub(r'(<li id="footer-phone">)[^<]*(</li>)', lambda m: m.group(1) + esc(PHONE) + m.group(2), t)
    if S.get('citta'):
        t = re.sub(r'(<li id="footer-city">)[^<]*(</li>)', lambda m: m.group(1) + esc(S['citta']) + m.group(2), t)
    return t


ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1'


def head(slug, title, desc, graph, og_type='website', image=None, noindex=False):
    url = page_url(slug)
    img = image or OG_IMG
    robots = 'noindex, follow' if noindex else ROBOTS_INDEX
    verif = (S.get('google_verifica') or '').strip()
    ld = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=2)
    ld = ld.replace('</', '<\\/')
    lines = [
        '<!-- SEO:START — generato da strumenti/genera-seo.py: non modificare a mano -->',
        f'  <title>{html.escape(title, quote=False)}</title>',
        f'  <meta name="description" content="{esc(desc)}" />',
        f'  <meta name="robots" content="{robots}" />',
        f'  <link rel="canonical" href="{url}" id="canonical-tag" />',
        f'  <meta name="author" content="{NAME}" />',
    ]
    if verif:
        lines.append(f'  <meta name="google-site-verification" content="{esc(verif)}" />')
    lines += [
        '',
        '  <!-- Open Graph -->',
        f'  <meta property="og:site_name" content="{NAME}" />',
        '  <meta property="og:locale" content="it_IT" />',
        '  <meta property="og:locale:alternate" content="en_GB" />',
        f'  <meta property="og:type" content="{og_type}" />',
        f'  <meta property="og:title" content="{esc(title)}" id="og-title" />',
        f'  <meta property="og:description" content="{esc(desc)}" id="og-desc" />',
        f'  <meta property="og:image" content="{img}" id="og-image" />',
        f'  <meta property="og:url" content="{url}" id="og-url" />',
        '',
        '  <!-- Twitter Card -->',
        '  <meta name="twitter:card" content="summary_large_image" />',
        f'  <meta name="twitter:title" content="{esc(title)}" id="tw-title" />',
        f'  <meta name="twitter:description" content="{esc(desc)}" id="tw-desc" />',
        f'  <meta name="twitter:image" content="{img}" id="tw-image" />',
        '',
        '  <!-- Dati strutturati (schema.org) -->',
        '  <script type="application/ld+json">',
        ld,
        '  </script>',
        '  <!-- SEO:END -->',
    ]
    return '\n'.join(lines)


NAV = [('Home', ''), ('Bio', 'bio'), ('Musica', 'musica'), ('Gallery', 'gallery'),
       ('Lezioni di batteria', 'lezioni'), ('News', 'blog'), ('Contatti', 'contatti')]


def static(h1, inner, intro=''):
    nav = ' · '.join(f'<a href="/{s + "/" if s else ""}">{n}</a>' for n, s in NAV)
    return ('\n    <div class="seo-static" style="max-width:860px;margin:0 auto;padding:140px 24px 80px;line-height:1.7">\n'
            f'      <h1>{html.escape(h1, quote=False)}</h1>\n'
            + (f'      <p>{inline(intro)}</p>\n' if intro else '')
            + '      ' + inner +
            f'\n      <nav aria-label="Sezioni del sito"><p>{nav}</p></nav>\n    </div>\n  ')


# ── contenuti ─────────────────────────────────────────────────
def articles():
    out = []
    for slug in list_items(read('content/blog.md')):
        if not re.match(r'^[a-z0-9-]+$', slug):
            continue
        rel = f'content/articoli/{slug}.md'
        a, body = frontmatter(read(rel))
        if not a or a.get('stato', '').lower() == 'bozza':
            continue
        out.append({'slug': slug, 'meta': a, 'body': italian(body), 'rel': rel})
    out.sort(key=lambda x: x['meta'].get('data', ''), reverse=True)
    return out


def build():
    T = load_template()
    pages = []   # (file, head, content, sitemap)
    base_graph = [PERSON, WEBSITE]
    arts = articles()
    # 'ad Arezzo e Castiglion Fiorentino'
    cities = ('ad ' if CITIES[0][:1].lower() in 'aeiou' else 'a ') + ' e '.join(CITIES)

    # HOME
    hm, hb = frontmatter(read('content/home.md'))
    title, desc = seo('home', f'{NAME} — Batterista', '')
    latest = ''.join(f'<li><a href="/blog/{a["slug"]}/">{esc(a["meta"].get("titolo_it", a["slug"]))}</a></li>'
                     for a in arts[:5])
    inner = (md(italian(hb))
             + '\n<h2>Lezioni di batteria</h2>'
             + f'<p>Lezioni di batteria per bambini, ragazzi e adulti {esc(cities)}. '
               '<a href="/lezioni/">Scopri la didattica</a> e il metodo «Suona la Batteria» (Edizioni Eufonia).</p>'
             + (f'\n<h2>Ultime news</h2><ul>{latest}</ul>' if latest else ''))
    pages.append(('index.html', head('', title, desc, base_graph + [webpage('', title, desc)]),
                  static(f'{NAME} — Batterista, percussionista e insegnante di batteria', inner, hm.get('tagline_it', '')),
                  ('', mtime('content/home.md', 'content/settings.md'), '1.0')))

    # BIO
    m, b = frontmatter(read('content/bio.md'))
    title, desc = seo('bio', f'Bio — {NAME}', m.get('seo_desc_it', ''))
    g = base_graph + [dict(webpage('bio', title, desc, 'ProfilePage'), mainEntity={'@id': f'{BASE}/#person'}),
                      breadcrumb([('Home', page_url('')), ('Bio', page_url('bio'))])]
    pages.append(('bio/index.html', head('bio', title, desc, g, 'profile'),
                  static(f'{NAME} — Biografia', md(italian(b))), ('bio', mtime('content/bio.md'), '0.8')))

    # MUSICA
    m, b = frontmatter(read('content/musica.md'))
    title, desc = seo('musica', f'Musica — {NAME}', m.get('seo_desc_it', ''))
    vids = []
    for it in list_items(b):
        if it.startswith('video:'):
            p = [x.strip() for x in it[6:].split('|')]
            if len(p) >= 2:
                vids.append((p[0].replace('yt:', ''), p[1], p[2] if len(p) > 2 else ''))
    vlist = ''.join(f'<li><a href="https://www.youtube.com/watch?v={v[0]}">{esc(v[1])}</a>'
                    + (f' — {esc(v[2])}' if v[2] else '') + '</li>' for v in vids)
    inner = (f'<p>{esc(desc)}</p><h2>Video</h2><ul>{vlist}</ul>'
             + (f'<p><a href="{S["spotify"]}">Ascolta {NAME} su Spotify</a></p>' if S.get('spotify') else ''))
    g = base_graph + [webpage('musica', title, desc, 'CollectionPage'),
                      breadcrumb([('Home', page_url('')), ('Musica', page_url('musica'))])]
    pages.append(('musica/index.html', head('musica', title, desc, g), static('Musica e video', inner),
                  ('musica', mtime('content/musica.md'), '0.7')))

    # GALLERY
    m, b = frontmatter(read('content/gallery.md'))
    title, desc = seo('gallery', f'Gallery — {NAME}', m.get('seo_desc_it', ''))
    imgs = []
    for it in list_items(b):
        p = [x.strip() for x in it.split('|')]
        if p and p[0].startswith('assets/'):
            imgs.append((p[0], p[1] if len(p) > 1 else ''))
    glist = ''.join(f'<li>{esc(c or "Foto")}</li>' for _, c in imgs)
    g = base_graph + [dict(webpage('gallery', title, desc, 'CollectionPage'),
                           image=[{'@type': 'ImageObject', 'contentUrl': f'{BASE}/{src}', 'name': c or NAME,
                                   'creator': {'@id': f'{BASE}/#person'}} for src, c in imgs]),
                      breadcrumb([('Home', page_url('')), ('Gallery', page_url('gallery'))])]
    pages.append(('gallery/index.html', head('gallery', title, desc, g),
                  static('Gallery — Foto live', f'<p>{esc(desc)}</p><ul>{glist}</ul>'),
                  ('gallery', mtime('content/gallery.md'), '0.5')))

    # LEZIONI
    m, b = frontmatter(read('content/lezioni.md'))
    title, desc = seo('lezioni', f'Didattica — {NAME}', m.get('seo_desc_it', ''))
    lessons, recitals = [], []
    for it in list_items(b):
        if it.startswith('allievi:'):
            p = [x.strip() for x in it[8:].split('|')]
            if len(p) >= 2:
                recitals.append(p)
        else:
            p = [x.strip() for x in it.split('|')]
            if len(p) >= 2 and not re.search(r'\s', p[0]):
                lessons.append(p)
    book = m.get('libro_titolo', '')
    inner = f'<p>{esc(m["intro_it"])}</p>' if m.get('intro_it') else ''
    if book:
        inner += (f'<h2>Il mio libro: «{esc(book)}»</h2>'
                  f'<p>{esc(m.get("libro_sottotitolo_it", ""))}. {esc(m.get("libro_desc_it", ""))}</p>'
                  + (f'<p><a href="{m["libro_link"]}">Acquista «{esc(book)}» su Edizioni Eufonia</a></p>'
                     if m.get('libro_link') else ''))
    if lessons:
        inner += '<h2>Video lezioni gratuite</h2><ul>' + ''.join(
            f'<li><a href="https://www.youtube.com/watch?v={p[0]}">{esc(p[1])}</a>'
            + (f' — {esc(p[2])}' if len(p) > 2 else '') + '</li>' for p in lessons) + '</ul>'
    if recitals:
        inner += '<h2>I miei allievi sul palco</h2><ul>' + ''.join(
            f'<li><a href="https://www.youtube.com/watch?v={p[0]}">{esc(p[1])}</a></li>' for p in recitals) + '</ul>'
    inner += '<p><a href="/contatti/">Prenota una lezione di prova</a></p>'
    service = {
        '@type': 'Service', '@id': f'{BASE}/lezioni/#lezioni',
        'name': f'Lezioni di batteria {cities}',
        'serviceType': 'Lezioni di batteria',
        'description': desc,
        'provider': {'@id': f'{BASE}/#person'},
        'areaServed': [{'@type': 'City', 'name': c,
                        'containedInPlace': {'@type': 'AdministrativeArea', 'name': 'Provincia di Arezzo'}}
                       for c in CITIES],
        'audience': {'@type': 'Audience', 'audienceType': 'Bambini, ragazzi e adulti'},
        'url': page_url('lezioni'),
    }
    g = base_graph + [webpage('lezioni', title, desc), service,
                      breadcrumb([('Home', page_url('')), ('Didattica', page_url('lezioni'))])]
    if book:
        bk = {'@type': 'Book', '@id': f'{BASE}/lezioni/#libro', 'name': book, 'inLanguage': 'it',
              'author': {'@id': f'{BASE}/#person'},
              'publisher': {'@type': 'Organization', 'name': 'Edizioni Eufonia',
                            'url': 'https://www.edizionieufonia.it/'},
              'description': m.get('libro_desc_it', ''), 'genre': 'Metodo per batteria'}
        if m.get('libro_immagine'):
            bk['image'] = f'{BASE}/assets/images/{m["libro_immagine"]}'
        if m.get('libro_link'):
            bk['url'] = m['libro_link']
        if m.get('libro_titolo_en'):
            bk['workTranslation'] = {'@type': 'Book', 'name': m['libro_titolo_en'], 'inLanguage': 'en',
                                     'author': {'@id': f'{BASE}/#person'}}
        g.append(bk)
    pages.append(('lezioni/index.html', head('lezioni', title, desc, g),
                  static(f'Lezioni di batteria {cities}', inner),
                  ('lezioni', mtime('content/lezioni.md'), '0.9')))

    # BLOG (indice)
    title, desc = seo('blog', f'News — {NAME}', '')
    blist = ''.join(f'<li><a href="/blog/{a["slug"]}/">{esc(a["meta"].get("titolo_it", a["slug"]))}</a>'
                    + (f' — {esc(a["meta"]["seo_desc_it"])}' if a['meta'].get('seo_desc_it') else '') + '</li>'
                    for a in arts)
    g = base_graph + [webpage('blog', title, desc, 'CollectionPage'),
                      {'@type': 'Blog', '@id': f'{BASE}/blog/#blog', 'name': f'News — {NAME}',
                       'url': page_url('blog'), 'author': {'@id': f'{BASE}/#person'},
                       'blogPost': [{'@id': page_url('blog/' + a['slug']) + '#article'} for a in arts]},
                      breadcrumb([('Home', page_url('')), ('News', page_url('blog'))])]
    pages.append(('blog/index.html', head('blog', title, desc, g),
                  static('News — Lezioni, nozioni e storie della batteria', f'<p>{esc(desc)}</p><ul>{blist}</ul>'),
                  ('blog', mtime('content/blog.md', *[a['rel'] for a in arts]), '0.7')))

    # ARTICOLI
    for a in arts:
        am, slug = a['meta'], 'blog/' + a['slug']
        t = am.get('titolo_it', a['slug'])
        d = am.get('seo_desc_it') or am.get('descrizione_it', '')
        img = f'{BASE}/assets/images/{am["immagine"]}' if am.get('immagine') else OG_IMG
        post = {'@type': 'BlogPosting', '@id': page_url(slug) + '#article', 'headline': t[:110],
                'description': d, 'image': img, 'datePublished': am.get('data', TODAY),
                'dateModified': max(am.get('data', ''), mtime(a['rel'])),
                'author': {'@id': f'{BASE}/#person'}, 'publisher': {'@id': f'{BASE}/#person'},
                'mainEntityOfPage': page_url(slug), 'inLanguage': 'it-IT',
                'articleSection': am.get('categoria', 'news')}
        g = base_graph + [webpage(slug, f'{t} — {NAME}', d), post,
                          breadcrumb([('Home', page_url('')), ('News', page_url('blog')), (t, page_url(slug))])]
        date_txt = (f'<p><time datetime="{am["data"]}">{am["data"]}</time> · {NAME}</p>' if am.get('data') else '')
        pages.append((f'{slug}/index.html', head(slug, f'{t} — {NAME}', d, g, 'article', img),
                      static(t, date_txt + md(a['body']) + '<p><a href="/blog/">← Tutti gli articoli</a></p>'),
                      (slug, max(am.get('data', ''), mtime(a['rel'])), '0.6')))

    # CONTATTI
    title, desc = seo('contatti', f'Contatti — {NAME}', '')
    inner = (f'<p>{esc(desc)}</p><ul>'
             + (f'<li>WhatsApp: <a href="{WA}">{esc(PHONE)}</a></li>' if WA else '')
             + (f'<li>Email: <a href="mailto:{EMAIL}">{esc(EMAIL)}</a></li>' if EMAIL else '')
             + f'<li>Lezioni di batteria a: {esc(", ".join(CITIES))}</li></ul>')
    g = base_graph + [dict(webpage('contatti', title, desc, 'ContactPage'), mainEntity={'@id': f'{BASE}/#person'}),
                      breadcrumb([('Home', page_url('')), ('Contatti', page_url('contatti'))])]
    pages.append(('contatti/index.html', head('contatti', title, desc, g), static('Contatti', inner),
                  ('contatti', mtime('content/settings.md'), '0.8')))

    # PRIVACY / COOKIE (non indicizzate)
    for slug, rel, fb in (('privacy', 'content/privacy.md', 'Privacy Policy'),
                          ('cookie', 'content/cookie.md', 'Cookie Policy')):
        m, b = frontmatter(read(rel))
        t = f'{m.get("titolo_it", fb)} — {NAME}'
        pages.append((f'{slug}/index.html', head(slug, t, fb, base_graph, noindex=True),
                      static(m.get('titolo_it', fb), md(italian(b))), None))

    # scrittura
    changed = []
    for file, hd, content, _ in pages:
        if write(file, T.replace('{{SEO}}', hd).replace('{{CONTENT}}', content)):
            changed.append(file)
    # 404.html: come la home, ma non indicizzabile e senza testo statico
    home_head = pages[0][1].replace(ROBOTS_INDEX, 'noindex, follow')
    if write('404.html', T.replace('{{SEO}}', home_head).replace('{{CONTENT}}', '')):
        changed.append('404.html')

    # sitemap.xml + robots.txt
    urls = []
    for _, _, _, sm in pages:
        if sm:
            slug, lastmod, prio = sm
            urls.append(f'  <url>\n    <loc>{page_url(slug)}</loc>\n    <lastmod>{lastmod}</lastmod>\n'
                        f'    <priority>{prio}</priority>\n  </url>')
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(urls) + '\n</urlset>\n')
    if write('sitemap.xml', sitemap):
        changed.append('sitemap.xml')
    robots = ('User-agent: *\nAllow: /\nDisallow: /redazione/\nDisallow: /strumenti/\n\n'
              f'Sitemap: {BASE}/sitemap.xml\n')
    if write('robots.txt', robots):
        changed.append('robots.txt')

    print(f'SEO: {len(pages)} pagine, {len(urls)} indirizzi nella sitemap, {len(changed)} file aggiornati.')
    for c in changed:
        print('  -', c)


if __name__ == '__main__':
    build()
