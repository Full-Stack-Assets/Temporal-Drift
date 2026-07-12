// DeLoreanWheel.h - Chaos wheel setups for the DeLorean
#pragma once

#include "CoreMinimal.h"
#include "ChaosVehicleWheel.h"
#include "DeLoreanWheel.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API UDeLoreanWheelFront : public UChaosVehicleWheel
{
    GENERATED_BODY()

public:
    UDeLoreanWheelFront();
};

UCLASS()
class BTTF_TEMPORALDRIFT_API UDeLoreanWheelRear : public UChaosVehicleWheel
{
    GENERATED_BODY()

public:
    UDeLoreanWheelRear();
};
