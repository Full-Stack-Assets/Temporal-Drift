#pragma once

#include "CoreMinimal.h"
#include "Engine/TriggerVolume.h"
#include "MissionEventVolume.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API AMissionEventVolume : public ATriggerVolume
{
    GENERATED_BODY()

public:
    AMissionEventVolume();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    FName MissionEventId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    bool bFireOnce = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    bool bRequireVehicleOccupant = false;

    UFUNCTION(BlueprintCallable, Category = "Mission")
    bool FireMissionEvent();

protected:
    virtual void NotifyActorBeginOverlap(AActor* OtherActor) override;

private:
    bool bHasFired = false;
};
