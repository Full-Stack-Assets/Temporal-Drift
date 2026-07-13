import unreal

for name in ("NiagaraSystemFactoryNew", "NiagaraEmitterFactoryNew", "NiagaraSystem", "NiagaraEmitter"):
    unreal.log(f"NIAGARA_API {name}={hasattr(unreal, name)}")
