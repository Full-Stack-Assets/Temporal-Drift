// BTTF_PlayerController.cpp
#include "BTTF_PlayerController.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "DeLoreanVehicle.h"

ABTTF_PlayerController::ABTTF_PlayerController()
{
    bShowMouseCursor = true;
    bEnableClickEvents = true;
    bEnableMouseOverEvents = true;
}

void ABTTF_PlayerController::BeginPlay()
{
    Super::BeginPlay();

    bShowMouseCursor = true;
    bEnableClickEvents = true;
    bEnableMouseOverEvents = true;
    FInputModeGameAndUI InputMode;
    InputMode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
    InputMode.SetHideCursorDuringCapture(false);
    SetInputMode(InputMode);

    if (UEnhancedInputLocalPlayerSubsystem* Subsystem = 
        ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer()))
    {
        if (DefaultMappingContext)
        {
            Subsystem->AddMappingContext(DefaultMappingContext, 0);
        }
    }
}

void ABTTF_PlayerController::SetupInputComponent()
{
    Super::SetupInputComponent();

    if (UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(InputComponent))
    {
        if (TimeCircuitsToggleAction)
            EnhancedInput->BindAction(TimeCircuitsToggleAction, ETriggerEvent::Triggered, this, &ABTTF_PlayerController::ToggleTimeCircuits);

        if (TimeJumpAction)
            EnhancedInput->BindAction(TimeJumpAction, ETriggerEvent::Triggered, this, &ABTTF_PlayerController::RequestTimeJump);

        if (HoverModeAction)
            EnhancedInput->BindAction(HoverModeAction, ETriggerEvent::Triggered, this, &ABTTF_PlayerController::ToggleHoverMode);
    }
}

void ABTTF_PlayerController::ToggleTimeCircuits()
{
    if (ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(GetPawn()))
    {
        Vehicle->ToggleTimeCircuits();
    }
}

void ABTTF_PlayerController::RequestTimeJump()
{
    if (ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(GetPawn()))
    {
        Vehicle->TryTimeTravelFromInput();
    }
}

void ABTTF_PlayerController::ToggleHoverMode()
{
    if (ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(GetPawn()))
    {
        Vehicle->ToggleHoverMode();
    }
}
