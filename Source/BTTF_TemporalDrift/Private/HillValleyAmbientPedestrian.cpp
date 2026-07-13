#include "HillValleyAmbientPedestrian.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "UObject/ConstructorHelpers.h"

AHillValleyAmbientPedestrian::AHillValleyAmbientPedestrian()
{
    PrimaryActorTick.bCanEverTick = true;

    BodyMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BodyMesh"));
    SetRootComponent(BodyMesh);
    BodyMesh->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
    BodyMesh->SetCollisionResponseToAllChannels(ECR_Overlap);

    HeadMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("HeadMesh"));
    HeadMesh->SetupAttachment(BodyMesh);
    HeadMesh->SetRelativeLocation(FVector(0.0f, 0.0f, 95.0f));
    HeadMesh->SetRelativeScale3D(FVector(0.55f));
    HeadMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void AHillValleyAmbientPedestrian::BeginPlay()
{
    Super::BeginPlay();
    EnsureBlockoutMeshes();
    if (WanderRoute.Num() > 0)
    {
        SetActorLocation(WanderRoute[CurrentNodeIndex]);
    }
}

void AHillValleyAmbientPedestrian::EnsureBlockoutMeshes()
{
    if (UStaticMesh* Cylinder = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cylinder.Cylinder")))
    {
        BodyMesh->SetStaticMesh(Cylinder);
        BodyMesh->SetRelativeScale3D(FVector(0.35f, 0.35f, 1.1f));
    }
    if (UStaticMesh* Sphere = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Sphere.Sphere")))
    {
        HeadMesh->SetStaticMesh(Sphere);
    }
}

void AHillValleyAmbientPedestrian::InitializeWander(const TArray<FVector>& RoutePoints, float InWalkSpeed)
{
    WanderRoute = RoutePoints;
    WalkSpeed = FMath::Max(60.0f, InWalkSpeed);
    CurrentNodeIndex = 0;
    if (WanderRoute.Num() > 0)
    {
        SetActorLocation(WanderRoute[0]);
    }
}

void AHillValleyAmbientPedestrian::SetCitizenLabel(const FText& InDisplayName)
{
    DisplayName = InDisplayName;
    if (!InDisplayName.IsEmpty())
    {
        SetActorLabel(InDisplayName.ToString());
    }
}

void AHillValleyAmbientPedestrian::AdvanceToNextNode()
{
    if (WanderRoute.Num() < 2)
    {
        return;
    }
    CurrentNodeIndex = (CurrentNodeIndex + 1) % WanderRoute.Num();
}

void AHillValleyAmbientPedestrian::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if (WanderRoute.Num() < 2 || WalkSpeed <= KINDA_SMALL_NUMBER)
    {
        return;
    }

    const FVector Target = WanderRoute[CurrentNodeIndex];
    FVector Location = GetActorLocation();
    const FVector ToTarget = Target - Location;
    const float Distance = ToTarget.Size2D();
    if (Distance < 80.0f)
    {
        AdvanceToNextNode();
        return;
    }

    const FVector Step = ToTarget.GetSafeNormal2D() * WalkSpeed * DeltaSeconds;
    Location += Step;
    Location.Z = Target.Z;
    SetActorLocation(Location);

    const FRotator Facing(0.0f, Step.Rotation().Yaw, 0.0f);
    SetActorRotation(Facing);
}
