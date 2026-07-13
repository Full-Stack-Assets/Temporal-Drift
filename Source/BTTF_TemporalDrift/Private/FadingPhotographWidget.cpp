#include "FadingPhotographWidget.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/ProgressBar.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"

void UFadingPhotographWidget::NativeOnInitialized()
{
    Super::NativeOnInitialized();
    if (!WidgetTree->RootWidget)
    {
        BuildWidgetTree();
    }
}

void UFadingPhotographWidget::BuildWidgetTree()
{
    UCanvasPanel* RootCanvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), TEXT("PolaroidRoot"));
    WidgetTree->RootWidget = RootCanvas;

    PolaroidFrame = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(), TEXT("PolaroidFrame"));
    PolaroidFrame->SetBrushColor(FLinearColor(0.96f, 0.94f, 0.88f, 0.94f));
    PolaroidFrame->SetPadding(FMargin(14.0f, 14.0f, 14.0f, 22.0f));
    UCanvasPanelSlot* FrameSlot = RootCanvas->AddChildToCanvas(PolaroidFrame);
    FrameSlot->SetAnchors(FAnchors(1.0f, 1.0f));
    FrameSlot->SetAlignment(FVector2D(1.0f, 1.0f));
    FrameSlot->SetPosition(FVector2D(-36.0f, -36.0f));
    FrameSlot->SetSize(FVector2D(240.0f, 200.0f));

    UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(), TEXT("PolaroidStack"));
    PolaroidFrame->SetContent(Stack);

    TitleText = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass(), TEXT("PolaroidTitle"));
    TitleText->SetText(FText::FromString(TEXT("FAMILY PHOTO")));
    FSlateFontInfo TitleFont = TitleText->GetFont();
    TitleFont.Size = 16;
    TitleText->SetFont(TitleFont);
    TitleText->SetColorAndOpacity(FSlateColor(FLinearColor(0.15f, 0.12f, 0.1f)));
    Stack->AddChildToVerticalBox(TitleText);

    UBorder* PhotoArea = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(), TEXT("PhotoArea"));
    PhotoArea->SetBrushColor(FLinearColor(0.12f, 0.14f, 0.18f, 1.0f));
    PhotoArea->SetPadding(FMargin(8.0f));
    UVerticalBoxSlot* PhotoSlot = Stack->AddChildToVerticalBox(PhotoArea);
    PhotoSlot->SetPadding(FMargin(0.0f, 6.0f));
    PhotoSlot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));

    StatusText = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass(), TEXT("PolaroidStatus"));
    StatusText->SetText(FText::FromString(TEXT("TIMELINE STABLE")));
    StatusText->SetAutoWrapText(true);
    FSlateFontInfo StatusFont = StatusText->GetFont();
    StatusFont.Size = 14;
    StatusText->SetFont(StatusFont);
    StatusText->SetColorAndOpacity(FSlateColor(FLinearColor(0.85f, 0.9f, 0.95f)));
    PhotoArea->SetContent(StatusText);

    OpacityBar = WidgetTree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass(), TEXT("OpacityBar"));
    OpacityBar->SetFillColorAndOpacity(FLinearColor(0.75f, 0.55f, 0.95f));
    OpacityBar->SetPercent(1.0f);
    UVerticalBoxSlot* BarSlot = Stack->AddChildToVerticalBox(OpacityBar);
    BarSlot->SetPadding(FMargin(0.0f, 8.0f, 0.0f, 0.0f));
}

void UFadingPhotographWidget::BindViewModel(UFadingPhotographViewModel* InViewModel)
{
    ViewModel = InViewModel;
}

void UFadingPhotographWidget::UpdateFromParadox(float ParadoxPercent, bool bSubjectExists, bool bReducedFlash)
{
    if (!ViewModel)
    {
        ViewModel = NewObject<UFadingPhotographViewModel>(this);
    }
    ViewModel->UpdatePhotograph(ParadoxPercent, bSubjectExists, bReducedFlash);

    if (StatusText)
    {
        StatusText->SetText(ViewModel->StatusText);
        const FLinearColor StatusColor = ViewModel->bCriticalHandFade
            ? FLinearColor(1.0f, 0.35f, 0.35f)
            : FLinearColor(0.85f, 0.9f, 0.95f);
        StatusText->SetColorAndOpacity(FSlateColor(StatusColor));
    }
    if (OpacityBar)
    {
        OpacityBar->SetPercent(ViewModel->SubjectOpacity);
        OpacityBar->SetFillColorAndOpacity(ViewModel->bCriticalHandFade
            ? FLinearColor(1.0f, 0.25f, 0.3f)
            : FLinearColor(0.55f, 0.75f, 1.0f));
    }
    if (PolaroidFrame && ViewModel->WarningPulse > 0.0f && !bReducedFlash)
    {
        const float Pulse = 0.88f + ViewModel->WarningPulse * 0.12f;
        PolaroidFrame->SetBrushColor(FLinearColor(Pulse, 0.92f, 0.86f, 0.94f));
    }
    else if (PolaroidFrame)
    {
        PolaroidFrame->SetBrushColor(FLinearColor(0.96f, 0.94f, 0.88f, 0.94f));
    }
}
