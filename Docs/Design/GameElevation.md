# Temporal Drift — Game Elevation Guide

Last updated: 2026-07-13

This document defines how to elevate **Temporal Drift** from a working vertical-slice prototype to a memorable Hill Valley experience. It complements `Docs/Design/MissionCampaign.md`, `Docs/Design/TemporalDriftV2MasterExpansion.md`, and `Docs/QA/RoadmapStatus.md`.

## Design north star

Players alternate between **on-foot exploration** and **driving the time machine** across a persistent Hill Valley. Every historical intervention produces **readable consequences** in signage, dialogue, population, music, and mission state when they return to 1985.

The codebase already provides strong systems contracts (time-travel SM, era switching, missions, dialogue, save, timeline facts, presentation phases, era music). Elevation is primarily **spectacle, readability, and content density** on those contracts.

```text
Systems (C++)  →  Content (editor)  →  Player experience
     ✓                  ▲                    ▲
                      YOU ARE HERE
```

---

## Priority elevation stack

| Priority | Focus | Roadmap tasks | Exit gate |
|----------|-------|---------------|-----------|
| 1 | Jump spectacle | 8, 27 | Five jumps feel film-quality; reduced-flash variant works |
| 2 | Live M02 loop | 9, 11, 12 | New player completes 1985→1955→1985 without dev help |
| 3 | Hero vehicle | 3 | Predictable 40 MPH threshold; unified DeLorean mesh |
| 4 | Diegetic HUD | 7 | No debug Canvas required; couch-readable at 1080p |
| 5 | 1955 dressing | 6, 13 | Blind screenshot distinguishes eras; geography stable |
| 6 | Full cast dialogue | 15–16 | Vale, June, Rosa/Elena, Crane graphs with branches |
| 7 | Visible consequences | 18 | `C_*` facts change signs, plaque, portrait in-world |
| 8 | M05 lightning finale | 16 | Countdown + storm + checkpoint route |
| 9 | Living town | 10 | Pooled pedestrians; era swap without hitch |
| 10 | Side A/B | 16, 21 | Optional missions reward exploration |

Defer Tasks 19–27 (outfits, 40+ sides, multiplayer, photo mode) until vertical-slice acceptance.

---

## Visual identity

### DeLorean / time machine

| Today | Target |
|-------|--------|
| SportsCar physics + hero mesh overlay | Single stainless coupe mesh with wheel bones |
| Flux only on HUD | Emissive Y-tube pulse driven by `FluxPercent` on vehicle |
| Placeholder materials | Brushed steel, brake light, headlight, flux-capacitor slots |

### Era visual language

| Era | Palette | Signature readable elements |
|-----|---------|----------------------------|
| 1985 Present | Saturated retail, mall energy | Vale Garage, service station, modern storefronts |
| 1955 Past | Pastel façades, warm sun | Courthouse banners, Lou's Cafe analogue, tail-fin cars |
| 1985 Alternate | Desaturated, harsh industrial | Casino tower, patrol (future layer) |
| 2015 Future | Clean skyway futurism | Cafe 80's analogue (future layer) |
| 1885 / 2045 | Frontier dust / corrupted tiers | Saloon vs Heritage District (future layers) |

**Rule:** World Partition geography is permanent; only dressing, signs, lighting, traffic, and population change per Data Layer.

### Clocktower anchor

- Readable clock face from courthouse square
- **10:04 PM** shadow setup for M05 (`EraWeatherSubsystem` lightning window)
- Cable/run props visible only when M05 prep facts are true

### Time-travel presentation (phase → asset)

| Phase | VFX | Audio | Camera |
|-------|-----|-------|--------|
| Charging | `NS_FluxCharge` on vehicle | `MS_FluxHum` pitch ∝ flux | Subtle FOV widen |
| Threshold | Circuit pulse intensity | Circuit click | Shake |
| Departing | Flash → `NS_TemporalVortex` | `MS_TimeDeparture` sonic boom | Impulse |
| Switching era | Hold / streaming | Duck music | — |
| Arriving | `NS_ArrivalFrost` | `MS_TimeArrival` | Recovery |
| Cooldown | `NS_FireTrails` | Era music crossfade | Settle |

Assets: `Scripts/create_presentation_vfx_audio.py` (placeholders — author emitters in editor).

**Accessibility:** Reduced-flash cuts PP weight, particle count, and flash duration (`TimeTravelPresentationComponent` + profile).

---

## World & level design

### Hill Valley circuit (Task 13)

```text
Rural edge → school → commercial strip → courthouse square → residential → Vale Garage → rural
```

Each district needs one identifiable landmark (sign or silhouette), not placeholder cubes.

### Fact-driven consequences (Task 18)

| Fact ID | World change | Mission |
|---------|--------------|---------|
| `C_PlaqueChanged` | Commemorative plaque text | M02 return |
| `C_DinerRenamed` | Diner sign material swap | M03 |
| `C_SchoolDedication` | School plaque | M03 |
| `C_FounderMissing` | Empty portrait frame | M03 |
| `C_CampaignComplete` | Free-roam state + ambient barks | M05 |

Runtime: `UWorldConsequenceSubsystem` summarizes active facts for HUD; signage script wires material paths (`Scripts/create_world_consequence_signage.py`).

### Priority interiors

- Vale Garage (M01 parts, M04 regulator)
- Courthouse archive (M03 evidence)
- Diner (Rosa/Elena scenes)
- Crane workshop (M04 infiltration)

### M05 lightning route

- Rural approach → checkpointed streets → courthouse wire moment
- Miss timing → loop to last approach checkpoint (no soft-lock)
- NPC positions locked by dialogue prep objectives

---

## Vehicle gameplay

### Handling goals

- Mass 1,300–1,500 kg; predictable 40 MPH on rural straight (`UDeLoreanTuningData`)
- Speed-responsive chase FOV (implemented — tune on PC)
- Camera presets: chase, hood, bumper, cockpit
- `R` reset to last safe road transform

### Diegetic destination date

`ADeLoreanVehicle::InputTargetDate` displays on time-circuits HUD (`NOV 12 1955 10:04 PM` default for 1955). Cycles with destination era.

### Driving as gameplay

- **M01:** Gate course with per-gate reset
- **M02:** Charge flux while driving to threshold
- **Side B:** Era-specific delivery route geometry
- **M05:** Simultaneous speed + charge window for lightning sync

---

## On-foot hero

- Enhanced Input migration for hero (`Scripts/create_hero_input.py`)
- Contextual interact prompts (mission > dialogue > generic)
- M04 stealth approach to workshop (`HeroStealthComponent` + exclusion volumes)
- Carry socket for M02 sensor package (future animation hook)

---

## Time travel fantasy

### HUD readability

Time-circuits show: speed, flux, eras, phase, **destination date**, **lightning countdown** (1955 storm nights), mission objective, now playing, **polaroid photograph** status/opacity, active consequences summary.

### Paradox response

| Paradox % | Response |
|-----------|----------|
| &lt; 50 | Stable photograph |
| 50–70 | Fading warning |
| 70–85 | Danger warnings + NPC tone shift (dialogue conditions) |
| ≥ 85 | Critical hand-fade; pulse unless reduced-flash |

`UFadingPhotographWidget` — polaroid panel with opacity bar.

### Jump acceptance

Five consecutive 1985→1955 jumps: no stranded input, no lingering VFX, music crossfade, valid road arrival. Automation: `BTTF.TimeTravel.FiveConsecutivePlayerJumps`.

---

## Missions & narrative

See `MissionCampaign.md` for full objective flows.

### Film-spine mapping (original IP)

| Iconic beat | Temporal Drift |
|-------------|----------------|
| 88 mph / lightning | M05 Race the Lightning (40 MPH gameplay threshold) |
| Enchantment Under the Sea | Earth Angel / Johnny B. Goode era music at 1955 square |
| Clocktower cable | M02 sensor + M05 finale |
| Changed history | M03 `C_*` facts |
| Fading photograph | Polaroid HUD |
| Doc / Marty / Biff | Vale / Hero / Crane |

### Dialogue elevation checklist

- [ ] Conditions: era, mission, facts, paradox, inventory, prior choices
- [ ] Skip-safe sequences dispatch events once
- [ ] Save-safe node + flag restore (`FDialogueProgressSnapshot`)
- [ ] VO slots optional; subtitles required

### Side missions

- **Side A — Faces of Hill Valley:** photo-matching pedestrians; paradox reward
- **Side B — Special Delivery:** era-routing puzzle; tuning unlock

Data: `Scripts/create_side_missions.py`. Volumes: `place_mission_volumes.py`.

---

## Audio

| Layer | Implementation |
|-------|----------------|
| Era music | `UEraMusicSubsystem` — import licensed WAVs per `Docs/Audio/EraMusic.md` |
| Presentation | MetaSounds for flux hum, departure, arrival (replace SoundWave placeholders) |
| Ambient | `UEraDataAsset::AmbientLoop` per era |
| Dialogue | Duck music; profile `DialogueVolume` |

---

## UI / UX

| Widget | Status | Elevation |
|--------|--------|-----------|
| `TimeCircuitsWidget` | C++ prototype | Authored `WBP_TimeCircuits` bezel art |
| `FadingPhotographWidget` | C++ polaroid | Texture + frame art |
| `DialogueWidget` | Functional | Controller glyphs, text-size from profile |
| `PauseMenuWidget` / `SettingsWidget` | C++ logic | Visual design pass on `WBP_*` |

---

## Accessibility

| Feature | Implementation |
|---------|----------------|
| Reduced flash | Profile + presentation intensity |
| UI / subtitle scale | Profile sliders |
| High contrast | Future HUD theme |
| Color-blind warnings | Add icons alongside red/orange paradox text |
| No voice required | Subtitle-first design |

---

## Performance & shipping

- Target: 1080p60 Development on mid-tier GPU
- Era switch hitch &lt; 200 ms at courthouse
- `Scripts/Build/package_smoke_test.ps1` on clean machine
- Regenerate HLOD before Shipping (`Docs/QA/KnownIssues.md`)

---

## Content pipeline (PC workflow)

```powershell
git pull origin cursor/visuals-audio-movement-dialogue-492a
.\Scripts\Build\setup_vertical_slice.ps1
```

1. Import music → `Docs/Audio/EraMusic.md`
2. Author Niagara systems → `Docs/Niagara_Systems_Guide.md`
3. Run `place_mission_volumes.py` + play M02
4. Tune DeLorean 40 MPH course
5. Art pass `WBP_TimeCircuits` + polaroid widget
6. `run_automation.ps1 -Filter BTTF` + `package_smoke_test.ps1`

---

## Implementation reference (code)

| System | Path |
|--------|------|
| Presentation phases | `TimeTravelPresentationComponent.*` |
| Era music | `EraMusicSubsystem.*`, `Docs/Audio/EraMusic.md` |
| Timeline facts | `TimelineFactSubsystem.*`, `create_timeline_data.py` |
| World consequences HUD | `WorldConsequenceSubsystem.*` |
| Polaroid HUD | `FadingPhotographWidget.*` |
| Lightning countdown | `EraWeatherSubsystem::GetClocktowerLightningCountdown` |
| Destination date | `DeLoreanVehicle::InputTargetDate` |
| Campaign missions | `MissionCampaign.md`, `create_campaign_missions.py` |
| Hill Valley builders | `Scripts/hill_valley/` |
