# Data Layer & Era Switching Logic

## Recommended Approach

Use **World Partition + Data Layers** to handle different eras.

### 1. Create Data Layers in Editor
- `DL_1885_WildWest`
- `DL_1955_Past`
- `DL_1985_Present`
- `DL_1985_Alternate` (Biff's world)
- `DL_2015_Future`
- `DL_2045_Futuristic`

### 2. C++ Helper Functions (Add to TimeTravelSubsystem or GameMode)

```cpp
// In TimeTravelSubsystem.h
UFUNCTION(BlueprintCallable, Category = "Era Management")
void ActivateEraDataLayers(ETimelineState NewEra);

// In TimeTravelSubsystem.cpp
void UTimeTravelSubsystem::ActivateEraDataLayers(ETimelineState NewEra)
{
    UWorld* World = GetWorld();
    if (!World) return;

    // Deactivate all era layers first (simplified example)
    // Then activate the correct one based on NewEra

    switch (NewEra)
    {
    case ETimelineState::Past1955:
        // World->GetDataLayerManager()->SetDataLayerRuntimeState(...)
        break;

    case ETimelineState::Future2015:
        // Activate 2015 Data Layer
        break;

    // Add cases for all eras
    default:
        break;
    }
}
```

### 3. Visual Transition
When switching eras:
1. Play time travel VFX (Niagara)
2. Fade screen to white/blue
3. Activate new Data Layer(s)
4. Update TimeTravelSubsystem state
5. Fade back in

This system allows you to have completely different buildings, props, and lighting per era while keeping the same underlying world.
