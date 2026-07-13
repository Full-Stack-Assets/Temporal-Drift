#include "TimeCircuitsWidget.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/ProgressBar.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"

void UTimeCircuitsWidget::NativeOnInitialized()
{
    Super::NativeOnInitialized();
    if (!WidgetTree->RootWidget)
    {
        BuildWidgetTree();
    }
}

void UTimeCircuitsWidget::NativeConstruct()
{
    Super::NativeConstruct();
    UE_LOG(LogTemp, Display, TEXT("BTTF UMG NativeConstruct root=%s"), *GetNameSafe(WidgetTree->RootWidget));
    if (ViewModel)
    {
        HandleDisplayChanged(ViewModel->GetDisplayState());
    }
}

void UTimeCircuitsWidget::BindViewModel(UTimeCircuitsViewModel* InViewModel)
{
    if (ViewModel)
    {
        ViewModel->OnDisplayChanged.RemoveDynamic(this, &UTimeCircuitsWidget::HandleDisplayChanged);
    }
    ViewModel = InViewModel;
    if (ViewModel)
    {
        ViewModel->OnDisplayChanged.AddDynamic(this, &UTimeCircuitsWidget::HandleDisplayChanged);
        if (SpeedText)
        {
            HandleDisplayChanged(ViewModel->GetDisplayState());
        }
    }
}

void UTimeCircuitsWidget::BuildWidgetTree()
{
    UCanvasPanel* RootCanvas = WidgetTree->ConstructWidget<UCanvasPanel>(
        UCanvasPanel::StaticClass(), TEXT("HUDRoot"));
    WidgetTree->RootWidget = RootCanvas;

    UBorder* Panel = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(), TEXT("ReadoutPanel"));
    Panel->SetBrushColor(FLinearColor(0.015f, 0.02f, 0.035f, 0.88f));
    Panel->SetPadding(FMargin(22.0f, 16.0f));
    UCanvasPanelSlot* PanelSlot = RootCanvas->AddChildToCanvas(Panel);
    PanelSlot->SetAnchors(FAnchors(0.0f, 1.0f));
    PanelSlot->SetAlignment(FVector2D(0.0f, 1.0f));
    PanelSlot->SetPosition(FVector2D(36.0f, -36.0f));
    PanelSlot->SetSize(FVector2D(520.0f, 330.0f));

    UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(), TEXT("ReadoutStack"));
    Panel->SetContent(Stack);
    SpeedText = AddReadout(Stack, FText::FromString(TEXT("0 MPH")), FLinearColor::White, 14);
    FluxText = AddReadout(Stack, FText::FromString(TEXT("FLUX 0%")), FLinearColor(1.0f, 0.72f, 0.08f));
    FluxBar = WidgetTree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass(), TEXT("FluxBar"));
    FluxBar->SetFillColorAndOpacity(FLinearColor(0.1f, 0.8f, 1.0f));
    UVerticalBoxSlot* FluxSlot = Stack->AddChildToVerticalBox(FluxBar);
    FluxSlot->SetPadding(FMargin(0.0f, 4.0f, 0.0f, 10.0f));
    EraText = AddReadout(Stack, FText::FromString(TEXT("CURRENT 1985")), FLinearColor(0.35f, 0.9f, 1.0f));
    DestinationText = AddReadout(Stack, FText::FromString(TEXT("DESTINATION 1955")), FLinearColor(1.0f, 0.3f, 0.18f));
    PhaseText = AddReadout(Stack, FText::FromString(TEXT("CIRCUITS OFF")), FLinearColor::White);
    WarningText = AddReadout(Stack, FText::GetEmpty(), FLinearColor(1.0f, 0.65f, 0.1f), 2);
    MissionObjectiveText = AddReadout(Stack, FText::GetEmpty(), FLinearColor(0.55f, 1.0f, 0.65f), 0);
    NowPlayingText = AddReadout(Stack, FText::GetEmpty(), FLinearColor(0.82f, 0.72f, 1.0f), -2);
    ControlsText = AddReadout(Stack,
        FText::FromString(TEXT("UP/DOWN DRIVE  LEFT/RIGHT STEER\nT CIRCUITS  Q/E DEST  F JUMP  H HOVER  R RESET")),
        FLinearColor(0.72f, 0.78f, 0.88f), -8);
    UE_LOG(LogTemp, Display, TEXT("BTTF UMG widget tree built with runtime readouts."));
}

UTextBlock* UTimeCircuitsWidget::AddReadout(UVerticalBox* Parent, const FText& InitialText,
    const FLinearColor& Color, int32 SizeOffset)
{
    UTextBlock* Text = WidgetTree->ConstructWidget<UTextBlock>();
    Text->SetText(InitialText);
    Text->SetColorAndOpacity(FSlateColor(Color));
    FSlateFontInfo Font = Text->GetFont();
    Font.Size = FMath::RoundToInt((BaseFontSize + SizeOffset) * TextScale);
    Text->SetFont(Font);
    Text->SetShadowOffset(FVector2D(1.5f, 1.5f));
    Text->SetShadowColorAndOpacity(FLinearColor::Black);
    UVerticalBoxSlot* TextSlot = Parent->AddChildToVerticalBox(Text);
    TextSlot->SetPadding(FMargin(0.0f, 2.0f));
    return Text;
}

void UTimeCircuitsWidget::HandleDisplayChanged(FTimeCircuitsDisplayState NewState)
{
    if (!SpeedText)
    {
        return;
    }
    SpeedText->SetText(NewState.SpeedText);
    FluxText->SetText(FText::Format(FText::FromString(TEXT("FLUX {0}")), NewState.FluxText));
    FluxBar->SetPercent(NewState.FluxPercent);
    EraText->SetText(FText::Format(FText::FromString(TEXT("CURRENT {0}")), NewState.CurrentEraText));
    DestinationText->SetText(FText::Format(FText::FromString(TEXT("DESTINATION {0}")), NewState.DestinationEraText));
    PhaseText->SetText(NewState.PhaseText);
    PhaseText->SetColorAndOpacity(FSlateColor(NewState.bJumpReady ? FLinearColor::Green : FLinearColor::White));
    WarningText->SetVisibility(bShowWarningText && !NewState.WarningText.IsEmpty()
        ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
    WarningText->SetText(NewState.WarningText);
    if (MissionObjectiveText)
    {
        MissionObjectiveText->SetVisibility(NewState.MissionObjectiveText.IsEmpty()
            ? ESlateVisibility::Collapsed : ESlateVisibility::HitTestInvisible);
        MissionObjectiveText->SetText(FText::Format(
            FText::FromString(TEXT("OBJECTIVE: {0}")), NewState.MissionObjectiveText));
    }
    if (NowPlayingText)
    {
        NowPlayingText->SetVisibility(NewState.NowPlayingText.IsEmpty()
            ? ESlateVisibility::Collapsed : ESlateVisibility::HitTestInvisible);
        NowPlayingText->SetText(NewState.NowPlayingText);
    }
}
