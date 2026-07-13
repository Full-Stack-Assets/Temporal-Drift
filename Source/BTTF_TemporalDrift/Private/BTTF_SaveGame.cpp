// BTTF_SaveGame.cpp
// BTTF_TemporalDrift - Save Game Data Class Implementation
// Unreal Engine 5.8

#include "BTTF_SaveGame.h"

UBTTF_SaveGame::UBTTF_SaveGame()
{
    SchemaVersion = LatestSchemaVersion;
    SavedTimelineState = ETimelineState::Present1985;
    SavedParadoxLevel = 0.0f;
    TotalTimeJumps = 0;
    MasterVolume = 1.0f;
    LastSafeVehicleTransform=FTransform::Identity;
    SavedHeroTransform=FTransform::Identity;
    WorldClock.Era=ETimelineState::Present1985;
    UnlockedEras={ETimelineState::Present1985};
}

bool UBTTF_SaveGame::MigrateToLatestSchema()
{
    if(SchemaVersion<1||SchemaVersion>LatestSchemaVersion)return false;
    if(SchemaVersion<2)
    {
        if(UnlockedEras.IsEmpty())UnlockedEras.Add(ETimelineState::Present1985);
        LastSafeVehicleTransform=FTransform::Identity;SavedHeroTransform=FTransform::Identity;
        SchemaVersion=2;
    }
    if(SchemaVersion<3)
    {
        WorldClock.Era=SavedTimelineState;
        SchemaVersion=3;
    }
    return IsSaveDataValid();
}

bool UBTTF_SaveGame::IsSaveDataValid()const
{
    return SchemaVersion==LatestSchemaVersion&&FMath::IsFinite(SavedParadoxLevel)&&SavedParadoxLevel>=0.0f&&SavedParadoxLevel<=100.0f&&TotalTimeJumps>=0&&HeroProgression.AvailableSkillPoints>=0&&TemporalDrive.PlutoniumCells>=0&&TemporalDrive.FusionFuel>=0.0f&&TemporalDrive.FusionFuel<=100.0f;
}
