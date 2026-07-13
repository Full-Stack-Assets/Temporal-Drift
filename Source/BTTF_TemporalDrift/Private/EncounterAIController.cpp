#include "EncounterAIController.h"

#include "Perception/AIPerceptionComponent.h"
#include "Perception/AISenseConfig_Sight.h"
#include "Perception/AISenseConfig_Hearing.h"
#include "Perception/AISense_Sight.h"

#include "BTTFHeroCharacter.h"
#include "HeroStealthComponent.h"

AEncounterAIController::AEncounterAIController()
{
    EncounterPerception = CreateDefaultSubobject<UAIPerceptionComponent>(TEXT("EncounterPerception"));
    SightConfig = CreateDefaultSubobject<UAISenseConfig_Sight>(TEXT("SightConfig"));
    HearingConfig = CreateDefaultSubobject<UAISenseConfig_Hearing>(TEXT("HearingConfig"));

    if (SightConfig)
    {
        SightConfig->SightRadius = SightRadius;
        SightConfig->LoseSightRadius = LoseSightRadius;
        SightConfig->PeripheralVisionAngleDegrees = PeripheralVisionAngleDegrees;
        SightConfig->DetectionByAffiliation.bDetectEnemies = true;
        SightConfig->DetectionByAffiliation.bDetectNeutrals = true;
        SightConfig->DetectionByAffiliation.bDetectFriendlies = false;
    }

    if (HearingConfig)
    {
        HearingConfig->HearingRange = HearingRange;
        HearingConfig->DetectionByAffiliation.bDetectEnemies = true;
        HearingConfig->DetectionByAffiliation.bDetectNeutrals = true;
        HearingConfig->DetectionByAffiliation.bDetectFriendlies = false;
    }

    if (EncounterPerception)
    {
        if (SightConfig)
        {
            EncounterPerception->ConfigureSense(*SightConfig);
            EncounterPerception->SetDominantSense(SightConfig->GetSenseImplementation());
        }
        if (HearingConfig)
        {
            EncounterPerception->ConfigureSense(*HearingConfig);
        }
        SetPerceptionComponent(*EncounterPerception);
    }
}

void AEncounterAIController::BeginPlay()
{
    Super::BeginPlay();

    if (EncounterPerception)
    {
        EncounterPerception->OnPerceptionUpdated.AddDynamic(this, &AEncounterAIController::OnEncounterPerceptionUpdated);
    }
}

void AEncounterAIController::OnEncounterPerceptionUpdated(const TArray<AActor*>& UpdatedActors)
{
    for (AActor* Actor : UpdatedActors)
    {
        ABTTFHeroCharacter* Hero = Cast<ABTTFHeroCharacter>(Actor);
        if (!Hero)
        {
            continue;
        }

        UHeroStealthComponent* Stealth = Hero->FindComponentByClass<UHeroStealthComponent>();
        if (!Stealth)
        {
            continue;
        }

        const float HeroSpeed = Hero->GetVelocity().Size();

        // Non-lethal break: losing line of sight or the hero outrunning the sensor
        // clears accumulated awareness instead of escalating.
        const bool bHasLineOfSight = LineOfSightTo(Hero);
        if (!bHasLineOfSight || HeroSpeed > BreakLineOfSightSpeed)
        {
            Stealth->ClearAwareness();
            continue;
        }

        // Map hero speed into the stealth component's MovementNoise input.
        const float MovementNoise = FMath::Clamp(HeroSpeed * SpeedToNoiseScale, 0.0f, 100.0f);
        const float DetectionRate = Stealth->CalculateDetectionRate(
            EncounterEra, MovementNoise, VisibilityEstimate, NAME_None, bDroneObserver);

        Stealth->UpdateAwareness(DetectionRate, PerceptionUpdateInterval);
    }
}
