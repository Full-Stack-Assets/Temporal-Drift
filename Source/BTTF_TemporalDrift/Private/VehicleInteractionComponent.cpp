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

bool UVehicleInteractionComponent::AttemptVehicleExit(AActor* DriverActor, FTransform& OutSafeTransform)
{
    ABTTFHeroCharacter* Hero = Cast<ABTTFHeroCharacter>(GetOwner());
    if (!Hero || DriverActor != Hero)
    {
        return false;
    }

    ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(Hero->GetAttachParentActor());
    if (!Vehicle)
    {
        return false;
    }

    FVector ExitLocation;
    FRotator ExitRotation;
    if (!TryFindSafeExitTransform(Vehicle, Hero, ExitLocation, ExitRotation))
    {
        return false;
    }

    OutSafeTransform = FTransform(ExitRotation, ExitLocation);
    return true;
}

bool UVehicleInteractionComponent::TryFindSafeExitTransform(
    ADeLoreanVehicle* Vehicle,
    ABTTFHeroCharacter* Hero,
    FVector& OutLocation,
    FRotator& OutRotation) const
{
    if (!Vehicle || !Hero || !Hero->GetWorld())
    {
        return false;
    }

    const UCapsuleComponent* Capsule = Hero->GetCapsuleComponent();
    const float CapsuleRadius = Capsule ? Capsule->GetScaledCapsuleRadius() : 42.0f;
    const float CapsuleHalfHeight = Capsule ? Capsule->GetScaledCapsuleHalfHeight() : 96.0f;
    const FVector FootOffset = FVector(0.0f, 0.0f, CapsuleHalfHeight + 2.0f);

    const FVector Right = Vehicle->GetActorRightVector();
    const FVector Forward = Vehicle->GetActorForwardVector();
    const FVector Up = Vehicle->GetActorUpVector();
    const FVector BaseLocation = Vehicle->GetActorLocation() + FVector(0.0f, 0.0f, 60.0f);
    const FVector Candidates[] = {
        BaseLocation + Right * ExitSideOffset,
        BaseLocation - Right * ExitSideOffset,
        BaseLocation - Forward * ExitBehindOffset};

    FCollisionQueryParams Params(SCENE_QUERY_STAT(VehicleExit), false, Hero);
    Params.AddIgnoredActor(Vehicle);

    const FCollisionShape SweepShape = FCollisionShape::MakeBox(
        FVector(CapsuleRadius, CapsuleRadius, CapsuleHalfHeight));
    const FCollisionShape OverlapShape = FCollisionShape::MakeCapsule(CapsuleRadius, CapsuleHalfHeight);

    for (const FVector& Candidate : Candidates)
    {
        const FVector SweepStart = Candidate + Up * 50.0f;
        const FVector GroundTraceEnd = SweepStart - Up * 150.0f;

        FHitResult SweepHit;
        const bool bSweepBlocked = Hero->GetWorld()->SweepSingleByChannel(
            SweepHit,
            SweepStart,
            SweepStart,
            FQuat::Identity,
            ECC_Pawn,
            SweepShape,
            Params);

        if (bSweepBlocked)
        {
            continue;
        }

        if (Hero->GetWorld()->OverlapBlockingTestByChannel(
                Candidate, FQuat::Identity, ECC_Pawn, OverlapShape, Params))
        {
            continue;
        }

        FHitResult GroundHit;
        if (Hero->GetWorld()->LineTraceSingleByChannel(
                GroundHit, SweepStart, GroundTraceEnd, ECC_Visibility, Params))
        {
            OutLocation = GroundHit.Location + FootOffset;
            OutRotation = Vehicle->GetActorRotation();
            OutRotation.Roll = 0.0f;
            return true;
        }

        OutLocation = Candidate;
        OutRotation = Vehicle->GetActorRotation();
        OutRotation.Roll = 0.0f;
        return true;
    }

    return false;
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

    FVector ExitLocation;
    FRotator ExitRotation;
    if (!TryFindSafeExitTransform(Vehicle, Hero, ExitLocation, ExitRotation))
    {
        LastExitFailureReason = TEXT("Exit blocked — clear space on the sides or behind the DeLorean.");
        return false;
    }

    Hero->DetachFromActor(FDetachmentTransformRules::KeepWorldTransform);
    Hero->SetActorLocation(ExitLocation, false, nullptr, ETeleportType::TeleportPhysics);
    Hero->SetActorRotation(ExitRotation);
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
