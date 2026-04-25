import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { MEASUREMENT_STATUSES } from '../api/schemas'
import { baseMeasurements, baseSensor, makePlant } from '../stories/plantFactory'
import PlantCard from './PlantCard.vue'

const meta: Meta<typeof PlantCard> = { component: PlantCard }
export default meta
type Story = StoryObj<typeof PlantCard>

const card = () => ({ template: '<div style="width:200px"><story /></div>' })

const THUMB = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Filodendron.jpg'

// ── Stories ────────────────────────────────────────────────────

export const Default: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 1,
      nickname: 'Monstera',
      thumb_path: THUMB,
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'perfect' }, light: { ...baseMeasurements.light, status: 'low' }, temperature: { ...baseMeasurements.temperature, status: 'too_high' }, salinity: { ...baseMeasurements.salinity, status: 'high' } },
      attentionLevel: 'ok',
      battery_status: 'perfect',
    }),
  },
}

export const NeedsWater: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 2,
      nickname: 'Fikus',
      scientific_name: 'Ficus lyrata',
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'too_low' } },
      attentionLevel: 'now',
      attentionRank: 0,
      battery_status: 'perfect',
    }),
  },
}

export const WaterSoon: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 3,
      nickname: 'Efeutute',
      scientific_name: 'Epipremnum aureum',
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'low' } },
      attentionLevel: 'soon',
      attentionRank: 1,
      battery_status: 'perfect',
    }),
  },
}

export const Overwatered: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 4,
      nickname: 'Basilikum',
      scientific_name: 'Ocimum basilicum',
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'too_high' }, salinity: { ...baseMeasurements.salinity, status: 'too_high' } },
      attentionLevel: 'now',
      attentionRank: 0,
      battery_status: 'perfect',
    }),
  },
}

export const NoSensor: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 5,
      nickname: 'Kaktus',
      scientific_name: 'Echinopsis pachanoi',
      sensor: null,
      measurements: null,
      attentionLevel: 'ok',
      battery_status: null,
    }),
  },
}

export const SensorError: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 6,
      nickname: 'Aloe Vera',
      scientific_name: 'Aloe barbadensis',
      sensor: { ...baseSensor, status: 'error', received_data_at: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      battery_status: 'perfect',
    }),
  },
}

export const BatteryLow: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 7,
      nickname: 'Orchidee',
      scientific_name: 'Phalaenopsis amabilis',
      sensor: { ...baseSensor, is_battery_low: true },
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'low' }, battery: '5' },
      attentionLevel: 'soon',
      battery_status: 'low',
    }),
  },
}

export const BatteryEmpty: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 12,
      nickname: 'Eingang Ficus',
      scientific_name: 'Ficus retusa',
      sensor: { ...baseSensor, status: 'error', is_battery_low: true, received_data_at: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000) },
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'no_data' }, light: { ...baseMeasurements.light, status: 'no_data' }, temperature: { ...baseMeasurements.temperature, status: 'no_data' }, salinity: { ...baseMeasurements.salinity, status: 'no_data' }, battery: '0' },
      attentionLevel: 'ok',
      battery_status: 'too_low',
    }),
  },
}

export const NoPhoto: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 9,
      nickname: 'Monstera',
      thumb_path: null,
      plant_thumb_path: null,
      battery_status: 'perfect',
    }),
  },
}

export const AllMoistureStates: Story = {
  render: () => ({
    components: { PlantCard },
    setup: () => ({
      plants: MEASUREMENT_STATUSES.map((ms, i) =>
        makePlant({
          id: i,
          nickname: ms.replace('_', ' '),
          sensor: ms === 'no_data' ? null : baseSensor,
          measurements: ms === 'no_data' ? null : {
            ...baseMeasurements,
            moisture: { ...baseMeasurements.moisture, status: ms },
            light: { ...baseMeasurements.light, status: ms },
            temperature: { ...baseMeasurements.temperature, status: ms },
            salinity: { ...baseMeasurements.salinity, status: ms },
          },
          attentionLevel: ms === 'too_low' ? 'now' : ms === 'low' ? 'soon' : ms === 'too_high' ? 'skip' : 'ok',
          battery_status: ms === 'no_data' ? null : 'perfect',
        }),
      ),
    }),
    template: `
      <div style="display:flex;flex-wrap:wrap;gap:16px;padding:16px">
        <div v-for="plant in plants" :key="plant.id" style="width:200px">
          <PlantCard :plant="plant"/>
        </div>
      </div>
    `,
  }),
}
