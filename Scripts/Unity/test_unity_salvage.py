#!/usr/bin/env python3
"""Engine-agnostic checks for the Unity salvage package."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UNITY = ROOT / "Unity" / "TemporalDrift"
DATA = UNITY / "Assets" / "Resources" / "TemporalDrift"
ART = UNITY / "Assets" / "Art"

FAILURES: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        FAILURES.append(message)


def load(name: str) -> dict:
    path = DATA / f"{name}.json"
    check(path.is_file(), f"missing {path}")
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def test_salvageable_files() -> None:
    vehicle = ART / "Vehicles" / "HeroTimeMachine.fbx"
    hero = ART / "Characters" / "Hero1985.fbx"
    check(vehicle.is_file() and vehicle.stat().st_size > 10_000, "HeroTimeMachine.fbx missing or tiny")
    check(hero.is_file() and hero.stat().st_size > 10_000, "Hero1985.fbx missing or tiny")
    check((ART / "ConceptReference").exists(), "concept reference folder missing")
    jpgs = list((ART / "ConceptReference").glob("*.jpg"))
    check(len(jpgs) == 43, f"expected 43 concept jpgs, found {len(jpgs)}")
    check((UNITY / "Assets" / "SourceArtKeep" / "HeroTimeMachine.blend").is_file(), "blend source missing")
    check((ROOT / "Docs" / "UnityTransition" / "EVALUATION.md").is_file(), "evaluation doc missing")
    # Unreal binaries must not be copied into the Unity tree.
    uassets = list(UNITY.rglob("*.uasset"))
    check(not uassets, f"Unity tree contains uassets: {uassets[:3]}")


def test_ip_boundary() -> None:
    genealogy = json.dumps(load("Genealogy")).lower()
    dialogue = json.dumps(load("Dialogue")).lower()
    for banned in ("mcfly", "tannen", "biff", "delorean", "doc brown", "marty"):
        check(banned not in genealogy, f"genealogy still contains {banned}")
        check(banned not in dialogue, f"dialogue still contains {banned}")


def evaluate_facts(data: dict) -> dict[str, bool]:
    defs = {fact["id"]: fact for fact in data["facts"]}
    computed: dict[str, bool] = {}
    visiting: set[str] = set()

    def eval_fact(fact_id: str) -> bool:
        if fact_id in computed:
            return computed[fact_id]
        if fact_id in visiting:
            raise RuntimeError(f"cycle at {fact_id}")
        visiting.add(fact_id)
        fact = defs[fact_id]
        deps = fact.get("dependencies") or []
        satisfied = True
        for dep in deps:
            if dep["id"] not in defs or eval_fact(dep["id"]) != dep["requiredValue"]:
                satisfied = False
                break
        if deps:
            value = fact["valueWhenDependenciesSatisfied"] if satisfied else fact["defaultValue"]
        else:
            value = fact["defaultValue"]
        visiting.remove(fact_id)
        computed[fact_id] = value
        return value

    for fact_id in defs:
        eval_fact(fact_id)
    return computed


def test_fact_graph() -> None:
    data = load("TimelineFacts")
    values = evaluate_facts(data)
    check(values["1985.StreetRenamed"] is True, "default world should have renamed street")
    # Winning the land dispute should preserve the mall site and keep the street name.
    for fact in data["facts"]:
        if fact["id"] == "1885.LandDisputeWon":
            fact["defaultValue"] = True
    values = evaluate_facts(data)
    check(values["1955.MallSiteOwned"] is True, "land dispute should own mall site")
    check(values["1985.StreetRenamed"] is False, "owned mall site should keep original street name")


def test_time_travel_rules() -> None:
    settings = load("TimeTravelSettings")
    check(settings["jumpSpeedThresholdMph"] == 40.0, "jump gate must stay 40 MPH")
    check(settings["fluxCapacitorMaxEnergy"] == 1210.0, "flux max energy drifted")
    armed = False
    current = "Present1985"

    def request(dest: str, speed: float, flux: float) -> tuple[bool, str]:
        nonlocal armed, current
        if not armed:
            return False, "Arm the time circuits first."
        if dest == current:
            return False, "Select a different destination era."
        if speed < settings["jumpSpeedThresholdMph"]:
            return False, "speed"
        if flux < settings["fluxCapacitorMaxEnergy"] * settings["fluxEnergyRequiredFraction"]:
            return False, "flux"
        current = dest
        return True, ""

    ok, reason = request("Past1955", 40.0, 1210.0)
    check(ok is False and "Arm" in reason, "unarmed jump must fail")
    armed = True
    ok, reason = request("Present1985", 40.0, 1210.0)
    check(ok is False, "same-era jump must fail")
    ok, reason = request("Past1955", 39.9, 1210.0)
    check(ok is False, "39.9 MPH must fail")
    ok, reason = request("Past1955", 40.0, 1210.0)
    check(ok is True and current == "Past1955", "40 MPH armed jump to 1955 must succeed")


def test_missions_and_dialogue() -> None:
    missions = load("Missions")
    ids = [m["id"] for m in missions["missions"]]
    for expected in (
        "M01.FirstTestRun",
        "M02.ClocktowerCalibration",
        "M05.RaceTheLightning",
        "SideA.FacesOfHillValley",
    ):
        check(expected in ids, f"missing mission {expected}")
    dialogue = load("Dialogue")
    convos = {c["id"]: c for c in dialogue["conversations"]}
    check("M01.GarageTutorial" in convos, "missing garage tutorial")
    check(convos["M01.GarageTutorial"]["nodes"][0]["missionEvent"] == "TalkedToVale", "M01 event wiring")


def test_layout_and_tuning() -> None:
    layout = load("HillValleyLayout")
    names = {block["name"] for block in layout["blocks"]}
    check("HV_Courthouse_Main" in names, "courthouse missing from layout")
    check("HV_Clocktower_Base" in names, "clocktower missing from layout")
    check(layout["townOffsetY"] == 7600.0, "town offset drifted")
    tuning = load("VehicleTuning")
    check(tuning["massKg"] == 1320.0, "vehicle mass drifted")
    check(tuning["maxSteerAngleDegrees"] == 40.0, "steer angle drifted")


def main() -> int:
    test_salvageable_files()
    test_ip_boundary()
    test_fact_graph()
    test_time_travel_rules()
    test_missions_and_dialogue()
    test_layout_and_tuning()
    if FAILURES:
        print("FAIL")
        for item in FAILURES:
            print(f"  - {item}")
        return 1
    print("PASS unity salvage package")
    print(f"  data files: {len(list(DATA.glob('*.json')))}")
    print(f"  concept stills: {len(list((ART / 'ConceptReference').glob('*.jpg')))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
