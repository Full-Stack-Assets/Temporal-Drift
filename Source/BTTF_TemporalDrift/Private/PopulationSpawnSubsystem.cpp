#include "PopulationSpawnSubsystem.h"

#include "EraPopulationManager.h"
#include "EraWorldManager.h"
#include "HillValleyAmbientPedestrian.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

void UPopulationSpawnSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    if (UEraWorldManager* EraManager = GetWorld()->GetSubsystem<UEraWorldManager>())
    {
        EraManager->OnEraReady.AddDynamic(this, &UPopulationSpawnSubsystem::HandleEraReady);
        ActiveEra = EraManager->GetActiveEra();
    }
}

void UPopulationSpawnSubsystem::Deinitialize()
{
    ClearSpawnedPopulation();
    Super::Deinitialize();
}

void UPopulationSpawnSubsystem::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    if (!bAnchorsCollected)
    {
        CollectWorldAnchors();
    }
    if (ActivePedestrians.IsEmpty() && PedestrianNodes.Num() > 0)
    {
        RefreshPopulationForEra(ActiveEra);
    }
}

TStatId UPopulationSpawnSubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UPopulationSpawnSubsystem, STATGROUP_Tickables);
}

void UPopulationSpawnSubsystem::HandleEraReady(ETimelineState ReadyEra)
{
    RefreshPopulationForEra(ReadyEra);
}

void UPopulationSpawnSubsystem::CollectWorldAnchors()
{
    PedestrianNodes.Reset();
    NamedCitizenNodes.Reset();

    TArray<AActor*> MarkerActors;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(), TEXT("HV_PedestrianNode"), MarkerActors);
    for (AActor* Actor : MarkerActors)
    {
        if (!IsValid(Actor))
        {
            continue;
        }
        PedestrianNodes.Add(Actor->GetActorLocation());

        for (const FName Tag : Actor->Tags)
        {
            const FString TagString = Tag.ToString();
            if (TagString.StartsWith(TEXT("HV_Citizen_")))
            {
                const FName CitizenId(*TagString.RightChop(11));
                NamedCitizenNodes.Add(CitizenId, Actor->GetActorLocation());
            }
        }
    }

    bAnchorsCollected = PedestrianNodes.Num() > 0 || NamedCitizenNodes.Num() > 0;
}

void UPopulationSpawnSubsystem::ClearSpawnedPopulation()
{
    for (AHillValleyAmbientPedestrian* Pedestrian : ActivePedestrians)
    {
        if (IsValid(Pedestrian))
        {
            Pedestrian->Destroy();
        }
    }
    ActivePedestrians.Reset();
}

bool UPopulationSpawnSubsystem::IsWithinSpawnRadius(const FVector& Location) const
{
    if (APlayerController* Controller = UGameplayStatics::GetPlayerController(GetWorld(), 0))
    {
        if (APawn* Pawn = Controller->GetPawn())
        {
            return FVector::DistSquared(Location, Pawn->GetActorLocation()) <= FMath::Square(SpawnRadiusAroundPlayer);
        }
    }
    return true;
}

TArray<FVector> UPopulationSpawnSubsystem::BuildWanderRoute(const FVector& Origin, int32 PointCount) const
{
    TArray<FVector> Route;
    if (PedestrianNodes.IsEmpty())
    {
        Route.Add(Origin);
        return Route;
    }

    Route.Add(Origin);
    int32 BestIndex = 0;
    float BestDistance = MAX_FLT;
    for (int32 Index = 0; Index < PedestrianNodes.Num(); ++Index)
    {
        const float Distance = FVector::DistSquared(Origin, PedestrianNodes[Index]);
        if (Distance < BestDistance)
        {
            BestDistance = Distance;
            BestIndex = Index;
        }
    }

    for (int32 Step = 1; Step <= FMath::Max(1, PointCount); ++Step)
    {
        const int32 NodeIndex = (BestIndex + Step) % PedestrianNodes.Num();
        Route.Add(PedestrianNodes[NodeIndex]);
    }
    return Route;
}

void UPopulationSpawnSubsystem::SpawnNamedCitizens()
{
    UEraPopulationManager* Population = GetWorld()->GetSubsystem<UEraPopulationManager>();
    if (!Population)
    {
        return;
    }

    for (const TPair<FName, FVector>& Entry : NamedCitizenNodes)
    {
        if (!Population->ReserveNamedCitizen(Entry.Key, Entry.Value))
        {
            continue;
        }

        AHillValleyAmbientPedestrian* Pedestrian = GetWorld()->SpawnActor<AHillValleyAmbientPedestrian>(
            AHillValleyAmbientPedestrian::StaticClass(), Entry.Value, FRotator::ZeroRotator);
        if (!Pedestrian)
        {
            Population->ReleaseNamedCitizen(Entry.Key);
            continue;
        }

        Pedestrian->SetCitizenLabel(FText::FromName(Entry.Key));
        Pedestrian->InitializeWander(BuildWanderRoute(Entry.Value, 3), 120.0f);
        ActivePedestrians.Add(Pedestrian);
    }
}

void UPopulationSpawnSubsystem::SpawnAmbientPopulation(ETimelineState Era)
{
    UEraPopulationManager* Population = GetWorld()->GetSubsystem<UEraPopulationManager>();
    if (!Population || PedestrianNodes.IsEmpty())
    {
        return;
    }

    Population->SetActiveEra(Era);
    const FEraPopulationProfile Profile = Population->GetActiveProfile();
    int32 Spawned = 0;
    const int32 TargetCount = FMath::Min(Profile.MaxPedestrians / 2, MaxAmbientPedestriansNearPlayer);

    for (int32 Index = 0; Index < PedestrianNodes.Num() && Spawned < TargetCount; ++Index)
    {
        const FVector Node = PedestrianNodes[Index];
        if (!IsWithinSpawnRadius(Node))
        {
            continue;
        }
        if (!Population->ReserveAmbientPedestrian(Node))
        {
            continue;
        }

        AHillValleyAmbientPedestrian* Pedestrian = GetWorld()->SpawnActor<AHillValleyAmbientPedestrian>(
            AHillValleyAmbientPedestrian::StaticClass(), Node, FRotator::ZeroRotator);
        if (!Pedestrian)
        {
            Population->ReleaseAmbientPedestrian();
            continue;
        }

        Pedestrian->InitializeWander(BuildWanderRoute(Node, 4), 160.0f);
        ActivePedestrians.Add(Pedestrian);
        ++Spawned;
    }
}

void UPopulationSpawnSubsystem::RefreshPopulationForEra(ETimelineState Era)
{
    ActiveEra = Era;
    ClearSpawnedPopulation();
    CollectWorldAnchors();
    SpawnNamedCitizens();
    SpawnAmbientPopulation(Era);
}
