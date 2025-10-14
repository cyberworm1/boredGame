Development Plan
1. High-Level Game Overview
Premise: A lone adventurer (@) explores an endless sequence of procedurally generated dungeon levels (80×25 grid). Each level contains rooms, corridors, monsters, loot, and a staircase leading deeper underground.

Core Loop: Explore → find loot → fight monsters → descend → repeat. Death is permanent; the game restarts with a fresh dungeon.

Scoring: Based on gold collected, monsters defeated, and deepest level reached. Persist best score in localStorage.

Visual Style: ASCII-inspired tiles rendered on an HTML5 Canvas with a monospaced font. Sidebar displays hero stats, inventory, log, controls, and high score.

2. Architecture & Modules
Module	Responsibilities
Game (singleton object)	Bootstraps the app, coordinates turns, stores global state (level, score, message log, RNG helpers, high score, pause/game-over flags).
Map	2D grid of tiles; each tile tracks type (wall, floor, stairs), visibility (visible, explored). Houses procedural generation logic.
Entity base	Position, glyph, color, blocks movement. Specialized into Player, Monster, Item.
Player	Stats (HP, Mana, Attack, Defense, Level, XP), inventory, gold, spells. Handles leveling logic, potions, mana usage.
Monster	Templates define stats/AI per type (goblin/orc/troll/cultist/slime). Stores HP, attack, defense, XP reward, AI routine.
Item	Types (healthPotion, manaPotion, weapon, gold). Includes glyph, amount/bonus, pickup/use logic.
UI helpers	Render Canvas map, sidebar widgets, message log updates.
Input handler	Keyboard bindings for movement, waiting, pickup, potion use, spellcasting, descending stairs. Routes actions through Game to ensure turn order.
3. Data Structures
Tiles: { type: 'wall'|'floor'|'stairs', visible: boolean, explored: boolean }

Rooms: { x, y, w, h, center: {x, y} }

Player: { x, y, char:'@', color:'#fff', hp, maxHp, mana, maxMana, attack, defense, level, xp, nextLevelXp, inventory: Item[], gold, kills }

Monster: { x, y, char, color, name, hp, attack, defense, xpReward, alive }

Item: { x, y, char, color, type, name, heal?, mana?, attackBonus?, amount? }

Message Log: Circular array (e.g., 6 entries) storing recent strings for sidebar display.

4. Procedural Generation
Base grid: Initialize full wall map.

Room placement (Random Rectangles):

Attempt up to maxRooms (≈12) random rooms.

Random width/height (4–10) and position within bounds.

Reject rooms that overlap existing ones (allow 1-tile buffer).

Carve floors for accepted rooms, track rooms[].

Corridors:

For each new room, connect center to previous room’s center via L-shaped tunnels (horizontal then vertical or vice versa).

Staircase: Place stairs (> tile) in the last room’s center.

Player spawn: First room center.

Monster & item placement:

Room-by-room spawn 1–3 monsters based on depth and templates.

Scatter items (potions, weapons, gold) on floor tiles (avoid spawn tile).

Difficulty scaling: Increase monster count and stat modifiers with depth.

5. Game Systems
5.1 Turn-Based Loop
Player input triggers action (move/attack, wait, pickup, use item, cast spell, descend).

If action consumes a turn, resolve monsters’ AI one by one.

After each full round, recompute field-of-view (FOV) and redraw.

5.2 Movement & Collision
Grid-based movement; blocked by walls, monsters, or map bounds.

Attempted move into monster triggers melee combat.

Items on a tile require explicit pickup (g key).

5.3 Combat
Melee Damage: damage = max(0, attacker.attack + roll(1..6) - defender.defense).

Miss messages for zero damage.

On kill: grant XP, gold (if monster drops), update stats/log.

5.4 Leveling
Track XP; thresholds escalate (next = level * 20).

Level up grants +maxHP, +attack, +mana, restores some health/mana.

5.5 Inventory & Items
Health potions restore HP (h key).

Mana potions restore mana (m key).

Weapons immediately raise attack and stay in inventory as equipped items.

Gold tracked separately.

Optional drop log message.

5.6 Spellcasting
Arcane Bolt (f key): costs mana, targets nearest visible monster within range, deals magic damage ignoring defense.

5.7 Field of View (FOV)
Simple shadow casting via Bresenham lines: for each tile in radius (≈8), trace a line; stop at opaque tiles.

Mark visible for current turn, persist explored for fog-of-war.

5.8 Monsters AI
If adjacent to player → attack.

Otherwise step toward player (greedy Manhattan; randomly break ties).

Monsters respect collision and fog (they always “know” the player once spawned for simplicity).

5.9 UI Elements
Canvas: Render tiles, items, entities with ASCII glyphs & colored backgrounds (visible vs explored vs unseen).

Sidebar: Player stats, level depth, score, inventory summary, controls cheat sheet, high score.

Message Log: Rolling log of recent events.

Game Over Overlay: Text overlay on canvas; restart with Enter.

6. Implementation Steps
HTML Skeleton: Canvas + sidebar structure; apply CSS for layout, colors, fonts.

Global Constants & Helpers: Dimensions, RNG, math utilities, Bresenham line, clamp functions.

Tile & Map Setup: Create tile factory, 2D arrays, map accessor helpers (inBounds, isWalkable).

Dungeon Generator: Room placement, corridor carving, stairs insertion. Return rooms for spawn placement.

Entity Constructors: Factories for monsters and items using templates. Player initialization with base stats.

Game Initialization: Create Game singleton, load high score, start first level (rooms, monsters, items, player spawn).

Input Handling: Register keydown; map to actions (movement, wait, pickup, potions, spell, descend). Prevent default on arrow keys.

Turn Resolution: playerAction() -> update log/stats -> monsterTurn() -> recompute FOV -> render.

Combat & XP: Implement attack(attacker, defender), death resolution, level-up check.

Inventory & Potions: Add pickup logic, update UI; implement useHealthPotion, useManaPotion.

Spellcasting: Implement castArcaneBolt, damage resolution, mana checks.

Rendering: Draw base map, tiles, FOV shading, items, monsters, player, overlay for stairs. Update sidebar (stats, inventory, controls, high score), message log.

Game Over & Restart: Handle death state, update high score, display overlay, reset on Enter.

Polish: Animations (optional), message log formatting, ensure actions toggle proper log entries.

Testing: Manual verification in browser; check random seeds by logging, ensure input works.

7. Potential Challenges & Mitigations
Procedural Generation Artifacts: Ensure room overlap checks include a 1-tile buffer; clamp corridors within map bounds.

FOV Performance: Limit radius and use simple line-of-sight; only recompute after player turn to keep it fast.

Keyboard Handling: Use event.preventDefault() for movement keys to stop page scroll; guard against repeated keydown by ignoring when game over.

Monster Pathfinding: Simple greedy movement may cause clustering; add random axis priority to prevent stalling.

State Synchronization: Centralize updates (Game.render, Game.updateSidebar) to avoid stale UI.

LocalStorage Availability: Wrap calls in try/catch to avoid exceptions in browsers with disabled storage.

8. Testing & Debugging Tips
Use browser devtools console: inspect Game state, Game.map.tiles, Game.monsters.

Temporarily set Math.random = () => constant to debug deterministic runs.

Add toggle in console to reveal entire map for debugging (Game.debugReveal()).

Verify FOV by logging visible coordinates.

Check for collisions by ensuring isBlocked functions exclude dead monsters.

