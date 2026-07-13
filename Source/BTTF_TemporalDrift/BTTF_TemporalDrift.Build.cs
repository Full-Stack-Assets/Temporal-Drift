// BTTF_TemporalDrift.Build.cs
using UnrealBuildTool;

public class BTTF_TemporalDrift : ModuleRules
{
	public BTTF_TemporalDrift(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"DeveloperSettings",
			"InputCore",
			"EnhancedInput",
			"ChaosVehicles",
			"PhysicsCore",
			"Niagara"
			,"UMG"
			,"Slate"
			,"SlateCore"
		});

		PrivateDependencyModuleNames.AddRange(new string[] { });
	}
}
