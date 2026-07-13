# Temporal Drift Comprehensive Remaining Work Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current UE 5.8 development build into an accepted keyboard-playable vertical slice, then a content-complete Hill Valley campaign, and finally the five-era master game described by the existing 27-task roadmap.

**Architecture:** Keep authoritative gameplay state in focused C++ systems, use Enhanced Input for possession-safe control contexts, and use one World Partition Hill Valley map with Data Layers for era and timeline variants. Treat generated assets as reproducible source output, keep every milestone playable, and require automation plus live packaged evidence before advancing a release gate.

**Tech Stack:** Unreal Engine 5.8, C++20, Enhanced Input, Chaos Vehicles, World Partition, Data Layers, UMG, Niagara, Unreal Python commandlets, PowerShell build scripts, Unreal Automation Tests, Git/GitHub.

## Global Constraints

- Preserve `/Game/Levels/LVL_TimeTravelTest` as the working map until vertical-slice acceptance.
- Arrow keys move the possessed character or vehicle; W/A/S/D control the camera only.
- Gameplay camera uses no mouse input; the cursor remains visible.
- G enters/exits the DeLorean, C cycles presets, and V toggles auto-chase.
- Manual camera input suspends auto-chase; it recenters smoothly after 1.5 seconds when enabled.
- The gameplay time-jump threshold remains at or below 40 MPH.
- 1985 and 1955 are the release-critical eras for the vertical slice.
- Every production-code bug fix or behavior change begins with a failing automation test.
- Every milestone ends with a buildable, launchable game; no long content-only integration branch.
- Do not claim a gate complete from generated assets or unit tests alone when the gate requires PIE or packaged evidence.

## Release Gate A: Playable and Stable Vertical Slice

### Task 1: Preserve and Verify the Current Integration Baseline

**Status:** In progress — see `Docs/QA/RoadmapStatus.md` and `Docs/QA/VerticalSliceChecklist.md`.

### Task 2: Implement the Final Keyboard Input Contract

**Status:** Code complete on `cursor/keyboard-camera-photorealism-492a` — live PIE gate pending.

### Task 3: Fix Reliable G Vehicle Entry and Exit

**Status:** Code complete — blocked-exit feedback, three exit candidates, controller-owned G.

### Task 4: Add Shared Manual and Auto-Chase Cameras

**Status:** Code complete — `UKeyboardCameraComponent` (plan name: KeyboardCameraStateComponent).

### Task 5: Complete the Hero DeLorean Gameplay Gate

**Status:** Code complete — tuning data drives reverse/hover/input; regression tests + `Docs/QA/HeroVehicleAcceptance.md`. Live PIE evidence pending.

### Task 6: Upgrade Hill Valley to Photoreal Material and Lighting Baseline

**Status:** Code complete — `Scripts/hill_valley/photoreal_material_library.py`, apply/validate scripts, builders use PBR instances via `hill_valley_common.create_default_materials()`. Courthouse screenshots pending on PC.

### Task 7: Close Hill Valley Region and Streaming Gaps

**Status:** Partial — mission volume producers added; streaming perf evidence open.

### Task 8: Finish the 1985-to-1955 Vertical-Slice Loop

**Status:** Partial — automation + scaffolding; live playthrough pending.

### Task 9: Harden Save, Recovery, Packaging, and Acceptance

**Status:** Partial — era restore, dynamic facts, jump-failure recovery; packaged smoke pending.

## Release Gate B: Expanded Hill Valley Campaign

### Task 10: Complete M01-M05, Dialogue, Population, and Consequences

**Status:** Partial.

## Release Gate C: Five-Era Master Game

### Tasks 11–12

Release umbrellas for five-era production and final acceptance.

## Detailed Backlog (Tasks 13–33)

Tasks 13–33 cover hero animation, traversal, progression, era architecture, timeline facts, campaign/endings, narrative delivery, side content, combat/stealth, DeLorean upgrades, traffic/population, economy, onboarding, accessibility, photo/mod, multiplayer, performance, CI, diagnostics, legal compliance, and final QA.

See the full task breakdown in the project issue tracker and `Docs/superpowers/plans/2026-07-12-temporal-drift-game-upgrade-roadmap.md` for requirement details.

## Recommended Execution Sequence

1. Tasks 1–5: restore trust in playable controls and vehicle.
2. Tasks 6–7: raise Hill Valley visual quality and traversal integrity.
3. Tasks 8–9: accept and package the vertical slice.
4. Task 10: expand into complete Hill Valley campaign.
5. Tasks 13–26: single-player master-game content and systems.
6. Tasks 27–28: photo/mod/online after single-player authority is stable.
7. Tasks 29–33: optimize, automate, secure, document, and accept release.

## Completion Reporting

After each task, update `Docs/QA/RoadmapStatus.md` with: **Not started**, **In progress**, **Code complete**, **Content complete**, or **Accepted**. Only **Accepted** means every automated, live PIE, and packaged gate for that task has evidence.
