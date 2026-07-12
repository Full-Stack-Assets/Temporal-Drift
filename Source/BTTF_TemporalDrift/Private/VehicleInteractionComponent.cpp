#include "VehicleInteractionComponent.h"
#include "BTTFHeroCharacter.h"
#include "DeLoreanVehicle.h"
#include "GameFramework/PlayerController.h"
#include "Components/CapsuleComponent.h"
#include "Engine/World.h"

bool UVehicleInteractionComponent::CanEnterVehicle(const ADeLoreanVehicle* Vehicle) const
{
    const AActor* Owner = GetOwner();
    return Owner && Vehicle && FVector::DistSquared(Owner->GetActorLocation(), Vehicle->GetActorLocation()) <= FMath::Square(InteractionRange);
}

bool UVehicleInteractionComponent::EnterVehicle(ADeLoreanVehicle* Vehicle)
{
    ABTTFHeroCharacter* Hero = Cast<ABTTFHeroCharacter>(GetOwner());
    APlayerController* Controller = Hero ? Cast<APlayerController>(Hero->GetController()) : nullptr;
    if (!Hero || !Controller || !CanEnterVehicle(Vehicle)) return false;
    Hero->SetActorHiddenInGame(true);
    Hero->SetActorEnableCollision(false);
    Hero->SetActorTickEnabled(false);
    Hero->AttachToActor(Vehicle, FAttachmentTransformRules::KeepWorldTransform);
    Controller->Possess(Vehicle);
    return true;
}

bool UVehicleInteractionComponent::ExitVehicle(ADeLoreanVehicle* Vehicle)
{
    ABTTFHeroCharacter* Hero = Cast<ABTTFHeroCharacter>(GetOwner());
    APlayerController* Controller = Vehicle ? Cast<APlayerController>(Vehicle->GetController()) : nullptr;
    if (!Hero || !Controller || !Hero->GetWorld()) return false;

    const FVector Right = Vehicle->GetActorRightVector();
    const FVector Candidates[] = {
        Vehicle->GetActorLocation() + Right * ExitSideOffset + FVector(0,0,60),
        Vehicle->GetActorLocation() - Right * ExitSideOffset + FVector(0,0,60)};
    FCollisionQueryParams Params(SCENE_QUERY_STAT(VehicleExit), false, Hero);
    FVector ExitLocation = Candidates[0];
    bool bFound = false;
    for (const FVector& Candidate : Candidates)
    {
        const FCollisionShape Shape = FCollisionShape::MakeCapsule(
            Hero->GetCapsuleComponent()->GetScaledCapsuleRadius(),
            Hero->GetCapsuleComponent()->GetScaledCapsuleHalfHeight());
        if (!Hero->GetWorld()->OverlapBlockingTestByChannel(Candidate, FQuat::Identity, ECC_Pawn, Shape, Params))
        {
            ExitLocation = Candidate; bFound = true; break;
        }
    }
    if (!bFound) return false;
    Hero->DetachFromActor(FDetachmentTransformRules::KeepWorldTransform);
    Hero->SetActorLocation(ExitLocation, false, nullptr, ETeleportType::TeleportPhysics);
    Hero->SetActorHiddenInGame(false);
    Hero->SetActorEnableCollision(true);
    Hero->SetActorTickEnabled(true);
    Controller->Possess(Hero);
    return true;
}
