# Hero Time-Machine Source Art

This directory contains original, project-owned geometry generated for Temporal Drift. It is a legally distinct 1980s stainless-steel time-machine coupe and contains no extracted or trademark-bearing model data.

Regenerate with Blender 5.1:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\generate_hero_vehicle.ps1
```

The asset uses centimeters, forward `+X` in Blender source, `-Y` FBX forward, and `Z` up. Target overall dimensions are approximately 420 x 185 x 115 cm. Major objects, wheel pivots, LOD objects, collision objects, and the eight named material slots are validated by `Scripts/Tests/test_hero_vehicle_source.ps1`.
