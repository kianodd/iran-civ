// ایران؛ نقشهٔ تمدن — vanilla JS + SVG
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const faNum = (n) => Number(n).toLocaleString('fa-IR');
  const byId = {};
  PROVINCES.forEach((p) => { byId[p.id] = p; p.density = p.pop / p.area; });

  const svg = $('#map');
  const NS = 'http://www.w3.org/2000/svg';
  let lens = 'pop';
  let selected = null;
  let showNames = true, showCities = true;

  // ---------- viewBox pan / zoom ----------
  const VB0 = { x: 0, y: 0, w: 860, h: 790 };
  let vb = { ...VB0 };
  function applyVB() { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }
  function zoomAt(f, cx, cy) {
    const nw = Math.max(120, Math.min(VB0.w, vb.w * f));
    const nh = nw * (VB0.h / VB0.w);
    const px = cx == null ? vb.x + vb.w / 2 : vb.x + (cx / svg.clientWidth) * vb.w;
    const py = cy == null ? vb.y + vb.h / 2 : vb.y + (cy / svg.clientHeight) * vb.h;
    const k = nw / vb.w;
    vb.x = px - (px - vb.x) * k;
    vb.y = py - (py - vb.y) * k;
    vb.w = nw; vb.h = nh;
    applyVB();
  }
  function resetView() { vb = { ...VB0 }; applyVB(); }

  let drag = null, moved = false;
  svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; moved = false; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    const sx = vb.w / svg.clientWidth, sy = vb.h / svg.clientHeight;
    vb.x = drag.vx - dx * sx; vb.y = drag.vy - dy * sy;
    applyVB();
  });
  svg.addEventListener('pointerup', () => { drag = null; });
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.15 : 0.87, e.offsetX, e.offsetY); }, { passive: false });
  $('#zoom-in').onclick = () => zoomAt(0.7);
  $('#zoom-out').onclick = () => zoomAt(1.4);
  $('#zoom-reset').onclick = resetView;

  // ---------- colour scales ----------
  function lerpColor(a, b, t) {
    const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const SEQ_LO = '#e8f5ee', SEQ_HI = '#0b6e4f';
  function lensValue(p) {
    if (lens === 'pop') return p.pop;
    if (lens === 'density') return p.density;
    return p[lens];
  }
  function lensColor(p) {
    if (lens === 'climate') return CLIMATE_COLORS[p.climate] || '#888';
    const vals = PROVINCES.map(lensValue);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const t = hi === lo ? 0 : (lensValue(p) - lo) / (hi - lo);
    return lerpColor(SEQ_LO, SEQ_HI, Math.pow(t, 0.6));
  }

  // ---------- render map ----------
  const gProv = document.createElementNS(NS, 'g');
  const gCity = document.createElementNS(NS, 'g');
  const gLabel = document.createElementNS(NS, 'g');
  svg.append(gProv, gCity, gLabel);

  function renderMap() {
    gProv.innerHTML = ''; gCity.innerHTML = ''; gLabel.innerHTML = '';
    PROVINCES.forEach((p) => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', PATHS[p.id] || '');
      path.setAttribute('class', 'province' + (selected === p.id ? ' selected' : ''));
      path.setAttribute('fill', lensColor(p));
      path.addEventListener('click', (e) => { if (!moved) selectProvince(p.id); e.stopPropagation(); });
      gProv.appendChild(path);
      if (showNames) {
        const c = CENTROIDS[p.id];
        if (c) {
          const t = document.createElementNS(NS, 'text');
          t.setAttribute('x', c[0]); t.setAttribute('y', c[1]);
          t.setAttribute('class', 'prov-label');
          t.textContent = p.fa;
          gLabel.appendChild(t);
        }
      }
    });
    if (showCities) {
      CITIES.forEach((c) => {
        const x = (c.lon - 44.0) * 43.6, y = (39.8 - c.lat) * 52.0;
        const r = c.pop > 1500000 ? 5 : c.pop > 600000 ? 4 : 3;
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', r);
        dot.setAttribute('class', 'city-dot');
        dot.addEventListener('click', (e) => { if (!moved) selectCity(c); e.stopPropagation(); });
        gCity.appendChild(dot);
        if (c.pop > 900000) {
          const t = document.createElementNS(NS, 'text');
          t.setAttribute('x', x); t.setAttribute('y', y - r - 3);
          t.setAttribute('class', 'city-label');
          t.textContent = c.fa;
          gCity.appendChild(t);
        }
      });
    }
    renderLegend();
  }

  function renderLegend() {
    const el = $('#legend');
    const L = LENSES.find((l) => l.id === lens);
    if (lens === 'climate') {
      const used = [...new Set(PROVINCES.map((p) => p.climate))];
      el.innerHTML = '<b>' + L.fa + '</b> — ' + L.desc + '<div class="swatches">' +
        used.map((c) => `<span class="sw" style="background:${CLIMATE_COLORS[c]}" title="${c}"></span>`).join('') + '</div>' +
        '<div style="margin-top:3px">' + used.join(' • ') + '</div>';
      return;
    }
    const vals = PROVINCES.map(lensValue);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const fmt = (v) => lens === 'pop' ? faNum(Math.round(v / 100000) / 10) + ' م' : lens === 'density' ? faNum(Math.round(v)) : faNum(Math.round(v));
    el.innerHTML = '<b>' + L.fa + '</b> — ' + L.desc +
      '<div class="swatches">' + [0, .25, .5, .75, 1].map((t) => `<span class="sw" style="background:${lerpColor(SEQ_LO, SEQ_HI, Math.pow(t, .6))}"></span>`).join('') + '</div>' +
      `<div style="display:flex;justify-content:space-between"><span>${fmt(lo)}</span><span>${fmt(hi)}</span></div>`;
  }

  // ---------- lenses ----------
  const lensRow = $('#lens-row');
  LENSES.forEach((L) => {
    const b = document.createElement('button');
    b.className = 'lens-btn' + (L.id === lens ? ' active' : '');
    b.textContent = L.fa;
    b.onclick = () => {
      lens = L.id;
      lensRow.querySelectorAll('.lens-btn').forEach((x) => x.classList.toggle('active', x === b));
      renderMap();
    };
    lensRow.appendChild(b);
  });

  $('#toggle-names').onchange = (e) => { showNames = e.target.checked; renderMap(); };
  $('#toggle-cities').onchange = (e) => { showCities = e.target.checked; renderMap(); };

  // ---------- bottom sheet ----------
  const sheet = $('#sheet'), backdrop = $('#sheet-backdrop');
  function openSheet(html) {
    $('#sheet-body').innerHTML = html;
    sheet.hidden = false; backdrop.hidden = false;
  }
  function closeSheet() {
    sheet.hidden = true; backdrop.hidden = true;
    selected = null; renderMap();
  }
  $('#sheet-close').onclick = closeSheet;
  backdrop.onclick = closeSheet;

  function meter(label, v) {
    return `<div class="meter-row"><label>${label}</label><div class="meter"><i style="width:${v}%"></i></div><b>${faNum(v)}</b></div>`;
  }

  function selectProvince(id) {
    const p = byId[id]; if (!p) return;
    selected = id; renderMap();
    openSheet(`
      <h2>${p.fa}</h2>
      <div class="sub">مرکز: ${p.capital} • اقلیم: ${p.climate}</div>
      <div class="stat-grid">
        <div class="stat"><b>${faNum(p.pop)}</b><span>جمعیت (سرشماری ۱۳۹۵)</span></div>
        <div class="stat"><b>${faNum(p.area)} کم²</b><span>مساحت</span></div>
        <div class="stat"><b>${faNum(Math.round(p.density))} نفر/کم²</b><span>تراکم جمعیت</span></div>
        <div class="stat"><b>رتبهٔ ${faNum(PROVINCES.slice().sort((a, b) => b.pop - a.pop).findIndex((x) => x.id === id) + 1)} از ۳۱</b><span>از نظر جمعیت</span></div>
      </div>
      <div class="district-card"><b>🏛️ محلهٔ تمدن: ${p.district}</b><p>${p.districtDesc}</p></div>
      <div class="chips">${p.cities.map((c) => `<span class="chip">${c}</span>`).join('')}</div>
      <p style="font-size:13.5px;line-height:1.9">تخصص: ${p.spec}</p>
      ${meter('اقتصاد', p.econ)}${meter('صنعت', p.ind)}${meter('کشاورزی', p.agri)}${meter('گردشگری', p.tour)}
      <p class="note">شاخص‌های بالا تقریبی‌اند (۰ تا ۱۰۰) و برای مقایسهٔ کیفی استان‌ها ساخته شده‌اند، نه آمار رسمی.</p>
    `);
  }

  function selectCity(c) {
    const p = byId[c.prov];
    openSheet(`
      <h2>${c.fa}</h2>
      <div class="sub">استان ${p ? p.fa : ''} • جمعیت سرشماری ۱۳۹۵</div>
      <div class="stat-grid">
        <div class="stat"><b>${faNum(c.pop)}</b><span>جمعیت شهر</span></div>
        <div class="stat"><b>${p ? p.fa : ''}</b><span>استان</span></div>
      </div>
      <p style="font-size:14px;line-height:1.9">${c.spec}</p>
      ${p ? `<button class="lens-btn" style="margin-top:8px" onclick="document.querySelector('[data-tab=tab-map]').click();window.__selectProv('${p.id}')">مشاهدهٔ استان ${p.fa} روی نقشه</button>` : ''}
    `);
  }
  window.__selectProv = selectProvince;

  // ---------- search ----------
  const search = $('#search'), results = $('#search-results');
  search.addEventListener('input', () => {
    const q = search.value.trim();
    if (!q) { results.hidden = true; results.innerHTML = ''; return; }
    const hits = [];
    PROVINCES.forEach((p) => { if (p.fa.includes(q) || p.en.toLowerCase().includes(q.toLowerCase())) hits.push({ t: p.fa, s: 'استان • مرکز ' + p.capital, fn: () => selectProvince(p.id) }); });
    CITIES.forEach((c) => { if (c.fa.includes(q)) hits.push({ t: c.fa, s: 'شهر • استان ' + (byId[c.prov] || {}).fa, fn: () => selectCity(c) }); });
    if (!hits.length) { results.innerHTML = '<button type="button"><span>چیزی پیدا نشد</span></button>'; results.hidden = false; return; }
    results.innerHTML = '';
    hits.slice(0, 8).forEach((h) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<b>${h.t}</b><span>${h.s}</span>`;
      b.onclick = () => { results.hidden = true; search.value = ''; switchTab('tab-map'); h.fn(); };
      results.appendChild(b);
    });
    results.hidden = false;
  });
  search.addEventListener('blur', () => setTimeout(() => { results.hidden = true; }, 200));

  // ---------- lists ----------
  let sortKey = 'pop';
  function renderProvinceList() {
    const list = $('#province-list');
    const arr = PROVINCES.slice();
    if (sortKey === 'pop') arr.sort((a, b) => b.pop - a.pop);
    if (sortKey === 'density') arr.sort((a, b) => b.density - a.density);
    if (sortKey === 'area') arr.sort((a, b) => b.area - a.area);
    if (sortKey === 'fa') arr.sort((a, b) => a.fa.localeCompare(b.fa, 'fa'));
    const max = Math.max(...PROVINCES.map((p) => sortKey === 'density' ? p.density : sortKey === 'area' ? p.area : p.pop));
    const val = (p) => sortKey === 'density' ? p.density : sortKey === 'area' ? p.area : p.pop;
    list.innerHTML = '';
    arr.forEach((p, i) => {
      const li = document.createElement('li');
      const v = val(p);
      li.innerHTML = `<span class="rank-num">${faNum(i + 1)}</span>
        <div class="rank-main"><b>${p.fa}</b><span>مرکز ${p.capital} • ${p.district}</span>
        <div class="rank-bar"><i style="width:${Math.max(3, (v / max) * 100)}%"></i></div></div>
        <span class="rank-val">${sortKey === 'density' ? faNum(Math.round(v)) + ' /کم²' : sortKey === 'area' ? faNum(v) + ' کم²' : faNum(v)}</span>`;
      li.onclick = () => { switchTab('tab-map'); selectProvince(p.id); };
      list.appendChild(li);
    });
  }
  document.querySelectorAll('.sort-btn').forEach((b) => {
    b.onclick = () => {
      sortKey = b.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach((x) => x.classList.toggle('active', x === b));
      renderProvinceList();
    };
  });

  function renderCityList() {
    const list = $('#city-list');
    const arr = CITIES.slice().sort((a, b) => b.pop - a.pop);
    const max = arr[0].pop;
    list.innerHTML = '';
    arr.forEach((c, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank-num">${faNum(i + 1)}</span>
        <div class="rank-main"><b>${c.fa}</b><span>استان ${(byId[c.prov] || {}).fa} • ${c.spec}</span>
        <div class="rank-bar"><i style="width:${Math.max(3, (c.pop / max) * 100)}%"></i></div></div>
        <span class="rank-val">${faNum(c.pop)}</span>`;
      li.onclick = () => selectCity(c);
      list.appendChild(li);
    });
  }

  // ---------- tabs ----------
  function switchTab(id) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === id));
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
    if (id === 'tab-provinces') renderProvinceList();
    if (id === 'tab-cities') renderCityList();
  }
  document.querySelectorAll('.tab-btn').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
  $('#btn-about').onclick = () => switchTab('tab-about');

  // ---------- theme ----------
  const root = document.documentElement;
  function setTheme(t) { root.setAttribute('data-theme', t); try { localStorage.setItem('iran-civ-theme', t); } catch (e) {} }
  let saved = null;
  try { saved = localStorage.getItem('iran-civ-theme'); } catch (e) {}
  setTheme(saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('#btn-theme').onclick = () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

  $('#about-version').textContent = (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0.0');

  renderMap();
  renderProvinceList();
  renderCityList();
  applyVB();
})();
