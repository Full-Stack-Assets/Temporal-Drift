#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "VehicleInteractionComponent.generated.h"

class ADeLoreanVehicle;
class ABTTFHeroCharacter;

UCLASS(ClassGroup=(Interaction), meta=(BlueprintSpawnableComponent))
class BTTF_TEMPORALDRIFT_API UVehicleInteractionComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Vehicle")
    float InteractionRange = 350.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Vehicle")
    float ExitSideOffset = 160.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Vehicle")
    float ExitBehindOffset = 220.0f;

    UFUNCTION(BlueprintPure, Category="Vehicle")
    bool CanEnterVehicle(const ADeLoreanVehicle* Vehicle) const;

    UFUNCTION(BlueprintCallable, Category="Vehicle")
    bool EnterVehicle(ADeLoreanVehicle* Vehicle);

    UFUNCTION(BlueprintCallable, Category="Vehicle")
    bool ExitVehicle(ADeLoreanVehicle* Vehicle);

    UFUNCTION(BlueprintPure, Category="Vehicle")
    FString GetLastExitFailureReason() const { return LastExitFailureReason; }

private:
    UPROPERTY(Transient)
    FString LastExitFailureReason;
};
