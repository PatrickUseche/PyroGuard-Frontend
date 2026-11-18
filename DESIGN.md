---
name: PyroGuard
description: Centro de control de riesgo de incendio forestal, leido como un cartel de peligro de carretera.
colors:
  conifer-rail: '#123b2e'
  conifer-rail-fire: '#8f1d18'
  conifer-rail-warning: '#5a4300'
  signal-ink: '#111915'
  page-mist: '#e8eee9'
  panel-white: '#ffffff'
  panel-muted: '#dbe5de'
  text-muted: '#435249'
  border-grey: '#6f7f75'
  focus-blue: '#0b5cad'
  link-green: '#0d5c3f'
  class-normal: '#1f8a4c'
  class-warning: '#f2a900'
  class-fire: '#d3302a'
  risk-normal-bg: '#d7efdf'
  risk-normal-text: '#0f4a2a'
  risk-warning-bg: '#ffe7a3'
  risk-warning-text: '#5c3500'
  risk-warning-border: '#b97a00'
  risk-fire-bg: '#fbd9d6'
  risk-fire-text: '#7a1511'
  status-offline-bg: '#e1e6e3'
  status-offline-text: '#39434c'
  status-unknown-bg: '#e1e8ef'
  status-unknown-text: '#34445c'
typography:
  display:
    fontFamily: "'Overpass Variable', 'Overpass', 'Arial Narrow', system-ui, sans-serif"
    fontSize: '2.25rem'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '0.04em'
  headline:
    fontFamily: "'Overpass Variable', 'Overpass', 'Arial Narrow', system-ui, sans-serif"
    fontSize: '1.35rem'
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: '0.02em'
  title:
    fontFamily: "'Overpass Variable', 'Overpass', 'Arial Narrow', system-ui, sans-serif"
    fontSize: '1rem'
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: '0.02em'
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Overpass Variable', 'Overpass', 'Arial Narrow', system-ui, sans-serif"
    fontSize: '0.8rem'
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: '0.06em'
rounded:
  card: '2px'
  control: '2px'
spacing:
  space-1: '4px'
  space-2: '8px'
  space-3: '12px'
  space-4: '16px'
  space-6: '24px'
  space-8: '32px'
components:
  rail:
    backgroundColor: '{colors.conifer-rail}'
    textColor: '{colors.page-mist}'
    padding: '24px 16px'
    width: '240px'
  panel:
    backgroundColor: '{colors.panel-white}'
    textColor: '{colors.signal-ink}'
    rounded: '{rounded.card}'
    padding: '16px'
  panel-fire:
    backgroundColor: '{colors.risk-fire-bg}'
    textColor: '{colors.risk-fire-text}'
  risk-badge-warning:
    backgroundColor: '{colors.class-warning}'
    textColor: '{colors.signal-ink}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '3px 8px'
    height: '28px'
  risk-badge-fire:
    backgroundColor: '{colors.class-fire}'
    textColor: '{colors.panel-white}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '3px 8px'
    height: '28px'
  risk-badge-normal:
    backgroundColor: '{colors.risk-normal-bg}'
    textColor: '{colors.risk-normal-text}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '3px 8px'
    height: '28px'
  button-outline:
    backgroundColor: '{colors.panel-white}'
    textColor: '{colors.signal-ink}'
    rounded: '{rounded.control}'
    padding: '8px 12px'
    height: '44px'
  stamp:
    textColor: '{colors.signal-ink}'
    typography: '{typography.label}'
    padding: '2px 8px'
---

# Design System: PyroGuard

## Overview

**Creative North Star: "Cartel de peligro de incendio"**

PyroGuard reads like a roadside fire-danger rating sign. Risk is a three-class scale (NORMAL, ADVERTENCIA, INCENDIO) with a pointer over the current class, drawn as a black signal block with enamel-saturated segments. The scale is the signature: it appears once large at the top of the summary and again in miniature on every node card. The surrounding chrome is conifer green, flat panels carry a thick black border, and there are no diffuse shadows or gradients. The mood is calm when everything is normal and unmistakable in fire, when the whole rail turns to a red field.

State is carried by shape and position, never by color alone: pointer and tall notch mark the current class, a dashed outline marks stale data, a distinct icon per risk and connection state, and a CERRADA stamp replaces a closed alert instead of letting it disappear. Density is moderate and operational: the operator reads class, finds the causing node, opens it.

**Key Characteristics:**

- Three-class scale with pointer, big band globally and 3-segment mini per node.
- Flat panels, 2px black border, 2px corners, no soft shadows.
- Overpass uppercase for labels and big numbers; system-ui for body.
- Global risk tints the rail through `body[data-risk]` in WARNING and FIRE.
- Every state has a non-color cue (icon, notch, dash, stamp).

## Colors

Conifer green chrome and mist-grey page, black signal ink, and three saturated enamel classes reserved for risk.

### Primary

- **Conifer Rail** (#123b2e): header/rail, primary actions, brand ground. In dark mode the primary role flips to a light green (#8fd9ae) and the rail darkens to #0a2a20.
- **Rail Fire Field** (#8f1d18) and **Rail Warning Field** (#5a4300): the rail's replacement when `body[data-risk]` is FIRE or WARNING (dark: #6e1613 / #4a3700).

### Secondary (risk classes, enamel)

- **Normal Green** (#1f8a4c), **Warning Amber** (#f2a900), **Fire Red** (#d3302a): scale segments, solid risk badges (WARNING and FIRE badges fill solid; NORMAL uses the pale tint), the brand flame icon (amber). Text on them: white on green and red, signal ink on amber.
- Pale tints with matching text and border for panels: normal #d7efdf / #0f4a2a, warning #ffe7a3 / #5c3500 (border #b97a00), fire #fbd9d6 / #7a1511. A fire node card and a fire alert card take the fire tint.

### Neutral

- **Signal Ink** (#111915): text, thick panel borders, the scale band ground.
- **Page Mist** (#e8eee9): page and on-rail text. **Panel White** (#ffffff) and **Panel Muted** (#dbe5de) for surfaces, skeletons, closed items.
- **Muted Text** (#435249), **Border Grey** (#6f7f75) for rules and secondary copy; **Link Green** (#0d5c3f); **Focus Blue** (#0b5cad, dark #8fd0ff) for the 3px focus ring.
- Connection states: offline grey (#e1e6e3 / #39434c), unknown blue-grey (#e1e8ef / #34445c), online reuses the normal tint.
- Dark mode exists as a `prefers-color-scheme: dark` override of the same tokens (page #0e1713, surface #16231d, text #ecf3ee); the class enamel colors are shared across modes.

### Named Rules

**The Enamel Reserve Rule.** Green, amber and red mean risk class and nothing else. Decorative use of them dilutes the sign.
**The Rail Field Rule.** Only `body[data-risk]` changes the rail color, and only for WARNING and FIRE; NORMAL leaves the conifer.

## Typography

**Display Font:** Overpass Variable (fallback Overpass, Arial Narrow, system-ui)
**Body Font:** system-ui stack (Segoe UI, sans-serif)
**Label Font:** Overpass Variable, uppercase

**Character:** Highway-signage Overpass for everything that is a label or a number, plain system text for reading. Numerals are tabular app-wide.

### Hierarchy

- **Display** (800, clamp(1.7rem, 3vw, 2.25rem), 0.04em, uppercase): page h1 only.
- **Headline** (800, 1.35rem, 0.02em): section h2 and brand (uppercase, 0.06em).
- **Title** (800, 1rem): card h3; state-message titles are uppercase at 0.04em.
- **Body** (400, 1rem, 1.5): copy; secondary 0.85-0.875rem in muted text.
- **Label** (800, 0.8rem, 0.06em, uppercase): risk and connection badges, scale labels (up to 1.9rem in the band), the stamp (0.08em).
- **Big numbers** (800 Overpass, 2rem; 3rem for the two emphasized stats).

### Named Rules

**The Sign Voice Rule.** Overpass is for labels, headings and numbers; paragraphs stay in system-ui.

## Layout

Desktop (>=960px, signed in): fixed 240px rail on the left, sticky full height; content max 1200px with 32px/24px padding. Below 960px (and on login) the rail becomes a top bar; at <=640px the nav scrolls horizontally on its own row and padding drops to 24px/16px. Page rhythm is a 32px gap between sections; 16px inside sections; 12px inside cards. Spacing steps: 4, 8, 12, 16, 24, 32.

The summary sits under the scale band: a bordered stats strip, auto-fit columns of 150px minimum, with Alertas activas and Nodos en riesgo spanning two columns at 3rem, and En linea, Sin conexion, Sin datos, Nodos totales at 2rem. The summary API provides counts only (no mean temperature or humidity), so the strip shows counts, not the four climate figures sketched in the brief. When alerts or nodes at risk are above zero, that cell takes the fire tint. At <=640px the strip becomes two columns. Node cards sit in `repeat(auto-fill, minmax(260px, 1fr))`, sorted FIRE, WARNING, normal, offline, unknown. In the band, segment descriptions disappear at <=640px.

## Elevation & Depth

Flat. Depth is carried by 2px black borders and tonal fills (muted panel for closed or skeleton, tint for risk), not shadows. The `--color-shadow` token is `none`. The scale pointer is the only protruding element.

### Named Rules

**The No-Blur Rule.** No diffuse shadows or gradients on app surfaces. The one exception in the build, the Leaflet map marker's small shadow, is drift (see below).

## Shapes

Near-square: 2px corners on panels, controls, badges and markers. Borders are 2px solid signal ink for panels and controls (1px for connection badges and table rules). The pointer is a white downward triangle (14px tall, 24px wide) above the current band segment. The mini scale is three bars, the current one tall (22px vs 10px). The stamp is a 2px bordered label tilted -2deg.

## Components

### Scale band (signature)

Signal-ink block, 14px padding, three equal segments with 6px gaps. Non-current segments are the class color mixed to 32% into ink; the current segment is solid class color with a white pointer above it. Each shows an uppercase label and a one-line description. Exposed as `role="img"` with an aria-label.

### Mini scale

Three bars, 2px gaps, the current class tall in its enamel color and the others short in muted panel color. Stale (offline) nodes draw the current bar as a 2px dashed muted outline with no fill. Null risk shows no tall bar.

### Risk badge

28px uppercase Overpass label, 2px border, 2px radius, with an icon per state: shield-check (normal), triangle (warning), flame (fire), circle-i (unevaluated), triangle (Desactualizado, muted grey). Normal is pale tint; warning and fire are solid.

### Connection badge

Same shape, 1px border; icons circle-check (online), crossed wifi (offline), question circle (unknown).

### Panels and node cards

White surface, 2px ink border, 2px radius, 16px padding. Fire cards take the fire tint and red border. Heading link is link green with a 44px target; reading details sit under a 1px rule.

### Alert cards and CERRADA stamp

Same panel; fire alerts tinted; closed alerts take the muted fill and grey border and show a stamp (2px ink border, uppercase Overpass, -2deg) in place of the status text.

### Buttons and selects

44px minimum height, 2px ink border, 2px radius, white fill. Rail buttons are outlined in on-rail color and invert on hover.

### Navigation

Rail links in Overpass 1.05rem/600, 44px high. Active: 800 weight, amber underline on the top bar, solid on-rail block on the desktop rail. Hover is a 12% white wash. The health indicator sits on a white plate.

### State message

Bordered panel with an icon: loading is dashed with a spinning ring, error takes the fire tint with `role="alert"`, empty is plain. Titles uppercase.

### Motion

State changes are short transitions; under `prefers-reduced-motion: reduce` animations stop (spinner off) and transitions are kept at 80ms rather than removed, so state changes still register.

## Do's and Don'ts

### Do:

- **Do** express risk as the three-class scale and repeat it per node in miniature.
- **Do** pair every color state with a shape cue: icon, notch, dash, or stamp.
- **Do** keep panels flat: 2px signal-ink border, 2px radius.
- **Do** tint the rail only through `body[data-risk]` for WARNING and FIRE.
- **Do** keep 44px minimum targets and the 3px focus-blue ring.
- **Do** show a CERRADA stamp for closed items instead of hiding them.

### Don't:

- **Don't** return to a grid of identical metric cards with a colored side border.
- **Don't** use green, amber or red for anything but risk class.
- **Don't** add blur shadows, gradients or radii above 2px to new surfaces.
- **Don't** set long paragraphs in Overpass.
- **Don't** signal state by color alone.
