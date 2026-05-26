const game = (() => {
  'use strict';

  // ===== Canvas =====
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const W = 400, H = 500;

  // ===== DOM =====
  const $ = id => document.getElementById(id);

  // ===== Zvuky (Web Audio API) =====
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playTone(freq, duration, type = 'square', vol = 0.12) {
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

  function sfxShoot() { playTone(880, 0.06, 'square', 0.06); }
  function sfxHit() { playTone(220, 0.12, 'sawtooth', 0.10); }
  function sfxPlayerHit() { playTone(140, 0.2, 'square', 0.12); }
  function sfxBossKill() {
    playTone(440, 0.1, 'square', 0.1);
    setTimeout(() => playTone(660, 0.1, 'square', 0.1), 100);
    setTimeout(() => playTone(880, 0.2, 'square', 0.12), 200);
  }
  function sfxGameOver() {
    playTone(330, 0.15, 'square', 0.1);
    setTimeout(() => playTone(220, 0.15, 'square', 0.1), 150);
    setTimeout(() => playTone(165, 0.4, 'square', 0.08), 300);
  }

  // Background music — jednoduchá basová linka
  let musicInterval = null;
  function startMusic() {
    stopMusic();
    initAudio();
    const notes = [110, 110, 130.8, 146.8, 110, 110, 98, 82.4];
    let i = 0;
    const playNote = () => {
      if (state.ended) return;
      playTone(notes[i % notes.length], 0.25, 'triangle', 0.04);
      i++;
    };
    playNote();
    musicInterval = setInterval(playNote, 350);
  }
  function stopMusic() {
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  }

  // ===== Boss konfigurace (10 unikátních) =====
  const BOSSES = [
    { name: 'SCOUT', maxHp: 25, w: 50, h: 25, speed: 1.2,
      shootInterval: 80, bulletSpeed: 2.0, bulletSize: 4, volleyCount: 1,
      color: '#8B4513', phase: 'early', shootType: 'aim' },
    { name: 'BARRACUDA', maxHp: 40, w: 70, h: 30, speed: 1.8,
      shootInterval: 65, bulletSpeed: 2.5, bulletSize: 4, volleyCount: 1,
      color: '#CD853F', phase: 'early', shootType: 'aim' },
    { name: 'JUGGERNAUT', maxHp: 70, w: 100, h: 40, speed: 0,
      shootInterval: 70, bulletSpeed: 2.2, bulletSize: 5, volleyCount: 2,
      color: '#8B0000', phase: 'mid', shootType: 'spread' },
    { name: 'VIPER', maxHp: 55, w: 60, h: 28, speed: 2.5,
      shootInterval: 55, bulletSpeed: 3.0, bulletSize: 3, volleyCount: 1,
      color: '#556B2F', phase: 'mid', shootType: 'aim' },
    { name: 'FORTRESS', maxHp: 100, w: 120, h: 50, speed: 0,
      shootInterval: 60, bulletSpeed: 2.5, bulletSize: 6, volleyCount: 3,
      color: '#800020', phase: 'mid', shootType: 'spread' },
    { name: 'PHANTOM', maxHp: 75, w: 65, h: 30, speed: 2.0,
      shootInterval: 50, bulletSpeed: 3.2, bulletSize: 3, volleyCount: 2,
      color: '#4B0082', phase: 'late', shootType: 'aim' },
    { name: 'INFERNO', maxHp: 110, w: 100, h: 45, speed: 0.5,
      shootInterval: 50, bulletSpeed: 2.8, bulletSize: 5, volleyCount: 3,
      color: '#B22222', phase: 'late', shootType: 'spread' },
    { name: 'BLITZ', maxHp: 90, w: 55, h: 25, speed: 3.0,
      shootInterval: 45, bulletSpeed: 3.5, bulletSize: 3, volleyCount: 2,
      color: '#2F4F4F', phase: 'late', shootType: 'aim' },
    { name: 'TITAN', maxHp: 150, w: 140, h: 55, speed: 0.3,
      shootInterval: 55, bulletSpeed: 3.0, bulletSize: 6, volleyCount: 4,
      color: '#5B0000', phase: 'final', shootType: 'spread' },
    { name: 'OBLIVION', maxHp: 200, w: 130, h: 50, speed: 1.5,
      shootInterval: 40, bulletSpeed: 3.5, bulletSize: 5, volleyCount: 4,
      color: '#1a0030', phase: 'final', shootType: 'aim' }
  ];

  // ===== Stav =====
  let state = {};
  let gameLoop = null;

  // ===== Pomocné =====
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randF(min, max) { return Math.random() * (max - min) + min; }

  // ===== Save =====
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem('bossSlayerSave'));
      if (s && s.upgrades) return s;
    } catch {}
    return { money: 0, bossIndex: 0, upgrades: {} };
  }
  function saveGame() {
    localStorage.setItem('bossSlayerSave', JSON.stringify({
      money: state.money, bossIndex: state.bossIndex, upgrades: state.upgrades
    }));
  }

  // ===== Player =====
  function createPlayer() {
    const u = state.upgrades;
    return {
      x: W / 2, y: H - 60, w: 18, h: 20,
      maxHp: 3 + (u.maxHp || 0) * 2,
      hp: 3 + (u.maxHp || 0) * 2,
      speed: 3.0 + (u.speed || 0) * 0.5,
      fireRate: Math.max(5, 20 - (u.fireRate || 0) * 3),
      damage: 1 + (u.damage || 0),
      multishot: Math.min(3, Math.floor((u.multishot || 0))),
      piercing: Math.min(3, Math.floor((u.piercing || 0))),
      fireCooldown: 0, invincible: 0
    };
  }

  function createBullet(x, y, vx, vy, size, dmg, color, pierce = 0) {
    return { x, y, vx, vy, size, dmg, color, alive: true, pierce };
  }

  function createBoss(cfg) {
    return {
      cfg, name: cfg.name, x: W / 2, y: 55,
      w: cfg.w, h: cfg.h,
      hp: cfg.maxHp, maxHp: cfg.maxHp,
      dir: 1, dirTimer: 0,
      shootCooldown: cfg.shootInterval,
      alive: true, volleyCount: cfg.volleyCount || 1,
      firedVolley: 0, volleyDelay: 0,
      spreadBase: 0
    };
  }

  // ===== Kolize =====
  function rectCollide(a, b) {
    return a.x - a.w/2 < b.x + b.w/2 &&
           a.x + a.w/2 > b.x - b.w/2 &&
           a.y - a.h/2 < b.y + b.h/2 &&
           a.y + a.h/2 > b.y - b.h/2;
  }
  function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    const nx = Math.max(rx - rw/2, Math.min(cx, rx + rw/2));
    const ny = Math.max(ry - rh/2, Math.min(cy, ry + rh/2));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  // ===== Boss update =====
  function updateBoss(boss) {
    if (!boss.alive) return;
    const cfg = boss.cfg;

    // Pohyb
    if (cfg.speed > 0) {
      boss.dirTimer--;
      if (boss.dirTimer <= 0) {
        boss.dir = boss.dir > 0 ? -1 : 1;
        boss.dirTimer = rand(30, 80);
      }
      boss.x += cfg.speed * boss.dir;
      boss.x = Math.max(boss.w/2, Math.min(W - boss.w/2, boss.x));
    }

    // Střelba
    if (boss.volleyDelay > 0) { boss.volleyDelay--; return; }
    boss.shootCooldown--;
    if (boss.shootCooldown <= 0) {
      boss.shootCooldown = cfg.shootInterval;
      boss.firedVolley = 0;
      boss.spreadBase = randF(-0.3, 0.3);
    }
    if (boss.firedVolley < boss.volleyCount && boss.shootCooldown > cfg.shootInterval - 5) {
      const count = boss.volleyCount;
      const p = state.player;
      for (let i = 0; i < count; i++) {
        let angle;
        if (cfg.shootType === 'aim') {
          const dx = p.x - boss.x;
          const dy = p.y - boss.y;
          const baseAngle = Math.atan2(dy, dx);
          angle = baseAngle + (i - (count - 1) / 2) * 0.12;
        } else {
          angle = Math.PI / 2 + (i - (count - 1) / 2) * 0.12 + boss.spreadBase;
        }
        state.bulletsEnemy.push(createBullet(
          boss.x, boss.y + boss.h/2,
          Math.cos(angle) * cfg.bulletSpeed,
          Math.sin(angle) * cfg.bulletSpeed,
          cfg.bulletSize, 1, '#ff4444'
        ));
      }
      boss.firedVolley = boss.volleyCount;
      boss.volleyDelay = 2;
    }
  }

  // ===== Game loop =====
  let gameFrame = 0;

  function update() {
    gameFrame++;
    const p = state.player;

    // Auto-attack
    p.fireCooldown--;
    if (p.fireCooldown <= 0) {
      p.fireCooldown = p.fireRate;
      const count = 1 + p.multishot;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.08;
        state.bulletsPlayer.push(createBullet(
          p.x + i * 3 - (count - 1) * 1.5, p.y - p.h/2,
          spread, -6.5, 3, p.damage, '#4affff', p.piercing
        ));
      }
      sfxShoot();
    }

    // Pohyb hráče
    if (state.playerTarget) {
      const dx = state.playerTarget.x - p.x;
      const dy = state.playerTarget.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        const move = Math.min(p.speed, dist);
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;
      }
    }
    p.x = Math.max(p.w/2, Math.min(W - p.w/2, p.x));
    p.y = Math.max(p.h/2, Math.min(H - p.h/2, p.y));
    if (p.invincible > 0) p.invincible--;

    // Boss update
    if (state.boss && state.boss.alive) updateBoss(state.boss);

    // Střely hráče
    for (const b of state.bulletsPlayer) {
      if (!b.alive) continue;
      b.x += b.vx; b.y += b.vy;
      if (b.y < -10 || b.x < -10 || b.x > W + 10) b.alive = false;
      if (state.boss && state.boss.alive && rectCollide(
        { x: b.x, y: b.y, w: b.size * 2, h: b.size * 2 },
        { x: state.boss.x, y: state.boss.y, w: state.boss.w, h: state.boss.h }
      )) {
        state.boss.hp -= b.dmg;
        if (b.pierce > 0) {
          b.pierce--;
        } else {
          b.alive = false;
        }
        state.combo++;
        if (state.boss.hp <= 0) {
          state.boss.hp = 0;
          state.boss.alive = false;
          const bonus = 12 + state.bossIndex * 5;
          state.money += bonus;
          state.combo = 0;
          sfxBossKill();
        } else {
          sfxHit();
        }
      }
    }

    // Nepřátelské střely
    for (const b of state.bulletsEnemy) {
      if (!b.alive) continue;
      b.x += b.vx; b.y += b.vy;
      if (b.y > H + 10 || b.x < -10 || b.x > W + 10) b.alive = false;
      if (p.invincible <= 0 && circleRectCollide(b.x, b.y, b.size, p.x, p.y, p.w, p.h)) {
        b.alive = false;
        p.hp--;
        p.invincible = 40;
        state.combo = 0;
        sfxPlayerHit();
        if (p.hp <= 0) { p.hp = 0; endGame(false); return; }
      }
    }

    // Cleanup
    state.bulletsPlayer = state.bulletsPlayer.filter(b => b.alive);
    state.bulletsEnemy = state.bulletsEnemy.filter(b => b.alive);

    // Boss dead → další vlna
    if (state.boss && !state.boss.alive && !state.waveTransition) {
      state.waveTransition = 60;
    }
    if (state.waveTransition > 0) {
      state.waveTransition--;
      if (state.waveTransition <= 0) {
        state.bossIndex++;
        if (state.bossIndex >= BOSSES.length) { endGame(true); return; }
        spawnBoss();
      }
    }
    updateUI();
  }

  function draw() {
    const p = state.player;

    // Pozadí
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Hvězdy
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 50; i++) {
      const sx = (i * 113.7 + 40) % W;
      const sy = ((i * 89.3 + gameFrame * 0.2) % H);
      ctx.beginPath();
      ctx.arc(sx, sy, i % 3 === 0 ? 1.5 : 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boss
    if (state.boss && state.boss.alive) {
      const b = state.boss;
      const cfg = b.cfg;

      // Stín/tělo
      ctx.fillStyle = cfg.color;
      ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);

      // Kokpit
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - b.h/4, b.w * 0.15, b.h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Kanóny
      ctx.fillStyle = '#555';
      const canons = cfg.shootType === 'spread' ? 2 : 1;
      for (let i = 0; i < canons; i++) {
        const cx = b.x - b.w/4 + i * b.w/2;
        ctx.fillRect(cx - 3, b.y + b.h/2 - 2, 6, 6);
      }

      // Ozdobné pruhy (podle % HP)
      const pct = b.hp / b.maxHp;
      if (pct < 0.3) {
        ctx.fillStyle = '#ff444488';
        ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, 3);
      }

      // HP bar nad bossem (na canvasu i mimo)
      const barW = b.w + 10;
      const barH = 4;
      const barX = b.x - barW / 2;
      const barY = b.y - b.h/2 - 10;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#e94560';
      ctx.fillRect(barX, barY, barW * Math.max(0, pct), barH);
    }

    // Střely hráče
    for (const b of state.bulletsPlayer) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 2, b.y - 5, 4, 10);
    }

    // Nepřátelské střely
    for (const b of state.bulletsEnemy) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,100,100,0.3)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hráč
    if (!(p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0)) {
      ctx.fillStyle = '#4a7dff';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.h/2);
      ctx.lineTo(p.x - p.w/2, p.y + p.h/2);
      ctx.lineTo(p.x - p.w/4, p.y + p.h/3);
      ctx.lineTo(p.x, p.y + p.h/2.5);
      ctx.lineTo(p.x + p.w/4, p.y + p.h/3);
      ctx.lineTo(p.x + p.w/2, p.y + p.h/2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6b9fff';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - p.h/6, p.w * 0.2, p.h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,${150 + Math.sin(gameFrame * 0.3) * 50},0,0.8)`;
      ctx.beginPath();
      ctx.moveTo(p.x - 3, p.y + p.h/2.5);
      ctx.lineTo(p.x, p.y + p.h/2.5 + 7 + Math.sin(gameFrame * 0.5) * 3);
      ctx.lineTo(p.x + 3, p.y + p.h/2.5);
      ctx.fill();
    }
  }

  // ===== UI =====
  function updateUI() {
    const p = state.player;
    const b = state.boss;

    // Boss HP bar nahoře
    if (b && b.alive) {
      const bhPct = Math.max(0, (b.hp / b.maxHp) * 100);
      $('bossHpOutside').style.width = bhPct + '%';
      $('bossNameHud').textContent = b.name;
    } else {
      $('bossHpOutside').style.width = '0%';
      $('bossNameHud').textContent = state.waveTransition > 0 ? 'Příprava...' : '???';
    }

    // Player HP
    const phPct = Math.max(0, (p.hp / p.maxHp) * 100);
    $('playerHp').style.width = phPct + '%';
    $('playerHpText').textContent = `${p.hp}/${p.maxHp}`;

    $('gameMoney').textContent = state.money;
    $('gameCombo').textContent = state.combo;
    $('waveInfo').textContent = state.boss && state.boss.alive
      ? `Boss #${state.bossIndex + 1}`
      : state.waveTransition > 0
        ? `Další boss za chvíli...`
        : 'Vítězství!';
  }

  // ===== Spawn =====
  function spawnBoss() {
    const cfg = BOSSES[state.bossIndex] || BOSSES[BOSSES.length - 1];
    state.boss = createBoss(cfg);
    state.bulletsEnemy = [];
    state.waveTransition = 0;
    state.combo = 0;
  }

  // ===== Input =====
  function setupInput() {
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };
    const onStart = (e) => { e.preventDefault(); if (state.ended) return; state.playerTarget = getPos(e); };
    const onMove = (e) => { e.preventDefault(); if (state.ended) return; state.playerTarget = getPos(e); };
    const onEnd = (e) => { e.preventDefault(); state.playerTarget = null; };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
  }

  // ===== Game loop =====
  function gameLoopFn() {
    if (state.ended) return;
    update();
    draw();
    requestAnimationFrame(gameLoopFn);
  }

  // ===== Konec =====
  function endGame(won) {
    state.ended = true;
    stopMusic();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    saveGame();

    $('menu').classList.add('hidden');
    $('game').classList.add('hidden');
    $('shop').classList.add('hidden');
    $('result').classList.remove('hidden');

    if (won) {
      $('resultTitle').textContent = '🎉 VYHRÁL JSI! 🎉';
      $('resultTitle').style.color = '#ffd700';
      $('resultMsg').textContent = 'Porazil jsi všechny bosse!';
    } else {
      $('resultTitle').textContent = '💀 ZNIČEN 💀';
      $('resultTitle').style.color = '#e94560';
      $('resultMsg').textContent = state.boss
        ? `Zastavil tě ${state.boss.name} (#${state.bossIndex + 1})`
        : 'Hra skončila';
      sfxGameOver();
    }
    $('resultMoney').textContent = `💰 ${state.money} coinů`;
  }

  // ===== START =====
  function initState() {
    const save = loadSave();
    const defUpg = {};
    ['maxHp','speed','fireRate','damage','multishot','piercing'].forEach(k => defUpg[k] = save.upgrades[k] || 0);
    state = {
      money: save.money, bossIndex: save.bossIndex, upgrades: defUpg,
      player: null, boss: null,
      bulletsPlayer: [], bulletsEnemy: [],
      playerTarget: null, combo: 0,
      waveTransition: 0, ended: false
    };
    state.player = createPlayer();
    if (gameLoop) cancelAnimationFrame(gameLoop);
  }

  function start() {
    initAudio();
    initState();
    spawnBoss();
    $('menu').classList.add('hidden');
    $('result').classList.add('hidden');
    $('shop').classList.add('hidden');
    $('game').classList.remove('hidden');
    updateUI();
    state.ended = false;
    startMusic();
    gameLoop = requestAnimationFrame(gameLoopFn);
  }

  function quit() {
    stopMusic();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    const save = loadSave();
    $('menuMoney').textContent = save.money;
    $('menuBossCount').textContent = `Boss #${Math.min(save.bossIndex + 1, BOSSES.length)}`;
    $('menu').classList.remove('hidden');
    $('game').classList.add('hidden');
    $('result').classList.add('hidden');
    $('shop').classList.add('hidden');
  }

  function restart() { start(); }

  // ===== OBCHOD =====
  const SHOP_ITEMS = [
    { id: 'maxHp', name: '🛡 Pevnější štít', desc: '+2 max HP', baseCost: 15, costMult: 1.6, maxLevel: 5 },
    { id: 'damage', name: '⚔ Silnější střely', desc: '+1 poškození', baseCost: 12, costMult: 1.7, maxLevel: 5 },
    { id: 'fireRate', name: '🔫 Rychlejší palba', desc: 'Zkracuje pauzu mezi výstřely', baseCost: 20, costMult: 1.8, maxLevel: 4 },
    { id: 'speed', name: '⚡ Rychlejší loď', desc: '+0.5 rychlosti pohybu', baseCost: 10, costMult: 1.5, maxLevel: 5 },
    { id: 'multishot', name: '💥 Vícenásobná střela', desc: '+1 střela na výstřel', baseCost: 30, costMult: 2.0, maxLevel: 3 },
    { id: 'piercing', name: '🎯 Průrazné střely', desc: 'Střela projede bossem (max 3)', baseCost: 25, costMult: 2.0, maxLevel: 3 }
  ];

  function openShop() {
    $('menu').classList.add('hidden');
    $('shop').classList.remove('hidden');
    const save = loadSave();
    state.money = save.money;
    state.upgrades = save.upgrades;
    renderShop();
  }

  function closeShop() { saveGame(); quit(); }

  function renderShop() {
    $('shopMoney').textContent = state.money;
    $('shopItems').innerHTML = SHOP_ITEMS.map(item => {
      const level = state.upgrades[item.id] || 0;
      const maxed = level >= item.maxLevel;
      const cost = maxed ? 'MAX' : Math.floor(item.baseCost * Math.pow(item.costMult, level));
      const canBuy = !maxed && state.money >= cost;
      return `
        <div class="shop-item">
          <div class="shop-item-info">
            <span class="shop-item-name">${item.name}</span>
            <span class="shop-item-desc">${item.desc}</span>
            <span class="shop-item-level">Úroveň ${level}/${item.maxLevel}</span>
          </div>
          <button class="shop-btn" ${canBuy ? '' : 'disabled'} onclick="game.buyUpgrade('${item.id}')">
            ${maxed ? 'MAX' : `${cost}💰`}
          </button>
        </div>
      `;
    }).join('');
  }

  function buyUpgrade(id) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item) return;
    const level = state.upgrades[id] || 0;
    if (level >= item.maxLevel) return;
    const cost = Math.floor(item.baseCost * Math.pow(item.costMult, level));
    if (state.money < cost) return;
    state.money -= cost;
    state.upgrades[id] = (state.upgrades[id] || 0) + 1;
    renderShop();
    saveGame();
  }

  // ===== Init =====
  setupInput();
  const save = loadSave();
  $('menuMoney').textContent = save.money;
  $('menuBossCount').textContent = `Boss #${Math.min(save.bossIndex + 1, BOSSES.length)}`;

  return { start, quit, restart, openShop, closeShop, buyUpgrade };
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
