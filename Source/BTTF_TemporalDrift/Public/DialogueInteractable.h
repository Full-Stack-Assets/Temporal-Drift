#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DialogueInteractable.generated.h"

class UDialogueDataAsset;
class UBoxComponent;

UCLASS()
class BTTF_TEMPORALDRIFT_API ADialogueInteractable : public AActor
{
    GENERATED_BODY()

public:
    ADialogueInteractable();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
    TObjectPtr<UDialogueDataAsset> ConversationAsset;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
    float InteractionRadius = 320.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
    bool bFireOnce = true;

    UFUNCTION(BlueprintCallable, Category = "Dialogue")
    bool TryStartConversation(AActor* Interactor);

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UBoxComponent> InteractionBounds;

    bool bConsumed = false;
};
