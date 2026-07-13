#include "MissionEventVolume.h"
#include "MissionCoordinatorSubsystem.h"
#include "DeLoreanVehicle.h"
#include "BTTFHeroCharacter.h"
#include "GameFramework/Pawn.h"

AMissionEventVolume::AMissionEventVolume()
{
    MissionEventId = NAME_None;
}

void AMissionEventVolume::NotifyActorBeginOverlap(AActor* OtherActor)
{
    Super::NotifyActorBeginOverlap(OtherActor);

    APawn* Pawn = Cast<APawn>(OtherActor);
    if (!Pawn)
    {
        return;
    }

    if (bRequireVehicleOccupant && !Cast<ADeLoreanVehicle>(Pawn))
    {
        return;
    }

    if (!Cast<ADeLoreanVehicle>(Pawn) && !Cast<ABTTFHeroCharacter>(Pawn))
    {
        return;
    }

    FireMissionEvent();
}

bool AMissionEventVolume::FireMissionEvent()
{
    if (MissionEventId.IsNone() || (bFireOnce && bHasFired))
    {
        return false;
    }

    UWorld* World = GetWorld();
    UMissionCoordinatorSubsystem* Coordinator = World ? World->GetSubsystem<UMissionCoordinatorSubsystem>() : nullptr;
    if (!Coordinator || !Coordinator->SubmitMissionEvent(MissionEventId))
    {
        return false;
    }

    bHasFired = true;
    return true;
}
