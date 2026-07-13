# Temporal Drift — Hill Valley Campaign Plan

## Campaign Promise

The player alternates naturally between on-foot exploration and driving the time machine across a persistent Hill Valley in 1985 and 1955. Each historical intervention produces a readable consequence in architecture, signage, population, dialogue, access, or mission state when the player returns to 1985.

Target first-campaign length: 60–120 minutes, plus two optional side missions. Every mission supports keyboard/mouse and controller, localized subtitles, checkpoint restart, save/quit/continue, skip-safe cinematics, and recovery from a lost vehicle or invalid player position.

## Core Cast

- **The Hero:** playable 1985 resident recruited because they can drive, improvise, and move unnoticed through town.
- **Dr. Emmett Vale:** eccentric inventor who built the temporal drive; tutorial, technical exposition, and moral counterweight.
- **June Parker:** courthouse archivist in both eras; provides historical evidence and reacts to changed records.
- **Rosa Diaz:** diner owner in 1985 and Rosa's grandmother Elena in 1955; anchors community memory and clue delivery.
- **Principal Ward:** school contact whose family history changes after interference in 1955.
- **Victor Crane:** ambitious rival who discovers fragments of future technology and engineers the central alteration.
- **Ambient residents:** era-specific pedestrians with short contextual conversations keyed to location, mission, and paradox state.

## Dialogue Contract

Each conversation is a `UDialogueDataAsset` graph containing stable conversation/node IDs, speaker IDs, localized text keys, optional voice and gesture slots, response choices, conditions, mission events, paradox effects, and next-node IDs. Widgets display data but never own story logic.

Required condition sources:

- active mission and objective;
- current era;
- inventory and installed components;
- prior response choices;
- paradox range;
- visible world-consequence flags;
- completed/failed objectives and side missions.

Required delivery behavior:

- interact-to-talk with a clear prompt and valid conversation target;
- speaker focus and optional short camera framing;
- subtitle text, speaker name, response choices, controller glyphs, and text-size/background settings;
- manual advance and configurable auto-advance;
- skip-safe Level Sequences that still dispatch required events once;
- interruption when the player leaves range, with safe resume or intentional restart policy;
- exact restoration of player input, camera, mission state, and NPC behavior on completion/interruption;
- save-safe conversation node and exact-once consequence/event IDs.

## Mission Graph

```text
M01 First Test Run
  -> M02 Clocktower Calibration
      -> M03 A Town Out of Time
          -> M04 The Missing Component
              -> M05 Race the Lightning

Side A: Faces of Hill Valley (unlocks during M03)
Side B: Special Delivery (unlocks after M01, changes between eras)
```

## M01 — First Test Run

**Purpose:** Teach on-foot movement, interaction, inventory, entering/exiting the vehicle, driving controls, reset, and checkpoints without a detached tutorial menu.

1. Spawn outside Vale Garage in 1985; objective marker and Vale's greeting establish the test.
2. Talk to Vale. Optional questions explain flux, the configurable 40-MPH threshold, and why courthouse square is the controlled test site.
3. Collect three calibration parts: oscillator from the garage bench, shielded cable from the electronics shop, and coolant cell from the service station.
4. Install each part through contextual interaction at the parked vehicle.
5. Enter the vehicle; complete accelerate, steer, brake, reverse, handbrake, camera, and reset prompts on the marked route.
6. Complete a timed but forgiving circuit around courthouse square. Missing a gate resets only to the previous gate.
7. Return to Vale Garage, exit, and confirm the results in dialogue.

**Checkpoint IDs:** `M01_Start`, `M01_PartsCollected`, `M01_VehicleReady`, `M01_CourseStart`, `M01_Complete`.

**Failure recovery:** vehicle reset at any gate; lost parts respawn at their stable source ID; player/vehicle separation restores both at the last checkpoint.

## M02 — Clocktower Calibration

**Purpose:** Deliver the complete first 1985-to-1955 travel loop.

1. Meet Vale and June at the courthouse. Dialogue establishes that the clocktower can provide a stable temporal reference.
2. Collect and install the clocktower sensor package.
3. Charge flux while driving, select 1955, arm circuits, and cross 40 MPH on the rural approach.
4. Arrive at the corresponding road location in 1955 with input restored and no duplicated jump.
5. Drive to courthouse square, park, exit, and carry the sensor to its marked installation point.
6. Optional paradox action: reveal the future vehicle to a gathering crowd. Avoiding it grants stability; triggering it changes later dialogue and adds paradox.
7. Install and calibrate the sensor through a short interaction sequence.
8. Speak with Elena at the diner to obtain safe-route information for the return charge.
9. Return to 1985 and inspect the first minor consequence: a changed commemorative plaque and one conversation line.

**Checkpoint IDs:** `M02_Briefing`, `M02_SensorInstalledVehicle`, `M02_Arrived1955`, `M02_ClocktowerReached`, `M02_Calibrated`, `M02_Returned1985`.

## M03 — A Town Out of Time

**Purpose:** Make changed history readable through the complete map, signage, population, and dialogue.

1. Vale identifies conflicting clocktower records; June reports that courthouse archives changed overnight.
2. Inspect three visible discrepancies: renamed diner sign, altered school dedication, and missing founder portrait.
3. Follow dialogue clues through the diner, school entrance, courthouse archive, and a residential witness.
4. Assemble evidence on the mission screen; incorrect ordering produces hints, not a hard fail.
5. Discover Victor Crane's ancestor acquired a future-alloy fragment during the calibration visit.
6. Choose whether to tell Vale everything or conceal the optional paradox action. This changes trust dialogue and one later assistance condition.

**World consequences:** `C_DinerRenamed`, `C_SchoolDedication`, `C_FounderMissing`.

## M04 — The Missing Component

**Purpose:** Combine driving, pedestrian infiltration, dialogue, and era-aware problem solving.

1. Travel to 1955 and question Elena, June, and a garage worker; response choices determine which of two access routes opens.
2. Locate Crane's workshop at the industrial/rural edge.
3. Park outside the exclusion zone and approach on foot to avoid alerting Crane's workers.
4. Enter through either a dialogue-authorized front route or an alley/service route unlocked by environmental clues.
5. Recover the future-alloy fragment and a missing temporal regulator.
6. Optional choice: erase Crane's research notes or leave them. Erasing increases immediate paradox but prevents a harsher 1985 industrial consequence.
7. Escape to the vehicle; fail-safe pursuit ends at a clear recovery volume rather than soft-locking the mission.
8. Install the regulator at Vale Garage in 1955 and prepare the finale.

**Choice IDs:** `M04_AccessFront`, `M04_AccessService`, `M04_EraseNotes`, `M04_LeaveNotes`.

## M05 — Race the Lightning

**Purpose:** Conclude the first campaign with preparation, dialogue coordination, a readable high-speed route, and consequence resolution.

1. Inspect the courthouse-square route with Vale and assign three preparation tasks: cable connection, street clearance, and clock synchronization.
2. Complete each task on foot; conversations position June, Elena, and the garage worker safely.
3. Save at `M05_Ready` before the finale.
4. Drive from the rural start through checkpointed streets toward courthouse square while maintaining the required charge/speed window.
5. Trigger the synchronized departure once; missed timing loops to the final approach checkpoint with state restored.
6. Arrive in 1985, retain control, brake safely, and return to courthouse square.
7. Walk the square with Vale and inspect consequences from `C_*` and `M04_*` flags: signs, plaque, school dedication, industrial skyline/prop dressing, NPC lines, and access state.
8. Final dialogue records the campaign outcome, unlocks free roam, and preserves side missions.

## Side A — Faces of Hill Valley

June asks the hero to identify residents in altered archive photographs. The player talks to pedestrians across civic, commercial, school, and residential districts, matches four stable NPC IDs, and decides whether to restore or preserve one harmless family connection. Reward: reduced paradox and expanded ambient dialogue.

## Side B — Special Delivery

A service-station owner requests a timed vehicle delivery in 1985. In 1955 the same route lacks a bridge/road segment, requiring an alternate rural approach and on-foot handoff. Reward: vehicle tuning unlock and era-specific business signage acknowledging the delivery.

## Campaign Acceptance

- Every objective has a stable ID, explicit completion event, checkpoint, marker policy, recovery path, and required asset list.
- Required dialogue is comprehensible without voice audio and cannot strand player input or camera state.
- Choices dispatch consequences exactly once and survive era changes, save/load, and packaging.
- No mission requires Output Log inspection, console commands, editor selection, or developer guidance.
- A new player completes the campaign in 60–120 minutes and can restart any mission from its most recent valid checkpoint.
