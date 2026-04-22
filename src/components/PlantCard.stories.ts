import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { Plant } from '../types/plant'

import PlantCard from './PlantCard.vue'

const meta: Meta<typeof PlantCard> = {
  component: PlantCard,
  decorators: [() => ({ template: '<div style="width:200px"><story /></div>' })],
}

export default meta
type Story = StoryObj<typeof PlantCard>

const healthyPlant: Plant = {
  id: 1,
  nickname: 'Monstera',
  scientific_name: 'Monstera deliciosa',
  moisture_status: 3,
  light_status: 3,
  temperature_status: 3,
  salinity_status: 3,
  thumb_path: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Filodendron.jpg',
}

const thirstyPlant: Plant = {
  ...healthyPlant,
  id: 2,
  nickname: 'Fikus',
  scientific_name: 'Ficus lyrata',
  moisture_status: 1,
  light_status: 2,
}

const warnPlant: Plant = {
  ...healthyPlant,
  id: 3,
  nickname: 'Efeutute',
  scientific_name: 'Epipremnum aureum',
  moisture_status: 2,
}

export const Full: Story = { args: { plant: healthyPlant, cardHeight: 220 } }
export const Medium: Story = { args: { plant: healthyPlant, cardHeight: 140 } }
export const Compact: Story = { args: { plant: healthyPlant, cardHeight: 90 } }
export const Micro: Story = { args: { plant: healthyPlant, cardHeight: 60 } }
export const NeedsWater: Story = { args: { plant: thirstyPlant, cardHeight: 220 } }
export const WaterSoon: Story = { args: { plant: warnPlant, cardHeight: 220 } }
export const NoPhoto: Story = {
  args: {
    plant: { ...healthyPlant, thumb_path: '', plant_thumb_path: '' },
    cardHeight: 220,
  },
}
