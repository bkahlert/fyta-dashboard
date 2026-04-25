import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { Plant } from './api/schemas'
import AppHeader from './components/AppHeader.vue'
import PlantGrid from './components/PlantGrid.vue'
import { makeMoisturePlant } from './stories/plantFactory'

const meta: Meta = {
  title: 'App',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj

// lostHubs mirrors hubs_with_lost_connection from GET /api/user-plant (the authoritative source per CLAUDE.md)
const shell = (plants: Plant[], isFetching = false, error = '', lostHubs: Array<{ id: string; name: string }> = []) => ({
  components: { AppHeader, PlantGrid },
  setup: () => ({
    plants,
    isFetching,
    error,
    errorHubs: lostHubs,
    lastUpdated: new Date(Date.now() - 3 * 60 * 1000),
  }),
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

const HUB_A: NonNullable<Plant['hub']> = { id: 1, hub_id: 'hub-1', hub_name: 'Wohnzimmer', status: 'correct', received_data_at: null, reached_hub_at: null }
const HUB_B: NonNullable<Plant['hub']> = { id: 2, hub_id: 'hub-2', hub_name: 'Balkon',     status: 'correct', received_data_at: null, reached_hub_at: null }

const FEW = [
  makeMoisturePlant(1, 'too_low', 'Fikus'),
  makeMoisturePlant(2, 'low',     'Monstera'),
  makeMoisturePlant(3, 'perfect', 'Efeutute'),
]

const MANY = [
  makeMoisturePlant(1,  'too_low', 'Fikus'),
  makeMoisturePlant(2,  'low',     'Monstera'),
  makeMoisturePlant(3,  'perfect', 'Efeutute'),
  makeMoisturePlant(4,  'perfect', 'Bogenhanf'),
  makeMoisturePlant(5,  'high',    'Aloe Vera'),
  makeMoisturePlant(6,  'perfect', 'Geldbaum'),
  makeMoisturePlant(7,  'low',     'Orchidee'),
  makeMoisturePlant(8,  'perfect', 'Palme'),
  makeMoisturePlant(9,  'too_low', 'Kaktus'),
  makeMoisturePlant(10, 'perfect', 'Farn'),
  makeMoisturePlant(11, 'perfect', 'Tillandsie'),
  makeMoisturePlant(12, 'too_high','Basilikum'),
  makeMoisturePlant(13, 'perfect', 'Zitronenbaum'),
  makeMoisturePlant(14, 'low',     'Bambus'),
  makeMoisturePlant(15, 'perfect', 'Yucca'),
  makeMoisturePlant(16, 'too_low', 'Sukkulente'),
  makeMoisturePlant(17, 'perfect', 'Drachenbaum'),
  makeMoisturePlant(18, 'high',    'Bromelien'),
  makeMoisturePlant(19, 'perfect', 'Chrysantheme'),
  makeMoisturePlant(20, 'low',     'Rosmarin'),
  makeMoisturePlant(21, 'perfect', 'Minze'),
  makeMoisturePlant(22, 'too_low', 'Basilikum 2'),
  makeMoisturePlant(23, 'perfect', 'Lavendel'),
]

export const Loading: Story = { render: () => shell([], true) }
export const FetchError: Story = { render: () => shell([], false, 'HTTP 401 Unauthorized') }
export const FewPlants: Story = { render: () => shell(FEW) }
export const ManyPlants: Story = { render: () => shell(MANY) }

export const HubError: Story = {
  render: () => shell(
    [
      makeMoisturePlant(1, 'perfect', 'Fikus',    HUB_A),
      makeMoisturePlant(2, 'low',     'Monstera', HUB_A),
      makeMoisturePlant(3, 'perfect', 'Efeutute'),
    ],
    false, '',
    [{ id: HUB_A.hub_id, name: HUB_A.hub_name ?? HUB_A.hub_id }],
  ),
}

export const MultipleHubErrors: Story = {
  render: () => shell(
    [
      makeMoisturePlant(1, 'perfect', 'Fikus',    HUB_A),
      makeMoisturePlant(2, 'low',     'Monstera', HUB_A),
      makeMoisturePlant(3, 'too_low', 'Kaktus',   HUB_B),
      makeMoisturePlant(4, 'perfect', 'Efeutute'),
    ],
    false, '',
    [
      { id: HUB_A.hub_id, name: HUB_A.hub_name ?? HUB_A.hub_id },
      { id: HUB_B.hub_id, name: HUB_B.hub_name ?? HUB_B.hub_id },
    ],
  ),
}
