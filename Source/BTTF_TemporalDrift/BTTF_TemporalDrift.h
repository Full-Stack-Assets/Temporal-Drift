// BTTF_TemporalDrift.h - Primary game module
#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

class FBTTF_TemporalDriftModule : public FDefaultGameModuleImpl
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};
