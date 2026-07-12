# Paradox Consequence System - Implementation Guide

## Paradox Tiers & Effects

### Tier 1: Minor Ripple (25-50)
- Small visual glitches (flickering lights, minor object movement)
- Some NPCs have slightly wrong memories

### Tier 2: Unstable (50-70)
- Duplicate NPCs appear briefly
- Objects change position or disappear
- Screen chromatic aberration increases

### Tier 3: Dangerous (70-90)
- Reality tears (Niagara particle rifts)
- Time echoes (player hears voices from other timelines)
- Some quests become unavailable or change

### Tier 4: Collapse (90-100)
- Major timeline reset or bad ending
- Forced return to 1985 with heavy consequences
- Potential game over state

## Recommended Implementation

**In TimeTravelSubsystem.cpp (already partially implemented):**
- `ApplyParadoxFromAction(float Severity)` – Call this when player makes major timeline changes
- `UpdateParadoxOverTime()` – Call in Tick to slowly reduce paradox if player is careful

**Consequence Triggers (Blueprint or C++):**
- When Paradox crosses 50 → Spawn "reality tear" Niagara system
- When Paradox crosses 70 → Activate post-process material for distortion
- When Paradox reaches 95 → Trigger timeline collapse event

**Example Consequence Function:**
```cpp
void UTimeTravelSubsystem::TriggerParadoxConsequence()
{
    if (CurrentParadoxLevel > 70.0f)
    {
        // Spawn reality tear effects
        // Change some actor states
        // Play warning sound
    }
}
```
