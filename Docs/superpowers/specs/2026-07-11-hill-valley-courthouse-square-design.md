# Hill Valley Courthouse Square Design

## Objective

Transform `LVL_TimeTravelTest` from a simple driving sandbox into a recognizable, playable Hill Valley courthouse-square blockout. The town must use a neutral architectural base that remains stable while era Data Layers replace visual dressing.

## Chosen Approach

Use a modular cinematic blockout with slightly widened gameplay roads. The courthouse and clocktower provide the hero silhouette. Reusable storefront modules, sidewalks, streets, landscaping, and civic props establish the surrounding square without requiring finished custom art.

This approach prioritizes three outcomes:

- Immediate recognition from the DeLorean chase camera.
- Reliable vehicle collision and turning space.
- Clean separation between permanent architecture and era-specific dressing.

## Spatial Layout

The courthouse occupies the north end of the composition and faces south. It includes a raised foundation, broad stairs, columned entrance, central clocktower, roofline, and visible clock face.

A landscaped civic lawn and paved plaza sit directly south of the courthouse. A rectangular two-lane road loop surrounds the central square. The road is wider than a strict film-scale recreation so the DeLorean can turn, drift, and recover without repeatedly mounting the curb.

Two- and three-story storefront rows line the east, west, and south sides. Side alleys and gaps break up the building mass and create future routes. The south approach road becomes the player entry axis, with the DeLorean facing toward the courthouse.

## Neutral Base Architecture

The following elements remain active across every era:

- Terrain and surrounding landscape foundation.
- Courthouse structural shell and clocktower massing.
- Storefront structural shells and collision.
- Main road loop, approach road, sidewalks, curbs, and crossings.
- Central lawn, civic plaza, alleys, and parking geometry.
- Stable collision, navigation clearances, and player spawn locations.

Neutral materials use restrained brick, stone, concrete, asphalt, plaster, glass, and roof colors. They must read clearly in Lit mode without depending on Lumen.

## Modular Building Kit

Storefront rows use reusable pieces sized to a common grid:

- Ground-floor shop bays.
- Upper-floor window bays.
- Corner modules.
- Flat and shallow-pitched roof modules.
- Parapets, cornices, awnings, doors, and window inserts.
- Neutral blank sign panels that era layers can cover or replace.

The first pass favors strong proportions and silhouettes over detailed interiors. Storefront interiors may use dark backing planes so windows do not reveal empty space.

## Courthouse Hero Structure

The courthouse must be visually distinct from the modular storefronts. Its blockout includes:

- Symmetrical stone or pale masonry façade.
- Broad stair and landing.
- Four-column entrance composition.
- Central pediment and clocktower.
- Large readable clock face.
- Rear and side massing sufficient to look like a complete civic building.

The clocktower should remain readable from the south spawn and from both sides of the road loop.

## Streetscape and Landscape

The neutral streetscape includes curbs, sidewalks, crossings, parking strips, benches, planters, streetlights, hydrants, trash cans, and tree wells. These objects use consistent spacing and must not obstruct the primary driving line.

The central square combines a lawn, paths, low hedges, trees, and paved civic space. Surrounding terrain receives gentle elevation changes and tree clusters to prevent the town from appearing suspended in an empty plane.

## Era Data Layers

The existing era Data Layers control dressing rather than core geometry:

- `DL_1885`: hides most modern storefront dressing and introduces dirt-road overlays, timber fronts, wagons, frontier props, and sparse vegetation.
- `DL_1955`: clean façades, bright period signs, striped awnings, young trees, period vehicles, and optimistic lighting.
- `DL_1985_Present`: aged surfaces, contemporary signs, mature trees, parking meters, and normal civic wear.
- `DL_1985_Alternate`: boarded windows, damaged signs, graffiti, debris, hostile lighting, fencing, and neglected landscaping.
- `DL_2015`: renovated surfaces, digital signage, advanced street furniture, cleaner paving, and futuristic vehicle props.
- `DL_2045`: optional architectural overlays, holographic elements, and more advanced civic technology.

Only `DL_1985_Present` is active by default during the first implementation pass. The initial build creates neutral geometry and a limited set of present-era dressing hooks; full era dressing remains a later art pass.

## Player and Vehicle Flow

The active player DeLorean starts on the south approach road, centered in its lane and aimed at the courthouse. The Player Start remains nearby as a fallback.

Road widths, curb radii, and building setbacks must support forward driving, reverse recovery, steering tests, and a complete lap around the square. No decorative prop may block the main loop.

## Lighting and Rendering

The level retains the stable non-Lumen lighting configuration. Directional light, skylight, atmospheric sky, and post-processing must produce a readable daylight scene with no black-screen failure.

The courthouse façade and clocktower receive sufficient front and ambient illumination to remain the visual focus. Building overhangs and alleys may be darker but must remain navigable.

## Implementation Boundaries

The first implementation pass includes:

- Courthouse and clocktower blockout.
- Central square and road loop.
- Sidewalks, curbs, and south approach.
- Modular storefront rows on three sides.
- Basic neutral materials.
- Essential trees, lamps, benches, and landscape shaping.
- Vehicle and collision verification.

It does not include detailed interiors, film-accurate signage, finished character populations, traffic AI, or complete dressing for every era.

## Verification

The implementation is successful when:

- The courthouse and clocktower are immediately visible and recognizable from the player start.
- The DeLorean can drive from the south approach and complete the road loop without collision traps.
- Storefronts form coherent east, west, and south edges around the square.
- Neutral architecture remains independent of era-specific dressing.
- `DL_1985_Present` remains the default active era.
- Lit mode renders a readable daylight scene without relying on Lumen.
- The level saves and reopens without missing actors or compilation errors.
