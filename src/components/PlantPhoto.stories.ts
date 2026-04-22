import type {Meta, StoryObj} from '@storybook/vue3-vite'
import {BatteryLow, WifiOff} from 'lucide-vue-next'

import PlantPhoto from './PlantPhoto.vue'

const meta: Meta<typeof PlantPhoto> = {
  component: PlantPhoto,
}

export default meta
type Story = StoryObj<typeof PlantPhoto>

const card = () => ({template: '<div style="width:200px"><story /></div>'})

const WIKI_THUMB = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Filodendron.jpg'
const PLANT_THUMB = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Aloe_vera_2.jpg/320px-Aloe_vera_2.jpg'

export const WithPhoto: Story = {
  decorators: [card],
  args: {
    thumbPath: WIKI_THUMB,
    alt: 'Monstera',
  },
}

export const FallbackToPlantThumb: Story = {
  decorators: [card],
  args: {
    thumbPath: 'https://invalid.example.com/photo.jpg',
    plantThumbPath: PLANT_THUMB,
    alt: 'Aloe Vera',
  },
}

export const NoPhoto: Story = {
  decorators: [card],
  args: {
    thumbPath: null,
    plantThumbPath: null,
    alt: 'Kaktus',
  },
}

export const WithOverlay: Story = {
  decorators: [card],
  render: (args) => ({
    components: {PlantPhoto, WifiOff, BatteryLow},
    setup: () => ({args}),
    template: `
      <PlantPhoto v-bind="args">
        <div class="absolute top-1 left-1 flex gap-0.5">
          <span class="badge badge-xs badge-error gap-0.5"><WifiOff class="size-2.5"/></span>
          <span class="badge badge-xs badge-warning gap-0.5"><BatteryLow class="size-2.5"/></span>
        </div>
        <div class="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-base-200 via-base-200 to-transparent flex flex-col justify-end px-2 pb-1.5">
          <h2 class="font-bold truncate leading-tight text-sm text-white">Monstera</h2>
          <p class="text-xs italic truncate leading-tight text-white/60">Monstera deliciosa</p>
        </div>
      </PlantPhoto>
    `,
  }),
  args: {
    thumbPath: WIKI_THUMB,
  },
}
