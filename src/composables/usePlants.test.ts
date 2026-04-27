import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlants } from './usePlants'

// Flush all microtasks + one macrotask tick so async execute() has time to complete
const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const emptyList = { gardens: [], hubs_with_lost_connection: [], plants: [] }

describe('usePlants', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('initial state', () => {
    it('plants is empty before first fetch completes', () => {
      vi.mocked(fetch).mockReturnValue(new Promise(() => {})) // never resolves
      const { plants, error, isFetching } = usePlants()
      expect(plants.value).toHaveLength(0)
      expect(error.value).toBeNull()
      expect(isFetching.value).toBe(true)
    })
  })

  describe('on list HTTP error', () => {
    it('sets error', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response)
      const { error, plants } = usePlants()
      await flushPromises()
      expect(error.value).toBeInstanceOf(Error)
      expect((error.value as Error).message).toContain('401')
      expect(plants.value).toHaveLength(0)
    })
  })

  describe('on list schema mismatch', () => {
    it('sets error instead of silently showing empty grid', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: 'shape' }),
      } as Response)
      const { error, plants } = usePlants()
      await flushPromises()
      expect(error.value).toBeInstanceOf(Error)
      expect(plants.value).toHaveLength(0)
    })

    it('error is not null — the empty-grid silent-failure regression', async () => {
      // Regression for: FYTA API returns 200 OK with non-standard body
      // (e.g. rate-limit JSON), Zod parse fails, execute() returned without
      // setting error.value, and the UI showed "Keine Pflanzen gefunden"
      // with no indication of the real problem.
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'Too Many Requests' }),
      } as Response)
      const { error } = usePlants()
      await flushPromises()
      expect(error.value).not.toBeNull()
    })
  })

  describe('on successful empty list', () => {
    it('plants is empty and error is null', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => emptyList,
      } as Response)
      const { error, plants } = usePlants()
      await flushPromises()
      expect(error.value).toBeNull()
      expect(plants.value).toHaveLength(0)
    })
  })
})
