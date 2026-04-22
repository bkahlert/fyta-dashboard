import type { MaybeRefOrGetter } from 'vue'

import { computed, toValue } from 'vue'

export interface GridLayout {
  cols: number
  rows: number
}

export function useGridLayout(
  count: MaybeRefOrGetter<number>,
  availW: MaybeRefOrGetter<number>,
  availH: MaybeRefOrGetter<number>,
) {
  return computed<GridLayout>(() => {
    const n = toValue(count)
    const w = toValue(availW)
    const h = toValue(availH)

    if (n <= 0 || w <= 0 || h <= 0) return { cols: 1, rows: 1 }

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

    return { cols: bestCols, rows: Math.ceil(n / bestCols) }
  })
}
