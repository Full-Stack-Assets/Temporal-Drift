# Living Timeline Kernel — UE 5.8 Acceptance Runbook

## Scope

This runbook verifies the first deterministic Living Timeline increment on branch:

```text
feature/living-timeline-kernel
```

The vertical slice is the Clock Tower Disturbance transaction:

```text
typed primary mutations
→ deterministic rule settling
→ fixed-point stability
→ authored Local Power Outage selection
→ persistent commands and news
→ save snapshot and hashes
```

## Module-release gate

Before building, close or stop:

- Unreal Editor
- UnrealEditor-Cmd
- Live Coding Console
- any active Unreal Build Tool process
- PIE, standalone game, cook, or package processes

Do not use Live Coding for the reflected `USTRUCT`, `UCLASS`, `UENUM`, or save-schema changes in this branch.

## Shadow / Codex commands

From the Temporal-Drift repository root in PowerShell:

```powershell
git fetch origin
git switch feature/living-timeline-kernel
git pull --ff-only origin feature/living-timeline-kernel
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\verify_living_timeline.ps1
```

The verifier runs:

1. UE 5.8 Development Editor build
2. `BTTF.TemporalKernel` automation tests
3. existing `BTTF.Timeline` regression tests
4. existing `BTTF.Save` regression tests

After the focused suite succeeds, run the complete suite and Development package smoke test:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\verify_living_timeline.ps1 -RunFullSuite -PackageDevelopment
```

## Required automation coverage

The focused suite must include successful results for:

```text
BTTF.TemporalKernel.TypedValues
BTTF.TemporalKernel.ClockTower.TransactionalLoop
BTTF.TemporalKernel.Determinism.RepeatedScenario
BTTF.TemporalKernel.Transactions.DerivedFactProtection
BTTF.TemporalKernel.Rules.CycleRollback
BTTF.TemporalKernel.Persistence.SaveRoundTrip
BTTF.TemporalKernel.Commands.IdempotentAcknowledgement
BTTF.TemporalKernel.Adapters.ConsumerIdempotency
BTTF.Save.TemporalKernelSnapshot
BTTF.Save.SchemaAndMigration
```

## Clock Tower acceptance values

After `FClockTowerScenario::SubmitDisturbance`:

```text
ClockTower.ElectricalStress = 850
ClockTower.AnomalyActive = true
HillValley.PowerGrid.Stress = 720
HillValley.PowerGrid.AtRisk = true
HillValley.PowerGrid.Online = false
Timeline.TemporalStress = 200
Timeline.Stability = 760
Timeline.StabilityBand = Drift
Event.HillValley.LocalPowerOutage.Active = true
```

The final score is `760`, not `800`, because the event is selected at the pre-event score of `800`, then the active-outage cost is included in the final committed stability calculation.

Expected persistent output:

```text
1 event instance
5 simulation commands
1 news publication
non-zero SimulationTruthHash
non-zero FullPersistenceHash
```

## Failure classification

### UHT or compile failure

Fix the first compiler error only, rebuild, and repeat. Do not redesign public interfaces unless the error proves a UE 5.8 reflection incompatibility.

Likely areas to inspect first:

- reflected container/property support in `TemporalKernelTypes.h`
- dynamic multicast delegate parameter declarations
- subsystem includes and export macros
- `UTickableWorldSubsystem` overrides
- automation-test type formatting

### Determinism failure

Compare:

- selected event ID
- generated command/news IDs
- fact revisions
- simulation tick
- sorted canonical facts
- simulation truth hash
- full persistence hash

Do not patch a failed determinism test by weakening equality assertions.

### Save hash mismatch

Confirm definitions were installed before importing `FTemporalKernelSaveData`. Legacy timeline definitions must not issue compatibility mutations while the imported snapshot is being reconstructed.

### World adapter duplicate

Confirm the consumer has a stable `ConsumerId`, matching `SupportedCommandTypes`, and matching `SupportedTargets`. A command must be acknowledged only once by its intended target.

## Manual PIE check

After automated verification:

1. Open `/Game/Levels/LVL_TimeTravelTest`.
2. Confirm the Clock Tower scenario definitions are installed at GameInstance bootstrap.
3. Trigger the temporal-component activation path or invoke the scenario transaction from a development-only test hook.
4. Observe the Local Power Outage command records and news publication through the Temporal Kernel debug APIs.
5. Save during the outage.
6. Reload the save.
7. Confirm no second outage event, duplicate commands, or duplicate news publication appears.
8. Stream downtown out and back in; confirm simulation truth and hashes remain unchanged.

## Evidence to preserve

Keep these files from the verification run:

```text
Saved/Logs/BTTF_Automation.log
Saved/Logs/*.log
packaging output log
Development package smoke-test output
```

Do not mark the milestone accepted until the UE 5.8 editor build, focused tests, full `BTTF` suite, and Development package smoke test all report success.
