(() => {
  "use strict";

  const CONFIG = window.TAPPLE_CONFIG || {};
  const SUPABASE_URL = (CONFIG.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const SUPABASE_ANON_KEY = (CONFIG.SUPABASE_ANON_KEY || "").trim();
  const REMOTE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  const LOCAL_KEY = "tapple_leaderboard_v1";

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveLocal(data) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage unavailable (private mode, etc.) - leaderboard just won't persist
    }
  }

  function keyFor(name) {
    return name.trim().toLowerCase();
  }

  // Records the result of one finished game. `participantNames` is every
  // player who took part; `winnerName` is whoever hit the card target.
  async function recordGame(participantNames, winnerName) {
    const data = loadLocal();
    const winnerKey = keyFor(winnerName);
    const touched = [];

    participantNames.forEach((raw) => {
      const name = raw.trim();
      const key = keyFor(name);
      if (!key) return;
      if (!data[key]) data[key] = { name, wins: 0, games: 0 };
      data[key].name = name;
      data[key].games += 1;
      if (key === winnerKey) data[key].wins += 1;
      touched.push(data[key]);
    });

    saveLocal(data);

    if (REMOTE_ENABLED) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(
            touched.map((t) => ({ name: t.name, wins: t.wins, games: t.games }))
          ),
        });
      } catch (e) {
        console.warn("Leaderboard: Supabase sync failed, kept locally only.", e);
      }
    }
  }

  async function fetchAll() {
    if (REMOTE_ENABLED) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/leaderboard?select=name,wins,games&order=wins.desc`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        if (res.ok) return await res.json();
        console.warn("Leaderboard: Supabase fetch failed (" + res.status + "), showing local scores.");
      } catch (e) {
        console.warn("Leaderboard: Supabase fetch failed, showing local scores.", e);
      }
    }
    const data = loadLocal();
    return Object.values(data).sort((a, b) => b.wins - a.wins || b.games - a.games);
  }

  function resetLocal() {
    saveLocal({});
  }

  window.Leaderboard = { recordGame, fetchAll, resetLocal, isRemote: REMOTE_ENABLED };
})();
