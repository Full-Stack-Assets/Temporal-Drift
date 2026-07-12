import unreal

bp_class = unreal.EditorAssetLibrary.load_blueprint_class("/Game/Blueprints/BP_DeLorean")
cdo = unreal.get_default_object(bp_class)
context = cdo.get_editor_property("VehicleMappingContext")
for mapping in context.get_editor_property("mappings"):
    action = mapping.get_editor_property("action")
    key = mapping.get_editor_property("key")
    unreal.log(
        f"INPUT_DIAG action={action.get_name() if action else None} "
        f"key={key.export_text()}"
    )
