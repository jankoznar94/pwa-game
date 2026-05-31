(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ===== AUDIO =====
  let audioCtx = null;
  let _audioReady = false;
  function initAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      if (audioCtx.state==='suspended') audioCtx.resume();
      _audioReady = true;
      // Pokud čeká BGM na spuštění, spustíme
      if (bgmState && bgmState._pending && !bgmState.playing) {
        bgmState._pending = false;
        startBGM();
      }
    } catch(e) {}
  }
  function playTone(f,d,t='sine',v=0.15) { try{initAudio();if (!_audioReady||!audioCtx) return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d)}catch{}}
  const sfxHit=()=>playTone(220,0.12,'sawtooth',0.08);
  const sfxPlayerHit=()=>playTone(140,0.2,'square',0.10);
  const sfxSuccess=()=>{playTone(523,0.1,'sine',0.12);setTimeout(()=>playTone(659,0.1,'sine',0.12),80);setTimeout(()=>playTone(784,0.15,'sine',0.14),160);};
  const sfxEnemyDefeat=()=>{playTone(440,0.08,'square',0.1);setTimeout(()=>playTone(330,0.08,'square',0.1),80);setTimeout(()=>playTone(220,0.15,'square',0.08),160);};
  const sfxBossDefeat=()=>{playTone(523,0.15,'sine',0.14);setTimeout(()=>playTone(659,0.15,'sine',0.14),100);setTimeout(()=>playTone(784,0.15,'sine',0.16),200);setTimeout(()=>playTone(1047,0.3,'sine',0.18),300);};
  const sfxLevelUp=()=>{playTone(392,0.1,'sine',0.12);setTimeout(()=>playTone(523,0.1,'sine',0.12),100);setTimeout(()=>playTone(659,0.12,'sine',0.14),200);setTimeout(()=>playTone(784,0.15,'sine',0.16),300);};

  // ===== BACKGROUND MUSIC =====
  let bgmState = { playing: false, drone: null };
  const BGM_VOL = 0.035;

  function bgmPlay(notes, when, durSec) {
    // notes může být číslo (jedna nota) nebo pole (akord)
    const freqs = Array.isArray(notes) ? notes : [notes];
    freqs.forEach(freq => {
      if (freq <= 0) return;
      try {
        initAudio();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(BGM_VOL, when);
        g.gain.setValueAtTime(BGM_VOL, when + durSec - 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, when + durSec);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(when);
        o.stop(when + durSec);
      } catch(e) {}
    });
  }

  // Girei (Pain's Theme) — hlavní motiv v E moll
  // triangle wave, pomalé dungeonové aranžmá
  const bgmNotes = [
    // Intro — tři krátké noty
    { f: [494,659,587], dur: 0.5 }, // B4 E5 D5
    { f: 0, dur: 0.3 },
    // Hlavní melodie 1
    { f: 659, dur: 0.4 }, // E5
    { f: 587, dur: 0.3 }, // D5
    { f: 494, dur: 0.5 }, // B4
    { f: 0, dur: 0.2 },
    { f: 392, dur: 0.3 }, // G4
    { f: 440, dur: 0.3 }, // A4
    { f: 494, dur: 0.5 }, // B4
    { f: 0, dur: 0.2 },
    { f: 659, dur: 0.4 }, // E5
    { f: 587, dur: 0.3 }, // D5
    { f: 523, dur: 0.3 }, // C5
    { f: 494, dur: 0.5 }, // B4
    { f: 0, dur: 0.2 },
    { f: 440, dur: 0.3 }, // A4
    { f: 494, dur: 0.3 }, // B4
    { f: 587, dur: 0.5 }, // D5
    { f: 0, dur: 0.2 },
    { f: 587, dur: 0.3 }, // D5
    { f: 523, dur: 0.3 }, // C5
    { f: 494, dur: 0.4 }, // B4
    { f: 440, dur: 0.3 }, // A4
    { f: 392, dur: 0.6 }, // G4 — delší
    { f: 0, dur: 0.3 },
    // Hlavní melodie 2 (variace)
    { f: 659, dur: 0.4 }, // E5
    { f: 587, dur: 0.3 }, // D5
    { f: 494, dur: 0.5 }, // B4
    { f: 0, dur: 0.2 },
    { f: 392, dur: 0.3 }, // G4
    { f: 440, dur: 0.3 }, // A4
    { f: 494, dur: 0.5 }, // B4
    { f: 0, dur: 0.2 },
    { f: 659, dur: 0.4 }, // E5
    { f: 587, dur: 0.3 }, // D5
    { f: 523, dur: 0.3 }, // C5
    { f: 494, dur: 0.5 }, // B4
    { f: 0, dur: 0.2 },
    { f: 392, dur: 0.3 }, // G4
    { f: 349, dur: 0.3 }, // F4
    { f: 330, dur: 0.5 }, // E4
    { f: 0, dur: 1.0 }, // pauza
  ];
  const BGM_LOOP_DUR = bgmNotes.reduce((s, n) => s + n.dur, 0);

  function scheduleBGMLoop(fromTime) {
    if (!bgmState.playing || !audioCtx) return;
    let t = 0;
    for (const note of bgmNotes) {
      if (note.f !== 0) {
        bgmPlay(note.f, fromTime + t, note.dur);
      }
      t += note.dur;
    }
    bgmState._nextTimer = setTimeout(() => {
      scheduleBGMLoop(fromTime + BGM_LOOP_DUR);
    }, 0);
  }

  function startDrone() {
    try {
      initAudio();
      // E2 drone (pedál)
      const o1 = audioCtx.createOscillator();
      const g1 = audioCtx.createGain();
      o1.type = 'sine';
      o1.frequency.value = 82.4; // E2
      g1.gain.value = 0.008;
      o1.connect(g1);
      g1.connect(audioCtx.destination);
      o1.start();
      // B2 drone (kvinta)
      const o2 = audioCtx.createOscillator();
      const g2 = audioCtx.createGain();
      o2.type = 'sine';
      o2.frequency.value = 123.5; // B2
      g2.gain.value = 0.006;
      o2.connect(g2);
      g2.connect(audioCtx.destination);
      o2.start();
      bgmState.drone = { osc1: o1, gain1: g1, osc2: o2, gain2: g2 };
    } catch(e) {}
  }

  function stopDrone() {
    if (bgmState.drone) {
      const d = bgmState.drone;
      const fade = audioCtx.currentTime + 0.3;
      try {
        d.gain1.gain.exponentialRampToValueAtTime(0.001, fade);
        d.osc1.stop(fade + 0.1);
        d.gain2.gain.exponentialRampToValueAtTime(0.001, fade);
        d.osc2.stop(fade + 0.1);
      } catch(e) {}
      bgmState.drone = null;
    }
  }

  function startBGM() {
    if (bgmState.playing) return;
    bgmState.playing = true;
    startDrone();
    // Naplánovat loop od aktuální audio časové osy + malý offset
    try {
      initAudio();
      const now = audioCtx.currentTime + 0.1;
      scheduleBGMLoop(now);
    } catch(e) {}
  }

  function stopBGM() {
    bgmState.playing = false;
    if (bgmState._nextTimer) { clearTimeout(bgmState._nextTimer); bgmState._nextTimer = null; }
    // Drone ztlumíme, ostatní oscillatory dozní samy podle schedule
    stopDrone();
  }

  // ===== SPELLS =====
  const SKILLS = [
    { id:'fireball', name:'Fireball', icon:'🔥', dungeon:'simon', dungeonName:'🌲 Les stínů', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*2+3} dmg + ${t} DoT`, baseCd:6, cdR:0.3, minLevel:1 },
    { id:'shield', name:'Štít', icon:'🛡️', dungeon:'color', dungeonName:'🏜️ Pouštní nekropole', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*10+10}% blok`, baseCd:9, cdR:0.3, minLevel:3 },
    { id:'heal', name:'Léčení', icon:'💚', dungeon:'grid', dungeonName:'⏳ Zřícenina času', maxLv:10, desc:t=>t===0?'Zamčeno':`+${t+2} HP`, baseCd:12, cdR:0.5, minLevel:5 },
    { id:'crit', name:'Kritik', icon:'🗡️', dungeon:'simon', dungeonName:'🌲 Les stínů', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*5+10}% crit`, baseCd:0, cdR:0, minLevel:2 },
    { id:'clone', name:'Klon', icon:'🌀', dungeon:'color', dungeonName:'🏜️ Pouštní nekropole', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*8+10}% klon`, baseCd:14, cdR:0.5, minLevel:4 },
    { id:'freeze', name:'Mráz', icon:'❄️', dungeon:'grid', dungeonName:'⏳ Zřícenina času', maxLv:10, desc:t=>t===0?'Zamčeno':`${t+1}k zpomalení`, baseCd:10, cdR:0.4, minLevel:6 },
    { id:'shadow', name:'Stín', icon:'🌑', dungeon:'simon', dungeonName:'🌲 Les stínů', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*4+5} dmg`, baseCd:10, cdR:0.4, minLevel:8 },
  ];
  const SKILL_MAP = {}; SKILLS.forEach(s => SKILL_MAP[s.id] = s);
  function skillXpToLevel(lv) { return 3 + lv * 2; }

  // ===== ITEMS (WEAPONS/ARMOR) =====
  const ITEMS = [
    { id:'fists', name:'Pěsti', type:'weapon', baseDmg:2, bonusHp:0, icon:'👊' },
    { id:'rags', name:'Hadry', type:'armor', baseDmg:0, bonusHp:0, icon:'rag' },
    { id:'dagger', name:'Dýka', type:'weapon', baseDmg:5, bonusHp:0, cost:15, icon:'🗡️' },
    { id:'sword', name:'Meč', type:'weapon', baseDmg:8, bonusHp:0, cost:30, icon:'⚔️' },
    { id:'flameSword', name:'Plamenový meč', type:'weapon', baseDmg:12, bonusHp:0, cost:60, icon:'🔥' },
    { id:'chainmail', name:'Kroužková pletva', type:'armor', baseDmg:0, bonusHp:20, cost:25, icon:'🛡️' },
    { id:'plate', name:'Plná zbroj', type:'armor', baseDmg:0, bonusHp:40, cost:50, icon:'🛡️' },
  ];
  const ITEM_MAP = {}; ITEMS.forEach(i => ITEM_MAP[i.id] = i);

  // ===== LOCATIONS (MAP) =====
  const DIRECTIONS = ['⬆️','⬇️','⬅️','➡️'];
  const LOCATIONS = [
    { id:0, name:'🌲 Stínový les', icon:'🌲', monsters:5, xpReward:100, bossXp:200, boss:{name:'Stínový pán',face:'👹',hp:10}, skill:'fireball', minSkill:0, reward:{gold:5,weapon:'dagger'} },
    { id:1, name:'🏜️ Pouštní brána', icon:'🏜️', monsters:7, xpReward:140, bossXp:240, boss:{name:'Faraonova kletba',face:'🐍',hp:14}, skill:'shield', minSkill:0, reward:{gold:12} },
    { id:2, name:'⏳ Časová zřícenina', icon:'⌛', monsters:8, xpReward:180, bossXp:300, boss:{name:'Architekt času',face:'⌛',hp:16}, skill:'heal', minSkill:3, reward:{gold:15,weapon:'sword'} },
    { id:3, name:'🎯 Temná aréna', icon:'🎯', monsters:9, xpReward:250, bossXp:400, boss:{name:'Mistr terčů',face:'🎯',hp:18}, skill:'crit', minSkill:4, reward:{gold:20} },
    { id:4, name:'🔊 Jeskyně ozvěn', icon:'🔊', monsters:10, xpReward:300, bossXp:500, boss:{name:'Šepotající hlas',face:'🔊',hp:20}, skill:'clone', minSkill:5, reward:{gold:25,armor:'chainmail'} },
    { id:5, name:'🧩 Labyrint zákonů', icon:'🧩', monsters:11, xpReward:350, bossXp:600, boss:{name:'Architekt zákonů',face:'🧩',hp:22}, skill:'freeze', minSkill:6, reward:{gold:30} },
    { id:6, name:'🔄 Zrcadlový sál', icon:'🔄', monsters:12, xpReward:400, bossXp:800, boss:{name:'Zrcadlový král',face:'🔄',hp:25}, skill:'shadow', minSkill:7, reward:{gold:40,weapon:'flameSword',armor:'plate'} },
  ];

  // ===== STATE =====
  let state = {};
  let mapBattleState = {};
  let trainingState = {};
  let minigameState = {};
  let _activeIntervals = [];

  function cleanupTimers() {
    document.body.classList.remove('battle-active');
    _activeIntervals.forEach(id => { try { clearInterval(id); } catch {} }); _activeIntervals = [];
    if (minigameState.timerInterval) { clearInterval(minigameState.timerInterval); minigameState.timerInterval = null; }
    if (minigameState.countdownInterval) { clearInterval(minigameState.countdownInterval); minigameState.countdownInterval = null; }
    ['simonTimeout'].forEach(k => { if (minigameState[k]) { clearTimeout(minigameState[k]); delete minigameState[k]; } });
    if (mapBattleState && mapBattleState._attackTimer) { clearTimeout(mapBattleState._attackTimer); mapBattleState._attackTimer = null; }
    if (mapBattleState && mapBattleState._sequenceTimer) { clearTimeout(mapBattleState._sequenceTimer); mapBattleState._sequenceTimer = null; }
    if (mapBattleState && mapBattleState._ringTimer) { clearTimeout(mapBattleState._ringTimer); mapBattleState._ringTimer = null; }
    if (mapBattleState && mapBattleState._attackWindowTimer) { clearTimeout(mapBattleState._attackWindowTimer); mapBattleState._attackWindowTimer = null; }
    if (mapBattleState && mapBattleState._glowTimer) { clearTimeout(mapBattleState._glowTimer); mapBattleState._glowTimer = null; }
  }

  const SAVE_KEY = 'dungeonRecallV6';
  function defaultState() {
    // ITEMS: fists (baseDmg:2), rags (bonusHp:0), dagger (baseDmg:5), sword (baseDmg:8), flameSword (baseDmg:12), chainmail (bonusHp:20), plate (bonusHp:40)
    const s = { skills:{}, skillXp:{}, hero:{level:1,xp:0,gold:0,hp:100,maxHp:100,baseDmg:12,inventory:[],equip:{weapon:'fists',armor:'rags'}}, deaths:0, wins:0,
      locationProgress:[0,0,0,0,0,0,0], bossesDefeated:[false,false,false,false,false,false,false], achievements:{} };
    SKILLS.forEach(sk => { s.skills[sk.id]=0; s.skillXp[sk.id]=0; });
    return s;
  }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.skills) return s; } catch {} return defaultState(); }
  function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function resetGame() { state = defaultState(); saveGame(); showScreen('map'); }

  // ===== SCREENS =====
  const SCREEN_IDS = { map:'mapScreen', mapBattle:'mapBattleScreen', tower:'towerScreen', hero:'heroScreen', battle:'battleScreen', result:'resultScreen', medals:'medalScreen', shop:'shopScreen', inventory:'inventoryScreen' };
  function showScreen(name) {
    cleanupTimers();
    if (name !== 'medals') { const m = $('medalScreen'); if (m) m.remove(); }
    Object.values(SCREEN_IDS).forEach(id => {
      const el = $(id);
      if (!el) return;
      if (id === SCREEN_IDS[name]) { el.classList.remove('hidden'); el.classList.add('active'); } else { el.classList.add('hidden'); el.classList.remove('active'); }
    });
    // BGM — hraje na mapě a v hero obrazovce
    if (name === 'map' || name === 'hero') {
      initAudio(); // synchronně — funguje pokud jsme v user gesture
      if (_audioReady && audioCtx && audioCtx.state === 'running') {
        startBGM();
      } else {
        // audio ještě není ready — počkáme na user interakci (nav klik)
        bgmState._pending = true;
      }
    } else {
      stopBGM();
    }
    if (name === 'map') renderMap();
    else if (name === 'tower') renderTower();
    else if (name === 'hero') renderHero();
    else if (name === 'shop') renderShop();
    else if (name === 'inventory') renderInventory();
  }

  function showMessage(msg) {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:300;background:#12122a;border:2px solid #e94560;border-radius:12px;padding:20px 30px;text-align:center;font-size:16px;font-weight:bold';
    p.textContent = msg; document.body.appendChild(p);
    setTimeout(() => { p.style.transition='opacity 0.3s'; p.style.opacity='0'; setTimeout(()=>p.remove(),300); }, 2000);
  }

  // ===== MAP =====
  function renderMap() {
    const h = state.hero;
    $('mapPlayerInfo').textContent = `❤️${h.maxHp} ⚔️${h.baseDmg} Lv.${h.level} 💰${h.gold}`;
    const done = state.bossesDefeated.filter(Boolean).length;
    $('mapProgress').textContent = `👹 Porazeno: ${done}/${LOCATIONS.length} bossů`;

    $('mapScroll').innerHTML = LOCATIONS.map((loc, i) => {
      const prevDone = i === 0 ? true : state.bossesDefeated[i-1];
      const unlocked = prevDone;
      const completed = state.bossesDefeated[i];
      const progress = state.locationProgress[i] || 0;
      const sk = SKILL_MAP[loc.skill];
      const lv = state.skills[loc.skill] || 0;
      const skillOk = lv >= loc.minSkill;
      return `<div class="map-location ${completed?'completed':!unlocked||!skillOk?'locked':''}" onclick="${(!unlocked||!skillOk)?'':`game.enterLocation(${i})`}">
        <div class="map-loc-icon">${loc.icon}</div>
        <div class="map-loc-info">
          <div class="map-loc-name">${loc.name}</div>
          <div class="map-loc-sub">${completed?'✅ Dokončeno':progress>0?`🏚️ ${progress}/${loc.monsters} nestvůr`:unlocked?skillOk?`${loc.boss.face} ${loc.boss.name} · ❤️${loc.boss.hp}`:`🔒 ${sk.icon} Lv.${loc.minSkill}`:'🔒 Odemkni předchozí'}</div>
        </div>
        <div class="map-loc-status">${completed?'✅':!unlocked||!skillOk?'🔒':progress>=loc.monsters?'👹':`${'👾'.repeat(Math.max(0,loc.monsters-progress))}${'✅'.repeat(progress)}`}</div>
      </div>`;
    }).join('');
  }

  // ===== MAP BATTLE =====
  function enterLocation(locId) {
    const loc = LOCATIONS[locId];
    if (!loc) return;
    if (state.bossesDefeated[locId]) {
      // Již dokončeno — umožníme opakování farmení
      cleanupTimers();
      startLocation(locId);
      return;
    }
    const sk = SKILL_MAP[loc.skill];
    const lv = state.skills[loc.skill] || 0;
    if (lv < loc.minSkill) { showMessage(`❌ Potřebuješ ${sk.icon} Lv.${loc.minSkill}`); return; }
    if (locId > 0 && !state.bossesDefeated[locId-1]) { showMessage('🔒 Nejdřív poraz předchozí lokaci!'); return; }

    cleanupTimers();
    startLocation(locId);
  }

  function startLocation(locId) {
    const loc = LOCATIONS[locId];
    if (!loc) return;
    const progress = state.locationProgress[locId] || 0;
    const isBoss = progress >= loc.monsters;
    // RPG HP system: hráč má pevné maxHp z atributů a itemů
    const playerMaxHp = state.hero.maxHp || 100;
    // Boss HP: monster ~50-100, boss rychleji stoupá (turn*20 + loc.boss.hp)
    const bossBaseHp = isBoss ? (progress >= loc.monsters ? 80 + Math.round(loc.boss.hp * 12) : 40 + progress * 12) : 30 + progress * 8;

    mapBattleState = {
      locId, loc, isBoss, progress,
      bossHp: bossBaseHp, maxBossHp: bossBaseHp,
      playerHp: playerMaxHp, maxPlayerHp: playerMaxHp,
      ended: false, turn: 0, isAttacking: false,
      stunned: 0, frozen: 0, dot: 0, shieldActive: null,
      _ringTimer: null, _sequenceTimer: null, _attackWindowTimer: null,
      spellCooldowns: {},
      // Sekvence: hráč musí přežít várku útoků, pak může udeřit
      sequence: [], sequenceIndex: 0, inAttackWindow: false,
      currentAttack: null, isHeavyAttack: false, isBlockAttack: false,
      isInvertedAttack: false, isWaitAttack: false, isLiarAttack: false
    };
    SKILLS.forEach(sk => { const l = state.skills[sk.id]||0; if (l>0) mapBattleState.spellCooldowns[sk.id]=0; });

    showScreen('mapBattle');
    document.body.classList.add('battle-active');
    updateMapBattleUI();
    setupMapBattleInput();
    setTimeout(() => mapBattleTurn(), 400);
  }

  function updateMapBattleUI() {
    const mb = mapBattleState;
    if (!mb.loc) return;
    if (mb.isBoss) {
      $('mbEnemyName').textContent = `${mb.loc.boss.face} ${mb.loc.boss.name}`;
      $('mbLocation').textContent = `BOSS ${mb.loc.name}`;
    } else {
      const left = mb.loc.monsters - mb.progress;
      $('mbEnemyName').textContent = `👾 Nestvůra (${left} zbývá)`;
      $('mbLocation').textContent = mb.loc.name;
    }
    const pHpPct = Math.round((mb.playerHp / mb.maxPlayerHp) * 100);
    const eHpPct = mb.isBoss ? Math.round((mb.bossHp / mb.maxBossHp) * 100) : Math.round((mb.bossHp / mb.maxBossHp) * 100);
    $('mbEnemyHp').textContent = mb.isBoss ? `❤️ ${mb.bossHp}/${mb.maxBossHp} (${eHpPct}%)` : `👾 ${mb.bossHp}/${mb.maxBossHp}`;
    // Arena HP pod panáčkem
    const arenaHp = $('mbPlayerArenaHp');
    if (arenaHp) {
      arenaHp.textContent = `❤️ ${mb.playerHp}/${mb.maxPlayerHp}`;
      arenaHp.classList.remove('hidden');
    }
    const emoji = mb.isBoss ? mb.loc.boss.face : '👾';
    const fig = $('mbFigure');
    fig.textContent = emoji;
    $('mbHint').textContent = mb.isBoss ? `Sekvence útoků — přežij a pak udeř!` : `⬆️⬇️⬅️➡️ uhni! Nestvůra ${mb.loc.monsters-mb.progress}/${mb.loc.monsters}`;

    // Spells
    const container = $('mbSpells');
    container.innerHTML = '';
    SKILLS.forEach(sk => {
      const lv = state.skills[sk.id]||0;
      if (lv === 0) return;
      const cd = mb.spellCooldowns[sk.id]||0;
      const btn = document.createElement('div');
      btn.className = 'mb-spell-btn' + (cd>0?' on-cd':'');
      btn.innerHTML = `${sk.icon}<span class="mb-spell-cd">${cd>0?cd:'✓'}</span>`;
      btn.addEventListener('click', () => castMapSpell(sk.id));
      container.appendChild(btn);
    });
  }

  function updateActionButtons() {
    const mb = mapBattleState;
    const atk = $('mbAttackBtn');
    const blk = $('mbBlockBtn');
    if (atk) { if (mb.inAttackWindow) atk.classList.add('active'); else atk.classList.remove('active'); }
    if (blk) { if (mb.isBlockAttack) blk.classList.add('active'); else blk.classList.remove('active'); }
  }

  function setupMapBattleInput() {
    const arena = $('mbArena');
    if (!arena) return;
    const old = arena._mbHandlers;
    if (old) old.forEach(h => arena.removeEventListener(h[0], h[1]));

    let startX, startY;
    const handlers = [];

    // Click handler for attack button
    const atkBtn = $('mbAttackBtn');
    if (atkBtn) {
      atkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onMapAttack();
      });
    }

    // Click handler for block button
    const blkBtn = $('mbBlockBtn');
    if (blkBtn) {
      blkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onMapBlock();
      });
    }

    const ts = (e) => { if (mapBattleState.ended) return; const t=e.touches[0]; startX=t.clientX; startY=t.clientY; };
    const te = (e) => {
      if (mapBattleState.ended || !startX) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      startX = startY = null;
      if (Math.abs(dx)<20 && Math.abs(dy)<20) { 
        // krátký tap na aréně = nic, útok jen přes ⚔️ tlačítko
        return; 
      }
      let dir;
      if (Math.abs(dy) > Math.abs(dx)) dir = dy < 0 ? '⬆️' : '⬇️';
      else dir = dx < 0 ? '⬅️' : '➡️';
      onMapDodge(dir);
    };
    arena.addEventListener('touchstart', ts); arena.addEventListener('touchend', te);
    handlers.push(['touchstart',ts], ['touchend',te]);

    const kh = (e) => {
      if (mapBattleState.ended) return;
      const map = { ArrowUp:'⬆️',ArrowDown:'⬇️',ArrowLeft:'⬅️',ArrowRight:'➡️','w':'⬆️','s':'⬇️','a':'⬅️','d':'➡️' };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); onMapDodge(dir); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onMapAttack(); }
    };
    window.addEventListener('keydown', kh);
    handlers.push(['keydown', kh]);
    arena._mbHandlers = handlers;
  }

  function getDungeonAttackChances(locId) {
    if (locId === 0) return { normal: 70, heavy: 30, block: 0, inverted: 0, wait: 0, liar: 0 };
    if (locId === 1) return { normal: 70, heavy: 20, block: 10, inverted: 0, wait: 0, liar: 0 };
    if (locId === 2) return { normal: 50, heavy: 20, block: 15, inverted: 15, wait: 0, liar: 0 };
    if (locId === 3) return { normal: 40, heavy: 15, block: 15, inverted: 15, wait: 15, liar: 0 };
    if (locId === 4) return { normal: 35, heavy: 10, block: 15, inverted: 15, wait: 25, liar: 0 };
    if (locId === 5) return { normal: 30, heavy: 10, block: 15, inverted: 15, wait: 15, liar: 15 };
    if (locId === 6) return { normal: 25, heavy: 5, block: 20, inverted: 20, wait: 15, liar: 15 };
    return { normal: 70, heavy: 20, block: 10, inverted: 0, wait: 0, liar: 0 };
  }

  function generateAttack(chances) {
    const randTotal = chances.normal + chances.heavy + chances.block + chances.inverted + chances.wait + chances.liar;
    const randNum = Math.random() * randTotal;
    let type = 'normal';
    if (randNum < chances.wait) { type = 'wait'; }
    else if (randNum < chances.wait + chances.inverted) { type = 'inverted'; }
    else if (randNum < chances.wait + chances.inverted + chances.block) { type = 'block'; }
    else if (randNum < chances.wait + chances.inverted + chances.block + chances.heavy) { type = 'heavy'; }
    else if (randNum < chances.wait + chances.inverted + chances.block + chances.heavy + chances.liar) { type = 'liar'; }
    return { dir: DIRECTIONS[rand(0,3)], type, windowTime: 800 + rand(0, 300) };
  }

  function getAttackHint(attack) {
    const dir = attack.dir;
    if (attack.type === 'normal') return `${dir} ⚫ Normální — uhni!`;
    if (attack.type === 'heavy') return `${dir} 🟡 Heavy — uhni (víc času)!`;
    if (attack.type === 'block') return `🛡️ ${dir} 🔴 Zákeřný — použij ŠTÍT!`;
    if (attack.type === 'inverted') return `${dir} 🟢 Inverzní — udělej OPAK!`;
    if (attack.type === 'liar') return `${dir} 🔴 Lhář — NESMÍŠ do šipky!`;
    if (attack.type === 'wait') return `⏳ Fialový — POČKEJ!`;
    return `${dir} uhni!`;
  }

  function resetTimerRing() {
    const ring = $('mbTimerRing');
    if (!ring) return null;
    const circle = ring.querySelector('.timer-circle');
    if (!circle) return null;
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = '176';
    return circle;
  }

  function startTimerRing(circle, durationMs) {
    if (!circle) return;
    // force reflow - oddělí reset od animace
    void circle.offsetHeight;
    circle.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
    circle.style.strokeDashoffset = '0';
  }

  function mapBattleTurn() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    if (mb.dot > 0) { mb.bossHp -= mb.dot; if (mb.bossHp <= 0 && mb.isBoss) { endMapBattle(true); return; } }
    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    mb.turn++;
    updateMapBattleUI();

    // RPG baseDmg: zbran + level bonus (base 10 + level*3, zbraň dodává baseDmg)
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    mb.baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg;

    SKILLS.forEach(sk => { const l = state.skills[sk.id]||0; if (l>0 && mb.spellCooldowns[sk.id]>0) mb.spellCooldowns[sk.id]--; });

    if (mb.stunned > 0) { mb.stunned--; setTimeout(() => mapBattleTurn(), 600); return; }
    if (mb.frozen > 0) mb.frozen--;

    // Generovat sekvenci 5-10 útoků
    const chances = getDungeonAttackChances(mb.locId);
    const seqLen = 5 + rand(0, 5);
    mb.sequence = [];
    for (let i = 0; i < seqLen; i++) {
      mb.sequence.push(generateAttack(chances));
    }
    mb.sequenceIndex = 0;
    mb.inAttackWindow = false;
    mb.isAttacking = true;

    // Reset UI
    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) { actionInfo.classList.add('hidden'); actionInfo.textContent = ''; }
    const playerEl = $('mbPlayerFigure');
    if (playerEl) playerEl.className = 'boss-fight-player';
    mb._sequenceTimer = null;
    updateActionButtons();

    $('mbHint').textContent = `⚔️ Sekvence ${mb.sequence.length} útoků — přežij!`;

    // Začít první útok sekvence
    playSequenceAttack();
  }

  function playSequenceAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.sequenceIndex >= mb.sequence.length) {
      openAttackWindow();
      return;
    }
    if (mb.inAttackWindow) return;
    if (mb.playerHp <= 0) { endMapBattle(false); return; }
    if (mb.bossHp <= 0) { endMapBattle(true); return; }

    const attack = mb.sequence[mb.sequenceIndex];

    mb.currentAttack = attack.dir;
    mb.isHeavyAttack = attack.type === 'heavy';
    mb.isBlockAttack = attack.type === 'block';
    mb.isInvertedAttack = attack.type === 'inverted';
    mb.isLiarAttack = attack.type === 'liar';
    mb.isWaitAttack = attack.type === 'wait';
    mb._hitProcessed = false; // reset guard pro aktuální útok

    const windowTime = mb.frozen > 0 ? attack.windowTime * 1.5 : attack.windowTime;

    // Reset kolečka
    const circle = resetTimerRing();

    // Zobrazit šipku nebo štít
    const actionInfo = $('mbActionInfo');
    const arrow = $('mbArrow');
    if (attack.type === 'block') {
      // Block útok: místo šipky ukážeme 🛡️ v kolečku
      if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
      if (actionInfo) {
        actionInfo.textContent = '🛡️';
        actionInfo.classList.remove('hidden');
      }
    } else {
      // Ostatní útoky: šipka
      if (actionInfo) actionInfo.classList.add('hidden');
      if (arrow) {
        arrow.setAttribute('class', 'boss-attack-arrow');
        const rotation = { '⬆️': 0, '⬇️': 180, '⬅️': -90, '➡️': 90 }[attack.dir] || 0;
        arrow.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        if (attack.type === 'heavy') arrow.classList.add('boss-attack-yellow');
        else if (attack.type === 'inverted') arrow.classList.add('boss-attack-green');
        else if (attack.type === 'liar') arrow.classList.add('boss-attack-red');
        else if (attack.type === 'wait') arrow.classList.add('boss-attack-purple');
      }
    }

    // Update action buttons
    updateActionButtons();

    const seqStr = `[${mb.sequenceIndex+1}/${mb.sequence.length}]`;
    $('mbHint').textContent = `${seqStr} ${getAttackHint(attack)}`;

    // Timer ring - animace (synchronně, bez setTimeout)
    startTimerRing(circle, windowTime);

    mb._sequenceTimer = setTimeout(() => {
      if (mapBattleState.ended) return;
      onMapHit();
    }, windowTime);
  }

  function advanceSequence() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb.currentAttack = null;
    mb.isHeavyAttack = false;
    mb.isBlockAttack = false;
    mb.isInvertedAttack = false;
    mb.isWaitAttack = false;
    mb.isLiarAttack = false;

    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) actionInfo.classList.add('hidden');
    updateActionButtons();

    resetTimerRing();

    mb.sequenceIndex++;

    if (mb.playerHp <= 0) { endMapBattle(false); return; }
    if (mb.bossHp <= 0) { endMapBattle(true); return; }

    setTimeout(() => playSequenceAttack(), 300);
  }

  function openAttackWindow() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    mb.inAttackWindow = true;
    mb.isAttacking = false;

    // Zobrazit ⚔️ info ikonu v kolečku
    const actionInfo = $('mbActionInfo');
    if (actionInfo) {
      actionInfo.textContent = '⚔️';
      actionInfo.classList.remove('hidden');
    }
    updateActionButtons();

    $('mbHint').textContent = '⚔️ ÚTOČ! Klikni na ⚔️ nebo stiskni Mezerník!';
    $('mbArrow').setAttribute('class', 'boss-attack-arrow hidden');

    // Timer ring pro útočné okno (~2.7s)
    const atkTime = 2700;
    const atkCircle = resetTimerRing();
    startTimerRing(atkCircle, atkTime);

    mb._attackWindowTimer = setTimeout(() => {
      if (mapBattleState.ended) return;
      $('mbHint').textContent = '⏰ Zmeškal jsi! Další sekvence...';
      missedAttackWindow();
    }, atkTime);
  }

  function missedAttackWindow() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // GUARD: už bylo zpracováno
    if (!mb.inAttackWindow) return;
    clearTimeout(mb._attackWindowTimer);
    mb._attackWindowTimer = null;
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb.inAttackWindow = false;
    const actInfo2 = $('mbActionInfo');
    if (actInfo2) actInfo2.classList.add('hidden');
    updateActionButtons();
    resetTimerRing();
    setTimeout(() => mapBattleTurn(), 800);
  }

  function doArenaGlow(dir, correct) {
    const sideMap = { '⬆️': 'up', '⬇️': 'down', '⬅️': 'left', '➡️': 'right' };
    const side = sideMap[dir];
    if (!side) return;
    const el = $(`arenaGlow${side.charAt(0).toUpperCase()+side.slice(1)}`);
    if (!el) return;
    el.className = `arena-glow arena-glow-${side} ${correct ? 'glow-correct' : 'glow-wrong'}`;
    if (mapBattleState._glowTimer) clearTimeout(mapBattleState._glowTimer);
    mapBattleState._glowTimer = setTimeout(() => {
      const els = ['Up','Down','Left','Right'];
      els.forEach(s => { const e = $(`arenaGlow${s}`); if (e) e.className = `arena-glow arena-glow-${s.toLowerCase()}`; });
    }, 300);
  }

  function onMapDodge(dir) {
    if (mapBattleState.ended || !mapBattleState.sequence) return;
    const mb = mapBattleState;
    const attack = mb.sequence[mb.sequenceIndex];
    if (!attack) return;
    if (mb.inAttackWindow) {
      // Při útočném okně: swipe = promarněná šance
      clearTimeout(mb._attackWindowTimer);
      $('mbHint').textContent = '❌ Zmeškal jsi! Měl jsi udeřit ⚔️';
      missedAttackWindow();
      return;
    }

    // GUARD: pokud _sequenceTimer už je null, útok už byl vyřešen (timer propadl)
    if (mb._sequenceTimer === null) return;

    // Zář strany (nahrazuje pohyb panáčka)
    doArenaGlow(dir, false); // nejdřív červeně (default), přebarvíme na zelenou pokud correct

    let correct = false;

    if (attack.type === 'block') {
      // Block = musí štít, swipováním se nedá uhnout — clearujeme až po volání onMapHit
      onMapHit();
      return;
    } else if (attack.type === 'wait') {
      // Čekání: jakýkoli pohyb = zásah
      onMapHit();
      return;
    } else if (attack.type === 'liar') {
      // Lhář: správně je NESMÍT swipnout do šipky
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      if (dir !== attack.dir) {
        correct = true;
        doArenaGlow(dir, true);
      }
    } else if (attack.type === 'inverted') {
      // Inverzní: musíš swipnout opačný směr
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      const inverseMap = { '⬆️':'⬇️', '⬇️':'⬆️', '⬅️':'➡️', '➡️':'⬅️' };
      if (dir === inverseMap[attack.dir]) {
        correct = true;
        doArenaGlow(dir, true);
      }
    } else {
      // Normal / heavy: musíš uhnout do směru šipky
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      if (dir === attack.dir) {
        correct = true;
        doArenaGlow(dir, true);
      }
    }

    if (correct) {
      sfxHit();
      $('mbHint').textContent = `✅ ${getAttackHint(attack).split('—')[0]} — OK!`;
      advanceSequence();
    } else {
      onMapHit();
    }
  }

  function onMapBlock() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.inAttackWindow) {
      // Během útočného okna: blok = promarněná šance
      clearTimeout(mb._attackWindowTimer);
      $('mbHint').textContent = '❌ Zmačkl jsi štít! Měl jsi udeřit ⚔️';
      missedAttackWindow();
      return;
    }
    if (!mb.isBlockAttack) { $('mbHint').textContent = '⚠️ Štít tu teď nepotřebuješ!'; return; }

    // GUARD: útok už byl zpracován (timer propadl)
    if (mb._hitProcessed) return;

    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._sequenceTimer = null;
    sfxHit();
    $('mbHint').textContent = '🛡️ Štít zablokoval útok!';
    advanceSequence();
  }

  function onMapAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (!mb.inAttackWindow) {
      if (mb.sequence && mb.sequenceIndex < mb.sequence.length) {
        $('mbHint').textContent = '⚠️ Nejdřív přežij sekvenci útoků!';
      } else {
        $('mbHint').textContent = '⚠️ Počkej na útočné okno!';
      }
      return;
    }

    // Hráč udeřil — zrušit timer okna
    clearTimeout(mb._attackWindowTimer);

    // Reset kolečka
    resetTimerRing();
    const actInfo = $('mbActionInfo');
    if (actInfo) actInfo.classList.add('hidden');
    updateActionButtons();

    const baseDmg = mb.baseDmg || (10 + Math.floor(state.hero.level * 3) + (ITEM_MAP[state.hero.equip.weapon]||ITEM_MAP['fists']).baseDmg);
    const critChance = (state.skills.crit||0) * 5 + 10;
    const critMult = (state.skills.crit||0) * 0.2 + 1;
    let dmg = baseDmg;
    if (Math.random() * 100 < critChance) { dmg = Math.round(dmg * critMult); $('mbHint').textContent = `💥 Kritik! ${dmg} poškození!`; }
    else { $('mbHint').textContent = `⚔️ Útok! ${dmg} poškození!`; }

    mb.bossHp -= dmg;
    sfxHit();

    // Damage text
    const damageText = $('mbDamageText');
    if (damageText) {
      damageText.textContent = `-${dmg}`;
      damageText.classList.remove('hidden');
      setTimeout(() => damageText.classList.add('hidden'), 600);
    }

    if (mb.bossHp <= 0) { endMapBattle(true); return; }
    updateMapBattleUI();
    mb.inAttackWindow = false;
    $('mbActionInfo').classList.add('hidden');
    updateActionButtons();

    setTimeout(() => mapBattleTurn(), 500);
  }

  function onMapHit() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // GUARD: pokud _hitProcessed, tohle je druhé volání (např. timer+swipe ve stejném ticku)
    if (mb._hitProcessed) return;
    mb._hitProcessed = true;
    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._sequenceTimer = null;

    const baseBossDmg = Math.max(5, 2 + mb.turn * 2);
    const bossDmg = Math.round(baseBossDmg * (0.8 + Math.random() * 0.4));
    let amount = bossDmg;
    if (mb.shieldActive) {
      const block = mb.shieldActive;
      if (block >= 100) {
        $('mbHint').textContent = '🛡️ Štít odrazil!'; mb.shieldActive = null;
        advanceSequence();
        return;
      }
      amount = Math.max(1, Math.round(amount * (1 - block/100)));
      mb.shieldActive = null;
    }
    mb.playerHp -= amount;
    sfxPlayerHit();

    const playerDamageText = $('mbPlayerDamageText');
    if (playerDamageText) {
      playerDamageText.textContent = `-${amount}`;
      playerDamageText.classList.remove('hidden');
      setTimeout(() => playerDamageText.classList.add('hidden'), 600);
    }

    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) actionInfo.classList.add('hidden');
    updateActionButtons();
    resetTimerRing();
    const counterIcon = $('mbCounterAttack');
    if (counterIcon) counterIcon.classList.add('hidden');

    $('mbHint').textContent = `💔 Zásah! -${amount}`;
    updateMapBattleUI();

    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    // Po zásahu pokračovat sekvencí (pokud není konec)
    if (mb.sequence && mb.sequenceIndex < mb.sequence.length) {
      setTimeout(() => advanceSequence(), 400);
    } else {
      // Už není sekvence nebo jsme na konci - nové kolo
      setTimeout(() => mapBattleTurn(), 500);
    }
  }

  function castMapSpell(spellId) {
    const mb = mapBattleState;
    if (mb.ended) return;
    const sk = SKILL_MAP[spellId];
    const lv = state.skills[spellId]||0;
    if (lv === 0) return;
    if (mb.spellCooldowns[spellId] > 0) { $('mbHint').textContent = `⏳ ${mb.spellCooldowns[spellId]} kol`; return; }
    if (spellId === 'crit') { $('mbHint').textContent = '🗡️ Kritik je pasivní!'; return; }

    const cd = Math.max(1, Math.round(sk.baseCd - lv * sk.cdR));
    mb.spellCooldowns[spellId] = cd;

    if (spellId === 'fireball') { const dmg = lv*2+3; mb.bossHp -= dmg; mb.dot += lv; $('mbHint').textContent = `🔥 Fireball! ${dmg}+${lv}DoT`; }
    else if (spellId === 'shield') { mb.shieldActive = lv*10+10; $('mbHint').textContent = `🛡️ Štít ${lv*10+10}%`; }
    else if (spellId === 'heal') { mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + lv + 2); $('mbHint').textContent = `💚 +${lv+2} HP`; }
    else if (spellId === 'freeze') { mb.frozen += lv+1; $('mbHint').textContent = `❄️ Mráz ${lv+1}k`; }
    else if (spellId === 'clone') { if (Math.random()*100 < lv*8+10) { $('mbHint').textContent = '🌀 Klon! Útok na klona!'; return; } else { $('mbHint').textContent = '🌀 Klon selhal'; } }
    else if (spellId === 'shadow') { const dmg = lv*4+5; mb.bossHp -= dmg; $('mbHint').textContent = `🌑 Stín! ${dmg} ignoruje obranu!`; }

    sfxSuccess();
    if (mb.isBoss && mb.bossHp <= 0) { endMapBattle(true); return; }
    updateMapBattleUI();
    if (!mb.isBoss) { endMapBattle(true); return; }
    setTimeout(() => mapBattleTurn(), 350);
  }

  function endMapBattle(won) {
    if (mapBattleState.ended) return;
    mapBattleState.ended = true;
    cleanupTimers();

    const arena = $('mbArena');
    if (arena && arena._mbHandlers) { arena._mbHandlers.forEach(h => arena.removeEventListener(h[0], h[1])); arena._mbHandlers = null; }

    const mb = mapBattleState;
    const locId = mb.locId;

    if (!won) {
      state.deaths = (state.deaths || 0) + 1;
      saveGame();
      $('resultIcon').textContent = '💀';
      $('resultTitle').textContent = 'Padl jsi';
      $('resultMsg').textContent = `Lokace ${mb.loc.name}`;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${locId})">🔄 Znovu</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
    } else {
      state.wins = (state.wins || 0) + 1;

      if (!mb.isBoss) {
        // Monster killed, advance progress
        const p = (state.locationProgress[locId] || 0) + 1;
        state.locationProgress[locId] = p;
        // Gold za monstrum
        const monsterGold = 2 + rand(0, 3);
        state.hero.gold = (state.hero.gold || 0) + monsterGold;
        if (p >= mb.loc.monsters) {
          // All monsters done — XP z xpReward
          state.hero.xp = (state.hero.xp || 0) + mb.loc.xpReward;
          $('resultIcon').textContent = '👹';
          $('resultTitle').textContent = `Všech ${mb.loc.monsters} nestvůr poraženo!`;
          $('resultMsg').textContent = `Teď na tebe čeká ${mb.loc.boss.name}!`;
          $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${locId})">👹 Jdi na bosse!</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
        } else {
          // XP se přidává až po dokončení lokace, zatím jen zobrazení
          $('resultIcon').textContent = '✅';
          $('resultTitle').textContent = 'Nestvůra poražena!';
          $('resultMsg').textContent = `Postup: ${p}/${mb.loc.monsters} (+💰${monsterGold})`;
          $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${locId})">🚀 Další</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
        }
      } else {
        // Boss defeated — XP z bossXp
        state.bossesDefeated[locId] = true;
        state.hero.xp = (state.hero.xp || 0) + mb.loc.bossXp;
        // Level up check (level*100 XP pro level N, zvyšuje se s každým levelem)
        const xpNeeded = state.hero.level * 100;
        if (state.hero.xp >= xpNeeded) {
          state.hero.xp = 0;
          state.hero.level++;
          state.hero.maxHp = 100 + Math.floor(state.hero.level * 10);
          state.hero.baseDmg = 10 + Math.floor(state.hero.level * 3);
          sfxLevelUp();
          showScreen('hero');
        }
        const r = mb.loc.reward;
        if (r.gold) state.hero.gold = (state.hero.gold || 0) + r.gold;
        if (r.weapon && state.hero.equip.weapon === 'fists') state.hero.equip.weapon = r.weapon;
        if (r.armor && state.hero.equip.armor === 'rags') state.hero.equip.armor = r.armor;

        sfxBossDefeat();
        $('resultIcon').textContent = '🏆';
        $('resultTitle').textContent = `${mb.loc.boss.name} poražen!`;
        let msg = `${r.gold||0}💰`;
        if (r.weapon) msg += ` + ${r.weapon}`;
        if (r.armor) msg += ` + ${r.armor}`;
        $('resultMsg').textContent = `Získal jsi ${msg}`;
        $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.showScreen('map')">🌍 Mapa</button><button class="btn btn-secondary" onclick="game.showScreen('hero')">🎒 Inventář</button>`;

        if (locId + 1 < LOCATIONS.length) {
          $('resultBtn').innerHTML += `<button class="btn btn-secondary" onclick="game.enterLocation(${locId+1})">🚀 Další lokace</button>`;
        }
      }
      saveGame();
      // achievementy odstraněny - hráč nezískává achievementy po první příšerě
    }
    showScreen('result');
  }

  // ===== TOWER (training) =====
  function renderTower() {
    const totalLv = SKILLS.reduce((s,sk) => s + (state.skills[sk.id]||0), 0);
    $('towerList').innerHTML = SKILLS.map(sk => {
      const lv = state.skills[sk.id]||0, xp = state.skillXp[sk.id]||0, needed = skillXpToLevel(lv);
      const pct = lv >= sk.maxLv ? 100 : Math.min(xp/needed*100,100);
      const maxed = lv >= sk.maxLv;
      const locked = state.hero.level < sk.minLevel;
      return `<div class="dungeon-card ${maxed?'completed':''} ${locked?'locked':''}" onclick="${locked?'':`game.enterTraining('${sk.id}')`}">
        <div class="flex-between">
          <div class="dungeon-name">${sk.icon} ${sk.dungeonName} ${locked?'🔒':'✅'}</div>
          <span class="badge ${sk.dungeon}">${sk.name}</span>
        </div>
        <div class="dungeon-progress-wrap"><div class="dungeon-progress-bar" style="width:${pct}%;background:${maxed?'#2ecc71':locked?'#555':'#4a7dff'}"></div></div>
        <div class="flex-between" style="margin-top:4px;font-size:12px;color:#8888aa">
          <span>${maxed?'MAX':locked?`🔒 Lv.${sk.minLevel}+`:`Lv.${lv} ${xp}/${needed}XP`}</span>
          <span>${sk.desc(lv)}</span>
        </div>
      </div>`;
    }).join('');
  }

  // ===== HERO =====
  function renderHero() {
    const h = state.hero;
    const totalLv = SKILLS.reduce((s,sk) => s + (state.skills[sk.id]||0), 0);
    $('heroName').textContent = 'Dobrodruh';
    $('heroLevel').textContent = `Lv.${h.level}`;
    $('heroDeaths').textContent = state.deaths;
    $('heroWins').textContent = state.wins;
    $('heroHp').textContent = h.hp || h.maxHp;
    $('heroMaxHp').textContent = h.maxHp;
    $('heroDmg').textContent = getHeroDmg();
    $('heroGold').textContent = h.gold;
    $('totalSkillLevel').textContent = `${totalLv}/${SKILLS.length*10}`;

    // Atributy
    const strCost = ATTR_COST[Math.min(h.attrStr||0, ATTR_COST.length-1)] || 999;
    const vitCost = ATTR_COST[Math.min(h.attrVit||0, ATTR_COST.length-1)] || 999;
    const pts = h.attrPoints || 0;
    $('heroAttrStr').textContent = (h.attrStr||0) + (h.equip.weapon !== 'fists' ? ` (s ${ITEM_MAP[h.equip.weapon]?.icon||''})` : '');
    $('heroAttrVit').textContent = (h.attrVit||0) + (h.equip.armor !== 'rags' ? ` (s ${ITEM_MAP[h.equip.armor]?.icon||''})` : '');
    $('heroAttrPts').textContent = pts;
    const strBtn = $('heroUpStr');
    const vitBtn = $('heroUpVit');
    if (strBtn) strBtn.textContent = `⬆️ Síla` + (pts > 0 ? '' : ` 🔒`);
    if (strBtn) strBtn.style.opacity = pts > 0 ? '1' : '0.3';
    if (vitBtn) vitBtn.textContent = `⬆️ Vitalita` + (pts > 0 ? '' : ` 🔒`);
    if (vitBtn) vitBtn.style.opacity = pts > 0 ? '1' : '0.3';

    $('skillGrid').innerHTML = SKILLS.map(sk => {
      const lv = state.skills[sk.id]||0, xp = state.skillXp[sk.id]||0, needed = skillXpToLevel(lv);
      const pct = lv >= sk.maxLv ? 100 : Math.min(xp/needed*100,100);
      return `<div class="skill-card ${lv===0?'locked':''} ${lv>=sk.maxLv?'maxed':''}" onclick="game.showScreen('tower')">
        <div class="skill-icon">${sk.icon}</div>
        <div class="skill-name">${sk.name}</div>
        <div class="skill-level">${lv===0?'🔒':`Lv.${lv}`}</div>
        <div class="skill-bar-wrap"><div class="skill-bar-fill" style="width:${pct}%;background:${lv>=sk.maxLv?'#2ecc71':lv===0?'#555':'#f1c40f'}"></div></div>
        <div style="font-size:9px;color:#888">${lv>=sk.maxLv?'MAX':lv===0?sk.dungeonName:`${xp}/${needed}XP`}</div>
      </div>`;
    }).join('');

    const weaponNames = { fists:'✊ Pěsti', dagger:'🗡️ Dýka', sword:'⚔️ Meč', flameSword:'🔥 Ohnivý meč' };
    const armorNames = { rags:'🧥 Hadry', leather:'🦺 Kožené', chainmail:'⛓️ Kroužková', plate:'🛡️ Plátová' };
    $('equipWeapon').textContent = weaponNames[h.equip.weapon] || '✊ Pěsti';
    $('equipArmor').textContent = armorNames[h.equip.armor] || '🧥 Hadry';
  }

  function upgradeAttr(attr) {
    const h = state.hero;
    if ((h.attrPoints||0) <= 0) { showMessage('❌ Nemáš žádné atributové body!'); return; }
    h.attrPoints--;
    if (attr === 'str') {
      h.attrStr = (h.attrStr||0) + 1;
      h.baseDmg = getHeroDmg();
      showMessage('💪 Síla +1! Poškození zvýšeno!');
    } else {
      h.attrVit = (h.attrVit||0) + 1;
      h.maxHp = getHeroMaxHp();
      h.hp = h.maxHp;
      showMessage('❤️ Vitalita +1! Max HP zvýšeno!');
    }
    saveGame();
    renderHero();
  }

  // ===== SHOP =====
  function renderShop() {
    const h = state.hero;
    $('shopGold').textContent = `💰 ${h.gold} zlatých`;
    $('shopList').innerHTML = ITEMS.filter(i => i.cost > 0).map(item => {
      const owned = h.inventory.includes(item.id) || h.equip.weapon === item.id || h.equip.armor === item.id;
      const canBuy = h.gold >= item.cost && !owned;
      const stats = item.type === 'weapon' ? `⚔️+${item.baseDmg} dmg` : `❤️+${item.bonusHp} HP`;
      return `<div class="shop-item" style="opacity:${owned?'0.4':'1'}">
        <div><span style="font-size:24px">${item.icon}</span> <strong>${item.name}</strong></div>
        <div style="font-size:12px;color:#8888aa">${stats}</div>
        <div class="flex-between" style="margin-top:4px">
          <span>💰 ${item.cost}</span>
          ${owned ? '<span style="color:#2ecc71">✅ Vlastníš</span>' : canBuy ? `<button class="btn btn-primary" style="width:auto;padding:6px 14px;font-size:12px" onclick="game.buyItem('${item.id}')">Koupit</button>` : '<span style="color:#e94560">🔒 Málo💰</span>'}
        </div>
      </div>`;
    }).join('');
  }

  function buyItem(itemId) {
    const item = ITEM_MAP[itemId];
    if (!item) return;
    const h = state.hero;
    if (h.gold < item.cost) { showMessage('❌ Nemáš dost zlata!'); return; }
    if (h.inventory.includes(itemId)) { showMessage('❌ Už to máš!'); return; }
    h.gold -= item.cost;
    h.inventory.push(itemId);
    saveGame();
    showMessage(`✅ Koupil jsi ${item.icon} ${item.name}!`);
    renderShop();
  }

  function sellItem(itemId) {
    const item = ITEM_MAP[itemId];
    if (!item || item.cost === 0) return;
    const h = state.hero;
    const idx = h.inventory.indexOf(itemId);
    if (idx === -1) { showMessage('❌ Tento předmět nemáš v inventáři!'); return; }
    const sellPrice = Math.round(item.cost * 0.5);
    h.inventory.splice(idx, 1);
    h.gold += sellPrice;
    saveGame();
    showMessage(`💰 Prodáno ${item.icon} ${item.name} za ${sellPrice}💰`);
    renderInventory();
  }

  // ===== INVENTORY =====
  function renderInventory() {
    const h = state.hero;
    $('invGold').textContent = `💰 ${h.gold} zlatých`;
    const container = $('invList');
    if (h.inventory.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#8888aa;padding:20px">📦 Inventář je prázdný</div>';
    } else {
      container.innerHTML = h.inventory.map((itemId, idx) => {
        const item = ITEM_MAP[itemId];
        if (!item) return '';
        const isEquipped = h.equip.weapon === itemId || h.equip.armor === itemId;
        const canEquip = !isEquipped;
        const stats = item.type === 'weapon' ? `⚔️+${item.baseDmg} dmg` : `❤️+${item.bonusHp} HP`;
        return `<div class="inv-item" style="opacity:${isEquipped?'0.7':'1'}">
          <div><span style="font-size:24px">${item.icon}</span> <strong>${item.name}</strong></div>
          <div style="font-size:12px;color:#8888aa">${stats}${isEquipped?' — ✅ Oblečeno':''}</div>
          <div style="margin-top:4px;display:flex;gap:6px">
            ${canEquip ? `<button class="btn btn-primary" style="width:auto;padding:6px 14px;font-size:12px" onclick="game.equipItem(${idx})">🎽 Obléci</button>` : `<button class="btn btn-primary" style="width:auto;padding:6px 14px;font-size:12px" onclick="game.unequipItem('${itemId}')">📦 Sundat</button>`}
            <button class="btn btn-secondary" style="width:auto;padding:6px 14px;font-size:12px" onclick="game.sellItem('${itemId}')">💰 Prodat (${Math.round(item.cost*0.5)})</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  function equipItem(invIdx) {
    const h = state.hero;
    const itemId = h.inventory[invIdx];
    if (!itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    if (item.type === 'weapon') {
      if (h.equip.weapon !== 'fists') h.inventory.push(h.equip.weapon);
      h.equip.weapon = itemId;
    } else {
      if (h.equip.armor !== 'rags') h.inventory.push(h.equip.armor);
      h.equip.armor = itemId;
    }
    h.inventory.splice(invIdx, 1);
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    saveGame();
    showMessage(`🎽 Oblékl jsi ${item.icon} ${item.name}!`);
    renderInventory();
  }

  function unequipItem(itemId) {
    const h = state.hero;
    if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
    const item = ITEM_MAP[itemId];
    if (!item) return;
    if (item.type === 'weapon') {
      if (h.equip.weapon !== itemId) return;
      h.equip.weapon = 'fists';
    } else {
      if (h.equip.armor !== itemId) return;
      h.equip.armor = 'rags';
    }
    h.inventory.push(itemId);
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    saveGame();
    showMessage(`📦 Sundal jsi ${item.icon} ${item.name} do inventáře!`);
    renderInventory();
  }

  // ===== TRAINING (minigames) =====
  function enterTraining(skillId) {
    const sk = SKILL_MAP[skillId];
    if (!sk) return;
    if (state.hero.level < sk.minLevel) { showMessage(`🔒 Potřebuješ ${sk.icon} Lv.${sk.minLevel}`); return; }
    const lv = state.skills[skillId] || 0;
    if (lv >= sk.maxLv) { showMessage('✅ MAX level!'); return; }
    trainingState = { skillId, skill: sk, level: Math.min(10, lv + 1), round: 0, ended: false, firstRound: true, playerHp: 1 };
    showScreen('battle');
    updateTrainingUI();
    startTrainingRound();
  }

  function updateTrainingUI() {
    const ts = trainingState;
    $('enemyName').textContent = ts.skill.icon + ' ' + ts.skill.dungeonName;
    $('gameTypeBadge').textContent = ts.skill.name;
    $('floorNum').textContent = `Lv.${Math.min(10,(state.skills[ts.skillId]||0)+1)}`;
    $('playerHearts').textContent = '❤️'.repeat(ts.playerHp);
    const faces = { simon:'👻', color:'🏹', grid:'🗿' };
    $('enemyFace').textContent = faces[ts.skill.dungeon] || '👾';
  }

  function startTrainingRound() {
    if (trainingState.ended) return;
    if (trainingState.playerHp <= 0) { endTraining(false); return; }
    trainingState.round++;
    minigameState = {};
    hideAllMinigames();
    if (trainingState.firstRound) { trainingState.firstRound = false; showCountdown(1, () => showMinigame(trainingState.skill.dungeon)); }
    else showMinigame(trainingState.skill.dungeon);
  }

  function showMinigame(type) {
    cleanupTimers();
    const areas = { simon:'simonArea', color:'colorClashArea', grid:'gridDefenderArea' };
    const fns = { simon:startSimon, color:startColorClash, grid:startGridDefender };
    const el = $(areas[type]);
    if (el && fns[type]) { el.classList.remove('minigame-hide'); fns[type](); }
  }

  function hideAllMinigames() {
    ['simonArea','colorClashArea','gridDefenderArea'].forEach(id => $(id).classList.add('minigame-hide'));
  }

  function endTraining(won) {
    trainingState.ended = true;
    if (won) {
      const skId = trainingState.skillId, sk = SKILL_MAP[skId], lv = state.skills[skId]||0;
      if (lv < sk.maxLv) {
        const needed = skillXpToLevel(lv);
        state.skillXp[skId] = (state.skillXp[skId]||0) + 1;
        if (state.skillXp[skId] >= needed) {
          state.skillXp[skId] = 0; state.skills[skId] = lv + 1;
          state.hero.xp = (state.hero.xp||0) + 1;
          if (state.hero.xp >= state.hero.level * 2) { state.hero.xp = 0; state.hero.level++; state.hero.maxHp = 100 + Math.floor(state.hero.level * 10); state.hero.baseDmg = 10 + Math.floor(state.hero.level * 3); }
          sfxLevelUp();
          $('resultIcon').textContent='⬆️'; $('resultTitle').textContent=`${sk.icon} Lv.${lv+1}!`; $('resultMsg').textContent=sk.desc(lv+1)+(lv+1>=sk.maxLv?' [MAX]':'');
          $('resultBtn').innerHTML=`<button class="btn btn-primary" onclick="game.showScreen('tower')">🔮 Věž</button><button class="btn btn-secondary" onclick="game.enterTraining('${skId}')">🔄 Dále</button>`;
        } else {
          $('resultIcon').textContent='✅'; $('resultTitle').textContent='Úspěch!'; $('resultMsg').textContent=`XP ${state.skillXp[skId]}/${needed}`;
          $('resultBtn').innerHTML=`<button class="btn btn-primary" onclick="game.enterTraining('${skId}')">🔄 Dále</button><button class="btn btn-secondary" onclick="game.showScreen('tower')">🔮 Věž</button>`;
        }
      }
      state.wins = (state.wins||0) + 1;
    } else {
      $('resultIcon').textContent='💀'; $('resultTitle').textContent='Neúspěch'; $('resultMsg').textContent='Zkus znovu!';
      state.deaths = (state.deaths||0) + 1;
      $('resultBtn').innerHTML=`<button class="btn btn-primary" onclick="game.enterTraining('${trainingState.skillId}')">🔄 Znovu</button><button class="btn btn-secondary" onclick="game.showScreen('tower')">🔮 Věž</button>`;
    }
    saveGame(); 
    // achievementy odstraněny - hráč nezískává achievementy po tréninku
    showScreen('result');
  }

  function trainingWin() { trainingState.playerHp=1; sfxSuccess(); endTraining(true); }
  function trainingLose() { trainingState.playerHp=0; sfxPlayerHit(); endTraining(false); }

  // ===== MINIGAMES =====
  const SIMON_SYMBOLS = ['⚡','🔥','💧','🌿','💎','☀️','🌙','🍀','🌀','⭐','🌈','🦋','🍄','🌊','❄️','🎯'];
  const SIMON_COLORS = ['#e94560','#f1c40f','#4a7dff','#2ecc71','#9b59b6','#e67e22','#1abc9c','#2c3e50','#d35400','#f39c12','#16a085','#c0392b','#8e44ad','#2980b9','#bdc3c7','#7f8c8d'];
  const SIMON_FREQS = [73.42*4,87.31*4,110.0*4,146.84*2,164.81*2,196.0*2,220.0*2,246.94*2,73.42*5,87.31*5,110.0*5,146.84*3,164.81*3,196.0*3,220.0*3,246.94*3];
  function startSimon() {
    const level=trainingState.level,gridSize=Math.min(2+Math.floor(level/3),4),nc=gridSize*gridSize,seqLen=5+Math.floor(level/2);
    const sym=shuffle([...SIMON_SYMBOLS]).slice(0,nc),cols=SIMON_COLORS.slice(0,nc);
    minigameState={sequence:[],playerIndex:0,showing:true,inputEnabled:false,symbols:sym,gridSize,seqLen};
    for(let i=0;i<seqLen;i++) minigameState.sequence.push(rand(0,nc-1));
    const g=$('simonGrid');g.style.gridTemplateColumns=`repeat(${gridSize},1fr)`;
    g.innerHTML=sym.map((s,i)=>`<div class="simon-cell" data-idx="${i}" style="background:${cols[i]}" onclick="game.simonClick(${i})"><span style="font-size:${gridSize<=3?'28px':'20px'};pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%">${s}</span></div>`).join('');
    $('simonPrompt').textContent='👀';$('simonProgress').textContent=`0/${seqLen}`;
    let delay=Math.max(100,300-level*20);minigameState.showing=true;
    (function ps(idx){if(idx>=minigameState.sequence.length){minigameState.showing=false;minigameState.inputEnabled=true;$('simonPrompt').textContent='🎯';return;}
      initAudio();const c=document.querySelectorAll('#simonGrid .simon-cell'),ci=minigameState.sequence[idx];c.forEach(x=>x.classList.remove('lit'));c[ci].classList.add('lit');playTone(SIMON_FREQS[ci],0.13,'sine',0.12);
      setTimeout(()=>{c.forEach(x=>x.classList.remove('lit'));setTimeout(()=>ps(idx+1),60);},delay);})(0);
  }
  function simonClick(idx){if(!minigameState.inputEnabled||minigameState.showing)return;
    initAudio();const c=document.querySelectorAll('#simonGrid .simon-cell');c[idx].classList.add('active');setTimeout(()=>c[idx].classList.remove('active'),150);
    playTone(SIMON_FREQS[idx],0.12,'sine',0.10);
    if(idx!==minigameState.sequence[minigameState.playerIndex]){minigameState.inputEnabled=false;trainingLose();return;}
    minigameState.playerIndex++;$('simonProgress').textContent=`${minigameState.playerIndex}/${minigameState.sequence.length}`;
    if(minigameState.playerIndex>=minigameState.sequence.length){minigameState.inputEnabled=false;trainingWin();}}
  function startColorClash(){const level=trainingState.level,fd=Math.max(0.8,2.8-level*0.25).toFixed(2),colors=['red','blue','green','yellow'],cl={red:'🔴',blue:'🔵',green:'🟢',yellow:'🟡'};const a=$('colorArena');a.innerHTML='';a.style.height='180px';a.style.display='flex';a.style.flexDirection='column';const ld=document.createElement('div');ld.style.cssText='display:flex;flex:1;';ld.innerHTML=colors.map(c=>`<div class="color-lane" data-color="${c}" style="flex:1;text-align:center;padding-top:4px;font-size:20px;border-right:1px solid #1a1a3a">${cl[c]}</div>`).join('');a.appendChild(ld);const br=document.createElement('div');br.style.cssText='display:flex;height:40px;';br.innerHTML=colors.map(c=>{const bg=c==='red'?'#e94560':c==='blue'?'#4a7dff':c==='green'?'#2ecc71':'#f1c40f';return `<div style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;background:${bg};margin:2px;border-radius:6px;font-size:13px;color:#fff;font-weight:bold" onclick="game.colorInput('${c}')">${cl[c]}</div>`;}).join('');a.appendChild(br);minigameState={active:true,colors,arena:a,projectile:null,currentColor:null,fallDuration:fd};minigameState.spawn=function spawn(){if(!minigameState.active)return;const a=minigameState.arena,col=minigameState.colors[rand(0,3)];if(minigameState.projectile&&minigameState.projectile.parentNode)minigameState.projectile.remove();const l=a.querySelectorAll('.color-lane'),li=minigameState.colors.indexOf(col),lane=l[li];if(!lane){setTimeout(minigameState.spawn,100);return;}const lr=lane.getBoundingClientRect(),ar=a.getBoundingClientRect(),lx=lr.left-ar.left+lr.width/2-14;const el=document.createElement('div');el.className='color-projectile';el.style.cssText=`left:${lx}px;top:0px;background:${col==='red'?'#e94560':col==='blue'?'#4a7dff':col==='green'?'#2ecc71':'#f1c40f'};width:28px;height:28px;border-radius:50%;border:2px solid #fff;position:absolute;transition:top ${minigameState.fallDuration}s linear`;el.dataset.color=col;el.addEventListener('transitionend',()=>{if(minigameState.active&&minigameState.projectile===el){minigameState.active=false;el.remove();trainingLose();}});a.appendChild(el);minigameState.projectile=el;minigameState.currentColor=col;requestAnimationFrame(()=>{el.style.top='145px';});}}
  function colorInput(c){if(!minigameState.active)return;if(c===minigameState.currentColor){minigameState.active=false;minigameState.score++;if(minigameState.projectile){const e=minigameState.projectile;e.style.transition='transform 0.2s, opacity 0.2s';e.style.transform='scale(2.5)';e.style.opacity='0';setTimeout(()=>e.remove(),200);}sfxHit();if(minigameState.score>=15){trainingWin();}else{setTimeout(()=>minigameState.spawn(),200);}}}
  function startGridDefender(){const level=trainingState.level,maxNum=5+level*2,target=rand(3,maxNum),ops=['+','-','×'],options=[],used=new Set();const cop=ops[rand(0,2)];let a,b,ex,res;for(let t=0;t<50;t++){if(cop==='+'){a=rand(1,target-1);b=target-a;ex=`${a}+${b}`;res=a+b;}else if(cop==='-'){a=rand(target+1,target+maxNum);b=a-target;ex=`${a}-${b}`;res=a-b;}else{const f=[];for(let i=1;i<=Math.sqrt(target);i++){if(target%i===0)f.push(i);}if(f.length>1){a=f[rand(1,f.length-1)];b=target/a;ex=`${a}×${b}`;res=a*b;}else{a=rand(1,3);b=target;ex=`${a}×${b}`;res=a*b;}}if(!used.has(ex)&&res===target){used.add(ex);break;}}options.push({value:res,expr:ex,wins:true});const cv=[];for(let d=1;d<=3;d++){if(res-d>=1)cv.push(res-d);if(res+d!==target)cv.push(res+d);}shuffle(cv);for(let i=1;i<3;i++){const fr=cv.length>0?cv.shift():rand(1,maxNum+5);let fe;for(let t=0;t<30;t++){const op=ops[rand(0,2)];let ba,bb,bex,bres;if(op==='+'){ba=rand(1,maxNum);bb=rand(1,maxNum);bex=`${ba}+${bb}`;bres=ba+bb;}else if(op==='-'){ba=rand(1,maxNum*2);bb=rand(1,ba-1);bex=`${ba}-${bb}`;bres=ba-bb;}else{ba=rand(1,5);bb=rand(1,5);bex=`${ba}×${bb}`;bres=ba*bb;}if(!used.has(bex)&&bres===fr){used.add(bex);options.push({value:bres,expr:bex,wins:false});fe=true;break;}}if(!fe){for(let t=0;t<50;t++){const op=ops[rand(0,2)];let ba,bb,bex,bres;if(op==='+'){ba=rand(1,maxNum);bb=rand(1,maxNum);bex=`${ba}+${bb}`;bres=ba+bb;}else if(op==='-'){ba=rand(1,maxNum*2);bb=rand(1,ba-1);bex=`${ba}-${bb}`;bres=ba-bb;}else{ba=rand(1,5);bb=rand(1,5);bex=`${ba}×${bb}`;bres=ba*bb;}if(!used.has(bex)&&Math.abs(bres-fr)<=1){used.add(bex);options.push({value:bres,expr:bex,wins:false});break;}}}}shuffle(options);const td=Math.max(3,6-Math.floor(level/3));minigameState={options,target,active:true,timer:td};$('gridArea').innerHTML=`<div class="grid-info"><span class="grid-time" id="gridTimer">${td}s</span><span class="grid-target">👹 <strong>${target}</strong></span></div><div class="grid-cards">${options.map((o,i)=>`<div class="grid-card" onclick="game.gridPick(${i})"><span class="expr">${o.expr}</span></div>`).join('')}</div>`;const te=$('gridTimer');if(te){minigameState.timerInterval=setInterval(()=>{minigameState.timer--;te.textContent=minigameState.timer+'s';if(minigameState.timer<=0){clearInterval(minigameState.timerInterval);if(minigameState.active){minigameState.active=false;trainingLose();}}},1000);}}
  function gridPick(idx){if(!minigameState.active)return;minigameState.active=false;if(minigameState.timerInterval)clearInterval(minigameState.timerInterval);if(minigameState.options[idx].wins){sfxSuccess();minigameState.rounds=minigameState.rounds||0;minigameState.rounds++;if(minigameState.rounds>=15){trainingWin();}else{setTimeout(startGridDefender,500);}}else{sfxPlayerHit();trainingLose();}}
  function showAchievementPopup(a){const p=document.createElement('div');p.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:300;background:#12122a;border:2px solid #f1c40f;border-radius:12px;padding:16px 24px;text-align:center;animation:enemyEnter 0.5s ease-out;max-width:360px;width:90%';p.innerHTML=`<div style="font-size:24px;margin-bottom:4px">🏅</div><div style="font-size:14px;font-weight:bold;color:#f1c40f">${a.name}</div><div style="font-size:11px;color:#8888aa;margin-top:2px">${a.desc}</div>`;document.body.appendChild(p);setTimeout(()=>{p.style.transition='opacity 0.5s';p.style.opacity='0';setTimeout(()=>p.remove(),500);},2500);}
  // Mock data for achievements (if needed later)
  const ACHIEVEMENTS = [];
  function showMedals(){
    // Odstranit starou medalScreen, aby se nehromadily
    const old = $('medalScreen');
    if (old) old.remove();
    let h='<div class="card"><div class="card-title">🏅 Úspěchy</div></div>';
    if (ACHIEVEMENTS.length === 0) {
      h += '<div class="card" style="opacity:0.5"><div class="flex-between"><div><div style="font-size:14px;font-weight:bold">🔒 Žádné úspěchy</div><div style="font-size:11px;color:#8888aa">Zde budou přidány později</div></div></div></div>';
    } else {
      ACHIEVEMENTS.forEach(a=>{const e=state.achievements&&state.achievements[a.id];h+=`<div class="card" style="${e?'border-color:#2ecc71':'opacity:0.5'}"><div class="flex-between"><div><div style="font-size:14px;font-weight:bold">${e?a.name:'🔒 '+a.name}</div><div style="font-size:11px;color:#8888aa">${a.desc}</div></div><div style="font-size:20px">${e?'✅':'⏳'}</div></div></div>`;});
    }
    h+='<button class="btn btn-secondary" onclick="game.showScreen(\'map\')">🌍 Zpět</button>';
    const c=document.createElement('div');c.className='container';c.id='medalScreen';c.innerHTML=h;document.body.appendChild(c);showScreen('medals');
  }

  // ===== COUNTDOWN =====
  function showCountdown(s,cb){cleanupTimers();let r=s;const el=$('countdownOverlay'),ne=$('countdownNumber');el.classList.remove('hidden');ne.textContent=r;playTone(440+r*60,0.15,'sine',0.1);minigameState.countdownInterval=setInterval(()=>{r--;if(r<=0){clearInterval(minigameState.countdownInterval);minigameState.countdownInterval=null;el.classList.add('hidden');if(cb)cb();}else{ne.textContent=r;playTone(440+r*60,0.15,'sine',0.1);}},1000);}

  // ===== INIT =====
  function init() {
    state = loadSave();
    SKILLS.forEach(sk => { if (state.skills[sk.id] === undefined) state.skills[sk.id] = 0; if (state.skillXp[sk.id] === undefined) state.skillXp[sk.id] = 0; });
    if (!state.achievements) state.achievements = {};
    if (!state.bossesDefeated || state.bossesDefeated.length < 7) state.bossesDefeated = [false,false,false,false,false,false,false];
    if (!state.locationProgress || state.locationProgress.length < 7) state.locationProgress = [0,0,0,0,0,0,0];
    if (!state.hero) state.hero = { level:1, xp:0, gold:0, hp:100, maxHp:100, baseDmg:12, inventory:[], equip:{weapon:'fists',armor:'rags'}, attrStr:0, attrVit:0, attrPoints:0 };
    if (state.hero.maxHp === undefined) state.hero.maxHp = getHeroMaxHp();
    if (state.hero.hp === undefined) state.hero.hp = state.hero.maxHp;
    if (state.hero.attrStr === undefined) state.hero.attrStr = 0;
    if (state.hero.attrVit === undefined) state.hero.attrVit = 0;
    if (state.hero.attrPoints === undefined) state.hero.attrPoints = 0;

    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (a.dataset.screen === 'map') showScreen('map');
        else if (a.dataset.screen === 'tower') showScreen('tower');
        else if (a.dataset.screen === 'hero') showScreen('hero');
        else if (a.dataset.screen === 'shop') showScreen('shop');
        else if (a.dataset.screen === 'inventory') showScreen('inventory');
        else if (a.dataset.screen === 'medals') showMedals();
        else if (a.dataset.screen === 'reset') resetGame();
        // Inicializovat audio hned při prvním kliku (user gesture)
        initAudio();
      });
    });
    showScreen('map');
  }

  window.game = {
    showScreen, enterLocation, enterTraining,
    simonClick, colorInput, gridPick,
    upgradeAttr, buyItem, sellItem, equipItem, unequipItem
  };
  init();
})();
