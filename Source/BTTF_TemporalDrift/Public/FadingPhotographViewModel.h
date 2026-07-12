#pragma once
#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "FadingPhotographViewModel.generated.h"

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UFadingPhotographViewModel : public UObject
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable) void UpdatePhotograph(float ParadoxPercent, bool bSubjectExists, bool bReducedFlash);
    UPROPERTY(BlueprintReadOnly) float SubjectOpacity = 1.0f;
    UPROPERTY(BlueprintReadOnly) float WarningPulse = 0.0f;
    UPROPERTY(BlueprintReadOnly) bool bCriticalHandFade = false;
    UPROPERTY(BlueprintReadOnly) FText StatusText;
};
