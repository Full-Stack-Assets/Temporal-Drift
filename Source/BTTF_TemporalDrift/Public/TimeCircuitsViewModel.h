#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "TimeTravelTypes.h"
#include "TemporalDriveSubsystem.h"
#include "TimeCircuitsViewModel.generated.h"

USTRUCT(BlueprintType)
struct FTimeCircuitsDisplayState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly) FText SpeedText;
    UPROPERTY(BlueprintReadOnly) FText FluxText;
    UPROPERTY(BlueprintReadOnly) FText CurrentEraText;
    UPROPERTY(BlueprintReadOnly) FText DestinationEraText;
    UPROPERTY(BlueprintReadOnly) FText PhaseText;
    UPROPERTY(BlueprintReadOnly) FText WarningText;
    UPROPERTY(BlueprintReadOnly) FText MissionObjectiveText;
    UPROPERTY(BlueprintReadOnly) FText NowPlayingText;
    UPROPERTY(BlueprintReadOnly) FText PhotographStatusText;
    UPROPERTY(BlueprintReadOnly) FText DestinationDateText;
    UPROPERTY(BlueprintReadOnly) FText LightningCountdownText;
    UPROPERTY(BlueprintReadOnly) FText ConsequenceSummaryText;
    UPROPERTY(BlueprintReadOnly) float PhotographOpacity = 1.0f;
    UPROPERTY(BlueprintReadOnly) float FluxPercent = 0.0f;
    UPROPERTY(BlueprintReadOnly) bool bJumpReady = false;
    UPROPERTY(BlueprintReadOnly) bool bDangerWarning = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTimeCircuitsDisplayChanged,
    FTimeCircuitsDisplayState, DisplayState);

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UTimeCircuitsViewModel : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category="Time Circuits")
    void UpdateDisplay(float SpeedMph, float FluxPercent, ETimelineState CurrentEra,
        ETimelineState DestinationEra, ETimeTravelPhase Phase, float ParadoxPercent,
        float StabilityPercent, const FText& ExplicitFailureReason,
        const FText& MissionObjective = FText::GetEmpty(),
        const FText& NowPlaying = FText::GetEmpty(),
        const FText& PhotographStatus = FText::GetEmpty(),
        float PhotographOpacity = 1.0f,
        const FText& DestinationDate = FText::GetEmpty(),
        const FText& LightningCountdown = FText::GetEmpty(),
        const FText& ConsequenceSummary = FText::GetEmpty());

    UFUNCTION(BlueprintPure, Category="Time Circuits")
    FTimeCircuitsDisplayState GetDisplayState() const { return DisplayState; }

    UFUNCTION(BlueprintPure, Category="Time Circuits")
    ETimelineState CycleDestination(ETimelineState CurrentDestination, int32 Direction) const;

    UPROPERTY(BlueprintAssignable, Category="Time Circuits")
    FOnTimeCircuitsDisplayChanged OnDisplayChanged;

private:
    static FText FormatEra(ETimelineState Era);
    static FText FormatPhase(ETimeTravelPhase Phase);

    UPROPERTY()
    FTimeCircuitsDisplayState DisplayState;
};

