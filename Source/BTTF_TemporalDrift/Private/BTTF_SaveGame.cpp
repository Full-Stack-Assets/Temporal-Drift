// BTTF_SaveGame.cpp
// BTTF_TemporalDrift - Save Game Data Class Implementation
// Unreal Engine 5.8

#include "BTTF_SaveGame.h"

UBTTF_SaveGame::UBTTF_SaveGame()
{
    SavedTimelineState = ETimelineState::Present1985;
    SavedParadoxLevel = 0.0f;
    TotalTimeJumps = 0;
    MasterVolume = 1.0f;
}
