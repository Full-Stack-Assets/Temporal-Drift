// BTTF_HUD.cpp
#include "BTTF_HUD.h"
#include "DeLoreanVehicle.h"
#include "TimeTravelSubsystem.h"
#include "Engine/Canvas.h"
#include "Engine/Font.h"
#include "UObject/ConstructorHelpers.h"

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

    const float Margin = 40.0f;
    const float BarWidth = 300.0f;
    const float BarHeight = 18.0f;
    float Y = Canvas->SizeY - 170.0f;

    // Speed - highlight when in the 88 mph jump window
    const float Speed = Vehicle->GetCurrentSpeedMph();
    const FLinearColor SpeedColor = Speed >= 88.0f ? FLinearColor::Yellow : FLinearColor::White;
    FCanvasTextItem SpeedText(FVector2D(Margin, Y), FText::FromString(FString::Printf(TEXT("%.0f MPH"), Speed)), Font, SpeedColor);
    SpeedText.Scale = FVector2D(2.5f, 2.5f);
    Canvas->DrawItem(SpeedText);
    Y += 55.0f;

    // Flux charge bar
    if (Subsystem)
    {
        const float Charge = Subsystem->GetFluxChargePercent();
        const FLinearColor FluxColor = Subsystem->HasEnoughEnergyForJump() ? FLinearColor::Green : FLinearColor(1.0f, 0.5f, 0.0f);
        DrawText(FString::Printf(TEXT("FLUX %.0f%%"), Charge * 100.0f), FluxColor, Margin, Y, Font);
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
        DrawText(FString::Printf(TEXT("ERA: %s"), *Subsystem->GetCurrentEraName()), FLinearColor::White, Margin, Y, Font);
        Y += 25.0f;
        DrawText(FString::Printf(TEXT("DESTINATION: %s"), *UEnum::GetDisplayValueAsText(Vehicle->InputTargetEra).ToString()), FLinearColor(0.6f, 0.8f, 1.0f), Margin, Y, Font);
    }
}

void ABTTF_HUD::DrawBar(float X, float Y, float Width, float Height, float Percent, const FLinearColor& FillColor)
{
    DrawRect(FLinearColor(0.05f, 0.05f, 0.05f, 0.8f), X, Y, Width, Height);
    DrawRect(FillColor, X, Y, Width * FMath::Clamp(Percent, 0.0f, 1.0f), Height);
}
