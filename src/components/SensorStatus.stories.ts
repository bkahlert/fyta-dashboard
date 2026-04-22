import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SensorStatus, { MEASUREMENT_STATUSES, SENSOR_TYPES } from './SensorStatus.vue'

const meta: Meta<typeof SensorStatus> = {
  component: SensorStatus,
  argTypes: {
    type: { control: 'select', options: SENSOR_TYPES },
    status: { control: 'select', options: MEASUREMENT_STATUSES },
  },
}

export default meta
type Story = StoryObj<typeof SensorStatus>

export const Ok: Story = { args: { type: 'moisture', status: 'perfect' } }
export const WarnLow: Story = { args: { type: 'moisture', status: 'low' } }
export const WarnHigh: Story = { args: { type: 'moisture', status: 'high' } }
export const CriticalLow: Story = { args: { type: 'moisture', status: 'too_low' } }
export const CriticalHigh: Story = { args: { type: 'moisture', status: 'too_high' } }
export const NoSensor: Story = { args: { type: 'moisture', status: 'no_data' } }

export const AllSensorsOk: Story = {
  render: () => ({
    components: { SensorStatus },
    setup: () => ({ types: SENSOR_TYPES }),
    template: `
          <div class="flex flex-col gap-2 p-4">
            <SensorStatus v-for="type in types" :key="type" :type="type" status="perfect"/>
          </div>
        `,
  }),
}

export const AllSensorsAndStatuses: Story = {
  render: () => ({
    components: { SensorStatus },
    setup: () => ({ types: SENSOR_TYPES, statuses: MEASUREMENT_STATUSES }),
    template: `
          <div class="p-4" :style="{ display: 'grid', gridTemplateColumns: 'auto repeat(' + types.length + ', auto)', rowGap: '12px', columnGap: '40px' }">
            <span class="text-xs text-base-content/50">status</span>
            <span v-for="type in types" :key="type" class="text-xs text-base-content/50 capitalize">{{ type }}</span>
            <template v-for="s in statuses" :key="s">
              <span class="text-xs text-base-content/50 self-center">{{ s }}</span>
              <SensorStatus v-for="type in types" :key="type" :type="type" :status="s"/>
            </template>
          </div>
        `,
  }),
}
