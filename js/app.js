// Tasbih Counter BD — UI wiring. Requires logic.js + i18n.js loaded first.
(function () {
  'use strict';
  var L = window.TasbihLogic;
  var STR = window.TasbihI18n;
  var KEY = 'tasbih-counter-bd-v1';

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.state) return parsed.state;
      }
    } catch (e) { /* corrupted storage -> fresh state */ }
    return L.defaultState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ app: 'tasbih-counter-bd', state: state })); } catch (e) {}
  }

  var state = load();
  var prefs = { sound: true, vibrate: true };
  try {
    var p = JSON.parse(localStorage.getItem(KEY + '-prefs') || '{}');
    if (typeof p.sound === 'boolean') prefs.sound = p.sound;
    if (typeof p.vibrate === 'boolean') prefs.vibrate = p.vibrate;
  } catch (e) {}
  function savePrefs() {
    try { localStorage.setItem(KEY + '-prefs', JSON.stringify(prefs)); } catch (e) {}
  }

  var $ = function (id) { return document.getElementById(id); };
  function t(key) { return STR[state.lang][key] || STR.en[key] || key; }
  function fmt(n) { return L.fmtNum(n, state.lang); }

  function currentDhikr() { return L.findDhikr(state, state.currentId); }

  function render() {
    var dh = currentDhikr();
    $('langBtn').textContent = state.lang === 'en' ? 'বাংলা' : 'English';
    $('tagline').textContent = t('tagline');
    $('tapHint').textContent = t('tapHint');
    $('targetLabel').textContent = t('target');
    $('cyclesLabel').textContent = t('cycles');
    $('todayLabel').textContent = t('today');
    $('lifetimeLabel').textContent = t('lifetime');
    $('streakLabel').textContent = t('streak');
    $('last7Label').textContent = t('last7');
    $('dhikrsLabel').textContent = t('dhikrs');
    $('customLabel').textContent = t('custom');
    $('customNameLabel').textContent = t('customName');
    $('customTargetLabel').textContent = t('customTarget');
    $('addBtn').textContent = t('add');
    $('dataLabel').textContent = t('data');
    $('exportBtn').textContent = t('exportBtn');
    $('importBtn').textContent = t('importBtn');
    $('eraseBtn').textContent = t('eraseBtn');
    $('resetBtn').textContent = t('resetCount');
    $('footerText').textContent = t('footer');
    $('soundLabel').textContent = t('sound');
    $('vibrateLabel').textContent = t('vibrate');
    $('bestLabel').textContent = t('best');
    $('soundChk').checked = prefs.sound;
    $('vibrateChk').checked = prefs.vibrate;

    $('dhikrArabic').textContent = dh.arabic || dh.translit;
    $('dhikrName').textContent = dh.translit;
    $('dhikrMeaning').textContent = state.lang === 'bn' ? dh.bn : dh.en;
    $('countNum').textContent = fmt(state.currentCount);
    $('targetNum').textContent = fmt(dh.target);
    $('cyclesNum').textContent = fmt(state.currentCycles);
    $('todayNum').textContent = fmt(L.todayTotal(state));
    $('lifetimeNum').textContent = fmt(L.lifetimeTotal(state));
    $('streakNum').textContent = fmt(L.streak(state));
    var pct = dh.target > 0 ? Math.min(100, Math.round(state.currentCount / dh.target * 100)) : 0;
    $('progressFill').style.width = pct + '%';
    $('progressPct').textContent = fmt(pct) + '%';

    var days = L.last7Days(state);
    var best = 0;
    days.forEach(function (d) { if (d.total > best) best = d.total; });
    $('bestNum').textContent = fmt(best);
    var chart = $('chart');
    chart.innerHTML = '';
    var max = Math.max.apply(null, days.map(function (d) { return d.total; }).concat([1]));
    days.forEach(function (d) {
      var wrap = document.createElement('div');
      wrap.className = 'bar-wrap';
      var bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = Math.round(d.total / max * 90) + 'px';
      bar.title = d.date + ': ' + d.total;
      var lab = document.createElement('div');
      lab.className = 'bar-lab';
      lab.textContent = d.date.slice(5);
      var val = document.createElement('div');
      val.className = 'bar-val';
      val.textContent = fmt(d.total);
      wrap.appendChild(val); wrap.appendChild(bar); wrap.appendChild(lab);
      chart.appendChild(wrap);
    });
    $('emptyNote').style.display = L.lifetimeTotal(state) === 0 ? 'block' : 'none';
    $('emptyNote').textContent = t('noData');

    var list = $('dhikrList');
    list.innerHTML = '';
    L.allDhikrs(state).forEach(function (d) {
      var btn = document.createElement('button');
      btn.className = 'dhikr-chip' + (d.id === state.currentId ? ' active' : '');
      btn.setAttribute('data-dhikr-id', d.id);
      btn.textContent = (d.arabic ? d.arabic + ' · ' : '') + d.translit + ' (' + fmt(d.target) + ')';
      btn.addEventListener('click', function () {
        L.selectDhikr(state, d.id);
        save(); render();
      });
      if (d.custom) {
        var del = document.createElement('span');
        del.className = 'chip-del';
        del.textContent = ' ×';
        del.title = t('deleteBtn');
        del.addEventListener('click', function (ev) {
          ev.stopPropagation();
          L.deleteCustomDhikr(state, d.id);
          save(); render();
        });
        btn.appendChild(del);
      }
      list.appendChild(btn);
    });
  }

  function beep() {
    if (!prefs.sound) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  function doTap() {
    var res = L.tap(state);
    save();
    if (res.completed) {
      $('completeMsg').textContent = t('completeMsg');
      $('completeMsg').style.display = 'block';
      beep();
      if (prefs.vibrate && navigator.vibrate) navigator.vibrate(200);
      setTimeout(function () { $('completeMsg').style.display = 'none'; }, 3000);
    }
    render();
  }

  $('tapBtn').addEventListener('click', doTap);
  document.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space' && document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      ev.preventDefault();
      doTap();
    }
  });
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'en' ? 'bn' : 'en';
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    save(); render();
  });
  $('resetBtn').addEventListener('click', function () {
    state.currentCount = 0; state.currentCycles = 0;
    save(); render();
    $('formMsg').textContent = t('resetDone');
  });
  $('soundChk').addEventListener('change', function (e) { prefs.sound = e.target.checked; savePrefs(); });
  $('vibrateChk').addEventListener('change', function (e) { prefs.vibrate = e.target.checked; savePrefs(); });
  $('addBtn').addEventListener('click', function () {
    var name = $('customName').value;
    var target = $('customTarget').value;
    var res = L.addCustomDhikr(state, name, target);
    if (!res.ok) {
      $('formMsg').textContent = res.error === 'name' ? t('addErrorName') : t('addErrorTarget');
      return;
    }
    $('customName').value = ''; $('customTarget').value = '';
    $('formMsg').textContent = '';
    save(); render();
  });
  $('exportBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ app: 'tasbih-counter-bd', state: state }, null, 2)],
      { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tasbih-counter-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('importFile').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!L.validateImport(data)) throw new Error('bad');
        state = data.state;
        save(); render();
        $('formMsg').textContent = t('importOk');
      } catch (err) {
        $('formMsg').textContent = t('importBad');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
  $('eraseBtn').addEventListener('click', function () {
    var answer = window.prompt(t('eraseConfirm'));
    if (answer !== 'DELETE') {
      $('formMsg').textContent = t('eraseWrong');
      return;
    }
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = L.defaultState();
    save(); render();
    $('formMsg').textContent = t('eraseDone');
  });

  document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
  render();
})();
