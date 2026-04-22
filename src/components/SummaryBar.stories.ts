import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { Plant, SensorStatus } from '../types/plant'

import SummaryBar from './SummaryBar.vue'

const meta: Meta<typeof SummaryBar> = { component: SummaryBar }
export default meta
type Story = StoryObj<typeof SummaryBar>

let nextId = 0
const make = (moisture_status: SensorStatus): Plant => ({
  id: ++nextId,
  moisture_status,
})

export const Empty: Story = { args: { plants: [] } }
export const AllOk: Story = {
  args: { plants: Array.from({ length: 6 }, () => make(3)) },
}
export const WithWarnings: Story = {
  args: { plants: [make(3), make(3), make(3), make(2), make(2)] },
}
export const Critical: Story = {
  args: { plants: [make(1), make(1), make(3), make(3)] },
}
export const Mixed: Story = {
  args: { plants: [make(1), make(2), make(3), make(3), make(4), make(5)] },
}
