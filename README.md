# Wortschatz · Słownictwo

Mobile-first vocabulary trainer for **German ⇄ Polish** (with English hints). Static site – no server, no build step.

- **6,357 words** from the Duolingo Polish→German course word list (via duome.eu), Polish forms merged per German headword
- **100 short sentences** (DE / PL / EN)
- **Both directions:** DE→PL, PL→DE or mixed
- **5 exercises:** match words · pick translation · write the word · build a sentence · write a sentence (+ a mixed mode)
- **Tips** shown for every exercise, matched to the language you have to produce (German or Polish)
- **Profiles & scores** stored in the browser (XP, streaks, accuracy, 14-day chart, weak words, spaced-repetition boxes); export/import a backup as JSON
- Works offline once opened (service worker), installable to the home screen

## Run locally
    python3 -m http.server 8000   # then open http://localhost:8000

## Publish on GitHub Pages
Repo → Settings → Pages → "Deploy from a branch" → `main` / root. The app is then served at `https://<user>.github.io/<repo>/`.

## Data
`data/words.js` – `[german, [polish forms], english]` (English is filled in progressively; entries without it simply show no hint).
`data/sentences.js` – `[german, polish, english]`.
Vocabulary source: https://duome.eu/vocabulary/pl/de (unofficial Duolingo fan site).
