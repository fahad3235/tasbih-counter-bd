# TEST_RESULTS — tasbih-counter-bd (factory run, 2026-11-01 13:00 slot)

## Unit tests — 80/80 pass
`node tests/unit.test.mjs`
- 8 presets, targets 33/33/33/100/100/100/100/100, unique ids, Arabic + transliteration + EN/BN meanings present.
- Tap engine: 32 taps no completion, 33rd completes a cycle, count resets, cycles = 1, today = 33, lifetime = 33.
- Select: switching dhikr resets count/cycles; unknown id rejected, current unchanged.
- Streak: 3 consecutive days = 3; yesterday-alive = 2; gap day breaks to 1; empty = 0.
- Last-7 window: exact dates 2026-10-26..2026-11-01, Oct 25 excluded, per-day totals exact.
- Custom dhikr: empty name, target 0 / 10001 / 2.5 rejected; valid add/select/delete; delete falls back to SubhanAllah.
- Import validation: wrong app, bad lang, negative count, malformed date key, null, array — all rejected.
- Digits: 123 -> ১২৩; 1234 -> 1,234 (EN) / ১,২৩৪ (BN).
- i18n: every EN key present in BN; BN tagline differs from EN.
- 0 app-logic repairs; all tests passed on first full run.

## Headless-Chrome smoke — 20/20 pass
`node tests/smoke.mjs` via raw CDP against stock Playwright headless_shell
(chromium_headless_shell-1187; the Hatch-patched Chromium refuses to start in this
VM with "Hatch WebGL domain policy is required for browser startup", same as
factory runs #200/#202).
- H1 title, 8 preset chips, initial count 0, default target 33.
- 3 taps -> count 3, today 3, progress 9% (3/33).
- Switch to La ilaha -> target 100, count reset.
- 100 taps -> cycles 1, count 0, completion message visible.
- Reload persistence: today 103, lifetime 103.
- BN toggle: tagline "ডিজিটাল জিকির কাউন্টার", today renders ১০৩.
- Custom add -> 9 chips; delete -> 8 chips.
- 390px mobile: no horizontal overflow (scrollWidth <= 391).
- 0 console/page errors.

## Notes
- Sources are UTF-8 (Arabic + Bengali text in full). The push uses
  json.dumps(ensure_ascii=True), so non-ASCII travels as \uXXXX escapes and is
  decoded intact on the remote; remote content is verified after push.
