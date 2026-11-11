-- Shooting Manager: Supabase schema
-- Run this whole file in Supabase > SQL Editor.
-- Every row belongs to one user and is only visible to that user (row-level security).

create extension if not exists "pgcrypto";

-- ───────────── Rifles ─────────────
create table rifles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,                 -- e.g. "Tikka T3x Varmint"
  make text,
  model text,
  serial_number text,
  action_type text,                   -- bolt, semi-auto, lever, single shot...
  rimfire_or_centrefire text check (rimfire_or_centrefire in ('rimfire','centrefire')),
  calibre text,
  barrel_length_mm numeric,
  twist_rate text,                    -- e.g. "1:8"
  barrel_make text,
  round_count integer default 0,      -- total rounds through barrel
  scope text,
  scope_mount text,
  sight_height_mm numeric,            -- scope centre above bore
  zero_distance_m numeric,
  trigger_weight_g numeric,
  stock text,
  weight_kg numeric,
  purchase_date date,
  licence_ref text,
  notes text,
  created_at timestamptz default now()
);

-- ───────────── Rimfire ammo ─────────────
create table rimfire_ammo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  calibre text not null,              -- .22 LR, .17 HMR, .22 WMR...
  brand text not null,
  product_name text,
  bullet_weight_gr numeric,
  bullet_type text,                   -- LRN, HP, subsonic...
  advertised_velocity_fps numeric,
  lot_number text,
  quantity_on_hand integer default 0,
  cost_per_box numeric,
  rounds_per_box integer,
  notes text,
  created_at timestamptz default now()
);

-- ───────────── Centrefire ammo (grouped by calibre in the UI) ─────────────
create table centrefire_ammo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  calibre text not null,              -- .308 Win, 6.5 Creedmoor, .223 Rem...
  ammo_type text not null default 'factory' check (ammo_type in ('factory','reload')),
  brand text,                         -- factory maker, or "Hand load"
  product_name text,
  bullet_make text,
  bullet_model text,
  bullet_weight_gr numeric,
  bc_g1 numeric,
  bc_g7 numeric,
  advertised_velocity_fps numeric,
  lot_number text,
  quantity_on_hand integer default 0,
  cost_per_box numeric,
  rounds_per_box integer,
  notes text,
  created_at timestamptz default now()
);

-- ───────────── Reloading data (one row per load recipe/batch) ─────────────
create table reload_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ammo_id uuid references centrefire_ammo(id) on delete cascade,
  recipe_name text,                   -- e.g. "Load 3 - 41.5gr H4350"
  load_date date,
  brass_make text,
  brass_lot text,
  brass_firings integer,
  brass_trim_length_mm numeric,
  case_neck_annealed boolean default false,
  neck_tension text,
  primer_make text,
  primer_type text,
  powder_make text,
  powder_type text,
  powder_charge_gr numeric,
  bullet_make text,
  bullet_model text,
  bullet_weight_gr numeric,
  coal_mm numeric,                    -- cartridge overall length
  cbto_mm numeric,                    -- cartridge base to ogive
  jump_to_lands_mm numeric,
  seating_depth_mm numeric,
  crimp text,
  batch_size integer,
  max_load_gr numeric,
  source_reference text,              -- manual or load data source
  pressure_signs text,
  notes text,
  created_at timestamptz default now()
);

-- ───────────── Sessions: testing, practice, competition ─────────────
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_type text not null check (session_type in ('testing','practice','competition')),
  session_date date not null default current_date,
  start_time time,
  title text,
  location_name text,
  latitude numeric,
  longitude numeric,
  rifle_id uuid references rifles(id) on delete set null,
  rimfire_ammo_id uuid references rimfire_ammo(id) on delete set null,
  centrefire_ammo_id uuid references centrefire_ammo(id) on delete set null,
  distance_m numeric,
  rounds_fired integer default 0,
  notes text,

  -- weather (auto-filled, editable)
  weather_temp_c numeric,
  weather_humidity_pct numeric,
  weather_pressure_hpa numeric,
  weather_wind_speed_kmh numeric,
  weather_wind_gust_kmh numeric,
  weather_wind_direction_deg numeric,
  weather_precip_mm numeric,
  weather_cloud_cover_pct numeric,
  weather_summary text,
  weather_source text,                -- 'auto' or 'manual'

  -- practice
  score numeric,
  max_score numeric,
  x_count integer,

  -- competition
  competition_name text,
  discipline text,
  grade_or_class text,
  placing text,
  field_size integer,

  -- testing
  test_purpose text,                  -- zero check, load development, ladder test, ammo comparison...
  group_size_mm numeric,
  group_size_moa numeric,
  shots_in_group integer,
  avg_velocity_fps numeric,
  extreme_spread_fps numeric,
  standard_deviation_fps numeric,
  chronograph text,
  elevation_clicks numeric,
  windage_clicks numeric,

  scorecard_max_shot numeric default 10,   -- highest value of a single shot (10, 5, 6...)

  created_at timestamptz default now()
);

-- ───────────── Per-shot / per-string detail (optional) ─────────────
create table session_strings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  string_label text,                  -- "Group 1", "Sighter", "Stage 2"
  shots integer,
  score numeric,
  group_size_mm numeric,
  velocity_fps numeric,
  notes text,
  created_at timestamptz default now()
);

-- ───────────── Score card: one row per end / stage, shots held as a list ─────────────
create table scorecard_ends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  end_no integer not null,
  stage_label text,                   -- "Sighters", "Stage 1", "300m"
  distance_m numeric,
  shots jsonb not null default '[]',  -- e.g. ["10","9","X","M"]; X = max, M or - = miss
  created_at timestamptz default now()
);

-- ───────────── Row-level security ─────────────
do $$
declare t text;
begin
  foreach t in array array['rifles','rimfire_ammo','centrefire_ammo','reload_recipes','sessions','session_strings','scorecard_ends']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows select" on %I for select using (user_id = auth.uid())', t);
    execute format('create policy "own rows insert" on %I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "own rows update" on %I for update using (user_id = auth.uid())', t);
    execute format('create policy "own rows delete" on %I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

create index on sessions (user_id, session_date desc);
create index on centrefire_ammo (user_id, calibre);
create index on rimfire_ammo (user_id, calibre);
