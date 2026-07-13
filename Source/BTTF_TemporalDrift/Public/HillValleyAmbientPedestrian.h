#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HillValleyAmbientPedestrian.generated.h"

class UStaticMeshComponent;

UCLASS()
class BTTF_TEMPORALDRIFT_API AHillValleyAmbientPedestrian : public AActor
{
    GENERATED_BODY()

public:
    AHillValleyAmbientPedestrian();

    UFUNCTION(BlueprintCallable, Category="Population")
    void InitializeWander(const TArray<FVector>& RoutePoints, float InWalkSpeed = 180.0f);

    UFUNCTION(BlueprintCallable, Category="Population")
    void SetCitizenLabel(const FText& InDisplayName);

    UFUNCTION(BlueprintPure, Category="Population")
    FName GetCitizenId() const { return CitizenId; }

protected:
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;

private:
    void AdvanceToNextNode();
    void EnsureBlockoutMeshes();

    UPROPERTY(VisibleAnywhere, Category="Population")
    TObjectPtr<UStaticMeshComponent> BodyMesh;

    UPROPERTY(VisibleAnywhere, Category="Population")
    TObjectPtr<UStaticMeshComponent> HeadMesh;

    UPROPERTY()
    TArray<FVector> WanderRoute;

    UPROPERTY()
    int32 CurrentNodeIndex = 0;

    UPROPERTY()
    float WalkSpeed = 180.0f;

    UPROPERTY()
    FName CitizenId = NAME_None;

    UPROPERTY()
    FText DisplayName;
};
