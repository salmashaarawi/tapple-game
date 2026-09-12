# Tapple — Digital

A browser-based version of the party word game **Tapple** (2–8 players).
Plain HTML/CSS/JS — no build step, deploys as a static site.

## Rules implemented

- Each round shows a random category (e.g. "Fruits", "Movies") and the 26
  letters are arranged in a shuffled circle, like the physical wheel.
- On your turn you may tap exactly **one** unused letter for a word that fits
  the category, then must press the center button to pass — it doubles as
  the countdown timer and only turns green once you've tapped a letter.
- Running out of time (or tapping "This player can't answer") eliminates that
  player for the round.
- Last player standing wins the round's card.
- If every letter gets used before the round ends, the board resets and
  surviving players must answer with 2, then 3, words per turn ("overtime"),
  matching the physical game's rule.
- First player to the target number of cards (default 3) wins the game — the
  win is announced, recorded on the leaderboard, and the app returns to the
  setup screen for the next game.

## Leaderboard

Wins are tracked by player name. By default this is stored in the browser's
`localStorage`, so it works immediately with no setup, but it's local to
whichever device/browser played the game.

### Leaderboard setup (optional: sync across devices with Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run:

   ```sql
   create table if not exists leaderboard (
     name text primary key,
     wins int not null default 0,
     games int not null default 0,
     updated_at timestamptz not null default now()
   );

   alter table leaderboard enable row level security;

   create policy "Public read" on leaderboard
     for select using (true);
   create policy "Public upsert" on leaderboard
     for insert with check (true);
   create policy "Public update" on leaderboard
     for update using (true);
   ```

   This makes the leaderboard fully public (readable and writable with just
   the anon key) — fine for a casual party-game score sheet, but don't reuse
   this table/project for anything sensitive.

3. In Project Settings → API, copy the **Project URL** and the **anon
   public** key into [`config.js`](config.js).
4. Redeploy. The game will now read/write that table instead of (in addition
   to) `localStorage`.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy to Vercel

From this folder:

```bash
npx vercel --prod
```

Or push it to a GitHub repo and import it at vercel.com/new — Vercel will
detect it as a static site automatically (no framework, no build command
needed).

## Using it on iPad

Open the deployed URL in Safari, tap the Share icon, then **Add to Home
Screen**. It launches full-screen like an app and the letter grid is sized
for touch. Landscape and portrait are both supported.
