import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Until config.js has real Supabase details the app runs in demo mode (sample data, nothing saved).
const DEMO = SUPABASE_URL.includes('YOUR-PROJECT');
// <backend>
let sb;
if (DEMO) { const { createMock } = await import('./demo.js'); sb = createMock(); }
else { const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'); sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
// </backend>
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = { user: null, tab: 'sessions', ammoTab: 'centrefire', sessionFilter: 'all', rifles: [], rimfire: [], centrefire: [], sessions: [], recipes: [] };

const RIMFIRE_CALIBRES = ['.22 LR', '.22 WMR', '.17 HMR', '.17 WSM', '.22 Short', '.22 Long'];
const CENTREFIRE_CALIBRES = ['.204 Ruger', '.222 Rem', '.223 Rem', '5.56x45', '.22-250 Rem', '.243 Win', '6mm Creedmoor', '6mm BR', '6.5 Creedmoor', '6.5x55 Swede', '.260 Rem', '.270 Win', '7mm-08 Rem', '7mm Rem Mag', '.308 Win', '.30-06 Spfld', '.300 Win Mag', '.300 PRC', '.338 Lapua Mag', '.375 H&H'];

// ───────── field definitions ─────────
const F = (k, label, type = 'text', extra = {}) => ({ k, label, type, ...extra });
const RIFLE_FIELDS = [
  F('name', 'Rifle name', 'text', { required: true }), F('make', 'Make'), F('model', 'Model'), F('serial_number', 'Serial number'),
  F('rimfire_or_centrefire', 'Type', 'select', { options: ['', 'rimfire', 'centrefire'] }),
  F('calibre', 'Calibre', 'text', { list: 'all-calibres' }),
  F('action_type', 'Action', 'select', { options: ['', 'bolt', 'semi-auto', 'lever', 'single shot', 'pump', 'other'] }),
  F('barrel_length_mm', 'Barrel length (mm)', 'number'), F('twist_rate', 'Twist rate (e.g. 1:8)'), F('barrel_make', 'Barrel make'),
  F('round_count', 'Round count (barrel life)', 'number'),
  F('scope', 'Scope / optic'), F('scope_mount', 'Mount / rings'), F('sight_height_mm', 'Sight height (mm)', 'number'),
  F('zero_distance_m', 'Zero distance (m)', 'number'), F('trigger_weight_g', 'Trigger weight (g)', 'number'),
  F('stock', 'Stock / chassis'), F('weight_kg', 'Weight (kg)', 'number'), F('purchase_date', 'Purchase date', 'date'),
  F('licence_ref', 'Licence / registration ref'), F('notes', 'Notes', 'textarea', { wide: true })
];
const RIMFIRE_FIELDS = [
  F('calibre', 'Calibre', 'text', { required: true, list: 'rf-calibres' }), F('brand', 'Brand', 'text', { required: true }), F('product_name', 'Product'),
  F('bullet_weight_gr', 'Bullet weight (gr)', 'number'), F('bullet_type', 'Bullet type (LRN, HP, subsonic...)'),
  F('advertised_velocity_fps', 'Advertised velocity (fps)', 'number'), F('lot_number', 'Lot number'),
  F('quantity_on_hand', 'Rounds on hand', 'number'), F('rounds_per_box', 'Rounds per box', 'number'), F('cost_per_box', 'Cost per box', 'number'),
  F('notes', 'Notes', 'textarea', { wide: true })
];
const CENTREFIRE_FIELDS = [
  F('calibre', 'Calibre', 'text', { required: true, list: 'cf-calibres' }),
  F('ammo_type', 'Factory or reload', 'select', { options: ['factory', 'reload'] }),
  F('brand', 'Brand (or "Hand load")'), F('product_name', 'Product / load name'),
  F('bullet_make', 'Bullet make'), F('bullet_model', 'Bullet model'), F('bullet_weight_gr', 'Bullet weight (gr)', 'number'),
  F('bc_g1', 'BC (G1)', 'number'), F('bc_g7', 'BC (G7)', 'number'), F('advertised_velocity_fps', 'Advertised velocity (fps)', 'number'),
  F('lot_number', 'Lot number'), F('quantity_on_hand', 'Rounds on hand', 'number'), F('rounds_per_box', 'Rounds per box', 'number'), F('cost_per_box', 'Cost per box', 'number'),
  F('notes', 'Notes', 'textarea', { wide: true })
];
const RECIPE_FIELDS = [
  F('recipe_name', 'Recipe name', 'text', { required: true }), F('load_date', 'Load date', 'date'),
  F('brass_make', 'Brass make'), F('brass_lot', 'Brass lot'), F('brass_firings', 'Brass firings', 'number'), F('brass_trim_length_mm', 'Trim length (mm)', 'number'),
  F('case_neck_annealed', 'Neck annealed', 'checkbox'), F('neck_tension', 'Neck tension / bushing'),
  F('primer_make', 'Primer make'), F('primer_type', 'Primer type'),
  F('powder_make', 'Powder make'), F('powder_type', 'Powder type'), F('powder_charge_gr', 'Powder charge (gr)', 'number'), F('max_load_gr', 'Max load per manual (gr)', 'number'),
  F('bullet_make', 'Bullet make'), F('bullet_model', 'Bullet model'), F('bullet_weight_gr', 'Bullet weight (gr)', 'number'),
  F('coal_mm', 'COAL (mm)', 'number'), F('cbto_mm', 'CBTO (mm)', 'number'), F('jump_to_lands_mm', 'Jump to lands (mm)', 'number'), F('seating_depth_mm', 'Seating depth (mm)', 'number'),
  F('crimp', 'Crimp'), F('batch_size', 'Batch size', 'number'), F('source_reference', 'Load data source'),
  F('pressure_signs', 'Pressure signs observed'), F('notes', 'Notes', 'textarea', { wide: true })
];

// ───────── helpers ─────────
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2800); }
function openModal(html) { $('#modal-card').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; $('#modal-card').innerHTML = ''; }
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });

function fieldHtml(f, v) {
  const val = v?.[f.k];
  const cls = f.wide ? 'wide' : '';
  const req = f.required ? 'required' : '';
  if (f.type === 'textarea') return `<label class="${cls}">${esc(f.label)}<textarea name="${f.k}">${esc(val)}</textarea></label>`;
  if (f.type === 'select') return `<label class="${cls}">${esc(f.label)}<select name="${f.k}">${f.options.map(o => `<option value="${esc(o)}" ${val === o ? 'selected' : ''}>${esc(o || '—')}</option>`).join('')}</select></label>`;
  if (f.type === 'checkbox') return `<label class="${cls}"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}>${esc(f.label)}</label>`;
  const step = f.type === 'number' ? 'step="any"' : '';
  const list = f.list ? `list="${f.list}"` : '';
  return `<label class="${cls}">${esc(f.label)}<input type="${f.type}" name="${f.k}" value="${esc(val)}" ${step} ${list} ${req}></label>`;
}
function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.k]; if (!el) continue;
    if (f.type === 'checkbox') out[f.k] = el.checked;
    else if (f.type === 'number') out[f.k] = el.value === '' ? null : Number(el.value);
    else out[f.k] = el.value === '' ? null : el.value.trim();
  }
  return out;
}
const dl = (id, arr) => `<datalist id="${id}">${arr.map(c => `<option value="${esc(c)}">`).join('')}</datalist>`;
const datalists = () => dl('rf-calibres', RIMFIRE_CALIBRES) + dl('cf-calibres', CENTREFIRE_CALIBRES) + dl('all-calibres', [...RIMFIRE_CALIBRES, ...CENTREFIRE_CALIBRES]);

async function generic(table, fields, title, row, onSaved, extra = {}) {
  openModal(`<h2>${row ? 'Edit' : 'Add'} ${esc(title)}</h2>${datalists()}
    <form id="gform"><div class="grid" style="margin-top:12px">${fields.map(f => fieldHtml(f, row || extra.defaults)).join('')}</div>
    <div class="row spread" style="margin-top:16px"><div>${row ? '<button type="button" class="ghost danger" id="gdel">Delete</button>' : ''}</div>
    <div class="row"><button type="button" class="ghost" id="gcancel">Cancel</button><button class="primary">Save</button></div></div></form>`);
  $('#gcancel').onclick = closeModal;
  if (row) $('#gdel').onclick = async () => {
    if (!confirm('Delete this record?')) return;
    const { error } = await sb.from(table).delete().eq('id', row.id);
    if (error) return toast(error.message);
    closeModal(); await loadAll(); render();
  };
  $('#gform').onsubmit = async e => {
    e.preventDefault();
    const payload = { ...readForm(e.target, fields), ...(extra.fixed || {}) };
    const q = row ? sb.from(table).update(payload).eq('id', row.id) : sb.from(table).insert(payload);
    const { error } = await q;
    if (error) return toast(error.message);
    closeModal(); await loadAll(); render(); onSaved?.();
  };
}

// ───────── weather ─────────
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = d => d == null ? '' : COMPASS[Math.round(d / 22.5) % 16];
const WMO = c => c === 0 ? 'Clear' : c === 1 ? 'Mainly clear' : c === 2 ? 'Partly cloudy' : c === 3 ? 'Overcast' : [45, 48].includes(c) ? 'Fog' : (c >= 51 && c <= 57) ? 'Drizzle' : (c >= 61 && c <= 67) ? 'Rain' : (c >= 71 && c <= 77) ? 'Snow' : (c >= 80 && c <= 82) ? 'Showers' : c >= 95 ? 'Thunderstorm' : '';
async function fetchWeather(lat, lng, date, time) {
  const hourly = 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,cloud_cover,weather_code';
  const daysAgo = (Date.now() - new Date(date + 'T12:00:00').getTime()) / 86400000;
  const base = daysAgo > 85 ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
  const url = `${base}?latitude=${lat}&longitude=${lng}&start_date=${date}&end_date=${date}&hourly=${hourly}&wind_speed_unit=kmh&timezone=auto`;
  const r = await fetch(url); if (!r.ok) throw new Error('Weather service error');
  const j = await r.json(); const h = j.hourly; if (!h?.time?.length) throw new Error('No weather data for that date');
  let hour = time ? Number(time.split(':')[0]) : (date === new Date().toLocaleDateString('en-CA') ? new Date().getHours() : 9);
  hour = Math.min(Math.max(hour, 0), h.time.length - 1);
  const g = k => h[k]?.[hour] ?? null;
  const out = {
    weather_temp_c: g('temperature_2m'), weather_humidity_pct: g('relative_humidity_2m'), weather_pressure_hpa: g('surface_pressure'),
    weather_wind_speed_kmh: g('wind_speed_10m'), weather_wind_gust_kmh: g('wind_gusts_10m'), weather_wind_direction_deg: g('wind_direction_10m'),
    weather_precip_mm: g('precipitation'), weather_cloud_cover_pct: g('cloud_cover'), weather_source: 'auto'
  };
  out.weather_summary = [WMO(g('weather_code')), out.weather_temp_c != null ? Math.round(out.weather_temp_c) + '°C' : '', out.weather_wind_speed_kmh != null ? `wind ${Math.round(out.weather_wind_speed_kmh)} km/h ${compass(out.weather_wind_direction_deg)}` : ''].filter(Boolean).join(', ');
  return out;
}
async function geocode(name) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
  const j = await r.json(); const p = j.results?.[0]; if (!p) throw new Error('Location not found');
  return { lat: p.latitude, lng: p.longitude, label: [p.name, p.admin1].filter(Boolean).join(', ') };
}
const WEATHER_FIELDS = [
  F('weather_summary', 'Conditions', 'text', { wide: true }), F('weather_temp_c', 'Temp (°C)', 'number'), F('weather_humidity_pct', 'Humidity (%)', 'number'),
  F('weather_pressure_hpa', 'Pressure (hPa)', 'number'), F('weather_wind_speed_kmh', 'Wind (km/h)', 'number'), F('weather_wind_gust_kmh', 'Gust (km/h)', 'number'),
  F('weather_wind_direction_deg', 'Wind from (°)', 'number'), F('weather_precip_mm', 'Rain (mm)', 'number'), F('weather_cloud_cover_pct', 'Cloud (%)', 'number')
];

// ───────── session form ─────────
const TEST_PURPOSES = ['', 'zero check', 'load development', 'ladder test', 'OCW / node test', 'ammo comparison', 'velocity check', 'scope / DOPE check', 'other'];
const SESSION_COMMON = [
  F('session_date', 'Date', 'date', { required: true }), F('start_time', 'Time', 'time'), F('title', 'Title'), F('location_name', 'Location / range'),
  F('distance_m', 'Distance (m)', 'number'), F('rounds_fired', 'Rounds fired', 'number')
];
const SESSION_SCORE = [F('score', 'Score', 'number'), F('max_score', 'Max possible', 'number'), F('x_count', 'X / V count', 'number')];
const SESSION_COMP = [F('competition_name', 'Competition name'), F('discipline', 'Discipline'), F('grade_or_class', 'Grade / class'), F('placing', 'Placing'), F('field_size', 'Field size', 'number')];
const SESSION_TEST = [
  F('test_purpose', 'Test purpose', 'select', { options: TEST_PURPOSES }), F('shots_in_group', 'Shots in group', 'number'),
  F('group_size_mm', 'Group size (mm)', 'number'), F('group_size_moa', 'Group size (MOA)', 'number'),
  F('avg_velocity_fps', 'Avg velocity (fps)', 'number'), F('extreme_spread_fps', 'ES (fps)', 'number'), F('standard_deviation_fps', 'SD (fps)', 'number'),
  F('chronograph', 'Chronograph'), F('elevation_clicks', 'Elevation (clicks)', 'number'), F('windage_clicks', 'Windage (clicks)', 'number')
];

// ───────── score card helpers ─────────
// Shot entries: a number (0-max), X or V = max and counts as an X, M or - = miss.
function parseShot(s, max) {
  s = String(s ?? '').trim().toUpperCase();
  if (!s) return null;
  if (s === 'X' || s === 'V') return { v: max, x: true };
  if (s === 'M' || s === '-') return { v: 0, x: false };
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return { v: Math.min(Math.max(n, 0), max), x: false };
}
function cardTotals(ends, max) {
  let total = 0, xs = 0, possible = 0, used = 0, cum = 0;
  const rows = ends.map(e => {
    const parsed = e.shots.map(s => parseShot(s, max));
    const entered = parsed.filter(Boolean);
    const t = entered.reduce((n, p) => n + p.v, 0);
    const x = entered.filter(p => p.x).length;
    if (entered.length) { total += t; xs += x; possible += e.shots.length * max; used++; cum += t; }
    return { t, x, entered: entered.length, cum: entered.length ? cum : null };
  });
  return { rows, total, xs, possible, used };
}

function ammoOptions(selected, rifleId) {
  const rifle = state.rifles.find(r => r.id === rifleId);
  const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = a => !rifle?.calibre || norm(a.calibre) === norm(rifle.calibre);
  let rf = state.rimfire.filter(match), cf = state.centrefire.filter(match);
  if (!rf.length && !cf.length) { rf = state.rimfire; cf = state.centrefire; }
  const label = a => [a.brand, a.product_name || a.bullet_model, a.bullet_weight_gr ? a.bullet_weight_gr + 'gr' : ''].filter(Boolean).join(' ');
  const byCal = {}; cf.forEach(a => (byCal[a.calibre] ||= []).push(a));
  let h = '<option value="">— none —</option>';
  if (rf.length) h += `<optgroup label="Rimfire">${rf.map(a => `<option value="rf:${a.id}" ${selected === 'rf:' + a.id ? 'selected' : ''}>${esc(a.calibre + ' · ' + label(a))}</option>`).join('')}</optgroup>`;
  for (const cal of Object.keys(byCal).sort()) h += `<optgroup label="Centrefire ${esc(cal)}">${byCal[cal].map(a => `<option value="cf:${a.id}" ${selected === 'cf:' + a.id ? 'selected' : ''}>${esc(label(a) + (a.ammo_type === 'reload' ? ' (reload)' : ''))}</option>`).join('')}</optgroup>`;
  return h;
}

async function sessionForm(row, preType) {
  const s = row || { session_type: preType || 'practice', session_date: new Date().toLocaleDateString('en-CA'), start_time: new Date().toTimeString().slice(0, 5), weather_source: null };
  const last = JSON.parse(localStorage.getItem('lastLoc') || 'null');
  if (!row && last) { s.location_name = last.label; s.latitude = last.lat; s.longitude = last.lng; }
  let strings = [], ends = [];
  if (row) {
    const { data } = await sb.from('session_strings').select('*').eq('session_id', row.id).order('created_at'); strings = data || [];
    const ce = await sb.from('scorecard_ends').select('*').eq('session_id', row.id).order('end_no');
    ends = (ce.data || []).map(e => ({ stage_label: e.stage_label || '', distance_m: e.distance_m ?? '', shots: (e.shots || []).map(String) }));
  }
  if (s.scorecard_max_shot == null) s.scorecard_max_shot = 10;
  const ammoSel = s.rimfire_ammo_id ? 'rf:' + s.rimfire_ammo_id : s.centrefire_ammo_id ? 'cf:' + s.centrefire_ammo_id : '';
  const typeBlock = (types, title, fields) => `<div data-types="${types}"><h3>${title}</h3><div class="grid">${fields.map(f => fieldHtml(f, s)).join('')}</div></div>`;

  openModal(`<h2>${row ? 'Edit' : 'New'} session</h2>
  <form id="sform">
    <div class="chips" id="typechips">${['testing', 'practice', 'competition'].map(t => `<button type="button" class="chip ${s.session_type === t ? 'active' : ''}" data-type="${t}">${t}</button>`).join('')}</div>
    <input type="hidden" name="session_type" value="${s.session_type}">
    <div class="grid">${SESSION_COMMON.map(f => fieldHtml(f, s)).join('')}
      <label>Rifle<select name="rifle_id"><option value="">— none —</option>${state.rifles.map(r => `<option value="${r.id}" ${s.rifle_id === r.id ? 'selected' : ''}>${esc(r.name)}${r.calibre ? ' (' + esc(r.calibre) + ')' : ''}</option>`).join('')}</select></label>
      <label>Ammo<select name="ammo">${ammoOptions(ammoSel, s.rifle_id)}</select></label>
    </div>
    ${typeBlock('competition', 'Competition', SESSION_COMP)}
    ${typeBlock('practice competition', 'Score', SESSION_SCORE)}
    <div data-types="practice competition">
      <h3>Score card</h3>
      <div class="row">
        <label style="width:110px">Max per shot<input name="scorecard_max_shot" type="number" step="any" value="${esc(s.scorecard_max_shot)}"></label>
        <label style="width:110px">Shots per end<input id="sc-per" type="number" min="1" max="20" value="5"></label>
        <button type="button" class="ghost" id="sc-add" style="align-self:flex-end">+ Add end / stage</button>
        <button type="button" class="ghost" id="sc-quick" style="align-self:flex-end">Quick: 6 ends</button>
      </div>
      <p class="meta" style="margin:6px 0">Type each shot's value. X (or V) counts as the max and as an X, M or - is a miss. Totals fill the Score box above.</p>
      <div id="scorecard"></div>
      <div id="sc-total" class="stat" style="font-weight:600;margin-top:6px"></div>
    </div>
    ${typeBlock('testing', 'Test results', SESSION_TEST)}

    <h3>Weather</h3>
    <div class="weather">
      <div class="row">
        <button type="button" class="ghost" id="wgps">Use my location</button>
        <button type="button" class="ghost" id="wfind">Find location from name</button>
        <button type="button" class="ghost" id="wfetch">Refresh weather</button>
        <span class="meta" id="wstatus"></span>
      </div>
      <input type="hidden" name="latitude" value="${s.latitude ?? ''}"><input type="hidden" name="longitude" value="${s.longitude ?? ''}">
      <input type="hidden" name="weather_source" value="${s.weather_source ?? ''}">
      <div class="grid" style="margin-top:10px">${WEATHER_FIELDS.map(f => fieldHtml(f, s)).join('')}</div>
    </div>

    <h3>Strings / groups (optional)</h3>
    <div id="strings"></div>
    <button type="button" class="ghost" id="addstring">+ Add string</button>

    <h3>Notes</h3>
    <label><textarea name="notes">${esc(s.notes)}</textarea></label>
    ${row ? '' : `<label style="margin-top:10px"><input type="checkbox" id="adjust" checked>Add rounds to rifle count and deduct from ammo on hand</label>`}
    <div class="row spread" style="margin-top:16px"><div>${row ? '<button type="button" class="ghost danger" id="sdel">Delete</button>' : ''}</div>
    <div class="row"><button type="button" class="ghost" id="scancel">Cancel</button><button class="primary">Save session</button></div></div>
  </form>`);

  const form = $('#sform');
  const setType = t => {
    form.elements.session_type.value = t;
    $$('#typechips .chip').forEach(c => c.classList.toggle('active', c.dataset.type === t));
    $$('[data-types]', form).forEach(d => d.classList.toggle('hide', !d.dataset.types.split(' ').includes(t)));
  };
  setType(s.session_type);
  $('#typechips').onclick = e => { const b = e.target.closest('[data-type]'); if (b) setType(b.dataset.type); };
  form.elements.rifle_id.onchange = () => { form.elements.ammo.innerHTML = ammoOptions('', form.elements.rifle_id.value); };

  const addString = (d = {}) => {
    const div = document.createElement('div'); div.className = 'strings-row';
    div.innerHTML = `<input placeholder="Label" data-k="string_label" value="${esc(d.string_label)}"><input placeholder="Shots" type="number" data-k="shots" value="${esc(d.shots)}">
      <input placeholder="Score" type="number" step="any" data-k="score" value="${esc(d.score)}"><input placeholder="Group mm" type="number" step="any" data-k="group_size_mm" value="${esc(d.group_size_mm)}">
      <input placeholder="Vel fps" type="number" step="any" data-k="velocity_fps" value="${esc(d.velocity_fps)}"><input placeholder="Notes" data-k="notes" value="${esc(d.notes)}"><button type="button" class="ghost">✕</button>`;
    div.querySelector('button').onclick = () => div.remove();
    $('#strings').appendChild(div);
  };
  strings.forEach(addString); $('#addstring').onclick = () => addString();

  // ── score card editor ──
  const maxShot = () => Number(form.elements.scorecard_max_shot.value) || 10;
  const recalc = () => {
    const c = cardTotals(ends, maxShot());
    $$('#scorecard .sc-row').forEach((rowEl, i) => {
      $('.sc-tot', rowEl).textContent = c.rows[i].entered ? num(c.rows[i].t, 1) : '';
      $('.sc-cum', rowEl).textContent = c.rows[i].cum != null ? num(c.rows[i].cum, 1) : '';
    });
    if (c.used) {
      form.elements.score.value = num(c.total, 1); form.elements.max_score.value = num(c.possible); form.elements.x_count.value = c.xs || '';
      $('#sc-total').textContent = `Total ${num(c.total, 1)} / ${num(c.possible)}${c.xs ? ' · ' + c.xs + 'X' : ''} · ${c.used} end${c.used === 1 ? '' : 's'}`;
    } else $('#sc-total').textContent = '';
  };
  const renderCard = () => {
    $('#scorecard').innerHTML = ends.map((e, i) => `<div class="sc-row" data-i="${i}">
      <span class="meta" style="width:1.6em">${i + 1}</span>
      <input class="sc-label" placeholder="Stage" value="${esc(e.stage_label)}">
      <input class="sc-dist" type="number" step="any" placeholder="m" value="${esc(e.distance_m)}">
      ${e.shots.map((v, j) => `<input class="sc-shot" data-j="${j}" maxlength="4" inputmode="text" value="${esc(v)}">`).join('')}
      <button type="button" class="ghost sc-plus" title="Add shot">+</button><button type="button" class="ghost sc-minus" title="Remove last shot">−</button>
      <span class="sc-tot stat"></span><span class="sc-cum meta stat"></span>
      <button type="button" class="ghost sc-del" title="Remove end">✕</button></div>`).join('');
    recalc();
  };
  const addEnd = n => { ends.push({ stage_label: '', distance_m: form.elements.distance_m.value || '', shots: Array(n).fill('') }); };
  $('#sc-add').onclick = () => { addEnd(Math.max(1, Math.min(20, Number($('#sc-per').value) || 5))); renderCard(); $$('#scorecard .sc-row:last-child .sc-shot')[0]?.focus(); };
  $('#sc-quick').onclick = () => { const n = Math.max(1, Math.min(20, Number($('#sc-per').value) || 5)); for (let i = 0; i < 6; i++) addEnd(n); renderCard(); };
  $('#scorecard').addEventListener('input', e => {
    const rowEl = e.target.closest('.sc-row'); if (!rowEl) return; const end = ends[Number(rowEl.dataset.i)];
    if (e.target.classList.contains('sc-shot')) end.shots[Number(e.target.dataset.j)] = e.target.value;
    else if (e.target.classList.contains('sc-label')) end.stage_label = e.target.value;
    else if (e.target.classList.contains('sc-dist')) end.distance_m = e.target.value;
    recalc();
  });
  $('#scorecard').addEventListener('click', e => {
    const rowEl = e.target.closest('.sc-row'); if (!rowEl) return; const i = Number(rowEl.dataset.i);
    if (e.target.closest('.sc-plus')) ends[i].shots.push('');
    else if (e.target.closest('.sc-minus')) { if (ends[i].shots.length > 1) ends[i].shots.pop(); }
    else if (e.target.closest('.sc-del')) ends.splice(i, 1);
    else return;
    renderCard();
  });
  form.elements.scorecard_max_shot.addEventListener('input', recalc);
  renderCard();

  const status = m => $('#wstatus').textContent = m;
  const setWeather = w => { for (const [k, v] of Object.entries(w)) { const el = form.elements[k]; if (el) el.value = v ?? ''; } };
  const doWeather = async (silent) => {
    const lat = form.elements.latitude.value, lng = form.elements.longitude.value;
    if (!lat || !lng) { if (!silent) status('Set a location first.'); return; }
    status('Fetching weather…');
    try { setWeather(await fetchWeather(lat, lng, form.elements.session_date.value, form.elements.start_time.value)); status('Weather filled in. You can edit any value.'); }
    catch (e) {
      if (DEMO) { setWeather({ weather_summary: 'Partly cloudy, 24°C, wind 14 km/h SW', weather_temp_c: 24, weather_humidity_pct: 48, weather_pressure_hpa: 1014, weather_wind_speed_kmh: 14, weather_wind_gust_kmh: 22, weather_wind_direction_deg: 225, weather_precip_mm: 0, weather_cloud_cover_pct: 40, weather_source: 'auto' }); status('Demo sample weather (the live version fetches real conditions).'); }
      else status(e.message + ' — enter weather manually.');
    }
  };
  const setLoc = (lat, lng, label) => {
    form.elements.latitude.value = lat; form.elements.longitude.value = lng;
    if (label) form.elements.location_name.value = label;
    localStorage.setItem('lastLoc', JSON.stringify({ lat, lng, label: form.elements.location_name.value }));
  };
  $('#wgps').onclick = () => navigator.geolocation ? (status('Getting location…'), navigator.geolocation.getCurrentPosition(
    p => { setLoc(p.coords.latitude.toFixed(4), p.coords.longitude.toFixed(4)); doWeather(); }, () => status('Location blocked. Use "Find location from name".'))) : status('Location not supported.');
  $('#wfind').onclick = async () => {
    const name = form.elements.location_name.value; if (!name) return status('Type a town or range name in Location first.');
    try { const g = await geocode(name); setLoc(g.lat, g.lng, null); status('Found ' + g.label); doWeather(); } catch (e) { status(e.message); }
  };
  $('#wfetch').onclick = () => doWeather();
  ['session_date', 'start_time'].forEach(n => form.elements[n].addEventListener('change', () => { if (form.elements.weather_source.value !== 'manual') doWeather(true); }));
  WEATHER_FIELDS.forEach(f => form.elements[f.k].addEventListener('input', () => form.elements.weather_source.value = 'manual'));
  if (!row && s.latitude) doWeather(true);   // new session with remembered location: auto-fill now

  $('#scancel').onclick = closeModal;
  if (row) $('#sdel').onclick = async () => {
    if (!confirm('Delete this session?')) return;
    const { error } = await sb.from('sessions').delete().eq('id', row.id); if (error) return toast(error.message);
    closeModal(); await loadAll(); render();
  };

  form.onsubmit = async e => {
    e.preventDefault();
    const all = [...SESSION_COMMON, ...SESSION_SCORE, ...SESSION_COMP, ...SESSION_TEST, ...WEATHER_FIELDS, F('latitude', '', 'number'), F('longitude', '', 'number'), F('weather_source', ''), F('notes', '', 'textarea'), F('session_type', ''), F('rifle_id', ''), F('scorecard_max_shot', '', 'number')];
    const payload = readForm(form, all);
    const ammo = form.elements.ammo.value;
    payload.rimfire_ammo_id = ammo.startsWith('rf:') ? ammo.slice(3) : null;
    payload.centrefire_ammo_id = ammo.startsWith('cf:') ? ammo.slice(3) : null;
    payload.rounds_fired = payload.rounds_fired ?? 0;
    const res = row ? await sb.from('sessions').update(payload).eq('id', row.id).select().single() : await sb.from('sessions').insert(payload).select().single();
    if (res.error) return toast(res.error.message);
    const sid = res.data.id;
    await sb.from('session_strings').delete().eq('session_id', sid);
    const rows = $$('.strings-row', form).map(d => {
      const o = { session_id: sid };
      $$('[data-k]', d).forEach(i => o[i.dataset.k] = i.type === 'number' ? (i.value === '' ? null : Number(i.value)) : (i.value || null));
      return o;
    }).filter(o => o.string_label || o.shots || o.score || o.group_size_mm || o.velocity_fps || o.notes);
    if (rows.length) await sb.from('session_strings').insert(rows);
    await sb.from('scorecard_ends').delete().eq('session_id', sid);
    const endRows = ends.map((e, i) => ({ session_id: sid, end_no: i + 1, stage_label: e.stage_label || null, distance_m: e.distance_m === '' ? null : Number(e.distance_m), shots: e.shots.map(v => String(v).trim()) }))
      .filter(r => r.stage_label || r.shots.some(Boolean));
    if (endRows.length) await sb.from('scorecard_ends').insert(endRows);
    if (!row && $('#adjust')?.checked && payload.rounds_fired > 0) {
      if (payload.rifle_id) { const r = state.rifles.find(x => x.id === payload.rifle_id); await sb.from('rifles').update({ round_count: (r?.round_count || 0) + payload.rounds_fired }).eq('id', payload.rifle_id); }
      const tbl = payload.rimfire_ammo_id ? ['rimfire_ammo', payload.rimfire_ammo_id, state.rimfire] : payload.centrefire_ammo_id ? ['centrefire_ammo', payload.centrefire_ammo_id, state.centrefire] : null;
      if (tbl) { const a = tbl[2].find(x => x.id === tbl[1]); await sb.from(tbl[0]).update({ quantity_on_hand: Math.max(0, (a?.quantity_on_hand || 0) - payload.rounds_fired) }).eq('id', tbl[1]); }
    }
    closeModal(); await loadAll(); render(); toast('Session saved');
  };
}

// ───────── views ─────────
const num = (v, d = 0) => v == null ? '' : Number(v).toFixed(d).replace(/\.0+$/, '');
function sessionCard(s) {
  const rifle = state.rifles.find(r => r.id === s.rifle_id);
  const ammo = state.rimfire.find(a => a.id === s.rimfire_ammo_id) || state.centrefire.find(a => a.id === s.centrefire_ammo_id);
  const bits = [];
  if (s.score != null) bits.push(`Score <b class="stat">${num(s.score, 1)}${s.max_score ? '/' + num(s.max_score) : ''}${s.x_count ? ' ' + s.x_count + 'X' : ''}</b>`);
  if (s.session_type === 'competition' && s.placing) bits.push(`Placing ${esc(s.placing)}${s.field_size ? ' of ' + s.field_size : ''}`);
  if (s.group_size_mm != null) bits.push(`Group <b class="stat">${num(s.group_size_mm, 1)} mm</b>`);
  if (s.avg_velocity_fps != null) bits.push(`${num(s.avg_velocity_fps)} fps${s.standard_deviation_fps != null ? ' SD ' + num(s.standard_deviation_fps, 1) : ''}`);
  const title = s.title || s.competition_name || s.test_purpose || '';
  return `<div class="card" data-sid="${s.id}" style="cursor:pointer">
    <div class="row spread"><div><span class="tag ${s.session_type}">${s.session_type}</span><span class="title">${esc(title)}</span></div><span class="meta">${esc(s.session_date)}${s.start_time ? ' ' + esc(s.start_time.slice(0, 5)) : ''}</span></div>
    <div class="meta">${[rifle?.name, ammo ? ammo.brand + ' ' + (ammo.calibre) : '', s.distance_m ? num(s.distance_m) + ' m' : '', s.rounds_fired ? s.rounds_fired + ' rds' : '', s.location_name].filter(Boolean).map(esc).join(' · ')}</div>
    ${bits.length ? `<div>${bits.join(' · ')}</div>` : ''}
    ${s.weather_summary ? `<div class="meta">🌤 ${esc(s.weather_summary)}${s.weather_humidity_pct != null ? ', ' + num(s.weather_humidity_pct) + '% RH' : ''}${s.weather_pressure_hpa != null ? ', ' + num(s.weather_pressure_hpa) + ' hPa' : ''}</div>` : ''}
    ${s.notes ? `<div class="meta">${esc(s.notes.slice(0, 140))}${s.notes.length > 140 ? '…' : ''}</div>` : ''}</div>`;
}
function viewSessions() {
  const f = state.sessionFilter;
  const list = state.sessions.filter(s => f === 'all' || s.session_type === f);
  return `<div class="row spread"><h2>Sessions</h2><div class="row">
    <button class="primary" data-new="testing">+ Testing</button><button class="primary" data-new="practice">+ Practice</button><button class="primary" data-new="competition">+ Competition</button></div></div>
    <div class="chips">${['all', 'testing', 'practice', 'competition'].map(t => `<button class="chip ${f === t ? 'active' : ''}" data-filter="${t}">${t}</button>`).join('')}</div>
    ${list.map(sessionCard).join('') || '<p class="meta">No sessions yet.</p>'}`;
}
function viewRifles() {
  return `<div class="row spread"><h2>Rifles</h2><button class="primary" data-add="rifles">+ Add rifle</button></div>
  ${state.rifles.map(r => `<div class="card" data-edit="rifles:${r.id}" style="cursor:pointer"><div class="row spread"><span class="title">${esc(r.name)}</span><span class="meta">${esc(r.calibre || '')}</span></div>
    <div class="meta">${[r.make, r.model, r.rimfire_or_centrefire, r.barrel_length_mm ? num(r.barrel_length_mm) + ' mm barrel' : '', r.twist_rate ? 'twist ' + r.twist_rate : '', r.scope, r.zero_distance_m ? 'zero ' + num(r.zero_distance_m) + ' m' : '', (r.round_count || 0) + ' rounds'].filter(Boolean).map(esc).join(' · ')}</div></div>`).join('') || '<p class="meta">No rifles yet.</p>'}`;
}
function ammoRow(a, kind) {
  const b = [a.bullet_weight_gr ? num(a.bullet_weight_gr) + ' gr' : '', a.bullet_type || a.bullet_make && (a.bullet_make + ' ' + (a.bullet_model || '')), a.advertised_velocity_fps ? num(a.advertised_velocity_fps) + ' fps' : '', a.lot_number ? 'lot ' + a.lot_number : ''].filter(Boolean).map(esc).join(' · ');
  const rec = kind === 'centrefire' ? state.recipes.filter(r => r.ammo_id === a.id).length : 0;
  return `<div class="card"><div class="row spread"><div data-edit="${kind === 'rimfire' ? 'rimfire_ammo' : 'centrefire_ammo'}:${a.id}" style="cursor:pointer;flex:1">
    <span class="title">${esc([a.brand, a.product_name].filter(Boolean).join(' '))}</span>${a.ammo_type === 'reload' ? '<span class="tag">reload</span>' : ''}<div class="meta">${b}</div></div>
    <div class="row"><span class="stat"><b>${a.quantity_on_hand ?? 0}</b> <span class="meta">rds</span></span>
    ${kind === 'centrefire' && a.ammo_type === 'reload' ? `<button class="ghost" data-recipes="${a.id}">Reload data (${rec})</button>` : ''}</div></div></div>`;
}
function viewAmmo() {
  const t = state.ammoTab;
  const items = t === 'rimfire' ? state.rimfire : state.centrefire;
  const by = {}; items.forEach(a => (by[a.calibre] ||= []).push(a));
  const cals = Object.keys(by).sort();
  return `<div class="row spread"><h2>Ammo</h2><button class="primary" data-add="${t === 'rimfire' ? 'rimfire_ammo' : 'centrefire_ammo'}">+ Add ${t} ammo</button></div>
    <div class="chips">${['centrefire', 'rimfire'].map(x => `<button class="chip ${t === x ? 'active' : ''}" data-ammotab="${x}">${x}</button>`).join('')}</div>
    ${cals.map(c => `<div class="group-head"><span>${esc(c)}</span><span class="meta stat">${by[c].reduce((n, a) => n + (a.quantity_on_hand || 0), 0)} rds total</span></div>${by[c].map(a => ammoRow(a, t)).join('')}`).join('') || '<p class="meta">No ammo yet.</p>'}`;
}

async function openRecipes(ammoId) {
  const a = state.centrefire.find(x => x.id === ammoId);
  const list = state.recipes.filter(r => r.ammo_id === ammoId);
  openModal(`<div class="row spread"><h2>Reload data: ${esc(a.calibre)} ${esc(a.product_name || a.brand || '')}</h2><button class="ghost" id="rclose">Close</button></div>
    <div style="margin:12px 0"><button class="primary" id="radd">+ Add recipe</button></div>
    ${list.map(r => `<div class="card" data-redit="${r.id}" style="cursor:pointer"><div class="row spread"><span class="title">${esc(r.recipe_name)}</span><span class="meta">${esc(r.load_date || '')}</span></div>
      <div class="meta">${[r.powder_type && (r.powder_make ? r.powder_make + ' ' : '') + r.powder_type, r.powder_charge_gr ? num(r.powder_charge_gr, 2) + ' gr' : '', r.bullet_model, r.coal_mm ? 'COAL ' + num(r.coal_mm, 2) + ' mm' : '', r.primer_type, r.brass_make && r.brass_make + (r.brass_firings ? ' x' + r.brass_firings : '')].filter(Boolean).map(esc).join(' · ')}</div></div>`).join('') || '<p class="meta">No recipes yet.</p>'}`);
  $('#rclose').onclick = closeModal;
  const defaults = { bullet_make: a.bullet_make, bullet_model: a.bullet_model, bullet_weight_gr: a.bullet_weight_gr };
  $('#radd').onclick = () => generic('reload_recipes', RECIPE_FIELDS, 'reload recipe', null, () => openRecipes(ammoId), { fixed: { ammo_id: ammoId }, defaults });
  $$('[data-redit]').forEach(el => el.onclick = () => generic('reload_recipes', RECIPE_FIELDS, 'reload recipe', state.recipes.find(r => r.id === el.dataset.redit), () => openRecipes(ammoId), { fixed: { ammo_id: ammoId } }));
}

const TABLES = { rifles: [RIFLE_FIELDS, 'rifle', 'rifles'], rimfire_ammo: [RIMFIRE_FIELDS, 'rimfire ammo', 'rimfire'], centrefire_ammo: [CENTREFIRE_FIELDS, 'centrefire ammo', 'centrefire'] };

function render() {
  $('#topbar').hidden = false;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
  const banner = DEMO ? '<div class="card meta">Demo mode: sample data, nothing is saved. Add your Supabase details to config.js to go live.</div>' : '';
  $('#app').innerHTML = banner + (state.tab === 'sessions' ? viewSessions() : state.tab === 'rifles' ? viewRifles() : viewAmmo());
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab],[data-new],[data-filter],[data-sid],[data-add],[data-edit],[data-ammotab],[data-recipes]');
  if (!t || !state.user) return;
  const d = t.dataset;
  if (d.tab) { state.tab = d.tab; render(); }
  else if (d.new) sessionForm(null, d.new);
  else if (d.filter) { state.sessionFilter = d.filter; render(); }
  else if (d.sid) sessionForm(state.sessions.find(s => s.id === d.sid));
  else if (d.ammotab) { state.ammoTab = d.ammotab; render(); }
  else if (d.recipes) openRecipes(d.recipes);
  else if (d.add) { const [fields, title] = TABLES[d.add]; generic(d.add, fields, title, null); }
  else if (d.edit) { const [tbl, id] = d.edit.split(':'); const [fields, title] = TABLES[tbl]; const src = tbl === 'rifles' ? state.rifles : tbl === 'rimfire_ammo' ? state.rimfire : state.centrefire; generic(tbl, fields, title, src.find(x => x.id === id)); }
});

// ───────── data + auth ─────────
async function loadAll() {
  const [r, rf, cf, s, rc] = await Promise.all([
    sb.from('rifles').select('*').order('name'), sb.from('rimfire_ammo').select('*').order('brand'), sb.from('centrefire_ammo').select('*').order('brand'),
    sb.from('sessions').select('*').order('session_date', { ascending: false }).order('created_at', { ascending: false }), sb.from('reload_recipes').select('*').order('load_date', { ascending: false })]);
  state.rifles = r.data || []; state.rimfire = rf.data || []; state.centrefire = cf.data || []; state.sessions = s.data || []; state.recipes = rc.data || [];
}
function authView(msg = '') {
  $('#topbar').hidden = true;
  $('#app').innerHTML = `<div class="card auth"><h2>Shooting Manager</h2><p class="meta">Sign in or create an account.</p>
    <form id="auth"><label>Email<input name="email" type="email" required autocomplete="email"></label>
    <label style="margin-top:8px">Password<input name="password" type="password" required minlength="6" autocomplete="current-password"></label>
    <div class="row" style="margin-top:14px"><button class="primary" data-mode="in">Sign in</button><button type="button" class="ghost" id="signup">Create account</button></div>
    <div class="err" id="autherr">${esc(msg)}</div></form></div>`;
  const form = $('#auth');
  form.onsubmit = async e => { e.preventDefault(); const { error } = await sb.auth.signInWithPassword({ email: form.email.value, password: form.password.value }); if (error) $('#autherr').textContent = error.message; };
  $('#signup').onclick = async () => {
    if (!form.reportValidity()) return;
    const { data, error } = await sb.auth.signUp({ email: form.email.value, password: form.password.value });
    $('#autherr').textContent = error ? error.message : (data.session ? '' : 'Check your email to confirm your account, then sign in.');
  };
}
$('#signout').onclick = () => sb.auth.signOut();
async function boot(session) {
  state.user = session?.user || null;
  if (!state.user) return authView();
  await loadAll(); render();
}
sb.auth.onAuthStateChange((_e, session) => {
  // Ignore token refreshes for the same user so open forms aren't disturbed.
  if (session?.user && state.user?.id === session.user.id) return;
  setTimeout(() => boot(session), 0);
});
