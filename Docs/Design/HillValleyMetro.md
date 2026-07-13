# Hill Valley Metro Region

Last updated: 2026-07-13

## Scope

The Hill Valley map expands from a courthouse-square blockout into a **~920 m × 1050 m** metro basin with districts, infrastructure, population anchors, and mission-aligned placement.

## Districts

| District | Contents |
|----------|----------|
| Civic | City Hall, Police, Fire, Library, Post Office, Hospital, Rail Station |
| School | High School (existing), Middle School, Elementary, Gym, Sports Field |
| Residential | Lyon Estates, Maple Hills, Riverview suburbs (48+ houses) |
| Commercial | Courthouse square storefronts, strip malls, diner, service station |
| Industrial | Warehouse grid, water tower, substation, lumber yard |
| Rural | Twin Pines Ranch, farmland grids, regional hills |

## Infrastructure

- Metro ring roads and highway approaches
- Eastwood River with bridge crossing
- Rail corridor and Hill Valley Station
- Central park with pavilion
- Traffic route spline anchors (`place_traffic_routes.py`)

## NPCs

- **Named citizen nodes** (`HV_NamedCitizen`, `HV_Citizen_*`) for Vale, June, Elena, Crane, shopkeepers
- **Pedestrian nodes** (`HV_PedestrianNode`) — 60+ ring and district anchors
- **Runtime:** `UPopulationSpawnSubsystem` spawns `AHillValleyAmbientPedestrian` blockouts that wander between nodes, respecting `UEraPopulationManager` budgets and era changes via `UEraWorldManager::OnEraReady`

## Build pipeline

```powershell
.\Scripts\Build\setup_vertical_slice.ps1
```

Or manually:

1. `Scripts/hill_valley/build_hill_valley_square.py` — square + regional core + **metro expansion**
2. `Scripts/hill_valley/build_1955_dressing.py` — era overlay
3. `Scripts/hill_valley/place_mission_volumes.py` — missions (uses `hill_valley_coords.TOWN_OFFSET_Y`)
4. `Scripts/hill_valley/place_traffic_routes.py` — traffic spline anchors
5. Validators: `validate_hill_valley_square.py`, `validate_1955_dressing.py`

## Coordinates

All builders share `hill_valley_coords.py`:

- Design coordinates are local to the courthouse square origin
- World Y = local Y + **7600** (`TOWN_OFFSET_Y`)
- Mission volumes and world geometry now use the same offset

## Next editor steps

- Replace cube blockouts with modular meshes per district
- Author pedestrian skeletal meshes and animation blueprints
- Add spline-following traffic vehicles per era
- Enable World Partition streaming for distant metro props when art is ready
