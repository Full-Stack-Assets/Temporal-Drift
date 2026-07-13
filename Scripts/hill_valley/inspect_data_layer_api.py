import unreal
unreal.EditorLoadingAndSavingUtils.load_map('/Game/Levels/LVL_TimeTravelTest')
sub=unreal.get_editor_subsystem(unreal.DataLayerEditorSubsystem)
unreal.log('DATA_LAYER_API '+','.join(sorted(name for name in dir(sub) if 'layer' in name.lower() or 'actor' in name.lower())))
