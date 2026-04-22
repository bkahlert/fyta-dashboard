import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { Plant, SensorStatus } from '../types/plant'

import PlantGrid from './PlantGrid.vue'

const meta: Meta<typeof PlantGrid> = {
  component: PlantGrid,
  decorators: [
    () => ({
      template: '<div style="height:600px;display:flex;flex-direction:column"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof PlantGrid>

const makePlant = (id: number, moisture_status: SensorStatus, nickname: string): Plant => ({
  id,
  nickname,
  scientific_name: 'Monstera deliciosa',
  moisture_status,
  light_status: 3,
  temperature_status: 3,
  salinity_status: 3,
  thumb_path: '',
})

const FEW: Plant[] = [
  makePlant(1, 1, 'Fikus'),
  makePlant(2, 2, 'Monstera'),
  makePlant(3, 3, 'Efeutute'),
]

const MANY: Plant[] = [
  makePlant(1, 1, 'Fikus'),
  makePlant(2, 2, 'Monstera'),
  makePlant(3, 3, 'Efeutute'),
  makePlant(4, 3, 'Bogenhanf'),
  makePlant(5, 4, 'Aloe Vera'),
  makePlant(6, 3, 'Geldbaum'),
  makePlant(7, 2, 'Orchidee'),
  makePlant(8, 3, 'Palme'),
  makePlant(9, 1, 'Kaktus'),
  makePlant(10, 3, 'Farn'),
  makePlant(11, 3, 'Tillandsie'),
  makePlant(12, 5, 'Basilikum'),
]

export const Empty: Story = { args: { plants: [] } }
export const ThreePlants: Story = { args: { plants: FEW } }
export const TwelvePlants: Story = { args: { plants: MANY } }
