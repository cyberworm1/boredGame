export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 25;
export const TILE_SIZE = 16;
export const FOV_RADIUS = 8;
export const LOG_LIMIT = 6;

export const DUNGEON_CONFIG = {
  baseRoomCount: 12,
  roomCountDepthFactor: 0.5,
  roomMinSize: 4,
  roomMaxSize: 10,
};

export const MONSTER_SPAWN_CONFIG = {
  basePerRoom: 1,
  perDepthFactor: 0.5,
  placementAttempts: 20,
};

export const ITEM_SPAWN_CONFIG = {
  baseCount: 6,
  perDepthFactor: 0.5,
  healthPotionChance: 0.35,
  manaPotionChance: 0.25,
  weaponChance: 0.2,
  goldChance: 0.2,
};

export const GOLD_DROP_CONFIG = {
  chance: 0.2,
};

export const MONSTER_SCALING = {
  hp: 0.15,
  attack: 0.1,
  defense: 0.05,
  xp: 0.2,
};

export const ARCANE_BOLT_CONFIG = {
  manaCost: 5,
  baseDamage: 6,
  bonusDie: { min: 1, max: 6 },
  range: 6,
};

export const LEVEL_UP_CONFIG = {
  xpGrowth: 1.4,
  hpGain: { min: 4, max: 6 },
  manaGain: { min: 2, max: 4 },
  attackIncrease: 1,
  defenseIncrease: 1,
};

export const STAIRS_RECOVERY = {
  hp: 4,
  mana: 4,
};

export const STORAGE_KEYS = {
  highScore: "roguejs_highscore",
};
