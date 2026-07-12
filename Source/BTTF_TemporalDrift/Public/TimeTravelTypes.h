#pragma once

#include "CoreMinimal.h"
#include "TimeTravelTypes.generated.h"

UENUM(BlueprintType)
enum class ETimelineState : uint8
{
    Present1985 UMETA(DisplayName = "1985 - Present"),
    Alternate1985 UMETA(DisplayName = "1985 - Alternate"),
    Past1955 UMETA(DisplayName = "1955 - Past"),
    Future2015 UMETA(DisplayName = "2015 - Future"),
    DeepFuture2045 UMETA(DisplayName = "2045 - Deep Future"),
    WildWest1885 UMETA(DisplayName = "1885 - Wild West")
};

UENUM(BlueprintType)
enum class ETimeTravelPhase : uint8
{
    Idle, Armed, Charging, ThresholdReached, Departing, SwitchingEra, Arriving, Cooldown, Failed
};

USTRUCT(BlueprintType)
struct FTimeTravelRequest
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    ETimelineState Destination = ETimelineState::Past1955;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FVector Origin = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float EntrySpeedMph = 0.0f;
};
