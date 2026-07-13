#include "SettingsWidget.h"
#include "BTTF_GameInstance.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/CheckBox.h"
#include "Components/Slider.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "Kismet/GameplayStatics.h"

void USettingsWidget::NativeOnInitialized()
{
    Super::NativeOnInitialized();
    if (!WidgetTree->RootWidget)
    {
        BuildWidgetTree();
    }
}

void USettingsWidget::BuildWidgetTree()
{
    UCanvasPanel* RootCanvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), TEXT("SettingsRoot"));
    WidgetTree->RootWidget = RootCanvas;

    Panel = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(), TEXT("SettingsPanel"));
    Panel->SetBrushColor(FLinearColor(0.02f, 0.04f, 0.08f, 0.92f));
    Panel->SetPadding(FMargin(28.0f, 22.0f));
    UCanvasPanelSlot* PanelSlot = RootCanvas->AddChildToCanvas(Panel);
    PanelSlot->SetAnchors(FAnchors(0.5f, 0.5f));
    PanelSlot->SetAlignment(FVector2D(0.5f, 0.5f));
    PanelSlot->SetSize(FVector2D(640.0f, 420.0f));

    UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(), TEXT("SettingsStack"));
    Panel->SetContent(Stack);
    AddLabel(Stack, FText::FromString(TEXT("SETTINGS")));

    AddLabel(Stack, FText::FromString(TEXT("Music Volume")));
    MusicSlider = WidgetTree->ConstructWidget<USlider>(USlider::StaticClass(), TEXT("MusicSlider"));
    MusicSlider->SetMinValue(0.0f);
    MusicSlider->SetMaxValue(1.0f);
    MusicSlider->OnValueChanged.AddDynamic(this, &USettingsWidget::HandleMusicVolumeChanged);
    Stack->AddChildToVerticalBox(MusicSlider);
    MusicValueText = AddLabel(Stack, FText::GetEmpty());

    AddLabel(Stack, FText::FromString(TEXT("Dialogue Volume")));
    DialogueSlider = WidgetTree->ConstructWidget<USlider>(USlider::StaticClass(), TEXT("DialogueSlider"));
    DialogueSlider->SetMinValue(0.0f);
    DialogueSlider->SetMaxValue(1.0f);
    DialogueSlider->OnValueChanged.AddDynamic(this, &USettingsWidget::HandleDialogueVolumeChanged);
    Stack->AddChildToVerticalBox(DialogueSlider);
    DialogueValueText = AddLabel(Stack, FText::GetEmpty());

    AddLabel(Stack, FText::FromString(TEXT("UI Scale")));
    UIScaleSlider = WidgetTree->ConstructWidget<USlider>(USlider::StaticClass(), TEXT("UIScaleSlider"));
    UIScaleSlider->SetMinValue(0.75f);
    UIScaleSlider->SetMaxValue(2.0f);
    UIScaleSlider->OnValueChanged.AddDynamic(this, &USettingsWidget::HandleUIScaleChanged);
    Stack->AddChildToVerticalBox(UIScaleSlider);
    UIScaleValueText = AddLabel(Stack, FText::GetEmpty());

    AddLabel(Stack, FText::FromString(TEXT("Subtitle Scale")));
    SubtitleScaleSlider = WidgetTree->ConstructWidget<USlider>(USlider::StaticClass(), TEXT("SubtitleScaleSlider"));
    SubtitleScaleSlider->SetMinValue(0.75f);
    SubtitleScaleSlider->SetMaxValue(2.0f);
    SubtitleScaleSlider->OnValueChanged.AddDynamic(this, &USettingsWidget::HandleSubtitleScaleChanged);
    Stack->AddChildToVerticalBox(SubtitleScaleSlider);
    SubtitleScaleValueText = AddLabel(Stack, FText::GetEmpty());

    ReducedFlashCheck = WidgetTree->ConstructWidget<UCheckBox>(UCheckBox::StaticClass(), TEXT("ReducedFlashCheck"));
    ReducedFlashCheck->OnCheckStateChanged.AddDynamic(this, &USettingsWidget::HandleReducedFlashChanged);
    Stack->AddChildToVerticalBox(ReducedFlashCheck);
    AddLabel(Stack, FText::FromString(TEXT("Reduced flash (accessibility)")));

    UTextBlock* BackText = AddLabel(Stack, FText::FromString(TEXT("[ Back ]")));
    BackText->SetColorAndOpacity(FSlateColor(FLinearColor(0.55f, 0.85f, 1.0f)));
}

UTextBlock* USettingsWidget::AddLabel(UVerticalBox* Parent, const FText& Label)
{
    UTextBlock* Text = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
    Text->SetText(Label);
    Text->SetAutoWrapText(true);
    FSlateFontInfo Font = Text->GetFont();
    Font.Size = 22;
    Text->SetFont(Font);
    if (Parent)
    {
        UVerticalBoxSlot* Slot = Parent->AddChildToVerticalBox(Text);
        Slot->SetPadding(FMargin(0.0f, 4.0f));
    }
    return Text;
}

void USettingsWidget::RefreshFromProfile()
{
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        bApplyingProfile = true;
        if (MusicSlider)
        {
            MusicSlider->SetValue(GameInstance->GetMusicVolume());
        }
        if (DialogueSlider)
        {
            DialogueSlider->SetValue(GameInstance->GetDialogueVolume());
        }
        if (UIScaleSlider)
        {
            UIScaleSlider->SetValue(GameInstance->GetUIScale());
        }
        if (SubtitleScaleSlider)
        {
            SubtitleScaleSlider->SetValue(GameInstance->GetSubtitleScale());
        }
        if (ReducedFlashCheck)
        {
            ReducedFlashCheck->SetIsChecked(GameInstance->IsReducedFlashEnabled());
        }
        bApplyingProfile = false;
        if (MusicValueText)
        {
            MusicValueText->SetText(FText::AsNumber(GameInstance->GetMusicVolume()));
        }
        if (DialogueValueText)
        {
            DialogueValueText->SetText(FText::AsNumber(GameInstance->GetDialogueVolume()));
        }
        if (UIScaleValueText)
        {
            UIScaleValueText->SetText(FText::AsNumber(GameInstance->GetUIScale()));
        }
        if (SubtitleScaleValueText)
        {
            SubtitleScaleValueText->SetText(FText::AsNumber(GameInstance->GetSubtitleScale()));
        }
    }
}

void USettingsWidget::ApplyToProfile()
{
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        GameInstance->SaveProfileSettings();
        GameInstance->ApplyProfileAccessibility(GetWorld());
    }
}

void USettingsWidget::HandleMusicVolumeChanged(float Value)
{
    if (bApplyingProfile)
    {
        return;
    }
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        GameInstance->SetMusicVolume(Value);
        if (MusicValueText)
        {
            MusicValueText->SetText(FText::AsNumber(Value));
        }
    }
}

void USettingsWidget::HandleDialogueVolumeChanged(float Value)
{
    if (bApplyingProfile)
    {
        return;
    }
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        GameInstance->SetDialogueVolume(Value);
        if (DialogueValueText)
        {
            DialogueValueText->SetText(FText::AsNumber(Value));
        }
    }
}

void USettingsWidget::HandleUIScaleChanged(float Value)
{
    if (bApplyingProfile)
    {
        return;
    }
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        GameInstance->SetUIScale(Value);
        if (UIScaleValueText)
        {
            UIScaleValueText->SetText(FText::AsNumber(Value));
        }
    }
}

void USettingsWidget::HandleSubtitleScaleChanged(float Value)
{
    if (bApplyingProfile)
    {
        return;
    }
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        GameInstance->SetSubtitleScale(Value);
        if (SubtitleScaleValueText)
        {
            SubtitleScaleValueText->SetText(FText::AsNumber(Value));
        }
    }
}

void USettingsWidget::HandleReducedFlashChanged(bool bChecked)
{
    if (bApplyingProfile)
    {
        return;
    }
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        GameInstance->SetReducedFlashEnabled(bChecked);
    }
}

void USettingsWidget::HandleBackClicked()
{
    SetVisibility(ESlateVisibility::Collapsed);
}
