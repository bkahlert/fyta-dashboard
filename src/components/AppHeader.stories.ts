import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { MeasurementStatus } from '../types/plant'

import { createPlant } from '../types/plant'
import AppHeader from './AppHeader.vue'

const meta: Meta<typeof AppHeader> = {
  component: AppHeader,
  args: {
    isLoading: false,
    lastUpdated: null,
    plants: [],
  },
}

export default meta
type Story = StoryObj<typeof AppHeader>

const makePlant = (id: number, moisture_status: MeasurementStatus) =>
  createPlant({ id, nickname: `Plant ${String(id)}`, scientific_name: 'Monstera deliciosa', moisture_status, light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect', thumb_path: '' })

export const NoPlants: Story = {}

export const Loading: Story = {
  args: { isLoading: true },
}

export const WithPlants: Story = {
  args: {
    lastUpdated: new Date(Date.now() - 3 * 60 * 1000),
    plants: [makePlant(1, 'too_low'), makePlant(2, 'low'), makePlant(3, 'perfect'), makePlant(4, 'perfect'), makePlant(5, 'perfect')],
  },
}

export const AllHealthy: Story = {
  args: {
    lastUpdated: new Date(Date.now() - 1 * 60 * 1000),
    plants: [makePlant(1, 'perfect'), makePlant(2, 'perfect'), makePlant(3, 'perfect')],
  },
}
