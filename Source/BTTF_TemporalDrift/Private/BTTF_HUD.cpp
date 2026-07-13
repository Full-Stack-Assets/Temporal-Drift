// BTTF_HUD.cpp
#include "BTTF_HUD.h"
#include "TemporalDriftSettings.h"
#include "DeLoreanVehicle.h"
#include "TimeTravelSubsystem.h"
#include "MissionSubsystem.h"
#include "BTTF_GameInstance.h"
#include "TimeCircuitsViewModel.h"
#include "TimeCircuitsWidget.h"
#include "Engine/Canvas.h"
#include "Engine/Font.h"
#include "UObject/ConstructorHelpers.h"
#include "HAL/IConsoleManager.h"

static TAutoConsoleVariable<int32> CVarBTTFDebugCanvasHUD(
    TEXT("bttf.DebugCanvasHUD"), 0,
    TEXT("Show the legacy Canvas driving HUD over the runtime UMG HUD."), ECVF_Cheat);

void ABTTF_HUD::BeginPlay()
{
    Super::BeginPlay();
    EnsureRuntimeWidget();

    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        ApplyAccessibilitySettings(GameInstance->GetUIScale());
        if (UWorld* World = GetWorld())
        {
            GameInstance->ApplyProfileAccessibility(World);
        }
    }
}

void ABTTF_HUD::ApplyAccessibilitySettings(float UIScale)
{
    if (TimeCircuitsWidget)
    {
        TimeCircuitsWidget->TextScale = FMath::Clamp(UIScale, 0.75f, 2.0f);
    }
}

void ABTTF_HUD::EnsureRuntimeWidget()
{
    if (!TimeCircuitsViewModel)
    {
        TimeCircuitsViewModel = NewObject<UTimeCircuitsViewModel>(this);
    }
    if (TimeCircuitsWidget)
    {
        return;
    }
    if (APlayerController* Controller = GetOwningPlayerController())
    {
        TSubclassOf<UTimeCircuitsWidget> WidgetClass = UTimeCircuitsWidget::StaticClass();
        if (UClass* AuthoredClass = LoadClass<UTimeCircuitsWidget>(
                nullptr, TEXT("/Game/UI/WBP_TimeCircuits.WBP_TimeCircuits")))
        {
            WidgetClass = AuthoredClass;
        }

        TimeCircuitsWidget = CreateWidget<UTimeCircuitsWidget>(Controller, WidgetClass);
        if (TimeCircuitsWidget)
        {
            TimeCircuitsWidget->BindViewModel(TimeCircuitsViewModel);
            TimeCircuitsWidget->AddToPlayerScreen(100);
            TimeCircuitsWidget->SetVisibility(ESlateVisibility::HitTestInvisible);
            TimeCircuitsWidget->SetRenderOpacity(1.0f);
            UE_LOG(LogTemp, Display, TEXT("BTTF runtime UMG HUD created (%s)."),
                *WidgetClass->GetName());
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("BTTF runtime UMG HUD creation failed."));
        }
    }
}

void ABTTF_HUD::RefreshTimeCircuitsDisplay()
{
    if (!TimeCircuitsViewModel)
    {
        TimeCircuitsViewModel = NewObject<UTimeCircuitsViewModel>(this);
    }

    UWorld* World = GetWorld();
    UTimeTravelSubsystem* Subsystem = World ? World->GetSubsystem<UTimeTravelSubsystem>() : nullptr;
    UMissionSubsystem* Mission = nullptr;
    if (UGameInstance* GameInstance = GetGameInstance())
    {
        Mission = GameInstance->GetSubsystem<UMissionSubsystem>();
    }

    float Speed = 0.0f;
    ETimelineState DestinationEra = ETimelineState::Present1985;
    if (const ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(GetOwningPawn()))
    {
        Speed = Vehicle->GetCurrentSpeedMph();
        DestinationEra = Vehicle->InputTargetEra;
    }

    const FText MissionObjective = Mission ? Mission->GetActiveObjectiveDescription() : FText::GetEmpty();
    if (Subsystem)
    {
        TimeCircuitsViewModel->UpdateDisplay(Speed, Subsystem->GetFluxChargePercent(),
            Subsystem->GetCurrentEra(), DestinationEra, Subsystem->GetTimeTravelPhase(),
            Subsystem->CurrentParadoxLevel, Subsystem->WormholeStability,
            Subsystem->GetLastJumpFailureReason(), MissionObjective);
    }
}

void ABTTF_HUD::DrawHUD()
{
    Super::DrawHUD();

    RefreshTimeCircuitsDisplay();
    EnsureRuntimeWidget();

    const ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(GetOwningPawn());
    if (!Vehicle || !Canvas)
    {
        return;
    }

    if (CVarBTTFDebugCanvasHUD.GetValueOnGameThread() == 0)
    {
        return;
    }

    UFont* Font = GEngine->GetLargeFont();
    const FTimeCircuitsDisplayState Display = TimeCircuitsViewModel->GetDisplayState();

    const float Margin = 40.0f;
    const float BarWidth = 300.0f;
    const float BarHeight = 18.0f;
    float Y = Canvas->SizeY - 230.0f;

    const float JumpThreshold = GetDefault<UTemporalDriftSettings>()->JumpSpeedThresholdMph;
    const FLinearColor SpeedColor = Vehicle->GetCurrentSpeedMph() >= JumpThreshold
        ? FLinearColor::Yellow : FLinearColor::White;
    FCanvasTextItem SpeedText(FVector2D(Margin, Y), Display.SpeedText, Font, SpeedColor);
    SpeedText.Scale = FVector2D(2.5f, 2.5f);
    Canvas->DrawItem(SpeedText);
    Y += 55.0f;

    UTimeTravelSubsystem* Subsystem = GetWorld()->GetSubsystem<UTimeTravelSubsystem>();
    if (Subsystem)
    {
        const float Charge = Subsystem->GetFluxChargePercent();
        const FLinearColor FluxColor = Subsystem->HasEnoughEnergyForJump()
            ? FLinearColor::Green : FLinearColor(1.0f, 0.5f, 0.0f);
        DrawText(FString::Printf(TEXT("FLUX %s"), *Display.FluxText.ToString()), FluxColor, Margin, Y, Font);
        DrawBar(Margin + 110.0f, Y + 2.0f, BarWidth, BarHeight, Charge, FluxColor);
        Y += 30.0f;
    }

    const FLinearColor CircuitColor = Vehicle->bTimeCircuitsOn ? FLinearColor::Green : FLinearColor::Red;
    DrawText(Vehicle->bTimeCircuitsOn ? TEXT("TIME CIRCUITS: ON") : TEXT("TIME CIRCUITS: OFF"),
        CircuitColor, Margin, Y, Font);
    Y += 30.0f;

    if (Subsystem)
    {
        DrawText(FString::Printf(TEXT("ERA: %s"), *Display.CurrentEraText.ToString()),
            FLinearColor::White, Margin, Y, Font);
        Y += 25.0f;
        DrawText(FString::Printf(TEXT("DESTINATION: %s"), *Display.DestinationEraText.ToString()),
            FLinearColor(0.6f, 0.8f, 1.0f), Margin, Y, Font);
        Y += 25.0f;
        DrawText(Display.PhaseText.ToString(),
            Display.bJumpReady ? FLinearColor::Green : FLinearColor::White, Margin, Y, Font);
        if (!Display.WarningText.IsEmpty())
        {
            Y += 25.0f;
            DrawText(Display.WarningText.ToString(), FLinearColor(1.0f, 0.35f, 0.1f), Margin, Y, Font);
        }
        if (!Display.MissionObjectiveText.IsEmpty())
        {
            Y += 25.0f;
            DrawText(FString::Printf(TEXT("OBJECTIVE: %s"), *Display.MissionObjectiveText.ToString()),
                FLinearColor(0.55f, 1.0f, 0.65f), Margin, Y, Font);
        }
    }
}

void ABTTF_HUD::DrawBar(float X, float Y, float Width, float Height, float Percent, const FLinearColor& FillColor)
{
    DrawRect(FLinearColor(0.05f, 0.05f, 0.05f, 0.8f), X, Y, Width, Height);
    DrawRect(FillColor, X, Y, Width * FMath::Clamp(Percent, 0.0f, 1.0f), Height);
}
