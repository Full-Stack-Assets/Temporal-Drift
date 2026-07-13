#include "VehicleInteractionComponent.h"
#include "BTTFHeroCharacter.h"
#include "DeLoreanVehicle.h"
#include "KeyboardCameraComponent.h"
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
    if (!Hero || !Controller || !CanEnterVehicle(Vehicle))
    {
        return false;
    }

    Hero->SetActorHiddenInGame(true);
    Hero->SetActorEnableCollision(false);
    Hero->SetActorTickEnabled(false);
    Hero->AttachToActor(Vehicle, FAttachmentTransformRules::KeepWorldTransform);
    Controller->Possess(Vehicle);
    LastExitFailureReason.Reset();
    return true;
}

bool UVehicleInteractionComponent::ExitVehicle(ADeLoreanVehicle* Vehicle)
{
    ABTTFHeroCharacter* Hero = Cast<ABTTFHeroCharacter>(GetOwner());
    APlayerController* Controller = Vehicle ? Cast<APlayerController>(Vehicle->GetController()) : nullptr;
    LastExitFailureReason.Reset();

    if (!Hero || !Controller || !Hero->GetWorld())
    {
        LastExitFailureReason = TEXT("Exit failed: invalid hero or controller.");
        return false;
    }

    const FVector Right = Vehicle->GetActorRightVector();
    const FVector Forward = Vehicle->GetActorForwardVector();
    const FVector BaseLocation = Vehicle->GetActorLocation() + FVector(0.0f, 0.0f, 60.0f);
    const FVector Candidates[] = {
        BaseLocation + Right * ExitSideOffset,
        BaseLocation - Right * ExitSideOffset,
        BaseLocation - Forward * ExitBehindOffset};

    FCollisionQueryParams Params(SCENE_QUERY_STAT(VehicleExit), false, Hero);
    Params.AddIgnoredActor(Vehicle);

    FVector ExitLocation = Candidates[0];
    bool bFound = false;
    for (const FVector& Candidate : Candidates)
    {
        const FCollisionShape Shape = FCollisionShape::MakeCapsule(
            Hero->GetCapsuleComponent()->GetScaledCapsuleRadius(),
            Hero->GetCapsuleComponent()->GetScaledCapsuleHalfHeight());
        if (!Hero->GetWorld()->OverlapBlockingTestByChannel(
                Candidate, FQuat::Identity, ECC_Pawn, Shape, Params))
        {
            ExitLocation = Candidate;
            bFound = true;
            break;
        }
    }

    if (!bFound)
    {
        LastExitFailureReason = TEXT("Exit blocked — clear space on the sides or behind the DeLorean.");
        return false;
    }

    Hero->DetachFromActor(FDetachmentTransformRules::KeepWorldTransform);
    Hero->SetActorLocation(ExitLocation, false, nullptr, ETeleportType::TeleportPhysics);
    Hero->SetActorHiddenInGame(false);
    Hero->SetActorEnableCollision(true);
    Hero->SetActorTickEnabled(true);
    Controller->Possess(Hero);

    if (UKeyboardCameraComponent* Camera = Hero->FindComponentByClass<UKeyboardCameraComponent>())
    {
        Camera->ResetCameraState();
    }

    LastExitFailureReason.Reset();
    return true;
}
