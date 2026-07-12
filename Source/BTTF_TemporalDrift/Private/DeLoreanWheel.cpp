// DeLoreanWheel.cpp
#include "DeLoreanWheel.h"

UDeLoreanWheelFront::UDeLoreanWheelFront()
{
    WheelRadius = 35.0f;
    WheelWidth = 20.0f;
    AxleType = EAxleType::Front;
    bAffectedBySteering = true;
    bAffectedByHandbrake = false;
    bAffectedByEngine = false;
    MaxSteerAngle = 40.0f;
    SuspensionMaxRaise = 8.0f;
    SuspensionMaxDrop = 12.0f;
}

UDeLoreanWheelRear::UDeLoreanWheelRear()
{
    WheelRadius = 35.0f;
    WheelWidth = 20.0f;
    AxleType = EAxleType::Rear;
    bAffectedBySteering = false;
    bAffectedByHandbrake = true;
    bAffectedByEngine = true;
    SuspensionMaxRaise = 8.0f;
    SuspensionMaxDrop = 12.0f;
}
