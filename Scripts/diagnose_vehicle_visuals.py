import unreal

bp_class = unreal.EditorAssetLibrary.load_blueprint_class("/Game/Blueprints/BP_DeLorean")
cdo = unreal.get_default_object(bp_class)

for mesh in cdo.get_components_by_class(unreal.SkeletalMeshComponent):
    unreal.log(
        "VISUAL_DIAG mesh="
        f"{mesh.get_name()} asset={mesh.get_editor_property('skeletal_mesh_asset')} "
        f"visible={mesh.get_editor_property('visible')} "
        f"hidden_in_game={mesh.get_editor_property('hidden_in_game')} "
        f"owner_no_see={mesh.get_editor_property('owner_no_see')} "
        f"only_owner_see={mesh.get_editor_property('only_owner_see')} "
        f"relative_location={mesh.get_editor_property('relative_location')} "
        f"relative_rotation={mesh.get_editor_property('relative_rotation')} "
        f"relative_scale={mesh.get_editor_property('relative_scale3d')}"
    )

for arm in cdo.get_components_by_class(unreal.SpringArmComponent):
    unreal.log(
        "VISUAL_DIAG spring_arm="
        f"{arm.get_name()} length={arm.get_editor_property('target_arm_length')} "
        f"socket_offset={arm.get_editor_property('socket_offset')} "
        f"target_offset={arm.get_editor_property('target_offset')} "
        f"collision={arm.get_editor_property('do_collision_test')}"
    )

for camera in cdo.get_components_by_class(unreal.CameraComponent):
    unreal.log(
        "VISUAL_DIAG camera="
        f"{camera.get_name()} active={camera.get_editor_property('auto_activate')} "
        f"location={camera.get_editor_property('relative_location')}"
    )
