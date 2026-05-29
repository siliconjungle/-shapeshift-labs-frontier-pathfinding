# @shapeshift-labs/frontier-pathfinding

Patch-native pathfinding primitives for Frontier game, scene, automation, and AI stacks. The package stores navigation state as JSON, accepts Frontier patch tuples for mutation, and keeps hot grid/navmesh search state in typed-array caches.

- npm: [`@shapeshift-labs/frontier-pathfinding`](https://www.npmjs.com/package/@shapeshift-labs/frontier-pathfinding)
- source: [`siliconjungle/-shapeshift-labs-frontier-pathfinding`](https://github.com/siliconjungle/-shapeshift-labs-frontier-pathfinding)

## API Shape

```ts
import {
  createFlowFieldCache,
  createGridPathfinder,
  createNavMeshPathfinder,
  gridFromStrings,
  navMeshFromPolygons,
  schedulePathfind,
  steerAgentsWithFlowField,
  steerAgentsWithNavMeshFlowField,
  setCellPatch
} from '@shapeshift-labs/frontier-pathfinding';

const nav = createGridPathfinder(gridFromStrings([
  '..........',
  '..###.....',
  '..#.......',
  '..#..###..',
  '..........'
]));

const path = nav.findPath(
  { x: 0, y: 0 },
  { x: 9, y: 4 },
  { diagonal: 'ifNoObstacles', smooth: true }
);

nav.commit(setCellPatch(nav.width, 4, 2, 0), {
  origin: { actionId: 'terrain.block', causeId: 'door.closed' }
});

const flow = nav.flowField({ x: 9, y: 4 });
const flowCache = createFlowFieldCache(nav, { capacity: 8 });
const cachedFlow = flowCache.get({ x: 9, y: 4 }, { diagonal: 'ifNoObstacles' });
const nextAgents = steerAgentsWithFlowField(cachedFlow, [
  { id: 'npc:1', x: 0, y: 0, speed: 1 },
  { id: 'npc:2', x: 2, y: 4, speed: 1 }
]);
const components = nav.connectedComponents();

const navMesh = createNavMeshPathfinder(navMeshFromPolygons([
  { id: 'room-a', points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }] },
  { id: 'room-b', points: [{ x: 4, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 4 }, { x: 4, y: 4 }] }
]));

const meshPath = navMesh.findPath({ x: 1, y: 1 }, { x: 7, y: 1 });
const meshFlow = navMesh.flowField({ x: 7, y: 1 });
const nextMeshAgents = steerAgentsWithNavMeshFlowField(navMesh, meshFlow, [
  { id: 'npc:3', x: 1, y: 1, speed: 1 }
]);

schedulePathfind(scheduler, nav, {
  start: { x: 0, y: 0 },
  goal: { x: 9, y: 4 },
  diagonal: 'never'
});
```

## Design Notes

`frontier-pathfinding` deliberately does not own a renderer, game loop, scene graph, or scheduler. DOM, Canvas, WebGL, WebGPU, Playwright agents, and game engines can all consume the same serialized grid snapshot and patch stream.

The internal model follows the rest of Frontier:

- JSON snapshot is the durable navigation state.
- Frontier patch tuples are the mutation format.
- Cell-cost changes update typed caches by exact dirty cell index.
- A* and Dijkstra-style search share a reusable typed-array search context.
- Diagonal movement follows PathFinding.js-style policies: `never`, `always`, `ifNoObstacles`, and `onlyWhenNoObstacles`.
- Flow fields provide one-to-many navigation for groups of agents.
- Flow-field caches reuse a single goal field across large agent batches until the grid generation changes.
- Navmesh snapshots are serializable polygon graphs with explicit or shared-edge auto connections.
- Navmesh search, navmesh flow fields, and batched navmesh steering use the same JSON-friendly point/path payloads as grids.
- Navmesh point location is bucket-indexed so many agents can sample a flow field without scanning every polygon.
- Connected components expose cheap reachability regions for AI/game code.
- Line-of-sight smoothing gives a Theta*-style post-process without making any-angle search the only mode.
- Scheduler integration is structural, so `frontier-scheduler` can queue path work without becoming a dependency.
- Snapshots, flow fields, components, paths, patches, and commit origins are JSON-shaped for replay, logging, persistence, and AI inspection.

## Related Packages

The published Frontier package family is generated from one shared package catalog so READMEs stay in sync across packages:

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): Core JSON diff/apply, compact patch tuples, JSON Pointer, equality, clone, validation, Unicode helpers, and tiny dependency-free runtime budget/scheduler primitives.
- [`@shapeshift-labs/frontier-query`](https://www.npmjs.com/package/@shapeshift-labs/frontier-query): Shared query-key, selector path, condition, entity identity, and table-shape primitives.
- [`@shapeshift-labs/frontier-codec`](https://www.npmjs.com/package/@shapeshift-labs/frontier-codec): Patch serialization, binary frames, canonical JSON, and patch-history codecs.
- [`@shapeshift-labs/frontier-engine`](https://www.npmjs.com/package/@shapeshift-labs/frontier-engine): Stateful planned diff engine, adaptive profiles, schema plans, and engine-level history helpers.
- [`@shapeshift-labs/frontier-state`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state): Patch-routed app-state subscriptions, owned commits, maintained views, and path mapping.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): Normalized query-result cache with entity/query watchers, persistence, change logs, optimistic layers, scheduled persistence, and mutation bridge.
- [`@shapeshift-labs/frontier-state-cache-idb`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-idb): IndexedDB persistence adapter for Frontier state-cache snapshots and durable change logs.
- [`@shapeshift-labs/frontier-state-cache-file`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-file): Structured file persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-state-cache-sql`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-sql): SQL persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-schema`](https://www.npmjs.com/package/@shapeshift-labs/frontier-schema): JSON Schema validation, Frontier profile generation, CloudEvent envelopes, and query/table schema helpers.
- [`@shapeshift-labs/frontier-event-log`](https://www.npmjs.com/package/@shapeshift-labs/frontier-event-log): Bounded event logs, replay cursors, consumer acknowledgements, keyed compaction, checkpoints, and Frontier patch event records.
- [`@shapeshift-labs/frontier-scheduler`](https://www.npmjs.com/package/@shapeshift-labs/frontier-scheduler): Deterministic work scheduling, lanes, cancellation, backpressure, frame policies, replay snapshots, and work graphs.
- [`@shapeshift-labs/frontier-logging`](https://www.npmjs.com/package/@shapeshift-labs/frontier-logging): Opt-in structured logging, browser telemetry, scheduled sinks, file sinks, exporters, benchmark traces, and Frontier patch/update summaries.
- [`@shapeshift-labs/frontier-mutation`](https://www.npmjs.com/package/@shapeshift-labs/frontier-mutation): Explicit mutation and selector plans compiled to Frontier patches or CRDT operations.
- [`@shapeshift-labs/frontier-virtual`](https://www.npmjs.com/package/@shapeshift-labs/frontier-virtual): DOM-neutral virtualization, layout providers, range materialization, grids, spatial/frustum indexes, patch invalidation, camera anchors, and serializable layout state.
- [`@shapeshift-labs/frontier-scene`](https://www.npmjs.com/package/@shapeshift-labs/frontier-scene): Patch-native 2D/3D scene graph, transform propagation, bounds queries, virtual/culling adapters, spatial invalidation, and camera/frustum materialization.
- [`@shapeshift-labs/frontier-dom`](https://www.npmjs.com/package/@shapeshift-labs/frontier-dom): Patch-native DOM and host renderer bindings, manifest hydration, JSX runtime/compiler helpers, SSR, devtools, and logging bridges.
- [`@shapeshift-labs/frontier-playwright`](https://www.npmjs.com/package/@shapeshift-labs/frontier-playwright): Playwright/headless automation probes for Frontier state, DOM, devtools, marks, and timeline queries.
- [`@shapeshift-labs/frontier-crdt`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt): Native CRDT documents, update tooling, awareness, branches, conflict introspection, version frames, and undo.
- [`@shapeshift-labs/frontier-crdt-sync`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-sync): CRDT sync endpoints, repo/storage/provider contracts, scheduled sync work, document URLs, local networks, model checking, forensics, and text binding contracts.
- [`@shapeshift-labs/frontier-crdt-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-websocket): WebSocket client/server transports for Frontier CRDT sync providers.
- [`@shapeshift-labs/frontier-react`](https://www.npmjs.com/package/@shapeshift-labs/frontier-react): React external-store hooks and adapters for Frontier state, cache, and CRDT surfaces.
- [`@shapeshift-labs/frontier-richtext`](https://www.npmjs.com/package/@shapeshift-labs/frontier-richtext): Rich text Delta normalization/application, marks, embeds, ranges, and cursor/selection transforms for local editor integrations.
- [`@shapeshift-labs/frontier-realtime`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime): Shared realtime command, tick, snapshot, prediction, reconciliation, interpolation, rollback, message, and delta primitives.
- [`@shapeshift-labs/frontier-realtime-server`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-server): Authoritative realtime room, tick, command validation, rate-limit, session, and snapshot-history runtime.
- [`@shapeshift-labs/frontier-realtime-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-websocket): WebSocket client, wire, and Node room-server transport for Frontier realtime.
- [`@shapeshift-labs/frontier-game`](https://www.npmjs.com/package/@shapeshift-labs/frontier-game): Game-facing entity, component, player, room, ownership, spatial interest, rollback, physics, and replication helpers above realtime.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-query`](https://github.com/siliconjungle/-shapeshift-labs-frontier-query)
- [`siliconjungle/-shapeshift-labs-frontier-codec`](https://github.com/siliconjungle/-shapeshift-labs-frontier-codec)
- [`siliconjungle/-shapeshift-labs-frontier-engine`](https://github.com/siliconjungle/-shapeshift-labs-frontier-engine)
- [`siliconjungle/-shapeshift-labs-frontier-state`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-file`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-file)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-sql`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-sql)
- [`siliconjungle/-shapeshift-labs-frontier-schema`](https://github.com/siliconjungle/-shapeshift-labs-frontier-schema)
- [`siliconjungle/-shapeshift-labs-frontier-event-log`](https://github.com/siliconjungle/-shapeshift-labs-frontier-event-log)
- [`siliconjungle/-shapeshift-labs-frontier-scheduler`](https://github.com/siliconjungle/-shapeshift-labs-frontier-scheduler)
- [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)
- [`siliconjungle/-shapeshift-labs-frontier-mutation`](https://github.com/siliconjungle/-shapeshift-labs-frontier-mutation)
- [`siliconjungle/-shapeshift-labs-frontier-virtual`](https://github.com/siliconjungle/-shapeshift-labs-frontier-virtual)
- [`siliconjungle/-shapeshift-labs-frontier-scene`](https://github.com/siliconjungle/-shapeshift-labs-frontier-scene)
- [`siliconjungle/-shapeshift-labs-frontier-pathfinding`](https://github.com/siliconjungle/-shapeshift-labs-frontier-pathfinding)
- [`siliconjungle/-shapeshift-labs-frontier-dom`](https://github.com/siliconjungle/-shapeshift-labs-frontier-dom)
- [`siliconjungle/-shapeshift-labs-frontier-playwright`](https://github.com/siliconjungle/-shapeshift-labs-frontier-playwright)
- [`siliconjungle/-shapeshift-labs-frontier-crdt`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-sync`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-sync)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-react`](https://github.com/siliconjungle/-shapeshift-labs-frontier-react)
- [`siliconjungle/-shapeshift-labs-frontier-richtext`](https://github.com/siliconjungle/-shapeshift-labs-frontier-richtext)
- [`siliconjungle/-shapeshift-labs-frontier-realtime`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-server`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-server)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-game`](https://github.com/siliconjungle/-shapeshift-labs-frontier-game)

## Install

```sh
npm install @shapeshift-labs/frontier-pathfinding
```

## Benchmarks

These are Frontier-only package measurements, not competitor comparisons.

Run package-local measurements:

```sh
npm run bench
```

The benchmark covers A*, smoothed A*, zero-heuristic Dijkstra-style search, flow-field generation/cache hits/batched steering, navmesh path/flow/steering, and patch-routed cell updates over synthetic fixtures.

Latest local package benchmark on Node v26.1.0, darwin arm64, 96x96 grid and 40 rounds:

| Fixture | Median | p95 |
| --- | ---: | ---: |
| `astar-grid-96x96` | 254.25 us | 1.05 ms |
| `astar-smooth-96x96` | 242.08 us | 1.11 ms |
| `dijkstra-zero-heuristic-96x96` | 1.08 ms | 2.23 ms |
| `flow-field-96x96` | 970.37 us | 1.31 ms |
| `flow-field-cache-hit-96x96` | 0.54 us | 2.54 us |
| `flow-field-steer-5000` | 220.46 us | 436.13 us |
| `navmesh-path-256` | 46.42 us | 217.13 us |
| `navmesh-flow-field-256` | 7.58 us | 59.96 us |
| `navmesh-steer-5000` | 691.75 us | 1.22 ms |
| `patch-cell-update-96x96` | 0.63 us | 14.71 us |
