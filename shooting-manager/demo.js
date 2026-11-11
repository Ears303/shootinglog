// Demo backend: mimics the small part of the Supabase client the app uses, in memory.
// Used automatically while config.js still has the placeholder URL. Nothing is saved.
export function createMock() {
  const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2));
  const user = { id: 'demo-user', email: 'demo@example.com' };
  const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); };
  const stamp = n => new Date(Date.now() - n * 86400000).toISOString();

  const rifle1 = uid(), rifle2 = uid(), rf1 = uid(), cf1 = uid(), cf2 = uid();
  const s1 = uid(), s2 = uid(), s3 = uid();
  const base = { user_id: user.id };
  const db = {
    rifles: [
      { ...base, id: rifle1, name: 'Ruger 10/22 Target', make: 'Ruger', model: '10/22', rimfire_or_centrefire: 'rimfire', calibre: '.22 LR', action_type: 'semi-auto', barrel_length_mm: 508, twist_rate: '1:16', scope: 'Vortex 3-9x40', zero_distance_m: 50, round_count: 4210, created_at: stamp(90) },
      { ...base, id: rifle2, name: 'Tikka T3x Varmint', make: 'Tikka', model: 'T3x', rimfire_or_centrefire: 'centrefire', calibre: '6.5 Creedmoor', action_type: 'bolt', barrel_length_mm: 600, twist_rate: '1:8', scope: 'Leupold Mark 5HD', sight_height_mm: 48, zero_distance_m: 100, round_count: 812, created_at: stamp(80) }
    ],
    rimfire_ammo: [
      { ...base, id: rf1, calibre: '.22 LR', brand: 'Eley', product_name: 'Tenex', bullet_weight_gr: 40, bullet_type: 'LRN', advertised_velocity_fps: 1085, lot_number: 'T4412', quantity_on_hand: 850, rounds_per_box: 50, created_at: stamp(30) }
    ],
    centrefire_ammo: [
      { ...base, id: cf1, calibre: '6.5 Creedmoor', ammo_type: 'factory', brand: 'Hornady', product_name: 'Match', bullet_make: 'Hornady', bullet_model: 'ELD-M', bullet_weight_gr: 140, advertised_velocity_fps: 2710, lot_number: '3KX92', quantity_on_hand: 140, rounds_per_box: 20, created_at: stamp(40) },
      { ...base, id: cf2, calibre: '6.5 Creedmoor', ammo_type: 'reload', brand: 'Hand load', product_name: 'Load 3', bullet_make: 'Hornady', bullet_model: 'ELD-M', bullet_weight_gr: 140, quantity_on_hand: 60, created_at: stamp(20) }
    ],
    reload_recipes: [
      { ...base, id: uid(), ammo_id: cf2, recipe_name: 'Load 3 - 41.5gr H4350', load_date: day(20), brass_make: 'Lapua', brass_firings: 3, case_neck_annealed: true, primer_make: 'CCI', primer_type: 'BR-2', powder_make: 'Hodgdon', powder_type: 'H4350', powder_charge_gr: 41.5, max_load_gr: 42.5, bullet_make: 'Hornady', bullet_model: 'ELD-M', bullet_weight_gr: 140, coal_mm: 71.4, cbto_mm: 54.1, jump_to_lands_mm: 0.5, batch_size: 60, source_reference: 'Hodgdon reloading data', created_at: stamp(20) }
    ],
    sessions: [
      { ...base, id: s1, session_type: 'practice', session_date: day(2), start_time: '09:30', title: 'Sunday smallbore', location_name: 'Demo Range', rifle_id: rifle1, rimfire_ammo_id: rf1, distance_m: 50, rounds_fired: 30, score: 288, max_score: 300, x_count: 3, scorecard_max_shot: 10, notes: 'Wind picked up on the last two ends. Holding a bit left.', weather_summary: 'Partly cloudy, 22°C, wind 12 km/h SW', weather_temp_c: 22, weather_humidity_pct: 51, weather_pressure_hpa: 1016, weather_wind_speed_kmh: 12, weather_wind_direction_deg: 225, weather_source: 'auto', created_at: stamp(2) },
      { ...base, id: s2, session_type: 'testing', session_date: day(9), start_time: '08:15', title: '', test_purpose: 'load development', location_name: 'Demo Range', rifle_id: rifle2, centrefire_ammo_id: cf2, distance_m: 100, rounds_fired: 10, shots_in_group: 5, group_size_mm: 14.2, group_size_moa: 0.54, avg_velocity_fps: 2702, extreme_spread_fps: 21, standard_deviation_fps: 7.4, chronograph: 'MagnetoSpeed', notes: '41.5gr looks like a node.', weather_summary: 'Clear, 16°C, wind 6 km/h E', weather_temp_c: 16, weather_humidity_pct: 63, weather_pressure_hpa: 1019, weather_wind_speed_kmh: 6, weather_wind_direction_deg: 90, weather_source: 'auto', created_at: stamp(9) },
      { ...base, id: s3, session_type: 'competition', session_date: day(16), start_time: '10:00', competition_name: 'Club Championship Rd 4', discipline: 'F-Class', grade_or_class: 'FTR', location_name: 'Demo Range', rifle_id: rifle2, centrefire_ammo_id: cf1, distance_m: 500, rounds_fired: 15, score: 73, max_score: 75, x_count: 4, scorecard_max_shot: 5, placing: '3rd', field_size: 18, weather_summary: 'Overcast, 19°C, wind 18 km/h W', weather_temp_c: 19, weather_humidity_pct: 58, weather_pressure_hpa: 1011, weather_wind_speed_kmh: 18, weather_wind_direction_deg: 270, weather_source: 'auto', created_at: stamp(16) }
    ],
    session_strings: [],
    scorecard_ends: [
      ...[['End 1', ['10', 'X', '10', '9', '10']], ['End 2', ['10', '10', 'X', '9', '10']], ['End 3', ['9', '10', '10', 'X', '10']], ['End 4', ['10', '9', '9', '10', '10']], ['End 5', ['9', '10', '9', '8', '10']], ['End 6', ['10', '9', '10', '9', '9']]]
        .map(([l, sh], i) => ({ ...base, id: uid(), session_id: s1, end_no: i + 1, stage_label: l, distance_m: 50, shots: sh, created_at: stamp(2) })),
      ...[['Stage 1', ['5', '5', 'X', '5', '4']], ['Stage 2', ['5', 'X', '5', '5', '5']], ['Stage 3', ['4', '5', '5', 'X', 'X']]]
        .map(([l, sh], i) => ({ ...base, id: uid(), session_id: s3, end_no: i + 1, stage_label: l, distance_m: 500, shots: sh, created_at: stamp(16) }))
    ]
  };

  const listeners = [];
  const emit = session => listeners.forEach(cb => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session));
  const clone = o => JSON.parse(JSON.stringify(o));

  class Query {
    constructor(table) { this.t = table; this.op = 'select'; this.filters = []; this.orders = []; this.payload = null; this.one = false; }
    select() { return this; }
    insert(p) { this.op = 'insert'; this.payload = p; return this; }
    update(p) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.filters.push([c, v]); return this; }
    order(c, o) { this.orders.push([c, o?.ascending !== false]); return this; }
    single() { this.one = true; return this; }
    run() {
      const rows = db[this.t];
      const match = r => this.filters.every(([c, v]) => r[c] === v);
      let data;
      if (this.op === 'select') {
        data = rows.filter(match).sort((a, b) => {
          for (const [c, asc] of this.orders) { if (a[c] === b[c]) continue; return ((a[c] ?? '') > (b[c] ?? '') ? 1 : -1) * (asc ? 1 : -1); }
          return 0;
        });
      } else if (this.op === 'insert') {
        data = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(o => ({ id: uid(), user_id: user.id, created_at: new Date().toISOString(), ...clone(o) }));
        rows.push(...data);
      } else if (this.op === 'update') {
        data = rows.filter(match); data.forEach(r => Object.assign(r, clone(this.payload)));
      } else {
        data = rows.filter(match);
        db[this.t] = rows.filter(r => !match(r));
        const ids = new Set(data.map(r => r.id));
        if (this.t === 'sessions') { db.session_strings = db.session_strings.filter(r => !ids.has(r.session_id)); db.scorecard_ends = db.scorecard_ends.filter(r => !ids.has(r.session_id)); }
        if (this.t === 'centrefire_ammo') db.reload_recipes = db.reload_recipes.filter(r => !ids.has(r.ammo_id));
        data = null;
      }
      const out = data && this.one ? clone(data[0]) : data ? clone(data) : null;
      return { data: out, error: null };
    }
    then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  }

  return {
    from: t => new Query(t),
    auth: {
      onAuthStateChange(cb) { listeners.push(cb); setTimeout(() => cb('SIGNED_IN', { user }), 0); return { data: { subscription: { unsubscribe() {} } } }; },
      async signOut() { emit(null); return { error: null }; },
      async signInWithPassword() { emit({ user }); return { error: null }; },
      async signUp() { emit({ user }); return { data: { session: { user } }, error: null }; }
    }
  };
}
