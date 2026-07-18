#pragma once

#include "CoreMinimal.h"
#include "TemporalKernel/TemporalKernelTypes.h"

class UTemporalKernelSubsystem;

struct BTTF_TEMPORALDRIFT_API FClockTowerScenario
{
    static bool Install(UTemporalKernelSubsystem* Kernel, FString& OutError);
    static FTemporalTransactionResult SubmitDisturbance(UTemporalKernelSubsystem* Kernel);
};
