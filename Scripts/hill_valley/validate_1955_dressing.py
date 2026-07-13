import unreal

LEVEL='/Game/Levels/LVL_TimeTravelTest'
REQUIRED={
    'HV_1955_Courthouse':4,
    'HV_1955_Storefront':12,
    'HV_1955_Sign':12,
    'HV_1955_StreetFurniture':12,
    'HV_1955_ParkedCar':6,
    'HV_1955_RoadMarking':4,
    'HV_1955_Vegetation':8,
    'HV_1955_Lighting':1,
}

if not unreal.EditorLoadingAndSavingUtils.load_map(LEVEL):
    raise RuntimeError(f'Unable to load {LEVEL}')

actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
failures=[]
for tag,minimum in REQUIRED.items():
    count=sum(1 for actor in actors if unreal.Name(tag) in actor.get_editor_property('tags'))
    unreal.log(f'HILL_VALLEY_1955_COUNT {tag}={count}')
    if count<minimum: failures.append(f'{tag}: expected at least {minimum}, found {count}')

era_actors=[actor for actor in actors if unreal.Name('HV_Era1955') in actor.get_editor_property('tags')]
labels=[actor.get_actor_label() for actor in era_actors]
duplicates=sorted({label for label in labels if labels.count(label)>1})
if duplicates: failures.append('duplicate 1955 labels: '+', '.join(duplicates[:10]))
if any(actor.get_editor_property('is_spatially_loaded') for actor in era_actors):
    failures.append('1955 courthouse-square dressing must remain always loaded for the vertical slice')

if not unreal.EditorAssetLibrary.does_asset_exist('/Game/Data/DataLayers/DL_1955'):
    failures.append('DL_1955 data layer asset is missing')

if failures: raise RuntimeError('1955 dressing validation failed: '+'; '.join(failures))
unreal.log('HILL_VALLEY_1955_VALIDATION_SUCCESS')
