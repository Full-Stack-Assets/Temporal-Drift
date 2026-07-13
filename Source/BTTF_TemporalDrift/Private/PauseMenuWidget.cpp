#include "PauseMenuWidget.h"
#include "SettingsWidget.h"
#include "BTTF_GameInstance.h"
#include "BTTF_PlayerController.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/Button.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "Kismet/GameplayStatics.h"
#include "Kismet/KismetSystemLibrary.h"

void UPauseMenuWidget::NativeOnInitialized()
{
    Super::NativeOnInitialized();
    if (!WidgetTree->RootWidget)
    {
        BuildWidgetTree();
    }
}

void UPauseMenuWidget::BuildWidgetTree()
{
    UCanvasPanel* RootCanvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), TEXT("PauseRoot"));
    WidgetTree->RootWidget = RootCanvas;

    Panel = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(), TEXT("PausePanel"));
    Panel->SetBrushColor(FLinearColor(0.01f, 0.02f, 0.05f, 0.88f));
    Panel->SetPadding(FMargin(36.0f, 28.0f));
    UCanvasPanelSlot* PanelSlot = RootCanvas->AddChildToCanvas(Panel);
    PanelSlot->SetAnchors(FAnchors(0.5f, 0.5f));
    PanelSlot->SetAlignment(FVector2D(0.5f, 0.5f));
    PanelSlot->SetSize(FVector2D(520.0f, 420.0f));

    UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(), TEXT("PauseStack"));
    Panel->SetContent(Stack);
    TitleText = AddMenuLine(Stack, FText::FromString(TEXT("PAUSED")), FLinearColor(0.45f, 0.85f, 1.0f), 6);

    auto AddButton = [&](const TCHAR* Name, const TCHAR* Label)
    {
        UButton* Button = WidgetTree->ConstructWidget<UButton>(UButton::StaticClass(), Name);
        UTextBlock* LabelText = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
        LabelText->SetText(FText::FromString(Label));
        FSlateFontInfo Font = LabelText->GetFont();
        Font.Size = 24;
        LabelText->SetFont(Font);
        Button->AddChild(LabelText);
        UVerticalBoxSlot* AddedSlot = Stack->AddChildToVerticalBox(Button);
        AddedSlot->SetPadding(FMargin(0.0f, 6.0f));
        return LabelText;
    };

    ResumeText = AddButton(TEXT("ResumeButton"), TEXT("Resume"));
    CastChecked<UButton>(ResumeText->GetParent())->OnClicked.AddDynamic(this, &UPauseMenuWidget::HandleResumeClicked);
    SettingsText = AddButton(TEXT("SettingsButton"), TEXT("Settings"));
    CastChecked<UButton>(SettingsText->GetParent())->OnClicked.AddDynamic(this, &UPauseMenuWidget::HandleSettingsClicked);
    ContinueButton = WidgetTree->ConstructWidget<UButton>(UButton::StaticClass(), TEXT("ContinueButton"));
    UTextBlock* ContinueLabel = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
    ContinueLabel->SetText(FText::FromString(TEXT("Continue")));
    FSlateFontInfo ContinueFont = ContinueLabel->GetFont();
    ContinueFont.Size = 24;
    ContinueLabel->SetFont(ContinueFont);
    ContinueButton->AddChild(ContinueLabel);
    ContinueButton->OnClicked.AddDynamic(this, &UPauseMenuWidget::HandleContinueClicked);
    Stack->AddChildToVerticalBox(ContinueButton);
    NewGameText = AddButton(TEXT("NewGameButton"), TEXT("New Game"));
    CastChecked<UButton>(NewGameText->GetParent())->OnClicked.AddDynamic(this, &UPauseMenuWidget::HandleNewGameClicked);
    QuitText = AddButton(TEXT("QuitButton"), TEXT("Quit to Desktop"));
    CastChecked<UButton>(QuitText->GetParent())->OnClicked.AddDynamic(this, &UPauseMenuWidget::HandleQuitClicked);

    SettingsWidget = CreateWidget<USettingsWidget>(GetOwningPlayer(), USettingsWidget::StaticClass());
    if (SettingsWidget)
    {
        UCanvasPanelSlot* SettingsSlot = RootCanvas->AddChildToCanvas(SettingsWidget);
        SettingsSlot->SetAnchors(FAnchors(0.5f, 0.5f));
        SettingsSlot->SetAlignment(FVector2D(0.5f, 0.5f));
        SettingsSlot->SetSize(FVector2D(640.0f, 420.0f));
        SettingsWidget->SetVisibility(ESlateVisibility::Collapsed);
        SettingsWidget->SetOwnerPauseMenu(this);
    }
}

UTextBlock* UPauseMenuWidget::AddMenuLine(UVerticalBox* Parent, const FText& Label, const FLinearColor& Color, int32 SizeOffset)
{
    UTextBlock* Text = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
    Text->SetText(Label);
    Text->SetColorAndOpacity(FSlateColor(Color));
    FSlateFontInfo Font = Text->GetFont();
    Font.Size = 24 + SizeOffset;
    Text->SetFont(Font);
    if (Parent)
    {
        UVerticalBoxSlot* AddedSlot = Parent->AddChildToVerticalBox(Text);
        AddedSlot->SetPadding(FMargin(0.0f, 4.0f));
    }
    return Text;
}

void UPauseMenuWidget::RefreshMenuState(bool bHasSaveGame)
{
    if (ContinueButton)
    {
        ContinueButton->SetVisibility(bHasSaveGame ? ESlateVisibility::Visible : ESlateVisibility::Collapsed);
    }
}

void UPauseMenuWidget::ShowSettings(bool bShow)
{
    if (SettingsWidget)
    {
        if (bShow)
        {
            SettingsWidget->RefreshFromProfile();
            SettingsWidget->SetVisibility(ESlateVisibility::Visible);
        }
        else
        {
            SettingsWidget->ApplyToProfile();
            SettingsWidget->SetVisibility(ESlateVisibility::Collapsed);
        }
    }
    if (Panel)
    {
        Panel->SetVisibility(bShow ? ESlateVisibility::Collapsed : ESlateVisibility::Visible);
    }
}

bool UPauseMenuWidget::IsSettingsVisible() const
{
    return SettingsWidget && SettingsWidget->GetVisibility() == ESlateVisibility::Visible;
}

void UPauseMenuWidget::HandleResumeClicked()
{
    if (ABTTF_PlayerController* Controller = Cast<ABTTF_PlayerController>(GetOwningPlayer()))
    {
        Controller->TogglePauseMenu();
    }
}

void UPauseMenuWidget::HandleSettingsClicked()
{
    ShowSettings(!IsSettingsVisible());
}

void UPauseMenuWidget::HandleContinueClicked()
{
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        GameInstance->TryContinueGame();
    }
    HandleResumeClicked();
}

void UPauseMenuWidget::HandleNewGameClicked()
{
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        GameInstance->InitializeNewGame();
        GameInstance->DeleteSaveGame();
    }
    HandleResumeClicked();
}

void UPauseMenuWidget::HandleQuitClicked()
{
    if (APlayerController* Controller = GetOwningPlayer())
    {
        UKismetSystemLibrary::QuitGame(this, Controller, EQuitPreference::Quit, false);
    }
}
