#include "DialogueWidget.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"

void UDialogueWidget::NativeOnInitialized()
{
    Super::NativeOnInitialized();
    if (!WidgetTree->RootWidget)
    {
        BuildWidgetTree();
    }
}

void UDialogueWidget::BindViewModel(UDialogueViewModel* InViewModel)
{
    if (ViewModel)
    {
        ViewModel->OnDisplayChanged.RemoveDynamic(this, &UDialogueWidget::HandleDisplayChanged);
    }
    ViewModel = InViewModel;
    if (ViewModel)
    {
        ViewModel->OnDisplayChanged.AddDynamic(this, &UDialogueWidget::HandleDisplayChanged);
        HandleDisplayChanged(ViewModel->GetDisplayState());
    }
}

void UDialogueWidget::BuildWidgetTree()
{
    UCanvasPanel* RootCanvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), TEXT("DialogueRoot"));
    WidgetTree->RootWidget = RootCanvas;

    Panel = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(), TEXT("DialoguePanel"));
    Panel->SetBrushColor(FLinearColor(0.01f, 0.02f, 0.04f, BackgroundOpacity));
    Panel->SetPadding(FMargin(24.0f, 18.0f));
    UCanvasPanelSlot* PanelSlot = RootCanvas->AddChildToCanvas(Panel);
    PanelSlot->SetAnchors(FAnchors(0.5f, 1.0f));
    PanelSlot->SetAlignment(FVector2D(0.5f, 1.0f));
    PanelSlot->SetPosition(FVector2D(0.0f, -48.0f));
    PanelSlot->SetSize(FVector2D(920.0f, 220.0f));

    UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(), TEXT("DialogueStack"));
    Panel->SetContent(Stack);
    SpeakerText = AddLine(Stack, FText::GetEmpty(), FLinearColor(0.45f, 0.85f, 1.0f), 2);
    LineText = AddLine(Stack, FText::GetEmpty(), FLinearColor::White, 4);
    ChoiceStack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(), TEXT("ChoiceStack"));
    Stack->AddChildToVerticalBox(ChoiceStack);
    PromptText = AddLine(Stack, FText::FromString(TEXT("Press E to continue")), FLinearColor(0.7f, 0.8f, 0.9f), -4);
}

UTextBlock* UDialogueWidget::AddLine(UVerticalBox* Parent, const FText& InitialText,
    const FLinearColor& Color, int32 SizeOffset)
{
    UTextBlock* Text = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
    Text->SetText(InitialText);
    Text->SetColorAndOpacity(FSlateColor(Color));
    Text->SetAutoWrapText(true);
    FSlateFontInfo Font = Text->GetFont();
    Font.Size = FMath::RoundToInt((BaseFontSize + SizeOffset) * TextScale);
    Text->SetFont(Font);
    if (Parent)
    {
        UVerticalBoxSlot* AddedSlot = Parent->AddChildToVerticalBox(Text);
        AddedSlot->SetPadding(FMargin(0.0f, 2.0f));
    }
    return Text;
}

void UDialogueWidget::HandleDisplayChanged(FDialogueDisplayState NewState)
{
    if (!SpeakerText || !LineText || !PromptText || !Panel)
    {
        return;
    }

    SetVisibility(NewState.bVisible ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
    Panel->SetBrushColor(FLinearColor(0.01f, 0.02f, 0.04f, BackgroundOpacity));

    SpeakerText->SetText(NewState.SpeakerName);
    SpeakerText->SetVisibility(NewState.SpeakerName.IsEmpty() ? ESlateVisibility::Collapsed : ESlateVisibility::HitTestInvisible);
    LineText->SetText(NewState.LineText);

    if (ChoiceStack)
    {
        ChoiceStack->ClearChildren();
        for (const FDialogueChoice& Choice : NewState.Choices)
        {
            AddLine(ChoiceStack, FText::Format(FText::FromString(TEXT("[{0}] {1}")),
                FText::FromName(Choice.ChoiceId), Choice.Text), FLinearColor(0.85f, 0.95f, 1.0f), -2);
        }
        ChoiceStack->SetVisibility(NewState.Choices.IsEmpty() ? ESlateVisibility::Collapsed : ESlateVisibility::HitTestInvisible);
    }

    if (NewState.bVoicePlaying)
    {
        PromptText->SetText(FText::FromString(TEXT("...")));
    }
    else if (!NewState.Choices.IsEmpty())
    {
        PromptText->SetText(FText::FromString(TEXT("Press 1/2 or Interact to choose")));
    }
    else if (NewState.bAwaitingAdvance)
    {
        PromptText->SetText(FText::FromString(TEXT("Press E to continue")));
    }
    else
    {
        PromptText->SetText(FText::GetEmpty());
    }
    PromptText->SetVisibility(PromptText->GetText().IsEmpty() ? ESlateVisibility::Collapsed : ESlateVisibility::HitTestInvisible);
}
