import { applyPatch } from '@shapeshift-labs/frontier';
import type { JsonValue, Patch } from '@shapeshift-labs/frontier';

export const FRONTIER_PATHFINDING_GRID_KIND = 'frontier.pathfinding.grid';
export const FRONTIER_PATHFINDING_GRID_VERSION = 1;

const SQRT2 = Math.SQRT2;
const NO_INDEX = -1;
const BLOCKED = 0;
const DEFAULT_COST = 1;

export type FrontierPathfindingCellCost = number;
export type FrontierPathfindingDiagonalMode = 'never' | 'always' | 'ifNoObstacles' | 'onlyWhenNoObstacles';
export type FrontierPathfindingHeuristic = 'manhattan' | 'octile' | 'euclidean' | 'chebyshev' | 'zero';

export interface FrontierPathPoint {
  x: number;
  y: number;
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
