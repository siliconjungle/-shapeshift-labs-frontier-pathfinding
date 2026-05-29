import {
  createGridPathfinder,
  gridFromStrings,
  schedulePathfind,
  setCellPatch,
  type FrontierGridPathfinder,
  type FrontierPathfindingCommitResult,
  type FrontierPathfindingConnectedComponents,
  type FrontierPathfindingFlowField,
  type FrontierPathfindingGridSnapshot,
  type FrontierPathfindingRequest,
  type FrontierPathfindingResult,
  type FrontierPathfindingScheduler
} from '../dist/index.js';

const snapshot: FrontierPathfindingGridSnapshot = gridFromStrings([
  '..#',
  '...',
  '#..'
], { metadata: { source: 'types' } });

const pathfinder: FrontierGridPathfinder = createGridPathfinder(snapshot);
const commit: FrontierPathfindingCommitResult = pathfinder.commit(setCellPatch(pathfinder.width, 1, 1, 0), {
  origin: { actionId: 'grid.block', actor: 'types' }
});
const result: FrontierPathfindingResult = pathfinder.findPath({ x: 0, y: 0 }, { x: 2, y: 2 }, {
  diagonal: 'ifNoObstacles',
  heuristic: 'octile',
  smooth: true,
  allowPartial: true
});
const flow: FrontierPathfindingFlowField = pathfinder.flowField({ x: 2, y: 2 });
const components: FrontierPathfindingConnectedComponents = pathfinder.connectedComponents();
const request: FrontierPathfindingRequest = {
  start: { x: 0, y: 0 },
  goal: { x: 2, y: 2 },
  diagonal: 'never'
};
const scheduler: FrontierPathfindingScheduler = {
  schedule(task) {
    return task;
  }
};

schedulePathfind(scheduler, pathfinder, request, { lane: 'ai' });

void commit;
void result;
void flow;
void components;
