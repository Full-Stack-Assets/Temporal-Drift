#include "HillValleyWorldValidator.h"

#include "Engine/Level.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "GameFramework/PlayerStart.h"
#include "WorldPartition/WorldPartition.h"

const TMap<FName, int32>& UHillValleyWorldValidator::GetRequiredTagMinimums()
{
    static     const TMap<FName, int32> Requirements = {
        {TEXT("HV_District_Civic"), 6},
        {TEXT("HV_District_Commercial"), 4},
        {TEXT("HV_District_Residential"), 48},
        {TEXT("HV_District_School"), 3},
        {TEXT("HV_District_Industrial"), 12},
        {TEXT("HV_District_Rural"), 8},
        {TEXT("HV_Road"), 18},
        {TEXT("HV_Sidewalk"), 12},
        {TEXT("HV_Crossing"), 10},
        {TEXT("HV_Landscape"), 80},
        {TEXT("HV_Foliage"), 100},
        {TEXT("HV_Building"), 120},
        {TEXT("HV_DestinationSign"), 12},
        {TEXT("HV_Interior"), 8},
        {TEXT("HV_Infrastructure"), 6},
        {TEXT("HV_Navigation"), 40},
        {TEXT("HV_PedestrianNode"), 40},
        {TEXT("HV_NamedCitizen"), 4},
        {TEXT("HV_TrafficRoute"), 15},
        {TEXT("HV_ResetVolume"), 8},
        {TEXT("HV_Metro"), 20},
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
    if (!RegionBounds.IsValid || RegionBounds.GetSize().X < 70000.0 || RegionBounds.GetSize().Y < 80000.0)
    {
        Report.Failures.Add(TEXT("Playable region does not cover the required metro town and rural bounds"));
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
