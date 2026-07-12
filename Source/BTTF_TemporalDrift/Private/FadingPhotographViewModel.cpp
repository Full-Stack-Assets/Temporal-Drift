#include "FadingPhotographViewModel.h"

void UFadingPhotographViewModel::UpdatePhotograph(float ParadoxPercent, bool bSubjectExists, bool bReducedFlash)
{
    const float Risk=FMath::Clamp(ParadoxPercent,0.0f,100.0f)/100.0f;
    SubjectOpacity=bSubjectExists ? FMath::Clamp(1.0f-Risk*0.85f,0.15f,1.0f) : 0.0f;
    bCriticalHandFade=!bSubjectExists || Risk>=0.85f;
    WarningPulse=bReducedFlash ? 0.0f : (bCriticalHandFade ? 1.0f : FMath::Clamp((Risk-0.5f)*2.0f,0.0f,0.7f));
    if (!bSubjectExists) StatusText=FText::FromString(TEXT("ERASED FROM TIMELINE"));
    else if (bCriticalHandFade) StatusText=FText::FromString(TEXT("TIMELINE COLLAPSE IMMINENT"));
    else if (Risk>=0.5f) StatusText=FText::FromString(TEXT("PHOTOGRAPH FADING"));
    else StatusText=FText::FromString(TEXT("TIMELINE STABLE"));
}
