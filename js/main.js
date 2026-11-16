/* AI Engineering Master Curriculum — site behaviour.
   Sections: storage · theme · nav · progress · modules search/filter · schedule dates · print */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- storage (wrapped: may be blocked in private mode) ---------- */
  const KEY = 'airoadmap.v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } };
  const state = Object.assign({ done: {}, checks: {}, start: '', pace: 1 }, load());

  /* ---------- theme toggle ---------- */
  const root = document.documentElement;
  const themeBtn = $('.theme-toggle');
  const isDark = () => root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  function paintTheme() {
    if (!themeBtn) return;
    themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
    $('.theme-icon', themeBtn).textContent = isDark() ? '☀' : '☾';
  }
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('airoadmap.theme', next); } catch (e) { /* ignore */ }
    paintTheme();
  });
  paintTheme();

  /* ---------- mobile nav ---------- */
  const toggle = $('.nav-toggle'), nav = $('#site-nav');
  if (toggle && nav) {
    const setOpen = o => { nav.classList.toggle('open', o); toggle.setAttribute('aria-expanded', String(o)); };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  }

  /* ---------- progress ---------- */
  const PHASE_RANGES = { 1: [1, 10], 2: [11, 20], 3: [21, 30], 4: [31, 45], 5: [46, 60], 6: [61, 75], 7: [76, 90], 8: [91, 120], 9: [121, 135] };
  const TOTAL = 135;
  function paintProgress() {
    const doneDays = Object.keys(state.done).filter(d => state.done[d]).map(Number);
    $$('[data-total-done]').forEach(el => el.textContent = doneDays.length);
    $$('[data-total-pct]').forEach(el => el.textContent = Math.round(doneDays.length / TOTAL * 100));
    $$('[data-total-bar]').forEach(el => { el.style.width = (doneDays.length / TOTAL * 100) + '%'; const pb = el.closest('[role=progressbar]'); if (pb) pb.setAttribute('aria-valuenow', doneDays.length); });
    Object.entries(PHASE_RANGES).forEach(([p, [a, b]]) => {
      const n = doneDays.filter(d => d >= a && d <= b).length;
      $$(`[data-phase-count="${p}"]`).forEach(el => el.textContent = n);
      $$(`[data-phase-bar="${p}"]`).forEach(el => el.style.width = (n / (b - a + 1) * 100) + '%');
    });
    $$('details.module[data-day]').forEach(d => d.classList.toggle('is-done', !!state.done[d.dataset.day]));
    $$('input[data-done]').forEach(cb => cb.checked = !!state.done[cb.dataset.done]);
    $$('tr[data-day]').forEach(tr => { const s = $('[data-status]', tr); if (s) s.textContent = state.done[tr.dataset.day] ? '✓ Done' : '—'; });
    $$('input[data-check]').forEach(cb => cb.checked = !!state.checks[cb.dataset.check]);
    $$('[data-check-count]').forEach(el => { const p = el.dataset.checkCount; el.textContent = $$(`input[data-check-phase="${p}"]`).filter(c => c.checked).length; });
  }
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('input[data-done]')) { state.done[t.dataset.done] = t.checked; save(state); paintProgress(); }
    if (t.matches('input[data-check]')) { state.checks[t.dataset.check] = t.checked; save(state); paintProgress(); }
  });

  /* ---------- schedule: start date, per-module pace, "this week" ---------- */
  const DAY = 864e5;
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const mondayOf = d => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  function paintDates() {
    const banners = $$('[data-today]');
    const has = !!state.start;
    document.body.classList.toggle('has-dates', has && !!$('#date-form'));
    if (!has) { banners.forEach(b => b.hidden = true); return; }
    const start = parseISO(state.start), pace = Math.max(1, +state.pace || 1), today = startOfDay(new Date());
    const wkStart = mondayOf(today), wkEnd = new Date(wkStart.getTime() + 6 * DAY);
    let current = null;
    $$('tr[data-day]').forEach(tr => {
      const day = +tr.dataset.day, from = new Date(start.getTime() + (day - 1) * pace * DAY), to = new Date(from.getTime() + (pace - 1) * DAY);
      const cell = $('[data-date]', tr);
      if (cell) cell.textContent = from.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + (pace > 1 ? ' – ' + to.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
      const inWeek = to >= wkStart && from <= wkEnd, isToday = today >= from && today <= to;
      tr.classList.toggle('this-week', inWeek && !isToday); tr.classList.toggle('is-today', isToday);
      const link = $('td a', tr); let tag = $('.badge-week', tr);
      if (inWeek && link) { if (!tag) { tag = document.createElement('span'); tag.className = 'badge-week'; link.after(tag); } tag.textContent = isToday ? 'Today' : 'This week'; } else if (tag) tag.remove();
      if (isToday) current = { day, title: link ? link.textContent : '' };
    });
    const msg = current ? `Today is Day ${current.day}: ${current.title}.` : (today < start ? 'Your start date is in the future. The course has not begun yet.' : 'Based on your start date and pace, the 135-day plan has finished.');
    banners.forEach(b => { b.textContent = msg; b.hidden = false; });
  }
  const form = $('#date-form');
  if (form) {
    $('#start').value = state.start || ''; $('#pace').value = state.pace || 1;
    form.addEventListener('submit', e => { e.preventDefault(); state.start = $('#start').value; state.pace = Math.max(1, Math.min(14, +$('#pace').value || 1)); save(state); paintDates(); });
    $('#clear-date').addEventListener('click', () => { state.start = ''; save(state); $('#start').value = ''; paintDates(); });
  }
  $$('[data-phase-jump]').forEach(a => a.addEventListener('click', () => { const d = $(a.getAttribute('href')); if (d) d.open = true; }));

  /* ---------- modules page: search + phase filter + expand/collapse ---------- */
  const q = $('#q');
  if (q) {
    const mods = $$('details.module[data-day]'), phases = $$('[data-phase-section]'), count = $('#result-count'), none = $('#no-results');
    let phaseFilter = 'all';
    const clearMarks = () => $$('mark.hit').forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
    function apply() {
      const term = q.value.trim().toLowerCase(); let shown = 0;
      clearMarks();
      mods.forEach(m => {
        const ok = (phaseFilter === 'all' || m.dataset.phase === phaseFilter) && (!term || m.dataset.search.includes(term));
        m.hidden = !ok; if (ok) shown++;
        if (ok && term) { m.open = true; highlight(m, term); }
      });
      phases.forEach(p => p.hidden = !$$('details.module:not([hidden])', p).length);
      count.textContent = term || phaseFilter !== 'all' ? `${shown} of ${mods.length} modules shown` : `${mods.length} modules`;
      none.hidden = shown !== 0;
    }
    // wrap matching text inside list items / titles with <mark>
    function highlight(m, term) {
      const walker = document.createTreeWalker(m, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('label,mark') || !n.nodeValue.toLowerCase().includes(term) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(n => {
        const i = n.nodeValue.toLowerCase().indexOf(term), mk = document.createElement('mark'); mk.className = 'hit';
        const rest = n.splitText(i); rest.splitText(term.length); mk.textContent = rest.nodeValue; rest.replaceWith(mk);
      });
    }
    q.addEventListener('input', apply);
    $$('[data-filter-phase]').forEach(b => b.addEventListener('click', () => {
      phaseFilter = b.dataset.filterPhase;
      $$('[data-filter-phase]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); apply();
    }));
    $('#expand-all').addEventListener('click', () => mods.forEach(m => { if (!m.hidden) m.open = true; }));
    $('#collapse-all').addEventListener('click', () => mods.forEach(m => m.open = false));
    const init = new URLSearchParams(location.search).get('q'); if (init) q.value = init;
    apply();
    // open a module when linked directly (#day-N)
    const openHash = () => { const t = location.hash && $(location.hash); if (t && t.matches('details')) { t.hidden = false; t.open = true; t.scrollIntoView(); } };
    openHash(); addEventListener('hashchange', openHash);
  }

  /* ---------- print: open all accordions first ---------- */
  const reopen = [];
  addEventListener('beforeprint', () => $$('details').forEach(d => { if (!d.open) { d.open = true; reopen.push(d); } }));
  addEventListener('afterprint', () => { reopen.splice(0).forEach(d => d.open = false); });
  $$('.print-link').forEach(a => a.addEventListener('click', e => { e.preventDefault(); print(); }));

  paintProgress(); paintDates();
})();
