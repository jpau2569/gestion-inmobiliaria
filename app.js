/* La IA y Mi Motor — PWA reader · Nivel Supremo */
(() => {
  'use strict';

  const STORE_KEY = 'laia-motor:v1';
  const els = {
    content: document.getElementById('content'),
    reader: document.getElementById('reader'),
    toc: document.getElementById('toc'),
    tocNav: document.getElementById('tocNav'),
    tocProgress: document.getElementById('tocProgressBar'),
    readProgress: document.getElementById('readProgressBar'),
    btnToc: document.getElementById('btnToc'),
    btnTocClose: document.getElementById('btnTocClose'),
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    pagerInfo: document.getElementById('pagerInfo'),
    btnTheme: document.getElementById('btnTheme'),
    btnFont: document.getElementById('btnFont'),
    btnFocus: document.getElementById('btnFocus'),
    btnQR: document.getElementById('btnQR'),
    btnSearch: document.getElementById('btnSearch'),
    btnBookmark: document.getElementById('btnBookmark'),
    btnInstall: document.getElementById('btnInstall'),
    qrModal: document.getElementById('qrModal'),
    qrCanvas: document.getElementById('qrCanvas'),
    qrUrl: document.getElementById('qrUrl'),
    qrLinkOpen: document.getElementById('qrLinkOpen'),
    qrCustomUrl: document.getElementById('qrCustomUrl'),
    btnQRDownload: document.getElementById('btnQRDownload'),
    btnQRCopy: document.getElementById('btnQRCopy'),
    btnQRShare: document.getElementById('btnQRShare'),
    btnQRRegen: document.getElementById('btnQRRegen'),
    searchModal: document.getElementById('searchModal'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    selAsk: document.getElementById('selAsk'),
    toast: document.getElementById('toast'),
  };

  const state = {
    book: null,
    flat: [],
    chapters: {},
    current: 0,
    speaking: false,
    settings: loadSettings(),
  };

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveSettings() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.settings));
  }

  function toast(msg, ms = 1800) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { els.toast.hidden = true; }, ms);
  }

  /* ---------- Load book ---------- */
  async function loadBook() {
    try {
      state.book = window.__BOOK__;
      flatten();
      buildToc();
      // Deep link (#ch=N) wins over saved position
      const hashIdx = parseHashChapter();
      const initial = hashIdx !== null ? hashIdx : parseInt(state.settings.current, 10);
      const idx = Number.isInteger(initial) && initial >= 0 && initial < state.flat.length ? initial : 0;
      await renderChapter(idx, { scrollToSection: state.settings.section || null });
      preloadAllChapters();
    } catch (e) {
      els.content.innerHTML = `<p class="loading">No se pudo cargar el libro: ${e.message}</p>`;
    }
  }

  function parseHashChapter() {
    const m = location.hash.match(/ch=(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }
  window.addEventListener('hashchange', () => {
    const idx = parseHashChapter();
    if (idx !== null && idx !== state.current) renderChapter(idx);
  });

  async function loadChapter(i) {
    if (state.chapters[i]) return state.chapters[i];
    const ch = window.__CHAPTERS__[i];
    state.chapters[i] = ch;
    state.flat[i].intro = ch.intro || [];
    state.flat[i].sections = ch.sections || [];
    state.flat[i].searchIndex = buildSearchIndex(ch);
    return ch;
  }

  function preloadAllChapters() {
    let i = 0;
    const next = () => {
      if (i >= state.book.chapters.length) return;
      const idx = i++;
      if (state.chapters[idx]) { setTimeout(next, 0); return; }
      loadChapter(idx).then(() => setTimeout(next, 30)).catch(() => setTimeout(next, 100));
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(next, { timeout: 1500 });
    else setTimeout(next, 600);
  }

  function flatten() {
    state.flat = state.book.chapters.map((ch, i) => {
      const cleaned = cleanChapterTitle(ch.title);
      return { idx: i, rawTitle: ch.title, chTag: cleaned.tag, title: cleaned.title, intro: [], sections: [], searchIndex: [] };
    });
  }

  function cleanChapterTitle(t) {
    const m = t.match(/^(CAP[IÍ]TULO)\s*(\d+)(.*)$/i);
    if (m) return { tag: `Capítulo ${m[2].trim()}`, title: (m[3] || '').trim() || t };
    const a = t.match(/^(Ap[eé]ndice)\s+([A-Z])\s*[-–:]?\s*(.*)$/i);
    if (a) return { tag: `Apéndice ${a[2]}`, title: (a[3] || '').trim() };
    return { tag: '', title: t };
  }

  function buildSearchIndex(ch) {
    const items = [];
    const push = (kind, parent, title, paragraphs) => {
      const text = paragraphs.map(p => p.text).join(' ');
      items.push({ kind, parent, title, text });
    };
    push('intro', null, ch.title, ch.intro || []);
    for (const s of (ch.sections || [])) {
      push('section', ch.title, s.title, s.paragraphs || []);
      for (const sub of (s.subsections || [])) {
        push('subsection', s.title, sub.title, sub.paragraphs || []);
      }
    }
    return items;
  }

  function chapterPlainText(ch) {
    const parts = [];
    (ch.intro || []).forEach(p => parts.push(p.text));
    (ch.sections || []).forEach(s => {
      if (s.title) parts.push(s.title + '.');
      (s.paragraphs || []).forEach(p => parts.push(p.text));
      (s.subsections || []).forEach(sub => {
        if (sub.title) parts.push(sub.title + '.');
        (sub.paragraphs || []).forEach(p => parts.push(p.text));
      });
    });
    return parts.join(' ');
  }

  function readingMinutes(ch) {
    const words = chapterPlainText(ch).trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 210));
  }

  /* ---------- TOC ---------- */
  function buildToc() {
    const html = ['<ol>'];
    state.flat.forEach((ch, i) => {
      const titleHtml = ch.chTag
        ? `<span class="ch-num">${escapeHtml(ch.chTag)}.</span>${escapeHtml(ch.title)}`
        : escapeHtml(ch.title);
      html.push(`<li class="ch-item"><button type="button" class="ch-btn" data-idx="${i}">${titleHtml}</button>`);
      const secs = state.book.chapters[i].sections || [];
      if (secs.length) {
        html.push('<ul class="sec-list">');
        secs.forEach((sTitle, si) => {
          if (!sTitle) return;
          html.push(`<li><button type="button" class="sec-link" data-idx="${i}" data-sec="sec-${si}">${escapeHtml(sTitle)}</button></li>`);
        });
        html.push('</ul>');
      }
      html.push('</li>');
    });
    html.push('</ol>');
    els.tocNav.innerHTML = html.join('');

    els.tocNav.addEventListener('click', e => {
      const btn = e.target.closest('button[data-idx]');
      if (!btn) return;
      renderChapter(parseInt(btn.dataset.idx, 10), { scrollToSection: btn.dataset.sec || null });
      if (window.matchMedia('(max-width: 900px)').matches) els.toc.classList.add('collapsed');
    });
  }

  function updateTocActive() {
    els.tocNav.querySelectorAll('.ch-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.idx, 10) === state.current);
    });
    els.tocProgress.style.width = (((state.current + 1) / state.flat.length) * 100).toFixed(1) + '%';
  }

  /* ---------- Render ---------- */
  async function renderChapter(idx, opts = {}) {
    if (idx < 0 || idx >= state.flat.length) return;
    stopSpeaking();
    state.current = idx;
    state.settings.current = idx;
    state.settings.section = null;
    saveSettings();
    try { history.replaceState(null, '', '#ch=' + idx); } catch { /* file:// quirk */ }
    try { await loadChapter(idx); }
    catch (e) {
      els.content.innerHTML = `<p class="loading">Error cargando capítulo: ${escapeHtml(e.message)}</p>`;
      return;
    }
    const ch = state.flat[idx];
    const raw = state.chapters[idx];
    const bm = isBookmarked(idx);
    const mins = readingMinutes(raw);
    const parts = [];

    parts.push(`<header class="chapter-head">`);
    parts.push(`<h1>`);
    if (ch.chTag) parts.push(`<span class="ch-tag">${escapeHtml(ch.chTag)}</span>`);
    parts.push(escapeHtml(ch.title || ''));
    parts.push(`</h1>`);
    // Chapter action bar
    parts.push(`<div class="ch-actions">`);
    parts.push(`<span class="ch-meta">≈ ${mins} min de lectura</span>`);
    parts.push(`<button class="ch-act" data-act="listen" title="Escuchar capítulo (S)">🔊 <span>Escuchar</span></button>`);
    parts.push(`<button class="ch-act" data-act="askai" title="Preguntar a la IA sobre este capítulo (A)">💬 <span>IA capítulo</span></button>`);
    parts.push(`<button class="ch-act ${bm ? 'active' : ''}" data-bookmark title="Marcar capítulo">${bm ? '★' : '☆'} <span>${bm ? 'Marcado' : 'Marcar'}</span></button>`);
    parts.push(`<button class="ch-act" data-act="copylink" title="Copiar enlace al capítulo">🔗 <span>Enlace</span></button>`);
    parts.push(`<button class="ch-act" data-act="print" title="Imprimir capítulo">🖨 <span>Imprimir</span></button>`);
    parts.push(`</div>`);
    parts.push(`</header>`);

    if (raw.intro && raw.intro.length) parts.push(renderBlocks(raw.intro, { lead: idx === 0 }));
    (raw.sections || []).forEach((s, si) => {
      if (s.title) parts.push(`<h2 id="sec-${si}" class="section-anchor">${escapeHtml(s.title)}</h2>`);
      parts.push(renderBlocks(s.paragraphs || []));
      (s.subsections || []).forEach((sub, subi) => {
        if (sub.title) parts.push(`<h3 id="sec-${si}-${subi}" class="section-anchor">${escapeHtml(sub.title)}</h3>`);
        parts.push(renderBlocks(sub.paragraphs || []));
      });
    });

    els.content.innerHTML = parts.join('');
    groupPromptBoxes();

    els.btnPrev.disabled = idx === 0;
    els.btnNext.disabled = idx === state.flat.length - 1;
    els.pagerInfo.textContent = `${idx + 1} / ${state.flat.length}`;
    updateTocActive();
    updateReadProgress();

    els.reader.scrollTo({ top: 0, behavior: 'auto' });
    if (opts.scrollToSection) {
      requestAnimationFrame(() => {
        const t = document.getElementById(opts.scrollToSection);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    document.title = `${ch.chTag ? ch.chTag + ' · ' : ''}${ch.title} — La IA y Mi Motor`;
  }

  function renderBlocks(blocks, opts = {}) {
    if (!blocks || !blocks.length) return '';
    const out = [];
    let listOpen = false;
    blocks.forEach((b, i) => {
      const text = b.text || '';
      if (b.list) {
        if (!listOpen) { out.push('<ul class="book-list">'); listOpen = true; }
        out.push(`<li>${formatInline(text)}</li>`);
        return;
      } else if (listOpen) {
        out.push('</ul>'); listOpen = false;
      }
      if (/^Pregunta de reflexion/i.test(text)) {
        const t = text.replace(/^Pregunta de reflexion\s*/i, '');
        out.push(`<div class="reflection"><strong>Pregunta de reflexión</strong>${formatInline(t)}</div>`);
        return;
      }
      if (looksLikePrompt(text)) {
        out.push(`<pre class="prompt-box">${escapeHtml(text)}</pre>`);
        return;
      }
      const cls = opts.lead && i === 0 ? ' class="lead"' : '';
      out.push(`<p${cls}>${formatInline(text)}</p>`);
    });
    if (listOpen) out.push('</ul>');
    return out.join('');
  }

  function looksLikePrompt(t) {
    return /^(Actua como|Act[uú]a como|Eres |Mi coche|Mi vehiculo|Hazme las preguntas|HISTORIAL|PERFIL DEL|Escucho un|Noto vibracion|Voy a cambiar|Han pasado|Quiero aprender|Tengo que|Explicame|Aqui esta|Dame 10|Estoy pensando|Mi objetivo|Mi situacion|Mis datos|Mi negocio|Revisa todas)/i.test(t)
      && t.length < 900;
  }

  /* Merge consecutive prompt-box <pre> into one card with action buttons */
  function groupPromptBoxes() {
    const pres = Array.from(els.content.querySelectorAll('pre.prompt-box'));
    if (!pres.length) return;
    const groups = [];
    let group = [];
    pres.forEach(pre => {
      if (group.length && group[group.length - 1].nextElementSibling === pre) {
        group.push(pre);
      } else {
        if (group.length) groups.push(group);
        group = [pre];
      }
    });
    if (group.length) groups.push(group);

    groups.forEach(g => {
      const text = g.map(p => p.textContent).join('\n');
      const card = document.createElement('div');
      card.className = 'prompt-card';
      const preAll = document.createElement('pre');
      preAll.className = 'prompt-box grouped';
      preAll.textContent = text;
      const bar = document.createElement('div');
      bar.className = 'prompt-bar';
      bar.innerHTML = `
        <span class="prompt-label">PROMPT LISTO PARA USAR</span>
        <span class="prompt-btns">
          <button class="p-btn" data-prompt-act="copy">Copiar</button>
          <button class="p-btn claude" data-prompt-act="claude">→ Claude</button>
          <button class="p-btn gemini" data-prompt-act="gemini">→ Gemini</button>
          <button class="p-btn pplx" data-prompt-act="perplexity">→ Perplexity</button>
        </span>`;
      card.appendChild(bar);
      card.appendChild(preAll);
      g[0].parentNode.insertBefore(card, g[0]);
      g.forEach(p => p.remove());
    });
  }

  els.content.addEventListener('click', async e => {
    // Prompt card actions
    const pbtn = e.target.closest('[data-prompt-act]');
    if (pbtn) {
      const card = pbtn.closest('.prompt-card');
      const text = card.querySelector('pre').textContent;
      const act = pbtn.dataset.promptAct;
      if (act === 'copy') {
        try { await navigator.clipboard.writeText(text); toast('Prompt copiado — pégalo en tu IA'); }
        catch { toast('No se pudo copiar'); }
      } else {
        openAIWith(act, text);
      }
      return;
    }
    // Chapter action bar
    const act = e.target.closest('[data-act]');
    if (act) {
      const kind = act.dataset.act;
      if (kind === 'listen') toggleSpeak(act);
      else if (kind === 'askai') askAIAboutChapter();
      else if (kind === 'print') window.print();
      else if (kind === 'copylink') {
        const url = location.href.split('#')[0] + '#ch=' + state.current;
        try { await navigator.clipboard.writeText(url); toast('Enlace del capítulo copiado'); }
        catch { toast('No se pudo copiar'); }
      }
      return;
    }
    // Bookmark
    const b = e.target.closest('[data-bookmark]');
    if (b) {
      const on = toggleBookmark(state.current);
      b.classList.toggle('active', on);
      b.innerHTML = `${on ? '★' : '☆'} <span>${on ? 'Marcado' : 'Marcar'}</span>`;
      toast(on ? 'Capítulo marcado' : 'Marcador retirado');
    }
  });

  /* ---------- Text-to-speech (es-ES) ---------- */
  function pickSpanishVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find(v => /es[-_]ES/i.test(v.lang))
        || voices.find(v => /^es/i.test(v.lang))
        || null;
  }

  function toggleSpeak(btn) {
    if (!('speechSynthesis' in window)) { toast('Tu navegador no soporta lectura en voz alta'); return; }
    if (state.speaking) { stopSpeaking(); return; }
    const raw = state.chapters[state.current];
    const text = chapterPlainText(raw);
    if (!text.trim()) { toast('Este capítulo no tiene texto para leer'); return; }
    // Chunk into sentences to avoid engine cutoffs
    const chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    let i = 0;
    state.speaking = true;
    if (btn) btn.innerHTML = '⏹ <span>Parar</span>';
    const speakNext = () => {
      if (!state.speaking || i >= chunks.length) { stopSpeaking(); return; }
      const u = new SpeechSynthesisUtterance(chunks[i++].trim());
      u.lang = 'es-ES';
      const v = pickSpanishVoice();
      if (v) u.voice = v;
      u.rate = 1.0;
      u.onend = speakNext;
      u.onerror = () => stopSpeaking();
      speechSynthesis.speak(u);
    };
    // Voices may load async
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = null; speakNext(); };
      // Fallback if event never fires
      setTimeout(() => { if (state.speaking && !speechSynthesis.speaking) speakNext(); }, 400);
    } else {
      speakNext();
    }
    toast('Leyendo capítulo en voz alta…');
  }

  function stopSpeaking() {
    if (!('speechSynthesis' in window)) return;
    state.speaking = false;
    speechSynthesis.cancel();
    const btn = els.content.querySelector('[data-act="listen"]');
    if (btn) btn.innerHTML = '🔊 <span>Escuchar</span>';
  }

  /* ---------- Ask AI about chapter / selection ---------- */
  function askAIAboutChapter() {
    const ch = state.flat[state.current];
    const seed = `Estoy leyendo el libro "La IA y Mi Motor" de Jose Paulino, ${ch.chTag ? ch.chTag + ': ' : ''}"${ch.title}". Mi pregunta sobre este capítulo es: `;
    const aiQuery = document.getElementById('aiQuery');
    if (aiQuery) { aiQuery.value = seed; }
    openModal('aiModal');
    setTimeout(() => {
      if (aiQuery) { aiQuery.focus(); aiQuery.setSelectionRange(aiQuery.value.length, aiQuery.value.length); }
    }, 50);
  }

  // Selection → floating "ask AI" button
  let selTimer = null;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selTimer);
    selTimer = setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (!text || text.length < 8 || !els.content.contains(sel.anchorNode)) {
        els.selAsk.hidden = true;
        return;
      }
      const range = sel.getRangeAt(0).getBoundingClientRect();
      els.selAsk.style.left = Math.max(8, Math.min(window.innerWidth - 180, range.left + range.width / 2 - 80)) + 'px';
      els.selAsk.style.top = Math.max(64, range.top - 44) + 'px';
      els.selAsk.hidden = false;
      els.selAsk.dataset.text = text.slice(0, 500);
    }, 200);
  });
  els.selAsk.addEventListener('click', () => {
    const text = els.selAsk.dataset.text || '';
    els.selAsk.hidden = true;
    const aiQuery = document.getElementById('aiQuery');
    if (aiQuery) aiQuery.value = `Sobre este fragmento del libro "La IA y Mi Motor": «${text}» — explícamelo con más detalle: `;
    openModal('aiModal');
    setTimeout(() => aiQuery && aiQuery.focus(), 50);
  });

  /* ---------- Reading progress in chapter ---------- */
  function updateReadProgress() {
    if (!els.readProgress) return;
    const el = els.reader;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? (el.scrollTop / max) * 100 : 0;
    els.readProgress.style.width = pct.toFixed(1) + '%';
  }
  els.reader.addEventListener('scroll', updateReadProgress, { passive: true });

  /* ---------- Focus mode ---------- */
  function toggleFocus() {
    const on = document.body.classList.toggle('focus-mode');
    state.settings.focus = on;
    saveSettings();
    toast(on ? 'Modo enfoque (pulsa F o ✕ para salir)' : 'Modo normal');
  }
  if (els.btnFocus) els.btnFocus.addEventListener('click', toggleFocus);
  const focusExit = document.getElementById('focusExit');
  if (focusExit) focusExit.addEventListener('click', toggleFocus);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function formatInline(text) {
    return escapeHtml(text)
      .replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  /* ---------- Bookmarks ---------- */
  function getBookmarks() { return state.settings.bookmarks || []; }
  function isBookmarked(idx) { return getBookmarks().includes(idx); }
  function toggleBookmark(idx) {
    const arr = new Set(getBookmarks());
    if (arr.has(idx)) arr.delete(idx); else arr.add(idx);
    state.settings.bookmarks = [...arr].sort((a, b) => a - b);
    saveSettings();
    return arr.has(idx);
  }

  /* ---------- Pager & keyboard ---------- */
  els.btnPrev.addEventListener('click', () => renderChapter(state.current - 1));
  els.btnNext.addEventListener('click', () => renderChapter(state.current + 1));
  document.addEventListener('keydown', e => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.metaKey || e.ctrlKey) {
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); els.btnSearch.click(); }
      return;
    }
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowLeft' || k === 'k') renderChapter(state.current - 1);
    else if (e.key === 'ArrowRight' || k === 'j') renderChapter(state.current + 1);
    else if (k === 'g') renderChapter(0);
    else if (k === 'f') toggleFocus();
    else if (k === 's') { const btn = els.content.querySelector('[data-act="listen"]'); toggleSpeak(btn); }
    else if (k === 'a') askAIAboutChapter();
  });

  /* ---------- TOC toggle (mobile) ---------- */
  els.btnToc.addEventListener('click', () => els.toc.classList.toggle('collapsed'));
  els.btnTocClose.addEventListener('click', () => els.toc.classList.add('collapsed'));
  if (window.matchMedia('(max-width: 900px)').matches) els.toc.classList.add('collapsed');

  /* ---------- Theme & font ---------- */
  function applyTheme() {
    const t = state.settings.theme || 'auto';
    document.body.dataset.theme = t;
    if (t === 'auto') {
      const m = window.matchMedia('(prefers-color-scheme: dark)');
      document.body.dataset.prefers = m.matches ? 'dark' : 'light';
      m.addEventListener('change', e => { document.body.dataset.prefers = e.matches ? 'dark' : 'light'; });
    } else {
      delete document.body.dataset.prefers;
    }
  }
  els.btnTheme.addEventListener('click', () => {
    const order = ['auto', 'light', 'sepia', 'dark'];
    const cur = state.settings.theme || 'auto';
    state.settings.theme = order[(order.indexOf(cur) + 1) % order.length];
    saveSettings(); applyTheme();
    toast(`Tema: ${state.settings.theme}`);
  });
  applyTheme();

  function applyFont() { document.body.dataset.font = state.settings.font || 'm'; }
  els.btnFont.addEventListener('click', () => {
    const order = ['s', 'm', 'l', 'xl'];
    const cur = state.settings.font || 'm';
    state.settings.font = order[(order.indexOf(cur) + 1) % order.length];
    saveSettings(); applyFont();
    toast(`Tamaño: ${state.settings.font.toUpperCase()}`);
  });
  applyFont();
  if (state.settings.focus) document.body.classList.add('focus-mode');

  /* ---------- Modal helpers ---------- */
  const MODAL_IDS = ['qrModal', 'searchModal', 'aiModal'];
  function openModal(id) {
    MODAL_IDS.forEach(other => { if (other !== id) closeModal(other); });
    const m = document.getElementById(id);
    m.hidden = false; m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m || m.hidden) return;
    m.hidden = true; m.setAttribute('aria-hidden', 'true');
    // Release focus from any input inside the modal so keyboard shortcuts work again
    if (m.contains(document.activeElement)) document.activeElement.blur();
    if (MODAL_IDS.every(i => document.getElementById(i).hidden)) {
      document.body.classList.remove('modal-open');
    }
  }
  function closeAllModals() { MODAL_IDS.forEach(closeModal); }
  document.addEventListener('click', e => {
    const closer = e.target.closest('[data-close]');
    if (closer) { closeModal(closer.dataset.close); return; }
    if (e.target.classList && e.target.classList.contains('modal')) closeModal(e.target.id);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });

  /* ---------- QR ---------- */
  els.btnQR.addEventListener('click', () => {
    els.qrCustomUrl.value = '';
    openModal('qrModal');
    waitForQR().then(() => drawQR(currentShareUrl()));
  });

  function waitForQR(timeout = 4000) {
    return new Promise(resolve => {
      const t0 = Date.now();
      (function tick() {
        if (typeof window.qrcode === 'function') return resolve(true);
        if (Date.now() - t0 > timeout) return resolve(false);
        setTimeout(tick, 60);
      })();
    });
  }
  els.btnQRRegen.addEventListener('click', () => {
    const u = (els.qrCustomUrl.value || '').trim() || currentShareUrl();
    drawQR(u);
  });
  els.btnQRDownload.addEventListener('click', () => downloadQR());
  els.btnQRCopy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(els.qrUrl.textContent); toast('Enlace copiado'); }
    catch { toast('No se pudo copiar'); }
  });

  const btnAppDownload = document.getElementById('btnAppDownload');
  if (btnAppDownload) btnAppDownload.addEventListener('click', () => downloadApp());
  async function downloadApp() {
    try {
      const html = '<!doctype html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'la-ia-y-mi-motor.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Descargando la app…');
    } catch (e) {
      toast('No se pudo descargar: ' + e.message);
    }
  }

  els.btnQRShare.addEventListener('click', async () => {
    const url = els.qrUrl.textContent;
    if (navigator.share) {
      try { await navigator.share({ title: 'La IA y Mi Motor', text: 'Lee el libro completo en PWA', url }); }
      catch { /* canceled */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); }
      catch { toast('Compartir no disponible'); }
    }
  });

  function currentShareUrl() {
    return location.href.split('#')[0] + '#ch=' + state.current;
  }

  function drawQR(url) {
    els.qrUrl.textContent = url;
    els.qrLinkOpen.href = url;
    els.qrCanvas.innerHTML = '';
    const localFile = /^file:/i.test(url);
    const warn = document.getElementById('qrWarn');
    if (warn) warn.hidden = !localFile;

    if (typeof window.qrcode !== 'function') {
      els.qrCanvas.innerHTML = '<p style="color:#666;font-size:13px;text-align:center;margin:0">Generador QR no disponible.</p>';
      return;
    }
    let qr = null;
    for (let typeNumber = 4; typeNumber <= 40; typeNumber++) {
      try {
        const cand = window.qrcode(typeNumber, 'M');
        cand.addData(url);
        cand.make();
        qr = cand;
        break;
      } catch (err) { /* larger type */ }
    }
    if (!qr) {
      els.qrCanvas.innerHTML = '<p style="color:#c33;font-size:13px;margin:0">URL demasiado larga para un QR.</p>';
      return;
    }
    const cells = qr.getModuleCount();
    const cell = 8, quiet = 4;
    const dim = (cells + quiet * 2) * cell;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('xmlns', ns);
    svg.setAttribute('viewBox', `0 0 ${dim} ${dim}`);
    svg.setAttribute('width', '260');
    svg.setAttribute('height', '260');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.style.maxWidth = '100%'; svg.style.height = 'auto';
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', dim); bg.setAttribute('height', dim); bg.setAttribute('fill', '#ffffff');
    svg.appendChild(bg);
    let path = '';
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if (qr.isDark(r, c)) {
          path += `M${(c + quiet) * cell} ${(r + quiet) * cell}h${cell}v${cell}h${-cell}z`;
        }
      }
    }
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path); p.setAttribute('fill', '#000000');
    svg.appendChild(p);
    els.qrCanvas.appendChild(svg);
  }

  function downloadQR() {
    const svg = els.qrCanvas.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const dim = parseInt(svg.getAttribute('width'), 10) || 320;
    const scale = 3;
    const canvas = document.createElement('canvas');
    canvas.width = dim * scale; canvas.height = dim * scale;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const objUrl = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objUrl);
      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'la-ia-y-mi-motor-qr.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); toast('No se pudo exportar'); };
    img.src = objUrl;
  }

  /* ---------- Bookmarks panel ---------- */
  els.btnBookmark.addEventListener('click', () => {
    const bms = getBookmarks();
    if (!bms.length) { toast('Aún no tienes marcadores'); return; }
    els.searchInput.value = '';
    els.searchInput.placeholder = 'Buscar… (o elige un marcador abajo)';
    const out = ['<div class="search-empty">Marcadores guardados</div>'];
    bms.forEach(i => {
      const ch = state.flat[i];
      if (!ch) return;
      out.push(`<button class="search-item" data-jump="${i}">
        <div class="si-title">${ch.chTag ? ch.chTag + ' · ' : ''}${escapeHtml(ch.title)}</div>
      </button>`);
    });
    els.searchResults.innerHTML = out.join('');
    openModal('searchModal');
  });

  /* ---------- Search (with OBD detector) ---------- */
  let searchT = null;
  els.searchInput.addEventListener('input', () => {
    clearTimeout(searchT);
    searchT = setTimeout(runSearch, 120);
  });
  els.searchResults.addEventListener('click', e => {
    const ai = e.target.closest('[data-obd-ai]');
    if (ai) {
      closeModal('searchModal');
      const code = ai.dataset.obdAi;
      const aiQuery = document.getElementById('aiQuery');
      if (aiQuery) aiQuery.value = `Actúa como mecánico experto en diagnosis electrónica. Explícame qué significa el código OBD ${code.toUpperCase()}, sus causas más probables, qué puedo verificar yo mismo, si es urgente, y el coste estimado de reparación en España. Mi coche es: `;
      openModal('aiModal');
      setTimeout(() => aiQuery && aiQuery.focus(), 50);
      return;
    }
    const j = e.target.closest('[data-jump]');
    if (!j) return;
    closeModal('searchModal');
    renderChapter(parseInt(j.dataset.jump, 10));
  });

  function runSearch() {
    const q = els.searchInput.value.trim();
    if (q.length < 2) { els.searchResults.innerHTML = '<div class="search-empty">Escribe al menos 2 caracteres. Consejo: si escribes un código OBD (ej. P0300) te doy acceso directo.</div>'; return; }

    const parts = [];
    // OBD code fast-path
    const obd = q.match(/^([pbcu])\s?(\d{3,4})$/i);
    if (obd) {
      const code = (obd[1] + obd[2]).toUpperCase();
      parts.push(`<div class="obd-hit">
        <div class="obd-code">Código OBD detectado: <strong>${code}</strong></div>
        <button class="search-item obd" data-jump="4">📖 Ver Capítulo 3 — Códigos OBD con IA</button>
        <button class="search-item obd" data-jump="16">📋 Ver Apéndice B — Los 50 códigos más comunes</button>
        <button class="search-item obd" data-obd-ai="${code}">💬 Preguntar a la IA por ${code} ahora</button>
      </div>`);
    }

    const re = new RegExp(escapeRegex(q), 'i');
    const hits = [];
    state.flat.forEach((ch, i) => {
      (ch.searchIndex || []).forEach(item => {
        const m = item.text.match(re) || (item.title || '').match(re);
        if (m) {
          hits.push({
            idx: i,
            title: `${ch.chTag ? ch.chTag + ' · ' : ''}${ch.title}${item.title && item.title !== ch.title ? ' › ' + item.title : ''}`,
            snippet: makeSnippet(item.text, q),
          });
        }
      });
    });
    if (!hits.length && !parts.length) {
      els.searchResults.innerHTML = '<div class="search-empty">Sin resultados.</div>';
      return;
    }
    parts.push(hits.slice(0, 60).map(h => `
      <button class="search-item" data-jump="${h.idx}">
        <div class="si-title">${escapeHtml(h.title)}</div>
        <div class="si-snippet">${h.snippet}</div>
      </button>`).join(''));
    els.searchResults.innerHTML = parts.join('');
  }

  function makeSnippet(text, q) {
    const re = new RegExp(escapeRegex(q), 'i');
    const m = re.exec(text);
    if (!m) return escapeHtml(text.slice(0, 140)) + '…';
    const start = Math.max(0, m.index - 60);
    const end = Math.min(text.length, m.index + q.length + 80);
    const before = (start > 0 ? '…' : '') + text.slice(start, m.index);
    const hit = text.slice(m.index, m.index + q.length);
    const after = text.slice(m.index + q.length, end) + (end < text.length ? '…' : '');
    return escapeHtml(before) + '<mark>' + escapeHtml(hit) + '</mark>' + escapeHtml(after);
  }
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  els.btnSearch.addEventListener('click', () => {
    els.searchInput.placeholder = 'Palabra, frase o código OBD (ej. P0300)…';
    els.searchResults.innerHTML = '';
    openModal('searchModal');
    setTimeout(() => els.searchInput.focus(), 30);
  });

  /* ---------- PWA install ---------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    els.btnInstall.hidden = false;
  });
  els.btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) { toast('Ya está instalada o el navegador no lo permite'); return; }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') toast('Instalada');
    deferredPrompt = null;
    els.btnInstall.hidden = true;
  });
  window.addEventListener('appinstalled', () => { els.btnInstall.hidden = true; toast('App instalada'); });

  /* ---------- Service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  /* ---------- AI helpers (Claude · Gemini · Perplexity) ---------- */
  const btnAI = document.getElementById('btnAI');
  const aiQuery = document.getElementById('aiQuery');
  const btnAICopy = document.getElementById('btnAICopy');

  if (btnAI) btnAI.addEventListener('click', () => {
    const ch = state.flat[state.current];
    const ctx = ch ? `${ch.chTag ? ch.chTag + ' · ' : ''}${ch.title}` : '';
    if (aiQuery && !aiQuery.value && ctx) {
      aiQuery.placeholder = `Estoy leyendo "${ctx}". Pregúntame algo sobre…`;
    }
    openModal('aiModal');
    setTimeout(() => aiQuery && aiQuery.focus(), 30);
  });

  document.querySelectorAll('[data-suggest]').forEach(el => {
    el.addEventListener('click', () => {
      aiQuery.value = el.dataset.suggest + (aiQuery.value ? aiQuery.value : '');
      aiQuery.focus();
    });
  });

  document.querySelectorAll('[data-ai]').forEach(el => {
    el.addEventListener('click', () => openAIWith(el.dataset.ai, (aiQuery.value || '').trim()));
  });

  function openAIWith(which, q) {
    const enc = encodeURIComponent(q || '');
    let url = '';
    if (which === 'claude') url = q ? `https://claude.ai/new?q=${enc}` : 'https://claude.ai/new';
    else if (which === 'gemini') url = q ? `https://aistudio.google.com/prompts/new_chat?prompt=${enc}` : 'https://aistudio.google.com/';
    else if (which === 'perplexity') url = q ? `https://www.perplexity.ai/search?q=${enc}` : 'https://www.perplexity.ai/';
    else return;
    try { window.open(url, '_blank', 'noopener,noreferrer'); }
    catch { location.href = url; }
  }

  if (btnAICopy) btnAICopy.addEventListener('click', async () => {
    const q = (aiQuery.value || '').trim();
    if (!q) { toast('Escribe primero una pregunta'); return; }
    try { await navigator.clipboard.writeText(q); toast('Pregunta copiada'); }
    catch { toast('No se pudo copiar'); }
  });

  /* ---------- Welcome ---------- */
  const welcome = document.getElementById('welcome');
  const btnWelcomeClose = document.getElementById('btnWelcomeClose');
  function dismissWelcome() {
    if (!welcome) return;
    welcome.hidden = true;
    state.settings.seenWelcomeV3 = true;
    saveSettings();
  }
  if (welcome && !state.settings.seenWelcomeV3) welcome.hidden = false;
  if (btnWelcomeClose) btnWelcomeClose.addEventListener('click', dismissWelcome);
  document.querySelectorAll('[data-welcome-action]').forEach(step => {
    step.addEventListener('click', () => {
      const action = step.dataset.welcomeAction;
      dismissWelcome();
      setTimeout(() => {
        if (action === 'toc') { els.toc.classList.remove('collapsed'); toast('Índice abierto'); }
        else if (action === 'search') els.btnSearch.click();
        else if (action === 'qr') els.btnQR.click();
        else if (action === 'ai') { const b = document.getElementById('btnAI'); if (b) b.click(); }
      }, 80);
    });
  });

  /* ---------- Boot ---------- */
  loadBook();
})();
