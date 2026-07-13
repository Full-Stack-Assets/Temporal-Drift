"""Entry point matching setup script naming convention."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import photoreal_material_library as library
import unreal

library.build_library()
unreal.log("PHOTOREAL_MATERIAL_LIBRARY_SUCCESS")
