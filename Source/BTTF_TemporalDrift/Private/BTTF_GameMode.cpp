// BTTF_GameMode.cpp
// BTTF_TemporalDrift - Game Mode Implementation
// Unreal Engine 5.8

#include "BTTF_GameMode.h"
#include "Kismet/GameplayStatics.h"
#include "BTTF_GameInstance.h"
#include "BTTF_PlayerController.h"
#include "BTTF_HUD.h"

ABTTF_GameMode::ABTTF_GameMode()
{
    static ConstructorHelpers::FClassFinder<APawn> DeLoreanBPClass(TEXT("/Game/Blueprints/BP_DeLorean"));
    DefaultPawnClass = DeLoreanBPClass.Succeeded() ? DeLoreanBPClass.Class : nullptr;

    // Prefer the Blueprint controller (has input assets assigned); fall back to the C++ class.
    static ConstructorHelpers::FClassFinder<APlayerController> ControllerBPClass(TEXT("/Game/Blueprints/BP_BTTF_PlayerController"));
    if (ControllerBPClass.Succeeded())
    {
        PlayerControllerClass = ControllerBPClass.Class;
    }
    else
    {
        PlayerControllerClass = ABTTF_PlayerController::StaticClass();
    }

    HUDClass = ABTTF_HUD::StaticClass();
}

void ABTTF_GameMode::BeginPlay()
{
    Super::BeginPlay();
    InitializeTimeTravelSubsystem();
}

void ABTTF_GameMode::InitializeTimeTravelSubsystem()
{
    TimeTravelSubsystem = GetWorld()->GetSubsystem<UTimeTravelSubsystem>();
}

void ABTTF_GameMode::SwitchToEra(ETimelineState NewEra)
{
    if (!TimeTravelSubsystem) return;

    // In a full implementation, this would also handle Data Layer activation
    TimeTravelSubsystem->PerformTimeTravel(nullptr, NewEra, nullptr);

    UE_LOG(LogTemp, Log, TEXT("GameMode: Switching to era %s"), 
        *UEnum::GetValueAsString(NewEra));
}

void ABTTF_GameMode::ReturnToPreviousEra()
{
    if (!TimeTravelSubsystem) return;

    ETimelineState PreviousEra = TimeTravelSubsystem->PreviousTimelineState;
    SwitchToEra(PreviousEra);
}

ETimelineState ABTTF_GameMode::GetCurrentEra() const
{
    if (TimeTravelSubsystem)
    {
        return TimeTravelSubsystem->GetCurrentEra();
    }
    return ETimelineState::Present1985;
}

void ABTTF_GameMode::StartNewGame()
{
    UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance());
    if (GameInstance)
    {
        GameInstance->InitializeNewGame();
    }

    if (TimeTravelSubsystem)
    {
        TimeTravelSubsystem->CurrentTimelineState = ETimelineState::Present1985;
        TimeTravelSubsystem->CurrentParadoxLevel = 0.0f;
    }

    UE_LOG(LogTemp, Log, TEXT("New game started."));
}

void ABTTF_GameMode::SaveCurrentProgress()
{
    UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance());
    if (GameInstance)
    {
        GameInstance->SaveGameToSlot();
    }
}
