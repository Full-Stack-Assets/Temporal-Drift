#include "CraftingSubsystem.h"

bool UCraftingSubsystem::LoadRecipes(const TArray<FCraftingRecipe>& NewRecipes)
{
    Recipes.Reset();
    for(const FCraftingRecipe& Recipe:NewRecipes)
    {
        if(Recipe.RecipeId.IsNone()||Recipe.OutputItemId.IsNone()||Recipe.OutputQuantity<1||Recipe.Ingredients.IsEmpty()||Recipes.Contains(Recipe.RecipeId))return false;
        for(const FCraftingIngredient& Ingredient:Recipe.Ingredients)if(Ingredient.ItemId.IsNone()||Ingredient.Quantity<1)return false;
        Recipes.Add(Recipe.RecipeId,Recipe);
    }
    return !Recipes.IsEmpty();
}

bool UCraftingSubsystem::AddItem(FName ItemId,int32 Quantity){if(ItemId.IsNone()||Quantity<1)return false;State.ItemQuantities.FindOrAdd(ItemId)+=Quantity;return true;}
bool UCraftingSubsystem::RemoveItem(FName ItemId,int32 Quantity){if(ItemId.IsNone()||Quantity<1||GetItemQuantity(ItemId)<Quantity)return false;int32& Current=State.ItemQuantities.FindChecked(ItemId);Current-=Quantity;if(Current==0)State.ItemQuantities.Remove(ItemId);return true;}
int32 UCraftingSubsystem::GetItemQuantity(FName ItemId)const{return State.ItemQuantities.FindRef(ItemId);}
bool UCraftingSubsystem::UnlockRecipe(FName RecipeId){if(!Recipes.Contains(RecipeId))return false;State.UnlockedRecipeIds.AddUnique(RecipeId);State.UnlockedRecipeIds.Sort(FNameLexicalLess());return true;}

bool UCraftingSubsystem::CanCraft(FName RecipeId,ETimelineState Era,const TArray<FName>& UnlockedSkills,FText& Reason)const
{
    const FCraftingRecipe* Recipe=Recipes.Find(RecipeId);
    if(!Recipe||!State.UnlockedRecipeIds.Contains(RecipeId)){Reason=FText::FromString(TEXT("Recipe is locked."));return false;}
    if(!Recipe->AllowedEras.IsEmpty()&&!Recipe->AllowedEras.Contains(Era)){Reason=FText::FromString(TEXT("Recipe cannot be built in this era."));return false;}
    if(!Recipe->RequiredSkillId.IsNone()&&!UnlockedSkills.Contains(Recipe->RequiredSkillId)){Reason=FText::FromString(TEXT("Required tinkering skill is missing."));return false;}
    for(const FCraftingIngredient& Ingredient:Recipe->Ingredients)if(GetItemQuantity(Ingredient.ItemId)<Ingredient.Quantity){Reason=FText::FromString(TEXT("Required materials are missing."));return false;}
    Reason=FText::GetEmpty();return true;
}

bool UCraftingSubsystem::Craft(FName RecipeId,ETimelineState Era,const TArray<FName>& UnlockedSkills)
{
    FText Reason;if(!CanCraft(RecipeId,Era,UnlockedSkills,Reason))return false;
    const FCraftingRecipe Recipe=Recipes.FindChecked(RecipeId);
    for(const FCraftingIngredient& Ingredient:Recipe.Ingredients)RemoveItem(Ingredient.ItemId,Ingredient.Quantity);
    return AddItem(Recipe.OutputItemId,Recipe.OutputQuantity);
}

bool UCraftingSubsystem::RestoreSnapshot(const FCraftingSnapshot& Snapshot)
{
    for(const TPair<FName,int32>& Pair:Snapshot.ItemQuantities)if(Pair.Key.IsNone()||Pair.Value<0)return false;
    for(FName RecipeId:Snapshot.UnlockedRecipeIds)if(!Recipes.Contains(RecipeId))return false;
    State=Snapshot;State.UnlockedRecipeIds.Sort(FNameLexicalLess());return true;
}
