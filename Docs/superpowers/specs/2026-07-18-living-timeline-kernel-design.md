# Living Timeline Kernel Design

**Status:** Approved and authoritative  
**Date:** 2026-07-18  
**Target:** `BTTF_TemporalDrift` Unreal Engine 5.8 runtime module

## Objective

Replace the Boolean-only timeline authority with a thin deterministic simulation kernel while preserving the existing `UTimelineFactSubsystem` API as a compatibility facade. The first playable increment is the Clock Tower Disturbance transactional loop:

`typed fact mutation -> deterministic rule settling -> fixed-point stability -> authored event selection -> persistent commands/news -> adapters -> save/load -> identical state hash`

## Production constraints

- Unreal Engine 5.8, Windows-first project.
- The kernel is a `UGameInstanceSubsystem` and survives world/era transitions.
- World-facing consumers remain adapters and never own canonical simulation truth.
- Existing mission/content calls to `UTimelineFactSubsystem::SetBaseFact`, `GetFact`, and override snapshots continue working.
- Canonical numeric simulation uses integers/fixed point; presentation may convert to floats.
- Stable ordering must not depend on `TMap`/`TSet` iteration, actor load order, frame rate, or asynchronous completion order.
- Transactions are atomic: either the entire settled result commits or the previous state remains unchanged.
- Save/load may restore presentation bookkeeping, but event selection is never rerolled merely because a world streams or reloads.

## Architecture

### `UTemporalKernelSubsystem`

Owns:

- typed fact registry and revisions
- primary/derived fact ownership
- atomic transactions and provenance
- deterministic consequence rules
- contradiction records
- fixed-point temporal stability
- authored event evaluation and instances
- persistent simulation commands
- persistent news publications
- simulation tick and timeline seed
- canonical state hashing
- save snapshot import/export
- transaction/replay diagnostics

### `UTimelineFactSubsystem`

Remains the public compatibility API for existing Boolean content. It translates Boolean definitions and overrides into kernel rules/transactions, mirrors kernel Boolean changes to `OnFactChanged`, and exposes legacy snapshots.

### `UTemporalWorldAdapterSubsystem`

A `UWorldSubsystem` that polls pending commands for loaded-world consumer types and acknowledges idempotent application. It does not change facts directly.

### Existing systems

- Missions submit fact mutations and consume mission opportunity commands.
- Population consumes district behavior modifiers.
- Weather consumes localized electrical disturbance commands.
- Audio consumes radio bulletin commands.
- World consequence/UI systems read facts/news and represent them.
- Save infrastructure serializes `FTemporalKernelSaveData` without interpreting it.

## Typed values

`FTemporalValue` supports:

- `None`
- `Boolean`
- `Integer`
- `FixedPoint`
- `Name`
- `SimulationTick`

Every fact has a stable `FName` ID, value type, revision, last-modified tick, source, transaction ID, derived flag, and owning rule ID.

## Transactions

A transaction request contains a stable source and ordered primary mutations. Processing occurs against a working copy:

1. validate and normalize mutations
2. apply primary mutations
3. settle affected rules in phase/priority/ID order
4. detect contradictions
5. recalculate stability
6. evaluate events
7. apply event fact mutations
8. settle/recalculate once more if event mutations changed facts
9. emit commands/news
10. calculate hashes
11. commit atomically

Cycles or iteration-limit failures abort without publishing output.

## Rules

Rules are data structures containing:

- stable rule ID
- evaluation phase
- priority
- typed conditions
- typed output mutations
- explicit output ownership

The first implementation supports equality and fixed-point/integer comparison conditions. A dirty-rule queue is generated from a fact-to-rule dependency index. Rule output that equals the current value does not create a new revision.

## Stability

Stability is an inspectable `0..1000` fixed-point score:

- baseline `1000`
- active Clock Tower anomaly `-80`
- power grid at risk `-70`
- temporal stress cost derived from fixed-point stress
- active outage `-40`
- repair credit when authored repair facts are active

Bands:

- `850..1000 Stable`
- `650..849 Drift`
- `400..649 Unstable`
- `150..399 Critical`
- `0..149 Collapse`

The score and band are derived kernel facts and cannot be directly mutated by adapters.

## Event director

Events are authored and selected deterministically by highest priority, then lexical event ID. The first catalog contains:

1. `Event.HillValley.LocalPowerOutage` priority 100
2. `Event.ClockTower.ElectricalSurge` priority 80
3. `Event.Public.AnomalyRumor` priority 30

Event instances persist their triggering transaction, start/end tick, occurrence index, generated commands, and generated news IDs. Cooldowns and occurrence limits are stored in kernel state.

## Commands and news

Commands are durable, idempotent records. Their stable key is based on transaction, event instance, command type, target, and authored index. Delivery state is separate from simulation truth.

News publications are authoritative records with independent delivery states for radio, newspaper, public notice, mission journal, and debugger channels. A missing or streamed-out presentation actor leaves the record pending.

## Hashing

Two deterministic 64-bit FNV-1a hashes are produced from canonical sorted serialization:

- `SimulationTruthHash`: schema, tick, seed, facts, contradictions, stability, active event instances
- `FullPersistenceHash`: truth state plus commands, acknowledgements, news, cooldowns, and occurrence counters

No UObject address, localized text, world actor state, or unordered container iteration participates.

## Save integration

`UBTTF_SaveGame::LatestSchemaVersion` advances and adds `FTemporalKernelSaveData`. Load imports and migrates the kernel snapshot, recalculates derived facts in validation mode, compares hashes, then exposes pending commands to world adapters. Legacy `TimelineFactOverrides` remains for backward compatibility and is applied only when a kernel snapshot is absent.

## Clock Tower Disturbance vertical slice

Initial facts:

- `ClockTower.ElectricalStress = 200`
- `ClockTower.AnomalyActive = false`
- `HillValley.PowerGrid.Stress = 200`
- `HillValley.PowerGrid.AtRisk = false`
- `HillValley.PowerGrid.Online = true`
- `Timeline.TemporalStress = 100`
- `Timeline.Stability = 920`
- `Event.HillValley.LocalPowerOutage.Active = false`

Gameplay submits:

- `ClockTower.ElectricalStress = 850`
- `Timeline.TemporalStress += 100`

Rules derive anomaly and grid risk, stability becomes `800 / Drift`, and the Local Power Outage event wins. It sets the grid offline and outage active, then emits world, weather, population, mission, audio, and news output.

## Acceptance criteria

- Same input state and transaction produce identical facts, rule trace, stability, event, commands, news, and hashes.
- Continuous execution and save/reload/continue produce identical simulation truth.
- World Partition streaming state cannot change event selection or truth hashes.
- Duplicate command delivery is idempotent.
- External mutation of stability or another derived fact is rejected.
- Cycle detection aborts atomically.
- Legacy Boolean timeline calls remain functional.
- The full causal chain is available through transaction diagnostics.
