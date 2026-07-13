#include "TemporalDriveSubsystem.h"
#include "TemporalDriftSettings.h"

bool UTemporalDriveSubsystem::ValidateDestinationDate(const FTemporalDestinationDate& Date,FText& Error)const
{
    if(Date.Year<1885||Date.Year>2045){Error=FText::FromString(TEXT("Destination year is outside the authored timeline."));return false;}
    if(Date.Month<1||Date.Month>12||Date.Day<1||Date.Day>31||Date.Hour<0||Date.Hour>23||Date.Minute<0||Date.Minute>59){Error=FText::FromString(TEXT("Destination date contains an invalid field."));return false;}
    static const int32 DaysPerMonth[]={0,31,28,31,30,31,30,31,31,30,31,30,31};
    int32 MaxDay=DaysPerMonth[Date.Month];const bool bLeap=(Date.Year%4==0&&Date.Year%100!=0)||(Date.Year%400==0);if(Date.Month==2&&bLeap)MaxDay=29;
    if(Date.Day>MaxDay){Error=FText::FromString(TEXT("Destination day does not exist in that month."));return false;}
    Error=FText::GetEmpty();return true;
}

bool UTemporalDriveSubsystem::ResolveDestinationEra(const FTemporalDestinationDate& Date,ETimelineState& Era)const
{
    FText Error;if(!ValidateDestinationDate(Date,Error))return false;
    if(Date.Year<1920)Era=ETimelineState::WildWest1885;
    else if(Date.Year<1970)Era=ETimelineState::Past1955;
    else if(Date.Year<2000)Era=ETimelineState::Present1985;
    else if(Date.Year<2030)Era=ETimelineState::Future2015;
    else Era=ETimelineState::DeepFuture2045;
    return true;
}

void UTemporalDriveSubsystem::AddPlutoniumCells(int32 Count){State.PlutoniumCells=FMath::Max(0,State.PlutoniumCells+Count);}
void UTemporalDriveSubsystem::AddFusionFuel(float Amount){State.FusionFuel=FMath::Clamp(State.FusionFuel+Amount,0.0f,100.0f);}
void UTemporalDriveSubsystem::SetMrFusionInstalled(bool bInstalled){State.bMrFusionInstalled=bInstalled;}
void UTemporalDriveSubsystem::ArmLightningCapture(bool bArmed){State.bLightningCaptureArmed=bArmed;}

bool UTemporalDriveSubsystem::CanPowerJump(ETemporalFuelType Fuel,float SpeedMph,const FTemporalDestinationDate& Date,FText& Error)const
{
    if(!ValidateDestinationDate(Date,Error))return false;
    const float RequiredSpeed = GetDefault<UTemporalDriftSettings>()->JumpSpeedThresholdMph;
    if(SpeedMph<RequiredSpeed){Error=FText::FromString(FString::Printf(TEXT("Vehicle must reach %.0f MPH."),RequiredSpeed));return false;}
    bool bPowered=false;
    switch(Fuel){case ETemporalFuelType::Plutonium:bPowered=State.PlutoniumCells>0;break;case ETemporalFuelType::Lightning:bPowered=State.bLightningCaptureArmed;break;case ETemporalFuelType::MrFusion:bPowered=State.bMrFusionInstalled&&State.FusionFuel>=10.0f;break;}
    if(!bPowered)Error=FText::FromString(TEXT("Selected temporal fuel source is unavailable."));return bPowered;
}

bool UTemporalDriveSubsystem::ConsumeJumpFuel(ETemporalFuelType Fuel)
{
    switch(Fuel)
    {
    case ETemporalFuelType::Plutonium:if(State.PlutoniumCells<1)return false;--State.PlutoniumCells;return true;
    case ETemporalFuelType::Lightning:if(!State.bLightningCaptureArmed)return false;State.bLightningCaptureArmed=false;return true;
    case ETemporalFuelType::MrFusion:if(!State.bMrFusionInstalled||State.FusionFuel<10.0f)return false;State.FusionFuel-=10.0f;return true;
    default:return false;
    }
}

bool UTemporalDriveSubsystem::RestoreSnapshot(const FTemporalDriveSnapshot& Snapshot)
{
    if(Snapshot.PlutoniumCells<0||Snapshot.FusionFuel<0.0f||Snapshot.FusionFuel>100.0f)return false;State=Snapshot;return true;
}

FTemporalDestinationDate UTemporalDriveSubsystem::GetDefaultDateForEra(ETimelineState Era)
{
    FTemporalDestinationDate Date;
    switch (Era)
    {
    case ETimelineState::WildWest1885:
        Date.Year = 1885; Date.Month = 9; Date.Day = 7; Date.Hour = 8; Date.Minute = 0;
        break;
    case ETimelineState::Past1955:
        Date.Year = 1955; Date.Month = 11; Date.Day = 12; Date.Hour = 22; Date.Minute = 4;
        break;
    case ETimelineState::Present1985:
        Date.Year = 1985; Date.Month = 10; Date.Day = 26; Date.Hour = 12; Date.Minute = 0;
        break;
    case ETimelineState::Alternate1985:
        Date.Year = 1985; Date.Month = 10; Date.Day = 26; Date.Hour = 18; Date.Minute = 0;
        break;
    case ETimelineState::Future2015:
        Date.Year = 2015; Date.Month = 10; Date.Day = 21; Date.Hour = 16; Date.Minute = 29;
        break;
    case ETimelineState::DeepFuture2045:
        Date.Year = 2045; Date.Month = 3; Date.Day = 15; Date.Hour = 6; Date.Minute = 0;
        break;
    default:
        Date.Year = 1985; Date.Month = 10; Date.Day = 26; Date.Hour = 12; Date.Minute = 0;
        break;
    }
    return Date;
}

FText UTemporalDriveSubsystem::FormatDestinationDate(const FTemporalDestinationDate& Date)
{
    static const TCHAR* MonthNames[] = {
        TEXT("???"), TEXT("JAN"), TEXT("FEB"), TEXT("MAR"), TEXT("APR"), TEXT("MAY"), TEXT("JUN"),
        TEXT("JUL"), TEXT("AUG"), TEXT("SEP"), TEXT("OCT"), TEXT("NOV"), TEXT("DEC")};
    const FString Month = (Date.Month >= 1 && Date.Month <= 12) ? MonthNames[Date.Month] : TEXT("???");
  const int32 DisplayHour = Date.Hour % 12 == 0 ? 12 : Date.Hour % 12;
    const TCHAR* AmPm = Date.Hour >= 12 ? TEXT("PM") : TEXT("AM");
    return FText::FromString(FString::Printf(TEXT("%s %02d %04d %d:%02d %s"),
        *Month, Date.Day, Date.Year, DisplayHour, Date.Minute, AmPm));
}
