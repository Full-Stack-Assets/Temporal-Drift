# Living Timeline Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the UE 5.8 deterministic Living Timeline kernel and prove the Clock Tower Disturbance transaction loop while preserving existing timeline-content compatibility.

**Architecture:** Add a persistent `UTemporalKernelSubsystem` with typed facts, atomic transactions, deterministic rules, fixed-point stability, authored event selection, durable commands/news, save snapshots, and canonical hashing. Keep `UTimelineFactSubsystem` as a Boolean compatibility facade and add a world adapter subsystem that consumes commands without owning truth.

**Tech Stack:** Unreal Engine 5.8, C++20-compatible UE runtime code, GameInstanceSubsystem, WorldSubsystem, UObject reflection/serialization, Unreal Automation Tests, existing PowerShell build pipeline.

## Global Constraints

- Target Unreal Engine exactly 5.8.
- Do not depend on frame rate, actor load order, `TMap` iteration order, or asynchronous completion order.
- External systems may only change authoritative truth through transactions.
- Derived facts have explicit ownership and reject direct external mutation.
- Transactions commit atomically or not at all.
- Existing `UTimelineFactSubsystem` Boolean API remains compatible.
- Save/load must not reroll events or duplicate durable output.
- Cloud editing cannot prove compilation; final acceptance requires the Windows UE 5.8 build and `BTTF.TemporalKernel` automation suite.

---

### Task 1: Kernel contracts and failing automation tests

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/TemporalKernel/TemporalKernelTypes.h`
- Create: `Source/BTTF_TemporalDrift/Public/TemporalKernel/TemporalKernelSubsystem.h`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/TemporalKernelTests.cpp`

**Interfaces:**
- Produces: `FTemporalValue`, `FTemporalMutation`, `FTemporalRuleDefinition`, `FTemporalEventDefinition`, `FSimulationCommandRecord`, `FTemporalNewsPublication`, `FTemporalKernelSaveData`, `UTemporalKernelSubsystem`.

- [ ] Write automation tests for typed values, derived-fact rejection, rule settling, cycle rollback, stability, deterministic event selection, command idempotency, hash repeatability, and Clock Tower scenario.
- [ ] Run `Scripts/Build/build_editor.ps1`; expected initial result is compile failure because production methods are not implemented.
- [ ] Commit tests and public contracts.

### Task 2: Atomic typed fact transactions and rule settling

**Files:**
- Create: `Source/BTTF_TemporalDrift/Private/TemporalKernel/TemporalKernelSubsystem.cpp`

**Interfaces:**
- Consumes: contracts from Task 1.
- Produces: `SubmitTransaction`, `TryGetFact`, `RegisterFact`, `RegisterRule`, `ResetKernel`, transaction trace and state hashes.

- [ ] Implement type-safe mutation validation and canonical stable ordering.
- [ ] Implement isolated working-state transactions.
- [ ] Implement dirty-rule dependency indexing, stable phase/priority/ID order, output ownership, fixed iteration limit, and rollback on cycles.
- [ ] Run `BTTF.TemporalKernel.Transaction` and `BTTF.TemporalKernel.Rules` tests.
- [ ] Commit transaction kernel.

### Task 3: Stability, event director, commands, news, hashing

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Private/TemporalKernel/TemporalKernelSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/TemporalKernelTests.cpp`

**Interfaces:**
- Produces: fixed-point `Timeline.Stability`, deterministic event instances, durable commands/news, `SimulationTruthHash`, `FullPersistenceHash`.

- [ ] Implement inspectable stability inputs and bands.
- [ ] Implement event eligibility and lexical tie-breaking after priority.
- [ ] Implement deterministic command/news IDs and acknowledgement states.
- [ ] Implement FNV-1a canonical sorted hashing.
- [ ] Run stability/event/hash tests.
- [ ] Commit simulation outputs.

### Task 4: Clock Tower Disturbance authored package

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/TemporalKernel/ClockTowerScenario.h`
- Create: `Source/BTTF_TemporalDrift/Private/TemporalKernel/ClockTowerScenario.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/TemporalKernelTests.cpp`

**Interfaces:**
- Produces: `FClockTowerScenario::Install` and `FClockTowerScenario::SubmitDisturbance`.

- [ ] Register initial typed facts.
- [ ] Register anomaly/grid-risk consequence rules.
- [ ] Register three authored event definitions.
- [ ] Submit the gameplay transaction and verify Local Power Outage selection.
- [ ] Verify save snapshot/reload preserves hashes and does not duplicate output.
- [ ] Commit vertical slice.

### Task 5: Legacy timeline compatibility facade

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Public/TimelineFactSubsystem.h`
- Modify: `Source/BTTF_TemporalDrift/Private/TimelineFactSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/TimelineFactSubsystemTests.cpp`

**Interfaces:**
- `SetBaseFact` becomes a kernel transaction.
- `GetFact` reads the kernel Boolean fact.
- Existing delegates and override snapshots remain compatible.

- [ ] Add test proving existing Boolean definitions settle through the kernel.
- [ ] Translate loaded definitions into kernel facts/rules.
- [ ] Mirror kernel changes to the existing delegate.
- [ ] Preserve dynamic facts and override restore.
- [ ] Run existing timeline tests plus new compatibility test.
- [ ] Commit facade migration.

### Task 6: World adapter subsystem

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/TemporalKernel/TemporalWorldAdapterSubsystem.h`
- Create: `Source/BTTF_TemporalDrift/Private/TemporalKernel/TemporalWorldAdapterSubsystem.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/TemporalWorldAdapterTests.cpp`

**Interfaces:**
- Produces: consumer registration, command polling, idempotent acknowledgement, unload-safe pending state.

- [ ] Write adapter delivery and duplicate-delivery tests.
- [ ] Implement consumer registration and deterministic command dispatch.
- [ ] Confirm missing consumers leave commands pending.
- [ ] Commit adapter layer.

### Task 7: Save schema and game-instance integration

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Public/BTTF_SaveGame.h`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTF_SaveGame.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTF_GameInstance.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/SaveGameTests.cpp`

**Interfaces:**
- `UBTTF_SaveGame` schema version 4 contains `FTemporalKernelSaveData`.
- Game instance exports kernel state before save and imports it before restoring legacy facts.

- [ ] Add schema migration test from v3 to v4.
- [ ] Add kernel save round-trip test.
- [ ] Implement snapshot export/import.
- [ ] Use legacy Boolean overrides only when no kernel snapshot exists.
- [ ] Commit persistence integration.

### Task 8: Debug/diagnostic API and build verification

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Public/TemporalKernel/TemporalKernelSubsystem.h`
- Modify: `Source/BTTF_TemporalDrift/Private/TemporalKernel/TemporalKernelSubsystem.cpp`
- Create: `Docs/QA/LivingTimelineKernelAcceptance.md`
- Modify: `Scripts/Build/run_automation.ps1` only if existing filter handling cannot target `BTTF.TemporalKernel`.

**Interfaces:**
- Produces fact snapshot, last transaction trace, candidate rejection reasons, pending commands/news, hash validation report.

- [ ] Add diagnostic snapshot APIs.
- [ ] Document exact UE 5.8 build/automation/playtest commands.
- [ ] Run editor build, `BTTF.TemporalKernel`, existing `BTTF.TimelineFacts`, save tests, and full `BTTF` suite.
- [ ] Package Development build and run smoke test.
- [ ] Compare branch against main and create a draft PR only after fresh verification evidence exists.
