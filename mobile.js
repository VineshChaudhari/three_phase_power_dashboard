/* Mobile layer for the Electrical Measurements Dashboard.
   Loaded before app.js. Everything here is optional: if this file is missing, app.js falls back to the desktop layout.
   Provides: useIsMobile, ChartFold (charts collapsed on phones), MobileHeader (title, range pills, settings sheet),
   ThemeButton and the light / dark theme switch. Styling lives in mobile.css and only applies below 640 px. */
(function () {
  'use strict';
  if (typeof React === 'undefined' || typeof htm === 'undefined') return;
  var h = htm.bind(React.createElement), useState = React.useState, useEffect = React.useEffect;
  var MQ = '(max-width: 639px)', KEY = 'em-theme', root = document.documentElement;

  /* ---------- theme (dark = the desktop look, light = soft glass) ---------- */
  function initialTheme() {
    try { var t = localStorage.getItem(KEY); if (t === 'light' || t === 'dark') return t; } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  var theme = initialTheme();
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#e6f3e4' : '#111217');
  }
  applyTheme(theme);
  function useTheme() {
    var s = useState(theme), t = s[0], setT = s[1];
    useEffect(function () {
      var f = function (e) { setT(e.detail); };
      window.addEventListener('em-theme', f);
      return function () { window.removeEventListener('em-theme', f); };
    }, []);
    return [t, function () {
      var n = theme === 'dark' ? 'light' : 'dark';
      theme = n; applyTheme(n);
      try { localStorage.setItem(KEY, n); } catch (e) {}
      window.dispatchEvent(new CustomEvent('em-theme', { detail: n }));
    }];
  }

  function useIsMobile() {
    var s = useState(function () { return !!(window.matchMedia && window.matchMedia(MQ).matches); }), m = s[0], setM = s[1];
    useEffect(function () {
      if (!window.matchMedia) return;
      var q = window.matchMedia(MQ), f = function () { setM(q.matches); };
      if (q.addEventListener) q.addEventListener('change', f); else q.addListener(f);
      f();
      return function () { if (q.removeEventListener) q.removeEventListener('change', f); else q.removeListener(f); };
    }, []);
    return m;
  }

  /* ---------- icons ---------- */
  var P = {
    sun: ['M12 8a4 4 0 100 8 4 4 0 000-8z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
    moon: ['M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z'],
    upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 20h16'],
    sliders: ['M4 6h9', 'M17 6h3', 'M4 12h3', 'M11 12h9', 'M4 18h11', 'M19 18h1', 'M15 4v4', 'M9 10v4', 'M17 16v4'],
    chev: ['M6 9l6 6 6-6']
  };
  function Ico(p) {
    var d = P[p.n] || [];
    return h`<svg width=${p.s || 20} height=${p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.map(function (x, i) { return h`<path key=${i} d=${x}/>`; })}</svg>`;
  }

  /* ---------- charts stay folded on phones (summary first, detail on demand) ---------- */
  function ChartFold(p) {
    var mobile = useIsMobile(), s = useState(false), open = s[0], setOpen = s[1];
    if (!mobile) return p.children;
    if (!open) {
      return h`<section class="chart-fold"><button type="button" class="chart-fold-btn" aria-expanded="false" onClick=${function () { setOpen(true); }}>
        <span class="chart-fold-title">${p.title}</span><span class="chart-fold-cta">Show chart <${Ico} n="chev" s=${16}/></span></button></section>`;
    }
    return h`<div class="chart-open">${p.children}<button type="button" class="chart-fold-hide" onClick=${function () { setOpen(false); }}>Hide chart</button></div>`;
  }

  /* ---------- header: title, round action buttons, range pills, settings sheet ---------- */
  var PILLS = [['all', 'All'], ['1', '1 h'], ['3', '3 h'], ['6', '6 h'], ['12', '12 h']];
  function MobileHeader(p) {
    var th = useTheme(), cur = th[0], toggle = th[1];
    var s1 = useState(false), sheet = s1[0], setSheet = s1[1];
    var s2 = useState(false), custom = s2[0], setCustom = s2[1];
    useEffect(function () {
      if (!sheet) return;
      var k = function (e) { if (e.key === 'Escape') setSheet(false); };
      document.addEventListener('keydown', k);
      return function () { document.removeEventListener('keydown', k); };
    }, [sheet]);
    var showCustom = custom || p.preset === 'custom';
    return h`<header class="mh">
      <div class="mh-top">
        <h1 class="mh-title">${p.title}</h1>
        <div class="mh-actions">
          <button type="button" class="mh-icon" onClick=${toggle} aria-label=${cur === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}><${Ico} n=${cur === 'dark' ? 'sun' : 'moon'}/></button>
          <button type="button" class="mh-icon" onClick=${function () { if (p.fileRef.current) p.fileRef.current.click(); }} aria-label="Upload CSV"><${Ico} n="upload"/></button>
          <button type="button" class="mh-icon" onClick=${function () { setSheet(true); }} aria-label="Settings" aria-haspopup="dialog"><${Ico} n="sliders"/></button>
        </div>
      </div>
      <div class="mh-sub">
        <span class="mh-name" title=${p.info.name}>${p.info.name} · ${p.n.toLocaleString()} rows</span>
        ${p.hasSummary && h`<button type="button" class="mh-link" onClick=${p.onInfo}>File info</button>`}
      </div>
      <div class="mh-pills" role="group" aria-label="Time range">
        ${PILLS.map(function (x) {
          return h`<button key=${x[0]} type="button" class="mh-pill" aria-pressed=${!showCustom && p.preset === x[0]} onClick=${function () { setCustom(false); p.onPreset(x[0]); }}>${x[1]}</button>`;
        })}
        <button type="button" class="mh-pill" aria-pressed=${showCustom} onClick=${function () { setCustom(!custom); }}>Custom</button>
      </div>
      ${showCustom && h`<div class="mh-custom">
        <label><span>From <b class="mono">${p.startLabel}</b></span><input type="range" min="0" max="100000" step="1" value=${p.win[0]} onInput=${function (e) { p.onSlide(0, e.target.value); }} aria-label="Window start time"/></label>
        <label><span>To <b class="mono">${p.endLabel}</b></span><input type="range" min="0" max="100000" step="1" value=${p.win[1]} onInput=${function (e) { p.onSlide(1, e.target.value); }} aria-label="Window end time"/></label>
      </div>`}
      <input ref=${p.fileRef} type="file" accept=".csv,text/csv" class="mh-hidden" onChange=${p.onFile}/>
      ${sheet && h`<div>
        <div class="m-sheet-backdrop" onClick=${function () { setSheet(false); }}></div>
        <div class="m-sheet" role="dialog" aria-modal="true" aria-label="Settings">
          <div class="m-grab" aria-hidden="true"></div>
          <h2 class="m-sheet-title">Settings</h2>
          <label class="m-field"><span>Electrical connection</span>
            <select value=${p.topology} onChange=${function (e) { p.onTopology(e.target.value); }}><option value="wye4">Wye · 4-wire</option><option value="delta">Delta · balanced</option></select></label>
          <label class="m-check"><input type="checkbox" checked=${p.assumeBalanced} onChange=${function (e) { p.onBalanced(e.target.checked); }}/><span>Estimate missing voltages for a balanced system</span></label>
          <button type="button" class="m-btn" onClick=${function () { p.onSample(); setSheet(false); }}>Load sample data</button>
          <button type="button" class="m-btn m-btn-primary" autoFocus=${true} onClick=${function () { setSheet(false); }}>Done</button>
        </div>
      </div>`}
    </header>`;
  }

  /* small round theme switch for screens that have no MobileHeader (the home page) */
  function ThemeButton() {
    var th = useTheme(), cur = th[0], toggle = th[1];
    return h`<button type="button" class="mh-icon mh-theme-btn" onClick=${toggle} aria-label=${cur === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}><${Ico} n=${cur === 'dark' ? 'sun' : 'moon'}/></button>`;
  }

  window.EMMobile = { useIsMobile: useIsMobile, ChartFold: ChartFold, MobileHeader: MobileHeader, ThemeButton: ThemeButton };
})();
