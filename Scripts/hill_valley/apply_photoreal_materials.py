"""Ensure photoreal library exists and is ready for Hill Valley builders."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import photoreal_material_library as library

library.build_library()
library.load_material_map()
import unreal
unreal.log("PHOTOREAL_MATERIALS_APPLY_SUCCESS")
