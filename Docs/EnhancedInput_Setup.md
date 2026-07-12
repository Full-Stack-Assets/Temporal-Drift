# Enhanced Input Setup for Time Circuits

## 1. Create Input Actions

Create these Input Actions in the Content Browser:

- `IA_TimeCircuits_Toggle` (Digital, for opening/closing the Time Circuits UI)
- `IA_TimeJump_Confirm` (Digital, for confirming a time jump)
- `IA_HoverMode_Toggle` (Digital, for activating hover mode in 2015)

## 2. Create Input Mapping Context

Create `IMC_DeLorean` and add the above Input Actions with appropriate keys:
- `IA_TimeCircuits_Toggle` → **T** key (or D-Pad Up on gamepad)
- `IA_TimeJump_Confirm` → **Enter** or **A** button
- `IA_HoverMode_Toggle` → **H** key

## 3. C++ Integration (Recommended)

In your PlayerController or DeLoreanVehicle:

```cpp
// Add to header
UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
UInputMappingContext* DeLoreanMappingContext;

UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
UInputAction* TimeCircuitsToggleAction;

// In BeginPlay or SetupPlayerInputComponent
void ADeLoreanVehicle::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    if (APlayerController* PC = Cast<APlayerController>(GetController()))
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
        {
            Subsystem->AddMappingContext(DeLoreanMappingContext, 0);
        }
    }

    // Bind actions
    if (UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent))
    {
        EnhancedInput->BindAction(TimeCircuitsToggleAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::ToggleTimeCircuits);
    }
}

void ADeLoreanVehicle::ToggleTimeCircuits()
{
    // Open or close WBP_TimeCircuits widget
}
```

This gives clean, modern input handling for all time travel related actions.
