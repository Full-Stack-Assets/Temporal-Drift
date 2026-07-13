#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MissionInteractable.generated.h"

class UBoxComponent;

UCLASS()
class BTTF_TEMPORALDRIFT_API AMissionInteractable : public AActor
{
    GENERATED_BODY()

public:
    AMissionInteractable();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    FName MissionEventId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    FText InteractionPrompt;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    float InteractionRadius = 250.0f;

    UFUNCTION(BlueprintCallable, Category = "Mission")
    bool Interact(AActor* Interactor);

    UFUNCTION(BlueprintPure, Category = "Mission")
    bool CanInteract(AActor* Interactor) const;

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Mission")
    TObjectPtr<UBoxComponent> InteractionBounds;

private:
    bool bConsumed = false;
};
