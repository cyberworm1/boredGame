import { LOG_LIMIT, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from "./config.js";
import { TileType } from "./map.js";

export function renderControls(controlsEl) {
  controlsEl.innerHTML = `
      <strong>Controls</strong><br/>
      Move: Arrow Keys / WASD<br/>
      Wait: Space / .<br/>
      Pickup: G<br/>
      Use Health Potion: H<br/>
      Use Mana Potion: M<br/>
      Cast Arcane Bolt: F<br/>
      Descend Stairs: Enter / &gt;<br/>
    `;
}

export function renderLog(log, logContainer) {
  const recent = log.slice(-LOG_LIMIT);
  logContainer.innerHTML = recent.map((entry) => `<p>${entry}</p>`).join("");
}

export function renderStats(game, player, statsEl, inventoryEl) {
  statsEl.innerHTML = `
      <strong>Depth:</strong> ${game.depth}<br/>
      <strong>HP:</strong> ${player.hp}/${player.maxHp}<br/>
      <strong>Mana:</strong> ${player.mana}/${player.maxMana}<br/>
      <strong>Attack:</strong> ${player.attack} &nbsp; <strong>Defense:</strong> ${player.defense}<br/>
      <strong>Level:</strong> ${player.level} (XP ${player.xp}/${player.nextLevelXp})<br/>
      <strong>Kills:</strong> ${player.kills}<br/>
      <strong>Gold:</strong> ${player.gold}
    `;

  if (player.inventory.length === 0) {
    inventoryEl.innerHTML = "<strong>Inventory</strong><br/><span class='dim'>Empty</span>";
  } else {
    inventoryEl.innerHTML =
      "<strong>Inventory</strong><br/>" +
      player.inventory.map((item, i) => `${i + 1}. ${item.name}`).join("<br/>");
  }
}

export function renderHighScore(score, highScore, highScoreEl) {
  highScoreEl.innerHTML = `
      <strong>Score</strong><br/>
      Current Run: ${score}<br/>
      Best Run: ${highScore}
    `;
}

export function renderOverlay(overlayEl, overlayTextEl, message, hidden) {
  overlayEl.hidden = hidden;
  overlayTextEl.textContent = message;
}

export function renderCanvas(ctx, map, player, monsters, items) {
  ctx.fillStyle = "#080a0f";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = map.tiles[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      let bg = "#05070c";
      if (tile.explored) {
        bg = tile.visible ? "#111622" : "#05070c";
        if (tile.type === TileType.Wall) {
          bg = tile.visible ? "#1a1f2b" : "#090b12";
        }
      }
      ctx.fillStyle = bg;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

      if (tile.explored) {
        if (tile.type === TileType.Wall) {
          ctx.fillStyle = tile.visible ? "#4e5a7a" : "#1e2535";
          ctx.fillText("#", px + 2, py + TILE_SIZE - 2);
        } else if (tile.type === TileType.Stairs) {
          ctx.fillStyle = tile.visible ? "#f0c674" : "#4a3d1f";
          ctx.fillText(">", px + 2, py + TILE_SIZE - 2);
        } else if (tile.visible) {
          ctx.fillStyle = "#2b3650";
          ctx.fillText(".", px + 2, py + TILE_SIZE - 2);
        }
      }
    }
  }

  for (const item of items) {
    if (!map.tiles[item.y][item.x].visible) continue;
    ctx.fillStyle = item.color;
    ctx.fillText(item.char, item.x * TILE_SIZE + 2, item.y * TILE_SIZE + TILE_SIZE - 2);
  }

  for (const monster of monsters) {
    if (!monster.alive) continue;
    if (!map.tiles[monster.y][monster.x].visible) continue;
    ctx.fillStyle = monster.color;
    ctx.fillText(monster.char, monster.x * TILE_SIZE + 2, monster.y * TILE_SIZE + TILE_SIZE - 2);
  }

  ctx.fillStyle = player.color;
  ctx.fillText(
    player.char,
    player.x * TILE_SIZE + 2,
    player.y * TILE_SIZE + TILE_SIZE - 2
  );
}
