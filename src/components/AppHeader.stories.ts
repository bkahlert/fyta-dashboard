import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AppHeader from './AppHeader.vue'

const meta: Meta<typeof AppHeader> = {
  component: AppHeader,
  args: {
    isLoading: false,
    lastUpdated: null,
  },
}

export default meta
type Story = StoryObj<typeof AppHeader>

export const Default: Story = {}

export const Loading: Story = {
  args: { isLoading: true },
}

export const WithTimestamp: Story = {
  args: {
    lastUpdated: new Date(Date.now() - 3 * 60 * 1000),
  },
}
