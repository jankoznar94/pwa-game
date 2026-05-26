const game = (() => {
  'use strict';

  // ===== Herní konstanty =====
  const CONFIG = {
    player: { maxHp: 100, minHeal: 8, maxHeal: 20, healCount: 3 },
    boss:   { maxHp: 200 },
    attack: { minDmg: 5, maxDmg: 18 },
    dodge:  { chance: 0.55 },
    // Fáze bossů podle % HP
    phases: [
      { below: 1.0,  name: '🔵 Normální' },
      { below: 0.7,  name: '🟡 Naštvaný' },
      { below: 0.4,  name: '🔴 Zuřivý' },
      { below: 0.2,  name: '💀 Zoufalý' }
    ],
    messages: {
      playerAttack: [
        'Trefil jsi bosse za {dmg}!',
        'Udeřil jsi za {dmg}!',
        'Dal jsi ránu za {dmg}!'
      ],
      bossAttack: [
        'Boss tě trefil za {dmg}!',
        'Boss udeřil za {dmg}!',
        'Boss tě zasáhl za {dmg}!'
      ],
      dodge: ['Uhnul jsi!', 'Vyhnul ses útoku!', 'Boss minul!'],
      heal: ['Vyléčil ses o {dmg}!', 'Získal jsi {dmg} HP!', 'Léčení obnovilo {dmg} HP!'],
      bossPhase: ['Boss se rozzuřil!', 'Boss je vzteklejší!']
    }
  };

  // ===== Stav =====
  let state = {};
  let logEntries = [];
  let animFrame = null;

  // ===== Canvas =====
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');

  // ===== DOM reference =====
  const $ = id => document.getElementById(id);
  const logContent = $('logContent');

  // ===== Pomocné =====
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ===== Log =====
  function addLog(msg, cls = '') {
    logEntries.push({ msg, cls });
    if (logEntries.length > 50) logEntries.shift();
    renderLog();
  }

  function renderLog() {
    logContent.innerHTML = logEntries.map(e =>
      `<span class="log-entry ${e.cls}">${e.msg}</span>`
    ).join('');
    $('log').scrollTop = $('log').scrollHeight;
  }

  // ===== Boss fáze =====
  function getPhase(pct) {
    for (const p of CONFIG.phases) {
      if (pct <= p.below) return p;
    }
    return CONFIG.phases[0];
  }

  function updatePhaseDisplay() {
    const pct = state.boss.hp / CONFIG.boss.maxHp;
    const phase = getPhase(pct);
    $('phaseDisplay').textContent = phase.name;
  }

  // ===== Zobrazení HP barů =====
  function updateBars() {
    const ph = state.player;
    const bh = state.boss;
    const phPct = Math.max(0, (ph.hp / CONFIG.player.maxHp) * 100);
    const bhPct = Math.max(0, (bh.hp / CONFIG.boss.maxHp) * 100);
    $('playerHp').style.width = phPct + '%';
    $('playerHpText').textContent = ph.hp;
    $('bossHp').style.width = bhPct + '%';
    $('bossHpText').textContent = bh.hp;
    updatePhaseDisplay();
  }

  // ===== Canvas kreslení =====
  function drawArena() {
    const w = canvas.width;
    const h = canvas.height;

    // Pozadí
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, w, h);

    // Podlaha
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    // Boss (velká postava vpravo)
    const bossX = w * 0.7;
    const bossY = h * 0.55;
    const bossSize = 40 + (1 - state.boss.hp / CONFIG.boss.maxHp) * 8; // větší když má méně HP

    // Boss tělo
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.arc(bossX, bossY, bossSize, 0, Math.PI * 2);
    ctx.fill();

    // Boss oči (rozzlobené)
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(bossX - 12, bossY - 8, 6, 0, Math.PI * 2);
    ctx.arc(bossX + 12, bossY - 8, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bossX - 12, bossY - 7, 3, 0, Math.PI * 2);
    ctx.arc(bossX + 12, bossY - 7, 3, 0, Math.PI * 2);
    ctx.fill();

    // Boss ústa (čára)
    ctx.strokeStyle = '#500';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bossX, bossY + 8, 15, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Boss HP bar nad hlavou
    const barW = 70;
    const barH = 8;
    const barX = bossX - barW / 2;
    const barY = bossY - bossSize - 16;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#e94560';
    const bossPct = Math.max(0, state.boss.hp / CONFIG.boss.maxHp);
    ctx.fillRect(barX, barY, barW * bossPct, barH);

    // Boss jméno
    ctx.fillStyle = '#ccc';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', bossX, barY - 4);

    // Boss fáze
    const phase = getPhase(bossPct);
    ctx.fillStyle = '#ffd700';
    ctx.font = '9px sans-serif';
    ctx.fillText(phase.name, bossX, barY - 14);

    // Hráč (vlevo)
    const px = w * 0.25;
    const py = h * 0.6;
    const pSize = 25;

    // Tělo
    ctx.fillStyle = '#4ecca3';
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();

    // Obrys
    ctx.strokeStyle = '#36b889';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Oči hráče
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 7, py - 5, 5, 0, Math.PI * 2);
    ctx.arc(px + 7, py - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(px - 7, py - 4, 3, 0, Math.PI * 2);
    ctx.arc(px + 7, py - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Úsměv
    ctx.strokeStyle = '#2d8a6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py + 3, 8, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Štít (kolečko kolem)
    ctx.strokeStyle = 'rgba(78,204,163,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, pSize + 8, 0, Math.PI * 2);
    ctx.stroke();

    // HP text pod hráčem
    ctx.fillStyle = '#4ecca3';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.player.hp} / ${CONFIG.player.maxHp}`, px, py + pSize + 22);
  }

  // ===== Animace (bliknutí při zásahu) =====
  function flashScreen(color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function playAnim(type) {
    let frames = 0;
    const maxFrames = type === 'hit' ? 6 : 4;

    function frame() {
      if (frames >= maxFrames) {
        drawArena();
        return;
      }
      if (frames % 2 === 0) {
        const c = type === 'hit' ? 'rgba(255,0,0,0.25)' : 'rgba(78,204,163,0.2)';
        flashScreen(c);
      } else {
        drawArena();
      }
      frames++;
      animFrame = requestAnimationFrame(frame);
    }
    frame();
  }

  // ===== Boss útok (volá se po akci hráče) =====
  function bossTurn() {
    const pct = state.boss.hp / CONFIG.boss.maxHp;
    // Boss je silnější, když má méně HP
    const dmgMult = 1 + (1 - pct) * 0.6; // max +60% damage
    const baseDmg = rand(6, 14);
    const dmg = Math.round(baseDmg * dmgMult);

    if (state.player.isDodging) {
      if (Math.random() < CONFIG.dodge.chance) {
        addLog(pick(CONFIG.messages.dodge), 'log-info');
        state.player.isDodging = false;
        drawArena();
        return;
      }
      state.player.isDodging = false;
    }

    state.player.hp = Math.max(0, state.player.hp - dmg);
    addLog(pick(CONFIG.messages.bossAttack).replace('{dmg}', dmg), 'log-damage');
    updateBars();
    playAnim('hit');

    if (state.player.hp <= 0) {
      setTimeout(() => endGame(false), 500);
    }
  }

  // ===== Akce hráče =====
  function attack() {
    if (state.ended || state.busy) return;
    state.busy = true;
    disableActions();

    const dmg = rand(CONFIG.attack.minDmg, CONFIG.attack.maxDmg);
    state.boss.hp = Math.max(0, state.boss.hp - dmg);
    addLog(pick(CONFIG.messages.playerAttack).replace('{dmg}', dmg), 'log-player');
    updateBars();

    // Animace
    playAnim('hit');

    if (state.boss.hp <= 0) {
      setTimeout(() => endGame(true), 500);
      return;
    }

    setTimeout(() => {
      bossTurn();
      state.busy = false;
      enableActions();
    }, 400);
  }

  function heal() {
    if (state.ended || state.busy) return;
    if (state.player.healsLeft <= 0) {
      addLog('Už nemáš žádná léčení!', 'log-info');
      return;
    }
    state.busy = true;
    disableActions();

    const amount = rand(CONFIG.player.minHeal, CONFIG.player.maxHeal);
    state.player.hp = Math.min(CONFIG.player.maxHp, state.player.hp + amount);
    state.player.healsLeft--;
    addLog(pick(CONFIG.messages.heal).replace('{dmg}', amount), 'log-heal');
    updateBars();
    playAnim('heal');

    setTimeout(() => {
      bossTurn();
      state.busy = false;
      enableActions();
    }, 400);
  }

  function dodge() {
    if (state.ended || state.busy) return;
    state.busy = true;
    disableActions();

    state.player.isDodging = true;
    addLog('💨 Chystáš se uhnout!', 'log-info');

    setTimeout(() => {
      bossTurn();
      state.busy = false;
      enableActions();
    }, 400);
  }

  // ===== Tlačítka =====
  function disableActions() {
    $('btnAttack').disabled = true;
    $('btnHeal').disabled = true;
    $('btnDodge').disabled = true;
  }

  function enableActions() {
    if (state.ended) return;
    $('btnAttack').disabled = false;
    $('btnHeal').disabled = state.player.healsLeft <= 0;
    $('btnDodge').disabled = false;
  }

  // ===== Konec hry =====
  function endGame(won) {
    state.ended = true;
    disableActions();
    if (animFrame) cancelAnimationFrame(animFrame);

    $('menu').classList.add('hidden');
    $('game').classList.add('hidden');
    $('result').classList.remove('hidden');

    if (won) {
      $('resultTitle').textContent = '🎉 Vítězství! 🎉';
      $('resultTitle').style.color = '#4ecca3';
      $('resultMsg').textContent = `Porazil jsi bosse! Zbylo ti ${state.player.hp} HP.`;
    } else {
      $('resultTitle').textContent = '💀 Prohra 💀';
      $('resultTitle').style.color = '#e94560';
      $('resultMsg').textContent = `Boss tě porazil. Boss měl ještě ${state.boss.hp} HP.`;
    }
  }

  // ===== Inicializace hry =====
  function initState() {
    state = {
      player: {
        hp: CONFIG.player.maxHp,
        healsLeft: CONFIG.player.healCount,
        isDodging: false
      },
      boss: {
        hp: CONFIG.boss.maxHp
      },
      busy: false,
      ended: false
    };
    logEntries = [];
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  // ===== Veřejná API =====
  function start() {
    initState();
    $('menu').classList.add('hidden');
    $('result').classList.add('hidden');
    $('game').classList.remove('hidden');
    updateBars();
    drawArena();
    addLog('⚔ Boj začíná! Útoč na bosse!', 'log-info');
    enableActions();
  }

  function quit() {
    if (animFrame) cancelAnimationFrame(animFrame);
    $('menu').classList.remove('hidden');
    $('game').classList.add('hidden');
    $('result').classList.add('hidden');
  }

  function restart() {
    start();
  }

  return { start, quit, restart, attack, heal, dodge };
})();

// ===== Service Worker registrace =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
