# Design: Lightbox fix, Watering Can icon, Pinch-zoom grid

Date: 2026-04-24

## 1 — Lightbox white border

**Problem:** A white strip appears on the right side of the lightbox in `npm run dev` but not in the production build. Root cause: the lightbox overlay uses `bg-black/80` (80% opacity), so the browser-default white `<body>` background bleeds through the transparent portion at the viewport edge (scrollbar track area or body margin). The issue is dev-only because Vite's HMR client may alter the body layout slightly.

**Fix:**
- Set `background-color: #000` on `<html>` and `<body>` in `index.html` so no white shows through any translucent overlay.
- When the lightbox opens, set `document.body.style.overflow = 'hidden'` to prevent the scrollbar track from being visible; restore on close.
- Implemented via a `watch(showLightbox, ...)` in `PlantPhoto.vue`.

## 2 — Watering Can icon

**Problem:** Lucide Vue Next has no watering can icon. The current `💧` emoji and `<Droplets>` icon convey a state ("wet"), not an action ("needs watering").

**Solution:** Create `src/components/icons/WateringCan.vue` — a minimal inline SVG component using the MDI `watering-can-outline` path (Apache-2.0, 24×24 viewBox, `fill="currentColor"`). No new npm dependency.

**Usage sites:**
- `AttentionBadge.vue`: replace `💧` emoji with `<WateringCan>` icon + text
- `AppHeader.vue`: replace `<Droplets>` with `<WateringCan>` in the "needs water" badge

**Component API:** accepts `class` attribute via `inheritAttrs` / `v-bind="$attrs"` for sizing with Tailwind (`class="size-3"`).

## 3 — Pinch-to-zoom on PlantGrid

**Goal:** User can pinch-zoom the plant grid to control how many cards fit per row.

**Implementation:**
- Add `minCardWidth` as `useLocalStorage('plantgrid-card-width', 160)` in `PlantGrid.vue`.
- Range: 120–320 px.
- Grid template: switch from Tailwind static class to inline style:
  ```
  :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` }"
  ```
- Pinch gesture via raw touch events on a `ref`-attached grid element:
  - `touchstart`: if 2 fingers, record initial distance + current width.
  - `touchmove` (`{ passive: false }`): if 2 fingers, compute scale, update `minCardWidth`, call `preventDefault()` to block browser native zoom.
  - `touchend`: reset tracking state.
- Single-finger scroll continues to work via default browser handling.
- `onMounted` / `onUnmounted` manage the non-passive `touchmove` listener.
