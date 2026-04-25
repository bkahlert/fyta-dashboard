import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { baseMeasurements, makePlant } from '../stories/plantFactory'
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

export const NoPlants: Story = {}

export const Loading: Story = {
  args: { isLoading: true },
}

export const WithPlants: Story = {
  args: {
    lastUpdated: new Date(Date.now() - 3 * 60 * 1000),
    plants: [
      makePlant({ id: 1, nickname: 'Plant 1', measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'too_low' } }, attentionLevel: 'now' }),
      makePlant({ id: 2, nickname: 'Plant 2', measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'low' } }, attentionLevel: 'soon' }),
      makePlant({ id: 3, nickname: 'Plant 3', attentionLevel: 'ok' }),
      makePlant({ id: 4, nickname: 'Plant 4', attentionLevel: 'ok' }),
      makePlant({ id: 5, nickname: 'Plant 5', attentionLevel: 'ok' }),
    ],
  },
}

export const AllHealthy: Story = {
  args: {
    lastUpdated: new Date(Date.now() - 1 * 60 * 1000),
    plants: [
      makePlant({ id: 1, nickname: 'Plant 1', attentionLevel: 'ok' }),
      makePlant({ id: 2, nickname: 'Plant 2', attentionLevel: 'ok' }),
      makePlant({ id: 3, nickname: 'Plant 3', attentionLevel: 'ok' }),
    ],
  },
}
