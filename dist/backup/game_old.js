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

  // Simon frekvence v D moll
  const SIMON_FREQS = [73.42*4, 87.31*4, 110.0*4, 146.84*2, 164.81*2, 196.0*2];
  // ===== DUNGEONS =====
  const DUNGEONS = [
    // 0 — Les stínů
    {
      id: 0, name: '🌲 Les stínů', unlockReq: null,
      floors: [
        { enemy: { name: 'Mladý přízrak', type: 'phantom', hp: 5, face: '👻', level: 1 }, rewardGold: 5 },
        { enemy: { name: 'Lesní lovec', type: 'archer', hp: 8, face: '🏹', level: 1 }, rewardGold: 7 },
        { enemy: { name: 'Noční přízrak', type: 'phantom', hp: 10, face: '👻', level: 2 }, rewardGold: 10 },
        { boss: true, enemy: { name: 'Stínový pán', type: 'phantom', hp: 15, face: '👹', level: 2 }, rewardGold: 20, rewardXp: 5 }
      ]
    },
    // 1 — Hořící katakomby
    {
      id: 1, name: '🔥 Hořící katakomby', unlockReq: 0,
      floors: [
        { enemy: { name: 'Tlející střelec', type: 'archer', hp: 12, face: '🏹', level: 2 }, rewardGold: 10 },
        { enemy: { name: 'Kostěný štít', type: 'tank', hp: 15, face: '🛡️', level: 2 }, rewardGold: 12 },
        { enemy: { name: 'Ohnivý střelec', type: 'archer', hp: 18, face: '🏹', level: 3 }, rewardGold: 15 },
        { enemy: { name: 'Starý přízrak', type: 'phantom', hp: 20, face: '👻', level: 3 }, rewardGold: 18 },
        { boss: true, enemy: { name: 'Archivář zhouby', type: 'tank', hp: 28, face: '👹', level: 4 }, rewardGold: 30, rewardXp: 8 }
      ]
    },
    // 2 — Prokletá věž
    {
      id: 2, name: '🗼 Prokletá věž', unlockReq: 1,
      floors: [
        { enemy: { name: 'Zkušený střelec', type: 'archer', hp: 20, face: '🏹', level: 3 }, rewardGold: 15 },
        { enemy: { name: 'Těžký tank', type: 'tank', hp: 25, face: '🛡️', level: 3 }, rewardGold: 18 },
        { enemy: { name: 'Zlý přízrak', type: 'phantom', hp: 28, face: '👻', level: 4 }, rewardGold: 20 },
        { enemy: { name: 'Mistr střelec', type: 'archer', hp: 30, face: '🏹', level: 4 }, rewardGold: 22 },
        { boss: true, enemy: { name: 'Věžový démon', type: 'phantom', hp: 40, face: '👹', level: 5 }, rewardGold: 40, rewardXp: 12 }
      ]
    },
    // 3 — Pouštní nekropole
    {
      id: 3, name: '🏜️ Pouštní nekropole', unlockReq: 2,
      floors: [
        { enemy: { name: 'Písečný ostrostřelec', type: 'archer', hp: 26, face: '🏹', level: 4 }, rewardGold: 18 },
        { enemy: { name: 'Hliněný obr', type: 'tank', hp: 32, face: '🛡️', level: 4 }, rewardGold: 22 },
        { enemy: { name: 'Písečný přízrak', type: 'phantom', hp: 34, face: '👻', level: 5 }, rewardGold: 24 },
        { enemy: { name: 'Šílený lučištník', type: 'archer', hp: 36, face: '🏹', level: 5 }, rewardGold: 26 },
        { boss: true, enemy: { name: 'Faraonova kletba', type: 'tank', hp: 50, face: '🐍', level: 6 }, rewardGold: 50, rewardXp: 15 }
      ]
    },
    // 4 — Bažiny zapomnění
    {
      id: 4, name: '🌿 Bažiny zapomnění', unlockReq: 3,
      floors: [
        { enemy: { name: 'Jedovatý střelec', type: 'archer', hp: 32, face: '🏹', level: 5 }, rewardGold: 22 },
        { enemy: { name: 'Bahenní tank', type: 'tank', hp: 38, face: '🛡️', level: 5 }, rewardGold: 26 },
        { enemy: { name: 'Mlžný přízrak', type: 'phantom', hp: 40, face: '👻', level: 6 }, rewardGold: 28 },
        { enemy: { name: 'Zrádný lučištník', type: 'archer', hp: 42, face: '🏹', level: 6 }, rewardGold: 30 },
        { enemy: { name: 'Hlubinný strážce', type: 'tank', hp: 45, face: '🛡️', level: 6 }, rewardGold: 32 },
        { boss: true, enemy: { name: 'Král bažin', type: 'phantom', hp: 60, face: '🐊', level: 7 }, rewardGold: 60, rewardXp: 18 }
      ]
    },
    // 5 — Prales krve
    {
      id: 5, name: '🌴 Prales krve', unlockReq: 4,
      floors: [
        { enemy: { name: 'Šípkový lovec', type: 'archer', hp: 38, face: '🏹', level: 6 }, rewardGold: 28 },
        { enemy: { name: 'Kamenný tank', type: 'tank', hp: 44, face: '🛡️', level: 6 }, rewardGold: 32 },
        { enemy: { name: 'Džunglová příšera', type: 'phantom', hp: 46, face: '👻', level: 7 }, rewardGold: 34 },
        { enemy: { name: 'Pralesní střelec', type: 'archer', hp: 50, face: '🏹', level: 7 }, rewardGold: 36 },
        { enemy: { name: 'Kořenový obr', type: 'tank', hp: 52, face: '🛡️', level: 7 }, rewardGold: 38 },
        { boss: true, enemy: { name: 'Duch pralesa', type: 'phantom', hp: 72, face: '🌳', level: 8 }, rewardGold: 75, rewardXp: 22 }
      ]
    },
    // 6 — Lávové údolí
    {
      id: 6, name: '🌋 Lávové údolí', unlockReq: 5,
      floors: [
        { enemy: { name: 'Žhavý střelec', type: 'archer', hp: 46, face: '🏹', level: 7 }, rewardGold: 34 },
        { enemy: { name: 'Lávový tank', type: 'tank', hp: 52, face: '🛡️', level: 7 }, rewardGold: 38 },
        { enemy: { name: 'Popelem přízrak', type: 'phantom', hp: 56, face: '👻', level: 8 }, rewardGold: 40 },
        { enemy: { name: 'Železný lučištník', type: 'archer', hp: 60, face: '🏹', level: 8 }, rewardGold: 44 },
        { enemy: { name: 'Tavený strážce', type: 'tank', hp: 64, face: '🛡️', level: 8 }, rewardGold: 46 },
        { boss: true, enemy: { name: 'Magma behemot', type: 'tank', hp: 85, face: '🐲', level: 9 }, rewardGold: 90, rewardXp: 28 }
      ]
    },
    // 7 — Ledová propast
    {
      id: 7, name: '❄️ Ledová propast', unlockReq: 6,
      floors: [
        { enemy: { name: 'Ledový lučištník', type: 'archer', hp: 54, face: '🏹', level: 8 }, rewardGold: 40 },
        { enemy: { name: 'Mrazivý tank', type: 'tank', hp: 62, face: '🛡️', level: 8 }, rewardGold: 44 },
        { enemy: { name: 'Sněžný přízrak', type: 'phantom', hp: 66, face: '👻', level: 9 }, rewardGold: 46 },
        { enemy: { name: 'Polární střelec', type: 'archer', hp: 70, face: '🏹', level: 9 }, rewardGold: 50 },
        { enemy: { name: 'Ledová zeď', type: 'tank', hp: 74, face: '🛡️', level: 9 }, rewardGold: 52 },
        { boss: true, enemy: { name: 'Sněžný král', type: 'phantom', hp: 100, face: '🧊', level: 10 }, rewardGold: 110, rewardXp: 35 }
      ]
    },
    // 8 — Nebeská pevnost
    {
      id: 8, name: '☁️ Nebeská pevnost', unlockReq: 7,
      floors: [
        { enemy: { name: 'Nebeský lučištník', type: 'archer', hp: 64, face: '🏹', level: 9 }, rewardGold: 48 },
        { enemy: { name: 'Oblakový strážce', type: 'tank', hp: 72, face: '🛡️', level: 9 }, rewardGold: 52 },
        { enemy: { name: 'Hvězdný přízrak', type: 'phantom', hp: 76, face: '👻', level: 10 }, rewardGold: 55 },
        { enemy: { name: 'Bleskový střelec', type: 'archer', hp: 80, face: '🏹', level: 10 }, rewardGold: 58 },
        { enemy: { name: 'Nebeský titán', type: 'tank', hp: 85, face: '🛡️', level: 11 }, rewardGold: 62 },
        { enemy: { name: 'Větrný duch', type: 'phantom', hp: 88, face: '👻', level: 11 }, rewardGold: 65 },
        { boss: true, enemy: { name: 'Nebeský drak', type: 'archer', hp: 120, face: '🐉', level: 12 }, rewardGold: 140, rewardXp: 45 }
      ]
    },
    // 9 — Zřícenina času
    {
      id: 9, name: '⏳ Zřícenina času', unlockReq: 8,
      floors: [
        { enemy: { name: 'Časový střelec', type: 'archer', hp: 76, face: '🏹', level: 10 }, rewardGold: 55 },
        { enemy: { name: 'Rozpadlý tank', type: 'tank', hp: 84, face: '🛡️', level: 10 }, rewardGold: 60 },
        { enemy: { name: 'Stín času', type: 'phantom', hp: 88, face: '👻', level: 11 }, rewardGold: 64 },
        { enemy: { name: 'Zapomenutý lučištník', type: 'archer', hp: 92, face: '🏹', level: 11 }, rewardGold: 68 },
        { enemy: { name: 'Prastarý strážce', type: 'tank', hp: 96, face: '🛡️', level: 12 }, rewardGold: 72 },
        { enemy: { name: 'Časoměřič', type: 'phantom', hp: 100, face: '👻', level: 12 }, rewardGold: 76 },
        { enemy: { name: 'Rozpadlý lučištník', type: 'archer', hp: 104, face: '🏹', level: 13 }, rewardGold: 80 },
        { boss: true, enemy: { name: 'Architekt času', type: 'tank', hp: 150, face: '⌛', level: 14 }, rewardGold: 200, rewardXp: 60 }
      ]
    }
  ];
  const MAX_FLOORS = 10;
  const XP_PER_LEVEL = [5, 8, 12, 16, 22, 28, 35, 45, 55, 70, 85, 100, 120, 140, 160, 185, 210, 240, 270, 300];

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

  // ===== RARITY =====
  const RARITIES = [
    { id: 'common', name: 'Common',  mult: 1.0, weight: 50, color: '#aaaaaa', icon: '⬜' },
    { id: 'uncommon', name: 'Uncommon', mult: 1.3, weight: 30, color: '#2ecc71', icon: '🟢' },
    { id: 'rare', name: 'Rare',  mult: 1.7, weight: 15, color: '#4a7dff', icon: '🔵' },
    { id: 'epic', name: 'Epic',  mult: 2.2, weight: 5, color: '#9b59b6', icon: '🟣' }
  ];
  function rollRarity() {
    const total = RARITIES.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    for (const r of RARITIES) {
      roll -= r.weight;
      if (roll <= 0) return r.id;
    }
    return 'common';
  }
  function getRarity(id) { return RARITIES.find(r => r.id === id) || RARITIES[0]; }

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

  // ===== SAVE SLOTS =====
  const SAVE_SLOTS = [1, 2, 3];
  const CURRENT_SLOT_KEY = 'dungeonRecallActiveSlot';
  const SAVE_PREFIX = 'dungeonRecallSave_';
  let currentSlot = 1;

  // ===== SAVE SLOTS =====
  function getSaveKey(slot) { return SAVE_PREFIX + slot; }
  function getActiveSlot() {
    try { return parseInt(localStorage.getItem(CURRENT_SLOT_KEY), 10) || 1; } catch { return 1; }
  }
  function setActiveSlot(slot) {
    currentSlot = slot;
    try { localStorage.setItem(CURRENT_SLOT_KEY, String(slot)); } catch {}
  }
  function getSlotInfo(slot) {
    try {
      const raw = localStorage.getItem(getSaveKey(slot));
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.hero) return null;
      return {
        level: s.hero.level || 1,
        gold: s.hero.gold || 0,
        completed: (s.completedDungeons || []).length,
        name: s.hero.name || 'Dobrodruh'
      };
    } catch { return null; }
  }

  function loadSave() {
    currentSlot = getActiveSlot();
    // Migrace starého single-save (před zavedením slotů)
    try {
      const oldRaw = localStorage.getItem('dungeonRecallSave');
      if (oldRaw) {
        const oldSave = JSON.parse(oldRaw);
        if (oldSave && oldSave.hero) {
          // Ulož jako slot 1 a smaž starý
          localStorage.setItem(getSaveKey(1), oldRaw);
          localStorage.removeItem('dungeonRecallSave');
        }
      }
    } catch {}

    try {
      const s = JSON.parse(localStorage.getItem(getSaveKey(currentSlot)));
      if (s && s.hero) return s;
    } catch {}
    return {
      hero: {
        level: 1, xp: 0, hp: 3, maxHp: 3, baseDmg: 2,
        weapon: 'fists', armor: 'rags', shield: 'none',
        gold: 0, permaMaxHp: 0, permaDmg: 0, permaArmor: 0, permaBlock: 0,
        inventory: [],
        weaponRarity: 'common', armorRarity: 'common', shieldRarity: 'common',
        name: 'Dobrodruh'
      },
      completedDungeons: []
    };
  }
  function saveGame() {
    localStorage.setItem(getSaveKey(currentSlot), JSON.stringify({
      hero: state.hero,
      completedDungeons: state.completedDungeons
    }));
  }
  function deleteSlot(slot) {
    try { localStorage.removeItem(getSaveKey(slot)); } catch {}
    if (slot === currentSlot) {
      // Načti prázdný
      state = {
        hero: {
          level: 1, xp: 0, hp: 3, maxHp: 3, baseDmg: 2,
          weapon: 'fists', armor: 'rags', shield: 'none',
          gold: 0, permaMaxHp: 0, permaDmg: 0, permaArmor: 0, permaBlock: 0,
          inventory: [],
          weaponRarity: 'common', armorRarity: 'common', shieldRarity: 'common',
          name: 'Dobrodruh'
        },
        completedDungeons: []
      };
      saveGame();
    }
    renderHero();
  }
  function switchSlot(slot) {
    if (slot === currentSlot) return;
    saveGame(); // ulož aktuální
    setActiveSlot(slot);
    state = loadSave();
    state.completedDungeons = state.completedDungeons || [];
    migrateState();
    saveGame();
    showScreen('hero');
  }
  function migrateState() {
    if (!state.hero) return;
    if (!state.hero.inventory) state.hero.inventory = [];
    state.hero.inventory = state.hero.inventory.map(i => {
      if (!i.rarity) i.rarity = 'common';
      return i;
    });
    if (!state.hero.weaponRarity) state.hero.weaponRarity = 'common';
    if (!state.hero.armorRarity) state.hero.armorRarity = 'common';
    if (!state.hero.shieldRarity) state.hero.shieldRarity = 'common';
    if (!state.hero.name) state.hero.name = 'Dobrodruh';
  }

  // ===== HERO STATS =====
  function getHeroStats() {
    const h = state.hero;
    const wpn = ALL_WEAPONS.find(w => w.id === h.weapon) || ALL_WEAPONS[0];
    const arm = ALL_ARMORS.find(a => a.id === h.armor) || ALL_ARMORS[0];
    const shd = ALL_SHIELDS.find(s => s.id === h.shield) || ALL_SHIELDS[0];
    const wpnRar = getRarity(h.weaponRarity || 'common');
    const armRar = getRarity(h.armorRarity || 'common');
    const shdRar = getRarity(h.shieldRarity || 'common');
    return {
      maxHp: h.permaMaxHp + 3,
      damage: Math.round((h.permaDmg + h.baseDmg) * wpn.dmgMult * wpnRar.mult),
      armor: Math.round((h.permaArmor + arm.armor) * armRar.mult),
      block: Math.min(50, Math.round((h.permaBlock + shd.block) * shdRar.mult)),
      weapon: wpn, armorItem: arm, shield: shd,
      weaponRarity: wpnRar, armorRarity: armRar, shieldRarity: shdRar
    };
  }

  function getXpToLevel(level) {
    return XP_PER_LEVEL[Math.min(level - 1, XP_PER_LEVEL.length - 1)] || 100;
  }

  // ===== SAVE SLOT UI =====
  function renderSaveSlots() {
    const container = $('saveSlotArea');
    if (!container) return;
    const slotsHtml = SAVE_SLOTS.map(slot => {
      const info = getSlotInfo(slot);
      const active = slot === currentSlot ? 'save-slot-active' : '';
      if (!info) {
        // Prázdný slot - jen tlačítko vytvořit
        return `<div class="save-slot ${active}" onclick="game.switchSlot(${slot})">
          <div class="slot-label">Slot ${slot}</div>
          <div class="slot-state" style="color:#666">Prázdný</div>
          <button class="save-slot-btn" onclick="event.stopPropagation();game.deleteSlot(${slot})">🗑️</button>
        </div>`;
      }
      return `<div class="save-slot ${active}" onclick="game.switchSlot(${slot})">
        <div class="slot-label">Slot ${slot}</div>
        <div class="slot-state">${info.name} · Lv.${info.level} · 💰${info.gold} · 🏆${info.completed}</div>
        <button class="save-slot-btn" onclick="event.stopPropagation();game.deleteSlot(${slot})">🗑️</button>
      </div>`;
    }).join('');
    container.innerHTML = `<div class="section-title">💾 Save Sloty</div><div class="save-grid">${slotsHtml}</div>`;
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
    // Save slot přepínač
    renderSaveSlots();
    $('statHp').textContent = s.maxHp;
    $('statDmg').textContent = s.damage;
    $('statArmor').textContent = s.armor;
    $('statBlock').textContent = s.block + '%';
    $('equipWeapon').textContent = `${s.weapon.name} (×${s.weapon.dmgMult})`;
    $('equipWeapon').style.color = s.weaponRarity.color;
    $('equipArmor').textContent = `${s.armorItem.name} (${s.armorItem.armor})`;
    $('equipArmor').style.color = s.armorRarity.color;
    $('equipShield').textContent = `${s.shield.name} (${s.shield.block}%)`;
    $('equipShield').style.color = s.shieldRarity.color;

    // Inventář
    const inv = h.inventory || [];
    const allItems = [
      ...ALL_WEAPONS.map(w => ({ type: 'weapon', id: w.id, name: w.name, detail: `×${w.dmgMult}` })),
      ...ALL_ARMORS.map(a => ({ type: 'armor', id: a.id, name: a.name, detail: `+${a.armor}` })),
      ...ALL_SHIELDS.map(s => ({ type: 'shield', id: s.id, name: s.name, detail: `${s.block}%` }))
    ];

    // Co má aktuálně vybaveno
    const equipped = [
      { type: 'weapon', id: h.weapon },
      { type: 'armor', id: h.armor },
      { type: 'shield', id: h.shield }
    ];

    // V inventáři máme jen to, co není aktuálně equipnuté a není základní
    const baseItems = ['fists', 'rags', 'none'];
    const invItems = inv.filter(i => {
      const isEquipped = equipped.some(e => e.type === i.type && e.id === i.id);
      return !isEquipped && !baseItems.includes(i.id);
    });

    const invContainer = $('inventoryList');
    if (invItems.length === 0) {
      invContainer.innerHTML = '<div class="card-subtitle" style="padding:8px">📦 Inventář je prázdný</div>';
    } else {
      invContainer.innerHTML = invItems.map(item => {
        const info = allItems.find(a => a.type === item.type && a.id === item.id);
        if (!info) return '';
        const slotLabel = { weapon: 'Zbraň', armor: 'Brnění', shield: 'Štít' }[item.type] || '';
        const iRar = getRarity(item.rarity || 'common');
        return `<div class="equip-slot">
          <div>
            <span class="slot-item" style="color:${iRar.color}">${iRar.icon} ${info.name}</span>
            <span style="font-size:11px;color:#8888aa;margin-left:4px">${slotLabel} ${info.detail}</span>
            <span style="font-size:10px;color:${iRar.color};margin-left:4px">${iRar.name}</span>
          </div>
          <button class="btn btn-secondary" style="padding:4px 12px;width:auto;margin:0;font-size:12px"
                  onclick="game.equipItem('${item.type}','${item.id}','${item.rarity || 'common'}')">Vybavit</button>
        </div>`;
      }).join('');
    }
  }

  function equipItem(type, id, rarity = 'common') {
    const h = state.hero;
    // Aktuálně vybavený item vrať do inventáře i s jeho raritou
    const currentId = h[type];
    const currentRarityKey = type + 'Rarity';
    const currentRarity = h[currentRarityKey] || 'common';
    if (currentId && !['fists','rags','none'].includes(currentId)) {
      if (!h.inventory) h.inventory = [];
      // Pouze pokud už není v inventáři
      if (!h.inventory.some(i => i.type === type && i.id === currentId)) {
        h.inventory.push({ type, id: currentId, rarity: currentRarity });
      }
    }
    // Vybav nový
    h[type] = id;
    h[currentRarityKey] = rarity;
    // Odeber z inventáře
    h.inventory = (h.inventory || []).filter(i => !(i.type === type && i.id === id));
    saveGame();
    renderHero();
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
    // Restartuj gameLoop (po endDungeon byl zrušen)
    if (gameLoop) { cancelAnimationFrame(gameLoop); gameLoop = null; }
    gameLoop = requestAnimationFrame(gameLoopFn);
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

    // Animace příchodu nepřítele + floor zpráva
    animateEnemyEnter();
    const floorLabel = floor.boss ? `👹 Boss: ${floor.enemy.name}` : `👾 ${floor.enemy.name}`;
    showFloorMessage(`Patro ${bs.floorIndex + 1}\n${floorLabel}`);

    // Odpočet před začátkem kola
    showCountdown(3, () => {
      startMinigame(bs.enemy.type);
    });
  }

  // ===== ANIMACE =====
  function animateEnemyEnter() {
    const face = $('enemyFace');
    face.classList.remove('enemy-enter', 'enemy-idle', 'boss-idle', 'enemy-defeat');
    // Force reflow
    void face.offsetWidth;
    face.classList.add('enemy-enter');
    setTimeout(() => {
      if (battleState.isBossFloor) {
        face.classList.add('boss-idle');
      } else {
        face.classList.add('enemy-idle');
      }
    }, 500);
  }

  function animateHit(target) {
    if (target === 'enemy') {
      $('battleScreen').classList.add('hit-flash-blue');
      setTimeout(() => $('battleScreen').classList.remove('hit-flash-blue'), 300);
    } else {
      $('battleScreen').classList.add('screen-shake', 'hit-flash');
      setTimeout(() => {
        $('battleScreen').classList.remove('screen-shake', 'hit-flash');
      }, 300);
    }
  }

  function showDamageFloat(amount, side) {
    const container = $('battleScreen').querySelector('.card');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'dmg-float';
    el.textContent = `-${amount}`;
    el.style.color = side === 'player' ? '#e94560' : '#4a7dff';
    el.style.left = side === 'player' ? '20%' : '70%';
    el.style.top = '50%';
    container.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function animateEnemyDefeat() {
    const face = $('enemyFace');
    face.classList.remove('enemy-idle', 'boss-idle', 'enemy-enter');
    face.classList.add('enemy-defeat');
    // Po animaci schováme obličej
    setTimeout(() => {
      face.textContent = '💫';
      face.classList.remove('enemy-defeat');
    }, 600);
  }

  function showFloorMessage(text) {
    const existing = document.querySelector('.floor-msg');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'floor-msg';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  // ===== COUNTDOWN =====
  function showCountdown(seconds, callback) {
    let remaining = seconds;
    const el = $('countdownOverlay');
    const numEl = $('countdownNumber');
    el.classList.remove('hidden');
    numEl.textContent = remaining;
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        el.classList.add('hidden');
        if (callback) callback();
      } else {
        numEl.textContent = remaining;
        // Tón při každém tiknutí
        playTone(440 + remaining * 60, 0.15, 'sine', 0.1);
      }
    }, 1000);
    // První tón hned
    playTone(440 + remaining * 60, 0.15, 'sine', 0.1);
  }

  function hideAllMinigames() {
    $('simonArea').classList.add('minigame-hide');
    $('colorClashArea').classList.add('minigame-hide');
    $('gridDefenderArea').classList.add('minigame-hide');
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
    const floor = battleState.currentFloor;
    const level = floor.enemy.level || 1;
    const seqLen = Math.min(3 + Math.floor(level * 0.6), 7);
    const numCells = Math.min(4 + Math.floor(level / 2), 6);

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

    // Vykresli grid se symboly — dynamický počet sloupců
    const cols = Math.min(Math.ceil(numCells / 2), 3);
    $('simonGrid').style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    $('simonGrid').innerHTML = symbols.map((sym, i) =>
      `<div class="simon-cell" data-idx="${i}" style="background:${SIMON_COLORS[i]}" onclick="game.simonClick(${i})"><span style="font-size:28px;pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%">${sym}</span></div>`
    ).join('');
    $('simonPrompt').textContent = '👀 Zapamatuj si sekvenci!';
    updateSimonProgress();

    // Přehrát sekvenci
    let delay = Math.max(120, 280 - level * 18);
    simonState.playing = true;
    simonState.showing = true;
    simonState.delay = delay;
    playSimonSequence(0, delay);
  }

  function playSimonSequence(idx, delay) {
    if (idx >= simonState.sequence.length) {
      simonState.showing = false;
      simonState.inputEnabled = true;
      $('simonPrompt').textContent = '🎯 Zopakuj sekvenci!';
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
      // Úspěch — vypni input
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
    $('colorClashArea').classList.remove('minigame-hide');
    const floor = battleState.currentFloor;
    const level = floor.enemy.level || 1;
    const speed = Math.max(0.8, 3.0 - level * 0.3);
    // Přepočet: 260px / (speed * 60fps) = duration v sekundách
    const fallDuration = Math.max(1.0, 3.0 - level * 0.2).toFixed(2);
    const colors = ['red', 'blue', 'green', 'yellow'];
    const colLabels = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡' };

    const arena = $('colorArena');
    arena.innerHTML = '';
    arena.style.height = '260px';
    arena.style.position = 'relative';
    arena.style.display = 'flex';
    arena.style.flexDirection = 'column';

    // Horní část: sloupce
    const lanesDiv = document.createElement('div');
    lanesDiv.style.cssText = 'display:flex;flex:1;';
    lanesDiv.innerHTML = colors.map(c =>
      `<div class="color-lane" data-color="${c}" style="flex:1;text-align:center;padding-top:8px;font-size:24px;border-right:1px solid #1a1a3a">${colLabels[c]}</div>`
    ).join('');
    arena.appendChild(lanesDiv);

    // Dolní část: tlačítka barev naproti sloupcům
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;height:50px;';
    btnRow.innerHTML = colors.map(c => {
      const bg = c === 'red' ? '#e94560' : c === 'blue' ? '#4a7dff' : c === 'green' ? '#2ecc71' : '#f1c40f';
      return `<div style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;background:${bg};margin:2px;border-radius:6px;font-size:16px;color:#fff;font-weight:bold" onclick="game.colorInput('${c}')">${colLabels[c]}</div>`;
    }).join('');
    arena.appendChild(btnRow);

    colorState = {
      active: true, speed, fallDuration, colors, arena,
      projectile: null, currentColor: null, laneEl: null
    };

    spawnColorProjectile();
  }

  function spawnColorProjectile() {
    if (!colorState.active) return;
    const arena = colorState.arena;
    const col = colorState.colors[rand(0, 3)];

    // Smaž starý
    if (colorState.projectile && colorState.projectile.parentNode) {
      colorState.projectile.remove();
    }

    // Najdi lane podle barvy
    const lanes = arena.querySelectorAll('.color-lane');
    const laneIdx = colorState.colors.indexOf(col);
    const lane = lanes[laneIdx];
    if (!lane) { setTimeout(() => spawnColorProjectile(), 100); return; }
    const laneRect = lane.getBoundingClientRect();
    const arenaRect = arena.getBoundingClientRect();
    const laneX = laneRect.left - arenaRect.left + laneRect.width / 2 - 18;

    const el = document.createElement('div');
    el.className = 'color-projectile';
    el.style.left = laneX + 'px';
    el.style.top = '0px';
    el.style.background = col === 'red' ? '#e94560' : col === 'blue' ? '#4a7dff' : col === 'green' ? '#2ecc71' : '#f1c40f';
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid #fff';
    el.style.position = 'absolute';
    el.style.transition = `top ${colorState.fallDuration}s linear`;
    el.dataset.color = col;
    // Když doletí ke dnu — zranění
    el.addEventListener('transitionend', () => {
      if (colorState.active && colorState.projectile === el) {
        colorState.active = false;
        el.remove();
        enemyHitsPlayer();
      }
    });
    arena.appendChild(el);
    colorState.projectile = el;
    colorState.currentColor = col;

    // Animace pádu
    requestAnimationFrame(() => {
      el.style.top = '210px';
    });
  }

  function updateColorClash() {
    // Nepotřebujeme — projectile pád řeší CSS transition + transitionend
  }

  function colorInput(color) {
    if (!colorState.active) return;
    if (color === colorState.currentColor) {
      // Správně — exploze!
      colorState.active = false;
      if (colorState.projectile && colorState.projectile.parentNode) {
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

  // ===== GRID DEFENDER (matematické příklady) =====
  function startGridDefender() {
    $('gridDefenderArea').classList.remove('minigame-hide');
    const floor = battleState.currentFloor;
    const level = floor.enemy.level || 1;
    const numOptions = Math.min(3 + Math.floor(level / 2), 6);
    const maxNum = 5 + level * 2;

    // Boss ukáže náhodný výsledek
    const target = rand(3, maxNum);
    const ops = ['+', '-', '×'];
    const options = [];
    const usedExprs = new Set();

    // Správná odpověď
    const correctOp = ops[rand(0, 2)];
    let a, b, expr, result;
    for (let tries = 0; tries < 50; tries++) {
      if (correctOp === '+') { a = rand(1, target - 1); b = target - a; expr = `${a}+${b}`; result = a + b; }
      else if (correctOp === '-') { a = rand(target + 1, target + maxNum); b = a - target; expr = `${a}-${b}`; result = a - b; }
      else { // ×
        const factors = [];
        for (let f = 1; f <= Math.sqrt(target); f++) { if (target % f === 0) factors.push(f); }
        if (factors.length > 1) {
          a = factors[rand(1, factors.length - 1)]; b = target / a; expr = `${a}×${b}`; result = a * b;
        } else { a = rand(1, 3); b = target; expr = `${a}×${b}`; result = a * b; } // fallback
      }
      if (!usedExprs.has(expr) && result === target) { usedExprs.add(expr); break; }
    }
    options.push({ value: result, expr, wins: true });

    // Špatné odpovědi
    for (let i = 1; i < numOptions; i++) {
      for (let tries = 0; tries < 50; tries++) {
        const op = ops[rand(0, 2)];
        let ba, bb, bexpr, bres;
        if (op === '+') { ba = rand(1, maxNum); bb = rand(1, maxNum); bexpr = `${ba}+${bb}`; bres = ba + bb; }
        else if (op === '-') { ba = rand(1, maxNum * 2); bb = rand(1, ba - 1); bexpr = `${ba}-${bb}`; bres = ba - bb; }
        else { ba = rand(1, 5); bb = rand(1, 5); bexpr = `${ba}×${bb}`; bres = ba * bb; }
        if (!usedExprs.has(bexpr) && bres !== target) {
          usedExprs.add(bexpr);
          options.push({ value: bres, expr: bexpr, wins: false });
          break;
        }
      }
    }

    shuffle(options);
    gridState = { options, target, active: true };

    $('gridArea').innerHTML = `
      <div class="grid-info">
        <span class="grid-time" id="gridTimer">5s</span>
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

    // Časovač 5s
    gridState.timer = 5;
    const timerEl = $('gridTimer');
    if (timerEl) {
      gridState.timerInterval = setInterval(() => {
        gridState.timer--;
        timerEl.textContent = gridState.timer + 's';
        if (gridState.timer <= 0) {
          clearInterval(gridState.timerInterval);
          gridState.timerInterval = null;
          if (gridState.active) {
            gridState.active = false;
            sfxPlayerHit();
            enemyHitsPlayer();
          }
        }
      }, 1000);
    }
  }

  function gridPick(idx) {
    if (!gridState.active) return;
    gridState.active = false;
    if (gridState.timerInterval) {
      clearInterval(gridState.timerInterval);
      gridState.timerInterval = null;
    }
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

    // Animace
    animateHit('enemy');
    showDamageFloat(dmg, 'enemy');

    if (e.hp <= 0) {
      e.hp = 0;
      updateBattleUI();
      sfxEnemyDefeat();
      animateEnemyDefeat();
      // Počkáme na dokončení animace, pak reward
      setTimeout(() => onEnemyDefeated(), 600);
    } else {
      updateBattleUI();
      hideAllMinigames();
      // Krátká pauza před dalším kolem
      setTimeout(() => startMinigame(e.type), 500);
    }
  }

  function enemyHitsPlayer() {
    if (battleState.ended) return;
    const bs = battleState;
    const stats = getHeroStats();

    // Shield spell blok?
    if (bs.spells.shield.active) {
      bs.spells.shield.active = false;
      // Animace bloku
      $('battleScreen').classList.add('hit-flash-blue');
      setTimeout(() => $('battleScreen').classList.remove('hit-flash-blue'), 300);
      showDamageFloat(0, 'player');
      updateBattleUI();
      hideAllMinigames();
      startMinigame(bs.enemy.type);
      return;
    }

    // Blok štítem?
    if (stats.block > 0 && Math.random() * 100 < stats.block) {
      // Blokováno štítem
      $('battleScreen').classList.add('hit-flash-blue');
      setTimeout(() => $('battleScreen').classList.remove('hit-flash-blue'), 300);
      showDamageFloat(0, 'player');
      updateBattleUI();
      hideAllMinigames();
      startMinigame(bs.enemy.type);
      return;
    }

    const dmg = Math.max(1, battleState.enemy.level + rand(0, 1) - stats.armor);

    // Animace zásahu na hráče
    animateHit('player');
    showDamageFloat(dmg, 'player');

    bs.playerHp -= dmg;
    if (bs.playerHp <= 0) {
      bs.playerHp = 0;
      updateBattleUI();
      endDungeon(false);
    } else {
      updateBattleUI();
      hideAllMinigames();
      setTimeout(() => startMinigame(bs.enemy.type), 300);
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
  function hasWeapon(id) {
    const h = state.hero;
    if (h.weapon === id) return true;
    return (h.inventory || []).some(i => i.type === 'weapon' && i.id === id);
  }
  function hasArmor(id) {
    const h = state.hero;
    if (h.armor === id) return true;
    return (h.inventory || []).some(i => i.type === 'armor' && i.id === id);
  }
  function hasShield(id) {
    const h = state.hero;
    if (h.shield === id) return true;
    return (h.inventory || []).some(i => i.type === 'shield' && i.id === id);
  }

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

    // Item drop z bosse — 2 náhodné itemy s RNG raritou
    const wpnPool = ALL_WEAPONS.filter(w => w.id !== 'fists');
    const armPool = ALL_ARMORS.filter(a => a.id !== 'rags');
    const shdPool = ALL_SHIELDS.filter(s => s.id !== 'none');
    const allLoot = [
      ...wpnPool.map(w => ({ type: 'weapon', item: w })),
      ...armPool.map(a => ({ type: 'armor', item: a })),
      ...shdPool.map(s => ({ type: 'shield', item: s }))
    ];

    const shuffled = shuffle([...allLoot]);
    const picks = shuffled.slice(0, 2);
    for (const pick of picks) {
      const rarity = rollRarity();
      const rar = getRarity(rarity);
      choices.push({
        name: `${rar.icon} ${pick.item.name}`,
        type: pick.type,
        itemId: pick.item.id,
        rarity: rarity,
        desc: `${rar.name} — ${pick.type === 'weapon' ? `Útok ×${pick.item.dmgMult}` :
               pick.type === 'armor' ? `Brnění +${pick.item.armor}` :
               `Blok ${pick.item.block}%`}`
      });
    }

    // Zobraz overlay s výběrem
    $('rewardTitle').textContent = `🎉 ${floor.enemy.name} poražen!`;
    const goldXpItems = choices.filter(c => c.name.startsWith('💰') || c.name.startsWith('⭐'));
    const lootItems = choices.filter(c => c.itemId);
    $('rewardItems').innerHTML = `
      ${goldXpItems.map(item => `<div class="pickup-card">
        <div class="name">${item.name}</div>
        <div class="desc">${item.desc}</div>
      </div>`).join('')}
      ${lootItems.length > 0 ? `<div class="card-subtitle" style="margin-top:6px">Vyber si odměnu (uloží se do inventáře):</div>
        ${lootItems.map((item, i) => {
          const rar = getRarity(item.rarity || 'common');
          return `<div class="pickup-card" style="border:1px solid ${rar.color}" onclick="game.claimBossLoot(${i})">
          <div class="name" style="color:${rar.color}">${rar.icon} ${item.name}</div>
          <div class="desc" style="color:${rar.color}">${item.desc}</div>
        </div>`;
        }).join('')}
        <button class="btn btn-primary mt-10" onclick="game.claimBossLoot(-1)">⏭ Přeskočit</button>`
      : `<button class="btn btn-primary mt-10" onclick="game.claimBossLoot(-1)">Pokračovat</button>`}
    `;
    $('rewardOverlay').classList.remove('hidden');
    battleState.bossLootChoices = lootItems;
  }

  function claimBossLoot(idx) {
    const choices = battleState.bossLootChoices;
    $('rewardOverlay').classList.add('hidden');
    if (idx >= 0 && choices && choices[idx]) {
      const pick = choices[idx];
      // Ulož do inventáře i s raritou
      if (!state.hero.inventory) state.hero.inventory = [];
      // Neukládat duplicity (už vlastněný item)
      const already = state.hero.inventory.some(i => i.type === pick.type && i.id === pick.itemId);
      if (!already) {
        state.hero.inventory.push({ type: pick.type, id: pick.itemId, rarity: pick.rarity || 'common' });
      }
    }
    saveGame();
    battleState.bossLootChoices = null;

    // Boss je mrtvý — dungeon je hotový, rovnou na hrdinu
    battleState.ended = true;
    if (!state.completedDungeons.includes(battleState.dungeonId)) {
      state.completedDungeons.push(battleState.dungeonId);
    }
    saveGame();
    showScreen('hero');
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
    if (!bs.spells) { gameLoop = requestAnimationFrame(gameLoopFn); return; }

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
    migrateState();

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
    simonClick, colorInput, gridPick, useSpell,
    equipItem,
    switchSlot, deleteSlot
  };

  init();
})();
