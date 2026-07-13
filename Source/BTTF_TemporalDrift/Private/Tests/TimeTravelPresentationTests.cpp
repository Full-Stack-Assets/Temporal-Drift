#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "TimeTravelPresentationComponent.h"
#include "Materials/Material.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeTravelPresentationContract,
    "BTTF.Presentation.TimeTravelPhaseContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeTravelPresentationContract::RunTest(const FString& Parameters)
{
    UTimeTravelPresentationComponent* Presentation = NewObject<UTimeTravelPresentationComponent>();
    TestNotNull(TEXT("Presentation component can be created"), Presentation);
    if (!Presentation)
    {
        return false;
    }

    Presentation->SetReducedFlash(true);
    TestTrue(TEXT("Reduced flash setting is retained"), Presentation->IsReducedFlashEnabled());
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Charging);
    TestEqual(TEXT("Charging phase is exposed"), Presentation->GetPresentationPhase(), ETimeTravelPhase::Charging);
    TestTrue(TEXT("Charging cue is active"), Presentation->IsCueActive());
    TestEqual(TEXT("Reduced-flash charging intensity is capped"), Presentation->GetCueIntensity(), 0.35f);
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Cooldown);
    TestEqual(TEXT("Cooldown phase is exposed"), Presentation->GetPresentationPhase(), ETimeTravelPhase::Cooldown);
    TestEqual(TEXT("Reduced-flash cooldown intensity is restrained"), Presentation->GetCueIntensity(), 0.15f);
    Presentation->SetReducedFlash(false);
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Departing);
    TestEqual(TEXT("Full departure intensity is available"), Presentation->GetCueIntensity(), 1.0f);
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Idle);
    TestFalse(TEXT("Idle has no active cue"), Presentation->IsCueActive());
    TestEqual(TEXT("Idle intensity is zero"), Presentation->GetCueIntensity(), 0.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeTravelPresentationAssets,
    "BTTF.Presentation.PresentationAssetsLoad",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeTravelPresentationAssets::RunTest(const FString& Parameters)
{
    const TCHAR* Paths[] = {
        TEXT("/Game/Materials/PostProcess/M_TemporalDistortion.M_TemporalDistortion"),
        TEXT("/Game/Materials/PostProcess/M_TemporalDistortion_ReducedFlash.M_TemporalDistortion_ReducedFlash"),
        TEXT("/Game/Materials/PostProcess/M_TemporalArrivalFrost.M_TemporalArrivalFrost")
    };
    for (const TCHAR* Path : Paths)
    {
        TestNotNull(FString::Printf(TEXT("Presentation asset loads: %s"), Path), LoadObject<UMaterial>(nullptr, Path));
    }
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeTravelPresentationPhaseAssetsTest,
    "BTTF.Presentation.PhaseAssetContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeTravelPresentationPhaseAssetsTest::RunTest(const FString& Parameters)
{
    UTimeTravelPresentationComponent* Presentation = NewObject<UTimeTravelPresentationComponent>();
    const ETimeTravelPhase Phases[] = {
        ETimeTravelPhase::Charging,
        ETimeTravelPhase::Departing,
        ETimeTravelPhase::Arriving,
        ETimeTravelPhase::Cooldown
    };

    for (ETimeTravelPhase Phase : Phases)
    {
        TestFalse(FString::Printf(TEXT("Phase %d has Niagara path"), static_cast<int32>(Phase)),
            Presentation->GetPhaseNiagaraPath(Phase).IsNull());
        TestFalse(FString::Printf(TEXT("Phase %d has audio path"), static_cast<int32>(Phase)),
            Presentation->GetPhaseAudioPath(Phase).IsNull());
    }

    Presentation->HandlePhaseChanged(ETimeTravelPhase::Departing);
    TestFalse(TEXT("Distortion material path assigned"), Presentation->GetActiveDistortionMaterialPath().IsNull());
    Presentation->SetReducedFlash(true);
    TestTrue(TEXT("Reduced-flash distortion path selected"),
        Presentation->GetActiveDistortionMaterialPath().ToString().Contains(TEXT("ReducedFlash")));
    Presentation->SetPresentationEnabled(false);
    TestFalse(TEXT("Presentation disable clears cue"), Presentation->IsCueActive());
    TestEqual(TEXT("Presentation disable clears intensity"), Presentation->GetCueIntensity(), 0.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeTravelPresentationArmedNoPostProcessTest,
    "BTTF.Presentation.ArmedPhaseDoesNotFullscreenDistort",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeTravelPresentationArmedNoPostProcessTest::RunTest(const FString& Parameters)
{
    const UTimeTravelPresentationComponent* Presentation = GetDefault<UTimeTravelPresentationComponent>();
    const bool bArmedAppliesPostProcess =
        Presentation->ShouldApplyPostProcessForPhase(ETimeTravelPhase::Armed);
    const bool bChargingAppliesPostProcess =
        Presentation->ShouldApplyPostProcessForPhase(ETimeTravelPhase::Charging);
    const bool bDepartureAppliesPostProcess =
        Presentation->ShouldApplyPostProcessForPhase(ETimeTravelPhase::Departing);
    const bool bArrivalAppliesPostProcess =
        Presentation->ShouldApplyPostProcessForPhase(ETimeTravelPhase::Arriving);

    TestFalse(TEXT("Arming time circuits does not apply fullscreen post-process"),
        bArmedAppliesPostProcess);
    TestFalse(TEXT("Charging flux does not apply fullscreen post-process"),
        bChargingAppliesPostProcess);
    TestTrue(TEXT("Departure still allows temporal post-process"),
        bDepartureAppliesPostProcess);
    TestTrue(TEXT("Arrival still allows arrival post-process"),
        bArrivalAppliesPostProcess);
    return !HasAnyErrors();
}

#endif
