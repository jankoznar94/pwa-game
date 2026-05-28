(function() {
  'use strict';

  // ===== HELPERS =====
  const $ = id => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ===== AUDIO =====
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  function playTone(freq, duration, type = 'sine', vol = 0.15) {
    try {
      initAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + duration);
    } catch {}
  }
  function sfxHit() { playTone(220, 0.12, 'sawtooth', 0.08); }
  function sfxPlayerHit() { playTone(140, 0.2, 'square', 0.10); }
  function sfxSuccess() {
    playTone(523, 0.1, 'sine', 0.12);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 80);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.14), 160);
  }
  function sfxEnemyDefeat() {
    playTone(440, 0.08, 'square', 0.1);
    setTimeout(() => playTone(330, 0.08, 'square', 0.1), 80);
    setTimeout(() => playTone(220, 0.15, 'square', 0.08), 160);
  }

  // ===== BOSSES =====
  // Každý boss má: jméno, obličej, typ minihry, životy, obtížnost 1-10
  const BOSSES = [
    // Simon (phantom)
    { id: 0, name: 'Stínový pán', face: '👹', type: 'simon', hp: 3, level: 1, dungeonName: '🌲 Les stínů', dungeonMobs: 9 },
    { id: 1, name: 'Věžový démon', face: '👹', type: 'simon', hp: 4, level: 3, dungeonName: '🗼 Prokletá věž', dungeonMobs: 9 },
    { id: 2, name: 'Duch pralesa', face: '🌳', type: 'simon', hp: 4, level: 5, dungeonName: '🌴 Prales krve', dungeonMobs: 9 },
    { id: 3, name: 'Sněžný král', face: '🧊', type: 'simon', hp: 5, level: 7, dungeonName: '❄️ Ledová propast', dungeonMobs: 9 },
    // Color Clash (archer)
    { id: 4, name: 'Faraonova kletba', face: '🐍', type: 'color', hp: 3, level: 2, dungeonName: '🏜️ Pouštní nekropole', dungeonMobs: 9 },
    { id: 5, name: 'Král bažin', face: '🐊', type: 'color', hp: 4, level: 4, dungeonName: '🌿 Bažiny zapomnění', dungeonMobs: 9 },
    { id: 6, name: 'Magma behemot', face: '🐲', type: 'color', hp: 5, level: 6, dungeonName: '🌋 Lávové údolí', dungeonMobs: 9 },
    // Math Grid (tank)
    { id: 7, name: 'Archivář zhouby', face: '👹', type: 'grid', hp: 3, level: 2, dungeonName: '🔥 Hořící katakomby', dungeonMobs: 9 },
    { id: 8, name: 'Nebeský drak', face: '🐉', type: 'grid', hp: 4, level: 5, dungeonName: '☁️ Nebeská pevnost', dungeonMobs: 9 },
    { id: 9, name: 'Architekt času', face: '⌛', type: 'grid', hp: 5, level: 8, dungeonName: '⏳ Zřícenina času', dungeonMobs: 9 },
  ];

  // ===== MOBS (dungeon fodder) =====
  const MOB_FACES = {
    simon: ['👻', '👾', '💀', '🎃', '🕳️', '🦇', '👺', '⚰️', '☠️'],
    color: ['🏹', '🐺', '🦅', '🐗', '🦂', '🐍', '🐪', '🦎', '🐙'],
    grid: ['🛡️', '🗿', '🧟', '🤖', '🦾', '🧱', '⛓️', '⚙️', '🪨']
  };
  const MOB_NAMES = {
    simon: ['Přízrak', 'Stín', 'Duch', 'Noční můra', 'Fantom', 'Netvor', 'Mlžný duch', 'Kostlivec', 'Spektrum'],
    color: ['Lovec', 'Střelec', 'Lučištník', 'Šelma', 'Šílenec', 'Berserker', 'Lovkyně', 'Plaz', 'Dravý střelec'],
    grid: ['Strážce', 'Tank', 'Obr', 'Hlídka', 'Golem', 'Valibuk', 'Hromotluk', 'Mechanik', 'Krutý obr']
  };

  // ===== STATE =====
  let state = {};
  let gameLoop = null;
  let bossBattle = {};
  let minigameState = {};

  // ===== SAVE =====
  const SAVE_KEY = 'dungeonRecallPure';
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.completed) return s;
    } catch {}
    return { completed: [], deaths: 0, wins: 0 };
  }
  function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      completed: state.completed,
      deaths: state.deaths,
      wins: state.wins
    }));
  }
  function resetGame() {
    state = { completed: [], deaths: 0, wins: 0 };
    saveGame();
    showBossSelect();
  }

  // ===== SCREENS =====
  const SCREEN_NAMES = ['bossSelect', 'battleScreen', 'resultScreen'];
  function showScreen(name) {
    SCREEN_NAMES.forEach(id => {
      const el = $(id);
      if (id === name) {
        el.classList.remove('hidden');
        if (id === 'battleScreen') el.classList.add('active');
      } else {
        el.classList.add('hidden');
        if (id === 'battleScreen') el.classList.remove('active');
      }
    });
    if (name === 'bossSelect') showBossSelect();
  }

  // ===== BOSS SELECT =====
  function showBossSelect() {
    const list = $('bossList');
    const wins = state.wins;
    const deaths = state.deaths;
    list.innerHTML = BOSSES.map((b, i) => {
      const completed = state.completed.includes(i);
      const hpHearts = '❤️'.repeat(b.hp);
      return `<div class="dungeon-card ${completed ? 'completed' : ''}" onclick="game.startBoss(${i})">
        <div class="flex-between">
          <div class="dungeon-name">${b.dungeonName} ${completed ? '✅' : ''}</div>
          <span style="font-size:13px;color:#8888aa">Lv.${b.level}</span>
        </div>
        <div class="boss-preview">
          <span style="font-size:36px">${b.face}</span>
          <span class="boss-name">${b.name}</span>
          <span class="boss-hp">${hpHearts}</span>
          <span class="boss-type-badge ${b.type}">${b.type === 'simon' ? '🧠 Simon' : b.type === 'color' ? '🎨 Barvy' : '🧮 Matika'}</span>
        </div>
      </div>`;
    }).join('');
    $('statsLine').textContent = `🏆 ${wins} výher · 💀 ${deaths} proher`;
    document.querySelectorAll('.nav-bar a').forEach(a => a.classList.toggle('active', a.dataset.screen === 'bossSelect'));
  }

  // ===== START BOSS =====
  function startBoss(id) {
    const b = BOSSES[id];
    if (!b) return;
    const hasMobs = b.dungeonMobs > 0;
    bossBattle = {
      bossId: id,
      boss: { ...b, hp: b.hp, maxHp: b.hp },
      playerHp: 3,
      round: 0,
      ended: false,
      dungeonPhase: hasMobs ? 'mobs' : 'boss',
      mobsRemaining: b.dungeonMobs || 0,
      currentMobIndex: 0,
      firstRound: true
    };
    showScreen('battleScreen');
    updateBattleUI();
    startRound();
  }

  function startRound() {
    if (bossBattle.ended) return;
    const bb = bossBattle;

    // Check phase transitions
    if (bb.dungeonPhase === 'mobs') {
      if (bb.mobsRemaining <= 0) {
        bb.dungeonPhase = 'boss';
        bb.firstRound = true;
        // Boss intro
      } else {
        bb.currentMobIndex = (bb.boss.dungeonMobs - bb.mobsRemaining);
      }
    }

    if (bb.boss.hp <= 0) { endBattle(true); return; }
    if (bb.playerHp <= 0) { endBattle(false); return; }

    bb.round++;
    minigameState = {};
    const type = bb.boss.type;
    hideAllMinigames();

    // Odpočet jen na začátku fáze (první round battlu nebo přechod fáze)
    if (bb.firstRound) {
      bb.firstRound = false;
      showCountdown(2, () => {
        showMinigame(type);
      });
    } else {
      showMinigame(type);
    }
  }

  function showMinigame(type) {
    if (type === 'simon') { $('simonArea').classList.remove('minigame-hide'); startSimon(); }
    else if (type === 'color') { $('colorClashArea').classList.remove('minigame-hide'); startColorClash(); }
    else { $('gridDefenderArea').classList.remove('minigame-hide'); startGridDefender(); }
  }

  function hideAllMinigames() {
    $('simonArea').classList.add('minigame-hide');
    $('colorClashArea').classList.add('minigame-hide');
    $('gridDefenderArea').classList.add('minigame-hide');
  }

  // ===== COUNTDOWN =====
  function showCountdown(seconds, callback) {
    let remaining = seconds;
    const el = $('countdownOverlay');
    const numEl = $('countdownNumber');
    el.classList.remove('hidden');
    numEl.textContent = remaining;
    playTone(440 + remaining * 60, 0.15, 'sine', 0.1);
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        el.classList.add('hidden');
        if (callback) callback();
      } else {
        numEl.textContent = remaining;
        playTone(440 + remaining * 60, 0.15, 'sine', 0.1);
      }
    }, 1000);
  }

  // ===== BATTLE UI =====
  function updateBattleUI() {
    const bb = bossBattle;
    const isMobPhase = bb.dungeonPhase === 'mobs' && bb.mobsRemaining > 0;

    if (isMobPhase) {
      const mobIdx = bb.boss.dungeonMobs - bb.mobsRemaining;
      const faces = MOB_FACES[bb.boss.type] || ['👾'];
      const names = MOB_NAMES[bb.boss.type] || ['Nestvůra'];
      const mobFace = faces[mobIdx % faces.length];
      const mobName = names[mobIdx % names.length];
      $('bossName').textContent = `${mobName} (${bb.mobsRemaining} zbývá)`;
      $('bossFace').textContent = mobFace;
      $('bossHpHearts').textContent = '👾'.repeat(bb.mobsRemaining);
      $('bossHpMax').textContent = '';
      $('roundNum').textContent = `Patro ${bb.round} · 👹 potvora ${bb.currentMobIndex + 1}/${bb.boss.dungeonMobs}`;
    } else {
      $('bossName').textContent = bb.boss.name;
      $('bossFace').textContent = bb.boss.face;
      $('bossHpHearts').textContent = '❤️'.repeat(bb.boss.hp);
      $('bossHpMax').textContent = '🖤'.repeat(bb.boss.maxHp - bb.boss.hp);
      $('roundNum').textContent = `Kolo ${bb.round}`;
    }

    $('playerHearts').textContent = '❤️'.repeat(bb.playerHp);
    $('playerHeartsLost').textContent = '🖤'.repeat(3 - bb.playerHp);
    const typeLabel = { simon: '🧠 Simon Says', color: '🎨 Color Clash', grid: '🧮 Matika' }[bb.boss.type] || '';
    $('gameTypeBadge').textContent = typeLabel;

    // Animace příchodu
    const face = $('bossFace');
    face.classList.remove('enemy-enter', 'enemy-idle', 'boss-idle', 'enemy-defeat');
    void face.offsetWidth;
    face.classList.add('enemy-enter');
    setTimeout(() => face.classList.add('enemy-idle'), 500);
  }

  // ===== ROUND RESULT =====
  function playerWinsRound() {
    if (bossBattle.ended) return;
    const bb = bossBattle;
    if (bb.dungeonPhase === 'mobs') {
      bb.mobsRemaining--;
      sfxEnemyDefeat();
      animateHit('enemy');
      if (bb.mobsRemaining <= 0) {
        // Přejít na bosse
        bb.dungeonPhase = 'boss';
        bb.firstRound = true;
        updateBattleUI();
        setTimeout(() => startRound(), 600);
      } else {
        updateBattleUI();
        setTimeout(() => startRound(), 400);
      }
      return;
    }
    bb.boss.hp--;
    sfxSuccess();
    animateHit('enemy');
    updateBattleUI();
    if (bossBattle.boss.hp <= 0) {
      endBattle(true);
    } else {
      setTimeout(() => startRound(), 600);
    }
  }

  function playerLosesRound() {
    if (bossBattle.ended) return;
    bossBattle.playerHp--;
    sfxPlayerHit();
    animateHit('player');
    updateBattleUI();
    if (bossBattle.playerHp <= 0) {
      endBattle(false);
    } else {
      setTimeout(() => startRound(), 600);
    }
  }

  // ===== END BATTLE =====
  function endBattle(won) {
    bossBattle.ended = true;
    if (won) {
      if (!state.completed.includes(bossBattle.bossId)) {
        state.completed.push(bossBattle.bossId);
      }
      state.wins = (state.wins || 0) + 1;
      $('resultIcon').textContent = '🎉';
      $('resultTitle').textContent = `${bossBattle.boss.name} poražen!`;
      $('resultMsg').textContent = `${bossBattle.boss.dungeonName} dobyt!`;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.showScreen('bossSelect')">🗺️ Zpět na výběr</button>`;
    } else {
      state.deaths = (state.deaths || 0) + 1;
      $('resultIcon').textContent = '💀';
      $('resultTitle').textContent = 'Padl jsi';
      $('resultMsg').textContent = `${bossBattle.boss.name} tě porazil`;
      $('resultBtn').innerHTML = `
        <button class="btn btn-primary" onclick="game.retry()">🔄 Zkusit znovu</button>
        <button class="btn btn-secondary" onclick="game.showScreen('bossSelect')">🗺️ Jiný boss</button>
      `;
    }
    saveGame();
    showScreen('resultScreen');
  }

  function retry() {
    startBoss(bossBattle.bossId);
  }

  // ===== ANIMACE =====
  function animateHit(target) {
    if (target === 'enemy') {
      $('battleScreen').classList.add('hit-flash-blue');
      setTimeout(() => $('battleScreen').classList.remove('hit-flash-blue'), 300);
    } else {
      $('battleScreen').classList.add('screen-shake', 'hit-flash');
      setTimeout(() => $('battleScreen').classList.remove('screen-shake', 'hit-flash'), 300);
    }
  }

  // ===================================================================
  //  SIMON SAYS
  // ===================================================================
  const SIMON_SYMBOLS = ['⚡', '🔥', '💧', '🌿', '💎', '☀️', '🌙', '🍀', '🌀', '⭐', '🌈', '🦋',
                         '🍄', '🌊', '❄️', '🎯'];
  const SIMON_COLORS = ['#e94560', '#f1c40f', '#4a7dff', '#2ecc71', '#9b59b6', '#e67e22',
                        '#1abc9c', '#2c3e50', '#d35400', '#f39c12', '#16a085', '#c0392b',
                        '#8e44ad', '#2980b9', '#bdc3c7', '#7f8c8d'];
  const SIMON_FREQS = [73.42*4, 87.31*4, 110.0*4, 146.84*2, 164.81*2, 196.0*2,
                       220.0*2, 246.94*2];

  function startSimon() {
    const level = bossBattle.boss.level;
    const gridSize = Math.min(2 + Math.floor(level / 3), 4); // 2×2, 3×3, 4×4
    const numCells = gridSize * gridSize;
    const seqLen = Math.min(3 + Math.floor(level * 0.8), 10);

    const symbols = shuffle([...SIMON_SYMBOLS]).slice(0, numCells);
    const usedColors = SIMON_COLORS.slice(0, numCells);
    const usedFreqs = SIMON_FREQS.slice(0, numCells);

    minigameState = {
      sequence: [], playerIndex: 0, showing: true, inputEnabled: false,
      symbols, gridSize, seqLen
    };

    for (let i = 0; i < seqLen; i++) {
      minigameState.sequence.push(rand(0, numCells - 1));
    }

    // Grid
    const grid = $('simonGrid');
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    grid.innerHTML = symbols.map((sym, i) =>
      `<div class="simon-cell" data-idx="${i}" style="background:${usedColors[i]}" onclick="game.simonClick(${i})">
        <span style="font-size:${gridSize <= 3 ? '28px' : '20px'};pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%">${sym}</span>
      </div>`
    ).join('');
    $('simonPrompt').textContent = '👀 Zapamatuj si sekvenci!';
    updateSimonProgress();

    let delay = Math.max(100, 300 - level * 20);
    minigameState.showing = true;
    playSimonSequence(0, delay);
  }

  function playSimonSequence(idx, delay) {
    if (idx >= minigameState.sequence.length) {
      minigameState.showing = false;
      minigameState.inputEnabled = true;
      $('simonPrompt').textContent = '🎯 Zopakuj sekvenci!';
      return;
    }
    initAudio();
    const cells = document.querySelectorAll('#simonGrid .simon-cell');
    const cellIdx = minigameState.sequence[idx];
    cells.forEach(c => c.classList.remove('lit'));
    cells[cellIdx].classList.add('lit');
    playTone(SIMON_FREQS[cellIdx % SIMON_FREQS.length], 0.13, 'sine', 0.12);

    setTimeout(() => {
      cells.forEach(c => c.classList.remove('lit'));
      setTimeout(() => playSimonSequence(idx + 1, delay), 60);
    }, delay);
  }

  function simonClick(idx) {
    if (!minigameState.inputEnabled || minigameState.showing) return;
    initAudio();
    const cells = document.querySelectorAll('#simonGrid .simon-cell');
    cells[idx].classList.add('active');
    setTimeout(() => cells[idx].classList.remove('active'), 150);
    playTone(SIMON_FREQS[idx % SIMON_FREQS.length], 0.12, 'sine', 0.10);

    if (idx !== minigameState.sequence[minigameState.playerIndex]) {
      minigameState.inputEnabled = false;
      playerLosesRound();
      return;
    }
    minigameState.playerIndex++;
    updateSimonProgress();
    if (minigameState.playerIndex >= minigameState.sequence.length) {
      minigameState.inputEnabled = false;
      playerWinsRound();
    }
  }

  function updateSimonProgress() {
    $('simonProgress').textContent = `${minigameState.playerIndex}/${minigameState.sequence.length}`;
  }

  // ===================================================================
  //  COLOR CLASH
  // ===================================================================
  function startColorClash() {
    const level = bossBattle.boss.level;
    const fallDuration = Math.max(0.8, 2.8 - level * 0.25).toFixed(2);
    const colors = ['red', 'blue', 'green', 'yellow'];
    const colLabels = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡' };

    const arena = $('colorArena');
    arena.innerHTML = '';
    arena.style.height = '260px';
    arena.style.display = 'flex';
    arena.style.flexDirection = 'column';

    // Horní: sloupce
    const lanesDiv = document.createElement('div');
    lanesDiv.style.cssText = 'display:flex;flex:1;';
    lanesDiv.innerHTML = colors.map(c =>
      `<div class="color-lane" data-color="${c}" style="flex:1;text-align:center;padding-top:8px;font-size:24px;border-right:1px solid #1a1a3a">${colLabels[c]}</div>`
    ).join('');
    arena.appendChild(lanesDiv);

    // Dolní: tlačítka
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;height:50px;';
    btnRow.innerHTML = colors.map(c => {
      const bg = c === 'red' ? '#e94560' : c === 'blue' ? '#4a7dff' : c === 'green' ? '#2ecc71' : '#f1c40f';
      return `<div style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;background:${bg};margin:2px;border-radius:6px;font-size:16px;color:#fff;font-weight:bold" onclick="game.colorInput('${c}')">${colLabels[c]}</div>`;
    }).join('');
    arena.appendChild(btnRow);

    minigameState = { active: true, colors, arena, projectile: null, currentColor: null, fallDuration };

    spawnColorProjectile();
  }

  function spawnColorProjectile() {
    if (!minigameState.active) return;
    const arena = minigameState.arena;
    const col = minigameState.colors[rand(0, 3)];

    if (minigameState.projectile && minigameState.projectile.parentNode) {
      minigameState.projectile.remove();
    }

    const lanes = arena.querySelectorAll('.color-lane');
    const laneIdx = minigameState.colors.indexOf(col);
    const lane = lanes[laneIdx];
    if (!lane) { setTimeout(() => spawnColorProjectile(), 100); return; }
    const laneRect = lane.getBoundingClientRect();
    const arenaRect = arena.getBoundingClientRect();
    const laneX = laneRect.left - arenaRect.left + laneRect.width / 2 - 18;

    const el = document.createElement('div');
    el.className = 'color-projectile';
    el.style.cssText = `left:${laneX}px;top:0px;background:${col === 'red' ? '#e94560' : col === 'blue' ? '#4a7dff' : col === 'green' ? '#2ecc71' : '#f1c40f'};width:36px;height:36px;border-radius:50%;border:2px solid #fff;position:absolute;transition:top ${minigameState.fallDuration}s linear`;
    el.dataset.color = col;
    el.addEventListener('transitionend', () => {
      if (minigameState.active && minigameState.projectile === el) {
        minigameState.active = false;
        el.remove();
        playerLosesRound();
      }
    });
    arena.appendChild(el);
    minigameState.projectile = el;
    minigameState.currentColor = col;

    requestAnimationFrame(() => { el.style.top = '210px'; });
  }

  function colorInput(color) {
    if (!minigameState.active) return;
    if (color === minigameState.currentColor) {
      minigameState.active = false;
      if (minigameState.projectile) {
        const el = minigameState.projectile;
        el.style.transition = 'transform 0.2s, opacity 0.2s';
        el.style.transform = 'scale(2.5)';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 200);
      }
      sfxHit();
      playerWinsRound();
    }
  }

  // ===================================================================
  //  MATH GRID
  // ===================================================================
  function startGridDefender() {
    const level = bossBattle.boss.level;
    const numOptions = 3;
    const maxNum = 5 + level * 2;
    const target = rand(3, maxNum);
    const ops = ['+', '-', '×'];
    const options = [];
    const usedExprs = new Set();

    const correctOp = ops[rand(0, 2)];
    let a, b, expr, result;
    for (let tries = 0; tries < 50; tries++) {
      if (correctOp === '+') { a = rand(1, target - 1); b = target - a; expr = `${a}+${b}`; result = a + b; }
      else if (correctOp === '-') { a = rand(target + 1, target + maxNum); b = a - target; expr = `${a}-${b}`; result = a - b; }
      else {
        const factors = [];
        for (let f = 1; f <= Math.sqrt(target); f++) { if (target % f === 0) factors.push(f); }
        if (factors.length > 1) { a = factors[rand(1, factors.length - 1)]; b = target / a; expr = `${a}×${b}`; result = a * b; }
        else { a = rand(1, 3); b = target; expr = `${a}×${b}`; result = a * b; }
      }
      if (!usedExprs.has(expr) && result === target) { usedExprs.add(expr); break; }
    }
    options.push({ value: result, expr, wins: true });

    // Špatné odpovědi blízko správnému výsledku (±1, ±2)
    const closeValues = [];
    for (let d = 1; d <= 3; d++) {
      if (result - d >= 1) closeValues.push(result - d);
      if (result + d !== target) closeValues.push(result + d);
    }
    shuffle(closeValues);

    for (let i = 1; i < numOptions; i++) {
      const fakeResult = closeValues.length > 0 ? closeValues.shift() : rand(1, maxNum + 5);
      // Vytvoř podobně vypadající výraz
      let fakeExpr;
      for (let tries = 0; tries < 30; tries++) {
        const op = ops[rand(0, 2)];
        let ba, bb, bexpr, bres;
        if (op === '+') { ba = rand(1, maxNum); bb = rand(1, maxNum); bexpr = `${ba}+${bb}`; bres = ba + bb; }
        else if (op === '-') { ba = rand(1, maxNum * 2); bb = rand(1, ba - 1); bexpr = `${ba}-${bb}`; bres = ba - bb; }
        else { ba = rand(1, 5); bb = rand(1, 5); bexpr = `${ba}×${bb}`; bres = ba * bb; }
        if (!usedExprs.has(bexpr) && bres === fakeResult) {
          usedExprs.add(bexpr);
          options.push({ value: bres, expr: bexpr, wins: false });
          fakeExpr = true;
          break;
        }
      }
      // Pokud se nepodařilo najít výraz pro přesnou hodnotu, použij co nejbližší
      if (!fakeExpr) {
        for (let tries = 0; tries < 50; tries++) {
          const op = ops[rand(0, 2)];
          let ba, bb, bexpr, bres;
          if (op === '+') { ba = rand(1, maxNum); bb = rand(1, maxNum); bexpr = `${ba}+${bb}`; bres = ba + bb; }
          else if (op === '-') { ba = rand(1, maxNum * 2); bb = rand(1, ba - 1); bexpr = `${ba}-${bb}`; bres = ba - bb; }
          else { ba = rand(1, 5); bb = rand(1, 5); bexpr = `${ba}×${bb}`; bres = ba * bb; }
          if (!usedExprs.has(bexpr) && Math.abs(bres - fakeResult) <= 1) {
            usedExprs.add(bexpr);
            options.push({ value: bres, expr: bexpr, wins: false });
            break;
          }
        }
      }
    }

    shuffle(options);

    const timerDuration = Math.max(3, 6 - Math.floor(level / 3));
    minigameState = { options, target, active: true, timer: timerDuration };

    $('gridArea').innerHTML = `
      <div class="grid-info">
        <span class="grid-time" id="gridTimer">${timerDuration}s</span>
        <span class="grid-target">👹 Najdi: <strong>${target}</strong></span>
      </div>
      <div class="grid-cards">
        ${options.map((o, i) =>
          `<div class="grid-card" onclick="game.gridPick(${i})">
             <span class="expr">${o.expr}</span>
           </div>`
        ).join('')}
      </div>
    `;

    const timerEl = $('gridTimer');
    if (timerEl) {
      minigameState.timerInterval = setInterval(() => {
        minigameState.timer--;
        timerEl.textContent = minigameState.timer + 's';
        if (minigameState.timer <= 0) {
          clearInterval(minigameState.timerInterval);
          if (minigameState.active) {
            minigameState.active = false;
            playerLosesRound();
          }
        }
      }, 1000);
    }
  }

  function gridPick(idx) {
    if (!minigameState.active) return;
    minigameState.active = false;
    if (minigameState.timerInterval) {
      clearInterval(minigameState.timerInterval);
    }
    const o = minigameState.options[idx];
    if (o.wins) { sfxSuccess(); playerWinsRound(); }
    else { sfxPlayerHit(); playerLosesRound(); }
  }

  // ===================================================================
  //  INIT
  // ===================================================================
  function init() {
    state = loadSave();
    state.completed = state.completed || [];
    state.deaths = state.deaths || 0;
    state.wins = state.wins || 0;

    // Navigace
    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (a.dataset.screen === 'bossSelect') showBossSelect();
        else if (a.dataset.screen === 'reset') { resetGame(); showBossSelect(); }
      });
    });

    showScreen('bossSelect');
  }

  window.game = {
    showScreen, startBoss, retry,
    simonClick, colorInput, gridPick
  };

  init();
})();
