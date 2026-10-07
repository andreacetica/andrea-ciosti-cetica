# PIANO EDITORIALE — sezione NEWS di andreaciosticetica.com

Questo file guida i due articoli settimanali (e i loro caroselli Instagram) scritti in automatico.
Puoi modificarlo quando vuoi: aggiungere argomenti, cambiarne l'ordine, togliere quelli che non ti piacciono.

## Come funziona

Ogni venerdì (attività programmata, alle 18:22) vengono scritti DUE articoli, in italiano e in inglese:
- uno dalla **CODA TECNICA** (categoria `lezione`, oppure `nozione` se è un argomento pratico come bacchette o accordatura);
- uno dalla **CODA STORIE E CURIOSITÀ** (categoria `storia`, oppure `nozione` se è cultura/strumenti).

Per ogni articolo:
1. Il file viene creato in `content/articoli/` con `stato: pubblicato` e aggiunto a `content/blog.md` e `content/news.md`.
   Online compare SOLO dopo il push: in VS Code fai `git add .` → `git commit -m "Articoli della settimana"` → `git push`.
   (Prima puoi rileggerlo con Live Server su 127.0.0.1:5500/blog/NOME-ARTICOLO.)
2. Viene creato il carosello Instagram in `social/caroselli/AAAA-MM-GG-NOME-ARTICOLO/`:
   `slide-1.jpg … slide-N.jpg`, `storia-link.jpg` (storia con lo spazio per l'adesivo Link) e `didascalia.txt`.
   Le immagini si generano con `python3 social/_motore/genera-carosello.py CARTELLA` a partire da `carosello.json`.
3. Per scartare un articolo: metti `stato: bozza` nel file, oppure `#` davanti alla sua riga in `content/blog.md` e `content/news.md`.

Puoi modificare le code quando vuoi: aggiungere, togliere o spostare argomenti.
Gli argomenti segnati (Facchin) vengono dal libro di Guido Facchin: per usarli leggi redazione/fonte-facchin.md (la sigla "(Facchin)" non va nel titolo dell'articolo).

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
- Ogni settimana: un articolo dalla CODA TECNICA e uno dalla CODA STORIE E CURIOSITÀ.

## Formato del file (content/articoli/NOME-ARTICOLO.md)

```
---
slug: nome-articolo
titolo_it: Titolo in italiano
titolo_en: Title in English
data: AAAA-MM-GG
categoria: lezione        (oppure: nozione, storia)
stato: pubblicato
seo_desc_it: Una frase di massimo 155 caratteri per Google.
seo_desc_en: One sentence, max 155 characters, for Google.
---

Testo in italiano (markdown)…

---EN---

English text (markdown)…
```

## CAROSELLI INSTAGRAM (uno per articolo)

- Cartella: `social/caroselli/AAAA-MM-GG-SLUG/` con dentro `carosello.json`; poi lanciare
  `python3 social/_motore/genera-carosello.py social/caroselli/AAAA-MM-GG-SLUG`.
- Il formato di `carosello.json` è spiegato in cima a `social/_motore/genera-carosello.py`.
- 5 slide (massimo 7): la prima `copertina`, l'ultima `finale`; in mezzo `testo`, `passi`, `schede` o `griglia`.
- Colori automatici: `lezione` = fucsia, `storia`/`nozione` = azzurro.
- Testi brevi: titoli massimo 3-4 parole per riga, testo di una slide massimo 35 parole.
- Per le lezioni la slide `finale` è "ESERCIZIO DELLA SETTIMANA" con un esercizio concreto (bpm); per le storie "COSA IMPARIAMO".
- `didascalia`: 3-5 righe + "👉 Scorri…" + "📖 L'articolo completo è sul sito (link in bio): andreaciosticetica.com/blog/SLUG/" + ESATTAMENTE 5 hashtag (limite di Instagram) (vedi redazione/linee-guida-contenuti.md).
- Niente immagini prese dal web, solo grafica.

## CODA TECNICA (dall'alto verso il basso)

- [ ] lezione | Il metronomo non è un nemico: 5 esercizi per un tempo solido
- [ ] lezione | Le ghost notes: il segreto dei groove che "respirano"
- [ ] nozione | Bacchette: legno, punta, peso — come scegliere quelle giuste
- [ ] lezione | Il groove a sedicesimi: dal rock al funk in 4 passaggi
- [ ] lezione | L'indipendenza mani-piedi: esercizi graduali per principianti
- [ ] nozione | Accordare la batteria: le basi per un suono che funziona
- [ ] lezione | Il doppio colpo (double stroke roll): dal lento al veloce
- [ ] lezione | Xilofono: le prime scale a due bacchette
- [ ] lezione | Il flam: il rudimento che dà "spessore" al colpo
- [ ] lezione | Leggere la batteria: le note sul pentagramma in 10 minuti
- [ ] lezione | Il triangolo non è uno strumento facile: presa, colpo e tremolo (Facchin)
- [ ] lezione | Il tamburello a cornice italiano: le basi della tecnica (Facchin)
- [ ] lezione | I piatti a due dell'orchestra: come si suona un colpo crash (Facchin)
- [ ] lezione | Le castagnette: tecnica orchestrale e tecnica spagnola (Facchin)
- [ ] lezione | Il piatto sospeso: zone di percussione, rullo e smorzamento (Facchin)
- [ ] lezione | Il rullo sul rullante orchestrale: colpi doppi o rullo "pressato"? (Facchin)
- [ ] lezione | Lo hi-hat: regolazione e tecniche di base (Facchin)
- [ ] lezione | Le maracas: come si suonano davvero (Facchin)
- [ ] lezione | Il guiro e lo shaker: il groove della mano sinistra latina (Facchin)
- [ ] lezione | Timpani: prima lezione, colpo, rullo e intonazione (Facchin)

## CODA STORIE E CURIOSITÀ (dall'alto verso il basso)

- [ ] nozione | Com'è nata la batteria: dal "double drumming" al drum set moderno
- [ ] storia | Buddy Rich: tecnica, velocità e carattere
- [ ] nozione | Timpani, rullante, grancassa: le percussioni dell'orchestra spiegate semplici
- [ ] storia | Tony Williams: il ragazzo che rivoluzionò il jazz a 17 anni
- [ ] storia | Steve Gadd e il groove di "50 Ways to Leave Your Lover"
- [ ] nozione | Le percussioni latine: congas, bongos, timbales e il ruolo della clave
- [ ] storia | Evelyn Glennie: la percussionista che ascolta con tutto il corpo
- [ ] storia | John Bonham e il suono di "When the Levee Breaks"
- [ ] nozione | La marimba e il vibrafono: le percussioni che "cantano"
- [ ] storia | Il "Funky Drummer" di Clyde Stubblefield: il groove più campionato della storia
- [ ] storia | Zildjian: la famiglia che fa piatti dal 1623 (Facchin)
- [ ] nozione | Gong e tam-tam: non sono la stessa cosa (Facchin)
- [ ] nozione | Il triangolo: dalle bande militari turche all'orchestra (Facchin)
- [ ] storia | La musica dei giannizzeri: come i tamburi turchi conquistarono l'Europa (Facchin)
- [ ] nozione | Le campane tubolari: dalle chiese al palco (Facchin)
- [ ] nozione | Lo steel drum: il tamburo nato dai bidoni di Trinidad (Facchin)
- [ ] nozione | La celesta e la Fata Confetto di Čajkovskij (Facchin)
- [ ] nozione | Le campane tibetane: storia, materiali e suono (Facchin)
- [ ] nozione | La tammorra e il tamburello: le percussioni del Sud Italia (Facchin)
- [ ] nozione | Il talking drum: il tamburo che parla (Facchin)
- [ ] nozione | Taiko: i grandi tamburi del Giappone (Facchin)
- [ ] nozione | La tabla indiana: due tamburi, mille suoni (Facchin)
- [ ] nozione | Il darbuka: il tamburo a calice del Medio Oriente (Facchin)
- [ ] nozione | Il pandeiro brasiliano: un tamburello che vale un'orchestra (Facchin)
- [ ] storia | Il tamburo di Basilea: la tradizione dei tamburini svizzeri (Facchin)
- [ ] nozione | La grancassa: dalla banda all'orchestra al pedale jazz (Facchin)
- [ ] nozione | I timpani: dalla cavalleria all'orchestra sinfonica (Facchin)
- [ ] nozione | Lo xilofono: dalle origini africane e asiatiche al concerto (Facchin)
- [ ] nozione | Il balafon: l'antenato africano della marimba (Facchin)
- [ ] nozione | L'hang: lo strumento più giovane della famiglia (Facchin)
- [ ] nozione | Il waterphone e la sega musicale: i suoni del cinema horror (Facchin)
- [ ] nozione | Strumenti trovati: padelle, bidoni e freni d'auto in orchestra (Facchin)
- [ ] nozione | La txalaparta basca: suonare in due su un'asse di legno (Facchin)
- [ ] nozione | Il glockenspiel: i "campanelli" dell'orchestra (Facchin)
- [ ] nozione | Claves, guiro, maracas: la famiglia delle percussioni latine piccole (Facchin)

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
