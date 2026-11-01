// Tasbih Counter BD — pure logic (no DOM). Shared by the app and node tests.
(function (global) {
  'use strict';

  var PRESETS = [
    { id: 'subhanallah', arabic: 'سُبْحَانَ الله', translit: 'SubhanAllah', target: 33,
      en: 'Glory be to Allah', bn: 'আল্লাহ পবিত্র' },
    { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّه', translit: 'Alhamdulillah', target: 33,
      en: 'All praise is for Allah', bn: 'সকল প্রশংসা আল্লাহর' },
    { id: 'allahu-akbar', arabic: 'اللهُ أَكْبَر', translit: 'Allahu Akbar', target: 33,
      en: 'Allah is the Greatest', bn: 'আল্লাহ সর্বশ্রেষ্ঠ' },
    { id: 'la-ilaha', arabic: 'لَا إِلَهَ إِلَّا الله', translit: 'La ilaha illallah', target: 100,
      en: 'There is no god but Allah', bn: 'আল্লাহ ছাড়া কোনো উপাস্য নেই' },
    { id: 'subhanallahi-wa-bihamdihi', arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', translit: 'SubhanAllahi wa bihamdihi', target: 100,
      en: 'Glory be to Allah and praise be to Him', bn: 'আল্লাহর পবিত্রতা ও প্রশংসা' },
    { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ الله', translit: 'Astaghfirullah', target: 100,
      en: 'I seek Allah\'s forgiveness', bn: 'আমি আল্লাহর ক্ষমা চাই' },
    { id: 'salawat', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّد', translit: 'Allahumma salli ala Muhammad', target: 100,
      en: 'O Allah, bless Muhammad', bn: 'হে আল্লাহ, মুহাম্মদের প্রতি রহমত বর্ষণ করুন' },
    { id: 'la-hawla', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِالله', translit: 'La hawla wa la quwwata illa billah', target: 100,
      en: 'There is no power except through Allah', bn: 'আল্লাহ ছাড়া কোনো শক্তি নেই' }
  ];

  function todayStr(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function datePlus(dateStr, delta) {
    var parts = dateStr.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + delta);
    return todayStr(d);
  }

  function defaultState() {
    return {
      lang: 'en',
      currentId: 'subhanallah',
      currentCount: 0,
      currentCycles: 0,
      customDhikrs: [],
      lifetime: {},
      daily: {}
    };
  }

  function allDhikrs(state) {
    return PRESETS.concat(state.customDhikrs || []);
  }

  function findDhikr(state, id) {
    var list = allDhikrs(state);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  // Record one tap. Returns {completed: bool} — completed means a target cycle finished.
  function tap(state, dateStr) {
    dateStr = dateStr || todayStr();
    var dh = findDhikr(state, state.currentId);
    if (!dh) return { completed: false };
    state.currentCount += 1;
    state.lifetime[state.currentId] = (state.lifetime[state.currentId] || 0) + 1;
    if (!state.daily[dateStr]) state.daily[dateStr] = { total: 0, byId: {} };
    state.daily[dateStr].total += 1;
    state.daily[dateStr].byId[state.currentId] =
      (state.daily[dateStr].byId[state.currentId] || 0) + 1;
    var completed = false;
    if (state.currentCount >= dh.target) {
      state.currentCount = 0;
      state.currentCycles += 1;
      completed = true;
    }
    return { completed: completed };
  }

  function selectDhikr(state, id) {
    if (!findDhikr(state, id)) return false;
    state.currentId = id;
    state.currentCount = 0;
    state.currentCycles = 0;
    return true;
  }

  function addCustomDhikr(state, name, target) {
    name = (name || '').trim();
    target = Number(target);
    if (!name || name.length > 80) return { ok: false, error: 'name' };
    if (!Number.isInteger(target) || target < 1 || target > 10000) return { ok: false, error: 'target' };
    var id = 'custom-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
    var dh = { id: id, arabic: '', translit: name, target: target, en: name, bn: name, custom: true };
    state.customDhikrs.push(dh);
    return { ok: true, dhikr: dh };
  }

  function deleteCustomDhikr(state, id) {
    var list = state.customDhikrs || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list.splice(i, 1);
        if (state.currentId === id) selectDhikr(state, 'subhanallah');
        return true;
      }
    }
    return false;
  }

  function todayTotal(state, dateStr) {
    dateStr = dateStr || todayStr();
    var d = state.daily[dateStr];
    return d ? d.total : 0;
  }

  function lifetimeTotal(state) {
    var sum = 0;
    for (var k in state.lifetime) sum += state.lifetime[k];
    return sum;
  }

  // Streak: consecutive days with total > 0, counting back from today;
  // if today is empty, the streak may still be alive via yesterday.
  function streak(state, dateStr) {
    dateStr = dateStr || todayStr();
    var count = 0;
    var cursor = dateStr;
    if (!state.daily[cursor] || state.daily[cursor].total <= 0) {
      cursor = datePlus(cursor, -1);
    }
    while (state.daily[cursor] && state.daily[cursor].total > 0) {
      count += 1;
      cursor = datePlus(cursor, -1);
    }
    return count;
  }

  function last7Days(state, dateStr) {
    dateStr = dateStr || todayStr();
    var out = [];
    for (var i = 6; i >= 0; i--) {
      var d = datePlus(dateStr, -i);
      out.push({ date: d, total: state.daily[d] ? state.daily[d].total : 0 });
    }
    return out;
  }

  function validateImport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    if (data.app !== 'tasbih-counter-bd' || typeof data.state !== 'object' || !data.state) return false;
    var s = data.state;
    if (s.lang !== 'en' && s.lang !== 'bn') return false;
    if (typeof s.currentId !== 'string' || !Number.isInteger(s.currentCount) || s.currentCount < 0) return false;
    if (!Number.isInteger(s.currentCycles) || s.currentCycles < 0) return false;
    if (!Array.isArray(s.customDhikrs) || typeof s.lifetime !== 'object' || typeof s.daily !== 'object') return false;
    for (var i = 0; i < s.customDhikrs.length; i++) {
      var c = s.customDhikrs[i];
      if (typeof c.id !== 'string' || typeof c.translit !== 'string' ||
          !Number.isInteger(c.target) || c.target < 1 || c.target > 10000) return false;
    }
    for (var day in s.daily) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
      var entry = s.daily[day];
      if (!Number.isInteger(entry.total) || entry.total < 0 || typeof entry.byId !== 'object') return false;
    }
    return true;
  }

  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBnDigits(str) {
    return String(str).replace(/[0-9]/g, function (ch) { return BN_DIGITS[Number(ch)]; });
  }
  function fmtNum(n, lang) {
    var s = Number(n).toLocaleString('en-US');
    return lang === 'bn' ? toBnDigits(s) : s;
  }

  var api = {
    PRESETS: PRESETS, todayStr: todayStr, datePlus: datePlus,
    defaultState: defaultState, allDhikrs: allDhikrs, findDhikr: findDhikr,
    tap: tap, selectDhikr: selectDhikr, addCustomDhikr: addCustomDhikr,
    deleteCustomDhikr: deleteCustomDhikr, todayTotal: todayTotal,
    lifetimeTotal: lifetimeTotal, streak: streak, last7Days: last7Days,
    validateImport: validateImport, toBnDigits: toBnDigits, fmtNum: fmtNum
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.TasbihLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
