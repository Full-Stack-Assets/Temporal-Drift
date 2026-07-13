// BTTF_PlayerController.cpp
#include "BTTF_PlayerController.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "DeLoreanVehicle.h"
#include "BTTFHeroCharacter.h"
#include "VehicleInteractionComponent.h"
#include "EngineUtils.h"
#include "InputCoreTypes.h"
#include "TimeTravelSubsystem.h"

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

void ABTTF_PlayerController::QAJumpTo1955()
{
#if !UE_BUILD_SHIPPING
    UWorld* World = GetWorld();
    UTimeTravelSubsystem* TimeTravel = World ? World->GetSubsystem<UTimeTravelSubsystem>() : nullptr;
    if (!TimeTravel)
    {
        UE_LOG(LogTemp, Error, TEXT("BTTF QA jump failed: time-travel subsystem is unavailable."));
        return;
    }

    TimeTravel->AddFluxEnergy(TimeTravel->FluxCapacitorMaxEnergy);
    TimeTravel->SetTimeCircuitsArmed(true);

    FTimeTravelRequest Request;
    Request.Destination = ETimelineState::Past1955;
    Request.EntrySpeedMph = TimeTravel->GetJumpSpeedThresholdMph();
    Request.Origin = GetPawn() ? GetPawn()->GetActorLocation() : FVector::ZeroVector;
    const bool bAccepted = TimeTravel->RequestTimeTravel(Request);
    UE_LOG(LogTemp, Display, TEXT("BTTF QA jump to 1955 accepted=%s threshold=%.0f MPH"),
        bAccepted ? TEXT("true") : TEXT("false"), Request.EntrySpeedMph);
#endif
}
