import { useIntervalFn, useNow } from '@vueuse/core'
import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'

const rtf = new Intl.RelativeTimeFormat('de', { style: 'long' })

const MS_PER_SECOND = 1_000
const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000

const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3_600
const SECONDS_PER_DAY = 86_400

const REFRESH_INTERVAL_MS = 1_000

const THRESHOLDS: Array<{ divisor: number; maxSec: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { divisor: MS_PER_SECOND, maxSec: SECONDS_PER_MINUTE, unit: 'second' },
  { divisor: MS_PER_MINUTE, maxSec: SECONDS_PER_HOUR, unit: 'minute' },
  { divisor: MS_PER_HOUR, maxSec: SECONDS_PER_DAY, unit: 'hour' },
  { divisor: MS_PER_DAY, maxSec: Infinity, unit: 'day' },
]

export interface RelativeTimeOptions {
  /** Show "gerade eben" instead of second-level precision for timestamps < 1 minute */
  collapseSeconds?: boolean
}

function formatDiffMs(diffMs: number, options?: RelativeTimeOptions): string {
  const absSec = Math.abs(diffMs) / MS_PER_SECOND
  if (options?.collapseSeconds && absSec < SECONDS_PER_MINUTE) return 'gerade eben'
  const { divisor, unit } = THRESHOLDS.find(({ maxSec }) => absSec < maxSec) ?? {
    divisor: MS_PER_DAY,
    unit: 'day' as Intl.RelativeTimeFormatUnit,
  }
  return rtf.format(Math.round(diffMs / divisor), unit)
}

export function formatRelativeTime(date: Date | null, now = new Date(), options?: RelativeTimeOptions): string {
  return date === null ? '–' : formatDiffMs(date.getTime() - now.getTime(), options)
}

export function useRelativeTime(date: MaybeRefOrGetter<Date | null>, options?: RelativeTimeOptions): ComputedRef<string> {
  const now = useNow({ scheduler: (cb) => useIntervalFn(cb, REFRESH_INTERVAL_MS) })
  return computed(() => formatRelativeTime(toValue(date), now.value, options))
}
