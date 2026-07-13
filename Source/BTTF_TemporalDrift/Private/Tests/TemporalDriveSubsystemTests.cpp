#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "TemporalDriveSubsystem.h"
#include "Engine/GameInstance.h"
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTemporalDriveTest,"BTTF.Vehicle.TemporalDriveFuelAndDates",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFTemporalDriveTest::RunTest(const FString& Parameters)
{
    UGameInstance* GI=NewObject<UGameInstance>();UTemporalDriveSubsystem* System=NewObject<UTemporalDriveSubsystem>(GI);FText Error;ETimelineState Era;
    FTemporalDestinationDate Mistyped;Mistyped.Year=1956;Mistyped.Month=11;Mistyped.Day=12;
    TestTrue(TEXT("Valid one-digit mistype honored"),System->ResolveDestinationEra(Mistyped,Era));TestEqual(TEXT("Mistype routes to 1955-era content"),Era,ETimelineState::Past1955);
    FTemporalDestinationDate Invalid=Mistyped;Invalid.Month=2;Invalid.Day=30;TestFalse(TEXT("Impossible date rejected"),System->ValidateDestinationDate(Invalid,Error));
    System->AddPlutoniumCells(2);TestFalse(TEXT("Below 40 MPH is rejected"),System->CanPowerJump(ETemporalFuelType::Plutonium,39.9f,Mistyped,Error));
    TestTrue(TEXT("40 MPH powers valid jump"),System->CanPowerJump(ETemporalFuelType::Plutonium,40.0f,Mistyped,Error));TestTrue(TEXT("Fuel consumed"),System->ConsumeJumpFuel(ETemporalFuelType::Plutonium));TestEqual(TEXT("One cell remains"),System->GetSnapshot().PlutoniumCells,1);
    System->SetMrFusionInstalled(true);System->AddFusionFuel(25.0f);TestTrue(TEXT("Mr Fusion powers jump"),System->CanPowerJump(ETemporalFuelType::MrFusion,90.0f,Mistyped,Error));System->ConsumeJumpFuel(ETemporalFuelType::MrFusion);TestEqual(TEXT("Fusion cost exact"),System->GetSnapshot().FusionFuel,15.0f);
    System->ArmLightningCapture(true);TestTrue(TEXT("Lightning consumed once"),System->ConsumeJumpFuel(ETemporalFuelType::Lightning));TestFalse(TEXT("Lightning cannot duplicate"),System->ConsumeJumpFuel(ETemporalFuelType::Lightning));

    const FTemporalDestinationDate Default1955 = UTemporalDriveSubsystem::GetDefaultDateForEra(ETimelineState::Past1955);
    TestEqual(TEXT("1955 default year"), Default1955.Year, 1955);
    TestEqual(TEXT("1955 default month"), Default1955.Month, 11);
    TestEqual(TEXT("1955 default day"), Default1955.Day, 12);
    TestEqual(TEXT("1955 default hour"), Default1955.Hour, 22);
    TestEqual(TEXT("1955 default minute"), Default1955.Minute, 4);

    const FText Formatted = UTemporalDriveSubsystem::FormatDestinationDate(Default1955);
    TestEqual(TEXT("Film date formats for HUD"),
        Formatted.ToString(), FString(TEXT("NOV 12 1955 10:04 PM")));

    const FTemporalDestinationDate Default1985 = UTemporalDriveSubsystem::GetDefaultDateForEra(ETimelineState::Present1985);
    TestEqual(TEXT("1985 default formats"),
        UTemporalDriveSubsystem::FormatDestinationDate(Default1985).ToString(),
        FString(TEXT("OCT 26 1985 12:00 PM")));

    return !HasAnyErrors();
}
#endif
