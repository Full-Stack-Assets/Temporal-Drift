# Niagara Systems Guide for BTTF Project

## 1. Flux Capacitor System (NS_FluxCapacitor)

**Emitters:**
- **YTube_Pulsing** (GPU Sprite)
  - Spawn Rate: Driven by FluxCharge parameter (0–100)
  - Color: Blue → White as charge increases
  - Size: Pulsing based on speed

- **FluxArcs** (Beam + Ribbon)
  - Connects the three Y-tubes
  - High noise + curl for electric feel
  - Emissive boost when charging

- **FluxDispersal** (Ribbon)
  - Energy flowing across the car body
  - Uses Mesh Sampling from DeLorean

## 2. Temporal Vortex / Time Jump (NS_TimeVortex)

**Main Emitter:**
- Large GPU Sprite vortex in front of the car
- Strong Curl Noise + World Position Offset for swirling effect
- Camera-facing + additive blending
- Color: Cyan / Blue / White
- Spawn Rate ramps up dramatically at the configured jump threshold (40 MPH by default)

**Secondary Emitters:**
- Fire trail from tires (when jumping)
- Electrical arcs around the vehicle
- Screen-space distortion (post-process material triggered from Niagara)

## 3. Hawking Radiation Feedback (NS_HawkingRadiation)

- High-energy white/blue particles bursting outward
- Short lifetime + high velocity
- Used when WormholeStability is low or after risky jumps
- Can be attached to the Flux Capacitor or the whole car

## 4. Tipler Cylinder (NS_TiplerCharge)

- Large rotating cylinder of energy
- Strong gravitational lensing look (use distortion material)
- Particles orbiting at increasing speed as charge builds
- Very high visual intensity when near 85%+ charge

## Recommended Parameters to Expose
- `FluxCharge` (0–1)
- `SpeedMph`
- `bIsJumping`
- `ParadoxLevel`
- `WormholeStability`

These parameters should be set from C++ / Blueprint every frame or on relevant events.
