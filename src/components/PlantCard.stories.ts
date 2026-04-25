import type {Meta, StoryObj} from '@storybook/vue3-vite'

import {MEASUREMENT_STATUSES} from '../api/schemas'
import {createPlant} from '../types/plant'
import PlantCard from './PlantCard.vue'

const meta: Meta<typeof PlantCard> = {
  component: PlantCard,
}

export default meta
type Story = StoryObj<typeof PlantCard>

const card = () => ({template: '<div style="width:200px"><story /></div>'})

const base = {
  scientific_name: 'Monstera deliciosa',
  thumb_path: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Filodendron.jpg',
}

// Varied sensor states so all three sensor rows are visible at once
export const Default: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base,
      id: 1,
      nickname: 'Monstera',
      moisture_status: 'perfect',
      light_status: 'low',
      temperature_status: 'too_high',
      salinity_status: 'high',
      sensor: {status: 'correct', received_data_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()},
    }),
  },
}

// ── Moisture states ────────────────────────────────────────────

export const NeedsWater: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base, id: 2, nickname: 'Fikus', scientific_name: 'Ficus lyrata',
      moisture_status: 'too_low', light_status: 'low', temperature_status: 'perfect', salinity_status: 'perfect',
    }),
  },
}

export const WaterSoon: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base, id: 3, nickname: 'Efeutute', scientific_name: 'Epipremnum aureum',
      moisture_status: 'low', light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect',
    }),
  },
}

export const Overwatered: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base, id: 4, nickname: 'Basilikum', scientific_name: 'Ocimum basilicum',
      moisture_status: 'too_high', light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'too_high',
    }),
  },
}

// ── Sensor / connectivity states ───────────────────────────────

export const NoSensor: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base, id: 5, nickname: 'Kaktus', scientific_name: 'Echinopsis pachanoi',
      moisture_status: 'no_data', light_status: null, temperature_status: null, salinity_status: null,
      sensor: null,
    }),
  },
}

export const SensorError: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base, id: 6, nickname: 'Aloe Vera', scientific_name: 'Aloe barbadensis',
      moisture_status: 'perfect', light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect',
      sensor: {status: 'error', received_data_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()},
    }),
  },
}

export const BatteryLow: Story = {
  decorators: [card],
  args: {
    plant: {
      ...createPlant({
        ...base, id: 7, nickname: 'Orchidee', scientific_name: 'Phalaenopsis amabilis',
        moisture_status: 'low', light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect',
        sensor: {id: 'CB:2F:8B:D7:D2:B1', status: 'correct', is_battery_low: true, received_data_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()},
      }),
      sensorBatteryLevel: 5,
    },
  },
}

export const BatteryEmpty: Story = {
  decorators: [card],
  args: {
    plant: {
      ...createPlant({
        ...base, id: 12, nickname: 'Eingang Ficus', scientific_name: 'Ficus retusa',
        moisture_status: 'no_data', light_status: 'no_data', temperature_status: 'no_data', salinity_status: 'no_data',
        sensor: {id: 'CB:2F:8B:D7:D2:B1', status: 'error', is_battery_low: true, received_data_at: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000).toISOString()},
      }),
      sensorBatteryLevel: 0,
    },
  },
}

export const WifiLost: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base, id: 8, nickname: 'Geldbaum', scientific_name: 'Crassula ovata',
      moisture_status: 'perfect', light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect',
      wifi_status: 'lost',
      sensor: {id: 'F9:B6:F9:82:87:50', status: 'correct', received_data_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()},
    }),
  },
}

export const BatteryLowAndWifiLost: Story = {
  decorators: [card],
  args: {
    plant: {
      ...createPlant({
        ...base, id: 10, nickname: 'Farn', scientific_name: 'Nephrolepis exaltata',
        moisture_status: 'low', light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect',
        wifi_status: 'lost',
        sensor: {id: 'D5:B7:AA:CE:8F:0A', status: 'correct', is_battery_low: true, received_data_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()},
      }),
      sensorBatteryLevel: 10,
    },
  },
}

export const NoSensorWithWifi: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base, id: 11, nickname: 'Zebrina', scientific_name: 'Tradescantia zebrina',
      moisture_status: 'no_data', light_status: null, temperature_status: null, salinity_status: null,
      // API returns wifi_status: 2 even for sensorless plants — badge must not show
      wifi_status: 'error',
      sensor: null,
    }),
  },
}

export const NoPhoto: Story = {
  decorators: [card],
  args: {
    plant: createPlant({
      ...base, id: 9, nickname: 'Monstera', thumb_path: '', plant_thumb_path: '',
      moisture_status: 'perfect', light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect',
    }),
  },
}

// ── All moisture states ────────────────────────────────────────

export const AllMoistureStates: Story = {
  render: () => ({
    components: {PlantCard},
    setup: () => ({
      plants: MEASUREMENT_STATUSES.map((ms, i) =>
        createPlant({
          ...base,
          id: i,
          nickname: ms.replace('_', ' '),
          moisture_status: ms,
          light_status: ms,
          temperature_status: ms,
          salinity_status: ms,
          sensor: ms === 'no_data' ? null : {status: 'correct', received_data_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()},
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
