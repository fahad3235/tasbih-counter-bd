# Tasbih Counter BD — Digital Dhikr Counter

Offline, bilingual (English / বাংলা) digital tasbih counter for daily dhikr practice.
Tap the big circle (or press Space) to count. No account, no server, no network calls —
everything is stored in your browser's localStorage.

## Features

1. **Big tap counter** — large tap target with Space-key support, live progress bar and
   percentage toward the current dhikr's target.
2. **8 preset dhikrs** — SubhanAllah, Alhamdulillah, Allahu Akbar (33 each) and
   La ilaha illallah, SubhanAllahi wa bihamdihi, Astaghfirullah, Salawat,
   La hawla wa la quwwata illa billah (100 each), each shown with Arabic text,
   transliteration and an English/Bangla meaning.
3. **Target cycles** — finishing a target counts one completed cycle, resets the
   counter, and plays a short tone (optional) plus vibration on supported devices.
4. **Custom dhikrs** — add your own dhikr with any target from 1 to 10000, delete it later.
5. **Daily totals, streaks and chart** — today's count, all-time total, day streak
   (alive through yesterday if today is empty), best day, and a 7-day bar chart.
6. **Data ownership** — JSON export, strict import validation (bad files are rejected
   with data untouched), and typed-DELETE erase-all.
7. **Bilingual UI** — English / বাংলা toggle persisted across reloads, Bengali digits
   in Bangla mode, responsive down to 390px.

## Stack

Vanilla HTML, CSS and JavaScript. No framework, no build step, no dependencies.
Pure logic lives in `js/logic.js` (shared by the app and the node tests).

## Run locally

Open `index.html` in any modern browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Testing

```sh
node tests/unit.test.mjs   # 80 logic tests (taps, cycles, streaks, validation, digits)
node tests/smoke.mjs       # 20 headless-Chrome checks (needs chrome on port 9225; see TEST_RESULTS.md)
```

## Project structure

```
index.html          App shell (static; all text rendered by JS)
css/style.css       Responsive styles (390px mobile layout included)
js/logic.js         Pure counter/streak/import logic (no DOM)
js/i18n.js          English + Bengali UI strings
js/app.js           UI wiring, localStorage, export/import
tests/unit.test.mjs Node unit tests
tests/smoke.mjs     Headless-Chrome smoke tests (raw CDP)
```

## Limitations

- Counts live only in this browser's localStorage; clearing site data erases them.
  Use Export to back up.
- Sound/vibration depend on device and browser permissions; the counter works
  without them.
- Transliterations and meanings are a reading aid. This app is not a religious
  authority; learn pronunciation from a qualified teacher.
- The day streak uses the device clock; a wrong device date gives a wrong streak.

## Status

MVP complete and tested (see TEST_RESULTS.md). MIT-style personal project;
contributions welcome via GitHub issues.
