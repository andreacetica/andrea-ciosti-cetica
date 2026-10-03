# PIANO EDITORIALE — sezione NEWS di andreaciosticetica.com

Questo file guida l'articolo settimanale scritto in automatico.
Puoi modificarlo quando vuoi: aggiungere argomenti, cambiarne l'ordine, togliere quelli che non ti piacciono.

## Come funziona

1. Ogni settimana viene scritto UN articolo, in italiano e in inglese, preso dalla "CODA ARGOMENTI" qui sotto (il primo non ancora fatto).
2. L'articolo viene salvato come BOZZA in `content/articoli/` e aggiunto a `content/blog.md` e `content/news.md`.
3. Le bozze si vedono SOLO in locale (Live Server, 127.0.0.1:5500/blog) con l'etichetta gialla "BOZZA". Online non compaiono.
4. Per pubblicare: apri il file dell'articolo, cambia `stato: bozza` in `stato: pubblicato`, salva e fai git add / commit / push.
5. Per scartarlo: lascialo in bozza, oppure metti `#` davanti alla sua riga in `content/blog.md` e `content/news.md`.

## Linee guida per chi scrive

- Voce: in prima persona, come Andrea Ciosti Cetica — batterista e percussionista, insegnante di ruolo al Liceo "Dante-Alberti" di Firenze, autore del metodo "Suona la Batteria" (Edizioni Eufonia). Tono caldo, diretto, appassionato, da insegnante che parla a un allievo. Niente toni da enciclopedia.
- Non inventare MAI esperienze personali di Andrea (concerti, aneddoti, allievi, collaborazioni). Si può parlare del suo modo di insegnare solo in termini generali.
- Lunghezza: 600–900 parole per lingua.
- Struttura: un'apertura che aggancia, 3–5 sezioni con titoletti (##), e una chiusura con un invito pratico (esercizio da provare, ascolto consigliato, domanda al lettore).
- Le LEZIONI devono contenere almeno un esercizio concreto e spiegato passo passo (diteggiatura R/L, tempi di metronomo consigliati).
- Le STORIE e le NOZIONI devono basarsi su fonti verificate: fare ricerca sul web, controllare date e nomi su almeno due fonti, e chiudere l'articolo con una sezione "## Fonti" (in IT) e "## Sources" (in EN) con i link usati. Se un dato non è verificabile, non scriverlo.
- Niente immagini prese dal web (diritti d'autore): l'articolo usa la copertina grafica automatica della sua categoria.
- Niente citazioni lunghe da libri o interviste: al massimo una frase breve tra virgolette, con la fonte.
- Inglese: traduzione naturale, non letterale.
- Alternare le categorie: lezione → storia → nozione → lezione → storia → nozione …

## Formato del file (content/articoli/NOME-ARTICOLO.md)

```
---
slug: nome-articolo
titolo_it: Titolo in italiano
titolo_en: Title in English
data: AAAA-MM-GG
categoria: lezione        (oppure: nozione, storia)
stato: bozza
seo_desc_it: Una frase di massimo 155 caratteri per Google.
seo_desc_en: One sentence, max 155 characters, for Google.
---

Testo in italiano (markdown)…

---EN---

English text (markdown)…
```

## CODA ARGOMENTI (dall'alto verso il basso)

- [x] lezione | Il paradiddle: il rudimento che apre mille porte
- [x] storia | Gene Krupa e l'assolo di "Sing, Sing, Sing": quando la batteria diventò protagonista
- [ ] nozione | Com'è nata la batteria: dal "double drumming" al drum set moderno
- [ ] lezione | Il metronomo non è un nemico: 5 esercizi per un tempo solido
- [ ] storia | Buddy Rich: tecnica, velocità e carattere
- [ ] nozione | Timpani, rullante, grancassa: le percussioni dell'orchestra spiegate semplici
- [ ] lezione | Le ghost notes: il segreto dei groove che "respirano"
- [ ] storia | Tony Williams: il ragazzo che rivoluzionò il jazz a 17 anni
- [ ] nozione | Bacchette: legno, punta, peso — come scegliere quelle giuste
- [ ] lezione | Il groove a sedicesimi: dal rock al funk in 4 passaggi
- [ ] storia | Steve Gadd e il groove di "50 Ways to Leave Your Lover"
- [ ] nozione | Le percussioni latine: congas, bongos, timbales e il ruolo della clave
- [ ] lezione | L'indipendenza mani-piedi: esercizi graduali per principianti
- [ ] storia | Evelyn Glennie: la percussionista che ascolta con tutto il corpo
- [ ] nozione | Accordare la batteria: le basi per un suono che funziona
- [ ] lezione | Il doppio colpo (double stroke roll): dal lento al veloce
- [ ] storia | John Bonham e il suono di "When the Levee Breaks"
- [ ] nozione | La marimba e il vibrafono: le percussioni che "cantano"

## ARTICOLI GIÀ SCRITTI

(Qui sotto vengono annotati automaticamente: data — categoria — titolo — file)
- 2026-10-01 — lezione — Il paradiddle: il rudimento che apre mille porte — content/articoli/il-paradiddle.md
- 2026-10-01 — storia — Gene Krupa e "Sing, Sing, Sing": quando la batteria diventò protagonista — content/articoli/gene-krupa-sing-sing-sing.md

## SEO (per farsi trovare su Google)

- `titolo_it`: chiaro e con la parola che la gente cerca (es. "Il paradiddle: cos'è e come si studia").
- `seo_desc_it` / `seo_desc_en`: massimo 155 caratteri, con la parola chiave all'inizio.
- Nelle LEZIONI aggiungi, in chiusura, un link alla pagina lezioni: `[lezioni di batteria ad Arezzo e Castiglion Fiorentino](/lezioni/)`.
- Quando è utile, collega un articolo a un altro già pubblicato con un link `/blog/nome-articolo/`.
- Le pagine per Google (sitemap, pagine statiche, dati strutturati) si rigenerano DA SOLE a ogni `git commit`
  grazie a `strumenti/genera-seo.py`. Non serve fare altro.
