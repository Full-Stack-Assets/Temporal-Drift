#include "DeLoreanTuningData.h"

UDeLoreanTuningData::UDeLoreanTuningData()
{
    ForwardGearRatios = {3.50f, 2.19f, 1.52f, 1.16f, 0.91f};

    if (FRichCurve* Curve = TorqueCurve.GetRichCurve())
    {
        Curve->Reset();
        Curve->AddKey(0.0f, 0.70f);
        Curve->AddKey(1500.0f, 0.90f);
        Curve->AddKey(3500.0f, 1.00f);
        Curve->AddKey(5500.0f, 0.85f);
        Curve->AddKey(6500.0f, 0.60f);
    }
}
