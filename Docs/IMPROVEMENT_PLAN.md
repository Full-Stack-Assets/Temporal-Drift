# BTTF Temporal Drift — Improvement Plan

Per-pass audit log, following the QUAHOG/MountHope convention.

## First pass — v3 (deep-dive C++ audit + project scaffolding)

### Compile/link blockers fixed
1. **Missing `CanPerformTimeTravel`** — `DeLoreanVehicle.cpp::TryTimeTravel` called a subsystem function that did not exist. Added `UTimeTravelSubsystem::CanPerformTimeTravel(const ADeLoreanVehicle*)` and made `PerformTimeTravel` use it as its own gate (single source of truth).
2. **`BTTF_GameInstance` had UFUNCTION declarations with no implementation** — guaranteed linker errors. Added `BTTF_GameInstance.cpp` implementing `SaveTimelineState`/`LoadTimelineState` via `UGameplayStatics` slot save/load against `UBTTF_SaveGame`, with null-guards, missing-slot handling, and failed-write logging.
3. **`EraDataAsset.h` used `TSoftObjectPtr<UMaterialInterface>` with no declaration in scope** — added forward declaration.
4. **No project scaffolding** — added `BTTF_TemporalDrift.uproject` (UE 5.8, ChaosVehiclesPlugin/Niagara/EnhancedInput), game + editor `Target.cs`, `Build.cs` (Core, CoreUObject, Engine, InputCore, EnhancedInput, ChaosVehicles, PhysicsCore, Niagara), primary game module .h/.cpp with `IMPLEMENT_PRIMARY_GAME_MODULE`, and Config inis (default GameMode/GameInstance wiring, Lumen/VSM renderer settings, Enhanced Input classes).

### Semantic bugs fixed (would compile, would not work)
5. **DeLorean never ticked** — `PrimaryActorTick.bCanEverTick` was never enabled, so speedometer, flux charging, and debug draw never ran. Enabled in constructor.
6. **`TimeTravelNiagaraComponent` declared but never constructed** — permanently null; all VFX calls silently no-oped. Now created via `CreateDefaultSubobject`, attached to root, auto-activate off.
7. **`TryTiplerJump` never actually jumped** — it called `PerformTimeTravel(nullptr, ...)`, which early-returns on null vehicle. Player paid 35 paradox and lost all Tipler charge for nothing. Refactored the jump core into `ExecuteJumpInternal`; the Tipler path now bypasses the flux-energy gate (by design — it spends Tipler charge instead) and genuinely travels. Also blocks re-entry while a jump is in flight.
8. **Vehicle stuck in "time traveling" forever** — `StartTimeTravelEffects` set `bIsTimeTraveling = true` and nothing ever ended it, permanently disabling flux charging after the first jump. Added `OnTimeTravelCompleted` delegate broadcast when the subsystem's 2.5s window closes; vehicle binds it to `EndTimeTravelEffects` in `BeginPlay`.
9. **`UpdateParadoxOverTime` was orphaned** — never called (plain `UWorldSubsystem` doesn't tick). Rebased subsystem onto `UTickableWorldSubsystem`; paradox decay now runs every frame.
10. **Three inconsistent paradox write paths** — `ApplyParadoxFromAction` clamped and synced flags; `ApplyHawkingRadiationFeedback` and `TryTiplerJump` wrote raw with no clamp, no flag sync, no instability broadcast. Unified through private `AddParadoxInternal` (clamp to `[0, MaxParadoxLevel]`, flag sync, ≥70 broadcast on increases only).
11. **Speedometer was `FMath::RandRange(0, 120)`** — flux charging was literally random. Now reads `GetVehicleMovementComponent()->GetForwardSpeed()` (cm/s → mph, abs).
12. **Raw `this` capture in the reset timer lambda + local `FTimerHandle`** — replaced with `FTimerDelegate::CreateWeakLambda` and a stored member handle (prevents double-scheduling on overlapping jumps; cleared in `Deinitialize`).
13. **`EraData` parameter accepted and ignored** — `ParadoxMultiplier` from the era data asset now scales Hawking radiation cost on jump.
14. **Jump counter** — added `TotalJumpsMade` to the subsystem (incremented per jump) so the pre-existing `UBTTF_SaveGame::TotalJumpsMade` field actually persists real data.

### Known remaining work (unchanged from README)
- UMG Time Circuits widget, Niagara systems, Data Layers per era, Enhanced Input mapping contexts (Config wiring is in place; assets are editor-side), test levels.
