#include "HeroCombatComponent.h"
UHeroCombatComponent::UHeroCombatComponent(){PrimaryComponentTick.bCanEverTick=false;}
float UHeroCombatComponent::ApplyNonLethalDamage(float Amount,bool bEnvironmental)
{
    if(Amount<=0.0f||State.bIncapacitated)return 0.0f;
    const float Applied=Amount*(State.bGuarding&&!bEnvironmental?GuardDamageMultiplier:1.0f);
    State.Health=FMath::Clamp(State.Health-Applied,0.0f,100.0f);State.bIncapacitated=State.Health<=0.0f;return Applied;
}
bool UHeroCombatComponent::BeginGuard(){if(State.bIncapacitated||State.Stamina<=0.0f)return false;State.bGuarding=true;return true;}
void UHeroCombatComponent::EndGuard(){State.bGuarding=false;}
bool UHeroCombatComponent::Dodge(){if(State.bIncapacitated||State.Stamina<DodgeStaminaCost)return false;State.Stamina-=DodgeStaminaCost;State.bGuarding=false;return true;}
void UHeroCombatComponent::Recover(float DeltaSeconds){if(DeltaSeconds<=0.0f||State.bIncapacitated)return;State.Stamina=FMath::Min(100.0f,State.Stamina+DeltaSeconds*18.0f);State.Health=FMath::Min(100.0f,State.Health+DeltaSeconds*2.0f);}
void UHeroCombatComponent::ResetAtCheckpoint(){State=FCombatSnapshot();}
