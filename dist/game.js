const game = (() => {
  'use strict';

  // ===== Canvas =====
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  let W, H;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = 400;
    canvas.height = 500;
    W = 400;
    H = 500;
  }
  resizeCanvas();

  // ===== DOM =====
  const $ = id => document.getElementById(id);

  // ===== Konfigurace bossů =====
  const BOSSES = [
    { name: 'Těžký křižník', maxHp: 80, width: 120, height: 40, speed: 0,
      pattern: 'steady', shootInterval: 70, bulletSpeed: 2.5, bulletSize: 5 },
    { name: 'Lovcův stíhač', maxHp: 110, width: 70, height: 35, speed: 1.5,
      pattern: 'sweep', shootInterval: 60, bulletSpeed: 2.8, bulletSize: 4 },
    { name: 'Hvězdná pevnost', maxHp: 150, width: 140, height: 50, speed: 0,
      pattern: 'steady', shootInterval: 55, bulletSpeed: 3, bulletSize: 5,
      volleyCount: 3 },
    { name: 'Dronový roj', maxHp: 130, width: 80, height: 30, speed: 2,
      pattern: 'sweep', shootInterval: 45, bulletSpeed: 3.2, bulletSize: 3,
      volleyCount: 2 },
    { name: 'Konečný', maxHp: 200, width: 160, height: 55, speed: 0.8,
      pattern: 'sweep', shootInterval: 40, bulletSpeed: 3.5, bulletSize: 6,
      volleyCount: 4 }
  ];

  // ===== Stav =====
  let state = {};
  let gameLoop = null;

  // ===== Pomocné =====
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  // ===== Perzistentní save =====
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem('bossSlayerSave'));
      return s || { money: 0, bossIndex: 0, upgrades: { speed: 0, fireRate: 0, maxHp: 0, damage: 0 } };
    } catch { return { money: 0, bossIndex: 0, upgrades: { speed: 0, fireRate: 0, maxHp: 0, damage: 0 } }; }
  }
  function saveGame() {
    localStorage.setItem('bossSlayerSave', JSON.stringify({
      money: state.money,
      bossIndex: state.bossIndex,
      upgrades: state.upgrades
    }));
  }

  // ===== Herní objekty =====
  function createPlayer() {
    const base = { maxHp: 3, speed: 3, fireRate: 12, damage: 1 };
    const upg = state.upgrades;
    return {
      x: W / 2, y: H - 60,
      w: 20, h: 20,
      maxHp: base.maxHp + upg.maxHp * 2,
      hp: base.maxHp + upg.maxHp * 2,
      speed: base.speed + upg.speed * 0.5,
      fireRate: Math.max(4, base.fireRate - upg.fireRate * 2),
      damage: base.damage + upg.damage,
      fireCooldown: 0,
      invincible: 0
    };
  }

  function createBullet(x, y, vx, vy, size, dmg, color = '#ff0') {
    return { x, y, vx, vy, size, dmg, color, alive: true };
  }

  function createBoss(cfg) {
    return {
      cfg,
      name: cfg.name,
      x: W / 2,
      y: 60,
      w: cfg.width,
      h: cfg.height,
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
      dir: 1,
      shootCooldown: cfg.shootInterval,
      alive: true,
      volleyCount: cfg.volleyCount || 1,
      firedVolley: 0,
      volleyDelay: 0
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
    const nearX = Math.max(rx - rw/2, Math.min(cx, rx + rw/2));
    const nearY = Math.max(ry - rh/2, Math.min(cy, ry + rh/2));
    const dx = cx - nearX, dy = cy - nearY;
    return dx * dx + dy * dy < cr * cr;
  }

  // ===== Boss patterny =====
  function updateBoss(boss, frame) {
    if (!boss.alive) return;
    const cfg = boss.cfg;

    // Pohyb
    if (cfg.speed > 0) {
      boss.x += cfg.speed * boss.dir;
      if (boss.x > W - boss.w/2) boss.dir = -1;
      if (boss.x < boss.w/2) boss.dir = 1;
    }

    // Střelba
    if (boss.volleyDelay > 0) {
      boss.volleyDelay--;
      return;
    }

    boss.shootCooldown--;
    if (boss.shootCooldown <= 0) {
      boss.shootCooldown = cfg.shootInterval;
      boss.firedVolley = 0;
    }

    if (boss.firedVolley < boss.volleyCount && boss.shootCooldown > cfg.shootInterval - 5) {
      // Vícestřelba (volley)
      for (let i = 0; i < (boss.firedVolley === 0 ? boss.volleyCount : 0); i++) {
        const angle = Math.PI / 2 + (i - (boss.volleyCount - 1) / 2) * 0.15;
        state.bulletsEnemy.push(createBullet(
          boss.x, boss.y + boss.h/2,
          Math.cos(angle) * cfg.bulletSpeed,
          Math.sin(angle) * cfg.bulletSpeed,
          cfg.bulletSize, 1, '#ff4444'
        ));
      }
      boss.firedVolley = boss.volleyCount;
      boss.volleyDelay = 3;
    }
  }

  // ===== Game loop =====
  let gameFrame = 0;

  function update() {
    gameFrame++;
    const p = state.player;

    // Auto-attack hráče
    p.fireCooldown--;
    if (p.fireCooldown <= 0) {
      p.fireCooldown = p.fireRate;
      state.bulletsPlayer.push(createBullet(
        p.x, p.y - p.h/2,
        0, -6, 3, p.damage, '#4affff'
      ));
    }

    // Pohyb hráče směrem k cíli (touch drag)
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
    // Omezení na obrazovku
    p.x = Math.max(p.w/2, Math.min(W - p.w/2, p.x));
    p.y = Math.max(p.h/2, Math.min(H - p.h/2, p.y));

    // Invincible countdown
    if (p.invincible > 0) p.invincible--;

    // Boss update
    if (state.boss && state.boss.alive) {
      updateBoss(state.boss, gameFrame);
    }

    // Pohyb střel hráče
    for (const b of state.bulletsPlayer) {
      if (!b.alive) continue;
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < -10 || b.x < -10 || b.x > W + 10) b.alive = false;
      // Kolize s bossem
      if (state.boss && state.boss.alive && rectCollide(
        { x: b.x, y: b.y, w: b.size * 2, h: b.size * 2 },
        { x: state.boss.x, y: state.boss.y, w: state.boss.w, h: state.boss.h }
      )) {
        state.boss.hp -= b.dmg;
        b.alive = false;
        state.combo++;
        state.money += 1 + Math.floor(state.combo / 10);
        if (state.boss.hp <= 0) {
          state.boss.hp = 0;
          state.boss.alive = false;
          state.money += 20 + state.bossIndex * 5;
          state.combo = 0;
        }
      }
    }

    // Pohyb nepřátelských střel
    for (const b of state.bulletsEnemy) {
      if (!b.alive) continue;
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > H + 10 || b.x < -10 || b.x > W + 10) b.alive = false;
      // Kolize s hráčem
      if (p.invincible <= 0 && circleRectCollide(b.x, b.y, b.size, p.x, p.y, p.w, p.h)) {
        b.alive = false;
        p.hp--;
        p.invincible = 40;
        state.combo = 0;
        if (p.hp <= 0) {
          p.hp = 0;
          endGame(false);
          return;
        }
      }
    }

    // Cleanup
    state.bulletsPlayer = state.bulletsPlayer.filter(b => b.alive);
    state.bulletsEnemy = state.bulletsEnemy.filter(b => b.alive);

    // Boss dead → další vlna
    if (state.boss && !state.boss.alive && !state.waveTransition) {
      state.waveTransition = 60; // 1s pauza
    }
    if (state.waveTransition > 0) {
      state.waveTransition--;
      if (state.waveTransition <= 0) {
        state.bossIndex++;
        if (state.bossIndex >= BOSSES.length) {
          endGame(true);
          return;
        }
        spawnBoss();
      }
    }

    updateUI();
  }

  function draw() {
    const p = state.player;

    // Pozadí — hvězdy
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Hvězdy (jednoduché tečky)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137.5 + 50) % W;
      const sy = ((i * 97.3 + gameFrame * 0.3) % H);
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boss
    if (state.boss && state.boss.alive) {
      const b = state.boss;
      // Tělo
      ctx.fillStyle = '#8b1a1a';
      ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
      // Kokpit
      ctx.fillStyle = '#4a1a1a';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - b.h/4, b.w * 0.2, b.h * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      // Kanóny
      ctx.fillStyle = '#666';
      ctx.fillRect(b.x - b.w/3, b.y + b.h/2 - 4, 8, 8);
      ctx.fillRect(b.x + b.w/3 - 8, b.y + b.h/2 - 4, 8, 8);
    }

    // Střely hráče
    for (const b of state.bulletsPlayer) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 2, b.y - 4, 4, 8);
    }

    // Nepřátelské střely
    for (const b of state.bulletsEnemy) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hráč (loď)
    if (p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0) {
      // Blikání při invincible
    } else {
      // Trup
      ctx.fillStyle = '#4a7dff';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.h/2);           // špička
      ctx.lineTo(p.x - p.w/2, p.y + p.h/2);   // levý křídlo
      ctx.lineTo(p.x - p.w/4, p.y + p.h/3);   // levý zářez
      ctx.lineTo(p.x, p.y + p.h/2.5);         // střed (tryska)
      ctx.lineTo(p.x + p.w/4, p.y + p.h/3);   // pravý zářez
      ctx.lineTo(p.x + p.w/2, p.y + p.h/2);   // pravý křídlo
      ctx.closePath();
      ctx.fill();

      // Kokpit
      ctx.fillStyle = '#6b9fff';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - p.h/6, p.w * 0.2, p.h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plameny z trysky
      ctx.fillStyle = `rgba(255,${150 + Math.sin(gameFrame * 0.3) * 50},0,0.8)`;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y + p.h/2.5);
      ctx.lineTo(p.x, p.y + p.h/2.5 + 8 + Math.sin(gameFrame * 0.5) * 4);
      ctx.lineTo(p.x + 4, p.y + p.h/2.5);
      ctx.fill();
    }
  }

  // ===== UI update =====
  function updateUI() {
    const p = state.player;
    const b = state.boss;

    // HP bary
    const phPct = Math.max(0, (p.hp / p.maxHp) * 100);
    $('playerHp').style.width = phPct + '%';
    $('playerHpText').textContent = `${p.hp}/${p.maxHp}`;

    if (b && b.alive) {
      const bhPct = Math.max(0, (b.hp / b.maxHp) * 100);
      $('bossHp').style.width = bhPct + '%';
      $('bossHpText').textContent = `${Math.ceil(b.hp)}/${b.maxHp}`;
    } else {
      $('bossHp').style.width = '0%';
      $('bossHpText').textContent = '???';
    }

    $('gameMoney').textContent = state.money;
    $('waveInfo').textContent = state.boss && state.boss.alive
      ? `Boss #${state.bossIndex + 1}: ${state.boss.name}`
      : state.waveTransition > 0
        ? `Příprava na boss #${state.bossIndex + 2}...`
        : 'Vítězství!';
  }

  // ===== Spawn bosse =====
  function spawnBoss() {
    const cfg = BOSSES[state.bossIndex] || BOSSES[BOSSES.length - 1];
    state.boss = createBoss(cfg);
    state.bulletsEnemy = [];
    state.waveTransition = 0;
    state.combo = 0;
  }

  // ===== Touch/drag ovládání =====
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

    const onStart = (e) => {
      e.preventDefault();
      if (state.ended) return;
      state.playerTarget = getPos(e);
    };
    const onMove = (e) => {
      e.preventDefault();
      if (state.ended) return;
      state.playerTarget = getPos(e);
    };
    const onEnd = (e) => {
      e.preventDefault();
      state.playerTarget = null;
    };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
  }

  // ===== Hlavní herní smyčka =====
  function gameLoopFn() {
    if (state.ended) return;
    update();
    draw();
    requestAnimationFrame(gameLoopFn);
  }

  // ===== Konec hry =====
  function endGame(won) {
    state.ended = true;
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
        ? `Zastavil tě ${state.boss.name} (boss #${state.bossIndex + 1})`
        : 'Hra skončila';
    }
    $('resultMoney').textContent = `💰 ${state.money} coinů`;
  }

  // ===== START =====
  function initState() {
    const save = loadSave();
    state = {
      money: save.money,
      bossIndex: save.bossIndex,
      upgrades: save.upgrades,
      player: null,
      boss: null,
      bulletsPlayer: [],
      bulletsEnemy: [],
      playerTarget: null,
      combo: 0,
      waveTransition: 0,
      ended: false
    };
    state.player = createPlayer();
    if (gameLoop) cancelAnimationFrame(gameLoop);
  }

  function start() {
    initState();
    spawnBoss();
    $('menu').classList.add('hidden');
    $('result').classList.add('hidden');
    $('shop').classList.add('hidden');
    $('game').classList.remove('hidden');
    $('gameStatus').textContent = '';
    updateUI();
    state.ended = false;
    gameLoop = requestAnimationFrame(gameLoopFn);
  }

  function quit() {
    if (gameLoop) cancelAnimationFrame(gameLoop);
    const save = loadSave();
    $('menuMoney').textContent = save.money;
    $('menuBossCount').textContent = `Boss #${save.bossIndex + 1}`;
    $('menu').classList.remove('hidden');
    $('game').classList.add('hidden');
    $('result').classList.add('hidden');
    $('shop').classList.add('hidden');
  }

  function restart() {
    start();
  }

  // ===== OBCHOD =====
  const SHOP_ITEMS = [
    { id: 'maxHp', name: '🛡 Pevnější štít', desc: '+2 HP', baseCost: 20, costMult: 1.5, maxLevel: 5 },
    { id: 'damage', name: '⚔ Silnější střely', desc: '+1 poškození', baseCost: 15, costMult: 1.6, maxLevel: 5 },
    { id: 'fireRate', name: '🔫 Rychlejší palba', desc: 'Kratší pauza mezi výstřely', baseCost: 25, costMult: 1.7, maxLevel: 4 },
    { id: 'speed', name: '⚡ Rychlejší loď', desc: '+0.5 rychlosti', baseCost: 15, costMult: 1.4, maxLevel: 5 }
  ];

  function openShop() {
    const save = loadSave();
    state.money = save.money;
    state.upgrades = save.upgrades;

    $('menu').classList.add('hidden');
    $('shop').classList.remove('hidden');
    renderShop();
  }

  function closeShop() {
    saveGame();
    quit();
  }

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

  // ===== Inicializace =====
  setupInput();
  const save = loadSave();
  $('menuMoney').textContent = save.money;
  $('menuBossCount').textContent = `Boss #${save.bossIndex + 1}`;

  return { start, quit, restart, openShop, closeShop, buyUpgrade };
})();

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
