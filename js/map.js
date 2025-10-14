import { DUNGEON_CONFIG, FOV_RADIUS, MAP_HEIGHT, MAP_WIDTH } from "./config.js";
import { RNG, bresenhamLine } from "./utils.js";

export const TileType = {
  Wall: "wall",
  Floor: "floor",
  Stairs: "stairs",
};

export function createTile(type = TileType.Wall) {
  return { type, visible: false, explored: false };
}

function carveRoom(tiles, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      tiles[y][x].type = TileType.Floor;
    }
  }
}

function carveHorizontalTunnel(tiles, x1, x2, y) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    tiles[y][x].type = TileType.Floor;
  }
}

function carveVerticalTunnel(tiles, y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
    tiles[y][x].type = TileType.Floor;
  }
}

function intersects(a, b) {
  return (
    a.x <= b.x + b.w &&
    a.x + a.w >= b.x &&
    a.y <= b.y + b.h &&
    a.y + a.h >= b.y
  );
}

export function generateDungeon(depth = 1) {
  const tiles = Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => createTile())
  );

  const rooms = [];
  const maxRooms =
    DUNGEON_CONFIG.baseRoomCount +
    Math.floor(depth * DUNGEON_CONFIG.roomCountDepthFactor);
  const minSize = DUNGEON_CONFIG.roomMinSize;
  const maxSize = DUNGEON_CONFIG.roomMaxSize;

  for (let i = 0; i < maxRooms; i++) {
    const w = RNG.int(minSize, maxSize);
    const h = RNG.int(minSize, maxSize);
    const x = RNG.int(1, MAP_WIDTH - w - 1);
    const y = RNG.int(1, MAP_HEIGHT - h - 1);
    const newRoom = { x, y, w, h };

    let failed = false;
    for (const other of rooms) {
      if (
        intersects(
          { x: newRoom.x - 1, y: newRoom.y - 1, w: newRoom.w + 2, h: newRoom.h + 2 },
          other
        )
      ) {
        failed = true;
        break;
      }
    }
    if (failed) continue;

    carveRoom(tiles, newRoom);
    const center = {
      x: Math.floor(newRoom.x + newRoom.w / 2),
      y: Math.floor(newRoom.y + newRoom.h / 2),
    };
    newRoom.center = center;

    if (rooms.length > 0) {
      const prev = rooms[rooms.length - 1].center;
      if (Math.random() < 0.5) {
        carveHorizontalTunnel(tiles, prev.x, center.x, prev.y);
        carveVerticalTunnel(tiles, prev.y, center.y, center.x);
      } else {
        carveVerticalTunnel(tiles, prev.y, center.y, prev.x);
        carveHorizontalTunnel(tiles, prev.x, center.x, center.y);
      }
    }
    rooms.push(newRoom);
  }

  if (rooms.length === 0) {
    return generateDungeon(depth);
  }

  const stairsRoom = rooms[rooms.length - 1];
  const stairs = { ...stairsRoom.center };
  tiles[stairs.y][stairs.x].type = TileType.Stairs;

  return { tiles, rooms, stairs };
}

export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_HEIGHT;
}

export function computeFOV(map, player) {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      map.tiles[y][x].visible = false;
    }
  }

  for (let dy = -FOV_RADIUS; dy <= FOV_RADIUS; dy++) {
    for (let dx = -FOV_RADIUS; dx <= FOV_RADIUS; dx++) {
      const x = player.x + dx;
      const y = player.y + dy;
      if (!inBounds(x, y)) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > FOV_RADIUS) continue;
      const line = bresenhamLine(player.x, player.y, x, y);
      let blocked = false;
      for (const point of line) {
        const tile = map.tiles[point.y][point.x];
        tile.visible = true;
        tile.explored = true;
        if (tile.type === TileType.Wall && !(point.x === x && point.y === y)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
    }
  }
}
