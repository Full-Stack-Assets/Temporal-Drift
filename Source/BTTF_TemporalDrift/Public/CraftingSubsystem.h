#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Engine/DataAsset.h"
#include "TimeTravelTypes.h"
#include "CraftingSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FCraftingIngredient
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName ItemId;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Quantity=1;
};

USTRUCT(BlueprintType)
struct FCraftingRecipe
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName RecipeId;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TArray<FCraftingIngredient> Ingredients;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName OutputItemId;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 OutputQuantity=1;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TArray<ETimelineState> AllowedEras;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName RequiredSkillId;
};

USTRUCT(BlueprintType)
struct FCraftingSnapshot
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TMap<FName,int32> ItemQuantities;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TArray<FName> UnlockedRecipeIds;
};

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UCraftingRecipeDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Crafting")
    TArray<FCraftingRecipe> Recipes;
};

UCLASS()
class BTTF_TEMPORALDRIFT_API UCraftingSubsystem:public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable) bool LoadRecipes(const TArray<FCraftingRecipe>& NewRecipes);
    UFUNCTION(BlueprintCallable) bool AddItem(FName ItemId,int32 Quantity);
    UFUNCTION(BlueprintCallable) bool RemoveItem(FName ItemId,int32 Quantity);
    UFUNCTION(BlueprintPure) int32 GetItemQuantity(FName ItemId)const;
    UFUNCTION(BlueprintCallable) bool UnlockRecipe(FName RecipeId);
    UFUNCTION(BlueprintPure) bool CanCraft(FName RecipeId,ETimelineState Era,const TArray<FName>& UnlockedSkills,FText& Reason)const;
    UFUNCTION(BlueprintCallable) bool Craft(FName RecipeId,ETimelineState Era,const TArray<FName>& UnlockedSkills);
    UFUNCTION(BlueprintPure) FCraftingSnapshot GetSnapshot()const{return State;}
    UFUNCTION(BlueprintCallable) bool RestoreSnapshot(const FCraftingSnapshot& Snapshot);
private:
    UPROPERTY() TMap<FName,FCraftingRecipe> Recipes;
    UPROPERTY() FCraftingSnapshot State;
};
