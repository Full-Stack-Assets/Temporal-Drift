#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Curves/CurveFloat.h"
#include "DeLoreanTuningData.generated.h"

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UDeLoreanTuningData : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UDeLoreanTuningData();

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Mass")
    float MassKg = 1320.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Engine")
    float MaxRPM = 6500.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Engine")
    float MaxTorqueNm = 500.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Engine")
    FRuntimeFloatCurve TorqueCurve;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Transmission")
    TArray<float> ForwardGearRatios;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Transmission")
    float ReverseGearRatio = -2.9f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Transmission")
    float FinalDriveRatio = 3.44f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Suspension")
    float SuspensionMaxRaiseCm = 10.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Suspension")
    float SuspensionMaxDropCm = 18.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Handling")
    float TargetTopSpeedMph = 125.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Handling")
    float MaxSteerAngleDegrees = 40.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Handling")
    float ChassisDragCoefficient = 0.32f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Handling")
    float BrakeTorqueNm = 2800.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
    float ChaseBaseFov = 90.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
    float ChaseHighSpeedFov = 99.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
    float ChaseHighSpeedMph = 65.0f;
};
