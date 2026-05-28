(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ===== AUDIO =====
  let audioCtx = null;
  function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); if (audioCtx.state==='suspended') audioCtx.resume(); }
  function playTone(f,d,t='sine',v=0.15) { try{initAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d)}catch{}}
  const sfxHit=()=>playTone(220,0.12,'sawtooth',0.08);
  const sfxPlayerHit=()=>playTone(140,0.2,'square',0.10);
  const sfxSuccess=()=>{playTone(523,0.1,'sine',0.12);setTimeout(()=>playTone(659,0.1,'sine',0.12),80);setTimeout(()=>playTone(784,0.15,'sine',0.14),160);};
  const sfxEnemyDefeat=()=>{playTone(440,0.08,'square',0.1);setTimeout(()=>playTone(330,0.08,'square',0.1),80);setTimeout(()=>playTone(220,0.15,'square',0.08),160);};
  const sfxBossDefeat=()=>{playTone(523,0.15,'sine',0.14);setTimeout(()=>playTone(659,0.15,'sine',0.14),100);setTimeout(()=>playTone(784,0.15,'sine',0.16),200);setTimeout(()=>playTone(1047,0.3,'sine',0.18),300);};
  const sfxLevelUp=()=>{playTone(392,0.1,'sine',0.12);setTimeout(()=>playTone(523,0.1,'sine',0.12),100);setTimeout(()=>playTone(659,0.12,'sine',0.14),200);setTimeout(()=>playTone(784,0.15,'sine',0.16),300);};

  // ===== SPELLS =====
  const SKILLS = [
    { id:'fireball', name:'Fireball', icon:'🔥', dungeon:'simon', dungeonName:'🌲 Les stínů', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*2+3} dmg + ${t} DoT`, baseCd:6, cdR:0.3 },
    { id:'lightning', name:'Blesk', icon:'⚡', dungeon:'judge', dungeonName:'⚖️ Pekelný tribunál', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*3+2} dmg + stun`, baseCd:8, cdR:0.4 },
    { id:'shield', name:'Štít', icon:'🛡️', dungeon:'color', dungeonName:'🏜️ Pouštní nekropole', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*10+10}% blok`, baseCd:9, cdR:0.3 },
    { id:'heal', name:'Léčení', icon:'💚', dungeon:'grid', dungeonName:'⏳ Zřícenina času', maxLv:10, desc:t=>t===0?'Zamčeno':`+${t+2} HP`, baseCd:12, cdR:0.5 },
    { id:'crit', name:'Kritik', icon:'🗡️', dungeon:'aim', dungeonName:'🎯 Temná aréna', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*5+10}% crit`, baseCd:0, cdR:0 },
    { id:'clone', name:'Klon', icon:'🌀', dungeon:'echo', dungeonName:'🔊 Ozvěny jeskyně', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*8+10}% klon`, baseCd:14, cdR:0.5 },
    { id:'freeze', name:'Mráz', icon:'❄️', dungeon:'order', dungeonName:'🧩 Labyrint pravidel', maxLv:10, desc:t=>t===0?'Zamčeno':`${t+1}k zpomalení`, baseCd:10, cdR:0.4 },
    { id:'shadow', name:'Stín', icon:'🌑', dungeon:'reverse', dungeonName:'🔄 Zrcadlová síň', maxLv:10, desc:t=>t===0?'Zamčeno':`${t*4+5} dmg`, baseCd:10, cdR:0.4 },
  ];
  const SKILL_MAP = {}; SKILLS.forEach(s => SKILL_MAP[s.id] = s);
  function skillXpToLevel(lv) { return 3 + lv * 2; }

  // ===== LOCATIONS (MAP) =====
  const DIRECTIONS = ['⬆️','⬇️','⬅️','➡️'];
  const LOCATIONS = [
    { id:0, name:'🌲 Stínový les', icon:'🌲', monsters:5, boss:{name:'Stínový pán',face:'👹',hp:10}, skill:'fireball', minSkill:0, reward:{gold:5,weapon:'dagger'} },
    { id:1, name:'⚖️ Soudní síň', icon:'⚖️', monsters:6, boss:{name:'Soudce pekel',face:'⚖️',hp:12}, skill:'lightning', minSkill:2, reward:{gold:8,armor:'leather'} },
    { id:2, name:'🏜️ Pouštní brána', icon:'🏜️', monsters:7, boss:{name:'Faraonova kletba',face:'🐍',hp:14}, skill:'shield', minSkill:3, reward:{gold:12} },
    { id:3, name:'⏳ Časová zřícenina', icon:'⌛', monsters:8, boss:{name:'Architekt času',face:'⌛',hp:16}, skill:'heal', minSkill:4, reward:{gold:15,weapon:'sword'} },
    { id:4, name:'🎯 Temná aréna', icon:'🎯', monsters:9, boss:{name:'Mistr terčů',face:'🎯',hp:18}, skill:'crit', minSkill:5, reward:{gold:20} },
    { id:5, name:'🔊 Jeskyně ozvěn', icon:'🔊', monsters:10, boss:{name:'Šepotající hlas',face:'🔊',hp:20}, skill:'clone', minSkill:6, reward:{gold:25,armor:'chainmail'} },
    { id:6, name:'🧩 Labyrint zákonů', icon:'🧩', monsters:11, boss:{name:'Architekt zákonů',face:'🧩',hp:22}, skill:'freeze', minSkill:7, reward:{gold:30} },
    { id:7, name:'🔄 Zrcadlový sál', icon:'🔄', monsters:12, boss:{name:'Zrcadlový král',face:'🔄',hp:25}, skill:'shadow', minSkill:8, reward:{gold:40,weapon:'flameSword',armor:'plate'} },
  ];

  // ===== STATE =====
  let state = {};
  let mapBattleState = {};
  let trainingState = {};
  let minigameState = {};
  let _activeIntervals = [];

  function cleanupTimers() {
    _activeIntervals.forEach(id => { try { clearInterval(id); } catch {} }); _activeIntervals = [];
    if (minigameState.timerInterval) { clearInterval(minigameState.timerInterval); minigameState.timerInterval = null; }
    if (minigameState.aimTimeout) { clearTimeout(minigameState.aimTimeout); minigameState.aimTimeout = null; }
    if (minigameState.countdownInterval) { clearInterval(minigameState.countdownInterval); minigameState.countdownInterval = null; }
    ['simonTimeout','echoTimeout','reverseTimeout'].forEach(k => { if (minigameState[k]) { clearTimeout(minigameState[k]); delete minigameState[k]; } });
    if (mapBattleState && mapBattleState._attackTimer) { clearTimeout(mapBattleState._attackTimer); mapBattleState._attackTimer = null; }
    let id = window.setTimeout(()=>{},0); while(id--) window.clearTimeout(id);
  }

  const SAVE_KEY = 'dungeonRecallV6';
  function defaultState() {
    const s = { skills:{}, skillXp:{}, hero:{level:1,xp:0,gold:0,hp:3,maxHp:3,baseDmg:2,weapon:'fists',armor:'rags'}, deaths:0, wins:0,
      locationProgress:[0,0,0,0,0,0,0,0], bossesDefeated:[false,false,false,false,false,false,false,false], achievements:{} };
    SKILLS.forEach(sk => { s.skills[sk.id]=0; s.skillXp[sk.id]=0; });
    return s;
  }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.skills) return s; } catch {} return defaultState(); }
  function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function resetGame() { state = defaultState(); saveGame(); showScreen('map'); }

  // ===== SCREENS =====
  const SCREEN_IDS = { map:'mapScreen', mapBattle:'mapBattleScreen', tower:'towerScreen', hero:'heroScreen', battle:'battleScreen', result:'resultScreen', medals:'medalScreen' };
  function showScreen(name) {
    cleanupTimers();
    if (name !== 'medals') { const m = $('medalScreen'); if (m) m.remove(); }
    Object.values(SCREEN_IDS).forEach(id => {
      const el = $(id);
      if (!el) return;
      if (id === SCREEN_IDS[name]) { el.classList.remove('hidden'); el.classList.add('active'); } else { el.classList.add('hidden'); el.classList.remove('active'); }
    });
    if (name === 'map') renderMap();
    else if (name === 'tower') renderTower();
    else if (name === 'hero') renderHero();
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
    if (state.bossesDefeated[locId]) { showMessage('✅ Tato lokace je hotová!'); return; }
    const sk = SKILL_MAP[loc.skill];
    const lv = state.skills[loc.skill] || 0;
    if (lv < loc.minSkill) { showMessage(`❌ Potřebuješ ${sk.icon} Lv.${loc.minSkill}`); return; }
    if (locId > 0 && !state.bossesDefeated[locId-1]) { showMessage('🔒 Nejdřív poraz předchozí lokaci!'); return; }

    cleanupTimers();
    const progress = state.locationProgress[locId] || 0;
    const isBoss = progress >= loc.monsters;
    const bossHp = isBoss ? loc.boss.hp : 1;
    const playerMaxHp = state.hero.maxHp || 3;

    mapBattleState = {
      locId, loc, isBoss, progress,
      bossHp, maxBossHp: bossHp,
      playerHp: playerMaxHp, maxPlayerHp: playerMaxHp,
      ended: false, turn: 0, isAttacking: false,
      stunned: 0, frozen: 0, dot: 0, shieldActive: null,
      spellCooldowns: {}
    };
    SKILLS.forEach(sk => { const l = state.skills[sk.id]||0; if (l>0) mapBattleState.spellCooldowns[sk.id]=0; });

    showScreen('mapBattle');
    updateMapBattleUI();
    setupMapBattleInput();
    setTimeout(() => mapBattleTurn(), 400);
  }

  function updateMapBattleUI() {
    const mb = mapBattleState;
    if (mb.isBoss) {
      $('mbEnemyName').textContent = `${mb.loc.boss.face} ${mb.loc.boss.name}`;
      $('mbLocation').textContent = `BOSS ${mb.loc.name}`;
    } else {
      const left = mb.loc.monsters - mb.progress;
      $('mbEnemyName').textContent = `👾 Nestvůra (${left} zbývá)`;
      $('mbLocation').textContent = mb.loc.name;
    }
    $('mbPlayerHp').textContent = '❤️'.repeat(mb.playerHp) + '🖤'.repeat(Math.max(0, mb.maxPlayerHp - mb.playerHp));
    $('mbEnemyHp').textContent = mb.isBoss ? ('❤️'.repeat(mb.bossHp)+'🖤'.repeat(Math.max(0, mb.maxBossHp-mb.bossHp))) : '👾';
    $('mbFigure').textContent = mb.isBoss ? mb.loc.boss.face : '👾';
    $('mbHint').textContent = mb.isBoss ? `⬆️⬇️⬅️➡️ uhni! Kolo ${mb.turn}` : `⬆️⬇️⬅️➡️ uhni! Nestvůra ${mb.loc.monsters-mb.progress}/${mb.loc.monsters}`;

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

  function setupMapBattleInput() {
    const arena = $('mbArena');
    if (!arena) return;
    const old = arena._mbHandlers;
    if (old) old.forEach(h => arena.removeEventListener(h[0], h[1]));

    let startX, startY;
    const handlers = [];

    const ts = (e) => { if (mapBattleState.ended || mapBattleState.isAttacking) return; const t=e.touches[0]; startX=t.clientX; startY=t.clientY; };
    const te = (e) => {
      if (mapBattleState.ended || !startX) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      startX = startY = null;
      if (Math.abs(dx)<20 && Math.abs(dy)<20) { onMapAttack(); return; }
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

  function mapBattleTurn() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    if (mb.dot > 0) { mb.bossHp -= mb.dot; if (mb.bossHp <= 0 && mb.isBoss) { endMapBattle(true); return; } }
    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    mb.turn++;
    updateMapBattleUI();

    SKILLS.forEach(sk => { const l = state.skills[sk.id]||0; if (l>0 && mb.spellCooldowns[sk.id]>0) mb.spellCooldowns[sk.id]--; });

    if (mb.stunned > 0) { mb.stunned--; setTimeout(() => mapBattleTurn(), 600); return; }
    if (mb.frozen > 0) mb.frozen--;

    const attackDir = DIRECTIONS[rand(0,3)];
    const speed = Math.max(350, 700 - mb.turn * 15);
    const windowTime = mb.frozen > 0 ? speed * 1.5 : speed;

    const arrow = $('mbArrow');
    if (arrow) { arrow.textContent = attackDir; arrow.className = 'boss-attack-arrow'; }

    mb.isAttacking = true;
    mb.currentAttack = attackDir;
    const playerEl = $('mbPlayerFigure');
    if (playerEl) playerEl.className = 'boss-fight-player';

    mb._attackTimer = setTimeout(() => {
      if (mapBattleState.ended) return;
      onMapHit();
    }, windowTime);
  }

  function onMapDodge(dir) {
    if (mapBattleState.ended || !mapBattleState.isAttacking) return;
    clearTimeout(mapBattleState._attackTimer);
    mapBattleState.isAttacking = false;

    const arrow = $('mbArrow');
    if (arrow) arrow.className = 'boss-attack-arrow hidden';

    const playerEl = $('mbPlayerFigure');
    if (playerEl) {
      playerEl.className = dir === '⬆️' ? 'boss-fight-player swipe-up' : dir === '⬇️' ? 'boss-fight-player swipe-down' : dir === '⬅️' ? 'boss-fight-player swipe-left' : 'boss-fight-player swipe-right';
      setTimeout(() => playerEl.className = 'boss-fight-player', 200);
    }

    if (dir === mapBattleState.currentAttack) {
      sfxHit();
      if (!mapBattleState.isBoss) {
        // Monster defeated
        endMapBattle(true);
      } else {
        mapBattleState.bossHp -= Math.max(1, state.hero.baseDmg - 1);
        if (mapBattleState.bossHp <= 0) { endMapBattle(true); return; }
        $('mbHint').textContent = '✅ Úhyb! Protizásah!';
        setTimeout(() => mapBattleTurn(), 350);
      }
    } else {
      onMapHit();
    }
  }

  function onMapAttack() {
    if (mapBattleState.ended) return;
    if (mapBattleState.isAttacking) { $('mbHint').textContent = '⚠️ Uhni nejdřív!'; return; }
    if (!mapBattleState.isBoss) { endMapBattle(true); return; }

    const baseDmg = state.hero.baseDmg || 2;
    const critChance = (state.skills.crit||0) * 5 + 10;
    const critMult = (state.skills.crit||0) * 0.2 + 1;
    let dmg = baseDmg;
    if (Math.random() * 100 < critChance) { dmg = Math.round(dmg * critMult); $('mbHint').textContent = `💥 Kritik! ${dmg}`; }
    else { $('mbHint').textContent = `⚔️ Útok! ${dmg}`; }
    mapBattleState.bossHp -= dmg;
    sfxHit();
    if (mapBattleState.bossHp <= 0) { endMapBattle(true); return; }
    updateMapBattleUI();
    setTimeout(() => mapBattleTurn(), 350);
  }

  function onMapHit() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    let amount = 1;
    if (mb.shieldActive) {
      const block = mb.shieldActive;
      if (block >= 100) { $('mbHint').textContent = '🛡️ Štít odrazil!'; mb.shieldActive = null; return; }
      amount = Math.max(1, Math.round(amount * (1 - block/100)));
      mb.shieldActive = null;
    }
    mb.playerHp -= amount;
    sfxPlayerHit();
    $('mbHint').textContent = `💔 Zásah! -${amount}`;
    updateMapBattleUI();
    if (mb.playerHp <= 0) { endMapBattle(false); }
    else { setTimeout(() => mapBattleTurn(), 500); }
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
    else if (spellId === 'lightning') { const dmg = lv*3+2; mb.bossHp -= dmg; mb.stunned = 1; $('mbHint').textContent = `⚡ Blesk! ${dmg}+stun!`; }
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
        if (p >= mb.loc.monsters) {
          // All monsters done, now boss
          $('resultIcon').textContent = '👹';
          $('resultTitle').textContent = `Všech ${mb.loc.monsters} nestvůr poraženo!`;
          $('resultMsg').textContent = `Teď na tebe čeká ${mb.loc.boss.name}!`;
          $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${locId})">👹 Jdi na bosse!</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
        } else {
          $('resultIcon').textContent = '✅';
          $('resultTitle').textContent = 'Nestvůra poražena!';
          $('resultMsg').textContent = `Postup: ${p}/${mb.loc.monsters}`;
          $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${locId})">🚀 Další</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
        }
      } else {
        // Boss defeated
        state.bossesDefeated[locId] = true;
        const r = mb.loc.reward;
        if (r.gold) state.hero.gold = (state.hero.gold || 0) + r.gold;
        if (r.weapon && state.hero.weapon === 'fists') state.hero.weapon = r.weapon;
        if (r.armor && state.hero.armor === 'rags') state.hero.armor = r.armor;

        sfxBossDefeat();
        $('resultIcon').textContent = '🏆';
        $('resultTitle').textContent = `${mb.loc.boss.name} poražen!`;
        let msg = `${r.gold||0}💰`;
        if (r.weapon) msg += ` + ${r.weapon}`;
        if (r.armor) msg += ` + ${r.armor}`;
        $('resultMsg').textContent = `Získal jsi ${msg}`;
        $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.showScreen('map')">🌍 Mapa</button><button class="btn btn-secondary" onclick="game.showScreen('tower')">🔮 Věž magie</button>`;

        if (locId + 1 < LOCATIONS.length) {
          $('resultBtn').innerHTML += `<button class="btn btn-secondary" onclick="game.enterLocation(${locId+1})">🚀 Další lokace</button>`;
        }
      }
      saveGame();
      checkAchievements();
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
      return `<div class="dungeon-card ${maxed?'completed':''}" onclick="game.enterTraining('${sk.id}')">
        <div class="flex-between">
          <div class="dungeon-name">${sk.icon} ${sk.dungeonName}</div>
          <span class="badge ${sk.dungeon}">${sk.name}</span>
        </div>
        <div class="dungeon-progress-wrap"><div class="dungeon-progress-bar" style="width:${pct}%;background:${maxed?'#2ecc71':'#4a7dff'}"></div></div>
        <div class="flex-between" style="margin-top:4px;font-size:12px;color:#8888aa">
          <span>${maxed?'✅ MAX':`Lv.${lv} ${xp}/${needed}XP`}</span>
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
    $('heroHp').textContent = h.playerHp || h.maxHp;
    $('heroMaxHp').textContent = h.maxHp;
    $('heroDmg').textContent = h.baseDmg;
    $('heroDef').textContent = h.armor === 'rags' ? 0 : h.armor === 'leather' ? 1 : h.armor === 'chainmail' ? 2 : h.armor === 'plate' ? 3 : 0;
    $('heroGold').textContent = h.gold;
    $('totalSkillLevel').textContent = `${totalLv}/${SKILLS.length*10}`;

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
    $('equipWeapon').textContent = weaponNames[h.weapon] || '✊ Pěsti';
    $('equipArmor').textContent = armorNames[h.armor] || '🧥 Hadry';
  }

  // ===== TRAINING (minigames) =====
  function enterTraining(skillId) {
    const sk = SKILL_MAP[skillId];
    if (!sk) return;
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
    const faces = { simon:'👻', judge:'📜', color:'🏹', grid:'🗿', aim:'🎯', echo:'🔊', order:'🧩', reverse:'🔄' };
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
    const areas = { simon:'simonArea', color:'colorClashArea', grid:'gridDefenderArea', judge:'judgeArea', aim:'aimArea', echo:'echoArea', order:'orderArea', reverse:'reverseArea' };
    const fns = { simon:startSimon, color:startColorClash, grid:startGridDefender, judge:startJudge, aim:startAim, echo:startEcho, order:startOrder, reverse:startReverse };
    const el = $(areas[type]);
    if (el && fns[type]) { el.classList.remove('minigame-hide'); fns[type](); }
  }

  function hideAllMinigames() {
    ['simonArea','colorClashArea','gridDefenderArea','judgeArea','aimArea','echoArea','orderArea','reverseArea'].forEach(id => $(id).classList.add('minigame-hide'));
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
          if (state.hero.xp >= state.hero.level * 2) { state.hero.xp = 0; state.hero.level++; state.hero.maxHp = Math.min(10, 3+Math.floor(state.hero.level/2)); state.hero.baseDmg = Math.min(10, 2+Math.floor(state.hero.level/2)); }
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
    saveGame(); checkAchievements(); showScreen('result');
  }

  function trainingWin() { trainingState.playerHp=1; sfxSuccess(); endTraining(true); }
  function trainingLose() { trainingState.playerHp=0; sfxPlayerHit(); endTraining(false); }

  // ===== MINIGAMES =====
  const SIMON_SYMBOLS = ['⚡','🔥','💧','🌿','💎','☀️','🌙','🍀','🌀','⭐','🌈','🦋','🍄','🌊','❄️','🎯'];
  const SIMON_COLORS = ['#e94560','#f1c40f','#4a7dff','#2ecc71','#9b59b6','#e67e22','#1abc9c','#2c3e50','#d35400','#f39c12','#16a085','#c0392b','#8e44ad','#2980b9','#bdc3c7','#7f8c8d'];
  const SIMON_FREQS = [73.42*4,87.31*4,110.0*4,146.84*2,164.81*2,196.0*2,220.0*2,246.94*2];
  function startSimon() {
    const level=trainingState.level,gridSize=Math.min(2+Math.floor(level/3),4),nc=gridSize*gridSize,seqLen=Math.min(3+Math.floor(level*0.8),10);
    const sym=shuffle([...SIMON_SYMBOLS]).slice(0,nc),cols=SIMON_COLORS.slice(0,nc);
    minigameState={sequence:[],playerIndex:0,showing:true,inputEnabled:false,symbols:sym,gridSize,seqLen};
    for(let i=0;i<seqLen;i++) minigameState.sequence.push(rand(0,nc-1));
    const g=$('simonGrid');g.style.gridTemplateColumns=`repeat(${gridSize},1fr)`;
    g.innerHTML=sym.map((s,i)=>`<div class="simon-cell" data-idx="${i}" style="background:${cols[i]}" onclick="game.simonClick(${i})"><span style="font-size:${gridSize<=3?'28px':'20px'};pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%">${s}</span></div>`).join('');
    $('simonPrompt').textContent='👀';$('simonProgress').textContent=`0/${seqLen}`;
    let delay=Math.max(100,300-level*20);minigameState.showing=true;
    (function ps(idx){if(idx>=minigameState.sequence.length){minigameState.showing=false;minigameState.inputEnabled=true;$('simonPrompt').textContent='🎯';return;}
      initAudio();const c=document.querySelectorAll('#simonGrid .simon-cell'),ci=minigameState.sequence[idx];c.forEach(x=>x.classList.remove('lit'));c[ci].classList.add('lit');playTone(SIMON_FREQS[ci%SIMON_FREQS.length],0.13,'sine',0.12);
      setTimeout(()=>{c.forEach(x=>x.classList.remove('lit'));setTimeout(()=>ps(idx+1),60);},delay);})(0);
  }
  function simonClick(idx){if(!minigameState.inputEnabled||minigameState.showing)return;
    initAudio();const c=document.querySelectorAll('#simonGrid .simon-cell');c[idx].classList.add('active');setTimeout(()=>c[idx].classList.remove('active'),150);
    playTone(SIMON_FREQS[idx%SIMON_FREQS.length],0.12,'sine',0.10);
    if(idx!==minigameState.sequence[minigameState.playerIndex]){minigameState.inputEnabled=false;trainingLose();return;}
    minigameState.playerIndex++;$('simonProgress').textContent=`${minigameState.playerIndex}/${minigameState.sequence.length}`;
    if(minigameState.playerIndex>=minigameState.sequence.length){minigameState.inputEnabled=false;trainingWin();}}
  function startColorClash(){const level=trainingState.level,fd=Math.max(0.8,2.8-level*0.25).toFixed(2),colors=['red','blue','green','yellow'],cl={red:'🔴',blue:'🔵',green:'🟢',yellow:'🟡'};const a=$('colorArena');a.innerHTML='';a.style.height='180px';a.style.display='flex';a.style.flexDirection='column';const ld=document.createElement('div');ld.style.cssText='display:flex;flex:1;';ld.innerHTML=colors.map(c=>`<div class="color-lane" data-color="${c}" style="flex:1;text-align:center;padding-top:4px;font-size:20px;border-right:1px solid #1a1a3a">${cl[c]}</div>`).join('');a.appendChild(ld);const br=document.createElement('div');br.style.cssText='display:flex;height:40px;';br.innerHTML=colors.map(c=>{const bg=c==='red'?'#e94560':c==='blue'?'#4a7dff':c==='green'?'#2ecc71':'#f1c40f';return `<div style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;background:${bg};margin:2px;border-radius:6px;font-size:13px;color:#fff;font-weight:bold" onclick="game.colorInput('${c}')">${cl[c]}</div>`;}).join('');a.appendChild(br);minigameState={active:true,colors,arena:a,projectile:null,currentColor:null,fallDuration:fd};(function spawn(){if(!minigameState.active)return;const a=minigameState.arena,col=minigameState.colors[rand(0,3)];if(minigameState.projectile&&minigameState.projectile.parentNode)minigameState.projectile.remove();const l=a.querySelectorAll('.color-lane'),li=minigameState.colors.indexOf(col),lane=l[li];if(!lane){setTimeout(spawn,100);return;}const lr=lane.getBoundingClientRect(),ar=a.getBoundingClientRect(),lx=lr.left-ar.left+lr.width/2-14;const el=document.createElement('div');el.className='color-projectile';el.style.cssText=`left:${lx}px;top:0px;background:${col==='red'?'#e94560':col==='blue'?'#4a7dff':col==='green'?'#2ecc71':'#f1c40f'};width:28px;height:28px;border-radius:50%;border:2px solid #fff;position:absolute;transition:top ${minigameState.fallDuration}s linear`;el.dataset.color=col;el.addEventListener('transitionend',()=>{if(minigameState.active&&minigameState.projectile===el){minigameState.active=false;el.remove();trainingLose();}});a.appendChild(el);minigameState.projectile=el;minigameState.currentColor=col;requestAnimationFrame(()=>{el.style.top='145px';});})();}
  function colorInput(c){if(!minigameState.active)return;if(c===minigameState.currentColor){minigameState.active=false;if(minigameState.projectile){const e=minigameState.projectile;e.style.transition='transform 0.2s, opacity 0.2s';e.style.transform='scale(2.5)';e.style.opacity='0';setTimeout(()=>e.remove(),200);}sfxHit();trainingWin();}}
  function startGridDefender(){const level=trainingState.level,maxNum=5+level*2,target=rand(3,maxNum),ops=['+','-','×'],options=[],used=new Set();const cop=ops[rand(0,2)];let a,b,ex,res;for(let t=0;t<50;t++){if(cop==='+'){a=rand(1,target-1);b=target-a;ex=`${a}+${b}`;res=a+b;}else if(cop==='-'){a=rand(target+1,target+maxNum);b=a-target;ex=`${a}-${b}`;res=a-b;}else{const f=[];for(let i=1;i<=Math.sqrt(target);i++){if(target%i===0)f.push(i);}if(f.length>1){a=f[rand(1,f.length-1)];b=target/a;ex=`${a}×${b}`;res=a*b;}else{a=rand(1,3);b=target;ex=`${a}×${b}`;res=a*b;}}if(!used.has(ex)&&res===target){used.add(ex);break;}}options.push({value:res,expr:ex,wins:true});const cv=[];for(let d=1;d<=3;d++){if(res-d>=1)cv.push(res-d);if(res+d!==target)cv.push(res+d);}shuffle(cv);for(let i=1;i<3;i++){const fr=cv.length>0?cv.shift():rand(1,maxNum+5);let fe;for(let t=0;t<30;t++){const op=ops[rand(0,2)];let ba,bb,bex,bres;if(op==='+'){ba=rand(1,maxNum);bb=rand(1,maxNum);bex=`${ba}+${bb}`;bres=ba+bb;}else if(op==='-'){ba=rand(1,maxNum*2);bb=rand(1,ba-1);bex=`${ba}-${bb}`;bres=ba-bb;}else{ba=rand(1,5);bb=rand(1,5);bex=`${ba}×${bb}`;bres=ba*bb;}if(!used.has(bex)&&bres===fr){used.add(bex);options.push({value:bres,expr:bex,wins:false});fe=true;break;}}if(!fe){for(let t=0;t<50;t++){const op=ops[rand(0,2)];let ba,bb,bex,bres;if(op==='+'){ba=rand(1,maxNum);bb=rand(1,maxNum);bex=`${ba}+${bb}`;bres=ba+bb;}else if(op==='-'){ba=rand(1,maxNum*2);bb=rand(1,ba-1);bex=`${ba}-${bb}`;bres=ba-bb;}else{ba=rand(1,5);bb=rand(1,5);bex=`${ba}×${bb}`;bres=ba*bb;}if(!used.has(bex)&&Math.abs(bres-fr)<=1){used.add(bex);options.push({value:bres,expr:bex,wins:false});break;}}}}shuffle(options);const td=Math.max(3,6-Math.floor(level/3));minigameState={options,target,active:true,timer:td};$('gridArea').innerHTML=`<div class="grid-info"><span class="grid-time" id="gridTimer">${td}s</span><span class="grid-target">👹 <strong>${target}</strong></span></div><div class="grid-cards">${options.map((o,i)=>`<div class="grid-card" onclick="game.gridPick(${i})"><span class="expr">${o.expr}</span></div>`).join('')}</div>`;const te=$('gridTimer');if(te){minigameState.timerInterval=setInterval(()=>{minigameState.timer--;te.textContent=minigameState.timer+'s';if(minigameState.timer<=0){clearInterval(minigameState.timerInterval);if(minigameState.active){minigameState.active=false;trainingLose();}}},1000);}}
  function gridPick(idx){if(!minigameState.active)return;minigameState.active=false;if(minigameState.timerInterval)clearInterval(minigameState.timerInterval);if(minigameState.options[idx].wins){sfxSuccess();trainingWin();}else{sfxPlayerHit();trainingLose();}}
  const JUDGE_STATEMENTS={easy:[{text:'6×7=42',answer:true},{text:'Voda vaří při 100°C',answer:true},{text:'Země je plochá',answer:false},{text:'12 dělitelné 3',answer:true},{text:'Čtverec má 5 stran',answer:false},{text:'Žralok je savec',answer:false},{text:'Slunce vychází na východě',answer:true},{text:'Týden má 7 dní',answer:true},{text:'Měsíc větší než Země',answer:false},{text:'5×5=25',answer:true},{text:'Kočka má 9 životů',answer:false},{text:'8+4=11',answer:false}],medium:[{text:'1+2×3=9',answer:false},{text:'Krychle má 8 vrcholů',answer:true},{text:'0 je sudé číslo',answer:true},{text:'24 dělitelné 7',answer:false},{text:'Praha je hl. město Polska',answer:false},{text:'Všechna prvočísla lichá',answer:false},{text:'Antarktida je poušť',answer:true},{text:'Delfín je ryba',answer:false},{text:'2+3×4=20',answer:false},{text:'Průměr 2,8,14 je 8',answer:true}],hard:[{text:'3²+4²=5²',answer:true},{text:'0,5×20=12',answer:false},{text:'Sudé×liché=vždy sudé',answer:true},{text:'48/6=8',answer:true},{text:'121 je prvočíslo',answer:false},{text:'(8−3)×2=10',answer:true},{text:'Dva zápory dají klad',answer:true},{text:'Kg je jednotka síly',answer:false},{text:'Hlemýžď má 25000 zubů',answer:true}]};
  function startJudge(){const level=trainingState.level;let f;if(level<=3)f=JUDGE_STATEMENTS.easy;else if(level<=6)f=[...JUDGE_STATEMENTS.easy,...JUDGE_STATEMENTS.medium];else f=[...JUDGE_STATEMENTS.medium,...JUDGE_STATEMENTS.hard];const st=f[rand(0,f.length-1)],td=Math.max(3,6-Math.floor(level/3));minigameState={active:true,statement:st,timer:td};$('judgeStatement').textContent=st.text;$('judgeTimer').textContent=td+'s';if(minigameState.timerInterval)clearInterval(minigameState.timerInterval);minigameState.timerInterval=setInterval(()=>{minigameState.timer--;$('judgeTimer').textContent=minigameState.timer+'s';if(minigameState.timer<=0){clearInterval(minigameState.timerInterval);if(minigameState.active){minigameState.active=false;trainingLose();}}},1000);}
  function judgeAnswer(a){if(!minigameState.active)return;minigameState.active=false;if(minigameState.timerInterval)clearInterval(minigameState.timerInterval);if(a===minigameState.statement.answer){sfxSuccess();trainingWin();}else{sfxPlayerHit();trainingLose();}}
  function startAim(){const l=trainingState.level,rh=3+Math.floor(l/2),ts=Math.max(26,50-l*3),to=Math.max(600,1600-l*100);minigameState={active:true,hits:0,misses:0,requiredHits:rh,targetSize:ts,timeout:to};$('aimHits').textContent='0';$('aimMisses').textContent='0';$('aimPrompt').textContent=`🎯 ${rh}×!`;$('aimArena').innerHTML='';(function spawn(){if(!minigameState.active)return;const a=$('aimArena');if(minigameState.target&&minigameState.target.parentNode)minigameState.target.remove();const aw=a.clientWidth||280,ah=a.clientHeight||160,s=minigameState.targetSize,x=rand(10,Math.max(11,aw-s-10)),y=rand(10,Math.max(11,ah-s-10));const el=document.createElement('div');el.className='aim-target';el.style.cssText=`left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${['#e94560','#f1c40f','#2ecc71','#4a7dff'][rand(0,3)]}`;el.addEventListener('click',e=>{e.stopPropagation();if(!minigameState.active)return;minigameState.hits++;clearTimeout(minigameState.aimTimeout);if(minigameState.target&&minigameState.target.parentNode)minigameState.target.remove();$('aimHits').textContent=minigameState.hits;sfxHit();if(minigameState.hits>=minigameState.requiredHits){minigameState.active=false;trainingWin();}else setTimeout(spawn,200);});a.appendChild(el);minigameState.target=el;minigameState.aimTimeout=setTimeout(()=>{if(!minigameState.active)return;if(el.parentNode)el.remove();minigameState.misses++;$('aimMisses').textContent=minigameState.misses;sfxPlayerHit();if(minigameState.misses>=2){minigameState.active=false;trainingLose();}else setTimeout(spawn,300);},minigameState.timeout);})();}
  const ECHO_COLORS=['#e94560','#f1c40f','#4a7dff','#2ecc71'],ECHO_FREQS=[262,330,392,523],ECHO_SYMBOLS=['🔴','🟡','🔵','🟢'];
  function startEcho(){const l=trainingState.level,seqLen=Math.min(2+Math.floor(l*0.6),7),cells=Math.min(4,2+Math.floor(l/4));const seq=[];for(let i=0;i<seqLen;i++)seq.push(rand(0,cells-1));minigameState={sequence:seq,playerIndex:0,showing:true,inputEnabled:false,cells};const g=$('echoGrid');g.style.gridTemplateColumns=`repeat(${Math.min(cells,2)},1fr)`;g.innerHTML='';for(let i=0;i<cells;i++){const c=document.createElement('div');c.className='echo-cell';c.style.background=ECHO_COLORS[i];c.dataset.idx=i;c.textContent=ECHO_SYMBOLS[i];c.addEventListener('click',()=>game.echoClick(i));g.appendChild(c);}$('echoPrompt').textContent='👂';$('echoProgress').textContent=`0/${seqLen}`;minigameState.showing=true;(function pe(idx){if(idx>=minigameState.sequence.length){minigameState.showing=false;minigameState.inputEnabled=true;$('echoPrompt').textContent='🎯';return;}initAudio();const c=document.querySelectorAll('#echoGrid .echo-cell'),ci=minigameState.sequence[idx];c.forEach(x=>x.classList.remove('lit'));c[ci].classList.add('lit');playTone(ECHO_FREQS[ci%ECHO_FREQS.length],0.2,'sine',0.12);setTimeout(()=>{c.forEach(x=>x.classList.remove('lit'));setTimeout(()=>pe(idx+1),200);},300);})(0);}
  function echoClick(idx){if(!minigameState.inputEnabled||minigameState.showing)return;initAudio();const c=document.querySelectorAll('#echoGrid .echo-cell');c[idx].classList.add('active');setTimeout(()=>c[idx].classList.remove('active'),150);playTone(ECHO_FREQS[idx%ECHO_FREQS.length],0.15,'sine',0.10);if(idx!==minigameState.sequence[minigameState.playerIndex]){minigameState.inputEnabled=false;trainingLose();return;}minigameState.playerIndex++;$('echoProgress').textContent=`${minigameState.playerIndex}/${minigameState.sequence.length}`;if(minigameState.playerIndex>=minigameState.sequence.length){minigameState.inputEnabled=false;trainingWin();}}
  const ORDER_POOLS=[{rule:'Nejmenší→Největší',items:[1,2,3,4,5,6],fn:a=>a},{rule:'Největší→Nejmenší',items:[9,7,5,3,1],fn:a=>-a},{rule:'A→Z',items:['👻','🤖','🧟','👽','🦇','🐉'],fn:a=>a},{rule:'Z→A',items:['🐉','🦇','👽','🧟','🤖','👻'],fn:a=>-a},{rule:'Počet písmen',items:['A','AB','ABC','ABCD','ABCDE'],fn:a=>a.length},{rule:'Číselná hodnota',items:['II','IV','VI','VIII','X'],fn:a=>({II:2,IV:4,VI:6,VIII:8,X:10}[a]||0)},{rule:'Sudé⬆️ pak liché',items:[2,4,6,1,3,5],fn:a=>a%2===0?a:a+10}];
  function startOrder(){const l=trainingState.level,pi=(l-1)%ORDER_POOLS.length,pool=ORDER_POOLS[pi],items=shuffle([...pool.items]),cnt=Math.min(3+Math.floor(l/3),items.length),sel=items.slice(0,cnt);minigameState={selected:sel,rule:pool.rule,active:true,orderIndex:0};$('orderAreaInner').innerHTML=`<div class="order-rule">${pool.rule}</div><div class="order-items" id="orderItems">${shuffle([...sel]).map((it,i)=>`<div class="order-item" data-idx="${i}" onclick="game.orderPick(${i})" data-val="${String(it)}">${it}</div>`).join('')}</div>`;$('orderProgress').textContent=`0/${sel.length}`;}
  function orderPick(idx){if(!minigameState.active)return;const items=document.querySelectorAll('#orderItems .order-item'),item=items[idx];if(item.classList.contains('picked'))return;const pi=(trainingState.level-1)%ORDER_POOLS.length,cf=ORDER_POOLS[pi].fn,all=[...minigameState.selected].sort((a,b)=>cf(a)-cf(b));if(String(all[minigameState.orderIndex])===String(item.dataset.val)){item.classList.add('picked');minigameState.orderIndex++;$('orderProgress').textContent=`${minigameState.orderIndex}/${minigameState.selected.length}`;sfxHit();if(minigameState.orderIndex>=minigameState.selected.length){minigameState.active=false;trainingWin();}}else{sfxPlayerHit();trainingLose();}}
  const RV_FREQS=[262,330,392,523],RV_COLORS=['#e94560','#f1c40f','#4a7dff','#2ecc71'],RV_SYMS=['⭐','🔥','💧','🌿'];
  function startReverse(){const l=trainingState.level,seqLen=Math.min(2+Math.floor(l*0.5),5),pl=[];for(let i=0;i<seqLen;i++)pl.push(rand(0,3));const isC=Math.random()<0.5,bs=[...pl].reverse();if(!isC){const bi=rand(0,bs.length-1);let nn;do{nn=rand(0,3);}while(nn===bs[bi]);bs[bi]=nn;}minigameState={active:true,phase:'input',playerSeq:pl,bossSeq:bs,isCorrectReverse:isC,playerInputIndex:0,inputEnabled:true};const bc=$('reverseButtons');bc.innerHTML='';for(let i=0;i<4;i++){const b=document.createElement('div');b.className='reverse-btn';b.style.background=RV_COLORS[i];b.textContent=RV_SYMS[i];b.dataset.idx=i;b.addEventListener('click',()=>game.reverseInput(i));bc.appendChild(b);}$('reversePrompt').textContent='🎵 ťukej!';$('reverseBossPlay').style.display='none';$('reverseAnswerBtns').style.display='none';}
  function reverseInput(idx){if(!minigameState.active||!minigameState.inputEnabled||minigameState.phase!=='input')return;const ms=minigameState;initAudio();const b=document.querySelectorAll('#reverseButtons .reverse-btn');b[idx].classList.add('active');setTimeout(()=>b[idx].classList.remove('active'),150);playTone(RV_FREQS[idx],0.15,'sine',0.10);if(idx!==ms.playerSeq[ms.playerInputIndex]){ms.inputEnabled=false;ms.active=false;trainingLose();return;}ms.playerInputIndex++;if(ms.playerInputIndex>=ms.playerSeq.length){ms.phase='playing';ms.inputEnabled=false;$('reversePrompt').textContent='👂';$('reverseBossPlay').style.display='block';(function pb(idx){if(idx>=ms.bossSeq.length){ms.phase='answer';$('reversePrompt').textContent='🤔?';$('reverseBossPlay').textContent='👹 Klikni!';$('reverseAnswerBtns').style.display='flex';return;}initAudio();const b=document.querySelectorAll('#reverseButtons .reverse-btn'),ci=ms.bossSeq[idx];b.forEach(x=>x.classList.remove('active'));b[ci].classList.add('active');playTone(RV_FREQS[ci%RV_FREQS.length],0.2,'sine',0.12);$('reverseBossPlay').textContent=`👹 ${idx+1}/${ms.bossSeq.length}`;setTimeout(()=>{b.forEach(x=>x.classList.remove('active'));setTimeout(()=>pb(idx+1),200);},350);})(0);}}
  function reverseAnswer(a){if(!minigameState.active||minigameState.phase!=='answer')return;minigameState.active=false;if(a===minigameState.isCorrectReverse){sfxSuccess();trainingWin();}else{sfxPlayerHit();trainingLose();}}

  // ===== ACHIEVEMENTS =====
  const ACHIEVEMENTS=[
    {id:'first_win',name:'🎯 První výhra',desc:'Vyhraj první souboj',check:s=>s.wins>=1},
    {id:'first_skill',name:'📖 První kouzlo',desc:'Lv.1 v kouzle',check:s=>SKILLS.some(sk=>(s.skills[sk.id]||0)>=1)},
    {id:'skill_5',name:'🧙 5 kouzel',desc:'5 kouzel Lv.1+',check:s=>SKILLS.filter(sk=>(s.skills[sk.id]||0)>=1).length>=5},
    {id:'all_skills',name:'🌟 Všechna kouzla',desc:'8 kouzel Lv.1+',check:s=>SKILLS.every(sk=>(s.skills[sk.id]||0)>=1)},
    {id:'max_skill',name:'💎 První MAX',desc:'Kouzlo na Lv.10',check:s=>SKILLS.some(sk=>(s.skills[sk.id]||0)>=10)},
    {id:'hero_5',name:'👤 Hrdina Lv.5',desc:'Hrdina Lv.5',check:s=>s.hero.level>=5},
    {id:'hero_10',name:'👑 Hrdina Lv.10',desc:'Hrdina Lv.10',check:s=>s.hero.level>=10},
    {id:'first_boss',name:'👹 První boss',desc:'Poraz prvního bosse',check:s=>s.bossesDefeated.some(Boolean)},
    {id:'all_bosses',name:'⚜️ Všichni bossové',desc:'Poraz všech 8 bossů',check:s=>s.bossesDefeated.every(Boolean)},
    {id:'ten_wins',name:'🏆 10 výher',desc:'10 výher',check:s=>s.wins>=10},
    {id:'fifty_wins',name:'💫 50 výher',desc:'50 výher',check:s=>s.wins>=50},
    {id:'first_weapon',name:'🗡️ Zbraň',desc:'Lepší zbraň než pěsti',check:s=>s.hero.weapon!=='fists'},
    {id:'first_armor',name:'🦺 Brnění',desc:'Lepší brnění než hadry',check:s=>s.hero.armor!=='rags'},
  ];
  function checkAchievements(){
    if(!state.achievements)state.achievements={};
    ACHIEVEMENTS.forEach(a=>{if(!state.achievements[a.id]&&a.check(state)){state.achievements[a.id]=true;saveGame();showAchievementPopup(a);}});
  }
  function showAchievementPopup(a){const p=document.createElement('div');p.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:300;background:#12122a;border:2px solid #f1c40f;border-radius:12px;padding:16px 24px;text-align:center;animation:enemyEnter 0.5s ease-out;max-width:360px;width:90%';p.innerHTML=`<div style="font-size:24px;margin-bottom:4px">🏅</div><div style="font-size:14px;font-weight:bold;color:#f1c40f">${a.name}</div><div style="font-size:11px;color:#8888aa;margin-top:2px">${a.desc}</div>`;document.body.appendChild(p);setTimeout(()=>{p.style.transition='opacity 0.5s';p.style.opacity='0';setTimeout(()=>p.remove(),500);},2500);}
  function showMedals(){
    // Odstranit starou medalScreen, aby se nehromadily
    const old = $('medalScreen');
    if (old) old.remove();
    let h='<div class="card"><div class="card-title">🏅 Úspěchy</div></div>';
    ACHIEVEMENTS.forEach(a=>{const e=state.achievements&&state.achievements[a.id];h+=`<div class="card" style="${e?'border-color:#2ecc71':'opacity:0.5'}"><div class="flex-between"><div><div style="font-size:14px;font-weight:bold">${e?a.name:'🔒 '+a.name}</div><div style="font-size:11px;color:#8888aa">${a.desc}</div></div><div style="font-size:20px">${e?'✅':'⏳'}</div></div></div>`;});
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
    if (!state.bossesDefeated || state.bossesDefeated.length < 8) state.bossesDefeated = [false,false,false,false,false,false,false,false];
    if (!state.locationProgress || state.locationProgress.length < 8) state.locationProgress = [0,0,0,0,0,0,0,0];
    if (!state.hero) state.hero = { level:1, xp:0, gold:0, hp:3, maxHp:3, baseDmg:2, weapon:'fists', armor:'rags' };
    if (state.hero.maxHp === undefined) state.hero.maxHp = 3;

    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (a.dataset.screen === 'map') showScreen('map');
        else if (a.dataset.screen === 'tower') showScreen('tower');
        else if (a.dataset.screen === 'hero') showScreen('hero');
        else if (a.dataset.screen === 'medals') showMedals();
        else if (a.dataset.screen === 'reset') resetGame();
      });
    });
    showScreen('map');
  }

  window.game = {
    showScreen, enterLocation, enterTraining,
    simonClick, colorInput, gridPick, judgeAnswer, echoClick, orderPick, reverseInput, reverseAnswer
  };
  init();
})();
