#include "KeyboardCameraStateComponent.h"

void UKeyboardCameraStateComponent::ReceiveManualInput(float PitchDelta, float YawDelta)
{
    const float DeltaTime = GetWorld() ? GetWorld()->GetDeltaSeconds() : 0.016f;
    ApplyOrbitInput(YawDelta, PitchDelta, FMath::Max(DeltaTime, KINDA_SMALL_NUMBER));
}
