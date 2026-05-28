(function() {
  'use strict';

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
    try { initAudio(); const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration); o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + duration); } catch {}
  }
  function sfxHit() { playTone(220, 0.12, 'sawtooth', 0.08); }
  function sfxPlayerHit() { playTone(140, 0.2, 'square', 0.10); }
  function sfxSuccess() { playTone(523, 0.1, 'sine', 0.12); setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 80); setTimeout(() => playTone(784, 0.15, 'sine', 0.14), 160); }
  function sfxEnemyDefeat() { playTone(440, 0.08, 'square', 0.1); setTimeout(() => playTone(330, 0.08, 'square', 0.1), 80); setTimeout(() => playTone(220, 0.15, 'square', 0.08), 160); }
  function sfxBossDefeat() { playTone(523, 0.15, 'sine', 0.14); setTimeout(() => playTone(659, 0.15, 'sine', 0.14), 100); setTimeout(() => playTone(784, 0.15, 'sine', 0.16), 200); setTimeout(() => playTone(1047, 0.3, 'sine', 0.18), 300); }

  // ===== DUNGEONS =====
  const TOTAL_FLOORS = 50;
  const BOSS_INTERVAL = 10;

  const DUNGEONS = [
    { id: 0, name: '🌲 Les stínů', type: 'simon', face: '👹', bossName: 'Stínový pán', tag: '🧠 Simon', badge: 'simon',
      mobs: ['👻','👾','💀','🎃','🕳️','🦇','👺','⚰️','☠️'],
      mobNames: ['Přízrak','Stín','Duch','Noční můra','Fantom','Netvor','Mlžný duch','Kostlivec','Spektrum'] },
    { id: 1, name: '⚖️ Pekelný tribunál', type: 'judge', face: '⚖️', bossName: 'Soudce pekel', tag: '⚖️ Soudce', badge: 'judge',
      mobs: ['📜','🔮','🗝️','👁️','🕯️','📖','⚗️','🔔','🧿'],
      mobNames: ['Scriba','Kacíř','Inkvizitor','Soudce stínů','Žalobce','Kat','Svědek','Písař','Zrádce'] },
    { id: 2, name: '🏜️ Pouštní nekropole', type: 'color', face: '🐍', bossName: 'Faraonova kletba', tag: '🎨 Barvy', badge: 'color',
      mobs: ['🏹','🐺','🦅','🐗','🦂','🐍','🐪','🦎','🐙'],
      mobNames: ['Lovec','Střelec','Lučištník','Šelma','Šílenec','Berserker','Lovkyně','Plaz','Dravý střelec'] },
    { id: 3, name: '⏳ Zřícenina času', type: 'grid', face: '⌛', bossName: 'Architekt času', tag: '🧮 Matika', badge: 'grid',
      mobs: ['🛡️','🗿','🧟','🤖','🦾','🧱','⛓️','⚙️','🪨'],
      mobNames: ['Strážce','Tank','Obr','Hlídka','Golem','Valibuk','Hromotluk','Mechanik','Krutý obr'] },
    { id: 4, name: '🎯 Temná aréna', type: 'aim', face: '🎯', bossName: 'Mistr terčů', tag: '🎯 Zaměřovač', badge: 'aim',
      mobs: ['🔴','🟠','🟡','🟢','🔵','🟣','⚪','🔘','⭕'],
      mobNames: ['Šílený střelec','Slepý lučištník','Hbitý střelec','Zaměřovač','Ostřelovač','Lovkyně stínů','Mířidlo','Průzkumník','Švihák'] },
    { id: 5, name: '🔊 Ozvěny jeskyně', type: 'echo', face: '🔊', bossName: 'Šepotající hlas', tag: '🔊 Echo', badge: 'echo',
      mobs: ['🎵','🎶','🔔','🎼','📯','🪕','🎻','🥁','🎹'],
      mobNames: ['Ozvěna','Hlas stínů','Šepot','Šumění','Melodie','Rezonance','Frekvence','Ticho','Vibrato'] },
    { id: 6, name: '🧩 Labyrint pravidel', type: 'order', face: '🧩', bossName: 'Architekt zákonů', tag: '🧩 Řazení', badge: 'order',
      mobs: ['🔢','🔣','🔤','♾️','❓','❗','🔀','🔁','🔂'],
      mobNames: ['Pravidlo','Zákon','Definice','Logik','Racionál','Systematik','Pořádek','Chaos','Srovnávač'] },
    { id: 7, name: '🔄 Zrcadlová síň', type: 'reverse', face: '🔄', bossName: 'Zrcadlový král', tag: '🔄 Reverse', badge: 'reverse',
      mobs: ['🪞','💠','🔷','🔶','🔸','🔹','💎','🔮','🪩'],
      mobNames: ['Zrcadlo','Odraz','Kopie','Falešný obraz','Efekt','Převrácení','Inverze','Dvojník','Stín'] },
  ];

  function floorToLevel(floor) { return clamp(Math.floor(floor / 5) + 1, 1, 10); }
  function isBossFloor(floor) { return floor % BOSS_INTERVAL === 0; }
  function getBossHp(floor) { return clamp(Math.floor(floor / 10) + 2, 3, 7); }

  // ===== MEDALS & ACHIEVEMENTS =====
  const BOSS_MEDAL_FLOORS = [10, 20, 30, 40, 50];
  const ACHIEVEMENTS = [
    { id: 'first_win', name: '🎯 První výhra', desc: 'Vyhraj první patro', check: s => s.wins >= 1 },
    { id: 'first_boss', name: '🏅 První boss', desc: 'Poraz prvního bosse', check: s => s.bossMedals.some(d => d.some(m => m)) },
    { id: 'ten_wins', name: '🏆 10 výher', desc: 'Vyhraj 10 pater', check: s => s.wins >= 10 },
    { id: 'fifty_wins', name: '💫 50 výher', desc: 'Vyhraj 50 pater', check: s => s.wins >= 50 },
    { id: 'hundred_wins', name: '👑 100 výher', desc: 'Vyhraj 100 pater', check: s => s.wins >= 100 },
    { id: 'ten_deaths', name: '💀 10 proher', desc: 'Zemři 10×', check: s => s.deaths >= 10 },
    { id: 'first_dungeon_done', name: '🗺️ První dungeon', desc: 'Dokonči celý jeden dungeon', check: s => s.dungeons.some(d => d >= 50) },
    { id: 'all_dungeons', name: '🌟 Všechny dungeony', desc: 'Dokonči všech 8 dungeonů', check: s => s.dungeons.every(d => d >= 50) },
    { id: 'all_bosses', name: '⚜️ 40 bossů', desc: 'Poraz všech 40 bossů', check: s => s.bossMedals.every(d => d.every(m => m)) },
    { id: 'five_bosses', name: '🥉 5 bossů', desc: 'Poraz 5 bossů', check: s => { let c = 0; s.bossMedals.forEach(d => d.forEach(m => { if (m) c++; })); return c >= 5; } },
    { id: 'fifteen_bosses', name: '🥈 15 bossů', desc: 'Poraz 15 bossů', check: s => { let c = 0; s.bossMedals.forEach(d => d.forEach(m => { if (m) c++; })); return c >= 15; } },
  ];
  function bossFloorIndex(floor) { return BOSS_MEDAL_FLOORS.indexOf(floor); }

  // ===== STATE =====
  let state = {};
  let battleState = {};
  let minigameState = {};

  const SAVE_KEY = 'dungeonRecallV4';
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.dungeons) return s; } catch {}
    return { dungeons: [0,0,0,0,0,0,0,0], deaths: 0, wins: 0, bossMedals: [[],[],[],[],[],[],[],[]].map(() => [false,false,false,false,false]), achievements: {} };
  }
  function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ dungeons: state.dungeons, deaths: state.deaths, wins: state.wins, bossMedals: state.bossMedals, achievements: state.achievements }));
  }
  function resetGame() {
    state = { dungeons: [0,0,0,0,0,0,0,0], deaths: 0, wins: 0, bossMedals: [[],[],[],[],[],[],[],[]].map(() => [false,false,false,false,false]), achievements: {} };
    saveGame();
    showDungeonSelect();
  }

  // ===== SCREENS =====
  const SCREEN_NAMES = ['dungeonSelect', 'battleScreen', 'resultScreen'];
  function showScreen(name) {
    if (name === 'medalScreen') {
      // Medal screen is dynamic, just hide others
      SCREEN_NAMES.forEach(id => { const el = $(id); if (el) { el.classList.add('hidden'); if (id === 'battleScreen') el.classList.remove('active'); } });
      return;
    }
    // Remove dynamic medal screen if exists
    const oldMedal = $('medalScreen');
    if (oldMedal) oldMedal.remove();

    SCREEN_NAMES.forEach(id => {
      const el = $(id);
      if (id === name) { el.classList.remove('hidden'); if (id === 'battleScreen') el.classList.add('active'); }
      else { el.classList.add('hidden'); if (id === 'battleScreen') el.classList.remove('active'); }
    });
    if (name === 'dungeonSelect') showDungeonSelect();
  }

  // ===== DUNGEON SELECT =====
  function showDungeonSelect() {
    $('statsLine').textContent = `🏆 ${state.wins} výher · 💀 ${state.deaths} proher`;
    $('dungeonList').innerHTML = DUNGEONS.map((d, i) => {
      const progress = state.dungeons[i];
      const pct = Math.min(progress / TOTAL_FLOORS * 100, 100);
      const completed = progress >= TOTAL_FLOORS;
      return `<div class="dungeon-card ${completed ? 'completed' : ''}" onclick="game.enterDungeon(${i})">
        <div class="flex-between">
          <div class="dungeon-name">${d.name}</div>
          <span class="boss-type-badge ${d.badge}">${d.tag}</span>
        </div>
        <div class="dungeon-progress-wrap"><div class="dungeon-progress-bar" style="width:${pct}%"></div></div>
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
    const isBoss = isBossFloor(nextFloor);
    const bossHp = isBoss ? getBossHp(nextFloor) : 1;
    const level = floorToLevel(nextFloor);
    battleState = { dungeonId: id, dungeon: d, floor: nextFloor, totalFloors: TOTAL_FLOORS, bossHp, maxBossHp: bossHp, playerHp: 3, level, round: 0, ended: false, isBossFloor: isBoss, firstRound: true, phase: isBoss ? 'boss' : 'mob' };
    showScreen('battleScreen');
    updateBattleUI();
    startRound();
  }

  function startRound() {
    if (battleState.ended) return;
    const bs = battleState;
    if (bs.bossHp <= 0) { endBattle(true); return; }
    if (bs.playerHp <= 0) { endBattle(false); return; }
    bs.round++;
    minigameState = {};
    hideAllMinigames();
    if (bs.firstRound) {
      bs.firstRound = false;
      showCountdown(1, () => showMinigame(bs.dungeon.type));
    } else {
      showMinigame(bs.dungeon.type);
    }
  }

  function showMinigame(type) {
    const areas = { simon: 'simonArea', color: 'colorClashArea', grid: 'gridDefenderArea', judge: 'judgeArea', aim: 'aimArea', echo: 'echoArea', order: 'orderArea', reverse: 'reverseArea' };
    const fns = { simon: startSimon, color: startColorClash, grid: startGridDefender, judge: startJudge, aim: startAim, echo: startEcho, order: startOrder, reverse: startReverse };
    const el = $(areas[type]);
    if (el && fns[type]) { el.classList.remove('minigame-hide'); fns[type](); }
  }

  function hideAllMinigames() {
    ['simonArea','colorClashArea','gridDefenderArea','judgeArea','aimArea','echoArea','orderArea','reverseArea'].forEach(id => $(id).classList.add('minigame-hide'));
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
      if (remaining <= 0) { clearInterval(interval); el.classList.add('hidden'); if (callback) callback(); }
      else { numEl.textContent = remaining; playTone(440 + remaining * 60, 0.15, 'sine', 0.1); }
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
    const typeLabel = { simon:'🧠 Simon Says', color:'🎨 Color Clash', grid:'🧮 Matika', judge:'⚖️ Soudce', aim:'🎯 Zaměřovač', echo:'🔊 Echo', order:'🧩 Řazení', reverse:'🔄 Reverse' }[bs.dungeon.type] || '';
    $('gameTypeBadge').textContent = typeLabel;
    const face = $('bossFace');
    face.classList.remove('enemy-enter','enemy-idle','boss-idle','enemy-defeat');
    void face.offsetWidth;
    face.classList.add('enemy-enter');
    setTimeout(() => face.classList.add('enemy-idle'), 500);
  }

  // ===== ROUND RESULT =====
  function playerWinsRound() {
    if (battleState.ended) return;
    const bs = battleState;
    if (!bs.isBossFloor) { sfxEnemyDefeat(); animateHit('enemy'); advanceFloor(); return; }
    bs.bossHp--;
    sfxSuccess();
    animateHit('enemy');
    updateBattleUI();
    if (bs.bossHp <= 0) endBattle(true);
    else setTimeout(() => startRound(), 500);
  }

  function playerLosesRound() {
    if (battleState.ended) return;
    battleState.playerHp--;
    sfxPlayerHit();
    animateHit('player');
    updateBattleUI();
    if (battleState.playerHp <= 0) endBattle(false);
    else setTimeout(() => startRound(), 500);
  }

  function advanceFloor() {
    const bs = battleState;
    const next = bs.floor + 1;
    if (next > TOTAL_FLOORS) { endBattle(true); return; }
    const dId = bs.dungeonId;
    if (next > state.dungeons[dId]) state.dungeons[dId] = next;
    saveGame();
    const isBoss = isBossFloor(next);
    const bossHp = isBoss ? getBossHp(next) : 1;
    const level = floorToLevel(next);
    bs.floor = next; bs.level = level; bs.isBossFloor = isBoss; bs.bossHp = bossHp; bs.maxBossHp = bossHp; bs.round = 0; bs.firstRound = true; bs.phase = isBoss ? 'boss' : 'mob';
    updateBattleUI();
    setTimeout(() => startRound(), 400);
  }

  function endBattle(won) {
    battleState.ended = true;
    const bs = battleState;
    const dId = bs.dungeonId;
    if (won) {
      if (bs.floor > state.dungeons[dId]) state.dungeons[dId] = bs.floor;
      state.wins = (state.wins || 0) + 1;

      // Uložit medaili za bosse
      if (bs.isBossFloor) {
        const bfIdx = bossFloorIndex(bs.floor);
        if (bfIdx >= 0) {
          if (!state.bossMedals) state.bossMedals = [[],[],[],[],[],[],[],[]].map(() => [false,false,false,false,false]);
          if (!state.bossMedals[dId]) state.bossMedals[dId] = [false,false,false,false,false];
          state.bossMedals[dId][bfIdx] = true;
        }
      }

      saveGame();
      checkAchievements();
      const completed = state.dungeons[dId] >= TOTAL_FLOORS;
      sfxBossDefeat();
      $('resultIcon').textContent = '🎉';
      $('resultTitle').textContent = completed ? `${bs.dungeon.name} DOBYT!` : `Patro ${bs.floor} dobyto!`;
      $('resultMsg').textContent = completed ? `Všech ${TOTAL_FLOORS} pater dokončeno!` : `Postup: ${Math.min(bs.floor, TOTAL_FLOORS)}/${TOTAL_FLOORS}`;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.continueDungeon()">🚀 Další patro</button><button class="btn btn-secondary" onclick="game.showScreen('dungeonSelect')">🗺️ Zpět na výběr</button>`;
    } else {
      state.deaths = (state.deaths || 0) + 1;
      saveGame();
      $('resultIcon').textContent = '💀';
      $('resultTitle').textContent = 'Padl jsi';
      $('resultMsg').textContent = `Patro ${bs.floor} – ${bs.dungeon.name}`;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.retryFloor()">🔄 Znovu toto patro</button><button class="btn btn-secondary" onclick="game.showScreen('dungeonSelect')">🗺️ Jiný dungeon</button>`;
    }
    showScreen('resultScreen');
  }

  // ===== ACHIEVEMENTS & MEDALS =====
  function checkAchievements() {
    if (!state.achievements) state.achievements = {};
    ACHIEVEMENTS.forEach(a => {
      if (!state.achievements[a.id] && a.check(state)) {
        state.achievements[a.id] = true;
        saveGame();
        // Zobrazit notifikaci
        showAchievementPopup(a);
      }
    });
  }

  function showAchievementPopup(a) {
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:300;background:#12122a;border:2px solid #f1c40f;border-radius:12px;padding:16px 24px;text-align:center;animation:enemyEnter 0.5s ease-out;max-width:360px;width:90%';
    popup.innerHTML = `
      <div style="font-size:32px;margin-bottom:6px">🏅</div>
      <div style="font-size:16px;font-weight:bold;color:#f1c40f">Achievement odemčen!</div>
      <div style="font-size:14px;margin-top:4px">${a.name}</div>
      <div style="font-size:12px;color:#8888aa;margin-top:2px">${a.desc}</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => { popup.style.transition = 'opacity 0.5s'; popup.style.opacity = '0'; setTimeout(() => popup.remove(), 500); }, 2500);
  }

  function showMedals() {
    const medalEmojis = ['🥇', '🥈', '🥉', '🏅', '⭐'];
    const floorLabels = ['10', '20', '30', '40', '50'];
    let html = '<div class="card"><div class="card-title">🏅 Medaile za bosse</div><div class="card-subtitle">Každý dungeon má 5 bossů (patra 10,20,30,40,50)</div></div>';

    DUNGEONS.forEach((d, di) => {
      const medals = (state.bossMedals && state.bossMedals[di]) || [false,false,false,false,false];
      html += `<div class="card">
        <div class="card-title" style="font-size:14px">${d.name}</div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          ${floorLabels.map((fl, fi) => {
            const earned = medals[fi];
            return `<div style="width:52px;height:52px;border-radius:8px;background:${earned ? '#1a3a1a' : '#1a1a2a'};border:2px solid ${earned ? '#2ecc71' : '#2a2a4a'};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:${earned ? '20px' : '12px'};color:${earned ? '#2ecc71' : '#555'}">
              ${earned ? medalEmojis[fi] : '🔒'}
              <span style="font-size:9px;margin-top:2px">${fl}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    });

    html += '<div class="card"><div class="card-title">🏆 Achievementy</div></div>';
    ACHIEVEMENTS.forEach(a => {
      const earned = state.achievements && state.achievements[a.id];
      html += `<div class="card" style="${earned ? 'border-color:#2ecc71' : 'opacity:0.5'}">
        <div class="flex-between">
          <div>
            <div style="font-size:14px;font-weight:bold">${earned ? a.name : a.name.replace(/^./, '🔒')}</div>
            <div style="font-size:11px;color:#8888aa">${a.desc}</div>
          </div>
          <div style="font-size:20px">${earned ? '✅' : '⏳'}</div>
        </div>
      </div>`;
    });

    html += '<button class="btn btn-secondary" onclick="game.showScreen(\'dungeonSelect\')">🗺️ Zpět</button>';

    const container = document.createElement('div');
    container.className = 'container';
    container.id = 'medalScreen';
    container.innerHTML = html;
    document.body.appendChild(container);
    showScreen('medalScreen');
  }

  function continueDungeon() {
    const dId = battleState.dungeonId;
    if (battleState.floor >= state.dungeons[dId]) battleState.floor = state.dungeons[dId] + 1;
    if (battleState.floor > TOTAL_FLOORS) { showScreen('dungeonSelect'); return; }
    restartFloorState();
  }

  function retryFloor() { restartFloorState(); }

  function restartFloorState() {
    const bs = battleState;
    const isBoss = isBossFloor(bs.floor);
    const bossHp = isBoss ? getBossHp(bs.floor) : 1;
    const level = floorToLevel(bs.floor);
    bs.bossHp = bossHp; bs.maxBossHp = bossHp; bs.playerHp = 3; bs.round = 0; bs.ended = false; bs.isBossFloor = isBoss; bs.firstRound = true; bs.phase = isBoss ? 'boss' : 'mob';
    showScreen('battleScreen');
    updateBattleUI();
    startRound();
  }

  function animateHit(target) {
    if (target === 'enemy') { $('battleScreen').classList.add('hit-flash-blue'); setTimeout(() => $('battleScreen').classList.remove('hit-flash-blue'), 300); }
    else { $('battleScreen').classList.add('screen-shake','hit-flash'); setTimeout(() => $('battleScreen').classList.remove('screen-shake','hit-flash'), 300); }
  }

  // ===================================================================
  //  SIMON SAYS
  // ===================================================================
  const SIMON_SYMBOLS = ['⚡','🔥','💧','🌿','💎','☀️','🌙','🍀','🌀','⭐','🌈','🦋','🍄','🌊','❄️','🎯'];
  const SIMON_COLORS = ['#e94560','#f1c40f','#4a7dff','#2ecc71','#9b59b6','#e67e22','#1abc9c','#2c3e50','#d35400','#f39c12','#16a085','#c0392b','#8e44ad','#2980b9','#bdc3c7','#7f8c8d'];
  const SIMON_FREQS = [73.42*4, 87.31*4, 110.0*4, 146.84*2, 164.81*2, 196.0*2, 220.0*2, 246.94*2];

  function startSimon() {
    const level = battleState.level;
    const gridSize = Math.min(2 + Math.floor(level / 3), 4);
    const numCells = gridSize * gridSize;
    const seqLen = Math.min(3 + Math.floor(level * 0.8), 10);
    const symbols = shuffle([...SIMON_SYMBOLS]).slice(0, numCells);
    const usedColors = SIMON_COLORS.slice(0, numCells);
    minigameState = { sequence: [], playerIndex: 0, showing: true, inputEnabled: false, symbols, gridSize, seqLen };
    for (let i = 0; i < seqLen; i++) minigameState.sequence.push(rand(0, numCells - 1));
    const grid = $('simonGrid');
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    grid.innerHTML = symbols.map((sym, i) => `<div class="simon-cell" data-idx="${i}" style="background:${usedColors[i]}" onclick="game.simonClick(${i})"><span style="font-size:${gridSize <= 3 ? '28px' : '20px'};pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%">${sym}</span></div>`).join('');
    $('simonPrompt').textContent = '👀 Zapamatuj si sekvenci!';
    updateSimonProgress();
    let delay = Math.max(100, 300 - level * 20);
    minigameState.showing = true;
    playSimonSequence(0, delay);
  }

  function playSimonSequence(idx, delay) {
    if (idx >= minigameState.sequence.length) { minigameState.showing = false; minigameState.inputEnabled = true; $('simonPrompt').textContent = '🎯 Zopakuj sekvenci!'; return; }
    initAudio();
    const cells = document.querySelectorAll('#simonGrid .simon-cell');
    const cellIdx = minigameState.sequence[idx];
    cells.forEach(c => c.classList.remove('lit'));
    cells[cellIdx].classList.add('lit');
    playTone(SIMON_FREQS[cellIdx % SIMON_FREQS.length], 0.13, 'sine', 0.12);
    setTimeout(() => { cells.forEach(c => c.classList.remove('lit')); setTimeout(() => playSimonSequence(idx + 1, delay), 60); }, delay);
  }

  function simonClick(idx) {
    if (!minigameState.inputEnabled || minigameState.showing) return;
    initAudio();
    const cells = document.querySelectorAll('#simonGrid .simon-cell');
    cells[idx].classList.add('active');
    setTimeout(() => cells[idx].classList.remove('active'), 150);
    playTone(SIMON_FREQS[idx % SIMON_FREQS.length], 0.12, 'sine', 0.10);
    if (idx !== minigameState.sequence[minigameState.playerIndex]) { minigameState.inputEnabled = false; playerLosesRound(); return; }
    minigameState.playerIndex++;
    updateSimonProgress();
    if (minigameState.playerIndex >= minigameState.sequence.length) { minigameState.inputEnabled = false; playerWinsRound(); }
  }

  function updateSimonProgress() { $('simonProgress').textContent = `${minigameState.playerIndex}/${minigameState.sequence.length}`; }

  // ===================================================================
  //  COLOR CLASH
  // ===================================================================
  function startColorClash() {
    const level = battleState.level;
    const fallDuration = Math.max(0.8, 2.8 - level * 0.25).toFixed(2);
    const colors = ['red','blue','green','yellow'];
    const colLabels = { red:'🔴', blue:'🔵', green:'🟢', yellow:'🟡' };
    const arena = $('colorArena');
    arena.innerHTML = '';
    arena.style.height = '260px'; arena.style.display = 'flex'; arena.style.flexDirection = 'column';
    const lanesDiv = document.createElement('div');
    lanesDiv.style.cssText = 'display:flex;flex:1;';
    lanesDiv.innerHTML = colors.map(c => `<div class="color-lane" data-color="${c}" style="flex:1;text-align:center;padding-top:8px;font-size:24px;border-right:1px solid #1a1a3a">${colLabels[c]}</div>`).join('');
    arena.appendChild(lanesDiv);
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;height:50px;';
    btnRow.innerHTML = colors.map(c => { const bg = c==='red'?'#e94560':c==='blue'?'#4a7dff':c==='green'?'#2ecc71':'#f1c40f'; return `<div style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;background:${bg};margin:2px;border-radius:6px;font-size:16px;color:#fff;font-weight:bold" onclick="game.colorInput('${c}')">${colLabels[c]}</div>`; }).join('');
    arena.appendChild(btnRow);
    minigameState = { active: true, colors, arena, projectile: null, currentColor: null, fallDuration };
    spawnColorProjectile();
  }

  function spawnColorProjectile() {
    if (!minigameState.active) return;
    const arena = minigameState.arena;
    const col = minigameState.colors[rand(0, 3)];
    if (minigameState.projectile && minigameState.projectile.parentNode) minigameState.projectile.remove();
    const lanes = arena.querySelectorAll('.color-lane');
    const laneIdx = minigameState.colors.indexOf(col);
    const lane = lanes[laneIdx];
    if (!lane) { setTimeout(() => spawnColorProjectile(), 100); return; }
    const laneRect = lane.getBoundingClientRect();
    const arenaRect = arena.getBoundingClientRect();
    const laneX = laneRect.left - arenaRect.left + laneRect.width / 2 - 18;
    const el = document.createElement('div');
    el.className = 'color-projectile';
    el.style.cssText = `left:${laneX}px;top:0px;background:${col==='red'?'#e94560':col==='blue'?'#4a7dff':col==='green'?'#2ecc71':'#f1c40f'};width:36px;height:36px;border-radius:50%;border:2px solid #fff;position:absolute;transition:top ${minigameState.fallDuration}s linear`;
    el.dataset.color = col;
    el.addEventListener('transitionend', () => { if (minigameState.active && minigameState.projectile === el) { minigameState.active = false; el.remove(); playerLosesRound(); } });
    arena.appendChild(el);
    minigameState.projectile = el;
    minigameState.currentColor = col;
    requestAnimationFrame(() => { el.style.top = '210px'; });
  }

  function colorInput(color) {
    if (!minigameState.active) return;
    if (color === minigameState.currentColor) {
      minigameState.active = false;
      if (minigameState.projectile) { const el = minigameState.projectile; el.style.transition = 'transform 0.2s, opacity 0.2s'; el.style.transform = 'scale(2.5)'; el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }
      sfxHit(); playerWinsRound();
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
    const ops = ['+','-','×'];
    const options = [];
    const usedExprs = new Set();
    const correctOp = ops[rand(0, 2)];
    let a, b, expr, result;
    for (let tries = 0; tries < 50; tries++) {
      if (correctOp === '+') { a = rand(1, target - 1); b = target - a; expr = `${a}+${b}`; result = a + b; }
      else if (correctOp === '-') { a = rand(target + 1, target + maxNum); b = a - target; expr = `${a}-${b}`; result = a - b; }
      else { const factors = []; for (let f = 1; f <= Math.sqrt(target); f++) { if (target % f === 0) factors.push(f); } if (factors.length > 1) { a = factors[rand(1, factors.length - 1)]; b = target / a; expr = `${a}×${b}`; result = a * b; } else { a = rand(1, 3); b = target; expr = `${a}×${b}`; result = a * b; } }
      if (!usedExprs.has(expr) && result === target) { usedExprs.add(expr); break; }
    }
    options.push({ value: result, expr, wins: true });
    const closeValues = [];
    for (let d = 1; d <= 3; d++) { if (result - d >= 1) closeValues.push(result - d); if (result + d !== target) closeValues.push(result + d); }
    shuffle(closeValues);
    for (let i = 1; i < numOptions; i++) {
      const fakeResult = closeValues.length > 0 ? closeValues.shift() : rand(1, maxNum + 5);
      let fakeExpr;
      for (let tries = 0; tries < 30; tries++) {
        const op = ops[rand(0, 2)]; let ba, bb, bexpr, bres;
        if (op === '+') { ba = rand(1, maxNum); bb = rand(1, maxNum); bexpr = `${ba}+${bb}`; bres = ba + bb; }
        else if (op === '-') { ba = rand(1, maxNum * 2); bb = rand(1, ba - 1); bexpr = `${ba}-${bb}`; bres = ba - bb; }
        else { ba = rand(1, 5); bb = rand(1, 5); bexpr = `${ba}×${bb}`; bres = ba * bb; }
        if (!usedExprs.has(bexpr) && bres === fakeResult) { usedExprs.add(bexpr); options.push({ value: bres, expr: bexpr, wins: false }); fakeExpr = true; break; }
      }
      if (!fakeExpr) {
        for (let tries = 0; tries < 50; tries++) {
          const op = ops[rand(0, 2)]; let ba, bb, bexpr, bres;
          if (op === '+') { ba = rand(1, maxNum); bb = rand(1, maxNum); bexpr = `${ba}+${bb}`; bres = ba + bb; }
          else if (op === '-') { ba = rand(1, maxNum * 2); bb = rand(1, ba - 1); bexpr = `${ba}-${bb}`; bres = ba - bb; }
          else { ba = rand(1, 5); bb = rand(1, 5); bexpr = `${ba}×${bb}`; bres = ba * bb; }
          if (!usedExprs.has(bexpr) && Math.abs(bres - fakeResult) <= 1) { usedExprs.add(bexpr); options.push({ value: bres, expr: bexpr, wins: false }); break; }
        }
      }
    }
    shuffle(options);
    const timerDuration = Math.max(3, 6 - Math.floor(level / 3));
    minigameState = { options, target, active: true, timer: timerDuration };
    $('gridArea').innerHTML = `<div class="grid-info"><span class="grid-time" id="gridTimer">${timerDuration}s</span><span class="grid-target">👹 Najdi: <strong>${target}</strong></span></div><div class="grid-cards">${options.map((o, i) => `<div class="grid-card" onclick="game.gridPick(${i})"><span class="expr">${o.expr}</span></div>`).join('')}</div>`;
    const timerEl = $('gridTimer');
    if (timerEl) {
      minigameState.timerInterval = setInterval(() => {
        minigameState.timer--;
        timerEl.textContent = minigameState.timer + 's';
        if (minigameState.timer <= 0) { clearInterval(minigameState.timerInterval); if (minigameState.active) { minigameState.active = false; playerLosesRound(); } }
      }, 1000);
    }
  }

  function gridPick(idx) {
    if (!minigameState.active) return;
    minigameState.active = false;
    if (minigameState.timerInterval) clearInterval(minigameState.timerInterval);
    if (minigameState.options[idx].wins) { sfxSuccess(); playerWinsRound(); }
    else { sfxPlayerHit(); playerLosesRound(); }
  }

  // ===================================================================
  //  JUDGE
  // ===================================================================
  const JUDGE_STATEMENTS = {
    easy: [{text:'6 × 7 = 42',answer:true},{text:'Voda se vaří při 100 °C',answer:true},{text:'Země je plochá',answer:false},{text:'Člověk má 32 zubů',answer:true},{text:'Rybník je větší než oceán',answer:false},{text:'12 je dělitelné 3',answer:true},{text:'Čtverec má 5 stran',answer:false},{text:'Tři a čtyři je sedm',answer:true},{text:'Žralok je savec',answer:false},{text:'Slunce vychází na východě',answer:true},{text:'8 + 4 = 11',answer:false},{text:'Týden má 7 dní',answer:true},{text:'Měsíc je větší než Země',answer:false},{text:'Kočka má 9 životů',answer:false},{text:'5 × 5 = 25',answer:true}],
    medium: [{text:'Délka úhlopříčky čtverce o straně 1 je √2',answer:true},{text:'24 je dělitelné 7',answer:false},{text:'Součet vnitřních úhlů trojúhelníku je 180°',answer:true},{text:'0 je sudé číslo',answer:true},{text:'Krychle má 8 vrcholů',answer:true},{text:'1 + 2 × 3 = 9',answer:false},{text:'Hodina má 3600 sekund',answer:true},{text:'Každý obdélník je čtverec',answer:false},{text:'15 × 3 = 45',answer:true},{text:'Praha je hlavní město Polska',answer:false},{text:'Všechna prvočísla jsou lichá',answer:false},{text:'2 + 3 × 4 = 20',answer:false},{text:'Antarktida je poušť',answer:true},{text:'Delfín je ryba',answer:false},{text:'9 × 8 = 72',answer:true}],
    hard: [{text:'3² + 4² = 5²',answer:true},{text:'0,5 × 20 = 12',answer:false},{text:'Sudé číslo krát liché je vždy sudé',answer:true},{text:'Každý lichoběžník je rovnoběžník',answer:false},{text:'15 − 3 × 4 = 48',answer:false},{text:'Vídeň je hlavní město Rakouska',answer:true},{text:'Průměr 2, 8 a 14 je 8',answer:true},{text:'48 / 6 = 8',answer:true},{text:'Číslo 121 je prvočíslo',answer:false},{text:'Dva zápory dají klad',answer:true},{text:'(8 − 3) × 2 = 10',answer:true},{text:'Kilogram je jednotka síly',answer:false},{text:'Hlemýžď má přibližně 25 000 zubů',answer:true},{text:'12 × 11 = 131',answer:false},{text:'Rtuť je kapalná při pokojové teplotě',answer:true}]
  };

  function startJudge() {
    const level = battleState.level;
    let filtered;
    if (level <= 3) filtered = JUDGE_STATEMENTS.easy;
    else if (level <= 6) filtered = [...JUDGE_STATEMENTS.easy, ...JUDGE_STATEMENTS.medium];
    else filtered = [...JUDGE_STATEMENTS.medium, ...JUDGE_STATEMENTS.hard];
    const statement = filtered[rand(0, filtered.length - 1)];
    const timerDuration = Math.max(3, 6 - Math.floor(level / 3));
    minigameState = { active: true, statement, timer: timerDuration };
    $('judgePrompt').textContent = '⚖️ Je tento výrok pravdivý?';
    $('judgeStatement').textContent = statement.text;
    $('judgeTimer').textContent = timerDuration + 's';
    if (minigameState.timerInterval) clearInterval(minigameState.timerInterval);
    minigameState.timerInterval = setInterval(() => {
      minigameState.timer--;
      $('judgeTimer').textContent = minigameState.timer + 's';
      if (minigameState.timer <= 0) { clearInterval(minigameState.timerInterval); if (minigameState.active) { minigameState.active = false; playerLosesRound(); } }
    }, 1000);
  }

  function judgeAnswer(playerAnswer) {
    if (!minigameState.active) return;
    minigameState.active = false;
    if (minigameState.timerInterval) clearInterval(minigameState.timerInterval);
    if (playerAnswer === minigameState.statement.answer) { sfxSuccess(); playerWinsRound(); }
    else { sfxPlayerHit(); playerLosesRound(); }
  }

  // ===================================================================
  //  AIM TARGET
  // ===================================================================
  function startAim() {
    const level = battleState.level;
    const requiredHits = 3 + Math.floor(level / 2);
    const targetSize = Math.max(30, 60 - level * 3);
    const spawnDelay = Math.max(400, 1200 - level * 80);
    const timeout = Math.max(600, 2000 - level * 140);

    minigameState = { active: true, hits: 0, misses: 0, requiredHits, targetSize, spawnDelay, timeout, target: null };
    $('aimHits').textContent = '🎯 0';
    $('aimMisses').textContent = '❌ 0';
    $('aimPrompt').textContent = `🎯 Treť ${requiredHits}×!`;
    const arena = $('aimArena');
    arena.innerHTML = '';
    spawnAimTarget();
  }

  function spawnAimTarget() {
    if (!minigameState.active) return;
    const arena = $('aimArena');
    // Remove old target
    if (minigameState.target && minigameState.target.parentNode) minigameState.target.remove();

    const rect = arena.getBoundingClientRect();
    const areaW = arena.clientWidth || 300;
    const areaH = arena.clientHeight || 250;
    const size = minigameState.targetSize;
    const x = rand(10, Math.max(11, areaW - size - 10));
    const y = rand(10, Math.max(11, areaH - size - 10));

    const el = document.createElement('div');
    el.className = 'aim-target';
    el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${['#e94560','#f1c40f','#2ecc71','#4a7dff'][rand(0,3)]}`;
    el.dataset.real = 'true';
    el.addEventListener('click', (e) => { e.stopPropagation(); onAimHit(); });
    arena.appendChild(el);
    minigameState.target = el;

    // Timeout - player missed the target
    minigameState.aimTimeout = setTimeout(() => {
      if (!minigameState.active) return;
      if (el.parentNode) el.remove();
      onAimMiss(true);
    }, minigameState.timeout);
  }

  function onAimHit() {
    if (!minigameState.active) return;
    minigameState.hits++;
    clearTimeout(minigameState.aimTimeout);
    if (minigameState.target && minigameState.target.parentNode) minigameState.target.remove();
    $('aimHits').textContent = `🎯 ${minigameState.hits}`;
    sfxHit();
    if (minigameState.hits >= minigameState.requiredHits) {
      minigameState.active = false;
      playerWinsRound();
    } else {
      setTimeout(spawnAimTarget, 200);
    }
  }

  function onAimMiss(fromTimeout) {
    if (!minigameState.active) return;
    minigameState.misses++;
    clearTimeout(minigameState.aimTimeout);
    $('aimMisses').textContent = `❌ ${minigameState.misses}`;
    if (fromTimeout) sfxPlayerHit();
    if (minigameState.misses >= 2) {
      minigameState.active = false;
      playerLosesRound();
    } else {
      setTimeout(spawnAimTarget, 300);
    }
  }

  // ===================================================================
  //  ECHO (audio memory)
  // ===================================================================
  const ECHO_COLORS = ['#e94560','#f1c40f','#4a7dff','#2ecc71'];
  const ECHO_FREQS = [262, 330, 392, 523]; // C4, E4, G4, C5
  const ECHO_SYMBOLS = ['🔴','🟡','🔵','🟢'];

  function startEcho() {
    const level = battleState.level;
    const seqLen = Math.min(2 + Math.floor(level * 0.6), 7);
    const cells = Math.min(4, 2 + Math.floor(level / 4));

    const sequence = [];
    for (let i = 0; i < seqLen; i++) sequence.push(rand(0, cells - 1));

    minigameState = { sequence, playerIndex: 0, showing: true, inputEnabled: false, cells };
    const grid = $('echoGrid');
    grid.style.gridTemplateColumns = `repeat(${Math.min(cells, 2)}, 1fr)`;
    grid.innerHTML = '';
    for (let i = 0; i < cells; i++) {
      const cell = document.createElement('div');
      cell.className = 'echo-cell';
      cell.style.background = ECHO_COLORS[i];
      cell.dataset.idx = i;
      cell.textContent = ECHO_SYMBOLS[i];
      cell.addEventListener('click', () => game.echoClick(i));
      grid.appendChild(cell);
    }
    $('echoPrompt').textContent = '👂 Poslouchej sekvenci!';
    $('echoProgress').textContent = `0/${seqLen}`;
    minigameState.showing = true;
    playEchoSequence(0);
  }

  function playEchoSequence(idx) {
    if (idx >= minigameState.sequence.length) {
      minigameState.showing = false;
      minigameState.inputEnabled = true;
      $('echoPrompt').textContent = '🎯 Zopakuj ťuknutím!';
      return;
    }
    initAudio();
    const cells = document.querySelectorAll('#echoGrid .echo-cell');
    const cellIdx = minigameState.sequence[idx];
    cells.forEach(c => c.classList.remove('lit'));
    cells[cellIdx].classList.add('lit');
    playTone(ECHO_FREQS[cellIdx % ECHO_FREQS.length], 0.2, 'sine', 0.12);
    setTimeout(() => {
      cells.forEach(c => c.classList.remove('lit'));
      setTimeout(() => playEchoSequence(idx + 1), 200);
    }, 300);
  }

  function echoClick(idx) {
    if (!minigameState.inputEnabled || minigameState.showing) return;
    initAudio();
    const cells = document.querySelectorAll('#echoGrid .echo-cell');
    cells[idx].classList.add('active');
    setTimeout(() => cells[idx].classList.remove('active'), 150);
    playTone(ECHO_FREQS[idx % ECHO_FREQS.length], 0.15, 'sine', 0.10);

    if (idx !== minigameState.sequence[minigameState.playerIndex]) {
      minigameState.inputEnabled = false;
      playerLosesRound();
      return;
    }
    minigameState.playerIndex++;
    $('echoProgress').textContent = `${minigameState.playerIndex}/${minigameState.sequence.length}`;
    if (minigameState.playerIndex >= minigameState.sequence.length) {
      minigameState.inputEnabled = false;
      playerWinsRound();
    }
  }

  // ===================================================================
  //  ORDER
  // ===================================================================
  const ORDER_POOLS = [
    { rule: 'Seřaď od nejmenšího po největší', items: [1, 2, 3, 4, 5, 6], fn: a => a },
    { rule: 'Seřaď od největšího po nejmenší', items: [9, 7, 5, 3, 1], fn: a => -a },
    { rule: 'Seřaď podle abecedy (A→Z)', items: ['👻','🤖','🧟','👽','🦇','🐉'], fn: a => a },
    { rule: 'Seřaď podle abecedy (Z→A)', items: ['🐉','🦇','👽','🧟','🤖','👻'], fn: a => -a },
    { rule: 'Seřaď podle počtu oček (⬆️)', items: ['👀','👁️','🕵️','👓','🔍','🧐'], fn: a => a },
    { rule: 'Seřaď podle hodnoty v češtině', items: ['jedna','dvě','tři','čtyři','pět','šest'], fn: a => ({ jedna:1,dvě:2,tři:3,čtyři:4,pět:5,šest:6 }[a] || 0) },
    { rule: 'Seřaď podle počtu písmen', items: ['A','AB','ABC','ABCD','ABCDE'], fn: a => a.length },
    { rule: 'Seřaď sudá (⬆️) pak lichá', items: [2, 4, 6, 1, 3, 5], fn: a => a % 2 === 0 ? a : a + 10 },
    { rule: 'Seřaď podle číselné hodnoty', items: ['II', 'IV', 'VI', 'VIII', 'X'], fn: a => ({ II:2,IV:4,VI:6,VIII:8,X:10 }[a] || 0) },
  ];

  function startOrder() {
    const level = battleState.level;
    const poolIdx = (level - 1) % ORDER_POOLS.length;
    const pool = ORDER_POOLS[poolIdx];
    const items = shuffle([...pool.items]);

    // Počet položek 3-5 podle levelu
    const count = Math.min(3 + Math.floor(level / 3), items.length);
    const selected = items.slice(0, count);

    minigameState = { selected, remaining: [...selected], rule: pool.rule, active: true };
    $('orderPrompt').textContent = '🧩 Seřaď podle pravidla';
    $('orderAreaInner').innerHTML = `
      <div class="order-rule">📋 ${pool.rule}</div>
      <div class="order-items" id="orderItems">
        ${shuffle([...selected]).map((item, i) => `<div class="order-item" data-idx="${i}" onclick="game.orderPick(${i}, ${JSON.stringify(String(item)).replace(/"/g,'\'')})" data-val="${String(item)}">${item}</div>`).join('')}
      </div>
    `;
    $('orderProgress').textContent = `0/${selected.length}`;
    minigameState.orderIndex = 0;
  }

  function orderPick(idx, val) {
    if (!minigameState.active) return;
    const items = document.querySelectorAll('#orderItems .order-item');
    const item = items[idx];
    if (item.classList.contains('picked')) return;

    const expected = minigameState.remaining[0];
    const pickedVal = item.dataset.val;

    const poolIdx = (battleState.level - 1) % ORDER_POOLS.length;
    const compFn = ORDER_POOLS[poolIdx].fn;
    const allSorted = [...minigameState.selected].sort((a, b) => compFn(a) - compFn(b));

    if (String(allSorted[minigameState.orderIndex]) === String(pickedVal)) {
      item.classList.add('picked');
      minigameState.orderIndex++;
      $('orderProgress').textContent = `${minigameState.orderIndex}/${minigameState.selected.length}`;
      sfxHit();
      if (minigameState.orderIndex >= minigameState.selected.length) {
        minigameState.active = false;
        playerWinsRound();
      }
    } else {
      item.classList.add('wrong');
      setTimeout(() => item.classList.remove('wrong'), 400);
      sfxPlayerHit();
      playerLosesRound();
    }
  }

  // ===================================================================
  //  REVERSE
  // ===================================================================
  const REVERSE_FREQS = [262, 330, 392, 523];
  const REVERSE_COLORS = ['#e94560','#f1c40f','#4a7dff','#2ecc71'];
  const REVERSE_SYMBOLS = ['⭐','🔥','💧','🌿'];

  function startReverse() {
    const level = battleState.level;
    const playerSeqLen = Math.min(2 + Math.floor(level * 0.5), 5);
    const buttonCount = 4;

    const playerSeq = [];
    for (let i = 0; i < playerSeqLen; i++) playerSeq.push(rand(0, buttonCount - 1));

    // 50/50: boss either plays CORRECT reverse or WRONG reverse (one note changed)
    const isCorrectReverse = Math.random() < 0.5;
    const bossSeq = [...playerSeq].reverse();
    if (!isCorrectReverse) {
      // Změň jednu náhodnou notu na jinou
      const badIdx = rand(0, bossSeq.length - 1);
      let newNote;
      do { newNote = rand(0, buttonCount - 1); } while (newNote === bossSeq[badIdx]);
      bossSeq[badIdx] = newNote;
    }

    minigameState = {
      active: true,
      phase: 'playerInput',
      playerSeq,
      bossSeq,
      isCorrectReverse,
      playerInputIndex: 0,
      buttons: buttonCount,
      inputEnabled: true
    };

    const btnContainer = $('reverseButtons');
    btnContainer.innerHTML = '';
    for (let i = 0; i < buttonCount; i++) {
      const btn = document.createElement('div');
      btn.className = 'reverse-btn';
      btn.style.background = REVERSE_COLORS[i];
      btn.textContent = REVERSE_SYMBOLS[i];
      btn.dataset.idx = i;
      btn.addEventListener('click', () => game.reverseInput(i));
      btnContainer.appendChild(btn);
    }

    $('reversePrompt').textContent = '🎵 Zahraj krátkou melodii ťukáním!';
    $('reverseBossPlay').textContent = '👹 Počkej až dohraješ…';
    $('reverseBossPlay').style.display = 'none';
    $('reverseAnswerBtns').style.display = 'none';
    minigameState.inputEnabled = true;
  }

  function reverseInput(idx) {
    if (!minigameState.active || !minigameState.inputEnabled || minigameState.phase !== 'playerInput') return;
    const ms = minigameState;
    initAudio();
    const buttons = document.querySelectorAll('#reverseButtons .reverse-btn');
    buttons[idx].classList.add('active');
    setTimeout(() => buttons[idx].classList.remove('active'), 150);
    playTone(REVERSE_FREQS[idx], 0.15, 'sine', 0.10);

    if (idx !== ms.playerSeq[ms.playerInputIndex]) {
      ms.inputEnabled = false;
      ms.active = false;
      playerLosesRound();
      return;
    }
    ms.playerInputIndex++;
    if (ms.playerInputIndex >= ms.playerSeq.length) {
      // Player finished, now boss plays reversed
      ms.phase = 'playing';
      ms.inputEnabled = false;
      $('reversePrompt').textContent = '👂 Poslouchej, co hraje nepřítel!';
      $('reverseBossPlay').style.display = 'block';
      playReverseBossSequence(0);
    }
  }

  function playReverseBossSequence(idx) {
    const ms = minigameState;
    if (idx >= ms.bossSeq.length) {
      ms.phase = 'answering';
      $('reversePrompt').textContent = '🤔 Přehrál nepřítel stejnou melodii pozpátku?';
      $('reverseBossPlay').textContent = '👹 Klikni na odpověď!';
      $('reverseAnswerBtns').style.display = 'flex';
      return;
    }
    initAudio();
    const buttons = document.querySelectorAll('#reverseButtons .reverse-btn');
    const cellIdx = ms.bossSeq[idx];
    buttons.forEach(b => b.classList.remove('active'));
    buttons[cellIdx].classList.add('active');
    playTone(REVERSE_FREQS[cellIdx % REVERSE_FREQS.length], 0.2, 'sine', 0.12);
    $('reverseBossPlay').textContent = `👹 Přehrává... ${idx + 1}/${ms.bossSeq.length}`;
    setTimeout(() => {
      buttons.forEach(b => b.classList.remove('active'));
      setTimeout(() => playReverseBossSequence(idx + 1), 200);
    }, 350);
  }

  function reverseAnswer(playerSaysCorrect) {
    if (!minigameState.active || minigameState.phase !== 'answering') return;
    minigameState.active = false;
    const isCorrect = playerSaysCorrect === minigameState.isCorrectReverse;
    if (isCorrect) { sfxSuccess(); playerWinsRound(); }
    else { sfxPlayerHit(); playerLosesRound(); }
  }

  // ===================================================================
  //  INIT
  // ===================================================================
  function init() {
    state = loadSave();
    while (state.dungeons.length < 8) state.dungeons.push(0);
    state.deaths = state.deaths || 0;
    state.wins = state.wins || 0;
    if (!state.bossMedals) state.bossMedals = [[],[],[],[],[],[],[],[]].map(() => [false,false,false,false,false]);
    if (!state.achievements) state.achievements = {};

    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (a.dataset.screen === 'dungeonSelect') showDungeonSelect();
        else if (a.dataset.screen === 'medals') showMedals();
        else if (a.dataset.screen === 'reset') resetGame();
      });
    });
    showScreen('dungeonSelect');
  }

  window.game = {
    showScreen, enterDungeon, continueDungeon, retryFloor, showMedals,
    simonClick, colorInput, gridPick, judgeAnswer,
    echoClick, orderPick, reverseInput, reverseAnswer
  };

  init();
})();
