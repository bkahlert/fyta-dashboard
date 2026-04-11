// src/composables/useGridLayout.js
import { computed, toValue } from 'vue'

/**
 * Finds the column count that maximises the shorter side of each card
 * for `count` plants in a container of `availW` × `availH` pixels.
 *
 * Returns a reactive { cols, rows } object.
 * Accepts plain numbers or refs for all arguments.
 */
export function useGridLayout(count, availW, availH) {
  return computed(() => {
    const n = toValue(count)
    const w = toValue(availW)
    const h = toValue(availH)

    if (!n || n <= 0 || w <= 0 || h <= 0) return { cols: 1, rows: 1 }

    let bestCols = 1
    let bestArea = 0

    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols)
      const area = Math.min(w / cols, h / rows)
      if (area > bestArea) {
        bestArea = area
        bestCols = cols
      }
    }

    return {
      cols: bestCols,
      rows: Math.ceil(n / bestCols),
    }
  })
}
