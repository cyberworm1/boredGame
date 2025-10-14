import {
  ARCANE_BOLT_CONFIG,
  GOLD_DROP_CONFIG,
  ITEM_SPAWN_CONFIG,
  LEVEL_UP_CONFIG,
  LOG_LIMIT,
  MONSTER_SPAWN_CONFIG,
  STAIRS_RECOVERY,
  STORAGE_KEYS,
  TILE_SIZE,
} from "./config.js";
import { createMonster, createPlayer, ItemDefinitions } from "./entities.js";
import {
  computeFOV as computeFieldOfView,
  generateDungeon,
  inBounds as mapInBounds,
  TileType,
} from "./map.js";
import { RNG, distance } from "./utils.js";
import {
  renderCanvas,
  renderControls,
  renderHighScore,
  renderLog,
  renderOverlay,
  renderStats,
} from "./ui.js";

export default class Game {
  constructor({
    canvas,
    overlay,
    overlayText,
    stats,
    inventory,
    log,
    controls,
    highscore,
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.textBaseline = "bottom";
    this.ctx.font = `${TILE_SIZE - 2}px "Fira Mono", "Courier New", monospace`;

    this.overlay = overlay;
    this.overlayText = overlayText;
    this.statsContainer = stats;
    this.inventoryContainer = inventory;
    this.logContainer = log;
    this.controlsContainer = controls;
    this.highScoreContainer = highscore;

    this.depth = 1;
    this.map = null;
    this.player = createPlayer();
    this.monsters = [];
    this.items = [];
    this.log = [];
    this.gameOver = false;
    this.score = 0;
    this.highScore = 0;
  }

  init() {
    this.loadHighScore();
    this.setupUI();
    this.startNewRun();
    window.addEventListener("keydown", (event) => this.handleInput(event));
  }

  setupUI() {
    renderControls(this.controlsContainer);
    renderLog(this.log, this.logContainer);
    renderStats(this, this.player, this.statsContainer, this.inventoryContainer);
    renderHighScore(this.score, this.highScore, this.highScoreContainer);
    renderOverlay(this.overlay, this.overlayText, "", true);
  }

  startNewRun() {
    this.depth = 1;
    this.player = createPlayer();
    this.score = 0;
    this.log = [];
    this.gameOver = false;
    renderOverlay(this.overlay, this.overlayText, "", true);
    renderLog(this.log, this.logContainer);
    this.startFloor();
    this.logMessage("Welcome to the dungeon!");
    this.render();
  }

  startFloor() {
    const dungeon = generateDungeon(this.depth);
    this.map = dungeon;
    const startRoom = dungeon.rooms[0];
    this.player.x = startRoom.center.x;
    this.player.y = startRoom.center.y;

    this.monsters = [];
    const monsterRooms = dungeon.rooms.slice(1);
    for (const room of monsterRooms) {
      const maxPerRoom =
        MONSTER_SPAWN_CONFIG.basePerRoom +
        Math.floor(this.depth * MONSTER_SPAWN_CONFIG.perDepthFactor);
      const monsterCount = RNG.int(MONSTER_SPAWN_CONFIG.basePerRoom, maxPerRoom);
      for (let i = 0; i < monsterCount; i++) {
        const monster = createMonster(this.depth);
        let attempts = MONSTER_SPAWN_CONFIG.placementAttempts;
        while (attempts-- > 0) {
          const x = RNG.int(room.x, room.x + room.w - 1);
          const y = RNG.int(room.y, room.y + room.h - 1);
          if (!this.isBlocked(x, y)) {
            monster.x = x;
            monster.y = y;
            this.monsters.push(monster);
            break;
          }
        }
      }
    }

    this.items = [];
    const itemRooms = dungeon.rooms.slice(1);
    const availableItemRooms = itemRooms.length > 0 ? itemRooms : [startRoom];
    const itemCount =
      ITEM_SPAWN_CONFIG.baseCount + Math.floor(this.depth * ITEM_SPAWN_CONFIG.perDepthFactor);
    for (let i = 0; i < itemCount; i++) {
      const room = RNG.choice(availableItemRooms);
      const x = RNG.int(room.x, room.x + room.w - 1);
      const y = RNG.int(room.y, room.y + room.h - 1);
      if (this.isBlocked(x, y) || this.itemAt(x, y)) continue;
      const roll = Math.random();
      let item;
      if (roll < ITEM_SPAWN_CONFIG.healthPotionChance) {
        item = ItemDefinitions.healthPotion();
      } else if (roll < ITEM_SPAWN_CONFIG.healthPotionChance + ITEM_SPAWN_CONFIG.manaPotionChance) {
        item = ItemDefinitions.manaPotion();
      } else if (
        roll <
        ITEM_SPAWN_CONFIG.healthPotionChance +
          ITEM_SPAWN_CONFIG.manaPotionChance +
          ITEM_SPAWN_CONFIG.weaponChance
      ) {
        item = ItemDefinitions.weapon(this.depth);
      } else {
        item = ItemDefinitions.gold(this.depth);
      }
      this.items.push({ ...item, x, y });
    }

    this.computeFOV();
    this.updateSidebar();
    this.render();
  }

  loadHighScore() {
    try {
      this.highScore = parseInt(localStorage.getItem(STORAGE_KEYS.highScore) || "0", 10);
    } catch {
      this.highScore = 0;
    }
    renderHighScore(this.score, this.highScore, this.highScoreContainer);
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem(STORAGE_KEYS.highScore, String(this.highScore));
      } catch {
        // ignore storage failures
      }
      renderHighScore(this.score, this.highScore, this.highScoreContainer);
    }
  }

  handleInput(event) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }

    if (this.gameOver) {
      if (event.key === "Enter") {
        this.startNewRun();
      }
      return;
    }

    const key = event.key;
    let acted = false;

    const moveKeys = {
      ArrowUp: { dx: 0, dy: -1 },
      w: { dx: 0, dy: -1 },
      ArrowDown: { dx: 0, dy: 1 },
      s: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0 },
      a: { dx: -1, dy: 0 },
      ArrowRight: { dx: 1, dy: 0 },
      d: { dx: 1, dy: 0 },
    };

    if (moveKeys[key]) {
      acted = this.attemptPlayerMove(moveKeys[key].dx, moveKeys[key].dy);
    } else if (key === "." || key === " ") {
      this.logMessage("You wait for a moment.");
      acted = true;
    } else if (key === "g" || key === "G") {
      acted = this.pickupItem();
    } else if (key === "h" || key === "H") {
      acted = this.useHealthPotion();
    } else if (key === "m" || key === "M") {
      acted = this.useManaPotion();
    } else if (key === "f" || key === "F") {
      acted = this.castArcaneBolt();
    } else if (key === "Enter" || key === ">") {
      acted = this.tryDescend();
    }

    if (acted) {
      this.endPlayerTurn();
    }
  }

  endPlayerTurn() {
    this.monsterTurn();
    this.computeFOV();
    this.updateSidebar();
    this.render();
  }

  attemptPlayerMove(dx, dy) {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (!this.inBounds(nx, ny)) return false;
    if (this.map.tiles[ny][nx].type === TileType.Wall) return false;

    const monster = this.monsterAt(nx, ny);
    if (monster) {
      this.playerAttack(monster);
      return true;
    }

    this.player.x = nx;
    this.player.y = ny;
    return true;
  }

  tryDescend() {
    const tile = this.map.tiles[this.player.y][this.player.x];
    if (tile.type === TileType.Stairs) {
      this.depth += 1;
      this.logMessage(`You descend to dungeon level ${this.depth}.`);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + STAIRS_RECOVERY.hp);
      this.player.mana = Math.min(
        this.player.maxMana,
        this.player.mana + STAIRS_RECOVERY.mana
      );
      this.startFloor();
      return true;
    } else {
      this.logMessage("There are no stairs here.");
      return false;
    }
  }

  pickupItem() {
    const index = this.items.findIndex(
      (item) => item.x === this.player.x && item.y === this.player.y
    );
    if (index === -1) {
      this.logMessage("There is nothing to pick up.");
      return false;
    }
    const item = this.items.splice(index, 1)[0];
    switch (item.type) {
      case "healthPotion":
        this.player.inventory.push(item);
        this.logMessage("You pick up a health potion.");
        break;
      case "manaPotion":
        this.player.inventory.push(item);
        this.logMessage("You pick up a mana potion.");
        break;
      case "weapon":
        this.player.inventory.push(item);
        this.player.attack += item.attackBonus;
        this.logMessage(`You equip ${item.name}. Attack increases!`);
        break;
      case "gold":
        this.player.gold += item.amount;
        this.logMessage(`You scoop up ${item.amount} gold.`);
        break;
      default:
        this.logMessage("You pick up something strange.");
    }
    return true;
  }

  useHealthPotion() {
    const index = this.player.inventory.findIndex((item) => item.type === "healthPotion");
    if (index === -1) {
      this.logMessage("You have no health potions.");
      return false;
    }
    const potion = this.player.inventory.splice(index, 1)[0];
    const healed = Math.min(potion.heal, this.player.maxHp - this.player.hp);
    this.player.hp += healed;
    this.logMessage(`You quaff a potion and recover ${healed} HP.`);
    return true;
  }

  useManaPotion() {
    const index = this.player.inventory.findIndex((item) => item.type === "manaPotion");
    if (index === -1) {
      this.logMessage("You have no mana potions.");
      return false;
    }
    const potion = this.player.inventory.splice(index, 1)[0];
    const restored = Math.min(potion.mana, this.player.maxMana - this.player.mana);
    this.player.mana += restored;
    this.logMessage(`You drink a mana potion and regain ${restored} mana.`);
    return true;
  }

  castArcaneBolt() {
    const { manaCost, baseDamage, bonusDie, range } = ARCANE_BOLT_CONFIG;
    if (this.player.mana < manaCost) {
      this.logMessage("Not enough mana.");
      return false;
    }
    const visibleMonsters = this.monsters.filter(
      (monster) =>
        monster.alive &&
        this.isVisible(monster.x, monster.y) &&
        distance(monster, this.player) <= range
    );
    if (visibleMonsters.length === 0) {
      this.logMessage("No targets in sight.");
      return false;
    }
    visibleMonsters.sort((a, b) => distance(a, this.player) - distance(b, this.player));
    const target = visibleMonsters[0];
    this.player.mana -= manaCost;
    const dmg = baseDamage + RNG.int(bonusDie.min, bonusDie.max);
    target.hp -= dmg;
    this.logMessage(
      `You unleash an arcane bolt at the ${target.name} for ${dmg} damage.`
    );
    if (target.hp <= 0) {
      this.killMonster(target, true);
    }
    return true;
  }

  monsterTurn() {
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      const dx = this.player.x - monster.x;
      const dy = this.player.y - monster.y;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist <= 1) {
        this.monsterAttack(monster);
        continue;
      }

      const stepOptions = [];
      if (dx !== 0) stepOptions.push({ dx: Math.sign(dx), dy: 0 });
      if (dy !== 0) stepOptions.push({ dx: 0, dy: Math.sign(dy) });
      if (stepOptions.length === 2 && Math.random() < 0.5) stepOptions.reverse();

      for (const step of stepOptions) {
        const nx = monster.x + step.dx;
        const ny = monster.y + step.dy;
        if (!this.inBounds(nx, ny)) continue;
        if (this.map.tiles[ny][nx].type === TileType.Wall) continue;
        if (this.monsterAt(nx, ny)) continue;
        if (this.player.x === nx && this.player.y === ny) continue;
        monster.x = nx;
        monster.y = ny;
        break;
      }
    }
  }

  playerAttack(monster) {
    const roll = RNG.int(1, 6);
    const damage = Math.max(0, this.player.attack + roll - monster.defense);
    if (damage <= 0) {
      this.logMessage(`You miss the ${monster.name}.`);
      return;
    }
    monster.hp -= damage;
    this.logMessage(`You hit the ${monster.name} for ${damage} damage.`);
    if (monster.hp <= 0) {
      this.killMonster(monster, false);
    }
  }

  killMonster(monster, bySpell) {
    monster.alive = false;
    this.player.kills += 1;
    this.player.xp += monster.xpReward;
    const source = bySpell ? "spell" : "blow";
    this.logMessage(`The ${monster.name} dies from your ${source}.`);
    if (Math.random() < GOLD_DROP_CONFIG.chance) {
      const gold = ItemDefinitions.gold(this.depth);
      gold.x = monster.x;
      gold.y = monster.y;
      this.items.push(gold);
      this.logMessage(`The ${monster.name} drops ${gold.amount} gold.`);
    }
    this.checkLevelUp();
  }

  monsterAttack(monster) {
    const roll = RNG.int(1, 6);
    const damage = Math.max(0, monster.attack + roll - this.player.defense);
    if (damage <= 0) {
      this.logMessage(`The ${monster.name} misses you.`);
      return;
    }
    this.player.hp -= damage;
    this.logMessage(`The ${monster.name} hits you for ${damage} damage!`);
    if (this.player.hp <= 0) {
      this.handleDeath();
    }
  }

  checkLevelUp() {
    while (this.player.xp >= this.player.nextLevelXp) {
      this.player.level += 1;
      this.player.xp -= this.player.nextLevelXp;
      this.player.nextLevelXp = Math.floor(this.player.nextLevelXp * LEVEL_UP_CONFIG.xpGrowth);
      const hpGain = RNG.int(LEVEL_UP_CONFIG.hpGain.min, LEVEL_UP_CONFIG.hpGain.max);
      const manaGain = RNG.int(LEVEL_UP_CONFIG.manaGain.min, LEVEL_UP_CONFIG.manaGain.max);
      this.player.maxHp += hpGain;
      this.player.maxMana += manaGain;
      this.player.attack += LEVEL_UP_CONFIG.attackIncrease;
      this.player.defense += LEVEL_UP_CONFIG.defenseIncrease;
      this.player.hp = this.player.maxHp;
      this.player.mana = this.player.maxMana;
      this.logMessage(`You reach level ${this.player.level}! Stronger than ever.`);
    }
  }

  handleDeath() {
    this.logMessage("You have died. Your adventure ends here.");
    this.gameOver = true;
    this.computeScore();
    this.saveHighScore();
    renderOverlay(
      this.overlay,
      this.overlayText,
      `You perished on depth ${this.depth} with a score of ${this.score}.`,
      false
    );
  }

  computeScore() {
    this.score =
      this.player.gold +
      this.player.kills * 10 +
      (this.depth - 1) * 50 +
      this.player.level * 20;
    renderHighScore(this.score, this.highScore, this.highScoreContainer);
  }

  computeFOV() {
    computeFieldOfView(this.map, this.player);
  }

  inBounds(x, y) {
    return mapInBounds(x, y);
  }

  isBlocked(x, y) {
    if (!this.inBounds(x, y)) return true;
    if (this.map.tiles[y][x].type === TileType.Wall) return true;
    if (this.monsterAt(x, y)) return true;
    if (this.player.x === x && this.player.y === y) return true;
    return false;
  }

  monsterAt(x, y) {
    return this.monsters.find((monster) => monster.alive && monster.x === x && monster.y === y);
  }

  itemAt(x, y) {
    return this.items.find((item) => item.x === x && item.y === y);
  }

  isVisible(x, y) {
    return this.inBounds(x, y) && this.map.tiles[y][x].visible;
  }

  logMessage(text) {
    this.log.push(text);
    if (this.log.length > LOG_LIMIT) {
      this.log.shift();
    }
    renderLog(this.log, this.logContainer);
  }

  updateSidebar() {
    renderStats(this, this.player, this.statsContainer, this.inventoryContainer);
    renderHighScore(this.score, this.highScore, this.highScoreContainer);
  }

  render() {
    renderCanvas(this.ctx, this.map, this.player, this.monsters, this.items);
    if (this.gameOver) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Optional helper for debugging from console
  debugReveal() {
    for (let y = 0; y < this.map.tiles.length; y++) {
      for (let x = 0; x < this.map.tiles[y].length; x++) {
        this.map.tiles[y][x].visible = true;
        this.map.tiles[y][x].explored = true;
      }
    }
    this.render();
  }
}
