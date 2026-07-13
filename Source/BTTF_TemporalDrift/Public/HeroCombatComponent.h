#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HeroCombatComponent.generated.h"

USTRUCT(BlueprintType)
struct FCombatSnapshot
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float Health=100.0f;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float Stamina=100.0f;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bGuarding=false;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bIncapacitated=false;
};

UCLASS(ClassGroup=(Gameplay),meta=(BlueprintSpawnableComponent))
class BTTF_TEMPORALDRIFT_API UHeroCombatComponent:public UActorComponent
{
    GENERATED_BODY()
public:
    UHeroCombatComponent();
    UFUNCTION(BlueprintCallable) float ApplyNonLethalDamage(float Amount,bool bEnvironmental=false);
    UFUNCTION(BlueprintCallable) bool BeginGuard();
    UFUNCTION(BlueprintCallable) void EndGuard();
    UFUNCTION(BlueprintCallable) bool Dodge();
    UFUNCTION(BlueprintCallable) void Recover(float DeltaSeconds);
    UFUNCTION(BlueprintCallable) void ResetAtCheckpoint();
    UFUNCTION(BlueprintPure) FCombatSnapshot GetSnapshot()const{return State;}
    UPROPERTY(EditAnywhere,BlueprintReadOnly) float GuardDamageMultiplier=0.3f;
    UPROPERTY(EditAnywhere,BlueprintReadOnly) float DodgeStaminaCost=25.0f;
private:
    UPROPERTY() FCombatSnapshot State;
};
