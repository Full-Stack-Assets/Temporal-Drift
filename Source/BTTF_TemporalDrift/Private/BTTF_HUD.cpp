// BTTF_HUD.cpp
#include "BTTF_HUD.h"
#include "TemporalDriftSettings.h"
#include "DeLoreanVehicle.h"
#include "TimeTravelSubsystem.h"
#include "TimeCircuitsViewModel.h"
#include "TimeCircuitsWidget.h"
#include "Engine/Canvas.h"
#include "Engine/Font.h"
#include "UObject/ConstructorHelpers.h"
#include "HAL/IConsoleManager.h"

static TAutoConsoleVariable<int32> CVarBTTFDebugCanvasHUD(
    TEXT("bttf.DebugCanvasHUD"), 1,
    TEXT("Show the legacy Canvas driving HUD over the runtime UMG HUD."), ECVF_Cheat);

void ABTTF_HUD::BeginPlay()
{
    Super::BeginPlay();
    EnsureRuntimeWidget();
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
        TimeCircuitsWidget = CreateWidget<UTimeCircuitsWidget>(Controller, UTimeCircuitsWidget::StaticClass());
        if (TimeCircuitsWidget)
        {
            TimeCircuitsWidget->BindViewModel(TimeCircuitsViewModel);
            TimeCircuitsWidget->AddToPlayerScreen(100);
            TimeCircuitsWidget->SetVisibility(ESlateVisibility::HitTestInvisible);
            TimeCircuitsWidget->SetRenderOpacity(1.0f);
            UE_LOG(LogTemp, Display, TEXT("BTTF runtime UMG HUD created and added to viewport."));
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("BTTF runtime UMG HUD creation failed."));
        }
    }
}

void ABTTF_HUD::DrawHUD()
{
    Super::DrawHUD();

    const ADeLoreanVehicle* Vehicle = Cast<ADeLoreanVehicle>(GetOwningPawn());
    if (!Vehicle || !Canvas)
    {
        return;
    }

    UTimeTravelSubsystem* Subsystem = GetWorld()->GetSubsystem<UTimeTravelSubsystem>();
    UFont* Font = GEngine->GetLargeFont();

    if (!TimeCircuitsViewModel)
    {
        TimeCircuitsViewModel = NewObject<UTimeCircuitsViewModel>(this);
    }

    const float Speed = Vehicle->GetCurrentSpeedMph();
    if (Subsystem)
    {
        TimeCircuitsViewModel->UpdateDisplay(Speed, Subsystem->GetFluxChargePercent(),
            Subsystem->GetCurrentEra(), Vehicle->InputTargetEra, Subsystem->GetTimeTravelPhase(),
            Subsystem->CurrentParadoxLevel, Subsystem->WormholeStability,
            Subsystem->GetLastJumpFailureReason());
    }
    const FTimeCircuitsDisplayState Display = TimeCircuitsViewModel->GetDisplayState();

    if (CVarBTTFDebugCanvasHUD.GetValueOnGameThread() == 0)
    {
        return;
    }

    EnsureRuntimeWidget();

    const float Margin = 40.0f;
    const float BarWidth = 300.0f;
    const float BarHeight = 18.0f;
    float Y = Canvas->SizeY - 230.0f;

    // Speed - highlight when the configured jump threshold is reached.
    const float JumpThreshold = GetDefault<UTemporalDriftSettings>()->JumpSpeedThresholdMph;
    const FLinearColor SpeedColor = Speed >= JumpThreshold ? FLinearColor::Yellow : FLinearColor::White;
    FCanvasTextItem SpeedText(FVector2D(Margin, Y), Display.SpeedText, Font, SpeedColor);
    SpeedText.Scale = FVector2D(2.5f, 2.5f);
    Canvas->DrawItem(SpeedText);
    Y += 55.0f;

    // Flux charge bar
    if (Subsystem)
    {
        const float Charge = Subsystem->GetFluxChargePercent();
        const FLinearColor FluxColor = Subsystem->HasEnoughEnergyForJump() ? FLinearColor::Green : FLinearColor(1.0f, 0.5f, 0.0f);
        DrawText(FString::Printf(TEXT("FLUX %s"), *Display.FluxText.ToString()), FluxColor, Margin, Y, Font);
        DrawBar(Margin + 110.0f, Y + 2.0f, BarWidth, BarHeight, Charge, FluxColor);
        Y += 30.0f;
    }

    // Time circuits status
    const FLinearColor CircuitColor = Vehicle->bTimeCircuitsOn ? FLinearColor::Green : FLinearColor::Red;
    DrawText(Vehicle->bTimeCircuitsOn ? TEXT("TIME CIRCUITS: ON") : TEXT("TIME CIRCUITS: OFF"), CircuitColor, Margin, Y, Font);
    Y += 30.0f;

    // Current era + destination
    if (Subsystem)
    {
        DrawText(FString::Printf(TEXT("ERA: %s"), *Display.CurrentEraText.ToString()), FLinearColor::White, Margin, Y, Font);
        Y += 25.0f;
        DrawText(FString::Printf(TEXT("DESTINATION: %s"), *Display.DestinationEraText.ToString()), FLinearColor(0.6f, 0.8f, 1.0f), Margin, Y, Font);
        Y += 25.0f;
        DrawText(Display.PhaseText.ToString(), Display.bJumpReady ? FLinearColor::Green : FLinearColor::White, Margin, Y, Font);
        if (!Display.WarningText.IsEmpty())
        {
            Y += 25.0f;
            DrawText(Display.WarningText.ToString(), FLinearColor(1.0f, 0.35f, 0.1f), Margin, Y, Font);
        }
    }
}

void ABTTF_HUD::DrawBar(float X, float Y, float Width, float Height, float Percent, const FLinearColor& FillColor)
{
    DrawRect(FLinearColor(0.05f, 0.05f, 0.05f, 0.8f), X, Y, Width, Height);
    DrawRect(FillColor, X, Y, Width * FMath::Clamp(Percent, 0.0f, 1.0f), Height);
}
