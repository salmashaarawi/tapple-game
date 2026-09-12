# Tapple — Digital

A browser-based version of the party word game **Tapple** (2–8 players).
Plain HTML/CSS/JS — no build step, deploys as a static site.

## Rules implemented

- Each round shows a random category (e.g. "Fruits", "Movies").
- Players take turns saying a word matching the category that starts with an
  unused letter, then tap that letter to lock it, before the timer runs out.
- Running out of time (or tapping "This player can't answer") eliminates that
  player for the round.
- Last player standing wins the round's card.
- If every letter gets used before the round ends, the board resets and
  surviving players must answer with 2, then 3, words per turn ("overtime"),
  matching the physical game's rule.
- First player to the target number of cards (default 3) wins the game.

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
