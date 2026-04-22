# Plant Card Design — Unified Card + Full-Width Responsive Grid

**Date:** 2026-04-12  
**Status:** Approved

## Goal

Improve the Home Assistant plants-dashboard (view 0) in two ways:

1. Each plant's two separate panels (info + moisture graph) become one visually unified card with a border.
2. The grid fills the full browser width and adapts its column count to screen size.

## Prerequisites / installed HACS cards

| Card                            | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `custom:auto-entities`          | Dynamic plant enumeration (already installed)   |
| `custom:mushroom-template-card` | Plant info header (already installed)           |
| `custom:layout-card`            | Responsive grid (newly installed)               |
| `custom:card-mod`               | CSS styling of vertical-stack (newly installed) |

## Backup

Before applying any changes, read the current dashboard config via WebSocket and write it to `backups/plants-dashboard-<YYYY-MM-DD>.yaml`. This file can be re-pushed at any time to restore the previous state.

## Section 1 — Panel mode (full width)

Set `panel: true` on view 0 of `plants-dashboard`. This removes HA's default centered max-width constraint and makes the single top-level card (`auto-entities`) fill 100% of browser width.

This is a single-field change to the view config object.

## Section 2 — Responsive grid

Replace the current `type: grid` inner card (inside `auto-entities`) with:

```yaml
type: custom:layout-card
layout_type: custom:grid-layout
layout:
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))
  grid-gap: 8px
```

`auto-fill` + `minmax(280px, 1fr)` means: pack as many columns as the viewport allows, each at least 280px wide. On a wide monitor this yields 5–6 columns; on a tablet 2–3; on a phone 1. `auto-entities` continues to populate the layout via `card_param: cards`.

## Section 3 — Per-plant card (visual grouping)

Each plant remains a `vertical-stack` with the same two children (mushroom-template-card + sensor graph). A `card-mod` style is added to the `vertical-stack` to give it a unified card appearance:

```yaml
card_mod:
  style: |
    ha-card {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--ha-card-background, var(--card-background-color));
      overflow: hidden;
    }
```

- Uses HA theme CSS variables so it adapts to light/dark mode automatically.
- `overflow: hidden` prevents the graph from bleeding past the rounded corners.
- The children (mushroom-template-card, sensor graph) are unchanged.

## Implementation order

1. Read current config + write backup file
2. Apply panel mode to view 0
3. Swap inner grid card to layout-card with CSS grid
4. Add card-mod style to each vertical-stack in the auto-entities filter options
5. Push updated config, verify in browser
