// BTTF_GameInstance.cpp
// BTTF_TemporalDrift - Game Instance Implementation
// Unreal Engine 5.8

#include "BTTF_GameInstance.h"
#include "Kismet/GameplayStatics.h"
#include "TimeTravelSubsystem.h"

UBTTF_GameInstance::UBTTF_GameInstance()
{
    CurrentSavedTimelineState = ETimelineState::Present1985;
    CurrentSavedParadoxLevel = 0.0f;
    TotalTimeJumpsMade = 0;
}

void UBTTF_GameInstance::Init()
{
    Super::Init();
    // Optional: Auto-load last save on startup
    // LoadGameFromSlot();
}

void UBTTF_GameInstance::Shutdown()
{
    Super::Shutdown();
}

void UBTTF_GameInstance::InitializeNewGame()
{
    CurrentSavedTimelineState = ETimelineState::Present1985;
    CurrentSavedParadoxLevel = 0.0f;
    UnlockedEras.Empty();
    UnlockedEras.Add(ETimelineState::Present1985);
    TotalTimeJumpsMade = 0;
}

void UBTTF_GameInstance::SaveTimelineState()
{
    UTimeTravelSubsystem* Subsystem = GetWorld()->GetSubsystem<UTimeTravelSubsystem>();
    if (!Subsystem) return;

    CurrentSavedTimelineState = Subsystem->GetCurrentEra();
    CurrentSavedParadoxLevel = Subsystem->CurrentParadoxLevel;
    TotalTimeJumpsMade++;

    UE_LOG(LogTemp, Log, TEXT("Timeline state saved. Era: %s, Paradox: %.1f"),
        *UEnum::GetValueAsString(CurrentSavedTimelineState),
        CurrentSavedParadoxLevel);
}

void UBTTF_GameInstance::LoadTimelineState()
{
    UTimeTravelSubsystem* Subsystem = GetWorld()->GetSubsystem<UTimeTravelSubsystem>();
    if (!Subsystem) return;

    Subsystem->CurrentTimelineState = CurrentSavedTimelineState;
    Subsystem->CurrentParadoxLevel = CurrentSavedParadoxLevel;

    UE_LOG(LogTemp, Log, TEXT("Timeline state loaded. Era: %s"), 
        *UEnum::GetValueAsString(CurrentSavedTimelineState));
}

bool UBTTF_GameInstance::SaveGameToSlot(const FString& SlotName)
{
    SaveTimelineState();

    if (!CurrentSaveGame)
    {
        CurrentSaveGame = Cast<UBTTF_SaveGame>(UGameplayStatics::CreateSaveGameObject(UBTTF_SaveGame::StaticClass()));
    }

    if (CurrentSaveGame)
    {
        CurrentSaveGame->SavedTimelineState = CurrentSavedTimelineState;
        CurrentSaveGame->SavedParadoxLevel = CurrentSavedParadoxLevel;
        CurrentSaveGame->UnlockedEras = UnlockedEras;
        CurrentSaveGame->TotalTimeJumps = TotalTimeJumpsMade;
        CurrentSaveGame->LastSaveDate = FDateTime::Now().ToString();

        return UGameplayStatics::SaveGameToSlot(CurrentSaveGame, SlotName, 0);
    }

    return false;
}

bool UBTTF_GameInstance::LoadGameFromSlot(const FString& SlotName)
{
    if (UGameplayStatics::DoesSaveGameExist(SlotName, 0))
    {
        CurrentSaveGame = Cast<UBTTF_SaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, 0));

        if (CurrentSaveGame)
        {
            CurrentSavedTimelineState = CurrentSaveGame->SavedTimelineState;
            CurrentSavedParadoxLevel = CurrentSaveGame->SavedParadoxLevel;
            UnlockedEras = CurrentSaveGame->UnlockedEras;
            TotalTimeJumpsMade = CurrentSaveGame->TotalTimeJumps;

            LoadTimelineState();
            return true;
        }
    }

    return false;
}
