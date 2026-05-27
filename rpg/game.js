(function() {
  'use strict';

  // ===== HELPERS =====
  const $ = id => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randF = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ===== AUDIO =====
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

  // Simon frekvence v D moll
  const SIMON_FREQS = [73.42*4, 87.31*4, 110.0*4, 146.84*2, 164.81*2, 196.0*2];
  // ===== DUNGEONS =====
  const DUNGEONS = [
    {
      id: 0, name: 'Les stínů', unlockReq: null,
      floors: [
        { enemy: { name: 'Mladý přízrak', type: 'phantom', hp: 5, face: '👻', level: 1 }, rewardGold: 5 },
        { enemy: { name: 'Lovec', type: 'archer', hp: 8, face: '🏹', level: 1 }, rewardGold: 7 },
        { enemy: { name: 'Noční přízrak', type: 'phantom', hp: 10, face: '👻', level: 2 }, rewardGold: 10 },
        { boss: true, enemy: { name: 'Stínový pán', type: 'phantom', hp: 15, face: '👹', level: 2 }, rewardGold: 20, rewardXp: 5 }
      ]
    },
    {
      id: 1, name: 'Hořící katakomby', unlockReq: 0,
      floors: [
        { enemy: { name: 'Střelec', type: 'archer', hp: 12, face: '🏹', level: 2 }, rewardGold: 10 },
        { enemy: { name: 'Štítový tank', type: 'tank', hp: 15, face: '🛡️', level: 2 }, rewardGold: 12 },
        { enemy: { name: 'Ohnivý střelec', type: 'archer', hp: 18, face: '🏹', level: 3 }, rewardGold: 15 },
        { enemy: { name: 'Starý přízrak', type: 'phantom', hp: 20, face: '👻', level: 3 }, rewardGold: 18 },
        { boss: true, enemy: { name: 'Archivář zhouby', type: 'tank', hp: 28, face: '👹', level: 4 }, rewardGold: 30, rewardXp: 8 }
      ]
    },
    {
      id: 2, name: 'Prokletá věž', unlockReq: 1,
      floors: [
        { enemy: { name: 'Zkušený střelec', type: 'archer', hp: 20, face: '🏹', level: 3 }, rewardGold: 15 },
        { enemy: { name: 'Těžký tank', type: 'tank', hp: 25, face: '🛡️', level: 3 }, rewardGold: 18 },
        { enemy: { name: 'Zlý přízrak', type: 'phantom', hp: 28, face: '👻', level: 4 }, rewardGold: 20 },
        { enemy: { name: 'Mistr střelec', type: 'archer', hp: 30, face: '🏹', level: 4 }, rewardGold: 22 },
        { boss: true, enemy: { name: 'Věžový démon', type: 'phantom', hp: 40, face: '👹', level: 5 }, rewardGold: 40, rewardXp: 12 }
      ]
    }
  ];
  const MAX_FLOORS = 10;
  const XP_PER_LEVEL = [5, 8, 12, 16, 22, 28, 35, 45, 55, 70];

  // ===== EQUIPMENT =====
  const ALL_WEAPONS = [
    { id: 'fists', name: '✊ Pěsti', dmgMult: 1.0, cost: 0 },
    { id: 'dagger', name: '🗡️ Dýka', dmgMult: 1.3, cost: 20 },
    { id: 'sword', name: '⚔️ Meč', dmgMult: 1.6, cost: 50 },
    { id: 'flameSword', name: '🔥 Ohnivý meč', dmgMult: 2.0, cost: 120 }
  ];
  const ALL_ARMORS = [
    { id: 'rags', name: '🧥 Hadry', armor: 0, cost: 0 },
    { id: 'leather', name: '🦺 Kožené', armor: 1, cost: 30 },
    { id: 'chainmail', name: '⛓️ Kroužková', armor: 2, cost: 80 },
    { id: 'plate', name: '🛡️ Plátová', armor: 3, cost: 150 }
  ];
  const ALL_SHIELDS = [
    { id: 'none', name: '—', block: 0, cost: 0 },
    { id: 'wooden', name: '🪵 Dřevěný', block: 10, cost: 25 },
    { id: 'iron', name: '⚙️ Železný', block: 20, cost: 70 },
    { id: 'tower', name: '🏰 Pavéza', block: 35, cost: 140 }
  ];

  const SPELL_COOLDOWNS = {
    fire: 8, ice: 12, heal: 15, shield: 12
  };
  const SPELL_NAMES = {
    fire: '🔥 Oheň', ice: '❄️ Mráz', heal: '💚 Léčení', shield: '🛡️ Bariéra'
  };

  // ===== STATE =====
  let state = {};
  let gameLoop = null;
  let battleState = {};
  let simonState = {};
  let colorState = {};
  let gridState = {};

  // ===== SAVE =====
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem('dungeonRecallSave'));
      if (s && s.hero) return s;
    } catch {}
    return {
      hero: {
        level: 1, xp: 0, hp: 3, maxHp: 3, baseDmg: 2,
        weapon: 'fists', armor: 'rags', shield: 'none',
        gold: 0, permaMaxHp: 0, permaDmg: 0, permaArmor: 0, permaBlock: 0
      },
      completedDungeons: []
    };
  }
  function saveGame() {
    localStorage.setItem('dungeonRecallSave', JSON.stringify({
      hero: state.hero,
      completedDungeons: state.completedDungeons
    }));
  }

  // ===== HERO STATS =====
  function getHeroStats() {
    const h = state.hero;
    const wpn = ALL_WEAPONS.find(w => w.id === h.weapon) || ALL_WEAPONS[0];
    const arm = ALL_ARMORS.find(a => a.id === h.armor) || ALL_ARMORS[0];
    const shd = ALL_SHIELDS.find(s => s.id === h.shield) || ALL_SHIELDS[0];
    return {
      maxHp: h.permaMaxHp + 3,
      damage: Math.round((h.permaDmg + h.baseDmg) * wpn.dmgMult),
      armor: h.permaArmor + arm.armor,
      block: Math.min(50, h.permaBlock + shd.block),
      weapon: wpn, armorItem: arm, shield: shd
    };
  }

  function getXpToLevel(level) {
    return XP_PER_LEVEL[Math.min(level - 1, XP_PER_LEVEL.length - 1)] || 100;
  }

  // ===== DUNGEON LOGIC =====
  function getDungeon(id) { return DUNGEONS[id]; }
  function isDungeonUnlocked(id) {
    if (id === 0) return true;
    const d = DUNGEONS[id];
    if (!d) return false;
    return state.completedDungeons.includes(d.unlockReq);
  }
  function hasCompletedDungeon(id) {
    return state.completedDungeons.includes(id);
  }

  // ===== NAVIGATION =====
  let currentScreen = 'hero';

  function showScreen(name) {
    ['heroScreen','adventureScreen','shopScreen','battleScreen','resultScreen'].forEach(id => {
      $('battleScreen').classList.remove('active');
      $(id).classList.add('hidden');
    });
    $('battleScreen').classList.add('hidden');
    currentScreen = name;
    if (name === 'hero') { $('heroScreen').classList.remove('hidden'); renderHero(); }
    else if (name === 'adventure') { $('adventureScreen').classList.remove('hidden'); renderDungeons(); }
    else if (name === 'shop') { $('shopScreen').classList.remove('hidden'); renderShop(); }
    else if (name === 'battle') { $('battleScreen').classList.remove('hidden'); $('battleScreen').classList.add('active'); }
    else if (name === 'result') { $('resultScreen').classList.remove('hidden'); }
    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.classList.toggle('active', a.dataset.screen === name);
    });
  }

  // ===== RENDER HERO =====
  function renderHero() {
    const h = state.hero;
    const s = getHeroStats();
    $('heroName').textContent = h.name || 'Dobrodruh';
    $('heroGold').textContent = `💰 ${h.gold}`;
    $('heroLevel').textContent = h.level;
    $('heroXp').textContent = h.xp;
    $('heroXpNext').textContent = getXpToLevel(h.level);
    $('statHp').textContent = s.maxHp;
    $('statDmg').textContent = s.damage;
    $('statArmor').textContent = s.armor;
    $('statBlock').textContent = s.block + '%';
    $('equipWeapon').textContent = `${s.weapon.name} (×${s.weapon.dmgMult})`;
    $('equipArmor').textContent = `${s.armorItem.name} (${s.armorItem.armor})`;
    $('equipShield').textContent = `${s.shield.name} (${s.shield.block}%)`;
  }

  // ===== RENDER DUNGEONS =====
  function renderDungeons() {
    $('dungeonList').innerHTML = DUNGEONS.map((d, i) => {
      const unlocked = isDungeonUnlocked(i);
      const completed = hasCompletedDungeon(i);
      const floorsLabel = `${d.floors.length} pater`;
      return `<div class="dungeon-card ${unlocked ? '' : 'locked'}"
                   onclick="${unlocked ? `game.startDungeon(${i})` : ''}">
        <div class="flex-between">
          <div class="dungeon-name">${unlocked ? '' : '🔒 '}${d.name}</div>
          ${completed ? '<span class="win-badge">✅ Vyhráno</span>' : ''}
        </div>
        <div class="dungeon-info">${floorsLabel} • ${unlocked ? 'Klikni pro vstup' : 'Dokonči předchozí dungeon'}</div>
      </div>`;
    }).join('');
  }

  // ===== SHOP =====
  const SHOP_UPGRADES = [
    { id: 'permaMaxHp', name: '🛡️ Pevnější štít', desc: '+1 max HP', baseCost: 15, costMult: 1.8, maxLevel: 5 },
    { id: 'permaDmg', name: '⚔️ Silnější útok', desc: '+1 základní damage', baseCost: 12, costMult: 1.7, maxLevel: 5 },
    { id: 'permaArmor', name: '🦺 Odolnější zbroj', desc: '+1 brnění', baseCost: 20, costMult: 1.9, maxLevel: 3 },
    { id: 'permaBlock', name: '🏰 Lepší blok', desc: '+5% šance na blok', baseCost: 18, costMult: 1.8, maxLevel: 3 }
  ];

  function renderShop() {
    const h = state.hero;
    $('shopGold').textContent = `💰 ${h.gold}`;
    $('shopItems').innerHTML = SHOP_UPGRADES.map(u => {
      const level = h[u.id] || 0;
      const cost = Math.floor(u.baseCost * Math.pow(u.costMult, level));
      const canBuy = level < u.maxLevel && h.gold >= cost;
      return `<div class="card">
        <div class="flex-between">
          <span class="card-title">${u.name}</span>
          <span>Úroveň ${level}/${u.maxLevel}</span>
        </div>
        <div class="card-subtitle">${u.desc}</div>
        <button class="btn btn-primary ${canBuy ? '' : 'btn:disabled'}"
                onclick="game.buyUpgrade('${u.id}')" ${canBuy ? '' : 'disabled'}>
          ${canBuy ? `🔨 Koupit (💰${cost})` : (level >= u.maxLevel ? '✅ Max' : `💰 ${cost} - máš ${h.gold}`)}
        </button>
      </div>`;
    }).join('');
  }

  function buyUpgrade(id) {
    const h = state.hero;
    const u = SHOP_UPGRADES.find(x => x.id === id);
    if (!u) return;
    const level = h[u.id] || 0;
    if (level >= u.maxLevel) return;
    const cost = Math.floor(u.baseCost * Math.pow(u.costMult, level));
    if (h.gold < cost) return;
    h.gold -= cost;
    h[u.id] = (h[u.id] || 0) + 1;
    saveGame();
    renderShop();
  }

  // ===== START DUNGEON =====
  function startDungeon(dungeonId) {
    const d = getDungeon(dungeonId);
    if (!d || !isDungeonUnlocked(dungeonId)) return;
    const s = getHeroStats();
    battleState = {
      dungeonId, floorIndex: 0, dungeon: d,
      playerHp: s.maxHp, maxPlayerHp: s.maxHp,
      ended: false, spells: {},
      isBossFloor: false
    };
    // Inicializace kouzel
    Object.keys(SPELL_COOLDOWNS).forEach(k => {
      battleState.spells[k] = { ready: true, cooldown: 0, timer: 0 };
    });
    battleState.spells.shield.active = false;
    showScreen('battle');
    startFloor();
  }

  function startFloor() {
    if (battleState.ended) return;
    const bs = battleState;
    if (bs.floorIndex >= bs.dungeon.floors.length) {
      endDungeon(true);
      return;
    }
    const floor = bs.dungeon.floors[bs.floorIndex];
    bs.currentFloor = floor;
    bs.isBossFloor = !!floor.boss;
    const e = floor.enemy;
    bs.enemy = { ...e, hp: e.hp, maxHp: e.hp };
    bs.enemyAttackCount = 0;

    // Reset minigame stavů
    simonState = {};
    colorState = {};
    gridState = {};

    updateBattleUI();
    hideAllMinigames();
    startMinigame(bs.enemy.type);
  }

  function hideAllMinigames() {
    $('simonArea').classList.add('hidden');
    $('colorClashArea').classList.add('hidden');
    $('gridDefenderArea').classList.add('hidden');
  }

  function startMinigame(type) {
    if (type === 'phantom') startSimon();
    else if (type === 'archer') startColorClash();
    else startGridDefender();
  }

  // ===== UPDATE BATTLE UI =====
  function updateBattleUI() {
    const bs = battleState;
    $('battleDungeon').textContent = bs.dungeon.name;
    $('battleFloor').textContent = `Patro ${bs.floorIndex + 1}/${bs.dungeon.floors.length}`;
    $('battlePlayerHpText').textContent = bs.playerHp;
    $('battlePlayerMaxHp').textContent = bs.maxPlayerHp;
    $('battlePlayerHpBar').style.width = (bs.playerHp / bs.maxPlayerHp * 100) + '%';
    if (bs.enemy) {
      $('enemyFace').textContent = bs.enemy.face;
      $('enemyName').textContent = bs.enemy.name;
      const typeLabel = { phantom: '👻 Simon', archer: '🏹 Barvy', tank: '🛡️ Karty' }[bs.enemy.type] || '';
      $('enemyTypeBadge').textContent = typeLabel;
      $('enemyTypeBadge').className = 'enemy-type-badge ' + (bs.enemy.type || 'phantom');
      $('battleEnemyHpText').textContent = bs.enemy.hp;
      $('battleEnemyMaxHp').textContent = bs.enemy.maxHp;
      $('battleEnemyHpBar').style.width = (bs.enemy.hp / bs.enemy.maxHp * 100) + '%';
    }
  }

  // ===== SIMON SAYS =====
  const SIMON_SYMBOLS = ['⚡', '🔥', '💧', '🌿', '💎', '☀️'];
  const SIMON_COLORS = ['#e94560', '#f1c40f', '#4a7dff', '#2ecc71', '#9b59b6', '#e67e22'];

  function startSimon() {
    $('simonArea').classList.remove('hidden');
    const floor = battleState.currentFloor;
    const level = floor.enemy.level || 1;
    const seqLen = Math.min(2 + Math.floor(level / 2), 6);
    const numCells = Math.min(3 + Math.floor(level / 3), 6);

    // Vybereme symboly pro tuto hru
    const symbols = shuffle([...SIMON_SYMBOLS]).slice(0, numCells);
    simonState = {
      sequence: [], playerIndex: 0, showing: true, inputEnabled: false,
      symbols, numCells, seqLen, skipped: false
    };

    // Vygeneruj sekvenci
    for (let i = 0; i < seqLen; i++) {
      simonState.sequence.push(rand(0, numCells - 1));
    }

    // Vykresli grid se symboly
    $('simonGrid').innerHTML = symbols.map((sym, i) =>
      `<div class="simon-cell" data-idx="${i}" style="background:${SIMON_COLORS[i]}" onclick="game.simonClick(${i})"><span style="font-size:28px;pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%">${sym}</span></div>`
    ).join('');
    $('simonPrompt').textContent = '👀 Zapamatuj si sekvenci!';
    updateSimonProgress();

    // Skip tlačítko
    let skipBtn = $('simonSkip');
    if (!skipBtn) {
      skipBtn = document.createElement('button');
      skipBtn.id = 'simonSkip';
      skipBtn.className = 'btn btn-secondary';
      skipBtn.textContent = '⏭ Přeskočit animaci';
      skipBtn.addEventListener('click', () => skipSimonAnimation());
      $('simonGrid').parentNode.insertBefore(skipBtn, $('simonGrid').nextSibling);
    }
    skipBtn.classList.remove('hidden');

    // Přehrát sekvenci
    let delay = Math.max(150, 300 - level * 15);
    simonState.playing = true;
    simonState.showing = true;
    simonState.delay = delay;
    playSimonSequence(0, delay);
  }

  function skipSimonAnimation() {
    if (!simonState.showing) return;
    simonState.showing = false;
    simonState.inputEnabled = true;
    simonState.skipped = true;
    $('simonPrompt').textContent = '🎯 Zopakuj sekvenci!';
    const skipBtn = $('simonSkip');
    if (skipBtn) skipBtn.classList.add('hidden');
    const cells = document.querySelectorAll('.simon-cell');
    cells.forEach(c => c.classList.remove('lit'));
  }

  function playSimonSequence(idx, delay) {
    if (!simonState.showing) return; // bylo přeskočeno
    if (idx >= simonState.sequence.length) {
      simonState.showing = false;
      simonState.inputEnabled = true;
      $('simonPrompt').textContent = '🎯 Zopakuj sekvenci!';
      const skipBtn = $('simonSkip');
      if (skipBtn) skipBtn.classList.add('hidden');
      return;
    }
    initAudio();
    const cells = document.querySelectorAll('.simon-cell');
    const cellIdx = simonState.sequence[idx];
    cells.forEach(c => c.classList.remove('lit'));
    cells[cellIdx].classList.add('lit');
    // Audio tón
    const freq = SIMON_FREQS[cellIdx % SIMON_FREQS.length];
    playTone(freq, 0.15, 'sine', 0.12);

    setTimeout(() => {
      cells.forEach(c => c.classList.remove('lit'));
      setTimeout(() => playSimonSequence(idx + 1, delay), 80);
    }, delay);
  }

  function simonClick(idx) {
    if (!simonState.inputEnabled || simonState.showing) return;
    initAudio();
    const cells = document.querySelectorAll('.simon-cell');
    cells[idx].classList.add('active');
    setTimeout(() => cells[idx].classList.remove('active'), 150);
    // Audio při ťuknutí
    playTone(SIMON_FREQS[idx % SIMON_FREQS.length], 0.12, 'sine', 0.10);

    if (idx !== simonState.sequence[simonState.playerIndex]) {
      // Chyba
      simonState.inputEnabled = false;
      sfxPlayerHit();
      enemyHitsPlayer();
      return;
    }
    simonState.playerIndex++;
    updateSimonProgress();
    if (simonState.playerIndex >= simonState.sequence.length) {
      // Úspěch
      simonState.inputEnabled = false;
      sfxSuccess();
      playerHitsEnemy();
    }
  }

  function updateSimonProgress() {
    $('simonProgress').textContent = `${simonState.playerIndex}/${simonState.sequence.length}`;
  }

  // ===== COLOR CLASH =====
  function startColorClash() {
    $('colorClashArea').classList.remove('hidden');
    const floor = battleState.currentFloor;
    const level = floor.enemy.level || 1;
    const speed = Math.max(0.8, 3.0 - level * 0.3);
    const colors = ['red', 'blue', 'green', 'yellow'];

    const arena = $('colorArena');
    arena.innerHTML = '';

    // Player zone na spodku
    const playerZone = document.createElement('div');
    playerZone.style.cssText = 'position:absolute;bottom:10px;left:10px;right:10px;height:30px;border:2px dashed #4a7dff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#8888aa';
    playerZone.textContent = '⬆️ Sem ťukej barvy!';
    arena.appendChild(playerZone);

    colorState = {
      active: true, speed, colors, arena,
      projectile: null, playerZone
    };

    spawnColorProjectile();
  }

  function spawnColorProjectile() {
    if (!colorState.active) return;
    const arena = colorState.arena;
    const w = arena.offsetWidth || 200;
    const col = colorState.colors[rand(0, 3)];
    const x = rand(20, w - 56);
    const y = -40;

    // Smaž starý
    if (colorState.projectile && colorState.projectile.parentNode) {
      colorState.projectile.remove();
    }

    const el = document.createElement('div');
    el.className = 'color-projectile ' + col;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.dataset.color = col;
    arena.appendChild(el);
    colorState.projectile = el;
    colorState.projectileY = y;
    colorState.projectileSpeed = colorState.speed;
    colorState.currentColor = col;
  }

  function updateColorClash() {
    if (!colorState.active || !colorState.projectile) return;
    const arenaH = colorState.arena.offsetHeight || 300;
    colorState.projectileY += colorState.speed;
    colorState.projectile.style.top = colorState.projectileY + 'px';

    // Dorazil ke dnu?
    if (colorState.projectileY > arenaH - 50) {
      // Minul
      colorState.active = false;
      if (colorState.projectile && colorState.projectile.parentNode) {
        colorState.projectile.remove();
      }
      enemyHitsPlayer();
    }
  }

  function colorInput(color) {
    if (!colorState.active) return;
    if (color === colorState.currentColor) {
      // Správně — exploze!
      colorState.active = false;
      if (colorState.projectile && colorState.projectile.parentNode) {
        // Exploze
        const el = colorState.projectile;
        el.style.transition = 'transform 0.2s, opacity 0.2s';
        el.style.transform = 'scale(2.5)';
        el.style.opacity = '0';
        el.style.border = '3px solid #fff';
        setTimeout(() => el.remove(), 200);
      }
      sfxHit();
      playerHitsEnemy();
    }
  }

  // ===== GRID DEFENDER =====
  function startGridDefender() {
    $('gridDefenderArea').classList.remove('hidden');
    const floor = battleState.currentFloor;
    const level = floor.enemy.level || 1;
    const numOptions = Math.min(2 + Math.floor(level / 2), 5);
    const enemyPower = 2 + level + rand(0, level);

    const myPower = 1 + Math.floor((getHeroStats().damage) / 2);
    // Vygenerujeme možnosti pro hráče
    const options = [];
    for (let i = 0; i < numOptions; i++) {
      let val = myPower + rand(-1, 2);
      if (val < 1) val = 1;
      options.push({ value: val, wins: val > enemyPower, label: val > enemyPower ? '⚔️' : '💀' });
    }

    gridState = { options, enemyPower, active: true };

    $('gridArea').innerHTML = `
      <div class="grid-card enemy-card">
        <span>${enemyPower}</span>
        <span class="card-sub">👹 Nepřítel</span>
      </div>
      ${options.map((o, i) =>
        `<div class="grid-card" onclick="game.gridPick(${i})">
           <span>${o.value}</span>
           <span class="card-sub">${o.label}</span>
         </div>`
      ).join('')}
    `;
  }

  function gridPick(idx) {
    if (!gridState.active) return;
    gridState.active = false;
    const o = gridState.options[idx];
    if (o.wins) {
      sfxSuccess();
      playerHitsEnemy();
    } else {
      sfxPlayerHit();
      enemyHitsPlayer();
    }
  }

  // ===== DAMAGE =====
  function playerHitsEnemy() {
    if (battleState.ended) return;
    const bs = battleState;
    const e = bs.enemy;
    const stats = getHeroStats();
    const dmg = Math.max(1, stats.damage + rand(-1, 1));
    e.hp -= dmg;
    if (e.hp <= 0) {
      e.hp = 0;
      updateBattleUI();
      sfxEnemyDefeat();
      onEnemyDefeated();
    } else {
      updateBattleUI();
      hideAllMinigames();
      startMinigame(e.type);
    }
  }

  function enemyHitsPlayer() {
    if (battleState.ended) return;
    const bs = battleState;
    const stats = getHeroStats();

    // Shield spell blok?
    if (bs.spells.shield.active) {
      bs.spells.shield.active = false;
      // Blokováno!
      updateBattleUI();
      hideAllMinigames();
      startMinigame(bs.enemy.type);
      return;
    }

    // Blok štítem?
    if (stats.block > 0 && Math.random() * 100 < stats.block) {
      // Blokováno štítem
      updateBattleUI();
      hideAllMinigames();
      startMinigame(bs.enemy.type);
      return;
    }

    const dmg = Math.max(1, battleState.enemy.level + rand(0, 1) - stats.armor);
    bs.playerHp -= dmg;
    if (bs.playerHp <= 0) {
      bs.playerHp = 0;
      updateBattleUI();
      endDungeon(false);
    } else {
      updateBattleUI();
      hideAllMinigames();
      startMinigame(bs.enemy.type);
    }
  }

  function onEnemyDefeated() {
    const bs = battleState;
    const floor = bs.currentFloor;

    // Goldy a XP vždy
    state.hero.gold += floor.rewardGold;
    if (floor.rewardXp) {
      state.hero.xp += floor.rewardXp;
      checkLevelUp();
    }
    saveGame();

    if (floor.boss) {
      // Boss = loot overlay s výběrem
      showBossLoot(floor);
    } else {
      // Normální patro = instant odměna (už přičteno), pokračuj
      bs.floorIndex++;
      if (bs.floorIndex >= bs.dungeon.floors.length) {
        endDungeon(true);
      } else {
        startFloor();
      }
    }
  }

  // ===== REWARDS =====
  function showBossLoot(floor) {
    // Sestav možnosti lootu
    const choices = [];

    // Zlato (vždy)
    choices.push({
      name: `💰 ${floor.rewardGold} zlata`,
      desc: 'Peníze do obchodu',
      action: () => {} // už přičteno
    });

    // XP (vždy, pokud je)
    if (floor.rewardXp) {
      choices.push({
        name: `⭐ ${floor.rewardXp} XP`,
        desc: 'Zkušenost pro hrdinu',
        action: () => {}
      });
    }

    // Item drop z bosse — náhodný výběr z dostupných zbraní/zbrojí/štítů
    const wpns = ALL_WEAPONS.filter(w => w.id !== 'fists' && !hasWeapon(w.id));
    const arms = ALL_ARMORS.filter(a => a.id !== 'rags' && !hasArmor(a.id));
    const shds = ALL_SHIELDS.filter(s => s.id !== 'none' && !hasShield(s.id));
    const allLoot = [...wpns.map(w => ({ type: 'weapon', item: w })),
                      ...arms.map(a => ({ type: 'armor', item: a })),
                      ...shds.map(s => ({ type: 'shield', item: s }))];

    if (allLoot.length > 0) {
      // Vyber 2 náhodné
      const shuffled = shuffle([...allLoot]);
      const picks = shuffled.slice(0, 2);
      for (const pick of picks) {
        choices.push({
          name: `🎁 ${pick.item.name}`,
          desc: pick.type === 'weapon' ? `Útok ×${pick.item.dmgMult}` :
                pick.type === 'armor' ? `Brnění +${pick.item.armor}` :
                `Blok ${pick.item.block}%`,
          action: () => {
            if (pick.type === 'weapon') state.hero.weapon = pick.item.id;
            else if (pick.type === 'armor') state.hero.armor = pick.item.id;
            else state.hero.shield = pick.item.id;
          }
        });
      }
    }

    // Zobraz overlay s výběrem
    $('rewardTitle').textContent = `🎉 ${floor.enemy.name} poražen!`;
    // Gold a XP jako info nahoře, kliknutelné jsou jen itemy
    const goldXpItems = choices.filter(c => c.name.startsWith('💰') || c.name.startsWith('⭐'));
    const lootItems = choices.filter(c => c.name.startsWith('🎁'));
    $('rewardItems').innerHTML = `
      ${goldXpItems.map(item => `<div class="pickup-card">
        <div class="name">${item.name}</div>
        <div class="desc">${item.desc}</div>
      </div>`).join('')}
      ${lootItems.length > 0 ? `<div class="card-subtitle" style="margin-top:6px">Vyber si odměnu:</div>
        ${lootItems.map((item, i) => `<div class="pickup-card" onclick="game.claimBossLoot(${i})">
          <div class="name">${item.name}</div>
          <div class="desc">${item.desc}</div>
        </div>`).join('')}
        <button class="btn btn-primary mt-10" onclick="game.claimBossLoot(-1)">⏭ Přeskočit</button>`
      : `<button class="btn btn-primary mt-10" onclick="game.claimBossLoot(-1)">Pokračovat</button>`}
    `;
    $('#rewardOverlay').classList.remove('hidden');
    battleState.bossLootChoices = lootItems;
  }

  function claimBossLoot(idx) {
    const choices = battleState.bossLootChoices;
    $('#rewardOverlay').classList.add('hidden');
    if (idx >= 0 && choices && choices[idx] && choices[idx].action) {
      choices[idx].action();
    }
    saveGame();
    battleState.bossLootChoices = null;

    // Pokračuj
    battleState.floorIndex++;
    if (battleState.floorIndex >= battleState.dungeon.floors.length) {
      endDungeon(true);
    } else {
      startFloor();
    }
  }

  function checkLevelUp() {
    const h = state.hero;
    const needed = getXpToLevel(h.level);
    while (h.xp >= needed) {
      h.xp -= needed;
      h.level++;
      h.maxHp += 1;
      h.baseDmg += 1;
      h.hp = h.maxHp;
    }
  }

  // ===== END DUNGEON =====
  function endDungeon(won) {
    battleState.ended = true;
    if (gameLoop) { cancelAnimationFrame(gameLoop); gameLoop = null; }

    if (won) {
      if (!state.completedDungeons.includes(battleState.dungeonId)) {
        state.completedDungeons.push(battleState.dungeonId);
      }
      saveGame();
      $('resultIcon').textContent = '🎉';
      $('resultTitle').textContent = 'Dungeon dokončen!';
      $('resultMsg').textContent = `${battleState.dungeon.name} byl pokořen!`;
      $('resultGold').textContent = `💰 +${battleState.currentFloor ? battleState.currentFloor.rewardGold : 0} zlata`;
    } else {
      $('resultIcon').textContent = '💀';
      $('resultTitle').textContent = 'Padl jsi v dungeonu';
      $('resultMsg').textContent = `Prohrál jsi v ${battleState.dungeon.name} (patro ${battleState.floorIndex + 1})`;
      $('resultGold').textContent = `💰 +0 zlata (vydržel jsi ${battleState.floorIndex} pater)`;
    }
    showScreen('result');
  }

  function afterDeath() {
    showScreen('shop');
  }

  function retry() {
    const dId = battleState.dungeonId;
    startDungeon(dId);
  }

  // ===== SPELLS =====
  function useSpell(id) {
    const bs = battleState;
    const spell = bs.spells[id];
    if (!spell || !spell.ready || bs.ended) return;

    spell.ready = false;
    const cd = SPELL_COOLDOWNS[id];
    spell.timer = cd;
    updateSpellUI();

    if (id === 'fire') {
      // Přeskočí aktuální kolo - nepřítel nebere damage, ale ani hráč
      hideAllMinigames();
      simonState = {}; colorState = {}; gridState = {};
      startMinigame(bs.enemy.type);
    } else if (id === 'ice') {
      // Zpomalí tempo na 5 vteřin
      if (colorState.active) {
        colorState.speed *= 0.4;
        setTimeout(() => {
          if (colorState.active) colorState.speed /= 0.4;
        }, 5000);
      }
    } else if (id === 'heal') {
      bs.playerHp = Math.min(bs.maxPlayerHp, bs.playerHp + 1);
      updateBattleUI();
    } else if (id === 'shield') {
      bs.spells.shield.active = true;
      setTimeout(() => { bs.spells.shield.active = false; }, 5000);
    }
  }

  function updateSpellUI() {
    Object.keys(SPELL_COOLDOWNS).forEach(id => {
      const el = $('spellCd' + id.charAt(0).toUpperCase() + id.slice(1));
      if (!el) return;
      const spell = battleState.spells[id];
      if (spell.ready) {
        el.textContent = '✓';
        document.querySelector(`[data-spell="${id}"]`).disabled = false;
      } else {
        el.textContent = `${Math.ceil(spell.timer)}s`;
        document.querySelector(`[data-spell="${id}"]`).disabled = true;
      }
    });
  }

  // ===== GAME LOOP (pro animace kouzel a Color Clash) =====
  function gameLoopFn() {
    if (battleState.ended) { gameLoop = null; return; }
    const bs = battleState;

    // Spell cooldown tick (každou vteřinu)
    // Běží v reálném čase - přibližně 60fps, tickujeme každých 60 snímků
    let anyCooldown = false;
    Object.keys(SPELL_COOLDOWNS).forEach(id => {
      const spell = bs.spells[id];
      if (!spell.ready) {
        spell.timer -= 1/60;
        if (spell.timer <= 0) {
          spell.timer = 0;
          spell.ready = true;
        }
        anyCooldown = true;
      }
    });
    if (anyCooldown) updateSpellUI();

    // Color Clash update
    if (colorState.active) {
      updateColorClash();
    }

    gameLoop = requestAnimationFrame(gameLoopFn);
  }

  // ===== INIT =====
  function init() {
    state = loadSave();
    state.completedDungeons = state.completedDungeons || [];
    if (!state.hero) {
      state.hero = {
        level: 1, xp: 0, hp: 3, maxHp: 3, baseDmg: 2,
        weapon: 'fists', armor: 'rags', shield: 'none',
        gold: 0, permaMaxHp: 0, permaDmg: 0, permaArmor: 0, permaBlock: 0
      };
    }

    // Navigation
    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen(a.dataset.screen);
      });
    });

    showScreen('hero');
    gameLoop = requestAnimationFrame(gameLoopFn);
  }

  // ===== EXPORTS =====
  window.game = {
    startDungeon,
    afterDeath, retry,
    buyUpgrade, claimBossLoot,
    simonClick, colorInput, gridPick, useSpell
  };

  init();
})();
