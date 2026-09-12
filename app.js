(() => {
  "use strict";

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const COLORS = ["#ff5f6d", "#ffc371", "#35d68a", "#4fb0ff", "#c792ff", "#ff8fb1", "#7fe0d0", "#f2e05c"];
  const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

  // ---------------- State ----------------
  let players = [];        // {id, name, cards}
  let settings = { timer: 10, target: 3, sound: true };

  let usedLetters = new Set();
  let eliminated = new Set();
  let turnOrder = [];       // array of player ids, rotates each round
  let turnPointer = 0;
  let requirement = 1;
  let progressThisTurn = 0;
  let currentCategory = "";
  let lastCategory = "";
  let history = [];         // stack of {letter} for undo
  let wheelOrder = LETTERS.slice(); // scrambled letter order, fixed for the whole game

  let timerDeadline = 0;
  let timerRemaining = settings.timer;
  let timerHandle = null;
  let paused = false;
  let roundOver = false;

  let audioCtx = null;

  // ---------------- DOM ----------------
  const screenSetup = document.getElementById("screen-setup");
  const screenGame = document.getElementById("screen-game");
  const playerListEl = document.getElementById("player-list");
  const btnAddPlayer = document.getElementById("btn-add-player");
  const timerSelect = document.getElementById("timer-select");
  const targetSelect = document.getElementById("target-select");
  const soundToggle = document.getElementById("sound-toggle");
  const btnStart = document.getElementById("btn-start");

  const scoreboardEl = document.getElementById("scoreboard");
  const categoryNameEl = document.getElementById("category-name");
  const btnNewCategory = document.getElementById("btn-new-category");
  const turnPlayerEl = document.getElementById("turn-player");
  const timerRingFg = document.getElementById("timer-ring-fg");
  const timerNumEl = document.getElementById("timer-num");
  const requirementBanner = document.getElementById("requirement-banner");
  const requirementCountEl = document.getElementById("requirement-count");
  const wheelWrapEl = document.querySelector(".wheel-wrap");
  const wheelEl = document.getElementById("wheel");
  const lettersGridEl = document.getElementById("letters-grid");
  const btnPassTurn = document.getElementById("btn-pass-turn");
  const passLabelEl = document.getElementById("pass-label");

  const btnPassFail = document.getElementById("btn-pass-fail");
  const btnUndo = document.getElementById("btn-undo");
  const btnPause = document.getElementById("btn-pause");
  const btnQuit = document.getElementById("btn-quit");
  const btnQuit2 = document.getElementById("btn-quit-2");

  const overlayRound = document.getElementById("overlay-round");
  const roundWinnerText = document.getElementById("round-winner-text");
  const roundWinnerSub = document.getElementById("round-winner-sub");
  const btnNextRound = document.getElementById("btn-next-round");

  const overlayGame = document.getElementById("overlay-game");
  const gameWinnerText = document.getElementById("game-winner-text");
  const btnBackToSetup = document.getElementById("btn-back-to-setup");

  const overlayPause = document.getElementById("overlay-pause");
  const btnResume = document.getElementById("btn-resume");

  const btnViewLeaderboard = document.getElementById("btn-view-leaderboard");
  const btnViewLeaderboard2 = document.getElementById("btn-view-leaderboard-2");
  const overlayLeaderboard = document.getElementById("overlay-leaderboard");
  const leaderboardListEl = document.getElementById("leaderboard-list");
  const leaderboardSubEl = document.getElementById("leaderboard-sub");
  const btnCloseLeaderboard = document.getElementById("btn-close-leaderboard");
  const btnResetLeaderboard = document.getElementById("btn-reset-leaderboard");

  RING_setDasharray();
  function RING_setDasharray() {
    timerRingFg.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  }

  // ---------------- Audio ----------------
  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function beep(freq, dur, type = "sine", vol = 0.2) {
    if (!settings.sound || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain).connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  }

  function playTap() { beep(660, 0.08, "triangle", 0.15); }
  function playTick() { beep(880, 0.06, "square", 0.12); }
  function playBuzzer() { beep(140, 0.5, "sawtooth", 0.25); }
  function playFanfare() {
    if (!settings.sound || !audioCtx) return;
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => beep(f, 0.25, "triangle", 0.2), i * 90);
    });
  }

  // ---------------- Setup screen: players ----------------
  function defaultPlayers() {
    return [
      { id: 1, name: "Player 1", cards: 0 },
      { id: 2, name: "Player 2", cards: 0 },
    ];
  }
  players = defaultPlayers();
  let nextPlayerId = 3;

  function renderPlayerList() {
    playerListEl.innerHTML = "";
    players.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "player-row";

      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.style.background = COLORS[idx % COLORS.length];

      const input = document.createElement("input");
      input.type = "text";
      input.value = p.name;
      input.maxLength = 16;
      input.addEventListener("input", () => { p.name = input.value; });
      input.addEventListener("focus", () => input.select());

      row.appendChild(swatch);
      row.appendChild(input);

      if (players.length > 2) {
        const rm = document.createElement("button");
        rm.className = "btn-remove";
        rm.type = "button";
        rm.textContent = "✕";
        rm.addEventListener("click", () => {
          players = players.filter((pl) => pl.id !== p.id);
          renderPlayerList();
        });
        row.appendChild(rm);
      }

      playerListEl.appendChild(row);
    });
  }
  renderPlayerList();

  btnAddPlayer.addEventListener("click", () => {
    if (players.length >= 8) return;
    players.push({ id: nextPlayerId++, name: `Player ${players.length + 1}`, cards: 0 });
    renderPlayerList();
  });

  btnStart.addEventListener("click", () => {
    ensureAudio();
    players.forEach((p, idx) => {
      p.name = p.name.trim() || `Player ${idx + 1}`;
      p.cards = 0;
    });
    settings.timer = parseInt(timerSelect.value, 10);
    settings.target = parseInt(targetSelect.value, 10);
    settings.sound = soundToggle.checked;
    startGame();
  });

  // ---------------- Game flow ----------------
  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startGame() {
    turnOrder = players.map((p) => p.id);
    turnPointer = 0;
    lastCategory = "";
    wheelOrder = shuffled(LETTERS);
    switchScreen(screenGame);
    startRound();
  }

  function switchScreen(target) {
    [screenSetup, screenGame].forEach((s) => s.classList.remove("active"));
    target.classList.add("active");
  }

  function pickCategory() {
    let pool = CATEGORIES.filter((c) => c !== lastCategory);
    const c = pool[Math.floor(Math.random() * pool.length)];
    lastCategory = c;
    return c;
  }

  function startRound() {
    usedLetters = new Set();
    eliminated = new Set();
    requirement = 1;
    progressThisTurn = 0;
    history = [];
    roundOver = false;
    currentCategory = pickCategory();
    categoryNameEl.textContent = currentCategory;
    requirementBanner.hidden = true;

    // rotate starting player each round
    turnOrder.push(turnOrder.shift());
    turnPointer = 0;

    renderLetters();
    renderScoreboard();
    renderTurn();
    resetTimer();
    startTimer();
  }

  function activePlayers() {
    return players.filter((p) => !eliminated.has(p.id));
  }

  function currentPlayerId() {
    // turnPointer indexes into turnOrder, but we must skip eliminated players
    let tries = 0;
    while (eliminated.has(turnOrder[turnPointer % turnOrder.length]) && tries < turnOrder.length) {
      turnPointer = (turnPointer + 1) % turnOrder.length;
      tries++;
    }
    return turnOrder[turnPointer % turnOrder.length];
  }

  function getPlayer(id) {
    return players.find((p) => p.id === id);
  }

  function renderScoreboard() {
    scoreboardEl.innerHTML = "";
    const curId = currentPlayerId();
    players.forEach((p, idx) => {
      const chip = document.createElement("div");
      chip.className = "score-chip";
      if (p.id === curId && !roundOver) chip.classList.add("active");
      if (eliminated.has(p.id)) chip.classList.add("eliminated");

      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.style.background = COLORS[idx % COLORS.length];

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = p.name;

      const cards = document.createElement("span");
      cards.className = "cards";
      cards.textContent = "🏆".repeat(p.cards) || "0";

      chip.appendChild(swatch);
      chip.appendChild(name);
      chip.appendChild(cards);
      scoreboardEl.appendChild(chip);
    });
  }

  function renderTurn() {
    const p = getPlayer(currentPlayerId());
    turnPlayerEl.textContent = p ? p.name : "—";
    requirementBanner.hidden = requirement <= 1;
    if (requirement > 1) requirementCountEl.textContent = String(requirement - progressThisTurn);
    renderPassButton();
    wheelEl.classList.toggle("locked", progressThisTurn >= requirement);
  }

  function renderPassButton() {
    const remaining = requirement - progressThisTurn;
    if (remaining > 0) {
      passLabelEl.textContent = requirement > 1
        ? `${remaining} MORE`
        : "TAP A LETTER";
      btnPassTurn.classList.remove("ready");
    } else {
      passLabelEl.textContent = "PASS →";
      btnPassTurn.classList.add("ready");
    }
  }

  function computeWheelSize() {
    const availW = wheelWrapEl.clientWidth - 8;
    const availH = wheelWrapEl.clientHeight - 8;
    return Math.max(220, Math.min(availW, availH, 1100));
  }

  function renderLetters() {
    lettersGridEl.innerHTML = "";
    const size = computeWheelSize();
    wheelEl.style.width = size + "px";
    wheelEl.style.height = size + "px";

    const center = size / 2;
    const radius = size * 0.42;
    const btnSize = size * 0.1;
    const fontSize = btnSize * 0.42;

    wheelOrder.forEach((L, i) => {
      const angle = (2 * Math.PI * i) / wheelOrder.length - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);

      const btn = document.createElement("button");
      btn.className = "letter-btn";
      btn.textContent = L;
      btn.type = "button";
      btn.dataset.letter = L;
      btn.style.left = x + "px";
      btn.style.top = y + "px";
      btn.style.width = btnSize + "px";
      btn.style.height = btnSize + "px";
      btn.style.fontSize = fontSize + "px";
      if (usedLetters.has(L)) {
        btn.classList.add("used");
        btn.disabled = true;
      }
      btn.addEventListener("click", () => onLetterTap(L, btn));
      lettersGridEl.appendChild(btn);
    });

    const passSize = size * 0.4;
    btnPassTurn.style.width = passSize + "px";
    btnPassTurn.style.height = passSize + "px";
    timerNumEl.style.fontSize = passSize * 0.26 + "px";
    passLabelEl.style.fontSize = passSize * 0.11 + "px";
  }

  function onLetterTap(letter, btnEl) {
    if (roundOver || paused) return;
    if (usedLetters.has(letter)) return;
    if (progressThisTurn >= requirement) return;

    ensureAudio();
    usedLetters.add(letter);
    history.push(letter);
    progressThisTurn++;

    if (btnEl) {
      btnEl.classList.add("used", "just-used");
      btnEl.disabled = true;
      setTimeout(() => btnEl.classList.remove("just-used"), 350);
    }
    playTap();

    if (usedLetters.size >= LETTERS.length && activePlayers().length > 1) {
      // board exhausted mid-round: reset letters, escalate requirement (overtime)
      usedLetters = new Set();
      requirement = Math.min(requirement + 1, 3);
      renderLetters();
    }

    renderTurn();
  }

  function attemptPassTurn() {
    if (roundOver || paused) return;
    if (progressThisTurn < requirement) {
      btnPassTurn.classList.add("shake");
      setTimeout(() => btnPassTurn.classList.remove("shake"), 300);
      return;
    }
    advanceTurn();
  }

  function advanceTurn() {
    turnPointer = (turnPointer + 1) % turnOrder.length;
    progressThisTurn = 0;
    renderScoreboard();
    renderTurn();
    resetTimer();
    startTimer();
  }

  function eliminateCurrentPlayer() {
    const id = currentPlayerId();
    eliminated.add(id);
    progressThisTurn = 0;

    const remaining = activePlayers();
    if (remaining.length <= 1) {
      endRound(remaining[0] || null);
      return;
    }
    turnPointer = (turnPointer + 1) % turnOrder.length;
    renderScoreboard();
    renderTurn();
    resetTimer();
    startTimer();
  }

  function endRound(winner) {
    roundOver = true;
    stopTimer();
    renderScoreboard();

    if (winner) {
      winner.cards++;
      if (winner.cards >= settings.target) {
        showGameWin(winner);
        return;
      }
      roundWinnerText.textContent = `${winner.name} wins the round!`;
      roundWinnerSub.textContent = `${winner.name} now has ${winner.cards} card${winner.cards === 1 ? "" : "s"}.`;
    } else {
      roundWinnerText.textContent = "Round over!";
      roundWinnerSub.textContent = "";
    }
    playFanfare();
    overlayRound.hidden = false;
  }

  function showGameWin(winner) {
    gameWinnerText.textContent = `${winner.name} wins the game! 🎉`;
    playFanfare();
    overlayGame.hidden = false;
    if (window.Leaderboard) {
      window.Leaderboard.recordGame(players.map((p) => p.name), winner.name);
    }
  }

  // ---------------- Timer ----------------
  function resetTimer() {
    timerRemaining = settings.timer;
    timerDeadline = Date.now() + timerRemaining * 1000;
    updateTimerUI(timerRemaining);
  }

  function startTimer() {
    stopTimer();
    if (paused || roundOver) return;
    timerHandle = setInterval(tick, 100);
  }

  function stopTimer() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  let lastWholeSecond = null;
  function tick() {
    const remainingMs = Math.max(0, timerDeadline - Date.now());
    const remainingSec = remainingMs / 1000;
    timerRemaining = remainingSec;
    updateTimerUI(remainingSec);

    const whole = Math.ceil(remainingSec);
    if (whole !== lastWholeSecond) {
      lastWholeSecond = whole;
      if (whole > 0 && whole <= 3) playTick();
    }

    if (remainingMs <= 0) {
      stopTimer();
      playBuzzer();
      eliminateCurrentPlayer();
    }
  }

  function updateTimerUI(remainingSec) {
    const pct = Math.max(0, Math.min(1, remainingSec / settings.timer));
    timerRingFg.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct));
    timerNumEl.textContent = String(Math.ceil(remainingSec));
    timerRingFg.style.stroke = pct > 0.5 ? "var(--good)" : pct > 0.2 ? "var(--accent-2)" : "var(--bad)";
  }

  // ---------------- Controls ----------------
  btnPassTurn.addEventListener("click", attemptPassTurn);

  btnPassFail.addEventListener("click", () => {
    if (roundOver || paused) return;
    stopTimer();
    eliminateCurrentPlayer();
  });

  btnUndo.addEventListener("click", () => {
    if (roundOver || paused || history.length === 0) return;
    const letter = history.pop();
    usedLetters.delete(letter);
    progressThisTurn = Math.max(0, progressThisTurn - 1);
    renderLetters();
    renderTurn();
  });

  btnNewCategory.addEventListener("click", () => {
    if (roundOver) return;
    currentCategory = pickCategory();
    categoryNameEl.textContent = currentCategory;
  });

  btnPause.addEventListener("click", () => {
    if (roundOver) return;
    paused = true;
    stopTimer();
    overlayPause.hidden = false;
  });
  btnResume.addEventListener("click", () => {
    paused = false;
    overlayPause.hidden = true;
    timerDeadline = Date.now() + timerRemaining * 1000;
    startTimer();
  });

  function quitToSetup() {
    stopTimer();
    paused = false;
    roundOver = false;
    overlayPause.hidden = true;
    overlayRound.hidden = true;
    overlayGame.hidden = true;
    switchScreen(screenSetup);
  }
  btnQuit.addEventListener("click", () => {
    if (confirm("End the current game and return to setup?")) quitToSetup();
  });
  btnQuit2.addEventListener("click", () => {
    if (confirm("End the current game and return to setup?")) quitToSetup();
  });

  btnNextRound.addEventListener("click", () => {
    overlayRound.hidden = true;
    startRound();
  });

  btnBackToSetup.addEventListener("click", () => {
    overlayGame.hidden = true;
    quitToSetup();
  });

  // ---------------- Leaderboard ----------------
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderLeaderboardRows(rows) {
    leaderboardListEl.innerHTML = "";
    if (!rows.length) {
      leaderboardListEl.innerHTML = '<div class="leaderboard-empty">No games played yet.</div>';
      return;
    }
    rows.forEach((r, i) => {
      const winPct = r.games ? Math.round((r.wins / r.games) * 100) : 0;
      const row = document.createElement("div");
      row.className = "leaderboard-row";
      row.innerHTML = `
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-name">${escapeHtml(r.name)}</span>
        <span class="lb-stats"><strong>${r.wins}</strong> win${r.wins === 1 ? "" : "s"} · ${r.games} game${r.games === 1 ? "" : "s"} · ${winPct}%</span>
      `;
      leaderboardListEl.appendChild(row);
    });
  }

  async function openLeaderboard() {
    overlayLeaderboard.hidden = false;
    leaderboardSubEl.textContent = window.Leaderboard && window.Leaderboard.isRemote
      ? "Synced across devices"
      : "Stored on this device only";
    leaderboardListEl.innerHTML = '<div class="leaderboard-loading">Loading…</div>';
    const rows = window.Leaderboard ? await window.Leaderboard.fetchAll() : [];
    renderLeaderboardRows(rows);
  }

  btnViewLeaderboard.addEventListener("click", openLeaderboard);
  btnViewLeaderboard2.addEventListener("click", openLeaderboard);
  btnCloseLeaderboard.addEventListener("click", () => {
    overlayLeaderboard.hidden = true;
  });
  btnResetLeaderboard.addEventListener("click", () => {
    if (confirm("Clear the leaderboard scores stored on this device?")) {
      window.Leaderboard.resetLocal();
      openLeaderboard();
    }
  });

  // ---------------- Keyboard support (desktop testing) ----------------
  window.addEventListener("keydown", (e) => {
    if (!screenGame.classList.contains("active") || roundOver || paused) return;
    if (e.key === "Enter" || e.key === " ") {
      attemptPassTurn();
      return;
    }
    const k = e.key.toUpperCase();
    if (LETTERS.includes(k)) {
      const btn = lettersGridEl.querySelector(`[data-letter="${k}"]`);
      if (btn && !btn.disabled) onLetterTap(k, btn);
    }
  });

  // Re-layout the letter wheel when the viewport size/orientation changes
  let resizeRaf = null;
  function scheduleWheelRelayout() {
    if (!screenGame.classList.contains("active")) return;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(renderLetters);
  }
  window.addEventListener("resize", scheduleWheelRelayout);
  window.addEventListener("orientationchange", scheduleWheelRelayout);

  // Prevent double-tap-to-zoom / accidental scroll bounce on iPad
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
})();
