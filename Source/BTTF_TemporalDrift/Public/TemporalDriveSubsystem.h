#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "TimeTravelTypes.h"
#include "TemporalDriveSubsystem.generated.h"

UENUM(BlueprintType)
enum class ETemporalFuelType:uint8 { Plutonium,Lightning,MrFusion };

USTRUCT(BlueprintType)
struct FTemporalDestinationDate
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Year=1955;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Month=11;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Day=12;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Hour=22;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Minute=4;
};

USTRUCT(BlueprintType)
struct FTemporalDriveSnapshot
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 PlutoniumCells=0;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float FusionFuel=0.0f;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bLightningCaptureArmed=false;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bMrFusionInstalled=false;
};

UCLASS()
class BTTF_TEMPORALDRIFT_API UTemporalDriveSubsystem:public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintPure) bool ValidateDestinationDate(const FTemporalDestinationDate& Date,FText& Error)const;
    UFUNCTION(BlueprintPure) bool ResolveDestinationEra(const FTemporalDestinationDate& Date,ETimelineState& Era)const;
    UFUNCTION(BlueprintCallable) void AddPlutoniumCells(int32 Count);
    UFUNCTION(BlueprintCallable) void AddFusionFuel(float Amount);
    UFUNCTION(BlueprintCallable) void SetMrFusionInstalled(bool bInstalled);
    UFUNCTION(BlueprintCallable) void ArmLightningCapture(bool bArmed);
    UFUNCTION(BlueprintPure) bool CanPowerJump(ETemporalFuelType Fuel,float SpeedMph,const FTemporalDestinationDate& Date,FText& Error)const;
    UFUNCTION(BlueprintCallable) bool ConsumeJumpFuel(ETemporalFuelType Fuel);
    UFUNCTION(BlueprintPure) FTemporalDriveSnapshot GetSnapshot()const{return State;}
    UFUNCTION(BlueprintCallable) bool RestoreSnapshot(const FTemporalDriveSnapshot& Snapshot);
private:
    UPROPERTY() FTemporalDriveSnapshot State;
};
