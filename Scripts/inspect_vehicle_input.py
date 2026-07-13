import unreal

context = unreal.load_asset('/Game/Input/IMC_DeLorean')
if not context:
    raise RuntimeError('IMC_DeLorean is missing')

for mapping in context.get_editor_property('mappings'):
    action = mapping.get_editor_property('action')
    key = mapping.get_editor_property('key')
    unreal.log(f'VEHICLE_MAPPING action={action.get_name() if action else "None"} key={key.get_editor_property("key_name")}')
