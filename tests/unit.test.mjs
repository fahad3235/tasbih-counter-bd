// Node unit tests for Tasbih Counter BD logic. Run: node tests/unit.test.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../js/logic.js');
const STR = require('../js/i18n.js');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; }
  else { fail++; console.log('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}
function eq(name, got, want) { check(name, got === want, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }

// Presets
eq('8 presets', L.PRESETS.length, 8);
eq('preset targets 33/100', L.PRESETS.map(p => p.target).join(','), '33,33,33,100,100,100,100,100');
check('all presets have arabic + translit', L.PRESETS.every(p => p.arabic && p.translit && p.en && p.bn));
check('preset ids unique', new Set(L.PRESETS.map(p => p.id)).size === 8);

// Tap + cycle completion (33 target)
let s = L.defaultState();
for (let i = 0; i < 32; i++) { let r = L.tap(s, '2026-11-01'); check('tap 1..32 not completed', !r.completed); }
eq('count after 32', s.currentCount, 32);
let r33 = L.tap(s, '2026-11-01');
check('33rd tap completes', r33.completed);
eq('count resets after cycle', s.currentCount, 0);
eq('cycles = 1', s.currentCycles, 1);
eq('today total 33', L.todayTotal(s, '2026-11-01'), 33);
eq('lifetime 33', L.lifetimeTotal(s), 33);

// Select switches + resets
check('select la-ilaha', L.selectDhikr(s, 'la-ilaha'));
eq('new current', s.currentId, 'la-ilaha');
eq('count reset on switch', s.currentCount, 0);
check('select unknown rejected', !L.selectDhikr(s, 'nope'));
eq('current unchanged after bad select', s.currentId, 'la-ilaha');

// Streak: today alive, yesterday alive, gap breaks
let s2 = L.defaultState();
s2.daily = { '2026-10-30': { total: 5, byId: {} }, '2026-10-31': { total: 3, byId: {} }, '2026-11-01': { total: 2, byId: {} } };
eq('streak 3 consecutive', L.streak(s2, '2026-11-01'), 3);
let s3 = L.defaultState();
s3.daily = { '2026-10-30': { total: 5, byId: {} }, '2026-10-31': { total: 3, byId: {} } };
eq('streak alive via yesterday = 2', L.streak(s3, '2026-11-01'), 2);
let s4 = L.defaultState();
s4.daily = { '2026-10-29': { total: 5, byId: {} }, '2026-10-31': { total: 3, byId: {} } };
eq('gap breaks streak to 1', L.streak(s4, '2026-11-01'), 1);
eq('empty streak 0', L.streak(L.defaultState(), '2026-11-01'), 0);

// Last 7 days window
let s5 = L.defaultState();
s5.daily = { '2026-11-01': { total: 10, byId: {} }, '2026-10-26': { total: 4, byId: {} }, '2026-10-25': { total: 9, byId: {} } };
let w = L.last7Days(s5, '2026-11-01');
eq('window length 7', w.length, 7);
eq('window first date', w[0].date, '2026-10-26');
eq('window last date', w[6].date, '2026-11-01');
eq('window excludes Oct 25', w.every(d => d.date !== '2026-10-25'), true);
eq('window Oct 26 total', w[0].total, 4);

// Custom dhikr validation
let s6 = L.defaultState();
check('empty name rejected', !L.addCustomDhikr(s6, '  ', 33).ok);
check('target 0 rejected', !L.addCustomDhikr(s6, 'Test', 0).ok);
check('target 10001 rejected', !L.addCustomDhikr(s6, 'Test', 10001).ok);
check('target 2.5 rejected', !L.addCustomDhikr(s6, 'Test', 2.5).ok);
let added = L.addCustomDhikr(s6, 'Ya Rahman', 500);
check('valid custom added', added.ok);
eq('custom count 1', s6.customDhikrs.length, 1);
check('custom selectable', L.selectDhikr(s6, added.dhikr.id));
check('custom deletable', L.deleteCustomDhikr(s6, added.dhikr.id));
eq('custom gone', s6.customDhikrs.length, 0);
eq('falls back to subhanallah', s6.currentId, 'subhanallah');
check('delete unknown false', !L.deleteCustomDhikr(s6, 'nope'));

// Import validation
let good = { app: 'tasbih-counter-bd', state: L.defaultState() };
check('good import valid', L.validateImport(good));
check('wrong app rejected', !L.validateImport({ app: 'other', state: L.defaultState() }));
check('bad lang rejected', !L.validateImport({ app: 'tasbih-counter-bd', state: { ...L.defaultState(), lang: 'fr' } }));
check('negative count rejected', !L.validateImport({ app: 'tasbih-counter-bd', state: { ...L.defaultState(), currentCount: -1 } }));
check('bad date key rejected', !L.validateImport({ app: 'tasbih-counter-bd', state: { ...L.defaultState(), daily: { 'yesterday': { total: 1, byId: {} } } } }));
check('null rejected', !L.validateImport(null));
check('array rejected', !L.validateImport([]));

// Bengali digits + formatting
eq('bn digits 123', L.toBnDigits('123'), '১২৩');
eq('fmt en', L.fmtNum(1234, 'en'), '1,234');
eq('fmt bn', L.fmtNum(1234, 'bn'), '১,২৩৪');

// i18n completeness
for (const lang of ['en', 'bn']) {
  check('i18n ' + lang + ' has all keys', Object.keys(STR.en).every(k => STR[lang][k]));
}
check('bn tagline differs from en', STR.bn.tagline !== STR.en.tagline);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
