import assert from 'node:assert';
import {
  cellIndex,
  createFlowFieldCache,
  createGridPathfinder,
  createNavMeshPathfinder,
  gridFromStrings,
  navMeshFromPolygons,
  pointFromIndex,
  steerAgentsWithFlowField,
  steerAgentsWithNavMeshFlowField,
  schedulePathfind,
  setCellPatch
} from '../dist/index.js';

const grid = createGridPathfinder(gridFromStrings([
  '.....',
  '.###.',
  '.#...',
  '.#.#.',
  '.....'
]));

const path = grid.findPath({ x: 0, y: 0 }, { x: 4, y: 4 }, { diagonal: 'never' });
assert.strictEqual(path.found, true);
assert.deepStrictEqual(path.path[0], { x: 0, y: 0 });
assert.deepStrictEqual(path.path[path.path.length - 1], { x: 4, y: 4 });
assert.ok(path.visited > 0);

const diagonal = grid.findPath({ x: 0, y: 0 }, { x: 4, y: 4 }, { diagonal: 'ifNoObstacles', smooth: true });
assert.strictEqual(diagonal.found, true);
assert.ok(diagonal.path.length <= path.path.length);

const blocked = grid.commit(setCellPatch(grid.width, 4, 4, 0), {
  origin: { actionId: 'terrain.block-goal', actor: 'test' }
});
assert.strictEqual(blocked.changed, true);
assert.deepStrictEqual(blocked.dirtyCellIndexes, [cellIndex(grid.width, 4, 4)]);
assert.strictEqual(grid.findPath({ x: 0, y: 0 }, { x: 4, y: 4 }).reason, 'blocked-goal');

grid.setCell(4, 4, 1);
const weighted = createGridPathfinder({
  width: 4,
  height: 3,
  cells: [
    1, 9, 9, 1,
    1, 1, 1, 1,
    1, 9, 9, 1
  ]
});
const weightedPath = weighted.findPath({ x: 0, y: 0 }, { x: 3, y: 0 }, { diagonal: 'never' });
assert.strictEqual(weightedPath.found, true);
assert.ok(weightedPath.cost < 19);

const flow = weighted.flowField({ x: 3, y: 0 }, { diagonal: 'never' });
assert.strictEqual(flow.kind, 'frontier.pathfinding.flow-field');
assert.strictEqual(flow.next[cellIndex(weighted.width, 0, 0)], cellIndex(weighted.width, 0, 1));
assert.ok(flow.reachable > 0);

const flowCache = createFlowFieldCache(weighted, { capacity: 2 });
const cachedFlow = flowCache.get({ x: 3, y: 0 }, { diagonal: 'never' });
assert.strictEqual(flowCache.get({ x: 3, y: 0 }, { diagonal: 'never' }), cachedFlow);
const flowSteps = steerAgentsWithFlowField(cachedFlow, [
  { id: 'agent-0', x: 0, y: 0, speed: 1 },
  { id: 'agent-1', x: 3, y: 0, speed: 1 }
]);
assert.strictEqual(flowSteps[0].reachable, true);
assert.ok(flowSteps[0].nextY > 0);
assert.strictEqual(flowSteps[1].arrived, true);

const components = createGridPathfinder([
  '.#.',
  '###',
  '.#.'
]).connectedComponents({ diagonal: 'never' });
assert.strictEqual(components.count, 4);

const navMesh = createNavMeshPathfinder(navMeshFromPolygons([
  { id: 'room-a', points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }] },
  { id: 'room-b', points: [{ x: 4, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 4 }, { x: 4, y: 4 }] },
  { id: 'room-c', points: [{ x: 8, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 4 }, { x: 8, y: 4 }] }
]));
const navPath = navMesh.findPath({ x: 1, y: 1 }, { x: 11, y: 1 });
assert.strictEqual(navPath.found, true);
assert.deepStrictEqual(navPath.polygons, [0, 1, 2]);
assert.deepStrictEqual(navPath.path[0], { x: 1, y: 1 });
assert.deepStrictEqual(navPath.path[navPath.path.length - 1], { x: 11, y: 1 });
assert.deepStrictEqual(navMesh.neighbors(0), [1]);
assert.strictEqual(navMesh.locate({ x: 5, y: 2 }), 1);

const navFlow = navMesh.flowField({ x: 11, y: 1 });
assert.strictEqual(navFlow.reachable, 3);
const navSample = navMesh.sampleFlow(navFlow, { x: 1, y: 1 });
assert.strictEqual(navSample.reachable, true);
assert.strictEqual(navSample.nextPolygon, 1);
const navSteps = steerAgentsWithNavMeshFlowField(navMesh, navFlow, [
  { id: 'nav-0', x: 1, y: 1, speed: 1 },
  { id: 'nav-1', x: 11, y: 1, speed: 1 }
]);
assert.ok(navSteps[0].nextX > 1);
assert.strictEqual(navSteps[1].arrived, true);

const disconnectedMesh = createNavMeshPathfinder(navMeshFromPolygons([
  { points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }] },
  { points: [{ x: 4, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 4 }, { x: 4, y: 4 }] }
], { autoConnect: false }));
assert.strictEqual(disconnectedMesh.findPath({ x: 1, y: 1 }, { x: 7, y: 1 }).reason, 'unreachable');

const snapshot = weighted.snapshot();
assert.strictEqual(JSON.parse(JSON.stringify(snapshot)).cells.length, weighted.width * weighted.height);
assert.deepStrictEqual(pointFromIndex(5, 7), { x: 2, y: 1 });

let scheduledResult;
const scheduled = schedulePathfind({
  schedule(task) {
    scheduledResult = task.run({ input: task.input, metadata: task.metadata ?? {} });
    return { id: task.id ?? 'scheduled' };
  }
}, weighted, {
  start: { x: 0, y: 0 },
  goal: { x: 3, y: 0 },
  diagonal: 'never'
}, {
  id: 'path:test',
  onResult(result) {
    assert.strictEqual(result.found, true);
  }
});
assert.deepStrictEqual(scheduled, { id: 'path:test' });
assert.strictEqual(scheduledResult.found, true);

console.log('frontier pathfinding smoke passed');
