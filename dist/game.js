(function() {
  'use strict';

  // ===== HELPERS =====
  const $ = id => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
  function sfxBossDefeat() {
    playTone(523, 0.15, 'sine', 0.14);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.14), 100);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.16), 200);
    setTimeout(() => playTone(1047, 0.3, 'sine', 0.18), 300);
  }

  // ===== DUNGEONS =====
  const TOTAL_FLOORS = 50;
  const BOSS_INTERVAL = 10;

  const DUNGEONS = [
    {
      id: 0, name: '🌲 Les stínů', type: 'simon',
      face: '👹', bossName: 'Stínový pán',
      tag: '🧠 Simon', badge: 'simon',
      mobs: ['👻', '👾', '💀', '🎃', '🕳️', '🦇', '👺', '⚰️', '☠️'],
      mobNames: ['Přízrak', 'Stín', 'Duch', 'Noční můra', 'Fantom', 'Netvor', 'Mlžný duch', 'Kostlivec', 'Spektrum']
    },
    {
      id: 1, name: '⚖️ Pekelný tribunál', type: 'judge',
      face: '⚖️', bossName: 'Soudce pekel',
      tag: '⚖️ Soudce', badge: 'judge',
      mobs: ['📜', '🔮', '🗝️', '👁️', '🕯️', '📖', '⚗️', '🔔', '🧿'],
      mobNames: ['Scriba', 'Kacíř', 'Inkvizitor', 'Soudce stínů', 'Žalobce', 'Kat', 'Svědek', 'Písař', 'Zrádce']
    },
    {
      id: 2, name: '🏜️ Pouštní nekropole', type: 'color',
      face: '🐍', bossName: 'Faraonova kletba',
      tag: '🎨 Barvy', badge: 'color',
      mobs: ['🏹', '🐺', '🦅', '🐗', '🦂', '🐍', '🐪', '🦎', '🐙'],
      mobNames: ['Lovec', 'Střelec', 'Lučištník', 'Šelma', 'Šílenec', 'Berserker', 'Lovkyně', 'Plaz', 'Dravý střelec']
    },
    {
      id: 3, name: '⏳ Zřícenina času', type: 'grid',
      face: '⌛', bossName: 'Architekt času',
      tag: '🧮 Matika', badge: 'grid',
      mobs: ['🛡️', '🗿', '🧟', '🤖', '🦾', '🧱', '⛓️', '⚙️', '🪨'],
      mobNames: ['Strážce', 'Tank', 'Obr', 'Hlídka', 'Golem', 'Valibuk', 'Hromotluk', 'Mechanik', 'Krutý obr']
    }
  ];

  // ===== LEVEL z patra =====
  function floorToLevel(floor) {
    return clamp(Math.floor(floor / 5) + 1, 1, 10);
  }
  function isBossFloor(floor) {
    return floor % BOSS_INTERVAL === 0;
  }
  function getBossHp(floor) {
    // Boss HP roste: 3 při 10, až 7 při 50
    return clamp(Math.floor(floor / 10) + 2, 3, 7);
  }

  // ===== STATE =====
  let state = {};
  let battleState = {};  // aktuální dungeon run
  let minigameState = {};

  // ===== SAVE =====
  const SAVE_KEY = 'dungeonRecallV2';
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.dungeons) return s;
    } catch {}
    return { dungeons: [0, 0, 0, 0], deaths: 0, wins: 0 };
  }
  function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      dungeons: state.dungeons,
      deaths: state.deaths,
      wins: state.wins
    }));
  }
  function resetGame() {
    state = { dungeons: [0, 0, 0, 0], deaths: 0, wins: 0 };
    saveGame();
    showDungeonSelect();
  }

  // ===== SCREENS =====
  const SCREEN_NAMES = ['dungeonSelect', 'battleScreen', 'resultScreen'];
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
    if (name === 'dungeonSelect') showDungeonSelect();
  }

  // ===== DUNGEON SELECT =====
  function showDungeonSelect() {
    const wins = state.wins;
    const deaths = state.deaths;
    $('statsLine').textContent = `🏆 ${wins} výher · 💀 ${deaths} proher`;

    const list = $('dungeonList');
    list.innerHTML = DUNGEONS.map((d, i) => {
      const progress = state.dungeons[i];
      const pct = Math.min(progress / TOTAL_FLOORS * 100, 100);
      const completed = progress >= TOTAL_FLOORS;
      return `<div class="dungeon-card ${completed ? 'completed' : ''}" onclick="game.enterDungeon(${i})">
        <div class="flex-between">
          <div class="dungeon-name">${d.name}</div>
          <span class="boss-type-badge ${d.badge}">${d.tag}</span>
        </div>
        <div class="dungeon-progress-wrap">
          <div class="dungeon-progress-bar" style="width:${pct}%"></div>
        </div>
        <div class="flex-between" style="margin-top:4px">
          <span style="font-size:12px;color:#8888aa">${completed ? '✅ Dokončeno' : `🏚️ ${Math.min(progress, TOTAL_FLOORS)}/${TOTAL_FLOORS} pater`}</span>
        </div>
      </div>`;
    }).join('');
    document.querySelectorAll('.nav-bar a').forEach(a => a.classList.toggle('active', a.dataset.screen === 'dungeonSelect'));
  }

  // ===== ENTER DUNGEON =====
  function enterDungeon(id) {
    const d = DUNGEONS[id];
    if (!d) return;
    const progress = state.dungeons[id] || 0;
    const nextFloor = progress < TOTAL_FLOORS ? progress + 1 : progress;

    // Boss HP at this floor
    const isBoss = isBossFloor(nextFloor);
    const bossHp = isBoss ? getBossHp(nextFloor) : 1; // mobs have 1 "hp" (1 round)
    const level = floorToLevel(nextFloor);

    battleState = {
      dungeonId: id,
      dungeon: d,
      floor: nextFloor,
      totalFloors: TOTAL_FLOORS,
      bossHp: bossHp,
      maxBossHp: bossHp,
      playerHp: 3,
      level: level,
      round: 0,
      ended: false,
      isBossFloor: isBoss,
      firstRound: true,
      phase: isBoss ? 'boss' : 'mob',  // mob = 1 round, boss = multi-round
      mobDefeated: false
    };

    showScreen('battleScreen');
    updateBattleUI();
    startRound();
  }

  // ===== START ROUND =====
  function startRound() {
    if (battleState.ended) return;
    const bs = battleState;

    if (bs.bossHp <= 0) { endBattle(true); return; }
    if (bs.playerHp <= 0) { endBattle(false); return; }

    bs.round++;
    minigameState = {};
    hideAllMinigames();

    // Odpočet jen první kolo v tomto patře
    if (bs.firstRound) {
      bs.firstRound = false;
      showCountdown(1, () => {
        showMinigame(bs.dungeon.type);
      });
    } else {
      showMinigame(bs.dungeon.type);
    }
  }

  function showMinigame(type) {
    if (type === 'simon') { $('simonArea').classList.remove('minigame-hide'); startSimon(); }
    else if (type === 'color') { $('colorClashArea').classList.remove('minigame-hide'); startColorClash(); }
    else if (type === 'judge') { $('judgeArea').classList.remove('minigame-hide'); startJudge(); }
    else { $('gridDefenderArea').classList.remove('minigame-hide'); startGridDefender(); }
  }

  function hideAllMinigames() {
    $('simonArea').classList.add('minigame-hide');
    $('colorClashArea').classList.add('minigame-hide');
    $('gridDefenderArea').classList.add('minigame-hide');
    $('judgeArea').classList.add('minigame-hide');
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
    const bs = battleState;
    const d = bs.dungeon;

    if (bs.isBossFloor) {
      $('bossName').textContent = `${d.bossName} (Patro ${bs.floor})`;
      $('bossFace').textContent = d.face;
      $('bossHpHearts').textContent = '❤️'.repeat(bs.bossHp);
      $('bossHpMax').textContent = '🖤'.repeat(bs.maxBossHp - bs.bossHp);
      $('roundNum').textContent = `BOSS · Kolo ${bs.round}`;
    } else {
      const mobIdx = (bs.floor - 1) % d.mobs.length;
      $('bossName').textContent = `${d.mobNames[mobIdx]} (Patro ${bs.floor})`;
      $('bossFace').textContent = d.mobs[mobIdx];
      $('bossHpHearts').textContent = '👾';
      $('bossHpMax').textContent = '';
      $('roundNum').textContent = `Patro ${bs.floor}/${bs.totalFloors}`;
    }

    $('playerHearts').textContent = '❤️'.repeat(bs.playerHp);
    $('playerHeartsLost').textContent = '🖤'.repeat(3 - bs.playerHp);
    const typeLabel = { simon: '🧠 Simon Says', color: '🎨 Color Clash', grid: '🧮 Matika', judge: '⚖️ Soudce' }[bs.dungeon.type] || '';
    $('gameTypeBadge').textContent = typeLabel;

    // Animace
    const face = $('bossFace');
    face.classList.remove('enemy-enter', 'enemy-idle', 'boss-idle', 'enemy-defeat');
    void face.offsetWidth;
    face.classList.add('enemy-enter');
    setTimeout(() => face.classList.add('enemy-idle'), 500);
  }

  // ===== ROUND RESULT =====
  function playerWinsRound() {
    if (battleState.ended) return;
    const bs = battleState;

    if (!bs.isBossFloor) {
      // Mob = one shot, postoupit na další patro
      sfxEnemyDefeat();
      animateHit('enemy');
      advanceFloor();
      return;
    }

    // Boss = uber HP
    bs.bossHp--;
    sfxSuccess();
    animateHit('enemy');
    updateBattleUI();
    if (bs.bossHp <= 0) {
      endBattle(true);
    } else {
      setTimeout(() => startRound(), 500);
    }
  }

  function playerLosesRound() {
    if (battleState.ended) return;
    battleState.playerHp--;
    sfxPlayerHit();
    animateHit('player');
    updateBattleUI();
    if (battleState.playerHp <= 0) {
      endBattle(false);
    } else {
      setTimeout(() => startRound(), 500);
    }
  }

  function advanceFloor() {
    const bs = battleState;
    const next = bs.floor + 1;

    if (next > TOTAL_FLOORS) {
      endBattle(true);
      return;
    }

    // Uložit progress
    const dId = bs.dungeonId;
    if (next > state.dungeons[dId]) {
      state.dungeons[dId] = next;
    }
    saveGame();

    // Připravit další patro
    const isBoss = isBossFloor(next);
    const bossHp = isBoss ? getBossHp(next) : 1;
    const level = floorToLevel(next);

    bs.floor = next;
    bs.level = level;
    bs.isBossFloor = isBoss;
    bs.bossHp = bossHp;
    bs.maxBossHp = bossHp;
    bs.round = 0;
    bs.firstRound = true;
    bs.phase = isBoss ? 'boss' : 'mob';

    updateBattleUI();
    setTimeout(() => startRound(), 400);
  }

  // ===== END BATTLE =====
  function endBattle(won) {
    battleState.ended = true;
    const bs = battleState;
    const dId = bs.dungeonId;

    if (won) {
      // Označit aktuální patro (nebo celý dungeon) jako hotový
      if (bs.floor > state.dungeons[dId]) {
        state.dungeons[dId] = bs.floor;
      }
      state.wins = (state.wins || 0) + 1;
      saveGame();

      const completed = state.dungeons[dId] >= TOTAL_FLOORS;
      sfxBossDefeat();
      $('resultIcon').textContent = '🎉';
      $('resultTitle').textContent = completed ? `${bs.dungeon.name} DOBYT!` : `Patro ${bs.floor} dobyto!`;
      $('resultMsg').textContent = completed ? `Všech ${TOTAL_FLOORS} pater dokončeno!` : `Postup: ${Math.min(bs.floor, TOTAL_FLOORS)}/${TOTAL_FLOORS}`;
      $('resultBtn').innerHTML = `
        <button class="btn btn-primary" onclick="game.continueDungeon()">🚀 Další patro</button>
        <button class="btn btn-secondary" onclick="game.showScreen('dungeonSelect')">🗺️ Zpět na výběr</button>
      `;
    } else {
      state.deaths = (state.deaths || 0) + 1;
      saveGame();
      $('resultIcon').textContent = '💀';
      $('resultTitle').textContent = 'Padl jsi';
      $('resultMsg').textContent = `Patro ${bs.floor} – ${bs.dungeon.name}`;
      $('resultBtn').innerHTML = `
        <button class="btn btn-primary" onclick="game.retryFloor()">🔄 Znovu toto patro</button>
        <button class="btn btn-secondary" onclick="game.showScreen('dungeonSelect')">🗺️ Jiný dungeon</button>
      `;
    }
    showScreen('resultScreen');
  }

  function continueDungeon() {
    const dId = battleState.dungeonId;
    // Pokud je aktuální floor už dokončený, jdi o patro výš
    if (battleState.floor >= state.dungeons[dId]) {
      battleState.floor = state.dungeons[dId] + 1;
    }
    if (battleState.floor > TOTAL_FLOORS) {
      showScreen('dungeonSelect');
      return;
    }
    // Restart tohoto patra
    const bs = battleState;
    const isBoss = isBossFloor(bs.floor);
    const bossHp = isBoss ? getBossHp(bs.floor) : 1;
    const level = floorToLevel(bs.floor);
    bs.bossHp = bossHp;
    bs.maxBossHp = bossHp;
    bs.playerHp = 3;
    bs.round = 0;
    bs.ended = false;
    bs.isBossFloor = isBoss;
    bs.firstRound = true;
    bs.phase = isBoss ? 'boss' : 'mob';
    showScreen('battleScreen');
    updateBattleUI();
    startRound();
  }

  function retryFloor() {
    const bs = battleState;
    const isBoss = isBossFloor(bs.floor);
    const bossHp = isBoss ? getBossHp(bs.floor) : 1;
    const level = floorToLevel(bs.floor);
    bs.bossHp = bossHp;
    bs.maxBossHp = bossHp;
    bs.playerHp = 3;
    bs.round = 0;
    bs.ended = false;
    bs.isBossFloor = isBoss;
    bs.firstRound = true;
    bs.phase = isBoss ? 'boss' : 'mob';
    showScreen('battleScreen');
    updateBattleUI();
    startRound();
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
    const level = battleState.level;
    const gridSize = Math.min(2 + Math.floor(level / 3), 4);
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
    const level = battleState.level;
    const fallDuration = Math.max(0.8, 2.8 - level * 0.25).toFixed(2);
    const colors = ['red', 'blue', 'green', 'yellow'];
    const colLabels = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡' };

    const arena = $('colorArena');
    arena.innerHTML = '';
    arena.style.height = '260px';
    arena.style.display = 'flex';
    arena.style.flexDirection = 'column';

    const lanesDiv = document.createElement('div');
    lanesDiv.style.cssText = 'display:flex;flex:1;';
    lanesDiv.innerHTML = colors.map(c =>
      `<div class="color-lane" data-color="${c}" style="flex:1;text-align:center;padding-top:8px;font-size:24px;border-right:1px solid #1a1a3a">${colLabels[c]}</div>`
    ).join('');
    arena.appendChild(lanesDiv);

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
    const level = battleState.level;
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

    const closeValues = [];
    for (let d = 1; d <= 3; d++) {
      if (result - d >= 1) closeValues.push(result - d);
      if (result + d !== target) closeValues.push(result + d);
    }
    shuffle(closeValues);

    for (let i = 1; i < numOptions; i++) {
      const fakeResult = closeValues.length > 0 ? closeValues.shift() : rand(1, maxNum + 5);
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

  // ===== JUDGE (True or False) =====
  const JUDGE_STATEMENTS = {
    easy: [
      { text: '6 × 7 = 42', answer: true },
      { text: 'Voda se vaří při 100 °C', answer: true },
      { text: 'Země je plochá', answer: false },
      { text: 'Člověk má 32 zubů', answer: true },
      { text: 'Rybník je větší než oceán', answer: false },
      { text: '12 je dělitelné 3', answer: true },
      { text: 'Čtverec má 5 stran', answer: false },
      { text: 'Tři a čtyři je sedm', answer: true },
      { text: 'Žralok je savec', answer: false },
      { text: 'Slunce vychází na východě', answer: true },
      { text: '8 + 4 = 11', answer: false },
      { text: 'Týden má 7 dní', answer: true },
      { text: 'Měsíc je větší než Země', answer: false },
      { text: 'Kočka má 9 životů', answer: false },
      { text: '5 × 5 = 25', answer: true },
    ],
    medium: [
      { text: 'Délka úhlopříčky čtverce o straně 1 je √2', answer: true },
      { text: '24 je dělitelné 7', answer: false },
      { text: 'Součet vnitřních úhlů trojúhelníku je 180°', answer: true },
      { text: '0 je sudé číslo', answer: true },
      { text: 'Krychle má 8 vrcholů', answer: true },
      { text: '1 + 2 × 3 = 9', answer: false },
      { text: 'Hodina má 3600 sekund', answer: true },
      { text: 'Každý obdélník je čtverec', answer: false },
      { text: '15 × 3 = 45', answer: true },
      { text: 'Praha je hlavní město Polska', answer: false },
      { text: 'Všechna prvočísla jsou lichá', answer: false },
      { text: '2 + 3 × 4 = 20', answer: false },
      { text: 'Antarktida je poušť', answer: true },
      { text: 'Delfín je ryba', answer: false },
      { text: '9 × 8 = 72', answer: true },
    ],
    hard: [
      { text: '3² + 4² = 5²', answer: true },
      { text: '0,5 × 20 = 12', answer: false },
      { text: 'Sudé číslo krát liché je vždy sudé', answer: true },
      { text: 'Každý lichoběžník je rovnoběžník', answer: false },
      { text: '15 − 3 × 4 = 48', answer: false },
      { text: 'Vídeň je hlavní město Rakouska', answer: true },
      { text: 'Průměr 2, 8 a 14 je 8', answer: true },
      { text: '48 / 6 = 8', answer: true },
      { text: 'Číslo 121 je prvočíslo', answer: false },
      { text: 'Dva zápory dají klad', answer: true },
      { text: '(8 − 3) × 2 = 10', answer: true },
      { text: 'Kilogram je jednotka síly', answer: false },
      { text: 'Hlemýžď má přibližně 25 000 zubů', answer: true },
      { text: '12 × 11 = 131', answer: false },
      { text: 'Rtuť je kapalná při pokojové teplotě', answer: true },
    ]
  };

  function startJudge() {
    const level = battleState.level;
    let filtered;
    if (level <= 3) {
      filtered = JUDGE_STATEMENTS.easy;
    } else if (level <= 6) {
      filtered = [...JUDGE_STATEMENTS.easy, ...JUDGE_STATEMENTS.medium];
    } else {
      filtered = [...JUDGE_STATEMENTS.medium, ...JUDGE_STATEMENTS.hard];
    }

    const statement = filtered[rand(0, filtered.length - 1)];
    const timerDuration = Math.max(3, 6 - Math.floor(level / 3));

    minigameState = {
      active: true,
      statement: statement,
      timer: timerDuration
    };

    $('judgePrompt').textContent = '⚖️ Je tento výrok pravdivý?';
    $('judgeStatement').textContent = statement.text;
    $('judgeTimer').textContent = timerDuration + 's';

    if (minigameState.timerInterval) clearInterval(minigameState.timerInterval);
    minigameState.timerInterval = setInterval(() => {
      minigameState.timer--;
      $('judgeTimer').textContent = minigameState.timer + 's';
      if (minigameState.timer <= 0) {
        clearInterval(minigameState.timerInterval);
        if (minigameState.active) {
          minigameState.active = false;
          playerLosesRound();
        }
      }
    }, 1000);
  }

  function judgeAnswer(playerAnswer) {
    if (!minigameState.active) return;
    minigameState.active = false;
    if (minigameState.timerInterval) clearInterval(minigameState.timerInterval);

    if (playerAnswer === minigameState.statement.answer) {
      sfxSuccess();
      playerWinsRound();
    } else {
      sfxPlayerHit();
      playerLosesRound();
    }
  }

  // ===================================================================
  //  INIT
  // ===================================================================
  function init() {
    state = loadSave();
    state.dungeons = state.dungeons || [0, 0, 0, 0];
    state.deaths = state.deaths || 0;
    state.wins = state.wins || 0;

    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (a.dataset.screen === 'dungeonSelect') showDungeonSelect();
        else if (a.dataset.screen === 'reset') { resetGame(); }
      });
    });

    showScreen('dungeonSelect');
  }

  window.game = {
    showScreen, enterDungeon, continueDungeon, retryFloor,
    simonClick, colorInput, gridPick, judgeAnswer
  };

  init();
})();
