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

  // ===== SPELLS & SKILLS =====
  const SKILLS = [
    { id:'fireball', name:'Fireball', icon:'🔥', dungeon:'simon', dungeonName:'🌲 Les stínů', maxLv:10,
      desc:t=>`${t===0?'Zamčeno':`Lv.${t}: ${t*2+3} dmg + ${t} DoT po 3 kola`}`,
      baseCd:6, cdReduction:0.3, // každý level -0.3s cooldown
      effect: (l,bs) => { bs.bossDmg -= l*2+3; bs.dot += l; } },
    { id:'lightning', name:'Blesk', icon:'⚡', dungeon:'judge', dungeonName:'⚖️ Pekelný tribunál', maxLv:10,
      desc:t=>`${t===0?'Zamčeno':`Lv.${t}: ${t*3+2} dmg + stun (1 kolo)`}`,
      baseCd:8, cdReduction:0.4,
      effect: (l,bs) => { bs.bossDmg -= l*3+2; bs.stunTurns += 1; } },
    { id:'shield', name:'Štít', icon:'🛡️', dungeon:'color', dungeonName:'🏜️ Pouštní nekropole', maxLv:10,
      desc:t=>`${t===0?'Zamčeno':`Lv.${t}: Blok ${t*10+10}% útoku (${t>=5?'odrazí':'pouze blok'})`}`,
      baseCd:9, cdReduction:0.3,
      effect: (l,bs) => { bs.block += l*10+10; } },
    { id:'heal', name:'Léčení', icon:'💚', dungeon:'grid', dungeonName:'⏳ Zřícenina času', maxLv:10,
      desc:t=>`${t===0?'Zamčeno':`Lv.${t}: Léčí ${t+2} HP`}`,
      baseCd:12, cdReduction:0.5,
      effect: (l,bs) => { bs.playerHeal += l+2; } },
    { id:'crit', name:'Kritický zásah', icon:'🗡️', dungeon:'aim', dungeonName:'🎯 Temná aréna', maxLv:10,
      desc:t=>`${t===0?'Zamčeno':`Lv.${t}: ${t*5+10}% crit chance x${t*0.2+1} dmg`}`,
      baseCd:0, cdReduction:0, // passive
      effect: (l,bs) => { bs.critChance += l*5+10; bs.critMult += l*0.2+1; } },
    { id:'clone', name:'Klon', icon:'🌀', dungeon:'echo', dungeonName:'🔊 Ozvěny jeskyně', maxLv:10,
      desc:t=>`${t===0?'Zamčeno':`Lv.${t}: ${t*8+10}% šance, že boss zaútočí na klona`}`,
      baseCd:14, cdReduction:0.5,
      effect: (l,bs) => { bs.cloneChance += l*8+10; } },
    { id:'freeze', name:'Mráz', icon:'❄️', dungeon:'order', dungeonName:'🧩 Labyrint pravidel', maxLv:10,
      desc:t=>`${t===0?'Zamčeno':`Lv.${t}: ${t+1}kolo zpomalení (2× delší okno)`}`,
      baseCd:10, cdReduction:0.4,
      effect: (l,bs) => { bs.freezeTurns += l+1; } },
    { id:'shadow', name:'Stín', icon:'🌑', dungeon:'reverse', dungeonName:'🔄 Zrcadlová síň', maxLv:10,
      desc:t=>`${t===0?'Zamčeno':`Lv.${t}: ${t*4+5} dmg zezadu (ignoruje obranu)`}`,
      baseCd:10, cdReduction:0.4,
      effect: (l,bs) => { bs.shadowDmg += l*4+5; } },
  ];
  const SKILL_MAP = {}; SKILLS.forEach(s => SKILL_MAP[s.id] = s);

  // XP needed per skill level
  function skillXpToLevel(lv) { return 3 + lv * 2; }

  // ===== STATE =====
  let state = {};
  let battleState = {};   // training mode
  let bossState = {};     // boss fight mode
  let minigameState = {};
  let _activeIntervals = []; // pro cleanup proti sekání

  function cleanupTimers() {
    _activeIntervals.forEach(id => { try { clearInterval(id); } catch {} });
    _activeIntervals = [];
    if (minigameState.timerInterval) { clearInterval(minigameState.timerInterval); minigameState.timerInterval = null; }
    if (minigameState.aimTimeout) { clearTimeout(minigameState.aimTimeout); minigameState.aimTimeout = null; }
    if (minigameState.countdownInterval) { clearInterval(minigameState.countdownInterval); minigameState.countdownInterval = null; }
    ['simonTimeout','echoTimeout','reverseTimeout'].forEach(k => {
      if (minigameState[k]) { clearTimeout(minigameState[k]); delete minigameState[k]; }
    });
    // cleanup all timeouts with a sweep
    let id = window.setTimeout(()=>{},0);
    while(id--) window.clearTimeout(id);
  }

  const SAVE_KEY = 'dungeonRecallV5';
  function defaultState() {
    const s = { skills: {}, skillXp: {}, hero: { level:1, xp:0, gold:0, hp:3, maxHp:3, baseDmg:2, weapon:'fists', armor:'rags' }, deaths:0, wins:0, bossMedals:[[],[],[],[],[],[],[],[]].map(()=>[false,false,false,false,false]), achievements:{}, dungeonProgress:[0,0,0,0,0,0,0,0] };
    SKILLS.forEach(sk => { s.skills[sk.id] = 0; s.skillXp[sk.id] = 0; });
    return s;
  }
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.skills) return s; } catch {}
    return defaultState();
  }
  function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function resetGame() { state = defaultState(); saveGame(); showScreen('hero'); }

  // ===== SCREENS =====
  const SCREEN_IDS = { hero:'heroScreen', dungeons:'dungeonsScreen', battle:'battleScreen', bossFight:'bossFightScreen', result:'resultScreen', medals:'medalScreen' };
  function showScreen(name) {
    cleanupTimers();
    // Remove dynamic medal screen if exists
    if (name !== 'medals') { const m = $('medalScreen'); if (m) m.remove(); }
    Object.values(SCREEN_IDS).forEach(id => {
      const el = $(id);
      if (!el) return;
      if (id === SCREEN_IDS[name]) { el.classList.remove('hidden'); el.classList.add('active'); }
      else { el.classList.add('hidden'); el.classList.remove('active'); }
    });
    if (name === 'hero') renderHero();
    else if (name === 'dungeons') renderDungeons();
    else if (name === 'medals') showMedals();
  }

  // ===== HERO =====
  function renderHero() {
    const h = state.hero;
    const totalLv = SKILLS.reduce((s,sk) => s + (state.skills[sk.id]||0), 0);
    $('heroName').textContent = 'Dobrodruh';
    $('heroLevel').textContent = `Lv.${h.level}`;
    $('heroHp').textContent = h.maxHp;
    $('heroDmg').textContent = h.baseDmg;
    $('heroDef').textContent = h.armor === 'rags' ? 0 : h.armor === 'leather' ? 1 : h.armor === 'chainmail' ? 2 : h.armor === 'plate' ? 3 : 0;
    $('heroGold').textContent = h.gold;
    $('totalSkillLevel').textContent = `${totalLv}/${SKILLS.length*10}`;

    // Skill grid
    $('skillGrid').innerHTML = SKILLS.map(sk => {
      const lv = state.skills[sk.id] || 0;
      const xp = state.skillXp[sk.id] || 0;
      const needed = skillXpToLevel(lv);
      const pct = lv >= sk.maxLv ? 100 : Math.min(xp / needed * 100, 100);
      const locked = lv === 0;
      const maxed = lv >= sk.maxLv;
      return `<div class="skill-card ${locked?'locked':''} ${maxed?'maxed':''}" onclick="game.enterDungeonBySkill('${sk.id}')">
        <div class="skill-icon">${sk.icon}</div>
        <div class="skill-name">${sk.name}</div>
        <div class="skill-level">${locked?'🔒':`Lv.${lv}`}</div>
        <div class="skill-bar-wrap"><div class="skill-bar-fill" style="width:${pct}%;background:${maxed?'#2ecc71':locked?'#555':'#f1c40f'}"></div></div>
        <div style="font-size:9px;color:#888">${maxed?'MAX':locked?sk.dungeonName:`${xp}/${needed} XP`}</div>
      </div>`;
    }).join('');

    // Equipment
    const weaponNames = { fists:'✊ Pěsti', dagger:'🗡️ Dýka', sword:'⚔️ Meč', flameSword:'🔥 Ohnivý meč' };
    const armorNames = { rags:'🧥 Hadry', leather:'🦺 Kožené', chainmail:'⛓️ Kroužková', plate:'🛡️ Plátová' };
    $('equipWeapon').textContent = weaponNames[h.weapon] || '✊ Pěsti';
    $('equipArmor').textContent = armorNames[h.armor] || '🧥 Hadry';
    $('equipInventory').textContent = '—';

    // Boss list
    $('bossList').innerHTML = BOSSES.map((b, i) => {
      const defeated = state.bossMedals && state.bossMedals[i] && state.bossMedals[i][0];
      const sk = SKILL_MAP[b.skill];
      const lv = state.skills[b.skill] || 0;
      const locked = lv < b.minSkillLv;
      return `<div class="dungeon-card ${defeated?'completed':''}" onclick="game.startBossFight(${i})" style="padding:8px 12px;margin:0">
        <div class="flex-between">
          <span>${defeated?'✅':locked?'🔒':''} ${b.face} ${b.name}</span>
          <span style="font-size:11px;color:#8888aa">${defeated?'Poražen':locked?`${sk.icon} Lv.${b.minSkillLv}`:`❤️${b.hp}`}</span>
        </div>
      </div>`;
    }).join('');
  }

  // ===== DUNGEONS (TRAINING) =====
  function renderDungeons() {
    const totalLv = SKILLS.reduce((s,sk) => s + (state.skills[sk.id]||0), 0);
    $('totalProgress').textContent = `📊 Trénink kouzel: ${totalLv}/${SKILLS.length*10} levelů celkem`;
    $('dungeonList').innerHTML = SKILLS.map(sk => {
      const lv = state.skills[sk.id] || 0;
      const xp = state.skillXp[sk.id] || 0;
      const needed = skillXpToLevel(lv);
      const pct = lv >= sk.maxLv ? 100 : Math.min(xp / needed * 100, 100);
      const maxed = lv >= sk.maxLv;
      return `<div class="dungeon-card ${maxed?'completed':''}" onclick="game.enterTraining('${sk.id}')">
        <div class="flex-between">
          <div class="dungeon-name">${sk.icon} ${sk.dungeonName}</div>
          <span class="badge ${sk.dungeon}">${sk.name}</span>
        </div>
        <div class="dungeon-progress-wrap"><div class="dungeon-progress-bar" style="width:${pct}%;background:${maxed?'#2ecc71':'#4a7dff'}"></div></div>
        <div class="flex-between" style="margin-top:4px;font-size:12px;color:#8888aa">
          <span>${maxed?'✅ MAX':`Lv.${lv} · ${xp}/${needed} XP`}</span>
          <span>${sk.desc(lv)}</span>
        </div>
      </div>`;
    }).join('');
  }

  function enterTraining(skillId) {
    const sk = SKILL_MAP[skillId];
    if (!sk) return;
    const lv = state.skills[skillId] || 0;
    const maxed = lv >= sk.maxLv;
    battleState = {
      skillId, skill: sk,
      level: Math.min(10, lv + 1),
      round: 0, ended: false, firstRound: true,
      playerHp: 1, // training = 1 HP (one mistake = death)
      xpGained: 0
    };
    showScreen('battle');
    updateTrainingUI();
    startTrainingRound();
  }

  function updateTrainingUI() {
    const bs = battleState;
    const sk = bs.skill;
    $('enemyName').textContent = sk.icon + ' ' + sk.dungeonName;
    $('gameTypeBadge').textContent = sk.name;
    $('floorNum').textContent = `Trénink · Lv.${Math.min(10,(state.skills[bs.skillId]||0)+1)}`;
    $('playerHearts').textContent = '❤️'.repeat(bs.playerHp);
    $('playerHeartsLost').textContent = bs.playerHp <= 0 ? '' : '';
    const faces = { simon:'👻', judge:'📜', color:'🏹', grid:'🗿', aim:'🎯', echo:'🔊', order:'🧩', reverse:'🔄' };
    $('enemyFace').textContent = faces[sk.dungeon] || '👾';
  }

  function startTrainingRound() {
    if (battleState.ended) return;
    if (battleState.playerHp <= 0) { endTraining(false); return; }
    battleState.round++;
    minigameState = {};
    hideAllMinigames();
    if (battleState.firstRound) {
      battleState.firstRound = false;
      showCountdown(1, () => showMinigame(battleState.skill.dungeon));
    } else {
      showMinigame(battleState.skill.dungeon);
    }
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
    battleState.ended = true;
    if (won) {
      const skId = battleState.skillId;
      const sk = SKILL_MAP[skId];
      const lv = state.skills[skId] || 0;
      if (lv < sk.maxLv) {
        const needed = skillXpToLevel(lv);
        state.skillXp[skId] = (state.skillXp[skId] || 0) + 1;
        if (state.skillXp[skId] >= needed) {
          state.skillXp[skId] = 0;
          state.skills[skId] = lv + 1;
          // Hero level up
          state.hero.xp = (state.hero.xp || 0) + 1;
          if (state.hero.xp >= state.hero.level * 2) {
            state.hero.xp = 0;
            state.hero.level++;
            state.hero.maxHp = Math.min(10, 3 + Math.floor(state.hero.level / 2));
            state.hero.baseDmg = Math.min(10, 2 + Math.floor(state.hero.level / 2));
          }
          sfxLevelUp();
          $('resultIcon').textContent = '⬆️';
          $('resultTitle').textContent = `${sk.icon} Level UP! Lv.${lv+1}`;
          $('resultMsg').textContent = sk.desc(lv+1);
          if (lv + 1 >= 10) $('resultMsg').textContent += ' [MAX]';
          $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.showScreen('dungeons')">🗺️ Zpět na trénink</button><button class="btn btn-secondary" onclick="game.enterTraining('${skId}')">🔄 Další trénink</button>`;
        } else {
          $('resultIcon').textContent = '✅';
          $('resultTitle').textContent = `${sk.icon} Trénink úspěšný!`;
          $('resultMsg').textContent = `XP: ${state.skillXp[skId]}/${needed}`;
          $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterTraining('${skId}')">🔄 Další kolo</button><button class="btn btn-secondary" onclick="game.showScreen('hero')">👤 Hrdina</button>`;
        }
      } else {
        $('resultIcon').textContent = '🏆';
        $('resultTitle').textContent = `${sk.icon} MAX level!`;
        $('resultMsg').textContent = 'Toto kouzlo je již na maximu';
        $('resultBtn').innerHTML = `<button class="btn btn-secondary" onclick="game.showScreen('dungeons')">🗺️ Jiný trénink</button>`;
      }
      state.wins = (state.wins || 0) + 1;
    } else {
      $('resultIcon').textContent = '💀';
      $('resultTitle').textContent = 'Trénink neúspěšný';
      $('resultMsg').textContent = 'Zkus to znovu!';
      state.deaths = (state.deaths || 0) + 1;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterTraining('${battleState.skillId}')">🔄 Znovu</button><button class="btn btn-secondary" onclick="game.showScreen('hero')">👤 Hrdina</button>`;
    }
    saveGame();
    checkAchievements();
    showScreen('result');
  }

  // ===== MINIGAME IMPLEMENTATIONS =====
  // === SIMON ===
  const SIMON_SYMBOLS = ['⚡','🔥','💧','🌿','💎','☀️','🌙','🍀','🌀','⭐','🌈','🦋','🍄','🌊','❄️','🎯'];
  const SIMON_COLORS = ['#e94560','#f1c40f','#4a7dff','#2ecc71','#9b59b6','#e67e22','#1abc9c','#2c3e50','#d35400','#f39c12','#16a085','#c0392b','#8e44ad','#2980b9','#bdc3c7','#7f8c8d'];
  const SIMON_FREQS = [73.42*4,87.31*4,110.0*4,146.84*2,164.81*2,196.0*2,220.0*2,246.94*2];
  function startSimon() {
    const level = battleState.level;
    const gridSize = Math.min(2+Math.floor(level/3),4);
    const nc = gridSize*gridSize;
    const seqLen = Math.min(3+Math.floor(level*0.8),10);
    const sym = shuffle([...SIMON_SYMBOLS]).slice(0,nc);
    const cols = SIMON_COLORS.slice(0,nc);
    minigameState={sequence:[],playerIndex:0,showing:true,inputEnabled:false,symbols:sym,gridSize,seqLen};
    for(let i=0;i<seqLen;i++) minigameState.sequence.push(rand(0,nc-1));
    const g=$('simonGrid');g.style.gridTemplateColumns=`repeat(${gridSize},1fr)`;
    g.innerHTML=sym.map((s,i)=>`<div class="simon-cell" data-idx="${i}" style="background:${cols[i]}" onclick="game.simonClick(${i})"><span style="font-size:${gridSize<=3?'28px':'20px'};pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%">${s}</span></div>`).join('');
    $('simonPrompt').textContent='👀 Zapamatuj si sekvenci!';
    $('simonProgress').textContent=`0/${seqLen}`;
    let delay=Math.max(100,300-level*20);
    minigameState.showing=true;
    (function playSeq(idx){if(idx>=minigameState.sequence.length){minigameState.showing=false;minigameState.inputEnabled=true;$('simonPrompt').textContent='🎯 Zopakuj!';return;}
      initAudio();const c=document.querySelectorAll('#simonGrid .simon-cell'),ci=minigameState.sequence[idx];c.forEach(x=>x.classList.remove('lit'));c[ci].classList.add('lit');playTone(SIMON_FREQS[ci%SIMON_FREQS.length],0.13,'sine',0.12);
      setTimeout(()=>{c.forEach(x=>x.classList.remove('lit'));setTimeout(()=>playSeq(idx+1),60);},delay);})(0);
  }
  function simonClick(idx){
    if(!minigameState.inputEnabled||minigameState.showing) return;
    initAudio();const c=document.querySelectorAll('#simonGrid .simon-cell');
    c[idx].classList.add('active');setTimeout(()=>c[idx].classList.remove('active'),150);
    playTone(SIMON_FREQS[idx%SIMON_FREQS.length],0.12,'sine',0.10);
    if(idx!==minigameState.sequence[minigameState.playerIndex]){minigameState.inputEnabled=false;trainingLose();return;}
    minigameState.playerIndex++;$('simonProgress').textContent=`${minigameState.playerIndex}/${minigameState.sequence.length}`;
    if(minigameState.playerIndex>=minigameState.sequence.length){minigameState.inputEnabled=false;trainingWin();}
  }
  // === COLOR ===
  function startColorClash(){
    const level=battleState.level,fd=Math.max(0.8,2.8-level*0.25).toFixed(2);
    const colors=['red','blue','green','yellow'],cl={red:'🔴',blue:'🔵',green:'🟢',yellow:'🟡'};
    const a=$('colorArena');a.innerHTML='';a.style.height='200px';a.style.display='flex';a.style.flexDirection='column';
    const ld=document.createElement('div');ld.style.cssText='display:flex;flex:1;';
    ld.innerHTML=colors.map(c=>`<div class="color-lane" data-color="${c}" style="flex:1;text-align:center;padding-top:6px;font-size:22px;border-right:1px solid #1a1a3a">${cl[c]}</div>`).join('');a.appendChild(ld);
    const br=document.createElement('div');br.style.cssText='display:flex;height:44px;';
    br.innerHTML=colors.map(c=>{const bg=c==='red'?'#e94560':c==='blue'?'#4a7dff':c==='green'?'#2ecc71':'#f1c40f';return `<div style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;background:${bg};margin:2px;border-radius:6px;font-size:14px;color:#fff;font-weight:bold" onclick="game.colorInput('${c}')">${cl[c]}</div>`;}).join('');a.appendChild(br);
    minigameState={active:true,colors,arena:a,projectile:null,currentColor:null,fallDuration:fd};
    (function spawn(){if(!minigameState.active)return;const a=minigameState.arena,col=minigameState.colors[rand(0,3)];if(minigameState.projectile&&minigameState.projectile.parentNode)minigameState.projectile.remove();const l=a.querySelectorAll('.color-lane'),li=minigameState.colors.indexOf(col),lane=l[li];if(!lane){setTimeout(spawn,100);return;}const lr=lane.getBoundingClientRect(),ar=a.getBoundingClientRect(),lx=lr.left-ar.left+lr.width/2-16;const el=document.createElement('div');el.className='color-projectile';el.style.cssText=`left:${lx}px;top:0px;background:${col==='red'?'#e94560':col==='blue'?'#4a7dff':col==='green'?'#2ecc71':'#f1c40f'};width:32px;height:32px;border-radius:50%;border:2px solid #fff;position:absolute;transition:top ${minigameState.fallDuration}s linear`;el.dataset.color=col;el.addEventListener('transitionend',()=>{if(minigameState.active&&minigameState.projectile===el){minigameState.active=false;el.remove();trainingLose();}});a.appendChild(el);minigameState.projectile=el;minigameState.currentColor=col;requestAnimationFrame(()=>{el.style.top='160px';});})();
  }
  function colorInput(c){if(!minigameState.active)return;if(c===minigameState.currentColor){minigameState.active=false;if(minigameState.projectile){const e=minigameState.projectile;e.style.transition='transform 0.2s, opacity 0.2s';e.style.transform='scale(2.5)';e.style.opacity='0';setTimeout(()=>e.remove(),200);}sfxHit();trainingWin();}}
  // === GRID ===
  function startGridDefender(){
    const level=battleState.level,numOptions=3,maxNum=5+level*2,target=rand(3,maxNum),ops=['+','-','×'],options=[],used=new Set();
    const cop=ops[rand(0,2)];let a,b,ex,res;
    for(let t=0;t<50;t++){if(cop==='+'){a=rand(1,target-1);b=target-a;ex=`${a}+${b}`;res=a+b;}else if(cop==='-'){a=rand(target+1,target+maxNum);b=a-target;ex=`${a}-${b}`;res=a-b;}else{const f=[];for(let i=1;i<=Math.sqrt(target);i++){if(target%i===0)f.push(i);}if(f.length>1){a=f[rand(1,f.length-1)];b=target/a;ex=`${a}×${b}`;res=a*b;}else{a=rand(1,3);b=target;ex=`${a}×${b}`;res=a*b;}}if(!used.has(ex)&&res===target){used.add(ex);break;}}
    options.push({value:res,expr:ex,wins:true});
    const cv=[];for(let d=1;d<=3;d++){if(res-d>=1)cv.push(res-d);if(res+d!==target)cv.push(res+d);}shuffle(cv);
    for(let i=1;i<numOptions;i++){const fr=cv.length>0?cv.shift():rand(1,maxNum+5);let fe;for(let t=0;t<30;t++){const op=ops[rand(0,2)];let ba,bb,bex,bres;if(op==='+'){ba=rand(1,maxNum);bb=rand(1,maxNum);bex=`${ba}+${bb}`;bres=ba+bb;}else if(op==='-'){ba=rand(1,maxNum*2);bb=rand(1,ba-1);bex=`${ba}-${bb}`;bres=ba-bb;}else{ba=rand(1,5);bb=rand(1,5);bex=`${ba}×${bb}`;bres=ba*bb;}if(!used.has(bex)&&bres===fr){used.add(bex);options.push({value:bres,expr:bex,wins:false});fe=true;break;}}if(!fe){for(let t=0;t<50;t++){const op=ops[rand(0,2)];let ba,bb,bex,bres;if(op==='+'){ba=rand(1,maxNum);bb=rand(1,maxNum);bex=`${ba}+${bb}`;bres=ba+bb;}else if(op==='-'){ba=rand(1,maxNum*2);bb=rand(1,ba-1);bex=`${ba}-${bb}`;bres=ba-bb;}else{ba=rand(1,5);bb=rand(1,5);bex=`${ba}×${bb}`;bres=ba*bb;}if(!used.has(bex)&&Math.abs(bres-fr)<=1){used.add(bex);options.push({value:bres,expr:bex,wins:false});break;}}}}
    shuffle(options);
    const timerDuration=Math.max(3,6-Math.floor(level/3));
    minigameState={options,target,active:true,timer:timerDuration};
    $('gridArea').innerHTML=`<div class="grid-info"><span class="grid-time" id="gridTimer">${timerDuration}s</span><span class="grid-target">👹 Najdi: <strong>${target}</strong></span></div><div class="grid-cards">${options.map((o,i)=>`<div class="grid-card" onclick="game.gridPick(${i})"><span class="expr">${o.expr}</span></div>`).join('')}</div>`;
    const te=$('gridTimer');if(te){minigameState.timerInterval=setInterval(()=>{minigameState.timer--;te.textContent=minigameState.timer+'s';if(minigameState.timer<=0){clearInterval(minigameState.timerInterval);if(minigameState.active){minigameState.active=false;trainingLose();}}},1000);}
  }
  function gridPick(idx){if(!minigameState.active)return;minigameState.active=false;if(minigameState.timerInterval)clearInterval(minigameState.timerInterval);if(minigameState.options[idx].wins){sfxSuccess();trainingWin();}else{sfxPlayerHit();trainingLose();}}
  // === JUDGE ===
  const JUDGE_STATEMENTS={easy:[{text:'6×7=42',answer:true},{text:'Voda vaří při 100°C',answer:true},{text:'Země je plochá',answer:false},{text:'12 dělitelné 3',answer:true},{text:'Čtverec má 5 stran',answer:false},{text:'Žralok je savec',answer:false},{text:'Slunce vychází na východě',answer:true},{text:'Týden má 7 dní',answer:true},{text:'Měsíc větší než Země',answer:false},{text:'5×5=25',answer:true},{text:'Kočka má 9 životů',answer:false},{text:'8+4=11',answer:false}],medium:[{text:'1+2×3=9',answer:false},{text:'Krychle má 8 vrcholů',answer:true},{text:'0 je sudé číslo',answer:true},{text:'24 dělitelné 7',answer:false},{text:'Praha je hl. město Polska',answer:false},{text:'Všechna prvočísla lichá',answer:false},{text:'Antarktida je poušť',answer:true},{text:'Delfín je ryba',answer:false},{text:'2+3×4=20',answer:false},{text:'Průměr 2,8,14 je 8',answer:true}],hard:[{text:'3²+4²=5²',answer:true},{text:'0,5×20=12',answer:false},{text:'Sudé×liché=vždy sudé',answer:true},{text:'48/6=8',answer:true},{text:'121 je prvočíslo',answer:false},{text:'(8−3)×2=10',answer:true},{text:'Dva zápory dají klad',answer:true},{text:'Kg je jednotka síly',answer:false},{text:'Hlemýžď má 25000 zubů',answer:true}]};
  function startJudge(){
    const level=battleState.level;let f;if(level<=3)f=JUDGE_STATEMENTS.easy;else if(level<=6)f=[...JUDGE_STATEMENTS.easy,...JUDGE_STATEMENTS.medium];else f=[...JUDGE_STATEMENTS.medium,...JUDGE_STATEMENTS.hard];
    const st=f[rand(0,f.length-1)],td=Math.max(3,6-Math.floor(level/3));
    minigameState={active:true,statement:st,timer:td};
    $('judgeStatement').textContent=st.text;$('judgeTimer').textContent=td+'s';
    if(minigameState.timerInterval)clearInterval(minigameState.timerInterval);minigameState.timerInterval=setInterval(()=>{minigameState.timer--;$('judgeTimer').textContent=minigameState.timer+'s';if(minigameState.timer<=0){clearInterval(minigameState.timerInterval);if(minigameState.active){minigameState.active=false;trainingLose();}}},1000);
  }
  function judgeAnswer(a){if(!minigameState.active)return;minigameState.active=false;if(minigameState.timerInterval)clearInterval(minigameState.timerInterval);if(a===minigameState.statement.answer){sfxSuccess();trainingWin();}else{sfxPlayerHit();trainingLose();}}
  // === AIM ===
  function startAim(){const l=battleState.level,rh=3+Math.floor(l/2),ts=Math.max(28,55-l*3),to=Math.max(600,1800-l*120);minigameState={active:true,hits:0,misses:0,requiredHits:rh,targetSize:ts,timeout:to};$('aimHits').textContent='🎯0';$('aimMisses').textContent='❌0';$('aimPrompt').textContent=`🎯 Treť ${rh}×!`;$('aimArena').innerHTML='';spawnAim();}
  function spawnAim(){if(!minigameState.active)return;const a=$('aimArena');if(minigameState.target&&minigameState.target.parentNode)minigameState.target.remove();const aw=a.clientWidth||300,ah=a.clientHeight||200,s=minigameState.targetSize,x=rand(10,Math.max(11,aw-s-10)),y=rand(10,Math.max(11,ah-s-10));const el=document.createElement('div');el.className='aim-target';el.style.cssText=`left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${['#e94560','#f1c40f','#2ecc71','#4a7dff'][rand(0,3)]}`;el.addEventListener('click',e=>{e.stopPropagation();onAimHit();});a.appendChild(el);minigameState.target=el;minigameState.aimTimeout=setTimeout(()=>{if(!minigameState.active)return;if(el.parentNode)el.remove();onAimMiss(true);},minigameState.timeout);}
  function onAimHit(){if(!minigameState.active)return;minigameState.hits++;clearTimeout(minigameState.aimTimeout);if(minigameState.target&&minigameState.target.parentNode)minigameState.target.remove();$('aimHits').textContent=`🎯${minigameState.hits}`;sfxHit();if(minigameState.hits>=minigameState.requiredHits){minigameState.active=false;trainingWin();}else setTimeout(spawnAim,200);}
  function onAimMiss(f){if(!minigameState.active)return;minigameState.misses++;clearTimeout(minigameState.aimTimeout);$('aimMisses').textContent=`❌${minigameState.misses}`;if(f)sfxPlayerHit();if(minigameState.misses>=2){minigameState.active=false;trainingLose();}else setTimeout(spawnAim,300);}
  // === ECHO ===
  const ECHO_COLORS=['#e94560','#f1c40f','#4a7dff','#2ecc71'],ECHO_FREQS=[262,330,392,523],ECHO_SYMBOLS=['🔴','🟡','🔵','🟢'];
  function startEcho(){const l=battleState.level,seqLen=Math.min(2+Math.floor(l*0.6),7),cells=Math.min(4,2+Math.floor(l/4));const seq=[];for(let i=0;i<seqLen;i++)seq.push(rand(0,cells-1));minigameState={sequence:seq,playerIndex:0,showing:true,inputEnabled:false,cells};const g=$('echoGrid');g.style.gridTemplateColumns=`repeat(${Math.min(cells,2)},1fr)`;g.innerHTML='';for(let i=0;i<cells;i++){const c=document.createElement('div');c.className='echo-cell';c.style.background=ECHO_COLORS[i];c.dataset.idx=i;c.textContent=ECHO_SYMBOLS[i];c.addEventListener('click',()=>game.echoClick(i));g.appendChild(c);}$('echoPrompt').textContent='👂 Poslouchej!';$('echoProgress').textContent=`0/${seqLen}`;minigameState.showing=true;(function playE(idx){if(idx>=minigameState.sequence.length){minigameState.showing=false;minigameState.inputEnabled=true;$('echoPrompt').textContent='🎯 Zopakuj!';return;}initAudio();const c=document.querySelectorAll('#echoGrid .echo-cell'),ci=minigameState.sequence[idx];c.forEach(x=>x.classList.remove('lit'));c[ci].classList.add('lit');playTone(ECHO_FREQS[ci%ECHO_FREQS.length],0.2,'sine',0.12);setTimeout(()=>{c.forEach(x=>x.classList.remove('lit'));setTimeout(()=>playE(idx+1),200);},300);})(0);}
  function echoClick(idx){if(!minigameState.inputEnabled||minigameState.showing)return;initAudio();const c=document.querySelectorAll('#echoGrid .echo-cell');c[idx].classList.add('active');setTimeout(()=>c[idx].classList.remove('active'),150);playTone(ECHO_FREQS[idx%ECHO_FREQS.length],0.15,'sine',0.10);if(idx!==minigameState.sequence[minigameState.playerIndex]){minigameState.inputEnabled=false;trainingLose();return;}minigameState.playerIndex++;$('echoProgress').textContent=`${minigameState.playerIndex}/${minigameState.sequence.length}`;if(minigameState.playerIndex>=minigameState.sequence.length){minigameState.inputEnabled=false;trainingWin();}}
  // === ORDER ===
  const ORDER_POOLS=[{rule:'Nejmenší→Největší',items:[1,2,3,4,5,6],fn:a=>a},{rule:'Největší→Nejmenší',items:[9,7,5,3,1],fn:a=>-a},{rule:'A→Z',items:['👻','🤖','🧟','👽','🦇','🐉'],fn:a=>a},{rule:'Z→A',items:['🐉','🦇','👽','🧟','🤖','👻'],fn:a=>-a},{rule:'Podle počtu písmen',items:['A','AB','ABC','ABCD','ABCDE'],fn:a=>a.length},{rule:'Číselná hodnota',items:['II','IV','VI','VIII','X'],fn:a=>({II:2,IV:4,VI:6,VIII:8,X:10}[a]||0)},{rule:'Sudá⬆️ pak lichá',items:[2,4,6,1,3,5],fn:a=>a%2===0?a:a+10}];
  function startOrder(){const l=battleState.level,pi=(l-1)%ORDER_POOLS.length,pool=ORDER_POOLS[pi],items=shuffle([...pool.items]),count=Math.min(3+Math.floor(l/3),items.length),sel=items.slice(0,count);minigameState={selected:sel,remaining:[...sel],rule:pool.rule,active:true,orderIndex:0};$('orderAreaInner').innerHTML=`<div class="order-rule">📋${pool.rule}</div><div class="order-items" id="orderItems">${shuffle([...sel]).map((item,i)=>`<div class="order-item" data-idx="${i}" onclick="game.orderPick(${i},'${String(item)}')" data-val="${String(item)}">${item}</div>`).join('')}</div>`;$('orderProgress').textContent=`0/${sel.length}`;}
  function orderPick(idx,val){if(!minigameState.active)return;const items=document.querySelectorAll('#orderItems .order-item'),item=items[idx];if(item.classList.contains('picked'))return;const pi=(battleState.level-1)%ORDER_POOLS.length,cf=ORDER_POOLS[pi].fn,all=[...minigameState.selected].sort((a,b)=>cf(a)-cf(b));if(String(all[minigameState.orderIndex])===String(val)){item.classList.add('picked');minigameState.orderIndex++;$('orderProgress').textContent=`${minigameState.orderIndex}/${minigameState.selected.length}`;sfxHit();if(minigameState.orderIndex>=minigameState.selected.length){minigameState.active=false;trainingWin();}}else{sfxPlayerHit();trainingLose();}}
  // === REVERSE ===
  const RV_FREQS=[262,330,392,523],RV_COLORS=['#e94560','#f1c40f','#4a7dff','#2ecc71'],RV_SYMS=['⭐','🔥','💧','🌿'];
  function startReverse(){const l=battleState.level,seqLen=Math.min(2+Math.floor(l*0.5),5),playerSeq=[];for(let i=0;i<seqLen;i++)playerSeq.push(rand(0,3));const isCor=Math.random()<0.5,bSeq=[...playerSeq].reverse();if(!isCor){const bi=rand(0,bSeq.length-1);let nn;do{nn=rand(0,3);}while(nn===bSeq[bi]);bSeq[bi]=nn;}minigameState={active:true,phase:'playerInput',playerSeq,bossSeq:bSeq,isCorrectReverse:isCor,playerInputIndex:0,inputEnabled:true};const bc=$('reverseButtons');bc.innerHTML='';for(let i=0;i<4;i++){const b=document.createElement('div');b.className='reverse-btn';b.style.background=RV_COLORS[i];b.textContent=RV_SYMS[i];b.dataset.idx=i;b.addEventListener('click',()=>game.reverseInput(i));bc.appendChild(b);}$('reversePrompt').textContent='🎵 Zahraj melodii ťukáním!';$('reverseBossPlay').style.display='none';$('reverseAnswerBtns').style.display='none';minigameState.inputEnabled=true;}
  function reverseInput(idx){if(!minigameState.active||!minigameState.inputEnabled||minigameState.phase!=='playerInput')return;const ms=minigameState;initAudio();const b=document.querySelectorAll('#reverseButtons .reverse-btn');b[idx].classList.add('active');setTimeout(()=>b[idx].classList.remove('active'),150);playTone(RV_FREQS[idx],0.15,'sine',0.10);if(idx!==ms.playerSeq[ms.playerInputIndex]){ms.inputEnabled=false;ms.active=false;trainingLose();return;}ms.playerInputIndex++;if(ms.playerInputIndex>=ms.playerSeq.length){ms.phase='playing';ms.inputEnabled=false;$('reversePrompt').textContent='👂 Poslouchej!';$('reverseBossPlay').style.display='block';(function playBoss(idx){if(idx>=ms.bossSeq.length){ms.phase='answering';$('reversePrompt').textContent='Je to správně pozpátku?';$('reverseBossPlay').textContent='👹 Klikni!';$('reverseAnswerBtns').style.display='flex';return;}initAudio();const b=document.querySelectorAll('#reverseButtons .reverse-btn'),ci=ms.bossSeq[idx];b.forEach(x=>x.classList.remove('active'));b[ci].classList.add('active');playTone(RV_FREQS[ci%RV_FREQS.length],0.2,'sine',0.12);$('reverseBossPlay').textContent=`👹 Přehrává ${idx+1}/${ms.bossSeq.length}`;setTimeout(()=>{b.forEach(x=>x.classList.remove('active'));setTimeout(()=>playBoss(idx+1),200);},350);})(0);}}
  function reverseAnswer(a){if(!minigameState.active||minigameState.phase!=='answering')return;minigameState.active=false;if(a===minigameState.isCorrectReverse){sfxSuccess();trainingWin();}else{sfxPlayerHit();trainingLose();}}

  // ===== TRAINING WIN/LOSE =====
  function trainingWin() {
    battleState.playerHp = 1; // reset for training
    sfxSuccess();
    endTraining(true);
  }
  function trainingLose() {
    battleState.playerHp = 0;
    sfxPlayerHit();
    endTraining(false);
  }

  // ===== BOSS FIGHT =====
  const BOSSES = [
    { id:0, name:'Stínový pán', face:'👹', hp:10, skill:'fireball', minSkillLv:1, reward:{gold:5,weapon:'dagger'} },
    { id:1, name:'Soudce pekel', face:'⚖️', hp:12, skill:'lightning', minSkillLv:2, reward:{gold:8,armor:'leather'} },
    { id:2, name:'Faraonova kletba', face:'🐍', hp:14, skill:'shield', minSkillLv:3, reward:{gold:12} },
    { id:3, name:'Architekt času', face:'⌛', hp:16, skill:'heal', minSkillLv:4, reward:{gold:15,weapon:'sword'} },
    { id:4, name:'Mistr terčů', face:'🎯', hp:18, skill:'crit', minSkillLv:5, reward:{gold:20} },
    { id:5, name:'Šepotající hlas', face:'🔊', hp:20, skill:'clone', minSkillLv:6, reward:{gold:25,armor:'chainmail'} },
    { id:6, name:'Architekt zákonů', face:'🧩', hp:22, skill:'freeze', minSkillLv:7, reward:{gold:30} },
    { id:7, name:'Zrcadlový král', face:'🔄', hp:25, skill:'shadow', minSkillLv:8, reward:{gold:40,weapon:'flameSword',armor:'plate'} },
  ];

  // ===== BOSS FIGHT ENGINE =====
  const DIRECTIONS = ['⬆️','⬇️','⬅️','➡️'];

  function startBossFight(bossIdx) {
    const boss = BOSSES[bossIdx];
    if (!boss) return;

    // Check skill requirement
    const sk = SKILL_MAP[boss.skill];
    const lv = state.skills[boss.skill] || 0;
    if (lv < boss.minSkillLv) {
      showMessage(`❌ Potřebuješ ${sk.icon} Lv.${boss.minSkillLv} (máš Lv.${lv})`);
      return;
    }

    // Check if already defeated
    if (state.bossMedals && state.bossMedals[bossIdx] && state.bossMedals[bossIdx][0]) {
      showMessage('✅ Tohoto bosse už jsi porazil!');
      return;
    }

    cleanupTimers();

    const playerMaxHp = state.hero.maxHp || 3;
    const baseDmg = state.hero.baseDmg || 2;

    bossState = {
      bossIdx, boss,
      bossHp: boss.hp,
      maxBossHp: boss.hp,
      playerHp: playerMaxHp,
      maxPlayerHp: playerMaxHp,
      ended: false,
      turn: 0,
      dodgeWindow: 800, // ms to react
      attackDelay: 600,
      isAttacking: false,
      stunned: 0,
      frozen: 0,
      playerPos: 'center', // center | left | right | up | down
      spellCooldowns: {},
      dot: 0,
      playerDmgMult: 1,
      score: 0
    };

    // Init cooldowns
    SKILLS.forEach(sk => {
      const l = state.skills[sk.id] || 0;
      if (l > 0) {
        bossState.spellCooldowns[sk.id] = 0;
      }
    });

    showScreen('bossFight');
    updateBossUI();
    setupBossInput();
    setTimeout(() => bossFightTurn(), 500);
  }

  function updateBossUI() {
    const bs = bossState;
    // Update HP
    $('bossName').textContent = bs.boss.name;
    $('bossLevelBadge').textContent = `👹 Boss Lv.${bs.boss.id+1}`;
    $('bossFightFloor').textContent = `${bs.boss.name} · ${bs.boss.face}`;
    $('bossFightPlayerHp').textContent = '❤️'.repeat(bs.playerHp) + '🖤'.repeat(Math.max(0, bs.maxPlayerHp - bs.playerHp));
    $('bossFightHp').textContent = '❤️'.repeat(bs.bossHp) + '🖤'.repeat(Math.max(0, bs.maxBossHp - bs.bossHp));
    $('bossFigure').textContent = bs.boss.face;
    $('bossHint').textContent = `⬆️⬇️⬅️➡️ – ťuknutím uhni! | Kolo ${bs.turn}`;

    if (bs.stunned > 0) $('bossHint').textContent += ' | ⚡ Stun!';
    if (bs.frozen > 0) $('bossHint').textContent += ' | ❄️ Zpomalení!';
    if (bs.dot > 0) $('bossHint').textContent += ` | 🔥 DoT: ${bs.dot}`;

    // Update spell buttons
    SKILLS.forEach(sk => {
      const lv = state.skills[sk.id] || 0;
      const btn = document.querySelector(`.spell-btn[data-spell="${sk.id}"]`);
      if (btn) {
        const cdEl = btn.querySelector('.spell-cd');
        if (lv === 0) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'flex';
          const cd = bs.spellCooldowns ? bs.spellCooldowns[sk.id] : 0;
          if (cd > 0) {
            btn.classList.add('on-cd');
            cdEl.textContent = cd;
          } else {
            btn.classList.remove('on-cd');
            cdEl.textContent = '✓';
          }
        }
      }
    });
  }

  function setupBossInput() {
    const arena = $('bossArena');
    if (!arena) return;

    // Remove old listeners
    const old = arena._bsHandlers;
    if (old) old.forEach(h => arena.removeEventListener(h[0], h[1]));

    // Touch/swipe handling
    let startX, startY;
    const handlers = [];

    const touchStart = (e) => {
      if (bossState.ended || bossState.isAttacking) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    };
    const touchEnd = (e) => {
      if (bossState.ended || !startX) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      startX = startY = null;

      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      const minDist = 20;

      if (absDx < minDist && absDy < minDist) {
        // Tap = attack
        onPlayerAttack();
        return;
      }

      let dir;
      if (absDy > absDx) {
        dir = dy < 0 ? '⬆️' : '⬇️';
      } else {
        dir = dx < 0 ? '⬅️' : '➡️';
      }
      onPlayerDodge(dir);
    };

    arena.addEventListener('touchstart', touchStart);
    arena.addEventListener('touchend', touchEnd);
    handlers.push(['touchstart', touchStart]);
    handlers.push(['touchend', touchEnd]);

    // Also keyboard
    const keyHandler = (e) => {
      if (bossState.ended) return;
      const map = { ArrowUp:'⬆️', ArrowDown:'⬇️', ArrowLeft:'⬅️', ArrowRight:'➡️', 'w':'⬆️','s':'⬇️','a':'⬅️','d':'➡️' };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); onPlayerDodge(dir); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onPlayerAttack(); }
    };
    window.addEventListener('keydown', keyHandler);
    handlers.push(['keydown', keyHandler]);

    arena._bsHandlers = handlers;
  }

  function bossFightTurn() {
    if (bossState.ended) return;

    // Check dot damage
    if (bossState.dot > 0) {
      bossState.bossHp -= bossState.dot;
      if (bossState.bossHp <= 0) { endBossFight(true); return; }
    }

    // Check player death
    if (bossState.playerHp <= 0) { endBossFight(false); return; }

    bossState.turn++;
    updateBossUI();

    // Reduce cooldowns
    SKILLS.forEach(sk => {
      const l = state.skills[sk.id] || 0;
      if (l > 0 && bossState.spellCooldowns[sk.id] > 0) {
        bossState.spellCooldowns[sk.id]--;
      }
    });

    // Reduce stun
    if (bossState.stunned > 0) {
      bossState.stunned--;
      setTimeout(() => bossFightTurn(), 800);
      return;
    }
    if (bossState.frozen > 0) {
      bossState.frozen--;
      // Extra delay for dodge window
    }

    // Boss attacks
    const attackDir = DIRECTIONS[rand(0, 3)];
    const speed = Math.max(300, 800 - bossState.turn * 20);

    // Show attack arrow
    const arrow = $('bossArrow');
    if (arrow) {
      arrow.textContent = attackDir;
      arrow.className = 'boss-attack-arrow';
    }

    // Apply freeze extra time
    const windowTime = bossState.frozen > 0 ? speed * 2 : speed;

    bossState.isAttacking = true;
    bossState.currentAttack = attackDir;

    // Boss attack animation
    const playerEl = $('playerFigure');
    if (playerEl) {
      playerEl.classList.remove('swipe-up','swipe-down','swipe-left','swipe-right');
    }

    // Timeout - if player doesn't dodge
    bossState._attackTimer = setTimeout(() => {
      if (bossState.ended) return;
      // Player didn't dodge
      takeDamage(1);
    }, windowTime);
  }

  function onPlayerDodge(dir) {
    if (bossState.ended || !bossState.isAttacking) return;

    clearTimeout(bossState._attackTimer);
    bossState.isAttacking = false;

    // Hide arrow
    const arrow = $('bossArrow');
    if (arrow) arrow.className = 'boss-attack-arrow hidden';

    // Animate dodge
    const playerEl = $('playerFigure');
    if (playerEl) {
      if (dir === '⬆️') playerEl.className = 'boss-fight-player swipe-up';
      else if (dir === '⬇️') playerEl.className = 'boss-fight-player swipe-down';
      else if (dir === '⬅️') playerEl.className = 'boss-fight-player swipe-left';
      else if (dir === '➡️') playerEl.className = 'boss-fight-player swipe-right';
      setTimeout(() => playerEl.className = 'boss-fight-player', 200);
    }

    const correct = dir === bossState.currentAttack;
    if (correct) {
      sfxHit();
      bossState.score++;
      // Extra: counter attack
      bossState.bossHp -= Math.max(1, state.hero.baseDmg - 1);
      if (bossState.bossHp <= 0) { endBossFight(true); return; }
      $('bossHint').textContent = '✅ Správný úhyb! Protizásah!';
    } else {
      takeDamage(1);
      return;
    }

    setTimeout(() => bossFightTurn(), 400);
  }

  function onPlayerAttack() {
    if (bossState.ended) return;

    // Check if boss is attacking - if so, player can't attack
    if (bossState.isAttacking) {
      $('bossHint').textContent = '⚠️ Uhni nejdřív!';
      return;
    }

    // Player attacks boss
    const baseDmg = state.hero.baseDmg || 2;
    const critChance = (state.skills.crit || 0) * 5 + 10;
    const critMult = (state.skills.crit || 0) * 0.2 + 1;
    let dmg = baseDmg;

    if (Math.random() * 100 < critChance) {
      dmg = Math.round(dmg * critMult);
      $('bossHint').textContent = `💥 Kritický zásah! ${dmg} dmg!`;
    } else {
      $('bossHint').textContent = `⚔️ Útok! ${dmg} dmg`;
    }

    bossState.bossHp -= dmg;
    sfxHit();
    if (bossState.bossHp <= 0) { endBossFight(true); return; }
    updateBossUI();
    setTimeout(() => bossFightTurn(), 400);
  }

  function castSpell(spellId) {
    if (bossState.ended) return;
    const bs = bossState;
    const sk = SKILL_MAP[spellId];
    if (!sk) return;
    const lv = state.skills[spellId] || 0;
    if (lv === 0) { $('bossHint').textContent = '❌ Tohle kouzlo neumíš!'; return; }
    if (bs.spellCooldowns[spellId] > 0) { $('bossHint').textContent = `⏳ Cooldown: ${bs.spellCooldowns[spellId]} kol`; return; }

    // Passive skills (crit, shadow) just apply continuously
    if (spellId === 'crit') { $('bossHint').textContent = '🗡️ Kritický útok je pasivní!'; return; }

    // Calculate cooldown
    const cd = Math.max(1, Math.round(sk.baseCd - lv * sk.cdReduction));
    bs.spellCooldowns[spellId] = cd;

    // Apply effects
    if (spellId === 'fireball') {
      const dmg = lv * 2 + 3;
      bs.bossHp -= dmg;
      bs.dot += lv;
      $('bossHint').textContent = `🔥 Fireball! ${dmg} dmg + ${lv} DoT`;
    } else if (spellId === 'lightning') {
      const dmg = lv * 3 + 2;
      bs.bossHp -= dmg;
      bs.stunned = 1;
      $('bossHint').textContent = `⚡ Blesk! ${dmg} dmg + stun!`;
    } else if (spellId === 'shield') {
      // Block next attack
      const block = lv * 10 + 10;
      if (lv >= 5) {
        $('bossHint').textContent = `🛡️ Štít: ${block}% blok + odraz (1 kolo)`;
      } else {
        $('bossHint').textContent = `🛡️ Štít: ${block}% blok (1 kolo)`;
      }
      // Implemented in takeDamage
      bs.shieldActive = block;
    } else if (spellId === 'heal') {
      const heal = lv + 2;
      bs.playerHp = Math.min(bs.maxPlayerHp, bs.playerHp + heal);
      $('bossHint').textContent = `💚 Léčení! +${heal} HP`;
    } else if (spellId === 'freeze') {
      const turns = lv + 1;
      bs.frozen += turns;
      $('bossHint').textContent = `❄️ Mráz! ${turns} kola zpomalení`;
    } else if (spellId === 'clone') {
      // Chance that boss attacks clone
      const chance = lv * 8 + 10;
      if (Math.random() * 100 < chance) {
        $('bossHint').textContent = `🌀 Klon! Boss zaútočil na klona!`;
        return; // skip boss turn
      } else {
        $('bossHint').textContent = `🌀 Klon selhal...`;
      }
    } else if (spellId === 'shadow') {
      const dmg = lv * 4 + 5;
      bs.bossHp -= dmg;
      $('bossHint').textContent = `🌑 Stín! ${dmg} dmg ignoruje obranu!`;
    }

    sfxSuccess();
    if (bs.bossHp <= 0) { endBossFight(true); return; }
    updateBossUI();
    setTimeout(() => bossFightTurn(), 400);
  }

  function takeDamage(amount) {
    if (bossState.ended) return;
    const bs = bossState;

    // Shield check
    if (bs.shieldActive) {
      const block = bs.shieldActive;
      if (block >= 100) {
        $('bossHint').textContent = `🛡️ Štít odrazil útok!`;
        delete bs.shieldActive;
        // Counter damage
        bs.bossHp -= 2;
        if (bs.bossHp <= 0) { endBossFight(true); return; }
      } else {
        amount = Math.max(1, Math.round(amount * (1 - block / 100)));
        $('bossHint').textContent = `🛡️ Štít ztlumil na ${amount} dmg`;
        delete bs.shieldActive;
      }
    } else {
      // Avoid unnecessary DOM read
    }

    bs.playerHp -= amount;
    sfxPlayerHit();
    updateBossUI();
    $('bossHint').textContent = `💔 Zásah! -${amount} HP`;

    if (bs.playerHp <= 0) {
      endBossFight(false);
    } else {
      // Boss also takes this chance to attack again
      setTimeout(() => {
        if (!bossState.ended) bossFightTurn();
      }, 600);
    }
  }

  function endBossFight(won) {
    if (bossState.ended) return;
    bossState.ended = true;
    cleanupTimers();
    if (bossState._attackTimer) clearTimeout(bossState._attackTimer);

    // Cleanup listeners
    const arena = $('bossArena');
    if (arena && arena._bsHandlers) {
      arena._bsHandlers.forEach(h => arena.removeEventListener(h[0], h[1]));
      arena._bsHandlers = null;
    }
    const oldMedal = $('medalScreen');
    if (oldMedal) oldMedal.remove();

    if (won) {
      const boss = bossState.boss;
      // Mark as defeated
      if (!state.bossMedals) state.bossMedals = [[],[],[],[],[],[],[],[]].map(()=>[false]);
      if (!state.bossMedals[boss.id]) state.bossMedals[boss.id] = [false];
      state.bossMedals[boss.id][0] = true;
      state.wins = (state.wins || 0) + 1;

      // Apply reward
      const reward = boss.reward;
      if (reward.gold) state.hero.gold = (state.hero.gold || 0) + reward.gold;
      if (reward.weapon && state.hero.weapon === 'fists') state.hero.weapon = reward.weapon;
      if (reward.armor && state.hero.armor === 'rags') state.hero.armor = reward.armor;

      saveGame();
      checkAchievements();

      sfxBossDefeat();
      $('resultIcon').textContent = '🏆';
      $('resultTitle').textContent = `${boss.name} poražen!`;
      let msg = `Získal jsi ${reward.gold || 0}💰`;
      if (reward.weapon) msg += ` + ${reward.weapon}`;
      if (reward.armor) msg += ` + ${reward.armor}`;
      $('resultMsg').textContent = msg;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.showScreen('hero')">👤 Hrdina</button>`;

      // Unlock next boss? No, all visible but require skill level
    } else {
      state.deaths = (state.deaths || 0) + 1;
      saveGame();
      $('resultIcon').textContent = '💀';
      $('resultTitle').textContent = `${bossState.boss.name} tě porazil`;
      $('resultMsg').textContent = `Více trénuj kouzla!`;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.startBossFight(${bossState.bossIdx})">🔄 Znovu</button><button class="btn btn-secondary" onclick="game.showScreen('hero')">👤 Hrdina</button>`;
    }
    showScreen('result');
  }

  function showMessage(msg) {
    // Simple notification
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:300;background:#12122a;border:2px solid #e94560;border-radius:12px;padding:20px 30px;text-align:center;font-size:16px;font-weight:bold';
    p.textContent = msg;
    document.body.appendChild(p);
    setTimeout(() => { p.style.transition='opacity 0.3s'; p.style.opacity='0'; setTimeout(()=>p.remove(),300); }, 2000);
  }

  // ===== COUNTDOWN =====
  function showCountdown(s,cb){
    cleanupTimers();
    let r=s;const el=$('countdownOverlay'),ne=$('countdownNumber');
    el.classList.remove('hidden');ne.textContent=r;playTone(440+r*60,0.15,'sine',0.1);
    minigameState.countdownInterval=setInterval(()=>{r--;if(r<=0){clearInterval(minigameState.countdownInterval);minigameState.countdownInterval=null;el.classList.add('hidden');if(cb)cb();}else{ne.textContent=r;playTone(440+r*60,0.15,'sine',0.1);}},1000);
  }

  // ===== ACHIEVEMENTS & MEDALS =====
  const BOSS_MEDAL_FLOORS=[10,20,30,40,50];
  const ACHIEVEMENTS=[
    {id:'first_win',name:'🎯 První výhra',desc:'Vyhraj první trénink',check:s=>s.wins>=1},
    {id:'first_skill',name:'📖 První kouzlo',desc:'Získej level 1 v kouzle',check:s=>SKILLS.some(sk=>(s.skills[sk.id]||0)>=1)},
    {id:'skill_5',name:'🧙 5 kouzel',desc:'Měj 5 kouzel na level 1+',check:s=>SKILLS.filter(sk=>(s.skills[sk.id]||0)>=1).length>=5},
    {id:'all_skills',name:'🌟 Všechna kouzla',desc:'Měj všech 8 kouzel na level 1+',check:s=>SKILLS.every(sk=>(s.skills[sk.id]||0)>=1)},
    {id:'max_skill',name:'💎 První MAX',desc:'Dostaň jedno kouzlo na max (10)',check:s=>SKILLS.some(sk=>(s.skills[sk.id]||0)>=10)},
    {id:'hero_5',name:'👤 Hrdina Lv.5',desc:'Dosáhni úrovně hrdiny 5',check:s=>s.hero.level>=5},
    {id:'hero_10',name:'👑 Hrdina Lv.10',desc:'Dosáhni úrovně hrdiny 10',check:s=>s.hero.level>=10},
    {id:'ten_wins',name:'🏆 10 výher',desc:'Vyhraj 10 tréninků',check:s=>s.wins>=10},
    {id:'fifty_wins',name:'💫 50 výher',desc:'Vyhraj 50 tréninků',check:s=>s.wins>=50},
    {id:'ten_deaths',name:'💀 10 proher',desc:'Zemři 10×',check:s=>s.deaths>=10},
    {id:'first_weapon',name:'🗡️ První zbraň',desc:'Získej lepší zbraň než pěsti',check:s=>s.hero.weapon!=='fists'},
    {id:'first_armor',name:'🦺 První brnění',desc:'Získej lepší brnění než hadry',check:s=>s.hero.armor!=='rags'},
  ];
  function bossFloorIndex(f){return BOSS_MEDAL_FLOORS.indexOf(f);}
  function checkAchievements(){
    if(!state.achievements)state.achievements={};
    ACHIEVEMENTS.forEach(a=>{if(!state.achievements[a.id]&&a.check(state)){state.achievements[a.id]=true;saveGame();showAchievementPopup(a);}});
  }
  function showAchievementPopup(a){
    const p=document.createElement('div');p.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:300;background:#12122a;border:2px solid #f1c40f;border-radius:12px;padding:16px 24px;text-align:center;animation:enemyEnter 0.5s ease-out;max-width:360px;width:90%';
    p.innerHTML=`<div style="font-size:32px;margin-bottom:6px">🏅</div><div style="font-size:16px;font-weight:bold;color:#f1c40f">Achievement!</div><div style="font-size:14px;margin-top:4px">${a.name}</div><div style="font-size:12px;color:#8888aa;margin-top:2px">${a.desc}</div>`;
    document.body.appendChild(p);setTimeout(()=>{p.style.transition='opacity 0.5s';p.style.opacity='0';setTimeout(()=>p.remove(),500);},2500);
  }
  function showMedals(){
    let h='<div class="card"><div class="card-title">🏅 Úspěchy</div></div>';
    ACHIEVEMENTS.forEach(a=>{const e=state.achievements&&state.achievements[a.id];h+=`<div class="card" style="${e?'border-color:#2ecc71':'opacity:0.5'}"><div class="flex-between"><div><div style="font-size:14px;font-weight:bold">${e?a.name:'🔒 '+a.name}</div><div style="font-size:11px;color:#8888aa">${a.desc}</div></div><div style="font-size:20px">${e?'✅':'⏳'}</div></div></div>`;});
    h+='<button class="btn btn-secondary" onclick="game.showScreen(\'hero\')">👤 Zpět</button>';
    const c=document.createElement('div');c.className='container';c.id='medalScreen';c.innerHTML=h;document.body.appendChild(c);showScreen('medals');
  }

  // ===== INIT =====
  function init() {
    state = loadSave();
    // Ensure all skills exist
    SKILLS.forEach(sk => { if (state.skills[sk.id] === undefined) state.skills[sk.id] = 0; if (state.skillXp[sk.id] === undefined) state.skillXp[sk.id] = 0; });
    if (!state.achievements) state.achievements = {};
    if (!state.bossMedals) state.bossMedals = [[],[],[],[],[],[],[],[]].map(()=>[false,false,false,false,false]);
    if (!state.dungeonProgress) state.dungeonProgress = [0,0,0,0,0,0,0,0];
    if (!state.hero) state.hero = { level:1, xp:0, gold:0, hp:3, maxHp:3, baseDmg:2, weapon:'fists', armor:'rags' };

    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (a.dataset.screen === 'hero') showScreen('hero');
        else if (a.dataset.screen === 'dungeons') showScreen('dungeons');
        else if (a.dataset.screen === 'medals') showMedals();
        else if (a.dataset.screen === 'reset') resetGame();
      });
    });
    showScreen('hero');
  }

  window.game = {
    showScreen, enterTraining, enterDungeonBySkill: (id) => { showScreen('dungeons'); },
    simonClick, colorInput, gridPick, judgeAnswer, echoClick, orderPick, reverseInput, reverseAnswer,
    startBossFight, castSpell, showMedals, showMessage
  };

  init();
})();
