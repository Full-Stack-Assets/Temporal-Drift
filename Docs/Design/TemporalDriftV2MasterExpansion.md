# Temporal Drift v2 Master Expansion

Last updated: 2026-07-13

## Purpose

This document captures the broad architectural direction for the v2 / master-game expansion. It intentionally stays at the worldbuilding and gameplay-architecture level so the project can move quickly tonight without exploding into granular implementation tasks.

The core spine is:

```text
1885 buried origin -> 1955 divergence point -> 1985-A corrupted mirror -> 2045 paradox endpoint
```

1955 remains the first vertical-slice pivot. The later eras become readable consequences of earlier player actions rather than isolated theme parks.

## Design Rules

- Keep one persistent Hill Valley geography where possible; eras change architecture, access, population, signage, weather, interiors, and mission ownership.
- Treat timeline changes as data-driven facts, not one-off level hacks.
- Preserve 1985 and 1955 as release-critical until the vertical slice is accepted.
- Use 1885, 1985-A, and 2045 as master-game expansion layers that deepen the same cause-effect system.
- Build broad landmarks and mechanics first; defer dense side-content and granular checklist tasks to later planning.

## 2045 Deep Future

2045 is the city made from accumulated consequences. It should feel like Hill Valley has been forced upward because the ground-level timeline became too unstable to trust.

### Three-Level Vertical City

| Level | Role | Player Read |
| --- | --- | --- |
| Lower Level | maintenance streets, old tunnels, displaced citizens, illegal time-tech salvage | the buried cost of progress |
| Middle Level | transit deck, markets, clinics, public-facing commerce, museums | the clean civic future shown to visitors |
| Upper Level | elite towers, sky gardens, private security, temporal-monitoring offices | power literally above everyone else |

Traversal should reinforce class and access: freight elevators, skybridges, service ladders, mag-rail platforms, and restricted security gates.

### Heritage District Mechanics

The Heritage District is a regulated preservation zone around courthouse square. It contains curated historical architecture from 1885, 1955, and 1985, but it is not fully honest history.

Mechanics:

- scan preserved buildings for mismatches against the player's known timeline facts;
- unlock sealed historical interiors with permits, forged credentials, or stealth routes;
- discover that some preservation choices hide paradox damage rather than celebrate history;
- use the district as the physical entrance to the Paradox Pressure Valve.

## 1985-A: Biffhorrific

1985-A is the corrupted mirror of Hill Valley. It should use the same recognizable map skeleton but twist every landmark into a social and visual warning.

### Timeline Corruption

The altered timeline affects daily life systemically:

- courthouse square becomes a casino/civic-control plaza;
- the school becomes propaganda administration and surveillance intake;
- the diner becomes a private club, debt office, or informant bar;
- residential districts become fenced worker housing;
- the industrial edge expands into polluted salvage and enforcement yards;
- citizens speak in guarded lines, avoid public memory, and react fearfully to patrols.

### Dark-Mirror Sub-Map

The point is contrast, not pure scale. Every district should answer: “What did this place become after the wrong person profited from the timeline?”

| Normal Hill Valley | 1985-A Mirror |
| --- | --- |
| Courthouse / clocktower | casino tower, damaged clock face, public intimidation stage |
| School | loyalty office, records seizure room, detention yard |
| Diner | restricted club, debt booth, rumor hub |
| Vale Garage | shuttered workshop or black-market repair bay |
| Residential blocks | controlled housing and patrol checkpoints |
| Industrial edge | future-alloy exploitation site |

Gameplay emphasis: infiltration, resistance contacts, evidence recovery, undoing control systems, and returning to the causal era with proof.

## Paradox Pressure Valve

The Paradox Pressure Valve is the master-game connective tissue. It explains why 2045 is unstable and turns the paradox meter into world architecture.

### Accumulation of Echoes

Unresolved temporal events collect in 2045 as echoes:

- wrong-era props and weather;
- duplicated citizens or contradictory family records;
- repeating dialogue loops;
- impossible buildings occupying the same historical footprint;
- ghost traffic and phantom trains;
- mission objects appearing in the wrong era.

Echoes should be deterministic outputs of timeline facts, not random noise. A player should be able to trace a strange 2045 event back to a choice in 1885, 1955, 1985-A, or 2015.

### Valve Mechanism

The Valve is a massive temporal regulator beneath or inside the Heritage District. It stabilizes the city by absorbing paradox debt, but it also edits public history to keep the city functional.

Endgame use:

- resolve causes across eras to vent the Valve safely;
- overload it to restore a lost timeline at a cost;
- preserve a flawed but stable future if the player values continuity over truth.

## 1885 Steam-Punk Frontier

1885 is the buried origin of Hill Valley's temporal instability. It should start as frontier dust and gradually reveal proto-time-machine infrastructure.

### Clockwork Temporal Engines

Early experiments use mechanical language:

- brass regulators;
- pressure gauges;
- flywheels;
- lightning rods;
- rail capacitors;
- vacuum tubes;
- mine-shaft resonance chambers.

These machines are unstable ancestors of later time-circuit technology. They should look handmade, dangerous, and only half-understood.

### Temporal Rail Network

A secret rail network moves displaced travelers and forbidden cargo across the frontier. Later eras inherit its tunnels, sealed stations, and forgotten rights-of-way.

Gameplay uses:

- route-switch puzzles;
- timed train interception;
- hidden station discovery;
- rescuing displaced NPCs;
- explaining why some future infrastructure follows strange underground paths.

## 1955 Divergence Point

1955 remains the most important cause layer. Small changes here should create the largest future consequences.

### Ripple Effect

Minor interventions can alter:

- family names and citizen relationships;
- business ownership and signage;
- school records and civic plaques;
- road access and bridge construction;
- future wealth and political control;
- 1985-A activation conditions;
- 2045 Heritage District exhibits.

The design target is readability: after a jump, the player should see at least one sign, NPC line, map route, or mission objective that clearly proves the past changed the future.

### Hidden Lab

The hidden lab sits beneath or near courthouse square. It connects 1885 mechanical experiments to 1955 electrical experiments and eventually to the 2045 Pressure Valve.

Broad role:

- origin point for Hill Valley's temporal sensitivity;
- source of early records that June can decode;
- location where Victor Crane first discovers a future-alloy clue;
- late-game route into the Heritage District / Valve infrastructure.

## Cross-Era Architecture

The v2 structure should avoid disconnected era episodes. Each era has a function in one timeline machine:

| Era | Function |
| --- | --- |
| 1885 | buried origin, temporal rail, proto-engines |
| 1955 | divergence source and hidden lab |
| 1985 | player home state and consequence comparison |
| 1985-A | corrupted mirror proving the cost of failed intervention |
| 2015 | transitional futurism and hover/skyway vocabulary |
| 2045 | paradox endpoint, Heritage District, Pressure Valve |

## Milestone Order

1. Finish the 1985 -> 1955 -> 1985 vertical slice.
2. Promote 1955 ripple facts into visible 1985 consequences.
3. Add 1985-A as the first major consequence sub-map.
4. Add 1885 as the hidden-origin era feeding the lab/rail mystery.
5. Add 2045 as the paradox endpoint and master-game finale.

This order preserves the current playable foundation while giving every later era a clear job.

