#include "HillValleyWorldValidator.h"

#include "Engine/Level.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "GameFramework/PlayerStart.h"
#include "WorldPartition/WorldPartition.h"

const TMap<FName, int32>& UHillValleyWorldValidator::GetRequiredTagMinimums()
{
    static const TMap<FName, int32> Requirements = {
        {TEXT("HV_District_Civic"), 1},
        {TEXT("HV_District_Commercial"), 2},
        {TEXT("HV_District_Residential"), 16},
        {TEXT("HV_District_School"), 1},
        {TEXT("HV_District_Industrial"), 4},
        {TEXT("HV_District_Rural"), 1},
        {TEXT("HV_Road"), 10},
        {TEXT("HV_Sidewalk"), 12},
        {TEXT("HV_Crossing"), 6},
        {TEXT("HV_Landscape"), 30},
        {TEXT("HV_Foliage"), 40},
        {TEXT("HV_Building"), 45},
        {TEXT("HV_DestinationSign"), 6},
        {TEXT("HV_Interior"), 5},
        {TEXT("HV_Navigation"), 10},
        {TEXT("HV_TrafficRoute"), 5},
        {TEXT("HV_ResetVolume"), 4},
    };
    return Requirements;
}

FHillValleyValidationReport UHillValleyWorldValidator::ValidateWorld(UWorld* World)
{
    FHillValleyValidationReport Report;
    if (!World)
    {
        Report.Failures.Add(TEXT("Hill Valley world is null"));
        return Report;
    }

    TSet<FString> DestinationSignNames;
    int32 PlayerStartCount = 0;
    FBox RegionBounds(EForceInit::ForceInit);

    for (ULevel* Level : World->GetLevels())
    {
        if (!Level)
        {
            continue;
        }
        for (AActor* Actor : Level->Actors)
        {
            if (!IsValid(Actor))
            {
                continue;
            }
            if (Actor->IsA<APlayerStart>())
            {
                ++PlayerStartCount;
            }
            for (const FName Tag : Actor->Tags)
            {
                Report.TagCounts.FindOrAdd(Tag)++;
                if (Tag == TEXT("HV_DestinationSign"))
                {
                    const FString StableName = Actor->GetName();
                    if (DestinationSignNames.Contains(StableName))
                    {
                        Report.Failures.Add(FString::Printf(TEXT("Duplicate destination sign name: %s"), *StableName));
                    }
                    DestinationSignNames.Add(StableName);
                }
            }
            if (Actor->Tags.Contains(TEXT("HV_Generated")))
            {
                RegionBounds += Actor->GetActorLocation();
            }
        }
    }

    for (const TPair<FName, int32>& Requirement : GetRequiredTagMinimums())
    {
        const int32 Actual = Report.TagCounts.FindRef(Requirement.Key);
        if (Actual < Requirement.Value)
        {
            Report.Failures.Add(FString::Printf(TEXT("%s: expected at least %d, found %d"),
                *Requirement.Key.ToString(), Requirement.Value, Actual));
        }
    }

    if (PlayerStartCount < 1)
    {
        Report.Failures.Add(TEXT("PlayerStart is missing"));
    }
    if (!World->GetWorldPartition())
    {
        Report.Failures.Add(TEXT("World Partition is not enabled"));
    }
    if (!RegionBounds.IsValid || RegionBounds.GetSize().X < 30000.0 || RegionBounds.GetSize().Y < 35000.0)
    {
        Report.Failures.Add(TEXT("Playable region does not cover the required town and rural bounds"));
    }

    static const TCHAR* RequiredAssets[] = {
        TEXT("/Game/Data/DataLayers/DL_1955.DL_1955"),
        TEXT("/Game/Data/DataLayers/DL_1985_Present.DL_1985_Present"),
        TEXT("/Game/Materials/HillValley/M_HV_Asphalt.M_HV_Asphalt"),
        TEXT("/Game/Materials/HillValley/M_HV_Grass.M_HV_Grass"),
    };
    for (const TCHAR* AssetPath : RequiredAssets)
    {
        if (!FSoftObjectPath(AssetPath).TryLoad())
        {
            Report.Failures.Add(FString::Printf(TEXT("Missing required world asset: %s"), AssetPath));
        }
    }

    Report.bPassed = Report.Failures.IsEmpty();
    return Report;
}
