#include "DialogueInteractable.h"
#include "Components/BoxComponent.h"
#include "DialogueSubsystem.h"
#include "BTTFHeroCharacter.h"
#include "Engine/GameInstance.h"

ADialogueInteractable::ADialogueInteractable()
{
    PrimaryActorTick.bCanEverTick = false;
    InteractionBounds = CreateDefaultSubobject<UBoxComponent>(TEXT("InteractionBounds"));
    RootComponent = InteractionBounds;
    InteractionBounds->SetBoxExtent(FVector(160.0f, 160.0f, 120.0f));
    InteractionBounds->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
    InteractionBounds->SetCollisionResponseToAllChannels(ECR_Ignore);
    InteractionBounds->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
}

void ADialogueInteractable::BeginPlay()
{
    Super::BeginPlay();
}

bool ADialogueInteractable::TryStartConversation(AActor* Interactor)
{
    if (!Interactor || !ConversationAsset || (bFireOnce && bConsumed))
    {
        return false;
    }

    if (FVector::DistSquared(Interactor->GetActorLocation(), GetActorLocation()) > FMath::Square(InteractionRadius))
    {
        return false;
    }

    UGameInstance* GameInstance = GetWorld() ? GetWorld()->GetGameInstance() : nullptr;
    UDialogueSubsystem* Dialogue = GameInstance ? GameInstance->GetSubsystem<UDialogueSubsystem>() : nullptr;
    if (!Dialogue || !Dialogue->StartConversation(ConversationAsset))
    {
        return false;
    }

    bConsumed = true;
    return true;
}
