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
  // Každá fáze definuje shoty, které se PŘIDÁVAJÍ k shotům z předchozích fází.
  // Příklad: F1 = [svislý bar], F2 = [svislý bar + 2 diagonální circle]
  // Funkce makePhases vytvoří fáze s hpThresholdy a zachová každé shots pole.

  function makePhases(basePhases) {
    const num = basePhases.length;
    const thresholds = [];
    for (let i = 0; i < num; i++) {
      thresholds.push(1.0 - i / num);
    }
    return thresholds.map((t, i) => ({
      hpThreshold: t,
      shootInterval: basePhases[i].shootInterval,
      shots: basePhases[i].shots
    }));
  }

  // Helper pro definici shotu: { angle: offset od svislice (0=svisle dolů), xOff: horizontální offset od středu bosse, speed, size, shape }
  // angle: kladný = doprava, záporný = doleva; shape: 'bar' (plochý obdélník) nebo 'circle'

  const BOSSES = [
    // 1 SCOUT — 2 fáze
    { name: 'SCOUT', maxHp: 25, w: 70, h: 35, speed: 1.5,
      movePattern: 'sweep', color: '#8B4513', shape: 'triangle',
      phases: makePhases([
        { shootInterval: 80, shots: [
          { angle: 0, xOff: 0, speed: 2.0, size: 6, shape: 'bar' }
        ]},
        { shootInterval: 60, shots: [
          { angle: -0.2, xOff: 0, speed: 2.3, size: 4, shape: 'circle' },
          { angle: 0.2, xOff: 0, speed: 2.3, size: 4, shape: 'circle' }
        ]}
      ]) },
    // 2 BARRACUDA — 3 fáze
    { name: 'BARRACUDA', maxHp: 40, w: 80, h: 38, speed: 2.0,
      movePattern: 'sweep', color: '#CD853F', shape: 'diamond',
      phases: makePhases([
        { shootInterval: 65, shots: [
          { angle: 0, xOff: 0, speed: 2.5, size: 6, shape: 'bar' }
        ]},
        { shootInterval: 55, shots: [
          { angle: -0.18, xOff: 0, speed: 2.8, size: 4, shape: 'circle' },
          { angle: 0.18, xOff: 0, speed: 2.8, size: 4, shape: 'circle' }
        ]},
        { shootInterval: 45, shots: [
          { angle: -0.35, xOff: 0, speed: 3.0, size: 4, shape: 'circle' },
          { angle: 0.35, xOff: 0, speed: 3.0, size: 4, shape: 'circle' }
        ]}
      ]) },
    // 3 JUGGERNAUT — 2 fáze (wide, stationary)
    { name: 'JUGGERNAUT', maxHp: 70, w: 370, h: 50, speed: 0,
      movePattern: 'stationary', color: '#8B0000', shape: 'hexagon',
      phases: makePhases([
        { shootInterval: 70, shots: [
          { angle: 0, xOff: -0.3, speed: 2.2, size: 7, shape: 'bar' },
          { angle: 0, xOff: 0, speed: 2.2, size: 7, shape: 'bar' },
          { angle: 0, xOff: 0.3, speed: 2.2, size: 7, shape: 'bar' }
        ]},
        { shootInterval: 60, shots: [
          { angle: -0.15, xOff: -0.15, speed: 2.4, size: 5, shape: 'circle' },
          { angle: -0.15, xOff: 0.15, speed: 2.4, size: 5, shape: 'circle' },
          { angle: 0.15, xOff: -0.15, speed: 2.4, size: 5, shape: 'circle' },
          { angle: 0.15, xOff: 0.15, speed: 2.4, size: 5, shape: 'circle' }
        ]}
      ]) },
    // 4 VIPER — 2 fáze
    { name: 'VIPER', maxHp: 55, w: 75, h: 32, speed: 2.5,
      movePattern: 'sweep', color: '#556B2F', shape: 'chevron',
      phases: makePhases([
        { shootInterval: 55, shots: [
          { angle: 0, xOff: 0, speed: 3.0, size: 5, shape: 'circle' }
        ]},
        { shootInterval: 45, shots: [
          { angle: 0, xOff: -12, speed: 3.2, size: 5, shape: 'circle' },
          { angle: 0, xOff: 12, speed: 3.2, size: 5, shape: 'circle' }
        ]}
      ]) },
    // 5 FORTRESS — 3 fáze (wide, stationary)
    { name: 'FORTRESS', maxHp: 100, w: 380, h: 55, speed: 0,
      movePattern: 'stationary', color: '#800020', shape: 'trapezoid',
      phases: makePhases([
        { shootInterval: 60, shots: [
          { angle: 0, xOff: -0.3, speed: 2.5, size: 7, shape: 'bar' },
          { angle: 0, xOff: 0, speed: 2.5, size: 7, shape: 'bar' },
          { angle: 0, xOff: 0.3, speed: 2.5, size: 7, shape: 'bar' },
          { angle: 0, xOff: -0.15, speed: 2.5, size: 7, shape: 'bar' },
          { angle: 0, xOff: 0.15, speed: 2.5, size: 7, shape: 'bar' }
        ]},
        { shootInterval: 50, shots: [
          { angle: -0.12, xOff: -0.25, speed: 2.8, size: 5, shape: 'circle' },
          { angle: -0.12, xOff: 0.25, speed: 2.8, size: 5, shape: 'circle' },
          { angle: 0.12, xOff: -0.25, speed: 2.8, size: 5, shape: 'circle' },
          { angle: 0.12, xOff: 0.25, speed: 2.8, size: 5, shape: 'circle' },
          { angle: -0.12, xOff: 0, speed: 2.8, size: 5, shape: 'circle' },
          { angle: 0.12, xOff: 0, speed: 2.8, size: 5, shape: 'circle' }
        ]},
        { shootInterval: 40, shots: [
          { angle: -0.25, xOff: -0.25, speed: 3.0, size: 4, shape: 'circle' },
          { angle: -0.25, xOff: 0.25, speed: 3.0, size: 4, shape: 'circle' },
          { angle: 0.25, xOff: -0.25, speed: 3.0, size: 4, shape: 'circle' },
          { angle: 0.25, xOff: 0.25, speed: 3.0, size: 4, shape: 'circle' },
          { angle: -0.25, xOff: 0, speed: 3.0, size: 4, shape: 'circle' },
          { angle: 0.25, xOff: 0, speed: 3.0, size: 4, shape: 'circle' }
        ]}
      ]) },
    // 6 PHANTOM — 3 fáze
    { name: 'PHANTOM', maxHp: 75, w: 80, h: 35, speed: 2.2,
      movePattern: 'sweep', color: '#4B0082', shape: 'oval',
      phases: makePhases([
        { shootInterval: 50, shots: [
          { angle: 0, xOff: 0, speed: 3.2, size: 5, shape: 'bar' }
        ]},
        { shootInterval: 42, shots: [
          { angle: -0.15, xOff: -8, speed: 3.5, size: 4, shape: 'circle' },
          { angle: 0.15, xOff: 8, speed: 3.5, size: 4, shape: 'circle' }
        ]},
        { shootInterval: 35, shots: [
          { angle: -0.30, xOff: 0, speed: 3.8, size: 4, shape: 'circle' },
          { angle: 0.30, xOff: 0, speed: 3.8, size: 4, shape: 'circle' }
        ]}
      ]) },
    // 7 INFERNO — 3 fáze (wide)
    { name: 'INFERNO', maxHp: 110, w: 360, h: 50, speed: 0.5,
      movePattern: 'sweep', color: '#B22222', shape: 'pentagon',
      phases: makePhases([
        { shootInterval: 50, shots: [
          { angle: 0, xOff: -0.25, speed: 2.8, size: 6, shape: 'bar' },
          { angle: 0, xOff: 0.25, speed: 2.8, size: 6, shape: 'bar' }
        ]},
        { shootInterval: 42, shots: [
          { angle: -0.12, xOff: -0.15, speed: 3.0, size: 5, shape: 'circle' },
          { angle: -0.12, xOff: 0.15, speed: 3.0, size: 5, shape: 'circle' },
          { angle: 0.12, xOff: -0.15, speed: 3.0, size: 5, shape: 'circle' },
          { angle: 0.12, xOff: 0.15, speed: 3.0, size: 5, shape: 'circle' }
        ]},
        { shootInterval: 35, shots: [
          { angle: -0.25, xOff: -0.25, speed: 3.2, size: 5, shape: 'circle' },
          { angle: -0.25, xOff: 0.25, speed: 3.2, size: 5, shape: 'circle' },
          { angle: 0.25, xOff: -0.25, speed: 3.2, size: 5, shape: 'circle' },
          { angle: 0.25, xOff: 0.25, speed: 3.2, size: 5, shape: 'circle' }
        ]}
      ]) },
    // 8 BLITZ — 3 fáze (fast)
    { name: 'BLITZ', maxHp: 90, w: 70, h: 30, speed: 3.5,
      movePattern: 'sweep', color: '#2F4F4F', shape: 'arrow',
      phases: makePhases([
        { shootInterval: 45, shots: [
          { angle: 0, xOff: 0, speed: 3.5, size: 4, shape: 'circle' }
        ]},
        { shootInterval: 38, shots: [
          { angle: 0, xOff: -10, speed: 3.8, size: 4, shape: 'circle' },
          { angle: 0, xOff: 10, speed: 3.8, size: 4, shape: 'circle' }
        ]},
        { shootInterval: 30, shots: [
          { angle: -0.20, xOff: 0, speed: 4.0, size: 3, shape: 'circle' },
          { angle: 0.20, xOff: 0, speed: 4.0, size: 3, shape: 'circle' },
          { angle: -0.40, xOff: 0, speed: 4.0, size: 3, shape: 'circle' },
          { angle: 0.40, xOff: 0, speed: 4.0, size: 3, shape: 'circle' }
        ]}
      ]) },
    // 9 TITAN — 4 fáze (wide)
    { name: 'TITAN', maxHp: 150, w: 380, h: 60, speed: 0.3,
      movePattern: 'sweep', color: '#5B0000', shape: 'octagon',
      phases: makePhases([
        { shootInterval: 55, shots: [
          { angle: 0, xOff: -0.3, speed: 3.0, size: 7, shape: 'bar' },
          { angle: 0, xOff: 0, speed: 3.0, size: 7, shape: 'bar' },
          { angle: 0, xOff: 0.3, speed: 3.0, size: 7, shape: 'bar' }
        ]},
        { shootInterval: 48, shots: [
          { angle: -0.10, xOff: -0.3, speed: 3.2, size: 6, shape: 'circle' },
          { angle: -0.10, xOff: 0, speed: 3.2, size: 6, shape: 'circle' },
          { angle: -0.10, xOff: 0.3, speed: 3.2, size: 6, shape: 'circle' },
          { angle: 0.10, xOff: -0.3, speed: 3.2, size: 6, shape: 'circle' },
          { angle: 0.10, xOff: 0, speed: 3.2, size: 6, shape: 'circle' },
          { angle: 0.10, xOff: 0.3, speed: 3.2, size: 6, shape: 'circle' }
        ]},
        { shootInterval: 40, shots: [
          { angle: -0.20, xOff: -0.2, speed: 3.5, size: 5, shape: 'circle' },
          { angle: -0.20, xOff: 0.2, speed: 3.5, size: 5, shape: 'circle' },
          { angle: 0.20, xOff: -0.2, speed: 3.5, size: 5, shape: 'circle' },
          { angle: 0.20, xOff: 0.2, speed: 3.5, size: 5, shape: 'circle' },
          { angle: -0.20, xOff: 0, speed: 3.5, size: 5, shape: 'circle' },
          { angle: 0.20, xOff: 0, speed: 3.5, size: 5, shape: 'circle' }
        ]},
        { shootInterval: 35, shots: [
          { angle: -0.30, xOff: -0.25, speed: 3.8, size: 5, shape: 'circle' },
          { angle: -0.30, xOff: 0.25, speed: 3.8, size: 5, shape: 'circle' },
          { angle: 0.30, xOff: -0.25, speed: 3.8, size: 5, shape: 'circle' },
          { angle: 0.30, xOff: 0.25, speed: 3.8, size: 5, shape: 'circle' },
          { angle: -0.30, xOff: 0, speed: 3.8, size: 5, shape: 'circle' },
          { angle: 0.30, xOff: 0, speed: 3.8, size: 5, shape: 'circle' }
        ]}
      ]) },
    // 10 OBLIVION — 4 fáze (wide)
    { name: 'OBLIVION', maxHp: 200, w: 380, h: 55, speed: 1.5,
      movePattern: 'sweep', color: '#1a0030', shape: 'star',
      phases: makePhases([
        { shootInterval: 40, shots: [
          { angle: 0, xOff: -0.25, speed: 3.5, size: 6, shape: 'bar' },
          { angle: 0, xOff: 0, speed: 3.5, size: 6, shape: 'bar' },
          { angle: 0, xOff: 0.25, speed: 3.5, size: 6, shape: 'bar' }
        ]},
        { shootInterval: 35, shots: [
          { angle: -0.12, xOff: -0.2, speed: 3.8, size: 5, shape: 'circle' },
          { angle: -0.12, xOff: 0, speed: 3.8, size: 5, shape: 'circle' },
          { angle: -0.12, xOff: 0.2, speed: 3.8, size: 5, shape: 'circle' },
          { angle: 0.12, xOff: -0.2, speed: 3.8, size: 5, shape: 'circle' },
          { angle: 0.12, xOff: 0, speed: 3.8, size: 5, shape: 'circle' },
          { angle: 0.12, xOff: 0.2, speed: 3.8, size: 5, shape: 'circle' }
        ]},
        { shootInterval: 30, shots: [
          { angle: -0.22, xOff: -0.25, speed: 4.0, size: 5, shape: 'circle' },
          { angle: -0.22, xOff: 0.25, speed: 4.0, size: 5, shape: 'circle' },
          { angle: 0.22, xOff: -0.25, speed: 4.0, size: 5, shape: 'circle' },
          { angle: 0.22, xOff: 0.25, speed: 4.0, size: 5, shape: 'circle' },
          { angle: -0.22, xOff: 0, speed: 4.0, size: 5, shape: 'circle' },
          { angle: 0.22, xOff: 0, speed: 4.0, size: 5, shape: 'circle' }
        ]},
        { shootInterval: 25, shots: [
          { angle: -0.35, xOff: -0.3, speed: 4.2, size: 4, shape: 'circle' },
          { angle: -0.35, xOff: 0, speed: 4.2, size: 4, shape: 'circle' },
          { angle: -0.35, xOff: 0.3, speed: 4.2, size: 4, shape: 'circle' },
          { angle: 0.35, xOff: -0.3, speed: 4.2, size: 4, shape: 'circle' },
          { angle: 0.35, xOff: 0, speed: 4.2, size: 4, shape: 'circle' },
          { angle: 0.35, xOff: 0.3, speed: 4.2, size: 4, shape: 'circle' }
        ]}
      ]) }
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

  function createBullet(x, y, vx, vy, size, dmg, color, shape) {
    return { x, y, vx, vy, origVx: vx, origVy: vy, size, dmg, color, shape: shape || 'circle', alive: true };
  }

  function createBoss(cfg) {
    const phase = cfg.phases[0];
    return {
      cfg, name: cfg.name, x: W / 2, y: 55,
      w: cfg.w, h: cfg.h,
      hp: cfg.maxHp, maxHp: cfg.maxHp,
      dir: -1,
      shootCooldown: phase.shootInterval,
      alive: true, fired: false,
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
    if (boss.shootCooldown > 0) { boss.shootCooldown--; }
    else {
      // Sesbíráme shoty ze všech fází 0..currentPhase a vystřelíme je najednou
      let allShots = [];
      for (let f = 0; f <= boss.currentPhase; f++) {
        const ph = cfg.phases[f];
        for (const s of ph.shots) {
          allShots.push(s);
        }
      }
      for (const s of allShots) {
        // xOff: u wide bossů (w>200) jako násobek w, jinak jako absolutní pixely
        const xOff = typeof s.xOff === 'number' && Math.abs(s.xOff) >= 1 ? s.xOff : (s.xOff * cfg.w);
        const angle = Math.PI / 2 + s.angle;
        state.bulletsEnemy.push(createBullet(
          boss.x + xOff, boss.y + cfg.h / 2,
          Math.cos(angle) * s.speed,
          Math.sin(angle) * s.speed,
          s.size, 1, '#ff4444', s.shape
        ));
      }
      boss.shootCooldown = cfg.phases[boss.currentPhase].shootInterval;
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

    // Boss dead → pozastavit a ukázat pickup
    if (state.boss && !state.boss.alive && !state.waveTransition && !state.pickupActive) {
      // Okamžitě smažeme všechny nepřátelské projektily
      state.bulletsEnemy = [];
      state.waveTransition = 20;
    }
    if (state.waveTransition > 0) {
      state.waveTransition--;
      if (state.waveTransition <= 0 && state.boss && !state.boss.alive) {
        if (state.bossIndex < BOSSES.length - 1) {
          stopMusic();
          if (gameLoop) cancelAnimationFrame(gameLoop);
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

      // Barva těla podle fáze
      const phaseColors = ['#8b1a1a', '#cc0000', '#ff3333', '#ff6666'];
      const pIdx = Math.min(b.currentPhase, phaseColors.length - 1);
      ctx.fillStyle = phaseColors[pIdx];

      // === Tvar podle cfg.shape ===
      const drawShape = (cx, cy, cw, ch, shape) => {
        ctx.beginPath();
        switch (shape) {
          case 'triangle':
            ctx.moveTo(cx, cy - ch/2);
            ctx.lineTo(cx - cw/2, cy + ch/2);
            ctx.lineTo(cx + cw/2, cy + ch/2);
            break;
          case 'diamond':
            ctx.moveTo(cx, cy - ch/2);
            ctx.lineTo(cx + cw/2, cy);
            ctx.lineTo(cx, cy + ch/2);
            ctx.lineTo(cx - cw/2, cy);
            break;
          case 'hexagon':
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2 - Math.PI/2;
              const px = cx + (cw/2) * Math.cos(a);
              const py = cy + (ch/2) * Math.sin(a);
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            break;
          case 'chevron':
            ctx.moveTo(cx - cw/2, cy + ch/2);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx + cw/2, cy + ch/2);
            ctx.lineTo(cx, cy + ch/4);
            break;
          case 'trapezoid':
            ctx.moveTo(cx - cw/3, cy - ch/2);
            ctx.lineTo(cx + cw/3, cy - ch/2);
            ctx.lineTo(cx + cw/2, cy + ch/2);
            ctx.lineTo(cx - cw/2, cy + ch/2);
            break;
          case 'oval':
            ctx.ellipse(cx, cy, cw/2, ch/2, 0, 0, Math.PI * 2);
            break;
          case 'pentagon':
            for (let i = 0; i < 5; i++) {
              const a = (i / 5) * Math.PI * 2 - Math.PI/2;
              const px = cx + (cw/2) * Math.cos(a);
              const py = cy + (ch/2) * Math.sin(a);
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            break;
          case 'arrow':
            ctx.moveTo(cx - cw/2, cy + ch/2);
            ctx.lineTo(cx, cy - ch/2);
            ctx.lineTo(cx + cw/2, cy + ch/2);
            ctx.lineTo(cx, cy + ch/4);
            break;
          case 'octagon':
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 - Math.PI/2;
              const px = cx + (cw/2) * Math.cos(a);
              const py = cy + (ch/2) * Math.sin(a);
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            break;
          case 'star':
            for (let i = 0; i < 10; i++) {
              const a = (i / 10) * Math.PI * 2 - Math.PI/2;
              const r = i % 2 === 0 ? cw/2 : cw/4;
              const px = cx + r * Math.cos(a);
              const py = cy + r * Math.sin(a);
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            break;
          default:
            ctx.rect(cx - cw/2, cy - ch/2, cw, ch);
        }
        ctx.closePath();
        ctx.fill();
      };

      drawShape(b.x, b.y, b.w, b.h, cfg.shape || 'rect');

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

      // Kanóny (podle počtu shotů v aktuální fázi)
      ctx.fillStyle = '#555';
      const curPhase = cfg.phases[b.currentPhase];
      const totalShots = curPhase.shots.length;
      const canons = totalShots > 1 ? Math.min(totalShots, 5) : 1;
      for (let i = 0; i < canons; i++) {
        const cx = b.x - b.w/4 + i * (b.w / Math.max(canons, 1));
        ctx.fillRect(cx - 3, b.y + b.h/2 - 2, 6, 6);
      }

      // Ozdobné pruhy (podle % HP)
      const pct = b.hp / b.maxHp;
      if (pct < 0.3) {
        ctx.fillStyle = '#ff444488';
        ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, 3);
      }
    }
    // Střely hráče
    for (const b of state.bulletsPlayer) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 2, b.y - 5, 4, 10);
    }

    // Nepřátelské střely — tvar podle b.shape
    for (const b of state.bulletsEnemy) {
      ctx.fillStyle = b.color;
      if (b.shape === 'bar') {
        // Plochý obdélník (široký, nízký)
        const bw = b.size * 5;
        ctx.fillRect(b.x - bw/2, b.y - b.size/2, bw, b.size);
        ctx.fillStyle = 'rgba(255,100,100,0.3)';
        ctx.fillRect(b.x - bw/2 - 1, b.y - b.size/2 - 1, bw + 2, b.size + 2);
      } else {
        // Kulička
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,100,100,0.3)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * 1.8 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
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

      // Separátory fází v HP baru
      const phases = b.cfg.phases;
      const sepContainer = $('bossPhaseSeparators');
      let sepHTML = '';
      for (let i = 1; i < phases.length; i++) {
        const pct = phases[i].hpThreshold * 100;
        sepHTML += `<div class="phase-sep" style="left: ${pct}%"></div>`;
      }
      sepContainer.innerHTML = sepHTML;

      // Indikátor fáze
      const phaseText = ['F1', 'F2', 'F3', 'F4'];
      const pIdx = Math.min(b.currentPhase, phaseText.length - 1);
      $('bossPhaseIndicator').textContent = phaseText[pIdx];
      $('bossPhaseIndicator').style.color = ['#4a7dff', '#4ecca3', '#ffd700', '#e94560'][pIdx] || '#ffd700';
    } else {
      $('bossHpOutside').style.width = '0%';
      $('bossNameHud').textContent = state.waveTransition > 0 ? 'Příprava...' : '???';
      $('bossPhaseSeparators').innerHTML = '';
      $('bossPhaseIndicator').textContent = '--';
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
    if (!state.pickupActive && !state.ended) {
      requestAnimationFrame(gameLoopFn);
    }
  }

  // ===== Konec =====
  function endGame(won) {
    state.ended = true;
    stopMusic();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    // Uložit index pro zprávu
    const diedOnBoss = state.bossIndex;
    // Reset při smrti i při výhře (další run od #1)
    state.bossIndex = 0;
    saveGame();

    // Zavřít pickup okno, pokud bylo otevřené
    $('pickup').classList.add('hidden');
    state.pickupActive = false;

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
        ? `Zastavil tě ${state.boss.name} (#${diedOnBoss + 1})`
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

  function afterDeathShop() {
    // Z result obrazovky rovnou do shopu
    $('result').classList.add('hidden');
    $('shop').classList.remove('hidden');
    const save = loadSave();
    state.money = save.money;
    state.upgrades = save.upgrades;
    renderShop();
  }

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
    startMusic();
    gameLoop = requestAnimationFrame(gameLoopFn);
  }

  // Aplikuj dočasné efekty na střely a updaty
  function applyTempEffects() {
    const p = state.player;

    // Zpomalení nepřátelských střel
    if (p.temp.slowTimer > 0) {
      p.temp.slowTimer--;
      const mult = 0.3 + 0.7 * (p.temp.slowTimer / 360);
      for (const b of state.bulletsEnemy) {
        if (b.alive && b.origVx) {
          b.vx = b.origVx * mult;
          b.vy = b.origVy * mult;
        }
      }
    } else {
      // Obnovení původní rychlosti — pouze pokud byla změněna
      for (const b of state.bulletsEnemy) {
        if (b.alive && b.origVx && b.vx !== b.origVx) {
          b.vx = b.origVx;
          b.vy = b.origVy;
        }
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
            // Nastav rychlost PŘÍMO k cíli, NEPŘIDÁVEJ (žádná kumulace)
            b.vx = (dx / dist) * 6.5;
            b.vy = (dy / dist) * 6.5;
          }
        }
      }
    } else {
      // Když homing skončí, vrať střely na původní trajektorii
      for (const b of state.bulletsPlayer) {
        if (b.alive && b.origVx !== undefined) {
          b.vx = b.origVx;
          b.vy = b.origVy;
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

  return { start, quit, restart, openShop, closeShop, buyUpgrade, pickUpgrade, afterDeathShop };
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
