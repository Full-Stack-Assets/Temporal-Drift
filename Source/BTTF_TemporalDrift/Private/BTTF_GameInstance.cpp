// BTTF_GameInstance.cpp
// BTTF_TemporalDrift - Game Instance Implementation
// Unreal Engine 5.8

#include "BTTF_GameInstance.h"
#include "Kismet/GameplayStatics.h"
#include "TimeTravelSubsystem.h"
#include "MissionSubsystem.h"
#include "HeroProgressionSubsystem.h"
#include "TemporalDriveSubsystem.h"
#include "EraWeatherSubsystem.h"
#include "CraftingSubsystem.h"
#include "BTTFHeroCharacter.h"
#include "DeLoreanVehicle.h"
#include "TimeTravelPresentationComponent.h"
#include "BTTF_HUD.h"
#include "TimeCircuitsWidget.h"
#include "GameFramework/PlayerController.h"
#include "EngineUtils.h"

const FString UBTTF_GameInstance::ProfileSlotName = TEXT("BTTF_Profile");

UBTTF_GameInstance::UBTTF_GameInstance()
{
    CurrentSavedTimelineState = ETimelineState::Present1985;
    CurrentSavedParadoxLevel = 0.0f;
    TotalTimeJumpsMade = 0;
}

void UBTTF_GameInstance::Init()
{
    Super::Init();
    EnsureProfileLoaded();
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
    if (CurrentSaveGame)
    {
        CurrentSaveGame->SavedHeroTransform = FTransform::Identity;
        CurrentSaveGame->LastSafeVehicleTransform = FTransform::Identity;
        CurrentSaveGame->bPlayerInVehicle = true;
    }
}

void UBTTF_GameInstance::CapturePlayerState()
{
    if (!CurrentSaveGame)
    {
        CurrentSaveGame = Cast<UBTTF_SaveGame>(UGameplayStatics::CreateSaveGameObject(UBTTF_SaveGame::StaticClass()));
    }
    if (!CurrentSaveGame)
    {
        return;
    }

    UWorld* World = GetWorld();
    APlayerController* Controller = World ? World->GetFirstPlayerController() : nullptr;
    APawn* Pawn = Controller ? Controller->GetPawn() : nullptr;
    if (!Pawn)
    {
        return;
    }

    if (ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(Pawn))
    {
        CurrentSaveGame->bPlayerInVehicle = true;
        CurrentSaveGame->LastSafeVehicleTransform = Vehicle->GetActorTransform();
        return;
    }

    if (ABTTFHeroCharacter* Hero = Cast<ABTTFHeroCharacter>(Pawn))
    {
        CurrentSaveGame->bPlayerInVehicle = false;
        CurrentSaveGame->SavedHeroTransform = Hero->GetActorTransform();
    }
}

void UBTTF_GameInstance::RestorePlayerState()
{
    if (!CurrentSaveGame)
    {
        return;
    }

    UWorld* World = GetWorld();
    APlayerController* Controller = World ? World->GetFirstPlayerController() : nullptr;
    if (!Controller)
    {
        return;
    }

    if (CurrentSaveGame->bPlayerInVehicle)
    {
        if (ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(Controller->GetPawn()))
        {
            if (!CurrentSaveGame->LastSafeVehicleTransform.Equals(FTransform::Identity))
            {
                Vehicle->SetActorTransform(CurrentSaveGame->LastSafeVehicleTransform, false, nullptr, ETeleportType::TeleportPhysics);
            }
        }
        return;
    }

    if (ABTTFHeroCharacter* Hero = Cast<ABTTFHeroCharacter>(Controller->GetPawn()))
    {
        if (!CurrentSaveGame->SavedHeroTransform.Equals(FTransform::Identity))
        {
            Hero->SetActorTransform(CurrentSaveGame->SavedHeroTransform, false, nullptr, ETeleportType::TeleportPhysics);
        }
    }
}

void UBTTF_GameInstance::SaveTimelineState()
{
    UWorld* World=GetWorld();
    UTimeTravelSubsystem* Subsystem = World?World->GetSubsystem<UTimeTravelSubsystem>():nullptr;
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
    UWorld* World=GetWorld();
    UTimeTravelSubsystem* Subsystem = World?World->GetSubsystem<UTimeTravelSubsystem>():nullptr;
    if (!Subsystem) return;

    Subsystem->CurrentTimelineState = CurrentSavedTimelineState;
    Subsystem->CurrentParadoxLevel = CurrentSavedParadoxLevel;

    UE_LOG(LogTemp, Log, TEXT("Timeline state loaded. Era: %s"), 
        *UEnum::GetValueAsString(CurrentSavedTimelineState));
}

bool UBTTF_GameInstance::SaveGameToSlot(const FString& SlotName)
{
    SaveTimelineState();
    CapturePlayerState();

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
        if(UMissionSubsystem* Mission=GetSubsystem<UMissionSubsystem>())CurrentSaveGame->MissionProgress=Mission->GetProgressSnapshot();
        if(UHeroProgressionSubsystem* Hero=GetSubsystem<UHeroProgressionSubsystem>())CurrentSaveGame->HeroProgression=Hero->GetSnapshot();
        if(UTemporalDriveSubsystem* Drive=GetSubsystem<UTemporalDriveSubsystem>())CurrentSaveGame->TemporalDrive=Drive->GetSnapshot();
        if(UEraWeatherSubsystem* Weather=GetSubsystem<UEraWeatherSubsystem>())CurrentSaveGame->WorldClock=Weather->GetWorldClock();
        if(UCraftingSubsystem* Crafting=GetSubsystem<UCraftingSubsystem>())CurrentSaveGame->Crafting=Crafting->GetSnapshot();

        const FString TempSlot=SlotName+TEXT("__tmp");
        UGameplayStatics::DeleteGameInSlot(TempSlot,0);
        if(!UGameplayStatics::SaveGameToSlot(CurrentSaveGame,TempSlot,0))return false;
        UBTTF_SaveGame* Verified=Cast<UBTTF_SaveGame>(UGameplayStatics::LoadGameFromSlot(TempSlot,0));
        if(!Verified||!Verified->MigrateToLatestSchema()){UGameplayStatics::DeleteGameInSlot(TempSlot,0);return false;}
        const bool bSaved=UGameplayStatics::SaveGameToSlot(Verified,SlotName,0);
        UGameplayStatics::DeleteGameInSlot(TempSlot,0);
        return bSaved;
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
            if(!CurrentSaveGame->MigrateToLatestSchema())return false;
            CurrentSavedTimelineState = CurrentSaveGame->SavedTimelineState;
            CurrentSavedParadoxLevel = CurrentSaveGame->SavedParadoxLevel;
            UnlockedEras = CurrentSaveGame->UnlockedEras;
            TotalTimeJumpsMade = CurrentSaveGame->TotalTimeJumps;

            if(UMissionSubsystem* Mission=GetSubsystem<UMissionSubsystem>())
            {
                if(!CurrentSaveGame->MissionProgress.MissionId.IsNone())
                {
                    const FString AssetName=TEXT("DA_Mission_")+CurrentSaveGame->MissionProgress.MissionId.ToString().Replace(TEXT("."),TEXT("_"));
                    const FString Path=FString::Printf(TEXT("/Game/Data/Missions/Campaign/%s.%s"),*AssetName,*AssetName);
                    if(UMissionDataAsset* Data=LoadObject<UMissionDataAsset>(nullptr,*Path))Mission->RestoreProgress(Data,CurrentSaveGame->MissionProgress);
                }
            }
            if(UHeroProgressionSubsystem* Hero=GetSubsystem<UHeroProgressionSubsystem>())Hero->RestoreSnapshot(CurrentSaveGame->HeroProgression);
            if(UTemporalDriveSubsystem* Drive=GetSubsystem<UTemporalDriveSubsystem>())Drive->RestoreSnapshot(CurrentSaveGame->TemporalDrive);
            if(UEraWeatherSubsystem* Weather=GetSubsystem<UEraWeatherSubsystem>())Weather->SetWorldClock(CurrentSaveGame->WorldClock);

            LoadTimelineState();
            RestorePlayerState();
            return true;
        }
    }

    return false;
}

bool UBTTF_GameInstance::EnsureProfileLoaded()
{
    if (ProfileSave)
    {
        return true;
    }

    if (UGameplayStatics::DoesSaveGameExist(ProfileSlotName, 0))
    {
        ProfileSave = Cast<UBTTF_ProfileSaveGame>(UGameplayStatics::LoadGameFromSlot(ProfileSlotName, 0));
    }

    if (!ProfileSave)
    {
        ProfileSave = Cast<UBTTF_ProfileSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UBTTF_ProfileSaveGame::StaticClass()));
    }

    return ProfileSave != nullptr;
}

bool UBTTF_GameInstance::LoadProfileSettings()
{
    ProfileSave = nullptr;
    return EnsureProfileLoaded();
}

bool UBTTF_GameInstance::SaveProfileSettings()
{
    if (!EnsureProfileLoaded())
    {
        return false;
    }

    return UGameplayStatics::SaveGameToSlot(ProfileSave, ProfileSlotName, 0);
}

void UBTTF_GameInstance::SetReducedFlashEnabled(bool bEnabled)
{
    if (!EnsureProfileLoaded())
    {
        return;
    }

    ProfileSave->bReducedFlash = bEnabled;
    SaveProfileSettings();
    ApplyProfileAccessibility(GetWorld());
}

bool UBTTF_GameInstance::IsReducedFlashEnabled() const
{
    return ProfileSave && ProfileSave->bReducedFlash;
}

float UBTTF_GameInstance::GetUIScale() const
{
    return ProfileSave ? ProfileSave->UIScale : 1.0f;
}

void UBTTF_GameInstance::ApplyProfileAccessibility(UWorld* World)
{
    if (!World || !EnsureProfileLoaded())
    {
        return;
    }

    for (TActorIterator<ADeLoreanVehicle> It(World); It; ++It)
    {
        if (It->TimeTravelPresentationComponent)
        {
            It->TimeTravelPresentationComponent->SetReducedFlash(ProfileSave->bReducedFlash);
        }
    }

    if (APlayerController* Controller = World->GetFirstPlayerController())
    {
        if (ABTTF_HUD* HUD = Cast<ABTTF_HUD>(Controller->GetHUD()))
        {
            HUD->ApplyAccessibilitySettings(ProfileSave->UIScale);
        }
    }
}
