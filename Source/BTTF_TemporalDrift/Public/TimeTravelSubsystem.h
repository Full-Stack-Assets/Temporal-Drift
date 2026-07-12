// TimeTravelSubsystem.h - Fully Expanded Version with Paradox, Hawking Radiation & Tipler Cylinder
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "TimeTravelTypes.h"
#include "TimeTravelSubsystem.generated.h"

class ADeLoreanVehicle;
class UEraDataAsset;

UENUM(BlueprintType)
enum class EParadoxLevel : uint8
{
    Stable, MinorRipple, Unstable, Dangerous, Collapse
};

USTRUCT(BlueprintType)
struct FTimelineFlags
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Timeline")
    bool bCanChangePast = true;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Timeline")
    bool bParadoxRisk = false;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Timeline")
    float CurrentParadoxLevel = 0.0f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTimelineInstability, float, ParadoxLevel);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnTimeTravelCompleted);

UCLASS(Blueprintable, BlueprintType)
class BTTF_TEMPORALDRIFT_API UTimeTravelSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    UTimeTravelSubsystem();

    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    // Tickable interface - drives passive paradox decay
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override;

    // ==================== FLUX CAPACITOR ENERGY SYSTEM ====================
    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Flux Capacitor")
    float CurrentFluxEnergy;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flux Capacitor")
    float FluxCapacitorMaxEnergy = 1210.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flux Capacitor")
    float EnergyPerSecondAt88mph = 45.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flux Capacitor")
    float EnergyDrainOnJump = 1150.0f;

    UFUNCTION(BlueprintPure, Category = "Flux Capacitor")
    float GetFluxChargePercent() const;

    UFUNCTION(BlueprintPure, Category = "Flux Capacitor")
    bool HasEnoughEnergyForJump() const;

    UFUNCTION(BlueprintCallable, Category = "Flux Capacitor")
    void AddFluxEnergy(float Amount);

    UFUNCTION(BlueprintCallable, Category = "Flux Capacitor")
    void ConsumeEnergyForTimeTravel();

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void SetTimeCircuitsArmed(bool bArmed);

    UFUNCTION(BlueprintPure, Category = "Time Travel")
    ETimeTravelPhase GetTimeTravelPhase() const { return TimeTravelPhase; }

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    bool RequestTimeTravel(const FTimeTravelRequest& Request);

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    bool AdvanceTimeTravelPhase();

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void ResetTimeTravelState();

    // ==================== TIMELINE STATE ====================
    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Timeline")
    ETimelineState CurrentTimelineState;

    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Timeline")
    ETimelineState PreviousTimelineState;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Timeline")
    FTimelineFlags TimelineFlags;

    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Timeline")
    int32 TotalJumpsMade = 0;

    UFUNCTION(BlueprintPure, Category = "Timeline")
    bool CanPerformTimeTravel(const ADeLoreanVehicle* DeLorean) const;

    UFUNCTION(BlueprintCallable, Category = "Timeline")
    void PerformTimeTravel(ADeLoreanVehicle* DeLorean, ETimelineState TargetEra, UEraDataAsset* EraData = nullptr);

    UFUNCTION(BlueprintPure, Category = "Timeline")
    ETimelineState GetCurrentEra() const;

    UFUNCTION(BlueprintPure, Category = "Timeline")
    FString GetCurrentEraName() const;

    // ==================== PARADOX SYSTEM ====================
    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Paradox")
    float MaxParadoxLevel = 100.0f;

    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Paradox")
    float CurrentParadoxLevel = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Paradox")
    float ParadoxIncreasePerMajorChange = 15.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Paradox")
    float ParadoxDecayRatePerMinute = 2.0f;

    UFUNCTION(BlueprintCallable, Category = "Paradox")
    void ApplyParadoxFromAction(float Severity);

    UFUNCTION(BlueprintCallable, Category = "Paradox")
    void UpdateParadoxOverTime(float DeltaTime);

    UFUNCTION(BlueprintPure, Category = "Paradox")
    EParadoxLevel GetCurrentParadoxLevelEnum() const;

    UFUNCTION(BlueprintPure, Category = "Paradox")
    FString GetParadoxStatusText() const;

    UPROPERTY(BlueprintAssignable, Category = "Events")
    FOnTimelineInstability OnTimelineInstability;

    UPROPERTY(BlueprintAssignable, Category = "Events")
    FOnTimeTravelCompleted OnTimeTravelCompleted;

    // ==================== HAWKING RADIATION ====================
    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Hawking Radiation")
    float WormholeStability = 100.0f;

    UFUNCTION(BlueprintCallable, Category = "Hawking Radiation")
    void ApplyHawkingRadiationFeedback(float JumpRisk);

    // ==================== TIPLER CYLINDER ====================
    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Tipler Cylinder")
    float TiplerCharge = 0.0f;

    UFUNCTION(BlueprintCallable, Category = "Tipler Cylinder")
    void ChargeTiplerCylinder(float Amount);

    UFUNCTION(BlueprintCallable, Category = "Tipler Cylinder")
    bool TryTiplerJump(ETimelineState TargetEra);

    // Debug
    UFUNCTION(BlueprintCallable, Category = "Debug")
    void DebugDrawFluxStatus(const ADeLoreanVehicle* DeLorean) const;

private:
    void UpdateTimelineFlagsInternal(ETimelineState NewEra);

    // Single authoritative paradox mutation path: clamps, syncs flags, broadcasts.
    void AddParadoxInternal(float Amount);

    // Shared jump core used by both flux-capacitor and Tipler jump paths.
    void ExecuteJumpInternal(ETimelineState TargetEra, UEraDataAsset* EraData);

    FTimerHandle TimeTravelResetHandle;
    bool bIsTimeTraveling = false;

    UPROPERTY(VisibleAnywhere, Category = "Time Travel")
    ETimeTravelPhase TimeTravelPhase = ETimeTravelPhase::Idle;

    FTimeTravelRequest ActiveTravelRequest;
    bool bTimeCircuitsArmed = false;
};
