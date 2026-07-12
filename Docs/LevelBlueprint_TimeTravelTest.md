# Level Blueprint Example - Time Travel Test Level

## Level Name Suggestion: LVL_TimeTravelTest

### Purpose
A simple test level to verify:
- Flux charging while driving
- Time jump triggering
- Era switching (via Data Layers)
- Paradox consequences

### Recommended Level Blueprint Logic

**Event BeginPlay**
- Get TimeTravelSubsystem
- Set initial era to Present1985
- Activate corresponding Data Layer

**Event Tick**
- Call `TimeTravelSubsystem->UpdateParadoxOverTime(DeltaTime)`
- Update on-screen debug if needed

**Custom Event: OnPlayerRequestsTimeJump**
1. Check if `TimeTravelSubsystem->HasEnoughEnergyForJump()`
2. If yes → Call `DeLorean->TryTimeTravel(TargetEra)`
3. On successful jump:
   - Activate new Data Layer(s)
   - Play time jump Niagara
   - Update UI
4. If not enough energy → Show "Insufficient Flux" message

**Custom Event: OnParadoxLevelChanged**
- If Paradox > 50 → Spawn reality tear Niagara at random locations
- If Paradox > 80 → Increase post-process distortion intensity

### Actors to Place in Level
- One DeLoreanVehicle (player possessed)
- Several test buildings / props that change per era (via Data Layers)
- Trigger volumes that increase paradox when player interacts with them
- A simple "Time Circuits" widget that can be opened with a key

This level serves as your main testing ground while building the rest of the game.
