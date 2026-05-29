import { applyPatch } from '@shapeshift-labs/frontier';
import type { JsonValue, Patch } from '@shapeshift-labs/frontier';

export const FRONTIER_PATHFINDING_GRID_KIND = 'frontier.pathfinding.grid';
export const FRONTIER_PATHFINDING_GRID_VERSION = 1;
export const FRONTIER_PATHFINDING_NAVMESH_KIND = 'frontier.pathfinding.navmesh';
export const FRONTIER_PATHFINDING_NAVMESH_VERSION = 1;

const SQRT2 = Math.SQRT2;
const NO_INDEX = -1;
const BLOCKED = 0;
const DEFAULT_COST = 1;
const EPSILON = 1e-9;

export type FrontierPathfindingCellCost = number;
export type FrontierPathfindingDiagonalMode = 'never' | 'always' | 'ifNoObstacles' | 'onlyWhenNoObstacles';
export type FrontierPathfindingHeuristic = 'manhattan' | 'octile' | 'euclidean' | 'chebyshev' | 'zero';

export interface FrontierPathPoint {
  x: number;
  y: number;
}

export interface FrontierPathVector {
  x: number;
  y: number;
  length: number;
}

export interface FrontierPathfindingGridSnapshot {
  kind: typeof FRONTIER_PATHFINDING_GRID_KIND;
  version: typeof FRONTIER_PATHFINDING_GRID_VERSION;
  width: number;
  height: number;
  cells: FrontierPathfindingCellCost[];
  metadata?: Record<string, JsonValue>;
}

export interface FrontierPathfindingGridOptions {
  width: number;
  height: number;
  cells?: readonly FrontierPathfindingCellCost[] | readonly string[];
  blocked?: readonly number[];
  defaultCost?: number;
  metadata?: Record<string, JsonValue>;
}

export type FrontierPathfindingGridInput = FrontierPathfindingGridSnapshot | FrontierPathfindingGridOptions | readonly string[];

export interface FrontierPathfindingOrigin {
  actionId?: string;
  causeId?: string;
  actor?: string;
  source?: string;
  metadata?: Record<string, JsonValue>;
}

export interface FrontierPathfindingCommitOptions {
  origin?: FrontierPathfindingOrigin;
}

export interface FrontierPathfindingCommitResult {
  changed: boolean;
  structural: boolean;
  patch: Patch;
  dirtyCellIndexes: number[];
  generation: number;
  origin?: FrontierPathfindingOrigin;
}

export interface FrontierPathfindingSearchOptions {
  diagonal?: FrontierPathfindingDiagonalMode;
  heuristic?: FrontierPathfindingHeuristic;
  heuristicWeight?: number;
  allowPartial?: boolean;
  smooth?: boolean;
  maxIterations?: number;
}

export interface FrontierPathfindingRequest extends FrontierPathfindingSearchOptions {
  start: FrontierPathPoint;
  goal: FrontierPathPoint;
}

export interface FrontierPathfindingResult {
  found: boolean;
  partial: boolean;
  path: FrontierPathPoint[];
  cost: number;
  visited: number;
  expanded: number;
  iterations: number;
  generation: number;
  reason?: 'blocked-start' | 'blocked-goal' | 'unreachable' | 'max-iterations';
}

export interface FrontierPathfindingFlowFieldOptions {
  diagonal?: FrontierPathfindingDiagonalMode;
  maxCost?: number;
}

export interface FrontierPathfindingFlowField {
  kind: 'frontier.pathfinding.flow-field';
  version: 1;
  width: number;
  height: number;
  goal: FrontierPathPoint;
  generation: number;
  distances: number[];
  next: number[];
  reachable: number;
}

export interface FrontierPathfindingConnectedComponents {
  kind: 'frontier.pathfinding.components';
  version: 1;
  width: number;
  height: number;
  generation: number;
  components: number[];
  count: number;
}

export interface FrontierPathfindingFlowFieldCacheOptions {
  capacity?: number;
}

export interface FrontierPathfindingFlowFieldCache {
  readonly size: number;
  get(goal: FrontierPathPoint, options?: FrontierPathfindingFlowFieldOptions): FrontierPathfindingFlowField;
  clear(): void;
}

export interface FrontierPathfindingFlowSample {
  reachable: boolean;
  arrived: boolean;
  index: number;
  nextIndex: number;
  point: FrontierPathPoint;
  next?: FrontierPathPoint;
  distance: number;
  direction: FrontierPathVector;
}

export interface FrontierPathfindingAgentInput {
  id?: string | number;
  x: number;
  y: number;
  speed?: number;
  metadata?: Record<string, JsonValue>;
}

export interface FrontierPathfindingAgentStep {
  id?: string | number;
  x: number;
  y: number;
  nextX: number;
  nextY: number;
  reachable: boolean;
  arrived: boolean;
  distance: number;
  directionX: number;
  directionY: number;
  target?: FrontierPathPoint;
}

export interface FrontierPathfindingAgentStepOptions {
  speed?: number;
  arriveDistance?: number;
}

export interface FrontierPathfindingNavMeshPolygon {
  id?: string;
  points: FrontierPathPoint[];
  cost?: number;
  metadata?: Record<string, JsonValue>;
}

export interface FrontierPathfindingNavMeshConnection {
  from: number;
  to: number;
  portal?: readonly [FrontierPathPoint, FrontierPathPoint];
  cost?: number;
  bidirectional?: boolean;
  metadata?: Record<string, JsonValue>;
}

export interface FrontierPathfindingNavMeshSnapshot {
  kind: typeof FRONTIER_PATHFINDING_NAVMESH_KIND;
  version: typeof FRONTIER_PATHFINDING_NAVMESH_VERSION;
  polygons: FrontierPathfindingNavMeshPolygon[];
  connections: FrontierPathfindingNavMeshConnection[];
  metadata?: Record<string, JsonValue>;
}

export interface FrontierPathfindingNavMeshOptions {
  polygons: readonly FrontierPathfindingNavMeshPolygon[];
  connections?: readonly FrontierPathfindingNavMeshConnection[];
  autoConnect?: boolean;
  metadata?: Record<string, JsonValue>;
}

export type FrontierPathfindingNavMeshInput = FrontierPathfindingNavMeshSnapshot | FrontierPathfindingNavMeshOptions;

export interface FrontierPathfindingNavMeshSearchOptions {
  allowPartial?: boolean;
  smooth?: boolean;
  maxIterations?: number;
}

export interface FrontierPathfindingNavMeshResult {
  found: boolean;
  partial: boolean;
  path: FrontierPathPoint[];
  polygons: number[];
  portals: [FrontierPathPoint, FrontierPathPoint][];
  cost: number;
  visited: number;
  expanded: number;
  iterations: number;
  generation: number;
  reason?: 'outside-start' | 'outside-goal' | 'unreachable' | 'max-iterations';
}

export interface FrontierPathfindingNavMeshFlowField {
  kind: 'frontier.pathfinding.navmesh-flow-field';
  version: 1;
  generation: number;
  goal: FrontierPathPoint;
  goalPolygon: number;
  distances: number[];
  nextPolygons: number[];
  reachable: number;
}

export interface FrontierPathfindingNavMeshFlowSample {
  reachable: boolean;
  arrived: boolean;
  polygon: number;
  nextPolygon: number;
  target?: FrontierPathPoint;
  distance: number;
  direction: FrontierPathVector;
}

export interface FrontierNavMeshPathfinder {
  readonly generation: number;
  readonly polygonCount: number;
  snapshot(): FrontierPathfindingNavMeshSnapshot;
  commit(patch: Patch, options?: FrontierPathfindingCommitOptions): FrontierPathfindingCommitResult;
  locate(point: FrontierPathPoint): number;
  neighbors(polygonIndex: number): number[];
  findPath(start: FrontierPathPoint, goal: FrontierPathPoint, options?: FrontierPathfindingNavMeshSearchOptions): FrontierPathfindingNavMeshResult;
  flowField(goal: FrontierPathPoint): FrontierPathfindingNavMeshFlowField;
  sampleFlow(flow: FrontierPathfindingNavMeshFlowField, point: FrontierPathPoint): FrontierPathfindingNavMeshFlowSample;
}

export interface FrontierPathfindingScheduler {
  schedule<TInput = unknown>(task: {
    id?: string;
    type?: string;
    input?: TInput;
    lane?: string;
    area?: string;
    key?: string;
    units?: number;
    metadata?: Record<string, unknown>;
    run?: (context: { input: TInput | undefined; metadata: Record<string, unknown> }) => unknown;
  }): unknown;
}

export interface FrontierPathfindingScheduleOptions {
  id?: string;
  lane?: string;
  key?: string;
  metadata?: Record<string, unknown>;
  onResult?: (result: FrontierPathfindingResult) => void;
}

export interface FrontierGridPathfinder {
  readonly width: number;
  readonly height: number;
  readonly generation: number;
  snapshot(): FrontierPathfindingGridSnapshot;
  isWalkable(x: number, y: number): boolean;
  cellCost(x: number, y: number): number;
  setCell(x: number, y: number, cost: number, options?: FrontierPathfindingCommitOptions): FrontierPathfindingCommitResult;
  commit(patch: Patch, options?: FrontierPathfindingCommitOptions): FrontierPathfindingCommitResult;
  findPath(start: FrontierPathPoint, goal: FrontierPathPoint, options?: FrontierPathfindingSearchOptions): FrontierPathfindingResult;
  flowField(goal: FrontierPathPoint, options?: FrontierPathfindingFlowFieldOptions): FrontierPathfindingFlowField;
  connectedComponents(options?: { diagonal?: FrontierPathfindingDiagonalMode }): FrontierPathfindingConnectedComponents;
  lineOfSight(from: FrontierPathPoint, to: FrontierPathPoint): boolean;
  smoothPath(path: readonly FrontierPathPoint[]): FrontierPathPoint[];
}

export function createGridPathfinder(input: FrontierPathfindingGridInput): FrontierGridPathfinder {
  return new FrontierGridPathfinderImpl(normalizeGridSnapshot(input));
}

export function createFlowFieldCache(
  pathfinder: FrontierGridPathfinder,
  options: FrontierPathfindingFlowFieldCacheOptions = {}
): FrontierPathfindingFlowFieldCache {
  return new FrontierFlowFieldCache(pathfinder, Math.max(1, Math.floor(options.capacity ?? 16)));
}

export function sampleFlowField(flow: FrontierPathfindingFlowField, point: FrontierPathPoint): FrontierPathfindingFlowSample {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  const index = x >= 0 && y >= 0 && x < flow.width && y < flow.height ? cellIndex(flow.width, x, y) : NO_INDEX;
  if (index === NO_INDEX || flow.distances[index] < 0) {
    return {
      reachable: false,
      arrived: false,
      index,
      nextIndex: NO_INDEX,
      point: { x, y },
      distance: -1,
      direction: { x: 0, y: 0, length: 0 }
    };
  }
  const nextIndex = flow.next[index] ?? NO_INDEX;
  const arrived = nextIndex === index;
  const next = nextIndex >= 0 ? pointFromIndex(flow.width, nextIndex) : undefined;
  const direction = next && !arrived ? directionBetween(point, next) : { x: 0, y: 0, length: 0 };
  return {
    reachable: true,
    arrived,
    index,
    nextIndex,
    point: { x, y },
    next,
    distance: flow.distances[index],
    direction
  };
}

export function steerAgentsWithFlowField(
  flow: FrontierPathfindingFlowField,
  agents: readonly FrontierPathfindingAgentInput[],
  options: FrontierPathfindingAgentStepOptions = {}
): FrontierPathfindingAgentStep[] {
  const speedFallback = Math.max(0, options.speed ?? 1);
  const arriveDistance = Math.max(0, options.arriveDistance ?? 0);
  const out = new Array<FrontierPathfindingAgentStep>(agents.length);
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const sample = sampleFlowField(flow, agent);
    const speed = Math.max(0, agent.speed ?? speedFallback);
    const arrived = sample.arrived || (sample.reachable && sample.distance <= arriveDistance);
    const step = sample.reachable && !arrived ? Math.min(speed, sample.direction.length || speed) : 0;
    out[i] = {
      id: agent.id,
      x: agent.x,
      y: agent.y,
      nextX: agent.x + sample.direction.x * step,
      nextY: agent.y + sample.direction.y * step,
      reachable: sample.reachable,
      arrived,
      distance: sample.distance,
      directionX: sample.direction.x,
      directionY: sample.direction.y,
      target: sample.next
    };
  }
  return out;
}

export function createNavMeshPathfinder(input: FrontierPathfindingNavMeshInput): FrontierNavMeshPathfinder {
  return new FrontierNavMeshPathfinderImpl(normalizeNavMeshSnapshot(input));
}

export function navMeshFromPolygons(
  polygons: readonly FrontierPathfindingNavMeshPolygon[],
  options: {
    connections?: readonly FrontierPathfindingNavMeshConnection[];
    autoConnect?: boolean;
    metadata?: Record<string, JsonValue>;
  } = {}
): FrontierPathfindingNavMeshSnapshot {
  return normalizeNavMeshSnapshot({
    polygons,
    connections: options.connections,
    autoConnect: options.autoConnect,
    metadata: options.metadata
  });
}

export function steerAgentsWithNavMeshFlowField(
  navMesh: FrontierNavMeshPathfinder,
  flow: FrontierPathfindingNavMeshFlowField,
  agents: readonly FrontierPathfindingAgentInput[],
  options: FrontierPathfindingAgentStepOptions = {}
): FrontierPathfindingAgentStep[] {
  const speedFallback = Math.max(0, options.speed ?? 1);
  const arriveDistance = Math.max(0, options.arriveDistance ?? 0);
  const out = new Array<FrontierPathfindingAgentStep>(agents.length);
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const sample = navMesh.sampleFlow(flow, agent);
    const speed = Math.max(0, agent.speed ?? speedFallback);
    const arrived = sample.arrived || (sample.reachable && sample.distance <= arriveDistance);
    const step = sample.reachable && !arrived ? Math.min(speed, sample.direction.length || speed) : 0;
    out[i] = {
      id: agent.id,
      x: agent.x,
      y: agent.y,
      nextX: agent.x + sample.direction.x * step,
      nextY: agent.y + sample.direction.y * step,
      reachable: sample.reachable,
      arrived,
      distance: sample.distance,
      directionX: sample.direction.x,
      directionY: sample.direction.y,
      target: sample.target
    };
  }
  return out;
}

export function gridFromStrings(rows: readonly string[], options: {
  wall?: string;
  floorCost?: number;
  metadata?: Record<string, JsonValue>;
} = {}): FrontierPathfindingGridSnapshot {
  return normalizeGridSnapshot({
    width: rows[0]?.length ?? 0,
    height: rows.length,
    cells: rows,
    defaultCost: options.floorCost ?? DEFAULT_COST,
    metadata: options.metadata
  }, options.wall ?? '#');
}

export function cellIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function pointFromIndex(width: number, index: number): FrontierPathPoint {
  return { x: index % width, y: Math.floor(index / width) };
}

export function setCellPatch(width: number, x: number, y: number, cost: number): Patch {
  return [[0, ['cells', cellIndex(width, x, y)], normalizeCost(cost)]];
}

export function schedulePathfind(
  scheduler: FrontierPathfindingScheduler,
  pathfinder: FrontierGridPathfinder,
  request: FrontierPathfindingRequest,
  options: FrontierPathfindingScheduleOptions = {}
): unknown {
  return scheduler.schedule({
    id: options.id,
    type: 'frontier.pathfinding.findPath',
    lane: options.lane ?? 'pathfinding',
    area: 'frontier-pathfinding',
    key: options.key ?? request.start.x + ',' + request.start.y + '->' + request.goal.x + ',' + request.goal.y,
    input: request,
    units: pathfinder.width * pathfinder.height,
    metadata: {
      generation: pathfinder.generation,
      ...(options.metadata ?? {})
    },
    run(context) {
      const input = context.input ?? request;
      const result = pathfinder.findPath(input.start, input.goal, input);
      options.onResult?.(result);
      return result;
    }
  });
}

class FrontierGridPathfinderImpl implements FrontierGridPathfinder {
  private state: FrontierPathfindingGridSnapshot;
  private costs: Float64Array;
  private blocked: Uint8Array;
  private gScore: Float64Array;
  private fScore: Float64Array;
  private parent: Int32Array;
  private opened: Uint32Array;
  private closed: Uint32Array;
  private searchId = 1;
  private generationValue = 0;
  private heap: BinaryHeap;

  constructor(snapshot: FrontierPathfindingGridSnapshot) {
    this.state = cloneSnapshot(snapshot);
    const size = this.state.width * this.state.height;
    this.costs = new Float64Array(size);
    this.blocked = new Uint8Array(size);
    this.gScore = new Float64Array(size);
    this.fScore = new Float64Array(size);
    this.parent = new Int32Array(size);
    this.opened = new Uint32Array(size);
    this.closed = new Uint32Array(size);
    this.heap = new BinaryHeap(this.fScore, this.gScore);
    this.rebuildCaches();
  }

  get width(): number {
    return this.state.width;
  }

  get height(): number {
    return this.state.height;
  }

  get generation(): number {
    return this.generationValue;
  }

  snapshot(): FrontierPathfindingGridSnapshot {
    return cloneSnapshot(this.state);
  }

  isWalkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.blocked[cellIndex(this.width, x, y)] === 0;
  }

  cellCost(x: number, y: number): number {
    return this.inBounds(x, y) ? this.costs[cellIndex(this.width, x, y)] : BLOCKED;
  }

  setCell(x: number, y: number, cost: number, options: FrontierPathfindingCommitOptions = {}): FrontierPathfindingCommitResult {
    return this.commit(setCellPatch(this.width, x, y, cost), options);
  }

  commit(patch: Patch, options: FrontierPathfindingCommitOptions = {}): FrontierPathfindingCommitResult {
    if (patch.length === 0) {
      return { changed: false, structural: false, patch, dirtyCellIndexes: [], generation: this.generationValue, origin: options.origin };
    }
    const dirtyCellIndexes: number[] = [];
    let structural = false;
    for (let i = 0; i < patch.length; i++) {
      const path = patch[i][1];
      if (path.length === 2 && path[0] === 'cells' && typeof path[1] === 'number') {
        dirtyCellIndexes[dirtyCellIndexes.length] = path[1];
      } else {
        structural = true;
      }
    }
    this.state = applyPatch(this.state as unknown as JsonValue, patch) as unknown as FrontierPathfindingGridSnapshot;
    this.generationValue++;
    if (structural || this.state.cells.length !== this.width * this.height) {
      this.state = normalizeGridSnapshot(this.state);
      this.resizeCaches();
      this.rebuildCaches();
      return { changed: true, structural: true, patch, dirtyCellIndexes, generation: this.generationValue, origin: options.origin };
    }
    for (let i = 0; i < dirtyCellIndexes.length; i++) {
      this.updateCellCache(dirtyCellIndexes[i]);
    }
    return { changed: true, structural, patch, dirtyCellIndexes, generation: this.generationValue, origin: options.origin };
  }

  findPath(
    start: FrontierPathPoint,
    goal: FrontierPathPoint,
    options: FrontierPathfindingSearchOptions = {}
  ): FrontierPathfindingResult {
    const startIndex = this.indexForPoint(start);
    const goalIndex = this.indexForPoint(goal);
    if (startIndex === NO_INDEX || this.blocked[startIndex] === 1) return this.emptyResult('blocked-start');
    if (goalIndex === NO_INDEX || this.blocked[goalIndex] === 1) return this.emptyResult('blocked-goal');

    const diagonal = options.diagonal ?? 'ifNoObstacles';
    const heuristic = selectHeuristic(options.heuristic ?? heuristicForDiagonal(diagonal));
    const heuristicWeight = Math.max(0, options.heuristicWeight ?? 1);
    const maxIterations = Math.max(1, Math.floor(options.maxIterations ?? this.costs.length * 8));
    const searchId = this.nextSearchId();
    const width = this.width;
    const goalX = goalIndex % width;
    const goalY = Math.floor(goalIndex / width);
    let visited = 1;
    let expanded = 0;
    let iterations = 0;
    let bestIndex = startIndex;
    let bestHeuristic = heuristic(start.x, start.y, goalX, goalY);

    this.heap.clear();
    this.gScore[startIndex] = 0;
    this.fScore[startIndex] = bestHeuristic * heuristicWeight;
    this.parent[startIndex] = NO_INDEX;
    this.opened[startIndex] = searchId;
    this.heap.push(startIndex);

    while (this.heap.length > 0 && iterations < maxIterations) {
      iterations++;
      const current = this.heap.pop();
      if (current === NO_INDEX || this.closed[current] === searchId) continue;
      this.closed[current] = searchId;
      expanded++;
      if (current === goalIndex) {
        return this.resultFrom(goalIndex, false, visited, expanded, iterations, options.smooth === true);
      }
      const cx = current % width;
      const cy = Math.floor(current / width);
      for (let dir = 0; dir < 8; dir++) {
        const dx = DIR_X[dir];
        const dy = DIR_Y[dir];
        if (!this.canMove(cx, cy, dx, dy, diagonal)) continue;
        const next = current + dx + dy * width;
        if (this.closed[next] === searchId) continue;
        const stepCost = (dx !== 0 && dy !== 0 ? SQRT2 : 1) * this.costs[next];
        const tentative = this.gScore[current] + stepCost;
        if (this.opened[next] !== searchId || tentative < this.gScore[next]) {
          const hx = heuristic(cx + dx, cy + dy, goalX, goalY);
          this.gScore[next] = tentative;
          this.fScore[next] = tentative + hx * heuristicWeight;
          this.parent[next] = current;
          if (this.opened[next] !== searchId) {
            this.opened[next] = searchId;
            visited++;
          }
          if (hx < bestHeuristic || (hx === bestHeuristic && tentative < this.gScore[bestIndex])) {
            bestHeuristic = hx;
            bestIndex = next;
          }
          this.heap.push(next);
        }
      }
    }

    if (options.allowPartial === true && bestIndex !== startIndex) {
      return this.resultFrom(bestIndex, true, visited, expanded, iterations, options.smooth === true, iterations >= maxIterations ? 'max-iterations' : 'unreachable');
    }
    return {
      found: false,
      partial: false,
      path: [],
      cost: Number.POSITIVE_INFINITY,
      visited,
      expanded,
      iterations,
      generation: this.generationValue,
      reason: iterations >= maxIterations ? 'max-iterations' : 'unreachable'
    };
  }

  flowField(goal: FrontierPathPoint, options: FrontierPathfindingFlowFieldOptions = {}): FrontierPathfindingFlowField {
    const goalIndex = this.indexForPoint(goal);
    const size = this.costs.length;
    const distances = new Float64Array(size);
    const next = new Int32Array(size);
    distances.fill(Number.POSITIVE_INFINITY);
    next.fill(NO_INDEX);
    if (goalIndex === NO_INDEX || this.blocked[goalIndex] === 1) {
      return this.flowFieldResult(goal, distances, next, 0);
    }
    const diagonal = options.diagonal ?? 'ifNoObstacles';
    const maxCost = options.maxCost ?? Number.POSITIVE_INFINITY;
    const heap = new BinaryHeap(distances, distances);
    const settled = new Uint8Array(size);
    distances[goalIndex] = 0;
    next[goalIndex] = goalIndex;
    heap.push(goalIndex);
    let reachable = 0;
    const width = this.width;
    while (heap.length > 0) {
      const current = heap.pop();
      if (current === NO_INDEX) break;
      if (settled[current] === 1) continue;
      settled[current] = 1;
      const currentCost = distances[current];
      if (currentCost > maxCost) continue;
      reachable++;
      const cx = current % width;
      const cy = Math.floor(current / width);
      for (let dir = 0; dir < 8; dir++) {
        const dx = DIR_X[dir];
        const dy = DIR_Y[dir];
        if (!this.canMove(cx, cy, dx, dy, diagonal)) continue;
        const neighbor = current + dx + dy * width;
        const stepCost = (dx !== 0 && dy !== 0 ? SQRT2 : 1) * this.costs[current];
        const candidate = currentCost + stepCost;
        if (candidate < distances[neighbor]) {
          distances[neighbor] = candidate;
          next[neighbor] = current;
          heap.push(neighbor);
        }
      }
    }
    return this.flowFieldResult(goal, distances, next, reachable);
  }

  connectedComponents(options: { diagonal?: FrontierPathfindingDiagonalMode } = {}): FrontierPathfindingConnectedComponents {
    const diagonal = options.diagonal ?? 'ifNoObstacles';
    const components = new Int32Array(this.costs.length);
    components.fill(NO_INDEX);
    const queue = new Int32Array(this.costs.length);
    let count = 0;
    for (let i = 0; i < this.costs.length; i++) {
      if (this.blocked[i] === 1 || components[i] !== NO_INDEX) continue;
      let head = 0;
      let tail = 0;
      queue[tail++] = i;
      components[i] = count;
      while (head < tail) {
        const current = queue[head++];
        const cx = current % this.width;
        const cy = Math.floor(current / this.width);
        for (let dir = 0; dir < 8; dir++) {
          const dx = DIR_X[dir];
          const dy = DIR_Y[dir];
          if (!this.canMove(cx, cy, dx, dy, diagonal)) continue;
          const next = current + dx + dy * this.width;
          if (components[next] === NO_INDEX) {
            components[next] = count;
            queue[tail++] = next;
          }
        }
      }
      count++;
    }
    return {
      kind: 'frontier.pathfinding.components',
      version: 1,
      width: this.width,
      height: this.height,
      generation: this.generationValue,
      components: Array.from(components),
      count
    };
  }

  lineOfSight(from: FrontierPathPoint, to: FrontierPathPoint): boolean {
    let x0 = Math.floor(from.x);
    let y0 = Math.floor(from.y);
    const x1 = Math.floor(to.x);
    const y1 = Math.floor(to.y);
    if (!this.isWalkable(x0, y0) || !this.isWalkable(x1, y1)) return false;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx - dy;
    for (;;) {
      if (!this.isWalkable(x0, y0)) return false;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = error * 2;
      if (e2 > -dy) {
        error -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        error += dx;
        y0 += sy;
      }
    }
  }

  smoothPath(path: readonly FrontierPathPoint[]): FrontierPathPoint[] {
    if (path.length <= 2) return path.map((point) => ({ x: point.x, y: point.y }));
    const out: FrontierPathPoint[] = [{ x: path[0].x, y: path[0].y }];
    let anchor = 0;
    let scan = 2;
    while (scan < path.length) {
      if (!this.lineOfSight(path[anchor], path[scan])) {
        out[out.length] = { x: path[scan - 1].x, y: path[scan - 1].y };
        anchor = scan - 1;
      }
      scan++;
    }
    out[out.length] = { x: path[path.length - 1].x, y: path[path.length - 1].y };
    return out;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private indexForPoint(point: FrontierPathPoint): number {
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    return this.inBounds(x, y) ? cellIndex(this.width, x, y) : NO_INDEX;
  }

  private canMove(x: number, y: number, dx: number, dy: number, diagonal: FrontierPathfindingDiagonalMode): boolean {
    const nx = x + dx;
    const ny = y + dy;
    if (!this.inBounds(nx, ny)) return false;
    const next = cellIndex(this.width, nx, ny);
    if (this.blocked[next] === 1) return false;
    if (dx === 0 || dy === 0) return true;
    if (diagonal === 'never') return false;
    if (diagonal === 'always') return true;
    const horizontal = cellIndex(this.width, x + dx, y);
    const vertical = cellIndex(this.width, x, y + dy);
    if (diagonal === 'onlyWhenNoObstacles') return this.blocked[horizontal] === 0 && this.blocked[vertical] === 0;
    return this.blocked[horizontal] === 0 || this.blocked[vertical] === 0;
  }

  private nextSearchId(): number {
    this.searchId++;
    if (this.searchId >= 0xffffffff) {
      this.searchId = 1;
      this.opened.fill(0);
      this.closed.fill(0);
    }
    return this.searchId;
  }

  private resultFrom(
    index: number,
    partial: boolean,
    visited: number,
    expanded: number,
    iterations: number,
    smooth: boolean,
    reason?: FrontierPathfindingResult['reason']
  ): FrontierPathfindingResult {
    const rawPath = this.reconstruct(index);
    const path = smooth ? this.smoothPath(rawPath) : rawPath;
    return {
      found: !partial,
      partial,
      path,
      cost: this.gScore[index],
      visited,
      expanded,
      iterations,
      generation: this.generationValue,
      reason
    };
  }

  private reconstruct(index: number): FrontierPathPoint[] {
    const reversed: FrontierPathPoint[] = [];
    let current = index;
    while (current !== NO_INDEX) {
      reversed[reversed.length] = pointFromIndex(this.width, current);
      current = this.parent[current];
    }
    reversed.reverse();
    return reversed;
  }

  private flowFieldResult(
    goal: FrontierPathPoint,
    distances: Float64Array,
    next: Int32Array,
    reachable: number
  ): FrontierPathfindingFlowField {
    const outDistances = new Array<number>(distances.length);
    for (let i = 0; i < distances.length; i++) outDistances[i] = Number.isFinite(distances[i]) ? distances[i] : -1;
    return {
      kind: 'frontier.pathfinding.flow-field',
      version: 1,
      width: this.width,
      height: this.height,
      goal: { x: Math.floor(goal.x), y: Math.floor(goal.y) },
      generation: this.generationValue,
      distances: outDistances,
      next: Array.from(next),
      reachable
    };
  }

  private emptyResult(reason: FrontierPathfindingResult['reason']): FrontierPathfindingResult {
    return {
      found: false,
      partial: false,
      path: [],
      cost: Number.POSITIVE_INFINITY,
      visited: 0,
      expanded: 0,
      iterations: 0,
      generation: this.generationValue,
      reason
    };
  }

  private resizeCaches(): void {
    const size = this.state.width * this.state.height;
    if (this.costs.length === size) return;
    this.costs = new Float64Array(size);
    this.blocked = new Uint8Array(size);
    this.gScore = new Float64Array(size);
    this.fScore = new Float64Array(size);
    this.parent = new Int32Array(size);
    this.opened = new Uint32Array(size);
    this.closed = new Uint32Array(size);
    this.heap = new BinaryHeap(this.fScore, this.gScore);
  }

  private rebuildCaches(): void {
    for (let i = 0; i < this.costs.length; i++) this.updateCellCache(i);
  }

  private updateCellCache(index: number): void {
    if (index < 0 || index >= this.costs.length) return;
    const cost = normalizeCost(this.state.cells[index] ?? BLOCKED);
    this.state.cells[index] = cost;
    this.costs[index] = cost;
    this.blocked[index] = cost <= 0 ? 1 : 0;
  }
}

class FrontierFlowFieldCache implements FrontierPathfindingFlowFieldCache {
  private readonly entries = new Map<string, FrontierPathfindingFlowField>();

  constructor(private readonly pathfinder: FrontierGridPathfinder, private readonly capacity: number) {}

  get size(): number {
    return this.entries.size;
  }

  get(goal: FrontierPathPoint, options: FrontierPathfindingFlowFieldOptions = {}): FrontierPathfindingFlowField {
    const key = [
      this.pathfinder.generation,
      Math.floor(goal.x),
      Math.floor(goal.y),
      options.diagonal ?? 'ifNoObstacles',
      options.maxCost ?? ''
    ].join('|');
    const cached = this.entries.get(key);
    if (cached) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return cached;
    }
    const field = this.pathfinder.flowField(goal, options);
    this.entries.set(key, field);
    while (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return field;
  }

  clear(): void {
    this.entries.clear();
  }
}

interface NavMeshEdge {
  to: number;
  portal: [FrontierPathPoint, FrontierPathPoint];
  midpoint: FrontierPathPoint;
  cost: number;
}

interface NavMeshIncomingEdge {
  from: number;
  cost: number;
}

interface NavMeshGraph {
  outgoing: NavMeshEdge[][];
  incoming: NavMeshIncomingEdge[][];
}

interface NavMeshLocateIndex {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  buckets: number[][];
}

class FrontierNavMeshPathfinderImpl implements FrontierNavMeshPathfinder {
  private state: FrontierPathfindingNavMeshSnapshot;
  private generationValue = 0;
  private centroids: FrontierPathPoint[] = [];
  private bounds: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = [];
  private locateIndex: NavMeshLocateIndex = emptyLocateIndex();
  private adjacency: NavMeshEdge[][] = [];
  private incoming: NavMeshIncomingEdge[][] = [];
  private distances = new Float64Array(0);
  private scores = new Float64Array(0);
  private parent = new Int32Array(0);
  private opened = new Uint32Array(0);
  private closed = new Uint32Array(0);
  private heap = new BinaryHeap(this.scores, this.distances);
  private searchId = 1;

  constructor(snapshot: FrontierPathfindingNavMeshSnapshot) {
    this.state = cloneNavMeshSnapshot(snapshot);
    this.rebuildCaches();
  }

  get generation(): number {
    return this.generationValue;
  }

  get polygonCount(): number {
    return this.state.polygons.length;
  }

  snapshot(): FrontierPathfindingNavMeshSnapshot {
    return cloneNavMeshSnapshot(this.state);
  }

  commit(patch: Patch, options: FrontierPathfindingCommitOptions = {}): FrontierPathfindingCommitResult {
    if (patch.length === 0) {
      return { changed: false, structural: false, patch, dirtyCellIndexes: [], generation: this.generationValue, origin: options.origin };
    }
    this.state = normalizeNavMeshSnapshot(applyPatch(this.state as unknown as JsonValue, patch) as unknown as FrontierPathfindingNavMeshSnapshot);
    this.generationValue++;
    this.rebuildCaches();
    return { changed: true, structural: true, patch, dirtyCellIndexes: [], generation: this.generationValue, origin: options.origin };
  }

  locate(point: FrontierPathPoint): number {
    if (point.x < this.locateIndex.minX - EPSILON || point.x > this.locateIndex.maxX + EPSILON ||
      point.y < this.locateIndex.minY - EPSILON || point.y > this.locateIndex.maxY + EPSILON) {
      return NO_INDEX;
    }
    const column = clampInt(Math.floor((point.x - this.locateIndex.minX) / this.locateIndex.cellWidth), 0, this.locateIndex.columns - 1);
    const row = clampInt(Math.floor((point.y - this.locateIndex.minY) / this.locateIndex.cellHeight), 0, this.locateIndex.rows - 1);
    const candidates = this.locateIndex.buckets[row * this.locateIndex.columns + column];
    for (let offset = 0; offset < candidates.length; offset++) {
      const i = candidates[offset];
      const bounds = this.bounds[i];
      if (point.x < bounds.minX - EPSILON || point.x > bounds.maxX + EPSILON || point.y < bounds.minY - EPSILON || point.y > bounds.maxY + EPSILON) {
        continue;
      }
      if (pointInPolygon(point, this.state.polygons[i].points)) return i;
    }
    return NO_INDEX;
  }

  neighbors(polygonIndex: number): number[] {
    const edges = this.adjacency[polygonIndex];
    if (!edges) return [];
    const out = new Array<number>(edges.length);
    for (let i = 0; i < edges.length; i++) out[i] = edges[i].to;
    return out;
  }

  findPath(
    start: FrontierPathPoint,
    goal: FrontierPathPoint,
    options: FrontierPathfindingNavMeshSearchOptions = {}
  ): FrontierPathfindingNavMeshResult {
    const startPolygon = this.locate(start);
    if (startPolygon === NO_INDEX) return this.emptyResult('outside-start');
    const goalPolygon = this.locate(goal);
    if (goalPolygon === NO_INDEX) return this.emptyResult('outside-goal');
    if (startPolygon === goalPolygon) {
      return {
        found: true,
        partial: false,
        path: dedupePath([{ x: start.x, y: start.y }, { x: goal.x, y: goal.y }]),
        polygons: [startPolygon],
        portals: [],
        cost: distance(start, goal),
        visited: 1,
        expanded: 0,
        iterations: 0,
        generation: this.generationValue
      };
    }

    const maxIterations = Math.max(1, Math.floor(options.maxIterations ?? this.polygonCount * 8));
    const searchId = this.nextSearchId();
    let visited = 1;
    let expanded = 0;
    let iterations = 0;
    let bestPolygon = startPolygon;
    let bestHeuristic = distance(this.centroids[startPolygon], goal);

    this.heap.clear();
    this.distances[startPolygon] = 0;
    this.scores[startPolygon] = bestHeuristic;
    this.parent[startPolygon] = NO_INDEX;
    this.opened[startPolygon] = searchId;
    this.heap.push(startPolygon);

    while (this.heap.length > 0 && iterations < maxIterations) {
      iterations++;
      const current = this.heap.pop();
      if (current === NO_INDEX || this.closed[current] === searchId) continue;
      this.closed[current] = searchId;
      expanded++;
      if (current === goalPolygon) {
        return this.navMeshResultFrom(start, goal, goalPolygon, false, visited, expanded, iterations, options.smooth !== false);
      }
      const edges = this.adjacency[current];
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const next = edge.to;
        if (this.closed[next] === searchId) continue;
        const nextCost = this.state.polygons[next].cost ?? DEFAULT_COST;
        const tentative = this.distances[current] + edge.cost + distance(this.centroids[current], this.centroids[next]) * Math.max(EPSILON, nextCost);
        if (this.opened[next] !== searchId || tentative < this.distances[next]) {
          const heuristic = distance(this.centroids[next], goal);
          this.distances[next] = tentative;
          this.scores[next] = tentative + heuristic;
          this.parent[next] = current;
          if (this.opened[next] !== searchId) {
            this.opened[next] = searchId;
            visited++;
          }
          if (heuristic < bestHeuristic || (heuristic === bestHeuristic && tentative < this.distances[bestPolygon])) {
            bestHeuristic = heuristic;
            bestPolygon = next;
          }
          this.heap.push(next);
        }
      }
    }

    const reason: FrontierPathfindingNavMeshResult['reason'] = iterations >= maxIterations ? 'max-iterations' : 'unreachable';
    if (options.allowPartial === true && bestPolygon !== startPolygon) {
      return this.navMeshResultFrom(start, goal, bestPolygon, true, visited, expanded, iterations, options.smooth !== false, reason);
    }
    return {
      found: false,
      partial: false,
      path: [],
      polygons: [],
      portals: [],
      cost: Number.POSITIVE_INFINITY,
      visited,
      expanded,
      iterations,
      generation: this.generationValue,
      reason
    };
  }

  flowField(goal: FrontierPathPoint): FrontierPathfindingNavMeshFlowField {
    const goalPolygon = this.locate(goal);
    const count = this.polygonCount;
    const distances = new Float64Array(count);
    const nextPolygons = new Int32Array(count);
    distances.fill(Number.POSITIVE_INFINITY);
    nextPolygons.fill(NO_INDEX);
    if (goalPolygon === NO_INDEX) {
      return this.navMeshFlowFieldResult(goal, goalPolygon, distances, nextPolygons, 0);
    }
    const heap = new BinaryHeap(distances, distances);
    const settled = new Uint8Array(count);
    distances[goalPolygon] = 0;
    nextPolygons[goalPolygon] = goalPolygon;
    heap.push(goalPolygon);
    let reachable = 0;
    while (heap.length > 0) {
      const current = heap.pop();
      if (current === NO_INDEX) break;
      if (settled[current] === 1) continue;
      settled[current] = 1;
      reachable++;
      const edges = this.incoming[current];
      for (let i = 0; i < edges.length; i++) {
        const neighbor = edges[i].from;
        const stepCost = edges[i].cost + distance(this.centroids[current], this.centroids[neighbor]) * Math.max(EPSILON, this.state.polygons[current].cost ?? DEFAULT_COST);
        const candidate = distances[current] + stepCost;
        if (candidate < distances[neighbor]) {
          distances[neighbor] = candidate;
          nextPolygons[neighbor] = current;
          heap.push(neighbor);
        }
      }
    }
    return this.navMeshFlowFieldResult(goal, goalPolygon, distances, nextPolygons, reachable);
  }

  sampleFlow(flow: FrontierPathfindingNavMeshFlowField, point: FrontierPathPoint): FrontierPathfindingNavMeshFlowSample {
    if (flow.generation !== this.generationValue) {
      return {
        reachable: false,
        arrived: false,
        polygon: NO_INDEX,
        nextPolygon: NO_INDEX,
        distance: -1,
        direction: { x: 0, y: 0, length: 0 }
      };
    }
    const polygon = this.locate(point);
    if (polygon === NO_INDEX || flow.distances[polygon] < 0) {
      return {
        reachable: false,
        arrived: false,
        polygon,
        nextPolygon: NO_INDEX,
        distance: -1,
        direction: { x: 0, y: 0, length: 0 }
      };
    }
    const nextPolygon = flow.nextPolygons[polygon] ?? NO_INDEX;
    const arrived = polygon === flow.goalPolygon || nextPolygon === polygon;
    const target = arrived ? flow.goal : this.edgeBetween(polygon, nextPolygon)?.midpoint;
    const direction = target ? directionBetween(point, target) : { x: 0, y: 0, length: 0 };
    return {
      reachable: true,
      arrived,
      polygon,
      nextPolygon,
      target,
      distance: flow.distances[polygon],
      direction: arrived ? { x: 0, y: 0, length: 0 } : direction
    };
  }

  private navMeshResultFrom(
    start: FrontierPathPoint,
    goal: FrontierPathPoint,
    endPolygon: number,
    partial: boolean,
    visited: number,
    expanded: number,
    iterations: number,
    smooth: boolean,
    reason?: FrontierPathfindingNavMeshResult['reason']
  ): FrontierPathfindingNavMeshResult {
    const polygons = this.reconstructPolygons(endPolygon);
    const portals = this.portalsFor(polygons);
    const rawPath = [{ x: start.x, y: start.y }];
    for (let i = 0; i < portals.length; i++) rawPath[rawPath.length] = midpoint(portals[i][0], portals[i][1]);
    if (!partial) rawPath[rawPath.length] = { x: goal.x, y: goal.y };
    const path = smooth ? smoothPointPath(rawPath) : dedupePath(rawPath);
    return {
      found: !partial,
      partial,
      path,
      polygons,
      portals,
      cost: this.distances[endPolygon],
      visited,
      expanded,
      iterations,
      generation: this.generationValue,
      reason
    };
  }

  private reconstructPolygons(index: number): number[] {
    const reversed: number[] = [];
    let current = index;
    while (current !== NO_INDEX) {
      reversed[reversed.length] = current;
      current = this.parent[current];
    }
    reversed.reverse();
    return reversed;
  }

  private portalsFor(polygons: readonly number[]): [FrontierPathPoint, FrontierPathPoint][] {
    const portals: [FrontierPathPoint, FrontierPathPoint][] = [];
    for (let i = 1; i < polygons.length; i++) {
      const edge = this.edgeBetween(polygons[i - 1], polygons[i]);
      if (edge) portals[portals.length] = clonePortal(edge.portal);
    }
    return portals;
  }

  private edgeBetween(from: number, to: number): NavMeshEdge | undefined {
    const edges = this.adjacency[from];
    if (!edges) return undefined;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i].to === to) return edges[i];
    }
    return undefined;
  }

  private navMeshFlowFieldResult(
    goal: FrontierPathPoint,
    goalPolygon: number,
    distances: Float64Array,
    nextPolygons: Int32Array,
    reachable: number
  ): FrontierPathfindingNavMeshFlowField {
    const outDistances = new Array<number>(distances.length);
    for (let i = 0; i < distances.length; i++) outDistances[i] = Number.isFinite(distances[i]) ? distances[i] : -1;
    return {
      kind: 'frontier.pathfinding.navmesh-flow-field',
      version: 1,
      generation: this.generationValue,
      goal: { x: goal.x, y: goal.y },
      goalPolygon,
      distances: outDistances,
      nextPolygons: Array.from(nextPolygons),
      reachable
    };
  }

  private emptyResult(reason: FrontierPathfindingNavMeshResult['reason']): FrontierPathfindingNavMeshResult {
    return {
      found: false,
      partial: false,
      path: [],
      polygons: [],
      portals: [],
      cost: Number.POSITIVE_INFINITY,
      visited: 0,
      expanded: 0,
      iterations: 0,
      generation: this.generationValue,
      reason
    };
  }

  private nextSearchId(): number {
    this.searchId++;
    if (this.searchId >= 0xffffffff) {
      this.searchId = 1;
      this.opened.fill(0);
      this.closed.fill(0);
    }
    return this.searchId;
  }

  private rebuildCaches(): void {
    this.state = normalizeNavMeshSnapshot(this.state);
    const count = this.state.polygons.length;
    this.centroids = new Array<FrontierPathPoint>(count);
    this.bounds = new Array(count);
    for (let i = 0; i < count; i++) {
      const points = this.state.polygons[i].points;
      this.centroids[i] = polygonCentroid(points);
      this.bounds[i] = polygonBounds(points);
    }
    this.locateIndex = buildNavMeshLocateIndex(this.bounds);
    const graph = buildNavMeshAdjacency(this.state, this.centroids);
    this.adjacency = graph.outgoing;
    this.incoming = graph.incoming;
    this.distances = new Float64Array(count);
    this.scores = new Float64Array(count);
    this.parent = new Int32Array(count);
    this.opened = new Uint32Array(count);
    this.closed = new Uint32Array(count);
    this.heap = new BinaryHeap(this.scores, this.distances);
  }
}

class BinaryHeap {
  private nodes: number[] = [];

  constructor(private readonly primary: Float64Array, private readonly tie: Float64Array) {}

  get length(): number {
    return this.nodes.length;
  }

  clear(): void {
    this.nodes.length = 0;
  }

  push(value: number): void {
    const nodes = this.nodes;
    let index = nodes.length;
    nodes[index] = value;
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = nodes[parentIndex];
      if (this.compare(parent, value) <= 0) break;
      nodes[index] = parent;
      index = parentIndex;
    }
    nodes[index] = value;
  }

  pop(): number {
    const nodes = this.nodes;
    if (nodes.length === 0) return NO_INDEX;
    const first = nodes[0];
    const last = nodes.pop() as number;
    if (nodes.length > 0) {
      let index = 0;
      const half = nodes.length >> 1;
      while (index < half) {
        let childIndex = index * 2 + 1;
        let child = nodes[childIndex];
        const rightIndex = childIndex + 1;
        if (rightIndex < nodes.length && this.compare(nodes[rightIndex], child) < 0) {
          childIndex = rightIndex;
          child = nodes[rightIndex];
        }
        if (this.compare(last, child) <= 0) break;
        nodes[index] = child;
        index = childIndex;
      }
      nodes[index] = last;
    }
    return first;
  }

  private compare(left: number, right: number): number {
    const primaryDelta = this.primary[left] - this.primary[right];
    return primaryDelta !== 0 ? primaryDelta : this.tie[left] - this.tie[right];
  }
}

const DIR_X = new Int8Array([1, 0, -1, 0, 1, -1, -1, 1]);
const DIR_Y = new Int8Array([0, 1, 0, -1, 1, 1, -1, -1]);

function normalizeGridSnapshot(input: FrontierPathfindingGridInput, wall = '#'): FrontierPathfindingGridSnapshot {
  if (Array.isArray(input) && typeof input[0] === 'string') {
    return gridFromRows(input as readonly string[], wall, DEFAULT_COST);
  }
  if (isGridSnapshot(input)) {
    const width = Math.max(0, Math.floor(input.width));
    const height = Math.max(0, Math.floor(input.height));
    return {
      kind: FRONTIER_PATHFINDING_GRID_KIND,
      version: FRONTIER_PATHFINDING_GRID_VERSION,
      width,
      height,
      cells: normalizeCells(width, height, input.cells),
      metadata: input.metadata
    };
  }
  const options = input as FrontierPathfindingGridOptions;
  const width = Math.max(0, Math.floor(options.width));
  const height = Math.max(0, Math.floor(options.height));
  const cells = Array.isArray(options.cells) && typeof options.cells[0] === 'string'
    ? rowsToCells(options.cells as readonly string[], wall, options.defaultCost ?? DEFAULT_COST)
    : normalizeCells(width, height, options.cells as readonly number[] | undefined, options.defaultCost ?? DEFAULT_COST);
  if (options.blocked) {
    for (let i = 0; i < options.blocked.length; i++) {
      const index = options.blocked[i];
      if (index >= 0 && index < width * height) cells[index] = BLOCKED;
    }
  }
  return {
    kind: FRONTIER_PATHFINDING_GRID_KIND,
    version: FRONTIER_PATHFINDING_GRID_VERSION,
    width,
    height,
    cells,
    metadata: options.metadata
  };
}

function gridFromRows(rows: readonly string[], wall: string, defaultCost: number): FrontierPathfindingGridSnapshot {
  const width = rows[0]?.length ?? 0;
  return {
    kind: FRONTIER_PATHFINDING_GRID_KIND,
    version: FRONTIER_PATHFINDING_GRID_VERSION,
    width,
    height: rows.length,
    cells: rowsToCells(rows, wall, defaultCost)
  };
}

function rowsToCells(rows: readonly string[], wall: string, defaultCost: number): number[] {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const cells = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < width; x++) {
      const char = row[x] ?? wall;
      cells[cellIndex(width, x, y)] = char === wall ? BLOCKED : charCost(char, defaultCost);
    }
  }
  return cells;
}

function charCost(char: string, defaultCost: number): number {
  if (char >= '1' && char <= '9') return Number(char);
  return normalizeCost(defaultCost);
}

function normalizeCells(width: number, height: number, cells: readonly number[] | undefined, defaultCost = DEFAULT_COST): number[] {
  const size = width * height;
  const out = new Array<number>(size);
  const fallback = normalizeCost(defaultCost);
  for (let i = 0; i < size; i++) out[i] = normalizeCost(cells?.[i] ?? fallback);
  return out;
}

function normalizeCost(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : BLOCKED;
}

function isGridSnapshot(input: FrontierPathfindingGridInput): input is FrontierPathfindingGridSnapshot {
  return !!input && !Array.isArray(input) && (input as FrontierPathfindingGridSnapshot).kind === FRONTIER_PATHFINDING_GRID_KIND;
}

function cloneSnapshot(snapshot: FrontierPathfindingGridSnapshot): FrontierPathfindingGridSnapshot {
  return {
    kind: FRONTIER_PATHFINDING_GRID_KIND,
    version: FRONTIER_PATHFINDING_GRID_VERSION,
    width: snapshot.width,
    height: snapshot.height,
    cells: snapshot.cells.slice(),
    metadata: snapshot.metadata ? { ...snapshot.metadata } : undefined
  };
}

function normalizeNavMeshSnapshot(input: FrontierPathfindingNavMeshInput): FrontierPathfindingNavMeshSnapshot {
  const snapshot = isNavMeshSnapshot(input)
    ? input
    : {
        kind: FRONTIER_PATHFINDING_NAVMESH_KIND,
        version: FRONTIER_PATHFINDING_NAVMESH_VERSION,
        polygons: [...input.polygons],
        connections: input.connections ? [...input.connections] : [],
        metadata: input.metadata
      };
  const polygons = new Array<FrontierPathfindingNavMeshPolygon>(snapshot.polygons.length);
  for (let i = 0; i < snapshot.polygons.length; i++) {
    const polygon = snapshot.polygons[i];
    polygons[i] = {
      id: polygon.id,
      points: normalizePolygonPoints(polygon.points),
      cost: normalizeNavMeshCost(polygon.cost),
      metadata: polygon.metadata ? { ...polygon.metadata } : undefined
    };
  }
  const connections = normalizeNavMeshConnections(polygons, snapshot.connections);
  const autoConnect = isNavMeshSnapshot(input) ? false : input.autoConnect !== false && (connections.length === 0 || input.autoConnect === true);
  if (autoConnect) addAutoNavMeshConnections(polygons, connections);
  return {
    kind: FRONTIER_PATHFINDING_NAVMESH_KIND,
    version: FRONTIER_PATHFINDING_NAVMESH_VERSION,
    polygons,
    connections,
    metadata: snapshot.metadata ? { ...snapshot.metadata } : undefined
  };
}

function isNavMeshSnapshot(input: FrontierPathfindingNavMeshInput): input is FrontierPathfindingNavMeshSnapshot {
  return !!input && (input as FrontierPathfindingNavMeshSnapshot).kind === FRONTIER_PATHFINDING_NAVMESH_KIND;
}

function normalizePolygonPoints(points: readonly FrontierPathPoint[]): FrontierPathPoint[] {
  const out: FrontierPathPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const next = { x: point.x, y: point.y };
    const prev = out[out.length - 1];
    if (!prev || !samePoint(prev, next)) out[out.length] = next;
  }
  if (out.length > 1 && samePoint(out[0], out[out.length - 1])) out.length--;
  return out;
}

function normalizeNavMeshCost(value: number | undefined): number {
  return Number.isFinite(value) && (value as number) > 0 ? value as number : DEFAULT_COST;
}

function normalizeNavMeshConnections(
  polygons: readonly FrontierPathfindingNavMeshPolygon[],
  connections: readonly FrontierPathfindingNavMeshConnection[] | undefined
): FrontierPathfindingNavMeshConnection[] {
  if (!connections || connections.length === 0) return [];
  const out: FrontierPathfindingNavMeshConnection[] = [];
  for (let i = 0; i < connections.length; i++) {
    const connection = connections[i];
    const from = Math.floor(connection.from);
    const to = Math.floor(connection.to);
    if (from < 0 || to < 0 || from >= polygons.length || to >= polygons.length || from === to) continue;
    out[out.length] = {
      from,
      to,
      portal: normalizePortal(connection.portal, polygons[from], polygons[to]),
      cost: normalizeConnectionCost(connection.cost),
      bidirectional: connection.bidirectional,
      metadata: connection.metadata ? { ...connection.metadata } : undefined
    };
  }
  return out;
}

function normalizeConnectionCost(value: number | undefined): number {
  return Number.isFinite(value) && (value as number) > 0 ? value as number : 0;
}

function normalizePortal(
  portal: readonly [FrontierPathPoint, FrontierPathPoint] | undefined,
  from: FrontierPathfindingNavMeshPolygon,
  to: FrontierPathfindingNavMeshPolygon
): [FrontierPathPoint, FrontierPathPoint] {
  if (portal) {
    return [
      { x: portal[0].x, y: portal[0].y },
      { x: portal[1].x, y: portal[1].y }
    ];
  }
  const shared = sharedPortal(from.points, to.points);
  if (shared) return shared;
  return [polygonCentroid(from.points), polygonCentroid(to.points)];
}

function addAutoNavMeshConnections(
  polygons: readonly FrontierPathfindingNavMeshPolygon[],
  connections: FrontierPathfindingNavMeshConnection[]
): void {
  const seen = new Set<string>();
  for (let i = 0; i < connections.length; i++) seen.add(connections[i].from + '>' + connections[i].to);
  for (let from = 0; from < polygons.length; from++) {
    for (let to = from + 1; to < polygons.length; to++) {
      if (seen.has(from + '>' + to) || seen.has(to + '>' + from)) continue;
      const portal = sharedPortal(polygons[from].points, polygons[to].points);
      if (!portal) continue;
      connections[connections.length] = { from, to, portal, cost: 0, bidirectional: true };
      seen.add(from + '>' + to);
      seen.add(to + '>' + from);
    }
  }
}

function buildNavMeshAdjacency(snapshot: FrontierPathfindingNavMeshSnapshot, centroids: readonly FrontierPathPoint[]): NavMeshGraph {
  const outgoing = Array.from({ length: snapshot.polygons.length }, () => [] as NavMeshEdge[]);
  const incoming = Array.from({ length: snapshot.polygons.length }, () => [] as NavMeshIncomingEdge[]);
  const add = (from: number, to: number, portal: [FrontierPathPoint, FrontierPathPoint], cost: number) => {
    const edge: NavMeshEdge = {
      to,
      portal: clonePortal(portal),
      midpoint: midpoint(portal[0], portal[1]),
      cost
    };
    outgoing[from].push(edge);
    incoming[to].push({ from, cost });
  };
  for (let i = 0; i < snapshot.connections.length; i++) {
    const connection = snapshot.connections[i];
    const portal = normalizePortal(connection.portal, snapshot.polygons[connection.from], snapshot.polygons[connection.to]);
    const cost = normalizeConnectionCost(connection.cost);
    add(connection.from, connection.to, portal, cost);
    if (connection.bidirectional !== false) add(connection.to, connection.from, [portal[1], portal[0]], cost);
  }
  for (let i = 0; i < outgoing.length; i++) {
    outgoing[i].sort((left, right) => {
      const leftDistance = distance(centroids[i], centroids[left.to]);
      const rightDistance = distance(centroids[i], centroids[right.to]);
      return leftDistance === rightDistance ? left.to - right.to : leftDistance - rightDistance;
    });
  }
  return { outgoing, incoming };
}

function buildNavMeshLocateIndex(bounds: readonly { minX: number; minY: number; maxX: number; maxY: number }[]): NavMeshLocateIndex {
  if (bounds.length === 0) return emptyLocateIndex();
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < bounds.length; i++) {
    const bound = bounds[i];
    if (bound.minX < minX) minX = bound.minX;
    if (bound.minY < minY) minY = bound.minY;
    if (bound.maxX > maxX) maxX = bound.maxX;
    if (bound.maxY > maxY) maxY = bound.maxY;
  }
  const worldWidth = Math.max(EPSILON, maxX - minX);
  const worldHeight = Math.max(EPSILON, maxY - minY);
  const targetCells = Math.max(1, Math.min(4096, bounds.length * 2));
  const aspect = Math.max(EPSILON, worldWidth / worldHeight);
  const columns = clampInt(Math.ceil(Math.sqrt(targetCells * aspect)), 1, 128);
  const rows = clampInt(Math.ceil(targetCells / columns), 1, 128);
  const cellWidth = Math.max(EPSILON, worldWidth / columns);
  const cellHeight = Math.max(EPSILON, worldHeight / rows);
  const buckets = Array.from({ length: columns * rows }, () => [] as number[]);
  for (let i = 0; i < bounds.length; i++) {
    const bound = bounds[i];
    const minColumn = clampInt(Math.floor((bound.minX - minX) / cellWidth), 0, columns - 1);
    const maxColumn = clampInt(Math.floor((bound.maxX - minX) / cellWidth), 0, columns - 1);
    const minRow = clampInt(Math.floor((bound.minY - minY) / cellHeight), 0, rows - 1);
    const maxRow = clampInt(Math.floor((bound.maxY - minY) / cellHeight), 0, rows - 1);
    for (let row = minRow; row <= maxRow; row++) {
      const rowOffset = row * columns;
      for (let column = minColumn; column <= maxColumn; column++) {
        buckets[rowOffset + column].push(i);
      }
    }
  }
  return { minX, minY, maxX, maxY, columns, rows, cellWidth, cellHeight, buckets };
}

function emptyLocateIndex(): NavMeshLocateIndex {
  return {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    columns: 1,
    rows: 1,
    cellWidth: 1,
    cellHeight: 1,
    buckets: [[]]
  };
}

function cloneNavMeshSnapshot(snapshot: FrontierPathfindingNavMeshSnapshot): FrontierPathfindingNavMeshSnapshot {
  return {
    kind: FRONTIER_PATHFINDING_NAVMESH_KIND,
    version: FRONTIER_PATHFINDING_NAVMESH_VERSION,
    polygons: snapshot.polygons.map((polygon) => ({
      id: polygon.id,
      points: polygon.points.map((point) => ({ x: point.x, y: point.y })),
      cost: polygon.cost,
      metadata: polygon.metadata ? { ...polygon.metadata } : undefined
    })),
    connections: snapshot.connections.map((connection) => ({
      from: connection.from,
      to: connection.to,
      portal: connection.portal ? clonePortal(connection.portal) : undefined,
      cost: connection.cost,
      bidirectional: connection.bidirectional,
      metadata: connection.metadata ? { ...connection.metadata } : undefined
    })),
    metadata: snapshot.metadata ? { ...snapshot.metadata } : undefined
  };
}

function sharedPortal(left: readonly FrontierPathPoint[], right: readonly FrontierPathPoint[]): [FrontierPathPoint, FrontierPathPoint] | undefined {
  for (let li = 0; li < left.length; li++) {
    const la = left[li];
    const lb = left[(li + 1) % left.length];
    for (let ri = 0; ri < right.length; ri++) {
      const ra = right[ri];
      const rb = right[(ri + 1) % right.length];
      if (samePoint(la, rb) && samePoint(lb, ra)) return [{ x: la.x, y: la.y }, { x: lb.x, y: lb.y }];
      if (samePoint(la, ra) && samePoint(lb, rb)) return [{ x: la.x, y: la.y }, { x: lb.x, y: lb.y }];
    }
  }
  return undefined;
}

function clonePortal(portal: readonly [FrontierPathPoint, FrontierPathPoint]): [FrontierPathPoint, FrontierPathPoint] {
  return [
    { x: portal[0].x, y: portal[0].y },
    { x: portal[1].x, y: portal[1].y }
  ];
}

function polygonCentroid(points: readonly FrontierPathPoint[]): FrontierPathPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    area += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }
  if (Math.abs(area) <= EPSILON) {
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < points.length; i++) {
      sx += points[i].x;
      sy += points[i].y;
    }
    return { x: sx / points.length, y: sy / points.length };
  }
  const scale = 1 / (3 * area);
  return { x: cx * scale, y: cy * scale };
}

function polygonBounds(points: readonly FrontierPathPoint[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

function pointInPolygon(point: FrontierPathPoint, polygon: readonly FrontierPathPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (pointOnSegment(point, pj, pi)) return true;
    const intersects = (pi.y > point.y) !== (pj.y > point.y) &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointOnSegment(point: FrontierPathPoint, a: FrontierPathPoint, b: FrontierPathPoint): boolean {
  const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > EPSILON) return false;
  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
  if (dot < -EPSILON) return false;
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= lenSq + EPSILON;
}

function smoothPointPath(path: readonly FrontierPathPoint[]): FrontierPathPoint[] {
  const deduped = dedupePath(path);
  if (deduped.length <= 2) return deduped;
  const out = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    if (!collinear(out[out.length - 1], deduped[i], deduped[i + 1])) out[out.length] = deduped[i];
  }
  out[out.length] = deduped[deduped.length - 1];
  return out;
}

function dedupePath(path: readonly FrontierPathPoint[]): FrontierPathPoint[] {
  const out: FrontierPathPoint[] = [];
  for (let i = 0; i < path.length; i++) {
    const point = path[i];
    const prev = out[out.length - 1];
    if (!prev || !samePoint(prev, point)) out[out.length] = { x: point.x, y: point.y };
  }
  return out;
}

function collinear(a: FrontierPathPoint, b: FrontierPathPoint, c: FrontierPathPoint): boolean {
  return Math.abs((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)) <= EPSILON;
}

function samePoint(left: FrontierPathPoint, right: FrontierPathPoint): boolean {
  return Math.abs(left.x - right.x) <= EPSILON && Math.abs(left.y - right.y) <= EPSILON;
}

function midpoint(left: FrontierPathPoint, right: FrontierPathPoint): FrontierPathPoint {
  return { x: (left.x + right.x) * 0.5, y: (left.y + right.y) * 0.5 };
}

function distance(left: FrontierPathPoint, right: FrontierPathPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function directionBetween(from: FrontierPathPoint, to: FrontierPathPoint): FrontierPathVector {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= EPSILON) return { x: 0, y: 0, length: 0 };
  return { x: dx / length, y: dy / length, length };
}

function clampInt(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function heuristicForDiagonal(diagonal: FrontierPathfindingDiagonalMode): FrontierPathfindingHeuristic {
  return diagonal === 'never' ? 'manhattan' : 'octile';
}

function selectHeuristic(heuristic: FrontierPathfindingHeuristic): (x: number, y: number, goalX: number, goalY: number) => number {
  if (heuristic === 'zero') return () => 0;
  if (heuristic === 'euclidean') return (x, y, goalX, goalY) => Math.hypot(goalX - x, goalY - y);
  if (heuristic === 'chebyshev') return (x, y, goalX, goalY) => Math.max(Math.abs(goalX - x), Math.abs(goalY - y));
  if (heuristic === 'octile') {
    return (x, y, goalX, goalY) => {
      const dx = Math.abs(goalX - x);
      const dy = Math.abs(goalY - y);
      return dx < dy ? SQRT2 * dx + (dy - dx) : SQRT2 * dy + (dx - dy);
    };
  }
  return (x, y, goalX, goalY) => Math.abs(goalX - x) + Math.abs(goalY - y);
}
