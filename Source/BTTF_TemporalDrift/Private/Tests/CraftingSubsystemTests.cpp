#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "CraftingSubsystem.h"
#include "Engine/GameInstance.h"
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFCraftingTest,"BTTF.Crafting.EraRecipes",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFCraftingTest::RunTest(const FString& Parameters)
{
    FCraftingRecipe Workaround;Workaround.RecipeId=TEXT("1885.TemporalRegulator");Workaround.OutputItemId=TEXT("Part.TemporalRegulator");Workaround.OutputQuantity=1;Workaround.AllowedEras={ETimelineState::WildWest1885};Workaround.RequiredSkillId=TEXT("Tinkering.FrontierEngineering");Workaround.Ingredients={{TEXT("Material.CopperWire"),3},{TEXT("Material.ClockSpring"),2}};
    FCraftingRecipe Fusion;Fusion.RecipeId=TEXT("2045.PortableMrFusion");Fusion.OutputItemId=TEXT("Gadget.PortableMrFusion");Fusion.AllowedEras={ETimelineState::DeepFuture2045};Fusion.RequiredSkillId=TEXT("Tinkering.FusionSystems");Fusion.Ingredients={{TEXT("Material.FusionCell"),1},{TEXT("Material.Nanoglass"),2}};
    UGameInstance* GI=NewObject<UGameInstance>();UCraftingSubsystem* System=NewObject<UCraftingSubsystem>(GI);TestTrue(TEXT("Recipes load"),System->LoadRecipes({Workaround,Fusion}));System->UnlockRecipe(Workaround.RecipeId);System->AddItem(TEXT("Material.CopperWire"),3);System->AddItem(TEXT("Material.ClockSpring"),2);
    FText Reason;TestFalse(TEXT("Wrong era rejected"),System->CanCraft(Workaround.RecipeId,ETimelineState::Present1985,{TEXT("Tinkering.FrontierEngineering")},Reason));TestFalse(TEXT("Missing skill rejected"),System->CanCraft(Workaround.RecipeId,ETimelineState::WildWest1885,{},Reason));
    TestTrue(TEXT("1885 workaround crafts"),System->Craft(Workaround.RecipeId,ETimelineState::WildWest1885,{TEXT("Tinkering.FrontierEngineering")}));TestEqual(TEXT("Output added"),System->GetItemQuantity(TEXT("Part.TemporalRegulator")),1);TestEqual(TEXT("Ingredients consumed"),System->GetItemQuantity(TEXT("Material.CopperWire")),0);
    FCraftingSnapshot Saved=System->GetSnapshot();UGameInstance* GI2=NewObject<UGameInstance>();UCraftingSubsystem* Restored=NewObject<UCraftingSubsystem>(GI2);Restored->LoadRecipes({Workaround,Fusion});TestTrue(TEXT("Inventory restores"),Restored->RestoreSnapshot(Saved));TestEqual(TEXT("Output persists"),Restored->GetItemQuantity(TEXT("Part.TemporalRegulator")),1);
    return !HasAnyErrors();
}
#endif
