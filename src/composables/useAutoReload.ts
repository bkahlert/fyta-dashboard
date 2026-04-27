import { useIntervalFn } from '@vueuse/core'

export function useAutoReload(intervalMs = 5 * 60 * 1000) {
  if (import.meta.env.DEV) return

  let baseVersion: string | null = null

  const check = async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`)
      if (!res.ok) return
      const { version } = (await res.json()) as { version: string }
      if (baseVersion === null) {
        baseVersion = version
        return
      }
      if (version !== baseVersion) window.location.reload()
    } catch {
      // network unavailable — try again next interval
    }
  }

  check()
  useIntervalFn(check, intervalMs)
}
