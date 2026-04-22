import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { MeasurementStatus } from './types/plant'

import AppHeader from './components/AppHeader.vue'
import PlantGrid from './components/PlantGrid.vue'
import { createPlant } from './types/plant'

const meta: Meta = {
  title: 'App',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj

const makePlant = (
  id: number,
  moisture_status: MeasurementStatus,
  nickname: string,
  hub?: { hub_id: string; hub_name: string; status: 'correct' | 'error' },
) =>
  createPlant({
    id, nickname, scientific_name: 'Monstera deliciosa',
    moisture_status, light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect',
    thumb_path: '',
    hub: hub ?? null,
  })

const FEW = [
  makePlant(1, 'too_low', 'Fikus'),
  makePlant(2, 'low', 'Monstera'),
  makePlant(3, 'perfect', 'Efeutute'),
]

const MANY = [
  makePlant(1,  'too_low', 'Fikus'),
  makePlant(2,  'low',     'Monstera'),
  makePlant(3,  'perfect', 'Efeutute'),
  makePlant(4,  'perfect', 'Bogenhanf'),
  makePlant(5,  'high',    'Aloe Vera'),
  makePlant(6,  'perfect', 'Geldbaum'),
  makePlant(7,  'low',     'Orchidee'),
  makePlant(8,  'perfect', 'Palme'),
  makePlant(9,  'too_low', 'Kaktus'),
  makePlant(10, 'perfect', 'Farn'),
  makePlant(11, 'perfect', 'Tillandsie'),
  makePlant(12, 'too_high','Basilikum'),
  makePlant(13, 'perfect', 'Zitronenbaum'),
  makePlant(14, 'low',     'Bambus'),
  makePlant(15, 'perfect', 'Yucca'),
  makePlant(16, 'too_low', 'Sukkulente'),
  makePlant(17, 'perfect', 'Drachenbaum'),
  makePlant(18, 'high',    'Bromelien'),
  makePlant(19, 'perfect', 'Chrysantheme'),
  makePlant(20, 'low',     'Rosmarin'),
  makePlant(21, 'perfect', 'Minze'),
  makePlant(22, 'too_low', 'Basilikum 2'),
  makePlant(23, 'perfect', 'Lavendel'),
]

const shell = (plants: ReturnType<typeof makePlant>[], isFetching = false, error = '') => ({
  components: { AppHeader, PlantGrid },
  setup: () => {
    const errorHubs = [...new Map(
      plants.filter(p => p.hubStatus === 'error' && p.hubId)
        .map(p => [p.hubId, { id: p.hubId!, name: p.hubName ?? p.hubId! }]),
    ).values()]
    return { plants, isFetching, error, errorHubs, lastUpdated: new Date(Date.now() - 3 * 60 * 1000) }
  },
  template: `
    <div class="flex flex-col h-screen overflow-hidden bg-base-100">
      <AppHeader :is-loading="isFetching" :last-updated="lastUpdated" :plants="plants" />
      <div v-if="errorHubs.length > 0" class="bg-warning/10 border-b border-warning/30 px-4 py-1 shrink-0">
        <p class="text-xs text-warning flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Hub-Verbindung verloren: {{ errorHubs.map(h => h.name).join(', ') }}</span>
        </p>
      </div>
      <div v-if="isFetching && plants.length === 0" class="flex-1 flex items-center justify-center">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
      <div v-else-if="error && plants.length === 0" class="p-4">
        <div role="alert" class="alert alert-error text-sm">
          <span>Pflanzen konnten nicht geladen werden: {{ error }}</span>
        </div>
      </div>
      <PlantGrid v-else :plants="plants" />
    </div>
  `,
})

const HUB_A = { hub_id: 'hub-1', hub_name: 'Wohnzimmer', status: 'error' as const } satisfies Parameters<typeof makePlant>[3]
const HUB_B = { hub_id: 'hub-2', hub_name: 'Balkon',     status: 'error' as const } satisfies Parameters<typeof makePlant>[3]

export const Loading: Story = { render: () => shell([], true) }
export const FetchError: Story = { render: () => shell([], false, 'HTTP 401 Unauthorized') }
export const FewPlants: Story = { render: () => shell(FEW) }
export const ManyPlants: Story = { render: () => shell(MANY) }

export const HubError: Story = {
  render: () => shell([
    makePlant(1, 'perfect', 'Fikus', HUB_A),
    makePlant(2, 'low',     'Monstera', HUB_A),
    makePlant(3, 'perfect', 'Efeutute'),
  ]),
}

export const MultipleHubErrors: Story = {
  render: () => shell([
    makePlant(1, 'perfect', 'Fikus',    HUB_A),
    makePlant(2, 'low',     'Monstera', HUB_A),
    makePlant(3, 'too_low', 'Kaktus',   HUB_B),
    makePlant(4, 'perfect', 'Efeutute'),
  ]),
}
