(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ===== AUDIO =====
  let audioCtx = null;
  let _audioInitErr = false;
  function initAudio() {
    if (_audioInitErr) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    } catch(e) { _audioInitErr = true; }
  }
  function ensureRunning() {
    if (!audioCtx || _audioInitErr) return Promise.resolve();
    if (audioCtx.state === 'running') return Promise.resolve();
    return audioCtx.resume().catch(() => {});
  }
  function playTone(f,d,t='sine',v=0.15) {
    if (!audioCtx || _audioInitErr) { initAudio(); if (!audioCtx) return; }
    ensureRunning().then(() => {
      try {
        const o=audioCtx.createOscillator(),g=audioCtx.createGain();
        o.type=t;o.frequency.value=f;
        g.gain.value=v;
        g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);
        o.connect(g);g.connect(audioCtx.destination);
        o.start(audioCtx.currentTime);o.stop(audioCtx.currentTime+d);
      } catch(e) {}
    });
  }
  const sfxHit=()=>playTone(220,0.12,'sawtooth',0.08);
  const sfxPlayerHit=()=>playTone(140,0.2,'square',0.10);
  const sfxSuccess=()=>{playTone(523,0.1,'sine',0.12);setTimeout(()=>playTone(659,0.1,'sine',0.12),80);setTimeout(()=>playTone(784,0.15,'sine',0.14),160);};
  const sfxEnemyDefeat=()=>{playTone(440,0.08,'square',0.1);setTimeout(()=>playTone(330,0.08,'square',0.1),80);setTimeout(()=>playTone(220,0.15,'square',0.08),160);};
  const sfxBossDefeat=()=>{playTone(523,0.15,'sine',0.14);setTimeout(()=>playTone(659,0.15,'sine',0.14),100);setTimeout(()=>playTone(784,0.15,'sine',0.16),200);setTimeout(()=>playTone(1047,0.3,'sine',0.18),300);};
  const sfxLevelUp=()=>{playTone(392,0.1,'sine',0.12);setTimeout(()=>playTone(523,0.1,'sine',0.12),100);setTimeout(()=>playTone(659,0.12,'sine',0.14),200);setTimeout(()=>playTone(784,0.15,'sine',0.16),300);};
  // MP3 SFX
  const dodgeSfx = (() => { const a = new Audio('dodge.mp3'); a.volume = 1.0; return a; })();
  const blockSfx = (() => { const a = new Audio('block.mp3'); a.volume = 1.0; return a; })();
  const hitSfx = (() => { const a = new Audio('hit.mp3'); a.volume = 1.0; return a; })();
  const critSfx = (() => { const a = new Audio('crit.mp3'); a.volume = 1.0; return a; })();
  const meleeHitSfx = (() => { const a = new Audio('melee_hit.mp3'); a.volume = 1.0; return a; })();
  const meleeCritSfx = (() => { const a = new Audio('melee_crit.mp3'); a.volume = 1.0; return a; })();
  const fistHitSfx = (() => { const a = new Audio('fist_hit.mp3'); a.volume = 1.0; return a; })();
  const fistCritSfx = (() => { const a = new Audio('fist_crit.mp3'); a.volume = 1.0; return a; })();
  const fireSpellSfx = (() => { const a = new Audio('fire_spell.mp3'); a.volume = 1.0; return a; })();
  const iceSpellSfx = (() => { const a = new Audio('ice_spell.mp3'); a.volume = 1.0; return a; })();
  // Zvuky zranění hráče — 4 náhodné
  const hurtSfx = [
    (() => { const a = new Audio('assets/sfx/hurt1.mp3'); a.volume = 1.0; return a; })(),
    (() => { const a = new Audio('assets/sfx/hurt2.mp3'); a.volume = 1.0; return a; })(),
    (() => { const a = new Audio('assets/sfx/hurt3.mp3'); a.volume = 1.0; return a; })(),
    (() => { const a = new Audio('assets/sfx/hurt4.mp3'); a.volume = 1.0; return a; })(),
  ];
  function getHurtSfx() { return hurtSfx[Math.floor(Math.random() * hurtSfx.length)]; }
  function getHitSfx() {
    return meleeHitSfx;
  }
  function getCritSfx() {
    return meleeCritSfx;
  }
  function playSFX(audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
  const healSfx = (() => { const a = new Audio('heal.mp3'); a.volume = 1.0; return a; })();
  const treasureSfx = (() => { const a = new Audio('treasure.mp3'); a.volume = 1.0; return a; })();
  const strongStrikeSfx = (() => { const a = new Audio('strong_strike.mp3'); a.volume = 1.0; return a; })();

  // ===== BACKGROUND MUSIC (MP3) =====
  const bgmAudio = new Audio('bgm.mp3');
  bgmAudio.loop = true;
  bgmAudio.volume = 0.70;
  const overworldAudio = new Audio('overworld.mp3');
  overworldAudio.loop = true;
  overworldAudio.volume = 0.90;
  const defeatAudio = new Audio('defeat.mp3');
  defeatAudio.loop = true;
  defeatAudio.volume = 0.75;
  const winAudio = new Audio('win.mp3');
  winAudio.loop = false;
  winAudio.volume = 0.80;

  const minigameBgm = new Audio('minigame-bgm.mp3');
  minigameBgm.loop = true;
  minigameBgm.volume = 0.70;

  const bossBgm = new Audio('boss_bgm.mp3');
  bossBgm.loop = true;
  bossBgm.volume = 0.50;

  // Battle BGM kolekce — 3 stopy, náhodně se střídají po patrech
  const battleBgmTracks = [
    new Audio('bgm_1.mp3'),
    new Audio('bgm_2.mp3'),
    new Audio('bgm_3.mp3')
  ];
  battleBgmTracks.forEach(t => { t.loop = true; t.volume = 0.80; });
  let currentBattleIndex = 0; // vybraná stopa pro aktuální patro

  let currentBGM = null; // 'battle' | 'overworld' | 'defeat' | 'win' | 'minigame' | 'boss' | null
  let _bgmPending = null;
  let musicMuted = false;
  function toggleMusic() {
    musicMuted = !musicMuted;
    bgmAudio.volume = musicMuted ? 0 : 0.70;
    overworldAudio.volume = musicMuted ? 0 : 0.90;
    defeatAudio.volume = musicMuted ? 0 : 0.75;
    winAudio.volume = musicMuted ? 0 : 0.80;
    bossBgm.volume = musicMuted ? 0 : 0.50;
    battleBgmTracks.forEach(t => { t.volume = musicMuted ? 0 : 0.80; });
    document.getElementById('musicToggle').className = musicMuted ? '' : 'music-active';
  }
  let testMode = false;
  function toggleTestMode() {
    testMode = !testMode;
    const btn = document.getElementById('testToggle');
    if (testMode) {
      state.talentPoints = 50;
      state.hero.attrPoints = 150;
      state.bossesDefeated = LOCATIONS.map(() => true);
      state.floorProgress = LOCATIONS.map(() => 5);
      state.locationProgress = LOCATIONS.map(() => 5);
      // Odemknout celý bestiář
      state.encounteredMonsters = [];
      MONSTER_DB.forEach(themeMonsters => {
        themeMonsters.forEach(m => {
          if (!state.encounteredMonsters.includes(m.face)) state.encounteredMonsters.push(m.face);
        });
      });
      LOCATIONS.forEach(loc => {
        if (loc && loc.boss && loc.boss.face && !state.encounteredMonsters.includes(loc.boss.face)) {
          state.encounteredMonsters.push(loc.boss.face);
        }
      });
      btn.classList.add('test-active');
    } else {
      state = defaultState();
      btn.classList.remove('test-active');
    }
    saveGame();
    renderMap();
    renderHero();
    renderBestiary();
  }
  let _currentBattleBgmIdx = 0;
  let _mapPaused = false;
  let _tutorialPaused = false;
  function setPauseIcon(btn, paused) {
    btn.innerHTML = paused
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="7" y1="5" x2="7" y2="19"/><line x1="17" y1="5" x2="17" y2="19"/></svg>';
  }
  function toggleMapPause() {
    const mb = mapBattleState;
    if (!mb || !mb.loc) return;
    // GUARD: zabránit reentrancy (prevence double-event z jednoho kliku)
    if (mb._pauseToggling) return;
    mb._pauseToggling = true;
    const btn = document.getElementById('mbPauseBtn');
    const overlay = document.getElementById('pauseOverlay');
    const numEl = document.getElementById('pauseCountdownNumber');
    if (!_mapPaused) {
      // Pauznout
      _mapPaused = true;
      setPauseIcon(btn, true);
      // Zastavit timery
      if (mb._sequenceTimer) { clearTimeout(mb._sequenceTimer); mb._sequenceTimer = null; }
      if (mb._attackWindowTimer) { clearTimeout(mb._attackWindowTimer); mb._attackWindowTimer = null; }
      if (mb._ringTimer) { clearTimeout(mb._ringTimer); mb._ringTimer = null; }
      if (mb._freezeTimer) { clearTimeout(mb._freezeTimer); mb._freezeTimer = null; }
      if (mb._bonusRaf) { cancelAnimationFrame(mb._bonusRaf); mb._bonusRaf = null; }
      // Uložit elapsed čas pro rAF loop
      const circle = document.querySelector('.timer-circle');
      if (circle) {
        const style = getComputedStyle(circle);
        const dashoffset = parseFloat(style.strokeDashoffset) || 691;
        const pct = 1 - dashoffset / 691;
        mb._pausedRemainingTime = Math.max(0, mb._currentWindowTime * (1 - pct));
      } else {
        mb._pausedRemainingTime = mb._currentWindowTime || 0;
      }
      mb._pauseToggling = false;
    } else {
      // GUARD: pokud už countdown běží, nezačínat znovu
      if (minigameState.pauseCountdown) { mb._pauseToggling = false; return; }
      // Odpočet 3 vteřin
      overlay.classList.remove('hidden');
      let count = 3;
      numEl.textContent = count;
      mb._pauseToggling = false;
      minigameState.pauseCountdown = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(minigameState.pauseCountdown);
          minigameState.pauseCountdown = null;
          overlay.classList.add('hidden');
          _mapPaused = false;
          setPauseIcon(btn, false);
          // Restartovat rAF loop s upraveným startTime
          const remainingMs = mb._pausedRemainingTime || mb._currentWindowTime || 0;
          if (mb._currentWindowTime && remainingMs > 0) {
            const elapsed = mb._currentWindowTime - remainingMs;
            const attackStartTime = performance.now() - elapsed;
            const winTime = mb._currentWindowTime;
            const circle = document.querySelector('.timer-circle');
            if (circle) {
              (function frame() {
                if (mapBattleState.ended) return;
                const now = performance.now();
                const rawElapsed = now - attackStartTime;
                
                // D5 timer freeze
                let isFrozen = false;
                if (mb.locId === 4 && mb._freezeIntervals && mb._freezeIntervals.length > 0) {
                  for (let fi = 0; fi < mb._freezeIntervals.length; fi++) {
                    const fz = mb._freezeIntervals[fi];
                    if (rawElapsed >= fz.startMs && rawElapsed < fz.startMs + fz.duration) {
                      isFrozen = true;
                      mb._freezeUntil = fz.startMs + fz.duration;
                      break;
                    }
                  }
                  if (!isFrozen) mb._freezeUntil = null;
                }
                
                let totalFrozen = 0;
                if (mb.locId === 4 && mb._freezeIntervals) {
                  for (let fi = 0; fi < mb._freezeIntervals.length; fi++) {
                    const fz = mb._freezeIntervals[fi];
                    if (rawElapsed >= fz.startMs + fz.duration) totalFrozen += fz.duration;
                    else if (rawElapsed > fz.startMs) totalFrozen += rawElapsed - fz.startMs;
                  }
                }
                
                const effectiveElapsed = rawElapsed - totalFrozen;
                const pct = Math.min(effectiveElapsed / winTime, 1);
                mb._bonusActive = (effectiveElapsed >= mb._bonusStartMs && effectiveElapsed < mb._bonusStartMs + mb._bonusMs);
                if (circle) {
                  circle.style.opacity = '1';
                  if (isFrozen) {
                    circle.style.stroke = '#4fc3f7';
                  } else {
                    circle.style.strokeDashoffset = Math.round(691 * (1 - pct));
                  }
                }
                if (effectiveElapsed < winTime) {
                  mb._bonusRaf = requestAnimationFrame(frame);
                } else {
                  mb._bonusActive = false;
                  mb._bonusRaf = null;
                }
              })();
            }
            mb._sequenceTimer = setTimeout(() => {
              if (mapBattleState.ended) return;
              onMapHit();
            }, remainingMs);
          }
        } else {
          numEl.textContent = count;
        }
      }, 1000);
    }
  }
  function toggleTutorialPause() {
    const btn = document.getElementById('tutPauseBtn');
    const overlay = document.getElementById('pauseOverlay');
    const numEl = document.getElementById('pauseCountdownNumber');
    if (!_tutorialPaused) {
      _tutorialPaused = true;
      setPauseIcon(btn, true);
    } else {
      overlay.classList.remove('hidden');
      let count = 3;
      numEl.textContent = count;
      minigameState.pauseCountdown = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(minigameState.pauseCountdown);
          minigameState.pauseCountdown = null;
          overlay.classList.add('hidden');
          _tutorialPaused = false;
          setPauseIcon(btn, false);
        } else {
          numEl.textContent = count;
        }
      }, 1000);
    }
  }
  let _forceNewBattleBgm = false;
  function switchBGM(mode) {
    // Vynucený nový výběr battle stopy při novém patře
    if (mode === 'battle' && _forceNewBattleBgm) {
      _forceNewBattleBgm = false;
      // Projdeme guardem — vybereme nový index
    } else if (mode === currentBGM) {
      return;
    }
    initAudio();
    // Zastavit všechny okamžitě
    if (!bgmAudio.paused) { bgmAudio.pause(); bgmAudio.currentTime = 0; }
    if (!overworldAudio.paused) { overworldAudio.pause(); overworldAudio.currentTime = 0; }
    if (!defeatAudio.paused) { defeatAudio.pause(); defeatAudio.currentTime = 0; }
    if (!winAudio.paused) { winAudio.pause(); winAudio.currentTime = 0; }
    if (!minigameBgm.paused) { minigameBgm.pause(); minigameBgm.currentTime = 0; }
    if (!bossBgm.paused) { bossBgm.pause(); bossBgm.currentTime = 0; }
    battleBgmTracks.forEach(t => { if (!t.paused) { t.pause(); t.currentTime = 0; } });
    currentBGM = null;
    // Počkat na AudioContext resume až potom přehrát
    _bgmPending = mode;
    ensureRunning().then(() => {
      if (_bgmPending !== mode) return; // mezitím se změnilo
      // Pro jistotu znovu zastavit — zabrání překryvu
      bgmAudio.pause(); bgmAudio.currentTime = 0;
      overworldAudio.pause(); overworldAudio.currentTime = 0;
      defeatAudio.pause(); defeatAudio.currentTime = 0;
      winAudio.pause(); winAudio.currentTime = 0;
      bossBgm.pause(); bossBgm.currentTime = 0;
      battleBgmTracks.forEach(t => { t.pause(); t.currentTime = 0; });
      if (mode === 'battle') {
        const idx = Math.floor(Math.random() * battleBgmTracks.length);
        _currentBattleBgmIdx = idx;
        battleBgmTracks[idx].play().catch(() => {});
        currentBGM = 'battle';
      } else if (mode === 'boss') {
        bossBgm.play().catch(() => {});
        currentBGM = 'boss';
      } else if (mode === 'defeat') {
      defeatAudio.play().catch(() => {});
      currentBGM = 'defeat';
    } else if (mode === 'win') {
      winAudio.play().catch(() => {});
      currentBGM = 'win';
    } else if (mode === 'minigame') {
      minigameBgm.play().catch(() => {});
      currentBGM = 'minigame';
    } else {
      overworldAudio.play().catch(() => {});
      currentBGM = 'overworld';
    }
    });
  }

  // ===== SCHOOLS (Talent Tree) =====
  const SCHOOLS = [
    { id:'fire', name:'Ohnivá škola', icon:'🔥', desc:'Hořící DoT a ničivé výbuchy.',
      tiers: [
        { choices: [
          { k:'burn', name:'Žhnutí', icon:'🔥', maxLv:5, desc:lv=>`Při zásahu: +${20+lv*10}% dmg ohněm` },
          { k:'firebolt', name:'Firebolt', icon:'🔥', maxLv:5, desc:lv=>`${75+lv*35}% dmg ohněm` },
        ]},
        { choices: [
          { k:'ignite', name:'Vznícení', icon:'💥', maxLv:5, requires:'fire_burn', requiresLv:5, desc:lv=>`+${lv*12}% poškození ohněm` },
          { k:'fireblast', name:'Fire Blast', icon:'💥', maxLv:3, requires:'fire_firebolt', requiresLv:3, desc:lv=>`${100+lv*50}% dmg + DoT 20%/tick` }
        ]},
        { choices: [
          { k:'inferno', name:'Výbuch', icon:'🌋', maxLv:1, requires:'fire_ignite', requiresLv:5, desc:_=>`Při opětovném aplikování ohně na hořící cíl: exploze za 5.0× dmg` },
          { k:'fireball', name:'Fireball', icon:'🔥', maxLv:3, requires:'fire_fireblast', requiresLv:3, desc:lv=>`${100+lv*100}% dmg + DoT 30%/tick na ${2+lv} ticky` }
        ]}
      ]
    },
    { id:'ice', name:'Ledová škola', icon:'❄️', desc:'Zpomalování nepřítele a ovládání tempa.',
      tiers: [
        { choices: [
          { k:'chill', name:'Mráz', icon:'🥶', maxLv:5, desc:lv=>`Při zásahu: zpomalí 25% na ${lv} ticků` },
          { k:'frostbolt', name:'Frostbolt', icon:'❄️', maxLv:5, desc:lv=>`${125+lv*15}% dmg ledem, zpomalí 40% na 3 ticky` },
        ]},
        { choices: [
          { k:'chill2', name:'Hluboký mráz', icon:'❄️', maxLv:5, requires:'ice_chill', requiresLv:5, desc:lv=>`+${lv*5}% zpomalení (nad rámec Mrázu)` },
          { k:'icebolt', name:'Vylepšený frostbolt', icon:'🧊', maxLv:3, requires:'ice_frostbolt', requiresLv:5, desc:lv=>`+${lv} tick trvání zpomalení` }
        ]},
        { choices: [
          { k:'deathFreeze', name:'Smrtící mráz', icon:'💀', maxLv:1, requires:'ice_chill2', requiresLv:5, desc:_=>`Při opětovném zpomalení už zpomaleného: krit 5.0× dmg` },
          { k:'blizzard', name:'Blizard', icon:'🌨️', maxLv:1, requires:'ice_icebolt', requiresLv:3, desc:_=>`Aktivní: zmrazení, 3 útoky po sobě` }
        ]}
      ]
    },
    { id:'nature', name:'Přírodní škola', icon:'🌿', desc:'Léčení, jed a přírodní magie.',
      tiers: [
        { choices: [
          { k:'poison', name:'Jed', icon:'☠️', maxLv:5, desc:lv=>`Při zásahu: jed ${10+lv*5}% z dmg/tick na 2 ticky` },
          { k:'heal', name:'Léčení', icon:'💚', maxLv:5, desc:lv=>`Při zásahu: ${lv*3}/tick + ${5+lv*5}% z VIT na 2 ticky` }
        ]},
        { choices: [
          { k:'poison2', name:'Silný jed', icon:'☠️', maxLv:3, requires:'nature_poison', requiresLv:5, desc:lv=>`+${lv} tick trvání jedu` },
          { k:'heal2', name:'Silnější léčení', icon:'💚', maxLv:3, requires:'nature_heal', requiresLv:5, desc:lv=>`+${lv} tick trvání léčení` }
        ]},
        { choices: [
          { k:'revitalize', name:'Otrava', icon:'☠️', maxLv:1, requires:'nature_poison2', requiresLv:3, desc:_=>`Otrávené monstrum se nemůže léčit (blokuje life steal)` },
          { k:'regen', name:'Regenerace', icon:'🌱', maxLv:1, requires:'nature_heal2', requiresLv:3, desc:_=>`+2 HP každý tick (pasivní, sčítá se s Léčením)` }
        ]}
      ]
    },
    { id:'physical', name:'Bojová škola', icon:'⚔️', desc:'Fyzické útoky a brutální síla.',
      tiers: [
        { choices: [
          { k:'edge', name:'Ostří', icon:'⚔️', maxLv:5, desc:lv=>`+${10+lv*6}% dmg zbraně` },
          { k:'strongStrike', name:'Silný úder', icon:'💢', maxLv:3, desc:lv=>`${100+lv*50}% dmg zbraně` }
        ]},
        { choices: [
          { k:'rend', name:'Roztržení', icon:'🩸', maxLv:5, requires:'physical_edge', requiresLv:5, desc:lv=>`+${lv*15}% crit dmg` },
          { k:'slash', name:'Seknutí', icon:'⚡', maxLv:3, requires:'physical_strongStrike', requiresLv:3, desc:lv=>`${150+lv*50}% dmg zbraně` }
        ]},
        { choices: [
          { k:'executioner', name:'Kat', icon:'💀', maxLv:1, requires:'physical_rend', requiresLv:5, desc:_=>`Při útoku na cíl pod 20% HP: 5.0× dmg` },
          { k:'whirlwind', name:'Vichřice', icon:'🌀', maxLv:1, requires:'physical_slash', requiresLv:3, desc:_=>`Aktivní: 3 útoky po sobě` }
        ]}
      ]
    }
  ];
  const SCHOOL_MAP = {};
  SCHOOLS.forEach(s => SCHOOL_MAP[s.id] = s);
  // Plochý seznam všech talentů pro rychlý lookup
  const TALENT_MAP = {};
  SCHOOLS.forEach(s => {
    s.tiers.forEach(tier => {
      tier.choices.forEach(t => {
        const key = s.id + '_' + t.k;
        TALENT_MAP[key] = t;
        t._schoolId = s.id;
        t._tierIdx = s.tiers.indexOf(tier);
      });
    });
  });

  // ===== SCHOOL PASSIVES =====
  function getTalentLv(key) { return state.talentLevels[key] || 0; }
  function getFireBurnPct() {
    if (state.activeSchool !== 'fire') return 0;
    const lv = getTalentLv('fire_burn');
    return 20 + lv * 10; // 30% @ lv1, 40% @ lv2, ... 70% @ lv5
  }
  function getFireBurnDuration() {
    return 0; // burn už není DoT
  }
  function getFireIgnitePct() {
    if (state.activeSchool !== 'fire') return 0;
    return getTalentLv('fire_ignite') * 12;
  }
  function hasFireInferno() {
    return getTalentLv('fire_inferno') > 0;
  }
  function getIceChillTicks() {
    if (state.activeSchool !== 'ice') return 0;
    return getTalentLv('ice_chill');
  }
  function getIceChillAddedPct() {
    if (state.activeSchool !== 'ice') return 0;
    return getTalentLv('ice_chill2') * 5;
  }
  function hasIceDeathFreeze() {
    return getTalentLv('ice_deathFreeze') > 0;
  }
  function getNaturePoisonPct() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = getTalentLv('nature_poison');
    return 10 + lv * 5; // 15/20/25/30/35% per tick (celkem 30-70% za 2 ticky = stejně jako burn)
  }
  function getNaturePoisonDuration() {
    if (state.activeSchool !== 'nature') return 0;
    const lv1 = getTalentLv('nature_poison');
    const lv2 = getTalentLv('nature_poison2');
    if (lv1 === 0) return 0;
    return 2 + lv2;
  }
  function getNatureHealPct() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = getTalentLv('nature_heal');
    return lv * 3; // 3/6/9/12/15 fixního HP/tick
  }
  function getNatureHealVitalityBonus() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = getTalentLv('nature_heal');
    if (lv === 0) return 0;
    return Math.round(((state.hero.attrVit || 0) + getEquipAttrs().vit) * (5 + lv * 5) / 100); // 10-30% z vitality
  }
  function getNatureHealDuration() {
    if (state.activeSchool !== 'nature') return 0;
    const lv1 = getTalentLv('nature_heal');
    const lv2 = getTalentLv('nature_heal2');
    if (lv1 === 0) return 0;
    return 2 + lv2;
  }
  function getNatureRegen() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = getTalentLv('nature_regen');
    return lv > 0 ? 2 : 0; // 2 HP per tick
  }
  function hasNatureRevitalize() {
    return getTalentLv('nature_revitalize') > 0;
  }
  // ===== PHYSICAL HELPERY =====
  function getPhysicalEdgePct() {
    if (state.activeSchool !== 'physical') return 0;
    return 10 + getTalentLv('physical_edge') * 6;
  }
  function getPhysicalRendCritDmg() {
    if (state.activeSchool !== 'physical') return 0;
    return getTalentLv('physical_rend') * 15;
  }
  function hasPhysicalExecutioner() {
    return getTalentLv('physical_executioner') > 0;
  }
  function getWeaponType() {
    const w = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    return w.weaponType || 'fists';
  }
  // ===== RESIST MULT =====
  function getSchoolResistMult(schoolId) {
    const mb = mapBattleState;
    if (!mb || !mb.loc || !mb.loc.resists) return 1.0;
    const r = mb.loc.resists;
    if (schoolId === 'fire') return r.fire || 1.0;
    if (schoolId === 'ice') return r.ice || 1.0;
    if (schoolId === 'nature') return r.nature || 1.0;
    return 1.0;
  }
  function getSpellLv(spellId) {
    if (spellId === 'fireball') return getTalentLv('fire_fireball');
    if (spellId === 'fireblast') return getTalentLv('fire_fireblast');
    if (spellId === 'firebolt') return getTalentLv('fire_firebolt');
    if (spellId === 'blizzard') return getTalentLv('ice_blizzard');
    if (spellId === 'icebolt') return getTalentLv('ice_icebolt');
    if (spellId === 'frostbolt') return getTalentLv('ice_frostbolt');
    if (spellId === 'strongStrike') return getTalentLv('physical_strongStrike');
    if (spellId === 'slash') return getTalentLv('physical_slash');
    if (spellId === 'whirlwind') return getTalentLv('physical_whirlwind');
    return 0;
  }
  function getRegrowthHeal() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = getTalentLv('nature_regrowth');
    if (lv === 0) return 0;
    return 10 + lv * 8;
  }
  function getNaturesBoonHeal() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = getTalentLv('nature_naturesboon');
    if (lv === 0) return 0;
    return 15 + lv * 12;
  }

  // ===== ITEMS (WEAPONS/ARMOR) =====
  const ITEMS = [
    // === ZÁKLADNÍ (bez ceny, startovní) ===
    { id:'fists', name:'Pěsti', type:'weapon', baseDmg:2, bonusHp:0, icon:'👊', iconImg:'', weaponType:'fists' },
    { id:'rags', name:'Hadry', type:'armor', baseDmg:0, bonusHp:0, icon:'🪢', iconImg:'' },
    // === ZBRANĚ — magické (staff) ===
    { id:'dagger', name:'Dřevěná hůlka', type:'weapon', baseDmg:5, bonusHp:0, bonusMana:10, cost:15, icon:'🪄', iconImg:'/assets/items/staff_wooden.png', weaponType:'staff', tier:1 },
    { id:'shortsword', name:'Ohnivá hůlka', type:'weapon', baseDmg:8, bonusHp:0, bonusMana:15, cost:25, icon:'🪄', iconImg:'/assets/items/staff_fire.png', weaponType:'staff', tier:2 },
    { id:'sword', name:'Ledová hůl', type:'weapon', baseDmg:10, bonusHp:0, bonusMana:20, cost:30, icon:'🪄', iconImg:'/assets/items/staff_ice.png', weaponType:'staff', tier:2 },
    { id:'battleAxe', name:'Blesková hůl', type:'weapon', baseDmg:13, bonusHp:0, bonusMana:25, cost:45, icon:'🪄', iconImg:'/assets/items/staff_lightning.png', weaponType:'staff', tier:3 },
    { id:'spear', name:'Hvězdná hůl', type:'weapon', baseDmg:16, bonusHp:0, bonusMana:30, cost:55, icon:'🪄', iconImg:'/assets/items/staff_archmage.png', weaponType:'staff', tier:3 },
    { id:'flameSword', name:'Plamená hůl', type:'weapon', baseDmg:18, bonusHp:0, bonusMana:40, cost:70, icon:'🪄', iconImg:'/assets/items/staff_archmage.png', weaponType:'staff', tier:4 },
    { id:'longsword', name:'Měsíční hůl', type:'weapon', baseDmg:22, bonusHp:0, bonusMana:50, cost:95, icon:'🪄', iconImg:'/assets/items/staff_archmage.png', weaponType:'staff', tier:4 },
    { id:'archStaff', name:'Arcimágova hůl', type:'weapon', baseDmg:30, bonusHp:0, bonusMana:80, cost:200, icon:'🪄', iconImg:'/assets/items/staff_archmage.png', weaponType:'staff', tier:5 },
    // === ZBRANĚ — fyzické (blade) ===
    { id:'ironSword', name:'Železný meč', type:'weapon', baseDmg:6, bonusHp:0, cost:20, icon:'⚔️', iconImg:'/assets/items/weapon_iron_sword.png', weaponType:'blade', tier:1 },
    { id:'huntingKnife', name:'Lovecký nůž', type:'weapon', baseDmg:5, bonusHp:0, critChance:15, cost:15, icon:'🗡️', iconImg:'/assets/items/weapon_hunting_knife.png', weaponType:'blade', tier:1 },
    { id:'broadSword', name:'Široký meč', type:'weapon', baseDmg:10, bonusHp:0, critChance:10, cost:35, icon:'⚔️', iconImg:'/assets/items/weapon_broad_sword.png', weaponType:'blade', tier:2 },
    { id:'sabre', name:'Šavle', type:'weapon', baseDmg:9, bonusHp:0, critChance:20, cost:30, icon:'🗡️', iconImg:'/assets/items/weapon_sabre.png', weaponType:'blade', tier:2 },
    { id:'battleAxePhys', name:'Bojová sekera', type:'weapon', baseDmg:14, bonusHp:0, critChance:10, cost:50, icon:'🪓', iconImg:'/assets/items/weapon_battle_axe.png', weaponType:'blade', tier:3 },
    { id:'claymore', name:'Obouruční meč', type:'weapon', baseDmg:18, bonusHp:0, critChance:15, cost:80, icon:'⚔️', iconImg:'/assets/items/weapon_claymore.png', weaponType:'blade', tier:4 },
    { id:'warAxe', name:'Válečná sekera', type:'weapon', baseDmg:20, bonusHp:0, critChance:15, cost:90, icon:'🪓', iconImg:'/assets/items/weapon_war_axe.png', weaponType:'blade', tier:4 },
    { id:'warHammer', name:'Temný meč', type:'weapon', baseDmg:24, bonusHp:0, critChance:10, cost:120, icon:'⚔️', iconImg:'/assets/items/weapon_war_hammer.png', weaponType:'blade', tier:5 },
    { id:'greatSword', name:'Velký meč', type:'weapon', baseDmg:25, bonusHp:0, critChance:20, cost:130, icon:'⚔️', iconImg:'/assets/items/weapon_great_sword.png', weaponType:'blade', tier:5 },
    { id:'greatAxe', name:'Dračí sekera', type:'weapon', baseDmg:28, bonusHp:0, critChance:15, cost:150, icon:'🪓', iconImg:'/assets/items/weapon_war_hammer.png', weaponType:'blade', tier:5 },
    { id:'excalibur', name:'Arcimágův meč', type:'weapon', baseDmg:35, bonusHp:30, critChance:25, cost:220, icon:'⚔️', iconImg:'/assets/items/weapon_claymore.png', weaponType:'blade', tier:6 },
    { id:'giantHammer', name:'Obří kladivo', type:'weapon', baseDmg:32, bonusHp:20, critChance:10, cost:200, icon:'🔨', iconImg:'/assets/items/weapon_giant_hammer.png', weaponType:'blade', tier:6 },
    // === BRNĚNÍ ===
    { id:'leather', name:'Lněný hábit', type:'armor', baseDmg:0, bonusHp:15, bonusMana:5, defense:15, cost:20, icon:'👘', iconImg:'/assets/items/armor_leather.png', tier:1 },
    { id:'chainmail', name:'Kožený hábit', type:'armor', baseDmg:0, bonusHp:35, bonusMana:10, defense:20, cost:35, icon:'👘', iconImg:'/assets/items/armor_chainmail.png', tier:2 },
    { id:'scale', name:'Šupinový hábit', type:'armor', baseDmg:0, bonusHp:60, bonusMana:15, defense:25, cost:60, icon:'👘', iconImg:'/assets/items/armor_scale.png', tier:3 },
    { id:'plate', name:'Vyšívaný hábit', type:'armor', baseDmg:0, bonusHp:80, bonusMana:20, defense:30, cost:80, icon:'👘', iconImg:'/assets/items/armor_plate.png', tier:4 },
    { id:'fullPlate', name:'Kroužkový hábit', type:'armor', baseDmg:0, bonusHp:105, bonusMana:25, defense:30, cost:110, icon:'👘', iconImg:'/assets/items/armor_plate.png', tier:4 },
    { id:'dragonScale', name:'Dračí hábit', type:'armor', baseDmg:0, bonusHp:140, bonusMana:35, defense:35, cost:160, icon:'👘', iconImg:'/assets/items/armor_dragon_scale.png', tier:5 },
    { id:'adamantPlate', name:'Arcimágův hábit', type:'armor', baseDmg:0, bonusHp:190, bonusMana:50, defense:40, cost:250, icon:'👘', iconImg:'/assets/items/armor_dragon_scale.png', tier:6 },
    // === HELMY ===
    { id:'linenHood', name:'Lněná kápě', type:'helmet', baseDmg:0, bonusHp:10, defense:8, cost:15, icon:'🎭', iconImg:'/assets/items/helmet_linen_hood.png', tier:1 },
    { id:'ironHelm', name:'Železná helma', type:'helmet', baseDmg:0, bonusHp:25, defense:11, cost:30, icon:'⛑️', iconImg:'/assets/items/helmet_iron_helm.png', tier:2 },
    { id:'steelHelm', name:'Ocelová helma', type:'helmet', baseDmg:0, bonusHp:50, defense:14, cost:60, icon:'⛑️', iconImg:'/assets/items/helmet_steel_helm.png', tier:3 },
    { id:'crown', name:'Arcimágova koruna', type:'helmet', baseDmg:0, bonusHp:90, defense:20, cost:140, icon:'👑', iconImg:'/assets/items/helmet_crown.png', tier:5 },
    // === ŠTÍTY ===
    { id:'woodenShield', name:'Dřevěný štít', type:'shield', baseDmg:0, bonusHp:5, blockChance:20, defense:6, cost:15, icon:'🛡️', iconImg:'/assets/items/shield_wooden.png', tier:1 },
    { id:'leatherShield', name:'Kožený štít', type:'shield', baseDmg:0, bonusHp:10, blockChance:25, defense:9, cost:30, icon:'🛡️', iconImg:'/assets/items/shield_leather.png', tier:2 },
    { id:'ironShield', name:'Železný štít', type:'shield', baseDmg:0, bonusHp:15, blockChance:30, defense:12, cost:55, icon:'🛡️', iconImg:'/assets/items/shield_iron.png', tier:3 },
    { id:'steelShield', name:'Ocelový štít', type:'shield', baseDmg:0, bonusHp:20, blockChance:35, defense:15, cost:85, icon:'🛡️', iconImg:'/assets/items/shield_steel.png', tier:4 },
    { id:'paladinShield', name:'Paladinův štít', type:'shield', baseDmg:0, bonusHp:30, blockChance:40, defense:18, cost:150, icon:'🛡️', iconImg:'/assets/items/shield_paladin.png', tier:5 },
    // === PRSTENY ===
    { id:'copperRing', name:'Měděný prsten', type:'ring', baseDmg:2, bonusHp:0, cost:15, icon:'💍', iconImg:'/assets/items/ring_copper.png', tier:1 },
    { id:'silverRing', name:'Stříbrný prsten', type:'ring', baseDmg:4, bonusHp:10, cost:55, icon:'💍', iconImg:'/assets/items/ring_silver.png', tier:3 },
    { id:'goldRing', name:'Zlatý prsten', type:'ring', baseDmg:6, bonusHp:20, cost:100, icon:'💍', iconImg:'/assets/items/ring_gold.png', tier:4 },
    { id:'gemRing', name:'Drahokamový prsten', type:'ring', baseDmg:9, bonusHp:30, cost:180, icon:'💍', iconImg:'/assets/items/ring_gem.png', tier:5 },
    // === AMULETY ===
    { id:'boneAmulet', name:'Kostěný amulet', type:'amulet', baseDmg:1, bonusHp:5, cost:20, icon:'📿', iconImg:'/assets/items/amulet_bone.png', tier:1 },
    { id:'silverAmulet', name:'Stříbrný amulet', type:'amulet', baseDmg:3, bonusHp:12, cost:60, icon:'📿', iconImg:'/assets/items/amulet_silver.png', tier:3 },
    { id:'goldAmulet', name:'Zlatý amulet', type:'amulet', baseDmg:5, bonusHp:22, cost:110, icon:'📿', iconImg:'/assets/items/amulet_gold.png', tier:4 },
    { id:'rubyAmulet', name:'Rubínový amulet', type:'amulet', baseDmg:7, bonusHp:35, cost:190, icon:'📿', iconImg:'/assets/items/amulet_ruby.png', tier:5 },
    { id:'arcaneAmulet', name:'Arcánní amulet', type:'amulet', baseDmg:11, bonusHp:45, cost:250, icon:'📿', iconImg:'/assets/items/amulet_arcane.png', tier:6 },
  ];
  const ITEM_MAP = {}; ITEMS.forEach(i => ITEM_MAP[i.id] = i);
  // Mapa pro generované loot itemy (doplňuje ITEM_MAP)
  let _lootItemMap = {};

  function getItemInfo(id) {
    return ITEM_MAP[id] || _lootItemMap[id] || null;
  }

  function renderItemIcon(item, size) {
    if (!item) return '';
    const s = size || 28;
    // Rámeček podle tieru
    const tierColors = {1:'#888',2:'#4caf50',3:'#4caf50',4:'#4a8af4',5:'#9c27b0',6:'#9c27b0',7:'#ffd700'};
    const borderColor = tierColors[item.tier] || '#888';
    const border = `border:2px solid ${borderColor};`;
    if (item.iconImg) {
      if (size === 0) {
        // Full-cover pro inventory buňky — bez fixní velikosti, CSS natáhne
        return `<img src="${item.iconImg}" alt="" style="display:block;width:100%;height:100%;object-fit:cover;${border}">`;
      }
      return `<img src="${item.iconImg}" alt="" style="width:${s}px;height:${s}px;border-radius:4px;vertical-align:middle;display:inline-block;${border}">`;
    }
    // Bez iconImg — použít emoji s rozumnou velikostí (ne 0)
    const fs = size === 0 ? 28 : s;
    return `<span style="font-size:${fs}px;display:inline-flex;align-items:center;vertical-align:middle;${border};border-radius:4px;padding:2px">${item.icon}</span>`;
  }

  // ===== MONSTER DB =====
  const ATTACK_TYPES = { MELEE: 'melee', CASTER: 'caster' };
  // ===== MONSTER DB =====
  // Každé monstrum má fixní face, name, type a attackType — nikdy se nemění
  const MONSTER_DB = [
    // Theme 0 — Les
    [
      {face:'assets/monsters/troll_test_small.png',name:'Troll',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/ent.png',name:'Ent',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/satyr.png',name:'Satyr',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/medved.png',name:'Medvěd',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/vlk.png',name:'Vlk',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/dryada.png',name:'Dryáda',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/lesni_rarach.png',name:'Lesní rarach',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/moc_alova_prisera.png',name:'Močálová příšera',attackType:ATTACK_TYPES.CASTER},
    ],
    // Theme 1 — Poušť
    [
      {face:'assets/monsters/desert_scorpion.png',name:'Štír',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/desert_worm.png',name:'Pouštní červ',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/desert_centaur.png',name:'Kentaur',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/desert_nomad.png',name:'Nomád',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/desert_djinn.png',name:'Djinn',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/desert_mummy.png',name:'Mumie',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/desert_beetle.png',name:'Brouk',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/desert_cobra.png',name:'Kobra',attackType:ATTACK_TYPES.CASTER},
    ],
    // Theme 2 — Nemrtvá země
    [
      {face:'assets/monsters/skeleton.png',name:'Kostlivec',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/zombie.png',name:'Zombie',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/lich.png',name:'Lich',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/bone_dragon.png',name:'Kostěný drak',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/death_knight.png',name:'Nemrtvý rytíř',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/raven.png',name:'Havran',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/ghost.png',name:'Přízrak',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/lucifer.png',name:'Upír',attackType:ATTACK_TYPES.CASTER},
    ],
    // Theme 3 — Výspy
    [
      {face:'assets/monsters/kerberos.png',name:'Kerberos',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/hellhound.png',name:'Pekelný pes',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/imp.png',name:'Ďáblík',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/fire_ghost.png',name:'Ohnivý přízrak',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/succubus.png',name:'Succuba',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/lava_dragon.png',name:'Lávový drak',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/hell_smith.png',name:'Pekelný kovář',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/hell_knight.png',name:'Pekelný rytíř',attackType:ATTACK_TYPES.MELEE},
    ],
    // Theme 4 — Štíty
    [
      {face:'assets/monsters/ice_troll.png',name:'Ledový troll',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/frost_giant.png',name:'Ledový obr',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/polar_bear.png',name:'Lední medvěd',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/snow_wolf.png',name:'Sněžný vlk',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/ice_dragon.png',name:'Ledový drak',attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/snow_golem.png',name:'Sněžný golem',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/frozen_knight.png',name:'Zmrzlý rytíř',attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/ice_lizard.png',name:'Ledový ještěr',attackType:ATTACK_TYPES.MELEE},
    ],
  ];

  // ===== LOCATIONS (MAP) =====
  function getMonsterFace(theme, floor) {
    const pool = MONSTER_DB[theme] || MONSTER_DB[0];
    return pool[rand(0, pool.length - 1)].face;
  }
  function getMonsterName(theme) {
    const pool = MONSTER_DB[theme] || MONSTER_DB[0];
    return pool[rand(0, pool.length - 1)].name;
  }
  function getFloorMonsterSet(theme, floor) {
    const pool = MONSTER_DB[theme] || MONSTER_DB[0];
    // Každé patro má fixně přiděleného jednoho nepřítele v pořadí bestiáře
    const idx = Math.min(floor, pool.length - 1);
    const m = pool[idx];
    return [{idx, face: m.face, name: m.name, attackType: m.attackType, theme: theme}];
  }
  const DIRECTIONS = ['⬆️','⬇️','⬅️','➡️'];
  const DUNGEON_THEME_FILTERS = [
    '', '', '', '', '', '', '', '', '', '', '', '',
  ];
  const DUNGEON_THEMES = [
    { bg:'#0d2d0d', border:'#2ecc71', borderGlow:'rgba(46,204,113,0.3)' },   // 0 Les — zelená
    { bg:'#2a1a08', border:'#e67e22', borderGlow:'rgba(230,126,34,0.3)' },   // 1 Poušť — oranžová
    { bg:'#1a0d1a', border:'#888', borderGlow:'rgba(136,136,136,0.3)' },   // 2 Nemrtvá země — šedá
    { bg:'#2d0d0d', border:'#e74c3c', borderGlow:'rgba(231,76,60,0.3)' },    // 3 Výspy — červená
    { bg:'#0d122d', border:'#a8d8ea', borderGlow:'rgba(168,216,234,0.3)' },  // 4 Štíty — ledová modrá
  ];
  const LOCATIONS = [
    { id:0, name:'Začarovaný les', icon:'🌲', theme:0, monsters:1, floors:8, boss:{name:'Lesní pán',face:'assets/monsters/forest_lord.png',hp:10,attackType:ATTACK_TYPES.CASTER} },
    { id:1, name:'Pouštní říše', icon:'🏜️', theme:1, monsters:1, floors:8, boss:{name:'Faraon',face:'assets/monsters/desert_pharaoh.png',hp:14,attackType:ATTACK_TYPES.CASTER} },
    { id:2, name:'Nemrtvá země', icon:'🦴', theme:2, monsters:1, floors:8, boss:{name:'Smrtka',face:'assets/monsters/reaper.png',hp:16,attackType:ATTACK_TYPES.CASTER} },
    { id:3, name:'Pekelné výspy', icon:'🔥', theme:3, monsters:1, floors:8, boss:{name:'Lucifer',face:'assets/monsters/lucifer_demon.png',hp:26,attackType:ATTACK_TYPES.CASTER} },
    { id:4, name:'Mrazivé štíty', icon:'❄️', theme:4, monsters:1, floors:8, boss:{name:'Ledový titán',face:'assets/monsters/frost_titan.png',hp:22,attackType:ATTACK_TYPES.CASTER} },
  ];

  // Skoková obtížnost — násobitel HP a damage podle dungeonu
  const DIFFICULTY_MULT = [1.0, 1.5, 2.5, 4.0, 6.0];

  // ===== STATE =====
  let state = {};
  let mapBattleState = {};
  let trainingState = {};
  let minigameState = {};
  let _activeIntervals = [];

  function cleanupTimers() {
    document.body.classList.remove('battle-active');
    // Schovat timer ring
    const circle = document.querySelector('.timer-circle');
    if (circle) { circle.style.opacity = '0'; circle.style.animation = 'none'; }
    _activeIntervals.forEach(id => { try { clearInterval(id); } catch {} }); _activeIntervals = [];
    if (minigameState.timerInterval) { clearInterval(minigameState.timerInterval); minigameState.timerInterval = null; }
    if (minigameState.countdownInterval) { clearInterval(minigameState.countdownInterval); minigameState.countdownInterval = null; }
    ['simonTimeout'].forEach(k => { if (minigameState[k]) { clearTimeout(minigameState[k]); delete minigameState[k]; } });
    if (mapBattleState) {
      if (mapBattleState._attackTimer) { clearTimeout(mapBattleState._attackTimer); mapBattleState._attackTimer = null; }
      if (mapBattleState._sequenceTimer) { clearTimeout(mapBattleState._sequenceTimer); mapBattleState._sequenceTimer = null; }
      if (mapBattleState._ringTimer) { clearTimeout(mapBattleState._ringTimer); mapBattleState._ringTimer = null; }
      if (mapBattleState._attackWindowTimer) { clearTimeout(mapBattleState._attackWindowTimer); mapBattleState._attackWindowTimer = null; }
      if (mapBattleState._glowTimer) { clearTimeout(mapBattleState._glowTimer); mapBattleState._glowTimer = null; }
      if (mapBattleState._freezeTimer) { clearInterval(mapBattleState._freezeTimer); mapBattleState._freezeTimer = null; }
      if (mapBattleState._bonusRaf) { cancelAnimationFrame(mapBattleState._bonusRaf); mapBattleState._bonusRaf = null; }
    }
  }

  const SAVE_KEY = 'dungeonRecallV7';
  function defaultState() {
    const talentLevels = {};
    SCHOOLS.forEach(sk => {
      sk.tiers.forEach(tier => {
        tier.choices.forEach(t => {
          talentLevels[sk.id + '_' + t.k] = 0;
        });
      });
    });
    const s = { talentLevels, activeSchool:null, talentPoints:0, hero:{name:'Dobrodruh',face:'hero',level:1,xp:0,hp:100,maxHp:100,mana:50,maxMana:50,baseDmg:12,inventory:[],equip:{weapon:'fists',armor:'rags',helmet:null,shield:null,ring1:null,amulet:null},attrStr:0,attrVit:0,attrDex:0,attrInt:0,attrPoints:0}, deaths:0, wins:0,
      locationProgress:[0,0,0,0,0], bossesDefeated:[false,false,false,false,false], floorProgress:[0,0,0,0,0], spellUsedThisFloor:{}, lootItems:{}, encounteredMonsters:[] };
    return s;
  }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.talentLevels) { // Obnovit loot itemy do ITEM_MAP
    if (s.lootItems) Object.keys(s.lootItems).forEach(k => { ITEM_MAP[k] = s.lootItems[k]; }); return s; } } catch {} return defaultState(); }
  function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function resetGame() { state = defaultState(); saveGame(); showScreen('map'); }

  // ===== SCREENS =====
  const SCREEN_IDS = { map:'mapScreen', mapBattle:'mapBattleScreen', talents:'talentsScreen', hero:'heroScreen', result:'resultScreen', inventory:'inventoryScreen', guide:'guideScreen', bestiary:'bestiaryScreen' };
  function showScreen(name) {
    cleanupTimers();
    
    // Když opouštíme map battle (bez výsledku), okamžitě ho ukončit
    if (mapBattleState && !mapBattleState.ended && name !== 'mapBattle' && name !== 'result') {
      mapBattleState.ended = true;
      // Odstranit event handlery — touch/click na aréně + keydown na window
      const arena = $('mbArena');
      if (arena && arena._mbHandlers) {
        arena._mbHandlers.forEach(h => {
          if (h[0] === 'keydown') window.removeEventListener(h[0], h[1]);
          else arena.removeEventListener(h[0], h[1]);
        });
        arena._mbHandlers = null;
      }
    }
    
    Object.values(SCREEN_IDS).forEach(id => {
      const el = $(id);
      if (!el) return;
      if (id === SCREEN_IDS[name]) { el.classList.remove('hidden'); el.classList.add('active'); } else { el.classList.add('hidden'); el.classList.remove('active'); }
    });
    // Aktivovat nav tlačítko
    document.querySelectorAll('.nav-bar a[data-screen]').forEach(a => {
      a.classList.toggle('active', a.dataset.screen === name);
    });
    // Přepnout na overworld BGM mimo boj
    if (name !== 'mapBattle' && name !== 'battle' && name !== 'result') switchBGM('overworld');
    if (name === 'map') renderMap();
    else if (name === 'talents') renderTalents();
    else if (name === 'hero') renderHero();
    else if (name === 'inventory') renderInventory();
  }

  function showMessage(msg) {
    // Zrušeno — modální okna jsou zbytečná
  }

  // ===== LEVEL-UP OVERLAY =====
  function showLevelUpOverlay(prevLevel) {
    const h = state.hero;
    const overlay = document.createElement('div');
    overlay.className = 'levelup-overlay';
    overlay.innerHTML = `<div class="levelup-content">
      <div class="levelup-sparkle">⭐</div>
      <div class="levelup-title">LEVEL UP!</div>
      <div class="levelup-level">Lv.${prevLevel} → Lv.${h.level}</div>
      <div class="levelup-details"><span>💪 +5 atributových bodů</span><span>🎓 +1 talentový bod</span><span>❤️ Plné vyléčení</span></div>
    </div>`;
    document.body.appendChild(overlay);
    sfxLevelUp();
    // Po 2.5s fade-out a odstranit
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 500);
    }, 2500);
  }

  // ===== TREASURE POPUP =====
  let _treasurePopupOpen = false;
  function showTreasurePopup(loot, xpGain, onContinue) {
    if (_treasurePopupOpen) return;
    _treasurePopupOpen = true;
    playSFX(treasureSfx);

    // Sestavit loot čtverečky
    let lootSquares = '';
    if (loot.type === 'item' || loot.type === 'boss') {
      const r = RARITY[loot.item.rarity] || RARITY.common;
      lootSquares = `<div class="treasure-slot" style="border-color:${r.border}">
        <div class="treasure-slot-icon">❓</div>
        <div class="treasure-slot-label" style="color:${r.color}">${r.name}</div>
      </div>`;
    }

    const el = document.createElement('div');
    el.className = 'treasure-overlay-open';
    el.innerHTML = `<div class="treasure-loot-row">${lootSquares}</div>
      <div class="treasure-tap-close">👆 Pokračovat</div>`;
    document.body.appendChild(el);
    document.body.classList.add('no-scroll');

    el.addEventListener('click', function closeHandler() {
      el.removeEventListener('click', closeHandler);
      _treasurePopupOpen = false;
      el.classList.add('fade-out');
      document.body.classList.remove('no-scroll');
      setTimeout(() => { el.remove(); if (onContinue) onContinue(); }, 350);
    });
  }

  // ===== MAP =====
  let _expandedDungeon = -1;
  function toggleDungeon(idx) {
    _expandedDungeon = _expandedDungeon === idx ? -1 : idx;
    renderMap();
  }
  function renderMap() {
    const h = state.hero;

    $('mapScroll').innerHTML = LOCATIONS.map((loc, i) => {
      const prevDone = i === 0 || state.bossesDefeated[i-1]; // předchozí dungeon hotov = první odemčen
      const unlocked = i === 0 || prevDone;
      const completed = state.bossesDefeated[i];
      const curFloor = state.floorProgress[i] || 0;
      const expanded = _expandedDungeon === i;
      const theme = DUNGEON_THEMES[i] || DUNGEON_THEMES[0];
      let badgeHtml;
      if (completed) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">✔</div><div class="badge-count">Hotovo</div></div>`;
      } else if (!unlocked) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">🔒</div><div class="badge-count">Zamčeno</div></div>`;
      } else if (curFloor >= 7) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">BOSS</div></div>`;
      } else {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">P${curFloor+1}</div></div>`;
      }
      // Floor sub-cards P1-P8
      let floorHtml = '';
      if (unlocked && expanded) {
        for (let f = 0; f < 8; f++) {
          const isBossFloor = f >= 7;
          const floorDone = completed || f < curFloor;
          const lockedFloor = f > state.floorProgress[i] && !completed;
          let fIcon, fIconStyle, fText;
          if (floorDone) { fIcon = '✓'; fIconStyle = `color:${theme.border}`; fText = 'Hotovo'; }
          else if (lockedFloor) { fIcon = '🔒\uFE0E'; fIconStyle = `color:${theme.border}`; fText = 'Zamčeno'; }
          else if (isBossFloor) { fIcon = '👹'; fIconStyle = ''; fText = 'BOSS'; }
          else if (f === curFloor) { fIcon = '●'; fIconStyle = ''; fText = 'Aktivní'; }
          else { fIcon = '✓'; fIconStyle = `color:${theme.border}`; fText = ''; }
          floorHtml += `<div class="map-floor-card ${floorDone?'floor-done':lockedFloor?'floor-locked':'floor-active'}" style="border-color:${theme.border};background:linear-gradient(135deg,${theme.bg}bb,${theme.bg}66)" onclick="${lockedFloor?'':'game.enterLocation('+i+','+f+')'}">
            <span class="floor-card-icon"${fIconStyle ? ` style="${fIconStyle}"` : ''}>${fIcon}</span>
            <span class="floor-card-num">${isBossFloor?'BOSS':`P${f+1}`}</span>
            <span class="floor-card-text">${fText}</span>
          </div>`;
        }
      }
      return `<div class="map-location-wrap">
        <div class="map-location ${completed?'completed':!unlocked?'locked':''} ${expanded?'expanded':''}" style="--theme-glow:${theme.borderGlow};background:linear-gradient(135deg,${theme.bg}cc,${theme.bg}99 80%);border-color:${theme.border};${completed?'opacity:0.7':''}" onclick="${!unlocked?'':`game.toggleDungeon(${i})`}">
          <div class="map-loc-bg" style="background-image:url(assets/dungeons/${['forest','desert','undead','hell','frost'][i]||'forest'}.png)"></div>
          ${!unlocked ? `<div class="map-loc-gate" style="background-image:url(assets/gates/gate_${['forest','desert','undead','hell','frost'][i]||'forest'}.png)"></div>` : ''}
          <div class="map-loc-info">
            <div class="map-loc-name">${loc.name}</div>
          </div>
          ${badgeHtml}
        </div>
        ${floorHtml}
      </div>`;
    }).join('');
  }

  // ===== MAP BATTLE =====
  function enterLocation(locId, optFloor) {
    const loc = LOCATIONS[locId];
    if (!loc) return;
    if (locId > 1 && !state.bossesDefeated[locId-1]) { showMessage('🔒 Nejdřív poraz předchozí lokaci!'); return; }

    if (optFloor !== undefined) {
      state.floorProgress[locId] = optFloor;
      state.locationProgress[locId] = 0;
    }

    cleanupTimers();
    startLocation(locId);
  }

  function startLocation(locId) {
    const loc = LOCATIONS[locId];
    if (!loc) return;
    const floor = state.floorProgress[locId] || 0; // 0-7 (0=patro1, 7=boss)
    const isBoss = floor >= 7; // boss v 8. patře
    // Každé nové patro resetuje HP hrdiny
    state.hero.hp = 5;
    const playerMaxHp = 5;
    const playerHp = 5;
    // HP podle patra — segment-based: 1P=20, 2P=25, ..., 8P=55
    const monsterHp = 20 + floor * 5;
    const bossHp = 20 + floor * 5;
    const bossBaseHp = isBoss ? bossHp : monsterHp;

    // Sada monster — 1 unikátní nepřítel podle patra
    state._floorMonsters = isBoss ? [] : getFloorMonsterSet(loc.theme, floor);
    const floorMonsters = state._floorMonsters;
    // Zaznamenat setkání s monstry do bestiáře
    if (!isBoss) {
      state.encounteredMonsters = state.encounteredMonsters || [];
      floorMonsters.forEach(m => {
        const key = m.face;
        if (!state.encounteredMonsters.includes(key)) {
          state.encounteredMonsters.push(key);
        }
      });
    } else {
      // Boss setkání
      state.encounteredMonsters = state.encounteredMonsters || [];
      if (loc.boss && loc.boss.face && !state.encounteredMonsters.includes(loc.boss.face)) {
        state.encounteredMonsters.push(loc.boss.face);
      }
    }
    mapBattleState = {
      locId, loc, isBoss, floor,
      bossHp: bossBaseHp, maxBossHp: bossBaseHp,
      playerHp: playerHp, maxPlayerHp: playerMaxHp,
      ended: false, turn: 0, isAttacking: false,
      mistakes: 0, floorMistakes: 0, stunned: 0, frozen: 0, dot: 0, dotTicksLeft: 0, hot: 0, hotTicksLeft: 0, chillPercent: 0, chillTicksLeft: 0, _activeSpellChillActive: false, _poisonBlockHeal: false, shieldActive: null,
      playerDot: 0, playerDotTicksLeft: 0,
      _ringTimer: null, _sequenceTimer: null, _attackWindowTimer: null,
      _freezeTimer: null, _bonusRaf: null,
      spellCooldowns: {},
      _spellCooldownTicks: 0,
      _blizzardFreeAttacks: 0,
      floorMonsters,
      monsterFace: isBoss ? loc.boss.face : floorMonsters[0].face,
      currentMonsterName: isBoss ? loc.boss.name : floorMonsters[0].name,
      monsterAttackType: isBoss ? (loc.boss.attackType || ATTACK_TYPES.MELEE) : (floorMonsters[0].attackType || ATTACK_TYPES.MELEE),
      monsterIcons: isBoss ? [] : floorMonsters.map(function(m){return m.face;}),
      monsterNames: isBoss ? [] : floorMonsters.map(function(m){return m.name;}),
      monsterTheme: isBoss ? loc.theme : (floorMonsters[0].theme !== undefined ? floorMonsters[0].theme : loc.theme),
      // Loot drops per monster (pro vizuální indikaci)
      _lootDrops: state._floorLootDrops || [],
      // Sekvence: hráč musí přežít várku útoků, pak může udeřit
      sequence: [], sequenceIndex: 0, inAttackWindow: false,
      currentAttack: null, isHeavyAttack: false,
      isInvertedAttack: false, isTwinAttack: false, isGreenAttack: false,
      _heavySwipes: 0, _twinSwipes: [],
      isRapidAttack: false, rapidTaps: 0, rapidTarget: 0,
      dodgeCharges: 3, maxDodgeCharges: 3,
      _lastSwipeDir: null,
      _heatLevel: 0, // D4 přehřívání: 0 = normální, kladné = rychlejší
      _freezeUntil: null // D5 timer freeze: timestamp kdy freeze končí (null = není frozen)
    };
    // Schools handled via activeSchool

    showScreen('mapBattle');
    // Skrýt starou šipku z předchozího boje ihned
    const arrowReset = $('mbArrow');
    if (arrowReset) arrowReset.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfoReset = $('mbActionInfo');
    if (actionInfoReset) { actionInfoReset.classList.add('hidden'); actionInfoReset.textContent = ''; }
    if (!isBoss) _forceNewBattleBgm = true;
    switchBGM(isBoss ? 'boss' : 'battle');
    document.body.classList.add('battle-active');
    updateMapBattleUI();
    setupMapBattleInput();
    applySchoolColors();
    // Animace příchodu
    const newFig = $('mbFigure');
    if (newFig && !mapBattleState.isBoss) {
      newFig.classList.remove('enemy-enter', 'enemy-idle', 'boss-idle', 'monster-dying');
      void newFig.offsetWidth;
      newFig.classList.add('monster-appear');
    }
    setTimeout(() => mapBattleTurn(), 500);
  }

  function updateMapBattleUI() {
    const mb = mapBattleState;
    if (!mb.loc) return;
    if (mb.isBoss) {
      const b = mb.loc.boss;
      const atkIcon = (b.attackType || ATTACK_TYPES.MELEE) === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
      $('mbEnemyName').textContent = `${b.name} ${atkIcon}`;
      $('mbLocation').textContent = `👑 BOSS ${mb.loc.name} — P5`;
    } else {
      const floorStr = `P${mb.floor+1}`;
      const atkIcon = mb.monsterAttackType === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
      $('mbEnemyName').textContent = `${mb.currentMonsterName} ${atkIcon}`;
      $('mbLocation').textContent = `${mb.loc.name} — P${mb.floor+1}`;
    }
    const pHpPct = Math.round((mb.playerHp / mb.maxPlayerHp) * 100);
    const eHpPct = mb.isBoss ? Math.floor((mb.bossHp / mb.maxBossHp) * 100) : Math.floor((mb.bossHp / mb.maxBossHp) * 100);
    // Kruhový HP bar — okraj obrázku monstra, skáče po segmentech
    const hpCircle = document.querySelector('.hp-ring-svg .hp-circle');
    if (hpCircle) {
      const circ = 547;
      const maxHp = Math.round(mb.maxBossHp);
      const curHp = Math.max(0, Math.round(mb.bossHp));
      const segSize = circ / maxHp;
      const offset = Math.round(segSize * (maxHp - curHp));
      hpCircle.setAttribute('stroke-dashoffset', offset);
    }
    // Segmenty na kruhovém HP baru nepřítele
    const segGroup = $('mbEnemyHpSegments');
    if (segGroup) {
      const maxHp = Math.round(mb.maxBossHp);
      const circ = 547;
      let segHtml = '';
      for (let i = 1; i < maxHp; i++) {
        const offset = Math.round(circ * (1 - i / maxHp) - 1);
        segHtml += `<circle cx="90" cy="90" r="87" stroke-dasharray="2 ${circ-2}" stroke-dashoffset="${offset}" stroke-width="10"/>`;
      }
      segGroup.innerHTML = segHtml;
    }
    // Segmenty na rovné HP baru hráče
    const playerSegs = $('mbPlayerHpSegments');
    if (playerSegs) {
      const maxHp = Math.round(mb.maxPlayerHp);
      let segHtml = '';
      for (let i = 0; i < maxHp; i++) {
        segHtml += '<div class="hp-seg"></div>';
      }
      playerSegs.innerHTML = segHtml;
    }
    const hpLabel = $('mbHpLabel');
    if (hpLabel) {
      hpLabel.textContent = `${Math.max(0, Math.round(mb.bossHp))}/${Math.round(mb.maxBossHp)}`;
      // Dynamická velikost fontu — při delším textu zmenšit, aby nepřetekl
      const len = hpLabel.textContent.length;
      if (len > 7) hpLabel.style.fontSize = Math.max(14, Math.round(24 * 7 / len)) + 'px';
      else hpLabel.style.fontSize = '24px';
    }
    // Arena HP bar na spodku
    const arenaHp = $('mbPlayerArenaHp');
    if (arenaHp) {
      const span = arenaHp.querySelector('span');
      if (span) span.textContent = `${mb.playerHp}/${mb.maxPlayerHp}`;
      const fill = $('mbPlayerArenaHpFill');
      if (fill) fill.style.width = Math.max(0, pHpPct) + '%';
    }
    // Dodge charges
    const dodgeEl = $('mbPlayerArenaStamina');
    if (dodgeEl) {
      const span = dodgeEl.querySelector('span');
      if (span) span.textContent = `${mb.dodgeCharges}/${mb.maxDodgeCharges}`;
      const fill = $('mbPlayerArenaStaminaFill');
      if (fill) fill.style.width = Math.max(0, Math.round((mb.dodgeCharges / mb.maxDodgeCharges) * 100)) + '%';
    }
    // Segmenty dodge charges
    const dodgeSegs = $('mbDodgeSegments');
    if (dodgeSegs) {
      let segHtml = '';
      for (let i = 0; i < mb.maxDodgeCharges; i++) {
        segHtml += '<div class="hp-seg"></div>';
      }
      dodgeSegs.innerHTML = segHtml;
    }
    const emoji = mb.isBoss ? mb.loc.boss.face : mb.monsterFace;
    const fig = $('mbFigure');
    if (fig && emoji) {
      const themeFilter = DUNGEON_THEME_FILTERS[mb.monsterTheme] || '';
      const theme = DUNGEON_THEMES[mb.monsterTheme] || DUNGEON_THEMES[0];
      if (emoji.startsWith('<svg')) { fig.innerHTML = emoji; }
      else if (emoji.startsWith('assets/')) { fig.innerHTML = '<div class=\"monster-ring-frame\"><img src=\"'+emoji+'\" alt=\"\" style=\"filter:'+themeFilter+'\"/></div>'; }
      else { fig.textContent = emoji; }
    }
    // (hint necháme pro bonus info — nastaví se až v onMapAttack)

    // School spells — HTML tlacitka nad Utokem, vzdy na stejne pozici (84px)
    const fireBtn = $('mbSpellFireBtn');
    const healBtn = $('mbSpellHealBtn');
    const freezeBtn = $('mbSpellFreezeBtn');
    const physBtn = $('mbSpellPhysBtn');
    // Vsechna schovat (default)
    [fireBtn, healBtn, freezeBtn, physBtn].forEach(b => { if (b) { b.classList.add('hidden'); b.classList.remove('active', 'used'); } });
    const activeId = state.activeSchool;
    if (!activeId) return;
    const school = SCHOOL_MAP[activeId];
    if (!school) return;
    const spellId = getBestSpellId(activeId);
    if (!spellId) return;
    const lv = getSpellLv(spellId);
    // Ukazat spravne kouzlo — VZDY viditelne, aktivni jen kdyz je prilezitost
    const btn = activeId === 'fire' ? fireBtn : activeId === 'ice' ? freezeBtn : activeId === 'physical' ? physBtn : healBtn;
    if (!btn) return;
    btn.classList.remove('hidden');
    const spellIcons = { firebolt:'🔥', fireblast:'💥', fireball:'🔥', frostbolt:'❄️', blizzard:'❄️', heal:'💚', strongStrike:'💢', slash:'⚡', whirlwind:'🌀' };
    const spellIcon = spellIcons[spellId] || '⚔️';
    btn.innerHTML = spellIcon;
    // Aktivni jen v attack okne (pokud je mana)
    const manaCosts = { firebolt: 10, fireblast: 20, fireball: 35, frostbolt: 10, icebolt: 10, blizzard: 30, heal: 15, strongStrike: 8, slash: 15, whirlwind: 25 };
    const cost = (manaCosts[spellId] || 15) + lv * 2;
    const hasMana = (state.hero.mana || 0) >= cost;
    if (mb.inAttackWindow && hasMana) {
      btn.classList.add('active');
    }
  }

  function updateActionButtons() {
    const mb = mapBattleState;
    const dodge = $('mbDodgeBtn');
    // Dodge — aktivní jen když je nabití
    if (dodge) {
      if (mb.dodgeCharges > 0 && !mb.isRapidAttack) dodge.classList.add('active');
      else dodge.classList.remove('active');
    }
  }

  function setupMapBattleInput() {
    const arena = $('mbArena');
    if (!arena) return;
    const old = arena._mbHandlers;
    if (old) old.forEach(h => arena.removeEventListener(h[0], h[1]));

    let startX, startY;
    const handlers = [];

    // Click handler for dodge button (pointerdown = immediate, no 300ms click delay)
    const dodgeBtn = $('mbDodgeBtn');
    if (dodgeBtn) {
      const dodgeHandler = (e) => {
        e.stopPropagation();
        onMapDodgeAction();
      };
      dodgeBtn.addEventListener('pointerdown', dodgeHandler);
      handlers.push(['pointerdown', dodgeHandler]);
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
      if (e.repeat) return; // ignorovat key repeat (auto-opakování při držení)
      const map = { ArrowUp:'⬆️',ArrowDown:'⬇️',ArrowLeft:'⬅️',ArrowRight:'➡️','w':'⬆️','s':'⬇️','a':'⬅️','d':'➡️' };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); onMapDodge(dir); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (mapBattleState._attackProcessed) return; onMapDodgeAction(); }
    };
    window.addEventListener('keydown', kh);
    handlers.push(['keydown', kh]);
    arena._mbHandlers = handlers;
    // Rapid tap handlery — nejdřív smazat staré
    const clearTap = (elId) => {
      const el = $(elId);
      if (!el) return;
      if (el._rapidHandler) {
        el.removeEventListener('pointerdown', el._rapidHandler);
        el._rapidHandler = null;
      }
    };
    clearTap('mbTapLeft');
    clearTap('mbTapRight');
    const setupTap = (elId) => {
      const el = $(elId);
      if (!el) return;
      const tapHandler = (e) => {
        e.stopPropagation();
        onMapRapidTap(elId);
      };
      el._rapidHandler = tapHandler;
      el.addEventListener('pointerdown', tapHandler);
    };
    setupTap('mbTapLeft');
    setupTap('mbTapRight');
    // Arena spell tlacitka (Fireball/Heal)
    const spellFireBtn = $('mbSpellFireBtn');
    if (spellFireBtn) {
      const fireHandler = (e) => {
        e.stopPropagation();
        const best = getBestSpellId(state.activeSchool);
        if (best) onMapAttackSpell(best);
      };
      spellFireBtn.addEventListener('pointerdown', fireHandler);
      handlers.push(['pointerdown', fireHandler]);
    }
    const spellHealBtn = $('mbSpellHealBtn');
    if (spellHealBtn) {
      const healHandler = (e) => {
        e.stopPropagation();
        onMapAttackSpell('heal');
      };
      spellHealBtn.addEventListener('pointerdown', healHandler);
      handlers.push(['pointerdown', healHandler]);
    }
    const spellFreezeBtn = $('mbSpellFreezeBtn');
    if (spellFreezeBtn) {
      const freezeHandler = (e) => {
        e.stopPropagation();
        const best = getBestSpellId(state.activeSchool);
        if (best) onMapAttackSpell(best);
      };
      spellFreezeBtn.addEventListener('pointerdown', freezeHandler);
      handlers.push(['pointerdown', freezeHandler]);
    }
    const spellPhysBtn = $('mbSpellPhysBtn');
    if (spellPhysBtn) {
      const physHandler = (e) => {
        e.stopPropagation();
        const best = getBestSpellId(state.activeSchool);
        if (best) onMapAttackSpell(best);
      };
      spellPhysBtn.addEventListener('pointerdown', physHandler);
      handlers.push(['pointerdown', physHandler]);
    }
  }

  function getFloorTimerMultiplier(floor, locId) {
    // D2 (Poušť) — base je o něco pomalejší, ale bude kolísat v rAF
    if (locId === 1) return Math.pow(0.95, floor) * 1.15;
    // Ostatní dungeony: 1200ms base, každé patro -5%
    return Math.pow(0.95, floor);
  }

  function getDungeonAttackChances(locId, floor) {
    // D1, D2: jen šedé šipky
    if (locId === 0 || locId === 1) return { grey: 85, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth: 0, lie: 0, freeze: 0 };
    // D3 (Nemrtvá země): truth (zelená=normální), lie (červená=opačný), freeze (modrá=nic)
    if (locId === 2) {
      const f = floor || 0;
      const truth = Math.max(30, 70 - f * 4);
      const lie = Math.min(35, 15 + f * 2);
      const freeze = Math.min(35, 15 + f * 2);
      return { grey: 0, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth, lie, freeze };
    }
    // D4 (Pekelné výspy): truth/lie/freeze + přehřívání
    if (locId === 3) {
      const f = floor || 0;
      const truth = Math.max(20, 60 - f * 4);
      const lie = Math.min(40, 20 + f * 2);
      const freeze = Math.min(40, 20 + f * 2);
      return { grey: 0, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth, lie, freeze };
    }
    // D5 (Mrazivé štíty): truth/lie/freeze + přehřívání + timer freeze
    if (locId === 4) {
      const f = floor || 0;
      const truth = Math.max(20, 60 - f * 4);
      const lie = Math.min(40, 20 + f * 2);
      const freeze = Math.min(40, 20 + f * 2);
      return { grey: 0, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth, lie, freeze };
    }
    return { grey: 85, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth: 0, lie: 0, freeze: 0 };
  }

  const _arrowSvg = (fill, extra = '') => {
    // Tmavší border — odečíst 60 od každé RGB složky
    const hex = fill.replace('#','');
    const r = Math.max(0, parseInt(hex.substr(0,2),16) - 60);
    const g = Math.max(0, parseInt(hex.substr(2,2),16) - 60);
    const b = Math.max(0, parseInt(hex.substr(4,2),16) - 60);
    const border = `#${(r<16?'0':'')+r.toString(16)}${(g<16?'0':'')+g.toString(16)}${(b<16?'0':'')+b.toString(16)}`;
    return `<svg viewBox="0 0 16 16" width="78" height="78">
      <path${extra} d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="${border}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
      <path${extra} d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="${fill}" stroke="${fill}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  };

  function getDungeonMechanics(locId, floor) {
    const c = getDungeonAttackChances(locId, floor);
    const icons = [];
    icons.push(_arrowSvg('#bbb')); // normální úhyb — vždy
    // D2 — nestabilní timer (červená/modrá)
    if (locId === 1) icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">⚡</span>');
    // D3 — lživé šipky
    if (locId === 2) {
      icons.push(_arrowSvg('#2ecc71')); // truth — zelená
      icons.push(_arrowSvg('#e94560')); // lie — červená
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔵</span>'); // freeze — modrá
    }
    // D4 — lživé šipky + přehřívání
    if (locId === 3) {
      icons.push(_arrowSvg('#2ecc71')); // truth — zelená
      icons.push(_arrowSvg('#e94560')); // lie — červená
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔵</span>'); // freeze — modrá
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔥</span>'); // přehřívání
    }
    // D5 — lživé šipky + přehřívání + timer freeze
    if (locId === 4) {
      icons.push(_arrowSvg('#2ecc71')); // truth — zelená
      icons.push(_arrowSvg('#e94560')); // lie — červená
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔵</span>'); // freeze — modrá
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔥</span>'); // přehřívání
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">❄️</span>'); // timer freeze
    }
    return icons;
  }
  function getDungeonResistIcons(locId) {
    const loc = LOCATIONS[locId];
    if (!loc || !loc.resists) return '';
    const r = loc.resists;
    let weak = [], strong = [];
    if (r.fire > 1.0) weak.push('🔥');
    else if (r.fire < 1.0) strong.push('🔥');
    if (r.ice > 1.0) weak.push('❄️');
    else if (r.ice < 1.0) strong.push('❄️');
    if (r.nature > 1.0) weak.push('🌿');
    else if (r.nature < 1.0) strong.push('🌿');
    let parts = [];
    if (weak.length) parts.push('⚔️' + weak.join(''));
    if (strong.length) parts.push('🛡️' + strong.join(''));
    return parts.length ? parts.join(' ') : '';
  }

  function generateAttack(chances, prevType, locId, floor) {
    const randTotal = chances.grey + chances.yellow + chances.blue + chances.green + chances.inverted + (chances.rapid||0) + (chances.truth||0) + (chances.lie||0) + (chances.freeze||0);
    const randNum = Math.random() * randTotal;
    let type = 'grey';
    if (randNum < chances.inverted) { type = 'inverted'; }
    else if (randNum < chances.inverted + chances.green) { type = 'green'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow) { type = 'yellow'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue) { type = 'blue'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue + (chances.rapid||0)) { type = 'rapid'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue + (chances.rapid||0) + (chances.truth||0)) { type = 'truth'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue + (chances.rapid||0) + (chances.truth||0) + (chances.lie||0)) { type = 'lie'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue + (chances.rapid||0) + (chances.truth||0) + (chances.lie||0) + (chances.freeze||0)) { type = 'freeze'; }
    // Timer: base 1500ms, floor multiplikátor (P1=1500, P10=~900ms)
    const mult = getFloorTimerMultiplier(floor || 0, locId);
    const baseTime = Math.round(1500 * mult);
    // Malá náhoda ±10% pro pestrost
    const jitter = Math.round(baseTime * (0.9 + Math.random() * 0.2));
    const windowTime = (type === 'yellow' || type === 'blue') ? Math.round(jitter * 1.5) : (type === 'rapid' ? Math.round(jitter * 3.0) : jitter);
    const dir = DIRECTIONS[rand(0,3)];
    if (type === 'blue') {
      // Dvojitá šipka: vyber protichůdný pár (nahoru-dolů nebo vlevo-vpravo)
      const pairs = [['⬆️','⬇️'], ['⬅️','➡️']];
      const pair = pairs[rand(0,1)];
      const dirA = pair[0], dirB = pair[1];
      return { type, dir: dirA, twinDir: dirB, windowTime };
    }
    if (type === 'rapid') {
      // Rapid: náhodný cíl 20-35 podle patra (+25%)
      const rapidTarget = Math.min(20 + Math.floor((floor||0) * 4), 35);
      return { type, dir, windowTime, rapidTarget };
    }
    return { dir, type, windowTime };
  }

  function getAttackHint(attack) {
    const dir = attack.dir;
    if (attack.type === 'grey') return `${dir} ⚪ Útok — swipni!`;
    if (attack.type === 'yellow') return `${dir} 🟡 Silný útok — 2× ${dir}!`;
    if (attack.type === 'blue') return `${dir}↔${attack.twinDir} 🔷 Dvojitý útok — oba směry!`;
    if (attack.type === 'green') return `${dir} 🟢 Léčení — swipni pro HP!`;
    if (attack.type === 'inverted') return `${dir} 🟢 Inverzní — udělej OPAK!`;
    if (attack.type === 'rapid') return `🔮 Ťukej! ${attack.rapidTarget}× na plošky!`;
    if (attack.type === 'truth') return `${dir} 🟢 Pravda — swipni jak šipka!`;
    if (attack.type === 'lie') return `${dir} 🔴 Lež — udělej OPAK!`;
    if (attack.type === 'freeze') return `${dir} 🔵 Zmrzni — NESMÍŠ swipnout!`;
    return `${dir} útok!`;
  }

  function resetTimerRing() {
    const circle = document.querySelector('.timer-circle');
    if (!circle) return null;
    // Vytvořit zbrusu nový circle — DOM výměna je jediný spolehlivý reset CSS animace
    const parent = circle.parentNode;
    if (!parent) return null;
    const fresh = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (let i = 0; i < circle.attributes.length; i++) {
      const attr = circle.attributes[i];
      fresh.setAttribute(attr.name, attr.value);
    }
    fresh.style.opacity = '0';
    fresh.style.animation = 'none';
    fresh.style.strokeDashoffset = '691';
    fresh.classList.add('timer-circle');
    parent.replaceChild(fresh, circle);
    // Vynutit reflow na novém elementu
    void fresh.offsetHeight;
    return fresh;
  }

  function startTimerRing(circle, durationMs) {
    if (!circle) return;
    circle.style.opacity = '1';
    circle.style.animation = `timer-ring-shrink ${durationMs}ms linear forwards`;
  }
  function restartTimerRing(circle, durationMs) {
    if (!circle) return;
    circle.style.animation = 'none';
    void circle.offsetWidth; // reflow
    circle.style.animation = `timer-ring-shrink ${durationMs}ms linear forwards`;
  }

  function mapBattleTurn() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    mb.turn++;
    updateMapBattleUI();

    // RPG baseDmg
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    const eqAttrs = getEquipAttrs();
    mb.baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + eqAttrs.str) * 2;

    // Generovat sekvenci
    const chances = getDungeonAttackChances(mb.locId, mb.floor);
    // Zelená (heal) jen když chybí HP — jen pro dungeony co mají green
    if (chances.green > 0 && mb.playerHp >= mb.maxPlayerHp) {
      chances.green = 0;
      chances.grey += 10;
    }
    let seqLen = 10; // fixní délka sekvence pro všechny dungeony
    mb.sequence = [];
    let prevType = null;
    for (let i = 0; i < seqLen; i++) {
      const atk = generateAttack(chances, prevType, mb.locId, mb.floor);
      prevType = atk.type;
      mb.sequence.push(atk);
    }
    mb.sequenceIndex = 0;
    mb.inAttackWindow = false;
    mb.isAttacking = true;
    renderSeqProgress(mb);

    // Reset UI
    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) { actionInfo.classList.add('hidden'); actionInfo.textContent = ''; }
    const playerEl = $('mbPlayerFigure');
    if (playerEl) playerEl.className = 'boss-fight-player';
    mb._sequenceTimer = null;
    updateActionButtons();

    // Začít první útok sekvence
    playSequenceAttack();
  }

  function renderSeqProgress(mb) {
    const el = $('mbSeqProgress');
    if (!el) return;
    el.innerHTML = '';
  }

  function flashSeqFail() {
    const el = $('mbSeqProgress');
    if (!el) return;
    const dots = el.querySelectorAll('.seq-dot');
    dots.forEach(d => d.classList.add('fail'));
    setTimeout(() => {
      dots.forEach(d => {
        d.classList.remove('done');
        d.classList.remove('fail');
      });
    }, 400);
  }

  function playSequenceAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.sequenceIndex >= mb.sequence.length) {
      // Sekvence hotová — další kolo
      setTimeout(() => mapBattleTurn(), 0);
      return;
    }
    if (mb.playerHp <= 0) { endMapBattle(false); return; }
    if (mb.bossHp <= 0) { endMapBattle(true); return; }

    const attack = mb.sequence[mb.sequenceIndex];

    mb.currentAttack = attack.dir;
    mb.isHeavyAttack = attack.type === 'yellow';
    mb.isInvertedAttack = attack.type === 'inverted';
    mb.isTwinAttack = attack.type === 'blue';
    mb.isRapidAttack = attack.type === 'rapid';
    mb.isGreenAttack = attack.type === 'green' || attack.type === 'truth' || attack.type === 'lie';
    mb.isRapidAttack = attack.type === 'rapid';
    if (attack.type === 'rapid') {
      mb.rapidTaps = 0;
      mb.rapidTarget = attack.rapidTarget || 10;
    } else {
      mb.rapidTaps = 0;
      mb.rapidTarget = 0;
    }
    mb._hitProcessed = false;

    const windowTime = attack.windowTime;
    mb._currentWindowTime = windowTime;
    if (mb.chillTicksLeft > 0) {
      mb._currentWindowTime = Math.round(windowTime * (1 + mb.chillPercent / 100));
    }

    // Reset kolečka
    const circle = resetTimerRing();

    // Zobrazit šipku
    const actionInfo = $('mbActionInfo');
    const arrow = $('mbArrow');
    if (attack.type === 'rapid') {
      applySchoolColors();
      if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
      if (actionInfo) actionInfo.classList.add('hidden');
      const target = $('mbRapidTarget');
      if (target) {
        target.textContent = `${attack.rapidTarget}`;
        target.classList.remove('hidden');
      }
      const arena = $('mbArena');
      if (arena) arena.classList.add('rapid-active');
      const leftTap = $('mbTapLeft');
      const rightTap = $('mbTapRight');
      if (leftTap) leftTap.classList.remove('hidden');
      if (rightTap) rightTap.classList.remove('hidden');
    } else {
      if (actionInfo) actionInfo.classList.add('hidden');
      if (arrow) {
        arrow.setAttribute('class', 'boss-attack-arrow');
        arrow.setAttribute('viewBox', '-3 -3 22 22');
        arrow.style.color = ''; // reset barvy z předchozího útoku
        const rotation = { '⬆️': 0, '⬇️': 180, '⬅️': -90, '➡️': 90 }[attack.dir] || 0;
        arrow.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        if (attack.type === 'yellow') {
          arrow.classList.add('boss-attack-yellow');
          arrow.innerHTML = '<g><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#8a7a30" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" transform="translate(-3,0)"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(-3,0)"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#8a7a30" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" transform="translate(3,0)"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(3,0)"/></g>';
        } else if (attack.type === 'blue') {
          arrow.style.transform = 'translate(-50%, -50%)';
          arrow.classList.add('boss-attack-blue');
          arrow.setAttribute('viewBox', '-3 -5 22 26');
          if (attack.dir === '⬆️') {
            arrow.innerHTML = '<g transform="translate(-2.5,0)"><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#3a5a7a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(2.5,0)"><path d="M8 15L3 8L5.5 8L5.5 1L10.5 1L10.5 8L13 8L8 15Z" fill="none" stroke="#3a5a7a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 15L3 8L5.5 8L5.5 1L10.5 1L10.5 8L13 8L8 15Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g>';
          } else {
            arrow.innerHTML = '<g transform="translate(0,-2.5)"><path d="M1 8L8 3L8 5.5L15 5.5L15 10.5L8 10.5L8 13L1 8Z" fill="none" stroke="#3a5a7a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M1 8L8 3L8 5.5L15 5.5L15 10.5L8 10.5L8 13L1 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(0,2.5)"><path d="M15 8L8 13L8 10.5L1 10.5L1 5.5L8 5.5L8 3L15 8Z" fill="none" stroke="#3a5a7a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M15 8L8 13L8 10.5L1 10.5L1 5.5L8 5.5L8 3L15 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g>';
          }
        } else if (attack.type === 'green') {
          arrow.classList.add('boss-attack-green');
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#3a7a5a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
        } else if (attack.type === 'truth') {
          arrow.classList.add('boss-attack-green');
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#3a7a5a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
        } else if (attack.type === 'lie') {
          arrow.classList.remove('boss-attack-green');
          arrow.style.color = '#e94560';
          arrow.style.fill = '#e94560';
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#b01a30" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="#e94560" stroke="#e94560" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
        } else if (attack.type === 'freeze') {
          arrow.classList.remove('boss-attack-green');
          arrow.style.color = '#4a7dff';
          arrow.style.fill = '#4a7dff';
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#1a4ab0" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="#4a7dff" stroke="#4a7dff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
        } else {
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#888" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
          if (attack.type === 'inverted') arrow.classList.add('boss-attack-green');
        }
      }
    }

    updateActionButtons();

    // Timer ring — CSS animace (stabilní, žádné měnění během timeru)
    if (mb.dotTicksLeft > 0) circle.style.stroke = '#4caf50';
    else if (mb.chillTicksLeft > 0) circle.style.stroke = '#4fc3f7';
    else circle.style.stroke = '#888';
    
    // 🎯 Fixní výseč — začíná v 50% timeru (6 hodin), 20% šířka
    let winTime = mb._currentWindowTime;
    
    // D2 (Poušť) — náhodná rychlost na začátku každého útoku, jen červená/modrá
    if (mb.locId === 1) {
      const floor = mb.floor;
      const minSpeed = Math.max(0.3, 0.75 - floor * 0.05);
      const maxSpeed = Math.min(1.6, 1.35 + floor * 0.025);
      const isFast = Math.random() < 0.5;
      const speed = isFast ? maxSpeed : minSpeed;
      winTime = Math.round(winTime / speed);
      circle.style.stroke = isFast ? '#e94560' : '#4a7dff';
    }
    
    // D4 (Pekelné výspy) — přehřívání + červená/modrá jako D2
    if (mb.locId === 3) {
      const floor = mb.floor;
      const minSpeed = Math.max(0.3, 0.75 - floor * 0.05);
      const maxSpeed = Math.min(1.6, 1.35 + floor * 0.025);
      const isFast = Math.random() < 0.5;
      const speed = isFast ? maxSpeed : minSpeed;
      let baseWinTime = Math.round(winTime / speed);
      // Heat overlay
      const heatMult = 1 + mb._heatLevel * 0.08;
      winTime = Math.round(baseWinTime / heatMult);
      // Barva: základ červená/modrá, s heatem se posouvá
      if (mb._heatLevel > 0) {
        const heatPct = Math.min(mb._heatLevel / 10, 1);
        let r, g, b;
        if (isFast) {
          // Červená → oranžová → žlutá
          r = 233;
          g = Math.round(69 + heatPct * (200 - 69));
          b = Math.round(96 - heatPct * 96);
        } else {
          // Modrá → fialová
          r = Math.round(74 + heatPct * (200 - 74));
          g = Math.round(127 - heatPct * 60);
          b = Math.round(255 - heatPct * 60);
        }
        circle.style.stroke = `rgb(${r},${g},${b})`;
      } else {
        circle.style.stroke = isFast ? '#e94560' : '#4a7dff';
      }
    }
    
    // D5 (Mrazivé štíty) — přehřívání + červená/modrá + timer freeze
    if (mb.locId === 4) {
      const floor = mb.floor;
      const minSpeed = Math.max(0.3, 0.75 - floor * 0.05);
      const maxSpeed = Math.min(1.6, 1.35 + floor * 0.025);
      const isFast = Math.random() < 0.5;
      const speed = isFast ? maxSpeed : minSpeed;
      let baseWinTime = Math.round(winTime / speed);
      // Heat overlay
      const heatMult = 1 + mb._heatLevel * 0.08;
      winTime = Math.round(baseWinTime / heatMult);
      // Barva: základ červená/modrá, s heatem se posouvá
      if (mb._heatLevel > 0) {
        const heatPct = Math.min(mb._heatLevel / 10, 1);
        let r, g, b;
        if (isFast) {
          r = 233;
          g = Math.round(69 + heatPct * (200 - 69));
          b = Math.round(96 - heatPct * 96);
        } else {
          r = Math.round(74 + heatPct * (200 - 74));
          g = Math.round(127 - heatPct * 60);
          b = Math.round(255 - heatPct * 60);
        }
        circle.style.stroke = `rgb(${r},${g},${b})`;
      } else {
        circle.style.stroke = isFast ? '#e94560' : '#4a7dff';
      }
      // Generovat freeze intervaly — 0-2 náhodné freeze, 500-1500ms
      const freezeCount = Math.random() < 0.5 ? 1 : (Math.random() < 0.3 ? 2 : 0);
      mb._freezeIntervals = [];
      mb._totalFrozenMs = 0;
      mb._freezeUntil = null;
      for (let fi = 0; fi < freezeCount; fi++) {
        const minStart = 500;
        const maxStart = Math.max(minStart + 100, winTime - 500);
        const startMs = minStart + Math.random() * (maxStart - minStart);
        const duration = 500 + Math.random() * 1000; // 500-1500ms
        mb._freezeIntervals.push({ startMs, duration });
      }
    }
    
    const bStartMs = Math.round(winTime * 0.5); // výseč začíná v 50% timeru (6 hodin)
    const bMs = Math.round(winTime * 0.15); // 15% šířka
    mb._bonusStartMs = bStartMs;
    mb._bonusMs = bMs;
    
    // Vizuální znázornění výseče na kolečku
    const bCircum = 741;
    const zWidthPx = Math.max(1, Math.round((bMs / winTime) * 741));
    const zStartPx = Math.round((bStartMs / winTime) * 741);
    const bonusCircle = document.querySelector('.bonus-zone-circle');
    if (bonusCircle) {
      const remaining = Math.max(0, 741 - zStartPx - zWidthPx);
      bonusCircle.style.strokeDasharray = `0 ${zStartPx} ${zWidthPx} ${remaining}`;
      bonusCircle.style.strokeDashoffset = '0';
    }
    mb._zoneWidthPx = zWidthPx;
    mb._zoneStartPx = zStartPx;
    mb._bonusCircum = 741;
    
    if (mb._bonusRaf) cancelAnimationFrame(mb._bonusRaf);
    const attackStartTime = performance.now();
    let _lastEffectiveElapsed = 0; // D5: poslední effectiveElapsed před freeze
    let _savedStrokeColor = null; // D5: původní barva kruhu před freeze
    (function frame() {
      if (mapBattleState.ended) return;
      const now = performance.now();
      const rawElapsed = now - attackStartTime;
      
      // D5 timer freeze — zkontrolovat jestli jsme v freeze intervalu
      let isFrozen = false;
      if (mb.locId === 4 && mb._freezeIntervals && mb._freezeIntervals.length > 0) {
        for (let fi = 0; fi < mb._freezeIntervals.length; fi++) {
          const fz = mb._freezeIntervals[fi];
          if (rawElapsed >= fz.startMs && rawElapsed < fz.startMs + fz.duration) {
            isFrozen = true;
            mb._freezeUntil = fz.startMs + fz.duration;
            break;
          }
        }
        if (!isFrozen) {
          mb._freezeUntil = null;
        }
      }
      
      // Spočítat celkový freeze čas (jen dokončené intervaly)
      let totalFrozen = 0;
      if (mb.locId === 4 && mb._freezeIntervals) {
        for (let fi = 0; fi < mb._freezeIntervals.length; fi++) {
          const fz = mb._freezeIntervals[fi];
          if (rawElapsed >= fz.startMs + fz.duration) {
            totalFrozen += fz.duration;
          } else if (rawElapsed > fz.startMs) {
            totalFrozen += rawElapsed - fz.startMs;
          }
        }
      }
      
      let effectiveElapsed;
      if (isFrozen) {
        // Během freeze — effectiveElapsed stojí na poslední hodnotě
        effectiveElapsed = _lastEffectiveElapsed;
      } else {
        // Mimo freeze — effectiveElapsed = rawElapsed - celkový freeze čas
        effectiveElapsed = rawElapsed - totalFrozen;
        _lastEffectiveElapsed = effectiveElapsed;
      }
      
      const pct = Math.min(effectiveElapsed / winTime, 1);
      mb._bonusActive = (effectiveElapsed >= mb._bonusStartMs && effectiveElapsed < mb._bonusStartMs + mb._bonusMs);
      if (circle) {
        circle.style.opacity = '1';
        if (isFrozen) {
          // Během freeze — kolečko stojí, modrá barva
          if (_savedStrokeColor === null) _savedStrokeColor = circle.style.stroke;
          circle.style.stroke = '#4fc3f7';
        } else {
          // Po freeze — obnovit původní barvu
          if (_savedStrokeColor !== null) {
            circle.style.stroke = _savedStrokeColor;
            _savedStrokeColor = null;
          }
          circle.style.strokeDashoffset = Math.round(691 * (1 - pct));
        }
      }
      if (effectiveElapsed < winTime) {
        mb._bonusRaf = requestAnimationFrame(frame);
      } else {
        mb._bonusActive = false;
        mb._bonusRaf = null;
      }
    })();

    // Timeout = chyba (nestihl zareagovat), kromě freeze — tam je timeout = úspěch
    // Pro D5: winTime + celkový freeze čas
    let timeoutWinTime = winTime;
    if (mb.locId === 4 && mb._freezeIntervals) {
      let totalFrozen = 0;
      mb._freezeIntervals.forEach(fz => totalFrozen += fz.duration);
      timeoutWinTime = winTime + totalFrozen;
    }
    mb._sequenceTimer = setTimeout(() => {
      if (mapBattleState.ended) return;
      if (attack.type === 'freeze') {
        // Freeze: neudělat nic = správně
        // D4 — ochlazení: úspěšná freeze snižuje heat
        if (mb.locId === 3 && mb._heatLevel > 0) {
          mb._heatLevel = Math.max(0, mb._heatLevel - 1);
        }
        // D5 — ochlazení: úspěšná freeze snižuje heat
        if (mb.locId === 4 && mb._heatLevel > 0) {
          mb._heatLevel = Math.max(0, mb._heatLevel - 1);
        }
        advanceSequence();
      } else {
        onMapHit();
      }
    }, timeoutWinTime);
  }

  // DoT tick helper — volá se po každém timeru (ať už hráč uspěl, nebo dostal ránu)
  function doDotTick(mb) {
    if (mb.dot <= 0 || mb.dotTicksLeft <= 0) return false;
    mb.bossHp -= mb.dot;
    mb.dotTicksLeft--;
    // (hint necháme pro bonus info)
    const dotDmgText = $('mbDamageText');
    if (dotDmgText) {
      dotDmgText.textContent = `☠️ -${mb.dot}`;
      dotDmgText.classList.remove('hidden');
      setTimeout(() => dotDmgText.classList.add('hidden'), 800);
    }
    const bossFig = $('mbFigure');
    if (bossFig) {
      bossFig.style.transition = 'filter 0.2s';
      bossFig.style.filter = 'brightness(2.5) hue-rotate(90deg) saturate(2)';
      setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 300);
    }
    updateMapBattleUI();
    if (mb.bossHp <= 0 && mb.isBoss) { setTimeout(() => { if (!mapBattleState.ended) endMapBattle(true); }, 250); return true; }
    return false;
  }

  // Player DoT tick — jed z monster, tickuje po každém timeru
  function doPlayerDotTick(mb) {
    if (mb.playerDot <= 0 || mb.playerDotTicksLeft <= 0) return false;
    mb.playerHp -= mb.playerDot;
    mb.playerDotTicksLeft--;
    const playerFig = $('mbPlayerFigure');
    if (playerFig) {
      playerFig.style.transition = 'filter 0.2s';
      playerFig.style.filter = 'brightness(2.5) hue-rotate(270deg) saturate(2)';
      setTimeout(() => { playerFig.style.filter = 'brightness(1)'; setTimeout(() => { playerFig.style.transition = ''; }, 200); }, 300);
    }
    const dotDmgText = $('mbPlayerDamageText');
    if (dotDmgText) {
      dotDmgText.textContent = `☠️ -${mb.playerDot}`;
      dotDmgText.classList.remove('hidden');
      setTimeout(() => dotDmgText.classList.add('hidden'), 800);
    }
    updateMapBattleUI();
    if (mb.playerHp <= 0) { endMapBattle(false); return true; }
    return false;
  }

  function advanceSequence() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    // DoT tick — každý timer = jeden tick
    if (doDotTick(mb)) return;
    // Player DoT tick — jed z monster
    if (doPlayerDotTick(mb)) return;

    // HoT tick — léčení každý tick
    if (mb.hotTicksLeft > 0) {
      mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + mb.hot);
      mb.hotTicksLeft--;
    }
    // Pasivní regenerace
    const regen = getNatureRegen();
    if (regen > 0) {
      mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + regen);
    }
    // Mana regen
    const h = state.hero;
    const eqAttrs = getEquipAttrs();
    const manaRegen = 1 + ((h.attrInt || 0) + eqAttrs.int) * 2;
    h.mana = Math.min(h.maxMana, (h.mana || 0) + manaRegen);
    const am = $('mbPlayerArenaMana');
    if (am) {
      const span = am.querySelector('span');
      if (span) span.textContent = `${h.mana}/${h.maxMana}`;
      const fill = $('mbPlayerArenaManaFill');
      if (fill) fill.style.width = Math.max(0, Math.round((h.mana / h.maxMana) * 100)) + '%';
    }

    // Chill tick
    if (mb.chillTicksLeft > 0) mb.chillTicksLeft--;
    if (mb.chillTicksLeft <= 0 && mb._activeSpellChillActive) mb._activeSpellChillActive = false;

    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._hitProcessed = true;
    // Skrýt bonusový kruh
    const bc2 = document.querySelector('.bonus-zone-circle');
    if (bc2) bc2.style.strokeDasharray = '0 741';
    mb.currentAttack = null;
    mb.isHeavyAttack = false;
    mb.isInvertedAttack = false;
    mb.isTwinAttack = false;
    mb.isRapidAttack = false;
    mb.isGreenAttack = false;
    mb.rapidTaps = 0;
    mb.rapidTarget = 0;
    mb._heavySwipes = 0;
    mb._twinSwipes = [];

    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) actionInfo.classList.add('hidden');
    const rTarget = $('mbRapidTarget');
    if (rTarget) rTarget.classList.add('hidden');
    const lTap = $('mbTapLeft');
    const rTap = $('mbTapRight');
    if (lTap) lTap.classList.add('hidden');
    if (rTap) rTap.classList.add('hidden');
    const arena = $('mbArena');
    if (arena) arena.classList.remove('rapid-active');

    mb.sequenceIndex++;
    renderSeqProgress(mb);

    if (mb.playerHp <= 0) { endMapBattle(false); return; }
    if (mb.bossHp <= 0) { endMapBattle(true); return; }

    // Sekvence hotová — nové kolo
    if (mb.sequenceIndex >= mb.sequence.length) {
      setTimeout(() => mapBattleTurn(), 0);
      return;
    }

    resetTimerRing();
    setTimeout(() => playSequenceAttack(), 150);
  }

  function openAttackWindow() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    mb.inAttackWindow = true;
    mb.isAttacking = false;

    // Zobrazit ⚔️ info ikonu v kolečku (vždy meč, ne ikona školy)
    const actionInfo = $('mbActionInfo');
    if (actionInfo) {
      actionInfo.textContent = '⚔️';
      actionInfo.classList.remove('hidden');
    }
    updateActionButtons();
    mb._attackProcessed = false;
    renderSeqProgress(mb);
    // Prekreslit spell UI (zobrazi Fireball/Heal v attack okne)
    updateMapBattleUI(); // zobrazi spell buttony
    // Clear hint from previous round
        $('mbArrow').setAttribute('class', 'boss-attack-arrow hidden');

    // Timer ring — 1.5× delší než úhyby (podle patra)
    const mb2 = mapBattleState;
    const floorMult = getFloorTimerMultiplier(mb2.floor, mb2.locId);
    const atkTime = Math.round(Math.max(400, 1000 * floorMult * 1.25));
    const atkCircle = resetTimerRing();
    
    // Attack window — žádná výseč, hráč může udeřit kdykoliv
    mb._bonusStartMs = null;
    mb._bonusMs = 0;
    
    // Skrýt bonusový kruh
    const bonusCircle = document.querySelector('.bonus-zone-circle');
    if (bonusCircle) bonusCircle.style.strokeDasharray = '0 741';
    
    mb._atkTime = atkTime;
    
    requestAnimationFrame(() => {
      if (atkCircle) {
        atkCircle.style.opacity = '1';
        atkCircle.style.strokeDashoffset = '691';
      }
      startTimerRing(atkCircle, atkTime);
    });

    mb._attackWindowTimer = setTimeout(() => {
      if (mapBattleState.ended) return;
      flashSeqFail();
      missedAttackWindow();
    }, atkTime);
  }

  function missedAttackWindow() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // Skrýt bonusový kruh
    const bCircle = document.querySelector('.bonus-zone-circle');
    if (bCircle) bCircle.style.strokeDasharray = '0 741';
    // GUARD: už bylo zpracováno
    if (!mb.inAttackWindow) return;
    mb.mistakes = (mb.mistakes || 0) + 1;
    clearTimeout(mb._attackWindowTimer);
    mb._attackWindowTimer = null;
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb.inAttackWindow = false;
    const actInfo2 = $('mbActionInfo');
    if (actInfo2) actInfo2.classList.add('hidden');
    updateActionButtons();
    resetTimerRing();
    // Počkat na vykreslení resetu před novým kolem, aby hned nezačala animace z 0
    requestAnimationFrame(() => {
      setTimeout(() => mapBattleTurn(), 0);
    });
  }

  function doArenaGlow(dir, correct) {
    const arena = $('mbArena');
    if (!arena) return;

    // Efekt úhybu: oblak/částice fouknuté směrem od středu
    if (correct) {
      spawnDodgeEffect(arena, dir);
    }
  }

  function getSchoolColors(targetIsPlayer) {
    if (targetIsPlayer) return { c1:'#e94560', c2:'#c0392b', rgb:'233,69,96' };
    const a = state.activeSchool;
    const hasPassive = a && getTierPoints(a, 0) > 0;
    if (hasPassive && a === 'fire') return { c1:'#f39c12', c2:'#e67e22', rgb:'230,126,34' };
    if (hasPassive && a === 'ice') return { c1:'#5dade2', c2:'#3498db', rgb:'52,152,219' };
    if (hasPassive && a === 'nature') return { c1:'#58d68d', c2:'#2ecc71', rgb:'46,204,113' };
    if (hasPassive && a === 'physical') return { c1:'#b0b0c8', c2:'#8888aa', rgb:'180,180,200' };
    return { c1:'#bbb', c2:'#aaa', rgb:'187,187,187' };
  }

  function spawnProjectileEffect(dir, targetIsPlayer, isCrit, attackType) {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const aRect = arena.getBoundingClientRect();

    // Start: od hráče (dole) nebo od bosse (nahoře)
    let startEl = targetIsPlayer ? $('mbFigure') : $('mbPlayerFigure');
    let startX = cx, startY = targetIsPlayer ? 0 : rect.height;
    if (startEl) {
      const sRect = startEl.getBoundingClientRect();
      startX = sRect.left + sRect.width/2 - aRect.left;
      startY = sRect.top + sRect.height/2 - aRect.top;
    }

    // Cíl: pozice bosse (nahoře) nebo hráče (dole)
    let endX = cx, endY;
    let endEl = targetIsPlayer ? $('mbPlayerFigure') : $('mbFigure');
    if (endEl) {
      const eRect = endEl.getBoundingClientRect();
      endX = eRect.left + eRect.width/2 - aRect.left;
      endY = eRect.top + eRect.height/2 - aRect.top;
    } else {
      endX = cx;
      endY = targetIsPlayer ? rect.height + 20 : -20;
    }

    const schoolColor = getSchoolColors(targetIsPlayer);
    const color1 = schoolColor.c1;
    const color2 = schoolColor.c2;
    const rgb = schoolColor.rgb;

    const size = isCrit ? 32 : 22;
    const half = size / 2;
    const proj = document.createElement('div');
    // Caster projektil (magický) vs melee (fyzický)
    if (targetIsPlayer && attackType === ATTACK_TYPES.CASTER) {
      // Magická koule — fialová/modrá záře
      proj.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,#a855f7,#6366f1);box-shadow:0 0 ${isCrit ? 20:10}px rgba(168,85,247,${isCrit ? 1:0.8});z-index:20;pointer-events:none;`;
    } else {
      proj.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,${color1},${color2});box-shadow:0 0 ${isCrit ? 20:10}px rgba(${rgb},${isCrit ? 1:0.8});z-index:20;pointer-events:none;`;
    }
    proj.style.left = (startX - half) + 'px';
    proj.style.top = (startY - half) + 'px';
    arena.appendChild(proj);

    // Force reflow — prohlížeč si zapamatuje počáteční pozici
    void proj.offsetHeight;

    proj.style.transition = `left 0.2s ease-out, top 0.2s ease-out`;
    proj.style.left = (endX - half) + 'px';
    proj.style.top = (endY - half) + 'px';

    // Po dopadu: mlha + částice
    setTimeout(() => {
      if (proj.parentNode) proj.remove();
      spawnImpactParticles(arena, endX, endY, rgb, isCrit);
      const pCount = isCrit ? 12 : 5;
      const pDist = isCrit ? 40 : 30;
      const pMaxSize = isCrit ? 10 : 5;
      for (let i = 0; i < pCount; i++) {
        const p = document.createElement('div');
        const size2 = 3 + Math.random() * pMaxSize;
        const angle = Math.random() * 2 * Math.PI;
        const dist = 15 + Math.random() * pDist;
        p.style.cssText = `position:absolute;width:${size2}px;height:${size2}px;border-radius:50%;background:${[color2,color1,'rgba(255,255,255,0.6)'][i%3]};z-index:21;pointer-events:none;opacity:1;`;
        p.style.left = (endX - size2/2) + 'px';
        p.style.top = (endY - size2/2) + 'px';
        arena.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transition = `left 0.3s ease-out, top 0.3s ease-out, opacity 0.3s ease-out`;
          p.style.left = (endX + Math.cos(angle) * dist - size2/2) + 'px';
          p.style.top = (endY + Math.sin(angle) * dist - size2/2) + 'px';
          p.style.opacity = '0';
        });
        setTimeout(() => { if (p.parentNode) p.remove(); }, 350);
      }
    }, 200);
  }

  function spawnImpactParticles(arena, x, y, rgbStr, isCrit) {
    // Mlha při nárazu — rozmazané kroužky rozlétající se všemi směry
    const color = `rgba(${rgbStr},0.35)`;
    const count = isCrit ? 14 : 8;
    const maxSize = isCrit ? 18 : 12;
    const maxDist = isCrit ? 50 : 30;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = 5 + Math.random() * maxSize;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 15 + Math.random() * maxDist;
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};filter:blur(${isCrit ? 2.5 : 1.5}px);z-index:19;pointer-events:none;opacity:${isCrit ? 0.8 : 0.6};`;
      p.style.left = (x - size/2) + 'px';
      p.style.top = (y - size/2) + 'px';
      arena.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transition = `left ${isCrit ? 0.35 : 0.3}s ease-out, top ${isCrit ? 0.35 : 0.3}s ease-out, opacity ${isCrit ? 0.35 : 0.3}s ease-out`;
        p.style.left = (x + Math.cos(angle) * dist - size/2) + 'px';
        p.style.top = (y + Math.sin(angle) * dist - size/2) + 'px';
        p.style.opacity = '0';
      });
      setTimeout(() => { if (p.parentNode) p.remove(); }, 400);
    }
  }

  // ===== SPELL VISUAL HELPERS =====
  function displayDamageText(text) {
    const arena = $('mbArena');
    if (!arena) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:35%;left:50%;transform:translate(-50%,-50%);z-index:25;font-size:36px;font-weight:bold;color:#f1c40f;text-shadow:0 0 10px rgba(241,196,15,0.8);pointer-events:none;animation:fadeDown 0.6s ease-out';
    el.textContent = text;
    arena.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
  function displayHealText(text) {
    const arena = $('mbArena');
    if (!arena) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;bottom:30%;left:50%;transform:translate(-50%,-50%);z-index:25;font-size:32px;font-weight:bold;color:#2ecc71;text-shadow:0 0 10px rgba(46,204,113,0.8);pointer-events:none;animation:fadeDown 0.7s ease-out;animation-direction:reverse';
    el.textContent = text;
    arena.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
  function spawnHealParticles() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height - 80;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      const size = 6 + Math.random() * 8;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 30 + Math.random() * 50;
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(46,204,113,0.5);filter:blur(1.5px);z-index:18;pointer-events:none;opacity:0.8;`;
      p.style.left = (cx - size/2) + 'px';
      p.style.top = (cy - size/2) + 'px';
      arena.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transition = `left 0.5s ease-out, top 0.5s ease-out, opacity 0.5s ease-out`;
        p.style.left = (cx + Math.cos(angle) * dist - size/2) + 'px';
        p.style.top = (cy + Math.sin(angle) * dist - size/2) + 'px';
        p.style.opacity = '0';
      });
      setTimeout(() => { if (p.parentNode) p.remove(); }, 600);
    }
  }
  function spawnFreezeParticles() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 4;
    for (let i = 0; i < 15; i++) {
      const p = document.createElement('div');
      const size = 3 + Math.random() * 6;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 20 + Math.random() * 60;
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(100,180,255,0.6);filter:blur(1px);z-index:18;pointer-events:none;opacity:0.9;`;
      p.style.left = (cx - size/2) + 'px';
      p.style.top = (cy - size/2) + 'px';
      arena.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transition = `left 0.6s ease-out, top 0.6s ease-out, opacity 0.6s ease-out`;
        p.style.left = (cx + Math.cos(angle) * dist - size/2) + 'px';
        p.style.top = (cy + Math.sin(angle) * dist - size/2) + 'px';
        p.style.opacity = '0';
      });
      setTimeout(() => { if (p.parentNode) p.remove(); }, 700);
    }
  }

  function spawnSlashEffect(isCrit, dir) {
    const arena = $('mbArena');
    if (!arena) return;
    const aRect = arena.getBoundingClientRect();
    const boss = $('mbFigure');
    let cx = aRect.width / 2, cy = 30;
    if (boss) {
      const bRect = boss.getBoundingClientRect();
      cx = bRect.left + bRect.width / 2 - aRect.left;
      cy = bRect.top + bRect.height / 2 - aRect.top;
    }
    // Rotace podle směru swipu
    let rotation = 0;
    if (dir === '⬆️') rotation = 0;
    else if (dir === '⬇️') rotation = 180;
    else if (dir === '⬅️') rotation = -90;
    else if (dir === '➡️') rotation = 90;
    if (isCrit) {
      // Dvojitý kříž (X) — červený, s rotací podle směru
      const size = 200;
      const slash = document.createElement('div');
      slash.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:25;pointer-events:none;opacity:1;transform:rotate(${rotation}deg);`;
      slash.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
        <path d="M 30 ${size-30} Q ${size/2} ${size/2} ${size-30} 30" stroke="#e74c3c" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.95">
          <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.1s" fill="freeze"/>
          <animate attributeName="opacity" from="1" to="0" dur="0.35s" begin="0.1s" fill="freeze"/>
        </path>
        <path d="M ${size-30} ${size-30} Q ${size/2} ${size/2} 30 30" stroke="#e74c3c" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.95">
          <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.1s" begin="0.04s" fill="freeze"/>
          <animate attributeName="opacity" from="1" to="0" dur="0.35s" begin="0.14s" fill="freeze"/>
        </path>
        <path d="M 30 ${size-30} Q ${size/2} ${size/2} ${size-30} 30" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7">
          <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.08s" fill="freeze"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" begin="0.08s" fill="freeze"/>
        </path>
        <path d="M ${size-30} ${size-30} Q ${size/2} ${size/2} 30 30" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7">
          <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.08s" begin="0.04s" fill="freeze"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" begin="0.12s" fill="freeze"/>
        </path>
      </svg>`;
      arena.appendChild(slash);
      requestAnimationFrame(() => { slash.style.opacity = '1'; });
      setTimeout(() => { if (slash.parentNode) slash.remove(); }, 450);
    } else {
      const sc = getSchoolColors(false);
      // Oblouček s rotací podle směru swipu — méně zahnutý, tenčí
      const size = 160;
      const slash = document.createElement('div');
      slash.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:20;pointer-events:none;opacity:1;transform:rotate(${rotation}deg);`;
      slash.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
        <path d="M 20 ${size-20} Q ${size/2} 40 ${size-20} 20" stroke="${sc.c1}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="0.12s" fill="freeze"/>
          <animate attributeName="opacity" from="1" to="0" dur="0.3s" begin="0.12s" fill="freeze"/>
        </path>
        <path d="M 20 ${size-20} Q ${size/2} 40 ${size-20} 20" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="0.1s" fill="freeze"/>
          <animate attributeName="opacity" from="0.6" to="0" dur="0.25s" begin="0.1s" fill="freeze"/>
        </path>
      </svg>`;
      arena.appendChild(slash);
      requestAnimationFrame(() => { slash.style.opacity = '1'; });
      setTimeout(() => { if (slash.parentNode) slash.remove(); }, 400);
    }
  }

  function spawnFistEffect(isCrit) {
    const arena = $('mbArena');
    if (!arena) return;
    const aRect = arena.getBoundingClientRect();
    const boss = $('mbFigure');
    let cx = aRect.width / 2, cy = 30;
    if (boss) {
      const bRect = boss.getBoundingClientRect();
      cx = bRect.left + bRect.width / 2 - aRect.left;
      cy = bRect.top + bRect.height / 2 - aRect.top;
    }
    if (isCrit) {
      // Dvě soustředné kruhové rány — shockwave
      const size = 120;
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:25;pointer-events:none;opacity:1;`;
      el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
        <circle cx="${size/2}" cy="${size/2}" r="10" fill="none" stroke="#e74c3c" stroke-width="6" stroke-linecap="round" opacity="0.9">
          <animate attributeName="r" from="10" to="${size/2-4}" dur="0.2s" fill="freeze"/>
          <animate attributeName="opacity" from="0.9" to="0" dur="0.3s" fill="freeze"/>
        </circle>
        <circle cx="${size/2}" cy="${size/2}" r="10" fill="none" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round" opacity="0.7">
          <animate attributeName="r" from="10" to="${size/2-4}" dur="0.2s" begin="0.05s" fill="freeze"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" begin="0.05s" fill="freeze"/>
        </circle>
        <circle cx="${size/2}" cy="${size/2}" r="10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5">
          <animate attributeName="r" from="10" to="${size/2-4}" dur="0.2s" begin="0.1s" fill="freeze"/>
          <animate attributeName="opacity" from="0.5" to="0" dur="0.3s" begin="0.1s" fill="freeze"/>
        </circle>
      </svg>`;
      arena.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
    } else {
      // Jednoduchá kruhová rána — opacity hned, ne přes rAF (SVG animate běží okamžitě)
      const size = 80;
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:20;pointer-events:none;opacity:1;`;
      el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
        <circle cx="${size/2}" cy="${size/2}" r="8" fill="none" stroke="#e74c3c" stroke-width="5" stroke-linecap="round" opacity="0.85">
          <animate attributeName="r" from="8" to="${size/2-4}" dur="0.15s" fill="freeze"/>
          <animate attributeName="opacity" from="0.85" to="0" dur="0.25s" begin="0.15s" fill="freeze"/>
        </circle>
        <circle cx="${size/2}" cy="${size/2}" r="8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5">
          <animate attributeName="r" from="8" to="${size/2-4}" dur="0.15s" begin="0.05s" fill="freeze"/>
          <animate attributeName="opacity" from="0.5" to="0" dur="0.25s" begin="0.2s" fill="freeze"/>
        </circle>
      </svg>`;
      arena.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      setTimeout(() => { if (el.parentNode) el.remove(); }, 350);
    }
  }

  function spawnCrossSlashEffect() {
    const arena = $('mbArena');
    if (!arena) return;
    const aRect = arena.getBoundingClientRect();
    const boss = $('mbFigure');
    let cx = aRect.width / 2, cy = 30;
    if (boss) {
      const bRect = boss.getBoundingClientRect();
      cx = bRect.left + bRect.width / 2 - aRect.left;
      cy = bRect.top + bRect.height / 2 - aRect.top;
    }
    const sc = getSchoolColors(false);
    const size = 80;
    // První sek — z leva dolů doprava nahoru
    const s1 = document.createElement('div');
    s1.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:20;pointer-events:none;opacity:1;`;
    s1.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
      <path d="M 10 70 Q 40 10 70 10" stroke="${sc.c1}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.12s" fill="freeze"/>
        <animate attributeName="opacity" from="1" to="0" dur="0.3s" begin="0.12s" fill="freeze"/>
      </path>
      <path d="M 10 70 Q 40 10 70 10" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6">
        <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.1s" fill="freeze"/>
        <animate attributeName="opacity" from="0.6" to="0" dur="0.25s" begin="0.1s" fill="freeze"/>
      </path>
    </svg>`;
    arena.appendChild(s1);
    requestAnimationFrame(() => { s1.style.opacity = '1'; });
    setTimeout(() => { if (s1.parentNode) s1.remove(); }, 400);
    // Druhý sek — z prava dolů doleva nahoru, 80ms později
    const s2 = document.createElement('div');
    s2.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:21;pointer-events:none;opacity:1;`;
    s2.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
      <path d="M 70 70 Q 40 10 10 10" stroke="${sc.c1}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.12s" fill="freeze"/>
        <animate attributeName="opacity" from="1" to="0" dur="0.3s" begin="0.12s" fill="freeze"/>
      </path>
      <path d="M 70 70 Q 40 10 10 10" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6">
        <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.1s" fill="freeze"/>
        <animate attributeName="opacity" from="0.6" to="0" dur="0.25s" begin="0.1s" fill="freeze"/>
      </path>
    </svg>`;
    setTimeout(() => {
      arena.appendChild(s2);
      requestAnimationFrame(() => { s2.style.opacity = '1'; });
      setTimeout(() => { if (s2.parentNode) s2.remove(); }, 400);
    }, 80);
  }

  function spawnWeaponProjectile(isCrit) {
    const wType = getWeaponType();
    if (wType === 'blade') { spawnSlashEffect(isCrit); }
    else if (wType === 'fists') { spawnFistEffect(isCrit); }
    else { spawnProjectileEffect(0, false, false); }
  }

  // ===== SPELL PROJECTILES =====
  function spawnFireballProjectile() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const aRect = arena.getBoundingClientRect();

    // Start od hráče (dole)
    const playerFig = $('mbPlayerFigure');
    let startX = rect.width / 2, startY = rect.height - 40;
    if (playerFig) {
      const pRect = playerFig.getBoundingClientRect();
      startX = pRect.left + pRect.width/2 - aRect.left;
      startY = pRect.top + pRect.height/2 - aRect.top;
    }

    // Cíl: boss (nahoře)
    const bossFig = $('mbFigure');
    let targetX = rect.width / 2, targetY = 20;
    if (bossFig) {
      const bRect = bossFig.getBoundingClientRect();
      targetX = bRect.left + bRect.width/2 - aRect.left;
      targetY = bRect.top + bRect.height/2 - aRect.top;
    }
    // Fireball — pulzující ohnivá koule letící od hráče k bossovi
    const ball = document.createElement('div');
    const size = 36;
    ball.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;z-index:30;pointer-events:none;left:${startX - size/2}px;top:${startY - size/2}px;background:radial-gradient(circle,#fff 10%,#f39c12 40%,#e74c3c 80%);box-shadow:0 0 25px rgba(231,76,60,0.8),0 0 50px rgba(243,156,18,0.4);transition:left 0.2s ease-in,top 0.2s ease-in;`;
    arena.appendChild(ball);
    void ball.offsetHeight;
    ball.style.left = (targetX - size/2) + 'px';
    ball.style.top = (targetY - size/2) + 'px';
    // Exploze po dopadu
    setTimeout(() => {
      if (ball.parentNode) ball.remove();
      playSFX(fireSpellSfx);
      // Ohnivá exploze
      for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        const pSize = 4 + Math.random() * 12;
        const angle = Math.random() * 2 * Math.PI;
        const dist = 15 + Math.random() * 55;
        const colors = ['#e74c3c','#f39c12','#fff','#e67e22'];
        const color = colors[i % colors.length];
        p.style.cssText = `position:absolute;width:${pSize}px;height:${pSize}px;border-radius:50%;z-index:31;pointer-events:none;left:${targetX - pSize/2}px;top:${targetY - pSize/2}px;background:${color};box-shadow:0 0 ${6+Math.random()*10}px ${color};opacity:1;`;
        arena.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transition = `left 0.4s ease-out, top 0.4s ease-out, opacity 0.4s ease-out`;
          p.style.left = (targetX + Math.cos(angle) * dist - pSize/2) + 'px';
          p.style.top = (targetY + Math.sin(angle) * dist - pSize/2) + 'px';
          p.style.opacity = '0';
        });
        setTimeout(() => { if (p.parentNode) p.remove(); }, 450);
      }
    }, 350);
  }

  function spawnHealProjectile() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height - 80;
    // Zelená koule stoupající od hráče
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      const size = 4 + Math.random() * 8;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 20 + Math.random() * 40;
      setTimeout(() => {
        p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;z-index:30;pointer-events:none;left:${cx - size/2}px;top:${cy - size/2}px;background:rgba(46,204,113,0.7);box-shadow:0 0 12px rgba(46,204,113,0.6);opacity:0.9;transition:left 0.5s ease-out,top 0.5s ease-out,opacity 0.5s ease-out;`;
        arena.appendChild(p);
        void p.offsetHeight;
        p.style.left = (cx + Math.cos(angle) * dist - size/2) + 'px';
        p.style.top = (cy + Math.sin(angle) * dist - size/2) + 'px';
        p.style.opacity = '0';
        setTimeout(() => { if (p.parentNode) p.remove(); }, 550);
      }, i * 60);
    }
    displayHealText('💚');
  }

  function spawnIceProjectile() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const aRect = arena.getBoundingClientRect();

    // Start od hráče (dole)
    const playerFig = $('mbPlayerFigure');
    let startX = rect.width / 2, startY = rect.height - 40;
    if (playerFig) {
      const pRect = playerFig.getBoundingClientRect();
      startX = pRect.left + pRect.width/2 - aRect.left;
      startY = pRect.top + pRect.height/2 - aRect.top;
    }

    // Cíl: boss (nahoře)
    const bossFig = $('mbFigure');
    let targetX = rect.width / 2, targetY = 20;
    if (bossFig) {
      const bRect = bossFig.getBoundingClientRect();
      targetX = bRect.left + bRect.width/2 - aRect.left;
      targetY = bRect.top + bRect.height/2 - aRect.top;
    }

    // Ledová koule — modrobílá, s mrazivým ocasem
    const ball = document.createElement('div');
    const size = 32;
    ball.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;z-index:30;pointer-events:none;left:${startX - size/2}px;top:${startY - size/2}px;background:radial-gradient(circle,#fff 10%,#4fc3f7 50%,#1565c0 90%);box-shadow:0 0 20px rgba(79,195,247,0.8),0 0 40px rgba(21,101,192,0.4);transition:left 0.2s ease-in,top 0.2s ease-in;`;
    arena.appendChild(ball);
    void ball.offsetHeight;
    ball.style.left = (targetX - size/2) + 'px';
    ball.style.top = (targetY - size/2) + 'px';

    // Mrazivá exploze po dopadu
    setTimeout(() => {
      if (ball.parentNode) ball.remove();
      playSFX(iceSpellSfx);
      for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        const pSize = 3 + Math.random() * 10;
        const angle = Math.random() * 2 * Math.PI;
        const dist = 10 + Math.random() * 50;
        const colors = ['#4fc3f7','#81d4fa','#fff','#b3e5fc'];
        const color = colors[i % colors.length];
        p.style.cssText = `position:absolute;width:${pSize}px;height:${pSize}px;border-radius:50%;z-index:31;pointer-events:none;left:${targetX - pSize/2}px;top:${targetY - pSize/2}px;background:${color};box-shadow:0 0 ${5+Math.random()*8}px ${color};opacity:1;`;
        arena.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transition = `left 0.4s ease-out, top 0.4s ease-out, opacity 0.4s ease-out`;
          p.style.left = (targetX + Math.cos(angle) * dist - pSize/2) + 'px';
          p.style.top = (targetY + Math.sin(angle) * dist - pSize/2) + 'px';
          p.style.opacity = '0';
        });
        setTimeout(() => { if (p.parentNode) p.remove(); }, 450);
      }
    }, 350);
  }

  function spawnDodgeEffect(arena, dir) {
    // Oblak/částice fouknuté od středu arény směrem úhybu — rychlejší a dál
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const color = 'rgba(187,187,187,0.2)';

    const count = 12;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = 10 + Math.random() * 16;
      const spread = 60 + Math.random() * 80;
      let dx = 0, dy = 0;
      if (dir === '⬆️') { dx = (Math.random() - 0.5) * 30; dy = -spread; }
      else if (dir === '⬇️') { dx = (Math.random() - 0.5) * 30; dy = spread; }
      else if (dir === '⬅️') { dx = -spread; dy = (Math.random() - 0.5) * 30; }
      else if (dir === '➡️') { dx = spread; dy = (Math.random() - 0.5) * 30; }

      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};filter:blur(2px);z-index:19;pointer-events:none;opacity:0.5;`;
      p.style.left = (cx - size/2) + 'px';
      p.style.top = (cy - size/2) + 'px';
      arena.appendChild(p);

      requestAnimationFrame(() => {
        p.style.transition = `left 0.25s ease-out, top 0.25s ease-out, opacity 0.25s ease-out`;
        p.style.left = (cx + dx - size/2) + 'px';
        p.style.top = (cy + dy - size/2) + 'px';
        p.style.opacity = '0';
      });

      setTimeout(() => { if (p.parentNode) p.remove(); }, 300);
    }
  }

  function onMapDodge(dir) {
    if (mapBattleState.ended || !mapBattleState.sequence) return;
    const mb = mapBattleState;
    // Rapid — zpracovává onMapRapidTap
    if (mb.isRapidAttack) return;
    const attack = mb.sequence[mb.sequenceIndex];
    if (!attack) return;
    // GUARD: útok už byl vyřešen
    if (mb._sequenceTimer === null) return;

    doArenaGlow(dir, false);

    // Uložit směr swipu pro animaci
    mb._lastSwipeDir = dir;

    let correct = false;
    let dmgMult = 1.0; // násobitel poškození hrdiny

    if (attack.type === 'block') {
      // Block = musíš použít štít, swipe = chyba
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      onMapHit();
      return;
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
        dmgMult = 1.0;
      }
    } else if (attack.type === 'yellow') {
      // Yellow: 2× stejným směrem
      if (dir !== attack.dir) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      mb._heavySwipes++;
      doArenaGlow(dir, true);
      if (mb._heavySwipes >= 2) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        correct = true;
        dmgMult = 2.0;
      } else {
        return; // čekáme na druhý swipe
      }
    } else if (attack.type === 'blue') {
      // Blue: oba směry
      if (dir !== attack.dir && dir !== attack.twinDir) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      if (mb._twinSwipes.includes(dir)) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      mb._twinSwipes.push(dir);
      doArenaGlow(dir, true);
      if (mb._twinSwipes.length >= 2) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        correct = true;
        dmgMult = 0.75; // každá rána 0.75×, dohromady 1.5×
      } else {
        return; // čekáme na druhý swipe
      }
    } else if (attack.type === 'green') {
      // Green = heal — musíš swipnout opačný směr (jako inverted)
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      const inverseMap = { '⬆️':'⬇️', '⬇️':'⬆️', '⬅️':'➡️', '➡️':'⬅️' };
      if (dir === inverseMap[attack.dir]) {
        correct = true;
        doArenaGlow(dir, true);
        // Heal: 15% max HP — žádný damage
        const healAmt = Math.max(1, Math.round(mb.maxPlayerHp * 0.15));
        mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + healAmt);
        playSFX(healSfx);
        const dmgText = $('mbPlayerDamageText');
        if (dmgText) {
          dmgText.textContent = `+${healAmt}`;
          dmgText.style.color = '#2ecc71';
          dmgText.classList.remove('hidden');
          setTimeout(() => { dmgText.classList.add('hidden'); dmgText.style.color = ''; }, 800);
        }
        updateMapBattleUI();
      }
    } else if (attack.type === 'truth') {
      // Truth — zelená šipka, swipni jak ukazuje
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      if (dir === attack.dir) {
        correct = true;
        doArenaGlow(dir, true);
        dmgMult = 1.0;
      }
    } else if (attack.type === 'lie') {
      // Lie — červená šipka, swipni opačný směr
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      const inverseMap = { '⬆️':'⬇️', '⬇️':'⬆️', '⬅️':'➡️', '➡️':'⬅️' };
      if (dir === inverseMap[attack.dir]) {
        correct = true;
        doArenaGlow(dir, true);
        dmgMult = 1.0;
      }
    } else if (attack.type === 'freeze') {
      // Freeze — modrá šipka, nesmíš swipnout = chyba
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      onMapHit();
      return;
    } else {
      // Grey: normální útok
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      if (dir === attack.dir) {
        correct = true;
        doArenaGlow(dir, true);
        dmgMult = 1.0;
      }
    }

    if (correct) {
      // 🎯 Bonus window check — swipe mimo žlutou výseč = chyba
      if (mb._bonusStartMs != null && !mb._bonusActive) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      // Způsobit poškození monstru (kromě green = heal)
      if (attack.type !== 'green') {
        dealPlayerDamage(mb, dmgMult);
      }
      advanceSequence();
    } else {
      onMapHit();
    }
  }

  function onMapDodgeAction() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.isRapidAttack) return;
    if (mb._sequenceTimer === null) return;
    if (mb._hitProcessed) return;
    // Potřebuje dodge charge
    if (mb.dodgeCharges <= 0) return;
    mb.dodgeCharges--;
    updateMapBattleUI();
    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._sequenceTimer = null;
    playSFX(dodgeSfx);
    doArenaGlow(mb.currentAttack || '⬆️', true);
    advanceSequence();
  }

  function onMapHit() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb._hitProcessed) return;
    mb._hitProcessed = true;
    
    // D4/D5 — přehřívání: reset na 0 při chybě (zásahu)
    if (mb.locId === 3 || mb.locId === 4) {
      mb._heatLevel = 0;
    }
    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._sequenceTimer = null;

    // DoT tick
    if (doDotTick(mb)) return;
    // Chill tick
    if (mb.chillTicksLeft > 0) mb.chillTicksLeft--;

    // Segment-based: každý zásah = 1 bod poškození hráči
    let amount = 1;
    mb.playerHp -= amount;
    
    mb.mistakes = (mb.mistakes || 0) + 1;
    // Zvuk — náhodný hurt zvuk
    playSFX(getHurtSfx());
    // Výrazný červený záblesk celé obrazovky
    const arena = $('mbArena');
    if (arena) {
      arena.style.transition = 'background-color 0.1s';
      arena.style.backgroundColor = 'rgba(233,69,96,0.45)';
      setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 100);
    }
    // Záblesk overlay — tmavý overlay s červeným nádechem
    let hitOverlay = $('mbHitOverlay');
    if (!hitOverlay) {
      hitOverlay = document.createElement('div');
      hitOverlay.id = 'mbHitOverlay';
      hitOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999;pointer-events:none;transition:background-color 0.1s;background-color:transparent;';
      document.body.appendChild(hitOverlay);
    }
    hitOverlay.style.backgroundColor = 'rgba(200,40,40,0.2)';
    setTimeout(() => { hitOverlay.style.backgroundColor = 'transparent'; }, 100);

    const playerDamageText = $('mbPlayerDamageText');
    if (playerDamageText) {
      playerDamageText.textContent = `-${amount}`;
      playerDamageText.style.color = '';
      playerDamageText.classList.remove('hidden');
      setTimeout(() => playerDamageText.classList.add('hidden'), 800);
    }

    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) actionInfo.classList.add('hidden');
    updateActionButtons();
    resetTimerRing();
    const rTarget = $('mbRapidTarget');
    if (rTarget) rTarget.classList.add('hidden');
    const lTap = $('mbTapLeft');
    const rTap = $('mbTapRight');
    if (lTap) lTap.classList.add('hidden');
    if (rTap) rTap.classList.add('hidden');

    flashSeqFail();
    updateMapBattleUI();

    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    // Po zásahu restartovat sekvenci
    setTimeout(() => mapBattleTurn(), 300);
  }

  function onMapAttackSpell(spellId) {
    castMapSpell(spellId);
  }

  function applySchoolColors() {
    const a = state.activeSchool;
    const arena = $('mbArena');
    if (!arena) return;
    // Barvy se mění jen když má hráč pasivní bonus (Tier 1) v aktivní škole
    const hasPassive = a && getTierPoints(a, 0) > 0;
    let bg, border, dot, dotTapped, dotGlow, dotGlow2, pulse, target, targetGlow;
    let seqDone, seqGlow, seqGlow2, seqGlow3;
    let spellColor, spellBg, spellGlow;
    if (hasPassive && a === 'fire') {
      bg='rgba(243,156,18,0.2)'; border='rgba(243,156,18,0.8)'; dot='rgba(243,156,18,0.45)'; dotTapped='rgba(243,156,18,1)';
      dotGlow='rgba(243,156,18,1)'; dotGlow2='rgba(243,156,18,0.6)'; pulse='rgba(243,156,18,0.6)'; target='#f39c12'; targetGlow='rgba(243,156,18,0.8)';
      seqDone='#f39c12'; seqGlow='rgba(243,156,18,0.4)'; seqGlow2='rgba(243,156,18,0.9)'; seqGlow3='rgba(243,156,18,0.4)';
      spellColor='#f39c12'; spellBg='#1a1a1a'; spellGlow='rgba(243,156,18,0.4)';
    } else if (hasPassive && a === 'ice') {
      bg='rgba(52,152,219,0.2)'; border='rgba(52,152,219,0.8)'; dot='rgba(52,152,219,0.45)'; dotTapped='rgba(52,152,219,1)';
      dotGlow='rgba(52,152,219,1)'; dotGlow2='rgba(52,152,219,0.6)'; pulse='rgba(52,152,219,0.6)'; target='#3498db'; targetGlow='rgba(52,152,219,0.8)';
      seqDone='#3498db'; seqGlow='rgba(52,152,219,0.4)'; seqGlow2='rgba(52,152,219,0.9)'; seqGlow3='rgba(52,152,219,0.4)';
      spellColor='#3498db'; spellBg='#0a1a2a'; spellGlow='rgba(52,152,219,0.4)';
    } else if (hasPassive && a === 'nature') {
      bg='rgba(46,204,113,0.2)'; border='rgba(46,204,113,0.8)'; dot='rgba(46,204,113,0.45)'; dotTapped='rgba(46,204,113,1)';
      dotGlow='rgba(46,204,113,1)'; dotGlow2='rgba(46,204,113,0.6)'; pulse='rgba(46,204,113,0.6)'; target='#2ecc71'; targetGlow='rgba(46,204,113,0.8)';
      seqDone='#2ecc71'; seqGlow='rgba(46,204,113,0.4)'; seqGlow2='rgba(46,204,113,0.9)'; seqGlow3='rgba(46,204,113,0.4)';
      spellColor='#2ecc71'; spellBg='#0a0a0a'; spellGlow='rgba(46,204,113,0.4)';
    } else if (hasPassive && a === 'physical') {
      bg='rgba(180,180,200,0.2)'; border='rgba(180,180,200,0.8)'; dot='rgba(180,180,200,0.45)'; dotTapped='rgba(180,180,200,1)';
      dotGlow='rgba(180,180,200,1)'; dotGlow2='rgba(180,180,200,0.6)'; pulse='rgba(180,180,200,0.6)'; target='#b0b0c8'; targetGlow='rgba(180,180,200,0.8)';
      seqDone='#b0b0c8'; seqGlow='rgba(180,180,200,0.4)'; seqGlow2='rgba(180,180,200,0.9)'; seqGlow3='rgba(180,180,200,0.4)';
      spellColor='#b0b0c8'; spellBg='#1a1a20'; spellGlow='rgba(180,180,200,0.4)';
    } else {
      bg='rgba(180,100,255,0.2)'; border='rgba(180,100,255,0.8)'; dot='rgba(180,100,255,0.45)'; dotTapped='rgba(180,100,255,1)';
      dotGlow='rgba(180,100,255,1)'; dotGlow2='rgba(180,100,255,0.6)'; pulse='rgba(180,100,255,0.6)'; target='#b064ff'; targetGlow='rgba(176,100,255,0.8)';
      seqDone='#888'; seqGlow='rgba(136,136,136,0.4)'; seqGlow2='rgba(136,136,136,0.9)'; seqGlow3='rgba(136,136,136,0.4)';
      spellColor='#e94560'; spellBg='#1a1a1a'; spellGlow='rgba(233,69,96,0.4)';
    }
    arena.style.setProperty('--rapid-color', border.replace('0.8','0.25'));
    arena.style.setProperty('--rapid-tap-bg', bg);
    arena.style.setProperty('--rapid-tap-border', border);
    arena.style.setProperty('--rapid-dot', dot);
    arena.style.setProperty('--rapid-dot-tapped', dotTapped);
    arena.style.setProperty('--rapid-dot-glow', dotGlow);
    arena.style.setProperty('--rapid-dot-glow2', dotGlow2);
    arena.style.setProperty('--rapid-pulse', pulse);
    arena.style.setProperty('--rapid-target', target);
    arena.style.setProperty('--rapid-target-glow', targetGlow);
    arena.style.setProperty('--seq-dot-done', seqDone);
    arena.style.setProperty('--seq-dot-glow', seqGlow);
    arena.style.setProperty('--seq-dot-glow2', seqGlow2);
    arena.style.setProperty('--seq-dot-glow3', seqGlow3);
    arena.style.setProperty('--spell-color', spellColor);
    arena.style.setProperty('--spell-bg', spellBg);
    arena.style.setProperty('--spell-glow', spellGlow);
  }

  function onMapRapidTap(tapId) {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (!mb.isRapidAttack) return;
    if (mb._hitProcessed) return;
    mb.rapidTaps = (mb.rapidTaps || 0) + 1;
    // Každý tap = malý útok
    dealPlayerDamage(mb, 0.3);
    // Vizuální feedback
    if (tapId) {
      const el = $(tapId);
      if (el) { el.classList.add('tapped'); setTimeout(() => el.classList.remove('tapped'), 80); }
    }
    playSFX(dodgeSfx);
    const remaining = mb.rapidTarget - mb.rapidTaps;
    const target = $('mbRapidTarget');
    if (target) target.textContent = `${remaining}`;
    if (mb.rapidTaps >= mb.rapidTarget) {
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      advanceSequence();
    }
  }

  function dealPlayerDamage(mb, mult) {
    // Segment-based: každý zásah = 1 bod poškození
    let dmg = 1;
    // D4/D5 — přehřívání: každý úspěšný útok zvyšuje heat
    if (mb.locId === 3 || mb.locId === 4) {
      mb._heatLevel = Math.min((mb._heatLevel || 0) + 1, 10);
    }
    
    mb.bossHp -= dmg;
    playSFX(getHitSfx());
    const dmgText = $('mbDamageText');
    if (dmgText) {
      dmgText.textContent = `-${dmg}`;
      dmgText.classList.remove('hidden');
      setTimeout(() => dmgText.classList.add('hidden'), 800);
    }
    const bossFig = $('mbFigure');
    if (bossFig) {
      bossFig.style.transition = 'filter 0.15s';
      bossFig.style.filter = 'brightness(2) saturate(1.5)';
      setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100);
    }
    // Vždy melee animace (slash)
    spawnSlashEffect(false, mb._lastSwipeDir);
    updateMapBattleUI();
  }

  function castMapSpell(spellId) { if (!spellId) { spellId = getBestSpellId(state.activeSchool); if (!spellId) return; }
    const mb = mapBattleState;
    const h = state.hero;
    if (mb.ended) return;
    let lv = getSpellLv(spellId);
    if (lv === 0) return;
    // Kouzlo lze použít jen v attack window
    if (!mb.inAttackWindow) return;
    // Mana cost podle kouzla a levelu
    const manaCosts = { firebolt: 10, fireblast: 20, fireball: 35, frostbolt: 10, icebolt: 10, blizzard: 30, heal: 15, strongStrike: 8, slash: 15, whirlwind: 25 };
    const cost = (manaCosts[spellId] || 15) + lv * 2;
    if ((h.mana || 0) < cost) { showMessage('💧 Nedostatek many!'); return; }
    h.mana -= cost;
    // Clean up spell buttons
    $('mbSpells').innerHTML = '';
    let effectMsg = '';
    const baseDmg = mb.baseDmg || (10 + Math.floor(state.hero.level * 3) + (ITEM_MAP[state.hero.equip.weapon]||ITEM_MAP['fists']).baseDmg + (state.hero.attrStr||0)*2);
    if (spellId === 'fireball') {
      const pct = 100 + lv * 100; // 200% @ lv1, 300% @ lv2, 400% @ lv3
      const resistMult = getSchoolResistMult('fire');
      let dmg = Math.round(baseDmg * pct / 100 * resistMult);
      const dotPct = 30; // 30% z dmg/tick
      const dotTick = Math.max(1, Math.round(dmg * dotPct / 100));
      let dotDur = 2 + lv;
      mb.bossHp -= dmg;
      if (dotTick > 0) { mb.dot = dotTick; mb.dotTicksLeft = dotDur; }
      effectMsg = `🔥 Fireball! ${dmg} poškození!${dotTick > 0 ? ` ☠️ DoT ${dotTick}/tick` : ''}`;
      // Ohnivá koule
      spawnFireballProjectile();
    } else if (spellId === 'fireblast') {
      const pct = 100 + lv * 50; // 150% @ lv1, 200% @ lv2, 250% @ lv3
      const resistMult = getSchoolResistMult('fire');
      let dmg = Math.round(baseDmg * pct / 100 * resistMult);
      const dotPct = 20; // 20% z dmg/tick
      const dotTick = Math.max(1, Math.round(dmg * dotPct / 100));
      mb.bossHp -= dmg;
      if (dotTick > 0) { mb.dot = dotTick; mb.dotTicksLeft = 2; }
      effectMsg = `💥 Fire Blast! ${dmg} poškození!${dotTick > 0 ? ` ☠️ DoT ${dotTick}/tick` : ''}`;
      spawnFireballProjectile();
    } else if (spellId === 'firebolt') {
      const pct = 75 + lv * 35; // 110% @ lv1, 145% @ lv2, ... 250% @ lv5
      const resistMult = getSchoolResistMult('fire');
      let dmg = Math.round(baseDmg * pct / 100 * resistMult);
      mb.bossHp -= dmg;
      effectMsg = `🔥 Firebolt! ${dmg} poškození!`;
      spawnFireballProjectile();
    } else if (spellId === 'frostbolt') {
      const dmgPct = 125 + lv * 15; // 140% @ lv1, 155% @ lv2, ... 200% @ lv5
      const resistMult = getSchoolResistMult('ice');
      let dmg = Math.round(baseDmg * dmgPct / 100 * resistMult);
      let slowPct = 40;
      let ticks = 3;
      // Vylepšený frostbolt (icebolt) přidá ticky
      const iceboltLv = getTalentLv('ice_icebolt');
      if (iceboltLv > 0) ticks += iceboltLv;
      mb.bossHp -= dmg;
      mb._activeSpellChillActive = true;
      mb.chillPercent = Math.max(mb.chillPercent || 0, slowPct);
      mb.chillTicksLeft = Math.max(mb.chillTicksLeft || 0, ticks);
      effectMsg = `❄️ Frostbolt! ${dmg} poškození, zpomalení 40% na ${ticks} ticků!`;
      spawnIceProjectile();
      const bossFig = $('mbFigure');
      if (bossFig) { bossFig.style.transition = 'filter 0.3s'; bossFig.style.filter = 'brightness(1.8) hue-rotate(200deg) saturate(1.5)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 800); }
      const circle = document.querySelector('.timer-circle');
      if (circle) circle.style.stroke = '#4fc3f7';
      spawnFreezeParticles();
    } else if (spellId === 'icebolt') {
      // icebolt už není samostatné kouzlo — je to pasivní upgrade frostboltu
      // Pokud se sem dostaneme (starý save), chová se jako frostbolt
      const dmgPct = 125 + lv * 25;
      let dmg = Math.round(baseDmg * dmgPct / 100);
      let slowPct = 40;
      let ticks = 3 + lv;
      mb.bossHp -= dmg;
      mb._activeSpellChillActive = true;
      mb.chillPercent = Math.max(mb.chillPercent || 0, slowPct);
      mb.chillTicksLeft = Math.max(mb.chillTicksLeft || 0, ticks);
      effectMsg = `❄️ Frostbolt! ${dmg} poškození, zpomalení 40% na ${ticks} ticků!`;
      spawnIceProjectile();
      const bossFig = $('mbFigure');
      if (bossFig) { bossFig.style.transition = 'filter 0.3s'; bossFig.style.filter = 'brightness(1.8) hue-rotate(200deg) saturate(1.5)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 800); }
      const circle = document.querySelector('.timer-circle');
      if (circle) circle.style.stroke = '#4fc3f7';
      spawnFreezeParticles();
    } else if (spellId === 'blizzard') {
      // Blizzard — zmrazení: 3 útoky po sobě
      mb._blizzardFreeAttacks = 3;
      effectMsg = `❄️ Blizard! Boss zmrazen! 3 útoky po sobě!`;
      spawnIceProjectile();
      // Modrý efekt na bossovi
      const bossFig = $('mbFigure');
      if (bossFig) {
        bossFig.style.transition = 'filter 0.3s';
        bossFig.style.filter = 'brightness(1.8) hue-rotate(200deg) saturate(1.5)';
        setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 1500);
      }
      const circle = document.querySelector('.timer-circle');
      if (circle) circle.style.stroke = '#4fc3f7';
      spawnFreezeParticles();
    } else if (spellId === 'strongStrike') {
      const pct = 100 + lv * 50;
      let dmg = Math.round(baseDmg * pct / 100);
      const rendCrit = getPhysicalRendCritDmg();
      if (rendCrit > 0) dmg = Math.round(dmg * (1 + rendCrit / 100));
      mb.bossHp -= dmg;
      effectMsg = `💢 Silný úder! ${dmg} poškození!`;
      spawnCrossSlashEffect();
      playSFX(strongStrikeSfx);
      setTimeout(() => {
        const bossFig = $('mbFigure');
        if (bossFig) { bossFig.style.transition = 'filter 0.15s'; bossFig.style.filter = 'brightness(2) saturate(1.5)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100); }
      }, 120);
    } else if (spellId === 'slash') {
      const pct = 150 + lv * 50;
      let dmg = Math.round(baseDmg * pct / 100);
      const rendCrit = getPhysicalRendCritDmg();
      if (rendCrit > 0) dmg = Math.round(dmg * (1 + rendCrit / 100));
      mb.bossHp -= dmg;
      effectMsg = `⚡ Seknutí! ${dmg} poškození!`;
      spawnSlashEffect();
      setTimeout(() => {
        const bossFig = $('mbFigure');
        if (bossFig) { bossFig.style.transition = 'filter 0.15s'; bossFig.style.filter = 'brightness(2.5) saturate(1.8)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100); }
        displayDamageText('⚡');
      }, 120);
    } else if (spellId === 'whirlwind') {
      mb._blizzardFreeAttacks = 3;
      effectMsg = `🌀 Vichřice! 3 útoky po sobě!`;
      spawnSlashEffect();
      setTimeout(() => {
        const bossFig = $('mbFigure');
        if (bossFig) { bossFig.style.transition = 'filter 0.15s'; bossFig.style.filter = 'brightness(2) saturate(1.5)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100); }
        displayDamageText('🌀');
      }, 120);
    } else if (spellId === 'heal') {
      const hotBase = lv * 3;
      const vitPct = 5 + lv * 5;
      const vitBonus = Math.round((state.hero.attrVit||0) * vitPct / 100);
      mb.hot = Math.max(mb.hot || 0, hotBase + vitBonus);
      mb.hotTicksLeft = Math.max(mb.hotTicksLeft || 0, 2);
      effectMsg = `💚 Léčení! +${mb.hot}/tick na ${mb.hotTicksLeft} ticky!`;
      displayDamageText('💚');
    }
    if (spellId === 'heal') { playSFX(healSfx); } else if (spellId === 'strongStrike') { /* strongStrikeSfx už přehrán */ } else { sfxSuccess(); }
    // (hint: zachovat bonus info)
    updateMapBattleUI();
    // Odstranit spell tlačítka
    const spellsEl = $('mbSpells');
    if (spellsEl) spellsEl.innerHTML = '';
    if (mb.bossHp <= 0) { endMapBattle(true); return; }
    // === Ukončení attack window (kouzlo = místo útoku) ===
    clearTimeout(mb._attackWindowTimer);
    resetTimerRing();
    const bc = document.querySelector('.bonus-zone-circle');
    if (bc) bc.style.strokeDasharray = '0 741';
    const actInfo = $('mbActionInfo');
    if (actInfo) actInfo.classList.add('hidden');
    mb.inAttackWindow = false;
    updateActionButtons();
    if (mb._blizzardFreeAttacks > 0) {
      mb._blizzardFreeAttacks--;
      setTimeout(() => openAttackWindow(), 100);
    } else {
      setTimeout(() => mapBattleTurn(), 300);
    }
  }

  // ===== LOOT SYSTEM =====
  // Šablony pro názvy itemů podle typu a tieru
  const LOOT_NAMES = {
    weapon: {
      staff: ['Dřevěná hůlka','Ohnivá hůlka','Ledová hůl','Blesková hůl','Hvězdná hůl','Plamená hůl','Měsíční hůl','Arcimágova hůl'],
      blade: ['Železný meč','Široký meč','Bojová sekera','Obouruční meč','Temný meč','Dračí sekera','Arcimágův meč']
    },
    armor: ['Lněný hábit','Kožený hábit','Šupinový hábit','Vyšívaný hábit','Kroužkový hábit','Dračí hábit','Arcimágův hábit'],
    helmet: ['Lněná kápě','Kožená čapka','Železná helma','Ocelová helma','Stříbrná přilba','Arcimágova koruna'],
    shield: ['Dřevěný štít','Kožený štít','Železný štít','Ocelový štít','Stříbrný štít','Paladinův štít'],
    ring: ['Měděný prsten','Cínový prsten','Stříbrný prsten','Zlatý prsten','Platinový prsten','Drahokamový prsten'],
    amulet: ['Kostěný amulet','Měděný amulet','Stříbrný amulet','Zlatý amulet','Rubínový amulet','Arcánní amulet']
  };
  const LOOT_ICONS = { weapon_staff:'🪄', weapon_blade:'⚔️', armor:'👘', helmet:'⛑️', shield:'🛡️', ring:'💍', amulet:'📿' };
  const ATTR_KEYS = ['str','vit','dex','int'];
  const ATTR_NAMES = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' };
  const RARITY = {
    common: { name:'Common', color:'#e8e0e8', border:'#888' },
    uncommon: { name:'Uncommon', color:'#c8f7c8', border:'#4caf50' },
    rare: { name:'Rare', color:'#c8d8ff', border:'#4a8af4' },
    epic: { name:'Epic', color:'#e8c8ff', border:'#9c27b0' }
  };

  function getRarity(bossDrop) {
    const r = Math.random();
    if (bossDrop) {
      if (r < 0.10) return 'epic';
      if (r < 0.25) return 'rare';
      if (r < 0.55) return 'uncommon';
      return 'common';
    } else {
      if (r < 0.01) return 'epic';
      if (r < 0.06) return 'rare';
      if (r < 0.35) return 'uncommon';
      return 'common';
    }
  }

  function generateLootItem(floor, bossDrop) {
    const baseTier = Math.min(6, Math.ceil(floor / 2));
    const tier = bossDrop ? Math.min(7, baseTier + rand(1, 2)) : baseTier;
    // 0. Rarita se určuje první — ovlivňuje všechny staty
    const rarity = getRarity(bossDrop);
    const rarityMult = rarity === 'epic' ? 2.5 : rarity === 'rare' ? 1.8 : rarity === 'uncommon' ? 1.4 : 1.0;
    // Nárůst s obtížností dungeonu: +8 % za patro
    const floorMult = 1 + (floor - 1) * 0.08;
    // 1. RNG: typ předmětu
    const typeRoll = Math.random();
    let type, subtype;
    if (typeRoll < 0.25) { type = 'weapon'; subtype = Math.random() < 0.5 ? 'staff' : 'blade'; }
    else if (typeRoll < 0.45) { type = 'armor'; subtype = null; }
    else if (typeRoll < 0.65) { type = 'helmet'; subtype = null; }
    else if (typeRoll < 0.75) { type = 'shield'; subtype = null; }
    else if (typeRoll < 0.85) { type = 'ring'; subtype = null; }
    else { type = 'amulet'; subtype = null; }

    // 2. RNG: konkrétní jméno podle typu a tieru
    const namePool = type === 'weapon' ? LOOT_NAMES.weapon[subtype] : LOOT_NAMES[type];
    const maxIdx = Math.min(namePool.length - 1, tier);
    const nameIdx = rand(0, maxIdx);
    const baseName = namePool[nameIdx];

    // 3. Atributy — počet podle rarity, hodnoty se překrývají
    let attrCount;
    if (rarity === 'common') attrCount = 1;
    else if (rarity === 'uncommon') attrCount = 2;
    else if (rarity === 'rare') attrCount = 3;
    else attrCount = 4; // epic
    const attrs = {};
    const usedKeys = [];
    for (let a = 0; a < attrCount; a++) {
      let k;
      do { k = ATTR_KEYS[rand(0, 3)]; } while (usedKeys.includes(k));
      usedKeys.push(k);
      // Hodnota atributu — podobné rozsahy, vyšší rarity mají víc atributů
      let minVal, maxVal;
      if (rarity === 'common') { minVal = 1; maxVal = 3; }
      else if (rarity === 'uncommon') { minVal = 2; maxVal = 4; }
      else if (rarity === 'rare') { minVal = 2; maxVal = 5; }
      else { minVal = 3; maxVal = 6; }
      minVal = Math.round(minVal * floorMult);
      maxVal = Math.round(maxVal * floorMult);
      attrs[k] = rand(minVal, maxVal);
    }

    // 4. Název — jen baseName bez statů v názvu
    const name = baseName;

    // 5. Základní staty podle typu, tieru, rarity a floor
    let baseDmg = 0, bonusHp = 0, defense = 0;
    if (type === 'weapon') {
      baseDmg = Math.round((5 + tier * 7 + rand(0, 3)) * rarityMult * floorMult);
    } else if (type === 'armor') {
      bonusHp = Math.round((10 + tier * 25 + rand(0, 10)) * rarityMult * floorMult);
      defense = Math.round(10 + floor * 5 + rand(0, 5));
    } else if (type === 'helmet') {
      bonusHp = Math.round((5 + tier * 15 + rand(0, 5)) * rarityMult * floorMult);
      defense = Math.round(5 + floor * 3 + rand(0, 3));
    } else if (type === 'ring') {
      baseDmg = Math.round((1 + tier * 2 + rand(0, 2)) * rarityMult * floorMult);
      bonusHp = Math.round((2 + tier * 5 + rand(0, 3)) * rarityMult * floorMult);
    } else if (type === 'amulet') {
      baseDmg = Math.round((2 + tier * 3 + rand(0, 2)) * rarityMult * floorMult);
      bonusHp = Math.round((3 + tier * 6 + rand(0, 4)) * rarityMult * floorMult);
    } else if (type === 'shield') {
      defense = Math.round((8 + floor * 4 + rand(0, 4)) * rarityMult);
      bonusHp = Math.round((3 + tier * 4 + rand(0, 3)) * rarityMult * floorMult);
    }

    const id = 'loot_' + Date.now() + '_' + rand(1000, 9999);
    const icon = type === 'weapon' ? LOOT_ICONS['weapon_' + subtype] : LOOT_ICONS[type];
    // Mapovat na PNG podle typu a tieru
    const iconImg = (function() {
      if (type === 'weapon') {
        const tierMap = {1:'staff_wooden',2:'staff_fire',3:'staff_lightning',4:'staff_archmage',5:'staff_archmage',6:'staff_archmage',7:'staff_archmage'};
        if (subtype === 'blade') {
          const bMap = {1:'weapon_iron_sword',2:'weapon_broad_sword',3:'weapon_battle_axe',4:'weapon_claymore',5:'weapon_war_hammer',6:'weapon_war_hammer',7:'weapon_claymore'};
          return '/assets/items/' + (bMap[tier] || 'weapon_iron_sword') + '.png';
        }
        return '/assets/items/' + (tierMap[tier] || 'staff_wooden') + '.png';
      }
      if (type === 'armor') {
        const aMap = {1:'armor_leather',2:'armor_chainmail',3:'armor_scale',4:'armor_plate',5:'armor_dragon_scale',6:'armor_dragon_scale',7:'armor_dragon_scale'};
        return '/assets/items/' + (aMap[tier] || 'armor_leather') + '.png';
      }
      if (type === 'helmet') {
        const hMap = {1:'helmet_linen_hood',2:'helmet_iron_helm',3:'helmet_steel_helm',4:'helmet_steel_helm',5:'helmet_crown',6:'helmet_crown',7:'helmet_crown'};
        return '/assets/items/' + (hMap[tier] || 'helmet_linen_hood') + '.png';
      }
      if (type === 'shield') {
        const sMap = {1:'shield_wooden',2:'shield_leather',3:'shield_iron',4:'shield_steel',5:'shield_paladin',6:'shield_paladin',7:'shield_paladin'};
        return '/assets/items/' + (sMap[tier] || 'shield_wooden') + '.png';
      }
      if (type === 'ring') {
        const rMap = {1:'ring_copper',2:'ring_copper',3:'ring_silver',4:'ring_gold',5:'ring_gem',6:'ring_gem',7:'ring_platinum'};
        return '/assets/items/' + (rMap[tier] || 'ring_copper') + '.png';
      }
      if (type === 'amulet') {
        const aMap = {1:'amulet_bone',2:'amulet_bone',3:'amulet_silver',4:'amulet_gold',5:'amulet_ruby',6:'amulet_arcane',7:'amulet_arcane'};
        return '/assets/items/' + (aMap[tier] || 'amulet_bone') + '.png';
      }
      return '';
    })();
    const cost = 10 + tier * 20 + usedKeys.reduce((s, k) => s + attrs[k] * 5, 0);
    const item = { id, name, type, subtype, baseDmg, bonusHp, defense, icon, iconImg, attrs, tier, cost, rarity, weaponType: type === 'weapon' ? subtype : null };
    // Crit chance pro blade zbraně (5-25% podle tieru)
    if (type === 'weapon' && subtype === 'blade') {
      item.critChance = Math.min(25, 5 + tier * 3 + rand(0, 5));
    }
    // Block chance pro štíty (15-45% podle tieru)
    if (type === 'shield') {
      item.blockChance = Math.min(45, 15 + tier * 4 + rand(0, 5));
    }
    ITEM_MAP[id] = item;
    state.lootItems = state.lootItems || {};
    state.lootItems[id] = item;
    return item;
  }

  function rollLoot(locId, floor, bossDrop) {
    const h = state.hero;
    if (bossDrop) {
      // Boss: zaručený item s vyšším tierem
      const item = generateLootItem(floor, true);
      return { type:'boss', item };
    }
    // Item reward
    const item = generateLootItem(floor);
    return { type:'item', item };
  }

  function endMapBattle(won) {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    const locId = mb.locId;

    // Monster killed - regular enemy (1 per floor)
    if (won && !mb.isBoss) {
      mapBattleState.ended = true;
      cleanupTimers();
      // Posun na další patro
      const nextFloor = mb.floor + 1;
      state.floorProgress[locId] = nextFloor;
      state.locationProgress[locId] = 0;
      state.hero.hp = mb.playerHp;
      state.wins = (state.wins || 0) + 1;
      saveGame();
      sfxSuccess();
      // Result screen
      $('resultIcon').textContent = '🎉';
      $('resultTitle').textContent = 'Patro ' + (mb.floor+1) + ' dobyto!';
      const mistakes = (mb.floorMistakes || 0) + (mb.mistakes || 0);
      const hpPct = Math.round((mb.playerHp / mb.maxPlayerHp) * 100);
      $('resultMsg').innerHTML = '<div class="result-stats">'
                + '<div class="result-stat"><span class="result-stat-icon">❤️</span><span class="result-stat-val">' + mb.playerHp + '/' + mb.maxPlayerHp + '</span><span class="result-stat-sub">(' + hpPct + '%)</span></div>'
                + '<div class="result-stat"><span class="result-stat-icon">❌</span><span class="result-stat-val">' + mistakes + '</span><span class="result-stat-sub">chyb</span></div>'
                + '<div class="result-tap">👆 klepni pro návrat</div>'
                + '</div>';
      $('resultLootList').innerHTML = '';
      $('resultBtn').innerHTML = '';
      $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('map'); };
      showScreen('result');
      switchBGM('win');
      return;
    }

    mapBattleState.ended = true;
    cleanupTimers();

    const arena = $('mbArena');
    if (arena && arena._mbHandlers) {
      arena._mbHandlers.forEach(h => {
        if (h[0] === 'keydown') window.removeEventListener(h[0], h[1]);
        else arena.removeEventListener(h[0], h[1]);
      });
      arena._mbHandlers = null;
    }

    if (!won) {
          state.deaths = (state.deaths || 0) + 1;
          state.locationProgress[locId] = 0;
          // floorProgress NEresetujeme — hráč zůstává na stejném patře
          state.hero.hp = state.hero.maxHp;
          saveGame();
          switchBGM('defeat');
          $('resultIcon').textContent = '💀';
          $('resultTitle').textContent = 'Padl jsi';
          $('resultMsg').textContent = `${mb.loc.name} — P${mb.floor+1}`;
          $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${locId},${mb.floor})">🔄 Znovu</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
    } else {
      state.wins = (state.wins || 0) + 1;
      state.hero.hp = mb.playerHp;
      // Boss defeated
      state.bossesDefeated[locId] = true;
      state.hero.xp = (state.hero.xp || 0) + mb.loc.bossXp + mb.floor * 10;
      state.floorProgress[locId] = 0;
      state.locationProgress[locId] = 0;
      applyLevelUp();
      const r = mb.loc.reward;
      if (r.weapon && state.hero.equip.weapon === 'fists') state.hero.equip.weapon = r.weapon;
      if (r.armor && state.hero.equip.armor === 'rags') state.hero.equip.armor = r.armor;
      // Boss loot: zaručený item s vyšším tierem
      const bossLoot = rollLoot(locId, mb.floor, true);
      if (bossLoot.type === 'boss') {
        state.hero.inventory.push(bossLoot.item.id);
      }
      sfxBossDefeat();
      $('resultIcon').textContent = '🏆';
      $('resultTitle').textContent = `${mb.loc.boss.name} poražen!`;
      $('resultMsg').innerHTML = '<div class="result-stats">'
                + '<div class="result-stat"><span class="result-stat-icon">❌</span><span class="result-stat-val">'+((mb.floorMistakes||0)+(mb.mistakes||0))+'</span><span class="result-stat-sub">chyb</span></div>'
                + '</div>';
      // Loot list — scroll okno s itemem
      let lootListHtml = '';
      if (bossLoot.type === 'boss') {
        const rr = RARITY[bossLoot.item.rarity] || RARITY.common;
        lootListHtml = `<div class="loot-scroll-item"><span class="loot-scroll-icon">${renderItemIcon(bossLoot.item,24)}</span><span class="loot-scroll-name" style="color:${rr.color}">${bossLoot.item.name}</span></div>`;
      } else {
        lootListHtml = '<div style="text-align:center;color:#555;font-size:12px;padding:8px">Žádné předměty</div>';
      }
      $('resultLootList').innerHTML = lootListHtml;
      $('resultBtn').innerHTML = '';
      $('resultMsg').innerHTML += '<div class="result-tap">👆 klepni pro návrat</div>';
      $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showMapWithUnlock(locId); };
      saveGame();
    }
    showScreen('result');
    if (won) switchBGM('win');
  }

  function showMapWithUnlock(doneLocId) {
    showScreen('map');
    renderMap();
    const nextLocId = doneLocId + 1;
    if (nextLocId < LOCATIONS.length) {
      const el = document.querySelectorAll('.map-location-wrap')[nextLocId];
      if (el) {
        const locEl = el.querySelector('.map-location');
        if (locEl && locEl.classList.contains('locked')) {
          locEl.classList.remove('locked');
          locEl.classList.add('unlocking');
          playSFX(treasureSfx);
          setTimeout(() => {
            locEl.classList.remove('unlocking');
            renderMap(); // překreslit v odemčeném stavu
          }, 900);
        }
      }
    }
  }

  function continueDungeon() {
    const mb = mapBattleState;
    mb.ended = false;
    const oldMistakes = (mb.floorMistakes || 0) + (mb.mistakes || 0);
    const locId = mb.locId;
    startLocation(locId);
    mapBattleState.floorMistakes = oldMistakes;
  }

  // ===== TUTORIAL (interactive guide) =====
  let _tutorialStep = -1;
  const TUTORIAL_STEPS = [
    {
      text: '💀 Monstra útočí! Vidíš <strong>šipku</strong>? Pro úhyb swipni stejným směrem.\n⬆️ = swipe nahoru, ⬇️ = dolů, ⬅️ = doleva, ➡️ = doprava.',
      arrowType: 'normal', arrowDir: '⬆️', swipeDir: 'up',
      showTimer: true, highlight: null
    },
    {
      text: 'Akcí bude třeba <strong>5 v řadě</strong> — tomu se říká <strong>sekvence</strong>.',
      arrowType: 'normal', arrowDir: '➡️', swipeDir: null,
      showTimer: true, seqDots: [0], highlight: null
    },
    {
      text: '❌ Chyba! Když netrefíš směr, <strong>sekvence začne od začátku</strong>. Musíš odvrátit všechny útoky v řadě!',
      arrowType: 'normal', arrowDir: '⬆️', swipeDir: 'up',
      showTimer: true, seqDots: ['done','done','error'], highlight: null
    },
    {
      text: '✅ Celá sekvence odvrácena! Otevřelo se <strong>útočné okno</strong>. Klikni na ⚔️ pro útok!',
      showTimer: true, showAttackWindow: true, highlight: null
    },
    {
      text: '⚡ <strong>Kritický útok</strong> — na timeru se objeví <strong>zlatá výseč</strong>. Klikni na ⚔️ v jejím průběhu pro kritický zásah (×1.5 poškození). Čím vyšší Obratnost, tím větší výseč!',
      showTimer: true, showBonusZone: true, highlight: null
    },
    {
      text: '⚔️⚔️ <strong>Těžký útok</strong> — dvě šipky vedle sebe. Swipni <strong>2× stejným směrem</strong>. Timer je delší, první swipe připraví, druhý provede.',
      arrowType: 'heavy', arrowDir: '➡️', swipeDir: 'right',
      showTimer: true, highlight: null
    },
    {
      text: '🛡️ Místo šipky je štít! To je <strong>blok útok</strong> — nesmíš swipnout! Stiskni tlačítko 🛡️ (Blok). Swipnutí = zásah!',
      showTimer: true, showShield: true, highlight: null
    },
    {
      text: '🟢 <strong>Zelená šipka</strong> = inverzní útok. Swipni <strong>opačným směrem</strong>! ⬆️ na obrazovce = swipe dolů.',
      arrowType: 'inverted', arrowDir: '⬆️', swipeDir: 'down',
      showTimer: true, highlight: null
    },
    {
      text: '🔵 <strong>Dvě modré šipky</strong> = dvojitý útok. Swipni <strong>oba směry</strong>, na pořadí nezáleží.',
      arrowType: 'twin', arrowDir: '⬆️', swipeDir: 'twin',
      showTimer: true, highlight: null
    },
    {
      text: '⏰ <strong>Rychlý útok (Rapid)</strong> — ťukej co nejrychleji na plošky po stranách! Čím víc stihneš, tím menší zranění dostaneš.',
      showTimer: true, showRapid: true, highlight: null
    },
    {
      text: '🩸💧📈🎯 <strong>Monstra mají typy!</strong> Vedle jména vidíš ikonku:<br>🩸 = Lifestealer (saje život)<br>💧 = Manastealer (krade manu)<br>📈 = Improver (s každým zásahem sílí)<br>🎯 = Critmaster (umí kritické zásahy)',
      showTimer: true, showMonsterTypes: true, highlight: null
    },
    {
      text: '⚔️🔮 A <strong>způsob útoku</strong>:<br>⚔️ = <strong>Melee</strong> — fyzický útok (sečný)<br>🔮 = <strong>Caster</strong> — magický útok (kouzlem)<br><br>Poznáš je i podle projektilu: melee = červený, caster = fialový.',
      showTimer: true, showAttackTypes: true, highlight: null
    },
    {
      text: '🏆 <strong>Teď už víš všechno!</strong> Hodně štěstí v dungeonu! 🎮',
      isFinal: true, showCheckmark: true, highlight: null
    }
  ];
  function startTutorial() {
    _tutorialStep = -1;
    const overlay = document.getElementById('tutorialOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    resetTutorialVisuals();
    advanceTutorial();
  }
  function stopTutorial() {
    document.getElementById('tutorialOverlay').classList.add('hidden');
    _tutorialStep = -1;
  }
  function resetTutorialVisuals() {
    const arrow = document.getElementById('tutArrow');
    arrow.setAttribute('class', 'boss-attack-arrow hidden');
    arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
    arrow.style.transform = '';
    document.getElementById('tutSwipe').classList.add('hidden');
    document.querySelectorAll('#tutSeq .tut-seq-dot').forEach(d => d.className = 'tut-seq-dot');
    document.getElementById('tutBlockBtn').classList.remove('active');
    document.getElementById('tutAttackBtn').classList.remove('active');
    document.getElementById('tutActionInfo').classList.add('hidden');
    document.getElementById('tutActionInfo').textContent = '';
    document.getElementById('tutTapLeft').classList.add('hidden');
    document.getElementById('tutTapRight').classList.add('hidden');
    document.getElementById('tutRapidTarget').classList.add('hidden');
    document.getElementById('tutCheckmark').classList.add('hidden');
    document.getElementById('tutArena').classList.remove('rapid-active');
    document.getElementById('tutMonster').textContent = '👹';
    const tutName = document.getElementById('tutEnemyName');
    if (tutName) { tutName.textContent = ''; tutName.classList.add('hidden'); }
    const ringSvg = document.getElementById('tutRing').querySelector('svg');
    const circles = ringSvg ? ringSvg.querySelectorAll('circle') : [];
    if (circles[0]) { circles[0].setAttribute('stroke-dasharray', '691'); circles[0].setAttribute('stroke-dashoffset', '97'); }
    if (circles[1]) { circles[1].setAttribute('stroke-dasharray', '0 741'); circles[1].setAttribute('stroke-dashoffset', '741'); }
  }
  function prevTutorialStep() {
    if (_tutorialStep <= 0) return;
    _tutorialStep -= 2; // -2 protože advanceTutorial udělá ++
    advanceTutorial();
  }
  function advanceTutorial() {
    _tutorialStep++;
    if (_tutorialStep >= TUTORIAL_STEPS.length) { stopTutorial(); return; }
    const step = TUTORIAL_STEPS[_tutorialStep];
    resetTutorialVisuals();
    // Text
    document.getElementById('tutText').innerHTML = step.text.replace(/\n/g, '<br>');
    // Arrow — stejné třídy jako v reálném souboji
    const arrow = document.getElementById('tutArrow');
    if (step.arrowType) {
      arrow.classList.remove('hidden');
      const rot = { '⬆️':0, '⬇️':180, '⬅️':-90, '➡️':90 }[step.arrowDir] || 0;
      if (step.arrowType === 'heavy') {
        arrow.classList.add('boss-attack-yellow');
        arrow.setAttribute('viewBox', '0 0 16 16');
        arrow.innerHTML = '<g><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(-3,0)"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(3,0)"/></g>';
        arrow.style.transform = `translate(-50%,-50%) rotate(${rot}deg)`;
      } else if (step.arrowType === 'twin') {
        arrow.classList.add('boss-attack-blue');
        arrow.setAttribute('viewBox', '0 -2 16 20');
        if (step.arrowDir === '⬆️') {
          arrow.innerHTML = '<g transform="translate(-2.5,0)"><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(2.5,0)"><path d="M8 15L3 8L5.5 8L5.5 1L10.5 1L10.5 8L13 8L8 15Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g>';
        } else {
          arrow.innerHTML = '<g transform="translate(0,-2.5)"><path d="M1 8L8 3L8 5.5L15 5.5L15 10.5L8 10.5L8 13L1 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(0,2.5)"><path d="M15 8L8 13L8 10.5L1 10.5L1 5.5L8 5.5L8 3L15 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g>';
        }
        arrow.style.transform = 'translate(-50%,-50%)';
      } else if (step.arrowType === 'inverted') {
        arrow.classList.add('boss-attack-green');
        arrow.style.transform = `translate(-50%,-50%) rotate(${rot}deg)`;
      } else {
        // normal
        arrow.style.transform = `translate(-50%,-50%) rotate(${rot}deg)`;
      }
    }
    // Timer ring — vždy zobrazit plný kruh (dashoffset=0)
    if (step.showTimer) {
      const ringSvg = document.getElementById('tutRing').querySelector('svg');
      const circles = ringSvg ? ringSvg.querySelectorAll('circle') : [];
      if (circles[0]) { circles[0].setAttribute('stroke-dasharray', '691'); circles[0].setAttribute('stroke-dashoffset', '97'); }
      if (circles[1]) {
        if (step.showBonusZone) {
          circles[1].setAttribute('stroke-dasharray', '55 741');
          circles[1].setAttribute('stroke-dashoffset', '0');
        } else {
          circles[1].setAttribute('stroke-dasharray', '0 741');
          circles[1].setAttribute('stroke-dashoffset', '741');
        }
      }
    }
    // Shield in action info
    if (step.showShield) {
      const ai = document.getElementById('tutActionInfo');
      ai.textContent = '🛡️';
      ai.classList.remove('hidden');
    }
    // Attack window — zvýraznit tlačítko a zobrazit ⚔️ v timeru
    if (step.showAttackWindow || step.showBonusZone) {
      document.getElementById('tutAttackBtn').classList.add('active');
      const ai = document.getElementById('tutActionInfo');
      ai.textContent = '⚔️';
      ai.classList.remove('hidden');
    }
    // Rapid — zobrazit plošky a target
    if (step.showRapid) {
      document.getElementById('tutTapLeft').classList.remove('hidden');
      document.getElementById('tutTapRight').classList.remove('hidden');
      document.getElementById('tutRapidTarget').classList.remove('hidden');
      document.getElementById('tutArena').classList.add('rapid-active');
    } else {
      document.getElementById('tutArena').classList.remove('rapid-active');
    }
    // Checkmark — velká fajfka na posledním snímku
    if (step.showCheckmark) {
      document.getElementById('tutCheckmark').classList.remove('hidden');
    }
    // Monster types demo — zobrazit reálný vzhled monstra s typy
    const nameEl = document.getElementById('tutEnemyName');
    if (step.showMonsterTypes) {
      // Stejná příšera jako na ostatních snímcích, jen se mění text
      const demoMonsters = [
        {name:'Vlk',type:'🩸',atk:'⚔️'},
        {name:'Duch',type:'💧',atk:'🔮'},
        {name:'Golem',type:'📈',atk:'⚔️'},
        {name:'Démon',type:'🎯',atk:'🔮'},
      ];
      const idx = Math.floor(_tutorialStep / 2) % demoMonsters.length;
      const m = demoMonsters[idx];
      if (nameEl) nameEl.textContent = `${m.name} ${m.type}${m.atk}`;
      nameEl.classList.remove('hidden');
    } else if (step.showAttackTypes) {
      const idx = Math.floor(_tutorialStep / 2) % 2;
      if (idx === 0) {
        if (nameEl) nameEl.textContent = 'Golem 📈⚔️';
      } else {
        if (nameEl) nameEl.textContent = 'Duch 💧🔮';
      }
      nameEl.classList.remove('hidden');
    } else {
      document.getElementById('tutMonster').textContent = '👹';
      if (nameEl) { nameEl.textContent = ''; nameEl.classList.add('hidden'); }
    }
    // Sequence dots — šedé = hotovo, červené = chyba
    const dots = document.querySelectorAll('#tutSeq .tut-seq-dot');
    const seqContainer = document.getElementById('tutSeq');
    if (step.seqDots) {
      seqContainer.classList.add('tut-seq-highlight');
    } else {
      seqContainer.classList.remove('tut-seq-highlight');
    }
    dots.forEach((d,i) => {
      d.className = 'tut-seq-dot';
      if (step.seqDots) {
        if (step.seqDots[i] === 'done') d.classList.add('done');
        else if (step.seqDots[i] === 'error') d.classList.add('error');
        else if (step.seqDots[i] >= 0 && i <= step.seqDots[i]) d.classList.add('done');
        else if (step.seqDots[i] === 0 && i === 0) d.classList.add('active');
      }
    });
    // Swipe animation
    const swipe = document.getElementById('tutSwipe');
    if (step.swipeDir) {
      swipe.className = 'tutorial-swipe dir-' + step.swipeDir;
      swipe.classList.remove('hidden');
    } else {
      swipe.classList.add('hidden');
    }
    // Tlačítko Další
    const nextBtn = document.getElementById('tutNextBtn');
    nextBtn.textContent = step.isFinal ? 'Dokončit' : 'Další';
  }

  // ===== BESTIARY =====
  function renderFace(face, themeIdx) {
    if (face.startsWith('<svg')) return face;
    if (face.startsWith('assets/')) {
      const filter = DUNGEON_THEME_FILTERS[themeIdx] || '';
      return '<div class="bestiary-portrait-frame" style="filter:'+filter+'"><img src="'+face+'" alt="" class="bestiary-portrait-img"/></div>';
    }
    return face;
  }
  function renderBestiary() {
    const grid = document.getElementById('bestiaryGrid');
    if (!grid) return;
    const encountered = state.encounteredMonsters || [];
    let html = '';
    MONSTER_DB.forEach((themeMonsters, themeIdx) => {
      const theme = DUNGEON_THEMES[themeIdx] || DUNGEON_THEMES[0];
      const loc = LOCATIONS[themeIdx];
      const locName = loc ? loc.name : `Oblast ${themeIdx+1}`;
      html += `<div class="bestiary-section"><div class="bestiary-section-title" style="color:${theme.border}">${locName}</div>`;
      // Normální monstra — první
      themeMonsters.forEach(m => {
        const seen = encountered.includes(m.face);
        const atkIcon = m.attackType === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
        const atkName = m.attackType === ATTACK_TYPES.CASTER ? 'Caster' : 'Melee';
        if (seen) {
          html += `<div class="bestiary-card" style="border-left:3px solid ${theme.border}">
          <div class="bestiary-face">${renderFace(m.face, themeIdx)}</div>
          <div class="bestiary-info">
            <div class="bestiary-name">${m.name}</div>
            <div class="bestiary-meta"><span>${atkIcon} ${atkName}</span></div>
          </div>
        </div>`;
        } else {
          html += `<div class="bestiary-card" style="border-left:3px solid #333;opacity:0.5;filter:grayscale(1)">
          <div class="bestiary-face"><div class="bestiary-portrait-frame" style="background:#111;border-color:#691"><span style="font-size:28px;color:#555">🔒</span></div></div>
          <div class="bestiary-info">
            <div class="bestiary-name" style="color:#555">???</div>
            <div class="bestiary-meta" style="color:#444"><span>???</span></div>
          </div>
        </div>`;
        }
      });
      // Boss karta — až na konci sekce
      if (loc && loc.boss) {
        const b = loc.boss;
        const seen = encountered.includes(b.face);
        const atkIcon = b.attackType === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
        const atkName = b.attackType === ATTACK_TYPES.CASTER ? 'Caster' : 'Melee';
        if (seen) {
          html += `<div class="bestiary-card bestiary-boss-card" style="border-left:3px solid ${theme.border}">
          <div class="bestiary-face bestiary-boss-face">${renderFace(b.face, themeIdx)}</div>
          <div class="bestiary-info">
            <div class="bestiary-name bestiary-boss-name"><span class="bestiary-boss-badge">👑 BOSS</span> ${b.name}</div>
            <div class="bestiary-meta"><span>${atkIcon} ${atkName}</span></div>
          </div>
        </div>`;
        } else {
          html += `<div class="bestiary-card bestiary-boss-card" style="border-left:3px solid #333;opacity:0.5;filter:grayscale(1)">
          <div class="bestiary-face bestiary-boss-face"><div class="bestiary-portrait-frame" style="background:#111;border-color:#691"><span style="font-size:28px;color:#555">🔒</span></div></div>
          <div class="bestiary-info">
            <div class="bestiary-name bestiary-boss-name" style="color:#555"><span class="bestiary-boss-badge">👑 BOSS</span> ???</div>
            <div class="bestiary-meta" style="color:#444">???</div>
          </div>
        </div>`;
        }
      }
      html += `</div>`;
    });
    grid.innerHTML = html;
  }

  // ===== TALENTS =====
  function getTierPoints(schoolId, tierIdx) {
    const s = SCHOOL_MAP[schoolId];
    if (!s || !s.tiers[tierIdx]) return 0;
    let total = 0;
    s.tiers[tierIdx].choices.forEach(t => {
      total += getTalentLv(schoolId + '_' + t.k);
    });
    return total;
  }
  function isTalentUnlocked(t) {
    if (!t.requires) return true;
    return getTalentLv(t.requires) >= t.requiresLv;
  }
  function getBestSpellId(schoolId) {
    if (schoolId === 'fire') {
      if (getTalentLv('fire_fireball') > 0) return 'fireball';
      if (getTalentLv('fire_fireblast') > 0) return 'fireblast';
      if (getTalentLv('fire_firebolt') > 0) return 'firebolt';
      return null;
    }
    if (schoolId === 'ice') {
      if (getTalentLv('ice_blizzard') > 0) return 'blizzard';
      if (getTalentLv('ice_frostbolt') > 0) return 'frostbolt';
      return null;
    }
    if (schoolId === 'physical') {
      if (getWeaponType() !== 'blade') return null;
      if (getTalentLv('physical_whirlwind') > 0) return 'whirlwind';
      if (getTalentLv('physical_slash') > 0) return 'slash';
      if (getTalentLv('physical_strongStrike') > 0) return 'strongStrike';
      return null;
    }
    // Nature: pravá větev je pasivní HoT, levá jed — žádné aktivní kouzlo
    return null;
  }
  function renderTalents() {
        const pts = state.talentPoints || 0;
        $('talentsPts').textContent = 'Body: ' + pts;
        const resetBtn = $('resetTalentsBtn');
        if (resetBtn) {
          const cost = 50;
          const hasSpent = Object.values(state.talentLevels).reduce((a,b)=>a+b, 0) > 0;
          resetBtn.textContent = hasSpent ? '🔄 Resetovat talenty (' + cost + '💰)' : '✅ Žádné body k resetu';
          resetBtn.disabled = !hasSpent;
        }
        $('talentSchools').innerHTML = SCHOOLS.map(s => {
                  const isActive = state.activeSchool === s.id;
                  const hasInvested = Object.values(state.talentLevels).reduce((a,b)=>a+b, 0) > 0;
                  const isLocked = hasInvested && getTierPoints(s.id, 0) === 0;
                  const collapsed = !isActive;
                  return `<div class="talent-school ${isActive?'active':''} ${collapsed?'collapsed':''} ${s.id} ${isLocked?'locked':''}">
                    ${isLocked?'<div class="talent-lock-overlay">🔒</div>':''}
                    <div class="talent-school-header" onclick="${isLocked?'':`game.activateSchool('${s.id}')`}">
                      <span class="talent-school-icon">${s.icon}</span>
                      <span class="talent-school-name">${s.name}</span>
                      <span class="talent-school-arrow">${collapsed?'▼':'▲'}</span>
                    </div>
                    <div class="talent-school-desc">${s.desc}</div>
                                        <div class="talent-tree ${collapsed?'hidden':''}">
                                          ${(function() {
                                            // Build two columns: [passive, active] x 3 tiers
                                            const leftTier = s.tiers.map(t => t.choices[0]); // passive
                                            const rightTier = s.tiers.map(t => t.choices[1]); // active
                                            function renderBranch(choices, side) {
                                              return '<div class="talent-branch talent-branch-' + side + '">' +
                                                choices.map((t, ti) => {
                                                  const key = s.id + '_' + t.k;
                                                  const lv = getTalentLv(key);
                                                  const maxed = lv >= t.maxLv;
                                                  const canInvest = pts > 0 && !maxed && isTalentUnlocked(t) && !isLocked;
                                                  const unlocked = isTalentUnlocked(t);
                                                  return (ti > 0 ? '<div class="talent-connector ' + (getTalentLv(s.id+'_'+choices[ti-1].k) >= choices[ti-1].maxLv ? 'connector-active' : '') + '"></div>' : '') +
                                                    `<div class="talent-btn ${lv>0?'owned':''} ${canInvest?'clickable':''} ${maxed?'maxed':''} ${!unlocked?'btn-locked':''}" onclick="${canInvest?`game.investTalent('${key}')`:''}">
                                                      <div class="talent-btn-icon">${t.icon}</div>
                                                      <div class="talent-btn-name">${t.name}</div>
                                                      <div class="talent-btn-lv">${lv}/${t.maxLv}</div>
                                                      <div class="talent-btn-desc">${t.desc(Math.max(lv,1))}</div>
                                                    </div>`;
                                                }).join('') +
                                                '<div class="talent-branch-label">' + (side === 'left' ? '⛰️ Pasivní' : '⚡ Aktivní') + '</div>' +
                                                '</div>';
                                            }
                                            return '<div class="talent-tree-content">' +
                                              renderBranch(leftTier, 'left') +
                                              '<div class="talent-divider"></div>' +
                                              renderBranch(rightTier, 'right') +
                                              '</div>';
                                          })()}
                                        </div>
                  </div>`;
        }).join('');
      }
      function investTalent(key) {
              const pts = state.talentPoints || 0;
              if (pts <= 0) return;
              const t = TALENT_MAP[key];
              if (!t) return;
              const lv = getTalentLv(key);
              if (lv >= t.maxLv) return;
              state.talentLevels[key] = lv + 1;
              state.talentPoints = pts - 1;
              if (!state.activeSchool) state.activeSchool = t._schoolId;
              saveGame();
              renderTalents();
            }
            function activateSchool(schoolId) {
              // Kliknutí na už aktivní školu = deaktivace (zabalení)
              if (state.activeSchool === schoolId) {
                state.activeSchool = null;
              } else {
                state.activeSchool = schoolId;
              }
              saveGame();
              renderTalents();
              renderHero();
            }
            function resetTalents() {
        let total = 0;
        Object.keys(state.talentLevels).forEach(k => { total += state.talentLevels[k]; state.talentLevels[k] = 0; });
        if (total === 0) return;
        state.talentPoints = (state.talentPoints || 0) + total;
        state.activeSchool = null;
        saveGame();
        renderTalents();
        renderHero();
        showMessage('🔄 Talenty resetovány! Získal jsi zpět ' + total + ' bodů.');
      }

  // ===== HERO =====
  function applyLevelUp() {
    const h = state.hero;
    const prevLevel = h.level;
    let leveled = false;
    while (true) {
      const xpNeeded = h.level * 80;
      if (h.xp < xpNeeded) break;
      h.xp -= xpNeeded;
      h.level++;
      h.maxHp = getHeroMaxHp();
      h.baseDmg = getHeroDmg();
      h.hp = h.maxHp; // full heal při levelu
      h.attrPoints = (h.attrPoints || 0) + 5;
      state.talentPoints = (state.talentPoints || 0) + 1;
      leveled = true;
    }
    if (leveled) {
      sfxLevelUp();
      saveGame();
      showLevelUpOverlay(prevLevel);
    }
    return leveled;
  }
  function getEquipAttrs() {
    const h = state.hero;
    const slots = ['weapon','armor','helmet','shield','ring1','amulet'];
    const defaults = { weapon:'fists', armor:'rags', helmet:null, shield:null, ring1:null, amulet:null };
    const total = { str:0, vit:0, dex:0, int:0 };
    slots.forEach(slot => {
      const itemId = h.equip[slot];
      if (!itemId || itemId === defaults[slot]) return;
      const item = ITEM_MAP[itemId];
      if (item && item.attrs) {
        Object.keys(item.attrs).forEach(k => {
          total[k] = (total[k] || 0) + item.attrs[k];
        });
      }
    });
    return total;
  }
  function getHeroDmg() {
    const h = state.hero;
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const amulet = ITEM_MAP[h.equip.amulet];
    const ringDmg = (ring1 && ring1.type === 'ring' ? (ring1.baseDmg||0) : 0) + (amulet && amulet.type === 'amulet' ? (amulet.baseDmg||0) : 0);
    const eqAttrs = getEquipAttrs();
    return Math.max(1, 5 + Math.floor(h.level * 2) + weapon.baseDmg + ringDmg + ((h.attrStr||0) + eqAttrs.str) * 1);
  }
  function getHeroMaxHp() {
    const h = state.hero;
    const armor = ITEM_MAP[h.equip.armor] || ITEM_MAP['rags'];
    const helmet = ITEM_MAP[h.equip.helmet];
    const shield = ITEM_MAP[h.equip.shield];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const amulet = ITEM_MAP[h.equip.amulet];
    const bonus = armor.bonusHp + (helmet ? helmet.bonusHp||0 : 0) + (shield ? shield.bonusHp||0 : 0) + (ring1 ? ring1.bonusHp||0 : 0) + (amulet ? amulet.bonusHp||0 : 0);
    const eqAttrs = getEquipAttrs();
    return Math.max(1, 100 + Math.floor(h.level * 10) + bonus + ((h.attrVit||0) + eqAttrs.vit) * 10);
  }
  function getHeroMaxMana() {
    const h = state.hero;
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const armor = ITEM_MAP[h.equip.armor] || ITEM_MAP['rags'];
    const helmet = ITEM_MAP[h.equip.helmet];
    const shield = ITEM_MAP[h.equip.shield];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const amulet = ITEM_MAP[h.equip.amulet];
    const bonus = (weapon.bonusMana||0) + (armor.bonusMana||0) + (helmet ? helmet.bonusMana||0 : 0) + (shield ? shield.bonusMana||0 : 0) + (ring1 ? ring1.bonusMana||0 : 0) + (amulet ? amulet.bonusMana||0 : 0);
    return Math.max(10, 50 + ((h.attrInt||0) + getEquipAttrs().int) * 10 + bonus);
  }
  const ATTR_COST = [5, 10, 20, 35, 55, 80, 110, 150, 200, 260, 330, 410, 500];
  function renderHero() {
    const h = state.hero;
    const active = state.activeSchool ? SCHOOL_MAP[state.activeSchool] : null;
    const schoolLv = active ? getTierPoints(state.activeSchool, 0) : 0;
    $('heroName').textContent = h.name || 'Dobrodruh';
    $('heroLevel').textContent = `Lv.${h.level}`;
    $('heroDeaths').textContent = state.deaths;
    $('heroWins').textContent = state.wins;
    $('heroHp').textContent = h.hp || h.maxHp;
    $('heroMaxHp').textContent = h.maxHp;
    $('heroDmg').textContent = getHeroDmg();
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const critChance = weapon.critChance || 0;
    $('heroCrit').textContent = critChance > 0 ? `${critChance}% (×2.0)` : `0%`;
    // Block chance ze štítu
    const shieldItem = ITEM_MAP[h.equip.shield];
    const blockChance = shieldItem ? (shieldItem.blockChance || 0) : 0;
    $('heroBlock').textContent = `${blockChance}%`;
    // Celková Defense
    const armorDef = (ITEM_MAP[h.equip.armor] || ITEM_MAP['rags']).defense || 0;
    const helmetDef = ITEM_MAP[h.equip.helmet]?.defense || 0;
    const shieldDef = ITEM_MAP[h.equip.shield]?.defense || 0;
    const totalDef = armorDef + helmetDef + shieldDef;
    const defPct = Math.round(100 - 10000 / (100 + totalDef));
    $('heroDefense').textContent = `${totalDef} (${defPct}%)`;
    const faceFile = h.face || 'hero';
    const portraitImg = $('heroPortraitImg');
    if (portraitImg) portraitImg.src = `assets/monsters/${faceFile}.png`;
    const mbPortraitImg = $('mbHeroPortraitImg');
    if (mbPortraitImg) mbPortraitImg.src = `assets/monsters/${faceFile}.png`;
    const navHeroIcon = $('navHeroIcon');
    if (navHeroIcon) navHeroIcon.src = `assets/monsters/${faceFile}.png`;
    // Aktivni skola
    const schoolInfo = $('activeSchoolInfo');
    if (schoolInfo) {
      schoolInfo.textContent = active ? `${active.icon} ${active.name} — Lv.${schoolLv}/5` : 'Žádná — přidej talentové body v 🎓 Talent Tree';
    }
    // XP bar
    const xpNeeded = h.level * 80;
    const xpPct = Math.min((h.xp / xpNeeded) * 100, 100);
    $('heroXpLabel').textContent = `${h.xp}/${xpNeeded}`;
    $('heroXpBar').style.width = xpPct + '%';

    // Atributy
    const strCost = ATTR_COST[Math.min(h.attrStr||0, ATTR_COST.length-1)] || 999;
    const vitCost = ATTR_COST[Math.min(h.attrVit||0, ATTR_COST.length-1)] || 999;
    const dexCost = ATTR_COST[Math.min(h.attrDex||0, ATTR_COST.length-1)] || 999;
    const intCost = ATTR_COST[Math.min(h.attrInt||0, ATTR_COST.length-1)] || 999;
    const pts = h.attrPoints || 0;
    $('heroAttrStr').textContent = (h.attrStr||0) + (getEquipAttrs().str > 0 ? ` (+${getEquipAttrs().str} z itemů)` : '');
    $('heroAttrVit').textContent = (h.attrVit||0) + (getEquipAttrs().vit > 0 ? ` (+${getEquipAttrs().vit} z itemů)` : '');
    $('heroAttrDex').textContent = (h.attrDex||0) + (getEquipAttrs().dex > 0 ? ` (+${getEquipAttrs().dex} z itemů)` : '');
    $('heroAttrInt').textContent = (h.attrInt||0) + (getEquipAttrs().int > 0 ? ` (+${getEquipAttrs().int} z itemů)` : '');
    $('heroAttrPts').textContent = pts;
    const strBtn = $('heroUpStr');
    const vitBtn = $('heroUpVit');
    const dexBtn = $('heroUpDex');
    const intBtn = $('heroUpInt');
    if (strBtn) strBtn.textContent = `⬆️ Síla` + (pts > 0 ? '' : ` 🔒`);
    if (strBtn) strBtn.style.opacity = pts > 0 ? '1' : '0.3';
    if (vitBtn) vitBtn.textContent = `⬆️ Vitalita` + (pts > 0 ? '' : ` 🔒`);
    if (vitBtn) vitBtn.style.opacity = pts > 0 ? '1' : '0.3';
    if (dexBtn) dexBtn.textContent = `⬆️ Obratnost` + (pts > 0 ? '' : ` 🔒`);
    if (dexBtn) dexBtn.style.opacity = pts > 0 ? '1' : '0.3';
    if (intBtn) intBtn.textContent = `⬆️ Intelekt` + (pts > 0 ? '' : ` 🔒`);
    if (intBtn) intBtn.style.opacity = pts > 0 ? '1' : '0.3';

    const weaponNames = { fists:'✊ Pěsti', dagger:'🪄 Dřevěná hůlka', shortsword:'🪄 Ohnivá hůlka', sword:'🪄 Ledová hůl', battleAxe:'🪄 Blesková hůl', spear:'🪄 Hvězdná hůl', flameSword:'🪄 Plamená hůl', longsword:'🪄 Měsíční hůl', warHammer:'⚔️ Temný meč', greatAxe:'🪓 Dračí sekera', excalibur:'⚔️ Arcimágův meč' };
    const armorNames = { rags:'👘 Hadry', leather:'👘 Lněný hábit', chainmail:'👘 Kožený hábit', scale:'👘 Šupinový hábit', plate:'👘 Vyšívaný hábit', fullPlate:'👘 Kroužkový hábit', dragonScale:'👘 Dračí hábit', adamantPlate:'👘 Arcimágův hábit' };
    // Hero screen equipment sloty
    const w = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const a = ITEM_MAP[h.equip.armor] || ITEM_MAP['rags'];
    const helm = ITEM_MAP[h.equip.helmet];
    const shield = ITEM_MAP[h.equip.shield];
    const r1 = ITEM_MAP[h.equip.ring1];
    const amulet = ITEM_MAP[h.equip.amulet];
    const hw = $('heroSlotWeaponIcon'); if (hw) hw.innerHTML = h.equip.weapon === 'fists' ? renderItemIcon({iconImg:'/assets/items/weapon_iron_sword.png',tier:1}, 0) : renderItemIcon(w, 0);
    const hws = $('heroSlotWeapon'); if (hws) { hws.classList.toggle('empty', h.equip.weapon === 'fists'); setSlotBorder('heroSlotWeapon', w); }
    const ha = $('heroSlotArmorIcon'); if (ha) ha.innerHTML = h.equip.armor === 'rags' ? renderItemIcon({iconImg:'/assets/items/armor_leather.png',tier:1}, 0) : renderItemIcon(a, 0);
    const has = $('heroSlotArmor'); if (has) { has.classList.toggle('empty', h.equip.armor === 'rags'); setSlotBorder('heroSlotArmor', a); }
    const hh = $('heroSlotHelmetIcon'); if (hh) hh.innerHTML = helm ? renderItemIcon(helm, 0) : renderItemIcon({iconImg:'/assets/items/helmet_linen_hood.png',tier:1}, 0);
    const hhs = $('heroSlotHelmet'); if (hhs) { hhs.classList.toggle('empty', !helm); setSlotBorder('heroSlotHelmet', helm); }
    const hs = $('heroSlotShieldIcon'); if (hs) hs.innerHTML = shield ? renderItemIcon(shield, 0) : renderItemIcon({iconImg:'/assets/items/shield_wooden.png',tier:1}, 0);
    const hss = $('heroSlotShield'); if (hss) { hss.classList.toggle('empty', !shield); setSlotBorder('heroSlotShield', shield); }
    const hr1 = $('heroSlotRing1Icon'); if (hr1) hr1.innerHTML = r1 ? renderItemIcon(r1, 0) : renderItemIcon({iconImg:'/assets/items/ring_copper.png',tier:1}, 0);
    const hr1s = $('heroSlotRing1'); if (hr1s) { hr1s.classList.toggle('empty', !r1); setSlotBorder('heroSlotRing1', r1); }
    const ham = $('heroSlotAmuletIcon'); if (ham) ham.innerHTML = amulet ? renderItemIcon(amulet, 0) : renderItemIcon({iconImg:'/assets/items/amulet_bone.png',tier:1}, 0);
    const hams = $('heroSlotAmulet'); if (hams) { hams.classList.toggle('empty', !amulet); setSlotBorder('heroSlotAmulet', amulet); }
  }

  function renameHero() {
    const h = state.hero;
    const currentName = h.name || 'Dobrodruh';
    const newName = prompt('Zadej nové jméno hrdiny:', currentName);
    if (newName && newName.trim().length > 0 && newName.trim() !== currentName) {
      h.name = newName.trim().substring(0, 20);
      saveGame();
      renderHero();
    }
  }

  const HERO_FACES = [
    {id:'hero'},
    {id:'hero_warrior_f'},
    {id:'hero_mage_m'},
    {id:'hero_mage_f'},
    {id:'hero_barbarian_m'},
    {id:'hero_barbarian_f'},
    {id:'hero_rogue_m'},
    {id:'hero_rogue_f'},
    {id:'hero_paladin_m'},
    {id:'hero_paladin_f'},
  ];

  function showFaceSelect() {
    const overlay = $('faceSelectOverlay');
    const grid = $('faceSelectGrid');
    if (!overlay || !grid) return;
    grid.innerHTML = HERO_FACES.map(f => {
      const current = (state.hero.face || 'hero') === f.id;
      return `<div onclick="game.selectFace('${f.id}')" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:6px;border-radius:8px;background:${current ? '#2a2a2a' : '#1a1a1a'};border:2px solid ${current ? '#4a7dff' : 'transparent'};transition:all 0.2s">
        <div style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid #4a7dff;display:flex;align-items:center;justify-content:center;background:#0a0a0a">
          <img src="assets/monsters/${f.id}.png" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>
        </div>
      </div>`;
    }).join('');
    overlay.classList.remove('hidden');
  }

  function closeFaceSelect() {
    const overlay = $('faceSelectOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function selectFace(id) {
    state.hero.face = id;
    saveGame();
    renderHero();
    closeFaceSelect();
  }

  function upgradeAttr(attr) {
    const h = state.hero;
    if ((h.attrPoints||0) <= 0) { showMessage('❌ Nemáš žádné atributové body!'); return; }
    h.attrPoints--;
    if (attr === 'str') {
      h.attrStr = (h.attrStr||0) + 1;
      h.baseDmg = getHeroDmg();
      showMessage('💪 Síla +1! Poškození zvýšeno!');
    } else if (attr === 'dex') {
      h.attrDex = (h.attrDex||0) + 1;
      showMessage('🎯 Obratnost +1! Crit okno zvětšeno!');
    } else if (attr === 'int') {
      h.attrInt = (h.attrInt||0) + 1;
      h.maxMana = getHeroMaxMana();
      h.mana = h.maxMana;
      showMessage('🧠 Intelekt +1! Max many +10!');
    } else {
      h.attrVit = (h.attrVit||0) + 1;
      h.maxHp = getHeroMaxHp();
      h.hp = h.maxHp;
      showMessage('❤️ Vitalita +1! Max HP zvýšeno!');
    }
    saveGame();
    renderHero();
  }

  function sellItem(itemId) {
    const item = ITEM_MAP[itemId];
    if (!item || item.cost === 0) return;
    const h = state.hero;
    const idx = h.inventory.indexOf(itemId);
    if (idx === -1) { showMessage('❌ Tento předmět nemáš v inventáři!'); return; }
    const sellPrice = Math.round(item.cost * 0.5);
    h.inventory.splice(idx, 1);
    saveGame();
    showMessage(`💰 Prodáno ${item.icon} ${item.name} za ${sellPrice}💰`);
    renderInventory();
  }

  function sellSlotItem(itemId, slot) {
    const h = state.hero;
    const defaults = { weapon:'fists', armor:'rags', helmet:null, ring1:null, amulet:null };
    if (h.equip[slot] !== itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    const sellPrice = Math.round(item.cost * 0.5);
    h.equip[slot] = defaults[slot];
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    saveGame();
    renderInventory();
    renderHero();
  }

  function setSlotBorder(slotId, item) {
    const el = $(slotId);
    if (!el) return;
    if (item && item.rarity) {
      el.style.border = `2px solid ${RARITY[item.rarity].border}`;
    } else {
      el.style.border = '';
    }
  }
  // ===== INVENTORY =====
  function renderInventory() {
    const h = state.hero;
    // Equipment sloty — 6 slotů
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const armor = ITEM_MAP[h.equip.armor] || ITEM_MAP['rags'];
    const helmet = ITEM_MAP[h.equip.helmet];
    const shield = ITEM_MAP[h.equip.shield];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const amulet = ITEM_MAP[h.equip.amulet];
    $('invSlotWeaponIcon').innerHTML = h.equip.weapon === 'fists' ? renderItemIcon({iconImg:'/assets/items/weapon_iron_sword.png',tier:1}, 0) : renderItemIcon(weapon, 0);
    $('invSlotWeapon').classList.toggle('empty', h.equip.weapon === 'fists');
    setSlotBorder('invSlotWeapon', weapon);
    $('invSlotArmorIcon').innerHTML = h.equip.armor === 'rags' ? renderItemIcon({iconImg:'/assets/items/armor_leather.png',tier:1}, 0) : renderItemIcon(armor, 0);
    $('invSlotArmor').classList.toggle('empty', h.equip.armor === 'rags');
    setSlotBorder('invSlotArmor', armor);
    const hEl = $('invSlotHelmetIcon'); if (hEl) hEl.innerHTML = helmet ? renderItemIcon(helmet, 0) : renderItemIcon({iconImg:'/assets/items/helmet_linen_hood.png',tier:1}, 0);
    const hS = $('invSlotHelmet'); if (hS) { hS.classList.toggle('empty', !helmet); setSlotBorder('invSlotHelmet', helmet); }
    const sEl = $('invSlotShieldIcon'); if (sEl) sEl.innerHTML = shield ? renderItemIcon(shield, 0) : renderItemIcon({iconImg:'/assets/items/shield_wooden.png',tier:1}, 0);
    const sS = $('invSlotShield'); if (sS) { sS.classList.toggle('empty', !shield); setSlotBorder('invSlotShield', shield); }
    const r1El = $('invSlotRing1Icon'); if (r1El) r1El.innerHTML = ring1 ? renderItemIcon(ring1, 0) : renderItemIcon({iconImg:'/assets/items/ring_copper.png',tier:1}, 0);
    const r1S = $('invSlotRing1'); if (r1S) { r1S.classList.toggle('empty', !ring1); setSlotBorder('invSlotRing1', ring1); }
    const amEl = $('invSlotAmuletIcon'); if (amEl) amEl.innerHTML = amulet ? renderItemIcon(amulet, 0) : renderItemIcon({iconImg:'/assets/items/amulet_bone.png',tier:1}, 0);
    const amS = $('invSlotAmulet'); if (amS) { amS.classList.toggle('empty', !amulet); setSlotBorder('invSlotAmulet', amulet); }
    // Grid batohu — 4 sloupce, max 20 buněk
    const grid = $('invGrid');
    const inv = h.inventory || [];
    const maxCells = 20;
    let html = '';
    for (let i = 0; i < maxCells; i++) {
      const itemId = inv[i];
      if (itemId) {
        const item = ITEM_MAP[itemId];
        if (!item) { html += '<div class="inv-grid-cell empty"></div>'; continue; }
        const stats = item.type === 'weapon' ? `⚔️${item.baseDmg}` : item.type === 'ring' ? `⚔️${item.baseDmg||0} ❤️${item.bonusHp||0}` : item.type === 'amulet' ? `⚔️${item.baseDmg||0} ❤️${item.bonusHp||0}` : `❤️${item.bonusHp}`;
        const r = RARITY[item.rarity] || RARITY.common;
        html += `<div class="inv-grid-cell" data-idx="${i}" style="border-color:${r.border}">
          <div class="cell-icon">${renderItemIcon(item,0)}</div>
          <div class="cell-name" style="color:${r.color}">${item.name}</div>
          <div class="cell-actions">
            <button class="btn-equip" onclick="event.stopPropagation();game.equipItem(${i})">🎽 Obléci</button>
            <button class="btn-sell" onclick="event.stopPropagation();game.sellItem('${itemId}')">💰 ${Math.round(item.cost*0.5)}</button>
          </div>
        </div>`;
      } else {
        html += '<div class="inv-grid-cell empty"></div>';
      }
    }
    grid.innerHTML = html;
    // Info panel — zobrazit při kliknutí na item
    function showItemInfo(item) {
      const panel = $('invInfoPanel');
      if (!panel || !item) { if (panel) panel.classList.add('hidden'); return; }
      $('invInfoIcon').innerHTML = renderItemIcon(item, 48);
      $('invInfoName').textContent = item.name;
      const r = RARITY[item.rarity] || RARITY.common;
      $('invInfoName').style.color = r.color;
      let stats = `<span style="color:${r.color};font-size:11px">${r.name}</span><br>`;
      if (item.type === 'weapon') {
        stats += `⚔️ +${item.baseDmg} poškození`;
        if (item.critChance) stats += ` · 🎯 ${item.critChance}% krit (×2.0)`;
      }
      else if (item.type === 'armor') stats += `❤️ +${item.bonusHp} HP · 🛡️ +${item.defense||0} Defense`;
      else if (item.type === 'helmet') stats += `❤️ +${item.bonusHp} HP · 🛡️ +${item.defense||0} Defense`;
      else if (item.type === 'shield') stats += `🛡️ ${item.blockChance||0}% blok · ❤️ +${item.bonusHp||0} HP · 🛡️ +${item.defense||0} Defense`;
      else if (item.type === 'ring') stats += `⚔️ +${item.baseDmg||0} dmg · ❤️ +${item.bonusHp||0} HP`;
      else if (item.type === 'amulet') stats += `⚔️ +${item.baseDmg||0} dmg · ❤️ +${item.bonusHp||0} HP`;
      if (item.weaponType === 'staff') stats += ' 🪄 magická';
      else if (item.weaponType === 'blade') stats += ' ⚔️ fyzická';
      if (item.attrs) {
        const attrStr = Object.keys(item.attrs).map(k => {
          const names = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' };
          return `${names[k]||k}+${item.attrs[k]}`;
        }).join(' · ');
        stats += '<br>' + attrStr;
      }
      if (item.cost) stats += ` · 💰 ${item.cost}`;
      $('invInfoStats').innerHTML = stats;
      panel.classList.remove('hidden');
    }
    // Klik na buňku = přepnutí viditelnosti akcí + info panel
    grid.querySelectorAll('.inv-grid-cell:not(.empty)').forEach(cell => {
      cell.addEventListener('click', function(e) {
        if (e.target.closest('.cell-actions')) return;
        const idx = this.dataset.idx;
        const itemId = inv[idx];
        const item = itemId ? ITEM_MAP[itemId] : null;
        if (item) showItemInfo(item);
        const actions = this.querySelector('.cell-actions');
        if (!actions) return;
        // Skrýt všechny ostatní (batoh + sloty)
        grid.querySelectorAll('.cell-actions.visible').forEach(a => a.classList.remove('visible'));
        document.querySelectorAll('.slot-actions.visible').forEach(a => a.classList.remove('visible'));
        if (!actions.classList.contains('visible')) {
          actions.classList.add('visible');
        }
      });
    });
    // Klik na equipment slot = akce (sundat/prodat) + info
    const slotNames = { invSlotWeapon:'weapon', invSlotArmor:'armor', invSlotHelmet:'helmet', invSlotShield:'shield', invSlotRing1:'ring1', invSlotAmulet:'amulet' };
    Object.keys(slotNames).forEach(slotId => {
      const el = $(slotId);
      if (!el) return;
      el.addEventListener('click', function(e) {
        if (e.target.closest('.cell-actions')) return;
        const slot = slotNames[slotId];
        const itemId = h.equip[slot];
        const defaults = { weapon:'fists', armor:'rags', helmet:null, shield:null, ring1:null, amulet:null };
        if (!itemId || itemId === defaults[slot]) return;
        const item = ITEM_MAP[itemId];
        if (item) showItemInfo(item);
        // Skrýt ostatní akce (batoh + sloty)
        grid.querySelectorAll('.cell-actions.visible').forEach(a => a.classList.remove('visible'));
        document.querySelectorAll('.slot-actions.visible').forEach(a => a.classList.remove('visible'));
        // Zobrazit akce pro tento slot
        const actionsEl = $(slotId + 'Actions');
        if (actionsEl && item) {
          actionsEl.innerHTML = `<button class="btn-equip" onclick="event.stopPropagation();game.unequipSlot('${slot}')">📦 Sundat</button>
            <button class="btn-sell" onclick="event.stopPropagation();game.sellSlotItem('${itemId}','${slot}')">💰 ${Math.round(item.cost*0.5)}</button>`;
          actionsEl.classList.add('visible');
        }
      });
    });
    // Klik mimo buňky = schovat všechny akce + info panel
    const hideActions = (e) => {
      const cell = e.target.closest('.inv-grid-cell');
      if (cell && !cell.classList.contains('empty')) return;
      const slotEl = e.target.closest('.inv-equip-slot');
      if (slotEl) return;
      grid.querySelectorAll('.cell-actions.visible').forEach(a => a.classList.remove('visible'));
      document.querySelectorAll('.slot-actions.visible').forEach(a => a.classList.remove('visible'));
      const panel = $('invInfoPanel');
      if (panel) panel.classList.add('hidden');
    };
    document.removeEventListener('click', grid._hideActions);
    grid._hideActions = hideActions;
    document.addEventListener('click', hideActions);
  }

  function unequipSlot(slot) {
    const h = state.hero;
    const defaults = { weapon:'fists', armor:'rags', helmet:null, shield:null, ring1:null, amulet:null };
    const current = h.equip[slot];
    if (!current || current === defaults[slot]) return;
    if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
    h.inventory.push(current);
    h.equip[slot] = defaults[slot];
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    saveGame();
    renderInventory();
    renderHero();
  }

  function equipItem(invIdx) {
    const h = state.hero;
    const itemId = h.inventory[invIdx];
    if (!itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    // Odstranit nový item z inventáře PRVNĚ (dřív než pushneme starý)
    h.inventory.splice(invIdx, 1);
    if (item.type === 'weapon') {
      // Obouruční zbraň (blade tier 4+) vyhodí štít zpět do batohu
      const isTwoHanded = item.weaponType === 'blade' && item.tier >= 4;
      if (isTwoHanded && h.equip.shield) {
        h.inventory.push(h.equip.shield);
        h.equip.shield = null;
      }
      // Pokud má hráč štít a chce nasadit obouruční zbraň, štít je už vyhozen výše
      if (h.equip.weapon !== 'fists') h.inventory.push(h.equip.weapon);
      h.equip.weapon = itemId;
    } else if (item.type === 'armor') {
      if (h.equip.armor !== 'rags') h.inventory.push(h.equip.armor);
      h.equip.armor = itemId;
    } else if (item.type === 'helmet') {
      if (h.equip.helmet) h.inventory.push(h.equip.helmet);
      h.equip.helmet = itemId;
    } else if (item.type === 'shield') {
      // Štít nejde s obouruční zbraní — vyhodit zbraň zpět
      const curWeapon = ITEM_MAP[h.equip.weapon];
      const isTwoHanded = curWeapon && curWeapon.weaponType === 'blade' && curWeapon.tier >= 4;
      if (isTwoHanded) {
        h.inventory.push(h.equip.weapon);
        h.equip.weapon = 'fists';
      }
      if (h.equip.shield) h.inventory.push(h.equip.shield);
      h.equip.shield = itemId;
    } else if (item.type === 'ring') {
      if (!h.equip.ring1) {
        h.equip.ring1 = itemId;
      } else {
        h.inventory.push(h.equip.ring1);
        h.equip.ring1 = itemId;
      }
    } else if (item.type === 'amulet') {
      if (h.equip.amulet) h.inventory.push(h.equip.amulet);
      h.equip.amulet = itemId;
    }
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    h.maxMana = getHeroMaxMana();
    h.mana = h.maxMana;
    saveGame();
    showMessage(`🎽 Oblékl jsi ${item.icon} ${item.name}!`);
    renderInventory();
    renderHero();
  }

  function unequipItem(itemId) {
    const h = state.hero;
    if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
    const item = ITEM_MAP[itemId];
    if (!item) return;
    const defaults = { weapon:'fists', armor:'rags', helmet:null, shield:null, ring1:null, amulet:null };
    if (item.type === 'weapon') {
      if (h.equip.weapon !== itemId) return;
      h.equip.weapon = defaults.weapon;
    } else if (item.type === 'armor') {
      if (h.equip.armor !== itemId) return;
      h.equip.armor = defaults.armor;
    } else if (item.type === 'helmet') {
      if (h.equip.helmet !== itemId) return;
      h.equip.helmet = defaults.helmet;
    } else if (item.type === 'shield') {
      if (h.equip.shield !== itemId) return;
      h.equip.shield = defaults.shield;
    } else if (item.type === 'ring') {
      if (h.equip.ring1 === itemId) h.equip.ring1 = defaults.ring1;
      else return;
    } else if (item.type === 'amulet') {
      if (h.equip.amulet === itemId) h.equip.amulet = defaults.amulet;
      else return;
    } else return;
    h.inventory.push(itemId);
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    h.maxMana = getHeroMaxMana();
    h.mana = h.maxMana;
    saveGame();
    showMessage(`📦 Sundal jsi ${item.icon} ${item.name} do inventáře!`);
    renderInventory();
  }

  // ===== TRAINING (minigames) =====
  function enterTraining(skillId) {
    const sk = SKILL_MAP[skillId];
    if (!sk) return;
    const lv = state.skills[skillId] || 0;
    if (lv >= sk.maxLv) { showMessage('✅ MAX level!'); return; }
    trainingState = { skillId, skill: sk, level: Math.min(5, lv + 1), round: 0, ended: false, firstRound: true, playerHp: 1 };
    showScreen('battle');
    switchBGM('minigame');
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
  

  // ===== COUNTDOWN =====
  function showCountdown(s,cb){cleanupTimers();let r=s;const el=$('countdownOverlay'),ne=$('countdownNumber');el.classList.remove('hidden');ne.textContent=r;playTone(440+r*60,0.15,'sine',0.1);minigameState.countdownInterval=setInterval(()=>{r--;if(r<=0){clearInterval(minigameState.countdownInterval);minigameState.countdownInterval=null;el.classList.add('hidden');if(cb)cb();}else{ne.textContent=r;playTone(440+r*60,0.15,'sine',0.1);}},1000);}

  // ===== INIT =====
  function init() {
    state = loadSave();

    // Přednačtení obrázků monster do cache pro okamžité zobrazení v souboji
    const allMonsterFaces = [];
    MONSTER_DB.forEach(theme => theme.forEach(m => {
      if (m.face && m.face.startsWith('assets/')) allMonsterFaces.push(m.face);
    }));
    LOCATIONS.forEach(loc => {
      if (loc.boss && loc.boss.face && loc.boss.face.startsWith('assets/')) allMonsterFaces.push(loc.boss.face);
    });
    // Deduplikace a prefetch
    [...new Set(allMonsterFaces)].forEach(src => { const img = new Image(); img.src = src; });

    if (!state.bossesDefeated || state.bossesDefeated.length < LOCATIONS.length) state.bossesDefeated = Array(LOCATIONS.length).fill(false);
    if (!state.locationProgress || state.locationProgress.length < LOCATIONS.length) state.locationProgress = Array(LOCATIONS.length).fill(0);
    if (!state.floorProgress || state.floorProgress.length < LOCATIONS.length) state.floorProgress = Array(LOCATIONS.length).fill(0);
    if (!state.hero) state.hero = { level:1, xp:0, hp:100, maxHp:100, mana:50, maxMana:50, baseDmg:12, inventory:[], equip:{weapon:'fists',armor:'rags'}, attrStr:0, attrVit:0, attrPoints:0 };
    if (state.hero.maxHp === undefined) state.hero.maxHp = getHeroMaxHp();
    if (state.hero.hp === undefined) state.hero.hp = state.hero.maxHp;
    if (state.hero.attrStr === undefined) state.hero.attrStr = 0;
    if (state.hero.attrVit === undefined) state.hero.attrVit = 0;
    if (state.hero.attrDex === undefined) state.hero.attrDex = 0;
    if (state.hero.attrInt === undefined) state.hero.attrInt = 0;
    if (state.hero.mana === undefined) state.hero.mana = 50;
    if (state.hero.maxMana === undefined) state.hero.maxMana = 50;
    if (state.hero.attrPoints === undefined) state.hero.attrPoints = 0;

    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // zabránit propagaci na document
        if (a.dataset.screen === 'map') showScreen('map');
        else if (a.dataset.screen === 'talents') showScreen('talents');
        else if (a.dataset.screen === 'hero') showScreen('hero');
        else if (a.dataset.screen === 'inventory') showScreen('inventory');
        else if (a.dataset.screen === 'guide') showScreen('guide');
        else if (a.dataset.screen === 'bestiary') { showScreen('bestiary'); renderBestiary(); }
        // Inicializovat audio hned při prvním kliku (user gesture)
        firstUserInteraction();
      });
    });
    document.getElementById('musicToggle').addEventListener('click', (e) => {
      e.preventDefault();
      toggleMusic();
    });
    document.getElementById('testToggle').addEventListener('click', (e) => {
      e.preventDefault();
      toggleTestMode();
    });
    document.getElementById('mbPauseBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMapPause();
    });
    // Spustit BGM při první user interakci
    let _firstInteraction = true;
    function firstUserInteraction() {
      if (!_firstInteraction) return;
      _firstInteraction = false;
      initAudio();
      ensureRunning(); // jen probudit AudioContext, nehrát
    }
    // První interakce: klik na tlačítko "🌍 Svět" v nav baru
    // Pokud uživatel klikne jinde, zachytíme to taky
    document.addEventListener('click', function handler() {
      document.removeEventListener('click', handler);
      if (_firstInteraction) firstUserInteraction();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pauza BGM
        if (!bgmAudio.paused) bgmAudio.pause();
        if (!overworldAudio.paused) overworldAudio.pause();
        if (!defeatAudio.paused) defeatAudio.pause();
        if (!winAudio.paused) winAudio.pause();
        currentBGM = null;
        // Pauza herních timerů (swipe fight)
        const mb = mapBattleState;
        if (mb && !mb.ended && mb.sequence && mb.sequence.length > 0) {
          mb._pausedAt = Date.now();
          mb._pausedInAttackWindow = mb.inAttackWindow;
          if (mb._sequenceTimer) { clearTimeout(mb._sequenceTimer); mb._sequenceTimer = null; }
          if (mb._attackWindowTimer) { clearTimeout(mb._attackWindowTimer); mb._attackWindowTimer = null; }
          if (mb._ringTimer) { clearTimeout(mb._ringTimer); mb._ringTimer = null; }
        }
        // Pauza timerů v tréninku
        const ts = trainingState;
        if (ts && !ts.ended && ts.round > 0) {
          ts._pausedAt = Date.now();
          cleanupTimers();
        }
      } else {
        const mb2 = mapBattleState;
        // Resume BGM
        const activeScreen = Object.keys(SCREEN_IDS).find(k => {
          const el = $(SCREEN_IDS[k]);
          return el && !el.classList.contains('hidden');
        });
        const resultTitle = $('resultTitle')?.textContent || '';
        const isDefeat = activeScreen === 'result' && (resultTitle.includes('Padl') || resultTitle.includes('💀'));
        const isWin = activeScreen === 'result' && !isDefeat;
        if (isDefeat) switchBGM('defeat');
        else if (isWin) switchBGM('win');
        else if (activeScreen === 'mapBattle' || activeScreen === 'battle') switchBGM('battle');
        else switchBGM('overworld');
        // Resume swipe fight
        if (mb2 && !mb2.ended && mb2._pausedAt) {
          const elapsed = Date.now() - mb2._pausedAt;
          mb2._pausedAt = null;
          if (mb2._pausedInAttackWindow) {
            // Byl v útočném okně → zmeškal to
            mb2._pausedInAttackWindow = false;
            // (hint: zachovat bonus info)
            flashSeqFail();
            missedAttackWindow();
          } else if (mb2.sequenceIndex < mb2.sequence.length) {
            // Byl v sekvenci útoků
            const winTime = mb2._currentWindowTime || 800;
            if (elapsed > winTime + 3000) {
              // Utekl čas → boss zasáhl
              onMapHit();
            } else {
              // Ještě nevypršelo → restartovat aktuální útok
              playSequenceAttack();
            }
          }
        }
        // Resume training
        const ts2 = trainingState;
        if (ts2 && !ts2.ended && ts2._pausedAt) {
          ts2._pausedAt = null;
          startTrainingRound();
        }
      }
    });
    showScreen('map');
  }

  window.game = {
    showScreen, enterLocation, toggleDungeon,
    upgradeAttr, sellItem, sellSlotItem, equipItem, unequipItem, unequipSlot,
    onMapRapidTap,
    investTalent, activateSchool, resetTalents,
    startTutorial, stopTutorial, advanceTutorial, prevTutorialStep,
    toggleMapPause, toggleTutorialPause,
    renderBestiary,
    renameHero,
    showFaceSelect, closeFaceSelect, selectFace
  };
  init();
})();
