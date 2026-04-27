import { useIntervalFn } from '@vueuse/core'

export async function useAutoReload() {
  if (import.meta.env.DEV) return

  let intervalMs = 60_000
  try {
    const res = await fetch('/config.json')
    if (res.ok) {
      const cfg = (await res.json()) as { autoReloadInterval?: number }
      if (cfg.autoReloadInterval) intervalMs = cfg.autoReloadInterval
    }
  } catch {
    // use default
  }

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
