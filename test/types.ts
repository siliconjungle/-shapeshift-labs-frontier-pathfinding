import {
  createFlowFieldCache,
  createGridPathfinder,
  createNavMeshPathfinder,
  gridFromStrings,
  navMeshFromPolygons,
  schedulePathfind,
  setCellPatch,
  steerAgentsWithFlowField,
  steerAgentsWithNavMeshFlowField,
  type FrontierGridPathfinder,
  type FrontierNavMeshPathfinder,
  type FrontierPathfindingAgentStep,
  type FrontierPathfindingCommitResult,
  type FrontierPathfindingConnectedComponents,
  type FrontierPathfindingFlowField,
  type FrontierPathfindingFlowFieldCache,
  type FrontierPathfindingGridSnapshot,
  type FrontierPathfindingNavMeshFlowField,
  type FrontierPathfindingNavMeshResult,
  type FrontierPathfindingNavMeshSnapshot,
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
const flowCache: FrontierPathfindingFlowFieldCache = createFlowFieldCache(pathfinder);
const cachedFlow: FrontierPathfindingFlowField = flowCache.get({ x: 2, y: 2 });
const flowSteps: FrontierPathfindingAgentStep[] = steerAgentsWithFlowField(cachedFlow, [{ id: 'a', x: 0, y: 0 }]);
const components: FrontierPathfindingConnectedComponents = pathfinder.connectedComponents();
const navMeshSnapshot: FrontierPathfindingNavMeshSnapshot = navMeshFromPolygons([
  { points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }] },
  { points: [{ x: 4, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 4 }, { x: 4, y: 4 }] }
]);
const navMesh: FrontierNavMeshPathfinder = createNavMeshPathfinder(navMeshSnapshot);
const navPath: FrontierPathfindingNavMeshResult = navMesh.findPath({ x: 1, y: 1 }, { x: 7, y: 1 });
const navFlow: FrontierPathfindingNavMeshFlowField = navMesh.flowField({ x: 7, y: 1 });
const navSteps: FrontierPathfindingAgentStep[] = steerAgentsWithNavMeshFlowField(navMesh, navFlow, [{ id: 'n', x: 1, y: 1 }]);
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
void flowSteps;
void components;
void navPath;
void navSteps;
