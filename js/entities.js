import { MONSTER_SCALING } from "./config.js";
import { RNG } from "./utils.js";

export const MonsterTemplates = [
  { name: "Goblin", char: "g", color: "#6fbf3b", hp: 8, attack: 2, defense: 1, xp: 5 },
  { name: "Orc", char: "o", color: "#8f5b2f", hp: 14, attack: 3, defense: 2, xp: 8 },
  { name: "Cultist", char: "c", color: "#d66aff", hp: 10, attack: 2, defense: 1, xp: 7 },
  { name: "Troll", char: "T", color: "#3dbf9a", hp: 20, attack: 4, defense: 3, xp: 12 },
  { name: "Slime", char: "s", color: "#4bd0ff", hp: 12, attack: 2, defense: 0, xp: 6 },
];

export const ItemDefinitions = {
  healthPotion() {
    return {
      char: "!",
      color: "#ff4b4b",
      type: "healthPotion",
      name: "Health Potion",
      heal: 12,
    };
  },
  manaPotion() {
    return {
      char: "!",
      color: "#6c8bff",
      type: "manaPotion",
      name: "Mana Potion",
      mana: 8,
    };
  },
  weapon(depth) {
    const bonus = RNG.int(1, 1 + Math.floor(depth / 2));
    return {
      char: "/",
      color: "#e0e0e0",
      type: "weapon",
      name: `Fine Blade (+${bonus} atk)`,
      attackBonus: bonus,
    };
  },
  gold(depth) {
    const amount = RNG.int(5, 10 + depth * 3);
    return {
      char: "$",
      color: "#f5d442",
      type: "gold",
      name: `${amount} Gold`,
      amount,
    };
  },
};

export function createMonster(depth) {
  const template = RNG.choice(MonsterTemplates);
  const scale = 1 + depth * MONSTER_SCALING.hp;
  return {
    ...template,
    hp: Math.ceil(template.hp * scale),
    attack: Math.ceil(template.attack * (1 + depth * MONSTER_SCALING.attack)),
    defense: Math.ceil(template.defense * (1 + depth * MONSTER_SCALING.defense)),
    xpReward: Math.ceil(template.xp * (1 + depth * MONSTER_SCALING.xp)),
    x: 0,
    y: 0,
    alive: true,
  };
}

export function createPlayer() {
  return {
    char: "@",
    color: "#ffffff",
    x: 0,
    y: 0,
    hp: 28,
    maxHp: 28,
    mana: 12,
    maxMana: 12,
    attack: 4,
    defense: 2,
    level: 1,
    xp: 0,
    nextLevelXp: 20,
    inventory: [],
    gold: 0,
    kills: 0,
  };
}

