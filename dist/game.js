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

  // ===== Boss konfigurace (10 unikátních s fázemi) =====
  const BOSSES = [
    { name: 'SCOUT', maxHp: 25, w: 50, h: 25, speed: 1.2,
      movePattern: 'sweep', color: '#8B4513',
      phases: [
        { hpThreshold: 1.0, shootInterval: 80, bulletSpeed: 2.0, bulletSize: 4, volleyCount: 1, spreadDeg: 0.10 },
        { hpThreshold: 0.5, shootInterval: 60, bulletSpeed: 2.3, bulletSize: 4, volleyCount: 1, spreadDeg: 0.12 }
      ] },
    { name: 'BARRACUDA', maxHp: 40, w: 70, h: 30, speed: 1.8,
      movePattern: 'sweep', color: '#CD853F',
      phases: [
        { hpThreshold: 1.0, shootInterval: 65, bulletSpeed: 2.5, bulletSize: 4, volleyCount: 1, spreadDeg: 0.08 },
        { hpThreshold: 0.5, shootInterval: 55, bulletSpeed: 2.8, bulletSize: 4, volleyCount: 1, spreadDeg: 0.15 },
        { hpThreshold: 0.25, shootInterval: 45, bulletSpeed: 3.0, bulletSize: 4, volleyCount: 2, spreadDeg: 0.15 }
      ] },
    { name: 'JUGGERNAUT', maxHp: 70, w: 100, h: 40, speed: 0,
      movePattern: 'stationary', color: '#8B0000',
      phases: [
        { hpThreshold: 1.0, shootInterval: 70, bulletSpeed: 2.2, bulletSize: 5, volleyCount: 1, spreadDeg: 0.08 },
        { hpThreshold: 0.6, shootInterval: 60, bulletSpeed: 2.4, bulletSize: 5, volleyCount: 2, spreadDeg: 0.12 }
      ] },
    { name: 'VIPER', maxHp: 55, w: 60, h: 28, speed: 2.5,
      movePattern: 'sweep', color: '#556B2F',
      phases: [
        { hpThreshold: 1.0, shootInterval: 55, bulletSpeed: 3.0, bulletSize: 3, volleyCount: 1, spreadDeg: 0.06 },
        { hpThreshold: 0.5, shootInterval: 45, bulletSpeed: 3.2, bulletSize: 3, volleyCount: 2, spreadDeg: 0.15 }
      ] },
    { name: 'FORTRESS', maxHp: 100, w: 120, h: 50, speed: 0,
      movePattern: 'stationary', color: '#800020',
      phases: [
        { hpThreshold: 1.0, shootInterval: 60, bulletSpeed: 2.5, bulletSize: 6, volleyCount: 2, spreadDeg: 0.12 },
        { hpThreshold: 0.6, shootInterval: 50, bulletSpeed: 2.8, bulletSize: 5, volleyCount: 3, spreadDeg: 0.13 },
        { hpThreshold: 0.3, shootInterval: 40, bulletSpeed: 3.0, bulletSize: 5, volleyCount: 3, spreadDeg: 0.18 }
      ] },
    { name: 'PHANTOM', maxHp: 75, w: 65, h: 30, speed: 2.0,
      movePattern: 'sweep', color: '#4B0082',
      phases: [
        { hpThreshold: 1.0, shootInterval: 50, bulletSpeed: 3.2, bulletSize: 3, volleyCount: 1, spreadDeg: 0.10 },
        { hpThreshold: 0.5, shootInterval: 42, bulletSpeed: 3.5, bulletSize: 3, volleyCount: 2, spreadDeg: 0.14 },
        { hpThreshold: 0.25, shootInterval: 35, bulletSpeed: 3.8, bulletSize: 3, volleyCount: 3, spreadDeg: 0.16 }
      ] },
    { name: 'INFERNO', maxHp: 110, w: 100, h: 45, speed: 0.5,
      movePattern: 'sweep', color: '#B22222',
      phases: [
        { hpThreshold: 1.0, shootInterval: 50, bulletSpeed: 2.8, bulletSize: 5, volleyCount: 2, spreadDeg: 0.10 },
        { hpThreshold: 0.6, shootInterval: 42, bulletSpeed: 3.0, bulletSize: 5, volleyCount: 3, spreadDeg: 0.14 },
        { hpThreshold: 0.3, shootInterval: 35, bulletSpeed: 3.2, bulletSize: 5, volleyCount: 4, spreadDeg: 0.16 }
      ] },
    { name: 'BLITZ', maxHp: 90, w: 55, h: 25, speed: 3.0,
      movePattern: 'sweep', color: '#2F4F4F',
      phases: [
        { hpThreshold: 1.0, shootInterval: 45, bulletSpeed: 3.5, bulletSize: 3, volleyCount: 1, spreadDeg: 0.08 },
        { hpThreshold: 0.5, shootInterval: 38, bulletSpeed: 3.8, bulletSize: 3, volleyCount: 2, spreadDeg: 0.12 },
        { hpThreshold: 0.25, shootInterval: 30, bulletSpeed: 4.0, bulletSize: 3, volleyCount: 3, spreadDeg: 0.15 }
      ] },
    { name: 'TITAN', maxHp: 150, w: 140, h: 55, speed: 0.3,
      movePattern: 'sweep', color: '#5B0000',
      phases: [
        { hpThreshold: 1.0, shootInterval: 55, bulletSpeed: 3.0, bulletSize: 6, volleyCount: 2, spreadDeg: 0.10 },
        { hpThreshold: 0.7, shootInterval: 48, bulletSpeed: 3.2, bulletSize: 6, volleyCount: 3, spreadDeg: 0.12 },
        { hpThreshold: 0.4, shootInterval: 40, bulletSpeed: 3.5, bulletSize: 6, volleyCount: 4, spreadDeg: 0.14 },
        { hpThreshold: 0.2, shootInterval: 35, bulletSpeed: 3.8, bulletSize: 5, volleyCount: 5, spreadDeg: 0.16 }
      ] },
    { name: 'OBLIVION', maxHp: 200, w: 130, h: 50, speed: 1.5,
      movePattern: 'sweep', color: '#1a0030',
      phases: [
        { hpThreshold: 1.0, shootInterval: 40, bulletSpeed: 3.5, bulletSize: 5, volleyCount: 2, spreadDeg: 0.10 },
        { hpThreshold: 0.7, shootInterval: 35, bulletSpeed: 3.8, bulletSize: 5, volleyCount: 3, spreadDeg: 0.12 },
        { hpThreshold: 0.4, shootInterval: 30, bulletSpeed: 4.0, bulletSize: 5, volleyCount: 4, spreadDeg: 0.14 },
        { hpThreshold: 0.2, shootInterval: 25, bulletSpeed: 4.2, bulletSize: 4, volleyCount: 5, spreadDeg: 0.18 }
      ] }
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
      x: W / 2, y: H - 60, w: 24, h: 26,
      maxHp: 3 + (u.maxHp || 0),
      hp: 3 + (u.maxHp || 0),
      speed: 3.0 + (u.speed || 0) * 0.5,
      fireRate: Math.max(5, 20 - (u.fireRate || 0) * 3),
      damage: 1 + (u.damage || 0),
      multishot: Math.min(3, Math.floor((u.multishot || 0))),
      crit: Math.min(3, Math.floor((u.crit || 0))),
      shield: Math.min(1, Math.floor((u.shield || 0))),
      shieldHp: Math.min(1, Math.floor((u.shield || 0))),
      fireCooldown: 0, invincible: 0, temp: {}
    };
  }

  function createBullet(x, y, vx, vy, size, dmg, color) {
    return { x, y, vx, vy, size, dmg, color, alive: true };
  }

  function createBoss(cfg) {
    const phase = cfg.phases[0];
    return {
      cfg, name: cfg.name, x: W / 2, y: 55,
      w: cfg.w, h: cfg.h,
      hp: cfg.maxHp, maxHp: cfg.maxHp,
      dir: -1, // začíná doleva
      shootCooldown: phase.shootInterval,
      alive: true, volleyCount: phase.volleyCount,
      firedVolley: 0, volleyDelay: 0,
      spreadBase: 0,
      currentPhase: 0,
      phaseFlash: 0
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

    // === Fáze podle HP ===
    const hpPct = boss.hp / boss.maxHp;
    let newPhase = 0;
    for (let i = cfg.phases.length - 1; i >= 0; i--) {
      if (hpPct <= cfg.phases[i].hpThreshold) { newPhase = i; break; }
    }
    if (newPhase !== boss.currentPhase) {
      boss.currentPhase = newPhase;
      boss.phaseFlash = 15; // bliknutí při změně fáze
    }

    // === Fixní pohyb (vždy, nezávisle na střelbě) ===
    if (cfg.movePattern === 'sweep') {
      boss.x += cfg.speed * boss.dir;
      if (boss.x < boss.w/2) { boss.dir = 1; }
      if (boss.x > W - boss.w/2) { boss.dir = -1; }
    }

    // === Střelba ===
    if (boss.volleyDelay > 0) { boss.volleyDelay--; }
    else {
      boss.shootCooldown--;
      if (boss.shootCooldown <= 0) {
        boss.shootCooldown = cfg.phases[boss.currentPhase].shootInterval;
        boss.firedVolley = 0;
      }
      const phase = cfg.phases[boss.currentPhase];
      if (boss.firedVolley < phase.volleyCount && boss.shootCooldown > cfg.phases[boss.currentPhase].shootInterval - 5) {
        for (let i = 0; i < phase.volleyCount; i++) {
          const angle = Math.PI / 2 + (i - (phase.volleyCount - 1) / 2) * phase.spreadDeg + (boss.spreadBase || 0);
          state.bulletsEnemy.push(createBullet(
            boss.x, boss.y + boss.h/2,
            Math.cos(angle) * phase.bulletSpeed,
            Math.sin(angle) * phase.bulletSpeed,
            phase.bulletSize, 1, '#ff4444'
          ));
        }
        boss.firedVolley = phase.volleyCount;
        boss.volleyDelay = 2;
      }
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
          spread, -6.5, 3, p.damage, '#4affff'
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
        let dmgDealt = b.dmg;
        const p = state.player;
        if ((p.temp.critChance || p.crit > 0) && Math.random() < (0.1 * p.crit + (p.temp.critChance || 0))) {
          dmgDealt *= 3;
        }
        state.boss.hp -= dmgDealt;
        b.alive = false;
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
        if (p.shieldHp > 0) {
          p.shieldHp--;
          sfxHit();
        } else {
          p.hp--;
          p.invincible = 40;
          state.combo = 0;
          sfxPlayerHit();
        }
        if (p.hp <= 0) {
          if (p.temp.hasExtraLife) {
            p.temp.hasExtraLife = false;
            p.hp = 1;
            p.invincible = 60;
            sfxHit();
          } else {
            p.hp = 0;
            endGame(false);
            return;
          }
        }
      }
    }

    // Cleanup
    state.bulletsPlayer = state.bulletsPlayer.filter(b => b.alive);
    state.bulletsEnemy = state.bulletsEnemy.filter(b => b.alive);

    // Boss dead → výběr dočasného upgradu
    if (state.boss && !state.boss.alive && !state.waveTransition && !state.pickupActive) {
      state.waveTransition = 30; // krátká pauza před pickupe
    }
    if (state.waveTransition > 0) {
      state.waveTransition--;
      if (state.waveTransition <= 0 && state.boss && !state.boss.alive) {
        if (state.bossIndex < BOSSES.length - 1) {
          showPickup();
          return;
        } else {
          state.bossIndex++;
          endGame(true);
          return;
        }
      }
    }

    // Dočasné efekty
    applyTempEffects();
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

      // Blikání při změně fáze
      if (b.phaseFlash > 0) b.phaseFlash--;

      // Stín/tělo
      const phaseColors = ['#8b1a1a', '#cc0000', '#ff3333', '#ff6666'];
      const pIdx = Math.min(b.currentPhase, phaseColors.length - 1);
      ctx.fillStyle = phaseColors[pIdx];
      ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);

      // Zářivý okraj při změně fáze
      if (b.phaseFlash > 0 && b.phaseFlash % 3 < 2) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x - b.w/2 - 2, b.y - b.h/2 - 2, b.w + 4, b.h + 4);
      }

      // Kokpit
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - b.h/4, b.w * 0.15, b.h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Kanóny (podle aktuální fáze)
      ctx.fillStyle = '#555';
      const canons = b.volleyCount > 1 ? Math.min(b.volleyCount, 3) : 1;
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

      // Indikace fáze
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Fáze ${b.currentPhase + 1}/${cfg.phases.length}`, b.x, b.y - b.h/2 - 14);
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

    // Srdíčka (životy hráče) — kreslí se do canvasu dole
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    let hpText = '';
    for (let i = 0; i < p.maxHp; i++) {
      hpText += (i < p.hp) ? '❤️' : '🖤';
    }
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(hpText, 10, H - 8);

    // Štít indikace
    if (p.shieldHp > 0) {
      ctx.fillStyle = '#4affff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`🛡 ${'■'.repeat(p.shieldHp)}`, 10, H - 24);
    }

    // Dron — krouží kolem hráče
    if (p.temp && p.temp.droneCount > 0) {
      const angle = gameFrame * 0.05;
      for (let i = 0; i < p.temp.droneCount; i++) {
        const da = angle + i * Math.PI * 2 / p.temp.droneCount;
        const dx = p.x + Math.cos(da) * 30;
        const dy = p.y + Math.sin(da) * 30;
        ctx.fillStyle = '#4affff';
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(74,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
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
    ['maxHp','speed','fireRate','damage','multishot','shield','crit'].forEach(k => defUpg[k] = save.upgrades[k] || 0);
    state = {
      money: save.money, bossIndex: save.bossIndex, upgrades: defUpg,
      player: null, boss: null,
      bulletsPlayer: [], bulletsEnemy: [],
      playerTarget: null, combo: 0,
      waveTransition: 0, ended: false, pickupActive: false
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
    { id: 'maxHp', name: '🛡 Pevnější štít', desc: '+1 max HP', baseCost: 15, costMult: 1.6, maxLevel: 5 },
    { id: 'damage', name: '⚔ Silnější střely', desc: '+1 poškození', baseCost: 12, costMult: 1.7, maxLevel: 5 },
    { id: 'fireRate', name: '🔫 Rychlejší palba', desc: 'Zkracuje pauzu mezi výstřely', baseCost: 20, costMult: 1.8, maxLevel: 4 },
    { id: 'speed', name: '⚡ Rychlejší loď', desc: '+0.5 rychlosti pohybu', baseCost: 10, costMult: 1.5, maxLevel: 5 },
    { id: 'multishot', name: '💥 Vícenásobná střela', desc: '+1 střela na výstřel', baseCost: 30, costMult: 2.0, maxLevel: 3 },
    { id: 'shield', name: '🛡 Štít', desc: 'Absorbuje 1 zásah', baseCost: 20, costMult: 2.0, maxLevel: 1 },
    { id: 'crit', name: '⚡ Kritický zásah', desc: '10% šance na 3× damage', baseCost: 25, costMult: 2.0, maxLevel: 3 }
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

  // ===== DOČASNÉ UPGRADY (pickup po bossovi) =====
  const TEMP_UPGRADES = [
    { id: 'tempShield', name: '🛡 Štít', desc: 'Absorbuje 1 zásah' },
    { id: 'tempSlow', name: '⏱ Zpomalení', desc: 'Nepřátelské střely na 6 s zpomalené' },
    { id: 'tempBlast', name: '💥 Výbuch', desc: 'Zničí všechny střely na obrazovce' },
    { id: 'tempHoming', name: '🧲 Navádění', desc: 'Na 6 s střely letí za bossem' },
    { id: 'tempExtraLife', name: '💖 Extra život', desc: 'Po smrti pokračuješ s 1 HP' },
    { id: 'tempDrone', name: '🌀 Dron', desc: 'Dron sestřelí 1 střelu za vteřinu' }
  ];

  function showPickup() {
    state.pickupActive = true;
    $('game').classList.add('hidden');
    $('pickup').classList.remove('hidden');

    // Vyber 3 náhodné (nebo míň, pokud jich je málo)
    const shuffled = [...TEMP_UPGRADES].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);

    $('pickupItems').innerHTML = choices.map(c => `
      <div class="pickup-card" onclick="game.pickUpgrade('${c.id}')">
        <div class="pickup-name">${c.name}</div>
        <div class="pickup-desc">${c.desc}</div>
      </div>
    `).join('');
  }

  function pickUpgrade(id) {
    if (!state.pickupActive) return;
    state.pickupActive = false;
    $('pickup').classList.add('hidden');
    $('game').classList.remove('hidden');

    const p = state.player;
    switch (id) {
      case 'tempShield':
        p.shieldHp = (p.shieldHp || 0) + 1; break;
      case 'tempSlow':
        p.temp.slowTimer = 360; break; // 6 s při 60 fps
      case 'tempBlast':
        state.bulletsEnemy = []; break;
      case 'tempHoming':
        p.temp.homingTimer = 360; break;
      case 'tempExtraLife':
        p.temp.hasExtraLife = true; break;
      case 'tempDrone':
        p.temp.droneCount = (p.temp.droneCount || 0) + 1; break;
    }

    // Nastartuj další stage
    state.bossIndex++;
    if (state.bossIndex >= BOSSES.length) { endGame(true); return; }
    spawnBoss();
    state.ended = false;
  }

  // Aplikuj dočasné efekty na střely a updaty
  function applyTempEffects() {
    const p = state.player;

    // Zpomalení nepřátelských střel
    if (p.temp.slowTimer > 0) {
      p.temp.slowTimer--;
      for (const b of state.bulletsEnemy) {
        if (b.alive) { b.vx *= 0.97; b.vy *= 0.97; }
      }
    }

    // Navádění střel
    if (p.temp.homingTimer > 0) {
      p.temp.homingTimer--;
      if (state.boss && state.boss.alive) {
        for (const b of state.bulletsPlayer) {
          if (!b.alive) continue;
          const dx = state.boss.x - b.x;
          const dy = state.boss.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 10) {
            b.vx += (dx / dist) * 0.3;
            b.vy += (dy / dist) * 0.3;
            const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (spd > 8) { b.vx = (b.vx / spd) * 8; b.vy = (b.vy / spd) * 8; }
          }
        }
      }
    }

    // Kritický zásah — aplikuju přímo u střely
    // Dron — sestřelí nepřátelské střely
    if (p.temp.droneCount > 0 && gameFrame % 60 === 0) {
      let shots = p.temp.droneCount;
      for (const b of state.bulletsEnemy) {
        if (!b.alive || shots <= 0) continue;
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < 120) {
          b.alive = false;
          shots--;
        }
      }
    }
  }

  // ===== Init =====
  setupInput();
  const save = loadSave();
  $('menuMoney').textContent = save.money;
  $('menuBossCount').textContent = `Boss #${Math.min(save.bossIndex + 1, BOSSES.length)}`;

  return { start, quit, restart, openShop, closeShop, buyUpgrade, pickUpgrade };
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
