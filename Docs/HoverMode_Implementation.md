# Hover Mode Implementation (2015 DeLorean)

## Concept
When the player activates hover mode (2015 version), the DeLorean should lift slightly off the ground and use Chaos physics forces instead of normal wheels.

## Recommended Implementation

### 1. Add Variables to DeLoreanVehicle
```cpp
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
bool bHoverModeActive = false;

UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
float HoverHeight = 120.0f;

UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
float HoverForce = 2500.0f;
```

### 2. Hover Mode Toggle Function
```cpp
void ADeLoreanVehicle::ToggleHoverMode()
{
    bHoverModeActive = !bHoverModeActive;

    if (bHoverModeActive)
    {
        // Disable normal wheel drive or reduce friction
        // Apply upward force every frame while active
    }
}
```

### 3. Apply Hover Force in Tick (when active)
```cpp
void ADeLoreanVehicle::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    if (bHoverModeActive)
    {
        FVector UpForce = FVector(0, 0, HoverForce);
        GetMesh()->AddForce(UpForce, NAME_None, true);

        // Optional: Add some stabilization torque
    }
}
```

### 4. Visuals
- Activate Niagara thruster effects under the car
- Change wheel visibility or suspension height
- Play hover sound loop

This gives a satisfying "floating" feel while still allowing the player to drive normally in the air.
