"""Expand Hill Valley into a full metro region with districts, infrastructure, and NPC anchors."""
import math
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import hill_valley_common as hv


def spawn_municipal_building(name, sign, location, size, material, district="HV_District_Civic"):
    x, y = location
    width, depth, height = size
    hv.spawn_block(name, (x, y, height / 2), size, material, tags=("HV_Building", district, "HV_Destination"))
    hv.spawn_block(
        f"{name}_Roof", (x, y, height + 110), (width + 180, depth + 180, 220),
        hv.materials_global["roof"], tags=("HV_Building", district),
    )
    hv.spawn_text_sign(
        f"{name}_Sign", sign, (x, y - depth / 2 - 30, height * 0.72),
        rotation=(0, 0, 90), tags=(district, "HV_DestinationSign"), scale=2.8,
    )
    hv.build_destination_facade(name, x, y, size, hv.materials_global, district)
    interior_y = y - depth * 0.2
    hv.spawn_block(
        f"{name}_InteriorFloor", (x, interior_y, 35),
        (width * 0.62, depth * 0.45, 35), hv.materials_global["concrete"],
        tags=("HV_Interior", "HV_MissionAccess", district),
    )


def spawn_house(prefix, x, y, body_mat, index=0):
    hv.spawn_block(prefix, (x, y, 420), (2100, 1450, 840), body_mat, tags=("HV_Building", "HV_District_Residential"))
    hv.spawn_block(
        f"{prefix}_Roof", (x, y, 930), (2300, 1650, 260),
        hv.materials_global["roof"], tags=("HV_Building", "HV_District_Residential"),
    )
    hv.spawn_block(
        f"{prefix}_Porch", (x - 1170 if x < 0 else x + 1170, y, 140),
        (320, 900, 180), hv.materials_global["concrete"], tags=("HV_Prop", "HV_District_Residential"),
    )
    hv.spawn_block(
        f"{prefix}_Garage", (x, y + 1050, 280), (1450, 650, 560),
        body_mat, tags=("HV_Building", "HV_District_Residential"),
    )
    door_x = x - 1060 if x < 0 else x + 1060
    hv.spawn_block(
        f"{prefix}_FrontDoor", (door_x, y - 730, 300), (360, 45, 620),
        hv.materials_global["dark"], tags=("HV_Architecture", "HV_District_Residential"),
    )
    for window_index in (-1, 1):
        hv.spawn_block(
            f"{prefix}_Window_{window_index:+d}", (x + window_index * 560, y - 730, 560),
            (420, 45, 300), hv.materials_global["glass"],
            tags=("HV_Architecture", "HV_District_Residential"),
        )
    if index % 3 == 0:
        hv.spawn_tree(f"{prefix}_YardTree", (x + 900, y + 400, 0), hv.materials_global, 0.85)


def spawn_suburb_grid(prefix, origin_x, origin_y, rows, cols, x_step, y_step, side=-1):
    mats = hv.materials_global
    palette = [mats["plaster"], mats["brick"], mats["brick_dark"], mats["stone"]]
    house_index = 0
    for row in range(rows):
        for col in range(cols):
            x = origin_x + side * (col * x_step)
            y = origin_y + row * y_step
            spawn_house(f"{prefix}_{row:02d}_{col:02d}", x, y, palette[house_index % len(palette)], house_index)
            house_index += 1


def spawn_school_campus(materials):
    campus_x, campus_y = -16800, 11800
    spawn_municipal_building(
        "HV_MiddleSchool", "HILL VALLEY MIDDLE SCHOOL",
        (campus_x, campus_y), (4800, 3600, 1300), materials["brick_red"], "HV_District_School",
    )
    spawn_municipal_building(
        "HV_ElementarySchool", "OAK PARK ELEMENTARY",
        (campus_x + 6200, campus_y), (4200, 3200, 1100), materials["plaster"], "HV_District_School",
    )
    hv.spawn_block(
        "HV_SchoolGym", (campus_x + 3100, campus_y + 5200, 750),
        (5200, 3800, 1500), materials["brick_dark"], tags=("HV_Building", "HV_District_School"),
    )
    hv.spawn_block(
        "HV_SportsField", (campus_x + 3100, campus_y + 9800, 40),
        (6800, 4200, 80), materials["grass"], tags=("HV_Landscape", "HV_District_School"),
    )
    hv.spawn_block(
        "HV_SchoolParking", (campus_x - 4200, campus_y + 1800, 25),
        (3600, 5200, 50), materials["asphalt"], tags=("HV_Road", "HV_District_School", "HV_Parking"),
    )
    for index, (x, y) in enumerate((
        (campus_x - 1800, campus_y + 1200), (campus_x + 1800, campus_y + 1200),
        (campus_x + 6200, campus_y + 1200), (campus_x + 3100, campus_y + 5200),
    )):
        hv.spawn_marker(f"HV_SchoolNav_{index:02d}", (x, y, 120), ("HV_Navigation", "HV_PedestrianNode"))


def spawn_municipal_complex(materials):
    civic_x = -16800
    civic_y = 3200
    buildings = (
        ("HV_CityHall", "HILL VALLEY CITY HALL", (civic_x, civic_y), (5200, 4200, 1600), materials["stone"]),
        ("HV_PoliceStation", "HILL VALLEY POLICE", (civic_x, civic_y - 6200), (3800, 3000, 1050), materials["brick_dark"]),
        ("HV_FireStation", "FIRE STATION NO. 1", (civic_x + 5200, civic_y - 6200), (3600, 2800, 980), materials["brick_red"]),
        ("HV_PublicLibrary", "HILL VALLEY LIBRARY", (civic_x + 5200, civic_y), (4000, 3200, 1150), materials["plaster"]),
        ("HV_PostOffice", "U.S. POST OFFICE", (civic_x, civic_y + 6200), (3400, 2600, 900), materials["stone"]),
        ("HV_CommunityHospital", "HILL VALLEY HOSPITAL", (civic_x + 5200, civic_y + 6200), (4600, 3600, 1400), materials["concrete"]),
    )
    for name, sign, (x, y), size, material in buildings:
        spawn_municipal_building(name, sign, (x, y), size, material, "HV_District_Civic")


def spawn_industrial_park(materials):
    base_x, base_y = 19800, -19800
    for row in range(4):
        for col in range(3):
            x = base_x + col * 3600
            y = base_y - row * 3200
            label = f"HV_Warehouse_{row}_{col}"
            hv.spawn_block(
                label, (x, y, 700), (3200, 2400, 1400), materials["brick_dark"],
                tags=("HV_Building", "HV_District_Industrial"),
            )
            hv.spawn_block(
                f"{label}_Roof", (x, y, 1480), (3400, 2600, 180),
                materials["roof"], tags=("HV_Building", "HV_District_Industrial"),
            )
            hv.spawn_block(
                f"{label}_LoadingDock", (x, y - 1500, 120), (2800, 500, 240),
                materials["concrete"], tags=("HV_Prop", "HV_District_Industrial"),
            )

    hv.spawn_static_mesh(
        "HV_WaterTower_Tank", hv.CYLINDER, (base_x + 9800, base_y - 4200, 2200),
        (8.0, 8.0, 5.5), material=materials["dark"], tags=("HV_Building", "HV_District_Industrial", "HV_Infrastructure"),
    )
    hv.spawn_static_mesh(
        "HV_WaterTower_Legs", hv.CYLINDER, (base_x + 9800, base_y - 4200, 900),
        (1.2, 1.2, 18.0), material=materials["dark"], tags=("HV_Infrastructure", "HV_District_Industrial"),
    )
    hv.spawn_block(
        "HV_PowerSubstation", (base_x + 5200, base_y + 1800, 320),
        (2800, 2200, 640), materials["dark"], tags=("HV_Building", "HV_District_Industrial", "HV_Infrastructure"),
    )
    hv.spawn_block(
        "HV_LumberYard", (base_x - 4200, base_y - 5200, 280),
        (4200, 3600, 560), materials["trunk"], tags=("HV_Building", "HV_District_Industrial"),
    )
    hv.spawn_text_sign(
        "HV_IndustrialParkSign", "HILL VALLEY INDUSTRIAL PARK",
        (base_x + 1800, base_y + 4200, 500), rotation=(0, 0, 90),
        tags=("HV_District_Industrial", "HV_DestinationSign"), scale=2.4,
    )


def spawn_infrastructure(materials):
    hv.spawn_block(
        "HV_MetroGround", (0, 0, -160), (92000, 105000, 280),
        materials["grass"], tags=("HV_Landscape", "HV_Regional", "HV_Metro"),
    )
    outer_roads = (
        ("HV_MetroRing_North", (0, 32000, 15), (2200, 18000, 30)),
        ("HV_MetroRing_South", (0, -32000, 15), (2200, 18000, 30)),
        ("HV_MetroRing_West", (-34000, 0, 15), (18000, 2200, 30)),
        ("HV_MetroRing_East", (34000, 0, 15), (18000, 2200, 30)),
        ("HV_Highway_WestApproach", (-42000, -6000, 12), (12000, 1600, 24)),
        ("HV_Highway_EastApproach", (42000, 6000, 12), (12000, 1600, 24)),
    )
    for name, location, size in outer_roads:
        hv.spawn_block(name, location, size, materials["asphalt"], tags=("HV_Road", "HV_Regional", "HV_Metro"))

    for index, offset in enumerate((-28000, -14000, 0, 14000, 28000)):
        hv.spawn_block(
            f"HV_MetroCross_NS_{index}", (offset, 0, 38), (1800, 1800, 6),
            materials["concrete"], tags=("HV_Crossing", "HV_RoadMarking", "HV_Metro"),
        )
        hv.spawn_block(
            f"HV_MetroCross_EW_{index}", (0, offset, 38), (1800, 1800, 6),
            materials["concrete"], tags=("HV_Crossing", "HV_RoadMarking", "HV_Metro"),
        )

    hv.spawn_block(
        "HV_EastwoodRiver", (24800, 0, -40), (4200, 78000, 120),
        materials["water"], tags=("HV_Landscape", "HV_Water", "HV_Metro"),
    )
    hv.spawn_block(
        "HV_RiverBridgeDeck", (24800, -1800, 220), (4600, 1800, 80),
        materials["concrete"], tags=("HV_Road", "HV_Infrastructure", "HV_Metro"),
    )
    for index, y in enumerate((-2200, -1200, -200, 800, 1800)):
        hv.spawn_block(
            f"HV_RiverBridgePier_{index}", (24800, y, 60),
            (420, 420, 520), materials["stone"], tags=("HV_Infrastructure", "HV_Metro"),
        )

    for index in range(14):
        x = -36000 + index * 5600
        hv.spawn_block(
            f"HV_RailTrack_{index}", (x, -24800, 18), (5200, 180, 36),
            materials["dark"], tags=("HV_Infrastructure", "HV_Rail", "HV_Metro"),
        )
    hv.spawn_block(
        "HV_RailStation", (-12000, -24800, 520), (5200, 3200, 1040),
        materials["brick"], tags=("HV_Building", "HV_District_Civic", "HV_Infrastructure"),
    )
    hv.spawn_text_sign(
        "HV_RailStationSign", "HILL VALLEY STATION",
        (-12000, -26400, 900), rotation=(0, 0, 90),
        tags=("HV_DestinationSign", "HV_Infrastructure"), scale=2.2,
    )

    hv.spawn_block("HV_CentralPark", (-8200, 16800, 50), (8200, 6200, 100), materials["grass"], tags=("HV_Landscape", "HV_Park"))
    hv.spawn_block("HV_ParkPavilion", (-8200, 16800, 420), (2200, 2200, 840), materials["stone"], tags=("HV_Building", "HV_Park"))
    for index, (x, y) in enumerate(((-10200, 15400), (-6200, 15400), (-10200, 18200), (-6200, 18200))):
        hv.spawn_tree(f"HV_ParkTree_{index}", (x, y, 0), materials, 1.1)

    for row in range(6):
        for col in range(8):
            x = -30000 + col * 3200
            y = 22000 + row * 2800
            hv.spawn_block(
                f"HV_Farmland_{row}_{col}", (x, y, 30), (2800, 2400, 60),
                materials["sand"] if (row + col) % 2 == 0 else materials["grass"],
                tags=("HV_Landscape", "HV_District_Rural", "HV_Metro"),
            )

    commercial_strips = (
        ("HV_StripMall_North", (0, 24800, 520), (9800, 2600, 1040), "TOWN CENTER PLAZA"),
        ("HV_StripMall_East", (28800, 0, 480), (2600, 8200, 960), "EASTSIDE MARKET"),
    )
    for name, (x, y, z), size, sign in commercial_strips:
        hv.spawn_block(name, (x, y, z), size, materials["plaster"], tags=("HV_Building", "HV_District_Commercial", "HV_Metro"))
        hv.spawn_text_sign(f"{name}_Sign", sign, (x, y - size[1] / 2 - 20, z + 200), rotation=(0, 0, 90),
                           tags=("HV_District_Commercial", "HV_DestinationSign"), scale=2.0)


def spawn_population_anchors():
    named_citizens = (
        ("Vale", "DR. EMMETT VALE", (-2300, 900, 100)),
        ("June", "JUNE PARKER", (200, 3200, 120)),
        ("Elena", "ELENA CRANE", (-1800, 2800, 120)),
        ("Crane", "OFFICER CRANE", (-16800, -3000, 120)),
        ("Shopkeeper", "LOU'S CAFE", (-9400, -7600, 100)),
        ("Mechanic", "TWIN PINES SERVICE", (9800, 7800, 100)),
        ("Archivist", "HILL VALLEY ARCHIVES", (8200, 11600, 100)),
        ("Principal", "SCHOOL PRINCIPAL", (-16800, 11800, 120)),
    )
    for citizen_id, display_name, location in named_citizens:
        hv.spawn_named_citizen_node(citizen_id, display_name, location)

    pedestrian_nodes = []
    for ring_radius in (8000, 15000, 24000, 32000):
        for angle_index in range(12):
            angle = (angle_index / 12.0) * math.pi * 2.0
            pedestrian_nodes.append((
                int(ring_radius * math.cos(angle)),
                int(ring_radius * math.sin(angle)),
            ))
    for index, (x, y) in enumerate(pedestrian_nodes):
        hv.spawn_marker(
            f"HV_MetroPedNode_{index:02d}", (x, y, 120),
            ("HV_Navigation", "HV_PedestrianNode", "HV_Metro"),
        )

    suburb_nodes = (
        (-22000, -12000), (-22000, 4000), (-22000, 18000),
        (22000, -12000), (22000, 4000), (22000, 18000),
        (0, -26000), (0, 26000), (-30000, 0), (30000, 0),
        (-16800, 3200), (19800, -19800), (-16800, 11800), (24800, -6000),
    )
    for index, (x, y) in enumerate(suburb_nodes):
        hv.spawn_marker(
            f"HV_MetroDistrictNode_{index:02d}", (x, y, 120),
            ("HV_Navigation", "HV_PedestrianNode", "HV_Metro"),
        )

    for index, (x, y) in enumerate((
        (0, -30000), (0, -18000), (0, -6000), (0, 6000), (0, 18000), (0, 30000),
        (-34000, 0), (-20000, 0), (-6000, 0), (6000, 0), (20000, 0), (34000, 0),
        (-24800, -12000), (24800, 12000), (-12000, -24800),
    )):
        hv.spawn_marker(
            f"HV_MetroTraffic_{index:02d}", (x, y, 90),
            ("HV_TrafficRoute", "HV_ParkingNode", "HV_Metro"),
        )

    for index, (x, y) in enumerate((
        (0, -38000), (0, 38000), (-42000, 0), (42000, 0), (-30000, -30000), (30000, 30000),
    )):
        hv.spawn_marker(
            f"HV_MetroReset_{index:02d}", (x, y, 100),
            ("HV_ResetVolume", "HV_EmergencyRecovery", "HV_Metro"),
        )


def build_metro_expansion(materials):
    hv.materials_global = materials
    hv.log("building metro expansion (~920m x 1050m playable basin)")

    spawn_suburb_grid("HV_LyonEstates", 22000, -22000, 5, 4, 2200, 1900, side=1)
    spawn_suburb_grid("HV_MapleHills", -22000, -22000, 5, 4, 2200, 1900, side=-1)
    spawn_suburb_grid("HV_Riverview", 0, -30000, 4, 6, 2000, 1800, side=1)

    spawn_municipal_complex(materials)
    spawn_school_campus(materials)
    spawn_industrial_park(materials)
    spawn_infrastructure(materials)
    spawn_population_anchors()

    for index in range(72):
        side = -1 if index % 2 == 0 else 1
        x = side * (6000 + (index % 9) * 3200)
        y = -36000 + (index // 2) * 2200
        hv.spawn_tree(f"HV_MetroTree_{index}", (x, y, 0), materials, 0.7 + (index % 5) * 0.1)

    hv.log("metro expansion complete")


def main():
    if not unreal.EditorLoadingAndSavingUtils.load_map(hv.LEVEL):
        raise RuntimeError(f"Unable to load level: {hv.LEVEL}")
    materials = hv.create_default_materials()
    build_metro_expansion(materials)
    if not hv.level_subsystem.save_current_level():
        raise RuntimeError("Unable to save Hill Valley metro expansion")
    unreal.EditorAssetLibrary.save_directory(hv.MATERIAL_PATH, True, True)
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    hv.log("HILL_VALLEY_METRO_BUILD_SUCCESS")


if __name__ == "__main__":
    main()
