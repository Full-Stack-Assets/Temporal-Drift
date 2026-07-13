#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "Materials/MaterialInstanceConstant.h"
#include "UObject/SoftObjectPath.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFPhotorealMaterialLibraryTest,
    "BTTF.World.PhotorealMaterialLibraryContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFPhotorealMaterialLibraryTest::RunTest(const FString& Parameters)
{
    static const TCHAR* RequiredInstances[] = {
        TEXT("/Game/Materials/HillValley/M_HV_Asphalt.M_HV_Asphalt"),
        TEXT("/Game/Materials/HillValley/M_HV_Concrete.M_HV_Concrete"),
        TEXT("/Game/Materials/HillValley/M_HV_Brick_Red.M_HV_Brick_Red"),
        TEXT("/Game/Materials/HillValley/M_HV_Window.M_HV_Window"),
        TEXT("/Game/Materials/HillValley/M_HV_Grass.M_HV_Grass"),
        TEXT("/Game/Materials/HillValley/M_HV_Water.M_HV_Water"),
    };

    static const TCHAR* RequiredMasters[] = {
        TEXT("/Game/Materials/PBR/MM_Asphalt.MM_Asphalt"),
        TEXT("/Game/Materials/PBR/MM_Concrete.MM_Concrete"),
        TEXT("/Game/Materials/PBR/MM_Glass.MM_Glass"),
    };

    for (const TCHAR* MasterPath : RequiredMasters)
    {
        TestNotNull(FString::Printf(TEXT("PBR master loads: %s"), MasterPath),
            LoadObject<UMaterialInterface>(nullptr, MasterPath));
    }

    for (const TCHAR* InstancePath : RequiredInstances)
    {
        UMaterialInstanceConstant* Instance =
            LoadObject<UMaterialInstanceConstant>(nullptr, InstancePath);
        TestNotNull(FString::Printf(TEXT("Material instance loads: %s"), InstancePath), Instance);
        if (Instance)
        {
            TestNotNull(TEXT("Instance has valid parent material"), Instance->Parent);
        }
    }

    return !HasAnyErrors();
}

#endif
