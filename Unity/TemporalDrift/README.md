# Temporal Drift — Unity 6 clean build

This folder is a **new Unity project**, not a conversion of `BTTF_TemporalDrift.uproject`.

Unreal `.uasset` / `.umap` files are not imported. Salvaged inputs are:

- `Assets/Art/Vehicles/HeroTimeMachine.fbx`
- `Assets/Art/Characters/Hero1985.fbx`
- `Assets/SourceArtKeep/` Blender sources and generators
- `Assets/Art/ConceptReference/` mood boards (reference only)
- `Assets/Data/` JSON extracted from Unreal Python / C++ defaults

## Open in Unity

1. Install **Unity 6 (6000.0 LTS)** with **URP** and **Input System**.
2. Hub → Open → select `Unity/TemporalDrift`.
3. Let Unity generate `.meta` files on first import.
4. Menu **Temporal Drift → Generate Starter Scene**.
5. Press Play. Arrow keys drive; `T` arms circuits; `F` jumps when speed ≥ 40 MPH.

## Verify without the editor

From the repository root:

```bash
python3 Scripts/Unity/test_unity_salvage.py
```

## What this slice is

Playable rules for flux, paradox, era switching, missions, and dialogue, plus a primitive courthouse square. It is not a content-complete game and does not include licensed audio or Unreal Niagara.
