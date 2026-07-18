# Codex Task — Complete and Verify the Living Timeline Kernel

You are working in the Unreal Engine 5.8 project:

```text
Full-Stack-Assets/Temporal-Drift
```

Target branch:

```text
feature/living-timeline-kernel
```

## Objective

Compile, test, correct, and fully verify the deterministic Living Timeline kernel already implemented on this branch. Do not redesign the architecture. Use compiler/test evidence to make the smallest necessary corrections.

## Authoritative design

Read first:

```text
Docs/superpowers/specs/2026-07-18-living-timeline-kernel-design.md
Docs/superpowers/plans/2026-07-18-living-timeline-kernel.md
Docs/QA/LivingTimelineKernelAcceptance.md
```

## Required architecture

Preserve these boundaries:

- `UTemporalKernelSubsystem` owns canonical typed facts, transactions, rule settling, stability, events, commands, news, save snapshots, and hashes.
- `UTimelineFactSubsystem` remains a Boolean compatibility layer and mirrors settled facts into the kernel.
- `UTemporalWorldAdapterSubsystem` and `UTemporalCommandConsumerComponent` consume commands but never own or overwrite simulation truth.
- All authoritative changes enter through transactions.
- Derived facts reject external mutation.
- Event selection is authored and deterministic.
- Save/load must not reroll events or duplicate output.
- World Partition load state must not alter simulation truth.

## Start sequence

Close Unreal Editor and Live Coding first.

```powershell
git fetch origin
git switch feature/living-timeline-kernel
git pull --ff-only origin feature/living-timeline-kernel
git status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\verify_living_timeline.ps1
```

## Working rules

1. Fix the first actual compiler/UHT/test error.
2. Re-run the focused verifier after every correction.
3. Do not weaken determinism, hash, ownership, cycle, or duplicate-prevention assertions.
4. Do not remove reflected fields merely to make UHT pass unless UE 5.8 has no supported equivalent.
5. Do not use Live Coding for reflected-type or save-schema changes.
6. Do not modify unrelated gameplay systems.
7. Preserve existing Boolean timeline tests and save compatibility.
8. Keep command consumers target-aware and idempotent.
9. Keep rule/event ordering stable and lexical after priority.
10. Keep canonical calculations integer/fixed-point only.

## Static review items to verify during compilation

Check these areas against actual UE 5.8 compiler output:

- dynamic multicast delegate parameters using reflected structs by const reference
- `TMap<FName, FTemporalValue>` save/reflection support
- `TArray<TWeakObjectPtr<UTemporalCommandConsumerComponent>>` property support
- `UTickableWorldSubsystem` method signatures
- raw-pointer `TArray::Sort` predicate signature
- generic automation `TestEqual` calls for arrays/enums
- includes required for `FTCHARToUTF8`, `FCrc`, and subsystem access
- Blueprint exposure of signed 64-bit hash values

## Determinism correction to inspect

`TemporalKernelPrivate::CanonicalFacts` is used for rule-cycle repeated-state detection. It should compare logical fact state, not revision counters. If revisions are included, remove revision-only data from the repeated-state signature while leaving revisions in persisted truth hashing.

## Save restore behavior

The saved kernel snapshot is imported by `UBTTF_GameInstance`. Legacy timeline definition reload must not issue default-value compatibility transactions after import. The one-shot suppression in `UTimelineFactSubsystem` is intended to prevent that. Add or adjust a regression test if the GameInstance save/load path still advances the kernel tick or changes hashes.

## Focused acceptance

The Clock Tower transaction must finish with:

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

Expected outputs:

```text
1 event instance
5 pending commands before adapters acknowledge them
1 news publication
non-zero SimulationTruthHash
non-zero FullPersistenceHash
```

## Verification sequence

After the focused verifier succeeds:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\verify_living_timeline.ps1 -RunFullSuite -PackageDevelopment
```

Then inspect:

```powershell
git diff main...HEAD
git status
```

Commit only verified corrections:

```powershell
git add Source Scripts Docs
git commit -m "feat: complete deterministic Living Timeline kernel"
git push origin feature/living-timeline-kernel
```

## Completion report

Report:

- exact build command and exit code
- focused test count and failures
- full suite test count and failures
- package/smoke-test result
- compiler/UHT corrections made
- final branch commit SHA
- any remaining unverified manual PIE checks

Do not claim completion unless the fresh UE 5.8 build, focused tests, full suite, and Development package smoke test all pass.
