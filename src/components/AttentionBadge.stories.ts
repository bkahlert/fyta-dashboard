import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AttentionBadge from './AttentionBadge.vue'

const meta: Meta<typeof AttentionBadge> = {
  component: AttentionBadge,
}

export default meta
type Story = StoryObj<typeof AttentionBadge>

export const Now: Story = { args: { level: 'now' } }
export const Soon: Story = { args: { level: 'soon' } }
export const Ok: Story = { args: { level: 'ok' } }
