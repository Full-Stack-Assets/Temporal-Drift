# Time Circuits UMG Widget Implementation Guide

## Widget Name: WBP_TimeCircuits

### Required Bindings (Blueprint)

**Variables:**
- `TimeTravelSubsystem` (Reference to UTimeTravelSubsystem)
- `DeLorean` (Reference to ADeLoreanVehicle)

**On Construct Event:**
1. Get Player Pawn → Cast to ADeLoreanVehicle → Store in `DeLorean`
2. Get World Subsystem → UTimeTravelSubsystem → Store in `TimeTravelSubsystem`
3. Bind Progress Bars and Text Blocks to subsystem properties

### Key Functions to Create in Widget

**UpdateUI()**
- Set Flux Charge Progress Bar to `TimeTravelSubsystem->GetFluxChargePercent()`
- Set Speed Text to `DeLorean->GetCurrentSpeedMph()`
- Set Era Text to `TimeTravelSubsystem->GetCurrentEraName()`
- Set Paradox Text to `TimeTravelSubsystem->GetParadoxStatusText()`
- Update Hawking Radiation bar using `TimeTravelSubsystem->WormholeStability`

**OnTimeJumpButtonClicked()**
1. Get target era from UI (or use a selected destination)
2. Call `DeLorean->TryTimeTravel(TargetEra)`
3. Play time jump animation / sound
4. Close or update the Time Circuits UI

### Recommended Layout
- Top: Flux Capacitor Charge (large progress bar)
- Right: Current Speed (big digital display)
- Bottom Left: Destination Time input
- Center Bottom: Big "TIME JUMP" button
- Bottom Right: Current Era + Paradox Status
- Hidden by default: Hawking Radiation warning meter (appears when WormholeStability < 60)

### Styling Recommendation
- Dark blue / cyan retro-futuristic style matching the movies
- Use digital font for numbers
- Add subtle flickering animation on the flux bar when charging
