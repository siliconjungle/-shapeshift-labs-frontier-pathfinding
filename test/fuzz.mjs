import assert from 'node:assert';
import {
  cellIndex,
  createGridPathfinder,
  createNavMeshPathfinder,
  navMeshFromPolygons,
  setCellPatch
} from '../dist/index.js';

const args = parseArgs(process.argv.slice(2));
const cases = readPositiveInt(args.cases, 300);
let seed = readPositiveInt(args.seed, 0x5eed);
const DIR_X = [1, 0, -1, 0, 1, -1, -1, 1];
const DIR_Y = [0, 1, 0, -1, 1, 1, -1, -1];

for (let i = 0; i < cases; i++) {
  const width = randInt(4, 16);
  const height = randInt(4, 16);
  const cells = makeCells(width, height);
  const start = randomWalkable(width, height, cells);
  const goal = randomWalkable(width, height, cells);
  const diagonal = pick(['never', 'ifNoObstacles', 'onlyWhenNoObstacles']);
  const pathfinder = createGridPathfinder({ width, height, cells });
  const actual = pathfinder.findPath(start, goal, { diagonal, heuristic: 'zero' });
  const expected = referenceDijkstra(width, height, cells, start, goal, diagonal);
  assert.strictEqual(actual.found, expected.found, 'found mismatch ' + JSON.stringify({ seed, width, height, start, goal, diagonal }));
  if (actual.found) {
    assert.ok(Math.abs(actual.cost - expected.cost) < 1e-9, 'cost mismatch ' + JSON.stringify({ seed, actual: actual.cost, expected: expected.cost }));
    assertPath(width, height, cells, actual.path, start, goal);
  }

  const patchIndex = randInt(0, cells.length - 1);
  const nextCost = chance(0.5) ? 0 : randInt(1, 4);
  pathfinder.commit(setCellPatch(width, patchIndex % width, Math.floor(patchIndex / width), nextCost));
  assert.strictEqual(pathfinder.snapshot().cells[patchIndex], nextCost);

  const rooms = randInt(2, 8);
  const navMesh = createNavMeshPathfinder(navMeshFromPolygons(makeRoomStrip(rooms)));
  const navPath = navMesh.findPath({ x: 0.5, y: 0.5 }, { x: rooms * 4 - 0.5, y: 0.5 });
  assert.strictEqual(navPath.found, true, 'navmesh strip path mismatch ' + JSON.stringify({ seed, rooms }));
  assert.strictEqual(navPath.polygons.length, rooms);
  const navFlow = navMesh.flowField({ x: rooms * 4 - 0.5, y: 0.5 });
  const navSample = navMesh.sampleFlow(navFlow, { x: 0.5, y: 0.5 });
  assert.strictEqual(navSample.reachable, true);
  if (rooms > 1) assert.strictEqual(navSample.nextPolygon, 1);
}

console.log(`frontier pathfinding fuzz passed: cases=${cases}`);

function makeCells(width, height) {
  const out = new Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = chance(0.22) ? 0 : randInt(1, 3);
  out[0] = 1;
  out[out.length - 1] = 1;
  return out;
}

function randomWalkable(width, height, cells) {
  for (let tries = 0; tries < 128; tries++) {
    const x = randInt(0, width - 1);
    const y = randInt(0, height - 1);
    if (cells[cellIndex(width, x, y)] > 0) return { x, y };
  }
  return { x: 0, y: 0 };
}

function makeRoomStrip(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = i * 4;
    out.push({
      id: 'room-' + i,
      points: [
        { x, y: 0 },
        { x: x + 4, y: 0 },
        { x: x + 4, y: 4 },
        { x, y: 4 }
      ],
      cost: randInt(1, 3)
    });
  }
  return out;
}

function referenceDijkstra(width, height, cells, start, goal, diagonal) {
  const startIndex = cellIndex(width, start.x, start.y);
  const goalIndex = cellIndex(width, goal.x, goal.y);
  if (cells[startIndex] <= 0 || cells[goalIndex] <= 0) return { found: false, cost: Infinity };
  const distances = new Array(cells.length).fill(Infinity);
  const visited = new Uint8Array(cells.length);
  distances[startIndex] = 0;
  for (;;) {
    let current = -1;
    let best = Infinity;
    for (let i = 0; i < distances.length; i++) {
      if (!visited[i] && distances[i] < best) {
        best = distances[i];
        current = i;
      }
    }
    if (current === -1) return { found: false, cost: Infinity };
    if (current === goalIndex) return { found: true, cost: best };
    visited[current] = 1;
    const x = current % width;
    const y = Math.floor(current / width);
    for (let dir = 0; dir < 8; dir++) {
      const dx = DIR_X[dir];
      const dy = DIR_Y[dir];
      if (!canMove(width, height, cells, x, y, dx, dy, diagonal)) continue;
      const next = current + dx + dy * width;
      const step = (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1) * cells[next];
      const candidate = best + step;
      if (candidate < distances[next]) distances[next] = candidate;
    }
  }
}

function canMove(width, height, cells, x, y, dx, dy, diagonal) {
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
  if (cells[cellIndex(width, nx, ny)] <= 0) return false;
  if (dx === 0 || dy === 0) return true;
  if (diagonal === 'never') return false;
  const horizontal = cells[cellIndex(width, x + dx, y)] > 0;
  const vertical = cells[cellIndex(width, x, y + dy)] > 0;
  if (diagonal === 'onlyWhenNoObstacles') return horizontal && vertical;
  return horizontal || vertical;
}

function assertPath(width, height, cells, path, start, goal) {
  assert.deepStrictEqual(path[0], start);
  assert.deepStrictEqual(path[path.length - 1], goal);
  for (let i = 0; i < path.length; i++) {
    const point = path[i];
    assert.ok(point.x >= 0 && point.y >= 0 && point.x < width && point.y < height);
    assert.ok(cells[cellIndex(width, point.x, point.y)] > 0);
  }
}

function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
}

function randInt(min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

function chance(probability) {
  return rand() < probability;
}

function pick(values) {
  return values[randInt(0, values.length - 1)];
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cases') out.cases = argv[++i];
    else if (arg === '--seed') out.seed = argv[++i];
  }
  return out;
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
