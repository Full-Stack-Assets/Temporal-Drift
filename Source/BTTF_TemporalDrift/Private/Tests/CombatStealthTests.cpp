#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "HeroCombatComponent.h"
#include "HeroStealthComponent.h"
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFCombatStealthTest,"BTTF.Hero.CombatAndStealth",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFCombatStealthTest::RunTest(const FString& Parameters)
{
    UHeroCombatComponent* Combat=NewObject<UHeroCombatComponent>();TestTrue(TEXT("Guard begins"),Combat->BeginGuard());TestEqual(TEXT("Guard reduces nonlethal damage"),Combat->ApplyNonLethalDamage(20.0f),6.0f);TestTrue(TEXT("Dodge spends stamina"),Combat->Dodge());TestEqual(TEXT("Dodge cost exact"),Combat->GetSnapshot().Stamina,75.0f);Combat->ApplyNonLethalDamage(200.0f,true);TestTrue(TEXT("Hero incapacitates without death"),Combat->GetSnapshot().bIncapacitated);Combat->ResetAtCheckpoint();TestEqual(TEXT("Checkpoint restores health"),Combat->GetSnapshot().Health,100.0f);
    UHeroStealthComponent* Stealth=NewObject<UHeroStealthComponent>();const float Normal=Stealth->CalculateDetectionRate(ETimelineState::WildWest1885,50,50,NAME_None,false);const float Poncho=Stealth->CalculateDetectionRate(ETimelineState::WildWest1885,50,50,TEXT("Outfit.EastwoodPoncho"),false);TestTrue(TEXT("Poncho reduces 1885 detection"),Poncho<Normal);const float Suit=Stealth->CalculateDetectionRate(ETimelineState::Past1955,50,50,TEXT("Outfit.RadiationSuit"),false);TestTrue(TEXT("Radiation suit alarms 1955"),Suit>Normal);const float ReenactorDrone=Stealth->CalculateDetectionRate(ETimelineState::DeepFuture2045,50,50,TEXT("Outfit.2045Reenactor"),true);TestTrue(TEXT("2045 disguise spoofs drones"),ReenactorDrone<Normal);Stealth->UpdateAwareness(50,2.0f);TestTrue(TEXT("Awareness reaches detection"),Stealth->IsDetected());
    return !HasAnyErrors();
}
#endif
