#include "MissionInteractable.h"
#include "Components/BoxComponent.h"
#include "MissionCoordinatorSubsystem.h"

void AMissionInteractable::BeginPlay()
{
    Super::BeginPlay();
    if (!MissionEventId.IsNone())
    {
        return;
    }

    for (const FName& Tag : Tags)
    {
        const FString TagString = Tag.ToString();
        if (TagString.StartsWith(TEXT("MissionEvent_")))
        {
            MissionEventId = FName(*TagString.RightChop(13));
            break;
        }
    }
}

AMissionInteractable::AMissionInteractable()
{
    PrimaryActorTick.bCanEverTick = false;
    InteractionBounds = CreateDefaultSubobject<UBoxComponent>(TEXT("InteractionBounds"));
    RootComponent = InteractionBounds;
    InteractionBounds->SetBoxExtent(FVector(120.0f, 120.0f, 120.0f));
    InteractionBounds->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
    InteractionBounds->SetCollisionResponseToAllChannels(ECR_Ignore);
    InteractionBounds->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
}

bool AMissionInteractable::CanInteract(AActor* Interactor) const
{
    return !bConsumed && Interactor && MissionEventId != NAME_None
        && FVector::DistSquared(Interactor->GetActorLocation(), GetActorLocation()) <= FMath::Square(InteractionRadius);
}

bool AMissionInteractable::Interact(AActor* Interactor)
{
    if (!CanInteract(Interactor))
    {
        return false;
    }

    UMissionCoordinatorSubsystem* Coordinator = GetWorld() ? GetWorld()->GetSubsystem<UMissionCoordinatorSubsystem>() : nullptr;
    if (!Coordinator || !Coordinator->SubmitMissionEvent(MissionEventId))
    {
        return false;
    }

    bConsumed = true;
    return true;
}
