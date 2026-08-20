# Mobile Optimization Notes (PlayCanvas + lessons from Three.js)

## Techniques to apply

1. **Draw call reduction**
   - Merge static era props into fewer meshes where possible
   - Avoid unique materials per prop; atlas when real art arrives

2. **Texture budget**
   - Cap at 1024 on Low, 2048 on High
   - Use basis/ktx2 when pipeline supports (PlayCanvas has Basis module)

3. **Dynamic resolution**
   - Scale `app.graphicsDevice` resolution under frame-time pressure
   - Three.js pattern: measure ms, lerp pixel ratio 0.6–1.0

4. **Shadow cost**
   - Disable shadows on Low; single cascade only on Med
   - Shadow map 512 on mobile vs 1024 desktop

5. **Garbage / GC**
   - Reuse vectors in vehicle + chase (already partially done)
   - Avoid creating materials in update loops

6. **iOS Safari specifics**
   - AudioContext resume on every pointerdown
   - `touch-action: none` on body
   - Prevent multi-touch zoom (`touchmove` with touches.length > 1)
   - Prefer Pointer Events when available
   - `viewport-fit=cover` + safe-area insets
   - Standalone PWA reduces browser chrome jank

7. **Memory**
   - Unload non-visible era roots completely (enabled=false helps; destroy+reload for hard memory)
   - Sequential AssetPipelineLoader yields to main thread

8. **Battery**
   - Pause update loop when `document.hidden`
   - Reduce particle rates when battery level API available (optional)

## PlayCanvas-specific

- `app.setCanvasResolution(pc.RESOLUTION_AUTO)` + manual max pixel ratio
- Layer culling for distant storefronts
- Disable frustum culling only if profiling shows CPU cost higher than benefit
