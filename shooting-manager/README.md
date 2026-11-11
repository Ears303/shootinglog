# Shooting Manager

Web app for logging **testing**, **practice** and **competition** sessions, with rifle data, rimfire and centrefire ammo (centrefire grouped by calibre, with reloading recipes) and automatic weather.

## What it does

- **Sessions**: three types, each with its own fields.
  - Practice: score, max score, X count, notes.
  - Competition: competition name, discipline, grade, score, placing, field size.
  - Testing: purpose, group size (mm/MOA), velocity (avg, ES, SD), chronograph, click corrections.
  - All types: date, time, location, rifle, ammo, distance, rounds, optional strings/groups, notes.
- **Weather** is filled in automatically for every session from the date, time and location (free Open-Meteo service, no key). Temperature, humidity, pressure, wind speed/gust/direction, rain, cloud. Every value can be edited by hand.
- **Rifles**: make, model, serial, calibre, barrel, twist, optic, mount, sight height, zero, trigger, round count and more.
- **Ammo**: rimfire and centrefire tabs. Centrefire is grouped by calibre with totals. Reload ammo has a "Reload data" button for recipes (brass, primer, powder, charge, bullet, COAL, CBTO, jump, annealing, pressure signs, source).
- **Score card** (practice and competition): add ends or stages, enter each shot (a number, X or V for an X, M or - for a miss), and get end totals, running totals, X count and a session total that fills the Score box. Set the max per shot (10, 5, 6...) per session.
- Each shooter signs in with their own email and only sees their own data.
- New sessions can add rounds to the rifle's barrel count and deduct from ammo on hand.

## Setup

1. **Supabase**: create a project, then open SQL Editor and run `schema.sql`.
2. In Supabase > Project Settings > API, copy the project URL and anon key into `config.js`.
3. In Supabase > Authentication, decide whether email confirmation is required (on by default).
4. **Vercel**: put these files in a GitHub repo, import it in Vercel, deploy (no build step, it is a static site).
5. In Supabase > Authentication > URL Configuration, set the Site URL to your Vercel address.

**Demo mode:** while `config.js` still has the placeholder URL, the app runs with sample data in memory so you can try it without Supabase. Nothing is saved.

To test locally: `npx serve .` then open the address shown.

## Files

- `index.html`, `style.css`, `app.js`: the app
- `demo.js`: sample-data backend used only in demo mode
- `config.js`: your Supabase URL and anon key
- `schema.sql`: database tables and row-level security
