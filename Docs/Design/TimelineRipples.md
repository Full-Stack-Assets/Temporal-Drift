# Timeline Ripple Effects

Last updated: 2026-07-13

## Overview

Temporal Drift models **six playable eras** with a dependency graph of timeline facts. Interventions in the past recompute consequences in 1955, 1985 present, 2015, and 2045.

```text
1885 base facts  →  1955 propagated  →  1985 present  →  2015 / 2045
     (player)          (computed)         (computed + missions)
```

## Era data layers

| Era | Layer | Dressing script |
|-----|-------|-----------------|
| 1885 Wild West | `DL_1885` | `build_1885_dressing.py` |
| 1955 Past | `DL_1955` | `build_1955_dressing.py` |
| 1985 Present | `DL_1985_Present` | neutral base + `build_timeline_variants.py` |
| 1985 Alternate | `DL_1985_Alternate` | `build_1985_alternate_dressing.py` |
| 2015 Future | `DL_2015` | `build_2015_dressing.py` |
| 2045 Deep Future | `DL_2045` | `build_2045_dressing.py` |

## Fact graph (high level)

### 1885 interventions (`SetBaseFact` via mission events)

| Fact | Mission event |
|------|----------------|
| `1885.LandDisputeWon` | `1885LandDisputeResolved` |
| `1885.SaloonStandoffResolved` | `1885SaloonStandoffResolved` |
| `1885.RailSurveyApproved` | `1885RailSurveyApproved` or M04 regulator |

### Propagated consequences

| Fact | Depends on | Meaning when true |
|------|------------|-------------------|
| `1955.MallSiteOwned` | `1885.LandDisputeWon` | Mall site preserved (good) |
| `1955.DinerLegacyIntact` | `1885.SaloonStandoffResolved` | Diner family line intact |
| `1985.StreetRenamed` | `1955.MallSiteOwned` = false | Courthouse square renamed |
| `A_TimelineCorrupted` | multiple `C_*` + not complete | 1985-A branch active |
| `2045.TierThreeTannenOwned` | `1985.StreetRenamed` | Dynasty skyline (default corrupted) |

### Mission-direct present facts

M02 → `C_PlaqueChanged` · M03 → `C_DinerRenamed`, `C_SchoolDedication`, `C_FounderMissing` · M05 → `C_CampaignComplete`

## Visible ripples in-world

`UTimelineVariantSubsystem` toggles actors tagged:

- `HV_TimelineVariant`
- `HV_ShowIf_<FactId>` — visible when fact is true
- `HV_HideIf_<FactId>` — visible when fact is false

Placed by `build_timeline_variants.py` at diner, school, courthouse plaque, mall site, and 2045 warning signs.

`UWorldConsequenceSubsystem` summarizes active facts on the time-circuits HUD (`RIPPLES: …`).

## Automation

- `BTTF.Timeline.CrossEraRippleGraph` — 1885 → 2045 propagation
- `BTTF.Timeline.VariantVisibilityContract` — variant actor collection
- `BTTF.Timeline.FactDependencyGraph` — acyclic graph (existing)

## PC workflow

```powershell
.\Scripts\Build\setup_vertical_slice.ps1
```

Rebuild, run `run_automation.ps1 -Filter BTTF.Timeline`, PIE test: set `1885.LandDisputeWon` via mission event, return to 1985, verify signage swaps.
