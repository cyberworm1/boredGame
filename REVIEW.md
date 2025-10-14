# RogueJS Review Summary

## Overview
While the current prototype already delivers a playable ASCII roguelike in a single HTML file, the implementation diverges from the modular architecture described in `plan.md`. I reviewed the plan and the shipped code to highlight alignment gaps and concrete engineering follow-ups.

## Plan Feedback
- **Inventory guardrails** – The plan now explicitly calls out avoiding potion consumption at full health/mana and clarifying pickup messaging so we do not waste consumables.
- **Dungeon generation resilience** – Ensure the generation step never attempts to choose a monster/item room from an empty array when only one room spawns. This is already reflected in the updated plan but still needs an implementation fix.
- **Testing strategy** – Expand “Testing” to include an automated smoke test. Loading the page with Playwright, moving the hero, and asserting sidebar updates would give confidence without relying solely on manual QA.
- **Refactoring roadmap** – Add a new section that encourages breaking the monolithic script into ES modules and extracting UI helpers so future work can target smaller files and support unit testing.

## Code Observations
- `Game.startFloor` slices `rooms` to pick monster/item rooms. If the generator returns only one room (which can happen when random placement fails repeatedly), `RNG.choice(itemRooms)` will throw. We need a guard to bail out early or fall back to the starting room when `itemRooms.length === 0`.
- `useHealthPotion`/`useManaPotion` consume potions even when the player is already at full HP/mana, producing “recover 0” log entries. We should short-circuit and keep the potion in inventory, matching the new plan guidance.
- All logic lives in `game.html`. Extracting the JS into modules (and possibly bundling with Vite/Rollup) would unlock linting, type checking, and easier automated testing.
- Rendering and sidebar updates are tightly coupled inside `Game`. Moving DOM writes into helper functions (e.g., `renderLog`, `renderStats`) would simplify Playwright assertions and reduce duplication.

## Recommended Next Steps
1. Patch `startFloor` to skip item placement when there are no eligible rooms (or regenerate the floor) to eliminate runtime exceptions.
2. Update potion usage to check for full HP/mana before consuming items.
3. Add a minimal Playwright smoke test that launches a local server, confirms the canvas dimensions, simulates a move, and asserts the log updates.
4. Split the script into modules (Map, Entities, Game, UI) and wire them up with an ES module build step so we can add linting/TypeScript incrementally.

## Testing Performed
- Launched `python3 -m http.server 8000` to serve the repo and executed a Playwright smoke script (via the provided browser container). The script verified that the canvas rendered, captured the starting coordinates `{x: 46, y: 4}`, sent an `ArrowRight` key press, and observed the player move to `{x: 47, y: 4}` while the sidebar reported depth 1 with full HP/Mana.

