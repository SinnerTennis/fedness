# Fedness — handoff UI per Claude Code

Redesign completo dell'interfaccia di Fedness (PWA dieta + spesa). Questo documento è la specifica; i file accanto sono gli asset da usare.

Design approvato (canvas, solo consultazione): https://claude.ai/code/artifact/4d4b60d8-f20d-4086-88fb-1950d4567ccf

## 1. Cosa fare e cosa non toccare

Riscrivi **solo lo strato di presentazione** di `index.html`: il blocco `<style>`, il markup statico e le funzioni `renderDiet`, `renderStats`, `renderShop`, `meter`, più la schermata `#lock`. Aggiungi la poca logica nuova descritta al punto 8.

Vincoli da rispettare:

- **Resta un solo `index.html`**, vanilla JS, nessun build, nessuna dipendenza a runtime. Font e icone sono file statici nel repo.
- **Non toccare**: cifratura e sblocco (`boot`, `deriveKey`, `decrypt`, `start`), `splitMeals`, `dayStats`, `MICROS`, formato di `data.js`, `encrypt.mjs`, logica di `sw.js`.
- **Non cambiare le chiavi di `localStorage`** (`fedness.checked`, `extra`, `hide`, `eaten`, `offplan`, `tab`, `key`): chi ha già l'app installata non deve perdere nulla.
- **Mai dati del piano in chiaro in file tracciati.** Il repo è su GitHub; `data.js` è in `.gitignore` e deve restarci. Il file di riferimento in `design/reference/` ha i dati rimossi apposta.
- Mantieni tutti i comportamenti attuali: spunta per alimento e per pasto, fuori piano, sostituzioni, "Nascondi presi", "Nuova spesa" con `confirm`, cambio giorno automatico al rientro, tastiera (Spazio/Invio sulle righe).
- L'app è usata su telefono (PWA standalone). Larghezza di progetto 390 px; `main` resta `max-width: 640px` centrato.

## 2. Cosa c'è in questa cartella

| Percorso | Contenuto |
|---|---|
| `HANDOFF.md` | questo documento |
| `icons/*.svg` | le 35 icone usate, file originali di Tabler Icons 3.52.0 (MIT) |
| `icons/paths.json` | le stesse icone come `{ chiave: { file, d } }`: `d` è l'unione dei `path` di ogni icona, pronta da incollare in un oggetto `ICONS` |
| `icons/LICENSE-tabler.txt` | licenza MIT di Tabler |
| `fonts/*.woff2` | font da servire in locale (subset latin): Barlow Condensed 500/600/700/800, IBM Plex Sans 400/500/600, Caveat 600 |
| `fonts/LICENSE-*.txt` | licenze SIL OFL dei tre font |
| `reference/Main.reference.dc.html` | sorgente del prototipo approvato, **senza dati**. È il riferimento esatto per markup, stili inline e calcoli (`renderVals`). Non è eseguibile così com'è e non va pubblicato: serve solo da leggere. |

Per il deploy sposta `fonts/` e (se usi i file) `icons/` dove ti è comodo, ad esempio in `assets/`. La cartella `design/` può restare nel repo come documentazione.

## 3. Concetto

Una scheda stampata su carta su cui si scrive a penna, con tessere colorate da tabellone.

- **Stampato** (viene dal piano): inchiostro nero su carta, titoli e numeri in condensato pesante, righe punteggiate, niente ombre, niente gradienti, angoli quasi vivi.
- **Scritto a mano** (lo fa l'utente): blu biro. Spunte disegnate a penna, testo barrato in blu, voci aggiunte dall'utente (fuori piano, prodotti extra, testo nei campi) in corsivo Caveat blu.
- **Colore = stato o categoria**, sempre come campitura piena con bordo nero 1,5 px e testo nero sopra. Mai testo colorato su carta, tranne l'arancio scuro `--flame-text`.

## 4. Token

```css
:root {
  --paper: #F0EBE1;      /* fondo ovunque */
  --ink: #17150F;        /* testo, bordi, riempimenti neri */
  --muted: #5E584C;      /* testo secondario (6:1 su carta) */
  --rule: #8F8774;       /* righe punteggiate, solo decorative */
  --track: #DCD4C3;      /* fondo anello */
  --pen: #1F3FA6;        /* blu biro: spunte, barrato, scritto a mano */
  --flame-text: #B33C06; /* unico arancio ammesso come TESTO su carta (4.9:1) */

  /* campiture: sempre con bordo --ink e testo --ink */
  --orange: #FF6A13;     /* kcal, pasti, palestra, oggi */
  --yellow: #FFC72C;     /* proteine, costo, trofeo, micro in corso */
  --blue: #4CC2FF;       /* carboidrati, nuoto, pescheria */
  --pink: #FF6FB0;       /* grassi, fuori piano */
  --lime: #B6F23A;       /* fatto / centrato / chiuso */
  --violet: #B79CFF;     /* settimana, riposo, sostituzioni */
  --red: #FF5A4D;        /* oltre il limite (campitura); il testo usa --flame-text */

  --font-display: "Barlow Condensed", "Arial Narrow", sans-serif;
  --font-body: "IBM Plex Sans", system-ui, sans-serif;
  --font-hand: "Caveat", cursive;
}
```

Regole fisse:

- Bordi: 2 px `--ink` per le righe di sezione e i bordi di testata; 1,5 px `--ink` per caselle, chip, tessere, barre; 1 px punteggiato `--rule` tra le righe di lista.
- Raggi: 2 px caselle, 3 px chip/bottoni/quadrati icona, 4 px tessere e fascia livello. Nient'altro.
- Solo tema chiaro. Rimuovi il blocco `prefers-color-scheme: dark`, porta entrambi i `theme-color` a `#F0EBE1` e in `manifest.webmanifest` metti `background_color` e `theme_color` a `#F0EBE1`.
- Aree toccabili ≥ 44 px (righe 48–52 px).
- Niente emoji da nessuna parte (oggi sono nella tab bar, in "Tutto preso" e negli avvisi).
- `button:focus-visible, input:focus-visible { outline: 3px solid var(--flame-text); outline-offset: 1px; }`

Scala tipografica (display = Barlow Condensed):

| Uso | Stile |
|---|---|
| Titolo schermata / giorno | display 800, 48 px, line-height .95, maiuscolo |
| Numero eroe (kcal mancanti) | display 800, 78 px, line-height .85 |
| Percentuale nell'anello | display 800, 60 px (simbolo % a 30 px) |
| Numero tessera KPI | display 800, 56 px |
| Contatore kcal / presi in testata | display 800, 36 px + unità display 500, 20 px, `--muted` |
| Titolo sezione / pasto | display 800, 23 px (21 px nei reparti spesa), maiuscolo |
| Quantità (g, ml, kg) | display 700, 19 px |
| Meta, kcal riga, chip | display 600–700, 15–17 px |
| Etichette piccole | display 600–700, 12–14 px, letter-spacing .1–.14em, maiuscolo |
| Testo di lista | body 400, 16 px, line-height 1.25 |
| Note, piè di pagina | body 400, 13–14,5 px |
| Scritto a mano | hand 600, 24–25 px, colore `--pen` |

Numeri sempre con `font-variant-numeric: tabular-nums`.

## 5. Font in locale

L'app deve funzionare offline: niente Google Fonts da rete.

```css
@font-face { font-family: "Barlow Condensed"; font-weight: 500; font-display: swap; src: url("fonts/barlow-condensed-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 600; font-display: swap; src: url("fonts/barlow-condensed-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 700; font-display: swap; src: url("fonts/barlow-condensed-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 800; font-display: swap; src: url("fonts/barlow-condensed-latin-800-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 400; font-display: swap; src: url("fonts/ibm-plex-sans-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 500; font-display: swap; src: url("fonts/ibm-plex-sans-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 600; font-display: swap; src: url("fonts/ibm-plex-sans-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Caveat"; font-weight: 600; font-display: swap; src: url("fonts/caveat-latin-600-normal.woff2") format("woff2"); }
```

Adatta i percorsi a dove metti i file. `sw.js` mette già in cache ogni GET: i font finiscono in cache alla prima apertura online, non serve cambiarlo.

## 6. Icone — Tabler Icons 3.52.0 (MIT)

Variante outline, viewBox 24, `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`. Non cambiare lo spessore del tratto.

Uso consigliato (nessun build): copia `icons/paths.json` in un oggetto `ICONS` dentro `index.html` e usa un helper.

```js
const icon = (k, size = 20) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[k].d}"/></svg>`;
```

| Chiave | File Tabler | Dove |
|---|---|---|
| `kitchen` | tools-kitchen-2 | tab Dieta; pranzo e cena; tessera Pasti |
| `flame` | flame | tab Oggi; quadrato kcal in testata Dieta e nell'eroe di Oggi |
| `cart` | shopping-cart | tab Spesa |
| `gym` | barbell | giorno di palestra (striscia giorni, chip attività) |
| `swim` | swimming | giorno di nuoto |
| `rest` | walk | giorno di riposo / passeggiata |
| `coffee` | coffee | colazione |
| `apple` | apple | spuntino, merenda |
| `bolt` | bolt | pre-workout, pre-nuoto |
| `moon` | moon | serale |
| `pizza` | pizza | cena libera |
| `cookie` | cookie | sezione Fuori piano |
| `swap` | arrows-exchange | sezione Sostituzioni |
| `down` / `up` | chevron-down / chevron-up | apri/chiudi Sostituzioni |
| `pin` | pinned | Nota del piano |
| `plus` | plus | bottoni Aggiungi |
| `x` | x | elimina voce |
| `trophy` | trophy | fascia Livello |
| `clock` | clock | Prossimo pasto |
| `meat` | meat | tessera Proteine |
| `bread` | bread | tessera Carbo; reparto Pane e colazione |
| `droplet` | droplet | tessera Grassi |
| `leaf` | leaf | tessera Micro; sezione Micro |
| `week` | calendar-week | tessera Settimana |
| `carrot` | carrot | reparto Frutta e verdura |
| `fish` | fish | reparto Pescheria e surgelati |
| `milk` | milk | reparto Latticini e uova |
| `bowl` | bowl-spoon | reparto Pasta, riso, legumi, conserve |
| `bottle` | bottle | reparto Dispensa e integratori |
| `pencil` | pencil | gruppo Aggiunti a mano |
| `euro` | coin-euro | chip costo rimanente |
| `eyeoff` | eye-off | Nascondi presi |
| `refresh` | refresh | Nuova spesa |
| `lock` | lock | bottone Entra |

Icona del pasto, dal nome: `/colazione/i` → coffee; `/spuntino|merenda/i` → apple; `/^pre-/i` → bolt; `/serale/i` → moon; `/libera/i` → pizza; altrimenti kitchen.

Reparti spesa, per indice in `SHOPPING`: 0 carrot + lime, 1 fish + blue, 2 milk + yellow, 3 bread + orange, 4 bowl + pink, 5 bottle + violet (oltre il sesto, ricomincia).

**La spunta a penna non è un'icona del set**: è un segno proprio dell'app, vedi 7.1.

## 7. Componenti

### 7.1 Casella con spunta a penna

Casella 26 × 26, bordo 1,5 px `--ink` (2,5 px per quella "tutto il pasto"), raggio 2. Vuota: trasparente. Spuntata: fondo `--lime` e spunta blu che esce dalla casella.

```html
<span class="box"><svg class="tick" viewBox="0 0 34 30" width="34" height="30" aria-hidden="true">
  <path d="M5 17 C8 19 10 23 12 27 C15 17 22 8 31 3" fill="none" stroke="#1F3FA6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
```

```css
.box { position: relative; flex: none; width: 26px; height: 26px; border: 1.5px solid var(--ink); border-radius: 2px; transition: background .2s; }
.done > .box { background: var(--lime); }
.tick { position: absolute; left: -2px; top: -10px; overflow: visible; display: none; }
.done > .box .tick { display: block; }
```

La casella sta **a destra** della riga (colonna "fatto", comoda col pollice).

### 7.2 Riga di lista (alimento, prodotto)

Tutta la riga è il bersaglio (`role="checkbox"`, `aria-checked`, `tabindex="0"`, come oggi). Altezza minima 48 px (52 nella spesa), bordo superiore 1 px punteggiato `--rule`, `display: flex; align-items: center; gap: 10px`.

Ordine: nome (flex 1, body 16) · quantità (display 700, 19, `nowrap`) · kcal (solo Dieta, larga 34 px, allineata a destra, display 500, 16, `--muted`) · casella.

Spuntata: nome e quantità in `--muted`, nome con `text-decoration: line-through; text-decoration-color: var(--pen); text-decoration-thickness: 2px`.

### 7.3 Testata di sezione

`min-height: 52px; padding: 9px 0 8px; border-top: 2px solid var(--ink); display: flex; align-items: center; gap: 10px`.

Contenuto: quadrato icona 32 × 32 (bordo 1,5, raggio 3, campitura colorata, icona 20 px nera) · titolo · elemento a destra (kcal, contatore, casella o chevron).

### 7.4 Chip

`display: inline-flex; align-items: center; gap: 5–6px; height: 26–28px; padding: 0 9px 0 7px; border: 1.5px solid var(--ink); border-radius: 3px; background: <campitura>; font: 700 16px var(--font-display)`. Icona 18 px a sinistra quando c'è.

### 7.5 Barra di avanzamento

Contenitore alto 12–14 px con bordo 1,5 px `--ink`, fondo trasparente; riempimento colorato pieno, senza raggio. `transition: width .4s cubic-bezier(.2,.8,.2,1)`. Mantieni `role="progressbar"` e gli attributi `aria-value*`.

### 7.6 Campo "scritto a mano" e bottone +

Etichetta sopra (display 600, 12 px, maiuscolo, `--muted`) e input senza riquadro: `height: 40px; border: 0; border-bottom: 1.5px solid var(--ink); border-radius: 0; background: transparent; font: 600 24px var(--font-hand); color: var(--pen)`. Placeholder "scrivi qui" in `--muted`.

Bottone +: 44 × 44, fondo `--ink`, raggio 3, icona `plus` 22 px color carta.

### 7.7 Timbro

`OGGI` accanto al nome del giorno: bordo 2 px e testo `--flame-text`, display 700, 14 px, letter-spacing .14em, `transform: rotate(-5deg)`.

`FATTO` sulle tessere KPI: in alto a destra (`top: 7px; right: 8px`), bordo 2 px `--ink`, fondo `--paper`, display 800, 12 px, `rotate(-8deg)`, con ingresso:

```css
@keyframes fd-pop { 0% { transform: rotate(-8deg) scale(1.9); opacity: 0; } 100% { transform: rotate(-8deg) scale(1); opacity: 1; } }
.stamp { animation: fd-pop .28s cubic-bezier(.2,.9,.3,1.2) both; }
@media (prefers-reduced-motion: reduce) { .stamp { animation: none; } * { transition: none !important; } }
```

Attenzione: oggi ogni render riscrive `innerHTML`, quindi l'animazione ripartirebbe a ogni spunta. Falla partire solo quando una tessera passa da non fatta a fatta (confronta con lo stato del render precedente).

### 7.8 Tab bar

Alta 60 px + `env(safe-area-inset-bottom)`, bordo superiore 2 px `--ink`, tre bottoni uguali separati da 1,5 px `--ink`. Attivo: fondo `--ink`, testo `--paper`. Inattivo: fondo carta, testo `--ink`.

Ogni bottone ha due righe:

1. icona 20 px + etichetta (display 800, 20 px, letter-spacing .1em): `DIETA`, `OGGI`, `SPESA`;
2. dato vivo (display 500, 14 px; `--muted`, oppure `#D8D0BF` sul bottone attivo): nome del giorno di oggi · `mancano N` oppure `oltre di N` · `N/M presi`.

La seconda riga va aggiornata a ogni render di dieta e spesa.

## 8. Logica nuova

Tutto si ricava da ciò che l'app salva già (`eaten` per data ISO, tenuto 7 giorni). Per la settimana corrente usa `iso(i - today)` come fa `dayStats`.

```js
// giorno i (0 = lun) chiuso = tutti gli alimenti di tutti i pasti spuntati
const closed = i => { const s = new Set(eaten[iso(i - today)] || []);
  return DIET[i].meals.every((m, mi) => m.foods.every((_, fi) => s.has(mi + "-" + fi))); };
const weekClosed = DIET.map((_, i) => closed(i));

// serie: giorni chiusi consecutivi fino a oggi (o fino a ieri, se oggi è ancora aperto)
let streak = 0;
for (let k = weekClosed[today] ? today : today - 1; k >= 0 && weekClosed[k]; k--) streak++;

// punteggio e livello (su oggi)
const ratio = mac[0] / d.tot[0], score = Math.min(100, Math.floor(ratio * 100)), over = mac[0] > d.tot[0];
const LV = [[1, "A DIGIUNO"], [25, "RISCALDAMENTO"], [50, "IN SPINTA"], [75, "IN FIAMME"], [100, "QUASI SGRAVATO"]];
const li = LV.findIndex(l => score < l[0]);
const level = over ? "FUORI GIRI" : li < 0 ? "SGRAVATO" : LV[li][1];
// a destra nella fascia, su due righe:
//   over      → "+N kcal" / "sul piano di oggi"
//   li < 0    → "piano chiuso" / "ci vediamo domani"
//   altrimenti→ "ancora N kcal" / "per <livello successivo>"
//               N = max(1, ceil(LV[li][0] / 100 * d.tot[0]) - mac[0]); dopo QUASI SGRAVATO viene SGRAVATO

// micro: centrato = non è un limite massimo e got >= obiettivo. Il sodio (limite) non entra nel conteggio: 8 obiettivi.
// pasti fatti = pasti con tutti gli alimenti spuntati; prossimo pasto = il primo non completo.
```

La serie è limitata alla settimana corrente (lun–dom), perché `eaten` tiene solo 7 giorni. Va bene così.

Nel fuori piano restano solo le kcal, come oggi.

## 9. Schermate

Per misure e struttura esatte, il riferimento è `reference/Main.reference.dc.html` (cerca `isDiet`, `isStats`, `isShop`).

### 9.1 Dieta (`#diet`, `renderDiet`)

**Testata fissa** (padding 14/16/12, bordo inferiore 2 px):

1. **Striscia giorni**: 7 bottoni uguali, alti 58 px, gap 4, bordo 1,5, raggio 3. Dentro, in colonna: lettera (display 800, 21 px), icona attività 16 px, barretta 20 × 3 px. Stati: selezionato = fondo `--ink`, testo carta; chiuso e non selezionato = fondo `--lime`; altrimenti trasparente. La barretta è `--orange` solo sul giorno di oggi. Sparisce il bordo colorato per tipo: il tipo lo dice l'icona.
2. **Contatore**: quadrato 34 px arancio con `flame` 22 px · `1240` (36 px) `/ 2014 kcal` · a destra `mancano 774` (display 700, 19 px; `oltre di N` in `--flame-text`).
3. **Barra a segmenti**: un segmento per pasto, largo in proporzione alle kcal del pasto (`flex: <kcal> 1 0`), gap 3, alto 14, bordo 1,5; riempimento `--orange` pari alla quota mangiata di quel pasto. Se c'è fuori piano, un segmento in più pieno in `--pen`.
4. **Tre chip macro** uguali, alti 26: `P 98 / 167` giallo, `C 120 / 219` azzurro, `G 30 / 48` rosa.

**Corpo** (padding 16/16/28):

1. Nome del giorno (48 px) + timbro `OGGI` se è oggi.
2. Chip attività con icona e testo `d.activity`: arancio palestra, azzurro nuoto, viola riposo.
3. Nota, se c'è: riquadro tratteggiato 1,5 px, etichetta `NOTA DEL PIANO` con `pin` in `--flame-text`, testo 14,5 px. Sostituisce la card con bordo sinistro.
4. **Pasti**: testata di sezione cliccabile (spunta tutto) con quadrato icona del pasto (diventa lime quando il pasto è completo) · colonna con nome (23 px) e sotto `07:30 · 446 kcal` (display 600, 16, `--muted`) · casella grande a destra. Poi le righe alimento (7.2). In fondo, riga macro: tre quadratini 11 px colorati (giallo/azzurro/rosa, bordo 1,5) con `P 34`, `C 63`, `G 5`.
5. **Fuori piano**: testata con quadrato rosa `cookie` e totale kcal a destra. Voci in corsivo blu (nome e kcal) con bottone `x` 44 × 44. Sotto, i due campi a riga (`COSA HAI MANGIATO`, `KCAL` largo 70 px) e il bottone +.
6. **Sostituzioni equivalenti**: testata cliccabile con quadrato viola `swap` e chevron. Aperta: per ogni voce gruppo (display 700, 14 px, maiuscolo, `--muted`) + riferimento (body 600, 15) e sotto gli equivalenti (14,5 px). Puoi tenere `<details>` se dai lo stesso aspetto.

### 9.2 Oggi (`#stats`, `renderStats`) — il tabellone

**Testata**: `OGGI` (48 px) e a destra chip attività `Domenica · Riposo` con icona.

**Corpo**:

1. **Eroe**, due colonne.
   - Sinistra: anello SVG 172 px. Cerchio di fondo r 74, tratto 20, `--track`; cerchio di avanzamento uguale in `--orange` (`--red` se oltre) con `stroke-dasharray: <ratio × 464.96> 464.96`, ruotato di −90°, `transition: stroke-dasharray .6s`; due cerchi di contorno neri da 1,5 px a r 84,25 e r 63,75. Al centro `62%` e sotto `DEL PIANO` (display 600, 13, `--muted`).
   - Destra: quadrato arancio `flame`; numero eroe = kcal mancanti (78 px, nero; in `--flame-text` se oltre); `KCAL ANCORA / DA MANGIARE` oppure `KCAL OLTRE / IL PIANO` (display 700, 20, maiuscolo); `1240 mangiate di 2014` (14 px, `--muted`).
2. **Fascia livello**: fondo `--ink`, testo carta, raggio 4, padding 10/12. Quadrato giallo 38 px con `trophy` 24 · `LIVELLO` (12 px) e nome del livello (display 800, 30) · a destra le due righe del punto 8.
3. **Prossimo pasto**: `clock` 18 px · `PROSSIMO` in `--flame-text` · nome (body 600, 16) · `17:00 · 230 kcal` in `--muted`. A pasti finiti: `FATTO` · "Tutti i pasti di oggi sono spuntati."
4. **Griglia di 6 tessere**, 2 colonne, gap 8. Tessera: `min-height: 136px; padding: 10px 11px 11px; border: 1.5px solid var(--ink); border-radius: 4px`, testo nero. Dall'alto: icona 18 + etichetta (display 700, 14, maiuscolo) · numero (56 px) + `/ totale` (19 px) · in fondo barra oppure fila di caselle · riga di stato (display 600, 15). Timbro `FATTO` quando è completa.

   | Tessera | Colore | Numero | In fondo | Riga di stato | Fatta quando |
   |---|---|---|---|---|---|
   | Proteine | yellow | g mangiati `/ tot g` | barra nera (fondo carta al 55%) | `mancano N g` · `oltre di N g` · `centrato al grammo` | g ≥ tot |
   | Carbo | blue | idem | idem | idem | idem |
   | Grassi | pink | idem | idem | idem | idem |
   | Pasti | orange | pasti fatti `/ n` | una casella per pasto | `prossimo alle HH:MM` · `tutti spuntati` | tutti fatti |
   | Micro | lime | centrati `/ 8` | una casella per obiettivo | `obiettivi centrati` · `tutti centrati` | 8 su 8 |
   | Settimana | violet | giorni chiusi `/ 7` | 7 caselle lun–dom | `serie di N giorni` · `1 giorno chiuso di fila` · `giorni chiusi` | 7 su 7 |

   Caselle delle tessere: `flex: 1; max-width: 24px; height: 14px; border: 1.5px solid var(--ink)`. Piena = `--ink`; parziale (pasto iniziato, oppure oggi non ancora chiuso) = `rgba(23,21,15,.35)`; vuota = trasparente.
5. **Micro**: testata di sezione con quadrato lime `leaf`, titolo `MICRO`, a destra `STIMA / OBIETTIVO`. Una riga per micronutriente, alta 40 px, griglia `104px 1fr auto`: nome (15 px, con `max` in piccolo per il sodio) · barra bordata da 12 px · `33 / 30 g`. Riempimento: giallo in corso, lime centrato (testo `· centrato`), rosso oltre il limite (testo `· oltre`, valore in `--flame-text`).
6. Nota a piè: "Stime da valori medi per 100 g. Il fuori piano conta solo nelle kcal."

Sparisce l'anello `conic-gradient` attuale e le tre card Macro/Micro.

### 9.3 Spesa (`#shop`, `renderShop`)

**Testata fissa**:

1. `SPESA` (48 px) e a destra `12` (36 px) `/ 36 presi`.
2. Barra bordata da 14 px con riempimento `--lime`.
3. Riga: chip giallo con `euro` e `restano circa 58,40 €` · a destra interruttore `Nascondi presi` (icona `eyeoff`, testo 15 px, casellina 22 px che diventa lime con spunta a penna; `role="switch"`).
4. Campo a riga `AGGIUNGI PRODOTTO` + bottone +.

**Corpo**:

1. **Aggiunti a mano** in cima (era "Extra" in fondo): testata con quadrato carta `pencil` e contatore. Voci in corsivo blu 25 px, con bottone `x` e casella.
2. **Reparti**: testata con quadrato icona colorato (vedi punto 6), nome (21 px), contatore `3/7` in un chip bordato che diventa lime quando il reparto è completo. Righe prodotto (7.2) con quantità; i presi scendono in fondo al reparto, come oggi.
3. In fondo alla lista: bottone a tutta larghezza `NUOVA SPESA` con `refresh` (bordo 1,5, alto 50, display 700, 18, maiuscolo) e sotto "Azzera le spunte e i prodotti aggiunti a mano." Era in testata: va spostato qui, lontano dai tocchi accidentali. Il `confirm` resta.
4. Lista vuota con "Nascondi presi" attivo: `TUTTO PRESO.` (display 800, 34, centrato), senza emoji.

### 9.4 Sblocco (`#lock`)

Fondo carta, colonna centrata, padding 24/28/28.

- Logo `icon-512.png` grande (circa 85% della larghezza, max 332 px), bordo 2 px `--ink`, raggio 6, `transform: rotate(-3deg)`.
- Sotto, su due righe: **"Diventa una fottuta statua marmorea!"** (display 800, 34 px, maiuscolo, centrato).
- In basso: etichetta `PASSWORD` + input a riga (48 px, puntini in `--pen`, letter-spacing .2em); bottone `ENTRA` a tutta larghezza (alto 54, fondo `--ink`, testo carta, display 800, 22, letter-spacing .14em) con `lock` 22 px a sinistra del testo; messaggio d'errore centrato in `--flame-text` (body 600, 14) con spazio riservato di 20 px anche quando è vuoto.

Tieni l'input `username` nascosto e gli `autocomplete` attuali.

## 10. Accessibilità

- Righe e testate cliccabili restano `role="checkbox"` + `aria-checked` + `tabindex="0"` con Spazio/Invio, oppure diventano veri `<button>`.
- Bottoni con sola icona: `aria-label` (già presenti per + ed elimina).
- Icone decorative `aria-hidden="true"`. Anello e fila di caselle: `role="img"` con `aria-label` che dice i numeri.
- Lo stato non passa mai solo dal colore: c'è sempre testo, spunta o timbro (`oltre`, `centrato`, `FATTO`).
- Testo colorato su carta solo `--ink`, `--muted`, `--pen`, `--flame-text`. Lime, giallo, azzurro, rosa, viola, arancio e rosso sono campiture, mai colore del testo.

## 11. Verifica finale

- [ ] `index.html` unico, nessuna richiesta di rete oltre ai file del repo; funziona offline dopo la prima apertura.
- [ ] Sblocco, cifratura e chiavi di `localStorage` invariati; i dati già salvati si rivedono.
- [ ] Nessun dato del piano in file tracciati (`git status` pulito su `data.js`).
- [ ] Dieta: spunta singola e di pasto, barra a segmenti, chip macro, giorni chiusi in lime, fuori piano, sostituzioni.
- [ ] Oggi: anello, livello con soglie, sei tessere con timbro, micro con tre stati, stato "oltre" in rosso.
- [ ] Spesa: contatori di reparto, aggiunti a mano in cima, Nascondi presi, Nuova spesa in fondo con conferma.
- [ ] Tab bar con dato vivo aggiornato dopo ogni spunta.
- [ ] Provato a 360, 390 e 430 px di larghezza, con tacca e barra home (safe area).
- [ ] Nessuna emoji, nessun gradiente, nessuna ombra; `prefers-reduced-motion` rispettato.
