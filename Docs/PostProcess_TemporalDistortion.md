# Post-Process Material for Temporal Distortion

## Material Name: M_TemporalDistortion

### Recommended Setup
- **Material Domain**: Post Process
- **Blend Mode**: Translucent
- **Shading Model**: Unlit

### Key Parameters to Expose
- `DistortionIntensity` (Scalar)
- `ChromaticAberrationAmount` (Scalar)
- `TimeRippleSpeed` (Scalar)
- `ScreenTearStrength` (Scalar) — increases with high paradox

### Material Logic (High Level)
1. Sample SceneTexture (PostProcessInput0)
2. Apply UV distortion using Sine + Time + Noise texture
3. Add Chromatic Aberration by offsetting R, G, B channels differently
4. Add subtle screen tearing lines when Paradox is high
5. Output final distorted color

### Blueprint / C++ Usage
When Paradox level is high or during a time jump:
- Dynamically increase `DistortionIntensity` and `ScreenTearStrength` on the Post Process Material Instance
- Use a Timeline or Niagara event to animate the effect during jumps

This creates the signature "reality breaking" look when the timeline becomes unstable.
