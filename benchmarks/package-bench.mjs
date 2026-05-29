import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  createFlowFieldCache,
  createGridPathfinder,
  createNavMeshPathfinder,
  navMeshFromPolygons,
  steerAgentsWithFlowField,
  steerAgentsWithNavMeshFlowField,
  setCellPatch
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const repoRoot = path.basename(path.dirname(packageDir)) === 'packages'
  ? path.resolve(packageDir, '..', '..')
  : packageDir;
const args = parseArgs(process.argv.slice(2));
const size = readPositiveInt(args.size, 96);
const rounds = readPositiveInt(args.rounds, 40);
const outPath = args.out ? path.resolve(repoRoot, args.out) : null;

const cells = makeMap(size, size);
const pathfinder = createGridPathfinder({ width: size, height: size, cells });
const start = { x: 1, y: 1 };
const goal = { x: size - 2, y: size - 2 };
const flowCache = createFlowFieldCache(pathfinder, { capacity: 8 });
const cachedFlow = flowCache.get(goal, { diagonal: 'ifNoObstacles' });
const gridAgents = makeGridAgents(5000, size);
const navMesh = createNavMeshPathfinder(navMeshFromPolygons(makeNavMeshStrip(256)));
const navStart = { x: 0.5, y: 0.5 };
const navGoal = { x: 1023.5, y: 0.5 };
const navFlow = navMesh.flowField(navGoal);
const navAgents = makeNavMeshAgents(5000);
let sinkCounter = 0;

const rows = [
  measure('astar-grid-' + size + 'x' + size, () => {
    return pathfinder.findPath(start, goal, { diagonal: 'ifNoObstacles' }).path.length;
  }),
  measure('astar-smooth-' + size + 'x' + size, () => {
    return pathfinder.findPath(start, goal, { diagonal: 'ifNoObstacles', smooth: true }).path.length;
  }),
  measure('dijkstra-zero-heuristic-' + size + 'x' + size, () => {
    return pathfinder.findPath(start, goal, { diagonal: 'ifNoObstacles', heuristic: 'zero' }).visited;
  }),
  measure('flow-field-' + size + 'x' + size, () => {
    return pathfinder.flowField(goal, { diagonal: 'ifNoObstacles' }).reachable;
  }),
  measure('flow-field-cache-hit-' + size + 'x' + size, () => {
    return flowCache.get(goal, { diagonal: 'ifNoObstacles' }).reachable;
  }),
  measure('flow-field-steer-5000', () => {
    return steerAgentsWithFlowField(cachedFlow, gridAgents, { speed: 1 }).length;
  }),
  measure('navmesh-path-256', () => {
    return navMesh.findPath(navStart, navGoal).polygons.length;
  }),
  measure('navmesh-flow-field-256', () => {
    return navMesh.flowField(navGoal).reachable;
  }),
  measure('navmesh-steer-5000', () => {
    return steerAgentsWithNavMeshFlowField(navMesh, navFlow, navAgents, { speed: 1 }).length;
  }),
  measure('patch-cell-update-' + size + 'x' + size, () => {
    const x = 2 + (sinkCounter++ % (size - 4));
    pathfinder.commit(setCellPatch(size, x, 2, sinkCounter % 2 === 0 ? 0 : 1));
    return pathfinder.generation;
  })
];

const report = {
  package: '@shapeshift-labs/frontier-pathfinding',
  version: readPackageVersion(),
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform + ' ' + process.arch,
  size,
  rounds,
  rows
};

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
}

console.log(report.package + ' package benchmark');
console.log('Node ' + report.node + ' on ' + report.platform + ', size=' + size + 'x' + size + ', rounds=' + rounds);
console.log('These are Frontier-only package measurements, not competitor comparisons.');
console.log('');
console.log(padRight('Fixture', 34) + padLeft('Median', 12) + padLeft('p95', 12));
for (const row of rows) {
  console.log(padRight(row.fixture, 34) + padLeft(formatUs(row.medianUs), 12) + padLeft(formatUs(row.p95Us), 12));
}
if (outPath) console.log('\nwrote ' + path.relative(repoRoot, outPath));

function measure(fixture, fn) {
  const values = [];
  let sink = 0;
  for (let round = 0; round < rounds; round++) {
    const started = performance.now();
    sink += fn();
    values[values.length] = (performance.now() - started) * 1000;
  }
  if (sink === -1) console.log('sink=' + sink);
  values.sort((left, right) => left - right);
  return {
    fixture,
    medianUs: percentile(values, 0.5),
    p95Us: percentile(values, 0.95)
  };
}

function makeMap(width, height) {
  const out = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const wall = !border && ((x * 17 + y * 31) % 23 === 0 || (x % 19 === 0 && y % 7 !== 0));
      out[y * width + x] = border || wall ? 0 : 1 + ((x + y) % 11 === 0 ? 1 : 0);
    }
  }
  out[1 * width + 1] = 1;
  out[(height - 2) * width + (width - 2)] = 1;
  return out;
}

function makeGridAgents(count, size) {
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = {
      id: i,
      x: 1 + (i % (size - 2)),
      y: 1 + (Math.floor(i / (size - 2)) % (size - 2)),
      speed: 1
    };
  }
  return out;
}

function makeNavMeshStrip(count) {
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    const x = i * 4;
    out[i] = {
      id: 'poly-' + i,
      points: [
        { x, y: 0 },
        { x: x + 4, y: 0 },
        { x: x + 4, y: 4 },
        { x, y: 4 }
      ]
    };
  }
  return out;
}

function makeNavMeshAgents(count) {
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    const polygon = i % 256;
    out[i] = {
      id: i,
      x: polygon * 4 + 0.5,
      y: 0.5 + (i % 7) * 0.4,
      speed: 1
    };
  }
  return out;
}

function percentile(values, p) {
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))] ?? 0;
}

function formatUs(value) {
  if (value >= 1000) return (value / 1000).toFixed(2) + ' ms';
  return value.toFixed(2) + ' us';
}

function padRight(value, width) {
  return String(value).padEnd(width, ' ');
}

function padLeft(value, width) {
  return String(value).padStart(width, ' ');
}

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')).version;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--size') out.size = argv[++i];
    else if (arg === '--rounds') out.rounds = argv[++i];
    else if (arg === '--out') out.out = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run bench -- [--size 96] [--rounds 40] [--out benchmarks/results/frontier-pathfinding-package-bench-latest.json]');
      process.exit(0);
    }
  }
  return out;
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
