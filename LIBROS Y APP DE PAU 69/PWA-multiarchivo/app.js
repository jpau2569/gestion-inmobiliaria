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
    if (!audio.playing || audio.chapterIdx !== idx) stopSpeaking();
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
    parts.push(`<button class="ch-act featured" data-act="infographic" title="Ver infografía animada de esta lección (I)">🎬 <span>Infografía</span></button>`);
    parts.push(`<button class="ch-act" data-act="notes" title="Mis notas de este capítulo (N)">📝 <span>Notas</span></button>`);
    parts.push(`<button class="ch-act" data-act="copylink" title="Copiar enlace al capítulo">🔗 <span>Enlace</span></button>`);
    parts.push(`<button class="ch-act" data-act="print" title="Imprimir capítulo">🖨 <span>Imprimir</span></button>`);
    parts.push(`</div>`);
    parts.push(`</header>`);

    if (raw.intro && raw.intro.length) parts.push(renderBlocks(raw.intro, { lead: idx === 0 }));
    (raw.sections || []).forEach((s, si) => {
      if (s.title) parts.push(`<h2 id="sec-${si}" class="section-anchor">${escapeHtml(s.title)}</h2>`);
      if (s.title) parts.push(lessonCard(s, si));
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

  function artFor(text) {
    const A = window.__ART__;
    if (!A) return null;
    return { key: A.match(text), svg: A.art[A.match(text)] };
  }

  /* Inline visual infographic for a lesson, embedded in the reading flow */
  function lessonCard(s, si) {
    const allParas = [...(s.paragraphs || []), ...((s.subsections || []).flatMap(x => x.paragraphs || []))];
    if (!allParas.length && !(s.subsections || []).length) return '';
    const stat = findStat(allParas.map(p => p.text).join(' '));
    const bullets = allParas.filter(p => p.list).slice(0, 3).map(p => trimTo(p.text, 90));
    const key = !bullets.length ? allParas.find(p => !p.list && p.text.length > 40 && !/^Pregunta de reflexion/i.test(p.text)) : null;
    const subCount = (s.subsections || []).filter(x => x.title).length;
    const artInfo = artFor(s.title + ' ' + allParas.slice(0, 6).map(p => p.text).join(' '));
    const out = [`<aside class="lesson-card" aria-label="Infografía de la lección">`];
    out.push(`<div class="lc-head"><span class="lc-num">${si + 1}</span><span class="lc-label">INFOGRAFÍA · LECCIÓN ${si + 1}</span>`);
    out.push(`<button class="lc-play" data-lc-play="${si}" title="Ver esta lección como infografía animada">▶ Ver animada</button></div>`);
    out.push('<div class="lc-flex">');
    if (artInfo) out.push(`<div class="lc-art" aria-hidden="true">${artInfo.svg}</div>`);
    out.push('<div class="lc-body">');
    if (stat) out.push(`<div class="lc-stat">${escapeHtml(stat)}</div>`);
    if (bullets.length) {
      out.push('<ul class="lc-points">' + bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('') + '</ul>');
    } else if (key) {
      out.push(`<p class="lc-key">${escapeHtml(trimTo(key.text, 160))}</p>`);
    }
    if (subCount >= 2) out.push(`<div class="lc-meta">${subCount} apartados en esta lección</div>`);
    out.push('</div></div></aside>');
    return out.join('');
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
    // Inline lesson infographic play
    const lcp = e.target.closest('[data-lc-play]');
    if (lcp) { openInfographic(state.current, parseInt(lcp.dataset.lcPlay, 10)); return; }
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
      else if (kind === 'infographic') openInfographic();
      else if (kind === 'notes') openNotes();
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

  /* ---------- Audiobook player (es-ES speechSynthesis) ---------- */
  const audio = {
    playing: false,
    paused: false,
    chunkIdx: 0,
    chunks: [],
    chapterIdx: 0,
    rate: parseFloat(state.settings.ttsRate) || 1.0,
    voiceURI: state.settings.ttsVoice || null,
    autoAdvance: true,
    sleepUntil: null,
    sleepTimer: null,
    errCount: 0,
  };
  const player = document.getElementById('audioPlayer');
  const playerPlay = document.getElementById('apPlay');
  const playerInfo = document.getElementById('apInfo');
  const playerRate = document.getElementById('apRate');
  const playerVoice = document.getElementById('apVoice');
  const playerSleep = document.getElementById('apSleep');

  function spanishVoices() {
    return speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
  }
  function pickVoice() {
    const voices = speechSynthesis.getVoices();
    if (audio.voiceURI) {
      const v = voices.find(v => v.voiceURI === audio.voiceURI);
      if (v) return v;
    }
    return voices.find(v => /es[-_]ES/i.test(v.lang)) || voices.find(v => /^es/i.test(v.lang)) || null;
  }
  function populateVoices() {
    if (!playerVoice) return;
    const vs = spanishVoices();
    playerVoice.innerHTML = vs.length
      ? vs.map(v => `<option value="${v.voiceURI}" ${v.voiceURI === audio.voiceURI ? 'selected' : ''}>${v.name}</option>`).join('')
      : '<option value="">Voz del sistema</option>';
  }
  if ('speechSynthesis' in window) {
    populateVoices();
    speechSynthesis.addEventListener?.('voiceschanged', populateVoices);
  }

  function startAudiobook(fromChapter) {
    if (!('speechSynthesis' in window)) { toast('Tu navegador no soporta lectura en voz alta'); return; }
    stopAudiobook(true);
    audio.chapterIdx = typeof fromChapter === 'number' ? fromChapter : state.current;
    loadChapter(audio.chapterIdx).then(raw => {
      const ch = state.flat[audio.chapterIdx];
      const text = chapterPlainText(raw);
      if (!text.trim()) {
        // Skip empty chapters when auto-advancing
        if (audio.autoAdvance && audio.chapterIdx < state.flat.length - 1) {
          startAudiobook(audio.chapterIdx + 1);
        } else {
          toast('Este capítulo no tiene texto para leer');
        }
        return;
      }
      audio.chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      audio.chunkIdx = 0;
      audio.errCount = 0;
      audio.playing = true;
      audio.paused = false;
      showPlayer();
      updatePlayerUI();
      if (audio.chapterIdx !== state.current) renderChapter(audio.chapterIdx);
      speakLoop();
    });
  }

  function speakLoop() {
    if (!audio.playing || audio.paused) return;
    if (audio.sleepUntil && Date.now() > audio.sleepUntil) { stopAudiobook(); toast('Temporizador: lectura detenida'); return; }
    if (audio.chunkIdx >= audio.chunks.length) {
      // Chapter finished → advance
      if (audio.autoAdvance && audio.chapterIdx < state.flat.length - 1) {
        toast('Siguiente capítulo…');
        startAudiobook(audio.chapterIdx + 1);
      } else {
        stopAudiobook();
        toast('Lectura terminada');
      }
      return;
    }
    const u = new SpeechSynthesisUtterance(audio.chunks[audio.chunkIdx].trim());
    u.lang = 'es-ES';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = audio.rate;
    u.onend = () => { audio.errCount = 0; audio.chunkIdx++; updatePlayerUI(); speakLoop(); };
    u.onerror = () => {
      audio.errCount++;
      if (audio.errCount >= 5) {
        stopAudiobook();
        toast('No hay voz de síntesis disponible en este dispositivo');
        return;
      }
      audio.chunkIdx++;
      speakLoop();
    };
    speechSynthesis.speak(u);
  }

  function pauseAudiobook() {
    if (!audio.playing) return;
    audio.paused = true;
    speechSynthesis.cancel();
    updatePlayerUI();
  }
  function resumeAudiobook() {
    if (!audio.playing || !audio.paused) return;
    audio.paused = false;
    updatePlayerUI();
    speakLoop();
  }
  function stopAudiobook(silent) {
    audio.playing = false;
    audio.paused = false;
    audio.chunks = [];
    audio.chunkIdx = 0;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    clearTimeout(audio.sleepTimer);
    audio.sleepUntil = null;
    hidePlayer();
    const btn = els.content.querySelector('[data-act="listen"]');
    if (btn) btn.innerHTML = '🔊 <span>Escuchar</span>';
    if (playerSleep) playerSleep.value = '';
  }

  function showPlayer() { if (player) player.hidden = false; }
  function hidePlayer() { if (player) player.hidden = true; }
  function updatePlayerUI() {
    if (!player || player.hidden) return;
    const ch = state.flat[audio.chapterIdx];
    const pct = audio.chunks.length ? Math.round((audio.chunkIdx / audio.chunks.length) * 100) : 0;
    if (playerInfo) playerInfo.textContent = `${ch ? (ch.chTag || ch.title).slice(0, 26) : ''} · ${pct}%`;
    if (playerPlay) playerPlay.textContent = audio.paused ? '▶' : '⏸';
    const btn = els.content.querySelector('[data-act="listen"]');
    if (btn && audio.playing) btn.innerHTML = '⏹ <span>Parar</span>';
  }

  if (player) {
    document.getElementById('apPrev').addEventListener('click', () => {
      if (audio.chapterIdx > 0) startAudiobook(audio.chapterIdx - 1);
    });
    document.getElementById('apNext').addEventListener('click', () => {
      if (audio.chapterIdx < state.flat.length - 1) startAudiobook(audio.chapterIdx + 1);
    });
    playerPlay.addEventListener('click', () => {
      if (audio.paused) resumeAudiobook(); else pauseAudiobook();
    });
    document.getElementById('apStop').addEventListener('click', () => stopAudiobook());
    playerRate.addEventListener('change', () => {
      audio.rate = parseFloat(playerRate.value) || 1;
      state.settings.ttsRate = audio.rate;
      saveSettings();
      if (audio.playing && !audio.paused) { speechSynthesis.cancel(); speakLoop(); }
    });
    playerVoice.addEventListener('change', () => {
      audio.voiceURI = playerVoice.value || null;
      state.settings.ttsVoice = audio.voiceURI;
      saveSettings();
      if (audio.playing && !audio.paused) { speechSynthesis.cancel(); speakLoop(); }
    });
    playerSleep.addEventListener('change', () => {
      const mins = parseInt(playerSleep.value, 10);
      clearTimeout(audio.sleepTimer);
      if (mins) {
        audio.sleepUntil = Date.now() + mins * 60000;
        audio.sleepTimer = setTimeout(() => { stopAudiobook(); toast('Temporizador: lectura detenida'); }, mins * 60000);
        toast(`Se detendrá en ${mins} min`);
      } else {
        audio.sleepUntil = null;
      }
    });
    playerRate.value = String(audio.rate);
  }

  function toggleSpeak() {
    if (audio.playing) stopAudiobook();
    else startAudiobook(state.current);
  }
  function stopSpeaking() { if (audio.playing) stopAudiobook(); }

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
    const igOv = document.getElementById('igOverlay');
    if (igOv && !igOv.hidden) return;
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
    else if (k === 'n') openNotes();
    else if (k === 'i') openInfographic();
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
  const MODAL_IDS = ['qrModal', 'searchModal', 'aiModal', 'notesModal', 'igIndexModal'];
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

  /* ---------- Voice dictation (Web Speech API) ---------- */
  const btnMic = document.getElementById('btnMic');
  let recog = null, recogActive = false;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (btnMic) {
    if (!SR) {
      btnMic.title = 'Dictado no soportado en este navegador (usa Chrome o Edge)';
    }
    btnMic.addEventListener('click', () => {
      if (!SR) { toast('Dictado no soportado — usa Chrome/Edge o escribe la pregunta'); return; }
      if (recogActive) { recog.stop(); return; }
      recog = new SR();
      recog.lang = 'es-ES';
      recog.interimResults = true;
      recog.continuous = false;
      const base = aiQuery.value;
      recog.onresult = e => {
        let txt = '';
        for (const r of e.results) txt += r[0].transcript;
        aiQuery.value = base + txt;
      };
      recog.onstart = () => { recogActive = true; btnMic.classList.add('rec'); btnMic.textContent = '⏹'; toast('Escuchando… habla ahora'); };
      recog.onend = () => { recogActive = false; btnMic.classList.remove('rec'); btnMic.textContent = '🎤'; aiQuery.focus(); };
      recog.onerror = ev => {
        recogActive = false; btnMic.classList.remove('rec'); btnMic.textContent = '🎤';
        toast(ev.error === 'not-allowed' ? 'Permiso de micrófono denegado' : 'No se pudo escuchar — inténtalo de nuevo');
      };
      try { recog.start(); } catch { toast('No se pudo iniciar el micrófono'); }
    });
  }

  /* ---------- Notes per chapter ---------- */
  const notesModalId = 'notesModal';
  const notesArea = document.getElementById('notesArea');
  const notesTitle = document.getElementById('notesChapter');
  function getNotes() { return state.settings.notes || {}; }
  function openNotes() {
    const ch = state.flat[state.current];
    if (notesTitle) notesTitle.textContent = `${ch.chTag ? ch.chTag + ' · ' : ''}${ch.title}`;
    if (notesArea) notesArea.value = getNotes()[state.current] || '';
    openModal(notesModalId);
    setTimeout(() => notesArea && notesArea.focus(), 50);
  }
  if (notesArea) {
    let saveT = null;
    notesArea.addEventListener('input', () => {
      clearTimeout(saveT);
      saveT = setTimeout(() => {
        const notes = getNotes();
        if (notesArea.value.trim()) notes[state.current] = notesArea.value;
        else delete notes[state.current];
        state.settings.notes = notes;
        saveSettings();
      }, 300);
    });
  }
  const btnNotesExport = document.getElementById('btnNotesExport');
  if (btnNotesExport) btnNotesExport.addEventListener('click', () => {
    const notes = getNotes();
    const keys = Object.keys(notes);
    if (!keys.length) { toast('No tienes notas todavía'); return; }
    const lines = ['MIS NOTAS — La IA y Mi Motor', ''];
    keys.sort((a, b) => a - b).forEach(k => {
      const ch = state.flat[k];
      lines.push(`■ ${ch ? (ch.chTag ? ch.chTag + ' · ' : '') + ch.title : 'Capítulo ' + k}`);
      lines.push(notes[k], '');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mis-notas-la-ia-y-mi-motor.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast('Notas exportadas');
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

  /* ---------- Video infographics (story-style, offline) ---------- */
  const ig = { slides: [], idx: 0, timer: null, narrate: false, playing: false };
  const igOverlay = document.getElementById('igOverlay');
  const igSlideEl = document.getElementById('igSlide');
  const igBar = document.getElementById('igBar');

  function buildSlides(idx, secIdx) {
    const meta = state.flat[idx];
    const raw = state.chapters[idx];
    const slides = [];
    if (typeof secIdx === 'number') {
      const s = (raw.sections || [])[secIdx];
      if (s) return buildSectionSlides(meta, s, secIdx);
    }
    slides.push({
      kind: 'title',
      tag: meta.chTag || 'La IA y Mi Motor',
      title: meta.title,
      sub: `≈ ${readingMinutes(raw)} min · ${(raw.sections || []).length || 1} lecciones`,
      art: (artFor(meta.title) || {}).svg,
    });
    const firstIntro = (raw.intro || []).find(p => !p.list && p.text.length > 40);
    if (firstIntro) {
      slides.push({ kind: 'text', tag: 'La historia', title: '', text: trimTo(firstIntro.text, 220) });
    }
    (raw.sections || []).slice(0, 8).forEach((s, i) => {
      if (!s.title) return;
      const paras = [...(s.paragraphs || []), ...((s.subsections || []).flatMap(x => x.paragraphs || []))];
      const key = paras.find(p => !p.list && p.text.length > 30 && !/^Pregunta de reflexion/i.test(p.text));
      const stat = findStat(paras.map(p => p.text).join(' '));
      slides.push({
        kind: 'section',
        tag: `Lección ${i + 1}`,
        title: s.title,
        text: key ? trimTo(key.text, 190) : '',
        stat,
        art: (artFor(s.title + ' ' + paras.slice(0, 4).map(p => p.text).join(' ')) || {}).svg,
      });
      const bl = paras.filter(p => p.list).slice(0, 4).map(p => trimTo(p.text, 64));
      if (bl.length >= 3) slides.push({ kind: 'bullets', tag: `Lección ${i + 1} · claves`, title: '', bullets: bl });
    });
    const refl = [...(raw.intro || []), ...(raw.sections || []).flatMap(s => [...(s.paragraphs || []), ...(s.subsections || []).flatMap(x => x.paragraphs || [])])]
      .find(p => /^Pregunta de reflexion/i.test(p.text));
    if (refl) {
      slides.push({ kind: 'reflection', tag: 'Para reflexionar', title: '', text: trimTo(refl.text.replace(/^Pregunta de reflexion\s*/i, ''), 240) });
    }
    slides.push({ kind: 'end', tag: meta.chTag || '', title: '¡Lección completada!', text: 'Sigue leyendo el capítulo completo o pasa al siguiente.' });
    return slides;
  }

  function buildSectionSlides(meta, s, secIdx) {
    const slides = [];
    slides.push({
      kind: 'title',
      tag: `${meta.chTag || meta.title} · Lección ${secIdx + 1}`,
      title: s.title || meta.title,
      sub: 'Infografía de la lección',
      art: (artFor((s.title || '') + ' ' + (s.paragraphs || []).slice(0, 4).map(p => p.text).join(' ')) || {}).svg,
    });
    const allParas = [...(s.paragraphs || []), ...((s.subsections || []).flatMap(x => (x.title ? [{ text: x.title + '.', list: false }] : []).concat(x.paragraphs || [])))];
    const keyTexts = allParas.filter(p => !p.list && p.text.length > 40 && !/^Pregunta de reflexion/i.test(p.text)).slice(0, 4);
    keyTexts.forEach((p, i) => {
      const stat = findStat(p.text);
      slides.push({ kind: 'section', tag: `Idea ${i + 1}`, title: '', text: trimTo(p.text, 210), stat, art: (artFor(p.text) || {}).svg });
    });
    const bullets = allParas.filter(p => p.list).slice(0, 5).map(p => trimTo(p.text, 70));
    if (bullets.length >= 2) {
      slides.push({ kind: 'bullets', tag: 'Puntos clave', title: '', bullets });
    }
    const refl = allParas.find(p => /^Pregunta de reflexion/i.test(p.text));
    if (refl) slides.push({ kind: 'reflection', tag: 'Para reflexionar', title: '', text: trimTo(refl.text.replace(/^Pregunta de reflexion\s*/i, ''), 240) });
    slides.push({ kind: 'end', tag: meta.chTag || '', title: 'Lección vista', text: 'Vuelve al texto completo o pasa a la siguiente lección.' });
    return slides;
  }

  function trimTo(t, n) { return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }
  function findStat(text) {
    const m = text.match(/(\d[\d.,]*)\s?(EUR|euros?|km|%|bares|minutos|segundos|horas|años)/i);
    return m ? `${m[1]} ${m[2]}` : null;
  }

  function openInfographic(chIdx, secIdx) {
    const idx = typeof chIdx === 'number' ? chIdx : state.current;
    loadChapter(idx).then(() => {
      if (idx !== state.current) renderChapter(idx);
      ig.slides = buildSlides(idx, secIdx);
      ig.idx = 0;
      ig.playing = true;
      igOverlay.hidden = false;
      document.body.classList.add('modal-open');
      renderIgBar();
      showSlide(0);
    });
  }
  function closeInfographic() {
    ig.playing = false;
    clearTimeout(ig.timer);
    if (ig.narrate) speechSynthesis.cancel();
    igOverlay.hidden = true;
    document.body.classList.remove('modal-open');
  }

  function renderIgBar() {
    igBar.innerHTML = ig.slides.map((_, i) =>
      `<span class="ig-seg${i < ig.idx ? ' done' : ''}${i === ig.idx ? ' cur' : ''}"><span class="ig-fill"></span></span>`).join('');
  }

  function showSlide(i) {
    if (i < 0) i = 0;
    if (i >= ig.slides.length) { closeInfographic(); return; }
    ig.idx = i;
    clearTimeout(ig.timer);
    const s = ig.slides[i];
    const parts = [`<div class="ig-inner kind-${s.kind}">`];
    if (s.art) parts.push(`<div class="ig-art" aria-hidden="true">${s.art}</div>`);
    if (s.tag) parts.push(`<div class="ig-tag">${escapeHtml(s.tag)}</div>`);
    if (s.title) parts.push(`<div class="ig-title">${escapeHtml(s.title)}</div>`);
    if (s.stat) parts.push(`<div class="ig-stat">${escapeHtml(s.stat)}</div>`);
    if (s.bullets) parts.push('<ul class="ig-bullets">' + s.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('') + '</ul>');
    if (s.text) parts.push(`<div class="ig-text">${escapeHtml(s.text)}</div>`);
    if (s.sub) parts.push(`<div class="ig-sub">${escapeHtml(s.sub)}</div>`);
    parts.push('</div>');
    igSlideEl.innerHTML = parts.join('');
    renderIgBar();

    const dur = s.kind === 'title' || s.kind === 'end' ? 4500 : 7000;
    if (ig.narrate && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance([s.tag, s.title, s.stat, s.text, ...(s.bullets || [])].filter(Boolean).join('. '));
      u.lang = 'es-ES';
      const v = pickVoice(); if (v) u.voice = v;
      u.rate = audio.rate;
      u.onend = () => { if (ig.playing && ig.idx === i) ig.timer = setTimeout(() => showSlide(i + 1), 600); };
      u.onerror = () => { if (ig.playing && ig.idx === i) ig.timer = setTimeout(() => showSlide(i + 1), dur); };
      speechSynthesis.speak(u);
    } else {
      ig.timer = setTimeout(() => { if (ig.playing) showSlide(i + 1); }, dur);
    }
  }

  if (igOverlay) {
    document.getElementById('igClose').addEventListener('click', closeInfographic);
    document.getElementById('igPrevZone').addEventListener('click', () => showSlide(ig.idx - 1));
    document.getElementById('igNextZone').addEventListener('click', () => showSlide(ig.idx + 1));
    const igVoice = document.getElementById('igVoice');
    igVoice.addEventListener('click', () => {
      ig.narrate = !ig.narrate;
      igVoice.classList.toggle('on', ig.narrate);
      igVoice.textContent = ig.narrate ? '🔊' : '🔇';
      if (!ig.narrate) speechSynthesis.cancel();
      showSlide(ig.idx);
      toast(ig.narrate ? 'Narración activada' : 'Narración desactivada');
    });
    document.addEventListener('keydown', e => {
      if (igOverlay.hidden) return;
      if (e.key === 'Escape') closeInfographic();
      if (e.key === 'ArrowRight') showSlide(ig.idx + 1);
      if (e.key === 'ArrowLeft') showSlide(ig.idx - 1);
    });
  }

  /* ---------- Infographics gallery (all lessons) ---------- */
  const igIndexList = document.getElementById('igIndexList');
  function openIgIndex() {
    if (!igIndexList) return;
    const parts = [];
    state.flat.forEach((ch, i) => {
      const secs = state.book.chapters[i].sections || [];
      parts.push('<div class="gal-ch">');
      parts.push(`<button class="gal-play ch" data-gal-ch="${i}">🎬 <span>${escapeHtml(ch.chTag ? ch.chTag + ' · ' + ch.title : ch.title)}</span></button>`);
      if (secs.length) {
        parts.push('<div class="gal-secs">');
        secs.forEach((t, si) => {
          if (!t) return;
          parts.push(`<button class="gal-play sec" data-gal-ch="${i}" data-gal-sec="${si}">▶ <span>${escapeHtml(t)}</span></button>`);
        });
        parts.push('</div>');
      }
      parts.push('</div>');
    });
    igIndexList.innerHTML = parts.join('');
    openModal('igIndexModal');
  }
  if (igIndexList) {
    igIndexList.addEventListener('click', e => {
      const btn = e.target.closest('[data-gal-ch]');
      if (!btn) return;
      const chIdx = parseInt(btn.dataset.galCh, 10);
      const secIdx = btn.dataset.galSec !== undefined ? parseInt(btn.dataset.galSec, 10) : undefined;
      closeModal('igIndexModal');
      setTimeout(() => openInfographic(chIdx, secIdx), 100);
    });
  }
  const btnIgIndex = document.getElementById('btnIgIndex');
  if (btnIgIndex) btnIgIndex.addEventListener('click', openIgIndex);
  const btnIgIndexToc = document.getElementById('btnIgIndexToc');
  if (btnIgIndexToc) btnIgIndexToc.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 900px)').matches) els.toc.classList.add('collapsed');
    openIgIndex();
  });

  /* ---------- Boot ---------- */
  loadBook();
})();
