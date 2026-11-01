// Headless-Chrome smoke via raw CDP. Run: node tests/smoke.mjs
// Expects chrome listening on 127.0.0.1:9225.
const targets = await (await fetch('http://127.0.0.1:9225/json')).json();
const wsUrl = targets.find(t => t.type === 'page').webSocketDebuggerUrl;
const ws = new WebSocket(wsUrl);
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + JSON.stringify(m.params.args));
});
await new Promise(r => { ws.addEventListener('open', r, { once: true }); });
function send(method, params = {}) {
  const mid = ++id;
  return new Promise((res, rej) => { pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params })); });
}
function ev(expr) { return send('Runtime.evaluate', { expression: expr, returnByValue: true }).then(r => r.result.value); }
let pass = 0, fail = 0;
function check(cond, name, extra = '') { if (cond) pass++; else { fail++; console.log('FAIL ' + name + ' ' + extra); } }
await send('Page.enable'); await send('Runtime.enable');
const PAGE = 'file:///home/hatch/workspace/muse-project-factory/builds/tasbih-counter-bd/index.html';
await send('Page.navigate', { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
await ev(`localStorage.clear();`);
await send('Page.navigate', { url: PAGE });
await new Promise(r => setTimeout(r, 1500));

check(await ev(`document.querySelector('h1').textContent === 'Tasbih Counter BD'`), 'h1 title', await ev(`document.querySelector('h1').textContent`));
check(await ev(`document.querySelectorAll('.dhikr-chip').length === 8`), '8 preset chips', String(await ev(`document.querySelectorAll('.dhikr-chip').length`)));
check(await ev(`document.getElementById('countNum').textContent === '0'`), 'initial count 0');
check(await ev(`document.getElementById('targetNum').textContent === '33'`), 'default target 33 (SubhanAllah)');
// Tap 3 times -> count 3, today 3
await ev(`document.getElementById('tapBtn').click();document.getElementById('tapBtn').click();document.getElementById('tapBtn').click();`);
check(await ev(`document.getElementById('countNum').textContent === '3'`), 'count 3 after 3 taps', await ev(`document.getElementById('countNum').textContent`));
check(await ev(`document.getElementById('todayNum').textContent === '3'`), 'today 3', await ev(`document.getElementById('todayNum').textContent`));
check(await ev(`document.getElementById('progressPct').textContent === '9%'`), 'progress 9% (3/33)', await ev(`document.getElementById('progressPct').textContent`));
// Switch to La ilaha (target 100) -> count resets, target 100
await ev(`document.querySelector('[data-dhikr-id="la-ilaha"]').click();`);
check(await ev(`document.getElementById('targetNum').textContent === '100'`), 'la-ilaha target 100', await ev(`document.getElementById('targetNum').textContent`));
check(await ev(`document.getElementById('countNum').textContent === '0'`), 'count reset on switch');
// Complete a cycle via test hook: set count via localStorage? Instead tap via JS loop 100 times is slow but fine (100 clicks)
await ev(`for (let i = 0; i < 100; i++) document.getElementById('tapBtn').click();`);
check(await ev(`document.getElementById('cyclesNum').textContent === '1'`), 'cycle completes at 100', await ev(`document.getElementById('cyclesNum').textContent`));
check(await ev(`document.getElementById('countNum').textContent === '0'`), 'count resets after cycle');
check(await ev(`document.getElementById('completeMsg').style.display === 'block'`), 'complete message shows');
// Reload persistence: today = 103, lifetime = 103
await send('Page.navigate', { url: PAGE });
await new Promise(r => setTimeout(r, 1500));
check(await ev(`document.getElementById('todayNum').textContent === '103'`), 'today persists 103', await ev(`document.getElementById('todayNum').textContent`));
check(await ev(`document.getElementById('lifetimeNum').textContent === '103'`), 'lifetime persists 103', await ev(`document.getElementById('lifetimeNum').textContent`));
// Language toggle -> BN tagline + Bengali digits
await ev(`document.getElementById('langBtn').click();`);
check(await ev(`document.getElementById('tagline').textContent === 'ডিজিটাল জিকির কাউন্টার'`), 'BN tagline', await ev(`document.getElementById('tagline').textContent`));
check(await ev(`document.getElementById('todayNum').textContent === '১০৩'`), 'BN digits today', await ev(`document.getElementById('todayNum').textContent`));
// Custom dhikr add + select + delete
await ev(`document.getElementById('customName').value = 'Ya Rahman'; document.getElementById('customTarget').value = '10'; document.getElementById('addBtn').click();`);
check(await ev(`document.querySelectorAll('.dhikr-chip').length === 9`), 'custom chip added = 9', String(await ev(`document.querySelectorAll('.dhikr-chip').length`)));
await ev(`document.querySelector('.chip-del').click();`);
check(await ev(`document.querySelectorAll('.dhikr-chip').length === 8`), 'custom chip deleted = 8', String(await ev(`document.querySelectorAll('.dhikr-chip').length`)));
// Back to EN, 390px mobile no overflow
await ev(`document.getElementById('langBtn').click();`);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await new Promise(r => setTimeout(r, 500));
check(await ev(`document.documentElement.scrollWidth <= 391`), '390px no overflow', String(await ev(`document.documentElement.scrollWidth`)));
check(errors.length === 0, '0 console/page errors', errors.join(' | '));
console.log(pass + ' passed, ' + fail + ' failed');
ws.close();
process.exit(fail ? 1 : 0);
