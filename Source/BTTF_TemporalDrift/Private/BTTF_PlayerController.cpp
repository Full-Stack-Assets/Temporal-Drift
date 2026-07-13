// BTTF_PlayerController.cpp
#include "BTTF_PlayerController.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "DeLoreanVehicle.h"
#include "BTTFHeroCharacter.h"
#include "VehicleInteractionComponent.h"
#include "EngineUtils.h"
#include "InputCoreTypes.h"

ABTTF_PlayerController::ABTTF_PlayerController()
{
    bShowMouseCursor = true;
    bEnableClickEvents = true;
    bEnableMouseOverEvents = true;
    HeroClass = ABTTFHeroCharacter::StaticClass();
}

void ABTTF_PlayerController::PlayerTick(float DeltaTime)
{
    Super::PlayerTick(DeltaTime);
    if (WasInputKeyJustPressed(EKeys::G))
    {
        ToggleVehicleHeroPossession();
    }
}

bool ABTTF_PlayerController::ToggleVehicleHeroPossession()
{
    if (ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(GetPawn()))
    {
        if (!CachedHero && GetWorld() && HeroClass)
        {
            FActorSpawnParameters SpawnParams;
            SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;
            CachedHero = GetWorld()->SpawnActor<ABTTFHeroCharacter>(HeroClass, Vehicle->GetActorLocation(), Vehicle->GetActorRotation(), SpawnParams);
        }
        return CachedHero && CachedHero->GetVehicleInteractionComponent()->ExitVehicle(Vehicle);
    }

    if (ABTTFHeroCharacter* Hero = Cast<ABTTFHeroCharacter>(GetPawn()))
    {
        ADeLoreanVehicle* NearestVehicle = nullptr;
        float NearestDistanceSq = TNumericLimits<float>::Max();
        for (TActorIterator<ADeLoreanVehicle> It(GetWorld()); It; ++It)
        {
            const float DistanceSq = FVector::DistSquared(Hero->GetActorLocation(), It->GetActorLocation());
            if (DistanceSq < NearestDistanceSq)
            {
                NearestDistanceSq = DistanceSq;
                NearestVehicle = *It;
            }
        }
        return NearestVehicle && Hero->GetVehicleInteractionComponent()->EnterVehicle(NearestVehicle);
    }

    return false;
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
