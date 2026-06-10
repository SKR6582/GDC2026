---
name: Pro Diamond Broadcast
colors:
  surface: '#12131a'
  surface-dim: '#12131a'
  surface-bright: '#383940'
  surface-container-lowest: '#0d0e14'
  surface-container-low: '#1a1b22'
  surface-container: '#1f1f26'
  surface-container-high: '#292931'
  surface-container-highest: '#34343c'
  on-surface: '#e3e1eb'
  on-surface-variant: '#c5c5d5'
  inverse-surface: '#e3e1eb'
  inverse-on-surface: '#2f3037'
  outline: '#8f8f9f'
  outline-variant: '#454653'
  surface-tint: '#bcc3ff'
  primary: '#bcc3ff'
  on-primary: '#011a97'
  primary-container: '#1428a0'
  on-primary-container: '#8f9cff'
  inverse-primary: '#4152c5'
  secondary: '#ffb596'
  on-secondary: '#581e00'
  secondary-container: '#fe6500'
  on-secondary-container: '#541d00'
  tertiary: '#ffb4a1'
  on-tertiary: '#611300'
  tertiary-container: '#721800'
  on-tertiary-container: '#ff7f5d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc3ff'
  on-primary-fixed: '#000d60'
  on-primary-fixed-variant: '#2638ad'
  secondary-fixed: '#ffdbcd'
  secondary-fixed-dim: '#ffb596'
  on-secondary-fixed: '#360f00'
  on-secondary-fixed-variant: '#7c2e00'
  tertiary-fixed: '#ffdbd2'
  tertiary-fixed-dim: '#ffb4a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#84250a'
  background: '#12131a'
  on-background: '#e3e1eb'
  surface-variant: '#34343c'
typography:
  score-display:
    fontFamily: Bebas Neue
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: 0.05em
  player-name:
    fontFamily: Noto Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  stat-label:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  pitch-speed:
    fontFamily: JetBrains Mono
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
  body-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  caption-sm:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  safe-zone: 64px
  gutter-md: 16px
  element-gap: 8px
  component-padding: 12px
---

## Brand & Style
The visual direction of this design system is rooted in the high-stakes, high-energy world of professional baseball broadcasting. It is designed to prioritize data legibility and immediate recognition under the fast-paced conditions of a live KBO game. 

The aesthetic merges **Modern Broadcast** standards with **Glassmorphism**. It utilizes deep translucent layers to ensure the background game footage remains visible while providing a stable, high-contrast surface for complex statistics. The emotional response is one of authority, precision, and athletic intensity, using bold condensed typography to echo the verticality of a stadium scoreboard.

## Colors
The palette is driven by the rivalry between the Samsung Lions Blue and Hanwha Eagles Orange, serving as the primary anchors for team-specific data. The core UI operates in a deep dark mode to minimize glare for viewers.

Functional accents are strictly reserved for game state indicators:
- **Strike/Out Red:** High-visibility signals for critical game transitions.
- **Ball Yellow:** A high-contrast warning color for count tracking.
- **Translucent Neutrals:** All containers use a 75% opacity black to maintain "on-field" context without sacrificing the legibility of white text.

## Typography
The typography system uses a tri-font strategy to differentiate types of information:
- **Bebas Neue:** Used exclusively for scores, inning numbers, and large impact headers. Its condensed nature allows for large numerals within tight horizontal containers.
- **Noto Sans KR:** The workhorse font for player names, team cities, and general information. It ensures maximum readability for Korean characters.
- **JetBrains Mono:** Employed for technical data points like pitch velocity (km/h) and RPM. The monospaced nature prevents "jumping" numbers during live data updates.

## Layout & Spacing
This design system adheres to a **Fixed 1280x720 Broadcast Grid**. 
- **Safe Zones:** A 10% (64px) margin is maintained on all sides to ensure critical information (scores, pitch counts) is not cut off by various screen aspect ratios or hardware scaling.
- **Horizontal Rhythm:** Elements like the "Scorebug" (top-left) or "L-Bar" (bottom/side) are built on an 8px modular scale.
- **Fixed Positioning:** Unlike fluid web layouts, components have absolute coordinates relative to the 720p canvas to ensure pixel-perfect alignment with broadcast graphics hardware.

## Elevation & Depth
Depth is achieved through **Tonal Translucency** rather than traditional drop shadows, which can appear muddy on compressed video streams.
- **Layer 1 (Base):** The live video feed.
- **Layer 2 (Overlays):** 75% black surfaces with a subtle 1px inner border (white at 10% opacity) to define edges.
- **Layer 3 (Active Elements):** High-saturation blocks of Primary Blue or Orange that sit "above" the black glass to highlight the team currently at bat or in possession.
- **Layer 4 (Critical Alerts):** Strike/Ball indicators utilize a glow effect (neon-style) to simulate stadium lights and draw immediate eye movement.

## Shapes
The shape language is **Soft (0.25rem)**. While sports graphics often lean into sharp angles, this design system uses subtle rounding to feel modern and premium. 
- Score boxes and nameplates use `rounded-sm`.
- Impact badges (like "HR" or "OUT") may use `rounded-lg` to differentiate themselves from the structured grid of the scoreboard.
- Avoid full pills (rounded-full) to maintain the technical, data-driven "command center" aesthetic.

## Components
- **Scorebug:** A compact horizontal unit placed in the Title Safe area (top-left). It contains team abbreviations (Bebas Neue), scores, the diamond graphic for runners, and the count (S/B/O dots).
- **Pitch Tracker:** A vertical translucent rectangle positioned bottom-right. It uses a coordinate grid to show ball placement with `accent_strike_red` and `accent_ball_yellow` circular markers.
- **Lower Third (Player Card):** A wide bar containing the player's photo, name in Noto Sans, and season stats in JetBrains Mono. It uses a gradient transition from the team's primary color to the 75% translucent black.
- **The Count:** Strike and Ball indicators are styled as glowing "LED" dots. A Strike is a vivid Red circle, a Ball is a vivid Yellow circle, and an Out is a Red "X" or circle.
- **Speed Indicator:** A dedicated floating badge that appears briefly after a pitch, using JetBrains Mono for the numeric value to emphasize the technical measurement.