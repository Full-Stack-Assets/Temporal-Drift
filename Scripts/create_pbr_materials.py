"""Backward-compatible entry point for the Hill Valley photoreal material library."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_HILL_VALLEY_DIR = os.path.join(_SCRIPT_DIR, "hill_valley")
if _HILL_VALLEY_DIR not in sys.path:
    sys.path.insert(0, _HILL_VALLEY_DIR)

import photoreal_material_library as library
import unreal

library.build_library()
unreal.log("PBR_MATERIALS_SUCCESS")
