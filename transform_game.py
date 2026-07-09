#!/usr/bin/env python3
"""Fix remaining issues in clean-postrehovka."""

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

js = read_file("/mnt/c/Users/Martin Fabian/Desktop/Zod-Files/pwa-game/dist/game.js")
print(f"game.js: {len(js)} chars, {js.count(chr(10))} lines")

# === 1. Replace the entire endMapBattle function + continueDungeon ===
old_end = """  function endMapBattle(won) {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    const locId = mb.locId;

    // Monster killed - regular enemy
    if (won && !mb.isBoss) {
      mapBattleState.ended = true;
      cleanupTimers();
      const p = (state.locationProgress[locId] || 0) + 1;
      state.locationProgress[locId] = p;
      const monsterGold = 1 + rand(0, 2);
      const xpGain = mb.loc.xpReward + mb.floor * 2;
      state.hero.gold = (state.hero.gold || 0) + monsterGold;
      state.hero.xp = (state.hero.xp || 0) + xpGain;
      state.hero.hp = mb.playerHp;
      state.wins = (state.wins || 0) + 1;
      const leveled = applyLevelUp();
      // Loot roll za toto monstrum
      const loot = rollLoot(locId, mb.floor);
      state._floorLootDrops = state._floorLootDrops || [];
      state._floorLootDrops.push(loot);
      if (loot.type === 'item' || loot.type === 'boss') {
        state.hero.inventory.push(loot.item.id);
      }
      if (loot.type === 'gold' || loot.type === 'boss') {
        state.hero.gold = (state.hero.gold || 0) + (loot.gold || 0);
      }
      saveGame();
      sfxSuccess();

      if (p >= 5) {
        // ALL 5 monsters killed -> result screen se sumarizací
        mapBattleState.ended = true;
        cleanupTimers();
        const nextFloor = mb.floor + 1;
        state.floorProgress[locId] = nextFloor;
        state.locationProgress[locId] = 0;
        saveGame();
        // Sumarizace lootu
        let totalLootGold = 0;
        const lootItems = [];
        (state._floorLootDrops || []).forEach(d => {
          if (d.type === 'gold') totalLootGold += d.gold;
          else if (d.type === 'item') { lootItems.push(d.item); }
          else if (d.type === 'boss') { lootItems.push(d.item); totalLootGold += d.gold; }
        });
        state._floorLootDrops = []; // vyčistit po sumarizaci
        $('resultIcon').textContent = '🎉';
        $('resultTitle').textContent = 'Patro ' + (mb.floor+1) + ' dobyto!';
        const floorXp = mb.loc.xpReward * 5 + mb.floor * 10;
        const mistakes = (mb.floorMistakes || 0) + (mb.mistakes || 0);
        const hpPct = Math.round((mb.playerHp / mb.maxPlayerHp) * 100);
        $('resultMsg').innerHTML = '<div class="result-stats">'
                  + '<div class="result-stat"><span class="result-stat-icon">📖</span><span class="result-stat-val">+' + floorXp + ' XP</span></div>'
                  + '<div class="result-stat"><span class="result-stat-icon">❤️</span><span class="result-stat-val">' + mb.playerHp + '/' + mb.maxPlayerHp + '</span><span class="result-stat-sub">(' + hpPct + '%)</span></div>'
                  + '<div class="result-stat"><span class="result-stat-icon">💰</span><span class="result-stat-val">+' + totalLootGold + '</span></div>'
                  + '<div class="result-stat"><span class="result-stat-icon">❌</span><span class="result-stat-val">' + mistakes + '</span><span class="result-stat-sub">chyb</span></div>'
                  + '<div class="result-tap">👆 klepni pro návrat</div>'
                  + '</div>';
        // Loot list — scroll okno s itemy
        let lootListHtml = '';
        if (lootItems.length > 0) {
          lootItems.forEach(item => {
            const r = RARITY[item.rarity] || RARITY.common;
            lootListHtml += `<div class="loot-scroll-item"><span class="loot-scroll-icon">${renderItemIcon(item,24)}</span><span class="loot-scroll-name" style="color:${r.color}">${item.name}</span></div>`;
          });
        } else {
          lootListHtml = '<div style="text-align:center;color:#555;font-size:12px;padding:8px">Žádné předměty</div>';
        }
        $('resultLootList').innerHTML = lootListHtml;
        $('resultBtn').innerHTML = '';
        $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('map'); };
        showScreen('result');
        switchBGM('win');
        return;
      }
      // Treasure popup pro normální monstrum (1-4)
      showTreasurePopup(loot, xpGain, () => {
        const fig2 = $('mbFigure');
        if (fig2) fig2.classList.remove('monster-dying');
        continueDungeon();
      });
      updateMapBattleUI();
      // Animace smrti
      const fig = $('mbFigure');
      if (fig) {
        fig.classList.remove('monster-appear');
        fig.classList.add('monster-dying');
      }
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
      if (r.gold) state.hero.gold = (state.hero.gold || 0) + r.gold;
      if (r.weapon && state.hero.equip.weapon === 'fists') state.hero.equip.weapon = r.weapon;
      if (r.armor && state.hero.equip.armor === 'rags') state.hero.equip.armor = r.armor;
      // Boss loot: zaručený item s vyšším tierem + goldy
      const bossLoot = rollLoot(locId, mb.floor, true);
      if (bossLoot.type === 'boss') {
        state.hero.inventory.push(bossLoot.item.id);
        state.hero.gold = (state.hero.gold || 0) + bossLoot.gold;
      }
      sfxBossDefeat();
      $('resultIcon').textContent = '🏆';
      $('resultTitle').textContent = `${mb.loc.boss.name} poražen!`;
      const bossGoldTotal = (r.gold || 0) + bossLoot.gold;
      $('resultMsg').innerHTML = '<div class="result-stats">'
                + '<div class="result-stat"><span class="result-stat-icon">💰</span><span class="result-stat-val">+'+bossGoldTotal+'</span></div>'
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
  }"""

new_end = """  function endMapBattle(won) {
    const mb = mapBattleState;
    if (mb.ended) return;
    mb.ended = true;
    cleanupTimers();
    if (mb._staminaInterval) { clearInterval(mb._staminaInterval); mb._staminaInterval = null; }
    if (mb._bonusRaf) { cancelAnimationFrame(mb._bonusRaf); mb._bonusRaf = null; }
    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    clearTimeout(mb._attackWindowTimer);
    clearTimeout(mb._glowTimer);
    if (mb._freezeTimer) { clearInterval(mb._freezeTimer); mb._freezeTimer = null; }
    const locId = mb.locId;
    if (won) {
      const loc = mb.loc;
      const isBoss = mb.isBoss;
      const floor = mb.floor;
      const progress = mb.progress;
      const h = state.hero;
      const xpGain = isBoss ? (loc.bossXp || 30) : (loc.xpReward || 10);
      h.xp = (h.xp || 0) + xpGain;
      const goldGain = isBoss ? 10 : (2 + locId * 2 + floor);
      h.gold = (h.gold || 0) + goldGain;
      if (isBoss) {
        state.bossesDefeated[locId] = true;
        state.floorProgress[locId] = 0;
        state.locationProgress[locId] = 0;
        state.wins = (state.wins || 0) + 1;
        if (locId + 1 < LOCATIONS.length && !state.bossesDefeated[locId + 1]) {
          state.floorProgress[locId + 1] = 0;
        }
      } else {
        const nextProgress = progress + 1;
        if (nextProgress >= loc.monsters) {
          state.floorProgress[locId] = floor + 1;
          state.locationProgress[locId] = 0;
        } else {
          state.locationProgress[locId] = nextProgress;
        }
      }
      saveGame();
      if (isBoss) {
        sfxBossDefeat();
        switchBGM('win');
        $('resultIcon').textContent = '👑';
        $('resultTitle').textContent = `🏆 ${loc.name} dobyt!`;
        $('resultMsg').textContent = `💰 +${goldGain} zlatých`;
        $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
      } else {
        sfxEnemyDefeat();
        $('resultIcon').textContent = '✅';
        $('resultTitle').textContent = 'Vítězství!';
        $('resultMsg').textContent = `💰 +${goldGain} zlatých`;
        $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${locId},${floor})">🔄 Další patro</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
      }
      showScreen('result');
    } else {
      state.deaths = (state.deaths || 0) + 1;
      saveGame();
      switchBGM('defeat');
      $('resultIcon').textContent = '💀';
      $('resultTitle').textContent = 'Padl jsi!';
      $('resultMsg').textContent = `💀 Zemřel v ${mb.loc.name} — P${mb.floor+1}`;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${mb.locId},${mb.floor})">🔄 Znovu</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
      showScreen('result');
    }
  }"""

js = js.replace(old_end, new_end)
print("  Replaced endMapBattle + showMapWithUnlock + continueDungeon")

# === 2. Remove leftover sections ===
# SCHOOL PASSIVES
start = js.find("  // ===== SCHOOL PASSIVES =====")
end = js.find("  // ===== ITEMS (WEAPONS/ARMOR) =====")
if start >= 0 and end >= 0:
    js = js[:start] + js[end:]
    print("  Removed SCHOOL PASSIVES section")

# ITEMS (WEAPONS/ARMOR)
start = js.find("  // ===== ITEMS (WEAPONS/ARMOR) =====")
end = js.find("  // ===== MONSTER TYPES =====")
if start >= 0 and end >= 0:
    js = js[:start] + js[end:]
    print("  Removed ITEMS section")

# SPELL VISUAL HELPERS
start = js.find("  // ===== SPELL VISUAL HELPERS =====")
end = js.find("  // ===== SPELL PROJECTILES =====")
if start >= 0 and end >= 0:
    js = js[:start] + js[end:]
    print("  Removed SPELL VISUAL HELPERS section")

# SPELL PROJECTILES
start = js.find("  // ===== SPELL PROJECTILES =====")
end = js.find("  // ===== LOOT SYSTEM =====")
if start >= 0 and end >= 0:
    js = js[:start] + js[end:]
    print("  Removed SPELL PROJECTILES section")

# LOOT SYSTEM
start = js.find("  // ===== LOOT SYSTEM =====")
end = js.find("  // ===== TUTORIAL (interactive guide) =====")
if start >= 0 and end >= 0:
    js = js[:start] + js[end:]
    print("  Removed LOOT SYSTEM section")

# === 3. Fix mapBattleTurn - remove getEquipAttrs reference ===
# Already done above

# === 4. Check braces ===
opens = js.count('{')
closes = js.count('}')
print(f"\nBrace balance: {{={opens}, }}={closes}, diff={opens-closes}")

write_file("/mnt/c/Users/Martin Fabian/Desktop/Zod-Files/pwa-game/dist/game.js", js)
print(f"Final game.js: {len(js)} chars, {js.count(chr(10))} lines")
print("Done!")